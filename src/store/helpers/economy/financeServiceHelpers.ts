import { getSellPrice, getStock } from '@/data/stocks';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

export type BankTransferDirection = 'deposit' | 'withdraw';
export type InvestmentService = 'invest' | 'withdraw';
export type StockTradeSide = 'buy' | 'sell';
export type LoanService = 'borrow' | 'repay';

export const LOAN_PRODUCTS = [100, 250, 500, 1000] as const;
const MAX_TRANSFER_AMOUNT = 1_000_000;
const MAX_STOCK_SHARES = 1_000;

function validatePositiveInteger(value: number, maximum: number, label: string): ActionResult | null {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    return { success: false, message: `${label} must be a positive whole number no greater than ${maximum}.` };
  }
  return null;
}

function validateBankVisit(state: ReturnType<GetFn>, playerId: string) {
  const player = state.players.find(candidate => candidate.id === playerId);
  if (!player) return { error: { success: false, message: 'Player not found.' } as ActionResult };
  if (player.currentLocation !== 'bank') {
    return { error: { success: false, message: 'Visit the Bank before using financial services.' } as ActionResult };
  }
  return { player };
}

export function createFinanceServiceActions(set: SetFn, get: GetFn) {
  return {
    transferBankFunds: (
      playerId: string,
      direction: BankTransferDirection,
      amount: number,
    ): ActionResult | void => {
      const amountError = validatePositiveInteger(amount, MAX_TRANSFER_AMOUNT, 'Transfer amount');
      if (amountError) return amountError;
      const state = get();
      const visit = validateBankVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;

      if (direction === 'deposit') {
        if (player.gold < amount) return { success: false, message: `You only have ${player.gold}g in cash.` };
        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId
            ? { ...candidate, gold: candidate.gold - amount, savings: candidate.savings + amount }
            : candidate),
        }));
        return { success: true, message: `Deposited ${amount}g.` };
      }

      if (direction === 'withdraw') {
        if (player.savings < amount) return { success: false, message: `You only have ${player.savings}g in savings.` };
        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId
            ? { ...candidate, gold: candidate.gold + amount, savings: candidate.savings - amount }
            : candidate),
        }));
        return { success: true, message: `Withdrew ${amount}g.` };
      }

      return { success: false, message: 'Unknown bank transfer.' };
    },

    manageInvestment: (
      playerId: string,
      service: InvestmentService,
      amount: number,
    ): ActionResult | void => {
      const amountError = validatePositiveInteger(amount, MAX_TRANSFER_AMOUNT, 'Investment amount');
      if (amountError) return amountError;
      const state = get();
      const visit = validateBankVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;

      if (service === 'invest') {
        if (player.gold < amount) return { success: false, message: `You only have ${player.gold}g available to invest.` };
        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId
            ? { ...candidate, gold: candidate.gold - amount, investments: candidate.investments + amount }
            : candidate),
        }));
        return { success: true, message: `Invested ${amount}g.` };
      }

      if (service === 'withdraw') {
        if (player.investments < amount) return { success: false, message: `You only have ${player.investments}g invested.` };
        const penalty = Math.floor(amount * 0.10);
        const proceeds = amount - penalty;
        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId
            ? { ...candidate, gold: candidate.gold + proceeds, investments: candidate.investments - amount }
            : candidate),
        }));
        return { success: true, message: `Withdrew ${amount}g from investments (${penalty}g early-withdrawal penalty).` };
      }

      return { success: false, message: 'Unknown investment service.' };
    },

    tradeStock: (
      playerId: string,
      side: StockTradeSide,
      stockId: string,
      shares: number,
    ): ActionResult | void => {
      const shareError = validatePositiveInteger(shares, MAX_STOCK_SHARES, 'Share count');
      if (shareError) return shareError;
      const state = get();
      const visit = validateBankVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;
      const stock = getStock(stockId);
      if (!stock) return { success: false, message: 'Unknown stock.' };
      const currentPrice = state.stockPrices[stockId];
      if (!Number.isSafeInteger(currentPrice) || currentPrice <= 0) {
        return { success: false, message: 'The current stock price is unavailable.' };
      }

      if (side === 'buy') {
        const totalCost = currentPrice * shares;
        if (!Number.isSafeInteger(totalCost) || player.gold < totalCost) {
          return { success: false, message: `You need ${totalCost}g to buy ${shares} share${shares === 1 ? '' : 's'}.` };
        }
        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId ? {
            ...candidate,
            gold: candidate.gold - totalCost,
            stocks: {
              ...candidate.stocks,
              [stockId]: (candidate.stocks[stockId] ?? 0) + shares,
            },
          } : candidate),
        }));
        return { success: true, message: `Bought ${shares} ${stock.name} share${shares === 1 ? '' : 's'} for ${totalCost}g.` };
      }

      if (side === 'sell') {
        const owned = player.stocks[stockId] ?? 0;
        if (owned < shares) return { success: false, message: `You only own ${owned} share${owned === 1 ? '' : 's'}.` };
        const proceeds = getSellPrice(stockId, shares, currentPrice);
        set(current => ({
          players: current.players.map(candidate => {
            if (candidate.id !== playerId) return candidate;
            const stocks = { ...candidate.stocks };
            const remaining = (stocks[stockId] ?? 0) - shares;
            if (remaining > 0) stocks[stockId] = remaining;
            else delete stocks[stockId];
            return { ...candidate, gold: candidate.gold + proceeds, stocks };
          }),
        }));
        return { success: true, message: `Sold ${shares} ${stock.name} share${shares === 1 ? '' : 's'} for ${proceeds}g.` };
      }

      return { success: false, message: 'Unknown stock trade.' };
    },

    manageLoan: (
      playerId: string,
      service: LoanService,
      amount: number | 'all',
    ): ActionResult | void => {
      const state = get();
      const visit = validateBankVisit(state, playerId);
      if ('error' in visit) return visit.error;
      const { player } = visit;

      if (service === 'borrow') {
        if (amount === 'all' || !LOAN_PRODUCTS.includes(amount as typeof LOAN_PRODUCTS[number])) {
          return { success: false, message: 'Choose one of the Bank loan products: 100g, 250g, 500g or 1000g.' };
        }
        if ((player.totalShiftsWorked ?? 0) < LOAN_MIN_SHIFTS_REQUIRED) {
          return { success: false, message: `Work at least ${LOAN_MIN_SHIFTS_REQUIRED} shifts before applying for a loan.` };
        }
        if (player.loanAmount > 0) return { success: false, message: 'Repay your current loan before borrowing again.' };

        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId ? {
            ...candidate,
            gold: candidate.gold + amount,
            loanAmount: amount,
            loanWeeksRemaining: 8,
          } : candidate),
        }));
        return { success: true, message: `Loan approved for ${amount}g.` };
      }

      if (service === 'repay') {
        if (player.loanAmount <= 0) return { success: false, message: 'You have no outstanding loan.' };
        const payment = amount === 'all' ? player.loanAmount : amount;
        const amountError = validatePositiveInteger(payment, MAX_TRANSFER_AMOUNT, 'Repayment amount');
        if (amountError) return amountError;
        if (payment > player.loanAmount) return { success: false, message: `Your remaining debt is only ${player.loanAmount}g.` };
        if (payment > player.gold) return { success: false, message: `You only have ${player.gold}g available.` };

        set(current => ({
          players: current.players.map(candidate => candidate.id === playerId ? {
            ...candidate,
            gold: candidate.gold - payment,
            loanAmount: candidate.loanAmount - payment,
            loanWeeksRemaining: candidate.loanAmount - payment <= 0 ? 0 : candidate.loanWeeksRemaining,
          } : candidate),
        }));
        return { success: true, message: `Repaid ${payment}g of your loan.` };
      }

      return { success: false, message: 'Unknown loan service.' };
    },
  };
}
