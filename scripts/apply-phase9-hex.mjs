import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next === source) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, next);
  console.log(`Patched ${path}`);
}

patch('src/store/gameStore.ts', source => source
  .replace(
    `import { createHexActions } from './helpers/hexHelpers';`,
    `import { createHexActions } from './helpers/hexHelpers';\nimport { createHexServiceActions } from './helpers/hexServiceHelpers';`,
  )
  .replace(
    `  const hexActions = createHexActions(set, get);`,
    `  const hexActions = createHexActions(set, get);\n  const hexServiceActions = createHexServiceActions(set, get);`,
  )
  .replace(
    `    // Hex & Curse actions (network-aware)\n    ...wrapWithNetworkGuard(hexActions),`,
    `    // Hex & Curse actions (network-aware)\n    ...wrapWithNetworkGuard(hexActions),\n\n    // Canonical hex shop, defense and Graveyard intent actions\n    ...wrapWithNetworkGuard(hexServiceActions),`,
  ));

patch('src/store/storeTypes.ts', source => source.replace(
  `  attemptCurseReflection: (playerId: string, cost: number) => { success: boolean; message: string };\n  addHexScrollToPlayer: (playerId: string, hexId: string) => void;`,
  `  attemptCurseReflection: (playerId: string, cost: number) => { success: boolean; message: string };\n  addHexScrollToPlayer: (playerId: string, hexId: string) => void;\n  purchaseHexScroll: (playerId: string, vendor: 'enchanter' | 'shadow-market', hexId: string) => ActionResult | void;\n  useHexDefense: (playerId: string, service: 'amulet' | 'dispel', targetLocation?: LocationId) => ActionResult | void;\n  useGraveyardHexService: (playerId: string, service: 'ritual' | 'reflect' | 'cleanse') => (ActionResult & { backfired?: boolean }) | void;`,
));

patch('src/network/types.ts', source => source.replace(
  `  'buyHexScroll',\n  'castLocationHex',\n  'castPersonalCurse',\n  'buyProtectiveAmulet',\n  'dispelLocationHex',\n  'cleanseCurse',\n  'performDarkRitual',\n  'attemptCurseReflection',`,
  `  // Hex intent only. Host resolves stock, price, target location and service effects.\n  'purchaseHexScroll',\n  'useHexDefense',\n  'useGraveyardHexService',\n  // Casting already validates scroll ownership, target, location, time and cooldown on the host.\n  'castLocationHex',\n  'castPersonalCurse',`,
));

patch('src/network/useNetworkSync.ts', source => source
  .replace(`  buyHexScroll:           { argIndex: 2, min: 1, max: 2000, label: 'hex scroll cost' },\n`, '')
  .replace(`  buyProtectiveAmulet:    { argIndex: 1, min: 1, max: 5000, label: 'cost' },\n`, '')
  .replace(`  cleanseCurse:           { argIndex: 1, min: 1, max: 5000, label: 'cost' },\n`, '')
  .replace(`  performDarkRitual:      { argIndex: 1, min: 1, max: 5000, label: 'cost' },\n`, '')
  .replace(`  dispelLocationHex:      { argIndex: 1, min: 1, max: 5000, label: 'cost' },\n`, '')
  .replace(`  attemptCurseReflection: { argIndex: 1, min: 1, max: 5000, label: 'cost' },\n`, ''));

patch('src/hooks/ai/actionExecutor.ts', source => source.replace(
  `  buyProtectiveAmulet: (playerId: string, cost: number) => void;\n  addHexScrollToPlayer: (playerId: string, hexId: string) => void;\n  dispelLocationHex: (playerId: string, cost: number) => { success: boolean; message: string };\n  performDarkRitual: (playerId: string, cost: number) => { success: boolean; message: string; backfired?: boolean };`,
  `  purchaseHexScroll: (playerId: string, vendor: 'enchanter' | 'shadow-market', hexId: string) => { success: boolean; message: string } | void;\n  useHexDefense: (playerId: string, service: 'amulet' | 'dispel', targetLocation?: import('@/types/game.types').LocationId) => { success: boolean; message: string } | void;\n  useGraveyardHexService: (playerId: string, service: 'ritual' | 'reflect' | 'cleanse') => { success: boolean; message: string; backfired?: boolean } | void;`,
));

patch('src/hooks/useGrimwaldAI.ts', source => source
  .replace(
    `    buyProtectiveAmulet: state.buyProtectiveAmulet,\n    addHexScrollToPlayer: state.addHexScrollToPlayer,\n    dispelLocationHex: state.dispelLocationHex,\n    performDarkRitual: state.performDarkRitual,`,
    `    purchaseHexScroll: state.purchaseHexScroll,\n    useHexDefense: state.useHexDefense,\n    useGraveyardHexService: state.useGraveyardHexService,`,
  ));

