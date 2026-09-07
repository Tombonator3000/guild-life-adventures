import { useId, type CSSProperties } from 'react';
import type { WeatherType } from '@/data/weather';
import './environment.css';

// Anchored to the existing game-board artwork, not the editable click zones.
const LIGHTS = [
  { x: 108, y: 854, color: 'ember', radius: 19 },
  { x: 876, y: 318, color: 'warm', radius: 13 },
  { x: 895, y: 328, color: 'warm', radius: 10 },
  { x: 125, y: 678, color: 'warm', radius: 9 },
  { x: 847, y: 750, color: 'magic', radius: 12 },
  { x: 875, y: 748, color: 'magic', radius: 12 },
  { x: 854, y: 820, color: 'green', radius: 10 },
  { x: 915, y: 839, color: 'green', radius: 16 },
];
const CHIMNEYS = [{x: 98,y: 760}, {x: 141,y: 761}, {x: 130,y: 372}, {x: 928,y: 243}];
const LEAVES = [
  [170,170], [208,202], [74,320], [51,472], [150,559], [68,721],
  [928,190], [966,414], [931,580], [947,738], [850,924], [353,927],
];
const SWALLOWS = [{x:260,y:80,duration:29}, {x:710,y:170,duration:37}, {x:770,y:929,duration:33}];

export function BoardAtmosphere({ weatherType = 'clear', animated, isMobile }: {
  weatherType?: WeatherType; animated: boolean; isMobile: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const storm = weatherType === 'thunderstorm' || weatherType === 'snowstorm';
  const fog = weatherType === 'enchanted-fog';
  const leaves = LEAVES.slice(0, isMobile ? 6 : 12);
  return (
    <svg className="board-atmosphere" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" data-weather={weatherType}>
      <defs>
        {Object.entries({warm:'#ffcd70',ember:'#ff862c',magic:'#c78aff',green:'#7af1b2'}).map(([name,color]) => (
          <radialGradient id={`${id}-${name}`} key={name}>
            <stop stopColor={color} stopOpacity=".85" />
            <stop offset=".35" stopColor={color} stopOpacity=".35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      {LIGHTS.map((light,i) => (
        <ellipse key={i} cx={light.x} cy={light.y} rx={light.radius} ry={light.radius * 1.15}
          fill={`url(#${id}-${light.color})`} className={animated ? 'environment-light' : ''}
          style={{animationDelay:`-${i * 1.7}s`,animationDuration:`${4.7 + i * .6}s`,opacity:storm || fog ? .9 : .65}} />
      ))}
      {animated && <>
        {CHIMNEYS.slice(0,isMobile ? 2 : 4).map((chimney,i) => (
          <g key={i} transform={`translate(${chimney.x} ${chimney.y})`}>
            {[0,1,2].map(n => <ellipse key={n} className="environment-smoke" rx="5" ry="8" fill="#d3c8af"
              style={{animationDelay:`-${n * 3 + i}s`, '--smoke-drift':storm ? '45px' : '16px'} as CSSProperties} />)}
          </g>
        ))}
        {weatherType !== 'snowstorm' && leaves.map(([x,y],i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g className="environment-leaf" style={{animationDelay:`-${i * 2.7}s`,animationDuration:`${storm ? 4+i*.25 : 12+i*.7}s`}}>
              <path d="M-3 0Q0-5 4-2Q4 3-3 0" fill={i%3 === 0 ? '#be873b' : '#758246'} />
              <path d="M-3 0L3-2" stroke="#4d542e" strokeWidth=".4" />
            </g>
          </g>
        ))}
        {!storm && !fog && SWALLOWS.slice(0,isMobile ? 1 : 3).map((bird,i) => (
          <g key={i} transform={`translate(${bird.x} ${bird.y})`}>
            <g className="environment-swallow" style={{animationDelay:`-${i*9+3}s`,animationDuration:`${bird.duration}s`}}>
              <path className="environment-wings" d="M-7-3Q-3-4 0 1Q3-4 7-3L0 3Z" fill="#28312e" />
            </g>
          </g>
        ))}
        {[0,1,2,3].slice(0,isMobile ? 2 : 4).map(i => (
          <circle key={i} cx={107+i%2*2} cy="853" r=".9" fill="#ffc374" className="environment-ember" style={{animationDelay:`-${i*.8}s`}} />
        ))}
      </>}
    </svg>
  );
}
