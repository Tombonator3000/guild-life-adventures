import crowSprite from '@/assets/crow-silhouette.jpg';
import { loadZoneConfig } from '@/data/zoneStorage';

const BASE_CROWS = [
  { id: 1, orbitR: 30, cx: 3.0, cy: 30, size: 18, speed: 11, offset: 0 },
  { id: 2, orbitR: 22, cx: 2.5, cy: 31, size: 15, speed: 14, offset: 2.5 },
  { id: 3, orbitR: 38, cx: 3.2, cy: 29, size: 16, speed: 17, offset: 5 },
  { id: 4, orbitR: 18, cx: 3.8, cy: 32, size: 13, speed: 9, offset: 7 },
  { id: 5, orbitR: 28, cx: 2.0, cy: 30.5, size: 17, speed: 13, offset: 3.5 },
];

// Original group center (average of base crow positions)
const BASE_CX = 3.0;
const BASE_CY = 30;

/** Apply saved animation layer config (from zone editor) to crow positions */
function getAdjustedCrows() {
  const saved = loadZoneConfig();
  const crowLayer = saved?.animationLayers?.find(l => l.id === 'graveyard-crows');
  if (!crowLayer) return BASE_CROWS;

  // If hidden, return empty array
  if (!crowLayer.visible) return [];

  // Shift all crows relative to saved group center
  const dx = crowLayer.cx - BASE_CX;
  const dy = crowLayer.cy - BASE_CY;

  return BASE_CROWS.map(crow => ({
    ...crow,
    cx: crow.cx + dx,
    cy: crow.cy + dy,
    orbitR: Math.round(crow.orbitR * crowLayer.orbitRadius),
    size: Math.round(crow.size * crowLayer.size),
    speed: +(crow.speed / crowLayer.speed).toFixed(1), // Higher speed multiplier = faster = lower duration
  }));
}

export function GraveyardCrows() {
  const crows = getAdjustedCrows();

  if (crows.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[32]">
      {crows.map(crow => {
        const r = crow.orbitR;
        return (
          <div
            key={crow.id}
            className="absolute"
            style={{
              left: `${crow.cx}%`,
              top: `${crow.cy}%`,
              width: `${crow.size}px`,
              height: `${crow.size}px`,
              animation: `crow-orbit-${crow.id} ${crow.speed}s linear infinite`,
              animationDelay: `${crow.offset}s`,
            }}
          >
            <img
              src={crowSprite}
              alt=""
              className="w-full h-full"
              style={{
                filter: 'brightness(0.15) drop-shadow(0 0 2px rgba(0,0,0,0.6))',
                animation: `crow-flip-${crow.id} ${crow.speed}s linear infinite`,
                animationDelay: `${crow.offset}s`,
              }}
            />
          </div>
        );
      })}
      <style>{`
        ${crows.map(crow => {
          const r = crow.orbitR;
          const ry = Math.round(r * 0.55); // elliptical orbit
          return `
            @keyframes crow-orbit-${crow.id} {
              0%   { transform: translate(${r}px, 0px); }
              25%  { transform: translate(0px, -${ry}px); }
              50%  { transform: translate(-${r}px, 0px); }
              75%  { transform: translate(0px, ${ry}px); }
              100% { transform: translate(${r}px, 0px); }
            }
            @keyframes crow-flip-${crow.id} {
              0%   { transform: scaleX(1); }
              24%  { transform: scaleX(1); }
              25%  { transform: scaleX(-1); }
              74%  { transform: scaleX(-1); }
              75%  { transform: scaleX(1); }
              100% { transform: scaleX(1); }
            }
          `;
        }).join('')}
      `}</style>
    </div>
  );
}
