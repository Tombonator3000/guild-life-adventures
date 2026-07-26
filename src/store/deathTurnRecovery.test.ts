import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('death turn recovery', () => {
  beforeEach(() => {
    useGameStore.getState().resetForNewGame();
  });

  it('ends a solo permadeath game when no player survives', () => {
    useGameStore.getState().startNewGame(['Solo'], false, goals);
    useGameStore.setState(state => ({
      phase: 'playing',
      currentPlayerIndex: 0,
      players: state.players.map(player => ({
        ...player,
        health: 0,
        isGameOver: true,
      })),
    }));

    useGameStore.getState().endTurn();

    const state = useGameStore.getState();
    expect(state.phase).toBe('victory');
    expect(state.winner).toBeNull();
    expect(state.eventMessage).toBe('All players have perished. Game Over!');
  });

  it('skips a dead current player and starts the next living human turn', () => {
    useGameStore.getState().startNewGame(['Fallen', 'Survivor', 'Third'], false, goals);
    useGameStore.setState(state => ({
      phase: 'event',
      eventMessage: 'A fatal encounter',
      eventSource: 'weekly',
      currentPlayerIndex: 0,
      players: state.players.map((player, index) => (
        index === 0
          ? { ...player, health: 0, isGameOver: true }
          : { ...player, timeRemaining: 1 }
      )),
    }));

    useGameStore.getState().endTurn();

    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.players[1].isGameOver).toBe(false);
    expect(state.players[1].timeRemaining).toBeGreaterThan(1);
    expect(state.phase).toBe('playing');
    expect(state.eventMessage).toBeNull();
    expect(state.eventSource).toBeNull();
  });

  it('continues to the next AI instead of leaving the dead human in control', () => {
    useGameStore.getState().startNewGame(['Alive Host', 'Fallen Guest'], true, goals);
    useGameStore.setState(state => ({
      phase: 'playing',
      currentPlayerIndex: 1,
      players: state.players.map((player, index) => (
        index === 1 ? { ...player, health: 0, isGameOver: true } : player
      )),
    }));

    useGameStore.getState().endTurn();

    const state = useGameStore.getState();
    expect(state.phase).toBe('playing');
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.players[2].isAI).toBe(true);
    expect(state.players[2].isGameOver).toBe(false);
  });
});
