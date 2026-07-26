# Fase 16X – Broker consolidation and newspaper restoration

Date: 26 July 2026

## Problems

- The generic Investments account duplicated The Broker while offering fewer choices.
- Small stock dividends were rounded down every week and could remain at 0g indefinitely.
- Buying The Guildholm Herald set `hasNewspaper`, but NewspaperModal was no longer mounted, so the paper could not be read.

## Changes

- The Broker is now the only current investment entry point.
- Removed the generic Investments balance and deposit/withdraw controls from BankPanel.
- Kept `manageInvestment` as a recognized online compatibility request for older clients, but the authoritative host action always rejects it, performs no mutation, and directs players to The Broker.
- A gameplay migration hook moves any legacy Investments balance 1:1 into Savings as soon as loaded gameplay state appears. No old 10% withdrawal fee is charged.
- Preserved the four current securities, price model, economy influence, crashes, and Crown Bonds' 3% selling fee.
- Added Buy 1, Buy 5, Buy Max, Sell 1, and Sell All controls.
- Broker rows now show exact per-share dividend accrual, owned shares, position value, risk, price change, and sparkline.
- Fractional dividends are retained as a hidden negative microgold reserve inside the serialized stock portfolio. The reserve survives save/load and network sync, is ignored by portfolio value and trading, and is not treated as a positive holding during debt seizure.
- Whole gold is paid at week end through the existing dividend processor; fractional remainder carries into later weeks.
- Restored NewspaperModal inside GeneralStorePanel.
- Purchasing the paper opens it automatically.
- After purchase the item becomes `Read The Guildholm Herald`, with unlimited rereading during that week and no second charge.
- A false-to-true `hasNewspaper` state sync also opens the paper for online guests, while mounting with an already-owned paper does not auto-open it.
- Newspaper generation uses current week, price modifier, economy trend, and personalized weekly events, cached per player/week/session.
- Updated What's New.

## Tests

Focused tests cover:

- legacy balance migration without a fee;
- retired investment action and protocol-safe online compatibility;
- bulk share trading and Crown Bond selling fee;
- combined fractional dividends, carried credit, exact payout/remainder, and empty portfolios;
- newspaper purchase/open, free reread, and online state-sync opening.

## Validation

GitHub Actions run `30210903935` completed successfully:

- dependency install: passed;
- TypeScript: passed;
- full Vitest suite: 685 tests passed;
- production build: passed;
- ESLint: passed;
- Playwright/Chromium setup: passed;
- deterministic browser smoke and complete local gameplay flow: passed.

A final locked validation run on this documentation commit is required before merge.
