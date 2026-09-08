import { useEffect, useRef } from 'react';
import { useEnvironment } from './useEnvironment';
import { drawScreen, type Scene, type ScreenRegion } from './drawEnvironment';

export function ScreenEventFX() {
  const {policy, weather, festival}=useEnvironment();
  const hasScreenEffect = ['snowstorm', 'enchanted-fog', 'thunderstorm', 'harvest-rain'].includes(weather?.type ?? '')
    || ['winter-solstice', 'spring-tournament', 'midsummer-fair'].includes(festival ?? '');
  return policy.enabled && hasScreenEffect ? <ScreenCanvas /> : null;
}
function ScreenCanvas() {
  const ref=useRef<HTMLCanvasElement>(null);
  const {manager,assets,policy,weather,festival,strike}=useEnvironment();
  useEffect(() => {
    const canvas=ref.current,ctx=canvas?.getContext('2d'),shell=canvas?.parentElement;
    if (!canvas || !ctx || !shell) return;
    let w=0,h=0;
    let board: ScreenRegion={x:0,y:0,width:0,height:0};
    let holes: Array<{x:number;y:number;w:number;h:number}> = [];
    const scene: Scene={policy,assets,weather:weather?.type,festival:festival??undefined,strike};
    let measureFrame: number | null = null;
    const measure=() => {
      measureFrame = null;
      const root=canvas.getBoundingClientRect();
      const art=shell.querySelector('.board-atmosphere')?.getBoundingClientRect();
      board=art?{x:art.left-root.left,y:art.top-root.top,width:art.width,height:art.height}:{x:0,y:0,width:w,height:h};
      holes=Array.from(document.querySelectorAll('[data-fx-protect], [role="dialog"], [role="alertdialog"]')).map(element => {
        const r=element.getBoundingClientRect();return {x:r.left-root.left-2,y:r.top-root.top-2,w:r.width+4,h:r.height+4};
      });
      manager.invalidate();
    };
    const scheduleMeasure = () => {
      if (measureFrame === null) measureFrame = requestAnimationFrame(measure);
    };
    const protectedSelector = '[data-fx-protect], [role="dialog"], [role="alertdialog"]';
    const affectsProtection = (node: Node) => node instanceof Element && (node.matches(protectedSelector) || !!node.querySelector(protectedSelector));
    const onTransition = (event: Event) => {
      if (event.target instanceof Element && affectsProtection(event.target)) scheduleMeasure();
    };
    const onScroll = (event: Event) => {
      // Scrolling content inside an already protected panel cannot move its outline.
      if (event.target instanceof Element && event.target.closest(protectedSelector)) return;
      scheduleMeasure();
    };
    const draw=(seconds:number) => {
      if (!w || !h) return;
      canvas.dataset.renderedParticles=String(drawScreen(ctx,w,h,policy.animated?seconds:0,scene,board));
      for(const r of holes) ctx.clearRect(r.x,r.y,r.w,r.h);
    };
    const resize=() => {
      const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const dpr=Math.min(window.devicePixelRatio||1,policy.dpr);
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);scheduleMeasure();
    };
    const unsubscribe=manager.register(draw);
    const observer=new ResizeObserver(resize);observer.observe(shell);
    const mutation=new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(affectsProtection))) scheduleMeasure();
    });mutation.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-fx-protect','open']});
    // Resize/scroll and panel mounting update holes; no layout reads in the frame loop.
    window.addEventListener('resize',resize);document.addEventListener('scroll',onScroll,true);
    document.addEventListener('transitionend',onTransition,true);document.addEventListener('animationend',onTransition,true);
    resize();
    return () => {if (measureFrame !== null) cancelAnimationFrame(measureFrame);unsubscribe();observer.disconnect();mutation.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('scroll',onScroll,true);document.removeEventListener('transitionend',onTransition,true);document.removeEventListener('animationend',onTransition,true);};
  },[manager,assets,policy,weather?.type,festival,strike]);
  return <canvas ref={ref} className="screen-event-fx" aria-hidden="true" data-weather={weather?.type??'clear'} data-strike={strike??'none'} />;
}
