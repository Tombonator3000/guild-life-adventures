import { useEffect, useRef } from 'react';
import { useEnvironment } from './useEnvironment';
import { createWorldRenderer, type Scene } from './drawEnvironment';
import { precipitationBudget } from './effectPolicy';
import type { BoardRect } from './effectAnchors';
import { HeatShimmer } from './HeatShimmer';
import './effects.css';

export function BoardEnvironment({centerPanel}: {centerPanel: BoardRect}) {
  const environment=useEnvironment();
  const {policy,weather}=environment;
  if (!policy.enabled) return null;
  return <div className="board-environment" aria-hidden="true" data-paused={!policy.running} data-detail={policy.quality}>
    {policy.animated && weather?.type === 'drought' && <HeatShimmer centerPanel={centerPanel} />}
    <WorldCanvas centerPanel={centerPanel} />
  </div>;
}

function WorldCanvas({centerPanel}: {centerPanel: BoardRect}) {
  const ref=useRef<HTMLCanvasElement>(null);
  const {manager,assets,policy,weather,festival,strike}=useEnvironment();
  // Zone-editor saves rerender the board; refresh saved crow controls at that boundary.
  const render=createWorldRenderer();
  useEffect(() => {
    const canvas=ref.current,ctx=canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let width=0,height=0;
    const scene: Scene={assets,policy,weather:weather?.type,festival:festival??undefined,strike};
    const draw=(seconds: number) => {
      if (!width || !height) return;
      const count=render(ctx,width,height,seconds,scene,centerPanel);
      canvas.dataset.renderedParticles=String(count);
      canvas.dataset.effectTime=seconds.toFixed(3);
    };
    const resize=() => {
      const box=canvas.getBoundingClientRect();width=box.width;height=box.height;
      const dpr=Math.min(window.devicePixelRatio||1,policy.dpr);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      manager.invalidate();
    };
    const unsubscribe=manager.register(draw);
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    return () => { observer.disconnect();unsubscribe(); };
  },[manager,assets,policy,weather?.type,festival,strike,centerPanel,render]);
  return <canvas ref={ref} className={`board-atmosphere ${policy.animated?'weather-particles':'environment-still'}`}
    data-weather={weather?.type??'clear'} data-festival={festival??'none'}
    data-assets={assets?.sprites.length===16?'ready':'loading'}
    data-particle-budget={precipitationBudget(weather?.type,policy.mobile)} />;
}
