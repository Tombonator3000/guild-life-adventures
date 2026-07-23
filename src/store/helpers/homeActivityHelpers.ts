import { HOUSING_DATA } from '@/data/housing';
import type { LocationId } from '@/types/game.types';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';

export type HomeActivity = 'relax' | 'sleep';

function getHomeLocation(housing: string): LocationId | null {
  if (housing === 'slums') return 'slums';
  if (housing === 'noble') return 'noble-heights';
  return null;
}

/**
 * Host-authoritative home recovery.
 * The caller sends only an activity. Location, duration and effects are
 * resolved from authoritative housing/player state.
 */
export function createHomeActivityActions(set: SetFn, get: GetFn) {
  return {
    performHomeActivity: (playerId: string, activity: HomeActivity): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };

      const homeLocation = getHomeLocation(player.housing);
      if (!homeLocation || player.currentLocation !== homeLocation) {
        return { success: false, message: 'You must be at your own home.' };
      }

      const housing = HOUSING_DATA[player.housing];
      const rules = activity === 'relax'
        ? {
            hours: housing.relaxationRate,
            happiness: 3,
            health: 0,
            relaxation: 5,
            message: 'You relax at home.',
          }
        : activity === 'sleep'
          ? {
              hours: 8,
              happiness: 8,
              health: 10,
              relaxation: 5,
              message: 'You get a full night of sleep.',
            }
          : null;

      if (!rules || rules.hours <= 0) return { success: false, message: 'Invalid home activity.' };
      if (player.timeRemaining < rules.hours) return { success: false, message: 'Not enough time.' };

      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId
          ? {
              ...candidate,
              timeRemaining: candidate.timeRemaining - rules.hours,
              happiness: Math.max(0, Math.min(100, candidate.happiness + rules.happiness)),
              health: Math.max(0, Math.min(candidate.maxHealth, candidate.health + rules.health)),
              relaxation: Math.max(10, Math.min(50, candidate.relaxation + rules.relaxation)),
            }
          : candidate),
      }));

      return { success: true, message: rules.message };
    },
  };
}
