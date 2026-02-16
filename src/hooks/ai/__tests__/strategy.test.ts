import { describe, it, expect } from 'vitest';
import {
  calculateGoalProgress,
  getWeakestGoal,
  calculateResourceUrgency,
  calculateBankingStrategy,
} from '../strategy';
import type { Player } from '@/types/game.types';
import type { GoalProgress } from '../types';

// Minimal player factory for testing
function makePlayer(overrides: Partial<Player> = {}): Player {
  const base: Record<string, unknown> = {
    id: 'test-1',
    name: 'Test',
    isAI: true,
    isGameOver: false,
    gold: 0,
    savings: 0,
    investments: 0,
    loanAmount: 0,
    stocks: {},
    happiness: 0,
    health: 100,
    foodLevel: 100,
    clothingCondition: 50,
    experience: 0,
    dependability: 0,
    completedDegrees: [],
    degreeProgress: {},
    education: 0,
    currentJob: null,
    currentLocation: 'guild-hall',
    housing: 'slums',
    lockedRent: 0,
    weeksSinceRent: 0,
    timeRemaining: 60,
    hasGuildPass: false,
    guildRank: 1,
    activeQuest: null,
    completedQuests: 0,
    questCooldownWeeksLeft: 0,
    completedBountiesThisWeek: [],
    questChainProgress: {},
    dungeonFloorsCleared: [],
    equippedWeapon: null,
    equippedArmor: null,
    equippedShield: null,
    temperedItems: [],
    equipmentDurability: {},
    inventory: [],
    durables: {},
    appliances: {},
    hexScrolls: [],
    activeCurses: [],
    hasProtectiveAmulet: false,
    isSick: false,
    sicknessWeeksLeft: 0,
    hasInsurance: false,
    insuranceWeeksLeft: 0,
    loanWeeksLeft: 0,
    turnActions: [],
    weeklyWageEarned: 0,
    totalEarned: 0,
    totalSpent: 0,
  };
  return { ...base, ...overrides } as unknown as Player;
}

const GOALS = { wealth: 1000, happiness: 80, education: 18, career: 50 };

describe('calculateGoalProgress', () => {
  it('returns 0 progress for a fresh player', () => {
    const player = makePlayer();
    const result = calculateGoalProgress(player, GOALS);
    expect(result.wealth.progress).toBe(0);
    expect(result.happiness.progress).toBe(0);
    expect(result.education.progress).toBe(0);
    expect(result.career.progress).toBe(0);
    expect(result.overall).toBe(0);
  });

  it('calculates wealth including savings and subtracting loans', () => {
    const player = makePlayer({ gold: 300, savings: 400, investments: 100, loanAmount: 200 });
    const result = calculateGoalProgress(player, GOALS);
    // totalWealth = 300 + 400 + 100 - 200 = 600 → 600/1000 = 0.6
    expect(result.wealth.current).toBe(600);
    expect(result.wealth.progress).toBeCloseTo(0.6);
  });

  it('includes stock value when stockPrices provided', () => {
    const player = makePlayer({ gold: 0, stocks: { 'GILD': 10 } });
    const result = calculateGoalProgress(player, GOALS, { 'GILD': 50 });
    // stockValue = 10 * 50 = 500
    expect(result.wealth.current).toBe(500);
  });

  it('caps progress at 1.0', () => {
    const player = makePlayer({ gold: 5000, happiness: 200, dependability: 100 });
    const result = calculateGoalProgress(player, GOALS);
    expect(result.wealth.progress).toBe(1);
    expect(result.happiness.progress).toBe(1);
    expect(result.career.progress).toBe(1);
  });

  it('computes education from completed degrees', () => {
    const player = makePlayer({ completedDegrees: ['fighter', 'mage'] as any });
    const result = calculateGoalProgress(player, GOALS);
    // 2 degrees * 9 = 18 / 18 = 1.0
    expect(result.education.progress).toBe(1);
  });

  it('includes adventure progress when goal is set', () => {
    const goals = { ...GOALS, adventure: 5 };
    const player = makePlayer({ completedQuests: 2, dungeonFloorsCleared: [1, 2] });
    const result = calculateGoalProgress(player, goals);
    // adventureValue = 2 + 2 = 4 / 5 = 0.8
    expect(result.adventure.progress).toBeCloseTo(0.8);
    // overall should now include adventure (5 goals)
    expect(result.overall).toBeGreaterThan(0);
  });
});

