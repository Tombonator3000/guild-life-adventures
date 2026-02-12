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
            return { ...p, weeksSinceRent: 0 };
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
          };
        }),
      }));
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
