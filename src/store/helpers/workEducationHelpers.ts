// Work and education helpers
// workShift, requestRaise, studySession, completeEducationLevel, studyDegree, completeDegree

import type { EducationPath, DegreeId } from '@/types/game.types';
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

export function createWorkEducationActions(set: SetFn, get: GetFn) {
  return {
    workShift: (playerId: string, hours: number, wage: number): boolean => {
      // All validation is inside set() to prevent race conditions with stale state
      let success = false;
      set((state) => {
        const p = state.players.find(p => p.id === playerId);
        if (!p || p.timeRemaining < hours) return {};
        // Bankruptcy Barrel: cannot work without any clothes
        if (p.clothingCondition <= 0) return {};
        // Clothing quality check: job refuses you if your clothes don't meet its tier
        if (p.currentJob) {
          const job = getJob(p.currentJob);
          if (job) {
            const threshold = CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
            if (p.clothingCondition < threshold) return {};
          }
        }

        // Use current wage if player has a job, otherwise use passed wage
        const effectiveWage = p.currentJob ? p.currentWage : wage;

        // Work bonus: all shifts get a flat 15% efficiency bonus on earnings
        // Applied to earnings directly (not hours) so all shift lengths benefit equally
        // C1: Festival wage multiplier (e.g. Midsummer Fair +15%)
        const festivalId = state.activeFestival;
        const festivalWageMult = festivalId
          ? (FESTIVALS.find(f => f.id === festivalId)?.wageMultiplier ?? 1.0)
          : 1.0;
        let earnings = Math.floor(hours * effectiveWage * 1.15 * festivalWageMult);

        // Curse of Poverty: reduce wages
        const povertyCurse = hasCurseEffect(p, 'wage-reduction');
        if (povertyCurse) {
          earnings = Math.floor(earnings * (1 - povertyCurse.magnitude));
        }

        // Apply permanent gold bonus from rare drops (e.g., Goblin's Lucky Coin)
        if (p.permanentGoldBonus > 0) {
          earnings = Math.floor(earnings * (1 + p.permanentGoldBonus));
        }

        // Garnishment: 50% + 2 gold interest if rent is overdue (4+ weeks)
        let garnishment = 0;
        let newRentDebt = p.rentDebt;
        if (p.weeksSinceRent >= 4 && p.housing !== 'homeless') {
          garnishment = Math.floor(earnings * 0.5) + 2;
          newRentDebt = Math.max(0, newRentDebt - garnishment);
          earnings -= garnishment;
        }

        // Loan garnishment: 25% of wages if loan is overdue (0 weeks remaining)
        // BUG FIX: Only garnish if earnings are positive (rent garnishment can push earnings negative)
        let loanGarnishment = 0;
        let newLoanAmount = p.loanAmount;
        if (p.loanAmount > 0 && p.loanWeeksRemaining <= 0 && earnings > 0) {
          loanGarnishment = Math.min(Math.floor(earnings * 0.25), p.loanAmount);
          newLoanAmount = p.loanAmount - loanGarnishment;
          earnings -= loanGarnishment;
        }

        // Dependability increases with work (capped at maxDependability)
        // +1 per shift (was +2 — slowed to prevent skipping job tiers)
        const newDependability = Math.min(p.maxDependability, p.dependability + 1);

        // Experience increases (capped at maxExperience like Jones)
        // Half of hours worked (was 1:1 — slowed to enforce meaningful time at each job tier)
        const newExperience = Math.min(p.maxExperience, p.experience + Math.ceil(hours / 2));

        // Work happiness penalty scales with game progression:
        // Weeks 1-4: no penalty (let players get established)
        // Weeks 5+: -1 happiness (mild fatigue)
        // Age 45+ (if aging enabled): extra -1 happiness on long shifts (6+ hours)
        const gameWeek = state.week;
        const basePenalty = gameWeek <= 4 ? 0 : 1;
        const agingEnabled = getGameOption('enableAging');
        const agePenalty = (agingEnabled && (p.age ?? 18) >= WORK_HAPPINESS_AGE && hours >= 6) ? 1 : 0;
        const happinessPenalty = basePenalty + agePenalty;

        success = true;
        return {
          players: state.players.map((player) => {
            if (player.id !== playerId) return player;
            return {
              ...player,
              gold: player.gold + Math.max(0, earnings),
              timeRemaining: Math.max(0, player.timeRemaining - hours),
              happiness: Math.max(0, player.happiness - happinessPenalty),
              dependability: newDependability,
              experience: newExperience,
              shiftsWorkedSinceHire: (player.shiftsWorkedSinceHire || 0) + 1,
              totalShiftsWorked: (player.totalShiftsWorked || 0) + 1,
              rentDebt: newRentDebt,
              loanAmount: newLoanAmount,
              loanWeeksRemaining: newLoanAmount <= 0 ? 0 : player.loanWeeksRemaining,
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
