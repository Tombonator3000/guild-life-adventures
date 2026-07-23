/**
 * AI Action Handlers — Equipment, Items & Appliances
 *
 * Handles: buy-appliance, buy-equipment, temper-equipment, repair-equipment,
 *          sell-item, pawn-appliance, repair-appliance
 */

import type { Player, EquipmentSlot } from '@/types/game.types';
import { useGameStore } from '@/store/gameStore';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

export function handleBuyAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  const cost = (action.details?.cost as number) || 300;
  if (!applianceId || player.gold < cost) return false;
  const source = (action.details?.source as string) || 'enchanter';
  store.buyAppliance(player.id, applianceId, cost, source);
  store.spendTime(player.id, 1);
  return true;
}

export function handleBuyEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const cost = (action.details?.cost as number) || 0;
  const slot = (action.details?.slot as string) || 'weapon';
  if (!itemId || player.gold < cost) return false;
  store.buyDurable(player.id, itemId, cost);
  store.equipItem(player.id, itemId, slot as EquipmentSlot);
  store.spendTime(player.id, 1);
  return true;
}

export function handleTemperEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const cost = (action.details?.cost as number) || 0;
  const slot = (action.details?.slot as string) || 'weapon';
  if (!itemId || player.gold < cost) return false;
  if (player.temperedItems.includes(itemId)) return false;
  store.temperEquipment(player.id, itemId, slot as EquipmentSlot, cost);
  const temperTime = slot === 'shield' ? 2 : 3;
  store.spendTime(player.id, temperTime);
  store.modifyHappiness(player.id, 2);
  return true;
}

export function handleRepairEquipment(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  const cost = (action.details?.cost as number) || 0;
  if (!itemId || player.gold < cost) return false;
  store.forgeRepairEquipment(player.id, itemId, cost);
  store.spendTime(player.id, 2); // EQUIPMENT_REPAIR_TIME
  return true;
}

export function handleSellItem(player: Player, action: AIAction, store: StoreActions): boolean {
  const itemId = action.details?.itemId as string;
  if (!itemId) return false;
  const result = store.sellInventoryItem(player.id, itemId);
  return result?.success ?? false;
}

export function handlePawnAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  const pawnValue = (action.details?.pawnValue as number) || 50;
  if (!applianceId || !player.appliances[applianceId]) return false;
  store.pawnAppliance(player.id, applianceId, pawnValue);
  store.spendTime(player.id, 1);
  return true;
}

export function handleRepairAppliance(player: Player, action: AIAction, store: StoreActions): boolean {
  const applianceId = action.details?.applianceId as string;
  const location = action.details?.location as string;
  if (!applianceId) return false;
  const appliance = player.appliances[applianceId];
  if (!appliance || !appliance.isBroken) return false;
  let cost = 0;
  if (location === 'forge') {
    cost = store.forgeRepairAppliance(player.id, applianceId);
  } else {
    cost = store.repairAppliance(player.id, applianceId);
  }
  if (cost === 0) return false; // Repair failed (insufficient gold or not broken)
  // Correct time cost: Forge = 3h, Enchanter = 2h (matches human UI)
  store.spendTime(player.id, location === 'forge' ? 3 : 2);
  return true;
}

/** Buy a protective amulet from the Enchanter. */
export function handleBuyAmulet(player: Player, _action: AIAction, store: StoreActions): boolean {
  if (player.hasProtectiveAmulet) return false;
  const state = useGameStore.getState();
  const cost = Math.round(400 * state.priceModifier);
  if (player.gold < cost) return false;
  store.buyProtectiveAmulet(player.id, cost);
  return true;
}
