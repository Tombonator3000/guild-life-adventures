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
  isHexed?: boolean;
  hexCasterName?: string;
  /** LOQ: This location has a pending (uncompleted) quest objective */
  isQuestObjective?: boolean;
  /** LOQ: This location's quest objective has been completed */
  isQuestObjectiveDone?: boolean;
}

export function LocationZone({
  location,
  isSelected,
  isCurrentLocation,
  moveCost,
  onClick,
  children,
  isHexed = false,
  hexCasterName,
  isQuestObjective = false,
  isQuestObjectiveDone = false,
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
      data-zone-id={location.id}
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
            {isHexed && hexCasterName && (
              <span className="ml-1 text-xs text-purple-400">🔮 by {hexCasterName}</span>
            )}
          </div>
        </div>
      )}

      {/* LOQ: Quest objective overlay — golden pulse for pending, green checkmark for done */}
      {(isQuestObjective || isQuestObjectiveDone) && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded overflow-hidden">
          {isQuestObjective && !isQuestObjectiveDone && (
            <>
              {/* Pulsing golden glow */}
              <div
                className="absolute inset-0 animate-quest-pulse"
                style={{
                  background: 'rgba(180,130,0,0.18)',
                  border: '2px solid rgba(212,175,55,0.75)',
                  boxShadow: '0 0 12px 3px rgba(212,175,55,0.45)',
                  borderRadius: 'inherit',
                }}
              />
              {/* ⚔ quest icon top-right */}
              <div className="absolute top-0.5 right-0.5 text-xs select-none pointer-events-none" title="Quest objective">⚔</div>
            </>
          )}
          {isQuestObjectiveDone && (
            <>
              {/* Soft green done overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'rgba(22,101,52,0.12)',
                  border: '2px solid rgba(34,197,94,0.55)',
                  borderRadius: 'inherit',
                }}
              />
              {/* ✓ done icon top-right */}
              <div className="absolute top-0.5 right-0.5 text-xs select-none pointer-events-none text-green-400" title="Objective complete">✓</div>
            </>
          )}
        </div>
      )}

      {/* Hex overlay — purpur glød + partikler */}
      {isHexed && (
        <div className="absolute inset-0 pointer-events-none z-10 rounded overflow-hidden">
          {/* Purpur semi-transparent glød */}
          <div
            className="absolute inset-0 animate-curse-pulse"
            style={{
              background: 'rgba(88,28,135,0.15)',
              border: '2px solid rgba(147,51,234,0.55)',
              boxShadow: '0 0 10px 2px rgba(147,51,234,0.35)',
              borderRadius: 'inherit',
            }}
          />
          {/* 🔮 ikon øverst til høyre */}
          <div className="absolute top-0.5 right-0.5 text-xs select-none pointer-events-none">🔮</div>
          {/* 4 partikler langs bunnen */}
          {[0, 0.5, 1.0, 1.5].map((delay, i) => (
            <span
              key={i}
              className="absolute animate-curse-particle select-none pointer-events-none"
              style={{
                left: `${15 + i * 22}%`,
                bottom: '2px',
                fontSize: '8px',
                color: 'rgb(192, 132, 252)',
                animationDelay: `${delay}s`,
              }}
            >✦</span>
          ))}
        </div>
      )}

      {/* Player tokens container */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {children}
      </div>

    </div>
  );
}
