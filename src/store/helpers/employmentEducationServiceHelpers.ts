import type { DegreeId, LocationId } from '@/types/game.types';
import { getDegree, getEffectiveSessionsRequired } from '@/data/education';
import { getJob } from '@/data/jobs';
import { CLOTHING_THRESHOLDS } from '@/data/items';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';

export type WorkShiftMode = 'full' | 'remaining';
export type DegreeSessionMode = 'standard' | 'cram';

const JOB_LOCATION_NAMES: Partial<Record<LocationId, string>> = {
  'guild-hall': 'Guild Hall',
  bank: 'Bank',
  forge: 'Forge',
  academy: 'Academy',
  'general-store': 'General Store',
  armory: 'Armory',
  enchanter: 'Enchanter',
  'shadow-market': 'Shadow Market',
  'rusty-tankard': 'Rusty Tankard',
  fence: 'Fence',
};

function getDegreeRequirements(player: ReturnType<GetFn>['players'][number], degreeId: DegreeId) {
  const degree = getDegree(degreeId);
  if (!degree) return null;

  const ownedDurables = Object.keys(player.durables);
  const ownedAppliances = Object.entries(player.appliances)
    .filter(([, appliance]) => appliance && !appliance.isBroken)
    .map(([id]) => id);

  return {
    degree,
    sessionsRequired: getEffectiveSessionsRequired(
      degree.sessionsRequired,
      ownedDurables,
      ownedAppliances,
    ),
  };
}

/**
 * Semantic host-authoritative actions for employment and education.
 *
 * The client sends intent only. The host resolves location, current job,
 * wage, price modifier, session duration, prerequisites and progress.
 * Legacy numeric actions remain available internally for AI compatibility,
 * but are no longer needed in the guest allowlist.
 */
