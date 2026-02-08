import { getSellPrice } from '@/data/stocks';
import type { SetFn, GetFn } from '../../storeTypes';

export function createStockLoanActions(set: SetFn, get: GetFn) {
  return {
    // === Stock Market Actions ===

    buyStock: (playerId: string, stockId: string, shares: number) => {
      if (shares <= 0 || !Number.isFinite(shares)) return;
      const state = get();
      const price = state.stockPrices[stockId];
      if (price == null || price <= 0) return;
      const totalCost = price * shares;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.gold < totalCost) return p;
          const newStocks = { ...p.stocks };
          newStocks[stockId] = (newStocks[stockId] || 0) + shares;
          return {
            ...p,
            gold: p.gold - totalCost,
            stocks: newStocks,
          };
        }),
      }));
    },

    sellStock: (playerId: string, stockId: string, shares: number) => {
      if (shares <= 0 || !Number.isFinite(shares)) return;
      const state = get();
      const currentPrice = state.stockPrices[stockId] || 0;

      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          const ownedShares = p.stocks[stockId] || 0;
          const actualShares = Math.min(shares, ownedShares);
          if (actualShares <= 0) return p;

          const revenue = getSellPrice(stockId, actualShares, currentPrice);
          const newStocks = { ...p.stocks };
          newStocks[stockId] = ownedShares - actualShares;
          if (newStocks[stockId] <= 0) delete newStocks[stockId];

          return {
            ...p,
            gold: p.gold + revenue,
            stocks: newStocks,
          };
        }),
      }));
    },

    // === Loan Actions ===

    takeLoan: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount) || amount > 1000) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.loanAmount > 0) return p;
          return {
            ...p,
            gold: p.gold + amount,
            loanAmount: amount,
            loanWeeksRemaining: 8,
          };
        }),
      }));
    },

    repayLoan: (playerId: string, amount: number) => {
      if (amount <= 0 || !Number.isFinite(amount)) return;
      set((state) => ({
        players: state.players.map((p) => {
          if (p.id !== playerId) return p;
          if (p.loanAmount <= 0) return p;
          const actualPayment = Math.min(amount, p.loanAmount, p.gold);
          if (actualPayment <= 0) return p;
          return {
            ...p,
            gold: p.gold - actualPayment,
            loanAmount: p.loanAmount - actualPayment,
            loanWeeksRemaining: p.loanAmount - actualPayment <= 0 ? 0 : p.loanWeeksRemaining,
          };
        }),
      }));
    },
  };
}
