import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceOnce(text, from, to, path) {
  if (!text.includes(from)) throw new Error(`Missing pattern in ${path}: ${from.slice(0, 140)}`);
  return text.replace(from, to);
}

// Wire the AI shopping wrapper into the store.
{
  const path = 'src/store/gameStore.ts';
  let text = read(path);
  text = replaceOnce(text,
    "import { createDungeonServiceActions } from './helpers/dungeonServiceHelpers';\n",
    "import { createDungeonServiceActions } from './helpers/dungeonServiceHelpers';\nimport { createAIResourceServiceActions } from './helpers/aiResourceServiceHelpers';\n",
    path,
  );
  text = replaceOnce(text,
    "  const dungeonServiceActions = createDungeonServiceActions(set, get);\n",
    "  const dungeonServiceActions = createDungeonServiceActions(set, get);\n  const aiResourceServiceActions = createAIResourceServiceActions(set, get);\n",
    path,
  );
  text = replaceOnce(text,
    "    // Host-owned interactive dungeon state machine and settlement.\n    ...wrapWithNetworkGuard(dungeonServiceActions),\n",
    "    // Host-owned interactive dungeon state machine and settlement.\n    ...wrapWithNetworkGuard(dungeonServiceActions),\n\n    // Internal AI shopping wrapper over canonical vendor services.\n    ...wrapWithNetworkGuard(aiResourceServiceActions),\n",
    path,
  );
  write(path, text);
}

// Store type.
{
  const path = 'src/store/storeTypes.ts';
  let text = read(path);
  text = replaceOnce(text,
    "  purchaseTavernItem: (playerId: string, itemId: string) => ActionResult | void;\n",
    "  purchaseTavernItem: (playerId: string, itemId: string) => ActionResult | void;\n  purchaseAIResourceItem: (playerId: string, vendor: 'general-store' | 'shadow-market' | 'rusty-tankard' | 'armory', itemId: string) => ActionResult | void;\n",
    path,
  );
  write(path, text);
}

// AI executor action surface.
{
  const path = 'src/hooks/ai/actionExecutor.ts';
  let text = read(path);
  text = replaceOnce(text,
    "  useHealerService: (playerId: string, serviceId: 'minor' | 'moderate' | 'full' | 'cure' | 'blessing') => { success: boolean; message: string } | void;\n",
    "  useHealerService: (playerId: string, serviceId: 'minor' | 'moderate' | 'full' | 'cure' | 'blessing') => { success: boolean; message: string } | void;\n  purchaseAIResourceItem: (playerId: string, vendor: 'general-store' | 'shadow-market' | 'rusty-tankard' | 'armory', itemId: string) => { success: boolean; message: string } | void;\n",
    path,
  );
  text = text.replace("  modifyFood: (playerId: string, amount: number) => void;\n", '');
  text = text.replace("  modifyClothing: (playerId: string, amount: number) => void;\n", '');
  text = text.replace("  buyFreshFood: (playerId: string, units: number, cost: number) => boolean;\n", '');
  text = text.replace("  buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number) => boolean;\n", '');
  text = text.replace("  buyTicket: (playerId: string, ticketType: string, cost: number) => void;\n", '');
  text = text.replace("  buyLotteryTicket: (playerId: string, cost: number) => void;\n", '');
  write(path, text);
}

// Replace resource handlers with catalogue intent.
{
  const path = 'src/hooks/ai/handlers/resourceHandlers.ts';
  const text = `/**\n * AI Action Handlers — Resource Purchases\n *\n * The generator chooses a catalogue item. The host-owned wrapper resolves\n * canonical price/effect and preserves the historical one-hour AI shopping cost.\n */\n\nimport type { Player } from '@/types/game.types';\nimport type { AIAction } from '../types';\nimport type { StoreActions } from '../actionExecutor';\n\nfunction runPurchase(\n  player: Player,\n  action: AIAction,\n  store: StoreActions,\n  fallbackVendor: 'general-store' | 'shadow-market' | 'rusty-tankard' | 'armory',\n  fallbackItemId: string,\n): boolean {\n  const vendor = (action.details?.vendor as typeof fallbackVendor | undefined) ?? fallbackVendor;\n  const itemId = (action.details?.itemId as string | undefined) ?? fallbackItemId;\n  const result = store.purchaseAIResourceItem(player.id, vendor, itemId);\n  return result?.success ?? false;\n}\n\nexport function handleBuyFood(player: Player, action: AIAction, store: StoreActions): boolean {\n  if (player.currentLocation === 'general-store') {\n    return runPurchase(player, action, store, 'general-store', 'cheese');\n  }\n  if (player.currentLocation === 'rusty-tankard') {\n    return runPurchase(player, action, store, 'rusty-tankard', 'stew');\n  }\n  if (player.currentLocation === 'shadow-market') {\n    return runPurchase(player, action, store, 'shadow-market', 'mystery-meat');\n  }\n  return false;\n}\n\nexport function handleBuyClothing(player: Player, action: AIAction, store: StoreActions): boolean {\n  if (player.currentLocation !== 'armory') return false;\n  const target = Number(action.details?.clothingGain ?? 35);\n  const itemId = target >= 90\n    ? 'noble-attire'\n    : target >= 60\n      ? 'fine-clothes'\n      : target >= 45\n        ? 'common-tunic'\n        : 'peasant-garb';\n  return runPurchase(player, action, store, 'armory', itemId);\n}\n\nexport function handleBuyFreshFood(player: Player, action: AIAction, store: StoreActions): boolean {\n  if (player.currentLocation !== 'general-store') return false;\n  const units = Number(action.details?.units ?? 2);\n  const itemId = units >= 6 ? 'fresh-provisions' : units >= 3 ? 'fresh-meat' : 'fresh-vegetables';\n  return runPurchase(player, action, store, 'general-store', itemId);\n}\n\nexport function handleBuyTicket(player: Player, action: AIAction, store: StoreActions): boolean {\n  if (player.currentLocation !== 'shadow-market') return false;\n  const ticketType = action.details?.ticketType as string | undefined;\n  const itemId = ticketType === 'bard-concert'\n    ? 'bard-concert-ticket'\n    : ticketType === 'theatre'\n      ? 'theatre-ticket'\n      : ticketType === 'jousting'\n        ? 'jousting-ticket'\n        : '';\n  if (!itemId) return false;\n  return runPurchase(player, action, store, 'shadow-market', itemId);\n}\n\nexport function handleBuyLotteryTicket(player: Player, action: AIAction, store: StoreActions): boolean {\n  if (player.currentLocation !== 'general-store' && player.currentLocation !== 'shadow-market') return false;\n  return runPurchase(player, action, store, player.currentLocation, 'lottery-ticket');\n}\n\nexport function handleBuyReputationUnlock(player: Player, action: AIAction, store: StoreActions): boolean {\n  const unlockId = action.details?.unlockId as string;\n  if (!unlockId) return false;\n  const result = store.purchaseReputationUnlock(player.id, unlockId);\n  return !result || result.success;\n}\n`;
  write(path, text);
}

