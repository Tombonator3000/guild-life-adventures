import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../components/game/LocationPanel.tsx', import.meta.url),
  'utf8',
);

describe('LocationPanel store subscriptions', () => {
  it('uses a shallow explicit selector instead of subscribing to the whole store', () => {
    expect(source).toContain("import { useShallow } from 'zustand/react/shallow';");
    expect(source).toContain('useGameStore(useShallow(state => ({');
    expect(source).not.toMatch(/const\s+store\s*=\s*useGameStore\(\s*\)\s*;/);
  });

  it('selects the state needed for travel, economy, tabs and hex display', () => {
    for (const field of [
      'weather',
      'players',
      'priceModifier',
      'economyTrend',
      'week',
      'weeklyNewsEvents',
      'stockPrices',
      'stockPriceHistory',
      'locationHexes',
    ]) {
      expect(source).toContain(`${field}: state.${field}`);
    }
  });

  it('selects semantic services used by the location tabs', () => {
    for (const action of [
      'travelPlayer',
      'purchaseNewspaper',
      'performWorkShift',
      'attendDegreeSession',
      'graduateDegree',
      'acceptJobOffer',
      'purchaseVendorItem',
      'useEquipmentService',
      'useApplianceService',
    ]) {
      expect(source).toContain(`${action}: state.${action}`);
    }
  });
});
