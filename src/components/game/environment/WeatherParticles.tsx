import { useEffect, useRef } from 'react';
import type { WeatherParticle } from '@/data/weather';

function particleBudget(particle: WeatherParticle, mobile: boolean) {
  return particle === 'rain' ? (mobile ? 120 : 300) : particle === 'light-rain' ? (mobile ? 45 : 95) : (mobile ? 45 : 100);
}

// Independent, repeatable decorative seeds; never draw from the game's RNG.
const seed = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x-Math.floor(x); };

/** Cached soft sprites at three depths, wind, and ground splash coronas. */
export function WeatherParticles({ particle, isMobile }: { particle: WeatherParticle; isMobile: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snow = particle === 'snow';
    const sprite = document.createElement('canvas');
    sprite.width = 32; sprite.height = snow ? 32 : 96;
    const paint = sprite.getContext('2d');
    if (!paint) return;
    if (snow) {
      const glow = paint.createRadialGradient(16,16,1,16,16,15);
      glow.addColorStop(0,'#fffef5'); glow.addColorStop(.2,'#eef7ffdf'); glow.addColorStop(.55,'#e2f2ff55'); glow.addColorStop(1,'#e2f2ff00');
      paint.fillStyle=glow; paint.fillRect(0,0,32,32);
    } else {
      const trail = paint.createLinearGradient(0,0,0,96);
      trail.addColorStop(0,'#c5def500'); trail.addColorStop(.7,'#d4e8f8aa'); trail.addColorStop(.93,'#e6f4ffd0'); trail.addColorStop(1,'#d4e8f800');
      paint.fillStyle=trail; paint.beginPath(); paint.ellipse(16,48,4.5,47,0,0,Math.PI*2); paint.fill();
    }
    let width=1, height=1, frame=0, last=0, elapsed=0;
    const resize = () => {
      const bounds=canvas.getBoundingClientRect(); width=Math.max(1,bounds.width); height=Math.max(1,bounds.height);
      const dpr=Math.min(window.devicePixelRatio || 1,isMobile ? 1.25 : 1.5);
      canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const count=particleBudget(particle,isMobile);
    const particles=Array.from({length:count},(_,i) => ({ x:seed(i+1),y:seed(i+801),depth:.3+seed(i+402)*.7, phase:seed(i+1050)*Math.PI*2 }));
    const draw=(now:number) => {
      frame=requestAnimationFrame(draw);
      if (now-last < (isMobile ? 33 : 16)) return;
      const dt=last ? Math.min((now-last)/1000,.05) : 0; last=now; elapsed+=dt;
      ctx.clearRect(0,0,width,height);
      const wind=-.04+Math.sin(elapsed*.34)*.018;
      for (const p of particles) {
        const speed=snow ? .028+p.depth*.055 : .48+p.depth*.48;
        p.y=(p.y+dt*speed)%1.08; p.x=(p.x+wind*dt*(.4+p.depth)+1.1)%1.1;
        const x=p.x*width + (snow ? Math.sin(elapsed*.7+p.phase)*14*p.depth : 0), y=p.y*height-30;
        ctx.globalAlpha=(snow ? .55 : .26)+p.depth*.32;
        ctx.save(); ctx.translate(x,y);
        if (!snow) ctx.rotate(.17+wind);
        const size=snow ? 2+p.depth*6 : 3+p.depth*5;
        ctx.drawImage(sprite,-size/2,0,size,snow ? size : (12+p.depth*30)*(particle==='light-rain' ? .65 : 1));
        ctx.restore();
      }
      if (!snow) {
        for (let i=0;i<(isMobile ? 12 : 26);i++) {
          const life=(elapsed*(particle==='rain' ? 1.2 : .7)+seed(i+300))%1;
          if (life>.45) continue;
          const x=seed(i+55)*width,y=(.16+seed(i+66)*.83)*height;
          ctx.globalAlpha=(1-life/.45)*.26; ctx.strokeStyle='#d9ecf9'; ctx.lineWidth=.7;
          ctx.beginPath(); ctx.ellipse(x,y,1+life*12,.5+life*4,0,0,Math.PI*2); ctx.stroke();
          for (let j=0;j<3;j++) {ctx.beginPath();ctx.arc(x+(j-1)*life*9,y-Math.sin(life/.45*Math.PI)*(2+j),.6,0,Math.PI*2);ctx.fillStyle='#deefff';ctx.fill();}
        }
      }
      ctx.globalAlpha=1;
    };
    frame=requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  },[particle,isMobile]);
  return <canvas ref={ref} className="weather-particles" data-particle-budget={particleBudget(particle,isMobile)} />;
}
