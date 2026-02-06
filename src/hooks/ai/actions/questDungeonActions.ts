/**
 * Grimwald AI - Quest & Dungeon Actions
 *
 * Generates actions for guild pass purchase, equipment upgrades,
 * quest management, and dungeon exploration.
 */

import { getFloor, getFloorTimeCost } from '@/data/dungeon';
import { calculateCombatStats } from '@/data/items';
import type { AIAction } from '../types';
import {
  getBestDungeonFloor,
  getNextEquipmentUpgrade,
  shouldBuyGuildPass,
  getBestQuest,
} from '../strategy';
import type { ActionContext } from './actionContext';

/**
 * Generate quest and dungeon actions
 */
export function generateQuestDungeonActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, moveCost, weakestGoal } = ctx;

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

  // Take quest if at guild hall and have pass
  const bestQuest = getBestQuest(player, settings);
  if (bestQuest) {
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

  // Complete active quest
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
        priority: 58 + (weakestGoal === 'wealth' ? 10 : 0),
        description: `Explore dungeon floor ${dungeonFloor}`,
        details: { floorId: dungeonFloor },
      });
    } else {
      // Use actual floor time cost instead of hardcoded 6
      const targetFloor = getFloor(dungeonFloor);
      const combatStats = calculateCombatStats(player.equippedWeapon, player.equippedArmor, player.equippedShield);
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
