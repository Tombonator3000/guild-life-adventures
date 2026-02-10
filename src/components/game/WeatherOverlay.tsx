import { useMemo } from 'react';
import type { WeatherParticle, WeatherType } from '@/data/weather';

interface WeatherOverlayProps {
  particle: WeatherParticle | null;
  weatherType?: WeatherType;
}

/** Number of particles to render per weather type */
const PARTICLE_COUNTS: Record<WeatherParticle, number> = {
  snow: 60,
  rain: 120,
  'light-rain': 60,
  heatwave: 20,
  fog: 12,
};

/**
 * Full-screen weather particle overlay. Renders CSS-animated particles
 * layered over the game board. pointer-events: none so it doesn't block clicks.
 */
export function WeatherOverlay({ particle, weatherType }: WeatherOverlayProps) {
  if (!particle) return null;

  const count = PARTICLE_COUNTS[particle];

  // Pre-generate random offsets so they're stable across renders
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: getBaseDuration(particle) + Math.random() * getDurationVariance(particle),
      size: getBaseSize(particle) + Math.random() * getSizeVariance(particle),
      opacity: getBaseOpacity(particle) + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * getDriftRange(particle),
    }));
  }, [particle, count]);

  return (
    <>
      <style>{getKeyframes(particle)}</style>
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ zIndex: 35 }}
        aria-hidden="true"
      >
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-5%',
              width: `${p.size}px`,
              height: particle === 'rain' || particle === 'light-rain' ? `${p.size * 3}px` : `${p.size}px`,
              opacity: p.opacity,
              animation: `weather-${particle} ${p.duration}s linear ${p.delay}s infinite`,
              ...getParticleStyle(particle, p.size),
            }}
          />
        ))}
        {/* Extra layer for fog and heatwave */}
        {particle === 'fog' && <FogLayer />}
        {particle === 'heatwave' && <HeatwaveLayer />}
        {(particle === 'rain' || particle === 'light-rain') && <RainLayer heavy={particle === 'rain'} />}
        {weatherType === 'thunderstorm' && <ThunderstormLayer />}
        {weatherType === 'enchanted-fog' && <EnchantedFogLayer />}
      </div>
    </>
  );
}

function getBaseDuration(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 6;
    case 'rain': return 1.2;
    case 'light-rain': return 2;
    case 'heatwave': return 4;
    case 'fog': return 10;
  }
}

function getDurationVariance(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 6;
    case 'rain': return 0.8;
    case 'light-rain': return 1.5;
    case 'heatwave': return 3;
    case 'fog': return 8;
  }
}

function getBaseSize(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 3;
    case 'rain': return 1.5;
    case 'light-rain': return 1;
    case 'heatwave': return 4;
    case 'fog': return 80;
  }
}

function getSizeVariance(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 5;
    case 'rain': return 2;
    case 'light-rain': return 1.5;
    case 'heatwave': return 4;
    case 'fog': return 60;
  }
}

function getBaseOpacity(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 0.6;
    case 'rain': return 0.4;
    case 'light-rain': return 0.25;
    case 'heatwave': return 0.08;
    case 'fog': return 0.04;
  }
}

function getDriftRange(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 80;
    case 'rain': return 15;
    case 'light-rain': return 20;
    case 'heatwave': return 40;
    case 'fog': return 20;
  }
}

function getParticleStyle(p: WeatherParticle, size: number): React.CSSProperties {
  switch (p) {
    case 'snow':
      return {
        borderRadius: '50%',
        background: 'white',
        boxShadow: `0 0 ${size}px rgba(255,255,255,0.5)`,
      };
    case 'rain':
      return {
        borderRadius: '0 0 50% 50%',
        background: 'linear-gradient(to bottom, rgba(180,210,255,0.1), rgba(140,190,255,0.7))',
      };
    case 'light-rain':
      return {
        borderRadius: '0 0 50% 50%',
        background: 'linear-gradient(to bottom, transparent, rgba(150,200,255,0.5))',
      };
    case 'heatwave':
      return {
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,160,0,0.15), transparent)',
        filter: 'blur(3px)',
      };
    case 'fog':
      return {
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,210,220,0.12), transparent)',
        filter: 'blur(20px)',
      };
  }
}

