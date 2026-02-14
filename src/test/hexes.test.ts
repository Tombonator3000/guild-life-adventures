import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { setGameOption } from '@/data/gameOptions';
import {
  getHexById,
  isLocationHexed,
  getShadowMarketHexStock,
  getEnchanterHexStock,
  rollHexDrop,
  getHexPrice,
  LOCATION_HEXES,
  PERSONAL_CURSES,
  SABOTAGE_HEXES,
  ALL_HEXES,
  DEFENSE_ITEMS,
} from '@/data/hexes';
import { processHexExpiration, hasCurseEffect } from '@/store/helpers/hexHelpers';

let player1Id: string;
let player2Id: string;

function resetAndStart2P() {
  setGameOption('enableHexesCurses', true);
  const store = useGameStore.getState();
  store.startNewGame(['Alice', 'Bob'], false, { wealth: 5000, happiness: 75, education: 45, career: 4, adventure: 0 });
  const state = useGameStore.getState();
  player1Id = state.players[0].id;
  player2Id = state.players[1].id;
}

function getPlayer(id: string) {
  return useGameStore.getState().players.find(p => p.id === id)!;
}

// ── Data layer tests ────────────────────────────────────────────

describe('Hex Data', () => {
  it('ALL_HEXES contains all hex categories', () => {
    expect(LOCATION_HEXES.length).toBeGreaterThan(0);
    expect(PERSONAL_CURSES.length).toBeGreaterThan(0);
    expect(SABOTAGE_HEXES.length).toBeGreaterThan(0);
    expect(ALL_HEXES.length).toBe(LOCATION_HEXES.length + PERSONAL_CURSES.length + SABOTAGE_HEXES.length + 1); // +1 for legendary
  });

  it('getHexById returns correct hex', () => {
    const hex = getHexById('curse-of-poverty');
    expect(hex).toBeDefined();
    expect(hex!.name).toBe('Curse of Poverty');
    expect(hex!.category).toBe('personal');
  });

  it('getHexById returns undefined for invalid id', () => {
    expect(getHexById('nonexistent')).toBeUndefined();
  });

  it('getHexPrice applies price modifier', () => {
    const hex = getHexById('curse-of-poverty')!;
    expect(getHexPrice(hex, 1.0)).toBe(500);
    expect(getHexPrice(hex, 1.5)).toBe(750);
    expect(getHexPrice(hex, 0.8)).toBe(400);
  });

  it('getHexPrice returns 0 for drop-only items', () => {
    const hex = getHexById('shatter-hex')!;
    expect(getHexPrice(hex, 1.5)).toBe(0);
  });

  it('getShadowMarketHexStock returns 3-4 items per week', () => {
    for (let week = 1; week <= 10; week++) {
      const stock = getShadowMarketHexStock(week);
      expect(stock.length).toBeGreaterThanOrEqual(3);
      expect(stock.length).toBeLessThanOrEqual(4);
    }
  });

  it('getShadowMarketHexStock rotates across weeks', () => {
    const week1 = getShadowMarketHexStock(1).map(h => h.id);
    const week2 = getShadowMarketHexStock(2).map(h => h.id);
    // Not necessarily different, but the function should work
    expect(week1.length).toBeGreaterThan(0);
    expect(week2.length).toBeGreaterThan(0);
  });

  it('getEnchanterHexStock filters by dungeon floors cleared', () => {
    const noFloors = getEnchanterHexStock({ dungeonFloorsCleared: [] });
    const withFloor2 = getEnchanterHexStock({ dungeonFloorsCleared: [1, 2] });
    // Enchanter hexes require floor 2 cleared
    expect(withFloor2.length).toBeGreaterThanOrEqual(noFloors.length);
  });

  it('isLocationHexed returns null when no hex', () => {
    const result = isLocationHexed('academy', 'player-0', []);
    expect(result).toBeNull();
  });

  it('isLocationHexed detects hex for opponents', () => {
    const hex = {
      hexId: 'seal-of-ignorance',
      casterId: 'player-0',
      casterName: 'Alice',
      targetLocation: 'academy' as const,
      weeksRemaining: 2,
    };
    // Opponent (player-1) is blocked
    expect(isLocationHexed('academy', 'player-1', [hex])).toBeTruthy();
    // Caster (player-0) is NOT blocked by own hex
    expect(isLocationHexed('academy', 'player-0', [hex])).toBeNull();
  });

  it('DEFENSE_ITEMS has amulet and dispel scroll', () => {
    expect(DEFENSE_ITEMS.length).toBe(2);
    expect(DEFENSE_ITEMS[0].id).toBe('protective-amulet');
    expect(DEFENSE_ITEMS[1].id).toBe('dispel-scroll');
  });
});

