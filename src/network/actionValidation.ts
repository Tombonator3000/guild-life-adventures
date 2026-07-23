import { getLocation, getMovementCost, getPath } from '@/data/locations';
import type { LocationId } from '@/types/game.types';
import { ALLOWED_GUEST_ACTIONS } from './types';

const ACTIONS_WITHOUT_ACTOR_ID = new Set([
  'endTurn',
]);

type ValidationPlayer = {
  id: string;
  currentWage?: number;
  currentLocation?: LocationId;
};

export type GuestActionValidationStore = {
  players: ValidationPlayer[];
  weather?: { movementCostExtra?: number } | null;
};

export type GuestActionProcessResult = {
  success: boolean;
  error?: string;
  /** True when turn, allowlist, actor and argument validation all passed. */
  validated: boolean;
};

/**
 * Every guest action except explicitly actor-less actions must carry the
 * authenticated player's ID as its first argument. This avoids relying on ID
 * naming conventions such as `player-*`, which can be bypassed by crafted IDs.
 */
export function validateGuestActor(
  actionName: string,
  args: unknown[],
  senderPlayerId: string,
): string | null {
  if (ACTIONS_WITHOUT_ACTOR_ID.has(actionName)) return null;
  if (!Array.isArray(args) || args.length === 0) return 'Missing player identity';
  if (args[0] !== senderPlayerId) return 'Cannot act as another player';
  return null;
}

function validateNumArg(
  args: unknown[],
  index: number,
  min: number,
  max: number,
  label: string,
  integer = false,
): string | null {
  const value = args[index];
  if (typeof value !== 'number' || !Number.isFinite(value)) return `Invalid ${label}`;
  if (integer && !Number.isInteger(value)) return `Invalid ${label}`;
  if (value < min || value > max) return `${label} out of range`;
  return null;
}

function validateStringArg(args: unknown[], index: number, label: string): string | null {
  const value = args[index];
  if (typeof value !== 'string' || value.trim().length === 0) return `Invalid ${label}`;
  return null;
}

function validateEnumArg(
  args: unknown[],
  index: number,
  allowed: readonly string[],
  label: string,
): string | null {
  const value = args[index];
  if (typeof value !== 'string' || !allowed.includes(value)) return `Invalid ${label}`;
  return null;
}

const STAT_MODIFIER_RULES: Record<string, { argIndex: number; max: number; label: string; positiveOnly?: boolean }> = {
  modifyGold:       { argIndex: 1, max: 500, label: 'Gold', positiveOnly: true },
  modifyHealth:     { argIndex: 1, max: 100, label: 'Health' },
  modifyHappiness:  { argIndex: 1, max: 50, label: 'Happiness' },
  modifyFood:       { argIndex: 1, max: 100, label: 'Food' },
  modifyClothing:   { argIndex: 1, max: 100, label: 'Clothing' },
  modifyMaxHealth:  { argIndex: 1, max: 25, label: 'MaxHealth' },
  modifyRelaxation: { argIndex: 1, max: 20, label: 'Relaxation' },
};

/**
 * Validate protocol-level argument shape before dispatching to the store.
 * Semantic store actions still perform the authoritative catalogue, location,
 * ownership, price and resource checks.
 */
