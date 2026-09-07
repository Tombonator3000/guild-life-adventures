import { afterEach, expect, it, vi } from 'vitest';
import { SYNTH_SOUNDS } from './synthSFX';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
it('synthesizes varied thunder without consuming gameplay randomness', () => {
  vi.useFakeTimers();
  const samples:Float32Array[]=[];
  const param=()=>({value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()});
  const node=()=>({connect:vi.fn(),start:vi.fn(),stop:vi.fn(),gain:param(),frequency:param(),detune:param()});
  vi.stubGlobal('AudioContext', class {
    state='running'; sampleRate=1000;currentTime=0;destination={};
    createBuffer(_channels:number,length:number) {const data=new Float32Array(length);samples.push(data);return {getChannelData:()=>data};}
    createGain=node;createOscillator=node;createBufferSource=node;createBiquadFilter=node;
  });
  const random=vi.spyOn(Math,'random');
  SYNTH_SOUNDS['weather-thunder'](.5);
  vi.runAllTimers();
  expect(random).not.toHaveBeenCalled();
  expect(samples).toHaveLength(2);
  expect(samples[0].some(n=>n>.1)).toBe(true);
  expect(samples[0].some(n=>n<-.1)).toBe(true);
});
