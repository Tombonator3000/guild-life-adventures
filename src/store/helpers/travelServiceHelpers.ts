import { BOARD_PATH } from '@/data/locations';
import { HOURS_PER_TURN, type LocationId } from '@/types/game.types';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';

const MAX_ROUTE_LOCATIONS = HOURS_PER_TURN + 1;
const BOARD_LOCATION_SET = new Set<LocationId>(BOARD_PATH);

function areAdjacent(from: LocationId, to: LocationId): boolean {
  const fromIndex = BOARD_PATH.indexOf(from);
  const toIndex = BOARD_PATH.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return false;
  const distance = Math.abs(fromIndex - toIndex);
  return distance === 1 || distance === BOARD_PATH.length - 1;
}

export function calculateCanonicalTravelCost(steps: number, weatherExtraPerStep: number): number {
  const safeExtra = Number.isFinite(weatherExtraPerStep) && weatherExtraPerStep > 0
    ? weatherExtraPerStep
    : 0;
  return steps + Math.floor(steps * safeExtra);
}

/**
 * Commit a visual route through the authoritative host.
 *
 * The client supplies only the route it animated. The host verifies the route
 * begins at the current position, contains only adjacent board locations and
 * computes the time cost from route length and current weather.
 */
export function createTravelServiceActions(_set: SetFn, get: GetFn) {
  return {
    travelPlayer: (playerId: string, route: LocationId[]): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (!Array.isArray(route) || route.length < 2 || route.length > MAX_ROUTE_LOCATIONS) {
        return { success: false, message: 'Invalid travel route.' };
      }
      if (route[0] !== player.currentLocation) {
        return { success: false, message: 'Travel route does not start at the current location.' };
      }
      if (!route.every(location => BOARD_LOCATION_SET.has(location))) {
        return { success: false, message: 'Travel route contains an unknown location.' };
      }
      for (let index = 1; index < route.length; index += 1) {
        if (!areAdjacent(route[index - 1], route[index])) {
          return { success: false, message: 'Travel route contains a non-adjacent step.' };
        }
      }

      const steps = route.length - 1;
      const cost = calculateCanonicalTravelCost(steps, state.weather?.movementCostExtra ?? 0);
      if (cost <= 0 || player.timeRemaining < cost) {
        return { success: false, message: 'Not enough time for this route.' };
      }

      const destination = route[route.length - 1];
      get().movePlayer(playerId, destination, cost);
      const updated = get().players.find(candidate => candidate.id === playerId);
      if (!updated || updated.currentLocation !== destination) {
        return { success: false, message: 'Travel could not be completed.' };
      }

      return {
        success: true,
        message: `Traveled ${steps} step${steps === 1 ? '' : 's'} for ${cost} hour${cost === 1 ? '' : 's'}.`,
      };
    },
  };
}
