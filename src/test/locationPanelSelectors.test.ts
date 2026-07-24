import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/game/LocationPanel.tsx'),
  'utf8',
);
const tabsSource = readFileSync(
  resolve(process.cwd(), 'src/components/game/locationTabs.tsx'),
  'utf8',
);
const selectorSource = source.slice(
  source.indexOf('useGameStore(useShallow(state => ({'),
  source.indexOf('})));') + 5,
);
const tabImplementation = tabsSource.replace(
  /export interface LocationTabContext \{[\s\S]*?\n\}/,
  '',
);

const removedContextFields = [
  'modifyGold',
  'modifyHappiness',
  'modifyHealth',
  'modifyFood',
  'modifyClothing',
  'modifyMaxHealth',
  'modifyRelaxation',
  'spendTime',
  'completeLocationObjective',
  'clearDungeonFloor',
  'applyRareDrop',
  'purchaseVendorItem',
  'cureSickness',
  'onBuyNewspaper',
  'setEventMessage',
];

const removedSelectorActions = [
  'purchaseNewspaper',
  'modifyGold',
  'modifyHappiness',
  'modifyHealth',
  'modifyFood',
  'modifyClothing',
  'modifyMaxHealth',
  'modifyRelaxation',
  'spendTime',
  'clearDungeonFloor',
  'applyRareDrop',
  'purchaseVendorItem',
  'cureSickness',
  'setEventMessage',
];

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
      expect(selectorSource).toContain(`${field}: state.${field}`);
    }
  });

  it('selects semantic services used by the panel and active location tabs', () => {
    for (const action of [
      'travelPlayer',
      'completeLocationObjective',
      'performWorkShift',
      'attendDegreeSession',
      'graduateDegree',
      'acceptJobOffer',
      'useEquipmentService',
      'useApplianceService',
    ]) {
      expect(selectorSource).toContain(`${action}: state.${action}`);
    }
  });

  it('does not reactively select obsolete raw or duplicated tab actions', () => {
    for (const action of removedSelectorActions) {
      expect(selectorSource).not.toContain(`${action}: state.${action}`);
    }
  });

  it('does not pass the obsolete context fields to the tab factories', () => {
    expect(source).toContain('type ActiveLocationTabContext = Omit<LocationTabContext, DeadLocationTabContextField>;');
    for (const field of removedContextFields) {
      expect(source).not.toContain(`${field}: store.${field}`);
    }
  });

  it('confirms the removed context fields are not read by tab implementations', () => {
    for (const field of removedContextFields) {
      expect(tabImplementation).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
  });
});
