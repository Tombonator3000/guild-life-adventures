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
  if (!hexId || (player.currentLocation !== 'enchanter' && player.currentLocation !== 'shadow-market')) return false;
  const result = store.purchaseHexScroll(player.id, player.currentLocation, hexId);
  return result?.success ?? false;
}

export function handleDispelHex(player: Player, action: AIAction, store: StoreActions): boolean {
  const targetLocation = action.details?.location as import('@/types/game.types').LocationId;
  if (!targetLocation) return false;
  const result = store.useHexDefense(player.id, 'dispel', targetLocation);
  return result?.success ?? false;
}

export function handleDarkRitual(player: Player, _action: AIAction, store: StoreActions): boolean {
  const result = store.useGraveyardHexService(player.id, 'ritual');
  return result?.success ?? false;
}
