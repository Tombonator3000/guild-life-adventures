import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/test/multiplayer.test.ts';
let source = readFileSync(path, 'utf8');

const oldList = `      'invest', 'withdrawInvestment', 'buyItem', 'sellItem', 'buyDurable',
      'sellDurable', 'buyAppliance', 'repairAppliance', 'pawnAppliance', 'redeemAppliance',
      'equipItem', 'unequipItem', 'buyStock', 'sellStock', 'takeLoan',`;
const newList = `      'invest', 'withdrawInvestment', 'buyItem', 'sellItem', 'buyDurable',
      'sellDurable', 'purchaseAppliance', 'useApplianceService',
      'equipItem', 'unequipItem', 'buyStock', 'sellStock', 'takeLoan',`;

const next = source.replace(oldList, newList);
if (next === source) throw new Error('Cross-player appliance action list not found');
writeFileSync(path, next);
console.log(`Patched ${path}`);
