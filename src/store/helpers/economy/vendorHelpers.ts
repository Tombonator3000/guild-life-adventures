import {
  ACADEMY_ITEMS,
  GENERAL_STORE_ITEMS,
  SHADOW_MARKET_ITEMS,
  getItemPrice,
  type Item,
} from '@/data/items';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

export type VendorId = 'general-store' | 'shadow-market';

type ResolvedVendorItem = {
  item: Item;
  price: number;
};

function resolveVendorItem(
  vendor: VendorId,
  itemId: string,
  priceModifier: number,
): ResolvedVendorItem | null {
  if (vendor === 'general-store') {
    const item = GENERAL_STORE_ITEMS.find(candidate => candidate.id === itemId)
      ?? (itemId === 'lottery-ticket'
        ? SHADOW_MARKET_ITEMS.find(candidate => candidate.id === itemId)
        : undefined);
    return item ? { item, price: getItemPrice(item, priceModifier) } : null;
  }

  const regularItem = SHADOW_MARKET_ITEMS.find(candidate => candidate.id === itemId);
  if (regularItem) {
    return { item: regularItem, price: getItemPrice(regularItem, priceModifier * 0.7) };
  }

  const scholarItem = ACADEMY_ITEMS.find(candidate => candidate.id === itemId);
  if (scholarItem) {
    return { item: scholarItem, price: getItemPrice(scholarItem, priceModifier * 0.85) };
  }

  return null;
}

/**
 * Canonical vendor purchase entry point.
 *
 * Guests send only vendor + item ID. The host resolves the catalogue,
 * economy modifier, vendor discount, effects, storage capacity, ticket type
 * and duplicate ownership checks in a single state transaction.
 */
export function createVendorActions(set: SetFn, get: GetFn) {
  return {
    purchaseVendorItem: (
      playerId: string,
      vendor: VendorId,
      itemId: string,
    ): ActionResult | void => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== vendor) {
        return { success: false, message: `Visit the ${vendor === 'general-store' ? 'General Store' : 'Shadow Market'} first.` };
      }

      const resolved = resolveVendorItem(vendor, itemId, state.priceModifier);
      if (!resolved) return { success: false, message: 'This vendor does not sell that item.' };
      const { item, price } = resolved;

      if (player.gold < price) return { success: false, message: 'Not enough gold.' };
      if (item.isTicket && item.ticketType && player.tickets.includes(item.ticketType)) {
        return { success: false, message: 'You already own this ticket.' };
      }
      if (item.isDurable && ACADEMY_ITEMS.some(candidate => candidate.id === item.id) && player.durables[item.id]) {
        return { success: false, message: 'You already own this scholar item.' };
      }

      if (item.isFreshFood) {
        const hasPreservationBox = !!player.appliances['preservation-box']
          && !player.appliances['preservation-box'].isBroken;
        const hasFrostChest = !!player.appliances['frost-chest']
          && !player.appliances['frost-chest'].isBroken;
        const maxStorage = hasFrostChest ? 12 : 6;
        if (player.freshFood >= maxStorage) {
          return { success: false, message: 'Fresh-food storage is full.' };
        }
        if ((item.freshFoodUnits ?? 0) <= 0) {
          return { success: false, message: 'Invalid fresh-food item.' };
        }
        // Without preservation magic, the food is still stored but may spoil at turn end.
        // This preserves the existing hidden-spoilage rule while preventing payment at full capacity.
        void hasPreservationBox;
      }

      set(current => ({
        players: current.players.map(candidate => {
          if (candidate.id !== playerId) return candidate;

          const next = {
            ...candidate,
            gold: candidate.gold - price,
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + price,
            },
          };

          if (item.isLotteryTicket) {
            return { ...next, lotteryTickets: candidate.lotteryTickets + 1 };
          }

          if (item.isTicket && item.ticketType) {
            return { ...next, tickets: [...candidate.tickets, item.ticketType] };
          }

          if (item.isFreshFood) {
            const hasPreservationBox = !!candidate.appliances['preservation-box']
              && !candidate.appliances['preservation-box'].isBroken;
            const hasFrostChest = !!candidate.appliances['frost-chest']
              && !candidate.appliances['frost-chest'].isBroken;
            const maxStorage = hasFrostChest ? 12 : 6;
            return {
              ...next,
              freshFood: Math.min(maxStorage, candidate.freshFood + (item.freshFoodUnits ?? 0)),
              ...(hasPreservationBox ? {} : {
                foodBoughtWithoutPreservation: true,
                hasStoreBoughtFood: true,
              }),
            };
          }

          if (item.isDurable) {
            return {
              ...next,
              durables: {
                ...candidate.durables,
                [item.id]: (candidate.durables[item.id] ?? 0) + 1,
              },
            };
          }

          if (item.effect?.type === 'food') {
            return {
              ...next,
              foodLevel: Math.min(100, candidate.foodLevel + item.effect.value),
            };
          }

          if (item.effect?.type === 'happiness') {
            return {
              ...next,
              happiness: Math.min(100, candidate.happiness + item.effect.value),
            };
          }

          return next;
        }),
      }));

      return { success: true, message: `Purchased ${item.name}.` };
    },
  };
}
