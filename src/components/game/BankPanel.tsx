import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { STOCKS, calculateStockValue } from '@/data/stocks';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { toast } from 'sonner';

interface BankPanelProps {
  player: Player;
  spendTime: (playerId: string, hours: number) => void;
  depositToBank: (playerId: string, amount: number) => void;
  withdrawFromBank: (playerId: string, amount: number) => void;
  invest: (playerId: string, amount: number) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
  buyStock: (playerId: string, stockId: string, shares: number) => void;
  sellStock: (playerId: string, stockId: string, shares: number) => void;
  takeLoan: (playerId: string, amount: number) => void;
  repayLoan: (playerId: string, amount: number) => void;
  stockPrices: Record<string, number>;
}

type BankView = 'main' | 'broker' | 'loans';

export function BankPanel({
  player,
  spendTime,
  depositToBank,
  withdrawFromBank,
  invest,
  workShift,
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
      <JonesPanel>
        <JonesPanelHeader title="The Broker" subtitle="Realm Investments" />
        <JonesPanelContent>
          <JonesInfoRow label="Portfolio Value:" value={`${stockValue}g`} />
          <JonesInfoRow label="Cash:" value={`${player.gold}g`} />

          <JonesSectionHeader title="AVAILABLE STOCKS" />
          {STOCKS.map(stock => {
            const price = stockPrices[stock.id] || stock.basePrice;
            const owned = player.stocks[stock.id] || 0;
            const canBuy = player.gold >= price && player.timeRemaining >= 2;
            const canSell = owned > 0 && player.timeRemaining >= 2;

            return (
              <div key={stock.id} className="px-2 py-1.5 border-b border-[#5c4a32]">
                <div className="flex justify-between items-baseline font-mono text-sm">
                  <span className="text-[#e0d4b8]">{stock.name}</span>
                  <span className="text-gold font-bold">{price}g</span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs text-[#8b7355]">
                    {stock.isTBill ? 'Safe (3% sell fee)' : `Risk: ${stock.volatility > 0.25 ? 'High' : stock.volatility > 0.15 ? 'Med' : 'Low'}`}
                    {owned > 0 && ` | Own: ${owned}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        buyStock(player.id, stock.id, 1);
                        spendTime(player.id, 2);
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
                        spendTime(player.id, 2);
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
          <div className="mt-2 text-xs text-[#8b7355] px-2">
            2 hours per transaction. Crown Bonds never lose value.
          </div>
          <div className="mt-2 px-2">
            <JonesButton label="BACK" onClick={() => setView('main')} variant="secondary" />
          </div>
        </JonesPanelContent>
      </JonesPanel>
    );
  }

  if (view === 'loans') {
    const loanAmounts = [100, 250, 500, 1000];
    const hasLoan = player.loanAmount > 0;

    return (
      <JonesPanel>
        <JonesPanelHeader title="Loan Office" subtitle="Gold Lending Services" />
        <JonesPanelContent>
          {hasLoan ? (
            <>
              <JonesInfoRow label="Outstanding Loan:" value={`${player.loanAmount}g`} valueClass="text-red-400" />
              <JonesInfoRow label="Weeks Remaining:" value={`${player.loanWeeksRemaining}`} />
              <JonesInfoRow label="Weekly Interest:" value="10%" />

              <JonesSectionHeader title="REPAY LOAN" />
              {[50, 100, 250].map(amount => {
                const actual = Math.min(amount, player.loanAmount);
                return (
                  <JonesMenuItem
                    key={amount}
                    label={`Repay ${actual}g`}
                    disabled={player.gold < actual || player.loanAmount <= 0}
                    onClick={() => {
                      repayLoan(player.id, actual);
                      spendTime(player.id, 1);
                      toast.success(`Repaid ${actual}g on your loan!`);
                    }}
                  />
                );
              })}
              <JonesMenuItem
                label={`Repay All (${player.loanAmount}g)`}
                disabled={player.gold < player.loanAmount}
                onClick={() => {
                  repayLoan(player.id, player.loanAmount);
                  spendTime(player.id, 1);
                  toast.success('Loan fully repaid!');
                }}
              />
            </>
          ) : (
            <>
              <div className="text-sm text-[#a09080] px-2 mb-2">
                Borrow gold at 10% weekly interest. Repay within 8 weeks or face forced collection.
              </div>
              <JonesSectionHeader title="LOAN AMOUNTS" />
              {loanAmounts.map(amount => (
                <JonesMenuItem
                  key={amount}
                  label={`Borrow ${amount}g`}
                  price={amount}
                  disabled={player.timeRemaining < 1}
                  onClick={() => {
                    takeLoan(player.id, amount);
                    spendTime(player.id, 1);
                    toast.success(`Loan of ${amount}g approved! Repay within 8 weeks.`);
                  }}
                />
              ))}
            </>
          )}
          <div className="mt-2 text-xs text-[#8b7355] px-2">
            {hasLoan ? 'Unpaid loans accrue 10% interest weekly.' : 'Only one loan at a time. 10% weekly interest.'}
          </div>
          <div className="mt-2 px-2">
            <JonesButton label="BACK" onClick={() => setView('main')} variant="secondary" />
          </div>
        </JonesPanelContent>
      </JonesPanel>
    );
  }

  return (
    <JonesPanel>
      <JonesPanelHeader title="Bank" subtitle="Financial Services" />
      <JonesPanelContent>
        <JonesInfoRow label="Cash:" value={`${player.gold}g`} />
        <JonesInfoRow label="Savings:" value={`${player.savings}g`} />
        <JonesInfoRow label="Investments:" value={`${player.investments}g`} />
        {stockValue > 0 && <JonesInfoRow label="Stocks:" value={`${stockValue}g`} />}
        {player.loanAmount > 0 && <JonesInfoRow label="Loan Debt:" value={`-${player.loanAmount}g`} valueClass="text-red-400" />}
        <JonesInfoRow label="Net Wealth:" value={`${totalWealth}g`} valueClass="text-gold" />

        <JonesSectionHeader title="BANKING SERVICES" />
        <JonesMenuItem
          label="Deposit 50 Gold"
          price={50}
          disabled={player.gold < 50 || player.timeRemaining < 1}
          onClick={() => {
            depositToBank(player.id, 50);
            spendTime(player.id, 1);
            toast.success('Deposited 50 gold!');
          }}
        />
        <JonesMenuItem
          label="Withdraw 50 Gold"
          disabled={player.savings < 50 || player.timeRemaining < 1}
          onClick={() => {
            withdrawFromBank(player.id, 50);
            spendTime(player.id, 1);
            toast.success('Withdrew 50 gold!');
          }}
        />
        <JonesMenuItem
          label="Invest 100 Gold"
          price={100}
          disabled={player.gold < 100 || player.timeRemaining < 1}
          onClick={() => {
            invest(player.id, 100);
            spendTime(player.id, 1);
            toast.success('Invested 100 gold!');
          }}
        />

        <JonesSectionHeader title="SERVICES" />
        <JonesMenuItem
          label="See the Broker (Stocks)"
          disabled={player.timeRemaining < 2}
          onClick={() => setView('broker')}
        />
        <JonesMenuItem
          label={player.loanAmount > 0 ? `Loan Office (Owe: ${player.loanAmount}g)` : 'Loan Office'}
          disabled={player.timeRemaining < 1}
          onClick={() => setView('loans')}
        />

        <div className="mt-2 text-xs text-[#8b7355] px-2">
          1 hour per transaction, 2 hours for broker
        </div>

        {/* Work button for bank employees */}
        <WorkSection
          player={player}
          locationName="Bank"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
