import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { getFenceInventorySellPrice } from '@/store/helpers/economy/inventoryTradeHelpers';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('host-authoritative inventory trade', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Inventory Tester'], false, goals);
  });

  it('calculates the Fence sale price from canonical item data', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 10,
        inventory: ['healing-potion'],
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().sellInventoryItem(playerId, 'healing-potion');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(getFenceInventorySellPrice('healing-potion', 2)).toBe(75);
    expect(player.gold).toBe(85);
    expect(player.inventory).toEqual([]);
    expect(player.gameStats.totalGoldEarned).toBeGreaterThanOrEqual(75);
  });

  it('rejects inventory sales away from the Fence', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'guild-hall',
        gold: 10,
        inventory: ['healing-potion'],
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().sellInventoryItem(playerId, 'healing-potion');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(false);
    expect(player.gold).toBe(10);
    expect(player.inventory).toEqual(['healing-potion']);
  });

  it('rejects an item the player does not own', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({ ...player, currentLocation: 'fence', inventory: [] })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().sellInventoryItem(playerId, 'healing-potion');

    expect(result?.success).toBe(false);
  });

  it('removes one matching item and uses the canonical fallback for unknown inventory', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 0,
        inventory: ['quest-token', 'quest-token'],
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().sellInventoryItem(playerId, 'quest-token');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(5);
    expect(player.inventory).toEqual(['quest-token']);
  });

  it('allows semantic sales and blocks client-priced inventory actions', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('sellInventoryItem')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyItem')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('sellItem')).toBe(false);
  });
});
