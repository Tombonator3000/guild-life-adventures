import { useEffect, useRef } from 'react';
import { useEnvironment } from './useEnvironment';
import { createWorldRenderer, type Scene } from './drawEnvironment';
import { precipitationBudget } from './effectPolicy';
import type { BoardRect } from './effectAnchors';
import type { AnimationLayerConfig } from '@/types/game.types';
import './effects.css';

interface BoardEnvironmentProps { centerPanel: BoardRect; animationLayers?: AnimationLayerConfig[]; }

export function BoardEnvironment({centerPanel, animationLayers}: BoardEnvironmentProps) {
  const environment=useEnvironment();
  const {policy,weather}=environment;
  if (!policy.enabled) return null;
  return <div className="board-environment" aria-hidden="true" data-paused={!policy.running} data-detail={policy.quality}>
    <WorldCanvas centerPanel={centerPanel} animationLayers={animationLayers} />
  </div>;
}

function WorldCanvas({centerPanel, animationLayers}: BoardEnvironmentProps) {
  const ref=useRef<HTMLCanvasElement>(null);
  const {manager,town,assets,policy,weather,festival,strike,threeReady}=useEnvironment();
  // Refresh saved crow controls when the editor changes layers, even if panel bounds stay fixed.
  useEffect(() => {
    const render=createWorldRenderer();
    const canvas=ref.current,ctx=canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let width=0,height=0;
    const scene: Scene={assets,policy,weather:weather?.type,festival:festival??undefined,strike,threeWeather:threeReady,town};
    const draw=(seconds: number) => {
      if (!width || !height) return;
      const count=render(ctx,width,height,seconds,scene,centerPanel);
      canvas.dataset.renderedParticles=String(count);
      canvas.dataset.effectTime=seconds.toFixed(3);
      canvas.dataset.snowCover=town.snow.toFixed(3);
      canvas.dataset.forgeBursts=String(town.burstSequence);
      canvas.dataset.activeBursts=String(town.bursts.length);
      canvas.dataset.windX=town.wind.x.toFixed(3);
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
  },[manager,town,assets,policy,weather?.type,festival,strike,centerPanel,animationLayers,threeReady]);
  return <canvas ref={ref} className={`board-atmosphere ${policy.animated?'weather-particles':'environment-still'}`}
    data-weather={weather?.type??'clear'} data-weather-renderer={threeReady?'three':'canvas'} data-festival={festival??'none'}
    data-assets={assets?.sprites.length===16?'ready':'loading'}
    data-particle-budget={precipitationBudget(weather?.type,policy.mobile)} />;
}
