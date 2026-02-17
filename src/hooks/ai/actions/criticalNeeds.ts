/**
 * Grimwald AI - Critical Needs Actions
 *
 * Generates actions for critical needs: food, rent, clothing, health.
 * These are always checked first with highest priorities.
 *
 * Refactored: Each need extracted into a focused function for clarity.
 */

import { RENT_COSTS } from '@/types/game.types';
import { CLOTHING_DEGRADATION_PER_WEEK } from '@/data/items';
import { getGameOption } from '@/data/gameOptions';
import type { AIAction } from '../types';
import type { ActionContext } from './actionContext';

// ─── Food actions ──────────────────────────────────────────────

function generateFoodActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, urgency, currentLocation, moveCost } = ctx;
  const pm = ctx.priceModifier;

  // HARD AI: Proactive food — buy when already at a food location and not fully stocked
  const isAtFoodLocation = currentLocation === 'general-store' || currentLocation === 'rusty-tankard' || currentLocation === 'shadow-market';
  if (ctx.settings.planningDepth >= 3 && isAtFoodLocation && player.foodLevel < 70 && urgency.food <= 0.5 && player.gold >= 15) {
    const hasBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
    if (currentLocation === 'rusty-tankard') {
      actions.push({
        type: 'buy-food',
        priority: 52,
        description: 'Stock up on food while at tavern (proactive)',
        details: { cost: Math.round(12 * pm), foodGain: 15 },
      });
    } else if (currentLocation === 'general-store' && hasBox) {
      actions.push({
        type: 'buy-food',
        priority: 50,
        description: 'Stock up on food while at store (proactive)',
        details: { cost: Math.round(15 * pm), foodGain: 15 },
      });
    } else if (currentLocation === 'shadow-market') {
      actions.push({
        type: 'buy-food',
        priority: 48,
        description: 'Grab cheap food while at market (proactive)',
        details: { cost: Math.round(6 * pm), foodGain: 10 },
      });
    }
  }

  // Urgent food — prevent starvation (-20 hours penalty)
  if (urgency.food > 0.5) {
    const hasBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
    const cheapestFoodCost = Math.round(6 * pm); // Shadow Market mystery meat base 6g
    if (player.gold >= cheapestFoodCost) {
      if (currentLocation === 'general-store' && hasBox && player.gold >= Math.round(15 * pm)) {
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

  return actions;
}

// ─── Rent actions ──────────────────────────────────────────────

function generateRentActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, urgency, currentLocation, moveCost } = ctx;

  const isRentWeek = (ctx.week + 1) % 4 === 0;
  const hasUrgentRent = player.weeksSinceRent >= 3;
  const isLandlordOpen = isRentWeek || hasUrgentRent;

  // Proactive rent prepayment — pay on rent week even if not urgently behind
  if (isRentWeek && player.housing !== 'homeless' && player.weeksSinceRent >= 1 && urgency.rent < 0.5) {
    const prepayRentCost = player.lockedRent > 0 ? player.lockedRent : RENT_COSTS[player.housing];
    if (player.gold >= prepayRentCost) {
      if (currentLocation === 'landlord') {
        actions.push({
          type: 'pay-rent',
          priority: 55,
          description: 'Prepay rent to stay ahead',
          details: { cost: prepayRentCost },
        });
      } else {
        const movementCost = moveCost('landlord');
        if (player.timeRemaining > movementCost + 2) {
          actions.push({
            type: 'move',
            location: 'landlord',
            priority: 50,
            description: 'Travel to landlord to prepay rent',
          });
        }
      }
    }
  }

  // Urgent rent — prevent eviction
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

  return actions;
}

// ─── Clothing actions ──────────────────────────────────────────

function generateClothingActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, urgency, currentLocation, moveCost } = ctx;
  const pm = ctx.priceModifier;

  // HARD AI: Proactive clothing when at a clothing store
  if (ctx.settings.planningDepth >= 3 && (currentLocation === 'armory' || currentLocation === 'general-store')) {
    const condition = player.clothingCondition;
    const degradeBuffer = CLOTHING_DEGRADATION_PER_WEEK * 2; // 2 weeks of degradation
    if (condition > 0 && condition < 40 + degradeBuffer && condition >= 15 && player.gold >= Math.round(60 * pm)) {
      actions.push({
        type: 'buy-clothing',
        priority: 48,
        description: 'Proactively upgrade clothing before degradation',
        details: { cost: Math.round(60 * pm), clothingGain: 60 },
      });
    }
  }

  // Determine needed clothing tier based on urgency
  const isNaked = player.clothingCondition <= 0;
  const condition = player.clothingCondition;

  let targetCondition = 0;
  let clothingCost = 0;
  let tierDesc = '';

  if (isNaked || urgency.clothing >= 0.8) {
    targetCondition = 35;
    clothingCost = Math.round(12 * pm);
    tierDesc = 'casual (emergency)';
  } else if (condition < 15 && urgency.clothing > 0.5) {
    targetCondition = 45;
    clothingCost = Math.round(25 * pm);
    tierDesc = 'casual';
  } else if (condition < 40 && urgency.clothing > 0.4) {
    targetCondition = 60;
    clothingCost = Math.round(60 * pm);
    tierDesc = 'dress';
    if (player.gold < clothingCost) {
      targetCondition = 45;
      clothingCost = Math.round(25 * pm);
      tierDesc = 'casual';
    }
  } else if (condition < 70 && urgency.clothing > 0.2) {
    targetCondition = 90;
    clothingCost = Math.round(175 * pm);
    tierDesc = 'business';
    if (player.gold < clothingCost) {
      targetCondition = 60;
      clothingCost = Math.round(60 * pm);
      tierDesc = 'dress';
    }
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

  return actions;
}

// ─── Health actions ────────────────────────────────────────────

function generateHealthActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost } = ctx;

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

// ─── Main entry point ──────────────────────────────────────────

/**
 * Generate actions for critical needs (food, rent, clothing, health).
 *
 * Each need is handled by a focused function. Results are combined
 * into a single action list for the priority-based action system.
 */
export function generateCriticalActions(ctx: ActionContext): AIAction[] {
  return [
    ...generateFoodActions(ctx),
    ...generateRentActions(ctx),
    ...generateClothingActions(ctx),
    ...generateHealthActions(ctx),
  ];
}
