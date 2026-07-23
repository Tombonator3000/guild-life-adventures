import { applyForJob, calculateOfferedWage, getJob } from '@/data/jobs';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';

/**
 * Host-authoritative job offer actions.
 *
 * The client sends only a job ID or raise intent. The host resolves the
 * current Guild Hall location, qualifications, exclusive occupancy and the
 * deterministic market wage for the current week/economy.
 */
export function createEmploymentOfferActions(set: SetFn, get: GetFn) {
  return {
    acceptJobOffer: (playerId: string, jobId: string): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'guild-hall') {
        return { success: false, message: 'Visit the Guild Hall before accepting a job.' };
      }

      const job = getJob(jobId);
      if (!job) return { success: false, message: 'Job not found.' };
      if (player.currentJob === jobId) return { success: false, message: 'You already hold this job.' };

      const application = applyForJob(
        job,
        player.completedDegrees,
        player.clothingCondition,
        player.experience,
        player.dependability,
      );
      if (!application.success) {
        return { success: false, message: application.reason ?? 'You do not meet the job requirements.' };
      }

      const occupied = job.careerLevel > 2 && state.players.some(candidate =>
        candidate.id !== playerId
        && !candidate.isGameOver
        && candidate.currentJob === jobId,
      );
      if (occupied) return { success: false, message: 'That position is already held by another player.' };

      const wage = calculateOfferedWage(job, state.priceModifier, state.week).offeredWage;
      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId
          ? {
              ...candidate,
              currentJob: jobId,
              currentWage: wage,
              shiftsWorkedSinceHire: 0,
              dependability: Math.max(30, candidate.dependability - 10),
            }
          : candidate),
      }));

      return { success: true, message: `Hired as ${job.name} at ${wage} gold/hour.` };
    },

    acceptMarketRaise: (playerId: string): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'guild-hall') {
        return { success: false, message: 'Visit the Guild Hall before accepting a market raise.' };
      }
      if (!player.currentJob) return { success: false, message: 'You do not currently have a job.' };

      const job = getJob(player.currentJob);
      if (!job) return { success: false, message: 'Current job could not be found.' };
      const marketWage = calculateOfferedWage(job, state.priceModifier, state.week).offeredWage;
      if (marketWage <= player.currentWage) {
        return { success: false, message: 'The market is not offering a higher wage for this job.' };
      }

      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId
          ? { ...candidate, currentWage: marketWage }
          : candidate),
      }));

      return { success: true, message: `Salary increased to ${marketWage} gold/hour.` };
    },
  };
}
