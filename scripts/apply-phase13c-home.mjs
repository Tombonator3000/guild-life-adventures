import fs from 'node:fs';

function replace(path, before, after) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`Missing expected text in ${path}: ${before.slice(0, 120)}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

replace(
  'src/store/gameStore.ts',
  "import { createTravelServiceActions } from './helpers/travelServiceHelpers';",
  "import { createTravelServiceActions } from './helpers/travelServiceHelpers';\nimport { createHomeActivityActions } from './helpers/homeActivityHelpers';",
);
replace(
  'src/store/gameStore.ts',
  '  const travelServiceActions = createTravelServiceActions(set, get);',
  '  const travelServiceActions = createTravelServiceActions(set, get);\n  const homeActivityActions = createHomeActivityActions(set, get);',
);
replace(
  'src/store/gameStore.ts',
  `    // Canonical route intent. Host validates route adjacency and computes time.
    ...wrapWithNetworkGuard(travelServiceActions),`,
  `    // Canonical route intent. Host validates route adjacency and computes time.
    ...wrapWithNetworkGuard(travelServiceActions),

    // Canonical home recovery. Host resolves location, duration and effects.
    ...wrapWithNetworkGuard(homeActivityActions),`,
);

replace(
  'src/store/storeTypes.ts',
  `  acceptMarketRaise: (playerId: string) => ActionResult | void;`,
  `  acceptMarketRaise: (playerId: string) => ActionResult | void;
  performHomeActivity: (playerId: string, activity: 'relax' | 'sleep') => ActionResult | void;`,
);

replace(
  'src/network/types.ts',
  `  'endTurn',

  // Legacy raw mutations`,
  `  'endTurn',
  'performHomeActivity',

  // Legacy raw mutations`,
);

replace(
  'src/network/actionValidation.ts',
  `    case 'acceptMarketRaise':
      return null;`,
  `    case 'acceptMarketRaise':
      return null;

    case 'performHomeActivity':
      return validateEnumArg(args, 1, ['relax', 'sleep'], 'home activity');`,
);

replace(
  'src/components/game/HomePanel.tsx',
  `  spendTime: (playerId: string, hours: number) => void;
  modifyHappiness: (playerId: string, amount: number) => void;
  modifyHealth: (playerId: string, amount: number) => void;
  modifyRelaxation: (playerId: string, amount: number) => void;
  onDone: () => void;`,
  `  onDone: () => void;`,
);
replace(
  'src/components/game/HomePanel.tsx',
  `  locationId,
  spendTime,
  modifyHappiness,
  modifyHealth,
  modifyRelaxation,
  onDone,`,
  `  locationId,
  onDone,`,
);
replace(
  'src/components/game/HomePanel.tsx',
  `  const handleRelax = () => {
    spendTime(player.id, housingData.relaxationRate);
    modifyHappiness(player.id, 3);
    modifyRelaxation(player.id, 5);
  };

  const handleSleep = () => {
    spendTime(player.id, 8);
    modifyHappiness(player.id, 8);
    modifyHealth(player.id, 10);
    modifyRelaxation(player.id, 5);
  };`,
  `  const runHomeActivity = (activity: 'relax' | 'sleep') => {
    const result = store.performHomeActivity(player.id, activity);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const handleRelax = () => runHomeActivity('relax');
  const handleSleep = () => runHomeActivity('sleep');`,
);

replace(
  'src/components/game/LocationPanel.tsx',
  `          spendTime={store.spendTime}
          modifyHappiness={store.modifyHappiness}
          modifyHealth={store.modifyHealth}
          modifyRelaxation={store.modifyRelaxation}
          onDone={() => store.selectLocation(null)}`,
  `          onDone={() => store.selectLocation(null)}`,
);

replace(
  'src/test/multiplayer.test.ts',
  `    expect(ALLOWED_GUEST_ACTIONS.has('travelPlayer')).toBe(true);`,
  `    expect(ALLOWED_GUEST_ACTIONS.has('travelPlayer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('performHomeActivity')).toBe(true);`,
);
replace(
  'src/test/multiplayer.test.ts',
  `      'travelPlayer', 'spendTime', 'modifyGold', 'modifyHealth',`,
  `      'travelPlayer', 'performHomeActivity', 'spendTime', 'modifyGold', 'modifyHealth',`,
);
