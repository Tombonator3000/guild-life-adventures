import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceOnce(text, from, to, path) {
  if (!text.includes(from)) throw new Error(`Missing pattern in ${path}: ${from.slice(0, 120)}`);
  return text.replace(from, to);
}

// storeTypes.ts
{
  const path = 'src/store/storeTypes.ts';
  let text = read(path);
  text = replaceOnce(text,
    "import type { StreetRobberyResult, ApartmentRobberyResult } from '@/data/shadowfingers';\n",
    "import type { StreetRobberyResult, ApartmentRobberyResult } from '@/data/shadowfingers';\nimport type { DungeonActionResult, DungeonAdvanceAction, DungeonRunSession } from './dungeonTypes';\n",
    path,
  );
  text = replaceOnce(text,
    "  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings, aiDifficulty?: AIDifficulty, aiConfigs?: AIConfig[], playerPortraits?: (string | null)[]) => void;\n",
    "  startNewGame: (playerNames: string[], includeAI: boolean, goals: GoalSettings, aiDifficulty?: AIDifficulty, aiConfigs?: AIConfig[], playerPortraits?: (string | null)[]) => void;\n  dungeonRuns: Record<string, DungeonRunSession>;\n",
    path,
  );
  text = replaceOnce(text,
    "  purchaseTavernItem: (playerId: string, itemId: string) => ActionResult | void;\n",
    "  purchaseTavernItem: (playerId: string, itemId: string) => ActionResult | void;\n  beginDungeonRun: (playerId: string, floorId: number) => DungeonActionResult | void;\n  resolveDungeonEncounter: (playerId: string) => DungeonActionResult | void;\n  advanceDungeonRun: (playerId: string, action: DungeonAdvanceAction) => DungeonActionResult | void;\n  finalizeDungeonRun: (playerId: string) => DungeonActionResult | void;\n",
    path,
  );
  write(path, text);
}

// gameStore.ts
{
  const path = 'src/store/gameStore.ts';
  let text = read(path);
  text = replaceOnce(text,
    "import { createHomeActivityActions } from './helpers/homeActivityHelpers';\n",
    "import { createHomeActivityActions } from './helpers/homeActivityHelpers';\nimport { createDungeonServiceActions } from './helpers/dungeonServiceHelpers';\n",
    path,
  );
  text = replaceOnce(text,
    "  const homeActivityActions = createHomeActivityActions(set, get);\n",
    "  const homeActivityActions = createHomeActivityActions(set, get);\n  const dungeonServiceActions = createDungeonServiceActions(set, get);\n",
    path,
  );
  text = replaceOnce(text,
    "    weeklyNewsEvents: [],\n    locationHexes: [],\n",
    "    weeklyNewsEvents: [],\n    locationHexes: [],\n    dungeonRuns: {},\n",
    path,
  );
  text = replaceOnce(text,
    "        deathEvent: null,\n        locationHexes: [],\n",
    "        deathEvent: null,\n        locationHexes: [],\n        dungeonRuns: {},\n",
    path,
  );
  text = replaceOnce(text,
    "    // Canonical home recovery. Host resolves location, duration and effects.\n    ...wrapWithNetworkGuard(homeActivityActions),\n",
    "    // Canonical home recovery. Host resolves location, duration and effects.\n    ...wrapWithNetworkGuard(homeActivityActions),\n\n    // Host-owned interactive dungeon state machine and settlement.\n    ...wrapWithNetworkGuard(dungeonServiceActions),\n",
    path,
  );
  text = replaceOnce(text,
    "        locationHexes: [],\n        stockPrices: getInitialStockPrices(),\n",
    "        locationHexes: [],\n        dungeonRuns: {},\n        stockPrices: getInitialStockPrices(),\n",
    path,
  );
  text = replaceOnce(text,
    "        locationHexes: gs.locationHexes ?? [],\n",
    "        locationHexes: gs.locationHexes ?? [],\n        dungeonRuns: {}, // Active combat is transient and never resumed from a save.\n",
    path,
  );
  text = replaceOnce(text,
    "      const state = get();\n      return saveGame(state, slot, slotName);\n",
    "      const state = get();\n      if (Object.keys(state.dungeonRuns).length > 0) return false;\n      return saveGame(state, slot, slotName);\n",
    path,
  );
  write(path, text);
}

