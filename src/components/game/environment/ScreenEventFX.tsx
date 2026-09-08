import { useEffect, useRef } from 'react';
import { useEnvironment } from './useEnvironment';
import { drawScreen, type Scene } from './drawEnvironment';

export function ScreenEventFX() {
  const {policy}=useEnvironment();
  return policy.enabled ? <ScreenCanvas /> : null;
}
function ScreenCanvas() {
  const ref=useRef<HTMLCanvasElement>(null);
  const {manager,assets,policy,weather,festival,strike}=useEnvironment();
  useEffect(() => {
    const canvas=ref.current,ctx=canvas?.getContext('2d'),shell=canvas?.parentElement;
    if (!canvas || !ctx || !shell) return;
    let w=0,h=0;
    let holes: Array<{x:number;y:number;w:number;h:number}> = [];
    const scene: Scene={policy,assets,weather:weather?.type,festival:festival??undefined,strike};
    const measure=() => {
      const root=canvas.getBoundingClientRect();
      holes=Array.from(document.querySelectorAll('[data-fx-protect], [role="dialog"], [role="alertdialog"]')).map(element => {
        const r=element.getBoundingClientRect();return {x:r.left-root.left-2,y:r.top-root.top-2,w:r.width+4,h:r.height+4};
      });
      manager.invalidate();
    };
    const draw=(seconds:number) => {
      if (!w || !h) return;
      drawScreen(ctx,w,h,policy.animated?seconds:0,scene);
      for(const r of holes) ctx.clearRect(r.x,r.y,r.w,r.h);
    };
    const resize=() => {
      const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const dpr=Math.min(window.devicePixelRatio||1,policy.dpr);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);measure();
    };
    const unsubscribe=manager.register(draw);
    const observer=new ResizeObserver(resize);observer.observe(shell);
    const mutation=new MutationObserver(measure);mutation.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-fx-protect','open']});
    // Resize/scroll and panel mounting update holes; no layout reads in the frame loop.
    window.addEventListener('resize',resize);document.addEventListener('scroll',measure,true);
    resize();
    return () => {unsubscribe();observer.disconnect();mutation.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('scroll',measure,true);};
  },[manager,assets,policy,weather?.type,festival,strike]);
  return <canvas ref={ref} className="screen-event-fx" aria-hidden="true" data-weather={weather?.type??'clear'} data-strike={strike??'none'} />;
}
