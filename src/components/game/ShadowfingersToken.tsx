/**
 * Shadowfingers animated token — appears on the board during robbery/sabotage events.
 * Animates from a random board edge to the victim's location, then fades out.
 */

import { useState, useEffect, useRef } from 'react';
import type { LocationId } from '@/types/game.types';
import { ZONE_CONFIGS } from '@/data/locations';
import shadowfingersImage from '@/assets/shadowfingers.jpg';

interface ShadowfingersTokenProps {
  targetLocation: LocationId;
  onComplete?: () => void;
}

const STEP_MS = 70; // slightly faster than player tokens
const FADE_OUT_MS = 600;

/** Get the center position of a location zone as percentages */
function getZoneCenter(locationId: LocationId): { x: number; y: number } {
  const zone = ZONE_CONFIGS.find(z => z.id === locationId);
  if (!zone) return { x: 50, y: 50 };
  return { x: zone.x + zone.width / 2, y: zone.y + zone.height - 5 };
}

/** Pick a random edge point on the board */
function getRandomEdgePoint(): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4);
  switch (side) {
    case 0: return { x: Math.random() * 100, y: -5 };  // top
    case 1: return { x: 105, y: Math.random() * 100 };  // right
    case 2: return { x: Math.random() * 100, y: 105 };  // bottom
    default: return { x: -5, y: Math.random() * 100 }; // left
  }
}

/** Interpolate steps between two points */
function interpolateSteps(from: { x: number; y: number }, to: { x: number; y: number }, steps: number) {
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    result.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  return result;
}

export function ShadowfingersToken({ targetLocation, onComplete }: ShadowfingersTokenProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [fadingOut, setFadingOut] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const start = getRandomEdgePoint();
    const end = getZoneCenter(targetLocation);
    const steps = interpolateSteps(start, end, 15);

    setPosition(steps[0]);
    let idx = 0;

    const interval = setInterval(() => {
      idx++;
      if (idx >= steps.length) {
        clearInterval(interval);
        // Hold at target briefly, then fade out
        setFadingOut(true);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, FADE_OUT_MS);
        return;
      }
      setPosition(steps[idx]);
    }, STEP_MS);

    return () => clearInterval(interval);
  }, [targetLocation]);

  if (!position) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: `left ${STEP_MS}ms linear, top ${STEP_MS}ms linear, opacity ${FADE_OUT_MS}ms ease-out`,
        opacity: fadingOut ? 0 : 1,
      }}
    >
      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-900/80 shadow-lg shadow-black/50 relative">
        <img
          src={shadowfingersImage}
          alt="Shadowfingers"
          className="w-full h-full object-cover object-top"
        />
        {/* Dark overlay for menacing effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      {/* Name tag */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap
                      font-display text-[9px] text-amber-200 bg-black/70 px-1.5 py-0.5 rounded">
        Shadowfingers
      </div>
    </div>
  );
}