/** CSS keyframes for each particle type */
function getKeyframes(p: WeatherParticle): string {
  switch (p) {
    case 'snow':
      return `
        @keyframes weather-snow {
          0% { transform: translateY(-10px) translateX(0px) rotate(0deg); }
          25% { transform: translateY(25vh) translateX(20px) rotate(90deg); }
          50% { transform: translateY(50vh) translateX(-10px) rotate(180deg); }
          75% { transform: translateY(75vh) translateX(15px) rotate(270deg); }
          100% { transform: translateY(105vh) translateX(-5px) rotate(360deg); opacity: 0; }
        }
      `;
    case 'rain':
      return `
        @keyframes weather-rain {
          0% { transform: translateY(-20px) translateX(0px); }
          100% { transform: translateY(105vh) translateX(-15px); opacity: 0.1; }
        }
      `;
    case 'light-rain':
      return `
        @keyframes weather-light-rain {
          0% { transform: translateY(-20px) translateX(0px); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.2; }
          100% { transform: translateY(105vh) translateX(-10px); opacity: 0; }
        }
      `;
    case 'heatwave':
      return `
        @keyframes weather-heatwave {
          0% { transform: translateY(100vh) scale(1); opacity: 0; }
          20% { opacity: 0.12; }
          80% { opacity: 0.08; }
          100% { transform: translateY(-20px) scale(1.5); opacity: 0; }
        }
      `;
    case 'fog':
      return `
        @keyframes weather-fog {
          0% { transform: translateX(-20%) translateY(10vh); opacity: 0; }
          30% { opacity: 0.06; }
          70% { opacity: 0.05; }
          100% { transform: translateX(20%) translateY(-5vh); opacity: 0; }
        }
      `;
  }
}

/** Ambient fog layer — slow-moving translucent overlay */
function FogLayer() {
  return (
    <>
      <style>{`
        @keyframes fog-drift-1 {
          0% { transform: translateX(-10%); opacity: 0.06; }
          50% { transform: translateX(5%); opacity: 0.10; }
          100% { transform: translateX(-10%); opacity: 0.06; }
        }
        @keyframes fog-drift-2 {
          0% { transform: translateX(8%); opacity: 0.04; }
          50% { transform: translateX(-8%); opacity: 0.08; }
          100% { transform: translateX(8%); opacity: 0.04; }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(180,190,210,0.08), rgba(160,170,190,0.12), rgba(180,190,210,0.06))',
          animation: 'fog-drift-1 15s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 60%, rgba(200,210,230,0.10), transparent 70%)',
          animation: 'fog-drift-2 20s ease-in-out infinite',
        }}
      />
    </>
  );
}

/** Heatwave shimmer layer — subtle distortion effect */
function HeatwaveLayer() {
  return (
    <>
      <style>{`
        @keyframes heat-shimmer {
          0% { opacity: 0.03; filter: blur(2px); }
          50% { opacity: 0.06; filter: blur(4px); }
          100% { opacity: 0.03; filter: blur(2px); }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(255,140,0,0.05), transparent 60%)',
          animation: 'heat-shimmer 4s ease-in-out infinite',
        }}
      />
    </>
  );
}

