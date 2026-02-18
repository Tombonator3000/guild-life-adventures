// Work and education helpers
// workShift, requestRaise, studySession, completeEducationLevel, studyDegree, completeDegree

import type { EducationPath, DegreeId, Player } from '@/types/game.types';
import { GRADUATION_BONUSES, getDegree } from '@/data/education';
import { WORK_HAPPINESS_AGE } from '@/types/game.types';
import { getJob } from '@/data/jobs';
import { CLOTHING_THRESHOLDS } from '@/data/items';
import { getGameOption } from '@/data/gameOptions';
import { FESTIVALS } from '@/data/festivals';
import { hasCurseEffect } from './hexHelpers';
import { updateAchievementStats, checkAchievements } from '@/data/achievements';
import type { SetFn, GetFn } from '../storeTypes';

// Map degrees to legacy education paths for quest compatibility
const DEGREE_TO_PATH: Record<string, string> = {
  'trade-guild': 'business',
  'junior-academy': 'business',
  'commerce': 'business',
  'arcane-studies': 'mage',
  'sage-studies': 'mage',
  'loremaster': 'mage',
  'alchemy': 'mage',
  'combat-training': 'fighter',
  'master-combat': 'fighter',
  'scholar': 'priest',
  'advanced-scholar': 'priest',
};

/** Calculate base earnings with festival/curse/bonus multipliers */
function calculateEarnings(
  hours: number, effectiveWage: number,
  festivalId: string | null,
  player: Pick<Player, 'permanentGoldBonus' | 'activeCurses'>,
): number {
  // Flat 15% efficiency bonus + festival wage multiplier
  const festivalMult = festivalId
    ? (FESTIVALS.find(f => f.id === festivalId)?.wageMultiplier ?? 1.0)
    : 1.0;
  let earnings = Math.floor(hours * effectiveWage * 1.15 * festivalMult);

  // Curse of Poverty
  const povertyCurse = hasCurseEffect(player as Player, 'wage-reduction');
  if (povertyCurse) {
    earnings = Math.floor(earnings * (1 - povertyCurse.magnitude));
  }

  // Permanent gold bonus from rare drops
  if (player.permanentGoldBonus > 0) {
    earnings = Math.floor(earnings * (1 + player.permanentGoldBonus));
  }

  return earnings;
}

/** Deduct rent and loan garnishments from earnings, returning adjusted values */
function applyGarnishments(
  earnings: number,
  player: { weeksSinceRent: number; housing: string; rentDebt: number; loanAmount: number; loanWeeksRemaining: number },
): { earnings: number; rentDebt: number; loanAmount: number } {
  let result = earnings;
  let rentDebt = player.rentDebt;
  let loanAmount = player.loanAmount;

  // Rent garnishment: 50% + 2g interest if overdue 4+ weeks
  if (player.weeksSinceRent >= 4 && player.housing !== 'homeless') {
    const garnishment = Math.floor(result * 0.5) + 2;
    rentDebt = Math.max(0, rentDebt - garnishment);
    result -= garnishment;
  }

  // Loan garnishment: 25% if overdue and earnings still positive
  if (loanAmount > 0 && player.loanWeeksRemaining <= 0 && result > 0) {
    const loanGarnishment = Math.min(Math.floor(result * 0.25), loanAmount);
    loanAmount -= loanGarnishment;
    result -= loanGarnishment;
  }

  return { earnings: result, rentDebt, loanAmount };
}

/** Calculate happiness penalty for working (progression-based + age penalty) */
function calculateWorkHappinessPenalty(gameWeek: number, playerAge: number, hours: number): number {
  const basePenalty = gameWeek <= 4 ? 0 : 1;
  const agingEnabled = getGameOption('enableAging');
  const agePenalty = (agingEnabled && playerAge >= WORK_HAPPINESS_AGE && hours >= 6) ? 1 : 0;
  return basePenalty + agePenalty;
}

