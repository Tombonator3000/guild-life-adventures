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
  useGameStore.setState({ networkMode: 'local', dungeonRuns: {} });
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame(['Dungeon AI'], false, goals);
  useGameStore.setState(state => ({
    activeFestival: null,
    dungeonRuns: {},
    players: state.players.map(player => ({
      ...player,
      isAI: true,
      currentLocation: 'cave' as const,
      completedDegrees: ['combat-training'],
      health: 100,
      maxHealth: 100,
      timeRemaining: 60,
      gold: 10,
      happiness: 50,
      dependability: 50,
      dungeonAttemptsThisTurn: 0,
      equippedWeapon: 'dagger',
      durables: { ...player.durables, dagger: 1 },
      equipmentDurability: { ...player.equipmentDurability, dagger: 100 },
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0];
}

function action(floorId: unknown = 1): AIAction {
  return {
    type: 'explore-dungeon',
    priority: 100,
    description: 'Auto-resolve dungeon',
    details: { floorId, timeCost: 0, goldEarned: 9999, healthChange: 999 },
  };
}

function executeWithRawMutatorsBlocked(dungeonAction: AIAction) {
  const rawMutators = {
    spendTime: vi.fn(() => { throw new Error('raw spendTime used'); }),
    modifyGold: vi.fn(() => { throw new Error('raw modifyGold used'); }),
    modifyHealth: vi.fn(() => { throw new Error('raw modifyHealth used'); }),
    modifyHappiness: vi.fn(() => { throw new Error('raw modifyHappiness used'); }),
    clearDungeonFloor: vi.fn(() => { throw new Error('raw clearDungeonFloor used'); }),
    applyRareDrop: vi.fn(() => { throw new Error('raw applyRareDrop used'); }),
    applyDurabilityLoss: vi.fn(() => { throw new Error('raw applyDurabilityLoss used'); }),
  };
  const store = {
    ...useGameStore.getState(),
    ...rawMutators,
  } as unknown as StoreActions;
  const player = useGameStore.getState().players[0];
  return {
    success: executeAIAction(player, dungeonAction, store),
    rawMutators,
  };
}

describe('AI canonical dungeon session execution', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    preparePlayer();
  });

  it('drives a full host-owned session without passed raw mutators', () => {
    const playerId = useGameStore.getState().players[0].id;
    const { success, rawMutators } = executeWithRawMutatorsBlocked(action(1));

    expect(success).toBe(true);
    for (const mutator of Object.values(rawMutators)) {
      expect(mutator).not.toHaveBeenCalled();
    }

    const state = useGameStore.getState();
    const player = state.players[0];
    expect(state.dungeonRuns[playerId]).toBeUndefined();
    expect(player.dungeonAttemptsThisTurn).toBe(1);
    expect(player.gameStats.totalDungeonRuns).toBe(1);
    expect(player.timeRemaining).toBeLessThan(60);
    expect(player.dungeonRecords[1]).toBeDefined();
  });

  it('uses host floor requirements instead of trusting the requested floor', () => {
    const before = useGameStore.getState().players[0];
    const success = executeAIAction(
      before,
      action(2),
      useGameStore.getState() as unknown as StoreActions,
    );
    const after = useGameStore.getState().players[0];

    expect(success).toBe(false);
    expect(after.dungeonAttemptsThisTurn).toBe(0);
    expect(after.timeRemaining).toBe(before.timeRemaining);
    expect(after.dungeonRecords[2]).toBeUndefined();
  });

  it('rejects a run away from the Cave without state mutation', () => {
    preparePlayer({ currentLocation: 'bank' });
    const before = useGameStore.getState().players[0];
    const success = executeAIAction(
      before,
      action(1),
      useGameStore.getState() as unknown as StoreActions,
    );
    const after = useGameStore.getState().players[0];

    expect(success).toBe(false);
    expect(after.timeRemaining).toBe(before.timeRemaining);
    expect(after.dungeonAttemptsThisTurn).toBe(0);
    expect(useGameStore.getState().dungeonRuns[before.id]).toBeUndefined();
  });

  it('leaves and finalizes cleanly when time runs out between encounters', () => {
    const player = preparePlayer({ timeRemaining: 2 });
    const success = executeAIAction(
      player,
      action(1),
      useGameStore.getState() as unknown as StoreActions,
    );
    const state = useGameStore.getState();
    const after = state.players[0];

    expect(success).toBe(true);
    expect(after.timeRemaining).toBe(0);
    expect(after.dungeonAttemptsThisTurn).toBe(1);
    expect(after.dungeonRecords[1]).toBeDefined();
    expect(state.dungeonRuns[player.id]).toBeUndefined();
  });

  it('rejects malformed floor IDs before creating a session', () => {
    const player = useGameStore.getState().players[0];
    const success = executeAIAction(
      player,
      action('1'),
      useGameStore.getState() as unknown as StoreActions,
    );

    expect(success).toBe(false);
    expect(useGameStore.getState().dungeonRuns[player.id]).toBeUndefined();
    expect(useGameStore.getState().players[0].dungeonAttemptsThisTurn).toBe(0);
  });
});
