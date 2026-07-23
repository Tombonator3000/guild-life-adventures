import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('host-authoritative appliance services', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Appliance Tester'], false, goals);
  });

  it('resolves Enchanter price, source and first-purchase happiness on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'enchanter',
        gold: 2000,
        happiness: 20,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseAppliance(playerId, 'enchanter', 'scrying-mirror');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(950);
    expect(player.happiness).toBe(22);
    expect(player.appliances['scrying-mirror']).toMatchObject({
      originalPrice: 1050,
      source: 'enchanter',
      isBroken: false,
    });
  });

  it('rejects duplicate purchases even when the owned appliance is broken', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'enchanter',
        gold: 2000,
        appliances: {
          ...player.appliances,
          'scrying-mirror': {
            itemId: 'scrying-mirror',
            originalPrice: 525,
            source: 'enchanter',
            isBroken: true,
            purchasedFirstTime: true,
          },
        },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseAppliance(playerId, 'enchanter', 'scrying-mirror');

    expect(result?.success).toBe(false);
    expect(useGameStore.getState().players[0].gold).toBe(2000);
  });

  it('uses the canonical market price at the Shadow Market', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'shadow-market',
        gold: 2000,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseAppliance(playerId, 'shadow-market', 'memory-crystal');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(1500);
    expect(player.appliances['memory-crystal'].source).toBe('market');
  });

  it('charges the canonical Fence price and one hour', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 1000,
        timeRemaining: 10,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseAppliance(playerId, 'fence', 'scrying-mirror');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(738);
    expect(player.timeRemaining).toBe(9);
    expect(player.appliances['scrying-mirror'].source).toBe('pawn');
  });

  it('requires a working Preservation Box for a Frost Chest', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'enchanter',
        gold: 5000,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseAppliance(playerId, 'enchanter', 'frost-chest');

    expect(result?.success).toBe(false);
    expect(useGameStore.getState().players[0].appliances['frost-chest']).toBeUndefined();
  });

  it('repairs at the Enchanter with host-calculated cost and time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'enchanter',
        gold: 100,
        timeRemaining: 10,
        appliances: {
          ...player.appliances,
          'scrying-mirror': {
            itemId: 'scrying-mirror',
            originalPrice: 500,
            source: 'enchanter',
            isBroken: true,
            purchasedFirstTime: true,
          },
        },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().useApplianceService(playerId, 'repair-enchanter', 'scrying-mirror');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(75);
    expect(player.timeRemaining).toBe(8);
    expect(player.appliances['scrying-mirror'].isBroken).toBe(false);
  });

  it('pawns and redeems with host-calculated values and location checks', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 100,
        happiness: 20,
        appliances: {
          ...player.appliances,
          'memory-crystal': {
            itemId: 'memory-crystal',
            originalPrice: 500,
            source: 'market',
            isBroken: false,
            purchasedFirstTime: true,
          },
        },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const pawn = useGameStore.getState().useApplianceService(playerId, 'pawn', 'memory-crystal');
    const afterPawn = useGameStore.getState().players[0];

    expect(pawn?.success).toBe(true);
    expect(afterPawn.gold).toBe(500);
    expect(afterPawn.happiness).toBe(19);
    expect(afterPawn.appliances['memory-crystal']).toBeUndefined();
    expect(afterPawn.pawnedAppliances?.[0]).toMatchObject({ originalPrice: 500 });

    const redeem = useGameStore.getState().useApplianceService(playerId, 'redeem', 'memory-crystal');
    const afterRedeem = useGameStore.getState().players[0];

    expect(redeem?.success).toBe(true);
    expect(afterRedeem.gold).toBe(250);
    expect(afterRedeem.appliances['memory-crystal'].source).toBe('pawn');
    expect(afterRedeem.pawnedAppliances).toEqual([]);
  });

  it('removes client-priced appliance actions from the guest allowlist', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseAppliance')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useApplianceService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('repairAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('pawnAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('redeemAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairAppliance')).toBe(false);
  });
});
