import type { WeatherType } from '@/data/weather';
import type { FestivalId } from '@/data/festivals';
import type { EffectAssets } from './effectAssets';
import type { EffectPolicy } from './effectPolicy';
import { precipitationBudget, sample } from './effectPolicy';
import { CHIMNEYS, LIGHTS, PUDDLES, FESTIVAL_ANCHORS, type BoardRect } from './effectAnchors';
import { loadZoneConfig } from '@/data/zoneStorage';

export type Scene = { policy: EffectPolicy; assets: EffectAssets | null; weather?: WeatherType; festival?: FestivalId; strike: number | null };
type Context = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const mod = (x: number, n: number) => ((x % n) + n) % n;
// Precomputed pool, shared immutably. Event transitions never reseed the game's RNG.
const POOL = Array.from({length:480},(_,i) => ({x:sample(i),y:sample(i,1),speed:sample(i,2),phase:sample(i,3),size:sample(i,4)}));

function sprite(ctx: Context, image: CanvasImageSource | undefined | null, x: number,y: number,w: number,h: number,alpha: number,rotation=0) {
  if (!image || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x,y); ctx.rotate(rotation); ctx.drawImage(image,-w/2,-h/2,w,h); ctx.restore();
}
function glow(ctx: Context,x: number,y: number,r: number,color: string,alpha: number) {
  const g = ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,color); g.addColorStop(.2,color+'b0'); g.addColorStop(1,color+'00');
  ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=alpha; ctx.fillStyle=g; ctx.fillRect(x-r,y-r,r*2,r*2); ctx.restore();
}
function clipBoard(ctx: Context,w: number,h: number,panel: BoardRect) {
  ctx.beginPath(); ctx.rect(0,0,w,h);
  ctx.rect(panel.left*w/100,panel.top*h/100,panel.width*w/100,panel.height*h/100);
  ctx.clip('evenodd');
}

