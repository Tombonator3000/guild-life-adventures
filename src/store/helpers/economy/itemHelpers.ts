import type { SetFn, GetFn } from '../../storeTypes';

export function createItemActions(set: SetFn, get: GetFn) {
  return {
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

    buyLotteryTicket: (playerId: string, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;
          return { ...p, gold: p.gold - cost, lotteryTickets: p.lotteryTickets + 1 };
        }),
      }));
    },

    buyFreshFood: (playerId: string, units: number, cost: number): boolean => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;

          const hasPreservationBox = p.appliances['preservation-box'] && !p.appliances['preservation-box'].isBroken;
          const newGold = p.gold - cost;

          // Without Preservation Box: food is stored but may spoil at turn end (hidden from player)
          if (!hasPreservationBox) {
            return {
              ...p,
              gold: newGold,
              freshFood: Math.min(6, p.freshFood + units),
              foodBoughtWithoutPreservation: true,
              hasStoreBoughtFood: true,
            };
          }

          // With Preservation Box: safe storage
          const hasFrostChest = p.appliances['frost-chest'] && !p.appliances['frost-chest'].isBroken;
          const maxStorage = hasFrostChest ? 12 : 6;
          const newFreshFood = Math.min(maxStorage, p.freshFood + units);

          return {
            ...p,
            gold: newGold,
            freshFood: newFreshFood,
          };
        }),
      }));
      return false; // Spoilage is now hidden — checked at turn end
    },

    // Buy regular food at General Store (bread, cheese) — shelf-stable, no end-of-turn spoilage.
    // processRegularFoodSpoilage at turn start handles sickness risk for stored food.
    buyFoodWithSpoilage: (playerId: string, foodValue: number, cost: number): boolean => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;

          const newGold = p.gold - cost;

          return {
            ...p,
            gold: newGold,
            foodLevel: Math.min(100, p.foodLevel + foodValue),
            // Regular food is shelf-stable — do NOT set foodBoughtWithoutPreservation.
            // Only fresh food (buyFreshFood) sets that flag for end-of-turn spoilage.
            hasStoreBoughtFood: true,
          };
        }),
      }));
      return false;
    },
  };
}
