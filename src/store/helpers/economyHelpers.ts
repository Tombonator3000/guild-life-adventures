// Economy helpers
// Banking, rent, buying/selling items, durables, appliances, housing, equipment

import type { HousingTier, ApplianceSource, EquipmentSlot } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { getAppliance, calculateRepairCost } from '@/data/items';
import type { SetFn, GetFn } from '../storeTypes';

export function createEconomyActions(set: SetFn, get: GetFn) {
  return {
    payRent: (playerId: string) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const rentCost = RENT_COSTS[p.housing];
          return {
            ...p,
            gold: Math.max(0, p.gold - rentCost),
            weeksSinceRent: 0,
          };
        }),
      }));
    },

    depositToBank: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: Math.max(0, p.gold - amount),
                savings: p.savings + amount,
              }
            : p
        ),
      }));
    },

    withdrawFromBank: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: p.gold + Math.min(amount, p.savings),
                savings: Math.max(0, p.savings - amount),
              }
            : p
        ),
      }));
    },

    invest: (playerId: string, amount: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: Math.max(0, p.gold - amount),
                investments: p.investments + amount,
              }
            : p
        ),
      }));
    },

    buyItem: (playerId: string, itemId: string, cost: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: Math.max(0, p.gold - cost),
                inventory: [...p.inventory, itemId],
              }
            : p
        ),
      }));
    },

    sellItem: (playerId: string, itemId: string, price: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const itemIndex = p.inventory.indexOf(itemId);
          if (itemIndex === -1) return p;
          const newInventory = [...p.inventory];
          newInventory.splice(itemIndex, 1);
          return {
            ...p,
            gold: p.gold + price,
            inventory: newInventory,
          };
        }),
      }));
    },

    buyDurable: (playerId: string, itemId: string, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const newDurables = { ...p.durables };
          newDurables[itemId] = (newDurables[itemId] || 0) + 1;
          return {
            ...p,
            gold: Math.max(0, p.gold - cost),
            durables: newDurables,
          };
        }),
      }));
    },

    sellDurable: (playerId: string, itemId: string, price: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const newDurables = { ...p.durables };
          if ((newDurables[itemId] || 0) <= 0) return p;
          newDurables[itemId] = newDurables[itemId] - 1;
          if (newDurables[itemId] === 0) delete newDurables[itemId];
          // Unequip if selling the last of an equipped item
          const unequip: Partial<typeof p> = {};
          if (!newDurables[itemId]) {
            if (p.equippedWeapon === itemId) unequip.equippedWeapon = null;
            if (p.equippedArmor === itemId) unequip.equippedArmor = null;
            if (p.equippedShield === itemId) unequip.equippedShield = null;
          }
          return {
            ...p,
            ...unequip,
            gold: p.gold + price,
            durables: newDurables,
          };
        }),
      }));
    },

    // Buy appliance with Jones-style tracking
    buyAppliance: (playerId: string, applianceId: string, price: number, source: ApplianceSource): number => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return 0;

      const appliance = getAppliance(applianceId);
      if (!appliance) return 0;

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
            gold: Math.max(0, p.gold - price),
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
            gold: Math.max(0, p.gold - repairCost),
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

    // Prepay rent for multiple weeks
    prepayRent: (playerId: string, weeks: number, totalCost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          return {
            ...p,
            gold: Math.max(0, p.gold - totalCost),
            rentPrepaidWeeks: p.rentPrepaidWeeks + weeks,
            weeksSinceRent: 0,
          };
        }),
      }));
    },

    // Move to new housing with locked-in rent
    moveToHousing: (playerId: string, tier: HousingTier, cost: number, lockInRent: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          return {
            ...p,
            gold: Math.max(0, p.gold - cost),
            housing: tier,
            weeksSinceRent: 0,
            rentPrepaidWeeks: 0,
            lockedRent: lockInRent,
          };
        }),
      }));
    },

    // Equip an item to a slot (must own the durable)
    equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          // Must own the item as a durable
          if (!p.durables[itemId] || p.durables[itemId] <= 0) return p;

          const update: Partial<typeof p> = {};
          if (slot === 'weapon') update.equippedWeapon = itemId;
          else if (slot === 'armor') update.equippedArmor = itemId;
          else if (slot === 'shield') update.equippedShield = itemId;

          return { ...p, ...update };
        }),
      }));
    },

    // Unequip an item from a slot
    unequipItem: (playerId: string, slot: EquipmentSlot) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const update: Partial<typeof p> = {};
          if (slot === 'weapon') update.equippedWeapon = null;
          else if (slot === 'armor') update.equippedArmor = null;
          else if (slot === 'shield') update.equippedShield = null;

          return { ...p, ...update };
        }),
      }));
    },

    clearDungeonFloor: (playerId: string, floorId: number) => {
      set((state) => ({
        players: state.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                dungeonFloorsCleared: p.dungeonFloorsCleared.includes(floorId)
                  ? p.dungeonFloorsCleared
                  : [...p.dungeonFloorsCleared, floorId],
              }
            : p
        ),
      }));
    },
  };
}
