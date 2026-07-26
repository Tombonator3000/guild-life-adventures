import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import type { AIAction } from './types';
import {
  createAIFailedActionCache,
  getAIActionIdentity,
  getViableAIActions,
  isFailedAIActionBlocked,
  recordFailedAIAction,
} from './failedActionCache';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'ai-1',
    name: 'Test AI',
    color: '#000000',
    portraitId: null,
    age: 18,
    currentLocation: 'academy',
    previousLocation: 'slums',
    gold: 25,
    savings: 0,
    investments: 0,
    stocks: {},
    loanAmount: 0,
    loanWeeksRemaining: 0,
    timeRemaining: 20,
    health: 100,
    maxHealth: 100,
    foodLevel: 50,
    freshFood: 0,
    happiness: 50,
    relaxation: 30,
    clothingCondition: 35,
    backupOutfit: null,
    currentJob: null,
    currentWage: 0,
    shiftsWorkedSinceHire: 0,
    totalShiftsWorked: 0,
    dependability: 50,
    maxDependability: 100,
    experience: 0,
    maxExperience: 100,
    housing: 'slums',
    weeksSinceRent: 0,
    rentDebt: 0,
    rentPrepaidWeeks: 0,
    lockedRent: 75,
    guildRank: 'novice',
    hasGuildPass: false,
    guildReputation: 0,
    education: { fighter: 0, mage: 0, priest: 0, business: 0 },
    educationProgress: { fighter: 0, mage: 0, priest: 0, business: 0 },
    completedDegrees: [],
    degreeProgress: {},
    prepaidDegrees: {},
    inventory: [],
    durables: {},
    appliances: {},
    applianceHistory: [],
    pawnedAppliances: [],
    equippedWeapon: null,
    equippedArmor: null,
    equippedShield: null,
    temperedItems: [],
    equipmentDurability: {},
    activeQuest: null,
    questLocationProgress: [],
    questChainProgress: {},
    nlChainProgress: {},
    nlChainCompleted: [],
    pendingNLChainChoice: null,
    completedQuests: 0,
    completedBountiesThisWeek: [],
    questCooldownWeeksLeft: 0,
    dungeonFloorsCleared: [],
    dungeonAttemptsThisTurn: 0,
    dungeonRecords: {},
    tickets: [],
    lotteryTickets: 0,
    isSick: false,
    hexScrolls: [],
    activeCurses: [],
    hasProtectiveAmulet: false,
    hexCastCooldown: 0,
    protectionWeeksLeft: 0,
    raiseAttemptedThisTurn: false,
    workedThisTurn: false,
    hadRandomEventThisTurn: false,
    tavernAlesDrunkThisTurn: 0,
    isGameOver: false,
    isAI: true,
    hasNewspaper: false,
    foodBoughtWithoutPreservation: false,
    hasStoreBoughtFood: false,
    wasResurrectedThisWeek: false,
    permanentGoldBonus: 0,
    rentExtensionUsed: false,
    fame: 0,
    infamy: 0,
    purchasedReputationUnlocks: [],
    weeklySnapshots: [],
    gameStats: {
      totalGoldEarned: 0,
      totalGoldSpent: 0,
      totalQuestsCompleted: 0,
      totalBountiesCompleted: 0,
      totalDungeonRuns: 0,
      totalDungeonFloors: 0,
      totalShiftsWorked: 0,
      totalHoursWorked: 0,
      totalDegreesEarned: 0,
      totalHealingReceived: 0,
      totalDamageTaken: 0,
      totalRentPaid: 0,
      locationVisits: {},
      mostVisitedLocation: '',
      longestJobHeld: null,
      hexesCast: 0,
      hexesReceived: 0,
      timesRobbed: 0,
      deathCount: 0,
    },
    ...overrides,
  } as Player;
}

const studyAction = {
  type: 'study',
  location: 'academy',
  description: 'Study at the academy',
  priority: 50,
  details: { degreeId: 'trade-guild', sessions: 1 },
} as AIAction;

