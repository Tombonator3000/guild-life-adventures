// Work and education helpers
// workShift, requestRaise, studySession, completeEducationLevel, studyDegree, completeDegree

import type { EducationPath, DegreeId } from '@/types/game.types';
import { GRADUATION_BONUSES, getDegree } from '@/data/education';
import type { SetFn, GetFn } from '../storeTypes';

export function createWorkEducationActions(set: SetFn, get: GetFn) {
  return {
    workShift: (playerId: string, hours: number, wage: number) => {
      const gameWeek = get().week;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          // Use current wage if player has a job, otherwise use passed wage
          const effectiveWage = p.currentJob ? p.currentWage : wage;

          // Work bonus: 6+ hours shift gets a small efficiency bonus (15%)
          // Reduced from 33% to slow gold accumulation and better match Jones pacing
          const bonusHours = hours >= 6 ? Math.ceil(hours * 1.15) : hours;
          let earnings = bonusHours * effectiveWage;

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

          // Dependability increases with work (capped at maxDependability)
          const newDependability = Math.min(p.maxDependability, p.dependability + 2);

          // Experience increases (capped at maxExperience like Jones)
          const newExperience = Math.min(p.maxExperience, p.experience + hours);

          // Work happiness penalty scales with game progression:
          // Weeks 1-3: no penalty (let players get established)
          // Weeks 4-8: -1 happiness (mild fatigue)
          // Weeks 9+: -2 happiness (full fatigue)
          const happinessPenalty = gameWeek <= 3 ? 0 : gameWeek <= 8 ? 1 : 2;

          return {
            ...p,
            gold: p.gold + Math.max(0, earnings),
            timeRemaining: Math.max(0, p.timeRemaining - hours),
            happiness: Math.max(0, p.happiness - happinessPenalty),
            dependability: newDependability,
            experience: newExperience,
            shiftsWorkedSinceHire: (p.shiftsWorkedSinceHire || 0) + 1,
            rentDebt: newRentDebt,
          };
        }),
      }));
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
        const newWage = player.currentWage + raiseAmount;

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

    studySession: (playerId: string, path: EducationPath, cost: number, hours: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newProgress = { ...p.educationProgress };
          newProgress[path] = (newProgress[path] || 0) + 1;

          return {
            ...p,
            gold: Math.max(0, p.gold - cost),
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

          const newProgress = { ...p.degreeProgress };
          newProgress[degreeId] = (newProgress[degreeId] || 0) + 1;

          return {
            ...p,
            gold: Math.max(0, p.gold - cost),
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

          // Apply graduation bonuses (like Jones)
          return {
            ...p,
            completedDegrees: newCompletedDegrees,
            degreeProgress: newProgress,
            happiness: Math.min(100, p.happiness + GRADUATION_BONUSES.happiness),
            dependability: Math.min(p.maxDependability, p.dependability + GRADUATION_BONUSES.dependability),
            maxDependability: p.maxDependability + GRADUATION_BONUSES.maxDependability,
            maxExperience: p.maxExperience + GRADUATION_BONUSES.maxExperience,
          };
        }),
      }));
    },
  };
}
