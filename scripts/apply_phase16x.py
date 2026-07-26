from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f'Expected text not found in {path}: {old[:100]!r}')
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'Expected one regex match in {path}, got {count}: {pattern[:100]!r}')
    write(path, updated)


# ---------------------------------------------------------------------------
# Types and migration
# ---------------------------------------------------------------------------
replace_once(
    'src/types/game.types.ts',
    '  investments: number; // Invested amount',
    '  investments: number; // Deprecated legacy balance; migrated 1:1 into savings on load/week-end',
)
replace_once(
    'src/types/game.types.ts',
    '  stocks: Record<string, number>;  // stockId -> shares owned\n',
    '  stocks: Record<string, number>;  // stockId -> shares owned\n'
    '  dividendCredit: number;          // Fractional unpaid dividends carried into future weeks\n',
)
replace_once(
    'src/types/game.types.ts',
    '  totalWealth: number;     // gold + savings + investments + stocks - loan',
    '  totalWealth: number;     // cash + savings + stock portfolio - loan (legacy investments migrate to savings)',
)
replace_once(
    'src/types/game.types.ts',
    '  wealth: number;      // Target gold + savings + investments',
    '  wealth: number;      // Target cash + savings + stock portfolio minus debt',
)

write('src/lib/financialMigration.ts', """import type { Player } from '@/types/game.types';

/**
 * Retire the old generic Investments account without destroying save-game value.
 * Legacy balances move 1:1 into Savings. The compatibility field remains at 0
 * so older serialized shapes and clients can still be read safely.
 */
export function migrateLegacyPlayerFinances(player: Player): Player {
  const rawLegacy = Number.isFinite(player.investments) ? player.investments : 0;
  const legacyInvestments = Math.max(0, Math.floor(rawLegacy));
  const rawSavings = Number.isFinite(player.savings) ? player.savings : 0;
  const rawCredit = Number.isFinite(player.dividendCredit) ? player.dividendCredit : 0;

  return {
    ...player,
    savings: Math.max(0, Math.floor(rawSavings)) + legacyInvestments,
    investments: 0,
    dividendCredit: Math.max(0, rawCredit),
  };
}
""")

write('src/lib/financialMigration.test.ts', """import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import { migrateLegacyPlayerFinances } from './financialMigration';

function player(overrides: Partial<Player> = {}): Player {
  return {
    savings: 100,
    investments: 0,
    dividendCredit: 0,
    ...overrides,
  } as Player;
}

describe('migrateLegacyPlayerFinances', () => {
  it('moves the complete legacy investment balance into savings without a fee', () => {
    const migrated = migrateLegacyPlayerFinances(player({ savings: 125, investments: 275 }));

    expect(migrated.savings).toBe(400);
    expect(migrated.investments).toBe(0);
  });

  it('defaults missing or invalid dividend credit safely', () => {
    const migrated = migrateLegacyPlayerFinances(player({ dividendCredit: undefined as unknown as number }));
    expect(migrated.dividendCredit).toBe(0);
  });

  it('preserves an existing fractional dividend credit', () => {
    const migrated = migrateLegacyPlayerFinances(player({ dividendCredit: 0.73 }));
    expect(migrated.dividendCredit).toBe(0.73);
  });
});
""")

# ---------------------------------------------------------------------------
# Stock model and dividend settlement
# ---------------------------------------------------------------------------
write('src/data/stocks.ts', """// Guild Life - Stock Market System (Jones-style)
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

/** Exact fractional dividend earned by the portfolio during one week. */
export function calculateDividendAccrual(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  let accrual = 0;
  for (const [stockId, shares] of Object.entries(stocks)) {
    if (!Number.isFinite(shares) || shares <= 0) continue;
    const stock = STOCKS.find(candidate => candidate.id === stockId);
    if (!stock) continue;
    const price = prices[stockId] || stock.basePrice;
    accrual += shares * price * stock.dividendRate;
  }
  return accrual;
}

export interface DividendSettlement {
  accrual: number;
  payment: number;
  credit: number;
}

/**
 * Add this week's fractional accrual to stored credit, pay whole gold, and
 * preserve the remainder. Rounding the remainder prevents floating drift.
 */
export function settleDividends(
  stocks: Record<string, number>,
  prices: Record<string, number>,
  existingCredit: number = 0,
): DividendSettlement {
  const accrual = calculateDividendAccrual(stocks, prices);
  const safeCredit = Number.isFinite(existingCredit) ? Math.max(0, existingCredit) : 0;
  const total = safeCredit + accrual;
  const payment = Math.floor(total + Number.EPSILON);
  const credit = Number(Math.max(0, total - payment).toFixed(6));
  return { accrual, payment, credit };
}

/** Backward-compatible whole-gold preview without stored credit. */
export function calculateDividends(
  stocks: Record<string, number>,
  prices: Record<string, number>,
): number {
  return settleDividends(stocks, prices).payment;
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
  for (const [stockId, shares] of Object.entries(stocks)) {
    total += shares * (prices[stockId] || 0);
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
""")

