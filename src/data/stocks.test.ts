import { describe, expect, it } from 'vitest';
import {
  calculateDividendAccrual,
  calculateDividends,
  getStoredDividendCredit,
  previewDividendSettlement,
} from './stocks';

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

  it('carries unpaid credit across weekly settlements', () => {
    const portfolio = { 'crystal-mine': 1, 'potion-guild': 1 };
    expect(calculateDividends(portfolio, prices)).toBe(0);
    expect(getStoredDividendCredit(portfolio)).toBeCloseTo(0.95);

    expect(calculateDividends(portfolio, prices)).toBe(1);
    expect(getStoredDividendCredit(portfolio)).toBeCloseTo(0.9);
  });

  it('previews a whole-gold payout and exact remainder without mutating', () => {
    const portfolio = { 'crown-bonds': 2, '__dividend-credit-microgold': -400_000 };
    expect(previewDividendSettlement(portfolio, prices)).toEqual({ accrual: 2, payment: 2, credit: 0.4 });
    expect(portfolio['__dividend-credit-microgold']).toBe(-400_000);
  });

  it('does not create a payout or reserve for an empty portfolio', () => {
    const portfolio: Record<string, number> = {};
    expect(calculateDividends(portfolio, prices)).toBe(0);
    expect(portfolio).toEqual({});
  });
});
