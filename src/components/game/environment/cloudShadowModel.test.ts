import { describe, expect, it } from 'vitest';
import {
  CLOUD_MIN_MULTIPLIER, cloudBufferSize, cloudCoverage, cloudMultiplier,
  cloudStrength, createCloudNoise,
} from './cloudShadowModel';

describe('cloud shadow model', () => {
  it('creates private deterministic two-channel noise without gameplay randomness', () => {
    const first=createCloudNoise(), second=createCloudNoise();
    expect(first).toEqual(second);
    expect(first.length).toBe(64*64*4);
    expect(first.some((value,index)=>index%4===0&&value!==first[index+1])).toBe(true);
    expect(Array.from(first.filter((_,index)=>index%4===3)).every(value=>value===255)).toBe(true);
  });

  it('stays bounded and has broad sunlit gaps', () => {
    const samples=Array.from({length:121},(_,index)=>cloudCoverage((index%11)/10,Math.floor(index/11)/10,1.49,0));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(samples.some(value=>value<0.08)).toBe(true);
    for(const weather of [undefined,'clear','drought','thunderstorm','harvest-rain','snowstorm','enchanted-fog'] as const) {
      const multiplier=cloudMultiplier(1,weather);
      expect(Math.min(multiplier.r,multiplier.g,multiplier.b)).toBeGreaterThanOrEqual(CLOUD_MIN_MULTIPLIER);
      expect(Math.max(multiplier.r,multiplier.g,multiplier.b)).toBeLessThanOrEqual(1);
    }
    expect(cloudStrength('thunderstorm')).toBe(.33);
  });

  it('changes over minutes without resetting at thirty seconds', () => {
    const at0=cloudCoverage(.27,.64,1.49,0);
    const at30=cloudCoverage(.27,.64,1.49,30);
    const at180=cloudCoverage(.27,.64,1.49,180);
    expect(at30).not.toBeCloseTo(at0,8);
    expect(at180).not.toBeCloseTo(at0,8);
    expect(at30).not.toBeCloseTo(at180,8);
  });

  it('caps the low-resolution backing buffer independently of DPR', () => {
    expect(cloudBufferSize(1920,1080,false)).toEqual({width:640,height:360});
    expect(cloudBufferSize(1180,820,true)).toEqual({width:480,height:334});
  });
});