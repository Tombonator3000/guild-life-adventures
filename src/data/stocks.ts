// Guild Life - Stock Market System (Jones-style)
// Fantasy equivalents of stocks and T-Bills
// Features: dividends, economy-linked price trends, crash severity tiers, price history

export interface Stock {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  volatility: number; // 0-1, how much price can swing per week
  dividendRate: number; // Weekly dividend rate (e.g. 0.005 = 0.5% per week paid on share value)
  isTBill: boolean;   // T-Bills have fixed price, 3% sell fee
}

export const STOCKS: Stock[] = [
  {
    id: 'crystal-mine',
    name: 'Crystal Mine Ventures',
    description: 'Volatile mining operation. High risk, high reward. Low dividend.',
    basePrice: 100,
    volatility: 0.35,
    dividendRate: 0.002, // 0.2% weekly (growth stock — value comes from price swings)
    isTBill: false,
  },
  {
    id: 'potion-guild',
    name: 'Potion Consortium',
    description: 'Moderate risk potion manufacturing. Balanced dividend.',
    basePrice: 150,
    volatility: 0.20,
    dividendRate: 0.005, // 0.5% weekly (balanced)
    isTBill: false,
  },
  {
    id: 'enchanting-corp',
    name: 'Enchanting Guild Corp',
    description: 'Stable enchanting business. Reliable dividends.',
    basePrice: 200,
    volatility: 0.10,
    dividendRate: 0.008, // 0.8% weekly (income stock)
    isTBill: false,
  },
  {
    id: 'crown-bonds',
    name: 'Crown Bonds',
    description: 'Royal treasury bonds. Fixed price, 1% weekly yield. 3% fee to sell.',
    basePrice: 100,
    volatility: 0,
    dividendRate: 0.01, // 1% weekly (safe yield)
    isTBill: true,
  },
];

// Max weeks of price history to retain per stock
export const MAX_PRICE_HISTORY = 8;

// Get initial stock prices
export function getInitialStockPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const stock of STOCKS) {
    prices[stock.id] = stock.basePrice;
  }
  return prices;
}

// Get initial empty price history
export function getInitialPriceHistory(): Record<string, number[]> {
  const history: Record<string, number[]> = {};
  for (const stock of STOCKS) {
    history[stock.id] = [stock.basePrice];
  }
  return history;
}

// Update stock prices for a new week (called in processWeekEnd)
// economyTrend: -1 (recession), 0 (stable), 1 (boom) — influences price direction
export function updateStockPrices(
  currentPrices: Record<string, number>,
  isCrash: boolean = false,
  economyTrend: number = 0,
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
      // Market crash severity tiers (based on how deep into recession)
      const severity = Math.random();
      let crashFactor: number;
      if (severity < 0.5) {
        // Minor crash (50% chance): lose 15-25%
        crashFactor = 0.75 + Math.random() * 0.10;
      } else if (severity < 0.85) {
        // Moderate crash (35% chance): lose 30-50%
        crashFactor = 0.50 + Math.random() * 0.20;
      } else {
        // Major crash (15% chance): lose 50-70%
        crashFactor = 0.30 + Math.random() * 0.20;
      }
      // Stable stocks lose less (multiply crash factor toward 1.0 by stability)
      const stability = 1 - stock.volatility; // 0.65 for crystal mine, 0.90 for enchanting
      crashFactor = crashFactor + (1 - crashFactor) * stability * 0.3;
      newPrices[stock.id] = Math.max(10, Math.round(currentPrice * crashFactor));
    } else {
      // Symmetric random walk: -volatility to +volatility
      const randomChange = (Math.random() - 0.5) * 2 * stock.volatility;
      // Economy trend bias: boom adds +3%, recession adds -3%
      const trendBias = economyTrend * 0.03;
      // Mean reversion: gentle pull toward base price (prevents runaway prices)
      const deviation = (currentPrice - stock.basePrice) / stock.basePrice;
      const meanReversion = -deviation * 0.05; // 5% pull toward base each week
      const change = randomChange + trendBias + meanReversion;
      const newPrice = Math.round(currentPrice * (1 + change));
      // Floor at 10g, cap at 8x base price (more generous cap)
      newPrices[stock.id] = Math.max(10, Math.min(stock.basePrice * 8, newPrice));
    }
  }

  return newPrices;
}

// Calculate weekly dividends for a player's stock portfolio
// Returns total gold earned from dividends this week
export function calculateDividends(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  let totalDividends = 0;
  for (const [stockId, shares] of Object.entries(stocks)) {
    if (shares <= 0) continue;
    const stock = STOCKS.find(s => s.id === stockId);
    if (!stock) continue;
    const price = prices[stockId] || stock.basePrice;
    // Dividend = shares * price * weekly rate (paid in gold)
    totalDividends += Math.floor(shares * price * stock.dividendRate);
  }
  return totalDividends;
}

// Update price history with current week's prices
export function updatePriceHistory(
  history: Record<string, number[]>,
  currentPrices: Record<string, number>,
): Record<string, number[]> {
  const newHistory: Record<string, number[]> = {};
  for (const stock of STOCKS) {
    const prev = history[stock.id] || [];
    const price = currentPrices[stock.id] || stock.basePrice;
    // Keep last MAX_PRICE_HISTORY entries + new one
    const updated = [...prev, price];
    newHistory[stock.id] = updated.slice(-MAX_PRICE_HISTORY);
  }
  return newHistory;
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
