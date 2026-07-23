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
  if ((player.protectionWeeksLeft ?? 0) >= weeks * 2) return false; // already well-covered
  const result = store.buyProtection(player.id, weeks);
  return !result || result.success;
}

export function handleBuyTipOff(player: Player, action: AIAction, store: StoreActions): boolean {
  const targetId = action.details?.targetId as string | undefined;
  if (!targetId) return false;
  const result = store.buyTipOff(player.id, targetId);
  return !result || result.success;
}

export function handleSabotagePlayer(player: Player, action: AIAction, store: StoreActions): boolean {
  const targetId = action.details?.targetId as string | undefined;
  const optionId = action.details?.optionId as string | undefined;
  if (!targetId || !optionId) return false;
  const result = store.sabotagePlayer(player.id, targetId, optionId);
  return !result || result.success;
}