write('src/data/stocks.test.ts', """import { describe, expect, it } from 'vitest';
import { calculateDividendAccrual, settleDividends } from './stocks';

const prices = {
  'crystal-mine': 100,
  'potion-guild': 150,
  'enchanting-corp': 200,
  'crown-bonds': 100,
};

describe('fractional stock dividends', () => {
  it('combines small holdings instead of rounding each security down separately', () => {
    expect(calculateDividendAccrual({ 'crystal-mine': 1, 'potion-guild': 1 }, prices)).toBeCloseTo(0.95);
  });

  it('carries unpaid credit into following weeks', () => {
    const first = settleDividends({ 'crystal-mine': 1, 'potion-guild': 1 }, prices, 0);
    const second = settleDividends({ 'crystal-mine': 1, 'potion-guild': 1 }, prices, first.credit);

    expect(first).toMatchObject({ payment: 0, credit: 0.95 });
    expect(second).toMatchObject({ payment: 1, credit: 0.9 });
  });

  it('pays whole gold and preserves the exact remainder', () => {
    const result = settleDividends({ 'crown-bonds': 2 }, prices, 0.4);
    expect(result.payment).toBe(2);
    expect(result.credit).toBe(0.4);
  });

  it('does not create a payment for an empty portfolio', () => {
    expect(settleDividends({}, prices, 0)).toEqual({ accrual: 0, payment: 0, credit: 0 });
  });
});
""")

# ---------------------------------------------------------------------------
# Store integration
# ---------------------------------------------------------------------------
replace_once(
    'src/store/gameStore.ts',
    "import { getInitialStockPrices, getInitialPriceHistory } from '@/data/stocks';",
    "import { getInitialStockPrices, getInitialPriceHistory } from '@/data/stocks';\nimport { migrateLegacyPlayerFinances } from '@/lib/financialMigration';",
)
replace_once(
    'src/store/gameStore.ts',
    '  stocks: {},\n  // Loans',
    '  stocks: {},\n  dividendCredit: 0,\n  // Loans',
)
replace_once(
    'src/store/gameStore.ts',
    "      const migratedPlayers = gs.players.map((p: Player) =>\n        p.housing === ('modest' as string) ? { ...p, housing: 'slums' as const } : p\n      );",
    "      const migratedPlayers = gs.players.map((p: Player) => {\n        const housingMigrated = p.housing === ('modest' as string)\n          ? { ...p, housing: 'slums' as const }\n          : p;\n        return migrateLegacyPlayerFinances(housingMigrated);\n      });",
)

replace_once(
    'src/store/helpers/weekEndHelpers.ts',
    "import { updateStockPrices, calculateDividends, updatePriceHistory } from '@/data/stocks';",
    "import { updateStockPrices, settleDividends, updatePriceHistory } from '@/data/stocks';\nimport { migrateLegacyPlayerFinances } from '@/lib/financialMigration';",
)
regex_once(
    'src/store/helpers/weekEndHelpers.ts',
    r"// Finances\n/\*\* BASE weekly return rate on investments \(compound\) — scaled by priceModifier \*/\nconst INVESTMENT_WEEKLY_BASE_RATE = 0\.005;\n",
    '// Finances\n',
)
regex_once(
    'src/store/helpers/weekEndHelpers.ts',
    r"/\*\* Process investments, savings interest, and stock dividends \(deterministic — always runs\).*?\nfunction processFinances\(p: Player, stockPrices: Record<string, number>, msgs: string\[\], priceModifier: number = 1\.0\): void \{.*?\n\}\n\n/\*\* Random Shadowfingers theft check",
    """/** Process savings interest and stock dividends (deterministic — always runs).
 *  The retired generic Investments balance is migrated 1:1 into Savings.
 *  Fractional stock dividends are carried forward until they form whole gold. */
function processFinances(p: Player, stockPrices: Record<string, number>, msgs: string[], priceModifier: number = 1.0): void {
  const legacyInvestments = Number.isFinite(p.investments) ? Math.max(0, Math.floor(p.investments)) : 0;
  const migrated = migrateLegacyPlayerFinances(p);
  Object.assign(p, migrated);
  if (legacyInvestments > 0 && !p.isAI) {
    msgs.push(`The Bank moved ${legacyInvestments}g from the retired Investments account into Savings.`);
  }

  if (p.savings > 0) {
    const effectiveRate = SAVINGS_WEEKLY_BASE_RATE * priceModifier;
    const interest = Math.floor(p.savings * effectiveRate);
    p.savings += interest;
  }

  const settlement = settleDividends(p.stocks, stockPrices, p.dividendCredit ?? 0);
  p.dividendCredit = settlement.credit;
  if (settlement.payment > 0) {
    p.gold += settlement.payment;
    p.gameStats.totalGoldEarned = (p.gameStats.totalGoldEarned ?? 0) + settlement.payment;
    if (!p.isAI) {
      msgs.push(`Stock dividends paid: +${settlement.payment}g${settlement.credit > 0 ? ` (${settlement.credit.toFixed(2)}g credit carried forward)` : ''}`);
    }
  }
}

/** Random Shadowfingers theft check""",
)
replace_once(
    'src/store/helpers/weekEndHelpers.ts',
    '          totalWealth: p.gold + p.savings + p.investments + stockValue - p.loanAmount,',
    '          totalWealth: p.gold + p.savings + stockValue - p.loanAmount,',
)

