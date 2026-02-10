/**
 * Grimwald AI - Economic Actions
 *
 * Generates actions for economic concerns: curing sickness, loans,
 * fresh food management, weekend tickets, item selling/pawning,
 * lottery tickets, and stock market.
 */

import { useGameStore } from '@/store/gameStore';
import { STOCKS, getSellPrice } from '@/data/stocks';
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
  // AI-4: STOCK MARKET (uses actual prices from game state)
  // ============================================
  const stockPrices = useGameStore.getState().stockPrices || {};
  const personalityGambling = ctx.personality.weights.gambling;

  if (settings.planningDepth >= 2 && player.gold > 300 && weakestGoal === 'wealth') {
    if (currentLocation === 'bank') {
      // Smart stock picking: evaluate each stock using actual prices
      // Strategic AI (hard) prefers undervalued stocks; medium prefers safe T-Bills
      let bestStock: { id: string; shares: number; price: number } | null = null;

      for (const stock of STOCKS) {
        const currentPrice = stockPrices[stock.id] ?? stock.basePrice;
        if (currentPrice <= 0) continue;

        const maxShares = Math.floor((player.gold - 200) / currentPrice); // Keep 200g buffer
        if (maxShares < 1) continue;

        if (settings.planningDepth >= 3) {
          // Hard AI: buy undervalued stocks (current < base) for potential gains
          if (!stock.isTBill && currentPrice < stock.basePrice * 0.85) {
            const sharesToBuy = Math.min(maxShares, 10);
            bestStock = { id: stock.id, shares: sharesToBuy, price: currentPrice };
            break; // Buy the first undervalued stock
          }
        }

        // Medium/Hard AI: T-Bills for safe wealth storage (robbery-proof)
        if (stock.isTBill && !bestStock) {
          const sharesToBuy = Math.min(maxShares, personalityGambling > 1.0 ? 3 : 5);
          bestStock = { id: stock.id, shares: sharesToBuy, price: currentPrice };
        }
      }

      // Fallback: if personality is a gambler and no T-Bill, pick cheapest regular stock
      if (!bestStock && personalityGambling >= 1.2) {
        const cheapest = STOCKS
          .filter(s => !s.isTBill && (stockPrices[s.id] ?? s.basePrice) > 0)
          .sort((a, b) => (stockPrices[a.id] ?? a.basePrice) - (stockPrices[b.id] ?? b.basePrice))[0];
        if (cheapest) {
          const price = stockPrices[cheapest.id] ?? cheapest.basePrice;
          const shares = Math.min(Math.floor((player.gold - 200) / price), 5);
          if (shares > 0) {
            bestStock = { id: cheapest.id, shares, price };
          }
        }
      }

      if (bestStock) {
        actions.push({
          type: 'buy-stock',
          priority: 40,
          description: `Invest in ${bestStock.id} (${bestStock.shares} shares @ ${bestStock.price}g)`,
          details: { stockId: bestStock.id, shares: bestStock.shares, price: bestStock.price },
        });
      }
    }
  }

  // Sell stocks: when need gold, when stock is overvalued, or when not focused on wealth
  const ownedStockCount = Object.values(player.stocks).reduce((a, b) => a + b, 0);
  if (ownedStockCount > 0 && currentLocation === 'bank') {
    for (const [stockId, shares] of Object.entries(player.stocks)) {
      if (shares <= 0) continue;
      const stock = STOCKS.find(s => s.id === stockId);
      if (!stock) continue;

      const currentPrice = stockPrices[stockId] ?? stock.basePrice;
      const sellProceeds = getSellPrice(stockId, shares, currentPrice);

      // Sell reasons: broke (emergency), stock overvalued (profit-taking), or not wealth-focused
      const isBroke = player.gold < 50;
      const isOvervalued = !stock.isTBill && currentPrice > stock.basePrice * 1.5;
      const notWealthFocused = weakestGoal !== 'wealth';

      if (isBroke || isOvervalued || notWealthFocused) {
        const sellShares = isBroke ? shares : (isOvervalued ? Math.ceil(shares / 2) : shares);
        actions.push({
          type: 'sell-stock',
          priority: isBroke ? 70 : (isOvervalued ? 45 : 35),
          description: `Sell ${sellShares} ${stockId} shares (${sellProceeds}g)`,
          details: { stockId, shares: sellShares },
        });
        break; // Only sell one stock type per action cycle
      }
    }
  }

  return actions;
}
