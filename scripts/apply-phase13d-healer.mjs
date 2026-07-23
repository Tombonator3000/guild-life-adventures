import fs from 'node:fs';

function replace(path, before, after) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`Missing expected text in ${path}: ${before.slice(0, 120)}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

replace(
  'src/components/game/locationTabs.tsx',
  `function enchanterTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier, modifyGold, modifyHealth, spendTime, cureSickness, modifyMaxHealth } = ctx;`,
  `function enchanterTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, players, priceModifier } = ctx;`,
);
replace(
  'src/components/game/locationTabs.tsx',
  `        <HealerPanel
          player={player}
          priceModifier={priceModifier}
          onHeal={(cost, healthGain, time) => {
            modifyGold(player.id, -cost);
            modifyHealth(player.id, healthGain);
            spendTime(player.id, time);
          }}
          onCureSickness={(cost, time) => {
            modifyGold(player.id, -cost);
            spendTime(player.id, time);
            cureSickness(player.id);
          }}
          onBlessHealth={(cost, time) => {
            modifyGold(player.id, -cost);
            modifyMaxHealth(player.id, 10);
            spendTime(player.id, time);
          }}
        />`,
  `        <HealerPanel
          player={player}
          priceModifier={priceModifier}
        />`,
);

replace(
  'src/network/types.ts',
  `  'modifyRelaxation',
  'cureSickness',`,
  `  'modifyRelaxation',`,
);

replace(
  'src/test/multiplayer.test.ts',
  `      'modifyHappiness', 'modifyFood', 'modifyClothing', 'modifyMaxHealth',
      'modifyRelaxation', 'cureSickness', 'payHousingRent',`,
  `      'modifyHappiness', 'modifyFood', 'modifyClothing', 'modifyMaxHealth',
      'modifyRelaxation', 'payHousingRent',`,
);
replace(
  'src/test/multiplayer.test.ts',
  `    expect(ALLOWED_GUEST_ACTIONS.has('performHomeActivity')).toBe(true);`,
  `    expect(ALLOWED_GUEST_ACTIONS.has('performHomeActivity')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useHealerService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('cureSickness')).toBe(false);`,
);