export function createEmploymentEducationServiceActions(_set: SetFn, get: GetFn) {
  return {
    performWorkShift: (playerId: string, mode: WorkShiftMode): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player || !player.currentJob) {
        return { success: false, message: 'You do not currently have a job.' };
      }

      const job = getJob(player.currentJob);
      if (!job) return { success: false, message: 'Current job could not be found.' };

      if (JOB_LOCATION_NAMES[player.currentLocation] !== job.location) {
        return { success: false, message: `Visit ${job.location} before working.` };
      }

      if (player.clothingCondition <= 0) {
        return { success: false, message: 'You need clothing before you can work.' };
      }

      const clothingThreshold = CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
      if (player.clothingCondition < clothingThreshold) {
        return { success: false, message: 'Your clothing does not meet the job requirement.' };
      }

      let hours: number;
      if (mode === 'full') {
        hours = job.hoursPerShift;
        if (player.timeRemaining < hours) {
          return { success: false, message: 'Not enough time for a full shift.' };
        }
      } else if (mode === 'remaining') {
        if (player.timeRemaining <= 0 || player.timeRemaining >= job.hoursPerShift) {
          return { success: false, message: 'A short shift is only available with less than one full shift remaining.' };
        }
        hours = player.timeRemaining;
      } else {
        return { success: false, message: 'Invalid work-shift mode.' };
      }

      const worked = get().workShift(playerId, hours, player.currentWage);
      return worked
        ? { success: true, message: mode === 'full' ? `Worked a shift at ${job.name}.` : `Worked a short ${hours}h shift.` }
        : { success: false, message: 'The work shift could not be completed.' };
    },

    attendDegreeSession: (
      playerId: string,
      degreeId: DegreeId,
      mode: DegreeSessionMode,
    ): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'academy') {
        return { success: false, message: 'Visit the Academy before attending class.' };
      }

      const requirements = getDegreeRequirements(player, degreeId);
      if (!requirements) return { success: false, message: 'Degree not found.' };
      const { degree, sessionsRequired } = requirements;

      if (player.completedDegrees.includes(degreeId)) {
        return { success: false, message: 'This degree is already complete.' };
      }
      if (!degree.prerequisites.every(required => player.completedDegrees.includes(required))) {
        return { success: false, message: 'Degree prerequisites are not complete.' };
      }

      const progress = player.degreeProgress[degreeId] ?? 0;
      if (progress >= sessionsRequired) {
        return { success: false, message: 'All sessions are complete. Graduate instead.' };
      }

      let hours: number;
      if (mode === 'standard') {
        hours = degree.hoursPerSession;
        if (player.timeRemaining < hours) {
          return { success: false, message: 'Not enough time for a standard class.' };
        }
      } else if (mode === 'cram') {
        if (player.timeRemaining <= 0 || player.timeRemaining >= degree.hoursPerSession) {
          return { success: false, message: 'A cram session is only available with less than one class remaining.' };
        }
        hours = player.timeRemaining;
      } else {
        return { success: false, message: 'Invalid class mode.' };
      }

      const prepaidLeft = (player.prepaidDegrees ?? {})[degreeId] ?? 0;
      const canonicalPrice = Math.round(degree.costPerSession * state.priceModifier);
      const sessionCost = prepaidLeft > 0 ? 0 : canonicalPrice;
      if (player.gold < sessionCost) return { success: false, message: 'Not enough gold for this class.' };

      get().studyDegree(playerId, degreeId, canonicalPrice, hours);
      const updated = get().players.find(candidate => candidate.id === playerId);
      const updatedProgress = updated?.degreeProgress[degreeId] ?? progress;
      if (updatedProgress !== progress + 1) {
        return { success: false, message: 'The class could not be completed.' };
      }

      return {
        success: true,
        message: mode === 'cram'
          ? `Completed a ${hours}h cram session for ${degree.name}.`
          : `Attended ${degree.name}.`,
      };
    },

    prepayDegree: (playerId: string, degreeId: DegreeId): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'academy') {
        return { success: false, message: 'Visit the Academy before enrolling.' };
      }

      const requirements = getDegreeRequirements(player, degreeId);
      if (!requirements) return { success: false, message: 'Degree not found.' };
      const { degree, sessionsRequired } = requirements;

      if (player.completedDegrees.includes(degreeId)) {
        return { success: false, message: 'This degree is already complete.' };
      }
      if (!degree.prerequisites.every(required => player.completedDegrees.includes(required))) {
        return { success: false, message: 'Degree prerequisites are not complete.' };
      }
      if ((player.prepaidDegrees ?? {})[degreeId]) {
        return { success: false, message: 'Tuition is already prepaid for this degree.' };
      }

      const progress = player.degreeProgress[degreeId] ?? 0;
      const sessionsLeft = sessionsRequired - progress;
      if (sessionsLeft <= 0) return { success: false, message: 'All sessions are already complete.' };

      const sessionPrice = Math.round(degree.costPerSession * state.priceModifier);
      const totalCost = sessionPrice * sessionsLeft;
      if (player.gold < totalCost) return { success: false, message: 'Not enough gold to prepay the remaining tuition.' };

      get().payFullTuition(playerId, degreeId, totalCost, sessionsLeft);
      const updated = get().players.find(candidate => candidate.id === playerId);
      if ((updated?.prepaidDegrees ?? {})[degreeId] !== sessionsLeft) {
        return { success: false, message: 'Tuition could not be prepaid.' };
      }

      return { success: true, message: `Prepaid ${sessionsLeft} sessions for ${degree.name}.` };
    },

    graduateDegree: (playerId: string, degreeId: DegreeId): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'academy') {
        return { success: false, message: 'Visit the Academy before graduating.' };
      }

      const requirements = getDegreeRequirements(player, degreeId);
      if (!requirements) return { success: false, message: 'Degree not found.' };
      const { degree, sessionsRequired } = requirements;

      if (player.completedDegrees.includes(degreeId)) {
        return { success: false, message: 'This degree is already complete.' };
      }
      if (!degree.prerequisites.every(required => player.completedDegrees.includes(required))) {
        return { success: false, message: 'Degree prerequisites are not complete.' };
      }
      if ((player.degreeProgress[degreeId] ?? 0) < sessionsRequired) {
        return { success: false, message: 'Complete all required sessions before graduating.' };
      }

      get().completeDegree(playerId, degreeId);
      const updated = get().players.find(candidate => candidate.id === playerId);
      if (!updated?.completedDegrees.includes(degreeId)) {
        return { success: false, message: 'Graduation could not be completed.' };
      }

      return { success: true, message: `Graduated with ${degree.name}.` };
    },
  };
}
