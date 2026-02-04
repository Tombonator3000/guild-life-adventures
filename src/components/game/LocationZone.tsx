import { ReactNode } from 'react';
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
  return (
    <div
      className={cn(
        'location-zone group',
        isSelected && 'active',
        isCurrentLocation && 'ring-2 ring-primary ring-offset-2 ring-offset-transparent'
      )}
      style={{
        top: location.position.top,
        left: location.position.left,
        width: location.position.width,
        height: location.position.height,
      }}
      onClick={onClick}
    >
      {/* Location name tooltip */}
      <div className={cn(
        'absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30',
        isSelected && 'opacity-100'
      )}>
        <div className="parchment-panel px-3 py-1 whitespace-nowrap">
          <span className="font-display text-sm font-semibold">{location.name}</span>
          {moveCost > 0 && !isCurrentLocation && (
            <span className="ml-2 text-xs text-muted-foreground">({moveCost}h)</span>
          )}
        </div>
      </div>

      {/* Player tokens container */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {children}
      </div>

      {/* Current location indicator */}
      {isCurrentLocation && (
        <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse-gold pointer-events-none" />
      )}
    </div>
  );
}