export function createWorldRenderer() {
  // Read the existing animation editor setting at mount, as the original crow layer did.
  const crows = loadZoneConfig()?.animationLayers?.find(l => l.id === 'graveyard-crows');
  return (ctx: Context,w: number,h: number,seconds: number,scene: Scene,panel: BoardRect) => {
    const {policy,assets,weather,festival} = scene;
    const t = policy.animated ? seconds : 0;
    const winter = weather === 'snowstorm' || festival === 'winter-solstice';
    const rainy = weather === 'thunderstorm' || weather === 'harvest-rain';
    const s = assets?.sprites;
    let particles = 0;
    const cap = policy.budget - (policy.mobile ? 10 : 24);
    const emit = (index: number,x: number,y: number,width: number,height: number,alpha: number,rotation=0) => {
      if (particles++ < cap) sprite(ctx,s?.[index],x,y,width,height,alpha,rotation);
    };
    ctx.clearRect(0,0,w,h); ctx.save(); clipBoard(ctx,w,h,panel);
    // Sparse translucent grade, constrained to the board artwork.
    ctx.fillStyle = weather === 'drought' ? '#c18a3221' : weather === 'thunderstorm' ? '#14263835' : winter ? '#9cc9ed25' : weather === 'enchanted-fog' ? '#5c538323' : festival ? '#ffc5700c' : '#00000000';
    ctx.fillRect(0,0,w,h);
    for (const [x,y,r,color] of LIGHTS) glow(ctx,x*w,y*h,r*w,color,(winter ? .49 : .32) * (1+ .13*Math.sin(t*1.3+x*11)));
    // Existing wet ground: sheen in clear weather, localized ripples when wet, ice when cold.
    for (const [x,y,rx,ry] of PUDDLES) {
      ctx.save(); ctx.translate(x*w,y*h); ctx.scale(1,ry*h/(rx*w));
      const g=ctx.createRadialGradient(0,0,0,0,0,rx*w); g.addColorStop(0,winter?'#d5f5ff65':rainy?'#accddd50':'#e2ddba20'); g.addColorStop(1,'#bddceb00');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,rx*w,0,TAU);ctx.fill();
      if (policy.animated && rainy) for (let j=0;j<3;j++) { const age=mod(t*.48+j/3+x,1);ctx.strokeStyle=`rgba(210,232,240,${(1-age)*.4})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,age*rx*w,0,TAU);ctx.stroke(); }
      ctx.restore();
    }
    if (festival) {
      FESTIVAL_ANCHORS.forEach(([x,y],i) => {
        // Cloth stays present in Calm; no extra game objects or crowd tokens.
        emit(15,x*w,y*h,Math.max(24,w*.039),h*.090,.88,policy.animated?Math.sin(t*1.6+i)*.045:0);
        if (festival === 'midsummer-fair' || festival === 'harvest-festival') glow(ctx,x*w,(y+.045)*h,w*.024,'#ffbd62',.27);
      });
      if (festival === 'winter-solstice') {
        for (let i=0;i<3;i++) { ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.09;ctx.fillStyle=['#64dfb8','#9aafff','#ba88db'][i];ctx.beginPath();ctx.ellipse(w*(.34+i*.19),h*(.05+.014*Math.sin(t*.15+i)),w*.24,h*.045,Math.sin(t*.08)*.07,0,TAU);ctx.fill();ctx.restore(); }
      }
    }
    if (!policy.animated) { ctx.restore();return 0; }
    // Broad shadow passes at two depths, never narrow repeated stripes.
    for (let i=0;i<2;i++) {
      const x=mod(t*(i?3.3:1.8)+w*(.18+i*.51),w*1.7)-w*.35;
      emit(4,x,h*(.22+i*.55),w*.79,h*.49,rainy?.26:.15,.04);
    }
    // Four chimney anchors, wispy four-stage smoke, stronger contrast in winter.
    CHIMNEYS.forEach(([x,y],c) => {
      const count=policy.mobile?3:6;
      for (let j=0;j<count;j++) {
        const age=mod(t/8+j/count+c*.21,1), stage=age*3;
        const width=w*(.028+age*.052), px=x*w+age*w*.027+Math.sin(age*5+c)*w*.006, py=y*h-age*h*.16;
        const alpha=Math.sin(age*Math.PI)*(winter?.45:.32);
        emit(Math.floor(stage),px,py,width,width*1.2,alpha*(1-stage%1),-.2);
        if (stage<3) emit(Math.floor(stage)+1,px,py,width,width*1.2,alpha*(stage%1),-.2);
      }
    });
    // Forge embers and tower motes are anchored to the existing art.
    for (let i=0;i<(policy.mobile?4:10);i++) {
      const p=POOL[i],age=mod(t*.32+p.phase,1);
      emit(7,w*(.108+(p.x-.5)*.026+age*.009),h*(.854-age*.063),3+p.size*4,5+p.size*4,(1-age)*.75);
      const a=t*.7+p.phase*TAU;
      glow(ctx,w*(.853+Math.cos(a)*.024),h*(.753+Math.sin(a)*.032),2+p.size*2,'#c5a3ff',.44);
    }
    // Leaves have distinct painted silhouettes and three depth/speed bands.
    const leafCount = policy.mobile ? 5 : festival === 'harvest-festival' || weather === 'drought' ? 24 : 13;
    if (!winter) for (let i=0;i<leafCount;i++) {
      const p=POOL[i+50],depth=i%3, speed=7+depth*7;
      const x=mod(p.x*w+t*speed,w+60)-30, y=mod(p.y*h+t*(3+depth*2)+Math.sin(t*.7+p.phase*TAU)*12,h+40)-20;
      const size=(policy.mobile?8:10)+depth*5+p.size*5;
      emit(weather === 'drought'?12:8+i%4,x,y,size,size*(.5+.5*Math.abs(Math.cos(t*1.2+p.phase))),.62,t*.55+p.phase*TAU);
    }
    // Existing graveyard crow controls remain authoritative; other flocks cross infrequently.
    if (!rainy && !winter && assets?.crow) {
      if (crows?.visible !== false) for (let i=0;i<5;i++) {
        const a=t*(crows?.speed??1)/(1.6+i*.25)+i, orbit=(18+i*5)*(crows?.orbitRadius??1);
        sprite(ctx,assets.crow,w*((crows?.cx??3)+(i-2)*.3)/100+Math.cos(a)*orbit,h*((crows?.cy??30)+(i%2))/100+Math.sin(a)*orbit*.55,(11+i)*(crows?.size??1),(7+i*.5)*(crows?.size??1),.68,Math.sin(a)*.12);
      }
      const flight=mod(t+12,48);
      if (flight<14) for (let i=0;i<4;i++) sprite(ctx,assets.crow,(flight/14*w*1.3)-w*.15-i*17,h*(.07+.06*Math.sin(flight/14*Math.PI))+i%2*12,12+i,7+Math.sin(t*7+i)*2,.45,-.1);
    }
    const rainCount=precipitationBudget(weather,policy.mobile);
    for (let i=0;i<rainCount && particles<cap;i++,particles++) {
      const p=POOL[i], depth=i%3;
      if (weather === 'snowstorm') {
        const speed=12+depth*20+p.speed*9,x=mod(p.x*w+Math.sin(t*.4+p.phase*TAU)*(10+depth*8)+t*8,w),y=mod(p.y*h+t*speed,h+12)-6;
        ctx.fillStyle=`rgba(240,248,255,${.3+depth*.21})`;ctx.beginPath();ctx.ellipse(x,y,.7+depth*.7,.8+depth*.9,t+p.phase,0,TAU);ctx.fill();
      } else {
        const speed=380+depth*160, y=mod(p.y*h+t*speed,h+60)-30,x=mod(p.x*w-t*speed*.16,w);
        ctx.strokeStyle=`rgba(193,215,231,${.14+depth*.07})`;ctx.lineWidth=.55+depth*.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3-depth*2,y+11+depth*8);ctx.stroke();
      }
    }
    if (weather === 'drought') for (let i=0;i<(policy.mobile?3:6);i++) {
      const p=POOL[70+i];emit(6,mod(p.x*w+t*(14+i*2),w*1.5)-w*.25,h*(.22+p.y*.65),w*.47,h*.17,.2);
    }
    if (weather === 'enchanted-fog' && assets?.mist) {
      for(let i=0;i<3;i++) sprite(ctx,assets.mist,mod(w*(.2+i*.5)+t*(i%2?3:-2),w*1.6)-w*.3,h*(.22+i*.3),w*.95,h*.5,.25);
      for(let i=0;i<16;i++) {const p=POOL[i+85];emit(7,mod(p.x*w+t*3,w),mod(p.y*h-t*4,h),4,4,.2+.2*Math.sin(t+p.phase*6));}
    }
    if (festival && festival !== 'winter-solstice') {
      for (let i=0;i<(policy.mobile?12:36) && particles<cap;i++,particles++) {
        const p=POOL[120+i],x=mod(p.x*w+t*(10+p.speed*12)+Math.sin(t+p.phase*6)*15,w),y=mod(p.y*h+t*(20+p.speed*20),h);
        ctx.save();ctx.translate(x,y);ctx.rotate(t*(1+p.speed)+p.phase*6);ctx.fillStyle=['#b84137','#dbb451','#668666','#587ca0'][i%4];ctx.globalAlpha=.8;ctx.fillRect(-2,-2,3+p.size*3,(2+p.size*4)*Math.cos(t*3+p.phase));ctx.restore();
      }
    }
    ctx.restore(); return Math.min(particles,cap);
  };
}

export function drawScreen(ctx: Context,w: number,h: number,t: number,scene: Scene) {
  ctx.clearRect(0,0,w,h);
  const {policy,assets,weather,festival}=scene;
  if (weather === 'snowstorm' || festival === 'winter-solstice') {
    const size=Math.min(w,h)*.27;
    // Painted frost stays at the four corners; mid-screen and text remain clear.
    for(let i=0;i<4;i++) sprite(ctx,assets?.sprites[14],i%2?w-size*.22:size*.22,i<2?h-size*.22:size*.22,size,size,.47,i===0?0:i===1?-Math.PI/2:i===2?Math.PI/2:Math.PI);
  }
  if (weather === 'enchanted-fog') {
    const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.65);g.addColorStop(0,'#41304f00');g.addColorStop(1,'#34234260');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  if (!policy.animated) return;
  if (weather === 'thunderstorm' || weather === 'harvest-rain') {
    const count=policy.mobile?7:18;
    for(let i=0;i<count;i++) {
      const p=POOL[200+i], age=mod(t/(7+p.speed*8)+p.phase,1);
      // Camera droplets use screen coordinates and much slower motion than world rain.
      sprite(ctx,assets?.sprites[13],w*p.x,h*(age*1.3-.15),22+p.size*17,40+p.size*32,Math.sin(age*Math.PI)*.42);
    }
    if (scene.strike !== null) {
      ctx.fillStyle='#d1e1ed15';ctx.fillRect(0,0,w,h);
      // A single restrained jagged stroke at the board edge, no repeated flashing.
      ctx.strokeStyle='#e2eaf4a0';ctx.lineWidth=1.8;ctx.beginPath();const x=w*(.78+(scene.strike%3)*.045);ctx.moveTo(x,0);ctx.lineTo(x-16,h*.075);ctx.lineTo(x+4,h*.065);ctx.lineTo(x-30,h*.17);ctx.stroke();
    }
  }
}
