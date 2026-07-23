import fs from 'node:fs';

function replace(path, before, after) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`Missing expected text in ${path}: ${before.slice(0, 120)}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

replace(
  'src/store/gameStore.ts',
  "import { createEmploymentOfferActions } from './helpers/employmentOfferHelpers';",
  "import { createEmploymentOfferActions } from './helpers/employmentOfferHelpers';\nimport { createTravelServiceActions } from './helpers/travelServiceHelpers';",
);
replace(
  'src/store/gameStore.ts',
  '  const employmentOfferActions = createEmploymentOfferActions(set, get);',
  '  const employmentOfferActions = createEmploymentOfferActions(set, get);\n  const travelServiceActions = createTravelServiceActions(set, get);',
);
replace(
  'src/store/gameStore.ts',
  `    // Player actions (network-aware: guest actions forwarded to host)
    ...wrapWithNetworkGuard(playerActions),`,
  `    // Player actions (network-aware: guest actions forwarded to host)
    ...wrapWithNetworkGuard(playerActions),

    // Canonical route intent. Host validates route adjacency and computes time.
    ...wrapWithNetworkGuard(travelServiceActions),`,
);

replace(
  'src/store/storeTypes.ts',
  `  movePlayer: (playerId: string, location: LocationId, timeCost: number) => void;`,
  `  movePlayer: (playerId: string, location: LocationId, timeCost: number) => void;
  travelPlayer: (playerId: string, route: LocationId[]) => ActionResult | void;`,
);

replace(
  'src/network/types.ts',
  `  'movePlayer',`,
  `  'travelPlayer',`,
);

replace(
  'src/network/actionValidation.ts',
  `import { getLocation, getMovementCost, getPath } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
