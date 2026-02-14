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
  // Without Preservation Box, General Store food may spoil at turn end — prefer Tavern
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

  // 3. CLOTHING - Jones-style 3-tier system (casual/dress/business)
  // Thresholds: casual=15, dress=40, business=70
  // AI buys the appropriate tier based on career needs
  {
    const pm = ctx.priceModifier;
    const isNaked = player.clothingCondition <= 0;
    const condition = player.clothingCondition;

    // Determine what tier the AI needs based on its current/target job
    // Business tier for high-level jobs, dress for mid, casual for entry
    let targetCondition = 0;
    let clothingCost = 0;
    let tierDesc = '';

    if (isNaked || urgency.clothing >= 0.8) {
      // Emergency: buy cheapest clothes (Peasant Garb = 12g → condition 35)
      targetCondition = 35;
      clothingCost = Math.round(12 * pm);
      tierDesc = 'casual (emergency)';
    } else if (condition < 15 && urgency.clothing > 0.5) {
      // Basic casual (Common Tunic = 25g → condition 45)
      targetCondition = 45;
      clothingCost = Math.round(25 * pm);
      tierDesc = 'casual';
    } else if (condition < 40 && urgency.clothing > 0.4) {
      // Dress tier needed for mid jobs (Fine Clothes = 60g → condition 60)
      targetCondition = 60;
      clothingCost = Math.round(60 * pm);
      tierDesc = 'dress';
      if (player.gold < clothingCost) {
        targetCondition = 45;
        clothingCost = Math.round(25 * pm);
        tierDesc = 'casual';
      }
    } else if (condition < 70 && urgency.clothing > 0.2) {
      // Business tier needed for top jobs (Noble Attire = 175g → condition 90)
      targetCondition = 90;
      clothingCost = Math.round(175 * pm);
      tierDesc = 'business';
      // Fallback to dress if can't afford business
      if (player.gold < clothingCost) {
        targetCondition = 60;
        clothingCost = Math.round(60 * pm);
        tierDesc = 'dress';
      }
      // Fallback to casual if can't afford dress
      if (player.gold < clothingCost) {
        targetCondition = 45;
        clothingCost = Math.round(25 * pm);
        tierDesc = 'casual';
      }
    }

    const needsClothing = targetCondition > condition && clothingCost > 0;
    const clothingPriority = isNaked ? 95 : 75;

    if (needsClothing && player.gold >= clothingCost) {
      if (currentLocation === 'armory' || currentLocation === 'general-store') {
        actions.push({
          type: 'buy-clothing',
          priority: clothingPriority,
          description: isNaked ? 'Buy clothing urgently (cannot work naked)' : `Buy ${tierDesc} clothing for work`,
          details: { cost: clothingCost, clothingGain: targetCondition },
        });
      } else {
        const movementCost = Math.min(moveCost('armory'), moveCost('general-store'));
        if (player.timeRemaining > movementCost + 2) {
          actions.push({
            type: 'move',
            location: moveCost('armory') < moveCost('general-store') ? 'armory' : 'general-store',
            priority: isNaked ? 90 : 70,
            description: isNaked ? 'Travel urgently to buy clothing' : `Travel to buy ${tierDesc} clothing`,
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
