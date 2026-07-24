import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeAIAction, type StoreActions } from '../actionExecutor';
import type { AIAction } from '../types';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  localStorage.clear();
  useGameStore.setState({ networkMode: 'local' });
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame(['Equipment AI'], false, goals);
  useGameStore.setState(state => ({
    players: state.players.map(player => ({ ...player, isAI: true, ...overrides })),
  }));
  return useGameStore.getState().players[0];
}

function execute(action: AIAction): boolean {
  const player = useGameStore.getState().players[0];
  return executeAIAction(player, action, useGameStore.getState() as unknown as StoreActions);
}

describe('AI canonical equipment and appliance execution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    preparePlayer();
  });

  it('uses the canonical Enchanter appliance price and preserves one shopping hour', () => {
    preparePlayer({
      currentLocation: 'enchanter',
      gold: 2000,
      happiness: 20,
      timeRemaining: 10,
    });
    useGameStore.setState({ priceModifier: 2 });

    const success = execute({
      type: 'buy-appliance',
      priority: 100,
      description: 'Manipulated appliance purchase',
      details: { applianceId: 'scrying-mirror', cost: 1, source: 'fence' },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(950);
    expect(player.happiness).toBe(22);
    expect(player.timeRemaining).toBe(9);
    expect(player.appliances['scrying-mirror']).toMatchObject({
      originalPrice: 1050,
      source: 'enchanter',
    });
  });

  it('uses the canonical Armory item, price and slot instead of AI details', () => {
    preparePlayer({
      currentLocation: 'armory',
      gold: 500,
      happiness: 20,
      timeRemaining: 10,
    });
    useGameStore.setState({ priceModifier: 2 });

    const success = execute({
      type: 'buy-equipment',
      priority: 100,
      description: 'Manipulated equipment purchase',
      details: { itemId: 'sword', cost: 1, slot: 'armor' },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(320);
    expect(player.timeRemaining).toBe(9);
    expect(player.happiness).toBe(22);
    expect(player.durables.sword).toBe(1);
    expect(player.equipmentDurability.sword).toBe(100);
    expect(player.equippedWeapon).toBe('sword');
    expect(player.equippedArmor).not.toBe('sword');
  });

  it('uses canonical temper cost, slot, time and happiness', () => {
    preparePlayer({
      currentLocation: 'forge',
      gold: 300,
      happiness: 20,
      timeRemaining: 10,
      durables: { sword: 1 },
      equipmentDurability: { sword: 100 },
    });
    useGameStore.setState({ priceModifier: 2 });

    const success = execute({
      type: 'temper-equipment',
      priority: 100,
      description: 'Manipulated tempering',
      details: { itemId: 'sword', cost: 1, slot: 'shield' },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(192);
    expect(player.timeRemaining).toBe(7);
    expect(player.happiness).toBe(22);
    expect(player.temperedItems).toContain('sword');
  });

  it('uses canonical repair cost and durability-derived service time', () => {
    preparePlayer({
      currentLocation: 'forge',
      gold: 100,
      timeRemaining: 10,
      durables: { sword: 1 },
      equipmentDurability: { sword: 50 },
    });

    const success = execute({
      type: 'repair-equipment',
      priority: 100,
      description: 'Manipulated equipment repair',
      details: { itemId: 'sword', cost: 1 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(86);
    expect(player.timeRemaining).toBe(8);
    expect(player.equipmentDurability.sword).toBe(100);
  });

  it('uses canonical pawn value instead of the AI-provided amount', () => {
    preparePlayer({
      currentLocation: 'fence',
      gold: 100,
      happiness: 20,
      appliances: {
        'memory-crystal': {
          itemId: 'memory-crystal',
          originalPrice: 500,
          source: 'market',
          isBroken: false,
          purchasedFirstTime: true,
        },
      },
    });
    useGameStore.setState({ priceModifier: 2 });

    const success = execute({
      type: 'pawn-appliance',
      priority: 100,
      description: 'Manipulated pawn value',
      details: { applianceId: 'memory-crystal', pawnValue: 9999 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(500);
    expect(player.happiness).toBe(19);
    expect(player.appliances['memory-crystal']).toBeUndefined();
    expect(player.pawnedAppliances?.[0]).toMatchObject({ originalPrice: 500 });
  });

  it('selects appliance repair service from the authoritative location', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    preparePlayer({
      currentLocation: 'enchanter',
      gold: 100,
      timeRemaining: 10,
      appliances: {
        'scrying-mirror': {
          itemId: 'scrying-mirror',
          originalPrice: 500,
          source: 'enchanter',
          isBroken: true,
          purchasedFirstTime: true,
        },
      },
    });

    const success = execute({
      type: 'repair-appliance',
      priority: 100,
      description: 'Manipulated repair location',
      details: { applianceId: 'scrying-mirror', location: 'forge', cost: 1 },
    });

    const player = useGameStore.getState().players[0];
    expect(success).toBe(true);
    expect(player.gold).toBe(75);
    expect(player.timeRemaining).toBe(8);
    expect(player.appliances['scrying-mirror'].isBroken).toBe(false);
  });

  it('rejects asset services away from their canonical locations without mutation', () => {
    preparePlayer({
      currentLocation: 'academy',
      gold: 1000,
      timeRemaining: 10,
      durables: { sword: 1 },
      equipmentDurability: { sword: 50 },
    });

    const before = useGameStore.getState().players[0];
    const success = execute({
      type: 'repair-equipment',
      priority: 100,
      description: 'Repair away from Forge',
      details: { itemId: 'sword', cost: 1 },
    });
    const after = useGameStore.getState().players[0];

    expect(success).toBe(false);
    expect(after.gold).toBe(before.gold);
    expect(after.timeRemaining).toBe(before.timeRemaining);
    expect(after.equipmentDurability.sword).toBe(50);
  });
});
