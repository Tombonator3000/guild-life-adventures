import type { ActionResult, GetFn } from '../storeTypes';

export type AIResourceVendor = 'general-store' | 'shadow-market' | 'rusty-tankard' | 'armory';

/**
 * Internal AI shopping wrapper.
 *
 * The canonical vendor service owns catalogue, price and item effects. This
 * wrapper preserves the historical AI-only one-hour shopping cost without
 * exposing numeric price/effect arguments to the AI executor.
 */
export function createAIResourceServiceActions(_set: unknown, get: GetFn) {
  return {
    purchaseAIResourceItem: (
      playerId: string,
      vendor: AIResourceVendor,
      itemId: string,
    ): ActionResult | void => {
      const player = get().players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.timeRemaining < 1) return { success: false, message: 'Not enough time to shop.' };

      const result = vendor === 'rusty-tankard'
        ? get().purchaseTavernItem(playerId, itemId)
        : vendor === 'armory'
          ? get().purchaseEquipmentItem(playerId, 'armory', itemId)
          : get().purchaseVendorItem(playerId, vendor, itemId);

      if (!result?.success) return result ?? { success: false, message: 'Purchase failed.' };
      get().spendTime(playerId, 1);
      return result;
    },
  };
}
