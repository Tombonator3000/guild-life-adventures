// Turn management helpers
// endTurn, startTurn, processWeekEnd - the biggest functions in the store
//
// startTurn logic → ./startTurnHelpers.ts
// processWeekEnd logic → ./weekEndHelpers.ts
// endTurn logic + orchestrator → this file

import type { LocationId } from '@/types/game.types';
import { HOURS_PER_TURN } from '@/types/game.types';
import type { SetFn, GetFn } from '../storeTypes';
import { createStartTurn } from './startTurnHelpers';
import { createProcessWeekEnd } from './weekEndHelpers';

// Players always start their turn at home: Noble Heights or The Slums
// Shared utility used by startTurnHelpers, weekEndHelpers, and endTurn below
export function getHomeLocation(housing: string): LocationId {
  if (housing === 'noble') return 'noble-heights';
  return 'slums';
}

export function createTurnActions(set: SetFn, get: GetFn) {
  const startTurn = createStartTurn(set, get);
  const processWeekEnd = createProcessWeekEnd(set, get);

  return {
    endTurn: () => {
      const state = get();

      // Check if current player has achieved victory goals before switching turns
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer && !currentPlayer.isGameOver) {
        if (get().checkVictory(currentPlayer.id)) {
          return; // Victory achieved, don't continue with turn switching
        }
      }

      // Find next alive player
      const findNextAlivePlayer = (startIndex: number): { index: number; isNewWeek: boolean } => {
        let index = startIndex;
        let loopCount = 0;
        const totalPlayers = state.players.length;

        while (loopCount < totalPlayers) {
          index = (index + 1) % totalPlayers;
          const isNewWeek = index === 0;

          // Check if this player is alive
          if (!state.players[index].isGameOver) {
            return { index, isNewWeek };
          }

          // If we've checked a full loop and all players are dead, game over
          loopCount++;
          if (loopCount >= totalPlayers) {
            // All players are game over - this shouldn't normally happen
            return { index: 0, isNewWeek: true };
          }
        }

        return { index: (startIndex + 1) % totalPlayers, isNewWeek: (startIndex + 1) % totalPlayers === 0 };
      };

      // Check if only one player remains alive - they win (multiplayer only)
      // In single-player, the player must achieve all goals to win
      const alivePlayers = state.players.filter(p => !p.isGameOver);
      if (alivePlayers.length === 1 && state.players.length > 1) {
        set({
          winner: alivePlayers[0].id,
          phase: 'victory',
          eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
        });
        return;
      }

      if (alivePlayers.length === 0) {
        set({
          phase: 'victory',
          eventMessage: 'All players have perished. Game Over!',
        });
        return;
      }

      const { index: nextIndex, isNewWeek } = findNextAlivePlayer(state.currentPlayerIndex);

      if (isNewWeek) {
        get().processWeekEnd();
      } else {
        // Start next player's turn (includes apartment robbery check)
        const nextPlayer = state.players[nextIndex];
        // C9: Move player to their home location at start of turn
        const homeLocation: LocationId = getHomeLocation(nextPlayer.housing);
        set({
          currentPlayerIndex: nextIndex,
          players: state.players.map((p, index) =>
            index === nextIndex
              ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation, dungeonAttemptsThisTurn: 0 }
              : p
          ),
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
