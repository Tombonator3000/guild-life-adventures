import { useState, useEffect, useRef } from 'react';
import type { Player, LocationId } from '@/types/game.types';
import { getAnimationPoints } from '@/data/locations';
import { cn } from '@/lib/utils';
import type { MovementWaypoint } from '@/data/locations';

interface AnimatedPlayerTokenProps {
  player: Player;
  isCurrent: boolean;
  animationPath: LocationId[] | null;
  onAnimationComplete?: () => void;
}

export function AnimatedPlayerToken({
  player,
  isCurrent,
  animationPath,
  onAnimationComplete,
}: AnimatedPlayerTokenProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const animatingRef = useRef(false);
  const pointIndexRef = useRef(0);

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
  useEffect(() => {
    if (!animationPath || animationPath.length === 0) {
      animatingRef.current = false;
      return;
    }

    // Get all animation points (zone centers + intermediate waypoints)
    const allPoints: MovementWaypoint[] = getAnimationPoints(animationPath);
    if (allPoints.length === 0) {
      animatingRef.current = false;
      return;
    }

    // Start animation
    if (!animatingRef.current) {
      animatingRef.current = true;
      pointIndexRef.current = 0;
      setPosition({ x: allPoints[0][0], y: allPoints[0][1] });
    }

    const currentIdx = pointIndexRef.current;

    // Check if we're done
    if (currentIdx >= allPoints.length - 1) {
      animatingRef.current = false;
      onAnimationComplete?.();
      return;
    }

    // Animate to next point
    const timer = setTimeout(() => {
      const nextIdx = currentIdx + 1;
      pointIndexRef.current = nextIdx;
      setPosition({ x: allPoints[nextIdx][0], y: allPoints[nextIdx][1] });
    }, 150); // 150ms per waypoint (faster since there are more points now)

    return () => clearTimeout(timer);
  }, [animationPath, position, onAnimationComplete]);

  if (!position) return null;

  return (
    <div
      className={cn(
        'absolute w-10 h-10 rounded-full border-3 border-white shadow-xl z-50',
        'transition-all duration-150 ease-in-out',
        isCurrent && 'ring-2 ring-yellow-400 ring-offset-1 animate-bounce',
        animationPath && 'scale-110'
      )}
      style={{
        backgroundColor: player.color,
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        boxShadow: `0 4px 15px rgba(0,0,0,0.4), 0 0 ${isCurrent ? '20px' : '10px'} ${player.color}`,
      }}
      title={player.name}
    >
      {player.isAI && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-md">AI</span>
        </div>
      )}
      {!player.isAI && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow-md">
            {player.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
