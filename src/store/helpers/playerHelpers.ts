// Player modification helpers
// Simple player state updates: gold, health, happiness, food, clothing, etc.

import type { HousingTier, LocationId } from '@/types/game.types';
import type { SetFn, GetFn } from '../storeTypes';
import {
  checkStreetRobbery,
} from '@/data/shadowfingers';

export function createPlayerActions(set: SetFn, get: GetFn) {
  return {
    movePlayer: (playerId: string, location: LocationId, timeCost: number) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return;

      const previousLocation = player.currentLocation;

      // Update player position
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                previousLocation,
                currentLocation: location,
                timeRemaining: Math.max(0, p.timeRemaining - timeCost)
              }
            : p
        ),
      }));

      // Check for street robbery when leaving bank or shadow-market
      const updatedPlayer = get().players.find(p => p.id === playerId);
      if (updatedPlayer && !updatedPlayer.isAI) {
        const robberyResult = checkStreetRobbery(
          { ...updatedPlayer, currentLocation: previousLocation }, // Use previous location for check
          previousLocation,
          state.week
        );

        if (robberyResult) {
          // Apply robbery effects
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId
                ? {
                    ...p,
                    gold: 0, // Street robbery takes all cash
                    happiness: Math.max(0, p.happiness + robberyResult.happinessLoss),
                  }
                : p
            ),
            shadowfingersEvent: {
              type: 'street',
              result: robberyResult,
            },
          }));
        }
      }
    },

    spendTime: (playerId: string, hours: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, timeRemaining: Math.max(0, p.timeRemaining - hours) }
            : p
        ),
      }));
    },

    modifyGold: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, gold: Math.max(0, p.gold + amount) }
            : p
        ),
      }));
    },

    modifyHealth: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, health: Math.max(0, Math.min(p.maxHealth, p.health + amount)) }
            : p
        ),
      }));
    },

    modifyHappiness: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, happiness: Math.max(0, Math.min(100, p.happiness + amount)) }
            : p
        ),
      }));
    },

    modifyFood: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, foodLevel: Math.max(0, Math.min(100, p.foodLevel + amount)) }
            : p
        ),
      }));
    },

    modifyClothing: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, clothingCondition: Math.max(0, Math.min(100, p.clothingCondition + amount)) }
            : p
        ),
      }));
    },

    modifyMaxHealth: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const newMaxHealth = Math.max(50, p.maxHealth + amount);
          return { ...p, maxHealth: newMaxHealth, health: Math.min(p.health, newMaxHealth) };
        }),
      }));
    },

    modifyRelaxation: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, relaxation: Math.max(10, Math.min(50, p.relaxation + amount)) }
            : p
        ),
      }));
    },

    setHousing: (playerId: string, tier: HousingTier) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, housing: tier, weeksSinceRent: 0 }
            : p
        ),
      }));
    },

    setJob: (playerId: string, jobId: string | null, wage: number = 0) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, currentJob: jobId, currentWage: wage, shiftsWorkedSinceHire: 0, dependability: Math.max(30, p.dependability - 10) }
            : p
        ),
      }));
    },

    cureSickness: (playerId: string) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, isSick: false }
            : p
        ),
      }));
    },
  };
}
