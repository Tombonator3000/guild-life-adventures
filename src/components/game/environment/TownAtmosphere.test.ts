import { describe,expect,it,vi } from 'vitest';
import { TownAtmosphere, birdFlight, completedForgeShifts, townWind } from './TownAtmosphere';
import { SNOW_ROOFS } from './snowRoofs';
import { createBirdGeometry } from './birdGeometry';
import type { Player } from '@/types/game.types';

function advance(town:TownAtmosphere,start:number,seconds:number,weather:'snowstorm'|'clear'|'drought') {
  for(let i=0;i<=Math.ceil(seconds*20);i++) town.update(start+i/20,weather,true);
}

describe('living town atmosphere',()=>{
  it('shares deterministic wind without consuming gameplay randomness',()=>{
    const random=vi.spyOn(Math,'random');
    const town=new TownAtmosphere();town.update(0,'clear',true);town.update(.05,'clear',true);
    expect(town.wind).toEqual(townWind(.05,'clear'));
    expect(town.drift.x).toBeCloseTo(town.wind.x*.05);
    const drift=town.drift.x;town.update(.05,'clear',true);
    expect(town.drift.x).toBe(drift); // Second render surface cannot advance it twice.
    expect(townWind(5,'thunderstorm').x).toBeGreaterThan(townWind(5,'clear').x);
    expect(random).not.toHaveBeenCalled();random.mockRestore();
  });
  it('accumulates snow gradually, keeps it across weather changes, then melts it',()=>{
    const town=new TownAtmosphere();advance(town,0,21,'snowstorm');expect(town.snow).toBeCloseTo(.5);
    advance(town,21,21,'snowstorm');expect(town.snow).toBeCloseTo(1);
    town.update(42,'clear',true);expect(town.snow).toBeCloseTo(1);
    advance(town,42,27.5,'clear');expect(town.snow).toBeCloseTo(.5);
    advance(town,69.5,10,'drought');expect(town.snow).toBe(0);
  });
  it('does not advance paused/reduced motion or jump on long gaps',()=>{
    const town=new TownAtmosphere();advance(town,0,5,'snowstorm');const cover=town.snow,drift=town.drift.x;
    town.update(500,'snowstorm',false);expect(town.snow).toBe(cover);expect(town.drift.x).toBe(drift);
    town.update(5000,'snowstorm',true);expect(town.snow-cover).toBeLessThan(.003);
  });
  it('caps overlapping bursts and expires them without timers or state writes',()=>{
    const town=new TownAtmosphere();for(let i=0;i<10;i++)town.forgeBurst(0);
    expect(town.bursts).toHaveLength(3);expect(town.burstSequence).toBe(10);
    town.update(3,'clear',true);expect(town.bursts).toHaveLength(0);
  });
  it('only reacts to a confirmed same-location, same-job work shift',()=>{
    const before={id:'smith',currentJob:'forge-laborer',currentLocation:'forge',totalShiftsWorked:2,timeRemaining:60} as Player;
    const after={...before,totalShiftsWorked:3,timeRemaining:54};
    expect(completedForgeShifts([before],[after])).toBe(1);
    expect(completedForgeShifts([before],[before])).toBe(0);
    expect(completedForgeShifts([after],[after])).toBe(0);
    expect(completedForgeShifts([before],[{...after,currentLocation:'bank'}])).toBe(0);
    expect(completedForgeShifts([before],[{...after,timeRemaining:60}])).toBe(0);
    expect(completedForgeShifts([before],[{...after,totalShiftsWorked:8}])).toBe(0);
  });
  it('spaces flocks apart and keeps them out of severe weather',()=>{
    expect(birdFlight(0).visible).toBe(false);expect(birdFlight(9).visible).toBe(true);
    expect(birdFlight(23).visible).toBe(false);expect(birdFlight(63).direction).toBe(-1);
    expect(birdFlight(9,'thunderstorm').visible).toBe(false);expect(birdFlight(9,'snowstorm').visible).toBe(false);
  });
  it('uses bounded roof masks and a real articulated mesh, not a bird billboard',()=>{
    expect(SNOW_ROOFS.length).toBeGreaterThanOrEqual(12);
    for(const roof of SNOW_ROOFS) for(const point of roof.points) expect(point.every(n=>n>=0&&n<=1)).toBe(true);
    const bird=createBirdGeometry(),p=bird.getAttribute('position'),wing=bird.getAttribute('wing');
    expect(p.count).toBeGreaterThan(100);expect(p.count).toBeLessThan(1000);
    expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
    expect(new Set(Array.from({length:p.count},(_,i)=>p.getZ(i))).size).toBeGreaterThan(5);
    expect(new Set(Array.from(wing.array))).toEqual(new Set([-1,1,0]));bird.dispose();
  });
});
