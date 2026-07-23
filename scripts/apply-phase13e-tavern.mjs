import fs from 'node:fs';

function replace(path, before, after) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`Missing expected text in ${path}: ${before.slice(0, 120)}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

replace(
  'src/store/helpers/economyHelpers.ts',
  "import { createVendorActions } from './economy/vendorHelpers';",
  "import { createVendorActions } from './economy/vendorHelpers';\nimport { createTavernServiceActions } from './economy/tavernServiceHelpers';",
);
replace(
  'src/store/helpers/economyHelpers.ts',
  `    ...createVendorActions(set, get),`,
  `    ...createVendorActions(set, get),
    ...createTavernServiceActions(set, get),`,
);

replace(
  'src/store/storeTypes.ts',
  `  performHomeActivity: (playerId: string, activity: 'relax' | 'sleep') => ActionResult | void;`,
  `  performHomeActivity: (playerId: string, activity: 'relax' | 'sleep') => ActionResult | void;
  purchaseTavernItem: (playerId: string, itemId: string) => ActionResult | void;`,
);

replace(
  'src/types/game.types.ts',
  `  raiseAttemptedThisTurn: boolean;            // True if player already requested a raise this turn (reset on turn switch)`,
  `  raiseAttemptedThisTurn: boolean;            // True if player already requested a raise this turn (reset on turn switch)
  tavernAlesDrunkThisTurn: number;               // Host-owned ale counter for Tavern brawl risk (reset on turn switch)`,
);

replace(
  'src/store/gameStore.ts',
  `  raiseAttemptedThisTurn: false,`,
  `  raiseAttemptedThisTurn: false,
  tavernAlesDrunkThisTurn: 0,`,
);

replace(
  'src/data/saveLoad.ts',
  `  setDefault(p, 'raiseAttemptedThisTurn', false);`,
  `  setDefault(p, 'raiseAttemptedThisTurn', false);
  setDefault(p, 'tavernAlesDrunkThisTurn', 0);`,
);

replace(
  'src/store/helpers/turnHelpers.ts',
  `return { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation, dungeonAttemptsThisTurn: 0, hadRandomEventThisTurn: false, workedThisTurn: false, raiseAttemptedThisTurn: false };`,
  `return { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation, dungeonAttemptsThisTurn: 0, hadRandomEventThisTurn: false, workedThisTurn: false, raiseAttemptedThisTurn: false, tavernAlesDrunkThisTurn: 0 };`,
);

replace(
  'src/store/helpers/weekEndHelpers.ts',
  `  p.raiseAttemptedThisTurn = false;`,
  `  p.raiseAttemptedThisTurn = false;
  p.tavernAlesDrunkThisTurn = 0;`,
);

replace(
  'src/components/game/locationTabs.tsx',
  `function tavernTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier, modifyGold, spendTime, modifyFood, modifyHappiness, modifyHealth, setEventMessage } = ctx;`,
  `function tavernTabs(ctx: LocationTabContext): LocationTab[] {
  const { player, priceModifier } = ctx;`,
);
replace(
  'src/components/game/locationTabs.tsx',
  `      <TavernPanel
        player={player}
        priceModifier={priceModifier}
        modifyGold={modifyGold}
        spendTime={spendTime}
        modifyFood={modifyFood}
        modifyHappiness={modifyHappiness}
        modifyHealth={modifyHealth}
        setEventMessage={setEventMessage}
      />`,
  `      <TavernPanel
        player={player}
        priceModifier={priceModifier}
      />`,
);

replace(
  'src/network/types.ts',
  `  'purchaseVendorItem',`,
  `  'purchaseVendorItem',
  'purchaseTavernItem',`,
);

replace(
  'src/network/actionValidation.ts',
  `    case 'purchaseVendorItem': {
      const vendorError = validateEnumArg(args, 1, ['general-store', 'shadow-market'], 'vendor');
      return vendorError ?? validateStringArg(args, 2, 'item');
    }`,
  `    case 'purchaseVendorItem': {
      const vendorError = validateEnumArg(args, 1, ['general-store', 'shadow-market'], 'vendor');
      return vendorError ?? validateStringArg(args, 2, 'item');
    }

    case 'purchaseTavernItem':
      return validateStringArg(args, 1, 'tavern item');`,
);

replace(
  'src/test/multiplayer.test.ts',
  `    expect(ALLOWED_GUEST_ACTIONS.has('useHealerService')).toBe(true);`,
  `    expect(ALLOWED_GUEST_ACTIONS.has('useHealerService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseTavernItem')).toBe(true);`,
);
replace(
  'src/test/multiplayer.test.ts',
  `      'purchaseVendorItem', 'purchaseHexScroll', 'useHexDefense',`,
  `      'purchaseVendorItem', 'purchaseTavernItem', 'purchaseHexScroll', 'useHexDefense',`,
);
