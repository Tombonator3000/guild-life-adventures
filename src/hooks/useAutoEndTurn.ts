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
  } = useGameStore();

  // Guard against double endTurn — tracks which playerIndex the scheduled endTurn is for
  const scheduledEndTurnRef = useRef<number | null>(null);
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if player should auto-return to housing when time runs out
  const checkAutoReturn = useCallback(() => {
    if (!currentPlayer) return;

    // Check for death first
    if (currentPlayer.health <= 0) {
      const isDead = checkDeath(currentPlayer.id);
      if (isDead) {
        setEventMessage(`${currentPlayer.name} has died! Game over for this player.`);
        setPhase('event');
        // Move to next player's turn after death — guard against double fire
        if (scheduledEndTurnRef.current !== currentPlayerIndex) {
          scheduledEndTurnRef.current = currentPlayerIndex;
          if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
          autoEndTimerRef.current = setTimeout(() => {
            // Only fire if still the same player's turn
            const storeIdx = useGameStore.getState().currentPlayerIndex;
            if (storeIdx === currentPlayerIndex) {
              endTurn();
            }
            scheduledEndTurnRef.current = null;
            autoEndTimerRef.current = null;
          }, 100);
        }
        return true;
      }
    }

    // Check if time has run out
    if (currentPlayer.timeRemaining <= 0) {
      // Guard: don't schedule a second endTurn for the same player
      if (scheduledEndTurnRef.current === currentPlayerIndex) return true;
      scheduledEndTurnRef.current = currentPlayerIndex;

      // Get player's home location based on housing
      const homeLocation: LocationId = currentPlayer.housing === 'noble' ? 'noble-heights' : 'slums';

      // Only move if not already at home
      if (currentPlayer.currentLocation !== homeLocation) {
        toast.info(`${currentPlayer.name}'s time is up! Returning home...`);
      }

      // End turn automatically — guarded with playerIndex check
      if (autoEndTimerRef.current) clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = setTimeout(() => {
        const storeIdx = useGameStore.getState().currentPlayerIndex;
        if (storeIdx === currentPlayerIndex) {
          endTurn();
        }
        scheduledEndTurnRef.current = null;
        autoEndTimerRef.current = null;
      }, 500);
      return true;
    }

    return false;
  }, [currentPlayer, checkDeath, setEventMessage, setPhase, endTurn, currentPlayerIndex]);

  // Reset auto-end guard when player turn changes
  useEffect(() => {
    scheduledEndTurnRef.current = null;
    if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = null;
    }
  }, [currentPlayerIndex]);

  // Monitor time and health changes
  useEffect(() => {
    if (currentPlayer && phase === 'playing') {
      checkAutoReturn();
    }
  }, [currentPlayer?.timeRemaining, currentPlayer?.health, phase, checkAutoReturn]);

  return { checkAutoReturn };
}
