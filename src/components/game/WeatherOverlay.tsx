import { useMemo } from 'react';
import type { WeatherParticle } from '@/data/weather';

interface WeatherOverlayProps {
  particle: WeatherParticle | null;
}

/** Number of particles to render per weather type */
const PARTICLE_COUNTS: Record<WeatherParticle, number> = {
  snow: 60,
  rain: 80,
  'light-rain': 40,
  heatwave: 20,
  fog: 12,
};

/**
 * Full-screen weather particle overlay. Renders CSS-animated particles
 * layered over the game board. pointer-events: none so it doesn't block clicks.
 */
export function WeatherOverlay({ particle }: WeatherOverlayProps) {
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
    case 'rain': return 1;
    case 'light-rain': return 1;
    case 'heatwave': return 4;
    case 'fog': return 80;
  }
}

function getSizeVariance(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 5;
    case 'rain': return 1.5;
    case 'light-rain': return 1;
    case 'heatwave': return 4;
    case 'fog': return 60;
  }
}

function getBaseOpacity(p: WeatherParticle): number {
  switch (p) {
    case 'snow': return 0.6;
    case 'rain': return 0.3;
    case 'light-rain': return 0.2;
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
        background: 'linear-gradient(to bottom, transparent, rgba(150,200,255,0.6))',
      };
    case 'light-rain':
      return {
        borderRadius: '0 0 50% 50%',
        background: 'linear-gradient(to bottom, transparent, rgba(150,200,255,0.4))',
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
