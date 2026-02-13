/**
 * Grimwald AI - Quest & Dungeon Actions
 *
 * Generates actions for guild pass purchase, equipment upgrades,
 * quest management (B1 chains, B2 bounties), and dungeon exploration.
 */

import { getFloor, getFloorTimeCost } from '@/data/dungeon';
import { FESTIVALS } from '@/data/festivals';
import { calculateCombatStats, ARMORY_ITEMS, getTemperCost, TEMPER_TIME, EQUIPMENT_REPAIR_TIME, getEquipmentRepairCost, getItem } from '@/data/items';
import type { AIAction } from '../types';
import {
  getBestDungeonFloor,
  getNextEquipmentUpgrade,
  getEquipmentNeedingRepair,
  shouldBuyGuildPass,
  getBestQuest,
  getBestBounty,
  getBestChainQuest,
} from '../strategy';
import type { ActionContext } from './actionContext';

/**
 * Generate quest and dungeon actions
 */
export function generateQuestDungeonActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, moveCost, weakestGoal, priceModifier, activeFestival } = ctx;

  // Festival-aware dungeon priority bonus
  const festivalDungeonMult = activeFestival
    ? (FESTIVALS.find(f => f.id === activeFestival)?.dungeonGoldMultiplier ?? 1.0)
    : 1.0;
  const festivalDungeonBonus = festivalDungeonMult > 1.0 ? 8 : 0; // Boost dungeon priority during gold festivals

  // ============================================
  // DUNGEON & QUEST ACTIONS
  // ============================================

  // Buy Guild Pass when affordable (needed for quests)
  if (shouldBuyGuildPass(player, settings)) {
    if (currentLocation === 'guild-hall') {
      actions.push({
        type: 'buy-guild-pass',
        priority: 55,
        description: 'Buy Guild Pass for quests',
      });
    } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 50,
        description: 'Travel to guild hall to buy pass',
      });
    }
  }

  // Buy equipment for dungeon progression
  const equipUpgrade = getNextEquipmentUpgrade(player);
  if (equipUpgrade) {
    if (currentLocation === 'armory') {
      actions.push({
        type: 'buy-equipment',
        priority: 55,
        description: `Buy ${equipUpgrade.itemId} for dungeon`,
        details: { itemId: equipUpgrade.itemId, cost: equipUpgrade.cost, slot: equipUpgrade.slot },
      });
    } else if (player.timeRemaining > moveCost('armory') + 2) {
      actions.push({
        type: 'move',
        location: 'armory',
        priority: 50,
        description: 'Travel to armory to buy equipment',
      });
    }
  }

  // Temper equipment at the Forge (prioritize if at forge and has untempered gear)
  const untemperedEquipment = ARMORY_ITEMS.filter(
    item => item.equipSlot && (player.durables[item.id] || 0) > 0 && !player.temperedItems.includes(item.id)
  );
  if (untemperedEquipment.length > 0) {
    const bestToTemper = untemperedEquipment[0]; // Temper first available
    const temperCost = Math.round(getTemperCost(bestToTemper) * priceModifier);
    const temperTime = TEMPER_TIME[bestToTemper.equipSlot!];
    if (player.gold >= temperCost && player.timeRemaining >= temperTime + 2) {
      if (currentLocation === 'forge') {
        actions.push({
          type: 'temper-equipment',
          priority: 52,
          description: `Temper ${bestToTemper.name} at Forge`,
          details: { itemId: bestToTemper.id, slot: bestToTemper.equipSlot, cost: temperCost },
        });
      } else if (player.timeRemaining > moveCost('forge') + temperTime) {
        actions.push({
          type: 'move',
          location: 'forge',
          priority: 48,
          description: 'Travel to forge to temper equipment',
        });
      }
    }
  }

  // Repair damaged equipment at the Forge (prioritize if durability < 50%)
  const damagedEquip = getEquipmentNeedingRepair(player);
  if (damagedEquip) {
    const item = getItem(damagedEquip.itemId);
    if (item) {
      const repairCost = getEquipmentRepairCost(item, damagedEquip.durability);
      if (player.gold >= repairCost && player.timeRemaining >= EQUIPMENT_REPAIR_TIME + 2) {
        // Higher priority if equipment is broken (durability 0)
        const priority = damagedEquip.durability <= 0 ? 58 : 53;
        if (currentLocation === 'forge') {
          actions.push({
            type: 'repair-equipment',
            priority,
            description: `Repair ${item.name} at Forge (${damagedEquip.durability}% durability)`,
            details: { itemId: damagedEquip.itemId, cost: repairCost },
          });
        } else if (player.timeRemaining > moveCost('forge') + EQUIPMENT_REPAIR_TIME) {
          actions.push({
            type: 'move',
            location: 'forge',
            priority: priority - 4,
            description: 'Travel to forge to repair equipment',
          });
        }
      }
    }
  }

  // B1: Take chain quest (strategic AI prefers chains for bonus gold)
  const bestChain = getBestChainQuest(player, settings);
  if (bestChain) {
    if (currentLocation === 'guild-hall') {
      actions.push({
        type: 'take-chain-quest',
        priority: 63, // slightly higher than regular quests
        description: `Take chain quest: ${bestChain}`,
        details: { chainId: bestChain },
      });
    } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 57,
        description: 'Travel to guild hall for chain quest',
      });
    }
  }

  // Take quest if at guild hall and have pass
  const bestQuest = getBestQuest(player, settings);
  if (bestQuest && !bestChain) { // prefer chain over regular quest
    if (currentLocation === 'guild-hall') {
      actions.push({
        type: 'take-quest',
        priority: 60,
        description: `Take quest: ${bestQuest}`,
        details: { questId: bestQuest },
      });
    } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 55,
        description: 'Travel to guild hall to take quest',
      });
    }
  }

  // B2: Take bounty (free, no Guild Pass required, lower priority than quests)
  const week = ctx.week ?? 1;
  const bestBounty = getBestBounty(player, week);
  if (bestBounty && !bestQuest && !bestChain) {
    if (currentLocation === 'guild-hall') {
      actions.push({
        type: 'take-bounty',
        priority: 45,
        description: `Take bounty: ${bestBounty}`,
        details: { bountyId: bestBounty },
      });
    } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 40,
        description: 'Travel to guild hall for bounty',
      });
    }
  }

  // Complete active quest (handles regular, chain, and bounty)
  if (player.activeQuest && currentLocation === 'guild-hall') {
    actions.push({
      type: 'complete-quest',
      priority: 70,
      description: 'Complete active quest',
    });
  } else if (player.activeQuest && player.timeRemaining > moveCost('guild-hall') + 2) {
    actions.push({
      type: 'move',
      location: 'guild-hall',
      priority: 65,
      description: 'Travel to guild hall to complete quest',
    });
  }

  // Explore dungeon (H9: respect attempts limit and health, cave gating)
  const dungeonAttemptsRemaining = 2 - (player.dungeonAttemptsThisTurn || 0);
  const hasCaveAccess = player.completedDegrees.length > 0;
  const dungeonFloor = hasCaveAccess && dungeonAttemptsRemaining > 0 && player.health > 20
    ? getBestDungeonFloor(player, settings) : null;
  if (dungeonFloor !== null) {
    if (currentLocation === 'cave') {
      actions.push({
        type: 'explore-dungeon',
        priority: 58 + (weakestGoal === 'wealth' ? 10 : 0) + festivalDungeonBonus,
        description: `Explore dungeon floor ${dungeonFloor}`,
        details: { floorId: dungeonFloor },
      });
    } else {
      // Use actual floor time cost instead of hardcoded 6
      const targetFloor = getFloor(dungeonFloor);
      const combatStats = calculateCombatStats(player.equippedWeapon, player.equippedArmor, player.equippedShield, player.temperedItems);
      const floorTime = targetFloor ? getFloorTimeCost(targetFloor, combatStats) : 6;
      if (player.timeRemaining > moveCost('cave') + floorTime) {
        actions.push({
          type: 'move',
          location: 'cave',
          priority: 53,
          description: 'Travel to cave for dungeon',
        });
      }
    }
  }

  return actions;
}
