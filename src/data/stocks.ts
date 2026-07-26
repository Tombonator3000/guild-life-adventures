// Guild Life - Stock Market System (Jones-style)
// Fantasy equivalents of stocks and T-Bills
// Features: dividends, economy-linked price trends, crash severity tiers, price history

export interface Stock {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  volatility: number;
  dividendRate: number;
  isTBill: boolean;
}

export const STOCKS: Stock[] = [
  {
    id: 'crystal-mine',
    name: 'Crystal Mine Ventures',
    description: 'Volatile mining operation. High risk, high reward. Low dividend.',
    basePrice: 100,
    volatility: 0.35,
    dividendRate: 0.002,
    isTBill: false,
  },
  {
    id: 'potion-guild',
    name: 'Potion Consortium',
    description: 'Moderate risk potion manufacturing. Balanced dividend.',
    basePrice: 150,
    volatility: 0.20,
    dividendRate: 0.005,
    isTBill: false,
  },
  {
    id: 'enchanting-corp',
    name: 'Enchanting Guild Corp',
    description: 'Stable enchanting business. Reliable dividends.',
    basePrice: 200,
    volatility: 0.10,
    dividendRate: 0.008,
    isTBill: false,
  },
  {
    id: 'crown-bonds',
    name: 'Crown Bonds',
    description: 'Royal treasury bonds. Fixed price, 1% weekly yield. 3% fee to sell.',
    basePrice: 100,
    volatility: 0,
    dividendRate: 0.01,
    isTBill: true,
  },
];

export const MAX_PRICE_HISTORY = 8;
const DIVIDEND_CREDIT_KEY = '__dividend-credit-microgold';
const MICRO_GOLD = 1_000_000;

export function getInitialStockPrices(): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const stock of STOCKS) prices[stock.id] = stock.basePrice;
  return prices;
}

export function getInitialPriceHistory(): Record<string, number[]> {
  const history: Record<string, number[]> = {};
  for (const stock of STOCKS) history[stock.id] = [stock.basePrice];
  return history;
}

export function updateStockPrices(
  currentPrices: Record<string, number>,
  isCrash: boolean = false,
  economyTrend: number = 0,
): Record<string, number> {
  const newPrices: Record<string, number> = {};

  for (const stock of STOCKS) {
    if (stock.isTBill) {
      newPrices[stock.id] = stock.basePrice;
      continue;
    }

    const currentPrice = currentPrices[stock.id] || stock.basePrice;
    if (isCrash) {
      const severity = Math.random();
      let crashFactor: number;
      if (severity < 0.5) crashFactor = 0.75 + Math.random() * 0.10;
      else if (severity < 0.85) crashFactor = 0.50 + Math.random() * 0.20;
      else crashFactor = 0.30 + Math.random() * 0.20;
      const stability = 1 - stock.volatility;
      crashFactor = crashFactor + (1 - crashFactor) * stability * 0.3;
      newPrices[stock.id] = Math.max(10, Math.round(currentPrice * crashFactor));
    } else {
      const randomChange = (Math.random() - 0.5) * 2 * stock.volatility;
      const trendBias = economyTrend * 0.03;
      const deviation = (currentPrice - stock.basePrice) / stock.basePrice;
      const meanReversion = -deviation * 0.05;
      const change = randomChange + trendBias + meanReversion;
      const newPrice = Math.round(currentPrice * (1 + change));
      newPrices[stock.id] = Math.max(10, Math.min(stock.basePrice * 8, newPrice));
    }
  }

  return newPrices;
}

/** Exact fractional dividend earned by real securities during one week. */
export function calculateDividendAccrual(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  let accrual = 0;
  for (const stock of STOCKS) {
    const shares = stocks[stock.id] ?? 0;
    if (!Number.isFinite(shares) || shares <= 0) continue;
    const price = prices[stock.id] || stock.basePrice;
    accrual += shares * price * stock.dividendRate;
  }
  return accrual;
}

/** Stored fractional dividend credit, hidden inside the serialized portfolio. */
export function getStoredDividendCredit(stocks: Record<string, number>): number {
  const storedMicroGold = stocks[DIVIDEND_CREDIT_KEY] ?? 0;
  if (!Number.isFinite(storedMicroGold) || storedMicroGold >= 0) return 0;
  return Math.abs(storedMicroGold) / MICRO_GOLD;
}

export interface DividendSettlement {
  accrual: number;
  payment: number;
  credit: number;
}

export function previewDividendSettlement(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): DividendSettlement {
  const accrual = calculateDividendAccrual(stocks, prices);
  const totalMicroGold = Math.max(0, Math.round((getStoredDividendCredit(stocks) + accrual) * MICRO_GOLD));
  const payment = Math.floor(totalMicroGold / MICRO_GOLD);
  const credit = (totalMicroGold % MICRO_GOLD) / MICRO_GOLD;
  return { accrual, payment, credit };
}

/**
 * Settle weekly dividends using whole gold while preserving any fractional
 * remainder. The reserve is stored as a negative internal portfolio entry so
 * it survives save/load and network sync while being ignored by trade/value
 * calculations and debt seizure (which only considers positive share counts).
 */
export function calculateDividends(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  const settlement = previewDividendSettlement(stocks, prices);
  if (settlement.credit > 0) {
    stocks[DIVIDEND_CREDIT_KEY] = -Math.round(settlement.credit * MICRO_GOLD);
  } else {
    delete stocks[DIVIDEND_CREDIT_KEY];
  }
  return settlement.payment;
}

export function updatePriceHistory(
  history: Record<string, number[]>,
  currentPrices: Record<string, number>,
): Record<string, number[]> {
  const newHistory: Record<string, number[]> = {};
  for (const stock of STOCKS) {
    const prev = history[stock.id] || [];
    const price = currentPrices[stock.id] || stock.basePrice;
    newHistory[stock.id] = [...prev, price].slice(-MAX_PRICE_HISTORY);
  }
  return newHistory;
}

export function calculateStockValue(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  let total = 0;
  for (const stock of STOCKS) {
    const shares = stocks[stock.id] ?? 0;
    if (shares > 0) total += shares * (prices[stock.id] || stock.basePrice);
  }
  return total;
}

export function getSellPrice(stockId: string, shares: number, currentPrice: number): number {
  const stock = STOCKS.find(candidate => candidate.id === stockId);
  if (!stock) return 0;
  const grossValue = shares * currentPrice;
  return stock.isTBill ? Math.floor(grossValue * 0.97) : grossValue;
}

export function getStock(id: string): Stock | undefined {
  return STOCKS.find(stock => stock.id === id);
}
