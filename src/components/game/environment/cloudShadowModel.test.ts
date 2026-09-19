import { describe, expect, it } from 'vitest';
import {
  CLOUD_INTENSITY_DEFAULT, CLOUD_INTENSITY_MAX, CLOUD_INTENSITY_MIN, CLOUD_MAX_STRENGTH,
  CLOUD_MIN_MULTIPLIER, cloudBufferSize, cloudCoverage, cloudMultiplier,
  clampCloudIntensity, cloudStrength, createCloudNoise,
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
    const sampleGrid=(seconds:number)=>Array.from({length:49},(_,index)=>
      cloudCoverage((index%7)/6,Math.floor(index/7)/6,1.49,seconds));
    const at0=sampleGrid(0), at30=sampleGrid(30), at180=sampleGrid(180);
    expect(at30).not.toEqual(at0);
    expect(at180).not.toEqual(at0);
    expect(at30).not.toEqual(at180);
  });

  it('advects in the same direction and speed as the shared wind drift', () => {
    const aspect=1.49, u=.43, v=.57;
    const drift={x:120,y:-35};
    const shifted=cloudCoverage(u,v,aspect,0,drift);
    expect(shifted).toBeCloseTo(cloudCoverage(u-drift.x/1000/aspect,v-drift.y/1000,aspect,0),10);
  });

  it('caps the low-resolution backing buffer independently of DPR', () => {
    expect(cloudBufferSize(1920,1080,false)).toEqual({width:640,height:360});
    expect(cloudBufferSize(1180,820,true)).toEqual({width:480,height:334});
  });

  it('keeps the user shadow intensity inside the safe range', () => {
    expect(clampCloudIntensity(undefined)).toBe(CLOUD_INTENSITY_DEFAULT);
    expect(clampCloudIntensity(Number.NaN)).toBe(CLOUD_INTENSITY_DEFAULT);
    expect(clampCloudIntensity(-5)).toBe(CLOUD_INTENSITY_MIN);
    expect(clampCloudIntensity(99)).toBe(CLOUD_INTENSITY_MAX);
    expect(cloudStrength('thunderstorm',99)).toBeLessThanOrEqual(CLOUD_MAX_STRENGTH);
    expect(cloudStrength(undefined,0)).toBe(0);
    expect(cloudStrength(undefined,1.3)).toBeGreaterThan(cloudStrength(undefined,1));
    for(const intensity of [0,0.5,1,1.3,50]) {
      const multiplier=cloudMultiplier(1,'thunderstorm',intensity);
      expect(Math.min(multiplier.r,multiplier.g,multiplier.b)).toBeGreaterThanOrEqual(CLOUD_MIN_MULTIPLIER);
      expect(Math.max(multiplier.r,multiplier.g,multiplier.b)).toBeLessThanOrEqual(1);
    }
  });
});