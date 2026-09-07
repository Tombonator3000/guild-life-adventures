import { afterEach, describe, expect, it, vi } from 'vitest';
import { initDungeonRun, resolveEncounter } from '@/data/combatResolver';
import { DUNGEON_FLOORS, calculateEducationBonuses } from '@/data/dungeon';

afterEach(() => vi.restoreAllMocks());
describe('Blood Moon encounter promises', () => {
  it('never draws a spring during Blood Moon across every floor', () => {
    // Modifier gate then index 2 of 7 modifiers; remaining draws span the pool.
    for (const floor of DUNGEON_FLOORS) {
      for (const draw of [0,.2,.4,.6,.8,.99]) {
        vi.spyOn(Math,'random').mockReturnValue(draw).mockReturnValueOnce(.5).mockReturnValueOnce(.3);
        const run=initDungeonRun(floor,80,true,[],100);
        expect(run.modifier?.id).toBe('blood-moon');
        expect(run.encounters).toHaveLength(4);
        expect(run.encounters.some(e=>e.type==='healing')).toBe(false);
        expect(run.encounters.at(-1)?.type).toBe('boss');
        vi.restoreAllMocks();
      }
    }
  });
  it('still rejects healing in a pre-existing Blood Moon session', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99).mockReturnValueOnce(.5).mockReturnValueOnce(.3);
    const run=initDungeonRun(DUNGEON_FLOORS[0],80,true,[],100);
    const spring=DUNGEON_FLOORS[0].encounters.find(e=>e.type==='healing')!;
    const result=resolveEncounter(spring,{attack:0,defense:0,blockChance:0},calculateEducationBonuses([]),80,run.modifier);
    expect(result.healed).toBe(0);
  });
});