# Retire canonical generic investment service and permit large exact Sell All operations.
replace_once(
    'src/store/helpers/economy/financeServiceHelpers.ts',
    'const MAX_STOCK_SHARES = 1_000;',
    'const MAX_STOCK_SHARES = 100_000;',
)
regex_once(
    'src/store/helpers/economy/financeServiceHelpers.ts',
    r"    manageInvestment: \(.*?\n    tradeStock:",
    """    manageInvestment: (
      _playerId: string,
      _service: InvestmentService,
      _amount: number,
    ): ActionResult => ({
      success: false,
      message: 'The generic Investments account has been retired. Use The Broker to buy shares or Crown Bonds.',
    }),

    tradeStock:""",
)
replace_once(
    'src/network/types.ts',
    "  'manageInvestment',\n",
    '',
)

# ---------------------------------------------------------------------------
# Broker UI
# ---------------------------------------------------------------------------
write('src/components/game/BankPanel.tsx', """import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import { STOCKS, calculateStockValue, calculateDividendAccrual, settleDividends } from '@/data/stocks';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store/gameStore';

interface BankPanelProps {
  player: Player;
  priceModifier?: number;
  stockPrices: Record<string, number>;
  stockPriceHistory?: Record<string, number[]>;
}

function Sparkline({ prices, width = 60, height = 16 }: { prices: number[]; width?: number; height?: number }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices.map((price, index) => {
    const x = (index / (prices.length - 1)) * width;
    const y = height - ((price - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  const isUp = prices[prices.length - 1] >= prices[0];
  return (
    <svg width={width} height={height} className="inline-block ml-1" aria-hidden="true">
      <polyline points={points} fill="none" stroke={isUp ? '#2a7a2a' : '#8b4a4a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type BankView = 'main' | 'broker' | 'loans';
const TRADE_BUTTON = 'text-[10px] px-1.5 py-0.5 text-white rounded disabled:opacity-35 disabled:cursor-not-allowed';

export function BankPanel({ player, priceModifier = 1.0, stockPrices, stockPriceHistory }: BankPanelProps) {
  const { t } = useTranslation();
  const transferFunds = useGameStore(state => state.transferBankFunds);
  const stockTradeAction = useGameStore(state => state.tradeStock);
  const loanAction = useGameStore(state => state.manageLoan);
  const [view, setView] = useState<BankView>('main');

  const report = (result: { success: boolean; message: string } | void) => {
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const weeklyAccrual = calculateDividendAccrual(player.stocks, stockPrices);
  const dividendSettlement = settleDividends(player.stocks, stockPrices, player.dividendCredit ?? 0);
  const legacyInvestments = Math.max(0, player.investments ?? 0);
  const totalWealth = player.gold + player.savings + legacyInvestments + stockValue - player.loanAmount;

  if (view === 'broker') {
    return (
      <div>
        <div className="text-center mb-2">
          <div className="font-display text-sm font-bold text-[#3d2a14]">{t('panelBank.theBroker')}</div>
          <div className="text-xs text-[#6b5a42]">Shares, bonds, market risk and weekly income</div>
        </div>
        <JonesInfoRow label={t('panelBank.cash')} value={`${player.gold}g`} darkText largeText />
        <JonesInfoRow label={t('panelBank.portfolioValue')} value={`${stockValue}g`} darkText largeText />
        <JonesInfoRow label="Dividend Accrual" value={`+${weeklyAccrual.toFixed(2)}g/wk`} valueClass="text-[#2a7a2a]" darkText largeText />
        {(player.dividendCredit ?? 0) > 0 && (
          <JonesInfoRow label="Stored Dividend Credit" value={`${(player.dividendCredit ?? 0).toFixed(2)}g`} darkText largeText />
        )}
        {dividendSettlement.payment > 0 && (
          <JonesInfoRow label="Expected Next Payout" value={`+${dividendSettlement.payment}g`} valueClass="text-[#2a7a2a]" darkText largeText />
        )}

        <JonesSectionHeader title={t('panelBank.availableStocks')} />
        {STOCKS.map(stock => {
          const price = stockPrices[stock.id] || stock.basePrice;
          const owned = player.stocks[stock.id] || 0;
          const buyMax = Math.min(100_000, Math.floor(player.gold / price));
          const history = stockPriceHistory?.[stock.id] || [];
          const previousPrice = history.length >= 2 ? history[history.length - 2] : stock.basePrice;
          const priceChange = price - previousPrice;
          const percentChange = previousPrice > 0 ? ((priceChange / previousPrice) * 100).toFixed(1) : '0.0';
          const dividendPerShare = price * stock.dividendRate;
          const positionValue = owned * price;

          const trade = (side: 'buy' | 'sell', shares: number) => {
            if (shares <= 0) return;
            report(stockTradeAction(player.id, side, stock.id, shares));
          };

          return (
            <div key={stock.id} className="px-2 py-1.5 border-b border-[#8b7355]">
              <div className="flex justify-between items-center font-mono text-sm">
                <span className="text-[#3d2a14] text-xs">{t(`stocks.${stock.id}.name`) || stock.name}</span>
                <div className="flex items-center gap-1">
                  <Sparkline prices={history} />
                  <span className="text-[#c9a227] font-bold">{price}g</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs mt-0.5">
                <span className={priceChange >= 0 ? 'text-[#2a7a2a]' : 'text-[#8b4a4a]'}>
                  {priceChange >= 0 ? '+' : ''}{priceChange}g ({priceChange >= 0 ? '+' : ''}{percentChange}%)
                </span>
                <span className="text-[#6b5a42]">Div: {dividendPerShare.toFixed(2)}g/share/wk</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#6b5a42] mt-0.5">
                <span>
                  {stock.isTBill ? t('panelBank.safe') : (stock.volatility > 0.25 ? t('panelBank.riskHigh') : stock.volatility > 0.15 ? t('panelBank.riskMed') : t('panelBank.riskLow'))}
                </span>
                <span>Own: {owned} · Value: {positionValue}g</span>
              </div>
              <div className="flex flex-wrap justify-end gap-1 mt-1">
                <button onClick={() => trade('buy', 1)} disabled={buyMax < 1} className={`${TRADE_BUTTON} bg-[#2a5c3a]`}>Buy 1</button>
                <button onClick={() => trade('buy', 5)} disabled={buyMax < 5} className={`${TRADE_BUTTON} bg-[#2a5c3a]`}>Buy 5</button>
                <button onClick={() => trade('buy', buyMax)} disabled={buyMax < 1} className={`${TRADE_BUTTON} bg-[#1f4d30]`}>Buy Max</button>
                <button onClick={() => trade('sell', 1)} disabled={owned < 1} className={`${TRADE_BUTTON} bg-[#8b4a4a]`}>Sell 1</button>
                <button onClick={() => trade('sell', owned)} disabled={owned < 1} className={`${TRADE_BUTTON} bg-[#6f3434]`}>Sell All</button>
              </div>
            </div>
          );
        })}
        <div className="mt-2 text-xs text-[#6b5a42] px-2">
          {t('panelBank.sellFee')} Fractional dividends carry forward until they form whole gold.
        </div>
        <div className="mt-2 px-2">
          <JonesButton label={t('common.back').toUpperCase()} onClick={() => setView('main')} variant="secondary" />
        </div>
      </div>
    );
  }

  if (view === 'loans') {
    const loanAmounts = [100, 250, 500, 1000];
    const hasLoan = player.loanAmount > 0;
    const hasJobHistory = (player.totalShiftsWorked || 0) >= LOAN_MIN_SHIFTS_REQUIRED;

    return (
      <div>
        <div className="text-center mb-2">
          <div className="font-display text-sm font-bold text-[#3d2a14]">{t('panelBank.loanSystem')}</div>
          <div className="text-xs text-[#6b5a42]">{t('panelBank.weeklyInterest')}</div>
        </div>
        <div className="bg-[#d4c4a0] border border-[#8b7355] rounded px-2 py-1 mb-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#6b5a42]">Current Loan Rate:</span>
            <span className={`font-bold ${priceModifier > 1 ? 'text-[#8b4a4a]' : 'text-[#2a7a2a]'}`}>{(10 * priceModifier).toFixed(1)}%/wk</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#6b5a42]">Savings Rate:</span>
            <span className={`font-bold ${priceModifier > 1 ? 'text-[#2a7a2a]' : 'text-[#8b6914]'}`}>{(0.1 * priceModifier).toFixed(2)}%/wk</span>
          </div>
          <div className="text-xs text-[#8b6914] italic mt-0.5">Rates follow market conditions</div>
        </div>
        {hasLoan ? (
          <>
            <JonesInfoRow label={t('panelBank.currentDebt')} value={`${player.loanAmount}g`} valueClass="text-red-600" darkText largeText />
            <JonesInfoRow label={t('panelBank.weeksRemaining')} value={`${player.loanWeeksRemaining}`} darkText largeText />
            <JonesInfoRow label={t('panelBank.weeklyInterest')} value={`${(10 * priceModifier).toFixed(1)}%`} darkText largeText />
            <JonesSectionHeader title={t('panelBank.repayLoan').toUpperCase()} />
            {[50, 100, 250].map(amount => {
              const actual = Math.min(amount, player.loanAmount);
              return <JonesMenuItem key={amount} label={`${t('panelBank.repayLoan')} ${actual}g`} disabled={player.gold < actual || player.loanAmount <= 0} darkText largeText onClick={() => report(loanAction(player.id, 'repay', actual))} />;
            })}
            <JonesMenuItem label={`${t('panelBank.repayAll')} (${player.loanAmount}g)`} disabled={player.gold < player.loanAmount} darkText largeText onClick={() => report(loanAction(player.id, 'repay', 'all'))} />
          </>
        ) : hasJobHistory ? (
          <>
            <div className="text-sm text-[#6b5a42] px-2 mb-2">{t('panelBank.maxLoan')}</div>
            <JonesSectionHeader title={t('panelBank.takeLoan').toUpperCase()} />
            {loanAmounts.map(amount => <JonesMenuItem key={amount} label={`${t('panelBank.takeLoan')} ${amount}g`} price={amount} darkText largeText onClick={() => report(loanAction(player.id, 'borrow', amount))} />)}
          </>
        ) : (
          <div className="text-sm text-[#8b4a4a] px-2 py-2">{t('panelBank.loanNoHistory')}</div>
        )}
        <div className="mt-2 text-xs text-[#6b5a42] px-2">{t('panelBank.noLoan')}</div>
        <div className="mt-2 px-2"><JonesButton label={t('common.back').toUpperCase()} onClick={() => setView('main')} variant="secondary" /></div>
      </div>
    );
  }

  return (
    <div>
      <JonesInfoRow label={t('panelBank.cash')} value={`${player.gold}g`} darkText largeText />
      <JonesInfoRow label={t('panelBank.savings')} value={`${player.savings}g`} darkText largeText />
      {player.savings > 0 && <JonesInfoRow label="Interest rate:" value={`${(0.1 * priceModifier).toFixed(2)}%/wk`} valueClass={priceModifier > 1 ? 'text-[#2a7a2a]' : 'text-[#8b6914]'} darkText largeText />}
      <JonesInfoRow label="Stock Portfolio" value={`${stockValue}g`} darkText largeText />
      {weeklyAccrual > 0 && <JonesInfoRow label="Dividend Accrual" value={`+${weeklyAccrual.toFixed(2)}g/wk`} valueClass="text-[#2a7a2a]" darkText largeText />}
      {player.loanAmount > 0 && <JonesInfoRow label={t('stats.loanDebt')} value={`-${player.loanAmount}g`} valueClass="text-red-600" darkText largeText />}
      <JonesInfoRow label={t('panelBank.totalWealth')} value={`${totalWealth}g`} valueClass="text-[#c9a227] font-bold" darkText largeText />

      <JonesSectionHeader title={t('panelBank.banking')} />
      <JonesMenuItem label={`${t('common.deposit')} 50 ${t('stats.gold')}`} price={50} disabled={player.gold < 50} darkText largeText onClick={() => report(transferFunds(player.id, 'deposit', 50))} />
      <JonesMenuItem label={`${t('common.withdraw')} 50 ${t('stats.gold')}`} disabled={player.savings < 50} darkText largeText onClick={() => report(transferFunds(player.id, 'withdraw', 50))} />
      <JonesSectionHeader title="FINANCIAL SERVICES" />
      <JonesMenuItem label={`${t('panelBank.theBroker')} (${stockValue}g portfolio)`} darkText largeText onClick={() => setView('broker')} />
      <JonesMenuItem label={player.loanAmount > 0 ? `${t('panelBank.loanSystem')} (${player.loanAmount}g)` : t('panelBank.loanSystem')} darkText largeText onClick={() => setView('loans')} />
    </div>
  );
}
""")

