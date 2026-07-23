import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('atomic host-authoritative services', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Tester'], false, goals);
  });

  it('rejects healer services away from the Enchanter without changing state', () => {
    const before = useGameStore.getState().players[0];
    const result = useGameStore.getState().useHealerService(before.id, 'minor');
    const after = useGameStore.getState().players[0];

    expect(result).toEqual({ success: false, message: 'Visit the Enchanter first' });
    expect(after.gold).toBe(before.gold);
    expect(after.timeRemaining).toBe(before.timeRemaining);
    expect(after.health).toBe(before.health);
  });

  it('applies healer cost, time and effect atomically', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'enchanter',
        health: 40,
        gold: 100,
        timeRemaining: 10,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().useHealerService(playerId, 'minor');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(75);
    expect(player.timeRemaining).toBe(9);
    expect(player.health).toBe(65);
    expect(player.gameStats.totalGoldSpent).toBe(25);
    expect(player.gameStats.totalHealingReceived).toBe(25);
  });

  it('uses canonical graveyard pricing and rejects client-controlled values', () => {
    useGameStore.setState(state => ({
      priceModifier: 1.2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'graveyard',
        gold: 100,
        happiness: 40,
        timeRemaining: 10,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().useGraveyardService(playerId, 'pray');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(88);
    expect(player.timeRemaining).toBe(8);
    expect(player.happiness).toBe(45);
  });

  it('rejects invalid wagers without charging the player', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 100,
        timeRemaining: 10,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().gambleAtFence(playerId, 999);
    const player = useGameStore.getState().players[0];

    expect(result).toEqual({ success: false, message: 'Invalid wager' });
    expect(player.gold).toBe(100);
    expect(player.timeRemaining).toBe(10);
  });

  it('resolves a valid wager in one state update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 100,
        happiness: 50,
        timeRemaining: 10,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().gambleAtFence(playerId, 10);
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(115);
    expect(player.timeRemaining).toBe(8);
    expect(player.happiness).toBe(55);
    expect(useGameStore.getState().phase).toBe('event');

    vi.restoreAllMocks();
  });

  it('purchases a newspaper only at the canonical vendor price', () => {
    useGameStore.setState(state => ({
      priceModifier: 1,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'general-store',
        gold: 100,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseNewspaper(playerId, 'general-store');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBeLessThan(100);
    expect(player.hasNewspaper).toBe(true);
  });
});
