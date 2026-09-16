import { useEffect, useRef } from 'react';
import type { BoardRect } from './effectAnchors';
import type { WeatherType } from '@/data/weather';
import { paintCloudShadowFallback } from './cloudShadowFallback';
import { useEnvironment } from './useEnvironment';
import { useGameOptions } from '@/hooks/useGameOptions';
import { clampCloudIntensity } from './cloudShadowModel';

export function GroundCloudShadows({centerPanel}: {centerPanel: BoardRect}) {
  const hostRef=useRef<HTMLDivElement>(null);
  const environment=useEnvironment();
  const {manager,policy}=environment;
  const {options}=useGameOptions();
  const intensity=clampCloudIntensity(options.cloudShadowIntensity);
  const latest=useRef({environment,intensity});
  useEffect(()=>{latest.current={environment,intensity};manager.invalidate();},[environment,intensity,manager]);
  useEffect(()=>{
    const host=hostRef.current;if(!host) return;
    let cancelled=false,unsubscribe=()=>{},observer:ResizeObserver|undefined;
    let renderer:{resize:(width:number,height:number,panel:BoardRect)=>void;draw:(seconds:number,weather?:WeatherType,intensity?:number)=>void;dispose:()=>void}|undefined;
    const glCanvas=document.createElement('canvas');glCanvas.className='ground-cloud-shadow-canvas';glCanvas.setAttribute('aria-hidden','true');host.appendChild(glCanvas);
    const fallback=()=>{
      unsubscribe();unsubscribe=()=>{};renderer?.dispose();renderer=undefined;
      glCanvas.remove();if(cancelled||!host.isConnected) return;
      const canvas=document.createElement('canvas');canvas.className='ground-cloud-shadow-canvas';canvas.setAttribute('aria-hidden','true');
      const box=host.getBoundingClientRect();
      if(paintCloudShadowFallback(canvas,box.width,box.height,latest.current.environment.weather?.type,centerPanel,latest.current.intensity)) host.replaceChildren(canvas);
    };
    const lost=(event:Event)=>{event.preventDefault();glCanvas.removeEventListener('webglcontextlost',lost);fallback();};
    glCanvas.addEventListener('webglcontextlost',lost);
    void import('./cloudShadowRenderer').then(module=>{
      if(cancelled) return;
      try {
        renderer=module.createCloudShadowRenderer(glCanvas,policy.mobile,()=>manager.invalidate());
        const resize=()=>{const box=host.getBoundingClientRect();renderer?.resize(box.width,box.height,centerPanel);manager.invalidate();};
        observer=new ResizeObserver(resize);observer.observe(host);resize();
        unsubscribe=manager.register(seconds=>{
          try {renderer?.draw(policy.animated?seconds:0,latest.current.environment.weather?.type,latest.current.intensity);glCanvas.style.visibility='visible';}
          catch {glCanvas.removeEventListener('webglcontextlost',lost);fallback();}
        });
      } catch {glCanvas.removeEventListener('webglcontextlost',lost);fallback();}
    }).catch(()=>{if(!cancelled) fallback();});
    return ()=>{cancelled=true;unsubscribe();observer?.disconnect();glCanvas.removeEventListener('webglcontextlost',lost);renderer?.dispose();host.replaceChildren();};
  },[manager,policy.animated,policy.mobile,centerPanel]);
  return <div ref={hostRef} className="ground-cloud-shadows" aria-hidden="true" data-shadow-policy={policy.quality} data-shadow-intensity={intensity} />;
}