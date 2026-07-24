import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateGuestActionRequest } from '@/network/actionValidation';
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
  useGameStore.setState({ networkMode: 'local', dungeonRuns: {} });
  useGameStore.getState().startNewGame(['Cave Rest Tester'], false, goals);
  useGameStore.setState(state => ({
    dungeonRuns: {},
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'cave' as const,
      completedDegrees: ['combat-training'] as const,
      health: 70,
      maxHealth: 100,
      happiness: 50,
      timeRemaining: 20,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative Cave rest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    preparePlayer();
  });

  it('applies canonical time, healing and happiness atomically', () => {
    const playerId = useGameStore.getState().players[0].id;

    const result = useGameStore.getState().performCaveRest(playerId);

    expect(result?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.timeRemaining).toBe(12);
    expect(player.health).toBe(85);
    expect(player.happiness).toBe(51);
    expect(player.gameStats.totalHealingReceived).toBe(15);
  });

  it('caps recovery at max health', () => {
    const playerId = preparePlayer({ health: 94 });

    const result = useGameStore.getState().performCaveRest(playerId);

    expect(result?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.health).toBe(100);
    expect(player.gameStats.totalHealingReceived).toBe(6);
  });

  it('rejects wrong location, insufficient time and full health without mutation', () => {
    const wrongLocationId = preparePlayer({ currentLocation: 'bank' });
    expect(useGameStore.getState().performCaveRest(wrongLocationId)?.success).toBe(false);

    const noTimeId = preparePlayer({ timeRemaining: 7 });
    expect(useGameStore.getState().performCaveRest(noTimeId)?.success).toBe(false);

    const fullHealthId = preparePlayer({ health: 100 });
    expect(useGameStore.getState().performCaveRest(fullHealthId)?.success).toBe(false);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(20);
  });

  it('rejects resting while an authoritative dungeon session is active', () => {
    const playerId = useGameStore.getState().players[0].id;
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    expect(useGameStore.getState().beginDungeonRun(playerId, 1)?.success).toBe(true);

    expect(useGameStore.getState().performCaveRest(playerId)?.success).toBe(false);
  });

  it('allows only semantic Cave rest and blocks every raw stat/time mutation', () => {
    const state = useGameStore.getState();
    const playerId = state.players[0].id;

    expect(ALLOWED_GUEST_ACTIONS.has('performCaveRest')).toBe(true);
    expect(validateGuestActionRequest('performCaveRest', [playerId], playerId, playerId, state)).toBeNull();

    for (const action of [
      'spendTime',
      'modifyGold',
      'modifyHealth',
      'modifyHappiness',
      'modifyFood',
      'modifyClothing',
      'modifyMaxHealth',
      'modifyRelaxation',
    ]) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(false);
      expect(validateGuestActionRequest(action, [playerId, 1], playerId, playerId, state)).toBe('Action not allowed');
    }
  });
});
