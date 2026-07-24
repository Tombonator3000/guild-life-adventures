import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAIAction, type StoreActions } from '../actionExecutor';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('AI canonical inventory sale execution', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Seller AI'], false, goals);
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        isAI: true,
        currentLocation: 'fence' as const,
        gold: 10,
        inventory: ['investment-document'],
      })),
    }));
  });

  it('uses sellInventoryItem even when the passed legacy sell binding is unusable', () => {
    const player = useGameStore.getState().players[0];
    const legacySell = vi.fn(() => {
      throw new Error('legacy sellItem should not be called');
    });
    const store = {
      ...useGameStore.getState(),
      sellItem: legacySell,
      sellInventoryItem: undefined,
    } as unknown as StoreActions;

    const success = executeAIAction(player, {
      type: 'sell-item',
      priority: 100,
      description: 'Sell quest item at the Fence',
      details: { itemId: 'investment-document', price: 9999 },
    }, store);

    const after = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(legacySell).not.toHaveBeenCalled();
    expect(after.inventory).not.toContain('investment-document');
    expect(after.gold).toBe(15);
  });

  it('rejects sales away from the Fence without removing the item', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({ ...player, currentLocation: 'bank' as const })),
    }));
    const player = useGameStore.getState().players[0];

    const success = executeAIAction(player, {
      type: 'sell-item',
      priority: 100,
      description: 'Sell away from Fence',
      details: { itemId: 'investment-document' },
    }, useGameStore.getState() as unknown as StoreActions);

    const after = useGameStore.getState().players[0];
    expect(success).toBe(false);
    expect(after.inventory).toContain('investment-document');
    expect(after.gold).toBe(10);
  });
});
