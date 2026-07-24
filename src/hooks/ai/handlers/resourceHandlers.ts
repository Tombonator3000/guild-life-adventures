/**
 * AI Action Handlers — Resource Purchases
 *
 * The generator chooses a catalogue item. The host-owned wrapper resolves
 * canonical price/effect and preserves the historical one-hour AI shopping cost.
 */

import type { Player } from '@/types/game.types';
import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

function runPurchase(
  player: Player,
  action: AIAction,
  store: StoreActions,
  fallbackVendor: 'general-store' | 'shadow-market' | 'rusty-tankard' | 'armory',
  fallbackItemId: string,
): boolean {
  const vendor = (action.details?.vendor as typeof fallbackVendor | undefined) ?? fallbackVendor;
  const itemId = (action.details?.itemId as string | undefined) ?? fallbackItemId;
  const result = store.purchaseAIResourceItem(player.id, vendor, itemId);
  return result?.success ?? false;
}

export function handleBuyFood(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.currentLocation === 'general-store') {
    return runPurchase(player, action, store, 'general-store', 'cheese');
  }
  if (player.currentLocation === 'rusty-tankard') {
    return runPurchase(player, action, store, 'rusty-tankard', 'stew');
  }
  if (player.currentLocation === 'shadow-market') {
    return runPurchase(player, action, store, 'shadow-market', 'mystery-meat');
  }
  return false;
}

export function handleBuyClothing(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.currentLocation !== 'armory') return false;
  const target = Number(action.details?.clothingGain ?? 35);
  const itemId = target >= 90
    ? 'noble-attire'
    : target >= 60
      ? 'fine-clothes'
      : target >= 45
        ? 'common-tunic'
        : 'peasant-garb';
  return runPurchase(player, action, store, 'armory', itemId);
}

export function handleBuyFreshFood(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.currentLocation !== 'general-store') return false;
  const units = Number(action.details?.units ?? 2);
  const itemId = units >= 6 ? 'fresh-provisions' : units >= 3 ? 'fresh-meat' : 'fresh-vegetables';
  return runPurchase(player, action, store, 'general-store', itemId);
}

export function handleBuyTicket(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.currentLocation !== 'shadow-market') return false;
  const ticketType = action.details?.ticketType as string | undefined;
  const itemId = ticketType === 'bard-concert'
    ? 'bard-concert-ticket'
    : ticketType === 'theatre'
      ? 'theatre-ticket'
      : ticketType === 'jousting'
        ? 'jousting-ticket'
        : '';
  if (!itemId) return false;
  return runPurchase(player, action, store, 'shadow-market', itemId);
}

export function handleBuyLotteryTicket(player: Player, action: AIAction, store: StoreActions): boolean {
  if (player.currentLocation !== 'general-store' && player.currentLocation !== 'shadow-market') return false;
  return runPurchase(player, action, store, player.currentLocation, 'lottery-ticket');
}

export function handleBuyReputationUnlock(player: Player, action: AIAction, store: StoreActions): boolean {
  const unlockId = action.details?.unlockId as string;
  if (!unlockId) return false;
  const result = store.purchaseReputationUnlock(player.id, unlockId);
  return !result || result.success;
}
