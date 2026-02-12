import { ReactNode, useState } from 'react';
import type { Location } from '@/types/game.types';
import { cn } from '@/lib/utils';

interface LocationZoneProps {
  location: Location;
  isSelected: boolean;
  isCurrentLocation: boolean;
  moveCost: number;
  onClick: () => void;
  children?: ReactNode;
}

export function LocationZone({ 
  location, 
  isSelected, 
  isCurrentLocation,
  moveCost, 
  onClick, 
  children 
}: LocationZoneProps) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  return (
    <div
      className={cn(
        'location-zone group',
        isSelected && 'active'
      )}
      style={{
        top: location.position.top,
        left: location.position.left,
        width: location.position.width,
        height: location.position.height,
      }}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Location name tooltip - follows cursor */}
      {mousePos && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{
            left: mousePos.x + 12,
            top: mousePos.y - 10,
          }}
        >
          <div className="parchment-panel px-3 py-1 whitespace-nowrap shadow-lg">
            <span className="font-display text-sm font-semibold">{location.name}</span>
            {moveCost > 0 && !isCurrentLocation && (
              <span className="ml-2 text-xs text-muted-foreground">({moveCost}h)</span>
            )}
          </div>
        </div>
      )}

      {/* Player tokens container */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {children}
      </div>

    </div>
  );
}
