// Player modification helpers
// Simple player state updates: gold, health, happiness, food, clothing, etc.

import type { HousingTier, LocationId } from '@/types/game.types';
import type { SetFn, GetFn } from '../storeTypes';
import {
  checkStreetRobbery,
} from '@/data/shadowfingers';
import { rollTravelEvent, formatTravelEvent } from '@/data/travelEvents';
import { checkForEvent, pickEventMessage, pickEventDescription } from '@/data/events';

/** Append an event message to the existing eventMessage, showing as a 'weekly' event phase (human players only) */
function appendEventMessage(get: GetFn, set: SetFn, message: string): void {
  const existing = get().eventMessage;
  set({
    eventMessage: existing ? existing + '\n' + message : message,
    eventSource: 'weekly' as const,
    phase: 'event',
  });
}

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

      // Check for street robbery when leaving bank or shadow-market (applies to all players)
      const updatedPlayer = get().players.find(p => p.id === playerId);
      if (updatedPlayer) {
        const robberyResult = checkStreetRobbery(
          { ...updatedPlayer, currentLocation: previousLocation }, // Use previous location for check
          previousLocation,
          state.week
        );

        if (robberyResult) {
          // Apply robbery effects (gameplay effects apply to ALL players including AI)
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
            // Only show UI event for human players
            ...(updatedPlayer.isAI ? {} : {
              shadowfingersEvent: {
                type: 'street' as const,
                result: robberyResult,
              },
            }),
          }));
        }
      }

      // Location-based random events (pickpocketing, food poisoning, guild bonuses, etc.)
      // Limited to 1 random event per turn per player
      const arrivalPlayer = get().players.find(p => p.id === playerId);
      if (arrivalPlayer && !arrivalPlayer.hadRandomEventThisTurn) {
        const locationEvent = checkForEvent(arrivalPlayer.housing, location, arrivalPlayer.gold);
        if (locationEvent) {
          // Apply all effects from the event + mark that player had a random event this turn
          set((state) => ({
            players: state.players.map((p) => {
              if (p.id !== playerId) return p;
              return {
                ...p,
                gold: Math.max(0, p.gold + (locationEvent.effect.gold || 0)),
                health: Math.max(0, Math.min(p.maxHealth, p.health + (locationEvent.effect.health || 0))),
                happiness: Math.max(0, Math.min(100, p.happiness + (locationEvent.effect.happiness || 0))),
                clothingCondition: Math.max(0, p.clothingCondition + (locationEvent.effect.clothing || 0)),
                hadRandomEventThisTurn: true,
              };
            }),
          }));

          if (!arrivalPlayer.isAI) {
            appendEventMessage(get, set, `[${locationEvent.id}] ${locationEvent.name}: ${pickEventDescription(locationEvent)}\n${pickEventMessage(locationEvent)}`);
          }
        }
      }

      // C7: Random travel events (10% chance on 3+ step trips)
      const stepsTraveled = timeCost; // 1 hr/step
      const travelEvent = rollTravelEvent(stepsTraveled);
      if (travelEvent) {
        const currentPlayer = get().players.find(p => p.id === playerId);
        if (currentPlayer) {
          // Apply travel event effects
          set((state) => ({
            players: state.players.map((p) => {
              if (p.id !== playerId) return p;
              return {
                ...p,
                gold: Math.max(0, p.gold + travelEvent.goldEffect),
                happiness: Math.max(0, Math.min(100, p.happiness + travelEvent.happinessEffect)),
                timeRemaining: Math.max(0, p.timeRemaining - travelEvent.timeCost),
                health: Math.max(0, Math.min(p.maxHealth, p.health + travelEvent.healthEffect)),
              };
            }),
          }));

          if (!currentPlayer.isAI) {
            appendEventMessage(get, set, `[${travelEvent.id}] Travel Event: ${travelEvent.name} — ${formatTravelEvent(travelEvent)}`);
          }
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

    // Jones-style SET behavior: buying clothes SETS condition to max(current, amount)
    // This means buying Peasant Garb (35) when you have 20 → sets to 35
    // But buying Peasant Garb (35) when you have 60 → stays at 60 (no downgrade)
    modifyClothing: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? { ...p, clothingCondition: Math.min(100, Math.max(p.clothingCondition, amount)) }
            : p
        ),
      }));
    },

    modifyMaxHealth: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const newMaxHealth = Math.max(10, p.maxHealth + amount);
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
      // Bankruptcy Barrel: block hiring when player has no clothes (allow quitting)
      if (jobId !== null) {
        const player = get().players.find(p => p.id === playerId);
        if (player && player.clothingCondition <= 0) return;
      }
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

    // M31 FIX: Proper store action for dungeon attempt tracking (was direct setState in CavePanel)
    incrementDungeonAttempts: (playerId: string) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                dungeonAttemptsThisTurn: (p.dungeonAttemptsThisTurn || 0) + 1,
                gameStats: { ...p.gameStats, totalDungeonRuns: (p.gameStats.totalDungeonRuns || 0) + 1 },
              }
            : p
        ),
      }));
    },

    // M31 FIX: Proper store action for dungeon record updates (was direct setState in CavePanel)
    updatePlayerDungeonRecord: (playerId: string, floorId: number, goldEarned: number, encountersCompleted: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const currentRecords = p.dungeonRecords || {};
          const existing = currentRecords[floorId];
          const bestGold = existing ? Math.max(existing.bestGold, goldEarned) : goldEarned;
          const bestEncounters = existing ? Math.min(existing.bestEncounters, encountersCompleted) : encountersCompleted;
          const runs = existing ? existing.runs + 1 : 1;
          const totalGold = existing ? existing.totalGold + goldEarned : goldEarned;
          return {
            ...p,
            dungeonRecords: {
              ...currentRecords,
              [floorId]: { bestGold, bestEncounters, runs, totalGold },
            },
          };
        }),
      }));
    },
  };
}
