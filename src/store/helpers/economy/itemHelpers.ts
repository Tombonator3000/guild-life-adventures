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
  };
}
