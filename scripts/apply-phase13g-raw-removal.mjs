import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceOnce(text, from, to, path) {
  if (!text.includes(from)) throw new Error(`Missing pattern in ${path}: ${from.slice(0, 140)}`);
  return text.replace(from, to);
}

// Add canonical Cave rest service.
{
  const path = 'src/store/helpers/dungeonServiceHelpers.ts';
  let text = read(path);
  text = replaceOnce(text,
    "  return {\n    beginDungeonRun: (playerId: string, floorId: number): DungeonActionResult => {\n",
    `  return {\n    performCaveRest: (playerId: string): DungeonActionResult => {\n      const state = get();\n      const player = state.players.find(candidate => candidate.id === playerId);\n      if (!player) return fail('Player not found.');\n      if (player.currentLocation !== 'cave') return fail('Rest is only available inside the Cave.');\n      if (state.dungeonRuns[playerId]) return fail('Finish the active dungeon run before resting.');\n      if (player.timeRemaining < 8) return fail('Not enough time to rest.');\n      if (player.health >= player.maxHealth) return fail('Health is already full.');\n\n      const healed = Math.min(15, player.maxHealth - player.health);\n      set(current => ({\n        players: current.players.map(candidate => candidate.id !== playerId ? candidate : {\n          ...candidate,\n          timeRemaining: candidate.timeRemaining - 8,\n          health: Math.min(candidate.maxHealth, candidate.health + healed),\n          happiness: Math.min(100, candidate.happiness + 1),\n          gameStats: {\n            ...candidate.gameStats,\n            totalHealingReceived: (candidate.gameStats.totalHealingReceived ?? 0) + healed,\n          },\n        }),\n      }));\n      return { success: true, message: \`You rested and recovered \${healed} health.\` };\n    },\n\n    beginDungeonRun: (playerId: string, floorId: number): DungeonActionResult => {\n`,
    path,
  );
  write(path, text);
}

// Expose Cave rest in store type.
{
  const path = 'src/store/storeTypes.ts';
  let text = read(path);
  text = replaceOnce(text,
    "  beginDungeonRun: (playerId: string, floorId: number) => DungeonActionResult | void;\n",
    "  performCaveRest: (playerId: string) => DungeonActionResult | void;\n  beginDungeonRun: (playerId: string, floorId: number) => DungeonActionResult | void;\n",
    path,
  );
  write(path, text);
}

// Replace stale raw Cave rest callback body.
{
  const path = 'src/components/game/CavePanel.tsx';
  let text = read(path);
  const from = `          onClick={() => {\n            spendTime(player.id, 8);\n            const healAmount = Math.min(\n              15,\n              player.maxHealth - player.health,\n            );\n            modifyHealth(player.id, healAmount);\n            modifyHappiness(player.id, 1);\n            toast.success(\n              \`You rested and recovered \${healAmount} health.\`,\n            );\n          }}\n`;
  const to = `          onClick={() => {\n            const result = useGameStore.getState().performCaveRest(player.id);\n            if (result && !result.success) {\n              toast.error(result.message);\n              return;\n            }\n            const healAmount = Math.min(15, player.maxHealth - player.health);\n            toast.success(result?.message ?? \`You rested and recovered \${healAmount} health.\`);\n          }}\n`;
  text = replaceOnce(text, from, to, path);
  write(path, text);
}

// Remove dead Graveyard callbacks: panel already executes canonical service directly.
{
  const path = 'src/components/game/GraveyardPanel.tsx';
  let text = read(path);
  text = replaceOnce(text,
    `interface GraveyardPanelProps {\n  player: Player;\n  priceModifier: number;\n  onPray: (cost: number, happinessGain: number, time: number) => void;\n  onMourn: (cost: number, relaxationGain: number, time: number) => void;\n  onBlessMaxHealth: (cost: number, maxHealthGain: number, time: number) => void;\n}\n`,
    `interface GraveyardPanelProps {\n  player: Player;\n  priceModifier: number;\n}\n`,
    path,
  );
  write(path, text);
}

