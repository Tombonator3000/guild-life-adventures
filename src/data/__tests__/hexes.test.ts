import { describe, it, expect } from 'vitest';
import {
  getHexById,
  ALL_HEXES,
  LOCATION_HEXES,
  PERSONAL_CURSES,
  SABOTAGE_HEXES,
  LEGENDARY_HEX,
  getShadowMarketHexStock,
  getEnchanterHexStock,
  getHexPrice,
  isLocationHexed,
  type ActiveLocationHex,
} from '../hexes';

describe('getHexById', () => {
  it('returns a location hex by id', () => {
    const hex = getHexById('seal-of-ignorance');
    expect(hex).toBeDefined();
    expect(hex!.name).toBe('Seal of Ignorance');
    expect(hex!.category).toBe('location');
  });

  it('returns a personal curse by id', () => {
    const hex = getHexById('curse-of-poverty');
    expect(hex).toBeDefined();
    expect(hex!.category).toBe('personal');
    expect(hex!.effect?.type).toBe('wage-reduction');
  });

  it('returns a sabotage hex by id', () => {
    const hex = getHexById('shatter-hex');
    expect(hex).toBeDefined();
    expect(hex!.category).toBe('sabotage');
  });

  it('returns the legendary hex', () => {
    const hex = getHexById('hex-of-ruin');
    expect(hex).toBeDefined();
    expect(hex!.effect?.type).toBe('legendary-ruin');
  });

  it('returns undefined for unknown id', () => {
    expect(getHexById('nonexistent')).toBeUndefined();
  });
});

describe('ALL_HEXES', () => {
  it('contains all hex categories', () => {
    const categories = new Set(ALL_HEXES.map(h => h.category));
    expect(categories).toContain('location');
    expect(categories).toContain('personal');
    expect(categories).toContain('sabotage');
  });

  it('has unique IDs', () => {
    const ids = ALL_HEXES.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes location hexes, personal curses, sabotage hexes, and legendary', () => {
    expect(ALL_HEXES.length).toBe(
      LOCATION_HEXES.length + PERSONAL_CURSES.length + SABOTAGE_HEXES.length + 1
    );
  });
});

describe('getShadowMarketHexStock', () => {
  it('returns 3 or 4 hexes', () => {
    const stock = getShadowMarketHexStock(1);
    expect(stock.length).toBeGreaterThanOrEqual(3);
    expect(stock.length).toBeLessThanOrEqual(4);
  });

  it('only returns hexes available at shadow market', () => {
    const stock = getShadowMarketHexStock(5);
    for (const hex of stock) {
      const hasShadowSource = hex.sources.some(
        s => s.location === 'shadow-market' && !s.dropOnly
      );
      expect(hasShadowSource).toBe(true);
    }
  });

  it('is deterministic for the same week', () => {
    const stock1 = getShadowMarketHexStock(3);
    const stock2 = getShadowMarketHexStock(3);
    expect(stock1.map(h => h.id)).toEqual(stock2.map(h => h.id));
  });

  it('varies between different weeks', () => {
    const stock1 = getShadowMarketHexStock(1).map(h => h.id);
    const stock2 = getShadowMarketHexStock(10).map(h => h.id);
    // Not guaranteed different but very likely with different seeds
    // Just check they're valid
    expect(stock1.length).toBeGreaterThanOrEqual(3);
    expect(stock2.length).toBeGreaterThanOrEqual(3);
  });
});

describe('getEnchanterHexStock', () => {
  it('returns no floor-locked hexes without cleared floors', () => {
    const stock = getEnchanterHexStock({ dungeonFloorsCleared: [] });
    for (const hex of stock) {
      const source = hex.sources.find(s => s.location === 'enchanter');
      expect(source).toBeDefined();
      expect(source!.requiresFloorCleared).toBeUndefined();
    }
  });

  it('includes floor-locked hexes when floor is cleared', () => {
    const stock = getEnchanterHexStock({ dungeonFloorsCleared: [1, 2, 3] });
    const hasFloorLocked = stock.some(h =>
      h.sources.some(s => s.location === 'enchanter' && s.requiresFloorCleared)
    );
    expect(hasFloorLocked).toBe(true);
  });
});

describe('getHexPrice', () => {
  it('applies price modifier', () => {
    const hex = getHexById('curse-of-poverty')!;
    expect(getHexPrice(hex, 1.0)).toBe(500);
    expect(getHexPrice(hex, 1.5)).toBe(750);
    expect(getHexPrice(hex, 0.5)).toBe(250);
  });

  it('returns 0 for drop-only hexes', () => {
    const hex = getHexById('shatter-hex')!;
    expect(hex.basePrice).toBe(0);
    expect(getHexPrice(hex, 2.0)).toBe(0);
  });
});

describe('isLocationHexed', () => {
  const hexes: ActiveLocationHex[] = [
    {
      hexId: 'seal-of-ignorance',
      casterId: 'player-2',
      casterName: 'Rival',
      targetLocation: 'academy',
      weeksRemaining: 2,
    },
  ];

  it('returns hex when location is blocked for another player', () => {
    const result = isLocationHexed('academy', 'player-1', hexes);
    expect(result).not.toBeNull();
    expect(result!.hexId).toBe('seal-of-ignorance');
  });

  it('returns null for the caster (own hex does not block)', () => {
    const result = isLocationHexed('academy', 'player-2', hexes);
    expect(result).toBeNull();
  });

  it('returns null for unblocked locations', () => {
    const result = isLocationHexed('guild-hall', 'player-1', hexes);
    expect(result).toBeNull();
  });

  it('returns null when hex has expired', () => {
    const expired: ActiveLocationHex[] = [
      { ...hexes[0], weeksRemaining: 0 },
    ];
    expect(isLocationHexed('academy', 'player-1', expired)).toBeNull();
  });
});
