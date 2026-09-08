import { Profiler } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { GoalProgress } from './GoalProgress';

describe('goal display subscriptions', () => {
  beforeEach(() => {
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Portfolio'], false, {
      wealth: 1000, happiness: 75, education: 18, career: 50, adventure: 0,
    });
  });

  it('ignores unrelated board changes but updates when portfolio prices change', () => {
    const state = useGameStore.getState();
    const player = { ...state.players[0], gold: 100, stocks: { 'crystal-mine': 2 } };
    useGameStore.setState({ stockPrices: { 'crystal-mine': 50 } });
    const onRender = vi.fn();
    render(<Profiler id="goals" onRender={onRender}>
      <GoalProgress player={player} goals={state.goalSettings} />
    </Profiler>);
    expect(screen.getByText('200g / 1000g')).toBeInTheDocument();
    onRender.mockClear();

    for (const location of ['bank', 'guild-hall', 'armory'] as const) {
      act(() => useGameStore.getState().selectLocation(location));
    }
    expect(onRender).not.toHaveBeenCalled();

    act(() => useGameStore.setState({ stockPrices: { 'crystal-mine': 150 } }));
    expect(onRender).toHaveBeenCalledTimes(1);
    expect(screen.getByText('400g / 1000g')).toBeInTheDocument();
  });
});
