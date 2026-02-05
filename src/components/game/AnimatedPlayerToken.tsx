import { useState, useEffect, useRef } from 'react';
import type { Player, LocationId } from '@/types/game.types';
import { ZONE_CONFIGS } from '@/data/locations';
import { cn } from '@/lib/utils';

interface AnimatedPlayerTokenProps {
  player: Player;
  isCurrent: boolean;
  animationPath: LocationId[] | null;
  onAnimationComplete?: () => void;
}

// Get the center position of a location zone
const getLocationCenter = (locationId: LocationId): { x: number; y: number } => {
  const zone = ZONE_CONFIGS.find(z => z.id === locationId);
  if (!zone) return { x: 50, y: 50 };
  return {
    x: zone.x + zone.width / 2,
    y: zone.y + zone.height - 5, // Position near bottom of zone
  };
};

export function AnimatedPlayerToken({
  player,
  isCurrent,
  animationPath,
  onAnimationComplete,
}: AnimatedPlayerTokenProps) {
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const animatingRef = useRef(false);

  // Initialize position based on current location
  useEffect(() => {
    if (!animationPath) {
      setPosition(getLocationCenter(player.currentLocation as LocationId));
      setCurrentPathIndex(0);
    }
  }, [player.currentLocation, animationPath]);

  // Handle path animation
  useEffect(() => {
    if (!animationPath || animationPath.length === 0) {
      animatingRef.current = false;
      return;
    }

    // Start animation from first position
    if (!animatingRef.current) {
      animatingRef.current = true;
      setCurrentPathIndex(0);
      setPosition(getLocationCenter(animationPath[0]));
    }

    // Animate through path
    const animateNext = () => {
      setCurrentPathIndex((prev) => {
        const next = prev + 1;
        if (next >= animationPath.length) {
          // Animation complete
          animatingRef.current = false;
          onAnimationComplete?.();
          return prev;
        }
        // Move to next position
        setPosition(getLocationCenter(animationPath[next]));
        return next;
      });
    };

    // Step through path with delay
    const timer = setTimeout(animateNext, 300); // 300ms per step

    return () => clearTimeout(timer);
  }, [animationPath, currentPathIndex, onAnimationComplete]);

  if (!position) return null;

  return (
    <div
      className={cn(
        'absolute w-10 h-10 rounded-full border-3 border-white shadow-xl z-50',
        'transition-all duration-300 ease-in-out',
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