`,
  ``,
);
replace(
  'src/network/actionValidation.ts',
  `  currentWage?: number;
  currentLocation?: LocationId;`,
  `  currentWage?: number;`,
);
replace(
  'src/network/actionValidation.ts',
  `  store: GuestActionValidationStore,`,
  `  _store: GuestActionValidationStore,`,
);
replace(
  'src/network/actionValidation.ts',
  `    case 'movePlayer': {
      const destinationError = validateStringArg(args, 1, 'destination');
      if (destinationError) return destinationError;
      const timeError = validateNumArg(args, 2, 0, 60, 'movement cost', true);
      if (timeError) return timeError;

      const destination = args[1] as LocationId;
      if (!getLocation(destination)) return 'Invalid destination';

      const playerId = args[0];
      const player = typeof playerId === 'string'
        ? store.players.find(candidate => candidate.id === playerId)
        : undefined;
      if (!player?.currentLocation || !getLocation(player.currentLocation)) return 'Player location unavailable';

      const baseCost = getMovementCost(player.currentLocation, destination);
      const weatherExtraPerStep = store.weather?.movementCostExtra ?? 0;
      const weatherCost = weatherExtraPerStep > 0
        ? baseCost + getPath(player.currentLocation, destination).length * weatherExtraPerStep
        : baseCost;
      const suppliedCost = args[2] as number;
      if (suppliedCost !== baseCost && suppliedCost !== weatherCost) return 'Invalid movement cost';
      return null;
    }`,
  `    case 'travelPlayer': {
      const route = args[1];
      if (!Array.isArray(route)) return 'Invalid travel route';
      if (route.length < 2 || route.length > 61) return 'Travel route out of range';
      if (!route.every(location => typeof location === 'string' && location.length > 0)) {
        return 'Invalid travel route';
      }
      return null;
    }`,
);

replace(
  'src/components/game/LocationPanel.tsx',
  `import { getLocation, getMovementCost, getPath } from '@/data/locations';`,
  `import { getLocation, getPath } from '@/data/locations';`,
);
replace(
  'src/components/game/LocationPanel.tsx',
  `  const moveCost = getMovementCost(player.currentLocation, locationId);
  const isHere = player.currentLocation === locationId;
  const canAffordMove = player.timeRemaining >= moveCost;
  const canPartialTravel = !canAffordMove && player.timeRemaining > 0 && !isHere;

  const handleTravel = () => {
    if (isHere) return;
    if (canAffordMove) {
      store.movePlayer(player.id, locationId, moveCost);
    } else if (canPartialTravel) {
      const fullPath = getPath(player.currentLocation, locationId);
      const stepsCanTake = player.timeRemaining;
      if (stepsCanTake > 0 && fullPath.length > 1) {
        const partialPath = fullPath.slice(0, stepsCanTake + 1);
        const partialDestination = partialPath[partialPath.length - 1];
        store.movePlayer(player.id, partialDestination, player.timeRemaining);
        toast.info('Not enough time to reach destination. Turn ended.');
        store.selectLocation(null);
        setTimeout(() => store.endTurn(), 300);
      }
    }
  };`,
  `  const travelPath = getPath(player.currentLocation, locationId);
  const weatherExtra = store.weather?.movementCostExtra ?? 0;
  const routeCost = (steps: number) => steps + Math.floor(steps * Math.max(0, weatherExtra));
  const moveCost = routeCost(Math.max(0, travelPath.length - 1));
  const isHere = player.currentLocation === locationId;
  let partialSteps = 0;
  for (let steps = 1; steps < travelPath.length; steps += 1) {
    if (routeCost(steps) <= player.timeRemaining) partialSteps = steps;
  }
  const canAffordMove = !isHere && player.timeRemaining >= moveCost;
  const canPartialTravel = !canAffordMove && partialSteps > 0;

  const handleTravel = () => {
    if (isHere) return;
    if (canAffordMove) {
      const result = store.travelPlayer(player.id, travelPath);
      if (result && !result.success) toast.error(result.message);
    } else if (canPartialTravel) {
      const partialPath = travelPath.slice(0, partialSteps + 1);
      const result = store.travelPlayer(player.id, partialPath);
      if (result && !result.success) {
        toast.error(result.message);
        return;
      }
      toast.info('Not enough time to reach destination. Turn ended.');
      store.selectLocation(null);
      setTimeout(() => store.endTurn(), 300);
    }
  };`,
);

replace(
  'src/hooks/ai/actionExecutor.ts',
  `import { calculatePathDistance, getPath } from '@/data/locations';`,
  `import { getPath } from '@/data/locations';`,
);
replace(
  'src/hooks/ai/actionExecutor.ts',
  `  movePlayer: (playerId: string, location: string, cost: number) => void;`,
  `  travelPlayer: (playerId: string, route: import('@/types/game.types').LocationId[]) => { success: boolean; message: string } | void;`,
);
replace(
  'src/hooks/ai/actionExecutor.ts',
  `  const baseCost = calculatePathDistance(player.currentLocation, action.location);
  // C4 FIX: Include weather movement cost (same formula as human movement)
  const state = useGameStore.getState();
  const weather = state.weather;
  const path = getPath(player.currentLocation, action.location);
  const weatherExtraCost = (baseCost > 0 && weather?.movementCostExtra)
    ? baseCost * weather.movementCostExtra
    : 0;
  const cost = baseCost + weatherExtraCost;
  if (player.timeRemaining < cost) return false;`,
  `  const state = useGameStore.getState();
  const path = getPath(player.currentLocation, action.location);
  const steps = Math.max(0, path.length - 1);
  const weatherExtra = state.weather?.movementCostExtra ?? 0;
  const cost = steps + Math.floor(steps * Math.max(0, weatherExtra));
  if (player.timeRemaining < cost) return false;`,
);
replace(
  'src/hooks/ai/actionExecutor.ts',
  `  store.movePlayer(player.id, action.location, cost);
  // Trigger visual path animation for AI token on the board
  triggerAIAnimation(player.id, path);
  return true;`,
  `  const result = store.travelPlayer(player.id, path);
  if (result && !result.success) return false;
  // Trigger visual path animation for AI token on the board
  triggerAIAnimation(player.id, path);
  return true;`,
);

replace(
  'src/hooks/useGrimwaldAI.ts',
  `    movePlayer: state.movePlayer,`,
  `    travelPlayer: state.travelPlayer,`,
);

replace(
  'src/test/multiplayer.test.ts',
  `      'movePlayer', 'spendTime', 'modifyGold', 'modifyHealth',`,
  `      'travelPlayer', 'spendTime', 'modifyGold', 'modifyHealth',`,
);

replace(
  'src/network/protocolSecurity.test.ts',
  `import { getMovementCost } from '@/data/locations';\n`,
  ``,
);
replace(
  'src/network/protocolSecurity.test.ts',
  `  it('rejects negative time, invented destinations and free travel', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];

    expect(validateGuestActionArgs('spendTime', [alice.id, -60], state)).toBe('hours out of range');
    expect(validateGuestActionArgs('spendTime', [alice.id, Number.NaN], state)).toBe('Invalid hours');
    expect(validateGuestActionArgs('movePlayer', [alice.id, 'not-a-place', 1], state)).toBe('Invalid destination');
    expect(validateGuestActionArgs('movePlayer', [alice.id, 'bank', -10], state)).toBe('movement cost out of range');
    expect(validateGuestActionArgs('movePlayer', [alice.id, 'bank', 0], state)).toBe('Invalid movement cost');

    const canonicalCost = getMovementCost(alice.currentLocation, 'bank');
    expect(validateGuestActionArgs('movePlayer', [alice.id, 'bank', canonicalCost], state)).toBeNull();
  });`,
  `  it('rejects negative time and malformed or legacy travel requests', () => {
    const state = useGameStore.getState();
    const alice = state.players[0];

    expect(validateGuestActionArgs('spendTime', [alice.id, -60], state)).toBe('hours out of range');
    expect(validateGuestActionArgs('spendTime', [alice.id, Number.NaN], state)).toBe('Invalid hours');
    expect(validateGuestActionRequest('movePlayer', [alice.id, 'bank', 0], alice.id, alice.id, state)).toBe('Action not allowed');
    expect(validateGuestActionArgs('travelPlayer', [alice.id, 'bank'], state)).toBe('Invalid travel route');
    expect(validateGuestActionArgs('travelPlayer', [alice.id, ['general-store']], state)).toBe('Travel route out of range');
    expect(validateGuestActionArgs('travelPlayer', [alice.id, ['general-store', 'bank']], state)).toBeNull();
  });`,
);
