import crowSprite from '@/assets/crow-silhouette.png';

const CROWS = [
  { id: 1, rx: 3.2, ry: 2.0, cx: 2.8, cy: 30, size: 14, speed: 12, offset: 0 },
  { id: 2, rx: 2.5, ry: 1.5, cx: 3.0, cy: 31, size: 11, speed: 15, offset: 2 },
  { id: 3, rx: 4.0, ry: 2.5, cx: 2.5, cy: 29, size: 12, speed: 18, offset: 4 },
  { id: 4, rx: 1.8, ry: 1.2, cx: 3.5, cy: 32, size: 10, speed: 10, offset: 6 },
  { id: 5, rx: 3.5, ry: 1.8, cx: 2.2, cy: 30.5, size: 13, speed: 14, offset: 8 },
];

export function GraveyardCrows() {
  return (
    <div className="absolute inset-0 pointer-events-none z-[32]">
      {CROWS.map(crow => (
        <div
          key={crow.id}
          className="absolute"
          style={{
            left: `${crow.cx}%`,
            top: `${crow.cy}%`,
            width: `${crow.size}px`,
            height: `${crow.size}px`,
            animation: `crow-circle-${crow.id} ${crow.speed}s linear infinite`,
            animationDelay: `${crow.offset}s`,
          }}
        >
          <img
            src={crowSprite}
            alt=""
            className="w-full h-full"
            style={{
              filter: 'brightness(0.2) drop-shadow(0 0 1px rgba(0,0,0,0.5))',
              animation: `crow-flip-${crow.id} ${crow.speed}s linear infinite`,
              animationDelay: `${crow.offset}s`,
            }}
          />
        </div>
      ))}
      <style>{`
        ${CROWS.map(crow => `
          @keyframes crow-circle-${crow.id} {
            0%   { transform: translate(${crow.rx}%, 0); }
            25%  { transform: translate(0, -${crow.ry}%); }
            50%  { transform: translate(-${crow.rx}%, 0); }
            75%  { transform: translate(0, ${crow.ry}%); }
            100% { transform: translate(${crow.rx}%, 0); }
          }
          @keyframes crow-flip-${crow.id} {
            0%   { transform: scaleX(1); }
            25%  { transform: scaleX(1); }
            50%  { transform: scaleX(-1); }
            75%  { transform: scaleX(-1); }
            100% { transform: scaleX(1); }
          }
        `).join('')}
      `}</style>
    </div>
  );
}
