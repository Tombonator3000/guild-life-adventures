// Turn management helpers
// endTurn, startTurn, processWeekEnd - the biggest functions in the store
//
// startTurn logic → ./startTurnHelpers.ts
// processWeekEnd logic → ./weekEndHelpers.ts
// endTurn logic + orchestrator → this file

import type { LocationId } from '@/types/game.types';
import { HOURS_PER_TURN, SPOILED_FOOD_SICKNESS_CHANCE } from '@/types/game.types';
import type { SetFn, GetFn } from '../storeTypes';
import { deleteSave } from '@/data/saveLoad';
import { createStartTurn } from './startTurnHelpers';
import { createProcessWeekEnd } from './weekEndHelpers';
import { getJob } from '@/data/jobs';

// Players always start their turn at home: Noble Heights or The Slums
// Shared utility used by startTurnHelpers, weekEndHelpers, and endTurn below
export function getHomeLocation(housing: string): LocationId {
  if (housing === 'noble') return 'noble-heights';
  return 'slums';
}

/** Find the next alive player index, wrapping around the player array.
 *  Returns the index and whether the wrap crossed the week boundary (index 0). */
function findNextAlivePlayer(
  players: ReadonlyArray<{ isGameOver: boolean }>,
  startIndex: number,
): { index: number; isNewWeek: boolean } {
  const total = players.length;
  for (let i = 1; i <= total; i++) {
    const idx = (startIndex + i) % total;
    if (!players[idx].isGameOver) {
      return { index: idx, isNewWeek: idx <= startIndex };
    }
  }
  // All players dead — fall back to index 0, trigger week-end
  return { index: 0, isNewWeek: true };
}

/**
 * End-of-turn spoilage check: If the player bought food this turn without a Preservation Box,
 * there's an 80% chance the food has gone bad. If it went bad, 55% chance the player gets sick
 * and needs a doctor visit (-10 hours, -4 happiness, -30~200g).
 * The spoilage info is intentionally hidden from the store UI — the player only finds out at turn end.
 */
function processEndOfTurnSpoilage(set: SetFn, get: GetFn, playerId: string): void {
  const player = get().players.find(p => p.id === playerId);
  if (!player || !player.foodBoughtWithoutPreservation) return;

  // Reset the flag regardless of outcome
  set((state) => ({
    players: state.players.map(p =>
      p.id === playerId ? { ...p, foodBoughtWithoutPreservation: false } : p
    ),
  }));

  // Check if player now has a Preservation Box (they might have bought one during the turn)
  // Re-read fresh state after set() to avoid stale reference
  const freshPlayer = get().players.find(p => p.id === playerId);
  if (!freshPlayer) return;
  const hasPreservationBox = freshPlayer.appliances['preservation-box'] && !freshPlayer.appliances['preservation-box'].isBroken;
  if (hasPreservationBox) return; // Food is safe now

  // 80% chance that the unpreserved food has gone bad
  if (Math.random() >= 0.80) return; // Lucky — food survived

  const eventMessages: string[] = [];

  // Fresh food has gone bad — only freshFood is cleared, regular foodLevel is unaffected.
  // Buying fresh food without a Preservation Box spoils the fresh food, not the player's
  // existing bread/cheese stock.
  const freshFoodLost = freshPlayer.freshFood; // All unpreserved fresh food spoils

  set((state) => ({
    players: state.players.map(p => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        freshFood: 0, // hasPreservationBox is always false here (early return above)
      };
    }),
  }));

  eventMessages.push(
    `${player.name}'s fresh food has gone bad! Without a Preservation Box, fresh food cannot be stored.`
    + (freshFoodLost > 0 ? ` Lost ${freshFoodLost} units of fresh food.` : '')
  );

  // 55% chance of getting sick from the spoiled food — doctor visit
  if (Math.random() < SPOILED_FOOD_SICKNESS_CHANCE) {
    const doctorCost = 30 + Math.floor(Math.random() * 171); // 30-200g
    set((state) => ({
      players: state.players.map(p => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          isSick: true,
          happiness: Math.max(0, p.happiness - 4),
          gold: Math.max(0, p.gold - doctorCost),
        };
      }),
    }));
    eventMessages.push(
      `${player.name} got food poisoning from the spoiled food! Healer charged ${doctorCost}g. -4 Happiness. Visit a healer to recover!`
    );
  }

  // Show event messages to non-AI players
  if (!player.isAI && eventMessages.length > 0) {
    const existing = get().eventMessage;
    const combined = existing
      ? existing + '\n' + eventMessages.join('\n')
      : eventMessages.join('\n');
    set({ eventMessage: combined, eventSource: 'weekly' as const, phase: 'event' });
  }
}

/** Maps location IDs to job location names used in job definitions */
const JOB_LOCATION_NAMES: Record<string, string> = {
  'guild-hall': 'Guild Hall',
  'bank': 'Bank',
  'forge': 'Forge',
  'academy': 'Academy',
  'general-store': 'General Store',
  'armory': 'Armory',
  'enchanter': 'Enchanter',
  'shadow-market': 'Shadow Market',
  'rusty-tankard': 'Rusty Tankard',
  'fence': 'Fence',
};

/**
 * Auto-use remaining time at turn end based on current location:
 * - At job location: partial work shift (proportional earnings, dependability, etc.)
 * - At own home (slums/noble): proportional relax/sleep bonuses (happiness, health, relaxation)
 * - Elsewhere: generic rest (1 happiness per 4 hours, min 1)
 */
