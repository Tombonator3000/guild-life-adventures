import { beforeEach, describe, expect, it } from 'vitest';
import { validateGuestActionArgs } from '@/network/actionValidation';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState({ networkMode: 'local' });
  useGameStore.getState().startNewGame(['Home Tester'], false, goals);
  useGameStore.setState(state => ({
    players: state.players.map(player => ({
      ...player,
      housing: 'slums' as const,
      currentLocation: 'slums' as const,
      timeRemaining: 60,
      happiness: 40,
      health: 70,
      maxHealth: 100,
      relaxation: 20,
      hadRandomEventThisTurn: true,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative home activities', () => {
  beforeEach(() => {
    preparePlayer();
  });

  it('uses the canonical slums relaxation duration and effects', () => {
    const player = useGameStore.getState().players[0];

    const result = useGameStore.getState().performHomeActivity(player.id, 'relax');

    expect(result?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.timeRemaining).toBe(52);
    expect(updated.happiness).toBe(43);
    expect(updated.health).toBe(70);
    expect(updated.relaxation).toBe(25);
  });

  it('uses the canonical noble relaxation duration', () => {
    const playerId = preparePlayer({
      housing: 'noble',
      currentLocation: 'noble-heights',
    });

    expect(useGameStore.getState().performHomeActivity(playerId, 'relax')?.success).toBe(true);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(57);
  });

  it('applies sleep atomically with capped recovery', () => {
    const playerId = preparePlayer({
      timeRemaining: 8,
      happiness: 96,
      health: 95,
      relaxation: 48,
    });

    expect(useGameStore.getState().performHomeActivity(playerId, 'sleep')?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.timeRemaining).toBe(0);
    expect(updated.happiness).toBe(100);
    expect(updated.health).toBe(100);
    expect(updated.relaxation).toBe(50);
  });

  it('rejects a player who is not at their own rented home', () => {
    const playerId = preparePlayer({ currentLocation: 'noble-heights' });

    expect(useGameStore.getState().performHomeActivity(playerId, 'relax')?.success).toBe(false);
    const updated = useGameStore.getState().players[0];
    expect(updated.timeRemaining).toBe(60);
    expect(updated.happiness).toBe(40);
  });

  it('rejects homeless players and insufficient time', () => {
    const homelessId = preparePlayer({ housing: 'homeless', currentLocation: 'slums' });
    expect(useGameStore.getState().performHomeActivity(homelessId, 'sleep')?.success).toBe(false);

    const tiredId = preparePlayer({ timeRemaining: 7 });
    expect(useGameStore.getState().performHomeActivity(tiredId, 'sleep')?.success).toBe(false);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(7);
  });

  it('exposes only a bounded activity enum to guest clients', () => {
    const state = useGameStore.getState();
    const player = state.players[0];

    expect(ALLOWED_GUEST_ACTIONS.has('performHomeActivity')).toBe(true);
    expect(validateGuestActionArgs(
      'performHomeActivity',
      [player.id, 'relax'],
      state,
    )).toBeNull();
    expect(validateGuestActionArgs(
      'performHomeActivity',
      [player.id, 'free-heal'],
      state,
    )).toBe('Invalid home activity');
  });
});
