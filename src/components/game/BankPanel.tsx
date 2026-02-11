import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { STOCKS, calculateStockValue } from '@/data/stocks';
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
}: BankPanelProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<BankView>('main');

  const stockValue = calculateStockValue(player.stocks, stockPrices);
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

        <JonesSectionHeader title={t('panelBank.availableStocks')} />
        {STOCKS.map(stock => {
          const price = stockPrices[stock.id] || stock.basePrice;
          const owned = player.stocks[stock.id] || 0;
          const canBuy = player.gold >= price;
          const canSell = owned > 0;

          return (
            <div key={stock.id} className="px-2 py-1.5 border-b border-[#8b7355]">
              <div className="flex justify-between items-baseline font-mono text-sm">
                <span className="text-[#3d2a14]">{t(`stocks.${stock.id}.name`) || stock.name}</span>
                <span className="text-[#c9a227] font-bold">{price}g</span>
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
                      const sellPrice = stock.isTBill ? Math.floor(price * 0.97) : price;
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
          {t('panelBank.sellFee')}
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
        ) : (
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
      {stockValue > 0 && <JonesInfoRow label={t('panelBank.availableStocks').charAt(0) + t('panelBank.availableStocks').slice(1).toLowerCase() + ':'} value={`${stockValue}g`} darkText largeText />}
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
