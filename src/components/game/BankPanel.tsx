import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import { STOCKS, calculateStockValue, calculateDividends } from '@/data/stocks';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n';

interface BankPanelProps {
  player: Player;
  spendTime?: (playerId: string, hours: number) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  buyStock: (playerId: string, stockId: string, shares: number) => void;
  sellStock: (playerId: string, stockId: string, shares: number) => void;
  takeLoan: (playerId: string, amount: number) => void;
  repayLoan: (playerId: string, amount: number) => void;
  stockPrices: Record<string, number>;
  stockPriceHistory?: Record<string, number[]>;
}

/** Tiny SVG sparkline for stock price history */
function Sparkline({ prices, width = 60, height = 16 }: { prices: number[]; width?: number; height?: number }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  const isUp = prices[prices.length - 1] >= prices[0];
  return (
    <svg width={width} height={height} className="inline-block ml-1">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#2a7a2a' : '#8b4a4a'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type BankView = 'main' | 'broker' | 'loans';

export function BankPanel({
  player,
  depositToBank,
  withdrawFromBank,
  buyStock,
  sellStock,
  takeLoan,
  repayLoan,
  stockPrices,
  stockPriceHistory,
}: BankPanelProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<BankView>('main');

  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const weeklyDividends = calculateDividends(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;

  if (view === 'broker') {
    return (
      <div>
        <div className="text-center mb-2">
          <div className="font-display text-sm font-bold text-[#3d2a14]">{t('panelBank.theBroker')}</div>
          <div className="text-xs text-[#6b5a42]">{t('panelBank.realmInvestments')}</div>
        </div>
        <JonesInfoRow label={t('panelBank.portfolioValue')} value={`${stockValue}g`} darkText largeText />
        <JonesInfoRow label={t('panelBank.cash')} value={`${player.gold}g`} darkText largeText />
        {weeklyDividends > 0 && (
          <JonesInfoRow label="Weekly Dividends" value={`+${weeklyDividends}g`} valueClass="text-[#2a7a2a]" darkText largeText />
        )}

        <JonesSectionHeader title={t('panelBank.availableStocks')} />
        {STOCKS.map(stock => {
          const price = stockPrices[stock.id] || stock.basePrice;
          const owned = player.stocks[stock.id] || 0;
          const canBuy = player.gold >= price;
          const canSell = owned > 0;
          const history = stockPriceHistory?.[stock.id] || [];
          const prevPrice = history.length >= 2 ? history[history.length - 2] : stock.basePrice;
          const priceChange = price - prevPrice;
          const pctChange = prevPrice > 0 ? ((priceChange / prevPrice) * 100).toFixed(1) : '0.0';
          const dividendPerShare = Math.floor(price * stock.dividendRate);

          return (
            <div key={stock.id} className="px-2 py-1.5 border-b border-[#8b7355]">
              <div className="flex justify-between items-center font-mono text-sm">
                <span className="text-[#3d2a14] text-xs">{t(`stocks.${stock.id}.name`) || stock.name}</span>
                <div className="flex items-center gap-1">
                  <Sparkline prices={history} />
                  <span className="text-[#c9a227] font-bold">{price}g</span>
                </div>
              </div>
              {/* Price change and dividend info */}
              <div className="flex justify-between items-center text-xs mt-0.5">
                <span className={priceChange >= 0 ? 'text-[#2a7a2a]' : 'text-[#8b4a4a]'}>
                  {priceChange >= 0 ? '+' : ''}{priceChange}g ({priceChange >= 0 ? '+' : ''}{pctChange}%)
                </span>
                <span className="text-[#6b5a42]">
                  Div: {dividendPerShare}g/wk
                </span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-xs text-[#6b5a42]">
                  {stock.isTBill ? t('panelBank.safe') : (stock.volatility > 0.25 ? t('panelBank.riskHigh') : stock.volatility > 0.15 ? t('panelBank.riskMed') : t('panelBank.riskLow'))}
                  {owned > 0 && ` | ${t('panelBank.own')}: ${owned}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      buyStock(player.id, stock.id, 1);
                      toast.success(t('panelBank.boughtShare', { name: t(`stocks.${stock.id}.name`) || stock.name }));
                    }}
                    disabled={!canBuy}
                    className="text-xs px-2 py-0.5 bg-[#2a5c3a] text-white rounded disabled:opacity-40"
                  >
                    {t('common.buy')}
                  </button>
                  <button
                    onClick={() => {
                      sellStock(player.id, stock.id, 1);
                      toast.success(t('panelBank.soldShare', { name: t(`stocks.${stock.id}.name`) || stock.name }));
                    }}
                    disabled={!canSell}
                    className="text-xs px-2 py-0.5 bg-[#8b4a4a] text-white rounded disabled:opacity-40"
                  >
                    {t('common.sell')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="mt-2 text-xs text-[#6b5a42] px-2">
          {t('panelBank.sellFee')} Dividends paid weekly on owned shares.
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
        {hasLoan ? (
          <>
            <JonesInfoRow label={t('panelBank.currentDebt')} value={`${player.loanAmount}g`} valueClass="text-red-600" darkText largeText />
            <JonesInfoRow label={t('panelBank.weeksRemaining')} value={`${player.loanWeeksRemaining}`} darkText largeText />
            <JonesInfoRow label={t('panelBank.weeklyInterest')} value="10%" darkText largeText />

            <JonesSectionHeader title={t('panelBank.repayLoan').toUpperCase()} />
            {[50, 100, 250].map(amount => {
              const actual = Math.min(amount, player.loanAmount);
              return (
                <JonesMenuItem
                  key={amount}
                  label={`${t('panelBank.repayLoan')} ${actual}g`}
                  disabled={player.gold < actual || player.loanAmount <= 0}
                  darkText
                  largeText
                  onClick={() => {
                    repayLoan(player.id, actual);
                    toast.success(t('panelBank.loanRepaid', { amount: actual }));
                  }}
                />
              );
            })}
            <JonesMenuItem
              label={`${t('panelBank.repayAll')} (${player.loanAmount}g)`}
              disabled={player.gold < player.loanAmount}
              darkText
              largeText
              onClick={() => {
                repayLoan(player.id, player.loanAmount);
                toast.success(t('panelBank.loanRepaid', { amount: player.loanAmount }));
              }}
            />
          </>
        ) : hasJobHistory ? (
          <>
            <div className="text-sm text-[#6b5a42] px-2 mb-2">
              {t('panelBank.maxLoan')}
            </div>
            <JonesSectionHeader title={t('panelBank.takeLoan').toUpperCase()} />
            {loanAmounts.map(amount => (
              <JonesMenuItem
                key={amount}
                label={`${t('panelBank.takeLoan')} ${amount}g`}
                price={amount}
                darkText
                largeText
                onClick={() => {
                  takeLoan(player.id, amount);
                  toast.success(t('panelBank.loanTaken', { amount }));
                }}
              />
            ))}
          </>
        ) : (
          <div className="text-sm text-[#8b4a4a] px-2 py-2">
            {t('panelBank.loanNoHistory')}
          </div>
        )}
        <div className="mt-2 text-xs text-[#6b5a42] px-2">
          {t('panelBank.noLoan')}
        </div>
        <div className="mt-2 px-2">
          <JonesButton label={t('common.back').toUpperCase()} onClick={() => setView('main')} variant="secondary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <JonesInfoRow label={t('panelBank.cash')} value={`${player.gold}g`} darkText largeText />
      <JonesInfoRow label={t('panelBank.savings')} value={`${player.savings}g`} darkText largeText />
      <JonesInfoRow label={t('stats.investments')} value={`${player.investments}g`} darkText largeText />
      {stockValue > 0 && <JonesInfoRow label="Stocks:" value={`${stockValue}g`} darkText largeText />}
      {weeklyDividends > 0 && <JonesInfoRow label="Dividends:" value={`+${weeklyDividends}g/wk`} valueClass="text-[#2a7a2a]" darkText largeText />}
      {player.loanAmount > 0 && <JonesInfoRow label={t('stats.loanDebt')} value={`-${player.loanAmount}g`} valueClass="text-red-600" darkText largeText />}
      <JonesInfoRow label={t('panelBank.totalWealth')} value={`${totalWealth}g`} valueClass="text-[#c9a227] font-bold" darkText largeText />

      <JonesSectionHeader title={t('panelBank.banking')} />
      <JonesMenuItem
        label={`${t('common.deposit')} 50 ${t('stats.gold')}`}
        price={50}
        disabled={player.gold < 50}
        darkText
        largeText
        onClick={() => {
          depositToBank(player.id, 50);
          toast.success(t('panelBank.deposited', { amount: 50 }));
        }}
      />
      <JonesMenuItem
        label={`${t('common.withdraw')} 50 ${t('stats.gold')}`}
        disabled={player.savings < 50}
        darkText
        largeText
        onClick={() => {
          withdrawFromBank(player.id, 50);
          toast.success(t('panelBank.withdrawn', { amount: 50 }));
        }}
      />
      <JonesSectionHeader title={t('panelBank.loans')} />
      <JonesMenuItem
        label={t('panelBank.theBroker')}
        darkText
        largeText
        onClick={() => setView('broker')}
      />
      <JonesMenuItem
        label={player.loanAmount > 0 ? `${t('panelBank.loanSystem')} (${player.loanAmount}g)` : t('panelBank.loanSystem')}
        darkText
        largeText
        onClick={() => setView('loans')}
      />
    </div>
  );
}
