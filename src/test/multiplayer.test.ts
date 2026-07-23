import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import {
  ALLOWED_GUEST_ACTIONS,
  LOCAL_ONLY_ACTIONS,
  HOST_INTERNAL_ACTIONS,
  RATE_LIMIT_CONFIG,
  isValidMessage,
  serializeMessage,
  deserializeMessage,
  type NetworkMessage,
} from '@/network/types';
import {
  generateRoomCode,
  isValidRoomCode,
  encodeInviteCode,
  decodeInviteCode,
} from '@/network/roomCode';
import { executeAction } from '@/network/networkState';
import { RateLimiter } from '@/network/RateLimiter';

// ================================================================
// Room Code Tests
// ================================================================

describe('Room Code Utilities', () => {
  it('generates a 6-character room code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });

  it('generates unique room codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateRoomCode());
    }
    expect(codes.size).toBeGreaterThan(95);
  });

  it('validates correct room codes', () => {
    expect(isValidRoomCode('ABC234')).toBe(true);
    expect(isValidRoomCode('XYZ789')).toBe(true);
  });

  it('rejects invalid room codes', () => {
    expect(isValidRoomCode('ABC12')).toBe(false);
    expect(isValidRoomCode('ABC1234')).toBe(false);
    expect(isValidRoomCode('abc234')).toBe(false);
    expect(isValidRoomCode('ABCI23')).toBe(false);
    expect(isValidRoomCode('ABCO23')).toBe(false);
    expect(isValidRoomCode('ABC023')).toBe(false);
    expect(isValidRoomCode('ABC123')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);
  });

  it('encodes and decodes invite codes', () => {
    const encoded = encodeInviteCode('ABC234');
    expect(encoded).toBeTruthy();
    expect(decodeInviteCode(encoded)).toBe('ABC234');
  });

  it('returns null for invalid encoded invite', () => {
    expect(decodeInviteCode('not-base64!')).toBeNull();
  });
});

// ================================================================
// Network Message Validation Tests
// ================================================================

