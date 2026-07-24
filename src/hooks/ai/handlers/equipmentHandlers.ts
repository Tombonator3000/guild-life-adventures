/**
 * AI Action Handlers — Equipment, Items & Appliances
 *
 * Decision generators may estimate costs for prioritisation, but execution sends
 * only semantic intent. Canonical store services resolve vendor, price, time,
 * durability, salvage/pawn value and item effects.
 */

import type { Player } from '@/types/game.types';
import { getItem } from '@/data/items';
import { useGameStore } from '@/store/gameStore';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

export function handleBuyAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  if (!applianceId || player.timeRemaining < 1) return false;

  const vendor = player.currentLocation === 'enchanter'
    ? 'enchanter'
    : player.currentLocation === 'shadow-market'
      ? 'shadow-market'
      : player.currentLocation === 'fence'
        ? 'fence'
        : null;
  if (!vendor) return false;

  const result = useGameStore.getState().purchaseAppliance(player.id, vendor, applianceId);
  if (!result?.success) return false;

  // Fence purchases already include their canonical one-hour service time.
  // Preserve the historical AI shopping hour for Enchanter/Shadow Market buys.
  if (vendor !== 'fence') store.spendTime(player.id, 1);
  return true;
}

export function handleBuyEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  if (!itemId || player.timeRemaining < 1 || player.currentLocation !== 'armory') return false;

  const item = getItem(itemId);
  if (!item) return false;

  const result = useGameStore.getState().purchaseEquipmentItem(player.id, 'armory', itemId, 'primary');
  if (!result?.success) return false;

  if (item.equipSlot) store.equipItem(player.id, itemId, item.equipSlot);
  store.spendTime(player.id, 1);
  return true;
}

export function handleTemperEquipment(player: Player, action: AIAction, _store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  if (!itemId || player.currentLocation !== 'forge') return false;
  const result = useGameStore.getState().useEquipmentService(player.id, 'temper', itemId);
  return result?.success ?? false;
}

export function handleRepairEquipment(player: Player, action: AIAction, _store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  if (!itemId || player.currentLocation !== 'forge') return false;
  const result = useGameStore.getState().useEquipmentService(player.id, 'repair', itemId);
  return result?.success ?? false;
}

export function handleSellItem(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  if (!itemId) return false;
  const result = store.sellInventoryItem(player.id, itemId);
  return result?.success ?? false;
}

export function handlePawnAppliance(player: Player, action: AIAction, _store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  if (!applianceId || player.currentLocation !== 'fence') return false;
  const result = useGameStore.getState().useApplianceService(player.id, 'pawn', applianceId);
  return result?.success ?? false;
}

export function handleRepairAppliance(player: Player, action: AIAction, _store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  if (!applianceId) return false;

  const service = player.currentLocation === 'forge'
    ? 'repair-forge'
    : player.currentLocation === 'enchanter'
      ? 'repair-enchanter'
      : null;
  if (!service) return false;

  const result = useGameStore.getState().useApplianceService(player.id, service, applianceId);
  return result?.success ?? false;
}

/** Buy a protective amulet from the Enchanter. */
export function handleBuyAmulet(player: Player, _action: AIAction, store: StoreActions): boolean {
  if (player.hasProtectiveAmulet) return false;
  const result = store.useHexDefense(player.id, 'amulet');
  return result?.success ?? false;
}
