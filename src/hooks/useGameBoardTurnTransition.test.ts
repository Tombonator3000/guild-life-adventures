import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGameBoardTurnTransition } from './useGameBoardTurnTransition';

const humanPlayer = (id: string, isGameOver = false) => ({
  id,
  isAI: false,
  isGameOver,
});

const aiPlayer = (id: string) => ({
  id,
  isAI: true,
  isGameOver: false,
});

describe('useGameBoardTurnTransition', () => {
  it('shows and dismisses the transition when the active human changes', () => {
    const first = humanPlayer('human-one');
    const second = humanPlayer('human-two');
    const players = [first, second];
    const { result, rerender } = renderHook(
      ({ currentPlayer }) => useGameBoardTurnTransition({
        players,
        currentPlayer,
        phase: 'playing',
        isOnline: false,
      }),
      { initialProps: { currentPlayer: first } },
    );

    expect(result.current.showTurnTransition).toBe(false);

    rerender({ currentPlayer: second });
    expect(result.current.showTurnTransition).toBe(true);

    act(() => result.current.dismissTurnTransition());
    expect(result.current.showTurnTransition).toBe(false);
  });

  it('ignores AI turns but still transitions between the surrounding humans', () => {
    const first = humanPlayer('human-one');
    const computer = aiPlayer('computer');
    const second = humanPlayer('human-two');
    const players = [first, computer, second];
    const { result, rerender } = renderHook(
      ({ currentPlayer }) => useGameBoardTurnTransition({
        players,
        currentPlayer,
        phase: 'playing',
        isOnline: false,
      }),
      { initialProps: { currentPlayer: first } },
    );

    rerender({ currentPlayer: computer });
    expect(result.current.showTurnTransition).toBe(false);

    rerender({ currentPlayer: second });
    expect(result.current.showTurnTransition).toBe(true);
  });

  it('does not show hotseat transitions in online games', () => {
    const first = humanPlayer('human-one');
    const second = humanPlayer('human-two');
    const players = [first, second];
    const { result, rerender } = renderHook(
      ({ currentPlayer }) => useGameBoardTurnTransition({
        players,
        currentPlayer,
        phase: 'playing',
        isOnline: true,
      }),
      { initialProps: { currentPlayer: first } },
    );

    rerender({ currentPlayer: second });
    expect(result.current.showTurnTransition).toBe(false);
  });

  it('excludes eliminated humans when deciding whether hotseat mode is active', () => {
    const active = humanPlayer('active-human');
    const eliminated = humanPlayer('eliminated-human', true);
    const players = [active, eliminated];
    const { result, rerender } = renderHook(
      ({ currentPlayer }) => useGameBoardTurnTransition({
        players,
        currentPlayer,
        phase: 'playing',
        isOnline: false,
      }),
      { initialProps: { currentPlayer: active } },
    );

    rerender({ currentPlayer: eliminated });
    expect(result.current.showTurnTransition).toBe(false);
  });

  it('tracks human changes outside play without showing a stale transition', () => {
    const first = humanPlayer('human-one');
    const second = humanPlayer('human-two');
    const players = [first, second];
    const { result, rerender } = renderHook(
      ({ currentPlayer, phase }) => useGameBoardTurnTransition({
        players,
        currentPlayer,
        phase,
        isOnline: false,
      }),
      { initialProps: { currentPlayer: first, phase: 'setup' } },
    );

    rerender({ currentPlayer: second, phase: 'setup' });
    expect(result.current.showTurnTransition).toBe(false);

    rerender({ currentPlayer: second, phase: 'playing' });
    expect(result.current.showTurnTransition).toBe(false);

    rerender({ currentPlayer: first, phase: 'playing' });
    expect(result.current.showTurnTransition).toBe(true);
  });
});
