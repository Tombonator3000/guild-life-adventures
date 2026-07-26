# Phase 16Y – Truth, Onboarding & Release Safety

## Item 1: Rules Truth Pass

Date: 26 July 2026

## Purpose

Make player-facing explanations follow the current executable game rules. Old roadmap notes, previous manuals and historical comments were treated as evidence only. TypeScript data, goal calculators and authoritative store services were treated as the source of truth.

## Main discrepancies found

### Starvation and healer visits

Old tutorial/manual copy claimed starvation always caused direct Health and Happiness loss.

Current behavior:

- no food at turn start removes 20 hours;
- there is a 25% chance of a healer visit;
- that visit removes another 10 hours and 4 Happiness and charges 30–200g;
- starvation itself has no guaranteed direct Health penalty.

Authoritative source: `src/store/helpers/startTurnHelpers.ts`.

### Movement

Old project history described a clockwise/counter-clockwise direction prompt.

Current behavior:

- the shortest route is selected;
- a normal board step costs one hour before weather modifiers;
- when the player lacks enough time, partial travel uses all remaining time.

Authoritative sources: `src/hooks/useLocationClick.ts`, `src/data/locations.ts` and travel services.

### Wealth and finance

Old copy still described a generic Investments account.

Current active model:

- Wealth uses cash, Savings and current Broker portfolio value, minus loan debt;
- progress is measured beyond the 100g starting position;
- The Broker handles individual shares and Crown Bonds;
- fractional dividends carry forward until whole gold can be paid;
- Crown Bonds have fixed price and a 3% selling fee;
- the old `investments` field remains only for save/protocol compatibility and is migrated to Savings.

Authoritative sources: `src/lib/calculateGoalProgress.ts`, `src/data/stocks.ts`, `src/store/helpers/economy/financeServiceHelpers.ts` and the legacy finance migration.

### Lottery

Several purchase surfaces promised a 5,000g grand prize.

Current behavior:

- grand prize: 500g;
- small prize: 20g;
- each ticket is an independent draw at week end.

Authoritative source: `src/store/helpers/weekEndHelpers.ts`.

### Newspaper

Historical text placed the newspaper at the Shadow Market or failed to explain reopening.

Current player flow:

- buy The Guildholm Herald at the General Store;
- it opens after purchase;
- it can be reread without another charge during the same week;
- ownership resets when the next week begins.

Authoritative sources: `src/components/game/GeneralStorePanel.tsx`, `src/store/helpers/economy/serviceHelpers.ts` and `src/store/helpers/weekEndHelpers.ts`.

### Food and appliances

Old copy mixed regular food, fresh-food units and appliance effects.

Current behavior documented in this pass:

- regular food drains by 35 each week;
- a working Preservation Box stores 6 fresh-food units;
- a working Frost Chest raises storage to 12;
- a working Cooking Fire adds 3 regular food at turn start;
- store-bought food without working preservation can trigger a 55% sickness check;
- appliances only roll for breakage while the player carries more than 500g;
- repairs are not charged automatically.

Authoritative sources: `src/store/helpers/startTurnHelpers.ts`, `src/store/helpers/weekEndHelpers.ts`, `src/data/items.ts` and `src/types/game.types.ts`.

### Career, Education and Adventure

Corrected goal explanations:

- Career is current Dependability while employed and 0 while unemployed;
- each completed degree is worth 9 Education points;
- normal courses use ten six-hour sessions, reducible to eight with all extra-credit items;
- Adventure is completed regular quests plus unique dungeon floors cleared;
- bounties and quest-chain progress do not directly add to the Adventure victory value.

Authoritative sources: `src/lib/calculateGoalProgress.ts` and `src/data/education.ts`.

## Implementation

### Canonical player-facing rules

Added `src/data/playerFacingRules.ts`.

It imports existing exported engine constants wherever possible and exposes focused player-facing values and sentences for tutorial, manual, setup and purchase previews. It deliberately does not become a second game engine.

### Goal helpers

`src/lib/calculateGoalProgress.ts` now exports canonical helpers for:

- total Wealth;
- Education value;
- Career value;
- Adventure value.

The main progress calculation uses those helpers.

### Player-facing surfaces corrected

- `src/components/game/TutorialOverlay.tsx`
- `src/components/game/UserManual.tsx`
- `src/components/screens/GameSetup.tsx`
- `src/components/game/GeneralStorePanel.tsx`
- `src/components/game/ShadowMarketPanel.tsx`
- `src/components/game/InfoTabs.tsx`

The tutorial remains a nine-step text overlay in this item. Interactive first-turn onboarding belongs to the later onboarding item and is not claimed here.

### Regression coverage

Added `src/test/rulesTruth.test.ts` covering:

- starvation explanation versus the engine path;
- the current Wealth formula and debt subtraction;
- Career, Education and Adventure helper values;
- removal of active retired-account wording;
- General Store newspaper purchase and free rereading;
- shortest-route and partial-travel wording;
- actual lottery prizes on active purchase surfaces.

## Remaining ambiguities and later work

1. Several historical/compatibility functions still retain the old `investments` field. They must remain until old-save and network compatibility can be removed through a separate versioned migration decision.
2. Some balance constants remain private inside store helper files. Source-guard tests protect the player-facing mirror for now. A later architecture pass may export more of those constants directly from focused domain modules.
3. The service layer still recognizes a Shadow Market newspaper vendor for protocol compatibility, but the active readable player flow is the General Store.
4. Long-form translated rule prose has not been expanded in this pass. Canonical English gameplay explanations are now accurate; future localization work should translate the canonical meaning rather than reintroducing independent numeric copy.
5. Interactive onboarding, contextual highlights and a guided first turn are not part of this item.

## Validation requirement

The branch/PR must pass:

- frozen Bun install;
- TypeScript;
- full Vitest suite;
- production build;
- ESLint;
- Playwright browser tests.

Validation results are recorded in the pull request after GitHub Actions completes.
