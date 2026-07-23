import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/hooks/ai/actions/criticalNeeds.ts';
let source = readFileSync(path, 'utf8');
const functionStart = source.indexOf('function generateRentActions');
if (functionStart === -1) throw new Error('generateRentActions not found');
const functionEnd = source.indexOf('\n}\n\n// ─── Clothing actions', functionStart);
if (functionEnd === -1) throw new Error('generateRentActions end not found');
let block = source.slice(functionStart, functionEnd + 2);
block = block.replace(
  `  const { player, urgency, currentLocation, moveCost } = ctx;`,
  `  const { player, urgency, currentLocation, moveCost, priceModifier } = ctx;`,
);
if (!block.includes('moveCost, priceModifier')) {
  throw new Error('Rent action destructuring was not updated');
}
source = source.slice(0, functionStart) + block + source.slice(functionEnd + 2);
writeFileSync(path, source);
