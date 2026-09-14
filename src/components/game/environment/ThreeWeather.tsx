import { useEffect, useRef } from 'react';
import { useEnvironment } from './useEnvironment';
import type { createThreeWeather } from './threeWeatherRenderer';

/** Lazily uses the installed Three.js, and hands weather back to Canvas on failure. */
export function ThreeWeather() {
  const ref=useRef<HTMLCanvasElement>(null);
  const environment=useEnvironment();
  const {manager,setThreeReady}=environment;
  const latest=useRef(environment);
  useEffect(()=>{latest.current=environment;manager.invalidate();},[environment,manager]);
  useEffect(()=>{
    const canvas=ref.current, shell=canvas?.parentElement;
    if(!canvas||!shell) return;
    let cancelled=false, renderer:ReturnType<typeof createThreeWeather>|undefined;
    let unsubscribe: (()=>void)|undefined, cleanupLayout:(()=>void)|undefined;
    const fail=()=>{
      unsubscribe?.();unsubscribe=undefined;cleanupLayout?.();cleanupLayout=undefined;
      renderer?.dispose();renderer=undefined;
      canvas.dataset.renderer='fallback';setThreeReady(false);
    };
    const lost=(event:Event)=>{event.preventDefault();fail();};
    canvas.addEventListener('webglcontextlost',lost);
    void Promise.all([import('./threeWeatherRenderer'),import('three')]).then(([module,{Vector4}])=>{
      if(cancelled) return;
      try {
        renderer=module.createThreeWeather(canvas,window.matchMedia('(pointer: coarse)').matches);
        const selector='[data-fx-protect], [role="dialog"], [role="alertdialog"]';
        let measureFrame:number|null=null;
        let observed=new Set<Element>();
        const measure=()=>{
          measureFrame=null;
          const root=canvas.getBoundingClientRect();
          const art=shell.querySelector('.board-atmosphere');
          const board=art?.getBoundingClientRect();
          const panels=Array.from(document.querySelectorAll(selector));
          const next=new Set<Element>([shell,...(art?[art]:[]),...panels]);
          observed.forEach(element=>{if(!next.has(element)) observer.unobserve(element);});
          next.forEach(element=>{if(!observed.has(element)) observer.observe(element);});observed=next;
          const holes=panels.map(element=>element.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0 && r.right>root.left && r.left<root.right && r.bottom>root.top && r.top<root.bottom)
            .map(r=>new Vector4(r.left-root.left-2,r.top-root.top-2,r.width+4,r.height+4));
          renderer?.resize({width:root.width,height:root.height,
            board:board?new Vector4(board.left-root.left,board.top-root.top,board.width,board.height):new Vector4(),holes});
          manager.invalidate();
        };
        const schedule=()=>{if(measureFrame===null) measureFrame=requestAnimationFrame(measure);};
        const observer=new ResizeObserver(schedule);
        const affects=(node:Node)=>node instanceof Element && (node.matches(selector)||!!node.querySelector(selector));
        const mutation=new MutationObserver(records=>{
          if(records.some(r=>r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(affects))) schedule();
        });
        mutation.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-fx-protect','open']});
        const scroll=(event:Event)=>{if(!(event.target instanceof Element&&event.target.closest(selector))) schedule();};
        window.addEventListener('resize',schedule);document.addEventListener('scroll',scroll,true);
        document.addEventListener('transitionend',schedule,true);document.addEventListener('animationend',schedule,true);
        cleanupLayout=()=>{
          if(measureFrame!==null) cancelAnimationFrame(measureFrame);
          observer.disconnect();mutation.disconnect();window.removeEventListener('resize',schedule);
          document.removeEventListener('scroll',scroll,true);document.removeEventListener('transitionend',schedule,true);document.removeEventListener('animationend',schedule,true);
        };
        measure();
        let registered=false, initialFailure=false;
        unsubscribe=manager.register(seconds=>{
          try {
            const state=latest.current;
            const calls=renderer?.draw(seconds,state.weather?.type,state.strike);
            canvas.dataset.drawCalls=String(calls??0);canvas.dataset.effectTime=seconds.toFixed(3);
          } catch { if(registered) fail(); else initialFailure=true; }
        });
        registered=true;
        if(initialFailure) {fail();return;}
        canvas.dataset.renderer='three';setThreeReady(true);
      } catch {fail();}
    }).catch(()=>{if(!cancelled) fail();});
    return ()=>{
      cancelled=true;canvas.removeEventListener('webglcontextlost',lost);
      unsubscribe?.();cleanupLayout?.();renderer?.dispose();setThreeReady(false);
    };
  },[manager,setThreeReady]);
  return <canvas ref={ref} className="three-weather" aria-hidden="true" data-renderer="loading"
    data-weather={environment.weather?.type??'clear'} data-strike={environment.strike??'none'} />;
}
