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

describe('host-authoritative equipment services', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Equipment Tester'], false, goals);
  });

  it('resolves Armory equipment price and effect on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'armory',
        gold: 500,
        happiness: 20,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseEquipmentItem(playerId, 'armory', 'sword', 'primary');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(320);
    expect(player.happiness).toBe(22);
    expect(player.durables.sword).toBe(1);
    expect(player.equipmentDurability.sword).toBe(100);
  });

  it('enforces dungeon-floor requirements for Armory equipment', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'armory',
        gold: 1000,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseEquipmentItem(playerId, 'armory', 'steel-sword', 'primary');

    expect(result?.success).toBe(false);
    expect(useGameStore.getState().players[0].durables['steel-sword']).toBeUndefined();
  });

  it('sets clothing condition instead of adding the item value', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'armory',
        gold: 500,
        happiness: 20,
        clothingCondition: 20,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseEquipmentItem(playerId, 'armory', 'fine-clothes', 'primary');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(380);
    expect(player.clothingCondition).toBe(60);
    expect(player.happiness).toBe(22);
  });

  it('calculates backup-outfit price and condition on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'armory',
        gold: 500,
        backupOutfit: 35,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseEquipmentItem(playerId, 'armory', 'fine-clothes', 'backup');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(380);
    expect(player.backupOutfit).toBe(60);
  });

  it('resolves used equipment price, time and auto-equip at the Fence', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'fence',
        gold: 200,
        timeRemaining: 10,
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().purchaseEquipmentItem(playerId, 'fence-used', 'used-sword', 'primary');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(136);
    expect(player.timeRemaining).toBe(9);
    expect(player.durables.sword).toBe(1);
    expect(player.equippedWeapon).toBe('sword');
  });

  it('resolves temper cost, time and happiness on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'forge',
        gold: 300,
        happiness: 20,
        timeRemaining: 10,
        durables: { ...player.durables, sword: 1 },
        equipmentDurability: { ...player.equipmentDurability, sword: 100 },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().useEquipmentService(playerId, 'temper', 'sword');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(192);
    expect(player.timeRemaining).toBe(7);
    expect(player.happiness).toBe(22);
    expect(player.temperedItems).toContain('sword');
  });

  it('resolves repair cost and time from canonical durability', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'forge',
        gold: 100,
        timeRemaining: 10,
        durables: { ...player.durables, sword: 1 },
        equipmentDurability: { ...player.equipmentDurability, sword: 50 },
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().useEquipmentService(playerId, 'repair', 'sword');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(86);
    expect(player.timeRemaining).toBe(8);
    expect(player.equipmentDurability.sword).toBe(100);
  });

  it('resolves salvage value, time and equipped cleanup on the host', () => {
    useGameStore.setState(state => ({
      priceModifier: 2,
      players: state.players.map(player => ({
        ...player,
        currentLocation: 'forge',
        gold: 0,
        timeRemaining: 10,
        durables: { ...player.durables, sword: 1 },
        equipmentDurability: { ...player.equipmentDurability, sword: 40 },
        temperedItems: [...player.temperedItems, 'sword'],
        equippedWeapon: 'sword',
      })),
    }));

    const playerId = useGameStore.getState().players[0].id;
    const result = useGameStore.getState().useEquipmentService(playerId, 'salvage', 'sword');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(108);
    expect(player.timeRemaining).toBe(9);
    expect(player.durables.sword).toBeUndefined();
    expect(player.equipmentDurability.sword).toBeUndefined();
    expect(player.temperedItems).not.toContain('sword');
    expect(player.equippedWeapon).toBeNull();
  });

  it('exposes semantic actions and blocks client-priced equipment actions', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseEquipmentItem')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useEquipmentService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyDurable')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('sellDurable')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairEquipment')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(false);
  });
});