// network/types.ts
{
  const path = 'src/network/types.ts';
  let text = read(path);
  text = replaceOnce(text,
    "import type { GameState, GoalSettings, AIDifficulty, LocationId } from '@/types/game.types';\n",
    "import type { GameState, GoalSettings, AIDifficulty, LocationId } from '@/types/game.types';\nimport type { DungeonRunSession } from '@/store/dungeonTypes';\n",
    path,
  );
  text = replaceOnce(text,
    "export interface SerializedGameState extends GameState {\n",
    "export interface SerializedGameState extends GameState {\n  dungeonRuns?: Record<string, DungeonRunSession>;\n",
    path,
  );
  text = replaceOnce(text,
    "  'purchaseVendorItem',\n  'purchaseTavernItem',\n",
    "  'purchaseVendorItem',\n  'purchaseTavernItem',\n\n  // Interactive dungeon intent only. Host owns encounters, time, damage and settlement.\n  'beginDungeonRun',\n  'resolveDungeonEncounter',\n  'advanceDungeonRun',\n  'finalizeDungeonRun',\n",
    path,
  );
  text = text.replace("\n  'applyDurabilityLoss',\n", "\n");
  text = text.replace("\n  'incrementDungeonAttempts',\n", "\n");
  write(path, text);
}

// actionValidation.ts
{
  const path = 'src/network/actionValidation.ts';
  let text = read(path);
  text = replaceOnce(text,
    "    case 'purchaseTavernItem':\n      return validateStringArg(args, 1, 'tavern item');\n",
    "    case 'purchaseTavernItem':\n      return validateStringArg(args, 1, 'tavern item');\n\n    case 'beginDungeonRun':\n      return validateNumArg(args, 1, 1, 6, 'dungeon floor', true);\n\n    case 'resolveDungeonEncounter':\n    case 'finalizeDungeonRun':\n      return args.length === 1 ? null : 'Invalid dungeon arguments';\n\n    case 'advanceDungeonRun':\n      return validateEnumArg(args, 1, ['continue', 'skip-healing', 'retreat', 'leave'], 'dungeon action');\n",
    path,
  );
  write(path, text);
}

// networkState.ts
{
  const path = 'src/network/networkState.ts';
  let text = read(path);
  text = replaceOnce(text,
    "    locationHexes: s.locationHexes,\n",
    "    locationHexes: s.locationHexes,\n    dungeonRuns: s.dungeonRuns,\n",
    path,
  );
  text = replaceOnce(text,
    "    locationHexes: state.locationHexes ?? [],\n",
    "    locationHexes: state.locationHexes ?? [],\n    dungeonRuns: state.dungeonRuns ?? {},\n",
    path,
  );
  write(path, text);
}

// turnHelpers.ts: don't permit end-turn escape from an active host dungeon session.
{
  const path = 'src/store/helpers/turnHelpers.ts';
  let text = read(path);
  text = replaceOnce(text,
    "    endTurn: () => {\n      const state = get();\n\n      // --- Auto-use remaining time based on current location ---\n      const turningPlayer = state.players[state.currentPlayerIndex];\n",
    "    endTurn: () => {\n      const state = get();\n      const turningPlayer = state.players[state.currentPlayerIndex];\n      if (turningPlayer && state.dungeonRuns[turningPlayer.id]) return;\n\n      // --- Auto-use remaining time based on current location ---\n",
    path,
  );
  write(path, text);
}

