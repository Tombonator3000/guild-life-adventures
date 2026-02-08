/**
 * Grimwald AI - Economic Actions
 *
 * Generates actions for economic concerns: curing sickness, loans,
 * fresh food management, weekend tickets, item selling/pawning,
 * lottery tickets, and stock market.
 */

import type { AIAction } from '../types';
import type { ActionContext } from './actionContext';

/**
 * Generate economic actions (sickness, loans, fresh food, tickets, pawning, lottery, stocks)
 */
export function generateEconomicActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, week, currentLocation, moveCost, weakestGoal } = ctx;

  // ============================================
  // AI-2: CURE SICKNESS (high priority when sick)
  // ============================================
  if (player.isSick) {
    if (currentLocation === 'enchanter' && player.gold >= 75) {
      actions.push({
        type: 'cure-sickness',
        priority: 92,
        description: 'Cure sickness at enchanter',
        details: { cost: 75 },
      });
    } else if (player.gold >= 75 && player.timeRemaining > moveCost('enchanter') + 2) {
      actions.push({
        type: 'move',
        location: 'enchanter',
        priority: 88,
        description: 'Travel to enchanter to cure sickness',
      });
    }
  }

  // ============================================
  // AI-3: LOAN SYSTEM
  // ============================================
  // Take loan when critically broke (can't afford food or rent)
  if (player.loanAmount <= 0 && player.gold < 20 && player.savings < 20) {
    if (currentLocation === 'bank') {
      actions.push({
        type: 'take-loan',
        priority: 72,
        description: 'Take emergency loan from bank',
        details: { amount: 200 },
      });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({
        type: 'move',
        location: 'bank',
        priority: 68,
        description: 'Travel to bank for emergency loan',
      });
    }
  }

  // Repay loan when have enough gold (avoid compounding interest)
  // Reduced buffer from 100 to 50 — 10% weekly interest makes delays costly
  if (player.loanAmount > 0 && player.gold > player.loanAmount + 50) {
    if (currentLocation === 'bank') {
      actions.push({
        type: 'repay-loan',
        priority: 65,
        description: `Repay loan of ${player.loanAmount}g`,
        details: { amount: player.loanAmount },
      });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({
        type: 'move',
        location: 'bank',
        priority: 60,
        description: 'Travel to bank to repay loan',
      });
    }
  }

  // ============================================
  // AI-5: FRESH FOOD MANAGEMENT
  // ============================================
  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  if (hasPreservationBox && player.freshFood < 3 && player.gold >= 25) {
    if (currentLocation === 'general-store' || currentLocation === 'shadow-market') {
      actions.push({
        type: 'buy-fresh-food',
        priority: 55,
        description: 'Stock up on fresh food',
        details: { cost: 25, units: 2 },
      });
    }
  }

  // ============================================
  // AI-6: WEEKEND TICKET PURCHASES
  // ============================================
  if (player.tickets.length === 0 && player.gold > 150 && weakestGoal === 'happiness') {
    if (currentLocation === 'shadow-market') {
      const ticketOptions = [
        { type: 'bard-concert', cost: 40 },
        { type: 'theatre', cost: 30 },
        { type: 'jousting', cost: 25 },
      ];
      const affordable = ticketOptions.find(t => player.gold >= t.cost);
      if (affordable) {
        actions.push({
          type: 'buy-ticket',
          priority: 48,
          description: `Buy ${affordable.type} ticket`,
          details: { ticketType: affordable.type, cost: affordable.cost },
        });
      }
    }
  }

  // ============================================
  // AI-7: ITEM SELLING / PAWNING
  // ============================================
  // Pawn appliances when broke — priority 85 (above healing at 80)
  // AI can't heal if it can't afford 30g, so pawning must come first
  // Widened threshold: gold < 30 (was 10) — pawn before completely broke
  // Removed loanAmount requirement — pawn whenever gold is critically low
  if (player.gold < 30 && currentLocation === 'fence') {
    const pawnableAppliances = Object.entries(player.appliances)
      .filter(([, v]) => v && !v.isBroken)
      .map(([id]) => id);
    if (pawnableAppliances.length > 0) {
      const pawnValue = 50; // Flat estimate; the store calculates exact value
      actions.push({
        type: 'pawn-appliance',
        priority: 85,
        description: `Pawn ${pawnableAppliances[0]} for emergency gold`,
        details: { applianceId: pawnableAppliances[0], pawnValue },
      });
    }
  }

  // Move to fence for pawning when broke and not already there
  if (player.gold < 30 && currentLocation !== 'fence') {
    const hasPawnableAppliance = Object.values(player.appliances).some(v => v && !v.isBroken);
    if (hasPawnableAppliance && player.timeRemaining > moveCost('fence') + 2) {
      actions.push({
        type: 'move',
        location: 'fence',
        priority: 82,
        description: 'Travel to fence to pawn appliance for gold',
      });
    }
  }

  // Sell inventory items when broke
  if (player.gold < 20 && player.inventory.length > 0 && currentLocation === 'fence') {
    actions.push({
      type: 'sell-item',
      priority: 78,
      description: `Sell ${player.inventory[0]} at fence`,
      details: { itemId: player.inventory[0], price: 10 },
    });
  }

  // ============================================
  // AI-8: LOTTERY TICKETS
  // ============================================
  if (player.gold > 100 && player.lotteryTickets === 0 && week > 3) {
    if (currentLocation === 'shadow-market' || currentLocation === 'general-store') {
      actions.push({
        type: 'buy-lottery-ticket',
        priority: 25, // Low priority, nice-to-have
        description: 'Buy lottery ticket',
        details: { cost: 5 },
      });
    }
  }

  // ============================================
  // AI-4: STOCK MARKET (only for medium/hard AI)
  // ============================================
  if (settings.planningDepth >= 2 && player.gold > 300 && weakestGoal === 'wealth') {
    if (currentLocation === 'bank') {
      // Buy stocks with excess gold
      const stocksToBuy = player.gold > 500 ? 10 : 5;
      actions.push({
        type: 'buy-stock',
        priority: 40,
        description: 'Invest in stocks',
        details: { stockId: 'guild-shares', shares: stocksToBuy, price: 50 },
      });
    }
  }

  // Sell stocks if need gold or have enough profit
  const ownedStockCount = Object.values(player.stocks).reduce((a, b) => a + b, 0);
  if (ownedStockCount > 0 && (player.gold < 50 || weakestGoal !== 'wealth')) {
    if (currentLocation === 'bank') {
      const firstStock = Object.entries(player.stocks).find(([, v]) => v > 0);
      if (firstStock) {
        actions.push({
          type: 'sell-stock',
          priority: player.gold < 50 ? 70 : 35,
          description: `Sell ${firstStock[0]} stocks`,
          details: { stockId: firstStock[0], shares: firstStock[1] },
        });
      }
    }
  }

  return actions;
}