// Migrate Shadow Market newspaper and Graveyard tab wiring.
{
  const path = 'src/components/game/locationTabs.tsx';
  let text = read(path);
  text = replaceOnce(text,
    "import type { GameStore } from '@/store/storeTypes';\n",
    "import type { GameStore } from '@/store/storeTypes';\nimport { useGameStore } from '@/store/gameStore';\n",
    path,
  );
  text = replaceOnce(text,
    "  const { player, players, priceModifier, modifyGold,\n    economyTrend, week, weeklyNewsEvents, onShowNewspaper } = ctx;\n",
    "  const { player, players, priceModifier,\n    economyTrend, week, weeklyNewsEvents, onShowNewspaper } = ctx;\n",
    path,
  );
  text = replaceOnce(text,
    `            onClick={() => {\n              playSFX('item-buy');\n              modifyGold(player.id, -shadowNewspaperPrice);\n              const newspaper = generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents);\n              onShowNewspaper(newspaper);\n            }}\n`,
    `            onClick={() => {\n              playSFX('item-buy');\n              const result = useGameStore.getState().purchaseNewspaper(player.id, 'shadow-market');\n              if (result && !result.success) {\n                toast.error(result.message);\n                return;\n              }\n              const newspaper = generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents);\n              onShowNewspaper(newspaper);\n            }}\n`,
    path,
  );
  const oldGraveyard = `function graveyardTabs(ctx: LocationTabContext): LocationTab[] {\n  const { player, priceModifier, modifyGold, modifyHappiness, modifyRelaxation, modifyMaxHealth, spendTime } = ctx;\n  const hexesEnabled = getGameOption('enableHexesCurses');\n  const tabs: LocationTab[] = [{\n    id: 'cemetery',\n    label: 'Cemetery',\n    content: (\n      <GraveyardPanel\n        player={player}\n        priceModifier={priceModifier}\n        onPray={(cost, happinessGain, time) => {\n          modifyGold(player.id, -cost);\n          modifyHappiness(player.id, happinessGain);\n          spendTime(player.id, time);\n        }}\n        onMourn={(cost, relaxationGain, time) => {\n          modifyGold(player.id, -cost);\n          modifyRelaxation(player.id, relaxationGain);\n          spendTime(player.id, time);\n        }}\n        onBlessMaxHealth={(cost, maxHealthGain, time) => {\n          modifyGold(player.id, -cost);\n          modifyMaxHealth(player.id, maxHealthGain);\n          spendTime(player.id, time);\n        }}\n      />\n    ),\n  }];\n`;
  const newGraveyard = `function graveyardTabs(ctx: LocationTabContext): LocationTab[] {\n  const { player, priceModifier } = ctx;\n  const hexesEnabled = getGameOption('enableHexesCurses');\n  const tabs: LocationTab[] = [{\n    id: 'cemetery',\n    label: 'Cemetery',\n    content: <GraveyardPanel player={player} priceModifier={priceModifier} />,\n  }];\n`;
  text = replaceOnce(text, oldGraveyard, newGraveyard, path);
  write(path, text);
}

// Migrate General Store newspaper button.
{
  const path = 'src/components/game/LocationPanel.tsx';
  let text = read(path);
  text = replaceOnce(text,
    `    playSFX('item-buy');\n    store.modifyGold(player.id, -price);\n    const newspaper = generateNewspaper(store.week, store.priceModifier, store.economyTrend, store.weeklyNewsEvents);\n`,
    `    playSFX('item-buy');\n    const result = store.purchaseNewspaper(player.id, 'general-store');\n    if (result && !result.success) {\n      toast.error(result.message);\n      return;\n    }\n    const newspaper = generateNewspaper(store.week, store.priceModifier, store.economyTrend, store.weeklyNewsEvents);\n`,
    path,
  );
  write(path, text);
}

// Remove all raw stat/time mutations from the guest protocol and add Cave rest.
{
  const path = 'src/network/types.ts';
  let text = read(path);
  const rawBlock = `  'travelPlayer',\n  'spendTime',\n  'endTurn',\n  'performHomeActivity',\n\n  // Legacy raw mutations still used by older UI flows. Keep bounded by\n  // STAT_MODIFIER_RULES until each remaining caller is migrated.\n  'modifyGold',\n  'modifyHealth',\n  'modifyHappiness',\n  'modifyFood',\n  'modifyClothing',\n  'modifyMaxHealth',\n  'modifyRelaxation',\n`;
  const semanticBlock = `  'travelPlayer',\n  'endTurn',\n  'performHomeActivity',\n  'performCaveRest',\n`;
  text = replaceOnce(text, rawBlock, semanticBlock, path);
  write(path, text);
}