describe('getWeakestGoal', () => {
  it('returns the goal with lowest progress', () => {
    const progress: GoalProgress = {
      wealth: { current: 800, target: 1000, progress: 0.8 },
      happiness: { current: 20, target: 80, progress: 0.25 },
      education: { current: 9, target: 18, progress: 0.5 },
      career: { current: 30, target: 50, progress: 0.6 },
      adventure: { current: 0, target: 0, progress: 1 },
      overall: 0.5,
    };
    // Happiness is lowest at 0.25, but wealth is >= 0.8 (sprint candidate)
    // Sprint: wealth at 0.8 should be prioritized over weakest
    expect(getWeakestGoal(progress)).toBe('wealth');
  });

  it('returns weakest when no goal is near completion', () => {
    const progress: GoalProgress = {
      wealth: { current: 300, target: 1000, progress: 0.3 },
      happiness: { current: 10, target: 80, progress: 0.125 },
      education: { current: 0, target: 18, progress: 0 },
      career: { current: 20, target: 50, progress: 0.4 },
      adventure: { current: 0, target: 0, progress: 1 },
      overall: 0.2,
    };
    expect(getWeakestGoal(progress)).toBe('education');
  });

  it('includes adventure when target > 0', () => {
    const progress: GoalProgress = {
      wealth: { current: 900, target: 1000, progress: 0.9 },
      happiness: { current: 70, target: 80, progress: 0.875 },
      education: { current: 16, target: 18, progress: 0.89 },
      career: { current: 45, target: 50, progress: 0.9 },
      adventure: { current: 1, target: 10, progress: 0.1 },
      overall: 0.7,
    };
    // All core goals are >= 0.8 (sprint), but adventure is 0.1
    // Sprint picks highest near-complete first: wealth/career at 0.9
    expect(getWeakestGoal(progress)).toBe('wealth');
  });
});

describe('calculateResourceUrgency', () => {
  it('returns max food urgency when food is critical', () => {
    const player = makePlayer({ foodLevel: 10 });
    const result = calculateResourceUrgency(player);
    expect(result.food).toBe(1.0);
  });

  it('returns low food urgency when food is high', () => {
    const player = makePlayer({ foodLevel: 80 });
    const result = calculateResourceUrgency(player);
    expect(result.food).toBe(0.1);
  });

  it('returns max rent urgency at 3+ weeks overdue', () => {
    const player = makePlayer({ weeksSinceRent: 3, housing: 'slums' as any });
    const result = calculateResourceUrgency(player);
    expect(result.rent).toBe(1.0);
  });

  it('returns 0 rent urgency for homeless', () => {
    const player = makePlayer({ housing: 'homeless' as any });
    const result = calculateResourceUrgency(player);
    expect(result.rent).toBe(0);
  });

  it('returns high clothing urgency when naked', () => {
    const player = makePlayer({ clothingCondition: 0 });
    const result = calculateResourceUrgency(player);
    expect(result.clothing).toBe(1.0);
  });
});

describe('calculateBankingStrategy', () => {
  it('deposits excess gold for strategic AI', () => {
    const player = makePlayer({ gold: 500, savings: 0 });
    const settings = { planningDepth: 2, aggressiveness: 0.6, mistakeChance: 0.08, efficiencyWeight: 0.6, decisionDelay: 500 };
    const result = calculateBankingStrategy(player, settings);
    expect(result.deposit).toBeGreaterThan(0);
    expect(result.withdraw).toBe(0);
  });

  it('withdraws when gold is low and savings are available', () => {
    const player = makePlayer({ gold: 20, savings: 200 });
    const settings = { planningDepth: 1, aggressiveness: 0.3, mistakeChance: 0.2, efficiencyWeight: 0.3, decisionDelay: 800 };
    const result = calculateBankingStrategy(player, settings);
    expect(result.withdraw).toBeGreaterThan(0);
    expect(result.deposit).toBe(0);
  });
});