// locationTabs.tsx
{
  const path = 'src/components/game/locationTabs.tsx';
  let text = read(path);
  const from = `function caveTabs(ctx: LocationTabContext): LocationTab[] {\n  const { player, spendTime, modifyGold, modifyHealth, modifyHappiness, clearDungeonFloor, applyRareDrop } = ctx;\n  return [{\n    id: 'dungeon',\n    label: 'Dungeon',\n    content: (\n      <CavePanel\n        player={player}\n        spendTime={spendTime}\n        modifyGold={modifyGold}\n        modifyHealth={modifyHealth}\n        modifyHappiness={modifyHappiness}\n        clearDungeonFloor={clearDungeonFloor}\n        applyRareDrop={applyRareDrop}\n      />\n    ),\n  }];\n}\n`;
  const to = `function caveTabs(ctx: LocationTabContext): LocationTab[] {\n  return [{\n    id: 'dungeon',\n    label: 'Dungeon',\n    content: <CavePanel player={ctx.player} />,\n  }];\n}\n`;
  text = replaceOnce(text, from, to, path);
  write(path, text);
}

// CavePanel.tsx targeted migration
{
  const path = 'src/components/game/CavePanel.tsx';
  let text = read(path);
  text = text.replace("import { getHexById } from '@/data/hexes';\n", '');
  text = replaceOnce(text,
    `interface CavePanelProps {\n  player: Player;\n  spendTime: (playerId: string, hours: number) => void;\n  modifyGold: (playerId: string, amount: number) => void;\n  modifyHealth: (playerId: string, amount: number) => void;\n  modifyHappiness: (playerId: string, amount: number) => void;\n  clearDungeonFloor: (playerId: string, floorId: number) => void;\n  applyRareDrop: (playerId: string, dropId: string) => void;\n}\n`,
    `interface CavePanelProps {\n  player: Player;\n}\n`,
    path,
  );
  text = replaceOnce(text,
    `export function CavePanel({\n  player,\n  spendTime,\n  modifyGold,\n  modifyHealth,\n  modifyHappiness,\n  clearDungeonFloor,\n  applyRareDrop,\n}: CavePanelProps) {`,
    `export function CavePanel({ player }: CavePanelProps) {`,
    path,
  );
  text = replaceOnce(text,
    "  const [combatResult, setCombatResult] = useState<{ result: CombatRunResult; floor: DungeonFloor } | null>(null);\n",
    "  const [combatResult, setCombatResult] = useState<{ result: CombatRunResult; floor: DungeonFloor } | null>(null);\n  const activeSession = useGameStore(state => state.dungeonRuns[player.id]);\n  const sessionFloor = activeSession ? DUNGEON_FLOORS.find(floor => floor.id === activeSession.floorId) ?? null : null;\n  const currentFloor = activeFloor ?? sessionFloor;\n",
    path,
  );
  const oldHandlers = `  const handleEnterFloor = (floor: DungeonFloor) => {\n    if (attemptsRemaining <= 0) {\n      toast.error('You are too fatigued for another dungeon run this week.');\n      return;\n    }\n    // Only charge for the first encounter's time on entry (rest charged per encounter)\n    const encounterTime = getEncounterTimeCost(floor, combatStats);\n    spendTime(player.id, encounterTime);\n    // M31 FIX: Use proper store action instead of direct setState\n    const { incrementDungeonAttempts } = useGameStore.getState();\n    incrementDungeonAttempts(player.id);\n    setActiveFloor(floor);\n  };\n\n  // ─── Per-encounter health application (immediate damage) ──\n\n  const handleEncounterHealthDelta = (delta: number): boolean => {\n    if (delta !== 0) modifyHealth(player.id, delta);\n    // Check for death immediately after each encounter\n    const { checkDeath } = useGameStore.getState();\n    return checkDeath(player.id);\n  };\n\n  // ─── Combat complete — apply results ───────────────────────\n\n  const handleCombatComplete = (result: CombatRunResult) => {\n    if (!activeFloor) return;\n    const { applyDurabilityLoss, checkDeath, updatePlayerDungeonRecord } = useGameStore.getState();\n\n    // Gold\n    if (result.goldEarned > 0) modifyGold(player.id, result.goldEarned);\n\n    // Equipment durability\n    applyDurabilityLoss(player.id, result.durabilityLoss);\n    const wearMessage = formatEquipmentWear(result.durabilityLoss);\n    if (wearMessage) toast(wearMessage, { duration: 3000 });\n\n    // Health was applied per-encounter; do a final death check in case something was missed\n    checkDeath(player.id);\n\n    // Happiness\n    if (result.happinessChange !== 0) modifyHappiness(player.id, result.happinessChange);\n\n    // First-clear reward\n    if (result.isFirstClear) clearDungeonFloor(player.id, activeFloor.id);\n\n    // Rare drop\n    if (result.rareDropName) {\n      applyRareDrop(player.id, activeFloor.rareDrop.id);\n      toast.success(\`RARE DROP: \${result.rareDropName}! \${activeFloor.rareDrop.description}\`, { duration: 6000 });\n    }\n\n    // Hex scroll drop (if hexes enabled and boss dropped one)\n    if (result.hexScrollDropId) {\n      const { addHexScrollToPlayer } = useGameStore.getState();\n      addHexScrollToPlayer(player.id, result.hexScrollDropId);\n      const hexDef = getHexById(result.hexScrollDropId);\n      toast.success(\n        \`DARK SCROLL: \${hexDef?.name || 'Unknown Hex'}! A forbidden scroll materializes from the darkness.\`,\n        { duration: 6000 },\n      );\n    }\n\n    // M31 FIX: Use proper store action instead of direct setState\n    // E2: pass week and cleared for run history tracking\n    const currentWeek = useGameStore.getState().week;\n    updatePlayerDungeonRecord(player.id, activeFloor.id, result.goldEarned, result.encountersCompleted, currentWeek, result.success);\n\n    // E4: Show detailed result panel instead of just a toast\n    setCombatResult({ result, floor: activeFloor });\n    setActiveFloor(null);\n  };`;
  const newHandlers = `  const handleEnterFloor = (floor: DungeonFloor) => {\n    if (attemptsRemaining <= 0) {\n      toast.error('You are too fatigued for another dungeon run this week.');\n      return;\n    }\n    setActiveFloor(floor);\n    const result = useGameStore.getState().beginDungeonRun(player.id, floor.id);\n    if (result && !result.success) {\n      setActiveFloor(null);\n      toast.error(result.message);\n    }\n  };\n\n  // ─── Combat complete — the host has already settled all effects ──\n\n  const handleCombatComplete = (result: CombatRunResult) => {\n    const floor = currentFloor;\n    if (!floor) return;\n    const wearMessage = formatEquipmentWear(result.durabilityLoss);\n    if (wearMessage) toast(wearMessage, { duration: 3000 });\n    if (result.rareDropName) {\n      toast.success(\`RARE DROP: \${result.rareDropName}! \${floor.rareDrop.description}\`, { duration: 6000 });\n    }\n    if (result.hexScrollDropId) {\n      toast.success('DARK SCROLL: A forbidden scroll materializes from the darkness.', { duration: 6000 });\n    }\n    setCombatResult({ result, floor });\n    setActiveFloor(null);\n  };`;
  text = replaceOnce(text, oldHandlers, newHandlers, path);
  text = replaceOnce(text,
    `  if (activeFloor) {\n    return (\n      <CombatView\n        player={player}\n        floor={activeFloor}\n        onComplete={handleCombatComplete}\n        onCancel={() => setActiveFloor(null)}\n        onSpendTime={(hours: number) => spendTime(player.id, hours)}\n        encounterTimeCost={getEncounterTimeCost(activeFloor, combatStats)}\n        onEncounterHealthDelta={handleEncounterHealthDelta}\n      />\n    );\n  }`,
    `  if (currentFloor) {\n    return (\n      <CombatView\n        player={player}\n        floor={currentFloor}\n        onComplete={handleCombatComplete}\n        onCancel={() => setActiveFloor(null)}\n      />\n    );\n  }`,
    path,
  );
  write(path, text);
}

console.log('Phase 13F dungeon integration applied.');
