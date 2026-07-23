import { beforeEach, describe, expect, it } from 'vitest';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { validateGuestActionArgs, validateGuestActionRequest } from '@/network/actionValidation';
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
  useGameStore.getState().startNewGame(['Healer Tester'], false, goals);
  useGameStore.setState(state => ({
    priceModifier: 1.2,
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'enchanter' as const,
      gold: 500,
      timeRemaining: 60,
      health: 40,
      maxHealth: 100,
      isSick: true,
      hadRandomEventThisTurn: true,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('canonical healer services', () => {
  beforeEach(() => {
    preparePlayer();
  });

  it('uses the host economy price, time and healing amount', () => {
    const player = useGameStore.getState().players[0];

    const result = useGameStore.getState().useHealerService(player.id, 'minor');

    expect(result?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.gold).toBe(470);
    expect(updated.timeRemaining).toBe(59);
    expect(updated.health).toBe(65);
    expect(updated.gameStats.totalGoldSpent).toBeGreaterThanOrEqual(30);
    expect(updated.gameStats.totalHealingReceived).toBeGreaterThanOrEqual(25);
  });

  it('keeps cure and blessing at their canonical fixed prices', () => {
    const playerId = useGameStore.getState().players[0].id;

    expect(useGameStore.getState().useHealerService(playerId, 'cure')?.success).toBe(true);
    let updated = useGameStore.getState().players[0];
    expect(updated.gold).toBe(425);
    expect(updated.timeRemaining).toBe(58);
    expect(updated.isSick).toBe(false);

    expect(useGameStore.getState().useHealerService(playerId, 'blessing')?.success).toBe(true);
    updated = useGameStore.getState().players[0];
    expect(updated.gold).toBe(275);
    expect(updated.timeRemaining).toBe(54);
    expect(updated.maxHealth).toBe(110);
  });

  it('rejects the service outside the Enchanter', () => {
    const playerId = preparePlayer({ currentLocation: 'bank' });

    expect(useGameStore.getState().useHealerService(playerId, 'minor')?.success).toBe(false);
    const updated = useGameStore.getState().players[0];
    expect(updated.gold).toBe(500);
    expect(updated.health).toBe(40);
  });

  it('rejects impossible or unnecessary services without charging', () => {
    const healthyId = preparePlayer({ health: 100, isSick: false });
    expect(useGameStore.getState().useHealerService(healthyId, 'minor')?.success).toBe(false);
    expect(useGameStore.getState().useHealerService(healthyId, 'cure')?.success).toBe(false);
    expect(useGameStore.getState().players[0].gold).toBe(500);
  });

  it('rejects insufficient gold and time', () => {
    const poorId = preparePlayer({ gold: 20 });
    expect(useGameStore.getState().useHealerService(poorId, 'minor')?.success).toBe(false);

    const rushedId = preparePlayer({ timeRemaining: 0 });
    expect(useGameStore.getState().useHealerService(rushedId, 'minor')?.success).toBe(false);
  });

  it('exposes the semantic service and blocks direct sickness mutation', () => {
    const state = useGameStore.getState();
    const player = state.players[0];

    expect(ALLOWED_GUEST_ACTIONS.has('useHealerService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('cureSickness')).toBe(false);
    expect(validateGuestActionArgs(
      'useHealerService',
      [player.id, 'minor'],
      state,
    )).toBeNull();
    expect(validateGuestActionArgs(
      'useHealerService',
      [player.id, 'free-heal'],
      state,
    )).toBe('Invalid healer service');
    expect(validateGuestActionRequest(
      'cureSickness',
      [player.id],
      player.id,
      player.id,
      state,
    )).toBe('Action not allowed');
  });
});
