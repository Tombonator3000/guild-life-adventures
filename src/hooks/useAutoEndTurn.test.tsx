import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { useAutoEndTurn } from './useAutoEndTurn';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

function HookHarness() {
  useAutoEndTurn();
  return null;
}

function prepareDeadMiddlePlayer(networkMode: 'local' | 'guest') {
  useGameStore.setState({ networkMode: 'local', localPlayerId: null, roomCode: null });
  useGameStore.getState().startNewGame(['Alive Host', 'Fallen Guest'], true, goals);
  useGameStore.setState(state => ({
    phase: 'event',
    eventMessage: 'Fatal damage result',
    eventSource: 'weekly',
    networkMode,
    localPlayerId: networkMode === 'guest' ? 'player-1' : null,
    currentPlayerIndex: 1,
    players: state.players.map((player, index) => (
      index === 1
        ? { ...player, health: 0, isGameOver: true }
        : player
    )),
  }));
}

describe('useAutoEndTurn permadeath recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGameStore.setState({ networkMode: 'local', localPlayerId: null, roomCode: null });
    useGameStore.getState().resetForNewGame();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    useGameStore.setState({ networkMode: 'local', localPlayerId: null, roomCode: null });
    useGameStore.getState().resetForNewGame();
  });

  it('automatically clears the blocking event and advances a dead authoritative turn', async () => {
    prepareDeadMiddlePlayer('local');
    render(<HookHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.players[2].isAI).toBe(true);
    expect(state.phase).toBe('playing');
    expect(state.eventMessage).toBeNull();
    expect(state.eventSource).toBeNull();
  });

  it('does not let a guest client advance the authoritative turn', async () => {
    prepareDeadMiddlePlayer('guest');
    render(<HookHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.players[1].isGameOver).toBe(true);
    expect(state.phase).toBe('event');
  });

  it('keeps a living zero-hour turn open for free errands until End Turn', async () => {
    useGameStore.getState().startNewGame(['Tenant'], false, goals);
    useGameStore.setState(state => ({
      week: 3,
      players: state.players.map(player => ({ ...player, currentLocation: 'landlord', timeRemaining: 0, gold: 5000 })),
    }));
    render(<HookHarness />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    const id = useGameStore.getState().players[0].id;
    act(() => { useGameStore.getState().payHousingRent(id, 4); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(useGameStore.getState().week).toBe(3);
    expect(useGameStore.getState().players[0].rentPrepaidWeeks).toBe(4);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(0);
    act(() => { useGameStore.getState().endTurn(); });
    expect(useGameStore.getState().week).toBe(4);
  });
});
