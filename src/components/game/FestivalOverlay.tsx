/**
 * FestivalOverlay — renders AI-generated textures and CSS animations
 * over the game board when a seasonal festival is active.
 * Follows the same pattern as WeatherOverlay.
 */

import { useMemo } from 'react';
import type { FestivalId } from '@/data/festivals';

// AI-generated textures
import harvestGrain from '@/assets/harvest-grain.jpg';
import harvestGlow from '@/assets/harvest-glow.jpg';
import solsticeFrost from '@/assets/solstice-frost.jpg';
import solsticeAurora from '@/assets/solstice-aurora.jpg';
import tourneyBanner from '@/assets/tourney-banner.jpg';
import tourneyConfetti from '@/assets/tourney-confetti.jpg';
import fairLantern from '@/assets/fair-lantern.png';
import fairStreamers from '@/assets/fair-streamers.jpg';

interface FestivalOverlayProps {
  activeFestival: FestivalId | null;
}

export function FestivalOverlay({ activeFestival }: FestivalOverlayProps) {
  if (!activeFestival) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[34] overflow-hidden">
      {activeFestival === 'harvest-festival' && <HarvestLayer />}
      {activeFestival === 'winter-solstice' && <SolsticeLayer />}
      {activeFestival === 'spring-tournament' && <TourneyLayer />}
      {activeFestival === 'midsummer-fair' && <FairLayer />}

      <style>{festivalKeyframes}</style>
    </div>
  );
}

/* ============================================================
 * HARVEST FESTIVAL — warm golden glow + falling grain particles
 * ============================================================ */
function HarvestLayer() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 4,
      size: 16 + Math.random() * 20,
      opacity: 0.5 + Math.random() * 0.3,
    })), []);

  return (
    <>
      {/* Warm golden glow overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${harvestGlow})`,
          backgroundSize: 'cover',
          opacity: 0.18,
          mixBlendMode: 'screen',
          animation: 'festival-pulse 6s ease-in-out infinite',
        }}
      />
      {/* Grain texture border overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${harvestGrain})`,
          backgroundSize: '400px 400px',
          opacity: 0.12,
          mixBlendMode: 'screen',
          animation: 'festival-drift-slow 20s linear infinite',
        }}
      />
      {/* Falling grain particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: '-5%',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            background: 'radial-gradient(circle, rgba(218,165,32,0.8) 0%, rgba(184,134,11,0.3) 70%, transparent 100%)',
            animation: `festival-fall ${p.duration}s linear ${p.delay}s infinite`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
      {/* Warm amber haze */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(218,165,32,0.08) 0%, transparent 70%)',
        }}
      />
    </>
  );
}

/* ============================================================
 * WINTER SOLSTICE — frost + aurora borealis + glitter
 * ============================================================ */
