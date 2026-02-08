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

interface BankPanelProps {
  player: Player;
  spendTime?: (playerId: string, hours: number) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
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
  invest,
  buyStock,
  sellStock,
  takeLoan,
  repayLoan,
  stockPrices,
}: BankPanelProps) {
  const [view, setView] = useState<BankView>('main');

  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const totalWealth = player.gold + player.savings + player.investments + stockValue - player.loanAmount;

  if (view === 'broker') {
    return (
      <div>
        <div className="text-center mb-2">
          <div className="font-display text-sm font-bold text-[#3d2a14]">The Broker</div>
          <div className="text-xs text-[#6b5a42]">Realm Investments</div>
        </div>
        <JonesInfoRow label="Portfolio Value:" value={`${stockValue}g`} darkText largeText />
        <JonesInfoRow label="Cash:" value={`${player.gold}g`} darkText largeText />

        <JonesSectionHeader title="AVAILABLE STOCKS" />
        {STOCKS.map(stock => {
          const price = stockPrices[stock.id] || stock.basePrice;
          const owned = player.stocks[stock.id] || 0;
          const canBuy = player.gold >= price;
          const canSell = owned > 0;

          return (
            <div key={stock.id} className="px-2 py-1.5 border-b border-[#8b7355]">
              <div className="flex justify-between items-baseline font-mono text-sm">
                <span className="text-[#3d2a14]">{stock.name}</span>
                <span className="text-[#c9a227] font-bold">{price}g</span>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <span className="text-xs text-[#6b5a42]">
                  {stock.isTBill ? 'Safe (3% sell fee)' : `Risk: ${stock.volatility > 0.25 ? 'High' : stock.volatility > 0.15 ? 'Med' : 'Low'}`}
                  {owned > 0 && ` | Own: ${owned}`}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      buyStock(player.id, stock.id, 1);
                      toast.success(`Bought 1 share of ${stock.name}!`);
                    }}
                    disabled={!canBuy}
                    className="text-xs px-2 py-0.5 bg-[#2a5c3a] text-white rounded disabled:opacity-40"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => {
                      sellStock(player.id, stock.id, 1);
                      const sellPrice = stock.isTBill ? Math.floor(price * 0.97) : price;
                      toast.success(`Sold 1 share for ${sellPrice}g!`);
                    }}
                    disabled={!canSell}
                    className="text-xs px-2 py-0.5 bg-[#8b4a4a] text-white rounded disabled:opacity-40"
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="mt-2 text-xs text-[#6b5a42] px-2">
          No time cost. Crown Bonds never lose value.
        </div>
        <div className="mt-2 px-2">
          <JonesButton label="BACK" onClick={() => setView('main')} variant="secondary" />
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
          <div className="font-display text-sm font-bold text-[#3d2a14]">Loan Office</div>
          <div className="text-xs text-[#6b5a42]">Gold Lending Services</div>
        </div>
        {hasLoan ? (
          <>
            <JonesInfoRow label="Outstanding Loan:" value={`${player.loanAmount}g`} valueClass="text-red-600" darkText largeText />
            <JonesInfoRow label="Weeks Remaining:" value={`${player.loanWeeksRemaining}`} darkText largeText />
            <JonesInfoRow label="Weekly Interest:" value="10%" darkText largeText />

            <JonesSectionHeader title="REPAY LOAN" />
            {[50, 100, 250].map(amount => {
              const actual = Math.min(amount, player.loanAmount);
              return (
                <JonesMenuItem
                  key={amount}
                  label={`Repay ${actual}g`}
                  disabled={player.gold < actual || player.loanAmount <= 0}
                  darkText
                  largeText
                  onClick={() => {
                    repayLoan(player.id, actual);
                    toast.success(`Repaid ${actual}g on your loan!`);
                  }}
                />
              );
            })}
            <JonesMenuItem
              label={`Repay All (${player.loanAmount}g)`}
              disabled={player.gold < player.loanAmount}
              darkText
              largeText
              onClick={() => {
                repayLoan(player.id, player.loanAmount);
                toast.success('Loan fully repaid!');
              }}
            />
          </>
        ) : (
          <>
            <div className="text-sm text-[#6b5a42] px-2 mb-2">
              Borrow gold at 10% weekly interest. Repay within 8 weeks or face forced collection.
            </div>
            <JonesSectionHeader title="LOAN AMOUNTS" />
            {loanAmounts.map(amount => (
              <JonesMenuItem
                key={amount}
                label={`Borrow ${amount}g`}
                price={amount}
                darkText
                largeText
                onClick={() => {
                  takeLoan(player.id, amount);
                  toast.success(`Loan of ${amount}g approved! Repay within 8 weeks.`);
                }}
              />
            ))}
          </>
        )}
        <div className="mt-2 text-xs text-[#6b5a42] px-2">
          {hasLoan ? 'Unpaid loans accrue 10% interest weekly. No time cost.' : 'Only one loan at a time. 10% weekly interest. No time cost.'}
        </div>
        <div className="mt-2 px-2">
          <JonesButton label="BACK" onClick={() => setView('main')} variant="secondary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <JonesInfoRow label="Cash:" value={`${player.gold}g`} darkText largeText />
      <JonesInfoRow label="Savings:" value={`${player.savings}g`} darkText largeText />
      <JonesInfoRow label="Investments:" value={`${player.investments}g`} darkText largeText />
      {stockValue > 0 && <JonesInfoRow label="Stocks:" value={`${stockValue}g`} darkText largeText />}
      {player.loanAmount > 0 && <JonesInfoRow label="Loan Debt:" value={`-${player.loanAmount}g`} valueClass="text-red-600" darkText largeText />}
      <JonesInfoRow label="Net Wealth:" value={`${totalWealth}g`} valueClass="text-[#c9a227] font-bold" darkText largeText />

      <JonesSectionHeader title="BANKING SERVICES" />
      <JonesMenuItem
        label="Deposit 50 Gold"
        price={50}
        disabled={player.gold < 50}
        darkText
        largeText
        onClick={() => {
          depositToBank(player.id, 50);
          toast.success('Deposited 50 gold!');
        }}
      />
      <JonesMenuItem
        label="Withdraw 50 Gold"
        disabled={player.savings < 50}
        darkText
        largeText
        onClick={() => {
          withdrawFromBank(player.id, 50);
          toast.success('Withdrew 50 gold!');
        }}
      />
      <JonesMenuItem
        label="Invest 100 Gold"
        price={100}
        disabled={player.gold < 100}
        darkText
        largeText
        onClick={() => {
          invest(player.id, 100);
          toast.success('Invested 100 gold!');
        }}
      />

      <JonesSectionHeader title="SERVICES" />
      <JonesMenuItem
        label="See the Broker (Stocks)"
        darkText
        largeText
        onClick={() => setView('broker')}
      />
      <JonesMenuItem
        label={player.loanAmount > 0 ? `Loan Office (Owe: ${player.loanAmount}g)` : 'Loan Office'}
        darkText
        largeText
        onClick={() => setView('loans')}
      />

      <div className="mt-2 text-xs text-[#6b5a42] px-2">
        Banking services are free — no time cost.
      </div>
    </div>
  );
}