/** Rain layer — wet overlay, diagonal streaks, and splash ripples at the bottom */
function RainLayer({ heavy }: { heavy: boolean }) {
  const streakCount = heavy ? 40 : 20;
  const splashCount = heavy ? 24 : 12;

  // Pre-generate stable random positions
  const streaks = useMemo(() =>
    Array.from({ length: streakCount }, (_, i) => ({
      id: i,
      left: Math.random() * 110 - 5,
      delay: Math.random() * 2,
      duration: 0.4 + Math.random() * 0.4,
      opacity: 0.06 + Math.random() * (heavy ? 0.12 : 0.06),
    })),
  [streakCount, heavy]);

  const splashes = useMemo(() =>
    Array.from({ length: splashCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      bottom: Math.random() * 8,
      delay: Math.random() * 3,
      duration: 0.6 + Math.random() * 0.6,
    })),
  [splashCount]);

  return (
    <>
      <style>{`
        @keyframes rain-streak {
          0% { transform: translateY(-10vh) skewX(-8deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) skewX(-8deg); opacity: 0; }
        }
        @keyframes rain-splash {
          0% { transform: scale(0); opacity: 0.7; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes rain-wet-pulse {
          0%, 100% { opacity: ${heavy ? 0.10 : 0.05}; }
          50% { opacity: ${heavy ? 0.16 : 0.08}; }
        }
      `}</style>
      {/* Dark wet overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: heavy
            ? 'linear-gradient(to bottom, rgba(30,40,60,0.12), rgba(20,30,50,0.08), rgba(30,40,60,0.14))'
            : 'linear-gradient(to bottom, rgba(40,50,70,0.06), rgba(30,40,60,0.04), rgba(40,50,70,0.07))',
          animation: `rain-wet-pulse 6s ease-in-out infinite`,
        }}
      />
      {/* Diagonal rain streaks — long thin lines */}
      {streaks.map((s) => (
        <div
          key={`streak-${s.id}`}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: '-10%',
            width: '1px',
            height: heavy ? '8vh' : '5vh',
            opacity: s.opacity,
            background: 'linear-gradient(to bottom, transparent, rgba(180,210,255,0.5), transparent)',
            animation: `rain-streak ${s.duration}s linear ${s.delay}s infinite`,
          }}
        />
      ))}
      {/* Splash ripples at the bottom of the screen */}
      {splashes.map((s) => (
        <div
          key={`splash-${s.id}`}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            bottom: `${s.bottom}%`,
            width: '8px',
            height: '3px',
            borderRadius: '50%',
            border: '1px solid rgba(180,210,255,0.3)',
            animation: `rain-splash ${s.duration}s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
}

/** Thunderstorm layer — lightning flashes + dark overlay */
function ThunderstormLayer() {
  return (
    <>
      <style>{`
        @keyframes lightning-flash-1 {
          0%, 100% { opacity: 0; }
          1% { opacity: 0.7; }
          2% { opacity: 0; }
          3% { opacity: 0.4; }
          4% { opacity: 0; }
          30% { opacity: 0; }
          31% { opacity: 0.5; }
          32% { opacity: 0.1; }
          33% { opacity: 0.3; }
          34% { opacity: 0; }
        }
        @keyframes lightning-flash-2 {
          0%, 100% { opacity: 0; }
          15% { opacity: 0; }
          16% { opacity: 0.6; }
          17% { opacity: 0; }
          18% { opacity: 0.3; }
          19% { opacity: 0; }
          55% { opacity: 0; }
          56% { opacity: 0.4; }
          57% { opacity: 0; }
        }
        @keyframes storm-darken {
          0% { opacity: 0.12; }
          50% { opacity: 0.18; }
          100% { opacity: 0.12; }
        }
        @keyframes lightning-bolt {
          0%, 100% { opacity: 0; }
          1% { opacity: 0.9; }
          3% { opacity: 0; }
          30% { opacity: 0; }
          31% { opacity: 0.7; }
          33% { opacity: 0; }
        }
      `}</style>
      {/* Dark storm overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(20,20,40,0.20), rgba(10,10,30,0.10), rgba(20,20,40,0.15))',
          animation: 'storm-darken 8s ease-in-out infinite',
        }}
      />
      {/* Lightning flash 1 — full screen white flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(200,210,255,0.9), rgba(150,170,255,0.3) 50%, transparent 80%)',
          animation: 'lightning-flash-1 7s ease-out infinite',
          mixBlendMode: 'screen',
        }}
      />
      {/* Lightning flash 2 — offset timing */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 70% 15%, rgba(220,230,255,0.8), rgba(160,180,255,0.2) 50%, transparent 80%)',
          animation: 'lightning-flash-2 11s ease-out infinite',
          mixBlendMode: 'screen',
        }}
      />
      {/* Lightning bolt shape */}
      <div
        style={{
          position: 'absolute',
          left: '25%',
          top: '0',
          width: '3px',
          height: '40%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(180,200,255,0.6), transparent)',
          animation: 'lightning-bolt 7s ease-out infinite',
          filter: 'blur(1px)',
          clipPath: 'polygon(50% 0%, 70% 30%, 40% 35%, 80% 70%, 55% 72%, 90% 100%, 10% 55%, 45% 50%, 20% 25%, 55% 20%)',
          transform: 'scaleX(15)',
        }}
      />
      {/* Second bolt */}
      <div
        style={{
          position: 'absolute',
          right: '30%',
          top: '0',
          width: '3px',
          height: '35%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(180,200,255,0.5), transparent)',
          animation: 'lightning-bolt 11s ease-out 2s infinite',
          filter: 'blur(1px)',
          clipPath: 'polygon(50% 0%, 30% 25%, 65% 30%, 20% 65%, 45% 68%, 10% 100%, 85% 60%, 55% 55%, 75% 30%, 40% 25%)',
          transform: 'scaleX(12)',
        }}
      />
    </>
  );
}

/** Enhanced fog layer — dense atmospheric fog with visibility reduction */
function EnchantedFogLayer() {
  return (
    <>
      <style>{`
        @keyframes enchanted-fog-1 {
          0% { transform: translateX(-15%) translateY(0); opacity: 0.15; }
          33% { transform: translateX(5%) translateY(-3vh); opacity: 0.25; }
          66% { transform: translateX(-5%) translateY(2vh); opacity: 0.18; }
          100% { transform: translateX(-15%) translateY(0); opacity: 0.15; }
        }
        @keyframes enchanted-fog-2 {
          0% { transform: translateX(10%) translateY(2vh); opacity: 0.10; }
          50% { transform: translateX(-10%) translateY(-2vh); opacity: 0.20; }
          100% { transform: translateX(10%) translateY(2vh); opacity: 0.10; }
        }
        @keyframes enchanted-fog-3 {
          0% { transform: translateY(0); opacity: 0.12; }
          50% { transform: translateY(-5vh); opacity: 0.22; }
          100% { transform: translateY(0); opacity: 0.12; }
        }
        @keyframes enchanted-glow {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.06; }
        }
      `}</style>
      {/* Dense low fog band */}
      <div
        style={{
          position: 'absolute',
          left: '-10%',
          right: '-10%',
          bottom: '0',
          height: '60%',
          background: 'linear-gradient(to top, rgba(180,190,220,0.30), rgba(170,180,210,0.15), transparent)',
          animation: 'enchanted-fog-1 18s ease-in-out infinite',
          filter: 'blur(30px)',
        }}
      />
      {/* Mid-level fog wisps */}
      <div
        style={{
          position: 'absolute',
          left: '-10%',
          right: '-10%',
          top: '20%',
          height: '50%',
          background: 'radial-gradient(ellipse at 40% 50%, rgba(190,200,230,0.20), transparent 60%)',
          animation: 'enchanted-fog-2 25s ease-in-out infinite',
          filter: 'blur(25px)',
        }}
      />
      {/* Upper thin fog */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(180,190,215,0.10), rgba(170,180,210,0.08), transparent 40%)',
          animation: 'enchanted-fog-3 12s ease-in-out infinite',
        }}
      />
      {/* Subtle magical glow within the fog */}
      <div
        style={{
          position: 'absolute',
          left: '20%',
          top: '40%',
          width: '30%',
          height: '30%',
          background: 'radial-gradient(circle, rgba(140,160,255,0.08), transparent 70%)',
          animation: 'enchanted-glow 6s ease-in-out infinite',
          filter: 'blur(20px)',
        }}
      />
    </>
  );
}
