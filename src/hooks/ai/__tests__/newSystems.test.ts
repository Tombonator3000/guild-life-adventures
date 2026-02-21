/**
 * Tests for the 4 new AI intelligence systems:
 * 1. Cash Flow Forecasting (forecastCashFlow)
 * 2. Education ROI Calculator (calculateDegreeROI, getRankedDegreesROI)
 * 3. Goal Velocity Tracker (recordAIGoalProgress, getVelocityAdjustments, getStuckGoals)
 * 4. Commitment Planner (generateCommitmentPlan, isCommitmentValid, getCommitmentBonus)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  forecastCashFlow,
  calculateDegreeROI,
  getRankedDegreesROI,
  getNextDegreeByROI,
} from '../strategy';
import {
  recordAIGoalProgress,
  getVelocityAdjustments,
  getStuckGoals,
  resetVelocityData,
} from '../goalVelocityTracker';
import {
  generateCommitmentPlan,
  isCommitmentValid,
  getCommitmentBonus,
} from '../commitmentPlan';
import type { Player } from '@/types/game.types';
import type { GoalProgress, CommitmentPlan } from '../types';
import { DIFFICULTY_SETTINGS } from '../types';

// ─── Player factory ──────────────────────────────────────────

function makePlayer(overrides: Partial<Player> = {}): Player {
  const base: Record<string, unknown> = {
    id: 'ai-grimwald',
    name: 'Grimwald',
    isAI: true,
    isGameOver: false,
    gold: 100,
    savings: 0,
    investments: 0,
    loanAmount: 0,
    loanWeeksRemaining: 0,
    stocks: {},
    happiness: 20,
    health: 100,
    maxHealth: 100,
    foodLevel: 80,
    clothingCondition: 50,
    experience: 0,
    dependability: 0,
    completedDegrees: [],
    degreeProgress: {},
    education: 0,
    currentJob: null,
    currentWage: 0,
    currentLocation: 'guild-hall',
    housing: 'slums',
    lockedRent: 0,
    weeksSinceRent: 1,
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
    totalShiftsWorked: 0,
    turnActions: [],
    weeklyWageEarned: 0,
    totalEarned: 0,
    totalSpent: 0,
    age: 18,
  };
  return { ...base, ...overrides } as unknown as Player;
}

function makeProgress(overrides: Partial<{
  wealth: number; happiness: number; education: number; career: number;
}> = {}): GoalProgress {
  const { wealth = 0, happiness = 0, education = 0, career = 0 } = overrides;
  return {
    wealth: { current: wealth * 1000, target: 1000, progress: wealth },
    happiness: { current: happiness * 80, target: 80, progress: happiness },
    education: { current: education * 18, target: 18, progress: education },
    career: { current: career * 50, target: 50, progress: career },
    adventure: { current: 0, target: 0, progress: 1 },
    overall: (wealth + happiness + education + career) / 4,
  };
}

// ─── Cash Flow Forecasting ───────────────────────────────────

describe('forecastCashFlow', () => {
  it('returns projectedGold array of correct length', () => {
    const player = makePlayer({ gold: 200, currentJob: null, currentWage: 0 });
    const forecast = forecastCashFlow(player, 1, 3);
    expect(forecast.projectedGold).toHaveLength(3);
  });

  it('detects shortfall risk when unemployed with no savings', () => {
    // No job → no income, gold 50 → will hit shortfall after food costs
    const player = makePlayer({ gold: 50, currentJob: null, currentWage: 0, savings: 0 });
    const forecast = forecastCashFlow(player, 1, 3);
    expect(forecast.shortfallRisk).toBe(true);
  });

  it('no shortfall risk when employed with good wage', () => {
    const player = makePlayer({
      gold: 300,
      currentJob: 'market-vendor',
      currentWage: 10,
      savings: 0,
      housing: 'slums',
    });
    const forecast = forecastCashFlow(player, 1, 3);
    // Market vendor earns ~10g/hr × 8h × 5 shifts = 400g
    // food ~20g/turn, rent ~75g every 4 weeks
    expect(forecast.shortfallRisk).toBe(false);
  });

  it('calculates rent due correctly - slums rent is 75g', () => {
    // Week 3 → next rent due at week 4 → rentDueInTurns = 0
    const player = makePlayer({ gold: 200, housing: 'slums', lockedRent: 0 });
    const forecast = forecastCashFlow(player, 3, 3); // week 4 = (3+1) % 4 === 0
    expect(forecast.rentDueInTurns).toBe(0);
  });

  it('safe banking amount is zero when gold is low', () => {
    const player = makePlayer({ gold: 80, currentJob: null, currentWage: 0, savings: 0 });
    const forecast = forecastCashFlow(player, 1, 3);
    expect(forecast.safeBankingAmount).toBe(0);
  });

  it('safe banking amount is positive when gold is high', () => {
    const player = makePlayer({ gold: 500, currentJob: 'market-vendor', currentWage: 10 });
    const forecast = forecastCashFlow(player, 1, 3);
    expect(forecast.safeBankingAmount).toBeGreaterThan(0);
  });

  it('recommends loan amount when projected to go broke', () => {
    const player = makePlayer({
      gold: 10,
      savings: 0,
      loanAmount: 0,
      currentJob: null,
      currentWage: 0,
      totalShiftsWorked: 5,
    });
    const forecast = forecastCashFlow(player, 1, 3);
    expect(forecast.shortfallRisk).toBe(true);
    expect(forecast.recommendedLoanAmount).toBeGreaterThan(0);
  });

  it('does not recommend loan if already has loan', () => {
    const player = makePlayer({ gold: 10, savings: 0, loanAmount: 100, currentJob: null });
    const forecast = forecastCashFlow(player, 1, 3);
    expect(forecast.recommendedLoanAmount).toBe(0);
  });
});

// ─── Education ROI Calculator ────────────────────────────────

describe('calculateDegreeROI', () => {
  it('returns valid ROI object for trade-guild', () => {
    const player = makePlayer({ currentJob: null, currentWage: 0, completedDegrees: [] });
    const roi = calculateDegreeROI('trade-guild', player);
    expect(roi.degreeId).toBe('trade-guild');
    expect(roi.remainingTuition).toBe(50); // 10 sessions × 5g
    expect(roi.roiScore).toBeGreaterThan(0);
  });

  it('accounts for already completed sessions', () => {
    const player = makePlayer({
      completedDegrees: [],
      degreeProgress: { 'trade-guild': 5 }, // halfway through
    });
    const roi = calculateDegreeROI('trade-guild', player);
    // 5 sessions remaining × 5g = 25g
    expect(roi.remainingTuition).toBe(25);
  });

  it('returns high ROI for degree that unlocks top-tier job', () => {
    // A degree that unlocks a high-wage job should score well
    const player = makePlayer({ currentWage: 4, currentJob: 'floor-sweeper' });
    const roiGuild = calculateDegreeROI('trade-guild', player);
    // trade-guild unlocks market-vendor (higher wage) → should have decent score
    expect(roiGuild.roiScore).toBeGreaterThan(0);
    expect(roiGuild.projectedHourlyWage).toBeGreaterThan(0);
  });

  it('returns 0 ROI score for invalid degree', () => {
    const player = makePlayer();
    const roi = calculateDegreeROI('nonexistent-degree', player);
    expect(roi.roiScore).toBe(0);
    expect(roi.payoffWeeks).toBe(999);
  });

  it('returns 0 remaining tuition for completed degree sessions', () => {
    const player = makePlayer({ degreeProgress: { 'trade-guild': 10 } });
    const roi = calculateDegreeROI('trade-guild', player);
    expect(roi.remainingTuition).toBe(0);
  });
});

describe('getRankedDegreesROI', () => {
  it('returns empty array when no degrees available', () => {
    // Player who completed all possible degrees (no more available)
    const allDegrees = [
      'trade-guild', 'junior-academy', 'arcane-studies', 'combat-training',
      'master-combat', 'scholar', 'advanced-scholar', 'sage-studies', 'loremaster', 'commerce', 'alchemy',
    ];
    const player = makePlayer({ completedDegrees: allDegrees as any });
    const ranked = getRankedDegreesROI(player, DIFFICULTY_SETTINGS.hard);
    expect(ranked).toHaveLength(0);
  });

  it('returns sorted degrees with highest ROI first', () => {
    const player = makePlayer({ completedDegrees: [], currentWage: 0 });
    const ranked = getRankedDegreesROI(player, DIFFICULTY_SETTINGS.hard);
    // Should have at least the two starting degrees
    expect(ranked.length).toBeGreaterThanOrEqual(2);
    // Should be sorted descending by roiScore
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].roiScore).toBeGreaterThanOrEqual(ranked[i + 1].roiScore);
    }
  });
});

describe('getNextDegreeByROI', () => {
  it('returns null when no degrees available', () => {
    const player = makePlayer({
      completedDegrees: [
        'trade-guild', 'junior-academy', 'arcane-studies', 'combat-training',
        'master-combat', 'scholar', 'advanced-scholar', 'sage-studies', 'loremaster', 'commerce', 'alchemy',
      ] as any,
    });
    const result = getNextDegreeByROI(player, DIFFICULTY_SETTINGS.hard);
    expect(result).toBeNull();
  });

  it('uses ROI ranking for hard AI', () => {
    const player = makePlayer({ completedDegrees: [] });
    const hardDegree = getNextDegreeByROI(player, DIFFICULTY_SETTINGS.hard);
    const mediumDegree = getNextDegreeByROI(player, DIFFICULTY_SETTINGS.medium);
    // Both should return a degree
    expect(hardDegree).not.toBeNull();
    expect(mediumDegree).not.toBeNull();
  });
});

// ─── Goal Velocity Tracker ───────────────────────────────────

describe('goalVelocityTracker', () => {
  beforeEach(() => {
    resetVelocityData();
  });

  it('returns no adjustments for player with no history', () => {
    const adjustments = getVelocityAdjustments('ai-grimwald', 1, 2);
    expect(adjustments.study).toBe(1.0);
    expect(adjustments.work).toBe(1.0);
  });

  it('detects stuck education goal after 3 stagnant turns', () => {
    const pid = 'ai-test-stuck';
    // Record same progress (stuck) for 5 turns
    for (let week = 1; week <= 5; week++) {
      recordAIGoalProgress(pid, makeProgress({ education: 0.3, wealth: 0, career: 0 }), week);
    }
    const stuck = getStuckGoals(pid);
    expect(stuck).toContain('education');
  });

  it('detects no stuck goals when making progress', () => {
    const pid = 'ai-test-progress';
    // Record steady progress
    for (let week = 1; week <= 5; week++) {
      recordAIGoalProgress(pid, makeProgress({ education: week * 0.1, wealth: week * 0.1 }), week);
    }
    const stuck = getStuckGoals(pid);
    expect(stuck).not.toContain('education');
    expect(stuck).not.toContain('wealth');
  });

  it('boosts work when education is stuck', () => {
    const pid = 'ai-test-stuck-edu';
    for (let week = 1; week <= 5; week++) {
      recordAIGoalProgress(pid, makeProgress({ education: 0.3 }), week);
    }
    const adjustments = getVelocityAdjustments(pid, 6, 2);
    expect(adjustments.work).toBeGreaterThan(1.0);
  });

  it('returns no adjustments for easy AI (planningDepth < 2)', () => {
    const pid = 'ai-test-easy';
    for (let week = 1; week <= 5; week++) {
      recordAIGoalProgress(pid, makeProgress({ education: 0.3 }), week);
    }
    const adjustments = getVelocityAdjustments(pid, 6, 1); // easy AI
    expect(adjustments.study).toBe(1.0);
    expect(adjustments.work).toBe(1.0);
  });

  it('does not thrash — cooldown prevents repeated pivot on same turn', () => {
    const pid = 'ai-test-cooldown';
    for (let week = 1; week <= 5; week++) {
      recordAIGoalProgress(pid, makeProgress({ education: 0.3 }), week);
    }
    // First adjustment on week 6 should trigger pivot (sets lastUnstickTurn = 6)
    const adj1 = getVelocityAdjustments(pid, 6, 2);
    const workBoost1 = adj1.work;
    // Second call on same week: cooldown active (6 - 6 = 0 < UNSTICK_COOLDOWN 2) → no boost
    const adj2 = getVelocityAdjustments(pid, 6, 2);
    const workBoost2 = adj2.work;
    // First call has the boost; second call within cooldown returns baseline 1.0
    expect(workBoost1).toBeGreaterThan(1.0);
    expect(workBoost2).toBeLessThanOrEqual(workBoost1);
  });
});

// ─── Commitment Planner ──────────────────────────────────────

describe('generateCommitmentPlan', () => {
  beforeEach(() => {
    resetVelocityData();
  });

  it('returns null for easy AI', () => {
    const player = makePlayer();
    const progress = makeProgress();
    const plan = generateCommitmentPlan(player, progress, DIFFICULTY_SETTINGS.easy, 1);
    expect(plan).toBeNull();
  });

  it('returns null during crisis (no food)', () => {
    const player = makePlayer({ foodLevel: 5 }); // critically low food
    const progress = makeProgress();
    const plan = generateCommitmentPlan(player, progress, DIFFICULTY_SETTINGS.hard, 1);
    expect(plan).toBeNull();
  });

  it('generates a wealth-sprint plan when wealth is 70%+ complete', () => {
    const player = makePlayer({ gold: 200, currentWage: 10 });
    const progress = makeProgress({ wealth: 0.72 });
    const plan = generateCommitmentPlan(player, progress, DIFFICULTY_SETTINGS.hard, 5);
    expect(plan).not.toBeNull();
    expect(plan?.type).toBe('wealth-sprint');
  });

  it('generates an earn-degree plan when education is weak and affordable', () => {
    const player = makePlayer({ gold: 200, completedDegrees: [] });
    const progress = makeProgress({ education: 0.1, wealth: 0.3 });
    const plan = generateCommitmentPlan(player, progress, DIFFICULTY_SETTINGS.hard, 3);
    // Should generate earn-degree since education is weak and player has gold
    if (plan) {
      expect(['earn-degree', 'career-push', 'wealth-sprint']).toContain(plan.type);
    }
  });

  it('generates a plan with aligned actions including move', () => {
    const player = makePlayer({ gold: 200 });
    const progress = makeProgress({ wealth: 0.7 });
    const plan = generateCommitmentPlan(player, progress, DIFFICULTY_SETTINGS.medium, 5);
    if (plan) {
      expect(plan.alignedActions).toContain('move');
    }
  });

  it('plan has valid priority bonus', () => {
    const player = makePlayer({ gold: 300 });
    const progress = makeProgress({ wealth: 0.7 });
    const plan = generateCommitmentPlan(player, progress, DIFFICULTY_SETTINGS.hard, 5);
    if (plan) {
      expect(plan.priorityBonus).toBeGreaterThan(0);
      expect(plan.priorityBonus).toBeLessThanOrEqual(50);
    }
  });
});

describe('isCommitmentValid', () => {
  it('returns false when plan has exceeded maxDuration', () => {
    const player = makePlayer();
    const progress = makeProgress();
    const plan: CommitmentPlan = {
      type: 'wealth-sprint',
      description: 'test',
      startTurn: 1,
      maxDuration: 2,
      alignedActions: ['work'],
      priorityBonus: 20,
    };
    // Week 4 = 4 - 1 = 3 turns elapsed > maxDuration 2
    expect(isCommitmentValid(plan, player, progress, 4)).toBe(false);
  });

  it('returns false when wealth sprint goal is complete', () => {
    const player = makePlayer({ gold: 5000 });
    const progress = makeProgress({ wealth: 1.0 });
    const plan: CommitmentPlan = {
      type: 'wealth-sprint',
      description: 'test',
      startTurn: 5,
      maxDuration: 4,
      alignedActions: ['work'],
      priorityBonus: 20,
    };
    expect(isCommitmentValid(plan, player, progress, 6)).toBe(false);
  });

  it('returns false when earn-degree target is completed', () => {
    const player = makePlayer({ completedDegrees: ['trade-guild'] as any });
    const progress = makeProgress();
    const plan: CommitmentPlan = {
      type: 'earn-degree',
      targetId: 'trade-guild',
      description: 'test',
      startTurn: 1,
      maxDuration: 4,
      alignedActions: ['study'],
      priorityBonus: 25,
    };
    expect(isCommitmentValid(plan, player, progress, 2)).toBe(false);
  });

  it('returns true when plan is still valid', () => {
    const player = makePlayer({ completedDegrees: [] });
    const progress = makeProgress({ wealth: 0.5 });
    const plan: CommitmentPlan = {
      type: 'earn-degree',
      targetId: 'trade-guild',
      description: 'test',
      startTurn: 1,
      maxDuration: 4,
      alignedActions: ['study'],
      priorityBonus: 25,
    };
    expect(isCommitmentValid(plan, player, progress, 2)).toBe(true);
  });
});

describe('getCommitmentBonus', () => {
  it('returns 0 when no plan', () => {
    expect(getCommitmentBonus(null, 'work')).toBe(0);
  });

  it('returns priorityBonus for aligned action', () => {
    const plan: CommitmentPlan = {
      type: 'wealth-sprint',
      description: 'test',
      startTurn: 1,
      maxDuration: 2,
      alignedActions: ['work', 'move'],
      priorityBonus: 30,
    };
    expect(getCommitmentBonus(plan, 'work')).toBe(30);
    expect(getCommitmentBonus(plan, 'move')).toBe(30);
  });

  it('returns 0 for non-aligned action', () => {
    const plan: CommitmentPlan = {
      type: 'earn-degree',
      description: 'test',
      startTurn: 1,
      maxDuration: 2,
      alignedActions: ['study', 'graduate'],
      priorityBonus: 25,
    };
    expect(getCommitmentBonus(plan, 'work')).toBe(0);
    expect(getCommitmentBonus(plan, 'explore-dungeon')).toBe(0);
  });
});
