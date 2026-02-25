import { useMemo } from 'react';
import type { WeatherParticle, WeatherType } from '@/data/weather';
import enchantedFogLayer from '@/assets/enchanted-fog-layer.png';
import enchantedFogWisps from '@/assets/enchanted-fog-wisps.jpg';
import heatShimmerLayer from '@/assets/heat-shimmer-layer.png';
import heatShimmerGround from '@/assets/heat-shimmer-ground.png';

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
  const count = particle ? PARTICLE_COUNTS[particle] : 0;

  // Pre-generate random offsets so they're stable across renders
  // Hook must be called unconditionally (React rules of hooks)
  const particles = useMemo(() => {
    if (!particle) return [];
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

  if (!particle) return null;

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
    case 'rain': return 0.5;
    case 'light-rain': return 0.3;
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

/** Heatwave shimmer layer — AI-generated heat shimmer textures */
function HeatwaveLayer() {
  return (
    <>
      <style>{`
        @keyframes heat-tex-rise {
          0% { transform: translateY(0) scale(1); opacity: 0.12; }
          50% { transform: translateY(-3vh) scale(1.03); opacity: 0.18; }
          100% { transform: translateY(0) scale(1); opacity: 0.12; }
        }
        @keyframes heat-ground-pulse {
          0%, 100% { opacity: 0.10; }
          50% { opacity: 0.18; }
        }
        @keyframes heat-distort {
          0% { filter: blur(2px) brightness(1.0); }
          50% { filter: blur(4px) brightness(1.05); }
          100% { filter: blur(2px) brightness(1.0); }
        }
      `}</style>
      {/* Rising heat shimmer texture */}
      <div
        style={{
          position: 'absolute',
          left: '-5%',
          right: '-5%',
          bottom: '0',
          height: '70%',
          backgroundImage: `url(${heatShimmerLayer})`,
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          animation: 'heat-tex-rise 5s ease-in-out infinite',
          opacity: 0.14,
          mixBlendMode: 'screen',
          filter: 'blur(3px)',
        }}
      />
      {/* Cracked ground overlay at bottom */}
      <div
        style={{
          position: 'absolute',
          left: '-5%',
          right: '-5%',
          bottom: '0',
          height: '35%',
          backgroundImage: `url(${heatShimmerGround})`,
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          animation: 'heat-ground-pulse 6s ease-in-out infinite',
          opacity: 0.12,
          mixBlendMode: 'multiply',
        }}
      />
      {/* Amber heat haze overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(255,140,0,0.06), transparent 50%)',
          animation: 'heat-distort 4s ease-in-out infinite',
        }}
      />
    </>
  );
}

/** Rain layer — wet overlay, diagonal streaks, splash ripples, and screen droplets */
function RainLayer({ heavy }: { heavy: boolean }) {
  const streakCount = heavy ? 50 : 25;
  const splashCount = heavy ? 28 : 14;
  const dropletCount = heavy ? 18 : 10;

  // Pre-generate stable random positions
  const streaks = useMemo(() =>
    Array.from({ length: streakCount }, (_, i) => ({
      id: i,
      left: Math.random() * 110 - 5,
      delay: Math.random() * 2,
      duration: 0.3 + Math.random() * 0.35,
      opacity: 0.08 + Math.random() * (heavy ? 0.15 : 0.08),
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

  // Water droplets that slide down the screen (like rain on a window)
  const droplets = useMemo(() =>
    Array.from({ length: dropletCount }, (_, i) => ({
      id: i,
      left: Math.random() * 98 + 1,
      startTop: -2 - Math.random() * 5,
      delay: Math.random() * 12,
      duration: 4 + Math.random() * 6,
      size: 3 + Math.random() * 5,
      wobble: (Math.random() - 0.5) * 3,
      opacity: 0.15 + Math.random() * (heavy ? 0.25 : 0.15),
      trailLength: 15 + Math.random() * 25,
    })),
  [dropletCount, heavy]);

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
          0%, 100% { opacity: ${heavy ? 0.12 : 0.06}; }
          50% { opacity: ${heavy ? 0.20 : 0.10}; }
        }
        @keyframes droplet-slide {
          0% { top: -5%; opacity: 0; }
          3% { opacity: 1; }
          85% { opacity: 0.8; }
          100% { top: 105%; opacity: 0; }
        }
      `}</style>
      {/* Dark wet overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: heavy
            ? 'linear-gradient(to bottom, rgba(30,40,60,0.15), rgba(20,30,50,0.10), rgba(30,40,60,0.18))'
            : 'linear-gradient(to bottom, rgba(40,50,70,0.08), rgba(30,40,60,0.05), rgba(40,50,70,0.09))',
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
            width: heavy ? '1.5px' : '1px',
            height: heavy ? '10vh' : '6vh',
            opacity: s.opacity,
            background: 'linear-gradient(to bottom, transparent, rgba(180,210,255,0.6), transparent)',
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
            border: '1px solid rgba(180,210,255,0.35)',
            animation: `rain-splash ${s.duration}s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}
      {/* Water droplets sliding down the screen (window rain effect) */}
      {droplets.map((d) => (
        <div
          key={`droplet-${d.id}`}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: `${d.startTop}%`,
            width: `${d.size}px`,
            animation: `droplet-slide ${d.duration}s ease-in ${d.delay}s infinite`,
            pointerEvents: 'none',
          }}
        >
          {/* Droplet head — round water bead */}
          <div
            style={{
              width: `${d.size}px`,
              height: `${d.size * 1.3}px`,
              borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%',
              background: `radial-gradient(ellipse at 35% 30%, rgba(220,235,255,${d.opacity + 0.1}), rgba(160,200,240,${d.opacity * 0.6}))`,
              boxShadow: `0 0 ${d.size * 0.5}px rgba(160,200,240,${d.opacity * 0.4})`,
              position: 'relative',
              zIndex: 1,
              transform: `translateX(${d.wobble}px)`,
            }}
          />
          {/* Droplet trail — thin water streak behind */}
          <div
            style={{
              position: 'absolute',
              top: `-${d.trailLength}px`,
              left: `${d.size * 0.35}px`,
              width: `${Math.max(1, d.size * 0.3)}px`,
              height: `${d.trailLength}px`,
              background: `linear-gradient(to bottom, transparent, rgba(180,210,250,${d.opacity * 0.3}), rgba(180,210,250,${d.opacity * 0.5}))`,
              borderRadius: '1px',
              transform: `translateX(${d.wobble * 0.5}px)`,
            }}
          />
        </div>
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

/** Enhanced fog layer — AI-generated fog textures with animated drift */
function EnchantedFogLayer() {
  return (
    <>
      <style>{`
        @keyframes enchanted-tex-1 {
          0% { transform: translateX(-8%) scale(1.05); opacity: 0.18; }
          33% { transform: translateX(4%) scale(1.1); opacity: 0.28; }
          66% { transform: translateX(-3%) scale(1.07); opacity: 0.22; }
          100% { transform: translateX(-8%) scale(1.05); opacity: 0.18; }
        }
        @keyframes enchanted-tex-2 {
          0% { transform: translateX(6%) translateY(3vh) scale(1.1); opacity: 0.12; }
          50% { transform: translateX(-8%) translateY(-2vh) scale(1.15); opacity: 0.22; }
          100% { transform: translateX(6%) translateY(3vh) scale(1.1); opacity: 0.12; }
        }
        @keyframes enchanted-glow-pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.12; }
        }
      `}</style>
      {/* Primary fog texture layer — dense, slow drift */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          backgroundImage: `url(${enchantedFogLayer})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'enchanted-tex-1 20s ease-in-out infinite',
          opacity: 0.22,
          mixBlendMode: 'screen',
          filter: 'blur(4px)',
        }}
      />
      {/* Secondary wisp layer — thinner, offset timing */}
      <div
        style={{
          position: 'absolute',
          inset: '-5%',
          backgroundImage: `url(${enchantedFogWisps})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          animation: 'enchanted-tex-2 28s ease-in-out infinite',
          opacity: 0.16,
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
        }}
      />
      {/* Magical glow pulse */}
      <div
        style={{
          position: 'absolute',
          left: '15%',
          top: '30%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(140,160,255,0.10), transparent 70%)',
          animation: 'enchanted-glow-pulse 6s ease-in-out infinite',
          filter: 'blur(25px)',
        }}
      />
      {/* Visibility-reducing overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(160,170,200,0.15), rgba(150,160,190,0.08), transparent 50%)',
        }}
      />
    </>
  );
}
