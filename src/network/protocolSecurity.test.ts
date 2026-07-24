import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { executeAction } from './networkState';
import {
  processGuestActionRequest,
  validateGuestActionRequest,
  validateGuestActionArgs,
} from './actionValidation';

const goals = {
  wealth: 5000,
  happiness: 100,
  education: 45,
  career: 75,
  adventure: 0,
};

describe('guest action protocol security', () => {
  beforeEach(() => {
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice', 'Bob'], false, goals);
    useGameStore.setState(state => ({
      phase: 'playing',
      currentPlayerIndex: 0,
      weather: null,
      players: state.players.map((player, index) => index === 0
        ? { ...player, gold: 1000, currentLocation: 'general-store' as const, hadRandomEventThisTurn: true }
        : player),
    }));
  });

  it('rejects a connected player acting outside their turn before execution', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];
    const bob = state.players[1];
    const executor = vi.fn(() => true);

    const result = processGuestActionRequest(
      'purchaseVendorItem',
      [alice.id, 'general-store', 'bread'],
      alice.id,
      bob.id,
      state,
      executor,
    );

    expect(result).toEqual({ success: false, error: 'Not your turn', validated: false });
    expect(executor).not.toHaveBeenCalled();
  });

  it('rejects host-internal and local-only actions before execution', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];
    const executor = vi.fn(() => true);

    for (const action of ['startNewGame', 'processWeekEnd', 'saveToSlot', 'setDebugWeather']) {
      const result = processGuestActionRequest(action, [alice.id], alice.id, alice.id, state, executor);
      expect(result).toEqual({ success: false, error: 'Action not allowed', validated: false });
    }
    expect(executor).not.toHaveBeenCalled();
  });

  it('rejects spoofed and missing player identities', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];
    const bob = state.players[1];

    expect(validateGuestActionRequest(
      'transferBankFunds',
      [bob.id, 'deposit', 50],
      alice.id,
      alice.id,
      state,
    )).toBe('Cannot act as another player');

    expect(validateGuestActionRequest(
      'transferBankFunds',
      [],
      alice.id,
      alice.id,
      state,
    )).toBe('Missing player identity');
  });

  it('rejects raw time mutations and malformed or legacy travel requests', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];

    expect(validateGuestActionRequest('spendTime', [alice.id, 1], alice.id, alice.id, state)).toBe('Action not allowed');
    expect(validateGuestActionRequest('spendTime', [alice.id, -60], alice.id, alice.id, state)).toBe('Action not allowed');
    expect(validateGuestActionRequest('movePlayer', [alice.id, 'bank', 0], alice.id, alice.id, state)).toBe('Action not allowed');
    expect(validateGuestActionArgs('travelPlayer', [alice.id, 'bank'], state)).toBe('Invalid travel route');
    expect(validateGuestActionArgs('travelPlayer', [alice.id, ['general-store']], state)).toBe('Travel route out of range');
    expect(validateGuestActionArgs('travelPlayer', [alice.id, ['general-store', 'bank']], state)).toBeNull();
  });

  it('rejects invalid vendors, services, modes and manipulated numeric values', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];

    expect(validateGuestActionArgs(
      'purchaseVendorItem',
      [alice.id, 'royal-mint', 'bread'],
      state,
    )).toBe('Invalid vendor');
    expect(validateGuestActionArgs(
      'useEquipmentService',
      [alice.id, 'duplicate', 'iron-sword'],
      state,
    )).toBe('Invalid equipment service');
    expect(validateGuestActionArgs(
      'useApplianceService',
      [alice.id, 'free-repair', 'scrying-mirror'],
      state,
    )).toBe('Invalid appliance service');
    expect(validateGuestActionArgs(
      'purchaseEquipmentItem',
      [alice.id, 'armory', 'iron-sword', 'third-outfit'],
      state,
    )).toBe('Invalid equipment mode');
    expect(validateGuestActionArgs(
      'transferBankFunds',
      [alice.id, 'deposit', 50.5],
      state,
    )).toBe('Invalid bank amount');
    expect(validateGuestActionArgs(
      'manageLoan',
      [alice.id, 'borrow', 300],
      state,
    )).toBe('Invalid loan product');
    expect(validateGuestActionRequest('modifyGold', [alice.id, 1], alice.id, alice.id, state)).toBe('Action not allowed');
    expect(validateGuestActionRequest('modifyHealth', [alice.id, -1], alice.id, alice.id, state)).toBe('Action not allowed');
  });

  it('propagates an authoritative semantic rejection instead of reporting success', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];
    const goldBefore = alice.gold;

    const result = processGuestActionRequest(
      'purchaseVendorItem',
      [alice.id, 'general-store', 'invented-item'],
      alice.id,
      alice.id,
      state,
      executeAction,
    );

    expect(result).toEqual({ success: false, error: 'Action failed', validated: true });
    expect(useGameStore.getState().players[0].gold).toBe(goldBefore);
  });

  it('propagates a valid semantic purchase and applies it once', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];

    const result = processGuestActionRequest(
      'purchaseVendorItem',
      [alice.id, 'general-store', 'bread'],
      alice.id,
      alice.id,
      state,
      executeAction,
    );

    expect(result).toEqual({ success: true, error: undefined, validated: true });
    const updated = useGameStore.getState().players[0];
    expect(updated.gold).toBe(992);
    expect(updated.foodLevel).toBe(60);
  });

  it('reports unknown semantic stock identifiers as failed host actions', () => {
    useGameStore.setState(state => ({
      players: state.players.map((player, index) => index === 0
        ? { ...player, currentLocation: 'bank' as const }
        : player),
    }));
    const state = useGameStore.getState();
    const alice = state.players[0];

    const result = processGuestActionRequest(
      'tradeStock',
      [alice.id, 'buy', 'counterfeit-stock', 1],
      alice.id,
      alice.id,
      state,
      executeAction,
    );

    expect(result).toEqual({ success: false, error: 'Action failed', validated: true });
    expect(useGameStore.getState().players[0].stocks).toEqual({});
  });
});