const buyFoodAction = {
  type: 'buy-food',
  location: 'general-store',
  description: 'Buy food',
  priority: 80,
  details: { itemId: 'bread', quantity: 1 },
} as AIAction;

const endTurnAction = {
  type: 'end-turn',
  description: 'End turn',
  priority: 0,
} as AIAction;

describe('AI failed action cache', () => {
  it('uses the complete action details in stable identity order', () => {
    expect(getAIActionIdentity(studyAction)).toBe(
      'study:academy:{"degreeId":"trade-guild","sessions":1}',
    );
    expect(getAIActionIdentity({
      ...studyAction,
      details: { sessions: 1, degreeId: 'trade-guild' },
    })).toBe(getAIActionIdentity(studyAction));
    expect(getAIActionIdentity({
      ...studyAction,
      details: { degreeId: 'trade-guild', sessions: 2 },
    })).not.toBe(getAIActionIdentity(studyAction));
  });

  it('blocks the exact same action while relevant state is unchanged', () => {
    const cache = createAIFailedActionCache();
    const player = makePlayer();
    const first = recordFailedAIAction(cache, studyAction, player);
    const second = recordFailedAIAction(cache, studyAction, { ...player });

    expect(first.reason).toBe('action-rejected');
    expect(first.attemptsForSignature).toBe(1);
    expect(second.attemptsForSignature).toBe(2);
    expect(isFailedAIActionBlocked(cache, studyAction, player)).toBe(true);
  });

  it('allows retry after gold changes and blocks again only after a new failure', () => {
    const cache = createAIFailedActionCache();
    const poor = makePlayer({ gold: 2 });
    const funded = makePlayer({ gold: 100 });

    recordFailedAIAction(cache, buyFoodAction, poor);
    expect(isFailedAIActionBlocked(cache, buyFoodAction, poor)).toBe(true);
    expect(isFailedAIActionBlocked(cache, buyFoodAction, funded)).toBe(false);

    const fundedFailure = recordFailedAIAction(cache, buyFoodAction, funded);
    expect(fundedFailure.attemptsForSignature).toBe(1);
    expect(isFailedAIActionBlocked(cache, buyFoodAction, funded)).toBe(true);
  });

  it('invalidates after movement, education, ownership or equipment changes', () => {
    const cache = createAIFailedActionCache();
    const before = makePlayer();
    recordFailedAIAction(cache, studyAction, before);

    const changedPlayers = [
      makePlayer({ currentLocation: 'bank' }),
      makePlayer({ degreeProgress: { 'trade-guild': 1 } }),
      makePlayer({ durables: { encyclopedia: 1 } }),
      makePlayer({ equippedWeapon: 'dagger', equipmentDurability: { dagger: 100 } }),
      makePlayer({ timeRemaining: 14 }),
    ];

    for (const changed of changedPlayers) {
      expect(isFailedAIActionBlocked(cache, studyAction, changed)).toBe(false);
    }
  });

  it('does not share a failed action between AI players', () => {
    const cache = createAIFailedActionCache();
    const firstAI = makePlayer({ id: 'ai-1' });
    const secondAI = makePlayer({ id: 'ai-2' });

    recordFailedAIAction(cache, studyAction, firstAI);
    expect(isFailedAIActionBlocked(cache, studyAction, firstAI)).toBe(true);
    expect(isFailedAIActionBlocked(cache, studyAction, secondAI)).toBe(false);
  });

  it('filters failed actions but always preserves an explicit end-turn option', () => {
    const cache = createAIFailedActionCache();
    const player = makePlayer();
    recordFailedAIAction(cache, studyAction, player);

    expect(getViableAIActions([studyAction, buyFoodAction, endTurnAction], player, cache))
      .toEqual([buyFoodAction, endTurnAction]);
  });

  it('uses the same cache API in normal and fast/skip execution paths', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/hooks/useGrimwaldAI.ts'), 'utf8');
    expect(source.match(/getViableAIActions\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/recordFailedAIAction\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('BUG-013: this path');
    expect(source).not.toContain('getAIFailedActionKey');
    expect(source).not.toContain('fall back to full list');
  });
});
