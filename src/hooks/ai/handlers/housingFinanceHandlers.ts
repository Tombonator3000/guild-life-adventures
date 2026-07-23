/**
 * AI Action Handlers — Housing, Rent, Banking & Finance
 *
 * Handles: pay-rent, move-housing, downgrade-housing,
 *          deposit-bank, withdraw-bank, take-loan, repay-loan,
 *          buy-stock, sell-stock
 */

import type { Player, HousingTier } from '@/types/game.types';
import { LOAN_MIN_SHIFTS_REQUIRED } from '@/types/game.types';

import type { AIAction } from '../types';
import type { StoreActions } from '../actionExecutor';

// ─── Housing & Rent ─────────────────────────────────────────────────────

export function handlePayRent(player: Player, _action: AIAction, store: StoreActions): boolean {
  if (player.housing === 'homeless') return false;
  const result = store.payHousingRent(player.id, 1);
  return result?.success ?? false;
}

export function handleMoveHousing(player: Player, action: AIAction, store: StoreActions): boolean {
  const tier = action.details?.tier as HousingTier;
  if (!tier) return false;
  const result = store.moveHousingAtLandlord(player.id, tier);
  return result?.success ?? false;
}

export function handleDowngradeHousing(player: Player, action: AIAction, store: StoreActions): boolean {
  const tier = action.details?.tier as HousingTier;
  if (!tier) return false;
  const result = store.moveHousingAtLandlord(player.id, tier);
  return result?.success ?? false;
}

// ─── Banking & Finance ──────────────────────────────────────────────────

export function handleDepositBank(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || 100;
  if (player.gold < amount) return false;
  const result = store.transferBankFunds(player.id, 'deposit', amount);
  return result?.success ?? false;
}

export function handleWithdrawBank(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || 100;
  if (player.savings < amount) return false;
  const result = store.transferBankFunds(player.id, 'withdraw', Math.min(amount, player.savings));
  return result?.success ?? false;
}

export function handleTakeLoan(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || 200;
  if (player.loanAmount > 0) return false;
  if ((player.totalShiftsWorked || 0) < LOAN_MIN_SHIFTS_REQUIRED) return false; // Job history
  const result = store.manageLoan(player.id, 'borrow', amount);
  return result?.success ?? false;
}

export function handleRepayLoan(player: Player, action: AIAction, store: StoreActions): boolean {
  const amount = (action.details?.amount as number) || player.loanAmount;
  if (player.loanAmount <= 0 || player.gold < amount) return false;
  const result = store.manageLoan(player.id, 'repay', amount);
  return result?.success ?? false;
}

export function handleBuyStock(player: Player, action: AIAction, store: StoreActions): boolean {
  const stockId = action.details?.stockId as string;
  const shares = (action.details?.shares as number) || 5;
  if (!stockId) return false;
  const result = store.tradeStock(player.id, 'buy', stockId, shares);
  return result?.success ?? false;
}

export function handleSellStock(player: Player, action: AIAction, store: StoreActions): boolean {
  const stockId = action.details?.stockId as string;
  const shares = (action.details?.shares as number) || 5;
  if (!stockId || !player.stocks[stockId] || player.stocks[stockId] < shares) return false;
  const result = store.tradeStock(player.id, 'sell', stockId, shares);
  return result?.success ?? false;
}