// Zustand selector.
{
  const path = 'src/hooks/useGrimwaldAI.ts';
  let text = read(path);
  text = replaceOnce(text,
    "    useHealerService: state.useHealerService,\n",
    "    useHealerService: state.useHealerService,\n    purchaseAIResourceItem: state.purchaseAIResourceItem,\n",
    path,
  );
  text = text.replace("    modifyFood: state.modifyFood,\n", '');
  text = text.replace("    modifyClothing: state.modifyClothing,\n", '');
  text = text.replace("    buyFreshFood: state.buyFreshFood,\n", '');
  text = text.replace("    buyFoodWithSpoilage: state.buyFoodWithSpoilage,\n", '');
  text = text.replace("    buyTicket: state.buyTicket,\n", '');
  text = text.replace("    buyLotteryTicket: state.buyLotteryTicket,\n", '');
  write(path, text);
}

// Correct generator catalogue locations and add explicit item intent.
{
  const path = 'src/hooks/ai/actions/criticalNeeds.ts';
  let text = read(path);
  text = text.replace("details: { cost: Math.round(12 * pm), foodGain: 15 },", "details: { vendor: 'rusty-tankard', itemId: 'stew', cost: Math.round(12 * pm), foodGain: 15 },");
  text = text.replace("details: { cost: Math.round(15 * pm), foodGain: 15 },", "details: { vendor: 'general-store', itemId: 'cheese', cost: Math.round(15 * pm), foodGain: 15 },");
  text = text.replace("details: { cost: Math.round(6 * pm), foodGain: 10 },", "details: { vendor: 'shadow-market', itemId: 'mystery-meat', cost: Math.round(6 * pm), foodGain: 10 },");
  text = text.replace("ctx.settings.planningDepth >= 3 && (currentLocation === 'armory' || currentLocation === 'general-store')", "ctx.settings.planningDepth >= 3 && currentLocation === 'armory'");
  text = text.replace("if (currentLocation === 'armory' || currentLocation === 'general-store') {", "if (currentLocation === 'armory') {");
  text = replaceOnce(text,
    "      const movementCost = Math.min(moveCost('armory'), moveCost('general-store'));\n      if (player.timeRemaining > movementCost + 2) {\n        actions.push({\n          type: 'move',\n          location: moveCost('armory') < moveCost('general-store') ? 'armory' : 'general-store',\n",
    "      const movementCost = moveCost('armory');\n      if (player.timeRemaining > movementCost + 2) {\n        actions.push({\n          type: 'move',\n          location: 'armory',\n",
    path,
  );
  write(path, text);
}

// Correct fresh-food and ticket catalogue details.
{
  const path = 'src/hooks/ai/actions/economicActions.ts';
  let text = read(path);
  text = text.replace("if (currentLocation === 'general-store' || currentLocation === 'shadow-market') {\n      actions.push({ type: 'buy-fresh-food', priority: 55, description: 'Stock up on fresh food', details: { cost: 25, units: 2 } });\n", "if (currentLocation === 'general-store') {\n      actions.push({ type: 'buy-fresh-food', priority: 55, description: 'Stock up on fresh food', details: { vendor: 'general-store', itemId: 'fresh-vegetables', cost: Math.round(12 * ctx.priceModifier), units: 2 } });\n");
  text = text.replace("{ type: 'bard-concert', cost: 40 },\n        { type: 'theatre', cost: 30 },", "{ type: 'bard-concert', cost: 50 },\n        { type: 'theatre', cost: 40 },");
  text = text.replace("details: { ticketType: affordable.type, cost: affordable.cost }", "details: { vendor: 'shadow-market', itemId: `${affordable.type}-ticket`, ticketType: affordable.type, cost: affordable.cost }");
  text = text.replace("details: { cost: 5 }", "details: { vendor: currentLocation, itemId: 'lottery-ticket', cost: 10 }");
  write(path, text);
}

console.log('Phase 14B AI resource catalogue migration applied.');
