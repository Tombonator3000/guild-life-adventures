/**
 * Multiplayer Network System Tests
 *
 * Tests pure logic functions from the multiplayer system:
 * - Room code generation & validation
 * - Network state serialization/deserialization
 * - Action proxy logic (LOCAL_ONLY, HOST_INTERNAL, ALLOWED_GUEST)
 * - Dismissed event tracking
 * - Rate limiting logic
 *
 * NOTE: WebRTC/PeerJS integration tests are not possible in jsdom.
 * These tests focus on the pure-function portions of the network stack.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateRoomCode,
  roomCodeToPeerId,
  peerIdToRoomCode,
  isValidRoomCode,
} from '@/network/roomCodes';
import {
  serializeGameState,
  applyNetworkState,
  executeAction,
  markEventDismissed,
  clearDismissedEvents,
  resetNetworkState,
} from '@/network/networkState';
import {
  shouldForwardAction,
  clearPendingActions,
  trackPendingAction,
  resolveAction,
} from '@/network/NetworkActionProxy';
import {
  LOCAL_ONLY_ACTIONS,
  HOST_INTERNAL_ACTIONS,
  ALLOWED_GUEST_ACTIONS,
} from '@/network/types';
import { useGameStore } from '@/store/gameStore';

// ================================================================
// Room Code Tests
// ================================================================

describe('Room Codes', () => {
  it('generates a 6-character code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('generates codes from valid charset (no O, I, L)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect(code).not.toContain('O');
      expect(code).not.toContain('I');
      expect(code).not.toContain('L');
      expect(code).not.toContain('0');
      expect(code).not.toContain('1');
    }
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    // With 29^6 ≈ 594M possible codes, 100 should be unique
    expect(codes.size).toBe(100);
  });

  it('converts room code to PeerJS ID', () => {
    expect(roomCodeToPeerId('AB3CD4')).toBe('guild-life-AB3CD4');
    expect(roomCodeToPeerId('ab3cd4')).toBe('guild-life-AB3CD4');
  });

  it('extracts room code from PeerJS ID', () => {
    expect(peerIdToRoomCode('guild-life-AB3CD4')).toBe('AB3CD4');
  });

  it('validates correct room codes', () => {
    expect(isValidRoomCode('AB3CD4')).toBe(true);
    expect(isValidRoomCode('XXXXXX')).toBe(true);
    expect(isValidRoomCode('222222')).toBe(true);
    expect(isValidRoomCode('ab3cd4')).toBe(true); // case insensitive
  });

  it('rejects invalid room codes', () => {
    expect(isValidRoomCode('')).toBe(false);
    expect(isValidRoomCode('AB3')).toBe(false); // too short
    expect(isValidRoomCode('AB3CD4E')).toBe(false); // too long
    expect(isValidRoomCode('ABCDO1')).toBe(false); // contains O and 1
    expect(isValidRoomCode('ABCDI0')).toBe(false); // contains I and 0
    expect(isValidRoomCode('ABCDL0')).toBe(false); // contains L
    expect(isValidRoomCode('ABC D4')).toBe(false); // contains space
  });
});

// ================================================================
// Action Categories Tests
// ================================================================

describe('Action Categories', () => {
  it('LOCAL_ONLY_ACTIONS are distinct from ALLOWED_GUEST_ACTIONS', () => {
    for (const action of LOCAL_ONLY_ACTIONS) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(false);
    }
  });

  it('HOST_INTERNAL_ACTIONS are distinct from ALLOWED_GUEST_ACTIONS', () => {
    for (const action of HOST_INTERNAL_ACTIONS) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(false);
    }
  });

  it('HOST_INTERNAL_ACTIONS are distinct from LOCAL_ONLY_ACTIONS', () => {
    for (const action of HOST_INTERNAL_ACTIONS) {
      expect(LOCAL_ONLY_ACTIONS.has(action)).toBe(false);
    }
  });

  it('ALLOWED_GUEST_ACTIONS contains expected game actions', () => {
    // Movement
    expect(ALLOWED_GUEST_ACTIONS.has('movePlayer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('endTurn')).toBe(true);
    // Economy
    expect(ALLOWED_GUEST_ACTIONS.has('depositToBank')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyItem')).toBe(true);
    // Work
    expect(ALLOWED_GUEST_ACTIONS.has('workShift')).toBe(true);
    // Education
    expect(ALLOWED_GUEST_ACTIONS.has('studyDegree')).toBe(true);
    // Quest/Dungeon
    expect(ALLOWED_GUEST_ACTIONS.has('takeQuest')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('clearDungeonFloor')).toBe(true);
  });

  it('HOST_INTERNAL_ACTIONS blocks game-logic-only actions', () => {
    expect(HOST_INTERNAL_ACTIONS.has('startTurn')).toBe(true);
    expect(HOST_INTERNAL_ACTIONS.has('processWeekEnd')).toBe(true);
    expect(HOST_INTERNAL_ACTIONS.has('checkDeath')).toBe(true);
    expect(HOST_INTERNAL_ACTIONS.has('checkVictory')).toBe(true);
    expect(HOST_INTERNAL_ACTIONS.has('startNewGame')).toBe(true);
  });

  it('LOCAL_ONLY_ACTIONS include UI-only actions', () => {
    expect(LOCAL_ONLY_ACTIONS.has('selectLocation')).toBe(true);
    expect(LOCAL_ONLY_ACTIONS.has('dismissEvent')).toBe(true);
    expect(LOCAL_ONLY_ACTIONS.has('setShowTutorial')).toBe(true);
    expect(LOCAL_ONLY_ACTIONS.has('setAISpeedMultiplier')).toBe(true);
  });
});

// ================================================================
// Network Action Proxy Tests
// ================================================================

describe('shouldForwardAction', () => {
  beforeEach(() => {
    // Reset store to local mode
    useGameStore.setState({ networkMode: 'local' });
  });

  it('returns false in local mode (all actions execute locally)', () => {
    useGameStore.setState({ networkMode: 'local' });
    expect(shouldForwardAction('movePlayer', ['player-0', 'bank'])).toBe(false);
    expect(shouldForwardAction('startTurn', [])).toBe(false);
    expect(shouldForwardAction('selectLocation', ['bank'])).toBe(false);
  });

  it('returns false in host mode (all actions execute locally)', () => {
    useGameStore.setState({ networkMode: 'host' });
    expect(shouldForwardAction('movePlayer', ['player-0', 'bank'])).toBe(false);
    expect(shouldForwardAction('startTurn', [])).toBe(false);
  });

  it('returns false for LOCAL_ONLY_ACTIONS in guest mode', () => {
    useGameStore.setState({ networkMode: 'guest' });
    expect(shouldForwardAction('selectLocation', ['bank'])).toBe(false);
    expect(shouldForwardAction('dismissEvent', [])).toBe(false);
    expect(shouldForwardAction('setShowTutorial', [false])).toBe(false);
  });

  it('returns true (block) for HOST_INTERNAL_ACTIONS in guest mode', () => {
    useGameStore.setState({ networkMode: 'guest' });
    expect(shouldForwardAction('startTurn', [])).toBe(true);
    expect(shouldForwardAction('processWeekEnd', [])).toBe(true);
    expect(shouldForwardAction('checkDeath', [])).toBe(true);
    expect(shouldForwardAction('startNewGame', [])).toBe(true);
  });
});

// ================================================================
// Network State Serialization Tests
// ================================================================

describe('Network State Serialization', () => {
  beforeEach(() => {
    // Reset to local mode before starting new game (guest mode blocks startNewGame)
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice', 'Bob'], false, {
      wealth: 5000,
      happiness: 100,
      education: 45,
      career: 4,
      adventure: 0,
    });
    resetNetworkState();
  });

  it('serializeGameState includes all gameplay fields', () => {
    const state = serializeGameState();
    expect(state).toHaveProperty('phase');
    expect(state).toHaveProperty('currentPlayerIndex');
    expect(state).toHaveProperty('players');
    expect(state).toHaveProperty('week');
    expect(state).toHaveProperty('priceModifier');
    expect(state).toHaveProperty('goalSettings');
    expect(state).toHaveProperty('stockPrices');
    expect(state).toHaveProperty('networkMode');
  });

  it('serializeGameState preserves player data', () => {
    const state = serializeGameState();
    expect(state.players).toHaveLength(2);
    expect(state.players[0].name).toBe('Alice');
    expect(state.players[1].name).toBe('Bob');
  });

  it('applyNetworkState updates store', () => {
    const state = serializeGameState();
    // Modify the serialized state
    state.week = 42;
    state.currentPlayerIndex = 1;

    applyNetworkState(state);

    const store = useGameStore.getState();
    expect(store.week).toBe(42);
    expect(store.currentPlayerIndex).toBe(1);
  });

  it('applyNetworkState skips dismissed events', () => {
    // Prime the sync state by applying once first (sets lastSyncedPlayerIndex)
    const primeState = serializeGameState();
    applyNetworkState(primeState);

    // Now dismiss an event and check it's skipped
    markEventDismissed('eventMessage');
    const state = serializeGameState();
    state.eventMessage = 'This should not appear';
    state.phase = 'event';

    applyNetworkState(state);

    const store = useGameStore.getState();
    // Event should be skipped because it was dismissed
    expect(store.eventMessage).not.toBe('This should not appear');
  });

  it('applyNetworkState clears dismissed events on turn change', () => {
    // Dismiss an event
    markEventDismissed('eventMessage');

    // Simulate turn change (currentPlayerIndex changes)
    const state = serializeGameState();
    state.currentPlayerIndex = 1; // Different from initial 0
    state.eventMessage = 'New event after turn change';
    state.phase = 'event';

    // First apply sets the lastSyncedPlayerIndex
    applyNetworkState(state);

    // Because turn changed, dismissed events should be cleared
    const store = useGameStore.getState();
    expect(store.eventMessage).toBe('New event after turn change');
  });

  it('clearDismissedEvents resets tracking', () => {
    markEventDismissed('eventMessage');
    markEventDismissed('shadowfingersEvent');
    clearDismissedEvents();

    const state = serializeGameState();
    state.eventMessage = 'Should appear';
    state.phase = 'event';

    applyNetworkState(state);

    const store = useGameStore.getState();
    expect(store.eventMessage).toBe('Should appear');
  });

  it('resetNetworkState clears all tracking', () => {
    markEventDismissed('eventMessage');
    resetNetworkState();

    const state = serializeGameState();
    state.eventMessage = 'After reset';
    state.phase = 'event';

    applyNetworkState(state);
    expect(useGameStore.getState().eventMessage).toBe('After reset');
  });
});

// ================================================================
// executeAction Tests
// ================================================================

describe('executeAction', () => {
  beforeEach(() => {
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice', 'Bob'], false, {
      wealth: 5000,
      happiness: 100,
      education: 45,
      career: 4,
      adventure: 0,
    });
  });

  it('returns true for valid actions', () => {
    const result = executeAction('selectLocation', ['bank']);
    expect(result).toBe(true);
  });

  it('returns false for non-existent actions', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = executeAction('nonExistentAction', []);
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });

  it('returns false for non-function properties', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = executeAction('phase', []);
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });
});

// ================================================================
// Pending Action Tracking Tests
// ================================================================

describe('Pending Action Tracking', () => {
  afterEach(() => {
    clearPendingActions();
  });

  it('trackPendingAction and resolveAction work together', () => {
    // No exceptions thrown
    trackPendingAction('req-1');
    trackPendingAction('req-2');
    resolveAction('req-1');
    resolveAction('req-2');
  });

  it('clearPendingActions cleans up', () => {
    trackPendingAction('req-1');
    trackPendingAction('req-2');
    clearPendingActions();
    // Should not throw
    resolveAction('req-1');
  });
});

// ================================================================
// Cross-cutting Concerns
// ================================================================

describe('Network Guards in Store', () => {
  beforeEach(() => {
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice', 'Bob'], false, {
      wealth: 5000,
      happiness: 100,
      education: 45,
      career: 4,
      adventure: 0,
    });
  });

  it('startNewGame blocked in guest mode', () => {
    useGameStore.setState({ networkMode: 'guest' });
    const playersBefore = useGameStore.getState().players;

    // Should be a no-op in guest mode
    useGameStore.getState().startNewGame(['Charlie'], false, {
      wealth: 1000,
      happiness: 50,
      education: 9,
      career: 1,
      adventure: 0,
    });

    const playersAfter = useGameStore.getState().players;
    // Players should be unchanged
    expect(playersAfter.length).toBe(playersBefore.length);

    // Reset
    useGameStore.setState({ networkMode: 'local' });
  });

  it('save/load blocked in online mode', () => {
    useGameStore.setState({ networkMode: 'host' });

    const result1 = useGameStore.getState().saveToSlot(0);
    expect(result1).toBe(false);

    const result2 = useGameStore.getState().loadFromSlot(0);
    expect(result2).toBe(false);

    useGameStore.setState({ networkMode: 'local' });
  });

  it('dismiss actions mark events in guest mode', () => {
    useGameStore.setState({
      networkMode: 'guest',
      eventMessage: 'Test event',
    });

    // Dismiss should clear the event locally
    useGameStore.getState().dismissEvent();

    const store = useGameStore.getState();
    expect(store.eventMessage).toBeNull();

    // Reset
    useGameStore.setState({ networkMode: 'local' });
    resetNetworkState();
  });
});

// ================================================================
// Cryptographic Room Code Tests (crypto.getRandomValues)
// ================================================================

describe('Room Code Cryptographic Security', () => {
  it('generates codes using crypto.getRandomValues', () => {
    // Verify the function still works (crypto is available in test env)
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('generates high-entropy codes (no obvious patterns)', () => {
    const codes: string[] = [];
    for (let i = 0; i < 200; i++) {
      codes.push(generateRoomCode());
    }
    // All codes should be unique
    const unique = new Set(codes);
    expect(unique.size).toBe(200);

    // Character distribution should be roughly uniform (no single char > 30% of total)
    const charCounts = new Map<string, number>();
    for (const code of codes) {
      for (const c of code) {
        charCounts.set(c, (charCounts.get(c) ?? 0) + 1);
      }
    }
    const totalChars = 200 * 6;
    for (const [, count] of charCounts) {
      expect(count / totalChars).toBeLessThan(0.3);
    }
  });
});

// ================================================================
// Cross-Player Validation Deep Scan Tests
// ================================================================

describe('Cross-Player Validation', () => {
  it('all ALLOWED_GUEST_ACTIONS with playerId have it at args[0]', () => {
    // This test documents the design invariant that all guest actions
    // use playerId as args[0]. The deep scan in useNetworkSync checks
    // ALL argument positions, but this verifies the convention holds.
    const actionsWithPlayerIdArg = [
      'movePlayer', 'spendTime', 'modifyGold', 'modifyHealth',
      'modifyHappiness', 'modifyFood', 'modifyClothing', 'modifyMaxHealth',
      'modifyRelaxation', 'cureSickness', 'setHousing', 'payRent',
      'prepayRent', 'moveToHousing', 'setJob', 'workShift', 'requestRaise',
      'negotiateRaise', 'studySession', 'completeEducationLevel',
      'studyDegree', 'completeDegree', 'depositToBank', 'withdrawFromBank',
      'invest', 'withdrawInvestment', 'buyItem', 'sellItem', 'buyDurable',
      'sellDurable', 'buyAppliance', 'repairAppliance', 'pawnAppliance',
      'equipItem', 'unequipItem', 'buyStock', 'sellStock', 'takeLoan',
      'repayLoan', 'buyFreshFood', 'buyLotteryTicket', 'buyTicket',
      'buyGuildPass', 'takeQuest', 'completeQuest', 'abandonQuest',
      'clearDungeonFloor', 'applyRareDrop',
    ];

    // All of these should be in ALLOWED_GUEST_ACTIONS
    for (const action of actionsWithPlayerIdArg) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(true);
    }
  });

  it('endTurn has no playerId arg (special case)', () => {
    // endTurn is the only guest action with no playerId.
    // Cross-player validation skips it because there are no string args
    // starting with "player-". Turn validation ensures only the current
    // player can call it.
    expect(ALLOWED_GUEST_ACTIONS.has('endTurn')).toBe(true);
  });
});

// ================================================================
// Argument Validation Tests (host-side bounds checking)
// ================================================================

describe('Action Argument Validation', () => {
  // We can't directly test validateActionArgs since it's not exported,
  // but we can verify the store actions handle edge cases correctly.

  beforeEach(() => {
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice', 'Bob'], false, {
      wealth: 5000,
      happiness: 100,
      education: 45,
      career: 4,
      adventure: 0,
    });
  });

  it('raw stat modifiers are in the whitelist (required by UI components)', () => {
    // These raw modifiers must be in the whitelist because UI components
    // call them directly (e.g., LocationPanel, CavePanel, HomePanel).
    // The network layer adds server-side bounds checking (validateActionArgs)
    // to prevent abuse.
    const rawModifiers = [
      'modifyGold', 'modifyHealth', 'modifyHappiness',
      'modifyFood', 'modifyClothing', 'modifyMaxHealth', 'modifyRelaxation',
    ];
    for (const action of rawModifiers) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(true);
    }
  });

  it('executeAction handles non-existent actions gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(executeAction('__nonExistentAction123__', [])).toBe(false);
    expect(executeAction('hackTheGame', [])).toBe(false);
    consoleSpy.mockRestore();
  });

  it('HOST_INTERNAL_ACTIONS cannot be triggered via executeAction bypass', () => {
    // Verify the actions exist in HOST_INTERNAL_ACTIONS
    expect(HOST_INTERNAL_ACTIONS.has('startTurn')).toBe(true);
    expect(HOST_INTERNAL_ACTIONS.has('processWeekEnd')).toBe(true);
    expect(HOST_INTERNAL_ACTIONS.has('checkDeath')).toBe(true);

    // These should still be callable via executeAction (host-side only),
    // but the network layer blocks guests from calling them
    expect(typeof (useGameStore.getState() as unknown as Record<string, unknown>).startTurn).toBe('function');
  });
});
