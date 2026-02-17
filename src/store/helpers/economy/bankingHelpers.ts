import type { HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import type { SetFn, GetFn } from '../../storeTypes';

export function createBankingActions(set: SetFn, get: GetFn) {
  return {
    payRent: (playerId: string) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          // H2 FIX: Skip payment if prepaid weeks cover this period
          if (p.rentPrepaidWeeks > 0) {
            return p; // No changes needed — prepaid tracking handled in weekEndHelpers
          }
          // Use locked-in rent if available, otherwise current rate
          const rentCost = p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing];
          if (p.gold < rentCost) return p;
          return {
            ...p,
            gold: p.gold - rentCost,
            weeksSinceRent: 0,
            // M3 FIX: Clear rent debt when paying rent
            rentDebt: 0,
            rentExtensionUsed: false,
          };
        }),
      }));
    },

    depositToBank: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.gold);
          if (actual <= 0) return p;
          return { ...p, gold: p.gold - actual, savings: p.savings + actual };
        }),
      }));
    },

    withdrawFromBank: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.savings);
          if (actual <= 0) return p;
          return { ...p, gold: p.gold + actual, savings: p.savings - actual };
        }),
      }));
    },

    invest: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.gold);
          if (actual <= 0) return p;
          return { ...p, gold: p.gold - actual, investments: p.investments + actual };
        }),
      }));
    },

    withdrawInvestment: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.investments);
          if (actual <= 0) return p;
          // 10% early withdrawal penalty
          const penalty = Math.floor(actual * 0.10);
          return { ...p, gold: p.gold + actual - penalty, investments: p.investments - actual };
        }),
      }));
    },

    // Prepay rent for multiple weeks
    prepayRent: (playerId: string, weeks: number, totalCost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < totalCost) return p;

          return {
            ...p,
            gold: p.gold - totalCost,
            rentPrepaidWeeks: p.rentPrepaidWeeks + weeks,
            weeksSinceRent: 0,
            rentExtensionUsed: false, // Reset beg-for-time on payment
          };
        }),
      }));
    },

    // Beg the landlord for a one-week rent extension
    // 50% base chance, +1% per point of dependability (max +50%), capped at 80%
    // Can only be used once per rent cycle (resets when rent is paid)
    begForMoreTime: (playerId: string): { success: boolean; message: string } => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.rentExtensionUsed) return { success: false, message: 'You already begged this cycle. Tomas remembers.' };
      if (player.weeksSinceRent < 2) return { success: false, message: 'You\'re not overdue enough to need begging.' };
      if (player.housing === 'homeless') return { success: false, message: 'You don\'t have housing to extend.' };

      // Calculate success chance: 50% base + dependability bonus (capped at 80%)
      const baseChance = 0.50;
      const depBonus = Math.min(player.dependability * 0.005, 0.30);
      const successChance = Math.min(baseChance + depBonus, 0.80);
      const roll = Math.random();
      const succeeded = roll < successChance;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (succeeded) {
            return {
              ...p,
              weeksSinceRent: Math.max(0, p.weeksSinceRent - 1),
              rentExtensionUsed: true,
              happiness: Math.max(0, p.happiness - 2), // Dignity cost
            };
          } else {
            return {
              ...p,
              rentExtensionUsed: true,
              happiness: Math.max(0, p.happiness - 5), // Humiliation
            };
          }
        }),
      }));

      if (succeeded) {
        return {
          success: true,
          message: 'Tomas sighs heavily. "One more week. ONE. And I\'m adding it to my ledger of disappointments."',
        };
      } else {
        return {
          success: false,
          message: 'Tomas crosses his arms. "I\'ve heard better sob stories from the rats in the cellar. Pay up."',
        };
      }
    },

    // Move to new housing with locked-in rent
    moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;

          return {
            ...p,
            gold: p.gold - cost,
            housing: tier,
            weeksSinceRent: 0,
            rentPrepaidWeeks: 0,
            lockedRent: lockInRent,
          };
        }),
      }));
    },
  };
}