function applyRemainingTimeAtLocation(set: SetFn, get: GetFn, playerId: string): void {
  const player = get().players.find(p => p.id === playerId);
  if (!player || player.timeRemaining <= 0) return;

  const hours = player.timeRemaining;
  const location = player.currentLocation as string;

  // --- At job location: auto-work ---
  const jobLocationName = JOB_LOCATION_NAMES[location];
  const currentJob = player.currentJob ? getJob(player.currentJob) : null;
  if (currentJob && jobLocationName && currentJob.location === jobLocationName) {
    const worked = get().workShift(playerId, hours, 0);
    if (worked) return;
    // Can't work (naked/bad clothes) — fall through to generic rest
  }

  // --- At own home: proportional relax/sleep bonuses ---
  const isAtOwnHome =
    (location === 'noble-heights' && player.housing === 'noble') ||
    (location === 'slums' && player.housing === 'slums');

  if (isAtOwnHome) {
    const relaxRate = player.housing === 'noble' ? 3 : 8;
    const happinessFromRelax = Math.round((hours / relaxRate) * 3);
    const happinessFromSleep = Math.round((hours / 8) * 8);
    const healthFromSleep = Math.round((hours / 8) * 10);
    const relaxationBonus = Math.round((hours / 8) * 5);
    const totalHappiness = Math.max(1, happinessFromRelax + happinessFromSleep);

    set((state) => ({
      players: state.players.map(p =>
        p.id !== playerId ? p : {
          ...p,
          timeRemaining: 0,
          happiness: Math.min(100, p.happiness + totalHappiness),
          health: Math.min(p.maxHealth, p.health + Math.max(0, healthFromSleep)),
          relaxation: Math.min(100, (p.relaxation ?? 0) + Math.max(0, relaxationBonus)),
        }
      ),
    }));
    return;
  }

  // --- Generic rest (anywhere else) ---
  const happinessGain = Math.max(1, Math.floor(hours / 4));
  set((state) => ({
    players: state.players.map(p =>
      p.id !== playerId ? p : {
        ...p,
        timeRemaining: 0,
        happiness: Math.min(100, p.happiness + happinessGain),
      }
    ),
  }));
}

export function createTurnActions(set: SetFn, get: GetFn) {
  const startTurn = createStartTurn(set, get);
  const processWeekEnd = createProcessWeekEnd(set, get);

  return {
    endTurn: () => {
      const state = get();

      // --- Auto-use remaining time based on current location ---
      const turningPlayer = state.players[state.currentPlayerIndex];
      if (turningPlayer && !turningPlayer.isGameOver && turningPlayer.timeRemaining > 0) {
        applyRemainingTimeAtLocation(set, get, turningPlayer.id);
      }

      // --- End-of-turn spoilage check (before switching players) ---
      const endingPlayer = get().players[get().currentPlayerIndex];
      if (endingPlayer && !endingPlayer.isGameOver) {
        processEndOfTurnSpoilage(set, get, endingPlayer.id);
      }

      // Check if current player has achieved victory goals before switching turns
      const currentPlayer = get().players[get().currentPlayerIndex];
      if (currentPlayer && !currentPlayer.isGameOver) {
        if (get().checkVictory(currentPlayer.id)) {
          return; // Victory achieved, don't continue with turn switching
        }
      }

      // C1 FIX: Re-read state after checkVictory, which may have mutated state
      const postVictoryState = get();

      // Check if only one player remains alive - they win (multiplayer only)
      // In single-player, the player must achieve all goals to win — never trigger here
      const alivePlayers = postVictoryState.players.filter(p => !p.isGameOver);
      const isMultiplayer = postVictoryState.players.length > 1;
      if (isMultiplayer && alivePlayers.length <= 1) {
        try { deleteSave(0); } catch { /* ignore */ }
        if (alivePlayers.length === 1) {
          set({
            winner: alivePlayers[0].id,
            phase: 'victory',
            eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
          });
        } else {
          set({
            phase: 'victory',
            eventMessage: 'All players have perished. Game Over!',
          });
        }
        return;
      }

      const { index: nextIndex, isNewWeek } = findNextAlivePlayer(postVictoryState.players, postVictoryState.currentPlayerIndex);

      if (isNewWeek) {
        get().processWeekEnd();
      } else {
        // Start next player's turn (includes apartment robbery check)
        // C1 FIX: Use fresh state for player data
        const freshState = get();
        const nextPlayer = freshState.players[nextIndex];
        if (!nextPlayer) {
          console.error(`[Turn] nextPlayer at index ${nextIndex} is undefined (players: ${freshState.players.length})`);
          return;
        }
        // C9: Move player to their home location at start of turn
        // Also return the ending player to their home so their icon doesn't stay at last visited location
        const homeLocation: LocationId = getHomeLocation(nextPlayer.housing);
        const endingPlayerIdx = postVictoryState.currentPlayerIndex;
        const endingPlayerForHome = freshState.players[endingPlayerIdx];
        const endingHomeLocation: LocationId | null = endingPlayerForHome ? getHomeLocation(endingPlayerForHome.housing) : null;
        set({
          currentPlayerIndex: nextIndex,
          players: freshState.players.map((p, index) => {
            if (index === nextIndex) {
              return { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation, dungeonAttemptsThisTurn: 0, hadRandomEventThisTurn: false, workedThisTurn: false, raiseAttemptedThisTurn: false };
            }
            if (endingHomeLocation && index === endingPlayerIdx) {
              return { ...p, currentLocation: endingHomeLocation };
            }
            return p;
          }),
          selectedLocation: null,
        });
        // Check for apartment robbery at start of turn
        get().startTurn(nextPlayer.id);
      }
    },
    startTurn,
    processWeekEnd,
  };
}
