import { useState, useEffect, useRef } from 'react';
import type { Player, LocationId } from '@/types/game.types';
import { getAnimationPointsWithBoundaries, getAnimationPoints } from '@/data/locations';
import { cn } from '@/lib/utils';
import { CharacterPortrait } from './CharacterPortrait';

interface AnimatedPlayerTokenProps {
  player: Player;
  isCurrent: boolean;
  animationPath: LocationId[] | null;
  onAnimationComplete?: () => void;
  onLocationReached?: (pathLocationIndex: number) => void;
}

const ANIMATION_STEP_MS = 80; // ms per waypoint (was 150ms — faster, smoother movement)

export function AnimatedPlayerToken({
  player,
  isCurrent,
  animationPath,
  onAnimationComplete,
  onLocationReached,
}: AnimatedPlayerTokenProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const animatingRef = useRef(false);
  const pointIndexRef = useRef(0);

  // Keep callback refs up to date without triggering animation restarts
  const onCompleteRef = useRef(onAnimationComplete);
  const onLocationRef = useRef(onLocationReached);
  onCompleteRef.current = onAnimationComplete;
  onLocationRef.current = onLocationReached;

  // Initialize position based on current location
  useEffect(() => {
    if (!animationPath) {
      // Use the first point from a single-location "path"
      const points = getAnimationPoints([player.currentLocation as LocationId]);
      if (points.length > 0) {
        setPosition({ x: points[0][0], y: points[0][1] });
      }
      pointIndexRef.current = 0;
    }
  }, [player.currentLocation, animationPath]);

  // Handle path animation through all waypoints
  // Only re-runs when animationPath changes (not on position/callback changes)
  useEffect(() => {
    if (!animationPath || animationPath.length === 0) {
      animatingRef.current = false;
      return;
    }

    // Get all animation points with location boundary info
    const { points: allPoints, locationBoundaries } = getAnimationPointsWithBoundaries(animationPath);
    if (allPoints.length === 0) {
      animatingRef.current = false;
      return;
    }

    // Start animation from first point
    animatingRef.current = true;
    pointIndexRef.current = 0;
    setPosition({ x: allPoints[0][0], y: allPoints[0][1] });
    onLocationRef.current?.(0);

    // If only one point, animation is done immediately
    if (allPoints.length <= 1) {
      animatingRef.current = false;
      onCompleteRef.current?.();
      return;
    }

    // Step through waypoints with setInterval for consistent timing
    const interval = setInterval(() => {
      const nextIdx = pointIndexRef.current + 1;
      pointIndexRef.current = nextIdx;
      setPosition({ x: allPoints[nextIdx][0], y: allPoints[nextIdx][1] });

      // Check if we just reached a location zone center
      const locIdx = locationBoundaries.indexOf(nextIdx);
      if (locIdx !== -1) {
        onLocationRef.current?.(locIdx);
      }

      // Check if we're done
      if (nextIdx >= allPoints.length - 1) {
        clearInterval(interval);
        animatingRef.current = false;
        onCompleteRef.current?.();
      }
    }, ANIMATION_STEP_MS);

    return () => clearInterval(interval);
  }, [animationPath]); // Only animationPath — callbacks use refs

  if (!position) return null;

  const hasCurse = player.activeCurses.length > 0;

  return (
    <div
      className={cn(
        'absolute w-20 h-20 rounded-full shadow-xl z-50 relative',
        isCurrent && !animationPath && 'ring-2 ring-yellow-400 ring-offset-1 animate-bounce',
        animationPath && 'scale-110'
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: `left ${ANIMATION_STEP_MS}ms ease-in-out, top ${ANIMATION_STEP_MS}ms ease-in-out`,
        boxShadow: `0 4px 15px rgba(0,0,0,0.4), 0 0 ${isCurrent ? '20px' : '10px'} ${player.color}`,
      }}
      title={player.name}
    >
      <CharacterPortrait
        portraitId={player.portraitId}
        playerColor={player.color}
        playerName={player.name}
        size={80}
        isAI={player.isAI}
        hasCurse={hasCurse}
      />
      {hasCurse && (
        <>
          {/* 🔮 badge */}
          <div
            className="absolute -top-1 -right-1 z-10 rounded-full
                       w-5 h-5 flex items-center justify-center leading-none
                       animate-curse-pulse select-none pointer-events-none"
            style={{
              fontSize: '10px',
              background: 'rgba(59, 7, 100, 0.85)',
              border: '1px solid rgba(192, 132, 252, 0.6)',
            }}
          >
            🔮
          </div>
          {/* Partikler */}
          {[
            { left: '15%', delay: 0 },
            { left: '50%', delay: 0.7 },
            { left: '80%', delay: 1.3 },
          ].map((p, i) => (
            <span
              key={i}
              className="absolute animate-curse-particle pointer-events-none select-none"
              style={{
                left: p.left,
                bottom: '100%',
                fontSize: '8px',
                color: 'rgb(192, 132, 252)',
                animationDelay: `${p.delay}s`,
              }}
            >
              ✦
            </span>
          ))}
        </>
      )}
    </div>
  );
}
