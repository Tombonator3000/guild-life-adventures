/**
 * AI Action Handlers — Fence Services
 *
 * Handles: buy-protection, buy-tip-off, sabotage-player
 */

import type { Player } from '@/types/game.types';
import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

export function handleBuyProtection(player: Player, action: AIAction, store: StoreActions): boolean {
  const weeks = (action.details?.weeks as number) || 3;
  const cost = (action.details?.cost as number) || 75;
  if (player.gold < cost) return false;
  if ((player.protectionWeeksLeft ?? 0) >= weeks * 2) return false; // already well-covered
  store.buyProtection(player.id, weeks, cost);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyTipOff(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 40;
  const targetId = action.details?.targetId as string | undefined;
  if (!targetId || player.gold < cost) return false;
  // Tip-offs cost gold + time; intel is "consumed" by the AI's strategy logic
  // (next turn the AI prioritises sabotage on the target it scouted).
  store.modifyGold(player.id, -cost);
  store.spendTime(player.id, 1);
  return true;
}

export function handleSabotagePlayer(player: Player, action: AIAction, store: StoreActions): boolean {
  const targetId = action.details?.targetId as string | undefined;
  const effectType = action.details?.effectType as string | undefined;
  const effectValue = (action.details?.effectValue as number) || 0;
  const cost = (action.details?.cost as number) || 0;
  if (!targetId || !effectType || player.gold < cost) return false;
  store.sabotagePlayer(player.id, targetId, effectType, effectValue, cost);
  store.spendTime(player.id, 1);
  return true;
}
