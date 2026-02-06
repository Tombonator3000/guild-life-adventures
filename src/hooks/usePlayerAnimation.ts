import { useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { LOCATIONS } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';

interface PendingMove {
  playerId: string;
  destination: LocationId;
  timeCost: number;
  isPartial?: boolean;
}

export function usePlayerAnimation() {
  const { movePlayer, selectLocation, endTurn } = useGameStore();

  const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
  const [animationPath, setAnimationPath] = useState<LocationId[] | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    const pending = pendingMoveRef.current;
    if (pending) {
      if (pending.isPartial) {
        // Partial travel: move player to last reachable location, spend all time, end turn
        movePlayer(pending.playerId, pending.destination, pending.timeCost);
        toast.info(`Not enough time to reach destination. Turn ended.`);
        selectLocation(null);
        // Auto-end turn after a short delay
        setTimeout(() => {
          endTurn();
        }, 300);
      } else {
        // Full travel: move player to destination
        movePlayer(pending.playerId, pending.destination, pending.timeCost);
        selectLocation(pending.destination);
        toast.success(`Traveled to ${LOCATIONS.find(l => l.id === pending.destination)?.name}`);
      }
      pendingMoveRef.current = null;
    }
    setAnimatingPlayer(null);
    setAnimationPath(null);
  }, [movePlayer, selectLocation, endTurn]);

  // Start an animation for player movement
  const startAnimation = useCallback((
    playerId: string,
    destination: LocationId,
    timeCost: number,
    path: LocationId[],
    isPartial?: boolean,
  ) => {
    pendingMoveRef.current = {
      playerId,
      destination,
      timeCost,
      isPartial,
    };
    setAnimatingPlayer(playerId);
    setAnimationPath(path);
  }, []);

  return {
    animatingPlayer,
    animationPath,
    handleAnimationComplete,
    startAnimation,
  };
}
