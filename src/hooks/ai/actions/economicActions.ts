/**
 * Grimwald AI - Economic Actions
 *
 * Generates actions for economic concerns: curing sickness, loans,
 * fresh food management, weekend tickets, item selling/pawning,
 * lottery tickets, and stock market.
 */

import { useGameStore } from '@/store/gameStore';
import { STOCKS, getSellPrice } from '@/data/stocks';
import type { Player } from '@/types/game.types';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import type { AIAction, DifficultySettings } from '../types';
import type { ActionContext } from './actionContext';

// ─── Sub-generators ────────────────────────────────────────────────────

/** AI-2: Cure sickness at enchanter (high priority when sick) */
function generateSicknessActions(ctx: ActionContext): AIAction[] {
  const { player, currentLocation, moveCost } = ctx;
  if (!player.isSick) return [];

  if (currentLocation === 'enchanter' && player.gold >= 75) {
    return [{
      type: 'cure-sickness',
      priority: 92,
      description: 'Cure sickness at enchanter',
      details: { cost: 75 },
    }];
  }
  if (player.gold >= 75 && player.timeRemaining > moveCost('enchanter') + 2) {
    return [{
      type: 'move',
      location: 'enchanter',
      priority: 88,
      description: 'Travel to enchanter to cure sickness',
    }];
  }
  return [];
}

/** AI-3: Loan system — take, repay full, or repay partial */
function generateLoanActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost } = ctx;

  // Take loan when critically broke (can't afford food or rent)
  if (player.loanAmount <= 0 && player.gold < 20 && player.savings < 20 && (player.totalShiftsWorked || 0) >= LOAN_MIN_SHIFTS_REQUIRED) {
    if (currentLocation === 'bank') {
      actions.push({ type: 'take-loan', priority: 72, description: 'Take emergency loan from bank', details: { amount: 200 } });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({ type: 'move', location: 'bank', priority: 68, description: 'Travel to bank for emergency loan' });
    }
  }

  // Repay loan when have enough gold (avoid compounding interest)
  // When in default (loanWeeksRemaining <= 0), priority is much higher due to 25% wage garnishment
  if (player.loanAmount > 0 && player.gold > player.loanAmount + 50) {
    const isInDefault = player.loanWeeksRemaining <= 0;
    const repayPriority = isInDefault ? 80 : 65;
    const travelPriority = isInDefault ? 75 : 60;
    const urgencyNote = isInDefault ? ' (URGENT: wages garnished)' : '';
    if (currentLocation === 'bank') {
      actions.push({ type: 'repay-loan', priority: repayPriority, description: `Repay loan of ${player.loanAmount}g${urgencyNote}`, details: { amount: player.loanAmount } });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({ type: 'move', location: 'bank', priority: travelPriority, description: `Travel to bank to repay loan${isInDefault ? ' (wages being garnished!)' : ''}` });
    }
  }

  // Partial loan repayment when in default but can't cover full amount
  if (player.loanAmount > 0 && player.loanWeeksRemaining <= 0 && player.gold >= 50 && player.gold < player.loanAmount + 50) {
    const partialAmount = Math.floor(player.gold * 0.5);
    if (partialAmount >= 50) {
      if (currentLocation === 'bank') {
        actions.push({ type: 'repay-loan', priority: 70, description: `Partial loan repayment of ${partialAmount}g to reduce garnishment`, details: { amount: partialAmount } });
      } else if (player.timeRemaining > moveCost('bank') + 2) {
        actions.push({ type: 'move', location: 'bank', priority: 65, description: 'Travel to bank for partial loan repayment' });
      }
    }
  }

  return actions;
}

/** AI-7: Emergency pawning and item selling when broke */
function generatePawningActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, currentLocation, moveCost } = ctx;

  // Pawn appliances when broke — priority 85 (above healing at 80)
  // M18 FIX: Raised threshold from 30g to 75g — pawn before can't afford rent/food
  if (player.gold < 75 && currentLocation === 'fence') {
    const pawnableAppliances = Object.entries(player.appliances)
      .filter(([, v]) => v && !v.isBroken)
      .map(([id]) => id);
    if (pawnableAppliances.length > 0) {
      actions.push({
        type: 'pawn-appliance',
        priority: 85,
        description: `Pawn ${pawnableAppliances[0]} for emergency gold`,
        details: { applianceId: pawnableAppliances[0], pawnValue: 50 },
      });
    }
  }

  // Move to fence for pawning when broke and not already there
  if (player.gold < 75 && currentLocation !== 'fence') {
    const hasPawnableAppliance = Object.values(player.appliances).some(v => v && !v.isBroken);
    if (hasPawnableAppliance && player.timeRemaining > moveCost('fence') + 2) {
      actions.push({ type: 'move', location: 'fence', priority: 82, description: 'Travel to fence to pawn appliance for gold' });
    }
  }

  // Sell inventory items when broke
  if (player.gold < 20 && player.inventory.length > 0 && currentLocation === 'fence') {
    actions.push({ type: 'sell-item', priority: 78, description: `Sell ${player.inventory[0]} at fence`, details: { itemId: player.inventory[0], price: 10 } });
  }

  return actions;
}

