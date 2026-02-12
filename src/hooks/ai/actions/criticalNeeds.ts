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
  // H9 FIX: Apply priceModifier to food costs (AI was ignoring economy inflation/deflation)
  // Without Preservation Box, General Store food has 80% spoilage — prefer Tavern
  if (urgency.food > 0.5) {
    const pm = ctx.priceModifier;
    const hasBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
    const cheapestFoodCost = Math.round(6 * pm); // Shadow Market mystery meat base 6g
    if (player.gold >= cheapestFoodCost) {
      if (currentLocation === 'general-store' && hasBox && player.gold >= Math.round(15 * pm)) {
        // With Preservation Box: buy cheese at General Store (15g for 15 food, safe)
        actions.push({
          type: 'buy-food',
          priority: 100,
          description: 'Buy cheese at General Store (safe with Preservation Box)',
          details: { cost: Math.round(15 * pm), foodGain: 15 },
        });
      } else if (currentLocation === 'rusty-tankard') {
        actions.push({
          type: 'buy-food',
          priority: 100,
          description: 'Buy food at tavern (always safe)',
          details: { cost: Math.round(12 * pm), foodGain: 15 },
        });
      } else if (currentLocation === 'shadow-market') {
        actions.push({
          type: 'buy-food',
          priority: 98,
          description: 'Buy food at Shadow Market',
          details: { cost: Math.round(6 * pm), foodGain: 10 },
        });
      } else {
        // Navigate to food source — prefer Tavern without box, General Store with box
        const storeCost = moveCost('general-store');
        const tavernCost = moveCost('rusty-tankard');
        const marketCost = moveCost('shadow-market');
        if (!hasBox) {
          // Without Preservation Box: prefer Tavern (safe) or Shadow Market (cheap)
          if (tavernCost <= marketCost && player.timeRemaining > tavernCost + 2) {
            actions.push({
              type: 'move',
              location: 'rusty-tankard',
              priority: 95,
              description: 'Travel to tavern for safe food (no Preservation Box)',
            });
          } else if (player.timeRemaining > marketCost + 2) {
            actions.push({
              type: 'move',
              location: 'shadow-market',
              priority: 93,
              description: 'Travel to Shadow Market for cheap food',
            });
          }
        } else {
          // With Preservation Box: General Store is efficient
          if (storeCost <= tavernCost && player.timeRemaining > storeCost + 2) {
            actions.push({
              type: 'move',
              location: 'general-store',
              priority: 95,
              description: 'Travel to General Store for food',
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
  }

  // 2. RENT - Prevent eviction (huge penalty)
  // Landlord is only open during rent weeks (every 4th week) or when urgently behind (3+ weeks overdue)
  // Trigger at >= 0.5 (2 weeks overdue) instead of > 0.5 to give AI time to travel and pay
  const isRentWeek = (ctx.week + 1) % 4 === 0;
  const hasUrgentRent = player.weeksSinceRent >= 3;
  const isLandlordOpen = isRentWeek || hasUrgentRent;

  if (urgency.rent >= 0.5 && player.housing !== 'homeless' && isLandlordOpen) {
    const rentCost = player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing];
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
  // H11 FIX: Apply priceModifier to clothing costs (AI was ignoring economy)
  // H11 FIX: Buy higher-quality clothing if needed for current/target job (business tier = 75 threshold)
  {
    const pm = ctx.priceModifier;
    const needsBusinessClothing = player.clothingCondition < 75 && urgency.clothing > 0.3;
    const needsBasicClothing = urgency.clothing > 0.6;
    const clothingCost = needsBusinessClothing ? Math.round(55 * pm) : Math.round(25 * pm);
    const clothingGain = needsBusinessClothing ? 75 : 50;
    if ((needsBasicClothing || needsBusinessClothing) && player.gold >= clothingCost) {
      if (currentLocation === 'armory' || currentLocation === 'general-store') {
        actions.push({
          type: 'buy-clothing',
          priority: 75,
          description: needsBusinessClothing ? 'Buy business clothing for better jobs' : 'Buy clothing for work',
          details: { cost: clothingCost, clothingGain },
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
