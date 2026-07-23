import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import type { AIAction } from './types';
import { getAIFailedActionKey, getAIActionIdentity } from './failedActionCache';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'ai-1',
    currentLocation: 'academy',
    gold: 25,
    timeRemaining: 20,
    health: 100,
    foodLevel: 50,
    happiness: 50,
    clothingCondition: 35,
    relaxation: 30,
    currentJob: null,
    currentWage: 0,
    housing: 'slums',
    guildRank: 'novice',
    dependability: 50,
    experience: 0,
    savings: 0,
    investments: 0,
    freshFood: 0,
    isSick: false,
    hasGuildPass: false,
    rentDebt: 0,
    completedDegrees: [],
    degreeProgress: {},
    prepaidDegrees: {},
    inventory: [],
    ...overrides,
  } as Player;
}

const studyAction = {
  type: 'study-degree',
  location: 'academy',
  description: 'Study at the academy',
  priority: 50,
  details: { degreeId: 'trade-guild' },
} as AIAction;

describe('AI failed action cache', () => {
  it('uses stable action identity for the same target', () => {
    expect(getAIActionIdentity(studyAction)).toBe('study-degree:academy:trade-guild');
  });

  it('blocks the exact same action while prerequisites are unchanged', () => {
    const player = makePlayer();
    expect(getAIFailedActionKey(studyAction, player))
      .toBe(getAIFailedActionKey(studyAction, { ...player }));
  });

  it('allows a retry after gold changes', () => {
    const before = makePlayer({ gold: 25 });
    const after = makePlayer({ gold: 100 });
    expect(getAIFailedActionKey(studyAction, before))
      .not.toBe(getAIFailedActionKey(studyAction, after));
  });

  it('allows a retry after moving or progressing the degree', () => {
    const before = makePlayer();
    const moved = makePlayer({ currentLocation: 'bank' });
    const progressed = makePlayer({ degreeProgress: { 'trade-guild': 1 } });

    expect(getAIFailedActionKey(studyAction, before))
      .not.toBe(getAIFailedActionKey(studyAction, moved));
    expect(getAIFailedActionKey(studyAction, before))
      .not.toBe(getAIFailedActionKey(studyAction, progressed));
  });
});
