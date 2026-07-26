import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import { STOCKS, calculateStockValue, calculateDividendAccrual, getStoredDividendCredit, previewDividendSettlement } from '@/data/stocks';
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
  const storedDividendCredit = getStoredDividendCredit(player.stocks);
  const dividendSettlement = previewDividendSettlement(player.stocks, stockPrices);
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
        {storedDividendCredit > 0 && (
          <JonesInfoRow label="Stored Dividend Credit" value={`${storedDividendCredit.toFixed(2)}g`} darkText largeText />
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
