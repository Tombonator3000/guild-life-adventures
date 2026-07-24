import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const panelSource = readSource('src/components/game/LocationPanel.tsx');
const tabsSource = readSource('src/components/game/locationTabs.tsx');
const contextSource = readSource('src/components/game/locationTabContext.ts');
const coreSource = readSource('src/components/game/locationTabFactories/coreTabs.tsx');
const marketSource = readSource('src/components/game/locationTabFactories/marketAdventureTabs.tsx');
const selectorSource = panelSource.slice(
  panelSource.indexOf('useGameStore(useShallow(state => ({'),
  panelSource.indexOf('})));') + 5,
);
const tabImplementation = `${tabsSource}\n${contextSource}\n${coreSource}\n${marketSource}`;

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
    expect(panelSource).toContain("import { useShallow } from 'zustand/react/shallow';");
    expect(panelSource).toContain('useGameStore(useShallow(state => ({');
    expect(panelSource).not.toMatch(/const\s+store\s*=\s*useGameStore\(\s*\)\s*;/);
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

  it('uses the real narrow context type without an Omit boundary cast', () => {
    expect(panelSource).toContain('const ctx: LocationTabContext = {');
    expect(panelSource).not.toContain('DeadLocationTabContextField');
    expect(panelSource).not.toContain('ActiveLocationTabContext');
    expect(panelSource).not.toContain('as LocationTabContext');
  });

  it('keeps obsolete context fields out of every split tab module', () => {
    for (const field of removedContextFields) {
      expect(tabImplementation).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it('keeps the orchestrator small and delegates factories by domain', () => {
    expect(tabsSource.split('\n').length).toBeLessThan(190);
    expect(tabsSource).toContain("import { CORE_TAB_FACTORIES } from './locationTabFactories/coreTabs';");
    expect(tabsSource).toContain("import { MARKET_ADVENTURE_TAB_FACTORIES } from './locationTabFactories/marketAdventureTabs';");
    expect(coreSource).toContain("'guild-hall': guildHallTabs");
    expect(coreSource).toContain('academy: academyTabs');
    expect(marketSource).toContain("'shadow-market': shadowMarketTabs");
    expect(marketSource).toContain('cave: caveTabs');
  });
});
