import { describe, it, expect } from 'vitest';
import {
  QUESTS,
  QUEST_CHAINS,
  getQuestLocationObjectives,
  allLocationObjectivesDone,
  getWeeklyBounties,
} from '@/data/quests';
import { NON_LINEAR_QUEST_CHAINS } from '@/data/questChains';
import { BOARD_PATH } from '@/data/locations';

const HOME_LOCATIONS = ['noble-heights', 'slums'];

// Collect ALL objectives across regular quests, chain steps, bounties, and NL chains
function getAllObjectives() {
  const results: { source: string; obj: { id: string; locationId: string } }[] = [];

  for (const q of QUESTS) {
    for (const o of q.locationObjectives ?? []) {
      results.push({ source: `quest:${q.id}`, obj: o });
    }
  }
  for (const chain of QUEST_CHAINS) {
    for (const step of chain.steps) {
      for (const o of step.locationObjectives ?? []) {
        results.push({ source: `chain:${chain.id}/step:${step.id}`, obj: o });
      }
    }
  }
  // Check bounties from weeks 1-20 to cover all rotating bounties
  const seenBountyIds = new Set<string>();
  for (let w = 1; w <= 20; w++) {
    for (const b of getWeeklyBounties(w)) {
      if (seenBountyIds.has(b.id)) continue;
      seenBountyIds.add(b.id);
      for (const o of b.locationObjectives ?? []) {
        results.push({ source: `bounty:${b.id}`, obj: o });
      }
    }
  }
  // NL chains
  for (const chain of NON_LINEAR_QUEST_CHAINS) {
    for (const step of chain.steps) {
      for (const o of step.locationObjectives ?? []) {
        results.push({ source: `nlchain:${chain.id}/step:${step.id}`, obj: o });
      }
    }
  }
  return results;
}

describe('Quest LOQ Integrity', () => {
  const allObjs = getAllObjectives();

  it('all quest LOQ locationIds are valid board locations', () => {
    const invalid = allObjs.filter(({ obj }) => !BOARD_PATH.includes(obj.locationId as any));
    expect(invalid, `Invalid locationIds: ${JSON.stringify(invalid)}`).toHaveLength(0);
  });

  it('no objectives at home locations (HomePanel dead-end risk)', () => {
    const homeObjs = allObjs.filter(({ obj }) => HOME_LOCATIONS.includes(obj.locationId));
    expect(homeObjs, `Objectives at home locations: ${JSON.stringify(homeObjs)}`).toHaveLength(0);
  });

  it('no duplicate objective IDs across all quests', () => {
    const ids = allObjs.map(({ obj }) => obj.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, `Duplicate IDs: ${dupes.join(', ')}`).toHaveLength(0);
  });

  it('chain quest steps have valid LOQ locationIds', () => {
    const chainObjs = allObjs.filter(({ source }) => source.startsWith('chain:'));
    const invalid = chainObjs.filter(({ obj }) => !BOARD_PATH.includes(obj.locationId as any));
    expect(invalid).toHaveLength(0);
  });

  it('every regular quest has at least one LOQ', () => {
    const missing = QUESTS.filter(q => !q.locationObjectives || q.locationObjectives.length === 0);
    expect(missing.map(q => q.id), 'Quests without LOQ').toHaveLength(0);
  });

  it('every chain quest step has at least one LOQ', () => {
    const missing: string[] = [];
    for (const chain of QUEST_CHAINS) {
      for (const step of chain.steps) {
        if (!step.locationObjectives || step.locationObjectives.length === 0) {
          missing.push(`${chain.id}/${step.id}`);
        }
      }
    }
    expect(missing, 'Chain steps without LOQ').toHaveLength(0);
  });

  it('every NL chain step has at least one LOQ', () => {
    const missing: string[] = [];
    for (const chain of NON_LINEAR_QUEST_CHAINS) {
      for (const step of chain.steps) {
        if (!step.locationObjectives || step.locationObjectives.length === 0) {
          missing.push(`${chain.id}/${step.id}`);
        }
      }
    }
    expect(missing, 'NL chain steps without LOQ').toHaveLength(0);
  });

  it('objective IDs match their parent quest/chain prefix', () => {
    const mismatched: string[] = [];
    for (const q of QUESTS) {
      for (const o of q.locationObjectives ?? []) {
        const questWords = q.id.split('-');
        if (!o.id.startsWith(questWords[0])) {
          mismatched.push(`${q.id} -> ${o.id}`);
        }
      }
    }
    expect(mismatched, 'Mismatched objective prefixes').toHaveLength(0);
  });
});

