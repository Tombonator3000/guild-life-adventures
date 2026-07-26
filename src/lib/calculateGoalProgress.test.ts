import { describe, expect, it } from 'vitest';
import type { GoalSettings, Player } from '@/types/game.types';
import { calculateGoalProgress } from './calculateGoalProgress';

const quickGoals: GoalSettings = {
  wealth: 2000,
  happiness: 75,
  education: 18,
  career: 50,
  adventure: 0,
};

function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    name: 'Starter',
    gold: 100,
    savings: 0,
    investments: 0,
    loanAmount: 0,
    happiness: 50,
    completedDegrees: [],
    currentJob: null,
    dependability: 50,
    completedQuests: 0,
    dungeonFloorsCleared: [],
    stocks: {},
    ...overrides,
  } as Player;
}

describe('calculateGoalProgress', () => {
  it('starts normal games at zero percent', () => {
    const progress = calculateGoalProgress(createPlayer(), quickGoals, {});

    expect(progress).toMatchObject({
      wealth: 0,
      happiness: 0,
      education: 0,
      career: 0,
      adventure: null,
      overall: 0,
    });
  });

  it('measures progress from the starting state rather than from absolute zero', () => {
    const progress = calculateGoalProgress(
      createPlayer({
        gold: 1050,
        happiness: 75,
        completedDegrees: ['degree-1'] as Player['completedDegrees'],
        currentJob: 'job-1',
        dependability: 50,
      }),
      {
        wealth: 2000,
        happiness: 100,
        education: 18,
        career: 100,
        adventure: 0,
      },
      {},
    );

    expect(progress.wealth).toBe(50);
    expect(progress.happiness).toBe(50);
    expect(progress.education).toBe(50);
    expect(progress.career).toBe(50);
    expect(progress.overall).toBe(50);
  });

  it('includes stock value and subtracts loans just like victory checks', () => {
    const progress = calculateGoalProgress(
      createPlayer({
        stocks: { 'crystal-mine': 10 },
        loanAmount: 200,
      }),
      { ...quickGoals, wealth: 900 },
      { 'crystal-mine': 100 },
    );

    expect(progress.wealth).toBe(100);
  });

  it('adds adventure only when the adventure goal is enabled', () => {
    const progress = calculateGoalProgress(
      createPlayer({ completedQuests: 3, dungeonFloorsCleared: [1, 2, 3] }),
      { ...quickGoals, adventure: 12 },
      {},
    );

    expect(progress.adventure).toBe(50);
    expect(progress.overall).toBe(10);
  });

  it('clamps losses below the starting state to zero and completed goals to 100', () => {
    const behind = calculateGoalProgress(
      createPlayer({ gold: 0, happiness: 20 }),
      quickGoals,
      {},
    );
    const complete = calculateGoalProgress(
      createPlayer({
        gold: 5000,
        happiness: 100,
        completedDegrees: ['a', 'b'] as Player['completedDegrees'],
        currentJob: 'job-1',
        dependability: 100,
      }),
      quickGoals,
      {},
    );

    expect(behind.wealth).toBe(0);
    expect(behind.happiness).toBe(0);
    expect(complete.overall).toBe(100);
  });
});
