import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  if (next === source) {
    console.log(`No change needed for ${path}`);
    return;
  }
  writeFileSync(path, next);
  console.log(`Patched ${path}`);
}

patch('src/test/multiplayer.test.ts', source => {
  const search = `    // Equipment migration is a separate phase.\n    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(true);`;
  const replacement = `    // Equipment intent is guest-callable; numeric legacy services are host-internal.\n    expect(ALLOWED_GUEST_ACTIONS.has('purchaseEquipmentItem')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('useEquipmentService')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('buyDurable')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('sellDurable')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairEquipment')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(false);`;
  if (source.includes(search)) return source.replace(search, replacement);
  if (!source.includes("expect(ALLOWED_GUEST_ACTIONS.has('useEquipmentService')).toBe(true);")) {
    throw new Error('Equipment multiplayer expectation block not found');
  }
  return source;
});

patch('src/components/game/PawnShopPanel.tsx', source => {
  let next = source
    .replace(`  onGamble: (stake: number) => void;\n  onSpendTime: (hours: number) => void;\n`, '')
    .replace(
      `export function PawnShopPanel({ player, priceModifier, week, onSellItem, onBuyUsedItem, section }: PawnShopPanelProps) {`,
      `export function PawnShopPanel({ player, priceModifier, week, onSellItem, section }: PawnShopPanelProps) {`,
    );
  if (next.includes('onBuyUsedItem')) throw new Error('Legacy onBuyUsedItem prop remains');
  return next;
});

patch('src/components/game/locationTabs.tsx', source => {
  let next = source;
  const tableStart = `// Gambling odds/payouts by stake amount\nconst GAMBLE_TABLE:`;
  if (next.includes(tableStart)) {
    next = next.replace(/\/\/ Gambling odds\/payouts by stake amount[\s\S]*?\n};\n\nfunction fenceTabs/, 'function fenceTabs');
  }
  next = next.replace(
    `  const { player, priceModifier, week, sellItem, modifyGold, modifyHappiness, spendTime } = ctx;`,
    `  const { player, priceModifier, week, sellItem } = ctx;`,
  );
  next = next.replace(/\n    onGamble: \(stake: number\) => \{[\s\S]*?\n    onSpendTime: \(hours: number\) => spendTime\(player\.id, hours\),/, '');
  if (next.includes('GAMBLE_TABLE') || next.includes('onSpendTime: (hours: number)')) {
    throw new Error('Legacy Fence gambling callbacks remain');
  }
  return next;
});
