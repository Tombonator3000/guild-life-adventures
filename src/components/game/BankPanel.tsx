import { useState } from 'react';
import type { Player } from '@/types/game.types';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';
import { STOCKS, calculateStockValue, calculateDividendAccrual, getStoredDividendCredit, previewDividendSettlement, getSellPrice } from '@/data/stocks';
import { LOAN_PRODUCTS } from '@/store/helpers/economy/financeServiceHelpers';
import { useGameStore } from '@/store/gameStore';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import './playability.css';
import './player-experience.css';

export type BankView = 'banking' | 'broker' | 'loans' | 'overview';
interface BankPanelProps {
  player: Player;
  priceModifier?: number;
  stockPrices: Record<string, number>;
  stockPriceHistory?: Record<string, number[]>;
  section?: BankView;
}

export function BankPanel({ player, priceModifier = 1, stockPrices, stockPriceHistory, section = 'banking' }: BankPanelProps) {
  const transfer = useGameStore(s => s.transferBankFunds);
  const trade = useGameStore(s => s.tradeStock);
  const loan = useGameStore(s => s.manageLoan);
  const [amount, setAmount] = useState('50');
  const [selectedStock, setSelectedStock] = useState(STOCKS[0].id);
  const [loanAmount, setLoanAmount] = useState<number>(100);
  const [receipt, setReceipt] = useState('');
  const [showSettlement, setShowSettlement] = useState(false);
  const report = (result: { success: boolean; message: string } | void) => {
    if (result) setReceipt(result.message);
  };
  const value = Number(amount);
  const valid = Number.isSafeInteger(value) && value > 0 && value <= 1_000_000;
  const stockValue = calculateStockValue(player.stocks, stockPrices);
  const weeklyAccrual = calculateDividendAccrual(player.stocks, stockPrices);
  const wealth = player.gold + player.savings + (player.investments ?? 0) + stockValue - player.loanAmount;
  const balances = <div className="bank-balances"><span>Cash <strong>{player.gold}g</strong></span><span>Savings <strong>{player.savings}g</strong></span></div>;

  if (section === 'banking') return <section className="bank-service" aria-label="Bank transfers">
    {balances}
    <label className="bank-amount">Amount <input aria-label="Transfer amount" inputMode="numeric" type="number" min="1" max="1000000" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
    <div className="bank-actions">
      <button disabled={!valid || player.gold < value} onClick={() => report(transfer(player.id, 'deposit', value))}>Deposit {valid ? value : ''} Gold</button>
      <button disabled={!valid || player.savings < value} onClick={() => report(transfer(player.id, 'withdraw', value))}>Withdraw {valid ? value : ''} Gold</button>
    </div>
    <p className="bank-help" role="status">{!valid ? 'Choose a positive whole amount, up to 1,000,000g.' : `Deposit: ${player.gold >= value ? `${player.gold - value}g cash · ${player.savings + value}g savings` : `needs ${value}g cash`}. Withdraw: ${player.savings >= value ? `${player.gold + value}g cash` : `needs ${value}g savings`}.`}</p>
    {receipt && <p className="bank-receipt" role="status">{receipt}</p>}
    <p className="bank-note">Transfers take 0h and keep your total wealth unchanged.</p>
  </section>;

  if (section === 'broker') {
    const stock = STOCKS.find(s => s.id === selectedStock) ?? STOCKS[0];
    const price = stockPrices[stock.id];
    const ready = Number.isSafeInteger(price) && price > 0;
    const owned = player.stocks[stock.id] ?? 0;
    const maxBuy = ready ? Math.min(100_000, Math.floor(player.gold / price)) : 0;
    const history = stockPriceHistory?.[stock.id] ?? [];
    const previous = history.length >= 2 ? history[history.length - 2] : stock.basePrice;
    const settlement = player.weeklySnapshots?.at(-1);
    return <section className="bank-service" aria-label="The Broker">
      <div className="bank-amount">Company <select aria-label="Broker company" value={stock.id} onChange={e => setSelectedStock(e.target.value)}>{STOCKS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        {settlement?.dividendsPaid !== undefined && <button className="dividend-receipt-trigger" aria-label="View last dividend settlement" onClick={() => setShowSettlement(true)}>Receipt<br />+{settlement.dividendsPaid}g</button>}
      </div>
      <div className="bank-balances"><span>Price <strong>{ready ? `${price}g` : 'Unavailable'}</strong></span><span>Owned <strong>{owned}</strong></span><span>Cash <strong>{player.gold}g</strong></span></div>
      <p className="bank-help">{stock.isTBill ? 'Fixed price' : ready ? `${price - previous >= 0 ? '+' : ''}${price - previous}g since previous quote · ${stock.volatility > .25 ? 'High' : stock.volatility > .15 ? 'Medium' : 'Low'} risk` : 'Wait for a market quote'}. {ready && `Dividend accrual: ${(price * stock.dividendRate).toFixed(2)}g/share/week.`}</p>
      <div className="bank-actions bank-trades">
        <button disabled={maxBuy < 1} onClick={() => report(trade(player.id, 'buy', stock.id, 1))}>Buy 1 · {ready ? price : '—'}g</button>
        <button disabled={maxBuy < 5} onClick={() => report(trade(player.id, 'buy', stock.id, 5))}>Buy 5 · {ready ? price * 5 : '—'}g</button>
        <button disabled={maxBuy < 1} onClick={() => report(trade(player.id, 'buy', stock.id, maxBuy))}>Buy Max ({maxBuy})</button>
        <button disabled={!ready || owned < 1} onClick={() => report(trade(player.id, 'sell', stock.id, 1))}>Sell 1 · {ready ? getSellPrice(stock.id, 1, price) : '—'}g</button>
        <button disabled={!ready || owned < 1} onClick={() => report(trade(player.id, 'sell', stock.id, owned))}>Sell All ({owned})</button>
      </div>
      {receipt && <p className="bank-receipt" role="status">{receipt}</p>}
      {settlement?.dividendsPaid !== undefined && <Dialog open={showSettlement} onOpenChange={setShowSettlement}>
        <DialogContent className="max-w-md bg-parchment text-[#402d19]">
          <DialogTitle>Week {settlement.week} dividend settlement</DialogTitle>
          <DialogDescription className="text-[#665138]">+{settlement.dividendsPaid}g paid to your cash balance.</DialogDescription>
          <dl className="settlement-lines">
            <div><dt>Opening cash</dt><dd>{settlement.openingGold}g</dd></div>
            <div><dt>Stock dividends</dt><dd>+{settlement.dividendsPaid}g</dd></div>
            <div><dt>Other weekend changes</dt><dd>{(settlement.otherGoldChange ?? 0) >= 0 ? '+' : '−'}{Math.abs(settlement.otherGoldChange ?? 0)}g</dd></div>
            <div><dt>Cash after settlement</dt><dd>{settlement.gold}g</dd></div>
          </dl>
          <p className="text-sm">Later purchases, income and turn-start events change your current cash balance.</p>
        </DialogContent>
      </Dialog>}
    <p className="bank-note">Trades take 0h. Sale proceeds include fees. Fractional dividends carry forward.</p>
    </section>;
  }

  if (section === 'loans') {
    const debt = player.loanAmount;
    const hasHistory = (player.totalShiftsWorked ?? 0) >= LOAN_MIN_SHIFTS_REQUIRED;
    const repayment = valid ? Math.min(value, debt) : 0;
    return <section className="bank-service" aria-label="Bank loans">
      <div className="bank-balances"><span>Debt <strong>{debt}g</strong></span><span>Rate <strong>{(10 * priceModifier).toFixed(1)}%/wk</strong></span>{debt > 0 && <span>Due <strong>{player.loanWeeksRemaining}w</strong></span>}</div>
      {debt > 0 ? <>
        <label className="bank-amount">Repayment <input aria-label="Repayment amount" type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <div className="bank-actions"><button disabled={!valid || player.gold < repayment} onClick={() => report(loan(player.id, 'repay', repayment))}>Repay {repayment}g</button><button disabled={player.gold < debt} onClick={() => report(loan(player.id, 'repay', 'all'))}>Repay All ({debt}g)</button></div>
        <p className="bank-help">{valid && player.gold >= repayment ? `After repayment: ${debt - repayment}g debt · ${player.gold - repayment}g cash.` : 'Choose an amount you can cover with cash.'}</p>
      </> : <>
        <label className="bank-amount">Loan <select aria-label="Loan amount" value={loanAmount} onChange={e => setLoanAmount(Number(e.target.value))}>{LOAN_PRODUCTS.map(n => <option key={n} value={n}>{n}g</option>)}</select></label>
        <button className="bank-primary" disabled={!hasHistory} onClick={() => report(loan(player.id, 'borrow', loanAmount))}>Borrow {loanAmount}g</button>
        <p className="bank-help">{hasHistory ? `After borrowing: ${player.gold + loanAmount}g cash, ${loanAmount}g debt. Due in 8 weeks.` : `Work ${LOAN_MIN_SHIFTS_REQUIRED} shifts first (${player.totalShiftsWorked ?? 0}/${LOAN_MIN_SHIFTS_REQUIRED}).`}</p>
      </>}
      {receipt && <p className="bank-receipt" role="status">{receipt}</p>}
    <p className="bank-note">0h service. Interest compounds weekly; rates follow the market. Borrowing does not increase net wealth.</p>
    </section>;
  }

  return <section className="bank-service" aria-label="Financial overview">
    {balances}
    <dl className="bank-overview">
      <div><dt>Portfolio</dt><dd>{stockValue}g</dd></div><div><dt>Loan debt</dt><dd>−{player.loanAmount}g</dd></div>
      <div><dt>Total wealth</dt><dd>{wealth}g</dd></div><div><dt>Savings rate</dt><dd>{(.1 * priceModifier).toFixed(2)}%/wk</dd></div>
      <div><dt>Dividend accrual</dt><dd>{weeklyAccrual.toFixed(2)}g/wk</dd></div><div><dt>Stored credit</dt><dd>{getStoredDividendCredit(player.stocks).toFixed(2)}g</dd></div>
      <div><dt>Next dividend at current prices</dt><dd>{previewDividendSettlement(player.stocks, stockPrices).payment}g</dd></div>
    </dl>
  </section>;
}
