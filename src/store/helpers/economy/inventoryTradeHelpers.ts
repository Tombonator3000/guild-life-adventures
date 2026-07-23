import { getItem } from '@/data/items';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

export function getFenceInventorySellPrice(itemId: string, priceModifier: number): number {
  const item = getItem(itemId);
  return item ? Math.max(5, Math.round(item.basePrice * 0.5 * priceModifier)) : 5;
}

/**
 * Host-authoritative inventory sales.
 *
 * The client sends only the item ID. The host verifies the player is at the
 * Fence, owns the item and resolves the sale value from canonical item data.
 */
export function createInventoryTradeActions(set: SetFn, get: GetFn) {
  return {
    sellInventoryItem: (playerId: string, itemId: string): ActionResult | void => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'fence') {
        return { success: false, message: 'Visit the Fence before selling items.' };
      }

      const itemIndex = player.inventory.indexOf(itemId);
      if (itemIndex === -1) {
        return { success: false, message: 'You do not own that inventory item.' };
      }

      const price = getFenceInventorySellPrice(itemId, state.priceModifier);
      set(current => ({
        players: current.players.map(candidate => {
          if (candidate.id !== playerId) return candidate;
          const inventory = [...candidate.inventory];
          const currentIndex = inventory.indexOf(itemId);
          if (currentIndex === -1) return candidate;
          inventory.splice(currentIndex, 1);
          return {
            ...candidate,
            gold: candidate.gold + price,
            inventory,
            gameStats: {
              ...candidate.gameStats,
              totalGoldEarned: (candidate.gameStats?.totalGoldEarned ?? 0) + price,
            },
          };
        }),
      }));

      const itemName = getItem(itemId)?.name ?? itemId;
      return { success: true, message: `Sold ${itemName} for ${price}g.` };
    },
  };
}
