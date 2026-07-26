import { describe, expect, it } from 'vitest';
import type { GoalSettings, Player } from '@/types/game.types';
import {
  buildPlayerPostGameResult,
  calculatePerformanceScore,
  detectGoalProfile,
} from './postGameResults';

const quickGoals: GoalSettings = {
  wealth: 2000,
  happiness: 75,
  education: 18,
  career: 50,
  adventure: 0,
};

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Nessa',
    gold: 100,
    savings: 0,
    investments: 0,
    loanAmount: 0,
    stocks: {},
    happiness: 50,
    health: 100,
    maxHealth: 100,
    completedDegrees: [],
    completedQuests: 0,
    dungeonFloorsCleared: [],
    currentJob: null,
    dependability: 50,
    totalShiftsWorked: 0,
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

describe('post-game results', () => {
  it('uses live wealth including stocks and loans', () => {
    const result = buildPlayerPostGameResult(
      player({
        gold: 700,
        savings: 400,
        investments: 200,
        stocks: { 'crystal-mine': 10 },
        loanAmount: 300,
      }),
      quickGoals,
      { 'crystal-mine': 100 },
      12,
      null,
    );

    expect(result.totalWealth).toBe(2000);
    expect(result.goals.find(goal => goal.key === 'wealth')).toMatchObject({
      current: 2000,
      met: true,
      missing: 0,
    });
  });

  it('shows exactly what a player still needed to win', () => {
    const result = buildPlayerPostGameResult(
      player({
        gold: 794,
        happiness: 100,
        completedDegrees: ['trade-guild', 'junior-academy'],
        currentJob: 'job-1',
        dependability: 88,
      }),
      quickGoals,
      {},
      19,
      'other-player',
    );

    expect(result.allGoalsMet).toBe(false);
    expect(result.missingSummary).toBe('Nessa needed 1,206g more to win.');
  });

  it('lists multiple missing goals without hiding the actual gaps', () => {
    const result = buildPlayerPostGameResult(
      player(),
      quickGoals,
      {},
      1,
      null,
    );

    expect(result.missingSummary).toBe(
      'Nessa needed 1,900g, 25 happiness, 18 education and 50 dep more to win.',
    );
  });

  it('can award overall performance to a non-winner', () => {
    const activePlayer = player({
      id: 'active',
      gold: 1900,
      happiness: 100,
      health: 100,
      completedDegrees: ['trade-guild', 'junior-academy', 'arcane-studies'],
      completedQuests: 12,
      dungeonFloorsCleared: [1, 2, 3, 4, 5, 6],
      currentJob: 'job-1',
      dependability: 100,
      gameStats: {
        ...player().gameStats,
        totalGoldEarned: 8000,
        totalQuestsCompleted: 12,
        totalDungeonFloors: 6,
        totalShiftsWorked: 60,
      },
    });
    const minimalistWinner = player({
      id: 'winner',
      gold: 2000,
      happiness: 75,
      completedDegrees: ['trade-guild', 'junior-academy'],
      currentJob: 'job-1',
      dependability: 50,
    });

    const activeScore = calculatePerformanceScore(activePlayer, quickGoals, {}, 20, false).score;
    const winnerScore = calculatePerformanceScore(minimalistWinner, quickGoals, {}, 20, true).score;

    expect(activeScore).toBeGreaterThan(winnerScore);
  });

  it('detects official presets and labels changed goals as custom', () => {
    expect(detectGoalProfile(quickGoals)).toBe('Quick');
    expect(detectGoalProfile({ ...quickGoals, wealth: 2100 })).toBe('Custom');
  });
});