function SolsticeLayer() {
  const glitterParticles = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
    })), []);

  return (
    <>
      {/* Aurora band at top */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '35%',
          backgroundImage: `url(${solsticeAurora})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          opacity: 0.2,
          mixBlendMode: 'screen',
          animation: 'festival-aurora-sway 12s ease-in-out infinite',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }}
      />
      {/* Frost border overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${solsticeFrost})`,
          backgroundSize: '500px 500px',
          opacity: 0.1,
          mixBlendMode: 'screen',
          animation: 'festival-drift-slow 30s linear infinite reverse',
        }}
      />
      {/* Frost vignette edges */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 0% 0%, rgba(135,206,250,0.12) 0%, transparent 30%),
            radial-gradient(ellipse at 100% 0%, rgba(147,112,219,0.10) 0%, transparent 30%),
            radial-gradient(ellipse at 0% 100%, rgba(135,206,250,0.08) 0%, transparent 25%),
            radial-gradient(ellipse at 100% 100%, rgba(147,112,219,0.08) 0%, transparent 25%)
          `,
        }}
      />
      {/* Glitter particles */}
      {glitterParticles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: 'radial-gradient(circle, rgba(200,220,255,1) 0%, rgba(135,206,250,0.5) 50%, transparent 100%)',
            animation: `festival-twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      {/* Cool blue overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(70,100,160,0.06) 0%, rgba(100,140,200,0.04) 50%, rgba(70,100,160,0.06) 100%)',
        }}
      />
    </>
  );
}

/* ============================================================
 * SPRING TOURNAMENT — banners + confetti + heroic glow
 * ============================================================ */
function TourneyLayer() {
  const confettiParticles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 5,
      size: 6 + Math.random() * 10,
      rotation: Math.random() * 360,
      rotSpeed: 100 + Math.random() * 260,
      hue: [0, 45, 55, 0, 45][i % 5], // red, gold, yellow cycle
    })), []);

  return (
    <>
      {/* Banner texture on sides */}
      <div
        className="absolute top-0 left-0 bottom-0"
        style={{
          width: '15%',
          backgroundImage: `url(${tourneyBanner})`,
          backgroundSize: '200px 200px',
          opacity: 0.12,
          mixBlendMode: 'screen',
          animation: 'festival-banner-sway 4s ease-in-out infinite',
          maskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute top-0 right-0 bottom-0"
        style={{
          width: '15%',
          backgroundImage: `url(${tourneyBanner})`,
          backgroundSize: '200px 200px',
          opacity: 0.12,
          mixBlendMode: 'screen',
          animation: 'festival-banner-sway 4s ease-in-out 0.5s infinite',
          transform: 'scaleX(-1)',
          maskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
        }}
      />
      {/* Confetti overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${tourneyConfetti})`,
          backgroundSize: '600px 600px',
          opacity: 0.08,
          mixBlendMode: 'screen',
          animation: 'festival-fall-slow 15s linear infinite',
        }}
      />
      {/* Falling confetti particles */}
      {confettiParticles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: '-3%',
            width: p.size,
            height: p.size * 0.6,
            opacity: 0.7,
            background: `hsl(${p.hue}, 80%, 55%)`,
            borderRadius: '1px',
            animation: `festival-confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      {/* Heroic red/gold radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(180,40,30,0.06) 0%, transparent 60%)',
          animation: 'festival-pulse 5s ease-in-out infinite',
        }}
      />
    </>
  );
}

/* ============================================================
 * MIDSUMMER FAIR — rising lanterns + streamers + warm festive glow
 * ============================================================ */
function FairLayer() {
  const lanterns = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: 5 + Math.random() * 90,
      delay: Math.random() * 12,
      duration: 10 + Math.random() * 5,
      size: 20 + Math.random() * 16,
      opacity: 0.5 + Math.random() * 0.3,
      sway: 15 + Math.random() * 25,
    })), []);

  return (
    <>
      {/* Streamer texture overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${fairStreamers})`,
          backgroundSize: '400px 400px',
          opacity: 0.08,
          mixBlendMode: 'screen',
          animation: 'festival-drift-slow 18s linear infinite',
        }}
      />
      {/* Rising lanterns */}
      {lanterns.map(l => (
        <div
          key={l.id}
          className="absolute"
          style={{
            left: `${l.left}%`,
            bottom: '-10%',
            width: l.size,
            height: l.size,
            opacity: l.opacity,
            backgroundImage: `url(${fairLantern})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            animation: `festival-lantern-rise ${l.duration}s ease-in-out ${l.delay}s infinite`,
            filter: 'brightness(1.3)',
          }}
        />
      ))}
      {/* Warm lantern glow spots */}
      {lanterns.slice(0, 6).map(l => (
        <div
          key={`glow-${l.id}`}
          className="absolute rounded-full"
          style={{
            left: `${l.left}%`,
            bottom: '-10%',
            width: l.size * 2.5,
            height: l.size * 2.5,
            transform: 'translate(-25%, 25%)',
            background: 'radial-gradient(circle, rgba(255,165,0,0.15) 0%, transparent 70%)',
            animation: `festival-lantern-rise ${l.duration}s ease-in-out ${l.delay}s infinite`,
          }}
        />
      ))}
      {/* Warm festive haze */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 30% 70%, rgba(255,140,0,0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 30%, rgba(255,200,0,0.05) 0%, transparent 50%)
          `,
          animation: 'festival-pulse 7s ease-in-out infinite',
        }}
      />
    </>
  );
}

/* ============================================================
 * CSS Keyframes for all festival animations
 * ============================================================ */
const festivalKeyframes = `
@keyframes festival-fall {
  0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.6; }
  100% { transform: translateY(110vh) translateX(30px) rotate(360deg); opacity: 0; }
}

@keyframes festival-fall-slow {
  0% { background-position: 0 0; }
  100% { background-position: 0 600px; }
}

@keyframes festival-confetti-fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 0; }
  5% { opacity: 0.7; }
  85% { opacity: 0.5; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}

@keyframes festival-pulse {
  0%, 100% { opacity: 0.12; }
  50% { opacity: 0.22; }
}

@keyframes festival-drift-slow {
  0% { background-position: 0 0; }
  100% { background-position: 200px 200px; }
}

@keyframes festival-aurora-sway {
  0%, 100% { transform: translateX(0) scaleX(1); }
  25% { transform: translateX(3%) scaleX(1.05); }
  50% { transform: translateX(-2%) scaleX(0.98); }
  75% { transform: translateX(1%) scaleX(1.03); }
}

@keyframes festival-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes festival-banner-sway {
  0%, 100% { transform: skewY(0deg); }
  50% { transform: skewY(1.5deg); }
}

@keyframes festival-lantern-rise {
  0% { transform: translateY(0) translateX(0); opacity: 0; }
  10% { opacity: 1; }
  80% { opacity: 0.7; }
  100% { transform: translateY(-120vh) translateX(20px); opacity: 0; }
}
`;
