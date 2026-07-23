import type { ApplianceSource, PawnedAppliance } from '@/types/game.types';
import {
  APPLIANCES,
  calculateRepairCost,
  getAppliance,
  getPawnSalePrice,
  getPawnValue,
  getRedeemPrice,
} from '@/data/items';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

export type ApplianceVendor = 'enchanter' | 'shadow-market' | 'fence';
export type ApplianceService = 'repair-enchanter' | 'repair-forge' | 'pawn' | 'redeem';

const VENDOR_SOURCE: Record<ApplianceVendor, ApplianceSource> = {
  enchanter: 'enchanter',
  'shadow-market': 'market',
  fence: 'pawn',
};

const VENDOR_LABEL: Record<ApplianceVendor, string> = {
  enchanter: 'Enchanter',
  'shadow-market': 'Shadow Market',
  fence: 'Fence',
};

function resolveAppliancePrice(
  vendor: ApplianceVendor,
  applianceId: string,
  priceModifier: number,
): number | null {
  const appliance = getAppliance(applianceId);
  if (!appliance) return null;

  if (vendor === 'enchanter') {
    if (appliance.enchanterPrice <= 0) return null;
    return Math.round(appliance.enchanterPrice * priceModifier);
  }

  if (vendor === 'shadow-market') {
    if (!appliance.marketPrice || appliance.marketPrice <= 0) return null;
    return Math.round(appliance.marketPrice * priceModifier);
  }

  const fenceStock = APPLIANCES
    .filter(candidate => candidate.enchanterPrice > 0)
    .slice(0, 4)
    .some(candidate => candidate.id === applianceId);
  if (!fenceStock) return null;
  return getPawnSalePrice(appliance.enchanterPrice);
}

/**
 * Appliance intent actions. Clients never provide price, source, pawn value,
 * repair cost or time. The host resolves all canonical values and applies each
 * purchase/service in one transaction.
 */
