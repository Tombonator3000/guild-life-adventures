// Economy helpers
// Banking, rent, buying/selling items, durables, appliances, housing, equipment
// Stock market, loans, fresh food, lottery, tickets

import type { HousingTier, ApplianceSource, EquipmentSlot } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { getAppliance, calculateRepairCost } from '@/data/items';
import { DUNGEON_FLOORS } from '@/data/dungeon';
import { getSellPrice } from '@/data/stocks';
import type { SetFn, GetFn } from '../storeTypes';

export function createEconomyActions(set: SetFn, get: GetFn) {
  return {
    payRent: (playerId: string) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          // Use locked-in rent if available, otherwise current rate
          const rentCost = p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing];
          if (p.gold < rentCost) return p;
          return {
            ...p,
            gold: p.gold - rentCost,
            weeksSinceRent: 0,
          };
        }),
      }));
    },

    depositToBank: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.gold);
          if (actual <= 0) return p;
          return { ...p, gold: p.gold - actual, savings: p.savings + actual };
        }),
      }));
    },

    withdrawFromBank: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.savings);
          if (actual <= 0) return p;
          return { ...p, gold: p.gold + actual, savings: p.savings - actual };
        }),
      }));
    },

    invest: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.gold);
          if (actual <= 0) return p;
          return { ...p, gold: p.gold - actual, investments: p.investments + actual };
        }),
      }));
    },

    withdrawInvestment: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const actual = Math.min(amount, p.investments);
          if (actual <= 0) return p;
          // 10% early withdrawal penalty
          const penalty = Math.floor(actual * 0.10);
          return { ...p, gold: p.gold + actual - penalty, investments: p.investments - actual };
        }),
      }));
    },

    buyItem: (playerId: string, itemId: string, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;
          return {
            ...p,
            gold: p.gold - cost,
            inventory: [...p.inventory, itemId],
          };
        }),
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
          if (p.gold < cost) return p;
          const newDurables = { ...p.durables };
          newDurables[itemId] = (newDurables[itemId] || 0) + 1;
          return {
            ...p,
            gold: p.gold - cost,
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

    // Prepay rent for multiple weeks
    prepayRent: (playerId: string, weeks: number, totalCost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < totalCost) return p;

          return {
            ...p,
            gold: p.gold - totalCost,
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
          if (p.gold < cost) return p;

          return {
            ...p,
            gold: p.gold - cost,
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

    applyRareDrop: (playerId: string, dropId: string) => {
      const drop = DUNGEON_FLOORS
        .map(f => f.rareDrop)
        .find(d => d.id === dropId);

      if (!drop) return;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const effect = drop.effect;
          const updates: Partial<typeof p> = {};

          switch (effect.type) {
            case 'heal':
              updates.health = Math.min(p.maxHealth, p.health + effect.value);
              break;

            case 'permanent_gold_bonus':
              updates.permanentGoldBonus = (p.permanentGoldBonus || 0) + effect.value;
              break;

            case 'permanent_max_health': {
              const newMax = Math.max(50, p.maxHealth + effect.value);
              updates.maxHealth = newMax;
              updates.health = Math.min(p.health + effect.value, newMax);
              break;
            }

            case 'equippable': {
              // Add rare drop as a durable and auto-equip
              const newDurables = { ...p.durables };
              newDurables[dropId] = (newDurables[dropId] || 0) + 1;
              updates.durables = newDurables;
              if (effect.slot === 'shield') {
                updates.equippedShield = dropId;
              }
              break;
            }

            case 'happiness_and_stats':
              updates.happiness = Math.min(100, p.happiness + effect.happiness);
              updates.maxHealth = p.maxHealth + effect.statCap;
              updates.maxDependability = p.maxDependability + effect.statCap;
              updates.maxExperience = p.maxExperience + effect.statCap;
              break;
          }

          return { ...p, ...updates };
        }),
      }));
    },

    // === Stock Market Actions ===

    buyStock: (playerId: string, stockId: string, shares: number) => {
      if (shares <= 0 || !Number.isFinite(shares)) return;
      const state = get();
      const price = state.stockPrices[stockId];
      if (price == null || price <= 0) return;
      const totalCost = price * shares;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < totalCost) return p;
          const newStocks = { ...p.stocks };
          newStocks[stockId] = (newStocks[stockId] || 0) + shares;
          return {
            ...p,
            gold: p.gold - totalCost,
            stocks: newStocks,
          };
        }),
      }));
    },

    sellStock: (playerId: string, stockId: string, shares: number) => {
      if (shares <= 0 || !Number.isFinite(shares)) return;
      const state = get();
      const currentPrice = state.stockPrices[stockId] || 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const ownedShares = p.stocks[stockId] || 0;
          const actualShares = Math.min(shares, ownedShares);
          if (actualShares <= 0) return p;

          const revenue = getSellPrice(stockId, actualShares, currentPrice);
          const newStocks = { ...p.stocks };
          newStocks[stockId] = ownedShares - actualShares;
          if (newStocks[stockId] <= 0) delete newStocks[stockId];

          return {
            ...p,
            gold: p.gold + revenue,
            stocks: newStocks,
          };
        }),
      }));
    },

    // === Loan Actions ===

    takeLoan: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount) || amount > 1000) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.loanAmount > 0) return p;
          return {
            ...p,
            gold: p.gold + amount,
            loanAmount: amount,
            loanWeeksRemaining: 8,
          };
        }),
      }));
    },

    repayLoan: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.loanAmount <= 0) return p;
          const actualPayment = Math.min(amount, p.loanAmount, p.gold);
          if (actualPayment <= 0) return p;
          return {
            ...p,
            gold: p.gold - actualPayment,
            loanAmount: p.loanAmount - actualPayment,
            loanWeeksRemaining: p.loanAmount - actualPayment <= 0 ? 0 : p.loanWeeksRemaining,
          };
        }),
      }));
    },

    // === Fresh Food Actions ===

    buyFreshFood: (playerId: string, units: number, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          // Check if player has preservation box
          const hasPreservationBox = p.appliances['preservation-box'] && !p.appliances['preservation-box'].isBroken;
          if (!hasPreservationBox) return p; // Can't store without preservation box
          if (p.gold < cost) return p;

          const hasFrostChest = p.appliances['frost-chest'] && !p.appliances['frost-chest'].isBroken;
          const maxStorage = hasFrostChest ? 12 : 6;
          const newFreshFood = Math.min(maxStorage, p.freshFood + units);

          return {
            ...p,
            gold: p.gold - cost,
            freshFood: newFreshFood,
          };
        }),
      }));
    },

    // === Lottery Actions ===

    buyLotteryTicket: (playerId: string, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;
          return { ...p, gold: p.gold - cost, lotteryTickets: p.lotteryTickets + 1 };
        }),
      }));
    },

    // === Ticket Actions ===

    buyTicket: (playerId: string, ticketType: string, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          // Don't allow duplicate ticket types
          if (p.tickets.includes(ticketType)) return p;
          if (p.gold < cost) return p;
          return {
            ...p,
            gold: p.gold - cost,
            tickets: [...p.tickets, ticketType],
          };
        }),
      }));
    },
  };
}
