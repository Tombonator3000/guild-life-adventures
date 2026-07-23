import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnchanterHexStock, getShadowMarketHexStock } from '@/data/hexes';
import { resetGameOptions, setGameOption } from '@/data/gameOptions';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { useGameStore } from '@/store/gameStore';

const goals = {
  wealth: 5000,
  happiness: 75,
  education: 45,
  career: 75,
  adventure: 0,
};

function preparePlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState(state => ({
    week: 3,
    priceModifier: 1.5,
    locationHexes: [],
    players: state.players.map(player => ({
      ...player,
      gold: 5000,
      timeRemaining: 20,
      currentLocation: 'enchanter',
      dungeonFloorsCleared: [1, 2, 3, 4],
      hexScrolls: [],
      activeCurses: [],
      hasProtectiveAmulet: false,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative hex services', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGameOptions();
    setGameOption('enableHexesCurses', true);
    vi.restoreAllMocks();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Hex Tester'], false, goals);
  });

  afterEach(() => {
    resetGameOptions();
    vi.restoreAllMocks();
  });

  it('purchases an Enchanter scroll from canonical stock and price', () => {
    const playerId = preparePlayer();
    const playerBefore = useGameStore.getState().players[0];
    const hex = getEnchanterHexStock(playerBefore)[0];
    expect(hex).toBeDefined();

    const result = useGameStore.getState().purchaseHexScroll(playerId, 'enchanter', hex.id);
    const player = useGameStore.getState().players[0];
    const expectedPrice = Math.round(hex.basePrice * 1.5);

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(5000 - expectedPrice);
    expect(player.hexScrolls).toContainEqual({ hexId: hex.id, quantity: 1 });
    expect(player.timeRemaining).toBe(20);
  });

  it('uses the current weekly Shadow Market rotation', () => {
    const playerId = preparePlayer({ currentLocation: 'shadow-market' });
    const stock = getShadowMarketHexStock(3);
    const hex = stock[0];

    expect(useGameStore.getState().purchaseHexScroll(playerId, 'shadow-market', hex.id)?.success).toBe(true);

    const unavailable = getShadowMarketHexStock(4).find(candidate => !stock.some(current => current.id === candidate.id));
    if (unavailable) {
      expect(useGameStore.getState().purchaseHexScroll(playerId, 'shadow-market', unavailable.id)?.success).toBe(false);
    }
  });

  it('rejects a scroll from the wrong vendor or physical location', () => {
    const playerId = preparePlayer({ currentLocation: 'bank' });
    const hex = getEnchanterHexStock(useGameStore.getState().players[0])[0];

    expect(useGameStore.getState().purchaseHexScroll(playerId, 'enchanter', hex.id)?.success).toBe(false);
  });

  it('buys a Protective Amulet using canonical price and blocks duplicates', () => {
    const playerId = preparePlayer();
    const first = useGameStore.getState().useHexDefense(playerId, 'amulet');
    const afterFirst = useGameStore.getState().players[0];

    expect(first?.success).toBe(true);
    expect(afterFirst.gold).toBe(4400); // 400 * 1.5
    expect(afterFirst.hasProtectiveAmulet).toBe(true);
    expect(useGameStore.getState().useHexDefense(playerId, 'amulet')?.success).toBe(false);
  });

  it('dispels a selected hostile location remotely from the Enchanter', () => {
    const playerId = preparePlayer();
    useGameStore.setState({
      locationHexes: [
        {
          hexId: 'market-blight',
          casterId: 'rival-player',
          casterName: 'Rival',
          targetLocation: 'general-store',
          weeksRemaining: 2,
        },
        {
          hexId: 'forge-curse',
          casterId: playerId,
          casterName: 'Hex Tester',
          targetLocation: 'forge',
          weeksRemaining: 2,
        },
      ],
    });

    const result = useGameStore.getState().useHexDefense(playerId, 'dispel', 'general-store');
    const state = useGameStore.getState();
    const player = state.players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(4625); // 250 * 1.5
    expect(player.timeRemaining).toBe(19);
    expect(state.locationHexes).toHaveLength(1);
    expect(state.locationHexes[0].casterId).toBe(playerId);
  });

  it('rejects dispel without a selected hostile hex', () => {
    const playerId = preparePlayer();
    expect(useGameStore.getState().useHexDefense(playerId, 'dispel')?.success).toBe(false);
    expect(useGameStore.getState().useHexDefense(playerId, 'dispel', 'forge')?.success).toBe(false);
  });

  it('performs a dark ritual with canonical cost and time', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const playerId = preparePlayer({ currentLocation: 'graveyard' });
    const result = useGameStore.getState().useGraveyardHexService(playerId, 'ritual');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(result?.backfired).not.toBe(true);
    expect(player.gold).toBe(4700); // 200 * 1.5
    expect(player.timeRemaining).toBe(16);
    expect(player.hexScrolls).toHaveLength(1);
  });

  it('cleanses an active curse only at the Graveyard with canonical cost', () => {
    const curse = {
      hexId: 'curse-of-poverty',
      casterId: 'rival-player',
      casterName: 'Rival',
      effectType: 'wage-reduction' as const,
      magnitude: 0.4,
      weeksRemaining: 3,
    };
    const playerId = preparePlayer({ currentLocation: 'graveyard', activeCurses: [curse] });
    const result = useGameStore.getState().useGraveyardHexService(playerId, 'cleanse');
    const player = useGameStore.getState().players[0];

    expect(result?.success).toBe(true);
    expect(player.gold).toBe(4550); // 300 * 1.5
    expect(player.timeRemaining).toBe(17);
    expect(player.activeCurses).toEqual([]);
  });

  it('allows semantic services and blocks client-priced hex actions for guests', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseHexScroll')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useHexDefense')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useGraveyardHexService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('castLocationHex')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('castPersonalCurse')).toBe(true);

    expect(ALLOWED_GUEST_ACTIONS.has('buyHexScroll')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('buyProtectiveAmulet')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('dispelLocationHex')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('cleanseCurse')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('performDarkRitual')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('attemptCurseReflection')).toBe(false);
  });
});
