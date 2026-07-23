import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next === source) throw new Error(`No changes applied to ${path}`);
  writeFileSync(path, next);
  console.log(`Patched ${path}`);
}

patch('src/store/helpers/economyHelpers.ts', source => source
  .replace(
    `import { createInventoryTradeActions } from './economy/inventoryTradeHelpers';`,
    `import { createInventoryTradeActions } from './economy/inventoryTradeHelpers';\nimport { createHousingServiceActions } from './economy/housingServiceHelpers';`,
  )
  .replace(
    `    ...createInventoryTradeActions(set, get),`,
    `    ...createInventoryTradeActions(set, get),\n    ...createHousingServiceActions(set, get),`,
  ));

patch('src/store/storeTypes.ts', source => source.replace(
  `  moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => void;\n  begForMoreTime: (playerId: string) => { success: boolean; message: string };`,
  `  moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => void;\n  begForMoreTime: (playerId: string) => { success: boolean; message: string };\n  payHousingRent: (playerId: string, weeks: 1 | 4 | 8) => ActionResult | void;\n  moveHousingAtLandlord: (playerId: string, tier: HousingTier) => ActionResult | void;\n  requestRentExtensionAtLandlord: (playerId: string) => ActionResult | void;`,
));

patch('src/network/types.ts', source => source.replace(
  `  'setHousing',\n  'payRent',\n  'prepayRent',\n  'moveToHousing',\n  'begForMoreTime',`,
  `  // Housing intent only. Host resolves office access, canonical price and time.\n  'payHousingRent',\n  'moveHousingAtLandlord',\n  'requestRentExtensionAtLandlord',`,
));

patch('src/components/game/LandlordPanel.tsx', source => {
  let next = source
    .replace(`import { useBanterStore } from '@/store/banterStore';`, `import { useBanterStore } from '@/store/banterStore';\nimport { useGameStore } from '@/store/gameStore';`)
    .replace(`  spendTime: (playerId: string, hours: number) => void;\n  prepayRent: (playerId: string, weeks: number, cost: number) => void;\n  moveToHousing: (playerId: string, tier: string, cost: number, lockedRent: number) => void;\n  begForMoreTime: (playerId: string) => { success: boolean; message: string };\n`, '')
    .replace(
      `export function LandlordPanel({\n  player,\n  priceModifier,\n  spendTime,\n  prepayRent,\n  moveToHousing,\n  begForMoreTime,\n}: LandlordPanelProps) {`,
      `export function LandlordPanel({ player, priceModifier }: LandlordPanelProps) {`,
    )
    .replace(
      `  const { t } = useTranslation();`,
      `  const { t } = useTranslation();\n  const payHousingRent = useGameStore(state => state.payHousingRent);\n  const moveHousingAtLandlord = useGameStore(state => state.moveHousingAtLandlord);\n  const requestRentExtensionAtLandlord = useGameStore(state => state.requestRentExtensionAtLandlord);`,
    );

  next = next.replace(/prepayRent\(player\.id, (1|4|8), effectiveRent(?: \* \1)?\);\n\s*spendTime\(player\.id, 1\);\n\s*toast\.success\(t\('panelLandlord\.rentPaid'\)\);/g,
    (_match, weeks) => `const result = payHousingRent(player.id, ${weeks});\n                if (!result) return;\n                if (result.success) toast.success(result.message);\n                else toast.error(result.message);`);

  next = next.replace(
    `              const result = begForMoreTime(player.id);\n              spendTime(player.id, 1);`,
    `              const result = requestRentExtensionAtLandlord(player.id);\n              if (!result) return;`,
  );
  next = next.replace(
    `                  moveToHousing(player.id, tier, moveCost, tierMarketRent);\n                  spendTime(player.id, 4);\n                  toast.success(t('panelLandlord.rentPaid'));`,
    `                  const result = moveHousingAtLandlord(player.id, tier);\n                  if (!result) return;\n                  if (result.success) toast.success(result.message);\n                  else toast.error(result.message);`,
  );

  if (/\b(prepayRent|moveToHousing|begForMoreTime|spendTime)\b/.test(next)) {
    throw new Error('Legacy Landlord action reference remains');
  }
  return next;
});

patch('src/components/game/locationTabs.tsx', source => {
  let next = source
    .replace(`  prepayRent: GameStore['prepayRent'];\n  moveToHousing: GameStore['moveToHousing'];\n  begForMoreTime: GameStore['begForMoreTime'];\n`, '')
    .replace(
      `  const { player, priceModifier, spendTime, prepayRent, moveToHousing, begForMoreTime, week } = ctx;`,
      `  const { player, priceModifier, week } = ctx;`,
    )
    .replace(`        spendTime={spendTime}\n        prepayRent={prepayRent}\n        moveToHousing={moveToHousing}\n        begForMoreTime={begForMoreTime}\n`, '');
  if (next.includes("prepayRent: GameStore['prepayRent']") || next.includes('prepayRent={')) {
    throw new Error('Legacy housing context remains');
  }
  return next;
});

patch('src/components/game/LocationPanel.tsx', source => source
  .replace(`    prepayRent: store.prepayRent,\n    moveToHousing: store.moveToHousing,\n    begForMoreTime: store.begForMoreTime,\n`, ''));

patch('src/hooks/ai/actionExecutor.ts', source => source
  .replace(`  payRent: (playerId: string) => void;`, `  payHousingRent: (playerId: string, weeks: 1 | 4 | 8) => { success: boolean; message: string } | void;`)
  .replace(`  moveToHousing: (playerId: string, tier: string, cost: number, rent: number) => void;`, `  moveHousingAtLandlord: (playerId: string, tier: import('@/types/game.types').HousingTier) => { success: boolean; message: string } | void;`));