patch('src/hooks/ai/handlers/hexHandlers.ts', source => {
  let next = source.replace(
    `export function handleBuyHexScroll(player: Player, action: AIAction, store: StoreActions): boolean {\n  const hexId = action.details?.hexId as string;\n  const cost = (action.details?.cost as number) || 0;\n  if (!hexId || player.gold < cost || cost <= 0) return false;\n  store.modifyGold(player.id, -cost);\n  store.addHexScrollToPlayer(player.id, hexId);\n  store.spendTime(player.id, 1);\n  return true;\n}`,
    `export function handleBuyHexScroll(player: Player, action: AIAction, store: StoreActions): boolean {\n  const hexId = action.details?.hexId as string;\n  if (!hexId || (player.currentLocation !== 'enchanter' && player.currentLocation !== 'shadow-market')) return false;\n  const result = store.purchaseHexScroll(player.id, player.currentLocation, hexId);\n  return result?.success ?? false;\n}`,
  );
  next = next.replace(
    `export function handleDispelHex(player: Player, action: AIAction, store: StoreActions): boolean {\n  const cost = (action.details?.cost as number) || 250;\n  if (player.gold < cost) return false;\n  const result = store.dispelLocationHex(player.id, cost);\n  return result.success;\n}`,
    `export function handleDispelHex(player: Player, action: AIAction, store: StoreActions): boolean {\n  const targetLocation = action.details?.location as import('@/types/game.types').LocationId;\n  if (!targetLocation) return false;\n  const result = store.useHexDefense(player.id, 'dispel', targetLocation);\n  return result?.success ?? false;\n}`,
  );
  next = next.replace(
    `export function handleDarkRitual(player: Player, action: AIAction, store: StoreActions): boolean {\n  const cost = (action.details?.cost as number) || 100;\n  if (player.gold < cost) return false;\n  const result = store.performDarkRitual(player.id, cost);\n  return result.success;\n}`,
    `export function handleDarkRitual(player: Player, _action: AIAction, store: StoreActions): boolean {\n  const result = store.useGraveyardHexService(player.id, 'ritual');\n  return result?.success ?? false;\n}`,
  );
  if (next.includes('store.dispelLocationHex') || next.includes('store.performDarkRitual') || next.includes('addHexScrollToPlayer')) {
    throw new Error('Legacy AI hex handler remains');
  }
  return next;
});

patch('src/hooks/ai/handlers/equipmentHandlers.ts', source => source.replace(
  `export function handleBuyAmulet(player: Player, _action: AIAction, store: StoreActions): boolean {\n  if (player.hasProtectiveAmulet) return false;\n  const state = useGameStore.getState();\n  const cost = Math.round(400 * state.priceModifier);\n  if (player.gold < cost) return false;\n  store.buyProtectiveAmulet(player.id, cost);\n  return true;\n}`,
  `export function handleBuyAmulet(player: Player, _action: AIAction, store: StoreActions): boolean {\n  if (player.hasProtectiveAmulet) return false;\n  const result = store.useHexDefense(player.id, 'amulet');\n  return result?.success ?? false;\n}`,
));

