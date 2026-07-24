import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePlayer } from '@/data/saveLoad';
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
  useGameStore.getState().startNewGame(['Tavern Tester'], false, goals);
  useGameStore.setState(state => ({
    priceModifier: 1.2,
    eventMessage: null,
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'rusty-tankard' as const,
      gold: 500,
      foodLevel: 80,
      happiness: 90,
      health: 100,
      tavernAlesDrunkThisTurn: 0,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative Tavern purchases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    preparePlayer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the canonical economy price and applies capped food atomically', () => {
    const playerId = useGameStore.getState().players[0].id;

    const result = useGameStore.getState().purchaseTavernItem(playerId, 'roast');

    expect(result?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.gold).toBe(474); // round(22 * 1.2)
    expect(updated.foodLevel).toBe(100);
    expect(updated.gameStats.totalGoldSpent).toBeGreaterThanOrEqual(26);
  });

  it('rejects unknown items, wrong locations and insufficient gold without mutation', () => {
    const playerId = useGameStore.getState().players[0].id;
    expect(useGameStore.getState().purchaseTavernItem(playerId, 'free-feast')?.success).toBe(false);

    const wrongLocationId = preparePlayer({ currentLocation: 'bank' });
    expect(useGameStore.getState().purchaseTavernItem(wrongLocationId, 'stew')?.success).toBe(false);

    const poorId = preparePlayer({ gold: 1 });
    expect(useGameStore.getState().purchaseTavernItem(poorId, 'stew')?.success).toBe(false);
    expect(useGameStore.getState().players[0].gold).toBe(1);
  });

  it('keeps the ale count in authoritative player state across repeated calls', () => {
    const playerId = useGameStore.getState().players[0].id;
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    for (let i = 0; i < 6; i += 1) {
      expect(useGameStore.getState().purchaseTavernItem(playerId, 'ale')?.success).toBe(true);
    }

    const updated = useGameStore.getState().players[0];
    expect(updated.tavernAlesDrunkThisTurn).toBe(6);
    expect(updated.happiness).toBe(96);
    expect(useGameStore.getState().eventMessage).toBeNull();
  });

  it('resolves brawl chance, damage and message on the host after the sixth ale', () => {
    const playerId = preparePlayer({ tavernAlesDrunkThisTurn: 6, health: 100 });
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1) // brawl chance
      .mockReturnValueOnce(0.5) // 10 damage
      .mockReturnValueOnce(0); // first message

    const result = useGameStore.getState().purchaseTavernItem(playerId, 'ale');

    expect(result?.success).toBe(true);
    const updated = useGameStore.getState().players[0];
    expect(updated.tavernAlesDrunkThisTurn).toBe(7);
    expect(updated.health).toBe(90);
    expect(useGameStore.getState().eventMessage).toContain('Tavern Brawl!');
    expect(result?.message).toContain('10 damage');
  });

  it('resets the next player ale counter when their turn starts', () => {
    useGameStore.getState().startNewGame(['First', 'Second'], false, goals);
    useGameStore.setState(state => ({
      players: state.players.map((player, index) => ({
        ...player,
        tavernAlesDrunkThisTurn: index === 0 ? 7 : 5,
        hadRandomEventThisTurn: true,
      })),
      currentPlayerIndex: 0,
    }));
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    useGameStore.getState().endTurn();

    const state = useGameStore.getState();
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.players[1].tavernAlesDrunkThisTurn).toBe(0);
  });

  it('backfills old saves and validates only semantic Tavern item IDs', () => {
    const oldPlayer: Record<string, unknown> = { completedQuests: 0, gameStats: {} };
    normalizePlayer(oldPlayer);
    expect(oldPlayer.tavernAlesDrunkThisTurn).toBe(0);

    const state = useGameStore.getState();
    const playerId = state.players[0].id;
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseTavernItem')).toBe(true);
    expect(validateGuestActionArgs('purchaseTavernItem', [playerId, 'stew'], state)).toBeNull();
    expect(validateGuestActionArgs('purchaseTavernItem', [playerId, 999], state)).toBe('Invalid tavern item');
  });
});
