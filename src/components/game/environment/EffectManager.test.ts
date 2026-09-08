import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EffectManager } from './EffectManager';
import { effectPolicy, precipitationBudget, sample } from './effectPolicy';

let callbacks: Map<number, FrameRequestCallback>;
let nextId: number;
beforeEach(() => {
  callbacks = new Map(); nextId=0;
  vi.stubGlobal('requestAnimationFrame',vi.fn((callback: FrameRequestCallback) => { callbacks.set(++nextId,callback); return nextId; }));
  vi.stubGlobal('cancelAnimationFrame',vi.fn((id: number) => callbacks.delete(id)));
});
afterEach(() => vi.unstubAllGlobals());
function frame(now: number) { const pending=[...callbacks.values()];callbacks.clear();pending.forEach(fn => fn(now)); }

describe('shared environment clock', () => {
  it('runs all surfaces on one RAF and freezes elapsed time across a hidden tab', () => {
    const manager=new EffectManager(),world=vi.fn(),screen=vi.fn(),shader=vi.fn();
    manager.register(world); manager.register(screen); manager.register(shader); manager.setRunning(true);
    expect(callbacks.size).toBe(1);frame(100);frame(116);
    expect(world).toHaveBeenLastCalledWith(.016);expect(screen).toHaveBeenLastCalledWith(.016);expect(shader).toHaveBeenLastCalledWith(.016);
    manager.setRunning(false);expect(callbacks.size).toBe(0);
    manager.setRunning(true);frame(15000);expect(world).toHaveBeenLastCalledWith(.016);
    frame(15016);expect(world).toHaveBeenLastCalledWith(.032);
    manager.dispose();expect(callbacks.size).toBe(0);
  });
  it('paints static scenes on demand without starting a clock and releases the last surface', () => {
    const manager=new EffectManager(),draw=vi.fn();const remove=manager.register(draw);
    manager.invalidate();expect(draw).toHaveBeenCalledTimes(2);expect(callbacks.size).toBe(0);
    manager.setRunning(true);remove();expect(callbacks.size).toBe(0);
  });
  it('caps long foreground frames rather than making particles jump', () => {
    const manager=new EffectManager(),draw=vi.fn();manager.register(draw);manager.setRunning(true);frame(0);frame(500);
    expect(draw).toHaveBeenLastCalledWith(.05);manager.dispose();
  });
});
describe('visual policy', () => {
  it('keeps Off off and caps Full to static Calm for reduced motion', () => {
    expect(effectPolicy('off',true,true,false)).toMatchObject({enabled:false,running:false});
    expect(effectPolicy('full',true,true,false)).toMatchObject({quality:'reduced',animated:false,running:false});
    expect(effectPolicy('full',false,false,false)).toMatchObject({animated:true,running:false});
    expect(effectPolicy('reduced',false,true,false).running).toBe(false);
  });
  it('shares a bounded mobile budget and uses private deterministic randomness', () => {
    expect(precipitationBudget('thunderstorm',true)).toBe(120);
    expect(effectPolicy('full',false,true,true).budget).toBe(180);
    const random=vi.spyOn(Math,'random');const samples=Array.from({length:480},(_,i)=>sample(i));
    expect(random).not.toHaveBeenCalled();random.mockRestore();
    expect(samples.every(value=>value>=0&&value<1)).toBe(true);expect(sample(13)).toBe(samples[13]);
  });
});
