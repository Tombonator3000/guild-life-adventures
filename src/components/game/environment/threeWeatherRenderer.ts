import {
  WebGLRenderer, Scene, OrthographicCamera, InstancedBufferGeometry,
  InstancedBufferAttribute, BufferAttribute, ShaderMaterial, Mesh, Vector2, Vector4, DoubleSide,
} from 'three';
import { sample } from './effectPolicy';
import type { WeatherType } from '@/data/weather';
import { birdFlight, type TownAtmosphere } from './TownAtmosphere';
import { createBirdGeometry, birdVertex, birdFragment } from './birdGeometry';

export type WeatherLayout = { width: number; height: number; board: Vector4; holes: Vector4[] };
const MAX_HOLES = 24;
const vertexHeader = `
  attribute vec4 seed;
  uniform float time;
  uniform vec2 resolution;
  uniform vec4 board;
  uniform vec2 windOffset;
  uniform vec2 windVelocity;
  varying vec2 vUv;
  varying vec4 vSeed;
  void place(vec2 pixel) {
    gl_Position = vec4(pixel.x / resolution.x * 2.0 - 1.0, 1.0 - pixel.y / resolution.y * 2.0, 0.0, 1.0);
    vUv = uv; vSeed = seed;
  }
`;
const fragmentHeader = `
  uniform float time;
  uniform float rain;
  uniform float storm;
  uniform float drought;
  uniform float flash;
  uniform float pixelRatio;
  uniform vec2 resolution;
  uniform vec4 board;
  uniform vec4 holes[24];
  uniform int holeCount;
  varying vec2 vUv;
  varying vec4 vSeed;
  bool inside(vec2 p, vec4 r) {
    return p.x >= r.x && p.y >= r.y && p.x <= r.x+r.z && p.y <= r.y+r.w;
  }
  vec2 screenPixel() { return vec2(gl_FragCoord.x / pixelRatio, resolution.y - gl_FragCoord.y / pixelRatio); }
  void protectUI() {
    vec2 p = screenPixel();
    if (!inside(p, board)) discard;
    for (int i=0; i<24; i++) { if (i >= holeCount) break; if (inside(p, holes[i])) discard; }
  }
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float cloud(vec2 p) {
    return noise(p)*.56 + noise(p*2.03)*.28 + noise(p*4.11)*.12 + noise(p*8.21)*.04;
  }
`;

