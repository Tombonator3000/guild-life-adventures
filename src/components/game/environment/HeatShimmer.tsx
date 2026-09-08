import { useEffect, useRef } from 'react';
import gameBoard from '@/assets/game-board.jpeg';
import { useEnvironment } from './useEnvironment';
import type { BoardRect } from './effectAnchors';

const VERTEX='attribute vec2 position; varying vec2 uv; void main(){uv=vec2((position.x+1.0)*0.5,1.0-(position.y+1.0)*0.5);gl_Position=vec4(position,0.0,1.0);}';
const FRAGMENT=`precision mediump float;
varying vec2 uv; uniform sampler2D board; uniform float time; uniform vec2 resolution; uniform vec4 panel;
void main(){
  if(uv.x>panel.x && uv.x<panel.x+panel.z && uv.y>panel.y && uv.y<panel.y+panel.w) discard;
  float mask=smoothstep(0.25,0.65,uv.y)*(1.0-smoothstep(0.94,1.0,uv.y));
  float wave=sin(uv.y*155.0-time*2.2)*sin(uv.x*27.0+time*0.55);
  vec2 offset=vec2(wave*1.9,cos(uv.y*110.0-time*1.3)*0.55)*mask/resolution;
  gl_FragColor=vec4(texture2D(board,clamp(uv+offset,0.001,0.999)).rgb,mask*0.6);
}`;

/** Optional native WebGL displacement of the SAME art. Dust/grade remain if WebGL is unavailable. */
export function HeatShimmer({centerPanel}: {centerPanel: BoardRect}) {
  const ref=useRef<HTMLCanvasElement>(null);
  const {manager,policy}=useEnvironment();
  useEffect(() => {
    const canvas=ref.current;if (!canvas) return;
    const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,preserveDrawingBuffer:false});
    if (!gl) {canvas.dataset.status='fallback';return;}
    let disposed=false,ready=false,unsubscribe=()=>{};
    const shaders: WebGLShader[]=[];
    const compile=(type:number,source:string) => {
      const shader=gl.createShader(type);if (!shader) return null;
      shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
      return gl.getShaderParameter(shader,gl.COMPILE_STATUS)?shader:null;
    };
    const vertex=compile(gl.VERTEX_SHADER,VERTEX),fragment=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();
    if (!vertex || !fragment || !program) {if (program) gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));canvas.dataset.status='fallback';return;}
    gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));canvas.dataset.status='fallback';return;}
    gl.useProgram(program);
    const buffer=gl.createBuffer(),texture=gl.createTexture();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const time=gl.getUniformLocation(program,'time'),resolution=gl.getUniformLocation(program,'resolution');
    gl.uniform4f(gl.getUniformLocation(program,'panel'),centerPanel.left/100,centerPanel.top/100,centerPanel.width/100,centerPanel.height/100);
    const resize=() => {
      const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,policy.dpr);
      canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(resolution,Math.max(1,r.width),Math.max(1,r.height));manager.invalidate();
    };
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    const source=new Image();
    source.onload=() => {
      if (disposed) return;
      const scaled=document.createElement('canvas');scaled.width=policy.mobile?1024:2048;scaled.height=Math.round(scaled.width*source.height/source.width);
      const ctx=scaled.getContext('2d');if (!ctx) return;
      ctx.drawImage(source,0,0,scaled.width,scaled.height);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,scaled);
      scaled.width=scaled.height=1;ready=true;canvas.dataset.status='ready';
      unsubscribe=manager.register(seconds => {if (ready&&!disposed) {gl.uniform1f(time,seconds);gl.drawArrays(gl.TRIANGLES,0,6);}});
    };
    source.onerror=() => {canvas.dataset.status='fallback';};source.src=gameBoard;
    // Context loss degrades to dust/grade; a fresh mount can allocate a new context later.
    const lost=() => {ready=false;unsubscribe();canvas.dataset.status='fallback';};canvas.addEventListener('webglcontextlost',lost);
    return () => {disposed=true;unsubscribe();observer.disconnect();source.onload=source.onerror=null;canvas.removeEventListener('webglcontextlost',lost);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));};
  },[manager,policy.mobile,policy.dpr,centerPanel]);
  return <canvas className="heat-shimmer" ref={ref} aria-hidden="true" data-status="loading" />;
}
