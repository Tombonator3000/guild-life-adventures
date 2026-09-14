import { sample } from './effectPolicy';

type Point = readonly [number, number];
interface Roof { id: string; points: readonly Point[]; shade: number; holes?: readonly (readonly Point[])[] }
/** Hand-traced roof planes in original artwork UVs; no building/wall replacement. */
export const SNOW_ROOFS: readonly Roof[] = [
  {id:'castle',shade:1,points:[[.087,.027],[.110,.088],[.095,.104],[.086,.065],[.070,.105],[.065,.083]]},
  {id:'landlord',shade:.92,points:[[.283,.050],[.347,.049],[.351,.093],[.282,.093]]},
  {id:'fence',shade:1,points:[[.665,.027],[.772,.028],[.776,.084],[.664,.078]],holes:[[[.681,.02],[.689,.02],[.689,.043],[.681,.043]]]},
  {id:'general-store',shade:.92,points:[[.090,.377],[.155,.410],[.178,.446],[.151,.467],[.072,.423]],holes:[[[.124,.37],[.137,.37],[.137,.414],[.124,.414]]]},
  {id:'bank-left',shade:.8,points:[[.100,.527],[.100,.574],[.051,.637],[.052,.590]]},
  {id:'bank-right',shade:.97,points:[[.100,.527],[.146,.598],[.147,.627],[.100,.574]]},
  {id:'forge-left',shade:.86,points:[[.072,.808],[.104,.768],[.130,.799],[.130,.820],[.104,.795],[.071,.848]],holes:[[[.09,.753],[.105,.753],[.105,.782],[.09,.782]]]},
  {id:'forge-right',shade:1,points:[[.161,.746],[.194,.801],[.195,.826],[.161,.777],[.134,.813],[.129,.794]],holes:[[[.132,.751],[.150,.751],[.150,.784],[.132,.784]]]},
  {id:'guild-hall',shade:1,points:[[.245,.758],[.374,.758],[.377,.836],[.241,.836]]},
  {id:'academy',shade:.95,points:[[.647,.754],[.739,.754],[.741,.813],[.647,.814]]},
  {id:'academy-west-tower',shade:1,points:[[.626,.713],[.648,.756],[.606,.757]]},
  {id:'academy-east-tower',shade:.9,points:[[.760,.713],[.782,.758],[.739,.758]]},
  {id:'armory',shade:1,points:[[.822,.443],[.883,.429],[.909,.447],[.889,.470],[.832,.496],[.808,.478]],holes:[[[.839,.42],[.849,.42],[.849,.446],[.839,.446]]]},
  {id:'tavern-main',shade:.87,points:[[.903,.241],[.918,.271],[.933,.290],[.932,.307],[.905,.290],[.878,.247]]},
  {id:'tavern-west',shade:1,points:[[.870,.242],[.893,.263],[.861,.315],[.831,.315]]},
  {id:'tower',shade:.82,points:[[.857,.599],[.884,.674],[.870,.691],[.840,.682],[.827,.665]]},
];

function polygon(ctx: CanvasRenderingContext2D, points: readonly Point[], width: number, height: number) {
  points.forEach(([x,y],i)=>i ? ctx.lineTo(x*width,y*height) : ctx.moveTo(x*width,y*height));
  ctx.closePath();
}

/** One small cached atlas, rebuilt only as coverage crosses a 1/16 step. */
export function createRoofSnowPainter() {
  let atlas: HTMLCanvasElement | null = null, cachedLevel = -1;
  const width=1536, height=Math.round(width*3392/5056);
  return (ctx:CanvasRenderingContext2D,w:number,h:number,amount:number) => {
    if(amount<=0) return;
    const level=Math.ceil(Math.min(1,amount)*16);
    if(!atlas) {atlas=document.createElement('canvas');atlas.width=width;atlas.height=height;}
    if(level!==cachedLevel) {
      const paint=atlas.getContext('2d');if(!paint) return;
      paint.clearRect(0,0,width,height);
      for(const [index,roof] of SNOW_ROOFS.entries()) {
        const xs=roof.points.map(p=>p[0]*width), ys=roof.points.map(p=>p[1]*height);
        const left=Math.min(...xs),top=Math.min(...ys),rw=Math.max(...xs)-left,rh=Math.max(...ys)-top;
        paint.save();paint.beginPath();polygon(paint,roof.points,width,height);
        roof.holes?.forEach(points=>polygon(paint,points,width,height));paint.clip('evenodd');
        const coverage=level/16;
        const gradient=paint.createLinearGradient(left,top,left+rw*.3,top+rh);
        gradient.addColorStop(0,`rgba(248,252,255,${coverage*.82*roof.shade})`);
        gradient.addColorStop(1,`rgba(189,208,218,${coverage*.58})`);
        paint.fillStyle=gradient;paint.fillRect(left,top,rw,rh);
        // Soft connected drifts over fine grain, rather than large white pebble shapes.
        for(let i=0;i<24;i++) {
          const x=left+sample(i,index+131)*rw,y=top+sample(i,index+143)*rh;
          const radius=4+sample(i,index+151)*Math.min(rw,rh)*.38;
          const drift=paint.createRadialGradient(x,y,0,x,y,radius);
          drift.addColorStop(0,`rgba(251,254,255,${coverage*.47})`);drift.addColorStop(1,'#f7fdff00');
          paint.fillStyle=drift;paint.fillRect(x-radius,y-radius,radius*2,radius*2);
        }
        for(let i=0;i<650;i++) {
          if(sample(i,index+71)>coverage) continue;
          const x=left+sample(i,index+80)*rw,y=top+sample(i,index+91)*rh;
          const size=.35+sample(i,index+102)*.9;
          paint.fillStyle=i%4===0?'#b3c9d53b':'#f7fcff6a';paint.beginPath();
          paint.ellipse(x,y,size*1.5,size*.62,-.15,0,Math.PI*2);paint.fill();
        }
        paint.beginPath();polygon(paint,roof.points,width,height);paint.strokeStyle=`rgba(248,253,255,${coverage*.75})`;paint.lineWidth=1+coverage*1.4;paint.stroke();
        paint.restore();
      }
      cachedLevel=level;
    }
    ctx.save();ctx.globalAlpha=Math.min(1,amount*16);
    // Copy roof bounding boxes, not a full transparent board every frame.
    for(const roof of SNOW_ROOFS) {
      const xs=roof.points.map(p=>p[0]),ys=roof.points.map(p=>p[1]);
      const x=Math.min(...xs),y=Math.min(...ys),rw=Math.max(...xs)-x,rh=Math.max(...ys)-y;
      ctx.drawImage(atlas,x*width,y*height,rw*width,rh*height,x*w,y*h,rw*w,rh*h);
    }
    ctx.restore();
  };
}