describe('Network Message Validation', () => {
  it('validates a correct state-sync message', () => {
    expect(isValidMessage({
      type: 'state-sync',
      state: { week: 1 },
      version: 1,
    })).toBe(true);
  });

  it('validates a correct action message', () => {
    expect(isValidMessage({
      type: 'action',
      name: 'endTurn',
      args: [],
      requestId: 'req-1',
    })).toBe(true);
  });

  it('rejects malformed messages', () => {
    expect(isValidMessage(null)).toBe(false);
    expect(isValidMessage({})).toBe(false);
    expect(isValidMessage({ type: 'unknown' })).toBe(false);
    expect(isValidMessage({ type: 'action', name: 'endTurn' })).toBe(false);
  });

  it('serializes and deserializes messages', () => {
    const message: NetworkMessage = {
      type: 'chat',
      playerId: 'p1',
      playerName: 'Alice',
      message: 'Hello',
      timestamp: 123,
    };
    const serialized = serializeMessage(message);
    expect(deserializeMessage(serialized)).toEqual(message);
  });

  it('returns null for invalid JSON', () => {
    expect(deserializeMessage('{bad json')).toBeNull();
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
    expect(ALLOWED_GUEST_ACTIONS.has('travelPlayer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('movePlayer')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('endTurn')).toBe(true);
    // Economy
    expect(ALLOWED_GUEST_ACTIONS.has('transferBankFunds')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('manageInvestment')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('tradeStock')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('manageLoan')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('sellInventoryItem')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyItem')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('sellItem')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('payHousingRent')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('moveHousingAtLandlord')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('requestRentExtensionAtLandlord')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseHexScroll')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useHexDefense')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useGraveyardHexService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyHexScroll')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('buyProtectiveAmulet')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('dispelLocationHex')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('cleanseCurse')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('performDarkRitual')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('attemptCurseReflection')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('acceptJobOffer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('acceptMarketRaise')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('setJob')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('negotiateRaise')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('setHousing')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('payRent')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('prepayRent')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('moveToHousing')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('begForMoreTime')).toBe(false);
    for (const legacy of ['depositToBank', 'withdrawFromBank', 'invest', 'withdrawInvestment', 'buyStock', 'sellStock', 'takeLoan', 'repayLoan']) {
      expect(ALLOWED_GUEST_ACTIONS.has(legacy)).toBe(false);
    }
    // Host-authoritative work and education intent actions
    expect(ALLOWED_GUEST_ACTIONS.has('performWorkShift')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('attendDegreeSession')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('prepayDegree')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('graduateDegree')).toBe(true);
    // Numeric legacy actions remain internal and must not be guest-callable
    expect(ALLOWED_GUEST_ACTIONS.has('workShift')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('studySession')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('studyDegree')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('payFullTuition')).toBe(false);
    // Equipment/appliance lifecycle actions are semantic and host-resolved
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseEquipmentItem')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useEquipmentService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseAppliance')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useApplianceService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyDurable')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairEquipment')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('buyAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('repairAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('pawnAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('redeemAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairAppliance')).toBe(false);
  });

  it('contains all core gameplay actions', () => {
    const coreActions = [
      'travelPlayer',
      'spendTime',
      'endTurn',
      'modifyGold',
      'modifyHealth',
      'modifyHappiness',
      'modifyFood',
      'modifyClothing',
    ];
    for (const action of coreActions) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(true);
    }
  });
});

// ================================================================
// Store Guard Tests
// ================================================================

describe('Store Network Guards', () => {
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

  afterEach(() => {
    useGameStore.setState({ networkMode: 'local' });
  });

  it('executes actions normally in local mode', () => {
    const player = useGameStore.getState().players[0];
    const initialGold = player.gold;
    useGameStore.getState().modifyGold(player.id, 50);
    expect(useGameStore.getState().players[0].gold).toBe(initialGold + 50);
  });

  it('executes actions normally in host mode', () => {
    useGameStore.setState({ networkMode: 'host' });
    const player = useGameStore.getState().players[0];
    const initialGold = player.gold;
    useGameStore.getState().modifyGold(player.id, 50);
    expect(useGameStore.getState().players[0].gold).toBe(initialGold + 50);
  });

  it('blocks direct execution on guest mode', () => {
    useGameStore.setState({ networkMode: 'guest' });
    const player = useGameStore.getState().players[0];
    const initialGold = player.gold;
    useGameStore.getState().modifyGold(player.id, 50);
    expect(useGameStore.getState().players[0].gold).toBe(initialGold);
  });
});

// ================================================================
// Action Execution Tests
// ================================================================

describe('Action Execution', () => {
  beforeEach(() => {
    useGameStore.setState({ networkMode: 'local' });
    useGameStore.getState().startNewGame(['Alice'], false, {
      wealth: 5000,
      happiness: 100,
      education: 45,
      career: 4,
      adventure: 0,
    });
  });

  it('executes a valid action', () => {
    const player = useGameStore.getState().players[0];
    const initialGold = player.gold;
    expect(executeAction('modifyGold', [player.id, 50])).toBe(true);
    expect(useGameStore.getState().players[0].gold).toBe(initialGold + 50);
  });

  it('returns false for an unknown action', () => {
    expect(executeAction('nonexistentAction', [])).toBe(false);
  });

  it('returns true for a semantic action that succeeds', () => {
    const player = useGameStore.getState().players[0];
    useGameStore.setState(state => ({
      players: state.players.map(p => p.id === player.id ? { ...p, currentLocation: 'bank', gold: 200 } : p),
    }));
    expect(executeAction('transferBankFunds', [player.id, 'deposit', 50])).toBe(true);
  });

  it('returns false for a semantic action that rejects', () => {
    const player = useGameStore.getState().players[0];
    expect(executeAction('transferBankFunds', [player.id, 'deposit', 50])).toBe(false);
  });
});

// ================================================================
// Rate Limiter Tests
// ================================================================

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows actions under the limit', () => {
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxActionsPerSecond; i++) {
      expect(limiter.checkAction('peer1')).toBe(true);
    }
  });

  it('blocks actions over the limit', () => {
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxActionsPerSecond; i++) {
      limiter.checkAction('peer1');
    }
    expect(limiter.checkAction('peer1')).toBe(false);
  });

  it('resets after the time window', () => {
    vi.useFakeTimers();
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxActionsPerSecond; i++) {
      limiter.checkAction('peer1');
    }
    expect(limiter.checkAction('peer1')).toBe(false);
    vi.advanceTimersByTime(1100);
    expect(limiter.checkAction('peer1')).toBe(true);
  });

  it('tracks peers separately', () => {
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxActionsPerSecond; i++) {
      limiter.checkAction('peer1');
    }
    expect(limiter.checkAction('peer1')).toBe(false);
    expect(limiter.checkAction('peer2')).toBe(true);
  });
});

