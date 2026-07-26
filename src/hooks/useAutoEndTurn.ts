import { useCallback, useEffect, useRef } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';

export function useAutoEndTurn() {
  const currentPlayer = useCurrentPlayer();
  const {
    phase,
    currentPlayerIndex,
    checkDeath,
    endTurn,
    networkMode,
  } = useGameStore();

  const scheduledEndTurnRef = useRef<number | null>(null);
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleEndTurn = useCallback((playerIndex: number, delay: number) => {
    if (scheduledEndTurnRef.current === playerIndex) return;
    scheduledEndTurnRef.current = playerIndex;
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);

    autoEndTimerRef.current = setTimeout(() => {
      const store = useGameStore.getState();
      const livePlayer = store.players[store.currentPlayerIndex];
      if (store.currentPlayerIndex === playerIndex && livePlayer?.isGameOver) {
        // A death-causing event must not leave the board in `event` phase, because
        // AI turns only begin in `playing`. Preserve deathEvent for the dead
        // player's choice modal, but clear the old action/event that caused death.
        useGameStore.setState({
          phase: 'playing',
          eventMessage: null,
          eventSource: null,
          selectedLocation: null,
        });
        store.endTurn();
      }
      scheduledEndTurnRef.current = null;
      autoEndTimerRef.current = null;
    }, delay);
  }, []);

  const checkAutoReturn = useCallback(() => {
    if (!currentPlayer) return false;

    // Permadeath may already have been resolved by the action that dealt the
    // final damage. The old code called checkDeath() again, which returned false
    // for an already-eliminated player and left that dead player holding the turn.
    if (currentPlayer.isGameOver) {
      // Guests never advance authoritative turns. The host sees the same dead
      // current player and performs the recovery, then syncs the new turn.
      if (networkMode !== 'guest') {
        scheduleEndTurn(currentPlayerIndex, 100);
      }
      return true;
    }

    // AI players normally manage their own time, but health can reach zero at
    // the end of an AI action. Resolve death before returning to the AI handler.
    if (currentPlayer.health <= 0) {
      if (networkMode === 'guest') return true;
      checkDeath(currentPlayer.id);
      const resolvedPlayer = useGameStore.getState().players[currentPlayerIndex];
      if (resolvedPlayer?.isGameOver) {
        scheduleEndTurn(currentPlayerIndex, 100);
      }
      return true;
    }

    if (currentPlayer.isAI) return false;

    if (networkMode === 'guest') {
      if (currentPlayer.timeRemaining <= 0) {
        if (scheduledEndTurnRef.current === currentPlayerIndex) return true;
        scheduledEndTurnRef.current = currentPlayerIndex;
        const localId = useGameStore.getState().localPlayerId;
        if (currentPlayer.id === localId) {
          if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = setTimeout(() => {
            const store = useGameStore.getState();
            if (store.currentPlayerIndex === currentPlayerIndex &&
                store.players[store.currentPlayerIndex]?.id === localId &&
                store.players[store.currentPlayerIndex]?.timeRemaining <= 0) {
              store.endTurn();
            }
            scheduledEndTurnRef.current = null;
            autoEndTimerRef.current = null;
          }, 100);
        }
        return true;
      }
      return false;
    }

    if (currentPlayer.timeRemaining <= 0) {
      if (scheduledEndTurnRef.current === currentPlayerIndex) return true;
      scheduledEndTurnRef.current = currentPlayerIndex;
      const homeLocation: LocationId = currentPlayer.housing === 'noble' ? 'noble-heights' : 'slums';

      if (currentPlayer.currentLocation !== homeLocation) {
        toast.info(`${currentPlayer.name}'s time is up! Returning home...`);
      }

      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = setTimeout(() => {
        const store = useGameStore.getState();
        if (store.currentPlayerIndex === currentPlayerIndex &&
            store.players[store.currentPlayerIndex]?.id === currentPlayer.id &&
            store.players[store.currentPlayerIndex]?.timeRemaining <= 0) {
          store.endTurn();
        }
        scheduledEndTurnRef.current = null;
        autoEndTimerRef.current = null;
      }, 500);
      return true;
    }

    return false;
  }, [currentPlayer, checkDeath, currentPlayerIndex, networkMode, scheduleEndTurn]);

  useEffect(() => {
    scheduledEndTurnRef.current = null;
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = null;
    }
  }, [currentPlayerIndex]);

  useEffect(() => {
    if (phase === 'playing' || (phase === 'event' && currentPlayer?.isGameOver)) {
      checkAutoReturn();
    }
  }, [phase, currentPlayer?.isGameOver, checkAutoReturn]);

  useEffect(() => () => {
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
  }, []);

  return { checkAutoReturn };
}
