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
    setEventMessage,
    setPhase,
    endTurn,
    networkMode,
  } = useGameStore();

  const scheduledEndTurnRef = useRef<number | null>(null);
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAutoReturn = useCallback(() => {
    if (!currentPlayer) return false;
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

    if (currentPlayer.health <= 0) {
      const isDead = checkDeath(currentPlayer.id);
      if (isDead) {
        setEventMessage(`${currentPlayer.name} has died! Game over for this player.`);
        setPhase('event');
        if (scheduledEndTurnRef.current !== currentPlayerIndex) {
          scheduledEndTurnRef.current = currentPlayerIndex;
          if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = setTimeout(() => {
            const store = useGameStore.getState();
            if (store.currentPlayerIndex === currentPlayerIndex) {
              store.endTurn();
            }
            scheduledEndTurnRef.current = null;
            autoEndTimerRef.current = null;
          }, 100);
        }
        return true;
      }
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
  }, [currentPlayer, checkDeath, setEventMessage, setPhase, currentPlayerIndex, networkMode]);

  useEffect(() => {
    scheduledEndTurnRef.current = null;
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = null;
    }
  }, [currentPlayerIndex]);

  useEffect(() => {
    if (phase === 'playing') checkAutoReturn();
  }, [phase, checkAutoReturn]);

  useEffect(() => () => {
    if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
  }, []);

  return { checkAutoReturn };
}
