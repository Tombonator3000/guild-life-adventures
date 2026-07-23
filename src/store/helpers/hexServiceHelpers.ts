import { getGameOption } from '@/data/gameOptions';
import {
  DEFENSE_ITEMS,
  getEnchanterHexStock,
  getHexById,
  getHexPrice,
  getShadowMarketHexStock,
} from '@/data/hexes';
import type { LocationId } from '@/types/game.types';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';

export type HexVendor = 'enchanter' | 'shadow-market';
export type HexDefenseService = 'amulet' | 'dispel';
export type GraveyardHexService = 'ritual' | 'reflect' | 'cleanse';
export type GraveyardHexResult = ActionResult & { backfired?: boolean };

const GRAVEYARD_SERVICE_DATA: Record<GraveyardHexService, { baseCost: number; time: number }> = {
  ritual: { baseCost: 200, time: 4 },
  reflect: { baseCost: 150, time: 3 },
  cleanse: { baseCost: 300, time: 3 },
};

function addHexScroll(
  scrolls: Array<{ hexId: string; quantity: number }>,
  hexId: string,
): Array<{ hexId: string; quantity: number }> {
  const existing = scrolls.find(scroll => scroll.hexId === hexId);
  if (!existing) return [...scrolls, { hexId, quantity: 1 }];
  return scrolls.map(scroll => scroll.hexId === hexId
    ? { ...scroll, quantity: scroll.quantity + 1 }
    : scroll);
}

function featureEnabled(): ActionResult | null {
  return getGameOption('enableHexesCurses')
    ? null
    : { success: false, message: 'Hexes are disabled.' };
}

export function createHexServiceActions(set: SetFn, get: GetFn) {
  return {
    purchaseHexScroll: (
      playerId: string,
      vendor: HexVendor,
      hexId: string,
    ): ActionResult | void => {
      const disabled = featureEnabled();
      if (disabled) return disabled;

      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== vendor) {
        return { success: false, message: `Visit the ${vendor === 'enchanter' ? 'Enchanter' : 'Shadow Market'} to buy that scroll.` };
      }

      const stock = vendor === 'enchanter'
        ? getEnchanterHexStock(player)
        : getShadowMarketHexStock(state.week);
      const hex = stock.find(candidate => candidate.id === hexId);
      if (!hex || hex.basePrice <= 0) {
        return { success: false, message: 'That scroll is not in the current shop stock.' };
      }

      const price = getHexPrice(hex, state.priceModifier);
      if (player.gold < price) {
        return { success: false, message: `You need ${price}g to buy ${hex.name}.` };
      }

      set(current => ({
        players: current.players.map(candidate => candidate.id === playerId ? {
          ...candidate,
          gold: candidate.gold - price,
          hexScrolls: addHexScroll(candidate.hexScrolls, hexId),
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + price,
          },
        } : candidate),
      }));

      return { success: true, message: `Acquired ${hex.name} scroll for ${price}g.` };
    },

    useHexDefense: (
      playerId: string,
      service: HexDefenseService,
      targetLocation?: LocationId,
    ): ActionResult | void => {
      const disabled = featureEnabled();
      if (disabled) return disabled;

      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'enchanter') {
        return { success: false, message: 'Visit the Enchanter to buy hex defenses.' };
      }

      const itemId = service === 'amulet' ? 'protective-amulet' : 'dispel-scroll';
      const item = DEFENSE_ITEMS.find(candidate => candidate.id === itemId);
      if (!item) return { success: false, message: 'Hex defense data is unavailable.' };
      const price = Math.round(item.basePrice * state.priceModifier);

      if (service === 'amulet') {
        if (player.hasProtectiveAmulet) {
          return { success: false, message: 'Your Protective Amulet is already active.' };
        }
        if (player.gold < price) {
          return { success: false, message: `You need ${price}g for a Protective Amulet.` };
        }

        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId ? {
            ...candidate,
            gold: candidate.gold - price,
            hasProtectiveAmulet: true,
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + price,
            },
          } : candidate),
        }));
        return { success: true, message: `Protective Amulet acquired for ${price}g.` };
      }

      if (!targetLocation) {
        return { success: false, message: 'Choose a hexed location to dispel.' };
      }
      const targetHex = state.locationHexes.find(hex =>
        hex.targetLocation === targetLocation
        && hex.casterId !== playerId
        && hex.weeksRemaining > 0);
      if (!targetHex) {
        return { success: false, message: 'No hostile hex is active on that location.' };
      }
      if (player.gold < price) return { success: false, message: `You need ${price}g for a Dispel Scroll.` };
      if (player.timeRemaining < item.timeCost) return { success: false, message: 'Not enough time to perform the dispel.' };

      set(current => ({
        locationHexes: current.locationHexes.filter(hex => !(
          hex.hexId === targetHex.hexId
          && hex.casterId === targetHex.casterId
          && hex.targetLocation === targetHex.targetLocation
        )),
        players: current.players.map(candidate => candidate.id === playerId ? {
          ...candidate,
          gold: candidate.gold - price,
          timeRemaining: Math.max(0, candidate.timeRemaining - item.timeCost),
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + price,
          },
        } : candidate),
      }));

      const hexName = getHexById(targetHex.hexId)?.name ?? targetHex.hexId;
      return { success: true, message: `${hexName} was dispelled from ${targetLocation}.` };
    },

    useGraveyardHexService: (
      playerId: string,
      service: GraveyardHexService,
    ): GraveyardHexResult | void => {
      const disabled = featureEnabled();
      if (disabled) return disabled;

      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'graveyard') {
        return { success: false, message: 'Visit the Graveyard to perform dark magic.' };
      }

      const definition = GRAVEYARD_SERVICE_DATA[service];
      const cost = Math.round(definition.baseCost * state.priceModifier);
      if (player.gold < cost) return { success: false, message: `You need ${cost}g for this service.` };
      if (player.timeRemaining < definition.time) {
        return { success: false, message: `This service requires ${definition.time} hours.` };
      }
      if ((service === 'reflect' || service === 'cleanse') && player.activeCurses.length === 0) {
        return { success: false, message: 'You have no active curse to remove.' };
      }

      if (service === 'ritual') return get().performDarkRitual(playerId, cost);
      if (service === 'reflect') return get().attemptCurseReflection(playerId, cost);
      return get().cleanseCurse(playerId, cost);
    },
  };
}