# ---------------------------------------------------------------------------
# Newspaper restoration
# ---------------------------------------------------------------------------
write('src/components/game/GeneralStorePanel.tsx', """import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
} from './JonesStylePanel';
import { GENERAL_STORE_ITEMS, getItemPrice } from '@/data/items';
import { NEWSPAPER_COST, generateNewspaper } from '@/data/newspaper';
import type { Newspaper } from '@/data/newspaper';
import { itemToPreview } from './ItemPreview';
import { NewspaperModal } from './NewspaperModal';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';
import { useGameStore } from '@/store/gameStore';

interface GeneralStorePanelProps {
  player: Player;
  priceModifier: number;
}

const newspaperCache = new Map<string, Newspaper>();

function getWeeklyNewspaper(
  playerId: string,
  week: number,
  priceModifier: number,
  economyTrend: number,
  weeklyNewsEvents: ReturnType<typeof useGameStore.getState>['weeklyNewsEvents'],
): Newspaper {
  const eventKey = JSON.stringify(weeklyNewsEvents);
  const key = `${playerId}:${week}:${priceModifier.toFixed(4)}:${economyTrend}:${eventKey}`;
  const cached = newspaperCache.get(key);
  if (cached) return cached;
  const generated = generateNewspaper(week, priceModifier, economyTrend, weeklyNewsEvents);
  newspaperCache.set(key, generated);
  return generated;
}

export function GeneralStorePanel({ player, priceModifier }: GeneralStorePanelProps) {
  const { t } = useTranslation();
  const purchaseNewspaper = useGameStore(state => state.purchaseNewspaper);
  const purchaseVendorItem = useGameStore(state => state.purchaseVendorItem);
  const week = useGameStore(state => state.week);
  const economyTrend = useGameStore(state => state.economyTrend);
  const weeklyNewsEvents = useGameStore(state => state.weeklyNewsEvents);
  const [showNewspaper, setShowNewspaper] = useState(false);
  const previousHasNewspaper = useRef(player.hasNewspaper);
  const newspaperPrice = Math.round(NEWSPAPER_COST * priceModifier);
  const lotteryPrice = Math.round(10 * priceModifier);

  const newspaper = useMemo(
    () => getWeeklyNewspaper(player.id, week, priceModifier, economyTrend, weeklyNewsEvents),
    [player.id, week, priceModifier, economyTrend, weeklyNewsEvents],
  );

  useEffect(() => {
    const newlyOwned = !previousHasNewspaper.current && player.hasNewspaper;
    previousHasNewspaper.current = player.hasNewspaper;
    if (newlyOwned) setShowNewspaper(true);
  }, [player.hasNewspaper]);

  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
  const maxFreshFood = hasFrostChest ? 12 : 6;

  const handlePurchase = (itemId: string, successMessage: string) => {
    const result = purchaseVendorItem(player.id, 'general-store', itemId);
    if (!result) return;
    if (result.success) toast.success(successMessage);
    else toast.error(result.message);
  };

  const handleNewspaper = () => {
    if (player.hasNewspaper) {
      setShowNewspaper(true);
      return;
    }
    const result = purchaseNewspaper(player.id, 'general-store');
    if (result?.success) toast.success(t('panelStore.purchased', { name: t('panelStore.newspaper') }));
    else if (result && !result.success) toast.error(result.message);
  };

  return (
    <>
      <div>
        <JonesSectionHeader title={t('panelStore.food')} />
        {GENERAL_STORE_ITEMS.filter(item => item.effect?.type === 'food' && !item.isFreshFood).map(item => {
          const price = getItemPrice(item, priceModifier);
          const itemName = t(`items.${item.id}.name`) || item.name;
          return <JonesMenuItem key={item.id} label={itemName} price={price} disabled={player.gold < price} darkText largeText previewData={itemToPreview(item)} onClick={() => handlePurchase(item.id, t('panelStore.purchased', { name: itemName }))} />;
        })}

        <JonesSectionHeader title={t('panelStore.freshFood')} />
        {hasPreservationBox && <JonesInfoRow label={t('panelStore.freshFoodStored')} value={`${player.freshFood}/${maxFreshFood}`} darkText largeText />}
        {GENERAL_STORE_ITEMS.filter(item => item.isFreshFood).map(item => {
          const price = getItemPrice(item, priceModifier);
          const units = item.freshFoodUnits || 0;
          const spaceLeft = maxFreshFood - player.freshFood;
          const itemName = t(`items.${item.id}.name`) || item.name;
          return <JonesMenuItem key={item.id} label={`${itemName} (+${units})`} price={price} disabled={player.gold < price || spaceLeft <= 0} darkText largeText previewData={itemToPreview(item)} onClick={() => handlePurchase(item.id, t('panelStore.storedFreshFood', { units: Math.min(units, spaceLeft) }))} />;
        })}
        {hasPreservationBox && <div className="text-xs text-[#6b5a42] px-2 mb-1">{t('panelStore.preservationRequired')}</div>}

        <JonesSectionHeader title={t('panelStore.durables')} />
        <JonesMenuItem
          label={player.hasNewspaper ? 'Read The Guildholm Herald' : t('panelStore.newspaper')}
          price={player.hasNewspaper ? undefined : newspaperPrice}
          disabled={!player.hasNewspaper && player.gold < newspaperPrice}
          darkText
          largeText
          previewData={{
            name: 'The Guildholm Herald',
            description: 'The latest news, job listings, town gossip and personalized stories from the current week.',
            category: 'Information',
            tags: ['News'],
            effect: player.hasNewspaper ? 'Read again at no additional cost' : 'Purchase and open this week\'s personalized edition',
          }}
          onClick={handleNewspaper}
        />
        <JonesMenuItem
          label={t('items.lottery-ticket.name') || "Fortune's Wheel Ticket"}
          price={lotteryPrice}
          disabled={player.gold < lotteryPrice}
          darkText
          largeText
          previewData={{ name: "Fortune's Wheel Ticket", description: 'Weekly lottery drawing. More tickets = better odds! Grand prize: 5,000g.', category: 'Lottery', tags: ['Lottery'], effect: 'Grand Prize: 5,000g' }}
          onClick={() => handlePurchase('lottery-ticket', t('panelStore.purchased', { name: t('items.lottery-ticket.name') }))}
        />
        {player.lotteryTickets > 0 && <JonesInfoRow label={t('panelShadowMarket.lotteryTickets') + ':'} value={`${player.lotteryTickets}`} darkText largeText />}
      </div>
      <NewspaperModal newspaper={showNewspaper ? newspaper : null} onClose={() => setShowNewspaper(false)} />
    </>
  );
}
""")