describe('getQuestLocationObjectives', () => {
  it('returns objectives for a regular quest', () => {
    const objs = getQuestLocationObjectives('rat-extermination');
    expect(objs.length).toBeGreaterThan(0);
    expect(objs[0].id).toBe('rat-ext-tavern');
  });

  it('returns [] for null quest', () => {
    expect(getQuestLocationObjectives(null)).toEqual([]);
  });

  it('returns objectives for a bounty quest', () => {
    const objs = getQuestLocationObjectives('bounty:bounty-rats');
    expect(objs.length).toBeGreaterThan(0);
    expect(objs[0].id).toBe('br-tavern');
  });

  it('returns objectives for nlchain quest', () => {
    const objs = getQuestLocationObjectives('nlchain:thieves-guild', { 'thieves-guild': 0 });
    expect(objs.length).toBeGreaterThan(0);
    expect(objs[0].id).toBe('tg1-shadow');
  });

  it('returns correct nlchain objectives for different step indices', () => {
    const objs1 = getQuestLocationObjectives('nlchain:thieves-guild', { 'thieves-guild': 1 });
    expect(objs1[0].id).toBe('tg2-armory');

    const objs4 = getQuestLocationObjectives('nlchain:cursed-artifact', { 'cursed-artifact': 0 });
    expect(objs4[0].id).toBe('ca1-shadow');
  });

  it('returns [] for unknown nlchain', () => {
    expect(getQuestLocationObjectives('nlchain:nonexistent', {})).toEqual([]);
  });

  it('returns correct objectives for chain quest step 0', () => {
    const objs = getQuestLocationObjectives('chain:dragon-conspiracy', { 'dragon-conspiracy': 0 });
    expect(objs.length).toBeGreaterThan(0);
    expect(objs[0].id).toBe('dc1-tavern');
  });

  it('returns correct objectives for chain quest step 1', () => {
    const objs = getQuestLocationObjectives('chain:dragon-conspiracy', { 'dragon-conspiracy': 1 });
    expect(objs.length).toBeGreaterThan(0);
    expect(objs[0].id).toBe('dc2-shadow');
  });

  it('returns [] for chain quest with no progress record (defaults to step 0)', () => {
    const objs = getQuestLocationObjectives('chain:dragon-conspiracy', {});
    expect(objs.length).toBeGreaterThan(0);
    expect(objs[0].id).toBe('dc1-tavern');
  });
});

describe('allLocationObjectivesDone', () => {
  it('returns false for bounty with LOQ and no progress', () => {
    expect(allLocationObjectivesDone('bounty:bounty-rats', [])).toBe(false);
  });

  it('returns true for bounty with LOQ when objective completed', () => {
    expect(allLocationObjectivesDone('bounty:bounty-rats', ['br-tavern'])).toBe(true);
  });

  it('returns false for nlchain with LOQ and no progress', () => {
    expect(allLocationObjectivesDone('nlchain:thieves-guild', [], { 'thieves-guild': 0 })).toBe(false);
  });

  it('returns true for nlchain with LOQ when all objectives completed', () => {
    expect(allLocationObjectivesDone('nlchain:thieves-guild', ['tg1-shadow', 'tg1-tavern'], { 'thieves-guild': 0 })).toBe(true);
  });

  it('returns false for nlchain with partial LOQ progress', () => {
    expect(allLocationObjectivesDone('nlchain:thieves-guild', ['tg1-shadow'], { 'thieves-guild': 0 })).toBe(false);
  });

  it('returns false when no progress on a quest with objectives', () => {
    expect(allLocationObjectivesDone('rat-extermination', [])).toBe(false);
  });

  it('returns false when partial progress', () => {
    expect(allLocationObjectivesDone('rat-extermination', ['rat-ext-tavern'])).toBe(false);
  });

  it('returns true when all objectives completed', () => {
    expect(allLocationObjectivesDone('rat-extermination', ['rat-ext-tavern', 'rat-ext-store'])).toBe(true);
  });

  it('works for chain quests with chainProgress', () => {
    const progress = { 'dragon-conspiracy': 0 };
    expect(allLocationObjectivesDone('chain:dragon-conspiracy', ['dc1-tavern', 'dc1-forge'], progress)).toBe(true);
    expect(allLocationObjectivesDone('chain:dragon-conspiracy', ['dc1-tavern'], progress)).toBe(false);
  });
});
