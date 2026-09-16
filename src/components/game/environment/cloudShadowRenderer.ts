import {
  CanvasTexture, ClampToEdgeWrapping, DataTexture, LinearFilter, Mesh, NoColorSpace,
  OrthographicCamera, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, TextureLoader,
  UnsignedByteType, Vector4, WebGLRenderer,
} from 'three';
import gameBoard from '@/assets/game-board.jpeg';
import type { WeatherType } from '@/data/weather';
import type { BoardRect } from './effectAnchors';
import { CLOUD_NOISE_SIZE, cloudBufferSize, cloudStrength, createCloudNoise } from './cloudShadowModel';

const VERTEX = /* glsl */`
  varying vec2 vUv;
  void main() { vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }
`;

const FRAGMENT = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D noiseMap;
  uniform sampler2D boardMap;
  uniform float hasBoard;
  uniform float time;
  uniform float aspect;
  uniform float strength;
  uniform vec4 panel;
  float cubic(float x) { return x*x*(3.0-2.0*x); }
  float channelNoise(vec2 p,float channel) {
    vec2 cell=floor(p), f=vec2(cubic(fract(p.x)),cubic(fract(p.y)));
    vec2 size=vec2(64.0);
    vec2 a=(mod(cell,size)+.5)/size, b=(mod(cell+vec2(1,0),size)+.5)/size;
    vec2 c=(mod(cell+vec2(0,1),size)+.5)/size, d=(mod(cell+vec2(1,1),size)+.5)/size;
    vec4 na=texture2D(noiseMap,a), nb=texture2D(noiseMap,b), nc=texture2D(noiseMap,c), nd=texture2D(noiseMap,d);
    float va=mix(na.r,na.g,channel), vb=mix(nb.r,nb.g,channel);
    float vc=mix(nc.r,nc.g,channel), vd=mix(nd.r,nd.g,channel);
    return mix(mix(va,vb,f.x),mix(vc,vd,f.x),f.y);
  }
  float field(vec2 p,float channel) {
    return channelNoise(p,channel)*.58+channelNoise(p*2.03,channel)*.29+channelNoise(p*4.11,channel)*.13;
  }
  void main() {
    vec2 uv=vec2(vUv.x,1.0-vUv.y);
    if(panel.z>0.0&&panel.w>0.0&&uv.x>=panel.x&&uv.x<=panel.x+panel.z&&uv.y>=panel.y&&uv.y<=panel.y+panel.w) {
      gl_FragColor=vec4(1.0); return;
    }
    vec2 p=vec2(uv.x*aspect,uv.y)*3.1;
    float a=field(p+vec2(13.7,7.3)-time*vec2(.012,.0048),0.0);
    float angle=.5235987756; mat2 rotate=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
    float b=field(rotate*p+vec2(-9.2,21.4)+time*vec2(-.0067,.0031),1.0);
    float coverage=smoothstep(.35,.65,a*.64+b*.36);
    float shade=1.0-coverage*strength;
    vec3 multiplier=shade*vec3(1.0-coverage*.025,1.0-coverage*.012,1.0);
    if(hasBoard>.5) {
      vec3 source=texture2D(boardMap,vUv).rgb;
      float luma=dot(source,vec3(.2126,.7152,.0722));
      vec3 target=mix(source,vec3(luma),coverage*.055)*multiplier;
      vec3 sampled=target/max(source,vec3(.035));
      multiplier=mix(multiplier,sampled,step(vec3(.035),source));
    }
    gl_FragColor=vec4(clamp(multiplier,vec3(.65),vec3(1.0)),1.0);
  }
`;

export function createCloudShadowRenderer(canvas: HTMLCanvasElement, compact: boolean, onTextureSettled?: () => void) {
  const renderer = new WebGLRenderer({ canvas, alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); renderer.toneMapping = 0; renderer.setClearColor(0xffffff, 1);
  const noise = new DataTexture(createCloudNoise(), CLOUD_NOISE_SIZE, CLOUD_NOISE_SIZE, RGBAFormat, UnsignedByteType);
  noise.wrapS = noise.wrapT = ClampToEdgeWrapping; noise.minFilter = noise.magFilter = LinearFilter; noise.colorSpace = NoColorSpace; noise.needsUpdate = true;
  const blank = document.createElement('canvas'); blank.width = blank.height = 1;
  const board = new CanvasTexture(blank); board.colorSpace = NoColorSpace;
  const uniforms = { noiseMap:{value:noise}, boardMap:{value:board as import('three').Texture}, hasBoard:{value:0}, time:{value:0}, aspect:{value:1}, strength:{value:.27}, panel:{value:new Vector4()} };
  const geometry = new PlaneGeometry(2,2);
  const material = new ShaderMaterial({uniforms,vertexShader:VERTEX,fragmentShader:FRAGMENT,depthTest:false,depthWrite:false,toneMapped:false});
  const mesh = new Mesh(geometry,material), scene = new Scene(), camera = new OrthographicCamera(-1,1,1,-1,0,1); scene.add(mesh);
  let failed=false,disposed=false,width=0,height=0;
  renderer.debug.onShaderError=()=>{failed=true;};
  const loaded = new TextureLoader().load(gameBoard, texture => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace=NoColorSpace; texture.wrapS=texture.wrapT=ClampToEdgeWrapping;
    uniforms.boardMap.value.dispose(); uniforms.boardMap.value=texture; uniforms.hasBoard.value=1;
    onTextureSettled?.();
  },undefined,()=>{ if(!disposed) onTextureSettled?.(); });
  return {
    resize(nextWidth:number,nextHeight:number,panel:BoardRect) {
      width=nextWidth;height=nextHeight;
      const size=cloudBufferSize(width,height,compact||width<1024);
      renderer.setSize(size.width,size.height,false);uniforms.aspect.value=width/Math.max(1,height);
      uniforms.panel.value.set(panel.left/100,panel.top/100,panel.width/100,panel.height/100);
    },
    draw(seconds:number,weather?:WeatherType) {
      if(!width||!height) return;
      uniforms.time.value=seconds;uniforms.strength.value=cloudStrength(weather);renderer.render(scene,camera);
      if(failed) throw new Error('Cloud shadow shader failed to compile');
      canvas.dataset.renderer='three';canvas.dataset.effectTime=seconds.toFixed(3);canvas.dataset.drawCalls=String(renderer.info.render.calls);
    },
    dispose() {
      disposed=true;if(uniforms.boardMap.value!==loaded) loaded.dispose();uniforms.boardMap.value.dispose();noise.dispose();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();
    },
  };
}