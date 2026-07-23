import { HOUSING_DATA } from '@/data/housing';
import type { HousingTier } from '@/types/game.types';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

const RENT_PAYMENT_WEEKS = new Set([1, 4, 8]);
const MOVE_TIME = 4;
const LANDLORD_SERVICE_TIME = 1;

export function isLandlordOpen(week: number, weeksSinceRent: number): boolean {
  const isRentWeek = (week + 1) % 4 === 0;
  return isRentWeek || weeksSinceRent >= 3;
}

export function getEffectiveHousingRent(
  housing: HousingTier,
  lockedRent: number,
  priceModifier: number,
): number {
  if (housing === 'homeless') return 0;
  return lockedRent > 0
    ? lockedRent
    : Math.round(HOUSING_DATA[housing].weeklyRent * priceModifier);
}

function validateLandlordVisit(
  state: ReturnType<GetFn>,
  playerId: string,
): { player: ReturnType<GetFn>['players'][number] } | { error: ActionResult } {
  const player = state.players.find(candidate => candidate.id === playerId);
  if (!player) return { error: { success: false, message: 'Player not found.' } };
  if (player.currentLocation !== 'landlord') {
    return { error: { success: false, message: 'Visit the Landlord before using housing services.' } };
  }
  if (!isLandlordOpen(state.week, player.weeksSinceRent)) {
    return { error: { success: false, message: "The Landlord's office is closed this week." } };
  }
  return { player };
}

export function createHousingServiceActions(set: SetFn, get: GetFn) {
  return {
    payHousingRent: (playerId: string, weeks: 1 | 4 | 8): ActionResult | void => {
      const state = get();
      const visit = validateLandlordVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;
      if (player.housing === 'homeless') {
        return { success: false, message: 'You do not have housing to pay rent for.' };
      }
      if (!RENT_PAYMENT_WEEKS.has(weeks)) {
        return { success: false, message: 'Rent can only be prepaid for 1, 4 or 8 weeks.' };
      }
      if (player.timeRemaining < LANDLORD_SERVICE_TIME) {
        return { success: false, message: 'Not enough time to pay rent.' };
      }

      const weeklyRent = getEffectiveHousingRent(player.housing, player.lockedRent, state.priceModifier);
      const totalCost = weeklyRent * weeks;
      if (player.gold < totalCost) {
        return { success: false, message: `You need ${totalCost}g to prepay ${weeks} week${weeks === 1 ? '' : 's'} of rent.` };
      }

      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId ? {
          ...candidate,
          gold: candidate.gold - totalCost,
          timeRemaining: Math.max(0, candidate.timeRemaining - LANDLORD_SERVICE_TIME),
          rentPrepaidWeeks: candidate.rentPrepaidWeeks + weeks,
          weeksSinceRent: 0,
          rentExtensionUsed: false,
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + totalCost,
          },
        } : candidate),
      }));

      return { success: true, message: `Rent prepaid for ${weeks} week${weeks === 1 ? '' : 's'} (${totalCost}g).` };
    },

    moveHousingAtLandlord: (playerId: string, tier: HousingTier): ActionResult | void => {
      const state = get();
      const visit = validateLandlordVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;
      if (tier === 'homeless' || !HOUSING_DATA[tier]) {
        return { success: false, message: 'That housing option is not available from the Landlord.' };
      }
      if (tier === player.housing) {
        return { success: false, message: 'You already live there.' };
      }
      if (player.timeRemaining < MOVE_TIME) {
        return { success: false, message: 'Moving requires 4 hours.' };
      }

      const lockedRent = Math.round(HOUSING_DATA[tier].weeklyRent * state.priceModifier);
      const moveCost = lockedRent * 2;
      if (player.gold < moveCost) {
        return { success: false, message: `You need ${moveCost}g for the deposit and first rent payment.` };
      }

      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId ? {
          ...candidate,
          gold: candidate.gold - moveCost,
          timeRemaining: Math.max(0, candidate.timeRemaining - MOVE_TIME),
          housing: tier,
          weeksSinceRent: 0,
          rentPrepaidWeeks: 0,
          lockedRent,
          rentExtensionUsed: false,
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + moveCost,
          },
        } : candidate),
      }));

      return { success: true, message: `Moved into ${HOUSING_DATA[tier].name} for ${moveCost}g.` };
    },

    requestRentExtensionAtLandlord: (playerId: string): ActionResult | void => {
      const state = get();
      const visit = validateLandlordVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;
      if (player.housing === 'homeless') {
        return { success: false, message: "You don't have housing to extend." };
      }
      if (player.rentExtensionUsed) {
        return { success: false, message: 'You already begged this cycle. Tomas remembers.' };
      }
      if (player.weeksSinceRent < 2) {
        return { success: false, message: "You're not overdue enough to need begging." };
      }
      if (player.timeRemaining < LANDLORD_SERVICE_TIME) {
        return { success: false, message: 'Not enough time to plead with Tomas.' };
      }

      const successChance = Math.min(0.50 + Math.min(player.dependability * 0.005, 0.30), 0.80);
      const succeeded = Math.random() < successChance;

      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId ? {
          ...candidate,
          timeRemaining: Math.max(0, candidate.timeRemaining - LANDLORD_SERVICE_TIME),
          weeksSinceRent: succeeded ? Math.max(0, candidate.weeksSinceRent - 1) : candidate.weeksSinceRent,
          rentExtensionUsed: true,
          happiness: Math.max(0, candidate.happiness - (succeeded ? 2 : 5)),
        } : candidate),
      }));

      return succeeded
        ? { success: true, message: 'Tomas sighs heavily. "One more week. ONE. And I’m adding it to my ledger of disappointments."' }
        : { success: false, message: 'Tomas crosses his arms. "I’ve heard better sob stories from the rats in the cellar. Pay up."' };
    },
  };
}