patch('src/hooks/useGrimwaldAI.ts', source => source
  .replace(`    payRent: state.payRent,`, `    payHousingRent: state.payHousingRent,`)
  .replace(`    moveToHousing: state.moveToHousing,`, `    moveHousingAtLandlord: state.moveHousingAtLandlord,`));

patch('src/hooks/ai/handlers/housingFinanceHandlers.ts', source => {
  let next = source
    .replace(`import { RENT_COSTS, LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';`, `import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';`)
    .replace(
      `export function handlePayRent(player: Player, action: AIAction, store: StoreActions): boolean {\n  if (player.housing === 'homeless') return false;\n  const cost = player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing];\n  if (player.gold < cost) return false;\n  store.payRent(player.id);\n  store.spendTime(player.id, 1);\n  return true;\n}`,
      `export function handlePayRent(player: Player, _action: AIAction, store: StoreActions): boolean {\n  if (player.housing === 'homeless') return false;\n  const result = store.payHousingRent(player.id, 1);\n  return result?.success ?? false;\n}`,
    )
    .replace(
      `export function handleMoveHousing(player: Player, action: AIAction, store: StoreActions): boolean {\n  const tier = action.details?.tier as HousingTier;\n  const cost = (action.details?.cost as number) || 200;\n  // BUG FIX: Check for 4 hours (same as human) instead of 1\n  if (!tier || player.gold < cost || player.timeRemaining < 4) return false;\n  const rent = (action.details?.rent as number) || RENT_COSTS[tier];\n  store.moveToHousing(player.id, tier, cost, rent);\n  store.spendTime(player.id, 4); // BUG FIX: Was 1, should be 4 (matches human)\n  return true;\n}`,
      `export function handleMoveHousing(player: Player, action: AIAction, store: StoreActions): boolean {\n  const tier = action.details?.tier as HousingTier;\n  if (!tier) return false;\n  const result = store.moveHousingAtLandlord(player.id, tier);\n  return result?.success ?? false;\n}`,
    )
    .replace(
      `export function handleDowngradeHousing(player: Player, action: AIAction, store: StoreActions): boolean {\n  const tier = action.details?.tier as HousingTier;\n  if (!tier) return false;\n  store.moveToHousing(player.id, tier, 0, RENT_COSTS[tier]);\n  store.spendTime(player.id, 4); // BUG FIX: Was 1, should be 4 (matches human)\n  return true;\n}`,
      `export function handleDowngradeHousing(player: Player, action: AIAction, store: StoreActions): boolean {\n  const tier = action.details?.tier as HousingTier;\n  if (!tier) return false;\n  const result = store.moveHousingAtLandlord(player.id, tier);\n  return result?.success ?? false;\n}`,
    );
  if (next.includes('store.moveToHousing') || next.includes('store.payRent')) throw new Error('Legacy AI housing call remains');
  return next;
});

patch('src/hooks/ai/actions/criticalNeeds.ts', source => source
  .replace(/\n\s*details: \{ cost: prepayRentCost \},/g, '')
  .replace(/\n\s*details: \{ cost: rentCost \},/g, ''));

patch('src/hooks/ai/actions/strategicActions.ts', source => source.replace(
  `details: { tier: 'noble' as HousingTier, cost: Math.round(RENT_COSTS.noble * ctx.priceModifier) * 2, rent: Math.round(RENT_COSTS.noble * ctx.priceModifier) },`,
  `details: { tier: 'noble' as HousingTier },`,
));

patch('src/test/multiplayer.test.ts', source => {
  let next = source
    .replace(
      `'modifyRelaxation', 'cureSickness', 'setHousing', 'payRent',\n      'prepayRent', 'moveToHousing',`,
      `'modifyRelaxation', 'cureSickness', 'payHousingRent',\n      'moveHousingAtLandlord', 'requestRentExtensionAtLandlord',`,
    )
    .replace(
      `    expect(ALLOWED_GUEST_ACTIONS.has('sellItem')).toBe(false);`,
      `    expect(ALLOWED_GUEST_ACTIONS.has('sellItem')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('payHousingRent')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('moveHousingAtLandlord')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('requestRentExtensionAtLandlord')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('setHousing')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('payRent')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('prepayRent')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('moveToHousing')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('begForMoreTime')).toBe(false);`,
    );
  if (!next.includes("ALLOWED_GUEST_ACTIONS.has('payHousingRent')")) throw new Error('Housing multiplayer expectations not added');
  return next;
});

patch('docs/AUDIT_LOG.md', source => source.replace(
  `- PR #330 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.`,
  `- PR #330 ble squash-merget til \`main\` som commit \`5d8f22a0adc5abbbc8ad73d8a12c35cabdb41307\`.\n\n## Fase 8 – 23. juli 2026\n\n### Mål\n\n- Gjøre leiebetaling, flytting og rent extension host-autoritativt.\n- Flytte pris, locked rent og tidsbruk fra klienten til canonical host-regler.\n\n### Utført\n\n- Opprettet arbeidsgren \`agent/audit-phase8-housing\` fra fase 7-merge \`5d8f22a0adc5abbbc8ad73d8a12c35cabdb41307\`.\n- Maskinell skanning kartla Landlord-UI, store-laget, AI-handlerne og alle rent-feltene.\n\n### Pågår\n\n- Innføring av semantiske boligservicer og migrering av UI/AI.\n\n### Tester\n\n- Ikke kjørt ennå i fase 8.`,
));
