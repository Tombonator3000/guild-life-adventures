import type { CSSProperties } from 'react';
import type { WeatherParticle, WeatherType } from '@/data/weather';
import './environment/environment.css';

interface WeatherOverlayProps {
  particle: WeatherParticle | null;
  weatherType?: WeatherType;
  animated?: boolean;
  isMobile?: boolean;
}

// Deterministic decorative positions never consume the gameplay random stream.
const PARTICLES = Array.from({ length: 64 }, (_, i) => ({
  x: (i * 137.508) % 1100 - 50,
  delay: -(i * .731) % 12,
  scale: .6 + (i % 5) * .17,
}));

/** Board-space weather stays beneath controls and scales with the board. */
export function WeatherOverlay({ particle, weatherType, animated = true, isMobile = false }: WeatherOverlayProps) {
  if (!particle) return null;
  const rain = particle === 'rain' || particle === 'light-rain';
  const count = isMobile ? (rain ? 24 : 14) : (particle === 'rain' ? 64 : 32);
  const duration = particle === 'snow' ? 9 : particle === 'rain' ? 1.6 : 2.8;
  return (
    <div className="weather-overlay" aria-hidden="true" data-weather={weatherType} data-particle={particle}>
      <div className={`weather-tint weather-tint-${particle}`} />
      {animated && <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="weather-particles">
        {(rain || particle === 'snow') && PARTICLES.slice(0,count).map((p,i) => (
          <g key={i} transform={`translate(${p.x} -35)`} opacity={particle === 'snow' ? .7 : .4}>
            <g className={particle === 'snow' ? 'weather-snow' : 'weather-rain'} style={{animationDelay:`${p.delay}s`,animationDuration:`${duration+p.scale}s`, '--weather-drift':`${20+p.scale*35}px`} as CSSProperties}>
              {rain ? <path d={`M0 0L-4 ${particle === 'rain' ? 22 : 12}`} stroke="#c2dbeb" strokeWidth={p.scale} />
                : <circle r={p.scale*1.5} fill="#f4f3ed" />}
            </g>
          </g>
        ))}
        {rain && PARTICLES.slice(0,isMobile ? 5 : 12).map((p,i) => (
          <ellipse key={`splash-${i}`} cx={i%2 ? 930 + i%3*12 : 45 + i%4*42} cy={220 + i*59} rx="4" ry="1.5"
            fill="none" stroke="#cfdeed" strokeWidth=".8" className="weather-splash" style={{animationDelay:`${p.delay}s`}} />
        ))}
        {particle === 'fog' && [180,540,865].map((y,i) => (
          <ellipse key={y} cx={i%2 ? 860 : 140} cy={y} rx="190" ry="70" fill="#b7b5d3" className="weather-mist" style={{animationDelay:`-${i*7}s`}} />
        ))}
        {particle === 'heatwave' && <ellipse cx="490" cy="930" rx="520" ry="110" fill="#dfa45e" className="weather-mist" />}
      </svg>}
    </div>
  );
}
