import type { WeatherParticle, WeatherType } from '@/data/weather';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';
import { WeatherParticles } from './environment/WeatherParticles';
import { useStorm } from './environment/useStorm';
import './environment/environment.css';

interface WeatherOverlayProps {
  particle: WeatherParticle | null;
  weatherType?: WeatherType;
  animated?: boolean;
  isMobile?: boolean;
}

/** All effects remain in board space, under locations and the central menu. */
export function WeatherOverlay({particle,weatherType,animated=true,isMobile=false}:WeatherOverlayProps) {
  const { reducedMotion, visible }=useEnvironmentActivity();
  const moving=animated && !reducedMotion && visible;
  const strike=useStorm(moving && particle==='rain' && weatherType==='thunderstorm');
  if (!particle) return null;
  const precipitation=particle==='rain' || particle==='light-rain' || particle==='snow';
  return <div className="weather-overlay" aria-hidden="true" data-weather={weatherType} data-particle={particle}>
    <div className={`weather-tint weather-tint-${particle}`} />
    {moving && <>
      {precipitation && <WeatherParticles particle={particle} isMobile={isMobile} />}
      {(particle==='fog' || particle==='rain' || particle==='snow') && <div className={`weather-volume weather-volume-${particle}`}><i /><i /><i /></div>}
      {particle==='heatwave' && <div className="weather-heat-haze" />}
    </>}
    {strike!==null && <svg key={strike} className="weather-lightning" viewBox="0 0 1000 1000" preserveAspectRatio="none" data-strike={strike}>
      <defs><radialGradient id={`storm-glow-${strike}`}><stop stopColor="#d8e7ff" stopOpacity=".22"/><stop offset="1" stopColor="#a5bfff" stopOpacity="0"/></radialGradient></defs>
      <ellipse cx={strike%2 ? 820 : 180} cy="140" rx="360" ry="330" fill={`url(#storm-glow-${strike})`} />
      <g transform={strike%2 ? 'translate(1000 0) scale(-1 1)' : undefined} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="weather-bolt-glow" d="M186 -5 164 42 181 51 149 89 166 99 126 157 137 170 98 220 M149 89 119 104 123 132 87 164 M164 42 203 62 196 79 221 102" />
        <path className="weather-bolt-core" d="M186 -5 164 42 181 51 149 89 166 99 126 157 137 170 98 220 M149 89 119 104 123 132 87 164 M164 42 203 62 196 79 221 102" />
      </g>
    </svg>}
  </div>;
}
