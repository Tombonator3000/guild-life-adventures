import type { ApplianceSource } from '@/types/game.types';
import { getAppliance, calculateRepairCost } from '@/data/items';
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

    // Pawn an appliance
    pawnAppliance: (playerId: string, applianceId: string, pawnValue: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newAppliances = { ...p.appliances };
          delete newAppliances[applianceId];

          return {
            ...p,
            gold: p.gold + pawnValue,
            appliances: newAppliances,
            happiness: Math.max(0, p.happiness - 1), // -1 happiness for pawning
          };
        }),
      }));
    },
  };
}