write('src/components/game/GeneralStorePanel.test.tsx', """import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { GeneralStorePanel } from './GeneralStorePanel';

const goals = { wealth: 5000, happiness: 75, education: 45, career: 75, adventure: 0 };

function Harness() {
  const player = useGameStore(state => state.players[0]);
  const priceModifier = useGameStore(state => state.priceModifier);
  return player ? <GeneralStorePanel player={player} priceModifier={priceModifier} /> : null;
}

function prepare(hasNewspaper = false) {
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame(['Reader'], false, goals);
  useGameStore.setState(state => ({
    players: state.players.map(player => ({ ...player, currentLocation: 'general-store', gold: 100, hasNewspaper })),
  }));
}

describe('GeneralStorePanel newspaper flow', () => {
  beforeEach(() => {
    localStorage.clear();
    prepare(false);
  });

  it('opens the newspaper automatically after a successful purchase', async () => {
    render(<Harness />);
    const beforeGold = useGameStore.getState().players[0].gold;
    fireEvent.click(screen.getByRole('button', { name: /Guildholm Herald/i }));

    expect(await screen.findByText('The Guildholm Herald')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Read The Guildholm Herald/i })).toBeInTheDocument();
    expect(useGameStore.getState().players[0].gold).toBeLessThan(beforeGold);
  });

  it('reopens an owned newspaper without charging for a second purchase', async () => {
    prepare(true);
    render(<Harness />);

    expect(screen.queryByText('Week 1 Edition')).not.toBeInTheDocument();
    const beforeGold = useGameStore.getState().players[0].gold;
    fireEvent.click(screen.getByRole('button', { name: /Read The Guildholm Herald/i }));

    expect(await screen.findByText('Week 1 Edition')).toBeInTheDocument();
    expect(useGameStore.getState().players[0].gold).toBe(beforeGold);
  });

  it('opens when an online host sync changes ownership from false to true', async () => {
    render(<Harness />);
    act(() => {
      useGameStore.setState(state => ({
        players: state.players.map(player => ({ ...player, hasNewspaper: true })),
      }));
    });

    await waitFor(() => expect(screen.getByText('Week 1 Edition')).toBeInTheDocument());
  });
});
""")

