import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateGuestActionArgs } from '@/network/actionValidation';
import { serializeGameState } from '@/network/networkState';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

function prepareDungeonPlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState({ networkMode: 'local', dungeonRuns: {} });
  useGameStore.getState().startNewGame(['Dungeon Tester'], false, goals);
  useGameStore.setState(state => ({
    activeFestival: null,
    dungeonRuns: {},
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'cave' as const,
      completedDegrees: ['combat-training'] as const,
      health: 100,
      maxHealth: 100,
      timeRemaining: 60,
      gold: 10,
      happiness: 50,
      dependability: 50,
      dungeonAttemptsThisTurn: 0,
      equippedWeapon: 'dagger',
      durables: { ...player.durables, dagger: 1, sword: 1 },
      equipmentDurability: { ...player.equipmentDurability, dagger: 100, sword: 100 },
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative interactive dungeon sessions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    prepareDungeonPlayer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates entry and atomically charges canonical first-encounter time and attempt', () => {
    const playerId = useGameStore.getState().players[0].id;

    const result = useGameStore.getState().beginDungeonRun(playerId, 1);

    expect(result?.success).toBe(true);
    const state = useGameStore.getState();
    expect(state.players[0].timeRemaining).toBe(58); // ceil(6h floor / 4 encounters)
    expect(state.players[0].dungeonAttemptsThisTurn).toBe(1);
    expect(state.players[0].gameStats.totalDungeonRuns).toBe(1);
    expect(state.dungeonRuns[playerId]?.floorId).toBe(1);
    expect(state.dungeonRuns[playerId]?.equippedItems.weapon).toBe('dagger');
  });

  it('rejects invalid floors, wrong location, exhausted attempts and insufficient time', () => {
    const playerId = useGameStore.getState().players[0].id;
    expect(useGameStore.getState().beginDungeonRun(playerId, 99)?.success).toBe(false);

    const wrongLocationId = prepareDungeonPlayer({ currentLocation: 'bank' });
    expect(useGameStore.getState().beginDungeonRun(wrongLocationId, 1)?.success).toBe(false);

    const tiredId = prepareDungeonPlayer({ dungeonAttemptsThisTurn: 2 });
    expect(useGameStore.getState().beginDungeonRun(tiredId, 1)?.success).toBe(false);

    const noTimeId = prepareDungeonPlayer({ timeRemaining: 1 });
    expect(useGameStore.getState().beginDungeonRun(noTimeId, 1)?.success).toBe(false);
  });

  it('resolves encounters on the host and writes authoritative health and run state', () => {
    const playerId = useGameStore.getState().players[0].id;
    useGameStore.getState().beginDungeonRun(playerId, 1);

    const result = useGameStore.getState().resolveDungeonEncounter(playerId);

    expect(result?.success).toBe(true);
    const state = useGameStore.getState();
    const session = state.dungeonRuns[playerId];
    expect(session.runState.results).toHaveLength(1);
    expect(state.players[0].health).toBe(session.runState.currentHealth);
    expect(session.runState.phase).toBe('encounter-result');
  });

  it('charges canonical time only when continuing to another encounter', () => {
    const playerId = useGameStore.getState().players[0].id;
    useGameStore.getState().beginDungeonRun(playerId, 1);
    useGameStore.getState().resolveDungeonEncounter(playerId);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(58);

    const result = useGameStore.getState().advanceDungeonRun(playerId, 'continue');

    expect(result?.success).toBe(true);
    const state = useGameStore.getState();
    expect(state.players[0].timeRemaining).toBe(56);
    expect(state.dungeonRuns[playerId].runState.currentEncounterIndex).toBe(1);
    expect(state.dungeonRuns[playerId].runState.phase).toBe('encounter-intro');
  });

  it('rejects premature settlement and blocks ending the turn during an active run', () => {
    const playerId = useGameStore.getState().players[0].id;
    useGameStore.getState().beginDungeonRun(playerId, 1);
    expect(useGameStore.getState().finalizeDungeonRun(playerId)?.success).toBe(false);

    const before = useGameStore.getState();
    useGameStore.getState().endTurn();
    const after = useGameStore.getState();
    expect(after.week).toBe(before.week);
    expect(after.currentPlayerIndex).toBe(before.currentPlayerIndex);
    expect(after.players[0].timeRemaining).toBe(before.players[0].timeRemaining);
    expect(after.dungeonRuns[playerId]).toBeDefined();
  });

  it('settles canonical rewards and applies wear to the snapshotted equipment', () => {
    const playerId = useGameStore.getState().players[0].id;
    useGameStore.getState().beginDungeonRun(playerId, 1);
    const session = useGameStore.getState().dungeonRuns[playerId];
    const encounter = session.runState.encounters[0];
    const encounterResult = {
      encounter,
      damageDealt: 12,
      goldEarned: 100,
      healed: 0,
      blocked: false,
      disarmed: false,
      potionFound: false,
      potionHealed: 0,
      bonusesActivated: [],
      durabilityLoss: { weaponLoss: 10, armorLoss: 0, shieldLoss: 0 },
    };

    useGameStore.setState(state => ({
      dungeonRuns: {
        ...state.dungeonRuns,
        [playerId]: {
          ...session,
          runState: {
            ...session.runState,
            phase: 'floor-summary',
            results: [encounterResult],
            totalGold: 100,
            totalDamage: 12,
            totalHealed: 0,
            bossDefeated: true,
            retreated: false,
            isFirstClear: true,
            rareDropName: null,
            hexScrollDropId: null,
            totalDurabilityLoss: { weaponLoss: 10, armorLoss: 0, shieldLoss: 0 },
          },
        },
      },
      players: state.players.map(player => player.id !== playerId ? player : {
        ...player,
        // Simulate a malicious mid-run equipment switch. Wear must stay on dagger.
        equippedWeapon: 'sword',
        equipmentDurability: { ...player.equipmentDurability, dagger: 100, sword: 100 },
      }),
    }));

    const result = useGameStore.getState().finalizeDungeonRun(playerId);

    expect(result?.success).toBe(true);
    expect(result?.summary?.goldEarned).toBe(80); // novice loot multiplier = 0.8
    const state = useGameStore.getState();
    const player = state.players[0];
    expect(player.gold).toBe(90);
    expect(player.happiness).toBe(53);
    expect(player.dungeonFloorsCleared).toContain(1);
    expect(player.equipmentDurability.dagger).toBe(90);
    expect(player.equipmentDurability.sword).toBe(100);
    expect(player.dungeonRecords[1].totalGold).toBe(80);
    expect(player.gameStats.totalGoldEarned).toBe(80);
    expect(state.dungeonRuns[playerId]).toBeUndefined();
  });

  it('syncs sessions and exposes only semantic dungeon actions to guests', () => {
    const playerId = useGameStore.getState().players[0].id;
    useGameStore.getState().beginDungeonRun(playerId, 1);

    expect(serializeGameState().dungeonRuns?.[playerId]).toBeDefined();
    for (const action of ['beginDungeonRun', 'resolveDungeonEncounter', 'advanceDungeonRun', 'finalizeDungeonRun']) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(true);
    }
    expect(ALLOWED_GUEST_ACTIONS.has('incrementDungeonAttempts')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('applyDurabilityLoss')).toBe(false);

    const store = useGameStore.getState();
    expect(validateGuestActionArgs('beginDungeonRun', [playerId, 1], store)).toBeNull();
    expect(validateGuestActionArgs('beginDungeonRun', [playerId, 7], store)).toBe('dungeon floor out of range');
    expect(validateGuestActionArgs('advanceDungeonRun', [playerId, 'free-gold'], store)).toBe('Invalid dungeon action');
    expect(validateGuestActionArgs('finalizeDungeonRun', [playerId, 999], store)).toBe('Invalid dungeon arguments');
  });
});