patch('src/hooks/ai/actions/rivalryActions.ts', source => {
  let next = source.replace(`        details: { hexId: hex.id, cost },`, `        details: { hexId: hex.id },`);

  next = next.replace(
    `function generateAmuletPurchase({ ctx, threatIsClose }: RivalryContext): AIAction[] {\n  const { player, currentLocation } = ctx;\n  if (!getGameOption('enableHexesCurses') || player.hasProtectiveAmulet || player.gold <= 500 || !threatIsClose) return [];\n  if (currentLocation !== 'enchanter') return [];`,
    `function generateAmuletPurchase({ ctx, threatIsClose }: RivalryContext): AIAction[] {\n  const { player, currentLocation, priceModifier } = ctx;\n  const amulet = DEFENSE_ITEMS.find(item => item.id === 'protective-amulet');\n  const amuletCost = Math.round((amulet?.basePrice ?? 400) * priceModifier);\n  if (!getGameOption('enableHexesCurses') || player.hasProtectiveAmulet || player.gold < amuletCost || !threatIsClose) return [];\n  if (currentLocation !== 'enchanter') return [];`,
  );

  next = next.replace(/function generateDispelActions\(\{ ctx \}: RivalryContext\): AIAction\[\] \{[\s\S]*?\n\}\n\n\/\*\* Dark ritual/, `function generateDispelActions({ ctx }: RivalryContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (!getGameOption('enableHexesCurses')) return [];

  const locationHexes = useGameStore.getState().locationHexes || [];
  const hostileHexes = locationHexes.filter(hex => hex.casterId !== player.id && hex.weeksRemaining > 0);
  if (hostileHexes.length === 0) return [];

  const dispelItem = DEFENSE_ITEMS.find(item => item.id === 'dispel-scroll');
  const dispelCost = Math.round((dispelItem?.basePrice ?? 250) * ctx.priceModifier);
  if (player.gold < dispelCost) return [];

  const currentJob = player.currentJob ? getJob(player.currentJob) : null;
  const jobLocation = currentJob ? getJobLocation(currentJob) : null;
  const importantLocations = ['academy', 'guild-hall', jobLocation].filter(Boolean) as string[];
  const targetHex = hostileHexes.find(hex => importantLocations.includes(hex.targetLocation)) ?? hostileHexes[0];

  if (currentLocation === 'enchanter') {
    return [{
      type: 'dispel-hex',
      priority: 70,
      description: \`Dispel hex on \${targetHex.targetLocation}\`,
      details: { location: targetHex.targetLocation },
    }];
  }

  if (player.timeRemaining > moveCost('enchanter') + 1) {
    return [{
      type: 'move',
      location: 'enchanter',
      priority: 58,
      description: \`Travel to Enchanter to dispel hex on \${targetHex.targetLocation}\`,
    }];
  }

  return [];
}

/** Dark ritual`);

  next = next.replace(
    `  if (!getGameOption('enableHexesCurses') || settings.planningDepth < 3 || !threatIsClose) return [];\n\n  const personalityAggro = ctx.personality.weights.gambling;\n  if (personalityAggro < 1.0 || player.gold < 100 || player.hexScrolls.length >= 2) return [];`,
    `  if (!getGameOption('enableHexesCurses') || settings.planningDepth < 3 || !threatIsClose) return [];\n\n  const personalityAggro = ctx.personality.weights.gambling;\n  const ritualCost = Math.round(200 * ctx.priceModifier);\n  if (personalityAggro < 1.0 || player.gold < ritualCost || player.hexScrolls.length >= 2) return [];`,
  );
  next = next.replace(`      details: { cost: 100 },`, `      details: {},`);

  if (next.includes(`type: 'buy-hex-scroll',\n        priority: 60 + morgathBoost,\n        description: \`Buy \${hex.name} scroll\`,\n        details: { hexId: hex.id, cost }`)) {
    throw new Error('AI hex purchase still sends cost');
  }
  return next;
});

patch('src/components/game/HexShopPanel.tsx', source => source
  .replace(`import { playSFX } from '@/audio/sfxManager';`, `import { playSFX } from '@/audio/sfxManager';\nimport type { ReactNode } from 'react';`)
  .replace(`  icon: React.ReactNode;`, `  icon: ReactNode;`));

patch('src/test/multiplayer.test.ts', source => {
  let next = source.replace(
    `    expect(ALLOWED_GUEST_ACTIONS.has('requestRentExtensionAtLandlord')).toBe(true);`,
    `    expect(ALLOWED_GUEST_ACTIONS.has('requestRentExtensionAtLandlord')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('purchaseHexScroll')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('useHexDefense')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('useGraveyardHexService')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('buyHexScroll')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('buyProtectiveAmulet')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('dispelLocationHex')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('cleanseCurse')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('performDarkRitual')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('attemptCurseReflection')).toBe(false);`,
  );
  next = next.replace(
    `      'repayLoan', 'purchaseVendorItem',`,
    `      'repayLoan', 'purchaseVendorItem', 'purchaseHexScroll', 'useHexDefense',\n      'useGraveyardHexService', 'castLocationHex', 'castPersonalCurse',`,
  );
  if (!next.includes("ALLOWED_GUEST_ACTIONS.has('purchaseHexScroll')")) throw new Error('Hex multiplayer expectations not added');
  return next;
});

patch('docs/AUDIT_LOG.md', source => source.replace(
  `- PR #331 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.`,
  `- PR #331 ble squash-merget til \`main\` som commit \`efc766a56213552e580ada737c5d64bdbb7b760b\`.\n\n## Fase 9 – 23. juli 2026\n\n### Mål\n\n- Gjøre scrollkjøp, hex-forsvar og Graveyard dark-magic-tjenester host-autoritative.\n- Beholde den eksisterende host-validerte casting-logikken.\n\n### Utført\n\n- Opprettet arbeidsgren \`agent/audit-phase9-hex\` fra fase 8-merge \`efc766a56213552e580ada737c5d64bdbb7b760b\`.\n- Maskinell skanning kartla alle klientprisede hex-kall, AI-kostfelt og whole-store-abonnementer.\n\n### Pågår\n\n- Innføring av semantiske shop-, defense- og Graveyard-tjenester og migrering av UI/AI.\n\n### Tester\n\n- Ikke kjørt ennå i fase 9.`,
));
