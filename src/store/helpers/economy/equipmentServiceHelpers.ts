import type { EquipmentSlot } from '@/types/game.types';
import {
  ARMORY_ITEMS,
  EQUIPMENT_REPAIR_TIME,
  MAX_DURABILITY,
  TEMPER_TIME,
  getEquipmentRepairCost,
  getItemPrice,
  getSalvageValue,
  getTemperCost,
} from '@/data/items';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

export type EquipmentVendor = 'armory' | 'fence-used';
export type ArmoryPurchaseMode = 'primary' | 'backup';
export type EquipmentService = 'temper' | 'repair' | 'salvage';

const USED_GOODS = {
  'used-sword': { basePrice: 40, durableId: 'sword', slot: 'weapon' as EquipmentSlot },
  'used-shield': { basePrice: 20, durableId: 'shield', slot: 'shield' as EquipmentSlot },
  'used-clothes': { basePrice: 30, clothing: 50 },
  'used-blanket': { basePrice: 12, happiness: 3 },
} as const;

function updatePurchaseStats(totalGoldSpent: number | undefined, price: number) {
  return (totalGoldSpent ?? 0) + price;
}

/**
 * Host-authoritative equipment intent actions.
 *
 * Clients send only vendor, item ID and intent. The host resolves catalogue,
 * price modifier, dungeon prerequisites, equipment slot, durability, service
 * cost, time and salvage value.
 */
