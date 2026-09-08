import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const audio = vi.hoisted(()=>({gains:[] as Array<{gain:{value:number}}>,decks:[] as Array<{paused:boolean,src:string,volume:number}>}));
vi.mock('./webAudioBridge',()=>({connectElement:()=>{const gain={gain:{value:1}};audio.gains.push(gain);return gain;},resumeAudioContext:vi.fn()}));
beforeEach(()=>{
  vi.useFakeTimers();vi.resetModules();localStorage.clear();audio.gains=[];audio.decks=[];
  vi.stubGlobal('Audio',class {src='';volume=1;paused=true;loop=false;preload='';currentTime=0;constructor(){audio.decks.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){this.src='';}addEventListener(){}removeEventListener(){}});
});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});
describe('music volume and interrupted transitions',()=>{
  it('uses a quiet perceptual curve at 9% and starts the inactive deck silent',async()=>{
    const {audioManager,musicVolumeToGain}=await import('./audioManager');
    expect(musicVolumeToGain(.09)).toBeCloseTo(.0081);
    expect(audio.gains[1].gain.value).toBe(0);
    audioManager.setVolume(.09);audioManager.play('bank');vi.advanceTimersByTime(1600);
    expect(audio.gains[1].gain.value).toBeCloseTo(.0081);
  });
  it('applies mute and slider changes to BOTH decks during a crossfade',async()=>{
    const {audioManager}=await import('./audioManager');
    audioManager.setVolume(.8);audioManager.play('bank');vi.advanceTimersByTime(1600);
    audioManager.play('guild-hall');vi.advanceTimersByTime(400);
    audioManager.setMuted(true);
    expect(audio.gains.every(g=>g.gain.value===0)).toBe(true);
    vi.advanceTimersByTime(400);expect(audio.gains.every(g=>g.gain.value===0)).toBe(true);
    audioManager.setVolume(.09);audioManager.setMuted(false);vi.advanceTimersByTime(1800);
    expect(audio.gains.reduce((sum,g)=>sum+g.gain.value,0)).toBeCloseTo(.0081);
  });
  it('cancels a stop fade before starting another track',async()=>{
    const {audioManager}=await import('./audioManager');
    audioManager.play('bank');vi.advanceTimersByTime(1600);audioManager.stop();vi.advanceTimersByTime(100);
    audioManager.play('guild-hall');vi.advanceTimersByTime(1800);
    expect(audioManager.getCurrentTrack()).toBe('guild-hall');
    expect(audio.decks.some(d=>!d.paused&&d.src.includes('03guildhall'))).toBe(true);
  });
});
