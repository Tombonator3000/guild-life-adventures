import type { EquipmentSlot } from '@/types/game.types';
import { calculateRepairCost } from '@/data/items';
import { DUNGEON_FLOORS } from '@/data/dungeon';
import type { SetFn, GetFn } from '../../storeTypes';

export function createEquipmentActions(set: SetFn, get: GetFn) {
  return {
    // Equip an item to a slot (must own the durable)
    equipItem: (playerId: string, itemId: string, slot: EquipmentSlot) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          // Must own the item as a durable
          if (!p.durables[itemId] || p.durables[itemId] <= 0) return p;

          const update: Partial<typeof p> = {};
          if (slot === 'weapon') update.equippedWeapon = itemId;
          else if (slot === 'armor') update.equippedArmor = itemId;
          else if (slot === 'shield') update.equippedShield = itemId;

          return { ...p, ...update };
        }),
      }));
    },

    // Unequip an item from a slot
    unequipItem: (playerId: string, slot: EquipmentSlot) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const update: Partial<typeof p> = {};
          if (slot === 'weapon') update.equippedWeapon = null;
          else if (slot === 'armor') update.equippedArmor = null;
          else if (slot === 'shield') update.equippedShield = null;

          return { ...p, ...update };
        }),
      }));
    },

    clearDungeonFloor: (playerId: string, floorId: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.dungeonFloorsCleared.includes(floorId)) return p;
          // First clear: add floor + dependability bonus
          const floor = DUNGEON_FLOORS.find(f => f.id === floorId);
          const depBonus = floor?.dependabilityOnClear ?? 0;
          return {
            ...p,
            dungeonFloorsCleared: [...p.dungeonFloorsCleared, floorId],
            dependability: Math.min(p.maxDependability, p.dependability + depBonus),
          };
        }),
      }));
    },

    applyRareDrop: (playerId: string, dropId: string) => {
      const drop = DUNGEON_FLOORS
        .map(f => f.rareDrop)
        .find(d => d.id === dropId);

      if (!drop) return;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const effect = drop.effect;
          const updates: Partial<typeof p> = {};

          switch (effect.type) {
            case 'heal':
              updates.health = Math.min(p.maxHealth, p.health + effect.value);
              break;

            case 'permanent_gold_bonus':
              updates.permanentGoldBonus = (p.permanentGoldBonus || 0) + effect.value;
              break;

            case 'permanent_max_health': {
              const newMax = Math.max(50, p.maxHealth + effect.value);
              updates.maxHealth = newMax;
              updates.health = Math.min(p.health + effect.value, newMax);
              break;
            }

            case 'equippable': {
              // Add rare drop as a durable and auto-equip
              const newDurables = { ...p.durables };
              newDurables[dropId] = (newDurables[dropId] || 0) + 1;
              updates.durables = newDurables;
              if (effect.slot === 'shield') {
                updates.equippedShield = dropId;
              }
              break;
            }

            case 'happiness_and_stats':
              updates.happiness = Math.min(100, p.happiness + effect.happiness);
              updates.maxHealth = p.maxHealth + effect.statCap;
              updates.maxDependability = p.maxDependability + effect.statCap;
              updates.maxExperience = p.maxExperience + effect.statCap;
              break;
          }

          return { ...p, ...updates };
        }),
      }));
    },

    // Temper equipment: permanently boost stats (+5 ATK/DEF or +5% BLK)
    temperEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, cost: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < cost) return p;
          // Can only temper once per item
          if (p.temperedItems.includes(itemId)) return p;
          // Must own the item
          if (!p.durables[itemId] || p.durables[itemId] <= 0) return p;

          return {
            ...p,
            gold: p.gold - cost,
            temperedItems: [...p.temperedItems, itemId],
          };
        }),
      }));
    },

    // Forge repair: fix broken appliance at 50% of normal cost, takes 3h
    forgeRepairAppliance: (playerId: string, applianceId: string): number => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return 0;

      const ownedAppliance = player.appliances[applianceId];
      if (!ownedAppliance || !ownedAppliance.isBroken) return 0;

      const fullRepairCost = calculateRepairCost(ownedAppliance.originalPrice);
      const forgeCost = Math.max(5, Math.floor(fullRepairCost * 0.5));
      if (player.gold < forgeCost) return 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;

          const newAppliances = { ...p.appliances };
          newAppliances[applianceId] = {
            ...newAppliances[applianceId],
            isBroken: false,
          };

          return {
            ...p,
            gold: p.gold - forgeCost,
            appliances: newAppliances,
          };
        }),
      }));

      return forgeCost;
    },

    // Salvage equipment: sell weapons/armor/shields for 60% value (better than Fence's 40%)
    salvageEquipment: (playerId: string, itemId: string, slot: EquipmentSlot, value: number) => {
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (!p.durables[itemId] || p.durables[itemId] <= 0) return p;

          const newDurables = { ...p.durables };
          newDurables[itemId] = newDurables[itemId] - 1;
          if (newDurables[itemId] === 0) delete newDurables[itemId];

          // Unequip if salvaging equipped item
          const unequip: Partial<typeof p> = {};
          if (!newDurables[itemId]) {
            if (p.equippedWeapon === itemId) unequip.equippedWeapon = null;
            if (p.equippedArmor === itemId) unequip.equippedArmor = null;
            if (p.equippedShield === itemId) unequip.equippedShield = null;
          }

          // Remove from tempered list if salvaged
          const newTempered = p.temperedItems.filter(id => id !== itemId || (newDurables[itemId] && newDurables[itemId] > 0));

          return {
            ...p,
            ...unequip,
            gold: p.gold + value,
            durables: newDurables,
            temperedItems: newTempered,
          };
        }),
      }));
    },
  };
}