export function createEquipmentServiceActions(set: SetFn, get: GetFn) {
  return {
    purchaseEquipmentItem: (
      playerId: string,
      vendor: EquipmentVendor,
      itemId: string,
      mode: ArmoryPurchaseMode = 'primary',
    ): ActionResult | void => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };

      if (vendor === 'fence-used') {
        if (player.currentLocation !== 'fence') {
          return { success: false, message: 'Visit the Fence first.' };
        }
        const used = USED_GOODS[itemId as keyof typeof USED_GOODS];
        if (!used) return { success: false, message: 'The Fence does not sell that used item.' };
        const price = Math.round(used.basePrice * state.priceModifier * 0.8);
        const timeCost = 1;
        if (player.gold < price) return { success: false, message: 'Not enough gold.' };
        if (player.timeRemaining < timeCost) return { success: false, message: 'Not enough time.' };

        if ('durableId' in used && (player.durables[used.durableId] ?? 0) > 0) {
          return { success: false, message: 'You already own the equivalent equipment.' };
        }
        if ('clothing' in used && player.clothingCondition >= used.clothing) {
          return { success: false, message: 'The used clothing would not improve your outfit.' };
        }

        set(current => ({
          players: current.players.map(candidate => {
            if (candidate.id !== playerId) return candidate;
            const base = {
              ...candidate,
              gold: candidate.gold - price,
              timeRemaining: candidate.timeRemaining - timeCost,
              gameStats: {
                ...candidate.gameStats,
                totalGoldSpent: updatePurchaseStats(candidate.gameStats?.totalGoldSpent, price),
              },
            };

            if ('durableId' in used) {
              const slotUpdate = used.slot === 'weapon'
                ? { equippedWeapon: used.durableId }
                : { equippedShield: used.durableId };
              return {
                ...base,
                ...slotUpdate,
                durables: { ...candidate.durables, [used.durableId]: 1 },
                equipmentDurability: {
                  ...candidate.equipmentDurability,
                  [used.durableId]: MAX_DURABILITY,
                },
              };
            }
            if ('clothing' in used) {
              return { ...base, clothingCondition: Math.max(candidate.clothingCondition, used.clothing) };
            }
            return { ...base, happiness: Math.min(100, candidate.happiness + used.happiness) };
          }),
        }));

        return { success: true, message: `Purchased ${itemId.replace('used-', 'used ')}.` };
      }

      if (player.currentLocation !== 'armory') {
        return { success: false, message: 'Visit the Armory first.' };
      }
      const item = ARMORY_ITEMS.find(candidate => candidate.id === itemId);
      if (!item) return { success: false, message: 'The Armory does not sell that item.' };
      const price = getItemPrice(item, state.priceModifier);
      if (player.gold < price) return { success: false, message: 'Not enough gold.' };
      if (item.requiresFloorCleared && !player.dungeonFloorsCleared.includes(item.requiresFloorCleared)) {
        return { success: false, message: `Clear dungeon floor ${item.requiresFloorCleared} first.` };
      }

      if (item.effect?.type === 'clothing') {
        const condition = item.effect.value;
        if (mode === 'backup') {
          if (condition <= (player.backupOutfit ?? 0)) {
            return { success: false, message: 'This would not improve the backup outfit.' };
          }
          set(current => ({
            players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
              ...candidate,
              gold: candidate.gold - price,
              backupOutfit: condition,
              gameStats: {
                ...candidate.gameStats,
                totalGoldSpent: updatePurchaseStats(candidate.gameStats?.totalGoldSpent, price),
              },
            }),
          }));
          return { success: true, message: `Stored ${item.name} as the backup outfit.` };
        }

        if (condition <= player.clothingCondition) {
          return { success: false, message: 'This clothing would not improve the current outfit.' };
        }
        set(current => ({
          players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
            ...candidate,
            gold: candidate.gold - price,
            clothingCondition: Math.max(candidate.clothingCondition, condition),
            happiness: Math.min(100, candidate.happiness + (item.happinessOnPurchase ?? 0)),
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: updatePurchaseStats(candidate.gameStats?.totalGoldSpent, price),
            },
          }),
        }));
        return { success: true, message: `Purchased ${item.name}.` };
      }

      if (!item.isDurable || !item.equipSlot) {
        return { success: false, message: 'This item is not supported by the equipment purchase service.' };
      }
      if ((player.durables[item.id] ?? 0) > 0) {
        return { success: false, message: 'You already own this equipment.' };
      }

      set(current => ({
        players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
          ...candidate,
          gold: candidate.gold - price,
          happiness: Math.min(100, candidate.happiness + (item.effect?.type === 'happiness' ? item.effect.value : 0)),
          durables: { ...candidate.durables, [item.id]: 1 },
          equipmentDurability: {
            ...candidate.equipmentDurability,
            [item.id]: MAX_DURABILITY,
          },
          gameStats: {
            ...candidate.gameStats,
            totalGoldSpent: updatePurchaseStats(candidate.gameStats?.totalGoldSpent, price),
          },
        }),
      }));
      return { success: true, message: `Purchased ${item.name}.` };
    },

    useEquipmentService: (
      playerId: string,
      service: EquipmentService,
      itemId: string,
    ): ActionResult | void => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      const item = ARMORY_ITEMS.find(candidate => candidate.id === itemId && candidate.equipSlot);
      if (!player || !item || !item.equipSlot) {
        return { success: false, message: 'Invalid equipment service.' };
      }
      if (player.currentLocation !== 'forge') {
        return { success: false, message: 'Visit the Forge first.' };
      }
      if ((player.durables[itemId] ?? 0) <= 0) {
        return { success: false, message: 'You do not own this equipment.' };
      }

      if (service === 'temper') {
        if (player.temperedItems.includes(itemId)) {
          return { success: false, message: 'This equipment is already tempered.' };
        }
        const cost = Math.round(getTemperCost(item) * state.priceModifier);
        const timeCost = TEMPER_TIME[item.equipSlot];
        if (player.gold < cost) return { success: false, message: 'Not enough gold.' };
        if (player.timeRemaining < timeCost) return { success: false, message: 'Not enough time.' };

        set(current => ({
          players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
            ...candidate,
            gold: candidate.gold - cost,
            timeRemaining: candidate.timeRemaining - timeCost,
            happiness: Math.min(100, candidate.happiness + 2),
            temperedItems: [...candidate.temperedItems, itemId],
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: updatePurchaseStats(candidate.gameStats?.totalGoldSpent, cost),
            },
          }),
        }));
        return { success: true, message: `Tempered ${item.name}.` };
      }

      if (service === 'repair') {
        const durability = player.equipmentDurability?.[itemId] ?? MAX_DURABILITY;
        if (durability >= MAX_DURABILITY) {
          return { success: false, message: 'This equipment does not need repair.' };
        }
        const cost = getEquipmentRepairCost(item, durability);
        if (player.gold < cost) return { success: false, message: 'Not enough gold.' };
        if (player.timeRemaining < EQUIPMENT_REPAIR_TIME) return { success: false, message: 'Not enough time.' };

        set(current => ({
          players: current.players.map(candidate => candidate.id !== playerId ? candidate : {
            ...candidate,
            gold: candidate.gold - cost,
            timeRemaining: candidate.timeRemaining - EQUIPMENT_REPAIR_TIME,
            equipmentDurability: {
              ...candidate.equipmentDurability,
              [itemId]: MAX_DURABILITY,
            },
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: updatePurchaseStats(candidate.gameStats?.totalGoldSpent, cost),
            },
          }),
        }));
        return { success: true, message: `Repaired ${item.name}.` };
      }

      const timeCost = 1;
      if (player.timeRemaining < timeCost) return { success: false, message: 'Not enough time.' };
      const value = getSalvageValue(item, state.priceModifier);
      set(current => ({
        players: current.players.map(candidate => {
          if (candidate.id !== playerId) return candidate;
          const durables = { ...candidate.durables };
          durables[itemId] = (durables[itemId] ?? 0) - 1;
          if (durables[itemId] <= 0) delete durables[itemId];
          const stillOwns = (durables[itemId] ?? 0) > 0;
          const equipmentDurability = { ...candidate.equipmentDurability };
          if (!stillOwns) delete equipmentDurability[itemId];
          return {
            ...candidate,
            gold: candidate.gold + value,
            timeRemaining: candidate.timeRemaining - timeCost,
            durables,
            equipmentDurability,
            temperedItems: stillOwns
              ? candidate.temperedItems
              : candidate.temperedItems.filter(id => id !== itemId),
            equippedWeapon: !stillOwns && candidate.equippedWeapon === itemId ? null : candidate.equippedWeapon,
            equippedArmor: !stillOwns && candidate.equippedArmor === itemId ? null : candidate.equippedArmor,
            equippedShield: !stillOwns && candidate.equippedShield === itemId ? null : candidate.equippedShield,
            gameStats: {
              ...candidate.gameStats,
              totalGoldEarned: (candidate.gameStats?.totalGoldEarned ?? 0) + value,
            },
          };
        }),
      }));
      return { success: true, message: `Salvaged ${item.name} for ${value}g.` };
    },
  };
}