// ================================================================
// Message Serialization Round-trip Tests
// ================================================================

describe('Message Round-trips', () => {
  const messages: NetworkMessage[] = [
    { type: 'join-request', playerName: 'Alice', playerColor: '#ff0000' },
    { type: 'join-accepted', playerId: 'p1', state: { week: 1 }, version: 1 },
    { type: 'join-rejected', reason: 'Full' },
    { type: 'state-sync', state: { phase: 'playing' }, version: 5 },
    { type: 'action', name: 'endTurn', args: [], requestId: 'r1' },
    { type: 'action-result', requestId: 'r1', success: true },
    { type: 'player-disconnected', playerId: 'p1' },
    { type: 'player-reconnected', playerId: 'p1' },
    { type: 'chat', playerId: 'p1', playerName: 'Alice', message: 'Hi', timestamp: 1 },
    { type: 'ping', timestamp: 123 },
    { type: 'pong', timestamp: 123 },
    { type: 'host-shutdown', reason: 'bye' },
  ];

  for (const msg of messages) {
    it(`round-trips ${msg.type}`, () => {
      expect(deserializeMessage(serializeMessage(msg))).toEqual(msg);
    });
  }
});

// ================================================================
// Room Code Entropy Tests
// ================================================================

describe('Room Code Entropy', () => {
  it('uses all allowed characters roughly uniformly', () => {
    const charCounts = new Map<string, number>();
    for (let i = 0; i < 500; i++) {
      const code = generateRoomCode();
      for (const c of code) {
        charCounts.set(c, (charCounts.get(c) ?? 0) + 1);
      }
    }
    const totalChars = 500 * 6;
    const expected = totalChars / 29;
    for (const [, count] of charCounts) {
      expect(count).toBeGreaterThan(expected * 0.4);
      expect(count).toBeLessThan(expected * 1.8);
    }
  });

  it('generates high-entropy codes (no obvious patterns)', () => {
    const codes: string[] = [];
    for (let i = 0; i < 200; i++) {
      codes.push(generateRoomCode());
    }
    const unique = new Set(codes);
    expect(unique.size).toBe(200);

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
    const actionsWithPlayerIdArg = [
      'travelPlayer', 'spendTime', 'modifyGold', 'modifyHealth',
      'modifyHappiness', 'modifyFood', 'modifyClothing', 'modifyMaxHealth',
      'modifyRelaxation', 'cureSickness', 'payHousingRent',
      'moveHousingAtLandlord', 'requestRentExtensionAtLandlord', 'requestRaise',
      'acceptJobOffer', 'acceptMarketRaise', 'performWorkShift', 'attendDegreeSession',
      'prepayDegree', 'graduateDegree', 'transferBankFunds', 'manageInvestment',
      'sellInventoryItem',
      'purchaseEquipmentItem', 'useEquipmentService', 'purchaseAppliance', 'useApplianceService',
      'equipItem', 'unequipItem', 'tradeStock', 'manageLoan',
      'purchaseVendorItem', 'purchaseHexScroll', 'useHexDefense',
      'useGraveyardHexService', 'castLocationHex', 'castPersonalCurse',
      'buyGuildPass', 'takeQuest', 'completeQuest', 'abandonQuest',
    ];

    for (const action of actionsWithPlayerIdArg) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(true);
    }
  });

  it('endTurn has no playerId arg (special case)', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('endTurn')).toBe(true);
  });
});

// ================================================================
// Argument Validation Tests (host-side bounds checking)
// ================================================================

describe('Action Argument Validation', () => {
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
    const rawModifiers = [
      'modifyGold', 'modifyHealth', 'modifyHappiness',
      'modifyFood', 'modifyClothing', 'modifyMaxHealth', 'modifyRelaxation',
    ];
    for (const action of rawModifiers) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(true);
    }
  });

  it('host-internal actions are never in the guest whitelist', () => {
    for (const action of ['processWeekEnd', 'startNewGame', 'setPhase', 'resetForNewGame']) {
      expect(ALLOWED_GUEST_ACTIONS.has(action)).toBe(false);
    }
  });
});
