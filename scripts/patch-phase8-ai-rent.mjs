import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/hooks/ai/actions/criticalNeeds.ts';
let source = readFileSync(path, 'utf8');
source = source.replace(
  `  const { player, urgency, currentLocation, moveCost } = ctx;`,
  `  const { player, urgency, currentLocation, moveCost, priceModifier } = ctx;`,
);
source = source.replace(
  `player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing]`,
  `player.lockedRent > 0 ? player.lockedRent : Math.round(RENT_COSTS[player.housing] * priceModifier)`,
);
source = source.replace(
  `player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing]`,
  `player.lockedRent > 0 ? player.lockedRent : Math.round(RENT_COSTS[player.housing] * priceModifier)`,
);
if (!source.includes('Math.round(RENT_COSTS[player.housing] * priceModifier)')) {
  throw new Error('AI rent precheck was not updated');
}
writeFileSync(path, source);