// Remove obsolete raw argument bounds; allow only semantic Cave rest.
{
  const path = 'src/network/actionValidation.ts';
  let text = read(path);
  const start = text.indexOf('const STAT_MODIFIER_RULES:');
  const end = text.indexOf('/**\n * Validate protocol-level argument shape', start);
  if (start < 0 || end < 0) throw new Error('STAT_MODIFIER_RULES block not found');
  text = text.slice(0, start) + text.slice(end);
  text = replaceOnce(text,
    `  const statRule = STAT_MODIFIER_RULES[name];\n  if (statRule) {\n    const amount = args[statRule.argIndex];\n    if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'Invalid amount';\n    if (statRule.positiveOnly) {\n      if (amount > statRule.max) return \`\${statRule.label} amount too large\`;\n    } else if (Math.abs(amount) > statRule.max) {\n      return \`\${statRule.label} amount too large\`;\n    }\n    return null;\n  }\n\n`,
    '',
    path,
  );
  text = text.replace("    case 'spendTime':\n      return validateNumArg(args, 1, 0, 60, 'hours', true);\n\n", '');
  text = replaceOnce(text,
    "    case 'performHomeActivity':\n      return validateEnumArg(args, 1, ['relax', 'sleep'], 'home activity');\n",
    "    case 'performHomeActivity':\n      return validateEnumArg(args, 1, ['relax', 'sleep'], 'home activity');\n\n    case 'performCaveRest':\n      return args.length === 1 ? null : 'Invalid Cave rest arguments';\n",
    path,
  );
  write(path, text);
}

// Update protocol tests: raw actions must now be rejected at the allowlist gate.
{
  const path = 'src/network/protocolSecurity.test.ts';
  let text = read(path);
  text = replaceOnce(text,
    `  it('rejects negative time and malformed or legacy travel requests', () => {\n    const state = useGameStore.getState();\n    const alice = state.players[0];\n\n    expect(validateGuestActionArgs('spendTime', [alice.id, -60], state)).toBe('hours out of range');\n    expect(validateGuestActionArgs('spendTime', [alice.id, Number.NaN], state)).toBe('Invalid hours');\n    expect(validateGuestActionRequest('movePlayer', [alice.id, 'bank', 0], alice.id, alice.id, state)).toBe('Action not allowed');\n`,
    `  it('rejects raw time mutations and malformed or legacy travel requests', () => {\n    const state = useGameStore.getState();\n    const alice = state.players[0];\n\n    expect(validateGuestActionRequest('spendTime', [alice.id, 1], alice.id, alice.id, state)).toBe('Action not allowed');\n    expect(validateGuestActionRequest('spendTime', [alice.id, -60], alice.id, alice.id, state)).toBe('Action not allowed');\n    expect(validateGuestActionRequest('movePlayer', [alice.id, 'bank', 0], alice.id, alice.id, state)).toBe('Action not allowed');\n`,
    path,
  );
  text = replaceOnce(text,
    `    expect(validateGuestActionArgs('modifyGold', [alice.id, 501], state)).toBe('Gold amount too large');\n    expect(validateGuestActionArgs('modifyHealth', [alice.id, Infinity], state)).toBe('Invalid amount');\n`,
    `    expect(validateGuestActionRequest('modifyGold', [alice.id, 1], alice.id, alice.id, state)).toBe('Action not allowed');\n    expect(validateGuestActionRequest('modifyHealth', [alice.id, -1], alice.id, alice.id, state)).toBe('Action not allowed');\n`,
    path,
  );
  write(path, text);
}

// Update playerId invariant list.
{
  const path = 'src/test/multiplayer.test.ts';
  let text = read(path);
  text = replaceOnce(text,
    `      'travelPlayer', 'performHomeActivity', 'spendTime', 'modifyGold', 'modifyHealth',\n      'modifyHappiness', 'modifyFood', 'modifyClothing', 'modifyMaxHealth',\n      'modifyRelaxation', 'payHousingRent',\n`,
    `      'travelPlayer', 'performHomeActivity', 'performCaveRest', 'payHousingRent',\n`,
    path,
  );
  write(path, text);
}

console.log('Phase 13G raw guest action removal applied.');
