import { useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { LOCATIONS } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';

interface PendingMove {
  playerId: string;
  destination: LocationId;
  route: LocationId[];
  isPartial?: boolean;
}

function appendRoute(base: LocationId[], segment: LocationId[]): LocationId[] {
  const result = [...base];
  for (const location of segment) {
    if (result[result.length - 1] !== location) result.push(location);
  }
  return result;
}

export function usePlayerAnimation() {
  const { travelPlayer, selectLocation, endTurn } = useGameStore();

  const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
  const [animationPath, setAnimationPath] = useState<LocationId[] | null>(null);
  const [pathVersion, setPathVersion] = useState(0);
  const pendingMoveRef = useRef<PendingMove | null>(null);

  // Track animation progress for mid-movement redirects
  const currentPathRef = useRef<LocationId[] | null>(null);
  const routePrefixRef = useRef<LocationId[]>([]);
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
      const result = travelPlayer(pending.playerId, pending.route);
      const rejected = result && !result.success;

      if (rejected) {
        toast.error(result.message);
      } else if (pending.isPartial) {
        // Partial travel: commit last reachable location, spend canonical route time, end turn
        toast.info('Not enough time to reach destination. Turn ended.');
        selectLocation(null);
        setTimeout(() => {
          endTurn();
        }, 300);
      } else {
        selectLocation(pending.destination);
        toast.success(`Traveled to ${LOCATIONS.find(location => location.id === pending.destination)?.name}`);
      }
      pendingMoveRef.current = null;
    }

    // Reset tracking
    currentPathRef.current = null;
    routePrefixRef.current = [];
    lastReachedLocationIndexRef.current = 0;
    accumulatedStepsRef.current = 0;
    setAnimatingPlayer(null);
    setAnimationPath(null);
  }, [travelPlayer, selectLocation, endTurn]);

  // Start an animation for player movement. The displayed cost is retained in
  // the call signature for UI compatibility, but the host computes the charge.
  const startAnimation = useCallback((
    playerId: string,
    destination: LocationId,
    _moveCost: number,
    path: LocationId[],
    isPartial?: boolean,
  ) => {
    pendingMoveRef.current = {
      playerId,
      destination,
      route: path,
      isPartial,
    };
    currentPathRef.current = path;
    routePrefixRef.current = [];
    lastReachedLocationIndexRef.current = 0;
    accumulatedStepsRef.current = 0;
    setAnimatingPlayer(playerId);
    setAnimationPath(path);
    setPathVersion(version => version + 1);
  }, []);

  // Redirect animation mid-movement. Build the full route already traversed
  // plus the new segment so the host can validate and price the actual path.
  const redirectAnimation = useCallback((
    playerId: string,
    destination: LocationId,
    _moveCost: number,
    path: LocationId[],
    isPartial?: boolean,
  ) => {
    const currentPath = currentPathRef.current ?? [];
    const reachedIndex = Math.min(lastReachedLocationIndexRef.current, Math.max(0, currentPath.length - 1));
    const traversedSegment = currentPath.slice(0, reachedIndex + 1);
    const fullTraversed = appendRoute(routePrefixRef.current, traversedSegment);
    const fullRoute = appendRoute(fullTraversed, path.slice(1));

    pendingMoveRef.current = {
      playerId,
      destination,
      route: fullRoute,
      isPartial,
    };
    // Store completed locations before the start of the new animation segment.
    routePrefixRef.current = fullTraversed.slice(0, -1);
    currentPathRef.current = path;
    lastReachedLocationIndexRef.current = 0;
    // accumulatedSteps is intentionally not reset: useLocationClick uses it
    // only to decide whether a redirect is visually affordable before commit.
    setPathVersion(version => version + 1);
    setAnimationPath(path);
  }, []);

  // Start a visual-only animation for a remote player (no state commit on completion)
  const startRemoteAnimation = useCallback((
    playerId: string,
    path: LocationId[],
  ) => {
    pendingMoveRef.current = null;
    currentPathRef.current = path;
    routePrefixRef.current = [];
    lastReachedLocationIndexRef.current = 0;
    accumulatedStepsRef.current = 0;
    setAnimatingPlayer(playerId);
    setAnimationPath(path);
    setPathVersion(version => version + 1);
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
