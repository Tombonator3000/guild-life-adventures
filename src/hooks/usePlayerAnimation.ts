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
  const [pathVersion, setPathVersion] = useState(0);
  const pendingMoveRef = useRef<PendingMove | null>(null);

  // Track animation progress for mid-movement redirects
  const currentPathRef = useRef<LocationId[] | null>(null);
  const lastReachedLocationIndexRef = useRef(0);
  const accumulatedStepsRef = useRef(0);

  // Called by AnimatedPlayerToken when it reaches a location zone center
  const handleLocationReached = useCallback((pathLocationIndex: number) => {
    lastReachedLocationIndexRef.current = pathLocationIndex;
    // Accumulated steps = how many location-to-location moves completed
    // (pathLocationIndex 0 = start, 1 = first step complete, etc.)
    accumulatedStepsRef.current = pathLocationIndex;
  }, []);

  // Get the current intermediate location during animation
  const getCurrentIntermediateLocation = useCallback((): LocationId | null => {
    const path = currentPathRef.current;
    if (!path) return null;
    const idx = lastReachedLocationIndexRef.current;
    return path[idx] ?? null;
  }, []);

  // Get accumulated steps so far during animation
  const getAccumulatedSteps = useCallback((): number => {
    return accumulatedStepsRef.current;
  }, []);

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
    // Reset tracking
    currentPathRef.current = null;
    lastReachedLocationIndexRef.current = 0;
    accumulatedStepsRef.current = 0;
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
    // Reset tracking for fresh movement
    currentPathRef.current = path;
    lastReachedLocationIndexRef.current = 0;
    accumulatedStepsRef.current = 0;
    setAnimatingPlayer(playerId);
    setAnimationPath(path);
    setPathVersion(v => v + 1);
  }, []);

  // Redirect animation mid-movement to a new destination.
  // Uses accumulated time tracking: the new path starts from the last reached location,
  // and total time = steps already taken + new path steps.
  const redirectAnimation = useCallback((
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
    // Update tracking for the new path segment
    currentPathRef.current = path;
    lastReachedLocationIndexRef.current = 0;
    // accumulatedSteps is NOT reset — it carries over from previous segments
    // The caller (useLocationClick) already factored accumulated steps into timeCost
    // Increment pathVersion to force AnimatedPlayerToken remount (resets internal refs)
    setPathVersion(v => v + 1);
    setAnimationPath(path);
  }, []);

  // Start a visual-only animation for a remote player (no movePlayer on completion)
  const startRemoteAnimation = useCallback((
    playerId: string,
    path: LocationId[],
  ) => {
    // Don't set pendingMoveRef — remote animations are purely visual.
    // When handleAnimationComplete fires, pendingMoveRef is null so it just clears state.
    currentPathRef.current = path;
    lastReachedLocationIndexRef.current = 0;
    accumulatedStepsRef.current = 0;
    setAnimatingPlayer(playerId);
    setAnimationPath(path);
    setPathVersion(v => v + 1);
  }, []);

  return {
    animatingPlayer,
    animationPath,
    pathVersion,
    handleAnimationComplete,
    handleLocationReached,
    getCurrentIntermediateLocation,
    getAccumulatedSteps,
    startAnimation,
    redirectAnimation,
    startRemoteAnimation,
  };
}