export function validateGuestActionArgs(
  name: string,
  args: unknown[],
  store: GuestActionValidationStore,
): string | null {
  if (!Array.isArray(args)) return 'Invalid action arguments';

  const statRule = STAT_MODIFIER_RULES[name];
  if (statRule) {
    const amount = args[statRule.argIndex];
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'Invalid amount';
    if (statRule.positiveOnly) {
      if (amount > statRule.max) return `${statRule.label} amount too large`;
    } else if (Math.abs(amount) > statRule.max) {
      return `${statRule.label} amount too large`;
    }
    return null;
  }

  switch (name) {
    case 'spendTime':
      return validateNumArg(args, 1, 0, 60, 'hours', true);

    case 'movePlayer': {
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
    }

    case 'setJob': {
      const wage = args[2];
      if (wage !== undefined && (typeof wage !== 'number' || !Number.isFinite(wage) || wage < 0 || wage > 100)) {
        return 'Invalid wage';
      }
      return null;
    }

    case 'negotiateRaise':
      return validateNumArg(args, 1, 0, 100, 'wage');

    case 'performWorkShift':
      return validateEnumArg(args, 1, ['full', 'remaining'], 'work mode');

    case 'attendDegreeSession': {
      const degreeError = validateStringArg(args, 1, 'degree');
      return degreeError ?? validateEnumArg(args, 2, ['standard', 'cram'], 'study mode');
    }

    case 'prepayDegree':
    case 'graduateDegree':
      return validateStringArg(args, 1, 'degree');

    case 'payHousingRent': {
      const weeks = args[1];
      return weeks === 1 || weeks === 4 || weeks === 8 ? null : 'Invalid rent period';
    }

    case 'moveHousingAtLandlord':
      return validateEnumArg(args, 1, ['homeless', 'slums', 'modest', 'comfortable', 'noble'], 'housing tier');

    case 'transferBankFunds': {
      const directionError = validateEnumArg(args, 1, ['deposit', 'withdraw'], 'bank direction');
      return directionError ?? validateNumArg(args, 2, 1, 1_000_000, 'bank amount', true);
    }

    case 'manageInvestment': {
      const serviceError = validateEnumArg(args, 1, ['invest', 'withdraw'], 'investment service');
      return serviceError ?? validateNumArg(args, 2, 1, 1_000_000, 'investment amount', true);
    }

    case 'tradeStock': {
      const sideError = validateEnumArg(args, 1, ['buy', 'sell'], 'stock side');
      const stockError = validateStringArg(args, 2, 'stock');
      return sideError ?? stockError ?? validateNumArg(args, 3, 1, 10_000, 'share count', true);
    }

    case 'manageLoan': {
      const serviceError = validateEnumArg(args, 1, ['borrow', 'repay'], 'loan service');
      if (serviceError) return serviceError;
      const service = args[1];
      const amount = args[2];
      if (service === 'borrow') {
        return amount === 100 || amount === 250 || amount === 500 || amount === 1000
          ? null
          : 'Invalid loan product';
      }
      if (amount === 'all') return null;
      return validateNumArg(args, 2, 1, 1_000_000, 'repayment amount', true);
    }

    case 'purchaseVendorItem': {
      const vendorError = validateEnumArg(args, 1, ['general-store', 'shadow-market'], 'vendor');
      return vendorError ?? validateStringArg(args, 2, 'item');
    }

    case 'purchaseAppliance': {
      const vendorError = validateEnumArg(args, 1, ['enchanter', 'shadow-market', 'fence'], 'vendor');
      return vendorError ?? validateStringArg(args, 2, 'appliance');
    }

    case 'useApplianceService': {
      const serviceError = validateEnumArg(args, 1, ['repair-enchanter', 'repair-forge', 'pawn', 'redeem'], 'appliance service');
      return serviceError ?? validateStringArg(args, 2, 'appliance');
    }

    case 'purchaseEquipmentItem': {
      const vendorError = validateEnumArg(args, 1, ['armory', 'fence-used'], 'vendor');
      const itemError = validateStringArg(args, 2, 'item');
      const mode = args[3];
      if (mode !== undefined && mode !== 'primary' && mode !== 'backup') return 'Invalid equipment mode';
      return vendorError ?? itemError;
    }

    case 'useEquipmentService': {
      const serviceError = validateEnumArg(args, 1, ['temper', 'repair', 'salvage'], 'equipment service');
      return serviceError ?? validateStringArg(args, 2, 'item');
    }

    case 'purchaseHexScroll': {
      const vendorError = validateEnumArg(args, 1, ['enchanter', 'shadow-market'], 'vendor');
      return vendorError ?? validateStringArg(args, 2, 'hex');
    }

    case 'useHexDefense': {
      const serviceError = validateEnumArg(args, 1, ['amulet', 'dispel'], 'hex defense service');
      if (serviceError) return serviceError;
      if (args[1] === 'dispel') return validateStringArg(args, 2, 'target location');
      return null;
    }

    case 'useGraveyardHexService':
      return validateEnumArg(args, 1, ['ritual', 'reflect', 'cleanse'], 'graveyard hex service');

    case 'useHealerService':
      return validateEnumArg(args, 1, ['minor', 'moderate', 'full', 'cure', 'blessing'], 'healer service');

    case 'useGraveyardService':
      return validateEnumArg(args, 1, ['pray', 'mourn', 'blessing'], 'graveyard service');

    case 'purchaseNewspaper':
      return validateEnumArg(args, 1, ['general-store', 'shadow-market'], 'vendor');

    case 'gambleAtFence':
      return validateNumArg(args, 1, 1, 1000, 'stake', true);

    default:
      return null;
  }
}

/** Validate the host protocol gates in the same order used by useNetworkSync. */
export function validateGuestActionRequest(
  actionName: string,
  args: unknown[],
  senderPlayerId: string,
  currentPlayerId: string | null | undefined,
  store: GuestActionValidationStore,
): string | null {
  if (!currentPlayerId || currentPlayerId !== senderPlayerId) return 'Not your turn';
  if (!ALLOWED_GUEST_ACTIONS.has(actionName)) return 'Action not allowed';

  const actorError = validateGuestActor(actionName, args, senderPlayerId);
  if (actorError) return actorError;

  return validateGuestActionArgs(actionName, args, store);
}

/**
 * Process a validated guest action with an injected executor. Keeping this pure
 * makes the exact host decision chain testable without a WebRTC runtime.
 */
export function processGuestActionRequest(
  actionName: string,
  args: unknown[],
  senderPlayerId: string,
  currentPlayerId: string | null | undefined,
  store: GuestActionValidationStore,
  executor: (name: string, actionArgs: unknown[]) => boolean,
): GuestActionProcessResult {
  const error = validateGuestActionRequest(actionName, args, senderPlayerId, currentPlayerId, store);
  if (error) return { success: false, error, validated: false };

  const success = executor(actionName, args);
  return {
    success,
    error: success ? undefined : 'Action failed',
    validated: true,
  };
}
