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
    `import { createItemActions } from './economy/itemHelpers';`,
    `import { createItemActions } from './economy/itemHelpers';\nimport { createInventoryTradeActions } from './economy/inventoryTradeHelpers';`,
  )
  .replace(
    `    ...createItemActions(set, get),`,
    `    ...createItemActions(set, get),\n    ...createInventoryTradeActions(set, get),`,
  ));

patch('src/store/storeTypes.ts', source => source.replace(
  `  sellItem: (playerId: string, itemId: string, price: number) => void;`,
  `  sellItem: (playerId: string, itemId: string, price: number) => void;\n  sellInventoryItem: (playerId: string, itemId: string) => ActionResult | void;`,
));

patch('src/network/types.ts', source => source.replace(
  `  'buyItem',\n  'sellItem',`,
  `  // Inventory sale intent only. Host resolves ownership, location and price.\n  'sellInventoryItem',`,
));

patch('src/components/game/PawnShopPanel.tsx', source => {
  let next = source
    .replace(`  onSellItem: (itemId: string, price: number) => void;\n`, '')
    .replace(
      `export function PawnShopPanel({ player, priceModifier, week, onSellItem, section }: PawnShopPanelProps) {`,
      `export function PawnShopPanel({ player, priceModifier, week, section }: PawnShopPanelProps) {`,
    )
    .replace(
      `  const purchaseEquipmentItem = useGameStore(s => s.purchaseEquipmentItem);`,
      `  const purchaseEquipmentItem = useGameStore(s => s.purchaseEquipmentItem);\n  const sellInventoryItem = useGameStore(s => s.sellInventoryItem);`,
    )
    .replace(
      `                onClick={() => onSellItem(itemId, sellPrice)}`,
      `                onClick={() => {\n                  const result = sellInventoryItem(player.id, itemId);\n                  if (!result) return;\n                  if (result.success) toast.success(result.message);\n                  else toast.error(result.message);\n                }}`,
    );
  if (next.includes('onSellItem')) throw new Error('Legacy PawnShop onSellItem prop remains');
  return next;
});

patch('src/components/game/locationTabs.tsx', source => {
  let next = source
    .replace(`  sellItem: GameStore['sellItem'];\n`, '')
    .replace(
      `  const { player, priceModifier, week, sellItem } = ctx;`,
      `  const { player, priceModifier, week } = ctx;`,
    )
    .replace(
      `    onSellItem: (itemId: string, price: number) => {\n      sellItem(player.id, itemId, price);\n    },\n`,
      '',
    );
  if (next.includes("sellItem: GameStore['sellItem']") || next.includes('onSellItem:')) {
    throw new Error('Legacy location sell callback remains');
  }
  return next;
});

patch('src/components/game/LocationPanel.tsx', source => source.replace(
  `    sellItem: store.sellItem,\n`,
  '',
));

patch('src/hooks/ai/actionExecutor.ts', source => source.replace(
  `  sellItem: (playerId: string, itemId: string, price: number) => void;`,
  `  sellInventoryItem: (playerId: string, itemId: string) => { success: boolean; message: string } | void;`,
));

patch('src/hooks/ai/handlers/equipmentHandlers.ts', source => source.replace(
  `export function handleSellItem(player: Player, action: AIAction, store: StoreActions): boolean {\n  const itemId = action.details?.itemId as string;\n  const price = (action.details?.price as number) || 10;\n  if (!itemId) return false;\n  store.sellItem(player.id, itemId, price);\n  store.spendTime(player.id, 1);\n  return true;\n}`,
  `export function handleSellItem(player: Player, action: AIAction, store: StoreActions): boolean {\n  const itemId = action.details?.itemId as string;\n  if (!itemId) return false;\n  const result = store.sellInventoryItem(player.id, itemId);\n  return result?.success ?? false;\n}`,
));

patch('src/hooks/ai/actions/economicActions.ts', source => source.replace(
  `actions.push({ type: 'sell-item', priority: 78, description: \`Sell \${player.inventory[0]} at fence\`, details: { itemId: player.inventory[0], price: 10 } });`,
  `actions.push({ type: 'sell-item', priority: 78, description: \`Sell \${player.inventory[0]} at fence\`, details: { itemId: player.inventory[0] } });`,
));

patch('src/test/multiplayer.test.ts', source => {
  let next = source
    .replace(
      `    expect(ALLOWED_GUEST_ACTIONS.has('buyItem')).toBe(true);`,
      `    expect(ALLOWED_GUEST_ACTIONS.has('sellInventoryItem')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('buyItem')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('sellItem')).toBe(false);`,
    )
    .replace(
      `'invest', 'withdrawInvestment', 'buyItem', 'sellItem',`,
      `'invest', 'withdrawInvestment', 'sellInventoryItem',`,
    );
  if (!next.includes("ALLOWED_GUEST_ACTIONS.has('sellInventoryItem')")) {
    throw new Error('Semantic inventory action was not added to multiplayer tests');
  }
  return next;
});

patch('docs/AUDIT_LOG.md', source => source.replace(
  `- PR #329 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.`,
  `- PR #329 ble squash-merget til \`main\` som commit \`39d5935631e414b8643e446b9079c703c8fa5714\`.\n\n## Fase 7 – 23. juli 2026\n\n### Mål\n\n- Gjøre vanlig inventory-salg hos Fence host-autoritativt.\n- Fjerne \`buyItem\` og \`sellItem\` fra gjestenes allowlist uten å ødelegge AI-salg eller quest-inventory.\n\n### Utført\n\n- Opprettet arbeidsgren \`agent/audit-phase7-inventory\` fra fase 6B-merge \`39d5935631e414b8643e446b9079c703c8fa5714\`.\n- Maskinell skanning fant ingen \`buyItem\`-kallere og bare to \`sellItem\`-kallere: Fence-UI-et og AI-handleren.\n\n### Pågår\n\n- Innføring av \`sellInventoryItem(playerId, itemId)\`, der hosten validerer Fence-lokasjon, inventory-eierskap og canonical salgspris.\n\n### Tester\n\n- Ikke kjørt ennå i fase 7.`,
));
