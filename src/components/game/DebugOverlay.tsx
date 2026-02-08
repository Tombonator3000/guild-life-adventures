import type { ZoneConfig } from '@/types/game.types';
import type { CenterPanelConfig } from '@/components/game/ZoneEditor';
import { MOVEMENT_PATHS, BOARD_PATH } from '@/data/locations';

export function DebugOverlay({
  customZones,
  centerPanel,
  visible,
}: {
  customZones: ZoneConfig[];
  centerPanel: CenterPanelConfig;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-5">
      {customZones.map(zone => (
        <div
          key={zone.id}
          className="absolute border-2 border-red-500/70 bg-red-500/10"
          style={{
            left: `${zone.x}%`,
            top: `${zone.y}%`,
            width: `${zone.width}%`,
            height: `${zone.height}%`,
          }}
        >
          <span className="text-xs text-red-400 bg-black/70 px-1">
            {zone.id}
          </span>
        </div>
      ))}
      <div
        className="absolute border-2 border-yellow-400 bg-yellow-400/10"
        style={{
          top: `${centerPanel.top}%`,
          left: `${centerPanel.left}%`,
          width: `${centerPanel.width}%`,
          height: `${centerPanel.height}%`,
        }}
      >
        <span className="text-xs text-yellow-400 bg-black/70 px-1">
          CENTER INFO PANEL
        </span>
      </div>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {BOARD_PATH.map((loc, i) => {
          const next = BOARD_PATH[(i + 1) % BOARD_PATH.length];
          const key = `${loc}_${next}`;
          const waypoints = MOVEMENT_PATHS[key] || [];
          const fromZone = customZones.find(z => z.id === loc);
          const toZone = customZones.find(z => z.id === next);
          if (!fromZone || !toZone) return null;
          const fromCenter: [number, number] = [fromZone.x + fromZone.width / 2, fromZone.y + fromZone.height - 5];
          const toCenter: [number, number] = [toZone.x + toZone.width / 2, toZone.y + toZone.height - 5];
          const allPoints = [fromCenter, ...waypoints, toCenter];
          return (
            <g key={key}>
              <polyline
                points={allPoints.map(([x, y]) => `${x},${y}`).join(' ')}
                fill="none"
                stroke={waypoints.length > 0 ? '#4ade80' : '#6b7280'}
                strokeWidth={0.25}
                strokeDasharray={waypoints.length > 0 ? 'none' : '1 0.5'}
                opacity={0.6}
              />
              {waypoints.map(([x, y], idx) => (
                <circle key={idx} cx={x} cy={y} r={0.4} fill="#4ade80" opacity={0.7} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