# ---------------------------------------------------------------------------
# Finance tests and changelog
# ---------------------------------------------------------------------------
write('src/test/financeServices.test.ts', """import { beforeEach, describe, expect, it } from 'vitest';
import { ALLOWED_GUEST_ACTIONS } from '@/network/types';
import { useGameStore } from '@/store/gameStore';

const goals = { wealth: 5000, happiness: 75, education: 45, career: 75, adventure: 0 };

function preparePlayer(overrides: Record<string, unknown> = {}) {
  useGameStore.setState(state => ({
    stockPrices: { ...state.stockPrices, 'crystal-mine': 125, 'crown-bonds': 100 },
    players: state.players.map(player => ({
      ...player,
      currentLocation: 'bank',
      gold: 5000,
      savings: 500,
      investments: 0,
      dividendCredit: 0,
      stocks: {},
      loanAmount: 0,
      loanWeeksRemaining: 0,
      totalShiftsWorked: 10,
      ...overrides,
    })),
  }));
  return useGameStore.getState().players[0].id;
}

describe('host-authoritative finance services', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().resetForNewGame();
    useGameStore.getState().startNewGame(['Finance Tester'], false, goals);
  });

  it('transfers exact whole-number amounts only at the Bank', () => {
    const playerId = preparePlayer();
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 200)?.success).toBe(true);
    expect(useGameStore.getState().transferBankFunds(playerId, 'withdraw', 100)?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.gold).toBe(4900);
    expect(player.savings).toBe(600);
  });

  it('rejects decimals, overdrafts and remote bank transfers', () => {
    let playerId = preparePlayer();
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 1.5)?.success).toBe(false);
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 9999)?.success).toBe(false);
    expect(useGameStore.getState().transferBankFunds(playerId, 'withdraw', 9999)?.success).toBe(false);
    playerId = preparePlayer({ currentLocation: 'guild-hall' });
    expect(useGameStore.getState().transferBankFunds(playerId, 'deposit', 50)?.success).toBe(false);
  });

  it('retires the generic investment service without mutating balances', () => {
    const playerId = preparePlayer({ investments: 500 });
    const result = useGameStore.getState().manageInvestment(playerId, 'invest', 200);
    const player = useGameStore.getState().players[0];
    expect(result?.success).toBe(false);
    expect(result?.message).toContain('Broker');
    expect(player.gold).toBe(5000);
    expect(player.investments).toBe(500);
  });

  it('buys stocks using the live host price', () => {
    const playerId = preparePlayer();
    const result = useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 3);
    const player = useGameStore.getState().players[0];
    expect(result?.success).toBe(true);
    expect(player.gold).toBe(4625);
    expect(player.stocks['crystal-mine']).toBe(3);
  });

  it('supports exact bulk buy and sell-all share counts', () => {
    const playerId = preparePlayer({ gold: 1250 });
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 10)?.success).toBe(true);
    expect(useGameStore.getState().tradeStock(playerId, 'sell', 'crystal-mine', 10)?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.gold).toBe(1250);
    expect(player.stocks['crystal-mine']).toBeUndefined();
  });

  it('validates stock identity, integer shares, affordability and ownership', () => {
    const playerId = preparePlayer({ gold: 100, stocks: { 'crystal-mine': 1 } });
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'missing-stock', 1)?.success).toBe(false);
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 1.5)?.success).toBe(false);
    expect(useGameStore.getState().tradeStock(playerId, 'buy', 'crystal-mine', 1)?.success).toBe(false);
    expect(useGameStore.getState().tradeStock(playerId, 'sell', 'crystal-mine', 2)?.success).toBe(false);
  });

  it('applies the canonical Crown Bond sell fee', () => {
    const playerId = preparePlayer({ gold: 0, stocks: { 'crown-bonds': 2 } });
    expect(useGameStore.getState().tradeStock(playerId, 'sell', 'crown-bonds', 2)?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.gold).toBe(194);
    expect(player.stocks['crown-bonds']).toBeUndefined();
  });

  it('offers only canonical loan products and enforces job history', () => {
    let playerId = preparePlayer();
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 300)?.success).toBe(false);
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 500)?.success).toBe(true);
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 100)?.success).toBe(false);
    playerId = preparePlayer({ totalShiftsWorked: 0 });
    expect(useGameStore.getState().manageLoan(playerId, 'borrow', 100)?.success).toBe(false);
  });

  it('repays exact amounts or all debt without silently clamping', () => {
    const playerId = preparePlayer({ gold: 600, loanAmount: 500, loanWeeksRemaining: 4 });
    expect(useGameStore.getState().manageLoan(playerId, 'repay', 200)?.success).toBe(true);
    expect(useGameStore.getState().manageLoan(playerId, 'repay', 500)?.success).toBe(false);
    expect(useGameStore.getState().manageLoan(playerId, 'repay', 'all')?.success).toBe(true);
    const player = useGameStore.getState().players[0];
    expect(player.gold).toBe(100);
    expect(player.loanAmount).toBe(0);
  });

  it('allows Broker actions but blocks retired and legacy investment actions for guests', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('transferBankFunds')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('manageInvestment')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('tradeStock')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('manageLoan')).toBe(true);
    for (const legacy of ['depositToBank', 'withdrawFromBank', 'invest', 'withdrawInvestment', 'buyStock', 'sellStock', 'takeLoan', 'repayLoan']) {
      expect(ALLOWED_GUEST_ACTIONS.has(legacy)).toBe(false);
    }
  });
});
""")

