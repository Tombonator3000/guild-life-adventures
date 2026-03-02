import type { ApplianceSource, PawnedAppliance } from '@/types/game.types';
import { getAppliance, calculateRepairCost, getRedeemPrice } from '@/data/items';
import type { SetFn, GetFn } from '../../storeTypes';

export function createApplianceActions(set: SetFn, get: GetFn) {
  return {
    // Buy appliance with Jones-style tracking
    buyAppliance: (playerId: string, applianceId: string, price: number, source: ApplianceSource): number => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return 0;

      const appliance = getAppliance(applianceId);
      if (!appliance) return 0;
      if (player.gold < price) return 0;

      // Frost Chest requires Preservation Box
      if (applianceId === 'frost-chest') {
        const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
        if (!hasPreservationBox) return 0;
      }

      // Check if this is first time owning this type (for happiness bonus)
      const isFirstTime = !player.applianceHistory.includes(applianceId);
      const happinessGain = isFirstTime
        ? (source === 'enchanter' ? appliance.happinessEnchanter : appliance.happinessMarket)
        : 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newAppliances = { ...p.appliances };
          newAppliances[applianceId] = {
            itemId: applianceId,
            originalPrice: price,
            source,
            isBroken: false,
            purchasedFirstTime: isFirstTime,
            repairedWeek: get().week, // Immune to breakage for 2 weeks after purchase
          };

          const newHistory = isFirstTime
            ? [...p.applianceHistory, applianceId]
            : p.applianceHistory;

          return {
            ...p,
            gold: p.gold - price,
            appliances: newAppliances,
            applianceHistory: newHistory,
            happiness: Math.min(100, p.happiness + happinessGain),
          };
        }),
      }));

      return happinessGain;
    },

    // Repair a broken appliance
    repairAppliance: (playerId: string, applianceId: string): number => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return 0;

      const ownedAppliance = player.appliances[applianceId];
      if (!ownedAppliance || !ownedAppliance.isBroken) return 0;

      const repairCost = calculateRepairCost(ownedAppliance.originalPrice);
      if (player.gold < repairCost) return 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newAppliances = { ...p.appliances };
          newAppliances[applianceId] = {
            ...newAppliances[applianceId],
            isBroken: false,
            repairedWeek: get().week, // Immune to breakage for 2 weeks after repair
          };

          return {
            ...p,
            gold: p.gold - repairCost,
            appliances: newAppliances,
          };
        }),
      }));

      return repairCost;
    },

    // Pawn an appliance — stores collateral record so player can redeem within 6 weeks
    pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => {
      const week = get().week;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const applianceData = p.appliances[applianceId];
          const newAppliances = { ...p.appliances };
          delete newAppliances[applianceId];

          const pawnRecord: PawnedAppliance = {
            applianceId,
            originalPrice: applianceData?.originalPrice ?? Math.round(pawnValue / 0.4), // back-calculate from pawn value
            pawnedWeek: week,
            expiresWeek: week + 6,
          };

          return {
            ...p,
            gold: p.gold + pawnValue,
            appliances: newAppliances,
            pawnedAppliances: [...(p.pawnedAppliances ?? []), pawnRecord],
            happiness: Math.max(0, p.happiness - 1), // -1 happiness for pawning
          };
        }),
      }));
    },

    // Redeem a previously pawned appliance (pay 50% of original price, must be within 6-week window)
    redeemAppliance: (playerId: string, applianceId: string): boolean => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return false;

      const pawned = (player.pawnedAppliances ?? []).find(pa => pa.applianceId === applianceId);
      if (!pawned) return false;

      // Check redemption window not expired
      if (state.week > pawned.expiresWeek) return false;

      const redeemCost = getRedeemPrice(pawned.originalPrice);
      if (player.gold < redeemCost) return false;

      const appliance = getAppliance(applianceId);
      if (!appliance) return false;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newAppliances = { ...p.appliances };
          newAppliances[applianceId] = {
            itemId: applianceId,
            originalPrice: pawned.originalPrice,
            source: 'pawn' as ApplianceSource,
            isBroken: false,
            purchasedFirstTime: false,
            repairedWeek: get().week,
          };

          return {
            ...p,
            gold: p.gold - redeemCost,
            appliances: newAppliances,
            pawnedAppliances: (p.pawnedAppliances ?? []).filter(pa => pa.applianceId !== applianceId),
            happiness: Math.min(100, p.happiness + 1), // +1 happiness for recovering your item
          };
        }),
      }));

      return true;
    },
  };
}