export function createWorkEducationActions(set: SetFn, get: GetFn) {
  return {
    workShift: (playerId: string, hours: number, wage: number): boolean => {
      // All validation is inside set() to prevent race conditions with stale state
      let success = false;
      set((state) => {
        const p = state.players.find(p => p.id === playerId);
        if (!p || p.timeRemaining < hours) return {};
        if (p.clothingCondition <= 0) return {};
        // Clothing quality check: job refuses you if your clothes don't meet its tier
        if (p.currentJob) {
          const job = getJob(p.currentJob);
          if (job) {
            const threshold = CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
            if (p.clothingCondition < threshold) return {};
          }
        }

        const effectiveWage = p.currentJob ? p.currentWage : wage;
        const baseEarnings = calculateEarnings(hours, effectiveWage, state.activeFestival, p);
        const { earnings, rentDebt, loanAmount } = applyGarnishments(baseEarnings, p);
        const happinessPenalty = calculateWorkHappinessPenalty(state.week, p.age ?? 18, hours);

        success = true;
        return {
          players: state.players.map((player) => {
            if (player.id !== playerId) return player;
            return {
              ...player,
              gold: player.gold + Math.max(0, earnings),
              timeRemaining: Math.max(0, player.timeRemaining - hours),
              happiness: Math.max(0, player.happiness - happinessPenalty),
              dependability: Math.min(p.maxDependability, p.dependability + 1),
              experience: Math.min(p.maxExperience, p.experience + Math.ceil(hours / 2)),
              shiftsWorkedSinceHire: (player.shiftsWorkedSinceHire || 0) + 1,
              totalShiftsWorked: (player.totalShiftsWorked || 0) + 1,
              workedThisTurn: true,
              rentDebt,
              loanAmount,
              loanWeeksRemaining: loanAmount <= 0 ? 0 : player.loanWeeksRemaining,
            };
          }),
        };
      });
      return success;
    },

    requestRaise: (playerId: string): { success: boolean; newWage?: number; message: string } => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.currentJob) {
        return { success: false, message: "You don't have a job to request a raise for." };
      }

      // Must work at least 3 shifts before requesting a raise
      const MIN_SHIFTS_FOR_RAISE = 3;
      const shiftsWorked = player.shiftsWorkedSinceHire || 0;
      if (shiftsWorked < MIN_SHIFTS_FOR_RAISE) {
        return { success: false, message: `You need to work at least ${MIN_SHIFTS_FOR_RAISE} shifts before requesting a raise. (${shiftsWorked}/${MIN_SHIFTS_FOR_RAISE})` };
      }

      // Raise chance: 40% base + dependability bonus (up to 90%)
      const raiseChance = 0.4 + (player.dependability / 200); // 40-90% chance
      // Bonus: extra shifts worked beyond minimum boost chance
      const bonusShifts = Math.min(10, shiftsWorked - MIN_SHIFTS_FOR_RAISE);
      const adjustedChance = Math.min(0.95, raiseChance + bonusShifts * 0.02);
      const success = Math.random() < adjustedChance;

      if (success) {
        const raiseAmount = Math.ceil(player.currentWage * 0.15); // 15% raise
        const job = getJob(player.currentJob!);
        const maxWage = job ? Math.ceil(job.baseWage * 3) : player.currentWage * 3; // Cap at 3x base
        const newWage = Math.min(player.currentWage + raiseAmount, maxWage);
        if (newWage <= player.currentWage) {
          return { success: false, message: "You've reached the maximum wage for this position." };
        }

        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, currentWage: newWage }
              : p
          ),
        }));

        return { success: true, newWage, message: `Raise approved! New wage: ${newWage} gold/hour.` };
      } else {
        // Failed raise: mild penalty (-3 dependability instead of -10)
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, dependability: Math.max(0, p.dependability - 3) }
              : p
          ),
        }));

        return { success: false, message: "Your raise request was denied. Keep working to build your case." };
      }
    },

    // M4 FIX: Add validation to negotiateRaise (bounds check, job existence, wage cap)
    negotiateRaise: (playerId: string, newWage: number) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || !player.currentJob) return;
      const job = getJob(player.currentJob);
      if (!job) return;
      const maxWage = Math.ceil(job.baseWage * 3); // Cap at 3x base (same as requestRaise)
      const clampedWage = Math.max(1, Math.min(newWage, maxWage));
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, currentWage: clampedWage }
            : p
        ),
      }));
    },

    studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;
          if (p.timeRemaining < hours) return p;

          const newProgress = { ...p.educationProgress };
          newProgress[path] = (newProgress[path] || 0) + 1;

          return {
            ...p,
            gold: p.gold - cost,
            timeRemaining: Math.max(0, p.timeRemaining - hours),
            educationProgress: newProgress,
          };
        }),
      }));
    },

    completeEducationLevel: (playerId: string, path: EducationPath) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newEducation = { ...p.education };
          newEducation[path] = (newEducation[path] || 0) + 1;

          const newProgress = { ...p.educationProgress };
          newProgress[path] = 0;

          return {
            ...p,
            education: newEducation,
            educationProgress: newProgress,
            happiness: Math.min(100, p.happiness + 5), // Completing education is satisfying (matches Jones +5)
          };
        }),
      }));
    },

    // New Jones-style degree functions
    studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;
          if (p.timeRemaining < hours) return p;

          const newProgress = { ...p.degreeProgress };
          newProgress[degreeId] = (newProgress[degreeId] || 0) + 1;

          return {
            ...p,
            gold: p.gold - cost,
            timeRemaining: Math.max(0, p.timeRemaining - hours),
            degreeProgress: newProgress,
          };
        }),
      }));
    },

    completeDegree: (playerId: string, degreeId: DegreeId) => {
      const degree = getDegree(degreeId);
      if (!degree) return;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          // Add degree to completed list
          const newCompletedDegrees = [...p.completedDegrees, degreeId];

          // Reset progress for this degree
          const newProgress = { ...p.degreeProgress };
          delete newProgress[degreeId];

          // Update legacy education field for quest compatibility
          const legacyPath = DEGREE_TO_PATH[degreeId];
          const newEducation = { ...p.education };
          if (legacyPath) {
            newEducation[legacyPath as keyof typeof newEducation] = (newEducation[legacyPath as keyof typeof newEducation] || 0) + 1;
          }

          // Apply graduation bonuses (like Jones)
          return {
            ...p,
            completedDegrees: newCompletedDegrees,
            degreeProgress: newProgress,
            education: newEducation,
            happiness: Math.min(100, p.happiness + GRADUATION_BONUSES.happiness),
            dependability: Math.min(p.maxDependability, p.dependability + GRADUATION_BONUSES.dependability),
            maxDependability: p.maxDependability + GRADUATION_BONUSES.maxDependability,
            maxExperience: p.maxExperience + GRADUATION_BONUSES.maxExperience,
          };
        }),
      }));
      // C6: Track degree completion for achievements
      const updatedPlayer = get().players.find(p => p.id === playerId);
      if (updatedPlayer && !updatedPlayer.isAI) {
        updateAchievementStats({ totalDegreesEarned: 1 });
        checkAchievements({ completedDegrees: updatedPlayer.completedDegrees.length });
      }
    },
  };
}
