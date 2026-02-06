import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { canEnrollIn, getAvailableDegrees, DEGREES, GRADUATION_BONUSES } from '@/data/education';

let playerId: string;

function resetAndStart() {
  const store = useGameStore.getState();
  store.startNewGame(['TestPlayer'], false, { wealth: 5000, happiness: 75, education: 45, career: 4 });
  playerId = useGameStore.getState().players[0].id;
}

describe('Education - canEnrollIn', () => {
  it('allows enrollment in degrees with no prerequisites', () => {
    expect(canEnrollIn('trade-guild', [])).toBe(true);
    expect(canEnrollIn('junior-academy', [])).toBe(true);
  });

  it('rejects enrollment when prerequisites are missing', () => {
    expect(canEnrollIn('combat-training', [])).toBe(false);
    expect(canEnrollIn('arcane-studies', [])).toBe(false);
  });

  it('allows enrollment when prerequisites are met', () => {
    expect(canEnrollIn('combat-training', ['trade-guild'])).toBe(true);
    expect(canEnrollIn('arcane-studies', ['trade-guild'])).toBe(true);
  });

  it('rejects re-enrollment in completed degree', () => {
    expect(canEnrollIn('trade-guild', ['trade-guild'])).toBe(false);
  });

  it('handles multi-prerequisite degrees (alchemy)', () => {
    expect(canEnrollIn('alchemy', ['arcane-studies'])).toBe(false);
    expect(canEnrollIn('alchemy', ['junior-academy'])).toBe(false);
    expect(canEnrollIn('alchemy', ['arcane-studies', 'junior-academy'])).toBe(true);
  });
});

describe('Education - getAvailableDegrees', () => {
  it('returns starting degrees for fresh player', () => {
    const available = getAvailableDegrees([]);
    const ids = available.map(d => d.id);
    expect(ids).toContain('trade-guild');
    expect(ids).toContain('junior-academy');
    expect(ids).not.toContain('combat-training');
  });

  it('returns next-tier degrees after completing prerequisites', () => {
    const available = getAvailableDegrees(['trade-guild']);
    const ids = available.map(d => d.id);
    expect(ids).toContain('arcane-studies');
    expect(ids).toContain('combat-training');
    expect(ids).toContain('junior-academy'); // Still available
    expect(ids).not.toContain('trade-guild'); // Already done
  });
});

describe('Education - studyDegree', () => {
  beforeEach(resetAndStart);

  it('increments degree progress and deducts gold/time', () => {
    const goldBefore = useGameStore.getState().players[0].gold;
    const timeBefore = useGameStore.getState().players[0].timeRemaining;

    useGameStore.getState().studyDegree(playerId, 'trade-guild', 5, 6);
    const p = useGameStore.getState().players[0];
    expect(p.degreeProgress['trade-guild']).toBe(1);
    expect(p.gold).toBe(goldBefore - 5);
    expect(p.timeRemaining).toBe(timeBefore - 6);
  });

  it('accumulates progress across multiple sessions', () => {
    for (let i = 0; i < 5; i++) {
      useGameStore.getState().studyDegree(playerId, 'trade-guild', 5, 6);
    }
    expect(useGameStore.getState().players[0].degreeProgress['trade-guild']).toBe(5);
  });
});

describe('Education - completeDegree', () => {
  beforeEach(resetAndStart);

  it('adds degree to completedDegrees', () => {
    useGameStore.getState().completeDegree(playerId, 'trade-guild');
    const p = useGameStore.getState().players[0];
    expect(p.completedDegrees).toContain('trade-guild');
  });

  it('clears degree progress', () => {
    useGameStore.getState().studyDegree(playerId, 'trade-guild', 5, 6);
    expect(useGameStore.getState().players[0].degreeProgress['trade-guild']).toBe(1);

    useGameStore.getState().completeDegree(playerId, 'trade-guild');
    expect(useGameStore.getState().players[0].degreeProgress['trade-guild']).toBeUndefined();
  });

  it('applies graduation bonuses', () => {
    const before = useGameStore.getState().players[0];
    useGameStore.getState().completeDegree(playerId, 'trade-guild');
    const after = useGameStore.getState().players[0];

    expect(after.happiness).toBe(Math.min(100, before.happiness + GRADUATION_BONUSES.happiness));
    expect(after.dependability).toBe(
      Math.min(before.maxDependability + GRADUATION_BONUSES.maxDependability, before.dependability + GRADUATION_BONUSES.dependability)
    );
    expect(after.maxDependability).toBe(before.maxDependability + GRADUATION_BONUSES.maxDependability);
    expect(after.maxExperience).toBe(before.maxExperience + GRADUATION_BONUSES.maxExperience);
  });

  it('multiple degrees accumulate in completedDegrees', () => {
    useGameStore.getState().completeDegree(playerId, 'trade-guild');
    useGameStore.getState().completeDegree(playerId, 'junior-academy');
    const p = useGameStore.getState().players[0];
    expect(p.completedDegrees).toHaveLength(2);
    expect(p.completedDegrees).toContain('trade-guild');
    expect(p.completedDegrees).toContain('junior-academy');
  });
});

describe('Education - degree prerequisites integration', () => {
  it('DEGREES data has correct prerequisite chains', () => {
    // Starting degrees have no prerequisites
    expect(DEGREES['trade-guild'].prerequisites).toEqual([]);
    expect(DEGREES['junior-academy'].prerequisites).toEqual([]);

    // Combat path
    expect(DEGREES['combat-training'].prerequisites).toEqual(['trade-guild']);
    expect(DEGREES['master-combat'].prerequisites).toEqual(['combat-training']);

    // Scholar path
    expect(DEGREES['scholar'].prerequisites).toEqual(['junior-academy']);
    expect(DEGREES['advanced-scholar'].prerequisites).toEqual(['scholar']);

    // Alchemy requires both paths
    expect(DEGREES['alchemy'].prerequisites).toEqual(['arcane-studies', 'junior-academy']);
  });

  it('all degrees have 10 sessions required', () => {
    for (const degree of Object.values(DEGREES)) {
      expect(degree.sessionsRequired).toBe(10);
    }
  });

  it('all degrees are worth 9 education points', () => {
    for (const degree of Object.values(DEGREES)) {
      expect(degree.educationPoints).toBe(9);
    }
  });
});