export function createApplianceServiceActions(set: SetFn, get: GetFn) {
  return {
    purchaseAppliance: (
      playerId: string,
      vendor: ApplianceVendor,
      applianceId: string,
    ): ActionResult | void => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      const appliance = getAppliance(applianceId);
      if (!player || !appliance) return { success: false, message: 'Invalid appliance purchase.' };
      if (player.currentLocation !== vendor) {
        return { success: false, message: `Visit the ${VENDOR_LABEL[vendor]} first.` };
      }
      if (player.appliances[applianceId]) {
        return { success: false, message: 'You already own this appliance. Repair it if it is broken.' };
      }

      const price = resolveAppliancePrice(vendor, applianceId, state.priceModifier);
      if (price === null) return { success: false, message: 'This vendor does not sell that appliance.' };
      const timeCost = vendor === 'fence' ? 1 : 0;
      if (player.gold < price) return { success: false, message: 'Not enough gold.' };
      if (player.timeRemaining < timeCost) return { success: false, message: 'Not enough time.' };

      if (applianceId === 'frost-chest') {
        const preservation = player.appliances['preservation-box'];
        if (!preservation || preservation.isBroken) {
          return { success: false, message: 'A working Preservation Box is required first.' };
        }
      }

      const source = VENDOR_SOURCE[vendor];
      const firstPurchase = !player.applianceHistory.includes(applianceId);
      const happinessGain = firstPurchase
        ? (source === 'enchanter' ? appliance.happinessEnchanter : appliance.happinessMarket)
        : 0;

      set(current => ({
        players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
          ...candidate,
          gold: candidate.gold - price,
          timeRemaining: candidate.timeRemaining - timeCost,
          appliances: {
            ...candidate.appliances,
            [applianceId]: {
              itemId: applianceId,
              originalPrice: price,
              source,
              isBroken: false,
              purchasedFirstTime: firstPurchase,
              repairedWeek: current.week,
            },
          },
          applianceHistory: firstPurchase
            ? [...candidate.applianceHistory, applianceId]
            : candidate.applianceHistory,
          happiness: Math.min(100, candidate.happiness + happinessGain),
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + price,
          },
        }),
      }));

      return { success: true, message: `Purchased ${appliance.name}.` };
    },

    useApplianceService: (
      playerId: string,
      service: ApplianceService,
      applianceId: string,
    ): ActionResult | void => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      const appliance = getAppliance(applianceId);
      if (!player || !appliance) return { success: false, message: 'Invalid appliance service.' };

      if (service === 'pawn') {
        if (player.currentLocation !== 'fence') return { success: false, message: 'Visit the Fence first.' };
        const owned = player.appliances[applianceId];
        if (!owned) return { success: false, message: 'You do not own this appliance.' };
        const pawnValue = getPawnValue(owned.originalPrice, state.priceModifier);
        const pawnRecord: PawnedAppliance = {
          applianceId,
          originalPrice: owned.originalPrice,
          pawnedWeek: state.week,
          expiresWeek: state.week + 6,
        };

        set(current => ({
          players: current.players.map(candidate => {
            if (candidate.id !== playerId) return candidate;
            const appliances = { ...candidate.appliances };
            delete appliances[applianceId];
            return {
              ...candidate,
              gold: candidate.gold + pawnValue,
              appliances,
              pawnedAppliances: [...(candidate.pawnedAppliances ?? []), pawnRecord],
              happiness: Math.max(0, candidate.happiness - 1),
              gameStats: {
                ...candidate.gameStats,
                totalGoldEarned: (candidate.gameStats?.totalGoldEarned ?? 0) + pawnValue,
              },
            };
          }),
        }));
        return { success: true, message: `Pawned ${appliance.name} for ${pawnValue}g.` };
      }

      if (service === 'redeem') {
        if (player.currentLocation !== 'fence') return { success: false, message: 'Visit the Fence first.' };
        if (player.appliances[applianceId]) return { success: false, message: 'You already own this appliance.' };
        const pawned = (player.pawnedAppliances ?? []).find(record => record.applianceId === applianceId);
        if (!pawned) return { success: false, message: 'No pawn record exists for this appliance.' };
        if (state.week > pawned.expiresWeek) return { success: false, message: 'The redemption window has expired.' };
        const cost = getRedeemPrice(pawned.originalPrice);
        if (player.gold < cost) return { success: false, message: 'Not enough gold.' };

        set(current => ({
          players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
            ...candidate,
            gold: candidate.gold - cost,
            appliances: {
              ...candidate.appliances,
              [applianceId]: {
                itemId: applianceId,
                originalPrice: pawned.originalPrice,
                source: 'pawn' as ApplianceSource,
                isBroken: false,
                purchasedFirstTime: false,
                repairedWeek: current.week,
              },
            },
            pawnedAppliances: (candidate.pawnedAppliances ?? [])
              .filter(record => record.applianceId !== applianceId),
            happiness: Math.min(100, candidate.happiness + 1),
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + cost,
            },
          }),
        }));
        return { success: true, message: `Redeemed ${appliance.name} for ${cost}g.` };
      }

      const owned = player.appliances[applianceId];
      if (!owned || !owned.isBroken) return { success: false, message: 'This appliance does not need repair.' };

      const atEnchanter = service === 'repair-enchanter';
      const requiredLocation = atEnchanter ? 'enchanter' : 'forge';
      const timeCost = atEnchanter ? 2 : 3;
      if (player.currentLocation !== requiredLocation) {
        return { success: false, message: `Visit the ${atEnchanter ? 'Enchanter' : 'Forge'} first.` };
      }

      const fullCost = calculateRepairCost(owned.originalPrice);
      const cost = atEnchanter ? fullCost : Math.max(5, Math.floor(fullCost * 0.5));
      if (player.gold < cost) return { success: false, message: 'Not enough gold.' };
      if (player.timeRemaining < timeCost) return { success: false, message: 'Not enough time.' };

      set(current => ({
        players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
          ...candidate,
          gold: candidate.gold - cost,
          timeRemaining: candidate.timeRemaining - timeCost,
          appliances: {
            ...candidate.appliances,
            [applianceId]: {
              ...candidate.appliances[applianceId],
              isBroken: false,
              repairedWeek: current.week,
            },
          },
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + cost,
          },
        }),
      }));

      return { success: true, message: `Repaired ${appliance.name} for ${cost}g.` };
    },
  };
}
