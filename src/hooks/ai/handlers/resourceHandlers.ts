/**
 * AI Action Handlers — Resource Purchases
 *
 * Handles: buy-food, buy-clothing, buy-fresh-food, buy-ticket, buy-lottery-ticket
 */

import type { Player } from '@/types/game.types';
import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

export function handleBuyFood(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 15;
  const foodGain = (action.details?.foodGain as number) || 25;
  if (player.gold < cost) return false;

  // General Store food uses spoilage mechanic (spoilage checked at turn end without Preservation Box)
  if (player.currentLocation === 'general-store') {
    store.buyFoodWithSpoilage(player.id, foodGain, cost);
    store.spendTime(player.id, 1);
    return true;
  }

  // Tavern/Shadow Market: always safe
  store.modifyGold(player.id, -cost);
  store.modifyFood(player.id, foodGain);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyClothing(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 12;
  // clothingGain is now the target condition level (SET-based, not additive)
  const clothingGain = (action.details?.clothingGain as number) || 35;
  if (player.gold < cost) return false;
  if (clothingGain <= player.clothingCondition) return false; // Already at or above this level
  store.modifyGold(player.id, -cost);
  store.modifyClothing(player.id, clothingGain);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyFreshFood(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 25;
  const units = (action.details?.units as number) || 2;
  if (player.gold < cost) return false;
  store.buyFreshFood(player.id, units, cost);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyTicket(player: Player, action: AIAction, store: StoreActions): boolean {
  const ticketType = action.details?.ticketType as string;
  const cost = (action.details?.cost as number) || 30;
  if (!ticketType || player.gold < cost) return false;
  store.buyTicket(player.id, ticketType, cost);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyLotteryTicket(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 5;
  if (player.gold < cost) return false;
  store.buyLotteryTicket(player.id, cost);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyReputationUnlock(player: Player, action: AIAction, store: StoreActions): boolean {
  const unlockId = action.details?.unlockId as string;
  const cost = (action.details?.cost as number) || 0;
  const effectType = (action.details?.effectType as string) || 'happiness';
  const effectValue = (action.details?.effectValue as number) || 0;
  const timeCost = (action.details?.timeCost as number) || 1;
  if (!unlockId || player.gold < cost) return false;
  store.purchaseReputationUnlock(player.id, unlockId, cost, effectType, effectValue, timeCost);
  return true;
}
