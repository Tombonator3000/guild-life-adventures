/**
 * Grimwald AI - Critical Needs Actions
 *
 * Generates actions for critical needs: food, rent, clothing, health.
 * These are always checked first with highest priorities.
 */

import { RENT_COSTS } from '@/types/game.types';
import { getGameOption } from '@/data/gameOptions';
import type { AIAction } from '../types';
import type { ActionContext } from './actionContext';

/**
 * Generate actions for critical needs (food, rent, clothing, health)
 */
export function generateCriticalActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, urgency, currentLocation, moveCost } = ctx;

  // ============================================
  // CRITICAL NEEDS (Always check first)
  // ============================================

  // 1. FOOD - Prevent starvation (-20 hours penalty is devastating)
  if (urgency.food > 0.5) {
    const foodCost = 6; // Cheapest food option (Shadow Market mystery meat)
    if (player.gold >= foodCost) {
      if (currentLocation === 'rusty-tankard') {
        actions.push({
          type: 'buy-food',
          priority: 100, // Highest priority
          description: 'Buy food to prevent starvation',
          details: { cost: 12, foodGain: 15 },
        });
      } else if (currentLocation === 'shadow-market') {
        // Shadow Market has cheap food too
        actions.push({
          type: 'buy-food',
          priority: 98,
          description: 'Buy food at Shadow Market',
          details: { cost: 6, foodGain: 10 },
        });
      } else {
        // Go to whichever food source is closer
        const tavernCost = moveCost('rusty-tankard');
        const marketCost = moveCost('shadow-market');
        if (marketCost < tavernCost && player.timeRemaining > marketCost + 2) {
          actions.push({
            type: 'move',
            location: 'shadow-market',
            priority: 93,
            description: 'Travel to Shadow Market for cheap food',
          });
        } else if (player.timeRemaining > tavernCost + 2) {
          actions.push({
            type: 'move',
            location: 'rusty-tankard',
            priority: 95,
            description: 'Travel to tavern for food',
          });
        }
      }
    }
  }

  // 2. RENT - Prevent eviction (huge penalty)
  // Trigger at >= 0.5 (2 weeks overdue) instead of > 0.5 to give AI time to travel and pay
  if (urgency.rent >= 0.5 && player.housing !== 'homeless') {
    const rentCost = RENT_COSTS[player.housing];
    if (player.gold >= rentCost) {
      if (currentLocation === 'landlord') {
        actions.push({
          type: 'pay-rent',
          priority: 90,
          description: 'Pay rent to avoid eviction',
          details: { cost: rentCost },
        });
      } else {
        const movementCost = moveCost('landlord');
        if (player.timeRemaining > movementCost + 2) {
          actions.push({
            type: 'move',
            location: 'landlord',
            priority: 85,
            description: 'Travel to landlord to pay rent',
          });
        }
      }
    }
  }

  // 3. CLOTHING - Needed for jobs
  if (urgency.clothing > 0.6 && player.gold >= 30) {
    if (currentLocation === 'armory' || currentLocation === 'general-store') {
      actions.push({
        type: 'buy-clothing',
        priority: 75,
        description: 'Buy clothing for work',
        details: { cost: 30, type: 'casual' },
      });
    } else {
      const movementCost = Math.min(moveCost('armory'), moveCost('general-store'));
      if (player.timeRemaining > movementCost + 2) {
        actions.push({
          type: 'move',
          location: moveCost('armory') < moveCost('general-store') ? 'armory' : 'general-store',
          priority: 70,
          description: 'Travel to buy clothing',
        });
      }
    }
  }

  // 4. HEALTH - Visit healer if health is low
  // Older players (40+, if aging enabled) are more cautious about health
  // Cap threshold to maxHealth to prevent infinite healing loop at elder ages
  const agingOn = getGameOption('enableAging');
  const rawAgeThreshold = (agingOn && (player.age ?? 18) >= 40) ? 65 : 50;
  const ageHealthThreshold = Math.min(rawAgeThreshold, Math.floor(player.maxHealth * 0.8));
  if (player.health < ageHealthThreshold && player.gold >= 30) {
    if (currentLocation === 'enchanter') {
      actions.push({
        type: 'heal',
        priority: 80,
        description: 'Visit healer to recover health',
        details: { cost: 30, healAmount: 25 },
      });
    } else {
      const moveToHealer = moveCost('enchanter');
      if (player.timeRemaining > moveToHealer + 2) {
        actions.push({
          type: 'move',
          location: 'enchanter',
          priority: 75,
          description: 'Travel to healer for health recovery',
        });
      }
    }
  }

  return actions;
}