/** AI-4: Stock market buying and selling (uses actual prices from game state) */
function generateStockActions(ctx: ActionContext): AIAction[] {
  const actions: AIAction[] = [];
  const { player, settings, currentLocation, weakestGoal } = ctx;
  const stockPrices = useGameStore.getState().stockPrices || {};
  const personalityGambling = ctx.personality.weights.gambling;

  // Buy stocks: strategic AI with gold buffer, focused on wealth
  if (settings.planningDepth >= 2 && player.gold > 300 && weakestGoal === 'wealth' && currentLocation === 'bank') {
    const bestStock = pickBestStockToBuy(player, settings, stockPrices, personalityGambling);
    if (bestStock) {
      actions.push({
        type: 'buy-stock',
        priority: 40,
        description: `Invest in ${bestStock.id} (${bestStock.shares} shares @ ${bestStock.price}g)`,
        details: { stockId: bestStock.id, shares: bestStock.shares, price: bestStock.price },
      });
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

/** Smart stock picking: hard AI prefers undervalued, medium prefers T-Bills, gamblers take cheap stocks */
function pickBestStockToBuy(
  player: Player,
  settings: DifficultySettings,
  stockPrices: Record<string, number>,
  personalityGambling: number,
): { id: string; shares: number; price: number } | null {
  let bestStock: { id: string; shares: number; price: number } | null = null;

  for (const stock of STOCKS) {
    const currentPrice = stockPrices[stock.id] ?? stock.basePrice;
    if (currentPrice <= 0) continue;
    const maxShares = Math.floor((player.gold - 200) / currentPrice);
    if (maxShares < 1) continue;

    // Hard AI: buy undervalued stocks (current < base) for potential gains
    if (settings.planningDepth >= 3 && !stock.isTBill && currentPrice < stock.basePrice * 0.85) {
      return { id: stock.id, shares: Math.min(maxShares, 10), price: currentPrice };
    }

    // Medium/Hard AI: T-Bills for safe wealth storage (robbery-proof)
    if (stock.isTBill && !bestStock) {
      bestStock = { id: stock.id, shares: Math.min(maxShares, personalityGambling > 1.0 ? 3 : 5), price: currentPrice };
    }
  }

  // Fallback: gambler personality picks cheapest regular stock
  if (!bestStock && personalityGambling >= 1.2) {
    const cheapest = STOCKS
      .filter(s => !s.isTBill && (stockPrices[s.id] ?? s.basePrice) > 0)
      .sort((a, b) => (stockPrices[a.id] ?? a.basePrice) - (stockPrices[b.id] ?? b.basePrice))[0];
    if (cheapest) {
      const price = stockPrices[cheapest.id] ?? cheapest.basePrice;
      const shares = Math.min(Math.floor((player.gold - 200) / price), 5);
      if (shares > 0) return { id: cheapest.id, shares, price };
    }
  }

  return bestStock;
}

// ─── Main generator ────────────────────────────────────────────────────

/**
 * Generate economic actions (sickness, loans, fresh food, tickets, pawning, lottery, stocks).
 * Each subsystem is handled by a focused sub-generator for readability.
 */
export function generateEconomicActions(ctx: ActionContext): AIAction[] {
  const { player, week, currentLocation, weakestGoal } = ctx;
  const actions: AIAction[] = [
    ...generateSicknessActions(ctx),
    ...generateLoanActions(ctx),
    ...generatePawningActions(ctx),
    ...generateStockActions(ctx),
  ];

  // AI-5: Fresh food management
  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  if (hasPreservationBox && player.freshFood < 3 && player.gold >= 25) {
    if (currentLocation === 'general-store' || currentLocation === 'shadow-market') {
      actions.push({ type: 'buy-fresh-food', priority: 55, description: 'Stock up on fresh food', details: { cost: 25, units: 2 } });
    }
  }

  // AI-6: Weekend ticket purchases
  if (player.tickets.length === 0 && player.gold > 150 && weakestGoal === 'happiness') {
    if (currentLocation === 'shadow-market') {
      const ticketOptions = [
        { type: 'bard-concert', cost: 40 },
        { type: 'theatre', cost: 30 },
        { type: 'jousting', cost: 25 },
      ];
      const affordable = ticketOptions.find(t => player.gold >= t.cost);
      if (affordable) {
        actions.push({ type: 'buy-ticket', priority: 48, description: `Buy ${affordable.type} ticket`, details: { ticketType: affordable.type, cost: affordable.cost } });
      }
    }
  }

  // AI-8: Lottery tickets
  if (player.gold > 100 && player.lotteryTickets === 0 && week > 3) {
    if (currentLocation === 'shadow-market' || currentLocation === 'general-store') {
      actions.push({ type: 'buy-lottery-ticket', priority: 25, description: 'Buy lottery ticket', details: { cost: 5 } });
    }
  }

  return actions;
}
