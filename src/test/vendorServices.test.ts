import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('host-authoritative vendor purchases', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Shopper'], false, goals);
  });

  it('resolves General Store food value and price on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'general-store',
        gold: 100,
        foodLevel: 20,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseVendorItem(playerId, 'general-store', 'bread');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(84);
    expect(player.foodLevel).toBe(30);
  });

  it('uses canonical fresh-food units and storage rules', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'general-store',
        gold: 100,
        freshFood: 5,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const first = useGameStore.getState().purchaseVendorItem(playerId, 'general-store', 'fresh-meat');
    const afterFirst = useGameStore.getState().players[0];

    expect(first?.success).toBe(true);
    expect(afterFirst.freshFood).toBe(6);
    expect(afterFirst.foodBoughtWithoutPreservation).toBe(true);

    const second = useGameStore.getState().purchaseVendorItem(playerId, 'general-store', 'fresh-meat');
    expect(second?.success).toBe(false);
    expect(useGameStore.getState().players[0].gold).toBe(afterFirst.gold);
  });

  it('applies the Shadow Market discount and canonical happiness effect', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'shadow-market',
        gold: 100,
        happiness: 20,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseVendorItem(playerId, 'shadow-market', 'stolen-goods');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(58);
    expect(player.happiness).toBe(23);
  });

  it('prevents duplicate weekend tickets', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'shadow-market',
        gold: 100,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const first = useGameStore.getState().purchaseVendorItem(playerId, 'shadow-market', 'jousting-ticket');
    const goldAfterFirst = useGameStore.getState().players[0].gold;
    const second = useGameStore.getState().purchaseVendorItem(playerId, 'shadow-market', 'jousting-ticket');

    expect(first?.success).toBe(true);
    expect(second?.success).toBe(false);
    expect(useGameStore.getState().players[0].tickets).toEqual(['jousting']);
    expect(useGameStore.getState().players[0].gold).toBe(goldAfterFirst);
  });

  it('handles lottery tickets and scholar items without client prices', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'shadow-market',
        gold: 500,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const lottery = useGameStore.getState().purchaseVendorItem(playerId, 'shadow-market', 'lottery-ticket');
    const scholar = useGameStore.getState().purchaseVendorItem(playerId, 'shadow-market', 'dictionary');
    const duplicate = useGameStore.getState().purchaseVendorItem(playerId, 'shadow-market', 'dictionary');
    const player = useGameStore.getState().players[0];

    expect(lottery?.success).toBe(true);
    expect(scholar?.success).toBe(true);
    expect(duplicate?.success).toBe(false);
    expect(player.lotteryTickets).toBe(1);
    expect(player.durables.dictionary).toBe(1);
  });

  it('rejects the right item at the wrong location', () => {
    const playerId = useGameStore.getState().players[0].id;
    const before = useGameStore.getState().players[0];
    const result = useGameStore.getState().purchaseVendorItem(playerId, 'general-store', 'bread');
    const after = useGameStore.getState().players[0];

    expect(result?.success).toBe(false);
    expect(after.gold).toBe(before.gold);
    expect(after.foodLevel).toBe(before.foodLevel);
  });

  it('removes numeric vendor actions from the guest allowlist', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseVendorItem')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyFreshFood')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('buyFoodWithSpoilage')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('buyLotteryTicket')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('buyTicket')).toBe(false);
  });
});