/** One transparent WebGL surface, including occasional instanced 3D birds. */
export function createThreeWeather(canvas: HTMLCanvasElement, coarsePointer: boolean) {
  let compact=coarsePointer;
  const renderer = new WebGLRenderer({canvas, alpha:true, antialias:false, depth:true, stencil:false, powerPreference:'low-power'});
  renderer.setClearColor(0,0);
  // Only the occasional solid bird meshes need depth. Do not clear a full-size
  // depth surface on every cloud/rain frame (especially on tablet GPUs).
  renderer.autoClearDepth=false;
  const scene = new Scene(), camera = new OrthographicCamera(-1,1,1,-1,0,1);
  const uniforms = {
    time:{value:0}, rain:{value:0}, storm:{value:0}, drought:{value:0}, flash:{value:0}, strikeIndex:{value:0},
    resolution:{value:new Vector2(1,1)}, board:{value:new Vector4()}, pixelRatio:{value:1},
    windOffset:{value:new Vector2()},windVelocity:{value:new Vector2()},
    flightProgress:{value:0},flightDirection:{value:1},flightBand:{value:.12},
    holes:{value:Array.from({length:MAX_HOLES},()=>new Vector4())}, holeCount:{value:0},
  };
  const resources: Array<{geometry:InstancedBufferGeometry; material:ShaderMaterial}> = [];
  const pass = (count:number, vertex:string, fragment:string, extra:Record<string,{value:number}> = {}, custom?:InstancedBufferGeometry) => {
    const geometry = custom??new InstancedBufferGeometry();
    if(!custom) {
      geometry.setAttribute('position',new BufferAttribute(new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0]),3));
      geometry.setAttribute('uv',new BufferAttribute(new Float32Array([0,0,1,0,1,1,0,1]),2));
      geometry.setIndex([0,2,1,0,3,2]);
    }
    const seeds = new Float32Array(count*4);
    for(let i=0;i<count;i++) seeds.set([sample(i,41),sample(i,42),sample(i,43),sample(i,44)],i*4);
    geometry.setAttribute('seed',new InstancedBufferAttribute(seeds,4));
    geometry.instanceCount=count;
    const material = new ShaderMaterial({uniforms:{...uniforms,...extra}, vertexShader:vertexHeader+vertex,
      fragmentShader:fragmentHeader+fragment, transparent:true, depthTest:false, depthWrite:false, toneMapped:false});
    if(custom) {material.side=DoubleSide;material.forceSinglePass=true;material.depthTest=true;material.depthWrite=true;}
    const mesh = new Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=resources.length;
    scene.add(mesh);resources.push({geometry,material});return mesh;
  };
  const rainMesh=pass(300,`
    void main() {
      float depth=.35+seed.z*.65;
      float speed=260.0+depth*420.0;
      vec2 origin=vec2(fract(seed.x+windOffset.x*(.001+depth*.001)),fract(seed.y+time*speed/(board.w+60.0)))*vec2(board.z,board.w+60.0)-vec2(0,30);
      vec2 size=vec2(.65+depth,12.+depth*24.);
      vec2 point=position.xy*size; point.x+=point.y*windVelocity.x*.009;
      place(board.xy+origin+point);
    }
  `,`
    void main() {
      protectUI();
      float edge=1.0-smoothstep(.05,.5,abs(vUv.x-.5));
      float taper=sin(vUv.y*3.14159);
      gl_FragColor=vec4(vec3(.72,.83,.91)+flash*.4,edge*taper*(.14+vSeed.z*.23));
    }
  `);
  const birdShadows=pass(5,`
    uniform float flightProgress;uniform float flightDirection;uniform float flightBand;
    void main() {
      float lead=flightDirection>0.0?flightProgress:1.0-flightProgress;
      vec2 origin=vec2(lead*1.38-.19-flightDirection*seed.x*.08,
        flightBand+sin(flightProgress*6.28)*.034+(seed.y-.5)*.06)*board.zw;
      place(board.xy+origin+vec2(24,32)+position.xy*vec2(30,17));
    }
  `,`
    void main() {protectUI();float alpha=(1.0-smoothstep(.04,.5,length(vUv-.5)))*.15;gl_FragColor=vec4(.04,.06,.08,alpha);}
  `);
  const birds=pass(5,birdVertex,birdFragment,{},createBirdGeometry());
  const dropMesh=pass(20,`
    varying float age;
    void main() {
      float cycle=15.0+seed.z*18.0;
      age=fract(time/cycle+seed.y);
      // Edge bands keep the town and the centre of the playing field readable.
      float x=seed.x<.5 ? .025+seed.x*.30 : .825+(seed.x-.5)*.30;
      float descent=age*age*(3.0-2.0*age);
      x+=sin(age*11.0+seed.w*6.28)*.002;
      float radius=5.0+seed.z*5.5;
      vec2 size=vec2(radius*3.0,90.0+seed.z*105.0);
      vec2 head=board.xy+vec2(x,descent*1.3-.16)*board.zw;
      place(head+vec2(position.x*size.x,(position.y-.36)*size.y));
    }
  `,`
    varying float age;
    void main() {
      protectUI();
      float path=.5+sin(vUv.y*9.0+vSeed.w*6.28)*.026;
      float trail=(1.0-smoothstep(.012,.043,abs(vUv.x-path)))*smoothstep(.05,.68,vUv.y)*(1.0-smoothstep(.82,.9,vUv.y));
      vec2 p=vec2((vUv.x-.5)*3.0,(vUv.y-.86)*19.0);
      float d=length(p), bead=1.0-smoothstep(.87,1.0,d);
      float z=sqrt(max(0.0,1.0-dot(p,p)));
      vec3 normal=normalize(vec3(p.x,-p.y,z));
      float spec=pow(max(0.0,dot(normal,normalize(vec3(-.45,.65,.9)))),28.0);
      float rim=smoothstep(.65,.95,d)*bead;
      vec3 color=mix(vec3(.14,.24,.30),vec3(.78,.89,.95),z*.42+spec*.58);
      color+=spec*.5+flash*.4;
      float fade=smoothstep(0.0,.08,age)*(1.0-smoothstep(.88,1.0,age));
      gl_FragColor=vec4(mix(vec3(.72,.84,.9),color,bead),fade*max(trail*.24,bead*(.16+spec*.66+rim*.30)));
    }
  `);
  const lightning=pass(1,`void main() { place(board.xy+(position.xy+.5)*board.zw); }`,`
    uniform float strikeIndex;
    float segment(vec2 p,vec2 a,vec2 b) { vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0)); }
    void main() {
      protectUI();
      vec2 p=(screenPixel()-board.xy)/board.zw;
      // One branched stroke, alternating outer edges. Thunder uses the existing shared event.
      if (mod(strikeIndex,2.0)<1.0) p.x=1.0-p.x;
      p*=board.zw/board.w;
      float x=.11*board.z/board.w;
      vec2 a=vec2(x,-.01),b=vec2(x-.028,.06),c=vec2(x+.008,.053),d=vec2(x-.037,.16);
      float distance=min(min(segment(p,a,b),segment(p,b,c)),segment(p,c,d));
      distance=min(distance,segment(p,b,vec2(x-.065,.105)));
      float core=1.0-smoothstep(.0008,.0023,distance);
      float glow=exp(-distance*110.0)*.27;
      gl_FragColor=vec4(.77,.87,1.0,flash*(.075+core*.75+glow));
    }
  `);
  let width=0,height=0, safeLayout=false;
  let previousStrike:number|null=null, strikeStart=-100;
  // Compile errors must recover the existing 2D atmosphere, never leave an empty GPU layer.
  let failed=false;
  renderer.debug.onShaderError=()=>{failed=true;};
  return {
    resize(layout:WeatherLayout) {
      width=layout.width;height=layout.height;compact=coarsePointer||width<1024;
      const dpr=Math.min(window.devicePixelRatio||1,compact?1:1.25);
      renderer.setPixelRatio(dpr);renderer.setSize(Math.max(1,width),Math.max(1,height),false);
      uniforms.pixelRatio.value=dpr;uniforms.resolution.value.set(width,height);
      uniforms.board.value.copy(layout.board);
      safeLayout=layout.holes.length<=MAX_HOLES && layout.board.z>0 && layout.board.w>0;
      uniforms.holeCount.value=Math.min(MAX_HOLES,layout.holes.length);
      layout.holes.slice(0,MAX_HOLES).forEach((hole,i)=>uniforms.holes.value[i].copy(hole));
    },
    draw(seconds:number,weather:WeatherType|undefined,strike:number|null,town:TownAtmosphere) {
      town.update(seconds,weather,true);
      uniforms.windOffset.value.set(town.drift.x,town.drift.y);
      uniforms.windVelocity.value.set(town.wind.x,town.wind.y);
      uniforms.time.value=seconds;
      const flock=birdFlight(seconds,weather);
      birds.visible=birdShadows.visible=flock.visible;
      birds.geometry.instanceCount=birdShadows.geometry.instanceCount=compact?3:5;
      uniforms.flightProgress.value=flock.progress;uniforms.flightDirection.value=flock.direction;uniforms.flightBand.value=flock.band;
      if(strike!==null && strike!==previousStrike) strikeStart=seconds;
      previousStrike=strike;
      const wet=weather==='thunderstorm'||weather==='harvest-rain';
      uniforms.rain.value=wet?1:0;uniforms.storm.value=weather==='thunderstorm'?1:0;
      uniforms.drought.value=weather==='drought'?1:0;
      uniforms.flash.value=strike!==null?Math.exp(-Math.max(0,seconds-strikeStart)*4.5):0;
      uniforms.strikeIndex.value=strike??0;
      rainMesh.visible=dropMesh.visible=wet;
      const rainCount=compact?120:300;
      dropMesh.geometry.instanceCount=compact?10:20;
      rainMesh.geometry.instanceCount=weather==='thunderstorm'?rainCount:Math.round(rainCount*.34);
      lightning.visible=strike!==null;
      scene.visible=safeLayout && width>0 && height>0;
      if (birds.visible) renderer.clearDepth();
      renderer.render(scene,camera);
      if(failed) throw new Error('Weather shader failed to compile');
      canvas.dataset.birds=String(flock.visible?(compact?3:5):0);
      canvas.dataset.birdVertices=String(birds.geometry.getAttribute('position').count);
      canvas.dataset.windX=town.wind.x.toFixed(3);
      return renderer.info.render.calls;
    },
    dispose() {
      resources.forEach(({geometry,material})=>{geometry.dispose();material.dispose();});
      renderer.dispose();renderer.forceContextLoss();
    },
  };
}