replace_once(
    'src/components/screens/ChangelogScreen.tsx',
    "      improve(\"Updated What's New so recent gameplay, ranking and multiplayer fixes are no longer hidden behind the March changelog\"),",
    "      feat('The Broker is now the single investment system, with Buy 1/5/Max, Sell 1/All, position values and exact dividend information'),\n"
    "      improve('Legacy Investments balances migrate safely into Savings with no withdrawal penalty'),\n"
    "      fix('Fractional stock dividends now carry forward instead of disappearing when a weekly payout is below 1g'),\n"
    "      fix('The Guildholm Herald can be opened after purchase and read again throughout the week'),\n"
    "      improve(\"Updated What's New so recent gameplay, ranking and multiplayer fixes are no longer hidden behind the March changelog\"),",
)

write('docs/AUDIT_LOG_PHASE16X.md', """# Fase 16X - Broker consolidation and newspaper restoration

Date: 26 July 2026

## Problems

- The generic Investments account duplicated the Broker with less player choice.
- Small stock dividends were rounded away separately and could remain at 0g forever.
- Buying The Guildholm Herald set `hasNewspaper`, but the modal was no longer mounted, so the paper could not be read.

## Changes

- The Broker is the only current investment entry point.
- Removed generic Investments balance/actions from BankPanel and online guest permissions.
- The compatibility action now rejects new generic investments and directs players to The Broker.
- Old Investments balances migrate 1:1 into Savings on load and defensively at week end, without the old 10% fee.
- Added `dividendCredit` to player state. Exact fractional dividends accumulate, whole gold is paid, and the remainder carries forward.
- Broker now shows portfolio value, exact per-share dividend accrual, owned shares, position value, risk, price changes, and sparklines.
- Added Buy 1, Buy 5, Buy Max, Sell 1, and Sell All.
- Preserved current securities, market model, crashes, and Crown Bonds 3% sell fee.
- Restored NewspaperModal to GeneralStorePanel.
- Purchase opens the newspaper automatically. An owned newspaper becomes a free Read action for the rest of the week.
- Online state-sync false-to-true ownership also opens the newly purchased paper.
- Newspaper generation uses current week, economy, prices, and personalized weekly news, with a per-player/week cache.
- Updated What's New.

## Validation

The normal pull-request workflow must pass TypeScript, the complete Vitest suite, production build, ESLint, Chromium, and the deterministic complete game flow before merge.
""")

# Remove one-shot automation from the generated commit.
for temporary in [
    ROOT / 'scripts/apply_phase16x.py',
    ROOT / '.github/workflows/apply-phase16x.yml',
]:
    if temporary.exists():
        temporary.unlink()

print('Phase 16X transformation applied successfully.')
