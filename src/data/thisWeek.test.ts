import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getThisWeekAdvice } from './thisWeek';
import { FESTIVALS } from './festivals';

beforeEach(() => {
  useGameStore.setState({ networkMode: 'local' });
  useGameStore.getState().startNewGame(['Planner'], false, { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 });
});
function advice(patch = {}) {
  const state = useGameStore.getState();
  return getThisWeekAdvice({ ...state.players[0], currentJob: 'floor-sweeper', ...patch }, state.goalSettings, state.stockPrices, FESTIVALS[3]);
}
describe('This Week guidance', () => {
  it('does not warn about rent already covered or starvation with preserved food', () => {
    const result = advice({ weeksSinceRent: 4, rentPrepaidWeeks: 2, foodLevel: 0, freshFood: 30 });
    expect(result.map(r => r.id)).not.toContain('rent');
    expect(result.map(r => r.id)).not.toContain('food');
    expect(result.map(r => r.id)).toContain('festival');
  });
  it('prioritizes urgent needs and debt over optional opportunities, capped at three', () => {
    const result = advice({ foodLevel: 0, freshFood: 0, health: 15, loanAmount: 110, loanWeeksRemaining: 1, weeksSinceRent: 4 });
    expect(result.map(r => r.id)).toEqual(['food', 'health', 'loan']);
    expect(result[2].detail).toContain('110g');
  });
  it('derives the goal gap including Broker and loan debt without changing state', () => {
    const state = useGameStore.getState();
    const player = { ...state.players[0], currentJob: 'floor-sweeper', gold: 6000, happiness: 100, completedDegrees: ['trade-guild'] as const, dependability: 100 };
    const result = getThisWeekAdvice({ ...player, completedDegrees: [...player.completedDegrees] }, state.goalSettings, state.stockPrices);
    expect(result.find(r => r.id === 'goal-education')).toBeDefined();
    expect(state.players[0].gold).toBe(100);
  });
});