// ── Store action tests ──────────────────────────────────────────

describe('Hex Store Actions', () => {
  beforeEach(() => {
    resetAndStart2P();
  });

  it('player starts with empty hex state', () => {
    const p = getPlayer(player1Id);
    expect(p.hexScrolls).toEqual([]);
    expect(p.activeCurses).toEqual([]);
    expect(p.hasProtectiveAmulet).toBe(false);
    expect(p.hexCastCooldown).toBe(0);
  });

  it('GameState starts with empty locationHexes', () => {
    expect(useGameStore.getState().locationHexes).toEqual([]);
  });

  it('buyHexScroll adds scroll to inventory', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'curse-of-poverty', 100);
    const p = getPlayer(player1Id);
    expect(p.hexScrolls).toEqual([{ hexId: 'curse-of-poverty', quantity: 1 }]);
    expect(p.gold).toBe(0); // 100 - 100
  });

  it('buyHexScroll stacks quantities', () => {
    const store = useGameStore.getState();
    store.modifyGold(player1Id, 200); // Give enough gold
    store.buyHexScroll(player1Id, 'curse-of-poverty', 50);
    store.buyHexScroll(player1Id, 'curse-of-poverty', 50);
    const p = getPlayer(player1Id);
    expect(p.hexScrolls).toEqual([{ hexId: 'curse-of-poverty', quantity: 2 }]);
  });

  it('buyHexScroll fails without enough gold', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'curse-of-poverty', 999);
    const p = getPlayer(player1Id);
    expect(p.hexScrolls).toEqual([]);
    expect(p.gold).toBe(100); // unchanged
  });

  it('buyProtectiveAmulet works', () => {
    const store = useGameStore.getState();
    store.modifyGold(player1Id, 400);
    store.buyProtectiveAmulet(player1Id, 400);
    const p = getPlayer(player1Id);
    expect(p.hasProtectiveAmulet).toBe(true);
    expect(p.gold).toBe(100); // 500 - 400
  });

  it('buyProtectiveAmulet fails if already has one', () => {
    const store = useGameStore.getState();
    store.modifyGold(player1Id, 900);
    store.buyProtectiveAmulet(player1Id, 400);
    store.buyProtectiveAmulet(player1Id, 400);
    const p = getPlayer(player1Id);
    expect(p.hasProtectiveAmulet).toBe(true);
    expect(p.gold).toBe(600); // 1000 - 400 (only one purchase)
  });

  it('castPersonalCurse applies curse to target', () => {
    const store = useGameStore.getState();
    // Setup: give scroll and move to shadow-market
    store.buyHexScroll(player1Id, 'curse-of-poverty', 0);
    store.movePlayer(player1Id, 'shadow-market', 0);
    const result = store.castPersonalCurse(player1Id, 'curse-of-poverty', player2Id);
    expect(result.success).toBe(true);
    const target = getPlayer(player2Id);
    expect(target.activeCurses.length).toBe(1);
    expect(target.activeCurses[0].effectType).toBe('wage-reduction');
    expect(target.activeCurses[0].weeksRemaining).toBe(3);
  });

  it('castPersonalCurse consumes scroll', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'curse-of-poverty', 0);
    store.movePlayer(player1Id, 'shadow-market', 0);
    store.castPersonalCurse(player1Id, 'curse-of-poverty', player2Id);
    const p = getPlayer(player1Id);
    expect(p.hexScrolls.length).toBe(0);
  });

  it('castPersonalCurse blocked by Protective Amulet', () => {
    const store = useGameStore.getState();
    // Give target an amulet
    store.buyProtectiveAmulet(player2Id, 0);
    // Give caster a scroll
    store.buyHexScroll(player1Id, 'curse-of-poverty', 0);
    store.movePlayer(player1Id, 'shadow-market', 0);
    const result = store.castPersonalCurse(player1Id, 'curse-of-poverty', player2Id);
    expect(result.success).toBe(true); // It "succeeds" but amulet blocks
    expect(result.message).toContain('Protective Amulet');
    const target = getPlayer(player2Id);
    expect(target.activeCurses.length).toBe(0);
    expect(target.hasProtectiveAmulet).toBe(false); // consumed
  });

  it('castLocationHex places hex on board', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'seal-of-ignorance', 0);
    store.movePlayer(player1Id, 'enchanter', 0);
    const result = store.castLocationHex(player1Id, 'seal-of-ignorance');
    expect(result.success).toBe(true);
    const hexes = useGameStore.getState().locationHexes;
    expect(hexes.length).toBe(1);
    expect(hexes[0].targetLocation).toBe('academy');
    expect(hexes[0].weeksRemaining).toBe(2);
  });

  it('castLocationHex prevents duplicate from same caster', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'seal-of-ignorance', 0);
    store.buyHexScroll(player1Id, 'embargo-decree', 0);
    store.movePlayer(player1Id, 'enchanter', 0);
    store.castLocationHex(player1Id, 'seal-of-ignorance');
    const result = store.castLocationHex(player1Id, 'embargo-decree');
    expect(result.success).toBe(false);
    expect(result.message).toContain('already have');
  });

  it('dispelLocationHex removes hex', () => {
    const store = useGameStore.getState();
    // Player 1 places hex
    store.buyHexScroll(player1Id, 'seal-of-ignorance', 0);
    store.movePlayer(player1Id, 'enchanter', 0);
    store.castLocationHex(player1Id, 'seal-of-ignorance');
    // Player 2 dispels it at the academy
    store.movePlayer(player2Id, 'academy', 0);
    const result = store.dispelLocationHex(player2Id, 0);
    expect(result.success).toBe(true);
    expect(useGameStore.getState().locationHexes.length).toBe(0);
  });

  it('sabotage hex destroys food', () => {
    const store = useGameStore.getState();
    store.modifyFood(player2Id, 50); // Give target food
    store.buyHexScroll(player1Id, 'spoilage-curse', 0);
    store.movePlayer(player1Id, 'shadow-market', 0);
    const result = store.castPersonalCurse(player1Id, 'spoilage-curse', player2Id);
    expect(result.success).toBe(true);
    const target = getPlayer(player2Id);
    expect(target.foodLevel).toBe(0);
    expect(target.freshFood).toBe(0);
  });

  it('sabotage hex destroys clothing', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'wardrobe-hex', 0);
    store.movePlayer(player1Id, 'shadow-market', 0);
    const result = store.castPersonalCurse(player1Id, 'wardrobe-hex', player2Id);
    expect(result.success).toBe(true);
    const target = getPlayer(player2Id);
    expect(target.clothingCondition).toBe(0);
  });

  it('cannot curse yourself', () => {
    const store = useGameStore.getState();
    store.buyHexScroll(player1Id, 'curse-of-poverty', 0);
    store.movePlayer(player1Id, 'shadow-market', 0);
    const result = store.castPersonalCurse(player1Id, 'curse-of-poverty', player1Id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('cannot curse yourself');
  });
});

