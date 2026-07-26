import { useCallback } from 'react';
import type { DeathEvent, GameState, Player } from '@/types/game.types';
import { leaveActiveOnlineGame } from '@/network/leaveActiveOnlineGame';

interface UseDeathSpectatorFlowOptions {
  deathEvent: DeathEvent | null;
  players: readonly Player[];
  isOnline: boolean;
  networkMode: GameState['networkMode'];
  localPlayerId: string | null;
  dismissDeathEvent: () => void;
  resetForNewGame: () => void;
}

/**
 * Resolves the local client's death-screen audience and outcome actions.
 * Keeping this outside GameBoard prevents multiplayer cleanup and modal policy
 * from bloating the board orchestration component.
 */
export function useDeathSpectatorFlow({
  deathEvent,
  players,
  isOnline,
  networkMode,
  localPlayerId,
  dismissDeathEvent,
  resetForNewGame,
}: UseDeathSpectatorFlowOptions) {
  // In online games each client should only receive the dramatic choice for its
  // own eliminated player. Other clients continue watching the authoritative turn.
  const visibleDeathEvent = deathEvent && (
    !isOnline || deathEvent.playerId === localPlayerId
  ) ? deathEvent : null;
  const canSpectateAfterDeath = !!visibleDeathEvent?.isPermadeath
    && players.some(player => !player.isGameOver);
  const deathLeaveLabel = isOnline
    ? networkMode === 'host' ? 'Leave & Close Room' : 'Leave Game'
    : 'End Game';

  const onSpectate = useCallback(() => {
    dismissDeathEvent();
  }, [dismissDeathEvent]);

  const onLeave = useCallback(() => {
    if (isOnline) {
      leaveActiveOnlineGame(
        networkMode === 'host'
          ? 'Host left the room after being eliminated'
          : 'Player left after being eliminated',
      );
      return;
    }
    resetForNewGame();
  }, [isOnline, networkMode, resetForNewGame]);

  return {
    visibleDeathEvent,
    canSpectateAfterDeath,
    deathLeaveLabel,
    onSpectate,
    onLeave,
  };
}
