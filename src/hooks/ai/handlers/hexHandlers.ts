/**
 * AI Action Handlers — Hexes, Curses & Dark Magic
 *
 * Handles: cast-curse, cast-location-hex, buy-hex-scroll,
 *          dispel-hex, dark-ritual
 */

import type { Player } from '@/types/game.types';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

export function handleCastCurse(player: Player, action: AIAction, store: StoreActions): boolean {
  const hexId = action.details?.hexId as string;
  const targetId = action.details?.targetId as string;
  if (!hexId || !targetId) return false;
  const result = store.castPersonalCurse(player.id, hexId, targetId);
  return result.success;
}

export function handleCastLocationHex(player: Player, action: AIAction, store: StoreActions): boolean {
  const hexId = action.details?.hexId as string;
  if (!hexId) return false;
  const result = store.castLocationHex(player.id, hexId);
  return result.success;
}

export function handleBuyHexScroll(player: Player, action: AIAction, store: StoreActions): boolean {
  const hexId = action.details?.hexId as string;
  const cost = (action.details?.cost as number) || 0;
  if (!hexId || player.gold < cost || cost <= 0) return false;
  store.modifyGold(player.id, -cost);
  store.addHexScrollToPlayer(player.id, hexId);
  store.spendTime(player.id, 1);
  return true;
}

export function handleDispelHex(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 250;
  if (player.gold < cost) return false;
  const result = store.dispelLocationHex(player.id, cost);
  return result.success;
}

export function handleDarkRitual(player: Player, action: AIAction, store: StoreActions): boolean {
  const cost = (action.details?.cost as number) || 100;
  if (player.gold < cost) return false;
  const result = store.performDarkRitual(player.id, cost);
  return result.success;
}