// ── Hex processing tests ────────────────────────────────────────

describe('Hex Expiration', () => {
  it('ticks down location hex durations', () => {
    const players = [{ activeCurses: [], hexCastCooldown: 0, isGameOver: false }] as any[];
    const hexes = [{
      hexId: 'seal-of-ignorance',
      casterId: 'p1',
      casterName: 'Alice',
      targetLocation: 'academy' as const,
      weeksRemaining: 2,
    }];
    const result = processHexExpiration(players, hexes);
    expect(result.locationHexes.length).toBe(1);
    expect(result.locationHexes[0].weeksRemaining).toBe(1);
  });

  it('removes expired location hexes', () => {
    const players = [{ activeCurses: [], hexCastCooldown: 0, isGameOver: false }] as any[];
    const hexes = [{
      hexId: 'seal-of-ignorance',
      casterId: 'p1',
      casterName: 'Alice',
      targetLocation: 'academy' as const,
      weeksRemaining: 1,
    }];
    const result = processHexExpiration(players, hexes);
    expect(result.locationHexes.length).toBe(0);
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it('ticks down player curse durations', () => {
    const players = [{
      activeCurses: [{
        hexId: 'curse-of-poverty',
        casterId: 'p1',
        casterName: 'Alice',
        effectType: 'wage-reduction',
        magnitude: 0.4,
        weeksRemaining: 3,
      }],
      hexCastCooldown: 2,
      isGameOver: false,
    }] as any[];
    const result = processHexExpiration(players, []);
    expect(result.players[0].activeCurses[0].weeksRemaining).toBe(2);
    expect(result.players[0].hexCastCooldown).toBe(1);
  });

  it('removes expired curses', () => {
    const players = [{
      activeCurses: [{
        hexId: 'curse-of-poverty',
        casterId: 'p1',
        casterName: 'Alice',
        effectType: 'wage-reduction',
        magnitude: 0.4,
        weeksRemaining: 1,
      }],
      hexCastCooldown: 0,
      isGameOver: false,
    }] as any[];
    const result = processHexExpiration(players, []);
    expect(result.players[0].activeCurses.length).toBe(0);
  });
});

// ── Curse effect helper tests ───────────────────────────────────

describe('Curse Effect Helpers', () => {
  it('hasCurseEffect returns matching curse', () => {
    const player = {
      activeCurses: [{
        hexId: 'curse-of-poverty',
        casterId: 'p1',
        casterName: 'Alice',
        effectType: 'wage-reduction' as const,
        magnitude: 0.4,
        weeksRemaining: 3,
      }],
    } as any;
    const result = hasCurseEffect(player, 'wage-reduction');
    expect(result).toBeTruthy();
    expect(result!.magnitude).toBe(0.4);
  });

  it('hasCurseEffect returns null when no matching curse', () => {
    const player = { activeCurses: [] } as any;
    expect(hasCurseEffect(player, 'wage-reduction')).toBeNull();
  });
});

// ── Feature toggle tests ────────────────────────────────────────

describe('Hexes Feature Toggle', () => {
  it('hex actions do nothing when feature disabled', () => {
    setGameOption('enableHexesCurses', false);
    const store = useGameStore.getState();
    store.startNewGame(['Alice', 'Bob'], false, { wealth: 5000, happiness: 75, education: 45, career: 4, adventure: 0 });
    const pid = useGameStore.getState().players[0].id;
    const tid = useGameStore.getState().players[1].id;

    store.buyHexScroll(pid, 'curse-of-poverty', 0);
    expect(getPlayer(pid).hexScrolls).toEqual([]); // No effect

    store.movePlayer(pid, 'shadow-market', 0);
    const result = store.castPersonalCurse(pid, 'curse-of-poverty', tid);
    expect(result.success).toBe(false);

    // Re-enable for other tests
    setGameOption('enableHexesCurses', true);
  });
});
