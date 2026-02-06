// Guild Life - Stock Market System (Jones-style)
// Fantasy equivalents of stocks and T-Bills

export interface Stock {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  volatility: number; // 0-1, how much price can swing per week
  isTBill: boolean;   // T-Bills have fixed price, 3% sell fee
}

export const STOCKS: Stock[] = [
  {
    id: 'crystal-mine',
    name: 'Crystal Mine Ventures',
    description: 'Volatile mining operation. High risk, high reward.',
    basePrice: 100,
    volatility: 0.35,
    isTBill: false,
  },
  {
    id: 'potion-guild',
    name: 'Potion Consortium',
    description: 'Moderate risk potion manufacturing enterprise.',
    basePrice: 150,
    volatility: 0.20,
    isTBill: false,
  },
  {
    id: 'enchanting-corp',
    name: 'Enchanting Guild Corp',
    description: 'Stable enchanting business with steady returns.',
    basePrice: 200,
    volatility: 0.10,
    isTBill: false,
  },
  {
    id: 'crown-bonds',
    name: 'Crown Bonds',
    description: 'Royal treasury bonds. Fixed price, no crash risk. 3% fee to sell.',
    basePrice: 100,
    volatility: 0,
    isTBill: true,
  },
];

// Get initial stock prices
export function getInitialStockPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const stock of STOCKS) {
    prices[stock.id] = stock.basePrice;
  }
  return prices;
}

// Update stock prices for a new week (called in processWeekEnd)
export function updateStockPrices(
  currentPrices: Record<string, number>,
  isCrash: boolean = false,
): Record<string, number> {
  const newPrices: Record<string, number> = {};

  for (const stock of STOCKS) {
    if (stock.isTBill) {
      // T-Bills never change price
      newPrices[stock.id] = stock.basePrice;
      continue;
    }

    const currentPrice = currentPrices[stock.id] || stock.basePrice;

    if (isCrash) {
      // Market crash: stocks lose 30-60% of value
      const crashFactor = 0.4 + Math.random() * 0.3; // Keep 40-70%
      newPrices[stock.id] = Math.max(10, Math.round(currentPrice * crashFactor));
    } else {
      // Normal fluctuation: -volatility to +volatility+5% (slight upward bias)
      const change = (Math.random() * 2 - 0.95) * stock.volatility;
      const newPrice = Math.round(currentPrice * (1 + change));
      // Floor at 10g, cap at 5x base price
      newPrices[stock.id] = Math.max(10, Math.min(stock.basePrice * 5, newPrice));
    }
  }

  return newPrices;
}

// Calculate total stock portfolio value
export function calculateStockValue(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  let total = 0;
  for (const [stockId, shares] of Object.entries(stocks)) {
    const price = prices[stockId] || 0;
    total += shares * price;
  }
  return total;
}

// Calculate sell price (T-Bills have 3% fee)
export function getSellPrice(stockId: string, shares: number, currentPrice: number): number {
  const stock = STOCKS.find(s => s.id === stockId);
  if (!stock) return 0;

  const grossValue = shares * currentPrice;
  if (stock.isTBill) {
    return Math.floor(grossValue * 0.97); // 3% sell fee
  }
  return grossValue;
}

export function getStock(id: string): Stock | undefined {
  return STOCKS.find(s => s.id === id);
}
