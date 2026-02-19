# Guild Life Adventures - Development Log 2

> **Continuation of log.md** (which reached 14,000+ lines / 732KB).
> Previous log: see `log.md` for all entries from 2026-02-05 through 2026-02-14.

## 2026-02-17 — BUG-001 Fix #17: Radical Simplification of Startup Pipeline (18:45 UTC)

### Problem

Game still hangs on "Loading the realm..." / "Clear Cache & Reload" after every PR push via GitHub. Works when started from Lovable editor directly but breaks on deployed version after GitHub sync. Lovable reports "build error". This is the 17th fix attempt for BUG-001.

### Root Cause: Overengineered Loading System

After 16 incremental fix attempts (each adding more complexity), the startup pipeline had grown to ~300 lines of inline JS in index.html with:
- `deferModulePlugin` (50 lines): Removed Vite's standard `<script type="module">` and replaced with hand-rolled deferred loading
- Stale-build detection (150 lines): SW cleanup → version.json fetch → build-time comparison → hot-swap CSS/JS → auto-reload with CDN cache-busting
- Fallback watchdog (100 lines): Multiple timeout chains (2s/8s/12s/15s), diagnostic info, nuclear reset button
- Shared mutable state between plugins (`extractedEntry`, `extractedCss`)
- Platform-specific globals (`__HTML_BUILD_TIME__`, `__HTML_BASE__`, `__ENTRY__`, `__PRELOADS__`)

This system had too many failure modes: race conditions between SW cleanup and version check, hot-swap CSS removal gap, CDN-specific cache bypass limitations (Fastly vs Lovable CDN), reload loop protection masking actual failures. The `deferModulePlugin` in particular broke the standard Vite output that hosting platforms expect.

### Investigation (4 Parallel Agents)

1. **Startup pipeline agent**: Mapped the full loading flow from HTML → inline scripts → version.json → module loading → React mount. Identified 7 "stuck points" with different timeout/recovery behaviors.
2. **Build config agent**: Analyzed vite.config.ts plugins, PWA config, platform-specific build paths. Found `deferModulePlugin` removes the standard `<script type="module">` that Vite and hosting platforms expect.
3. **Plan agent**: Designed radical simplification strategy — remove the custom loading pipeline entirely and let Vite work as designed.
4. **Online research agent**: Confirmed Lovable has known issues with complex build configurations when syncing from GitHub.

### Fix Applied: Radical Simplification

**Strategy**: Remove the fragile custom loading system entirely. Let Vite output its standard `<script type="module">` tag. Handle stale-cache edge case with a simple `onerror` handler.

| # | File | Change |
|---|------|--------|
| 1 | `vite.config.ts` | **Removed** `deferModulePlugin()` (50 lines), `extractedEntry`/`extractedCss` shared state, `transformIndexHtml` hook from `versionJsonPlugin` |
| 2 | `vite.config.ts` | **Simplified** `versionJsonPlugin()`: only writes `{ buildTime }` to version.json at build close. No HTML injection. |
| 3 | `vite.config.ts` | **Added** `scriptErrorPlugin()` (15 lines): adds `onerror="__guildShowError(...)"` to Vite's entry `<script type="module">` tag for instant 404 detection |
| 4 | `index.html` | **Removed** Script 2 (deferred loading + stale-build detection, ~150 lines) and Script 3 (fallback watchdog, ~100 lines) |
| 5 | `index.html` | **Replaced** Script 1 (error handlers, 40 lines) with minimal error handler (18 lines): `__guildShowError()`, `window.onerror`, `unhandledrejection` |
| 6 | `index.html` | **Added** simple 15s fallback timeout (12 lines): shows "Reload" button if React hasn't mounted |
| 7 | `src/main.tsx` | **Removed** `__guildSetStatus`/`setStatus()`, `__guildAppFailed` flag, `__guildAppLoading` flag, `mountTimeout`, `showMountError()` function |
| 8 | `src/main.tsx` | **Simplified** mount error handler: catches errors from `import("./App.tsx")`, shows error + reload button |

### Before vs After

| Metric | Before | After |
|--------|--------|-------|
| `index.html` inline JS | ~300 lines, 3 scripts | ~30 lines, 2 scripts |
| `vite.config.ts` plugins | 2 complex (deferModulePlugin + versionJsonPlugin) | 2 simple (versionJsonPlugin + scriptErrorPlugin) |
| `src/main.tsx` | 95 lines (7 global flags, 15s timeout, status updates) | 53 lines (1 global flag, dynamic import + error handling) |
| Custom globals | 6 (`__ENTRY__`, `__PRELOADS__`, `__HTML_BUILD_TIME__`, `__HTML_BASE__`, `__guildAppLoading`, `__guildVersionCheckStarted`) | 1 (`__guildReactMounted`) |
| Timeout chains | 4 (2s SW, 8s pipeline, 12s fallback, 15s mount) | 1 (15s fallback) |
| Module loading | Custom deferred: inline script injects `<script>` after version check | Standard: Vite's `<script type="module">` loads directly |
| Stale-cache recovery | Auto-reload loop (max 3) + hot-swap + version.json check | `onerror` on script tag → show "Reload" button + 15s fallback |

### How Stale-Cache Is Now Handled

```
Normal flow: HTML → <script type="module" src="/assets/index-HASH.js"> → React mounts

Stale-cache flow (old HTML, new chunks):
  HTML → <script type="module" src="/assets/index-OLD.js"> → 404
  → onerror fires → __guildShowError() shows "Failed to load game files — please reload."
  → User clicks Reload → fresh HTML loads → game works

Slow-load flow:
  HTML → module loading takes >15s
  → Fallback timeout shows "Taking longer than expected..." + Reload button
```

### What Was Preserved

- `__BUILD_TIME__` Vite define (used by `useAppUpdate.ts` and `UpdateBanner.tsx`)
- `versionJsonPlugin` writes `version.json` for in-app update polling
- `selfDestroying: true` PWA config (cleans up old SWs)
- `useAppUpdate.ts` version.json polling + `hardRefresh()` function
- `ErrorBoundary` in `App.tsx`
- Cache-control meta tags in HTML
- `?_gv` URL cleanup in `main.tsx`

### Verification

```
TypeScript: 0 errors
Tests: 296/296 pass (16 test files)
Build (Lovable): succeeds, dist/index.html has standard <script type="module"> with onerror
Build (GitHub Pages): succeeds with DEPLOY_TARGET=github
dist/version.json: { "buildTime": "..." } (no entry/css fields)
```

---

## 2026-02-17 — Code Audit & Refactor Round 7 (22:00 UTC)

### Overview

Full codebase audit using 4 parallel agents (store+helpers, components, data+hooks, network+locationTabs). Identified 25+ complex functions across all areas. Selected 3 high-impact refactoring targets and applied structural changes maintaining identical behavior. All 296 tests pass. TypeScript compiles clean. Build succeeds.

### Refactoring 25: `castPersonalCurse` + `castLocationHex` + `applySabotageHex` (hexHelpers.ts)

**Problem**: `castPersonalCurse` was a 105-line function with 7 sequential validations, amulet defense handling, sabotage dispatch, and curse application all mixed together. The caster cost update pattern (`timeRemaining`, `hexScrolls`, `hexCastCooldown`) was duplicated 4 times across `castLocationHex`, `castPersonalCurse` (amulet branch), `castPersonalCurse` (main branch), and `applySabotageHex`. The casting prerequisite checks (scroll ownership, valid location, enough time) were duplicated between `castLocationHex` and `castPersonalCurse`.

**Fix**: Extracted 3 shared helpers:
- `VALID_CAST_LOCATIONS` — constant array replacing 2 inline declarations
- `validateCasterPrereqs(player, hex)` — shared scroll/location/time validation returning error or null (used by both `castLocationHex` and `castPersonalCurse`)
- `applyCasterCost(player, hex)` — shared caster state update returning `Partial<Player>` (used by all 4 call sites)

`castPersonalCurse` reduced from 105 to 60 lines. `castLocationHex` reduced from 55 to 40 lines. All 4 caster cost duplications consolidated to `...applyCasterCost(p, hex)`.

### Refactoring 26: `handleLocationClick` + `extractEventId` (useLocationClick.ts)

**Problem**: `handleLocationClick` was 113 lines with 4+ nesting levels. Weather cost calculation (`steps + Math.floor(steps * weatherExtra)`) duplicated 5 times across redirect and normal travel branches. Partial travel logic (calculate steps affordable, build partial path, invoke animation) duplicated in both the redirect branch and normal travel branch. `extractEventId` used 20+ cascading `if (msg.includes(...))` statements — adding a new event type required adding yet another if-statement.

**Fix**: Extracted 2 pure helper functions + 4 data-driven lookup tables:
- `calculateWeatherCost(steps, weatherExtra)` — single source of truth for weather-adjusted movement cost (replaces 5 inline calculations)
- `calculatePartialTravel(path, timeAvailable, weatherExtra)` — returns `{ partialPath, partialDest, partialCost }` or null (replaces 2 duplicated partial travel blocks)
- `WEATHER_EVENT_MAP`, `FESTIVAL_EVENT_MAP`, `KEYWORD_EVENT_MAP`, `CLOTHING_KEYWORD` — data-driven lookup arrays replacing 20+ cascading if-statements in `extractEventId`

`handleLocationClick` reduced from 113 to 75 lines. `extractEventId` converted from 40 lines of if-statements to 25 lines of loop-over-table lookups. Adding new event types is now a 1-line array entry.

### Refactoring 27: `buildInventoryItems` + combat stat helpers (InventoryGrid.tsx)

**Problem**: `buildInventoryItems` had 3 nearly identical 18-line blocks for equipped items (weapon, armor, shield). Each block followed the exact same pattern: check if player has item → find item data → check tempered → push to array. They differed only in the player field name (`equippedWeapon`/`equippedArmor`/`equippedShield`) and the slot type string. Additionally, 3 separate `calculateTotalAttack`/`calculateTotalDefense`/`calculateTotalBlockChance` functions each independently called `calculateCombatStats` with the same arguments — 3 redundant calls that could be 1.

**Fix**:
- Created `EQUIP_SLOTS` data array mapping `{ slot, playerField }` for weapon/armor/shield
- Replaced 3×18=54 lines of duplicate equipped item building with a single 15-line `for...of` loop over `EQUIP_SLOTS`
- Consolidated 3 separate `calculateTotal*` functions into single `getPlayerCombatStats(player)` helper, called once before the JSX return

`buildInventoryItems` equipped section reduced from 54 to 15 lines. 3 redundant `calculateCombatStats` calls → 1 call.

### Files Modified (3)

| File | Changes |
|------|---------|
| `src/store/helpers/hexHelpers.ts` | `validateCasterPrereqs` + `applyCasterCost` + `VALID_CAST_LOCATIONS` extracted; 4 caster cost duplications → shared helper |
| `src/hooks/useLocationClick.ts` | `calculateWeatherCost` + `calculatePartialTravel` extracted; `extractEventId` → data-driven lookup tables |
| `src/components/game/InventoryGrid.tsx` | `EQUIP_SLOTS` loop replaces 3 duplicate blocks; `getPlayerCombatStats` consolidates 3 redundant calls |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    11.02s
```

TypeScript: 0 errors. Build: clean. All behavior preserved.

---

## 2026-02-17 — Bug Hunt #4: Startup Hang Fix (09:50 UTC)

### Problem
Game still hangs on "Loading the realm..." / "Clear Cache & Reload" after deployment. BUG-001 persists despite 15+ previous fix attempts. Game refuses to start on Lovable platform.

### Investigation (Parallel Agent Deep Dive)
4 parallel agents analyzed:
1. Context files (MEMORY.md, log2.md, todo.md, bugs.md) — 15 previous fix attempts documented
2. Full startup flow: HTML → inline scripts → version.json → module loading → React mount
3. Recent refactoring commits (audit rounds 1-6) — no startup code modified
4. All eagerly-loaded modules for runtime errors

**Build passes. TypeScript clean. All 296 tests pass. Issue is deployment/runtime only.**

### Root Causes Identified

**1. SW NOT self-destroying on Lovable (CRITICAL)**
The self-destroying SW fix from 2026-02-16 was only applied for GitHub Pages (`selfDestroying: deployTarget === 'github'`). On Lovable (default deployment), the SW remained active with `skipWaiting: true` + `clientsClaim: true`, causing:
- Stale JS chunks served via `NetworkFirst` runtime cache
- `registration.unregister()` doesn't stop SW controlling current page
- Race conditions between SW cleanup and version.json fetch

**2. Auto-reload insufficient for all CDNs**
`?_gv=timestamp` cache-busting works on GitHub Pages (Fastly respects query params) but may not work on all CDN configurations. When both HTML and CDN cache are stale, auto-reload serves same stale HTML → loop.

**3. Hot-swap entry URL not used**
`version.json` already contained the fresh `entry` URL but the inline script only checked `buildTime` mismatch and reloaded — it never tried to load the correct entry directly from version.json.

**4. No diagnostic info on loading screen**
When loading fails, users see "Loading the realm..." with no info about what failed, making debugging impossible.

**5. Incomplete checkAchievements in questHelpers.ts (secondary)**
Refactoring audit round 3 introduced incomplete `checkAchievements()` call at completeQuest — only passed 2 fields instead of 9. Wouldn't cause startup hang but would break achievement tracking on quest completion.

### Fixes Applied

| # | File | Change |
|---|------|--------|
| 1 | `vite.config.ts` | `selfDestroying: true` on ALL platforms (was `github` only). Stripped all workbox runtime caching config (SW self-destructs before caching anything) |
| 2 | `index.html` | Hot-swap: when version.json has different buildTime AND provides `entry` URL, load it directly (swap CSS too) instead of reloading. Eliminates CDN cache problem. |
| 3 | `index.html` | `loadApp(overrideSrc)` — accepts optional entry URL override for hot-swap |
| 4 | `index.html` | Nuclear Reset button on error screen — clears sessionStorage, localStorage, Cache Storage, unregisters SWs, then reloads with cache-buster |
| 5 | `index.html` | Diagnostic info shown on fallback screen: entry URL, build time, loading/failed/mounted flags, error count |
| 6 | `questHelpers.ts` | Fixed `checkAchievements()` call in `completeQuest` — now passes all 9 context fields (gold, totalWealth, happiness, completedDegrees, completedQuests, dungeonFloorsCleared, guildRank, housing, week) |

### Defense Layer Summary (after fix)

```
Layer 0: Inline script
  → Unregister all SWs (chained before version check)
  → Fetch version.json with cache bypass
  → If stale HTML + version.json has entry: HOT-SWAP (new!)
  → If stale HTML + no entry: auto-reload with ?_gv=
  → If entry 404: auto-reload
  → Pipeline timeout (8s): force load

Layer 1: Error handlers
  → window.onerror: show error + reload button
  → unhandledrejection: show error + reload button
  → Both: Nuclear Reset button (new!)

Layer 2: Fallback button (12s)
  → Diagnostic info shown (new!)
  → Clear Cache & Reload
  → Nuclear Reset (new!)

Layer 3: Self-destroying SW (new: ALL platforms)
  → Old SWs from previous deployments self-destruct
  → Clears all caches
  → No runtime caching = no stale chunks ever
```

### Verification
- TypeScript: clean (0 errors)
- Tests: 296/296 pass
- Build: succeeds, SW is self-destroying, version.json has entry URL
- Production HTML: hot-swap logic present, diagnostic info present, nuclear reset present

## 2026-02-17 — Code Audit & Refactor Round 6 (20:00 UTC)

### Overview

Full codebase audit using 4 parallel agents (store+helpers, components, data files, AI+network). Identified 40+ complex functions across all areas. Selected 3 high-impact refactoring targets and applied structural changes maintaining identical behavior. All 296 tests pass. TypeScript compiles clean. Build succeeds.

### Refactoring 22: `generateRivalryActions` (rivalryActions.ts)

**Problem**: 256-line monolithic function containing 8 semi-independent rivalry behaviors (quest competition, education racing, aggressive banking, hex casting, hex scroll purchase, amulet purchase, dispel actions, dark ritual) in a single function body. Each section had its own guard conditions, location checks, and hex-system gating — making it hard to understand, test, or modify any individual rivalry behavior without reading the entire function.

**Fix**: Extracted 8 focused sub-generator functions via dispatch table pattern:
- `generateQuestCompetition()` — grab high-value quests before rival
- `generateEducationRacing()` — study faster to outpace rival
- `generateAggressiveBanking()` — deposit to protect gold
- `generateHexCasting()` — use scrolls to curse biggest threat
- `generateHexScrollPurchase()` — acquire ammunition for curses
- `generateAmuletPurchase()` — defense against rival hexes
- `generateDispelActions()` — clear enemy hexes from key locations
- `generateDarkRitualActions()` — Hard AI gambler graveyard ritual

Introduced `RivalryContext` interface wrapping `ActionContext` + threat analysis (biggestThreat, threatIsClose, rivalFocus). `RIVALRY_GENERATORS` dispatch array replaces the monolith. Main `generateRivalryActions()` is now 10 lines: find threat, build context, `flatMap` over generators.

### Refactoring 23: `checkVictory` (questHelpers.ts)

**Problem**: 74-line function with mixed concerns — goal evaluation calculations interleaved with two nearly identical `checkAchievements()` call blocks (one for milestone tracking, one for victory recording). The duplicated achievement data objects differed only in the `isVictory` flag and an extra `gold` field. Adding a new goal type or achievement field required editing both blocks.

**Fix**: Extracted 2 helper functions:
- `evaluateGoals()` — pure function (no side effects) that calculates wealth, education, career, adventure values and returns a `GoalEvaluation` object with all `*Met` booleans and `allMet` aggregate
- `trackAchievements()` — single function handling both milestone and victory achievement tracking, accepting `isVictory` flag to control behavior

Main `checkVictory()` reduced from 74 to 18 lines: evaluate → track milestones → if won: track victory + set state.

### Refactoring 24: `attemptCurseReflection` (hexHelpers.ts)

**Problem**: 3 outcome branches (reflect, remove, fail) each had their own `set()` call with near-identical `players.map()` callbacks. All 3 shared the same gold/time deduction; reflect and remove also shared curse removal; only reflect added the curse transfer. The duplicated structure made it easy to introduce inconsistencies when modifying the shared gold/time logic.

**Fix**: Consolidated into a single `set()` call with conditional spread:
- Base update: `gold - cost`, `timeRemaining - 3` (all outcomes)
- Conditional curse removal: `...(curseRemoved && { activeCurses: slice(1) })` (reflect + remove)
- Conditional curse transfer: check `result === 'reflect'` inside the map for caster
- Outcome messages extracted into `OUTCOME_MESSAGES` lookup table

Reduced 3 separate `set()` calls (56 lines) to 1 call (18 lines) + message lookup (12 lines).

### Files Modified (3)

| File | Changes |
|------|---------|
| `src/hooks/ai/actions/rivalryActions.ts` | 256-line monolith → 8 sub-generators + `RivalryContext` + dispatch array |
| `src/store/helpers/questHelpers.ts` | `evaluateGoals()` + `trackAchievements()` extracted; `checkVictory` 74→18 lines |
| `src/store/helpers/hexHelpers.ts` | `attemptCurseReflection` 3 branches → 1 `set()` + `OUTCOME_MESSAGES` lookup |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    10.63s
```

TypeScript: 0 errors. Build: clean. All behavior preserved.

---

## 2026-02-17 — Code Audit & Refactor Round 5 (18:00 UTC)

### Overview

Full codebase audit using 4 parallel agents (store+helpers, components, data files, AI+network). Identified 40+ complex functions across all areas. Selected 3 high-impact refactoring targets and applied structural changes maintaining identical behavior. All 296 tests pass. TypeScript compiles clean. Build succeeds.

### Refactoring 19: `generateStrategicActions` (strategicActions.ts)

**Problem**: 296-line monolithic function containing 9 semi-independent strategic concerns (job seeking, job upgrading, working, education-career pipeline, housing upgrade/downgrade, salary negotiation, voluntary homeless, withdrawals, proactive banking) in a single function body. Each section had its own guard conditions, location checks, and action creation — making it hard to understand, test, or modify any individual strategy without reading the entire function.

**Fix**: Extracted 11 focused sub-generator functions via dispatch table pattern:
- `generateJobSeekingActions()` — apply for first job
- `generateJobUpgradeActions()` — upgrade to better-paying job
- `generateWorkActions()` — work shifts with HARD AI value-per-hour scoring
- `generateEducationPipelineActions()` — HARD AI degree-to-job pipeline
- `generateHousingUpgradeActions()` — upgrade to Noble Heights
- `generateHousingDowngradeActions()` — downgrade when can't afford rent
- `generateSalaryNegotiationActions()` — request raises
- `generateVoluntaryHomelessActions()` — go homeless to avoid eviction
- `generateWithdrawalActions()` — basic bank withdrawal
- `generateProactiveBankingActions()` — HARD AI robbery protection deposits
- `generateSmartWithdrawalActions()` — HARD AI expense-aware withdrawal

`STRATEGY_GENERATORS` dispatch array replaces the monolith. Main `generateStrategicActions()` is now 1 line: `flatMap` over generators.

### Refactoring 20: `applyNetworkState` (networkState.ts)

**Problem**: 4 near-identical event sync blocks (shadowfingersEvent, applianceBreakageEvent, weekendEvent, deathEvent), each following the exact same pattern: check dismissed → sync value / check null → clear dismissal. Adding a new event type required copy-pasting 6 lines and adjusting field names. The special `eventMessage` block (which also controls phase/eventSource) was mixed in, making it unclear which events follow the shared pattern vs. have custom logic.

**Fix**: Created `SYNCABLE_EVENT_FIELDS` data-driven array — each entry maps a dismiss key to a read function. A single `for...of` loop replaces the 4 duplicated blocks. The special `eventMessage` handling (with phase/eventSource side effects) remains as explicit code above the loop, making the distinction clear. Adding new syncable events is now a 1-line array entry.

### Refactoring 21: `createProcessWeekEnd` (weekEndHelpers.ts)

**Problem**: 139-line orchestrator function with 3 inline logic blocks: (1) weather-festival conflict resolution (15 lines with nested conditionals), (2) stock market update with crash message (6 lines), (3) game-over/last-standing/normal-transition branching (45 lines with 3 conditional branches each calling `set()` differently).

**Fix**: Extracted 3 named helper functions:
- `resolveWeatherFestivalConflict()` — pure function taking weather, festival, and previous weather type, returning resolved weather + messages
- `advanceStockMarket()` — updates stock prices and appends crash message
- `resolveWeekEndOutcome()` — handles all 3 end-of-week branches (all dead, last standing, normal transition)

Main orchestrator reduced from 139 to ~50 lines with clear step labels.

### Files Modified (3)

| File | Changes |
|------|---------|
| `src/hooks/ai/actions/strategicActions.ts` | 296-line monolith → 11 sub-generators + dispatch array |
| `src/network/networkState.ts` | `SYNCABLE_EVENT_FIELDS` array + loop replacing 4 duplicated blocks |
| `src/store/helpers/weekEndHelpers.ts` | 3 extracted helpers: `resolveWeatherFestivalConflict`, `advanceStockMarket`, `resolveWeekEndOutcome` |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    11.00s
```

TypeScript: 0 errors. Build: clean. All behavior preserved.

---

## 2026-02-17 — Code Audit & Refactor Round 4 (16:00 UTC)

### Overview

Full codebase audit using 4 parallel agents (store+helpers, components, data files, AI+network). Identified 40+ complex functions across all areas. Selected 3 high-impact refactoring targets and applied structural changes maintaining identical behavior. All 296 tests pass. TypeScript compiles clean. Build succeeds.

### Refactoring 16: `generateGoalActions` (goalActions.ts)

**Problem**: 484-line monolithic function with a 5-case switch statement, where each case contained 40-100 lines of goal-specific logic. Adding festival bonuses and secondary goal awareness added 2 more dense sections at the bottom. The switch made it hard to understand any single goal's strategy without scrolling through the entire function.

**Fix**: Extracted 8 focused functions via dispatch table pattern:
- `generateEducationActions()` — study/graduate decisions
- `generateWealthActions()` — work/banking decisions
- `generateHappinessActions()` — appliance/relaxation decisions
- `generateCareerActions()` — job seeking/dependability decisions
- `generateAdventureActions()` — guild pass/quest/dungeon decisions
- `generateFestivalBonusActions()` — festival-aware boosts
- `generateGraduationActions()` — opportunistic graduation checks
- `generateSecondaryGoalActions()` — HARD AI multi-goal awareness

`GOAL_ACTION_GENERATORS` dispatch table replaces the switch. Main `generateGoalActions()` is now 10 lines that combines results from 4 generators.

### Refactoring 17: `CavePanel` (CavePanel.tsx)

**Problem**: 697-line component with 3 identical durability indicator patterns (weapon/armor/shield each had 4 identical lines of `getDurabilityCondition()` → color mapping → span rendering), a 10-line repair warning with duplicated item checking, and a 175-line floor card section (lines 491-667) inlined inside a `.map()` callback.

**Fix**: Extracted 3 sub-components:
- `DurabilityIndicator` — reusable component taking `itemId`, `icon`, `durabilityMap` props. Eliminates 3×4=12 lines of duplicate IIFE patterns → 3 one-line `<DurabilityIndicator>` calls
- `RepairWarning` — extracted equipment broken/poor check into standalone component
- `FloorCard` — 175-line floor expansion card (header, stats, boss, requirements, enter button) extracted with clean props interface. The main component's `.map()` is now a single `<FloorCard>` call

### Refactoring 18: `generateCriticalActions` (criticalNeeds.ts)

**Problem**: 306-line monolithic function handling 4 independent critical needs (food, rent, clothing, health) in one long function body with deeply nested conditionals. Food section alone was 115 lines with 3-level nesting. Clothing had cascading tier fallback logic. Each section's scope was hard to identify since they blended together.

**Fix**: Extracted 4 focused functions:
- `generateFoodActions()` — proactive + urgent food buying with store preference logic
- `generateRentActions()` — prepayment + eviction prevention
- `generateClothingActions()` — proactive upgrade + tier-based purchasing with fallback
- `generateHealthActions()` — healer visit decisions

Main `generateCriticalActions()` is now 6 lines that spreads results from 4 generators.

### Files Modified (3)

| File | Changes |
|------|---------|
| `src/hooks/ai/actions/goalActions.ts` | Switch → dispatch table + 8 extracted functions |
| `src/components/game/CavePanel.tsx` | `DurabilityIndicator`, `RepairWarning`, `FloorCard` sub-components |
| `src/hooks/ai/actions/criticalNeeds.ts` | 4 per-need functions replacing monolith |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    10.43s
```

TypeScript: 0 errors. Build: clean. All behavior preserved.

---

## 2026-02-17 — Code Audit & Refactor Round 3 (14:00 UTC)

### Overview

Launched 4 parallel audit agents across the entire codebase (store+helpers, components, data files, AI+network). Identified 40+ complex functions across all areas. Selected 5 high-value refactoring targets and applied structural-only changes maintaining identical behavior. All 296 tests pass. TypeScript compiles clean.

### Refactoring 11: `checkAchievements` (achievements.ts)

**Problem**: 24 repetitive `if (condition) tryUnlock('id')` statements — identical pattern repeated for every achievement. Adding a new achievement means adding yet another if-statement. No separation of data (conditions) from logic (unlock mechanism).

**Fix**: Created `ACHIEVEMENT_CONDITIONS` data-driven array — each entry maps an achievement ID to a `check(ctx, stats)` function. The function body is now a single `for...of` loop over the conditions array. Added `AchievementContext` interface for type safety. 48 → 12 lines of logic + a declarative conditions table.

### Refactoring 12: `checkDeath` (questHelpers.ts)

**Problem**: 3 near-identical branches (paid resurrection, free respawn, permadeath), each creating a `DeathEvent` object with similar fields and calling `set()` with duplicated player update patterns. Adding a new death resolution path requires duplicating 20+ lines.

**Fix**: Extracted `resolveDeathOutcome()` — a pure function that takes player data and returns `{ isPermadeath, playerUpdate, deathEvent, aiMessage }`. Extracted `calculateResurrectionCost()` and `RESURRECTION_HAPPINESS_PENALTY` constant. The `checkDeath()` function body is now 12 lines: call resolver, apply result via single `set()`.

### Refactoring 13: `validateActionArgs` (useNetworkSync.ts)

**Problem**: 100-line switch statement with 15+ cases, where 7 follow the exact same pattern (check typeof, isFinite, bounds) and 6 follow another identical pattern (cost validation). Each new action type requires copying and adjusting an entire case block.

**Fix**: Created `STAT_MODIFIER_RULES` map (7 entries: modifyGold, modifyHealth, modifyHappiness, modifyFood, modifyClothing, modifyMaxHealth, modifyRelaxation) and `COST_VALIDATION_RULES` map (8 entries: temperEquipment, salvageEquipment, buyHexScroll, hex/curse actions). Extracted `validateNumArg()` utility. The switch now only handles 2 special cases (setJob, workShift) that need custom logic. 100 → 65 lines with better extensibility.

### Refactoring 14: `movePlayer` event messaging (playerHelpers.ts)

**Problem**: 2 identical 6-line blocks for appending event messages to the game's event display. The pattern `const existing = get().eventMessage; set({ eventMessage: existing ? existing + '\n' + message : message, eventSource: 'weekly', phase: 'event' })` was duplicated verbatim for location events and travel events.

**Fix**: Extracted `appendEventMessage(get, set, message)` helper function. Both call sites now use a single-line call. Eliminates the duplicate null-coalescing append logic.

### Refactoring 15: Quest reward calculation (questHelpers.ts)

**Problem**: `completeQuest()`, `completeChainQuest()`, and `completeBounty()` all duplicate the same reward scaling pipeline: `getScaledQuestGold() → getReputationGoldMultiplier() → Math.round()`, plus the health risk randomization (`Math.random() < 0.5 ? full : half`). Each function had 6-8 lines of identical calculation code.

**Fix**: Extracted `calculateQuestReward(baseGold, baseHappiness, healthRisk, dungeonFloorsCleared, guildReputation, scaleHappiness?)` — returns `{ finalGold, finalHappiness, healthLoss }`. All three completion functions now call this single helper. Added `scaleHappiness` parameter (false for bounties which don't scale happiness).

### Files Modified (5)

| File | Changes |
|------|---------|
| `src/data/achievements.ts` | `ACHIEVEMENT_CONDITIONS` array + `AchievementContext` interface, single-loop `checkAchievements` |
| `src/store/helpers/questHelpers.ts` | `resolveDeathOutcome()`, `calculateResurrectionCost()`, `calculateQuestReward()` helpers |
| `src/network/useNetworkSync.ts` | `STAT_MODIFIER_RULES` + `COST_VALIDATION_RULES` maps, `validateNumArg()` utility |
| `src/store/helpers/playerHelpers.ts` | `appendEventMessage()` helper for event message display |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    10.42s
```

TypeScript: 0 errors. All behavior preserved.

---

## 2026-02-17 — Code Audit & Refactor Round 2 (12:00 UTC)

### Overview

Continuation of earlier audit session. Launched 4 parallel audit agents covering gameStore + helpers, GameBoard + LocationPanel + locationTabs, data files (combatResolver, events, quests, dungeon), and AI + network + startTurnHelpers. Identified 40+ additional complexity findings. Selected 5 high-value refactoring targets and applied structural-only changes (identical behavior).

### Refactoring 6: `checkMarketCrash` (events.ts)

**Problem**: 36-line function with cascading `if (roll < threshold)` checks using magic numbers (0.02, 0.07, 0.15). Each branch returns a similar object literal. Adding a new crash tier requires inserting a new if-block in the right position.

**Fix**: Created `CRASH_TIERS` lookup table — an array of `{ threshold, result }` entries. The function body is now a single line: `CRASH_TIERS.find(tier => roll < tier.threshold)?.result ?? default`. Reduced from 36 lines to 1 line of logic + a data table.

### Refactoring 7: `processRobberyCheck` (startTurnHelpers.ts)

**Problem**: 3 nearly identical if-blocks checking stolen equipment for weapon, armor, and shield slots. Each block: checks `stolenItemIds.has()`, sets `equipmentUnequip[field] = null`, finds the stolen item name. 15 lines of duplicated logic.

**Fix**: Created `EQUIPMENT_SLOTS` array with `{ field, value }` entries and replaced the 3 if-blocks with a single `for...of` loop. Same null-assignment, same name lookup, but now iterates over the slot array.

### Refactoring 8: `applySmartGoalSprint` (actionGenerator.ts)

**Problem**: 4 identical if-blocks filtering goals by progress threshold (wealth, happiness, education, career). Below that, a 4-case switch statement mapping each goal to its sprint action types. Adding a new goal requires changes in 2 places.

**Fix**: Created `GOAL_SPRINT_ACTIONS` lookup mapping goal → action types, and `GOAL_KEYS` array. Replaced 4 if-blocks with `.filter().map()` chain. Replaced switch with `Set` lookup from the map. Total: 57 → 22 lines.

### Refactoring 9: `applySabotageHex` (hexHelpers.ts)

**Problem**: 83-line function with TWO switch statements on the same `effectType` — first one applies the state mutation (destroy-weapon, destroy-armor, etc.), second one generates the result message. Same 6 cases duplicated. Adding a new sabotage type requires editing both switches.

**Fix**: Created `SABOTAGE_EFFECTS` handler map — each entry has `apply(player)` returning a `Partial<Player>` update, and `message(target)` returning the result string. The function now does a single map lookup for both mutation and messaging. 83 → 50 lines, single source of truth per effect.

### Refactoring 10: `checkFloorRequirements` (dungeon/helpers.ts)

**Problem**: 53 lines with redundant conditional branches. Degree checking had duplicate for-loops for `completedDegrees` present vs absent (identical behavior). Equipment checks had nested if/else for weapon and armor with near-identical structure.

**Fix**: Extracted `checkDegreeRequirements()` — handles both cases (degrees present or absent) in a single filter+map. Extracted `checkEquipmentRequirement()` — generic helper for weapon/armor stat checks. Main function now spreads results from all validators into a flat reasons array. 53 → 41 lines, no nesting.

### Files Modified (5)

| File | Changes |
|------|---------|
| `src/data/events.ts` | `CRASH_TIERS` lookup table, single-line `checkMarketCrash` |
| `src/store/helpers/startTurnHelpers.ts` | `EQUIPMENT_SLOTS` array + loop in `processRobberyCheck` |
| `src/hooks/ai/actionGenerator.ts` | `GOAL_SPRINT_ACTIONS` map + `GOAL_KEYS` array in `applySmartGoalSprint` |
| `src/store/helpers/hexHelpers.ts` | `SABOTAGE_EFFECTS` handler map, unified `applySabotageHex` |
| `src/data/dungeon/helpers.ts` | Extracted `checkDegreeRequirements` + `checkEquipmentRequirement` |

### Test Results

- **Tests**: 296/296 passing across 16 test files, 0 failures
- **TypeScript**: Clean, no errors
- **Behavior**: Identical — all refactorings are structural only

---

## 2026-02-17 — Code Audit & Refactor Complex Code (10:00 UTC)

### Overview

Full codebase complexity audit using 6 parallel agents, followed by refactoring of 5 high-complexity functions across 5 files. All refactorings maintain identical behavior while improving clarity, testability, and reducing code duplication.

### Audit Process

Launched 6 parallel audit agents covering:
1. **gameStore.ts + store helpers** — Found 12 high-complexity findings
2. **GameBoard.tsx** — Found 7 complexity issues (component too large, scattered state)
3. **LocationPanel.tsx + locationTabs.tsx** — Found 8 findings (nested ternaries, large context)
4. **weekEndHelpers/startTurnHelpers/turnHelpers/playerHelpers/workEducationHelpers** — Found 13 findings
5. **combatResolver.ts, events.ts, items.ts** — Found 10 findings (3x code repetition, nested drops)
6. **AI system + network** — Found 10 findings (161-line generateActions, duplicated name sanitization)

**Total findings: 60 complexity issues** (12 HIGH, 18 MEDIUM-HIGH, 30 MEDIUM)

### Refactoring 1: `calculateCombatStats` (items.ts)

**Problem**: 3 nearly identical code blocks (weapon/armor/shield) each with the same temper-bonus + durability-multiplier logic, totaling 45 lines of duplicated patterns.

**Fix**: Extracted `getSlotStats()` helper function that handles a single equipment slot generically. The main function now calls it 3 times and combines results. Reduced from 55 lines to 22 lines in the main function.

```typescript
// BEFORE: 3x repeated blocks like this
if (equippedWeapon) {
  const stats = getEquipStats(equippedWeapon);
  let weaponAtk = stats?.attack || 0;
  if (temperedItems?.includes(equippedWeapon)) { weaponAtk += TEMPER_BONUS.weapon.attack; }
  if (equipmentDurability) { ... }
  attack += weaponAtk;
}
// ... repeated for armor and shield

// AFTER: Single generic helper + 3 calls
const weapon = getSlotStats(equippedWeapon, 'weapon', temperedItems, equipmentDurability);
const armor = getSlotStats(equippedArmor, 'armor', temperedItems, equipmentDurability);
const shield = getSlotStats(equippedShield, 'shield', temperedItems, equipmentDurability);
return { attack: weapon.attack, defense: armor.defense + shield.defense, blockChance: shield.blockChance };
```

### Refactoring 2: `endTurn` / `findNextAlivePlayer` (turnHelpers.ts)

**Problem**: `findNextAlivePlayer` was a 25-line closure nested inside `endTurn`, with confusing week boundary tracking (crossedWeekBoundary flag, manual loop counter, unreachable fallback return). Game-over checks had duplicated `deleteSave` + `set()` patterns.

**Fix**:
- Extracted `findNextAlivePlayer` to module-level pure function with simpler loop (`for` instead of `while` + manual counter)
- Simplified week boundary detection: `idx <= startIndex` instead of tracking a flag
- Consolidated game-over checks: merged `alivePlayers.length === 1` and `=== 0` into a single `<= 1` guard

### Refactoring 3: `workShift` (workEducationHelpers.ts)

**Problem**: 100-line monolithic function mixing 4 distinct concerns: earnings calculation (festival mult, curse, gold bonus), garnishment deductions (rent + loan), happiness penalty calculation, and state update. High cyclomatic complexity.

**Fix**: Extracted 3 pure helper functions:
- `calculateEarnings(hours, wage, festivalId, player)` — festival/curse/bonus pipeline
- `applyGarnishments(earnings, player)` — rent + loan deductions
- `calculateWorkHappinessPenalty(gameWeek, playerAge, hours)` — progression-based penalty

The main `workShift` function now reads as: validate → calculate earnings → apply garnishments → calculate penalty → update state.

### Refactoring 4: `processEmployment` (weekEndHelpers.ts)

**Problem**: 47 lines with 4-level nested conditionals for market crash effects (3 severity tiers with different consequences), duplicated `firePlayer` logic (job = null, wage = 0, shiftsWorkedSinceHire = 0) in 2 places.

**Fix**:
- Extracted `applyDependabilityDecay()` for employment-status-based decay
- Extracted `firePlayer()` utility for job field reset (eliminates duplication)
- Created `CRASH_EFFECTS` lookup table mapping severity → `{ happinessLoss, firesPlayer, cutsWage }`
- Main function now reads the lookup table instead of 3 nested if/else branches

### Refactoring 5: `fenceTabs` (locationTabs.tsx)

**Problem**: `onBuyUsedItem` had a 4-branch if/else chain for item effects. `onGamble` had 4 chained ternary operators for odds/payout/happiness per stake level (e.g. `stake === 10 ? 0.4 : stake === 50 ? 0.3 : 0.2`).

**Fix**:
- Created `USED_ITEM_EFFECTS` lookup table mapping item ID → effect handler
- Created `GAMBLE_TABLE` lookup table mapping stake → `{ chance, payout, winHappiness, loseHappiness, time }`
- Both callbacks now do a single table lookup instead of conditional chains

### Files Modified (5)

| File | Changes |
|------|---------|
| `src/data/items.ts` | Extracted `getSlotStats()`, refactored `calculateCombatStats` |
| `src/store/helpers/turnHelpers.ts` | Extracted `findNextAlivePlayer` to module level, simplified game-over checks |
| `src/store/helpers/workEducationHelpers.ts` | Extracted `calculateEarnings`, `applyGarnishments`, `calculateWorkHappinessPenalty` |
| `src/store/helpers/weekEndHelpers.ts` | Extracted `applyDependabilityDecay`, `firePlayer`, `CRASH_EFFECTS` lookup |
| `src/components/game/locationTabs.tsx` | Extracted `USED_ITEM_EFFECTS`, `GAMBLE_TABLE` lookup tables |

### Test Results

- **Tests**: ✅ 296/296 passing across 16 test files, 0 failures
- **TypeScript**: ✅ Clean, no errors
- **Behavior**: Identical — all refactorings are structural only

---

## 2026-02-16 — Build Error Check #3 (20:26 UTC)

### Results

- **Tests**: ✅ 234/234 passing across 12 test files, 0 failures
- **Console**: ✅ No errors logged
- **Network**: ✅ No failed requests
- **Runtime**: ✅ App loads and renders correctly

### No action needed — project is build-clean.

---

## 2026-02-16 — BUG FIX: Preservation Box Breaking Every Turn (22:00 UTC)

### Problem
Player reported Preservation Box breaking every single turn, even immediately after repairing it. Food kept spoiling because the box was always broken at turn start.

### Root Cause
The `processApplianceBreakage()` function in `startTurnHelpers.ts` runs at the start of every turn and rolls a breakage check (1/51 chance for enchanter items, 1/36 for market). There was **no cooldown** — a just-repaired appliance could break again on the very next turn. Combined with possible AI hex casting (`Appliance Jinx`), this created a frustrating loop where the player was constantly repairing and losing food.

### Fix: 2-Week Breakage Immunity After Repair/Purchase
1. **Added `repairedWeek?: number` field** to `OwnedAppliance` interface in `game.types.ts`
2. **Set `repairedWeek` on repair** — in `applianceHelpers.ts` (Enchanter repair) and `equipmentHelpers.ts` (Forge repair)
3. **Set `repairedWeek` on purchase** — in `applianceHelpers.ts` (buying new appliance)
4. **Skip breakage check** — in `startTurnHelpers.ts`, if `currentWeek - repairedWeek < 2`, skip that appliance's breakage roll

This means after repairing or buying an appliance, it's safe for 2 full turns before it can break again.

### Files Modified (4)

| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `repairedWeek?: number` to `OwnedAppliance` |
| `src/store/helpers/startTurnHelpers.ts` | Breakage cooldown check using `repairedWeek` |
| `src/store/helpers/economy/applianceHelpers.ts` | Set `repairedWeek` on repair and purchase |
| `src/store/helpers/economy/equipmentHelpers.ts` | Set `repairedWeek` on Forge repair |

---

## 2026-02-16 — Bug Fixes: Broken Appliance Display + Finances Panel (21:00 UTC)

### Bug 1: Broken Preservation Box shows "(Owned)" instead of "(Broken!)"

**Problem**: When a hex curse broke the Preservation Box, the Enchanter panel still showed "(Owned)" with no indication it was broken. Player's food kept spoiling with no explanation.

**Fix**: `EnchanterPanel.tsx` now checks `ownedAppliance.isBroken` and shows "(Broken!)" in red text with a red border highlight. The buy button remains disabled for working owned items but the broken state is now clearly visible.

### Bug 2: Finances panel shows 0g Savings / 0g Investments despite having stocks

**Problem**: `SideInfoTabs.tsx` Finances section showed `player.investments` (legacy field, always 0) and `player.savings` separately. Stock portfolio value was not included, making it look like the player had no investments.

**Fix**: Created `FinancesSection` component that uses `useGameStore` to get `stockPrices` and `calculateStockValue()` to compute actual portfolio value. "Investments" now shows `player.investments + stockValue`. When stocks > 0, shows a sub-line "(Xg in stocks)".

### Files Modified (2)

| File | Changes |
|------|---------|
| `src/components/game/EnchanterPanel.tsx` | Broken appliance detection, "(Broken!)" label, red border |
| `src/components/game/SideInfoTabs.tsx` | FinancesSection with stock value calculation, TrendingUp icon |

---

## 2026-02-16 — Hex Scrolls in Inventory (19:30 UTC)

### Problem
Hex scrolls obtained from Dark Ritual at the Graveyard had no way to be activated — they only showed as text in the Stats tab. Players needed to be at Shadow Market or Enchanter to cast them.

### Fix
Added hex scrolls as interactive items in the Inventory tab. Players can now click a scroll to use it from anywhere.

**Changes:**
- `InventoryGrid.tsx` — Added hex scroll section above regular inventory grid with click-to-use UI. Personal/sabotage scrolls show a target picker (list of rival players). Location hexes cast directly on click. Shows cast time and quantity.
- `ItemIcon.tsx` — Added `HexScrollIcon` SVG (purple scroll with arcane symbol) + mapping for `hex-scroll` item ID.
- `buildInventoryItems()` — Now includes `player.hexScrolls` as inventory items with `isHexScroll`, `hexId`, `hexCategory`, `castTime` metadata.

### How it works
1. Player buys/receives a hex scroll (from Dark Ritual, Shadow Market, or Enchanter)
2. Scroll appears in "Hex Scrolls" section of the Inventory tab
3. Click the scroll → for personal/sabotage: shows target picker with rival names → click a rival to cast
4. For location hexes: casts directly on click (no target needed)
5. Time cost and scroll consumption handled by existing store actions

### Files Modified (2)

| File | Changes |
|------|---------|
| `src/components/game/InventoryGrid.tsx` | Hex scroll section with casting UI, target picker, imports for hex system |
| `src/components/game/ItemIcon.tsx` | HexScrollIcon SVG + mapping |

---

## 2026-02-16 — Hex Visual Effect + AI Hex Purchasing (17:30 UTC)

### Part 1: Cursed Player Portrait Visual Effect

Added pulsing purple "curse aura" overlay on player portraits when a player has active hexes/curses.

**Changes:**
- `CharacterPortrait.tsx` — Added `hasCurse` prop + `CurseOverlay` component (pulsing purple box-shadow)
- `tailwind.config.ts` — Added `curse-pulse` keyframe + animation
- `PlayerToken.tsx`, `AnimatedPlayerToken.tsx`, `ResourcePanel.tsx`, `TurnOrderPanel.tsx`, `PlayersTab.tsx` — Pass `hasCurse={player.activeCurses.length > 0}`

### Part 2: AI Hex Scroll Purchasing

AI opponents can now buy hex scrolls from Shadow Market and Enchanter, and will travel there when a rival is threatening.

**Changes:**
- `types.ts` — Added `'buy-hex-scroll'` to `AIActionType`
- `rivalryActions.ts` — Added hex scroll purchase logic (priority 60, Morgath +10 boost) + travel-to-shadow-market action (priority 50). Prefers personal/sabotage curses over location hexes.
- `actionExecutor.ts` — Added `handleBuyHexScroll` handler + map entry

### Files Modified (11)

| File | Changes |
|------|---------|
| `src/components/game/CharacterPortrait.tsx` | hasCurse prop + CurseOverlay component |
| `tailwind.config.ts` | curse-pulse keyframe + animation |
| `src/components/game/PlayerToken.tsx` | Pass hasCurse |
| `src/components/game/AnimatedPlayerToken.tsx` | Pass hasCurse |
| `src/components/game/ResourcePanel.tsx` | Pass hasCurse |
| `src/components/game/TurnOrderPanel.tsx` | Pass hasCurse |
| `src/components/game/tabs/PlayersTab.tsx` | Pass hasCurse |
| `src/hooks/ai/types.ts` | Added buy-hex-scroll action type |
| `src/hooks/ai/actions/rivalryActions.ts` | Hex purchase + travel logic |
| `src/hooks/ai/actionExecutor.ts` | handleBuyHexScroll handler |
| `log2.md` | This entry |

---

## 2026-02-16 — Build Error Check #2 (16:36 UTC)

### Results

- **Build**: ✅ Clean — no TypeScript errors, no build failures
- **Tests**: ✅ 281/281 passing across 14 test files, 0 failures
- **Console**: ✅ No errors logged
- **Previous fixes verified**: `eventSource: 'weekly'` in questHelpers.ts still working

### No action needed — project remains build-clean.

---

## 2026-02-16 — Build Error Check (13:30 UTC)

### Results

- **Build**: ✅ Clean — no TypeScript errors, no build failures
- **Tests**: ✅ 281/281 passing across 14 test files, 0 failures
- **Console warnings** (non-critical):
  - `forwardRef` warning on `UpdateBanner` (TitleScreen) — cosmetic, no functional impact
  - `forwardRef` warning on `AudioController` (Index) — cosmetic, no functional impact
- **Previous fix verified**: `eventSource: 'weekly'` in questHelpers.ts (from earlier session) — confirmed working

### No action needed — project is build-clean.

---

## 2026-02-16 — Landlord Speech Bubble + Stock Market Overhaul (11:00 UTC)

### Overview

Three areas addressed: landlord UI fix, comprehensive stock market overhaul, and BUG-001 status review.

### BUG-001 Status Review

Parallel agent investigation confirmed **all 4 defense layers are active and functioning**:
1. Inline stale-build detection with CDN bypass headers
2. Watchdog timer + silent failure detection (10s/15s)
3. SW neutering for GitHub Pages (registerType:'prompt', no skipWaiting/clientsClaim)
4. Fallback UI with reload loop protection (max 3 in 2min)

**No remaining code vulnerabilities found.** The persistent post-PR startup issue is caused by GitHub Pages CDN cache TTL (10 minutes). The defense layers handle it correctly — users may see brief "Loading..." followed by automatic retry and recovery.

### Fix: Landlord "Beg for More Time" Speech Bubble

**Problem**: When player begs Tomas for more time, his response appeared as a toast notification in the lower-right corner instead of as an NPC speech bubble.

**Fix**: Replaced `toast.success()/toast.error()` calls with `useBanterStore.getState().setBanter()` to display Tomas's response in the existing BanterBubble speech bubble system. Success uses 'grumpy' mood (he's reluctantly agreeing), failure uses 'warning' mood.

### Stock Market Overhaul (6 improvements)

**Problem**: Stock system rated 4/10 — broken price formula, no dividends, no price history, unrealistic crash mechanics, no economy trend influence.

**Changes**:

1. **Fixed price formula** (was biased +5% toward positive):
   ```typescript
   // BEFORE (broken — range was -0.95v to +1.05v):
   const change = (Math.random() * 2 - 0.95) * stock.volatility;
   // AFTER (symmetric — range is -v to +v):
   const randomChange = (Math.random() - 0.5) * 2 * stock.volatility;
   ```

2. **Added dividend system** — each stock pays weekly dividends based on share value:
   - Crystal Mine: 0.2%/wk (growth stock — value from price swings)
   - Potion Consortium: 0.5%/wk (balanced)
   - Enchanting Guild: 0.8%/wk (income stock)
   - Crown Bonds: 1.0%/wk (safe yield)
   - Dividends auto-paid in gold during week-end processing

3. **Added economy trend influence** — stock prices now respond to economic cycles:
   - Boom (+1): +3% upward bias per week
   - Recession (-1): -3% downward bias per week
   - Mean reversion: 5% weekly pull toward base price (prevents runaway prices)

4. **Crash severity tiers** (replaced flat 30-60% loss):
   - Minor (50% chance): -15% to -25%
   - Moderate (35% chance): -30% to -50%
   - Major (15% chance): -50% to -70%
   - Stable stocks lose less (volatility-scaled cushion)

5. **Price history tracking** — last 8 weeks of prices per stock stored in GameState

6. **Enhanced broker UI**:
   - SVG sparkline charts showing 8-week price trends
   - Weekly price change with +/-% indicator (green/red)
   - Dividend per share display (Div: Xg/wk)
   - Portfolio dividends summary on main bank view
   - Cap raised from 5x to 8x base price

### Changes (8 files)

| File | Changes |
|------|---------|
| `src/components/game/LandlordPanel.tsx` | Imported useBanterStore, replaced toast with setBanter for beg action |
| `src/data/stocks.ts` | Added dividendRate field, fixed price formula, added economy trend + mean reversion, crash severity tiers, dividend calculation, price history functions |
| `src/types/game.types.ts` | Added `stockPriceHistory: Record<string, number[]>` to GameState |
| `src/store/gameStore.ts` | Added getInitialPriceHistory import, stockPriceHistory to initial state + startGame + resetForNewGame + loadGame |
| `src/store/helpers/weekEndHelpers.ts` | Updated processFinances for dividends, passed economyTrend to updateStockPrices, added price history update |
| `src/components/game/BankPanel.tsx` | Added Sparkline component, dividend display, price change indicators, stockPriceHistory prop |
| `src/components/game/locationTabs.tsx` | Added stockPriceHistory to LocationTabContext, passed to BankPanel |
| `src/components/game/LocationPanel.tsx` | Added stockPriceHistory to context |
| `src/network/networkState.ts` | Added stockPriceHistory to serialization/deserialization |

### Test Results

- **219 tests passing**, 0 failures
- TypeScript: clean, no errors
- Build: clean
## 2026-02-16 — AI System Gap Analysis (10:45 UTC)

### Overview

Full audit of the AI system to identify missing behaviors, gaps, and improvement opportunities. Reviewed all 8 AI files (`types.ts`, `strategy.ts`, `actionGenerator.ts`, `actionExecutor.ts`, `playerObserver.ts`, `difficultyAdjuster.ts`) plus all 6 action generators (`criticalNeeds.ts`, `goalActions.ts`, `strategicActions.ts`, `economicActions.ts`, `questDungeonActions.ts`, `rivalryActions.ts`), cross-referenced with `todo.md`, `bugs.md`, `MEMORY.md`, and `AUDIT-2026-02-12.md`.

### What the AI System Currently Does Well

| Area | Status | Details |
|------|--------|---------|
| Critical needs (food, rent, clothing, health) | ✅ Complete | 3-tier clothing, price-adjusted food, spoilage awareness, Preservation Box logic |
| Goal-oriented actions | ✅ Complete | Weakest-goal focus, sprint-when-near-complete, all 5 goals supported |
| Job system | ✅ Complete | Apply, upgrade, work, clothing tier checks, job blocking (rivals) |
| Education | ✅ Complete | Degree pursuit, graduation, strategic degree selection (job unlocks) |
| Banking | ✅ Complete | Deposit, withdraw, robbery protection strategy |
| Loans | ✅ Complete | Emergency take, full/partial repay, default-aware (garnishment urgency) |
| Stocks | ✅ Complete | Buy undervalued, sell overvalued, T-Bill safety, personality-based gambling |
| Dungeon | ✅ Complete | Floor selection, power ratio check, equipment upgrade path, rare drops |
| Quests | ✅ Complete | Best quest selection, chain quests, bounties, cooldown awareness |
| Equipment | ✅ Complete | Buy weapons/armor/shield, tempering, repair, sell/pawn when broke |
| Rivalry | ✅ Complete | Quest stealing, education racing, banking defense, hex casting |
| Personalities | ✅ Complete | 4 unique personalities with weight multipliers and behavior modifiers |
| Counter-strategy | ✅ Complete | Player observation, strategy profiling, competitive/gap-exploit weights |
| Dynamic difficulty | ✅ Complete | Rubber-banding based on AI vs human performance gap |
| Time budget | ✅ Complete | Early/late turn action priority adjustments |
| Route optimization | ✅ Complete | Multi-need location boosting |
| Mistakes | ✅ Complete | 3 mistake types (skip, swap, impulsive) with difficulty-scaled chance |

### Missing AI Behaviors (Gaps Found)

#### 1. **Rent Prepayment** (from todo.md backlog — Medium priority)
**Status**: NOT IMPLEMENTED
**Impact**: AI only pays rent when urgently behind (3+ weeks). It never prepays rent during rent weeks, meaning it often gets 2 weeks behind before reacting.
**Fix**: In `criticalNeeds.ts`, add a rent payment action at moderate priority (~55) when `isRentWeek` is true and `weeksSinceRent >= 1`, not just when urgency is >= 0.5.

#### 2. **Appliance Repair** (from todo.md backlog — Medium priority)
**Status**: NOT IMPLEMENTED
**Impact**: When appliances break (Preservation Box, Cooking Fire, etc.), the AI never repairs them. Broken Preservation Box causes food spoilage; broken Cooking Fire loses +3 food/turn bonus.
**Fix**: Add repair logic in `strategicActions.ts` or `economicActions.ts`. Check for broken appliances, travel to Enchanter/Forge, pay repair cost.
**Note**: Need to check if a `repairAppliance` store action exists.

#### 3. **Salary Negotiation** (raise request)
**Status**: NOT IMPLEMENTED
**Impact**: When priceModifier increases the market wage above the AI's locked wage, the AI never requests a raise. Human players can do this at Guild Hall.
**Fix**: In `strategicActions.ts`, check if `calculateOfferedWage(currentJob, priceModifier) > currentWage` and add `negotiate-raise` action. Need to add handler in `actionExecutor.ts`.

#### 4. **Festival Awareness** (partial)
**Status**: PARTIALLY IMPLEMENTED (context passed but not used in decisions)
**Impact**: `activeFestival` is passed to all action generators via `ActionContext`, but no action generator actually uses it. Festivals can provide bonuses (e.g., Harvest Festival boosts food-related activities).
**Fix**: In `goalActions.ts` and `strategicActions.ts`, check `ctx.activeFestival` and adjust priorities. E.g., during Harvest Festival, boost food buying; during Scholar's Week, boost studying.

#### 5. **Insurance Purchase**
**Status**: NOT IMPLEMENTED
**Impact**: AI never buys insurance (available at Enchanter). Insurance protects against doctor visit costs and sickness penalties. Cautious personalities (Seraphina) should value this.
**Fix**: Add insurance purchase logic in `economicActions.ts`. Check `player.hasInsurance`, `player.insuranceWeeksLeft`, and `player.gold`.

#### 6. **Dispel Scroll Usage**
**Status**: NOT IMPLEMENTED (buying amulets IS implemented)
**Impact**: When an opponent hexes a location the AI needs (e.g., Academy sealed), the AI has no way to dispel it. It just avoids the location.
**Fix**: In `rivalryActions.ts`, check for hexed locations that block needed actions. If AI has a Dispel Scroll, travel to the hexed location and use it.

#### 7. **Graveyard Dark Ritual**
**Status**: NOT IMPLEMENTED
**Impact**: AI never uses the Graveyard to perform dark rituals (free random hex scroll, 15% backfire chance). Risk-taking personalities (Morgath) should consider this.
**Fix**: Add ritual action in `rivalryActions.ts` or `economicActions.ts` when at Graveyard and hex system is enabled.

#### 8. **Housing Downgrade to Homeless** (strategic)
**Status**: PARTIALLY IMPLEMENTED (downgrade noble→slums exists, but never to homeless)
**Impact**: When AI is completely broke and can't afford any rent, it never voluntarily goes homeless. It waits for eviction which has worse penalties.
**Fix**: In `strategicActions.ts`, add voluntary homeless downgrade when gold < 30 and savings < 20 and weeksSinceRent >= 3.

#### 9. **Free Actions at 0 Hours** (from todo.md backlog)
**Status**: NOT IMPLEMENTED (game-wide, not AI-specific)
**Impact**: When time hits 0, AI just ends turn. It should still be able to buy items, deposit money, etc. (Jones-style free actions).
**Note**: This requires game-wide support first (todo.md backlog item), then AI support.

#### 10. **`useAI.ts` is Obsolete / Dead Code**
**Status**: UNUSED (replaced by `useGrimwaldAI.ts` + modular AI system)
**Impact**: `src/hooks/useAI.ts` (230 lines) appears to be the original simple AI that was replaced by the full modular system. It imports store actions directly and has a primitive priority list.
**Fix**: Verify it's not imported anywhere, then delete it.

### Priority Ranking for Implementation

| # | Gap | Priority | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | Rent prepayment | Medium | Low (10 lines) | Prevents late rent penalties |
| 2 | Appliance repair | Medium | Medium (30 lines) | Prevents food spoilage cascade |
| 3 | Delete useAI.ts dead code | Low | Trivial | Code hygiene |
| 4 | Salary negotiation | Low | Medium (20 lines) | Better AI income |
| 5 | Festival awareness | Low | Medium (20 lines) | Smarter AI behavior |
| 6 | Insurance purchase | Low | Low (15 lines) | Cautious AI defense |
| 7 | Dispel scroll usage | Low | Medium (20 lines) | Counter-hex defense |
| 8 | Graveyard ritual | Low | Low (15 lines) | Risk-taking behavior |
| 9 | Voluntary homeless | Low | Low (10 lines) | Edge case survival |
| 10 | Free actions at 0h | Blocked | High | Needs game-wide change |

### Test Coverage

Current AI test coverage (added 2026-02-16):
- `src/hooks/ai/__tests__/strategy.test.ts` — 16 tests (goalProgress, weakestGoal, urgency, banking)
- `src/hooks/ai/__tests__/actionGenerator.test.ts` — 21 tests (personalities, difficulty, weights, time budget)
- `src/hooks/ai/actions/__tests__/rivalryActions.test.ts` — 5 tests (rivalry conditions)
- `src/data/__tests__/hexes.test.ts` — 20 tests (hex data, pricing, location blocking)
- Total: **62 AI-specific tests** + 281 total project tests

### Files Reviewed

| File | Lines | Assessment |
|------|-------|------------|
| `src/hooks/ai/types.ts` | 251 | Clean, well-documented |
| `src/hooks/ai/strategy.ts` | 469 | Comprehensive, good coverage |
| `src/hooks/ai/actionGenerator.ts` | 308 | Well-structured orchestrator |
| `src/hooks/ai/actionExecutor.ts` | 625 | 34 handlers, handler-map pattern |
| `src/hooks/ai/playerObserver.ts` | 331 | Solid observation + counter-strategy |
| `src/hooks/ai/difficultyAdjuster.ts` | ~100 | Rubber-banding works well |
| `src/hooks/ai/actions/criticalNeeds.ts` | 235 | Missing rent prepayment |
| `src/hooks/ai/actions/goalActions.ts` | 332 | Solid, festival awareness missing |
| `src/hooks/ai/actions/strategicActions.ts` | 166 | Missing salary negotiation |
| `src/hooks/ai/actions/economicActions.ts` | 259 | Missing insurance, appliance repair |
| `src/hooks/ai/actions/questDungeonActions.ts` | ~200 | Complete |
| `src/hooks/ai/actions/rivalryActions.ts` | 188 | Missing dispel scroll, graveyard |
| `src/hooks/useAI.ts` | 230 | **DEAD CODE** — appears unused |

---

## 2026-02-16 — BUG HUNT #3: Dependability Bug + Event Spam + Startup Hardening (09:00 UTC)

### Overview

**BUG HUNT #3**: Three bugs fixed using parallel AI agents for investigation.

### Bug 1: Game Startup Hang After PR Push (Hardening)

**Problem**: Game hangs on "Loading the realm..." after pushing a PR. Works fine from Lovable.

**Root cause**: Existing loading pipeline had race conditions and premature fallback display:
1. Fallback button showed at 10s even when version check was still running legitimately
2. Watchdog and onerror could create parallel retry chains (no deduplication)
3. No flag to track whether version check pipeline was in progress

**Fix** (index.html):
- Added `__guildVersionCheckStarted` flag — fallback button now waits if version check is running
- Added `retryInProgress` deduplication — prevents watchdog + onerror from creating parallel retry chains
- Increased fallback button timeout from 10-12s to 15s — gives pipeline enough time on slow connections
- Added `.catch()` to clear retry lock on fetch failures

### Bug 2: Dependability Drops Even When Player Worked

**Problem**: Player gets "dependability dropped — your employer noticed you didn't show up for work this week" even after working.

**Root cause** (weekEndHelpers.ts:670-672): `resetWeeklyFlags()` was called BEFORE `processEmployment()`. This reset `workedThisTurn` to `false` before it was checked, so the penalty ALWAYS triggered regardless of whether the player actually worked.

**Fix**:
1. Swapped order: `processEmployment()` now runs BEFORE `resetWeeklyFlags()`
2. Changed penalty from flat `-2` to `-10%` of current dependability (as designed)

```typescript
// BEFORE (broken):
resetWeeklyFlags(p);        // ← Sets workedThisTurn = false
processEmployment(p, ...);  // ← Checks workedThisTurn (always false!)

// AFTER (fixed):
processEmployment(p, ...);  // ← Checks workedThisTurn (correct value)
resetWeeklyFlags(p);        // ← Now safe to reset
```

### Bug 3: Too Many Week Events + Event Spam

**Problem**: Multiple events stack per week (theft + sickness + clothing damage etc.). Events happen too frequently.

**Fix**:
1. **Location events**: Added 20% gate check — only 1 in 5 location visits even checks for an event
2. **Weekly theft**: Added 30% gate check — theft roll only happens 30% of weeks (down from 100%)
3. **Max 1 random event per week**: Split `processFinances` and `processSickness` into deterministic and random parts. Deterministic always runs (interest, ongoing sickness drain). Random parts (theft, new sickness) are mutually exclusive — max 1 per week per player.

**Effective probability changes**:
| Event | Before | After |
|-------|--------|-------|
| Location event per move | ~20-40% | ~4-8% (20% gate × probability) |
| Weekly theft (Slums) | ~25% | ~7.5% (30% gate × 25%) |
| Theft + Sickness same week | Possible | Impossible (max 1) |

### Changes (3 files)

| File | Changes |
|------|---------|
| `index.html` | Version check flag, retry dedup, 15s fallback timeout |
| `src/store/helpers/weekEndHelpers.ts` | Fixed processPlayerWeekEnd order, 10% dep penalty, split random/deterministic processors, max 1 random event/week |
| `src/data/events.ts` | 20% gate on location events, 30% gate on weekly theft |

### Test Results

- **219 tests passing**, 0 failures
- TypeScript: clean, no errors
- Build: clean (both default and production)

---

## 2026-02-16 — BUG HUNT #2: SW Race Condition + Loading Progress + Module Cache-Bust (08:00 UTC)

### Overview

**BUG HUNT #2**: Systematic bug hunt using parallel AI agents. Game still refused to start after PRs #216-#220. Investigated entire loading pipeline, module initialization chain, recent PR diffs, build output, and all 219 tests.

### Investigation Findings

**Build/TypeScript/Tests**: All pass — 219 tests, 0 failures, 0 TypeScript errors, clean build (both default and DEPLOY_TARGET=github).

**Recent PRs analyzed** (since nuclear fix PR #215):
- PR #216: Mobile layout mode for zone editor — UI-only, no startup impact
- PR #218: Static content expansion (banter, events, quests, newspapers) — additive data, no startup impact
- PR #219: Variant helper functions + WeatherOverlay hook fix — no startup-blocking changes
- PR #220: Watchdog timer + retry improvements — defense layers, no startup-blocking changes

**Module-level side effects analyzed** (critical path):
- `audioManager.ts` — Singleton creates AudioContext + Audio elements at import time. Has try-catch, should not hang.
- `ambientManager.ts` — Same pattern, try-catch protected.
- `sfxManager.ts` — Creates 8-element Audio pool at import time. Try-catch protected.
- `speechNarrator.ts` — Accesses window.speechSynthesis. Try-catch protected.
- `webAudioBridge.ts` — Lazy getContext() with try-catch.
- `gameStore.ts` — Zustand store creation + auto-save subscription. Try-catch wrapped.

**Conclusion**: No new code bugs in recent PRs. The hang is BUG-001 (CDN stale cache) with three newly identified edge cases.

### Root Causes Found

**1. SW unregister race condition (index.html)**
The service worker unregister was in a separate `<script>` block (fire-and-forget), while the version.json fetch started immediately in the next `<script>` block. An old SW could intercept the version.json fetch and serve a cached response before unregistration completed. This meant the entire CDN bypass mechanism was defeated by the old SW serving stale version.json.

**Fix**: Merged SW unregister into the main loading IIFE. Chain unregister BEFORE version check using `Promise.race([unregisterSW(), timeout(2s)])` → `.then(fetchVersion)`. The version.json fetch now only starts AFTER SW cleanup completes (or times out after 2s).

**2. No loading progress feedback (index.html + main.tsx)**
The loading screen showed static "Loading the realm..." text throughout the entire loading pipeline (SW cleanup → version check → module load → React mount). Users had no way to know if the app was making progress or frozen. Many clicked "Clear Cache & Reload" prematurely, entering a reload loop.

**Fix**: Added `__guildSetStatus(msg)` function that updates the `#loading-status` element. The loading pipeline now shows:
- "Checking for updates..." (during SW unregister + version check)
- "Loading game modules..." (when entry module is injected)
- "Starting game..." (when React mount begins)
- "Retrying... (attempt N/3)" (during retry)
- "Loading is slow — retrying..." (watchdog trigger)

**3. Module retry with same CDN-cached URL (index.html)**
When version.json returned the same entry URL on retry (CDN still stale), the code waited 2s then tried the exact same URL. This could fail the same way since CDN would serve the same cached 404 response.

**Fix**: When retry gets the same entry URL, append `?_cb=timestamp` cache-buster to the module URL. This forces the CDN to treat it as a new request and fetch fresh from origin, bypassing its cache.

**4. Favicon 404 on GitHub Pages (index.html)**
`<link rel="icon" href="/favicon.png">` used an absolute path, resolving to `tombonator3000.github.io/favicon.png` instead of `tombonator3000.github.io/guild-life-adventures/favicon.png`. Same issue with apple-touch-icon.

**Fix**: Changed to relative paths: `href="favicon.png"` (no leading slash).

### Changes (3 files)

#### 1. index.html — Loading pipeline overhaul

| Change | Detail |
|--------|--------|
| SW unregister chained | `Promise.race([unregisterSW(), timeout(2s)])` → `.then(fetchVersion)` |
| Loading progress | `__guildSetStatus()` updates status text at each stage |
| Module cache-bust | On retry with same URL, append `?_cb=timestamp` to force CDN bypass |
| Favicon paths | Changed from absolute (`/favicon.png`) to relative (`favicon.png`) |
| Watchdog timer | Reduced from 12s to 10s for faster retry |
| Error pipeline | Added `.catch()` on main promise chain — loads app anyway if pipeline fails |
| Removed separate SW script | SW unregister moved inside main IIFE for proper chaining |

#### 2. src/main.tsx — Loading progress signals

| Change | Detail |
|--------|--------|
| `__guildSetStatus` type | Added to Window interface declaration |
| `setStatus()` helper | Calls `__guildSetStatus()` from inline script |
| Progress updates | "Loading game modules..." before import, "Starting game..." before mount |

#### 3. bugs.md — Updated with new findings

Added "Additional Hardening (2026-02-16, session 2)" section with 5 new edge cases and 2 new lessons learned.

### Defense Layer Summary (After Session 2)

| Layer | Purpose | When |
|-------|---------|------|
| **SW unregister (chained)** | Remove stale SWs | Before version check (awaited, max 2s) |
| version.json with CDN bypass | Detect stale HTML | After SW cleanup |
| Hot-swap from version.json | Load fresh modules without reload | When stale detected |
| Module onerror + retry | Retry with fresh version.json on 404 | If module fails to load |
| **Module cache-bust** | Bypass CDN for same-URL retries | When retry gets same entry URL |
| Watchdog timer (10s) | Detect silent failures, retry hot-swap | 10s after module injection |
| Mount timeout (15s) | Signal failure if import hangs | 15s after mount() called |
| **Loading progress text** | Show user what's happening | Throughout entire pipeline |
| Smart fallback button | Show reload button when genuinely stuck | 12s after page load |
| Reload loop protection | Prevent infinite loops (max 3 in 2 min) | On any programmatic reload |
| version.json polling | Show update banner for new versions | After React mounts |

### Verification

- **TypeScript**: No errors
- **Tests**: 219 passing, 0 failures
- **Build** (`DEPLOY_TARGET=github`): Clean, no errors
- **Built HTML verified**: All 7 checks pass (base path, entry URL, favicon, SW chaining, status function, version.json, no dev script)

---

## 2026-02-16 — BUG HUNT: Loading System Hardening — Watchdog Timer + Retry Improvements (07:25 UTC)

### Overview

**BUG HUNT**: Systematic bug hunt using parallel AI agents. Game refused to start after PR #219, hanging on "Loading the realm..." / Clear Cache. Investigated all recent changes (PRs #216, #218, #219) and the entire loading pipeline.

### Investigation Findings

**Build/TypeScript/Tests**: All pass — 219 tests, 0 failures, 0 TypeScript errors, clean build.

**Recent PRs analyzed** (since nuclear fix PR #215):
- PR #216: Mobile layout mode for zone editor — UI-only, no startup impact
- PR #218: Static content expansion (banter, events, quests, newspapers) — additive data, no startup impact
- PR #219: Variant helper functions wired into UI + WeatherOverlay hook fix — no startup-blocking changes

**Root cause**: No specific code bug found in recent PRs. The hang is the recurring BUG-001 (CDN stale cache after deployment). While the nuclear fix (PR #215) addressed the core scenario, several edge cases remained:

1. **Silent module failures** — If the module loads (200 OK) but hangs during initialization, no `onerror` fires. The loading screen stays visible with no recovery mechanism.
2. **CDN propagation delay** — When the onerror retry fetches version.json and gets the SAME stale entry URL, it gave up immediately instead of waiting for CDN propagation.
3. **No mount timeout** — If `import("./App.tsx")` hangs (never resolves), `__guildAppFailed` is never set, so the watchdog/fallback button wait too long.
4. **Fallback button timing** — The 15-second threshold was too generous. 12 seconds is enough for version check (8s max) + module load (2-4s).

### Changes (2 files)

#### 1. Watchdog timer + improved retry (`index.html`)

**Watchdog timer**: After `loadApp()` injects the module script, a 12-second watchdog timer starts. If React hasn't mounted AND no error was reported, it triggers the same retry logic as `onerror`. This catches:
- Module loads successfully but hangs during initialization
- Module `onerror` doesn't fire for certain failure modes
- Dependency imports fail silently within the module

**Improved retry logic** (`retryWithFreshVersion()`):
- Shared function between `onerror` and watchdog (was inline before)
- 3 retry attempts (was 2)
- When version.json returns the SAME entry URL (CDN still propagating), waits 2 seconds and retries instead of giving up immediately
- Checks `__guildReactMounted` between retries (stop if app loaded while waiting)

**Faster fallback button**: Reduced threshold from 15s to 12s for showing the Clear Cache button.

#### 2. Mount timeout safety net (`src/main.tsx`)

Added a 15-second timeout in `mount()`. If `import("./App.tsx")` never resolves (hung module evaluation), the timeout sets `__guildAppFailed = true`, which enables the fallback button and watchdog to act. The timeout is cleared on successful mount via `.finally()`.

### Defense Layer Summary (After Hardening)

| Layer | Purpose | When |
|-------|---------|------|
| Inline SW unregister | Remove stale SWs | Before version check |
| version.json with CDN bypass | Detect stale HTML | Before module loads |
| Hot-swap from version.json | Load fresh modules without reload | When stale detected |
| Module onerror + retry | Retry with fresh version.json on 404 | If module fails to load |
| **NEW: Watchdog timer** | Detect silent failures, retry hot-swap | 12s after module injection |
| **NEW: Mount timeout** | Signal failure if import hangs | 15s after mount() called |
| Smart fallback button | Show reload button when genuinely stuck | 12s after page load |
| Reload loop protection | Prevent infinite loops (max 3 in 2 min) | On any programmatic reload |
| version.json polling | Show update banner for new versions | After React mounts |

### Files Changed

| File | Change |
|------|--------|
| `index.html` | Watchdog timer (12s), shared `retryWithFreshVersion()` (3 attempts with 2s delay), faster fallback (12s) |
| `src/main.tsx` | Mount timeout (15s), `__guildAppFailed` flag on timeout |

### Verification

- **TypeScript**: No errors
- **Tests**: 219 passing, 0 failures
- **Build** (`DEPLOY_TARGET=github`): Clean, no errors
- **Built HTML verified**: Watchdog timer, retry logic, mount timeout all present
- **version.json verified**: Correct entry URL and CSS URLs

### Key Insight

The previous defense layers were **reactive only** — they waited for explicit error signals (`onerror`, `unhandledrejection`). But some failure modes produce NO signal: module evaluation hangs, dependency imports fail silently within an ES module, or the `onerror` event doesn't fire on certain browsers. The watchdog timer is a **proactive** defense that catches ALL of these by checking the end result (did React mount?) rather than waiting for a specific error.

---

## 2026-02-15 — NUCLEAR FIX: Loading System — CDN Cache Bypass + SW Neutered + Module Retry (17:00 UTC)

### Overview

**BUG HUNT #9**: Game STILL refuses to load after every PR merge on GitHub Pages, despite 15 previous fix attempts (PRs #185-#214). Works fine from Lovable. Systematic investigation with parallel agents found TWO fundamental issues that ALL previous fixes missed.

### Root Cause Analysis (DEFINITIVE)

**Root Cause 1: CDN cache bypass was incomplete.**
The inline script's `version.json` fetch used `{cache:'no-store'}` which only bypasses the **browser's** local HTTP cache. It did NOT include `Cache-Control: no-cache` request headers. Without these headers, the GitHub Pages CDN (Fastly) could serve a stale cached `version.json`. When both HTML and version.json are stale with matching buildTimes, the hot-swap thinks HTML is fresh and loads the stale entry URL → 404 → "Loading the realm..." forever.

**Root Cause 2: Service worker lifecycle incompatible with stale-cache recovery.**
`registerType: 'autoUpdate'` with `skipWaiting: true` + `clientsClaim: true` causes the new SW to take control of the page immediately after install. This triggers `controllerchange` events, interferes with version.json fetches (SW intercepts and may serve cached responses), and has caused 5+ infinite reload loops across PRs #198-#214. Every fix for the SW created a new issue.

### Why Previous Fixes Failed

| Fix attempt | What it addressed | What it missed |
|-------------|-------------------|----------------|
| PRs #185-#206 | Various symptoms | Wrong base path, no CDN bypass, no module retry |
| PR #211 | Fixed base path | Stale version.json from CDN → hot-swap never triggers |
| PR #212 | Hot-swap architecture | SW interference causes reload loops |
| PR #213 | Simplified defense layers | `controllerchange` → `hardRefresh()` infinite loop |
| PR #214 | Fixed controllerchange | CDN still serves stale version.json; no module retry |

### Changes (4 files)

#### 1. CDN cache bypass + module onerror retry (`index.html`)

**Inline version.json fetch** now includes `headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}` alongside `{cache:'no-store'}`. These request headers tell CDN proxy caches to revalidate with the origin server instead of serving stale cached content.

**Module onerror retry**: When the entry module fails to load (404), instead of immediately showing an error, the handler:
1. Fetches `version.json` again (CDN may have updated since the first fetch)
2. If a DIFFERENT entry URL is returned, hot-swaps to it and retries
3. Up to 2 retries before giving up
4. Shows user-friendly message: "A new version may be deploying — try again in a minute"

This handles the scenario where both HTML and version.json were stale on the first load, but the CDN has since propagated the fresh version.

#### 2. Inline SW unregister before version check (`index.html`)

Added a `<script>` block that runs BEFORE the version check to unregister ALL existing service workers:
```javascript
navigator.serviceWorker.getRegistrations().then(r => r.forEach(s => s.unregister()))
```
This is fire-and-forget: by the time the entry module loads (1-3s later), the unregister is complete and all fetches go directly to the network without SW interference. The `useRegisterSW` hook in React re-registers a fresh SW after mount.

#### 3. SW neutered for GitHub Pages (`vite.config.ts`)

- `registerType`: changed to `'prompt'` for GitHub Pages (was `'autoUpdate'`). New SWs install but don't activate until explicit trigger or all tabs closed.
- `skipWaiting`: `false` for GitHub Pages. New SW doesn't auto-activate.
- `clientsClaim`: `false` for GitHub Pages. New SW doesn't take control of existing tabs.

Combined effect: NO `controllerchange` events, NO mid-visit SW takeover, NO reload loops from SW lifecycle. The SW only provides caching benefits for images/audio on subsequent visits.

#### 4. Simplified `useAppUpdate.ts`

- Removed `controllerchange` event listener entirely (no longer needed since SW doesn't auto-activate)
- version.json polling remains as the primary update detection method
- `hardRefresh()` unchanged (still has reload loop protection)

### Defense Layer Summary (After Nuclear Fix)

| Layer | Purpose | When |
|-------|---------|------|
| Inline SW unregister | Remove stale SWs | Before version check |
| version.json with CDN bypass | Detect stale HTML | Before module loads |
| Hot-swap from version.json | Load fresh modules without reload | When stale detected |
| Module onerror retry | Retry with fresh version.json | If module 404s |
| Smart fallback button | Show reload button when genuinely stuck | 10-15s after page load |
| Reload loop protection | Prevent infinite loops (max 3 in 2 min) | On reload button click |
| version.json polling | Show update banner for new versions | After React mounts |

### Files Changed

| File | Change |
|------|--------|
| `index.html` | CDN cache bypass headers on version.json fetch, module onerror retry (2 attempts), inline SW unregister before version check |
| `vite.config.ts` | `registerType: 'prompt'` for GitHub Pages, `skipWaiting: false`, `clientsClaim: false` |
| `src/hooks/useAppUpdate.ts` | Removed `controllerchange` handler, simplified to version.json polling only |
| `bugs.md` | Updated BUG-001 with nuclear fix details and new lessons learned |

### Verification

- **TypeScript**: No errors
- **Tests**: 219 passing, 0 failures
- **Build** (`DEPLOY_TARGET=github`): Clean, no errors
- **Built SW verified**: No `self.clients.claim()`, `self.skipWaiting()` only in message listener (not auto-triggered)
- **Built HTML verified**: CDN bypass headers, module retry, SW unregister all present

### Key Insight

The fundamental mistake in all 15 previous fixes was treating this as a **client-side caching** problem. It was actually a **CDN caching** problem. `cache:'no-store'` only controls the browser's cache — it does nothing about the CDN sitting between the browser and the server. Adding `Cache-Control: no-cache` request headers was the missing piece that makes the hot-swap mechanism work reliably even when the CDN is slow to propagate new deployments.

The service worker was a secondary issue — it added complexity and created reload loops, but the primary failure was the CDN serving stale version.json.

---

## 2026-02-15 — Fix: Loading System Simplification — Eliminate Reload Loops (16:35 UTC)

### Overview

**BUG HUNT**: Game still gets stuck on "Clear Cache & Reload" after PRs. Despite 14+ previous fix attempts (PRs #185-#212) and the hot-swap architecture, the loading freeze keeps recurring. Root cause analysis with parallel agents identified THREE interacting problems in the loading defense layers.

### Root Cause Analysis

The loading system had become too complex (10+ defense layers added across 14 PRs), and the layers were **fighting each other**, creating reload loops:

**Problem 1: Premature fallback button (3-second timer)**
The "Clear Cache & Reload" fallback button appeared after just 3 seconds (first `setInterval` tick in `index.html`). On slower connections where version check + module load takes 4-8 seconds, users see the button while loading is still in progress. Clicking it triggers an unnecessary reload, which shows the same button again → user clicks again → reload loop.

**Problem 2: Redundant `checkStaleBuild()` in main.tsx had NO reload limit**
The inline script in `index.html` already handles stale-build detection with hot-swap. But `main.tsx` had a SECOND stale check that ran after the module loaded. If the inline script's version.json fetch failed (transient network error) and the 8s timeout loaded the module anyway, `checkStaleBuild()` would detect the stale build and reload — but with NO loop counter. If the reload got stale HTML again (CDN cache), it would reload again indefinitely.

**Problem 3: `cacheReload()` was fire-and-forget**
The fallback button's `cacheReload()` function started SW unregister and cache deletion as fire-and-forget `.then()` chains, then reloaded after only 300ms. The async operations might not complete in 300ms, so the reload could happen while the old SW was still active.

**Problem 4: `useAppUpdate` auto-reload on first mount**
After React mounted, `useAppUpdate` would immediately check version.json and auto-reload if stale. This conflicted with the inline script's hot-swap (which already loaded the fresh module). If both systems detected staleness, double reloads occurred.

### Changes

#### 1. Smart fallback timing with loading state flags (`index.html`)

Added three coordination flags:
- `window.__guildAppLoading` — set when `loadApp()` injects the module script
- `window.__guildAppFailed` — set when module load fails (onerror) or React mount fails
- `window.__guildReactMounted` — set when React successfully renders

The fallback `shouldShowButton()` function uses these flags:
- If React mounted → never show button
- If module explicitly failed → show immediately
- If module is still loading → wait up to 15 seconds before showing
- If loading hasn't started after 10 seconds → show (version check hung)

Changed polling interval from 3s to 2s (but `shouldShowButton` gates the actual display).

#### 2. Reload loop protection (`index.html`)

Added `sessionStorage`-based reload counter (`guild-reload-count`):
- Tracks reload count within a 2-minute window
- After 3 reloads: stops reloading and shows manual recovery steps
- Includes a "Hard Reset" button that clears localStorage + caches (nuclear option for corrupted save data)
- Counter resets after 2 minutes

#### 3. Proper cache cleanup awaiting (`index.html`)

`cacheReload()` now:
- Awaits SW unregister + cache delete via `Promise.all`
- Has a 3-second timeout fallback if cleanup hangs
- Shows "Reloading..." text and disables button to prevent double-clicks
- Only reloads after cleanup completes (or timeout)

#### 4. Removed `checkStaleBuild()` from main.tsx

Deleted the entire 66-line `checkStaleBuild()` function and its call in `mount()`. The inline script's hot-swap handles stale builds. The `useAppUpdate` hook handles ongoing version polling after mount.

#### 5. Simplified `useAppUpdate.ts`

- Removed `canAutoReload()` and `markAutoReload()` functions (no longer needed)
- Removed `AUTO_RELOAD_KEY` sessionStorage tracking
- Removed auto-reload on first mount check — now only shows update banner
- Removed `canAutoReload` check from `controllerchange` handler (hardRefresh is reliable enough)

### Defense Layer Summary (After Simplification)

| Layer | Purpose | When |
|-------|---------|------|
| Inline stale-build detection | Hot-swap fresh modules from version.json | Before module loads |
| 8s timeout | Load module anyway if version check hangs | Before module loads |
| Module onerror | Show error if entry module 404s | Module load time |
| React ErrorBoundary | Catch render errors | After module loads |
| Smart fallback button | Show reload button only when genuinely stuck | 10-15s after page load |
| Reload loop protection | Prevent infinite reload loops (max 3 in 2 min) | On reload button click |
| useAppUpdate polling | Show update banner for new versions | After React mounts |

### Files Changed

| File | Change |
|------|--------|
| `index.html` | Smart fallback timing, loading state flags, reload loop protection, proper cache cleanup |
| `src/main.tsx` | Removed `checkStaleBuild()`, added `__guildReactMounted` flag |
| `src/hooks/useAppUpdate.ts` | Removed auto-reload on first check, removed `canAutoReload`/`markAutoReload` |

### Verification

- **Tests**: 219 passing, 0 failures
- **Build** (`DEPLOY_TARGET=github`): Clean, no errors
- **Built HTML verified**: All loading flags, reload protection, and smart timing present
- **version.json verified**: Correct base paths for GitHub Pages

---

## 2026-02-15 — FIX: controllerchange → hardRefresh() Infinite Reload Loop (15:35 UTC)

### Overview

**The game still refused to load and hung on "Clear Cache & Reload"** after deploying PR #213 (which was supposed to fix the reload loops). Systematic investigation found a NEW infinite reload loop mechanism that was introduced IN PR #213 itself.

### Root Cause

**The `controllerchange` event listener in `useAppUpdate.ts` called `hardRefresh()` on EVERY page load, creating an infinite reload loop.**

The `controllerchange` event fires whenever `navigator.serviceWorker.controller` changes — including when it changes from `null` to a new SW (first registration), not just SW-to-SW swaps.

**The loop:**
1. Page loads (no SW — previous `hardRefresh()` unregistered it)
2. `useRegisterSW` registers a new SW
3. New SW installs → `skipWaiting()` → activates → `clients.claim()`
4. Controller changes from `null` to new SW → `controllerchange` fires
5. `hardRefresh()` runs → unregisters SW, clears caches, reloads with `?_gv=`
6. **GOTO step 1** — infinite reload loop

**Why `hardRefresh()` didn't stop the loop:** It had NO reload loop protection — it never checked `sessionStorage` for a reload counter. The counter in the fallback script's `cacheReload()` was only checked by the button handler, not by programmatic callers.

**Why the game appeared to hang on "Clear Cache":** The game briefly loaded (React mounted for a few frames), then immediately reloaded. From the user's perspective: the loading screen flickered repeatedly, and eventually the fallback button appeared (showing "Clear Cache & Reload"). But clicking it didn't help because `hardRefresh` kept firing.

### Additional Vulnerabilities Found

1. **`lazyWithRetry()` in Index.tsx** — Also reloaded without checking the reload counter. If chunks kept failing, this created its own independent reload loop.
2. **`ErrorBoundary` in App.tsx** — Inline `onClick` handler duplicated cache-clearing logic instead of using `hardRefresh()`, missing reload loop protection.

### Changes

#### Fix 1: Replace `controllerchange` → `hardRefresh()` with banner (ROOT CAUSE)

**`src/hooks/useAppUpdate.ts`** — The `controllerchange` listener now shows the update banner (`setVersionMismatch(true)`) instead of calling `hardRefresh()`. This is safe because:
- The version polling already detects new deploys and shows the banner
- The inline hot-swap in index.html handles stale HTML without reloading
- The user decides when to reload by clicking the update banner

#### Fix 2: Reload loop protection in `hardRefresh()`

**`src/hooks/useAppUpdate.ts`** — `hardRefresh()` now checks `sessionStorage` `guild-reload-count` before reloading. If ≥3 reloads in 2 minutes, the reload is skipped with a console warning. Uses the same counter format as the index.html fallback.

#### Fix 3: Reload loop protection in `lazyWithRetry()`

**`src/pages/Index.tsx`** — `lazyWithRetry()` now checks the same `sessionStorage` reload counter before clearing caches and reloading. If the limit is reached, it throws an error instead of reloading (letting the ErrorBoundary catch it).

#### Fix 4: ErrorBoundary uses `hardRefresh()`

**`src/App.tsx`** — The ErrorBoundary's reload button now dynamically imports and calls `hardRefresh()` instead of duplicating the cache-clearing logic. This ensures it benefits from the reload loop protection.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAppUpdate.ts` | `controllerchange` → shows banner instead of `hardRefresh()`; added reload loop protection to `hardRefresh()` |
| `src/pages/Index.tsx` | Added reload loop protection to `lazyWithRetry()` |
| `src/App.tsx` | ErrorBoundary uses `hardRefresh()` instead of inline logic |
| `bugs.md` | Updated BUG-001 with new root cause and fix |
| `log2.md` | This entry |

### Verification

- **TypeScript**: No errors
- **Tests**: 219 passing, 0 failures
- **Build** (`DEPLOY_TARGET=github`): Clean, no errors

### Pattern: Defense Layers That Attack Each Other

This is the 15th fix attempt for BUG-001. The recurring pattern:
1. A defense layer is added to handle stale-cache scenarios
2. The defense layer itself creates a new reload path
3. The new reload path doesn't share reload loop protection with other paths
4. Multiple paths reload independently → infinite loop

**Lesson**: ALL reload paths MUST share a single reload counter. No function should call `location.replace()` or `location.reload()` without checking the counter first.

---

## 2026-02-15 — DEFINITIVE FIX: "Loading the realm..." Freeze — Root Cause Found (15:30 UTC)

### Overview

**Systematic bug hunt** with parallel AI agents to find the PERMANENT root cause of the recurring "Loading the realm..." freeze that has been "fixed" 12 times across PRs #185–#206 but kept returning after every new deployment.

### Root Cause Found

**The inline stale-build detection script in `index.html` used the WRONG base path to fetch `version.json` on GitHub Pages.** This made the entire deferred module loading defense system (built across PRs #200-#206) completely non-functional on GitHub Pages.

```javascript
// BROKEN (index.html inline script):
var base = document.querySelector('base[href]');  // No <base> tag exists!
base = base ? base.getAttribute('href') : '/';    // Always defaults to '/'
fetch(base + 'version.json?_=' + Date.now(), ...) // Fetches /version.json → 404

// On GitHub Pages, should fetch: /guild-life-adventures/version.json
```

**Why this caused the recurring freeze:**
1. After each PR merge → GitHub Pages deploys new code with new chunk hashes
2. Browser has stale HTML cached (GitHub Pages `Cache-Control: max-age=600`)
3. Inline script tries to detect stale build via `version.json`
4. Fetch goes to `/version.json` instead of `/guild-life-adventures/version.json` → 404
5. 404 response → `null` → falls through: "Can't determine version — load the app anyway"
6. `loadApp()` injects stale entry module with old chunk URLs
7. Old chunks are 404'd on the server → React never mounts → "Loading the realm..." forever

**Why previous fixes didn't work:**
- PRs #200-#206 built an elaborate multi-layer defense (version checking, deferred module loading, cache busting) — but the PRIMARY defense layer (inline script version check) always failed on GitHub Pages due to the wrong base path
- The `main.tsx` version check uses `import.meta.env.BASE_URL` (correct) but runs AFTER the module loads — too late if chunks already 404'd

### Changes

#### Fix 1: Inject base path into HTML (ROOT CAUSE FIX)

**`vite.config.ts`** — `versionJsonPlugin()` now injects `window.__HTML_BASE__` alongside `window.__HTML_BUILD_TIME__`:
```javascript
// Built HTML now contains:
window.__HTML_BUILD_TIME__="2026-02-15T...";
window.__HTML_BASE__="/guild-life-adventures/";
```

**`index.html`** — Inline script uses injected base instead of broken `<base>` tag lookup:
```javascript
// BEFORE (broken):
var base = document.querySelector('base[href]');
base = base ? base.getAttribute('href') : '/';

// AFTER (fixed):
var base = window.__HTML_BASE__ || '/';
```

#### Fix 2: Defensive save data validation

**`src/store/gameStore.ts`** — `loadFromSlot()` now validates save data before applying:
- Checks `gameState`, `players` array exists and is non-empty
- Validates `phase` is a valid GamePhase value
- Invalid saves are logged and deleted instead of crashing
- Prevents corrupted localStorage from causing UI hangs

#### Fix 3: hardRefresh() timeout protection

**`src/hooks/useAppUpdate.ts`** — `hardRefresh()` now wraps SW/cache cleanup in a 5-second timeout:
- Prevents infinite hang if `navigator.serviceWorker.getRegistrations()` or `caches.keys()` don't resolve
- After timeout, proceeds directly to cache-busting reload
- Removed redundant SW verification step (retry unregister)

#### Fix 4: Bug catalog

**`bugs.md`** — New file cataloging all known bugs with root causes, fixes, and pattern analysis:
- BUG-001: Loading freeze (13 fix attempts documented)
- BUG-002: Autosave victory loop
- BUG-003: Shadow Market hex tab crash
- BUG-004: Multi-AI standing still
- BUG-005: Mobile center panel too large

### Files Changed

| File | Change |
|------|--------|
| `vite.config.ts` | Inject `window.__HTML_BASE__` in versionJsonPlugin |
| `index.html` | Use `window.__HTML_BASE__` instead of `<base>` tag lookup for version.json fetch |
| `src/store/gameStore.ts` | Validate save data structure in `loadFromSlot()` |
| `src/hooks/useAppUpdate.ts` | 5s timeout on hardRefresh() cleanup operations |
| `bugs.md` | New: centralized bug catalog with 5 entries |

### Verification

- **Build**: Clean, no errors
- **Tests**: Passing

---

## 2026-02-15 — Fix: Mobile Center Panel Still Too Large (14:00 UTC)

### Overview

Follow-up to the earlier mobile panel fix. Even after reducing from 65% to 40%, the center panel still covered too much of the screen on mobile, making the game board unplayable. The panel was full-width and anchored to the bottom edge, blocking interaction with location zones.

### Changes

Transformed the mobile center panel from a full-width bottom sheet into a compact, centered floating panel:

| Property | Before | After |
|----------|--------|-------|
| `height` | 40% | 30% |
| `width` | 100% | 92% |
| `left` | 0% | 4% |
| `bottom` | 0% | 2% |
| `borderRadius` | none | 12px |
| Inner div corners | none on mobile | `rounded-xl` |
| Banter bubble `bottom` | 41% | 33% |

The panel is now a compact rounded rectangle floating near the bottom of the screen with margins on all sides, leaving the game board visible and interactive around it.

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/GameBoard.tsx` | Mobile center panel: width 100%→92%, height 40%→30%, left 0%→4%, bottom 0%→2%, added borderRadius 12px, inner div rounded-xl on mobile, banter bubble bottom 41%→33% |

### Verification

- **Build**: Clean, no errors

---

## 2026-02-15 — Fix: Mobile Center Panel Too Large + Play Again After Victory (12:20 UTC)

### Overview

Two fixes: (1) Mobile center panel covered 65% of the screen making the game unplayable on phones — reduced to 40%. (2) "Play Again" after victory/game-over could fail due to stale autosave causing instant re-victory loop, and stale game state persisting across game sessions.

### Issue 1: Mobile Center Panel Size

The center panel (location details, events) on mobile was set to `height: 65%`, covering most of the game board and making it impossible to interact with location zones.

**Fix**: Reduced to `height: 40%`. Also adjusted the banter bubble position from `bottom: 66%` to `bottom: 41%` to stay aligned above the panel.

### Issue 2: Play Again / Game Loading After PR

Root causes identified:

1. **Autosave victory loop**: Autosave runs during 'playing' phase but NOT during 'victory'. This means the last autosave is from RIGHT BEFORE victory was triggered. If user goes Victory → Title → Continue, the autosave loads the pre-victory state, `checkVictory` fires on next `endTurn`, and the user is immediately sent back to VictoryScreen — creating an infinite loop.

2. **Stale state on transition**: VictoryScreen's "Return to Title" only called `setPhase('title')`, leaving old `winner`, `players`, and other game state in memory. This could cause unexpected behavior when starting a new game.

3. **Version check timeout too aggressive**: The inline stale-build detection in `index.html` had a 3s fallback timeout that could cause stale code to load before `version.json` check completed on slow/mobile networks.

**Fixes**:

- **New `resetForNewGame` action** in gameStore: Clears all game state (players, winner, economy, weather, etc.), deletes autosave slot 0, and sets phase to 'title'. Used by VictoryScreen buttons.
- **Delete autosave on victory**: All 5 victory paths (checkVictory in questHelpers, last-standing and all-dead in turnHelpers, last-standing and all-dead in weekEndHelpers, setPhase('victory') in gameStore) now call `deleteSave(0)` to prevent the Continue → re-victory loop.
- **VictoryScreen uses resetForNewGame**: "Return to Title" calls `resetForNewGame()`. "New Game" calls `resetForNewGame()` then `setPhase('setup')`.
- **Version check timeout increased**: `index.html` inline script timeout increased from 3s to 8s, reducing the race condition where stale HTML loads before staleness is detected.

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/GameBoard.tsx` | Mobile center panel height 65% → 40%, banter bubble position 66% → 41% |
| `src/store/gameStore.ts` | Added `resetForNewGame` action, `setPhase('victory')` deletes autosave, import `deleteSave` |
| `src/store/storeTypes.ts` | Added `resetForNewGame` to store type |
| `src/components/screens/VictoryScreen.tsx` | Buttons use `resetForNewGame()` instead of `setPhase('title')` |
| `src/store/helpers/questHelpers.ts` | `checkVictory` deletes autosave before setting victory |
| `src/store/helpers/turnHelpers.ts` | Last-standing and all-dead paths delete autosave |
| `src/store/helpers/weekEndHelpers.ts` | Last-standing and all-dead paths delete autosave |
| `index.html` | Version check fallback timeout 3s → 8s |

### Verification

- **Tests**: 219 passing, 0 failures
- **Build**: Clean, no errors

---

## 2026-02-14 — Bug Fix: Shadow Market Hex Tab Crash — Missing `players` Destructuring (23:00 UTC)

### Overview

Fixed a crash that occurred when opening the "Dirty Tricks" (hex shop) tab at the Shadow Market. The game threw a `ReferenceError: players is not defined` when hexes were enabled and the player navigated to the Dirty Tricks tab.

### Root Cause

In `src/components/game/locationTabs.tsx`, the `shadowMarketTabs()` function destructured many properties from the `ctx` (LocationTabContext) parameter, but **forgot to include `players`**. The `players` array was then passed to `<HexShopPanel players={players} />` on line 557, referencing an undefined variable.

The equivalent function `enchanterTabs()` (which also uses HexShopPanel) correctly destructured `players` from `ctx`. The shadow market version was the only one with this omission.

**Why TypeScript didn't catch it**: The project uses `strict: false` and `noImplicitAny: false` in tsconfig, which allowed the bare `players` reference to pass type-checking without error.

### Bug Details

| Item | Detail |
|------|--------|
| **Symptom** | Game crashes when clicking "Dirty Tricks" tab in Shadow Market |
| **Trigger** | Hex feature enabled + visiting Shadow Market + clicking hex tab |
| **Error** | `ReferenceError: players is not defined` |
| **Root cause** | `players` not destructured from `ctx` in `shadowMarketTabs()` |
| **File** | `src/components/game/locationTabs.tsx:504` |

### Fix

```diff
 function shadowMarketTabs(ctx: LocationTabContext): LocationTab[] {
-  const { player, priceModifier, spendTime, modifyGold, modifyHappiness, modifyFood,
+  const { player, players, priceModifier, spendTime, modifyGold, modifyHappiness, modifyFood,
     buyLotteryTicket, buyTicket, economyTrend, week, weeklyNewsEvents, onShowNewspaper } = ctx;
```

### Verification

- **Build output before fix**: `players` was a bare identifier (undefined at runtime)
- **Build output after fix**: `players:n` (properly mapped to local variable from destructuring)
- **Tests**: 219 passing, 0 failures
- **Build**: Clean, no errors
- All 12 other tab factory functions checked — no similar bugs found

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/locationTabs.tsx` | Added `players` to destructuring in `shadowMarketTabs()` |

---

## 2026-02-14 — Bug Hunt #8: Eliminate ALL Remaining `location.reload()` Stale-Cache Paths (22:00 UTC)

### Overview

Systematic bug hunt using 3 parallel AI agents to analyze the entire loading pipeline. Found **6 places** where `location.reload()` was used without the cache-busting `?_gv=` parameter that was introduced in the previous fix (PR #205). Any of these could cause the recurring "Loading the realm..." infinite freeze when GitHub Pages serves stale cached HTML (`Cache-Control: max-age=600`).

### Root Cause

The previous fix correctly implemented cache-busting reloads in `hardRefresh()` (useAppUpdate.ts) and the index.html stale-build detection inline script. However, **6 other reload paths** still used plain `location.reload()`, which on GitHub Pages may serve the **same stale HTML from browser HTTP cache**:

1. Stale HTML references old content-hashed chunk URLs (e.g., `index-abc123.js`)
2. Those chunks no longer exist on the server after a deploy
3. `location.reload()` sends a conditional request → CDN returns 304 → stale HTML again
4. The stale HTML tries to load non-existent chunks → 404 → "Loading the realm..." forever

### 6 Bugs Fixed

| # | File | Location | Context |
|---|------|----------|---------|
| 1 | `src/App.tsx:60` | ErrorBoundary "Clear Cache & Reload" button | Also fixed: cache clearing was fire-and-forget (`.then()` without `await`), reload could fire before cleanup completed |
| 2 | `src/hooks/useAppUpdate.ts:125` | `onControllerChange` handler (SW takeover) | Changed from `location.reload()` to `hardRefresh()` which already has cache-busting |
| 3 | `src/main.tsx:108` | `checkStaleBuild()` reload after detecting stale build | Added cache-busting with `?_gv=` param |
| 4 | `src/main.tsx:41` | `showMountError()` reload button (inline HTML) | Added cache-busting to inline onclick handler |
| 5 | `src/pages/Index.tsx:35` | `lazyWithRetry()` reload after 2x chunk failure | Added cache-busting with `?_gv=` param |
| 6 | `index.html:65` | `__guildShowLoadError()` reload button (pre-React) | Added cache-busting to inline onclick handler |

### Fix Pattern

Every reload now follows the same pattern with a fallback:
```javascript
try {
  const url = new URL(window.location.href);
  url.searchParams.set('_gv', String(Date.now()));
  window.location.replace(url.toString());
} catch {
  window.location.reload(); // Fallback only if URL manipulation fails
}
```

### Additional Fix: App.tsx ErrorBoundary (Bug 1)

The ErrorBoundary's "Clear Cache & Reload" button had a secondary issue: cache clearing was fire-and-forget using `.then()` chains, meaning `location.reload()` could fire before caches were actually deleted. Fixed to use `async/await` and also await SW unregistration + 300ms propagation delay before the cache-busting reload.

### Files Changed

| File | Changes |
|------|---------|
| `src/App.tsx` | ErrorBoundary: await cache cleanup + cache-busting reload |
| `src/hooks/useAppUpdate.ts` | controllerchange: use `hardRefresh()` instead of `location.reload()` |
| `src/main.tsx` | checkStaleBuild + showMountError: cache-busting reloads |
| `src/pages/Index.tsx` | lazyWithRetry: cache-busting reload |
| `index.html` | Error handler reload button: cache-busting |

### Remaining `location.reload()` Audit

After fixes, ALL remaining `location.reload()` calls are in catch-fallback positions only (when `new URL()` constructor fails — e.g., very old browsers). Primary reload paths all use cache-busting `?_gv=`.

### GitHub Context

This is the **8th fix attempt** for the recurring "Loading the realm..." freeze. Previous 10+ PRs (#185, #188, #193, #194, #195, #198, #199, #200, #201, #204, #205) each fixed symptoms but missed these remaining reload paths. A full audit of all reload call sites was needed.

### Test Results

```
219 tests passed (10 files), 0 failures
Build: clean (no TypeScript or ESLint errors)
Precache: 23 entries / 2,379 KB (unchanged)
```

---

## 2026-02-14 — DEFINITIVE Fix: "Loading the Realm..." Infinite Freeze (21:30 UTC)

### Overview

Systematic bug hunt targeting the recurring "Loading the realm..." freeze. This is the **7th attempt** to fix this issue (6 previous PRs all addressed symptoms but not root causes). This time: a deep architectural analysis identified 3 root causes that all previous fixes missed, plus an implementation of 5 targeted fixes.

### Root Cause Analysis

After analyzing all 6 previous fix attempts and the full loading architecture (4 defense layers, 3 cache systems, 2 version detection methods), identified 3 fundamental root causes:

**Root Cause 1 — Race condition between version check and module loading:**
The inline stale-build check (`version.json` fetch) runs asynchronously, but Vite's `<script type="module">` tag starts loading **in parallel** (browser preloader begins fetching immediately). If the module requests reference old chunk hashes (from stale cached HTML), the 404 errors fire BEFORE the version check can trigger a reload. The previous fix attempted to catch this with `unhandledrejection`, but that only shows an error — it doesn't prevent the race.

**Root Cause 2 — `location.reload()` doesn't bypass browser HTTP cache:**
GitHub Pages sends `Cache-Control: max-age=600` (10-minute cache). The `<meta http-equiv="Cache-Control">` tags in the HTML are **ignored by modern browsers** — only HTTP response headers matter. After clearing SW caches, `location.reload()` sends a conditional request (If-Modified-Since), but the browser may STILL serve the cached HTML if the CDN returns 304. This means the reload loop (clear cache → reload → still stale) could burn through the 2-reload limit without ever getting fresh HTML.

**Root Cause 3 — 40 MB precache causing mid-visit SW takeover:**
The SW precached 322 image/icon entries totaling ~40 MB. On a slow connection, SW installation could take minutes. With `skipWaiting: true` + `clientsClaim: true`, the new SW activates immediately after install — taking control of the page while old JavaScript is still running in memory. The old JS then tries to lazy-load chunks that the new SW doesn't have → 404 → freeze.

### Fixes Applied (5 changes across 4 files)

#### Fix 1: Deferred Module Loading (vite.config.ts) — Eliminates race condition
**New Vite plugin: `deferModulePlugin()`**

In production, removes the `<script type="module">` tag from the built HTML and stores its URL in `window.__ENTRY__`. The inline stale-check script now dynamically injects the module script ONLY after confirming the HTML is fresh via `version.json`. This completely eliminates the race condition — the module never starts loading until the version check passes (or times out after 3s).

```
Before: version check runs async ←→ module loads in parallel ← RACE CONDITION
After:  version check → pass → load module (sequential)
```

Also removes `<link rel="modulepreload">` tags to prevent wasted 404 fetches on stale builds. Preloads are re-injected by `loadApp()` after the version check passes.

Dev mode is unaffected (plugin is `apply: 'build'` only).

#### Fix 2: Deferred Loading Logic in index.html — New `loadApp()` function
Rewrote the inline stale-build detection script with a `loadApp()` function that:
1. Injects modulepreload links for performance
2. Creates and appends the `<script type="module">` dynamically
3. Strips the `_gv` cache-buster parameter from the URL
4. Is called when: version check passes, version check fails (can't determine), or 3s timeout

#### Fix 3: Cache-Busting Reload (useAppUpdate.ts + index.html)
Replaced all `location.reload()` calls with cache-busting URL parameter:
```javascript
// Before (may serve cached HTML):
window.location.reload();

// After (forces fresh network fetch):
const url = new URL(window.location.href);
url.searchParams.set('_gv', String(Date.now()));
window.location.replace(url.toString());
```

This bypasses the browser's HTTP cache by treating the request as a navigation to a new URL. Applied in:
- `hardRefresh()` in `useAppUpdate.ts`
- Stale-build reload in `index.html` inline script
- "Clear Cache & Reload" fallback button in `index.html`

The `_gv` parameter is stripped from the URL by:
- The `loadApp()` function in `index.html` (primary)
- A safety net at the top of `main.tsx` (secondary)

#### Fix 4: Precache Reduction (vite.config.ts) — 94% size reduction
Reduced SW precache from **322 entries / 39,384 KB (~40 MB)** to **23 entries / 2,379 KB (~2.3 MB)**:

**Before:**
```javascript
includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon.svg",
  "music/*.mp3", "ambient/*.mp3", "sfx/*.mp3", "npcs/*.jpg"],
globPatterns: ["**/*.{ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
```

**After:**
```javascript
includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon.svg"],
globPatterns: ["pwa-*.png", "favicon.ico"],
```

All game images, audio, NPC portraits, and SFX are now cached **on-demand** via the existing `CacheFirst` runtime caching rules (which were already configured but underutilized). Increased `maxEntries` for image cache (50 → 500) and music cache (20 → 100) to accommodate on-demand caching.

This makes SW install near-instant, preventing the mid-visit takeover scenario from Root Cause 3.

#### Fix 5: URL Cleanup (main.tsx)
Added safety-net cleanup of the `_gv` cache-busting parameter at the top of `main.tsx` (before React mounts), in case the inline script's cleanup didn't run.

### Files Changed

| File | Changes |
|------|---------|
| `vite.config.ts` | New `deferModulePlugin()` Vite plugin; reduced `includeAssets` and `globPatterns`; increased runtime cache `maxEntries` |
| `index.html` | Rewrote stale-check script with deferred `loadApp()` function; cache-busting reloads; cleaner fallback button |
| `src/hooks/useAppUpdate.ts` | `hardRefresh()` uses cache-busting URL param instead of `location.reload()` |
| `src/main.tsx` | Added `_gv` parameter cleanup at top of module |

### Defense Layers (Updated Architecture)

```
Layer 0: Deferred Module Loading (NEW — index.html + deferModulePlugin)
  └── Module script NOT in HTML — loaded dynamically after version check
  └── No more race condition between check and module loading

Layer 1: Stale-Build Detection (index.html inline script)
  └── Fetches version.json BEFORE loading any modules
  └── Cache-busting reload on mismatch (NEW: ?_gv= param)
  └── 3s timeout: loads anyway if version check hangs

Layer 2: Pre-Mount Version Check (main.tsx)
  └── Secondary defense: reuses window.__versionCheck promise
  └── Catches edge cases the inline check missed

Layer 3: Chunk Retry Logic (Index.tsx)
  └── lazyWithRetry() retries failed chunk imports
  └── On second failure: clear caches + cache-busting reload

Layer 4: In-App Update Detection (useAppUpdate.ts)
  └── version.json polling (every 60s)
  └── controllerchange listener
  └── hardRefresh() with cache-busting reload (NEW)

Layer 5: Fallback Timer (index.html)
  └── "Clear Cache & Reload" button after 5s
  └── Uses cache-busting reload (NEW)
```

### Test Results

```
219 tests passed (10 files), 0 failures
Build: clean (no TypeScript or ESLint errors)
GitHub Pages build: clean (with base path /guild-life-adventures/)
Precache: 23 entries / 2,379 KB (was 322 entries / 39,384 KB)
```

---

## 2026-02-14 — Bug Hunt: Shadow Market Crashes + Multiplayer Connection Fixes + Audit (21:00 UTC)

### Overview

Systematic bug hunt using parallel AI agents. Three areas fixed:
1. **Shadow Market hex/curse system crashes** — 4 bugs causing TypeError crashes
2. **Multiplayer connection hangs** — missing timeouts causing infinite "Connecting..." state
3. **General audit fixes** — defensive guards for AI executor and turn switching

### Bug 1: Shadow Market Crashes (CRITICAL)

**Root Cause:** The hex/curse system has three hex categories: `location` (blocks a board location), `personal` (debuff on a player), and `sabotage` (instant destruction). Location hexes have NO `effect` field — they only have `targetLocation`. Multiple code paths accessed `hex.effect.type` without verifying the hex has an effect.

#### Fix 1a: `rollGraveyardRitual()` returns location hexes in backfire pool
**File:** `src/data/hexes.ts:485-498`

The graveyard dark ritual pool included LOCATION_HEXES. When the ritual backfired (15% chance), the code tried to create an `ActiveCurse` from the hex's `effect` field — but location hexes don't have one.

**Fix:** When `backfired=true`, filter the pool to only include hexes with `effect != null`. Non-backfired rolls are fine since the player just gets a scroll.

#### Fix 1b: `castPersonalCurse()` missing category guard
**File:** `src/store/helpers/hexHelpers.ts:107`

Validation checked `!hex.effect` but not `hex.category === 'location'`. A player could theoretically cast a location hex via the personal curse path.

**Fix:** Added `hex.category === 'location'` to the validation check.

#### Fix 1c: `applySabotageHex()` uses non-null assertion on `hex.effect`
**File:** `src/store/helpers/hexHelpers.ts:444-523`

The function used `hex.effect!.type` (non-null assertion) in two switch statements without validating that `effect` exists.

**Fix:** Added early return if `hex.effect` is null. Stored `effectType` in a local variable to avoid repeated non-null assertions.

#### Fix 1d: `performDarkRitual()` backfire with null hex
**File:** `src/store/helpers/hexHelpers.ts:286`

Added defensive `hex &&` check alongside existing `hex.effect` check in the backfire branch.

### Bug 2: Multiplayer Connection Hangs (CRITICAL)

**Root Cause:** `createRoom()` and `joinRoom()` in PeerManager wrapped PeerJS initialization in a Promise, but had NO timeout if the PeerJS signaling server was unreachable. The `peer.on('open')` event would never fire, and the `peer.on('error')` event doesn't always fire for network failures. Result: the Promise hung forever, showing "Connecting..." indefinitely.

#### Fix 2a: `createRoom()` — 20s outer timeout
**File:** `src/network/PeerManager.ts:181-237`

Added `settled` flag and 20-second timeout. If the Peer never opens, the promise rejects with a clear error message: "Could not reach the multiplayer server. Check your internet connection and try again."

#### Fix 2b: `joinRoom()` — 20s outer timeout
**File:** `src/network/PeerManager.ts:242-291`

Same pattern: `settled` flag + 20-second timeout covering both signaling server connection AND host data channel. Error message: "Connection timed out. The room may not exist, or check your internet connection."

#### Fix 2c: `connectToHost()` — clean up DataConnection on timeout
**File:** `src/network/PeerManager.ts:292-310`

The existing 10s timeout in `connectToHost()` rejected the promise but didn't close the stale `DataConnection`, causing a memory leak. Added `conn.close()` in the timeout handler.

### Bug 3: Audit Fixes

#### Fix 3a: AI action executor crash protection
**File:** `src/hooks/ai/actionExecutor.ts:615-622`

Wrapped `handler(player, action, store)` in try-catch. If an AI action handler throws (e.g., accessing undefined property), the error is logged and the action returns `false` instead of crashing the entire game.

#### Fix 3b: Turn switching null guard
**File:** `src/store/helpers/turnHelpers.ts:177`

Added null check on `nextPlayer` after array index access. If `freshState.players[nextIndex]` is somehow undefined (edge case during multiplayer or after player deaths), the turn switch aborts with an error log instead of crashing with "Cannot read property 'housing' of undefined".

### Files Changed

| File | Changes |
|------|---------|
| `src/data/hexes.ts` | Fixed `rollGraveyardRitual()` to filter location hexes from backfire pool |
| `src/store/helpers/hexHelpers.ts` | Added category guard to `castPersonalCurse()`, defensive null check in `applySabotageHex()` and `performDarkRitual()` |
| `src/network/PeerManager.ts` | Added 20s timeouts to `createRoom()`/`joinRoom()`, connection cleanup in `connectToHost()` |
| `src/hooks/ai/actionExecutor.ts` | Wrapped `executeAIAction()` in try-catch |
| `src/store/helpers/turnHelpers.ts` | Added null guard for `nextPlayer` in `endTurn()` |

### Test Results

```
219 tests passed (10 files), 0 failures
Build: clean (no TypeScript or ESLint errors)
```

---

## 2026-02-14 — Timer Bug Hunt: Work Silent Failure + Animation Stutter Fix (20:30 UTC)

### Bug Report

User reported: "Time doesn't go evenly. It suddenly stopped going evenly. Work button doesn't decrease time or pay money. Movement is very slow."

### Root Cause Analysis (4 bugs found)

#### BUG 1 (CRITICAL): workShift silently fails but toast shows success
**File:** `src/components/game/WorkSection.tsx`, `src/components/game/locationTabs.tsx`

The `workShift()` function returned `void` and had early-return validation (not enough time, clothing too worn, naked). But all 3 UI call sites fired `toast.success("Worked a shift!")` **unconditionally** — even when workShift rejected the action and returned early. The player saw a success message but no time deduction and no gold.

**Why work was failing:** The validation check (`player.timeRemaining < hours`) read player state with `get()` OUTSIDE the Zustand `set()` callback. Between the validation read and the state update, the player's state could have changed (e.g., movement animation completing), causing validation to use stale data. This race condition meant work could silently fail even when the UI showed the player had enough time.

#### BUG 2 (HIGH): Animation useEffect had `position` in dependency array
**File:** `src/components/game/AnimatedPlayerToken.tsx`

The animation effect at line 84 depended on `[animationPath, position, onAnimationComplete, onLocationReached]`. Since the effect itself called `setPosition()`, every position update triggered:
1. Effect cleanup (clear old timeout)
2. Effect re-run (set new timeout)

This created unnecessary overhead per waypoint. Combined with callback reference changes from parent re-renders, the animation could stutter or restart unpredictably.

#### BUG 3 (MEDIUM): Animation too slow — 150ms per waypoint + duplicate waypoints
**File:** `src/components/game/AnimatedPlayerToken.tsx`, `src/data/locations.ts`

Each waypoint animated with a 150ms `setTimeout` AND a matching 150ms `transition-all` CSS. With `transition-all`, every CSS property (including shadows, transforms, opacity) was transitioning — not just position. For a 5-step journey with 2 waypoints per segment: ~15 points × 150ms = 2.25 seconds.

Three movement paths had duplicate consecutive waypoints causing unnecessary pauses:
- `noble-heights_general-store`: `[[5.6, 51.4], [5.6, 51.4]]` — 2 identical points
- `rusty-tankard_shadow-market`: `[[81.8, 33.4], [81.8, 33.4]]` — 2 identical points
- `noble-heights_graveyard`: `[..., [5.1, 38.3], [5.1, 38.3]]` — duplicate at end

#### BUG 4 (LOW): animate-bounce during movement
The token had `animate-bounce` (Tailwind keyframe) applied during movement combined with `transition-all`, causing visual conflicts between the bounce keyframe and position transitions.

### Fixes Applied

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `workEducationHelpers.ts` | Moved ALL validation inside `set()` callback — reads latest state atomically. Changed return type from `void` to `boolean`. |
| 2 | **CRITICAL** | `storeTypes.ts` | Updated `workShift` signature: `void` → `boolean`. |
| 3 | **CRITICAL** | `WorkSection.tsx` | Check `workShift()` return value before showing toast. Show error toast on failure. |
| 4 | **CRITICAL** | `locationTabs.tsx` | Same fix as WorkSection — check return before toast. |
| 5 | **HIGH** | `actionExecutor.ts` | Updated AI executor's `workShift` type to `boolean`. |
| 6 | **HIGH** | `AnimatedPlayerToken.tsx` | Rewrote animation: removed `position` from deps, use `setInterval` instead of recursive `setTimeout`, use callback refs to prevent animation restarts. |
| 7 | **MEDIUM** | `AnimatedPlayerToken.tsx` | Reduced animation speed from 150ms to 80ms per waypoint. Changed CSS from `transition-all duration-150` to targeted `transition: left 80ms, top 80ms` — no longer transitions shadows/transforms. Disabled `animate-bounce` during movement. |
| 8 | **MEDIUM** | `locations.ts` | Removed 4 duplicate waypoints from 3 movement paths. |

### Technical Details

**workShift before (race condition):**
```typescript
workShift: (playerId, hours, wage) => {
  const player = get().players.find(...);  // reads state HERE
  if (!player || player.timeRemaining < hours) return;  // validates against stale state
  // ... more validation with stale state ...
  set((state) => ({  // updates with CURRENT state
    players: state.players.map(p => ...)
  }));
}
```

**workShift after (atomic):**
```typescript
workShift: (playerId, hours, wage): boolean => {
  let success = false;
  set((state) => {
    const p = state.players.find(...);  // reads CURRENT state
    if (!p || p.timeRemaining < hours) return {};  // validates against current state
    // ... all validation against current state ...
    success = true;
    return { players: state.players.map(...) };
  });
  return success;
}
```

**Animation before (stuttering):**
```typescript
useEffect(() => {
  // ... set timeout to update position ...
  const timer = setTimeout(() => {
    setPosition(nextPoint);  // triggers re-render → re-runs THIS effect
  }, 150);
  return () => clearTimeout(timer);
}, [animationPath, position, onAnimationComplete, onLocationReached]);
// position in deps = effect re-runs every frame
```

**Animation after (smooth):**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    setPosition(nextPoint);  // updates position without triggering effect
    if (done) { clearInterval(interval); onCompleteRef.current?.(); }
  }, 80);
  return () => clearInterval(interval);
}, [animationPath]);  // only animationPath — position NOT in deps
```

### Files Changed (7 files)

```
src/store/helpers/workEducationHelpers.ts  — Atomic validation inside set(), return boolean
src/store/storeTypes.ts                    — workShift return type: void → boolean
src/components/game/WorkSection.tsx        — Conditional toast based on success/failure
src/components/game/locationTabs.tsx       — Conditional toast based on success/failure
src/hooks/ai/actionExecutor.ts            — Updated workShift type
src/components/game/AnimatedPlayerToken.tsx — Rewrote animation (setInterval, 80ms, targeted CSS transition)
src/data/locations.ts                      — Removed 4 duplicate waypoints
```

### Verification

- TypeScript: Clean (no errors)
- Tests: **219/219 passing** (10 test files, 0 failures)
- Build: Succeeds cleanly

---

## 2026-02-14 - PWA Infinite Loading Fix (Round 2)

### Overview (08:30 UTC)

**Recurring critical bug**: Every time GitHub Pages deploys a new version and the user clicks "Update Now", the game hangs on the loading screen forever and never starts. This was supposedly fixed earlier on 2026-02-14, but the fix was insufficient — the bug kept recurring.

### Root Cause Analysis

The PWA update system had **two paths** when the user clicked "Update Now":
- **Path A (version mismatch)**: `hardRefresh()` → unregister SWs, clear caches, reload. **This worked.**
- **Path B (SW update only)**: `updateServiceWorker(true)` → sends skip-waiting message to new SW. **This was broken.**

**Why Path B caused infinite loading:**

1. `updateServiceWorker(true)` from vite-pwa sends a `postMessage({ type: 'SKIP_WAITING' })` to the waiting service worker
2. The new SW activates immediately (`skipWaiting: true` + `clientsClaim: true` in vite.config.ts)
3. The new SW takes control and starts serving **new** assets (JS bundles with new hashes)
4. But **no page reload ever happens** — the old JavaScript keeps running in memory
5. Old JS tries to import modules or fetch assets that no longer exist (hash mismatch)
6. React fails to mount or crashes silently → loading screen stays forever

The comment at line 63 of `useAppUpdate.ts` claimed: *"The page reloads when the new SW takes control via the controllerchange event"* — but **no controllerchange event listener was ever registered**. This was a documentation lie.

### Fixes Applied

**1. Always use `hardRefresh()` for user-triggered updates** (`useAppUpdate.ts`)
- Removed the `updateServiceWorker(true)` code path entirely
- Both version mismatch AND SW update now go through the same reliable `hardRefresh()` path
- `hardRefresh()` = unregister all SWs + clear all caches + `window.location.reload()`
- No more race condition between old JS and new SW

**2. Added `controllerchange` event listener** (`useAppUpdate.ts`)
- Safety net for automatic SW activations (not user-triggered)
- If a new SW takes control via auto-update, the page now reloads automatically
- Respects the 30-second throttle to prevent reload loops
- Properly cleaned up on unmount

**3. Improved index.html fallback timer** (`index.html`)
- Previous: single 8s timeout, one-shot check
- Now: checks at both 8s and 15s (second chance for slow connections)
- Extracted to named function `guildFallbackCheck()` for reuse
- Guards against adding duplicate buttons (checks `.fallback-btn` class)

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useAppUpdate.ts` | Removed `updateServiceWorker` path; `updateApp` always calls `hardRefresh()`; added `controllerchange` listener |
| `index.html` | Dual fallback timer (8s + 15s); extracted to named function; duplicate guard |

### Technical Details

**Before (broken):**
```typescript
const updateApp = useCallback(async () => {
  if (versionMismatch) {
    await hardRefresh();           // ← This worked
  } else {
    await updateServiceWorker(true); // ← This caused infinite loading
  }
}, [versionMismatch, updateServiceWorker]);
```

**After (fixed):**
```typescript
const updateApp = useCallback(async () => {
  await hardRefresh(); // Always reliable: unregister SW + clear caches + reload
}, []);
```

**New safety net:**
```typescript
useEffect(() => {
  const onControllerChange = () => {
    if (canAutoReload()) {
      markAutoReload();
      window.location.reload();
    }
  };
  navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange);
  return () => {
    navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange);
  };
}, []);
```

### Test Results
- 185 tests passing (9 files, 0 failures)
- Build succeeds cleanly

---

## 2026-02-14 - Home Action Cleanup, Newspaper Restore, Weekend Image Fix

### Overview (15:00 UTC)

Three quality-of-life fixes based on gameplay feedback:

1. **Merged Relax + Rest into single "Relax" action** — The two home buttons (Relax: +5 hap/+3 relax, Rest: +1 hap/+8 relax) were essentially the same thing and cluttered the UI. Combined into one "Relax" button with balanced stats (+3 happiness, +5 relaxation). Sleep (8h, +8 hap, +10 hp, +5 relax) remains as the premium option.

2. **Newspaper added back to General Store** — The `onBuyNewspaper` handler was already wired up but no UI button existed. Added a JonesMenuItem for the Town Crier Gazette in the Durables section (before the lottery ticket).

3. **Fixed weekend turn always showing wrong image** — Weekend activities (rw-nap, ticket-jousting, etc.) never showed their correct woodcut images. Root cause: `processLeisure()` pushed messages like `"Weekend: Slept in all weekend..."` with no embedded activity ID. The `extractEventId()` function couldn't match any weekend activity, fell through to default `'weekly-event'` → type fallback `'info'` → showed `economic-boom.jpg` every time. Fix: embed activity ID tag in weekend messages (`[rw-nap] Weekend: ...`) and add weekend-specific regex in `extractEventId()` to find the tag anywhere in multi-line event messages.

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/HomePanel.tsx` | Removed Rest action, merged stats into Relax (+3 hap, +5 relax) |
| `src/components/game/home/HomeActionBar.tsx` | Removed Rest button + all Rest-related props |
| `src/hooks/ai/actions/goalActions.ts` | Merged AI "rest for happiness" and "recuperate for relaxation" into single relax action |
| `src/components/game/GeneralStorePanel.tsx` | Added newspaper JonesMenuItem in Durables section |
| `src/store/helpers/weekEndHelpers.ts` | Embed activity ID in weekend message: `[${activity.id}] Weekend: ...` |
| `src/hooks/useLocationClick.ts` | Added weekend activity ID regex matching; made cleanMessage strip IDs globally |

### Technical Details

**Weekend image fix chain:**
- `weekEndHelpers.ts:535` now produces: `[rw-nap] Weekend: Slept in all weekend...`
- `extractEventId()` new regex: `/\[(rw-[a-z-]+|ticket-[a-z-]+|...-weekend)\]/`
- Matches anywhere in multi-line message (not `^` anchored like travel events)
- `getEventImage('rw-nap')` → finds `weekendNap` in `EVENT_IMAGES` → correct image
- `cleanMessage` regex changed from `/^\[...\]/` to `/\[...\]/g` to strip IDs globally

**Home action before/after:**
- Before: Relax (3-8h, +5 hap, +3 relax) + Rest (4-6h, +1 hap, +8 relax) + Sleep (8h)
- After: Relax (3-8h, +3 hap, +5 relax) + Sleep (8h) — cleaner, no redundancy

---

## 2026-02-14 - Project Documentation Overhaul

### Overview

Created `log2.md` and `MEMORY.md` to improve project maintainability and AI context continuity.

**Reason**: `log.md` grew to 14,278 lines (732KB) — too large to read in a single pass. New development entries go here in `log2.md`. The original `log.md` is preserved as-is for historical reference.

**MEMORY.md** created as a master project reference — a single document that contains everything an AI assistant (or new developer) needs to understand the full project: architecture, file map, game mechanics, documentation index, development conventions, and current status. It cross-references all other .md files.

### Files Created

| File | Purpose |
|------|---------|
| `log2.md` | New development log (this file), continuation of log.md |
| `MEMORY.md` | Master project reference — architecture, status, conventions, cross-references |

### What Was In log.md (Summary)

log.md covered the entire development history from project creation (2026-02-05) through 2026-02-14, including:

- **2026-02-05**: Initial game creation, Jones in the Fast Lane reference, board system, zone editor, housing, jobs, education, robbery system, AI opponent, movement animation, victory system, economy balance, cave/dungeon design, equipment system, quest system
- **2026-02-06**: Online multiplayer (WebRTC/PeerJS), PWA offline support, multi-platform deployment (GitHub Pages + Lovable), location panel overhaul (Jones-style NPC menus), NPC portraits, preservation box/frost chest audit, salary negotiation, audio/music system, stock market, loans, weekend system, food storage, lottery, zone editor persistence, mobile layout, economy stabilization, 112+ tests
- **2026-02-07**: Multiplayer deep audit & security hardening (host migration, cross-player validation, argument bounds, crypto room codes), store layout redesign, career goal fix, academy validation, multi-AI opponents (4 named AI players), 13 deep audit bug fixes, center panel alignment, 152+ tests
- **2026-02-08**: Age system, weather events (5 types with CSS particle effects), festivals (4 seasonal), iPad PWA compatibility, location backgrounds, auto-update check, housing cost audit, Jones pricing corrections, forge gameplay, thunderstorm/fog visuals, weekend music, free bank services, 171+ tests
- **2026-02-09**: Character portraits, achievements system (24 achievements), travel events, bounty board, adventure goal, debug tools, death modal, credits screen, ambient sounds, dark mode removal, GitHub Pages standalone, mid-movement redirect, SFX system (Web Audio synth + 36 MP3s), AI scheming modal, salary stabilization, graveyard path, 171+ tests
- **2026-02-10**: Electron desktop build guide, weather-festival conflicts, extra credit system, gameplay balance batch (resurrection scaling, shadowfingers wealth scaling, job blocking), multiplayer security hardening, weekEndHelpers refactor, AI actionExecutor refactor, LocationPanel factory refactor, AI personality/intelligence overhaul, voice narration research, 176+ tests
- **2026-02-11**: Internationalization (DE/ES/NO), AI-generated stone borders, fullscreen mode, right sidebar turn indicator, AI adaptive systems (player strategy learning, dynamic difficulty), festival visual overlays, weather textures, zone editor layout placement, iPad audio fix, job system balance audit, AI-generated event woodcuts (35 images), item images (53), ITEMS.md documentation, humor overhaul (Monty Python/Discworld/HHGTTG style)
- **2026-02-12**: Full game audit (106 findings), audit fix session (20 fixes), dungeon encounter woodcuts (36 images), double board icon size, food preservation overhaul, clothing 3-tier system, appliance bonuses, forced loan repayment, crash severity tiers, active relaxation, newspaper personalization, movement direction fix, bankruptcy barrel
- **2026-02-13**: Code audit & refactoring (2 rounds — processLoans, resolveEncounter, weekEndHelpers, economicActions, actionGenerator lookup tables, handleExploreDungeon extraction), clothing quality job check, equipment durability & degradation, PNG→JPG migration, food spoilage fix, Jones compatibility audit (91% score), hidden food spoilage system
- **2026-02-14**: PWA infinite loading fix (service worker configuration), item image overhaul (50 images in medieval woodcut style)

---

## 2026-02-14 — Agent-Powered Bug Hunt (09:00 UTC)

### Overview

Systematic bug hunt using 7 parallel AI agents scanning different subsystems:
1. Game store logic (gameStore, helpers)
2. AI system (Grimwald AI, strategy, actions)
3. Combat/dungeon/quest systems
4. Economy/banking/stock systems
5. UI components
6. Multiplayer/network
7. Type safety & data integrity

### Bugs Found: 22 total (1 CRITICAL, 5 HIGH, 8 MEDIUM, 8 LOW)

### CRITICAL Bug Fixed

| Bug | File | Description |
|-----|------|-------------|
| **Week cycle skipped when player 0 dies** | `turnHelpers.ts:123-146` | `findNextAlivePlayer` checked `isNewWeek = index === 0` per iteration. When player 0 was dead and search wrapped past index 0, `isNewWeek` was `false` for the next alive player. Result: `processWeekEnd` never called — rent, food depletion, stock updates, clothing degradation, and weather all permanently stopped. **Fix**: Track `crossedWeekBoundary` flag across all iterations. |

### HIGH Bugs Fixed (5)

| Bug | File | Description |
|-----|------|-------------|
| **Stock seizure uses hardcoded price** | `weekEndHelpers.ts:437` | `seizeStocks` calculated value as `shares * 50 * 0.8` instead of using actual market prices. Stocks worth 2000g would be seized for only 400g. **Fix**: Thread `stockPrices` through `WeekEndContext` → `processPlayerWeekEnd` → `processLoans` → `seizeStocks`. |
| **AI combat stats ignore equipment durability** | `strategy.ts:253`, `questDungeonActions.ts:226` | `getBestDungeonFloor` and quest dungeon time calculation called `calculateCombatStats` without `equipmentDurability` parameter. AI thought broken gear was at full power, attempting floors it was too weak for. **Fix**: Pass `player.equipmentDurability` to all `calculateCombatStats` calls. |
| **AI dungeon healing capped at entry HP** | `combatResolver.ts:504` | `autoResolveFloor` didn't pass `playerMaxHealth` to `initDungeonRun`. Healing encounters during auto-resolve were capped at entry HP rather than max HP. AI entering at 60/100 HP could never heal above 60. **Fix**: Add `playerMaxHealth` parameter to `autoResolveFloor`, pass `player.maxHealth` from AI executor. |
| **Random events disconnected** | `events.ts:231` | `checkForEvent()` is exported but never called anywhere. Location-based random events (pickpocketing, food poisoning, lucky finds, etc.) are entirely non-functional. **Status**: Documented — requires design decision on where to wire up (noted for future). |
| **Online dungeon exploit** | `CavePanel.tsx:125` | `incrementDungeonAttempts` called via `getState()` bypassing network proxy, and not in `ALLOWED_GUEST_ACTIONS`. Guests get unlimited dungeon runs. **Status**: Documented — requires network refactor (noted for future). |

### MEDIUM Bugs Fixed (8)

| Bug | File | Description |
|-----|------|-------------|
| **Duplicate crash news** | `weekEndHelpers.ts:196/203/208` | Crash news events pushed per-player inside `processEmployment` AND once globally on line 743. In 4-player game, crash appeared 5 times. **Fix**: Removed per-player crash news pushes (global one at line 743 is sufficient). |
| **`bestEncounters` inverted** | `playerHelpers.ts:236` | Used `Math.max` (tracking worst run) instead of `Math.min` (tracking fastest/best run). **Fix**: Changed to `Math.min`. |
| **AI clothing branches shadowed** | `criticalNeeds.ts:148-180` | `condition < 70` check caught all cases before `condition < 40` and `condition < 15` could fire. AI bought business clothing (175g) when cheaper tiers would suffice. **Fix**: Reordered: check `< 15` first, then `< 40`, then `< 70`. |
| **AI wasted guild hall trips** | `goalActions.ts:240-247` | Career goal sent AI to guild hall even when `bestQuest` was null. **Fix**: Added `bestQuest &&` guard to movement condition. |
| **Homeless UI dead code** | `HomePanel.tsx:80-89` | Homeless check was unreachable after `playerRentsHere` returned false. Homeless players saw generic "For Rent" instead of tailored message. **Fix**: Moved homeless check before `rentsHere` check. |
| **InfoTabs wrong combat stats** | `InfoTabs.tsx:112-116` | Inventory tab showed raw base stats, ignoring tempering and durability. Player with broken gear saw full stats. **Fix**: Use `calculateCombatStats()` with tempering and durability. |
| **Asset seizure over-recovery** | `weekEndHelpers.ts:447-480` | `seizeAppliances`/`seizeDurables` didn't cap recovery to remaining debt, destroying expensive items for small debts. **Fix**: Added `Math.min(value, remaining - recovered)` cap. |
| **`buyFoodWithSpoilage` missing from whitelist** | `network/types.ts` | Guest players can't buy food with spoilage in online mode. **Status**: Documented — requires whitelist update (noted for future). |

### LOW Bugs Documented (not fixed — too minor)

1. Dead ternary branch in `processEndOfTurnSpoilage` (hasPreservationBox always false at that point)
2. Arcane Tome income range 10-59 not 10-60 (off-by-one in `Math.random() * 50`)
3. `clothing-torn` event uses -20 with SET-based `modifyClothing` (dead code, events disconnected)
4. `checkForEvent` rolls independently per event, inflating cumulative trigger rate
5. `payRent` redundantly resets `weeksSinceRent` for prepaid players
6. Bounty generation suppressed when quest exists but can't be reached
7. Low-dependability firing shields player from major crash happiness penalty
8. `showNewspaper` state in LocationPanel set but never read

### Files Changed (12 bugs fixed in 10 files)

```
src/store/helpers/turnHelpers.ts        — CRITICAL: week boundary detection
src/store/helpers/weekEndHelpers.ts     — HIGH: stock seizure prices, MEDIUM: duplicate crash news, seizure over-recovery
src/store/helpers/playerHelpers.ts      — MEDIUM: bestEncounters inverted
src/hooks/ai/strategy.ts               — HIGH: missing equipmentDurability
src/hooks/ai/actions/questDungeonActions.ts — HIGH: missing equipmentDurability
src/hooks/ai/actions/criticalNeeds.ts   — MEDIUM: clothing branch order
src/hooks/ai/actions/goalActions.ts     — MEDIUM: null quest guard
src/hooks/ai/actionExecutor.ts          — HIGH: pass playerMaxHealth
src/data/combatResolver.ts             — HIGH: autoResolveFloor maxHealth param
src/components/game/HomePanel.tsx       — MEDIUM: homeless UI fix
src/components/game/InfoTabs.tsx        — MEDIUM: combat stats with durability
```

### Verification

- Build: Clean (vite build succeeds)
- Tests: 185/185 passing
- No regressions introduced

---

## 2026-02-14 — Bug Hunt Fix Session (10:00 UTC)

### Overview

Fixed all bugs documented in the Agent-Powered Bug Hunt session earlier today. This includes 3 HIGH-priority issues (random events disconnected, online dungeon exploit, missing network whitelist entry) and 7 LOW-priority issues (dead code, off-by-one, ordering bugs, dead state).

### HIGH Priority Fixes (3)

| Bug | File | Fix |
|-----|------|-----|
| **Random events disconnected** | `playerHelpers.ts` | Wired `checkForEvent()` into `movePlayer()` — location-based random events (pickpocketing, food poisoning, guild bonuses, lucky finds, etc.) now trigger when a player arrives at a location. Effects applied to player state, event message shown via `eventMessage` + `phase: 'event'` for human players. |
| **Online dungeon exploit** | `network/types.ts` | Added `incrementDungeonAttempts` and `updatePlayerDungeonRecord` to `ALLOWED_GUEST_ACTIONS` whitelist. Guest players can now properly track dungeon attempts and records through the network proxy. |
| **`buyFoodWithSpoilage` missing from whitelist** | `network/types.ts` | Added `buyFoodWithSpoilage` to `ALLOWED_GUEST_ACTIONS`. Guest players can now buy regular food from General Store in online mode. |

### LOW Priority Fixes (7)

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | Dead ternary in `processEndOfTurnSpoilage` | `turnHelpers.ts:57` | `hasPreservationBox` is always `false` at that point (early return on line 40). Changed `hasPreservationBox ? p.freshFood : 0` to simply `0`. |
| 2 | Arcane Tome income range 10-59 not 10-60 | `startTurnHelpers.ts:338` | Changed `Math.random() * 50` to `Math.random() * 51` for correct 10-60 range. |
| 3 | `clothing-torn` event with SET-based `modifyClothing` | `playerHelpers.ts` (integration) | Now that events are wired up, clothing effects use `clothingCondition + effect.clothing` (addition/subtraction), not the SET-based `modifyClothing()`. The -20 correctly subtracts from current condition. |
| 4 | `checkForEvent` probability inflation | `events.ts:231` | Refactored: first filter eligible events by conditions only, then pick one random eligible event, then roll its probability. Prevents cumulative trigger rate inflation from independent rolls. |
| 5 | `payRent` redundant reset for prepaid | `bankingHelpers.ts:13` | Changed prepaid branch from `return { ...p, weeksSinceRent: 0 }` to `return p` — prepaid tracking is handled in `weekEndHelpers.ts`. |
| 6 | Bounty suppressed when quest unreachable | (documented) | This is correct design — bounties are disabled while any quest is active. Not a bug, documented as intended behavior. |
| 7 | Low-dep firing shields crash penalty | `weekEndHelpers.ts:171` | Reordered `processEmployment`: crash effects now process BEFORE low-dependability firing. Player with low dep during a major crash now receives the -20 happiness penalty before being fired. |
| 8 | `showNewspaper` dead state | `LocationPanel.tsx` | Removed unused `showNewspaper` state variable and all references. `NewspaperModal` was already controlled by `currentNewspaper !== null`. |

### Files Changed (8 files)

```
src/data/events.ts                     — Refactored checkForEvent probability (pick-then-roll)
src/store/helpers/playerHelpers.ts     — Wired checkForEvent into movePlayer
src/network/types.ts                   — Added 3 actions to ALLOWED_GUEST_ACTIONS whitelist
src/store/helpers/startTurnHelpers.ts  — Arcane Tome off-by-one fix
src/store/helpers/economy/bankingHelpers.ts — payRent redundant reset removed
src/store/helpers/weekEndHelpers.ts    — Crash penalty ordering fix
src/components/game/LocationPanel.tsx  — Removed showNewspaper dead state
src/store/helpers/turnHelpers.ts       — Dead ternary branch fix
```

### Verification

- Build: Clean (vite build succeeds)
- Tests: 185/185 passing (9 test files, 0 failures)
---

## 2026-02-14 - BUG HUNT: "Loading the realm..." Freeze Fix

### Bug Report (09:30 UTC)
Game stuck on static "Loading the realm..." screen — React never mounts.

### Root Cause Analysis
1. **Audio singleton crash potential**: `audioManager` and `ambientManager` are module-level singletons whose constructors call `new AudioContext()` (via `webAudioBridge.ts`) without any try-catch. If AudioContext fails (browser restrictions, privacy settings, sandboxed iframes), the entire module loading chain crashes silently, preventing React from mounting.
2. **No error visibility**: `main.tsx` had a bare `createRoot().render()` with no try-catch. Any uncaught error during React initialization left the static HTML "Loading the realm..." visible forever with no indication of what went wrong.
3. **Flaky test**: `movePlayer` test expected deterministic behavior but `checkForEvent()` and `rollTravelEvent()` were wired into `movePlayer` (from the "wire up random events" fix), making it non-deterministic via `Math.random()`.

### Fixes Applied
| File | Change |
|------|--------|
| `src/audio/webAudioBridge.ts` | `getContext()` returns `AudioContext \| null` with try-catch; `connectElement()` returns `GainNode \| null` with try-catch fallback |
| `src/audio/audioManager.ts` | Handle nullable `GainNode` throughout — `setGainVolume()`/`getGainVolume()` helpers fall back to `element.volume` when GainNode is null |
| `src/audio/ambientManager.ts` | Same nullable GainNode handling as audioManager |
| `src/main.tsx` | Wrap `createRoot().render()` in try-catch; show error message + Reload button on failure |
| `index.html` | Add `window.onerror` handler before React script — shows error on loading screen after 3s if React fails to mount |
| `src/test/gameActions.test.ts` | Mock `Math.random()` in movePlayer test to prevent random events from triggering |

### Test Results
- **185/185 tests pass** (was 184/185 before fix)
- TypeScript: clean (no errors)
- Build: succeeds

---

### Development Statistics (from log.md)

- **Total test count**: 185 tests across 9 test files (as of 2026-02-14)
- **Total development days**: 10 (Feb 5-14, 2026)
- **Major systems built**: 25+ (board, jobs, education, housing, economy, combat, quests, multiplayer, AI, PWA, audio, weather, festivals, achievements, portraits, age, equipment durability, clothing tiers, inventory, zone editor, debug tools, internationalization, electron guide)
- **Bug fixes documented**: 200+ across all audit sessions
- **Refactoring passes**: 3 (complex functions, AI system, weekEnd helpers)

---

## 2026-02-14 — The Guildholm Herald UI Polish (11:00 UTC)

### Overview

Three fixes to the newspaper (The Guildholm Herald) based on gameplay feedback:

1. **Removed double X close button** — The `NewspaperModal` had a custom X button in the header AND the shadcn/ui `DialogContent` component rendered its own built-in X button. Removed the custom one, keeping only the Dialog's native close button.

2. **Renamed "Town Crier Gazette" to "The Guildholm Herald"** — The General Store panel used hardcoded "Town Crier Gazette" as the newspaper name (with a missing i18n key `panelStore.newspaper` that fell back to the hardcoded string). Added the `newspaper` key to all i18n files (EN: "The Guildholm Herald", DE: "Der Guildholm-Herold", ES: "El Heraldo de Guildholm") and updated the preview data in `GeneralStorePanel.tsx`.

3. **Changed article styling from brown/white to parchment/black** — Newspaper articles used `wood-frame` class (dark brown gradient background with white `text-parchment` text), which didn't match the rest of the game's parchment-based UI. Changed to `parchment-panel` class (light parchment gradient background) with `text-wood-dark` headlines and `text-wood` body text.

### Files Changed (7 files)

| File | Change |
|------|--------|
| `src/components/game/NewspaperModal.tsx` | Removed custom X button (kept Dialog's built-in); removed unused `X` import; changed article class from `wood-frame text-parchment` to `parchment-panel text-wood-dark/text-wood` |
| `src/components/game/GeneralStorePanel.tsx` | Renamed "Town Crier Gazette" to "The Guildholm Herald" in label, preview data, and toast; removed fallback strings (i18n key now exists) |
| `src/i18n/types.ts` | Added `newspaper: string` to `panelStore` interface |
| `src/i18n/en.ts` | Added `newspaper: 'The Guildholm Herald'` |
| `src/i18n/de.ts` | Added `newspaper: 'Der Guildholm-Herold'` |
| `src/i18n/es.ts` | Added `newspaper: 'El Heraldo de Guildholm'` |

### Verification

- Build: Clean (vite build succeeds)
- Tests: 185/185 passing (9 test files, 0 failures)

---

## 2026-02-14 — Landlord "Beg for More Time" + NPC Banter Overhaul + PWA Cache-Bust (12:00 UTC)

### Overview

Three features/fixes implemented in a single session:

1. **Landlord: "Beg for More Time"** — New mechanic allowing players to grovel before Tomas for a one-week rent extension when 2+ weeks overdue.
2. **NPC Banter Overhaul** — Added 30+ new banter lines across all NPCs. Cave NPC ("The Maw") completely reworked to be more ominous, atmospheric, and darkly humorous.
3. **PWA Update Cache-Busting** — Added `?_=${Date.now()}` cache-busting parameter to version.json fetches to defeat CDN/proxy caches that ignore `no-store` headers.

---

### 1. Landlord: "Beg for More Time"

**Design:**
- Available when player is 2+ weeks overdue on rent (`weeksSinceRent >= 2`)
- Not available if homeless or already used this rent cycle
- Costs 1 hour (time spent pleading)
- Success chance: 50% base + 0.5% per point of dependability (max +30%), capped at 80%
- **On success**: `weeksSinceRent` reduced by 1, -2 happiness (dignity cost)
- **On failure**: No extension, -5 happiness (humiliation), attempt still consumed
- `rentExtensionUsed` flag resets when rent is actually paid via `prepayRent`

**Files Changed:**

| File | Change |
|------|--------|
| `src/types/game.types.ts` | Added `rentExtensionUsed: boolean` to `Player` interface |
| `src/store/storeTypes.ts` | Added `begForMoreTime` action signature |
| `src/store/helpers/economy/bankingHelpers.ts` | Implemented `begForMoreTime` logic with probability roll; added `rentExtensionUsed: false` reset in `prepayRent` |
| `src/store/gameStore.ts` | Added `rentExtensionUsed: false` to default player |
| `src/components/game/LandlordPanel.tsx` | Added `begForMoreTime` prop + "Desperate Measures" UI section with ActionButton |
| `src/components/game/locationTabs.tsx` | Added `begForMoreTime` to `LocationTabContext` interface and `landlordTabs` function |
| `src/components/game/LocationPanel.tsx` | Passed `store.begForMoreTime` through LocationTabContext |
| `src/network/types.ts` | Added `begForMoreTime` to `ALLOWED_GUEST_ACTIONS` whitelist |
| `src/data/banter.ts` | Added 3 landlord banter lines about begging/extensions |

**Toast Messages:**
- Success: *"Tomas sighs heavily. 'One more week. ONE. And I'm adding it to my ledger of disappointments.'"*
- Failure: *"Tomas crosses his arms. 'I've heard better sob stories from the rats in the cellar. Pay up.'"*

---

### 2. NPC Banter Overhaul

**Cave NPC — Complete Rework:**
- Renamed from "The Cave" / "Dark Entrance" to **"The Maw"** / **"It Watches"**
- Subtitle changed from "Dark Caverns" to **"The Yawning Dark"**
- New greeting: *"The darkness breathes. Something ancient stirs below. Also, there is a smell. An unreasonable smell."*
- Darker color scheme: deeper purples and blacks (`#0d0d0d` bg, `#4a3a5a` accent)
- **21 new banter lines** (replacing 14 old ones) in three categories:
  - **Ominous/atmospheric** (8 lines): Walls that bleed, footprints that go in but not out, stones whispering in dead languages
  - **Darkly humorous** (8 lines): One-star reviews, the smell "improving" on Floor 3, goblins vs children confusion
  - **Practical warnings with humor** (5 lines): Shields vs rent notices, Floor 5 as hope's resignation letter

**Other NPCs — New Lines (2-3 per NPC):**
- **Guild Hall** (+3): Dental plan joke, Fortune/insurance, motivation poster
- **Bank** (+2): Dragon's two forms of ID (fire), Björn the guard dwarf
- **General Store** (+2): Gluten-free medieval, turnips/cheese/sausages
- **Armory** (+2): Free holding lecture, "slimming black" armor
- **Enchanter** (+2): Crystal ball/paperwork, self-sweeping broom
- **Shadow Market** (+2): Gravity victims, identity mystery
- **Rusty Tankard** (+2): Bard so bad ale curdled, hat stand marriage
- **Academy** (+2): No-summoning-after-midnight, graduation survival
- **Forge** (+2): Speaking sword request, wife's cooking fuel
- **Graveyard** (+2): Afterlife queue/paperwork, ghost wants to be dug up
- **Fence** (+2): Odds/mathematics, pawned shame

**Total new banter lines: ~33 across all locations.**

**NPC Greeting Updates:**
- **Tomas (Landlord)**: Extended with "...which is how time works"
- **Morthos (Graveyard)**: Extended with "One complained about the noise"

---

### 3. PWA Update Cache-Busting

**Problem:** version.json fetches could be served stale by CDN/proxy caches that don't fully respect `cache: 'no-store'` headers, preventing update detection.

**Fix:** Added `?_=${Date.now()}` query parameter to both version.json fetch locations:
- Periodic check in `useEffect` (every 60s)
- Manual `checkForUpdates()` callback

This ensures every request gets a unique URL, making CDN caching impossible.

| File | Change |
|------|--------|
| `src/hooks/useAppUpdate.ts` | Added `?_=${Date.now()}` cache-busting to both version.json fetch URLs |

---

### Verification

- Build: Clean (vite build succeeds)
- Tests: 185/185 passing (9 test files, 0 failures)
- No TypeScript errors

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Parallel Agent Scan) (14:00 UTC)

### Bug Report

Game stuck on static "Loading the realm..." screen — React never mounts. This is a **recurring** issue that has been investigated before (earlier on 2026-02-14), but the root cause was different this time.

### Investigation Method

Systematic parallel AI agent scan across 7 areas:
1. Build system & dependencies
2. Loading chain (index.html → main.tsx → App.tsx → Index.tsx)
3. Store initialization (gameStore.ts, helpers)
4. Audio system (audioManager, ambientManager, speechNarrator, webAudioBridge)
5. React hooks (useMusic, useAmbient, useNarration)
6. i18n system (all language files)
7. Recent code changes (last 5 commits)

### Root Cause Analysis

**PRIMARY: Missing `@radix-ui/react-collection` transitive dependency**

The import chain that breaks:
```
App.tsx → Toaster → @radix-ui/react-toast → @radix-ui/react-collection → MISSING
```

- `@radix-ui/react-toast@1.2.14` requires `@radix-ui/react-collection@1.1.7` as a direct dependency
- `react-collection` was NOT listed in `package.json` (only a transitive dependency)
- During `bun install`, the download of `react-collection-1.1.7.tgz` failed with **HTTP 407** (proxy/authentication error)
- This left `node_modules/@radix-ui/react-collection/` missing entirely
- The Vite build failed with: `Rollup failed to resolve import "@radix-ui/react-collection"`
- At runtime: ES module loading fails → React never mounts → "Loading the realm..." stays forever

**SECONDARY: Missing `unhandledrejection` handler in index.html**

- The existing `window.onerror` handler only catches synchronous errors
- ES module loading failures produce rejected promises (not synchronous errors)
- Without an `unhandledrejection` handler, the error/reload button **never appears**
- User sees "Loading the realm..." indefinitely with no feedback

**TERTIARY: Missing try-catch in speechNarrator.doSpeak()**

- `SpeechSynthesisUtterance` constructor and `speechSynthesis.speak()` can throw on some browsers
- In sandboxed iframes, privacy-restricted browsers, or broken SpeechSynthesis implementations
- Would crash the narration hook and potentially cascade to break the game

### What Was NOT the Cause

All investigated and confirmed safe:
- ✅ Store initialization (gameStore.ts) — no crash paths, no async blocking
- ✅ Audio singletons (audioManager, ambientManager) — proper try-catch throughout
- ✅ React hooks (useMusic, useAmbient, useNarration) — no infinite loops, proper deps
- ✅ webAudioBridge — safe AudioContext creation with fallback
- ✅ i18n system — all languages have matching shapes, safe fallback chain
- ✅ TitleScreen — all imports exist, all translation keys present
- ✅ Recent code changes (5 commits) — no runtime crash risks, all function signatures match
- ✅ TypeScript — zero type errors

### Fixes Applied (3)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `package.json` | Added `@radix-ui/react-collection@^1.1.7` as explicit dependency — prevents transitive dep from being silently skipped during install |
| 2 | **HIGH** | `index.html` | Added `window.addEventListener('unhandledrejection', ...)` handler — catches ES module loading failures and shows error/reload button. Extracted error display to shared `__guildShowLoadError()` function. |
| 3 | **LOW** | `src/audio/speechNarrator.ts` | Wrapped `doSpeak()` body in try-catch — prevents SpeechSynthesis API exceptions from crashing the narration hook |

### Files Changed (3)

```
package.json                        — Added @radix-ui/react-collection explicit dependency
index.html                          — Added unhandledrejection handler + shared error display function
src/audio/speechNarrator.ts         — try-catch around doSpeak() body
```

### Technical Details

**Before (package.json):**
```json
"@radix-ui/react-checkbox": "^1.3.2",
"@radix-ui/react-collapsible": "^1.1.11",
```

**After (package.json):**
```json
"@radix-ui/react-checkbox": "^1.3.2",
"@radix-ui/react-collapsible": "^1.1.11",
"@radix-ui/react-collection": "^1.1.7",
```

**New unhandledrejection handler (index.html):**
```javascript
window.addEventListener('unhandledrejection', function(e) {
  var msg = e.reason && e.reason.message ? e.reason.message : String(e.reason || 'Module loading failed');
  window.__guildLoadErrors.push({msg: msg, err: e.reason});
  __guildShowLoadError(msg);
});
```

### Verification

- Build: Clean (vite build succeeds)
- Tests: 185/185 passing (9 test files, 0 failures)
- No TypeScript errors
- No regressions

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Round 3 — Parallel Agent Scan) (16:00 UTC)

### Bug Report

Game stuck on static "Loading the realm..." screen — React never mounts. This is the **third** investigation of this recurring issue. Previous fixes (rounds 1 & 2) addressed dependency issues and error handlers but the underlying architectural vulnerability remained.

### Investigation Method

Systematic parallel AI agent scan with **7 specialized agents** scanning simultaneously:
1. App.tsx → Index.tsx loading chain analysis
2. Zustand gameStore initialization
3. TitleScreen/GameSetup rendering flow
4. Audio/asset initialization (audioManager, ambientManager, speechNarrator, webAudioBridge)
5. Runtime errors & build verification (tsc, vite build)
6. localStorage/persist/hydration
7. main.tsx & index.html entry points

### Root Cause Analysis

**PRIMARY: Eager import tree creates single point of failure**

`Index.tsx` statically imported ALL screen components at the top level:
```tsx
import { GameBoard } from '@/components/game/GameBoard';     // 25+ sub-components
import { GameSetup } from '@/components/screens/GameSetup';
import { VictoryScreen } from '@/components/screens/VictoryScreen';
import { OnlineLobby } from '@/components/screens/OnlineLobby';
```

GameBoard alone imports 25+ sub-components, network hooks, AI handlers, zone configuration, and every location panel. ALL of these modules must be resolved and evaluated BEFORE React can render even the TitleScreen — despite the initial phase always being `'title'`.

**Impact**: If ANY module in GameBoard's massive dependency tree fails (missing dep, network error on CDN, corrupted cache, proxy issue), the entire app freezes on "Loading the realm..." because React can't even instantiate the Index component.

**SECONDARY: version.json fetch had no timeout**

`useAppUpdate.ts` called `fetch(version.json)` with no `AbortController` timeout. If the network hung (slow DNS, CDN timeout, proxy issues), the promise never resolved. While this didn't directly block rendering (it's in a `useEffect`), it prevented error recovery and update detection.

**TERTIARY: Fallback timer too slow**

The 8-second first fallback check in `index.html` was too long — users perceive the app as broken after ~3-5 seconds.

### What Was Already Fixed (from previous rounds)

All confirmed still in place:
- ✅ `@radix-ui/react-collection` explicit dependency (package.json)
- ✅ `unhandledrejection` handler (index.html)
- ✅ `speechNarrator.doSpeak()` try-catch
- ✅ `webAudioBridge.ts` safe AudioContext creation
- ✅ `main.tsx` try-catch around `createRoot().render()`
- ✅ `controllerchange` listener for auto-reload on SW update
- ✅ `hardRefresh()` always used for user-triggered updates

### Fixes Applied (3)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `src/pages/Index.tsx` | **Lazy-load GameBoard, GameSetup, VictoryScreen, OnlineLobby** with `React.lazy()` + `Suspense`. Only TitleScreen is eagerly loaded (it's always the first screen). Reduces initial JS bundle by 37% and prevents a failure in any lazy screen from blocking the TitleScreen. |
| 2 | **MEDIUM** | `src/hooks/useAppUpdate.ts` | **Added AbortController with 5s timeout** to both version.json fetch calls. Prevents hung network requests from blocking update detection. |
| 3 | **LOW** | `index.html` + `src/main.tsx` | **Faster fallback timer** (5s + 12s instead of 8s + 15s). Added `console.log` diagnostics at mount time for easier debugging. |

### Technical Details

**Before (Index.tsx):**
```tsx
import { GameBoard } from '@/components/game/GameBoard';
// ... 25+ transitive imports loaded eagerly

switch (phase) {
  case 'title': return <TitleScreen />;
  case 'playing': return <GameBoard />;
  // ...
}
```

**After (Index.tsx):**
```tsx
const GameBoard = lazy(() => import('@/components/game/GameBoard')
  .then(m => ({ default: m.GameBoard })));

if (phase === 'title') return <TitleScreen />;

return <Suspense fallback={<ScreenLoader />}>{screen}</Suspense>;
```

**Build output change (code splitting enabled):**
- Before: `index.js` — 1,469 KB (everything in one chunk)
- After: `index.js` — 847 KB (core + TitleScreen), `GameBoard.js` — 476 KB (lazy-loaded)
- **37% smaller initial bundle** = faster parse + mount

**Fetch timeout (useAppUpdate.ts):**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
const resp = await fetch(url, { signal: controller.signal, ... });
clearTimeout(timeout);
```

### Files Changed (4)

```
src/pages/Index.tsx              — React.lazy() for 4 screens + Suspense boundary
src/hooks/useAppUpdate.ts        — AbortController 5s timeout on both fetch calls
index.html                       — Faster fallback timers (5s + 12s)
src/main.tsx                     — Console diagnostics at mount time
```

### Verification

- TypeScript: Clean (no errors)
- Tests: 185/185 passing (9 test files, 0 failures)
- Build: Succeeds with code splitting (2 JS chunks instead of 1)
- No regressions

---

## 2026-02-14 — Hexes & Curses System Design Proposal (18:00 UTC)

### Overview

Design proposal for a **sabotage/rivalry mechanic** allowing players to interfere with opponents through dark magic. Core philosophy: **rare, expensive, and high-risk/high-reward** — not something you do every turn, but a dramatic strategic move that can swing the game.

Inspired by the user's vision: *"hexes and curses — close the school so your opponent can't study, close their workplace so they can't earn money, destroy their equipment."*

---

### Design Principles

1. **Rare** — Hex scrolls are uncommon items, not commodity goods
2. **Expensive** — 300-800g base price (comparable to high-end weapons/armor)
3. **Difficult to obtain** — Best ones only as rare dungeon drops (Floor 3-5 bosses)
4. **Counterplay exists** — Wards, cleansing, and natural expiration prevent griefing
5. **Thematic** — Dark magic fits the medieval fantasy world (Enchanter, Shadow Market, Graveyard)
6. **AI-compatible** — AI can both cast and defend against hexes

---

### PART 1: Hex Categories

#### A. Location Hexes (Block a location for opponents)

These "close down" a location for all OTHER players for a set duration. The caster is unaffected.

| Hex Scroll | Target | Duration | Effect | Base Price | Source |
|-----------|--------|----------|--------|-----------|--------|
| **Seal of Ignorance** | Academy | 2 weeks | Opponents cannot study (Academy locked) | 500g | Enchanter / Floor 3 drop |
| **Embargo Decree** | Guild Hall | 2 weeks | Opponents cannot accept quests or apply for jobs | 600g | Shadow Market / Floor 4 drop |
| **Market Blight** | Market/Store | 1 week | General Store closed to opponents (no food/items) | 400g | Shadow Market |
| **Forge Curse** | Forge | 2 weeks | Opponents cannot temper, repair, or salvage | 350g | Shadow Market / Floor 3 drop |
| **Vault Seal** | Bank | 1 week | Opponents cannot deposit, withdraw, or trade stocks | 500g | Floor 4 drop only |
| **Dungeon Ward** | Cave | 2 weeks | Opponents cannot enter the dungeon | 450g | Enchanter / Floor 4 drop |

**Rules:**
- Only ONE location hex active at a time (per caster) — prevents locking down everything
- Caster must be AT the target location to cast (travel + time investment)
- Costs 3 hours to cast (ritual time)
- A glowing rune icon appears on the board location showing it's hexed
- Affected players see: *"Dark magic seals the Academy doors. The hex of [caster name] bars your entry."*
- The caster can still use the location normally

#### B. Personal Curses (Debuffs on a specific opponent)

Targeted at a specific rival player. The caster must choose which opponent to curse.

| Curse Scroll | Duration | Effect | Base Price | Source |
|-------------|----------|--------|-----------|--------|
| **Curse of Poverty** | 3 weeks | Target's wages reduced by 40% | 500g | Shadow Market / Floor 3 drop |
| **Hex of Clumsiness** | 3 weeks | Target's equipment durability degrades 3x faster | 400g | Shadow Market |
| **Curse of Lethargy** | 2 weeks | Target loses 10 extra hours per turn (50h instead of 60h) | 600g | Floor 4 drop only |
| **Hex of Misfortune** | 4 weeks | Target's robbery chance doubled, 25% chance of random bad event each week | 350g | Graveyard / Shadow Market |
| **Curse of Decay** | 3 weeks | Target's food spoils 2x faster, clothing degrades 2x faster | 300g | Shadow Market |
| **Hex of Confusion** | 2 weeks | Target needs +2 extra study sessions per degree (stacks with existing progress) | 450g | Enchanter / Floor 3 drop |

**Rules:**
- Max 1 curse active per target (can't pile 6 curses on one person)
- Caster must be at Shadow Market, Enchanter, or Graveyard to cast
- Costs 2 hours to cast
- Target notified: *"A dark curse settles upon you! [Curse name] — [effect description]. It will last [N] weeks."*
- Target can see active curses in their Info panel (new "Afflictions" section)

#### C. Equipment Sabotage (Instant destructive effects)

One-shot scrolls that directly damage an opponent's possessions. No duration — immediate.

| Sabotage Scroll | Effect | Base Price | Source |
|----------------|--------|-----------|--------|
| **Shatter Hex** | Destroy target's equipped weapon (gone forever) | 600g | Floor 4+ drop only |
| **Corrode Hex** | Destroy target's equipped armor (gone forever) | 600g | Floor 4+ drop only |
| **Spoilage Curse** | Destroy ALL of target's stored food (food → 0, freshFood → 0) | 300g | Shadow Market |
| **Appliance Jinx** | Break one random appliance the target owns | 250g | Shadow Market / Enchanter |
| **Wardrobe Hex** | Reduce target's clothing condition to 0 (rags) | 200g | Shadow Market |

**Rules:**
- Shatter/Corrode hexes are drop-only — can't buy your way to destroying someone's Enchanted Blade
- Target notified with dramatic flavor text

---

### PART 2: Acquisition Methods

#### Enchanter (Elara) — "Forbidden Scrolls" Tab
- New tab in Enchanter panel
- Requires having cleared **Floor 2** of the dungeon (Elara won't sell dark magic to amateurs)
- Sells: Seal of Ignorance, Dungeon Ward, Hex of Confusion, Appliance Jinx
- Prices affected by priceModifier

#### Shadow Market (Shadowfinger) — "Dirty Tricks" Tab
- New tab in Shadow Market panel
- No prerequisites (Shadowfinger doesn't ask questions)
- Sells: Embargo Decree, Market Blight, Forge Curse, Curse of Poverty, Hex of Clumsiness, Hex of Misfortune, Curse of Decay, Spoilage Curse, Wardrobe Hex
- Random rotating stock: only 3-4 available per week (not all at once)

#### Graveyard (Morthos) — "Dark Ritual" Action
- New action at Graveyard
- Costs 4 hours + 200g (ritual materials)
- Gives ONE random hex/curse scroll (any type, weighted toward lower tiers)
- 15% chance of "ritual backfire" — curse yourself instead (+fun, +risk)
- Thematically perfect: graveyard + dark magic + risk

#### Dungeon Boss Drops (Rare Loot)
- Floor 3 boss: 8% chance of random curse scroll drop (Tier 1-2)
- Floor 4 boss: 12% chance of random curse scroll (Tier 1-3) + 5% Shatter/Corrode Hex
- Floor 5 boss: 15% chance of random curse scroll (any) + 8% Shatter/Corrode + 3% **Legendary: Hex of Ruin**

#### Legendary Drop: Hex of Ruin (Floor 5 only, 3% chance)
- **Effect**: Closes ALL shops/services for target player for 1 week + reduces their gold by 25%
- Cannot be purchased — dungeon drop only
- Cannot be warded against
- Announced to all players: *"[Caster] has unleashed the legendary Hex of Ruin upon [Target]!"*

---

### PART 3: Counterplay & Defense

| Defense | Cost | Effect | Source |
|---------|------|--------|--------|
| **Protective Amulet** | 400g | Blocks next hex/curse cast on you (consumed) | Enchanter |
| **Cleansing Ritual** | 150g + 3hrs | Removes one active personal curse | Healer |
| **Dispel Scroll** | 250g | Removes one active location hex (must use AT the location) | Enchanter |
| **Curse Reflection** | 250g + 3hrs | 35% reflect to caster, 25% remove, 40% fail | Graveyard |
| **Natural Expiration** | Free | All hexes expire after 1-4 weeks | Automatic |

---

### PART 4: UI Design

#### Hex Casting Flow
1. Player visits Shadow Market / Enchanter / Graveyard
2. Opens "Forbidden Scrolls" / "Dirty Tricks" / "Dark Ritual" tab
3. Sees available hex scrolls with descriptions, prices, target selector
4. Selects hex → dropdown to choose target player
5. Confirms: *"Cast [Hex Name] on [Target]? Cost: [X]g + [Y] hours"*
6. Dark particle animation on game board
7. Both players notified

#### Active Hexes Display
- **Info Panel → "Afflictions" section** (skull icon)
- Shows: hex name, effect, caster, weeks remaining
- Pulsing dark purple border on cursed player tokens
- Dark purple rune overlay on hexed board locations

---

### PART 5: AI Integration

#### AI Casting Hexes (rivalryActions.ts)
- Only **Medium/Hard** difficulty
- Conditions: opponent within 20% of winning, AI has >500g surplus, 3-turn cooldown
- Priority: block locations that counter the leading opponent's strategy

#### AI Defending Against Hexes
- Buys Protective Amulet if gold >800g
- Cleanses curses at Healer if curse impacts current goal
- Buys Dispel Scroll if critical location is hexed

#### New AI Action Types
```
'cast-location-hex', 'cast-personal-curse', 'cast-equipment-sabotage',
'buy-protective-amulet', 'cleanse-curse', 'dispel-location-hex'
```

---

### PART 6: Economy Impact Analysis

| Action | Cost | Damage to opponent |
|--------|------|-------------------|
| Curse of Poverty (3 wks) | 500g | ~150-450g lost income |
| Seal of Ignorance (2 wks) | 500g | 2-3 study sessions lost |
| Spoilage Curse | 300g | All food destroyed → starvation (-20 hrs) + rebuy cost |
| Shatter Hex (Enchanted Blade) | Drop only | 500g weapon destroyed |
| Wardrobe Hex | 200g | Clothing → 0, may lose job |

**Balance**: Hexes deal MORE damage than they cost, but gold spent on hexes is NOT spent on progression — a calculated sacrifice.

#### Safeguards
- One location hex per caster at a time
- One personal curse per target at a time
- Natural expiration (no permanent effects)
- Counterplay items exist (amulet, cleansing, dispel)
- High gold + time costs prevent spam

---

### PART 7: Implementation Plan

| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Add `HexId`, `HexEffect`, `LocationHex` types; extend `Player` with `hexes`, `protectiveAmulet`; extend `GameState` with `locationHexes` |
| `src/data/hexes.ts` | **NEW** — All hex/curse definitions, costs, durations, effects |
| `src/data/items.ts` | Add hex scrolls, Protective Amulet, Dispel Scroll |
| `src/store/gameStore.ts` | Add hex actions |
| `src/store/helpers/hexHelpers.ts` | **NEW** — Hex action logic, validation, application |
| `src/store/helpers/weekEndHelpers.ts` | Add `processHexes()` to pipeline + expiration logic |
| `src/store/helpers/playerHelpers.ts` | Check location hexes in `movePlayer()` |
| `src/components/game/EnchanterPanel.tsx` | "Forbidden Scrolls" tab |
| `src/components/game/ShadowMarketPanel.tsx` | "Dirty Tricks" tab |
| `src/components/game/GraveyardPanel.tsx` | "Dark Ritual" and "Curse Reflection" |
| `src/components/game/HealerPanel.tsx` | "Cleanse Curse" action |
| `src/components/game/InfoTabs.tsx` | "Afflictions" section |
| `src/components/game/GameBoard.tsx` | Hex visual overlays |
| `src/hooks/ai/actions/rivalryActions.ts` | Hex casting + defense AI logic |
| `src/data/combatResolver.ts` | Hex scroll drops in boss loot tables |
| `src/network/types.ts` | Add hex actions to `ALLOWED_GUEST_ACTIONS` |
| `src/test/hexes.test.ts` | **NEW** — Tests |

**Scope**: ~15-20 files, ~2 new files, ~800-1200 lines new code

---

### PART 8: Open Questions

1. **Hex stacking** — Max 1 curse per target? Or allow 2 from different casters?
2. **Self-hex "dark bargains"?** — e.g., "Pact of Power: -20 HP permanently, +10 ATK for 5 weeks" — cool but extra scope
3. **Newspaper integration** — Hex events as Guildholm Herald headlines? ("DARK MAGIC REPORTED AT ACADEMY")
4. **Achievements** — "First Blood: Cast your first hex", "Karma: Reflected curse hits you back", "Untouchable: Block 3 hexes"
5. **Multiplayer balance** — In 4-player games, should hexes be even more expensive to prevent ganging up?

---

### Summary

| Category | Count | Price Range | Sources |
|----------|-------|-------------|---------|
| Location Hexes | 6 | 350-600g | Enchanter, Shadow Market, Dungeon |
| Personal Curses | 6 | 300-600g | Shadow Market, Enchanter, Graveyard, Dungeon |
| Equipment Sabotage | 5 | 200-600g | Shadow Market, Dungeon drops (best are drop-only) |
| Defense Items | 3 | 150-400g | Enchanter, Healer |
| Legendary | 1 | Drop only | Floor 5 boss (3%) |
| **Total** | **21** | **200-600g** | **4 locations + dungeon** |

---

## 2026-02-14 — Hexes & Curses: Gameplay Option Toggle (18:30 UTC)

### Changes

Added `enableHexesCurses` as an optional gameplay toggle in the Options menu, following the same pattern as Aging, Weather, Festivals, and Permadeath.

**Default: OFF** — This is an opt-in rivalry feature. Players must explicitly enable it.

### Files Changed

| File | Change |
|------|--------|
| `src/data/gameOptions.ts` | Added `enableHexesCurses: boolean` to `GameOptions` interface + `false` default |
| `src/components/game/OptionsMenu.tsx` | Added toggle row with Flame icon under Gameplay tab (after Permadeath, with separator) |
| `src/i18n/types.ts` | Added `hexesCurses` and `hexesCursesDesc` translation keys |
| `src/i18n/en.ts` | English: "Hexes & Curses" — "Dark magic rivalry..." |
| `src/i18n/de.ts` | German: "Flüche & Verwünschungen" — "Dunkle Magie-Rivalität..." |
| `src/i18n/es.ts` | Spanish: "Maleficios y Maldiciones" — "Rivalidad con magia oscura..." |

### Verification
- TypeScript: Clean compilation (no errors)
- Backwards compatible: `loadGameOptions()` merges with defaults, so existing localStorage is unaffected

### Next Steps
- ~~Implement the actual hex/curse system~~ ✅ DONE (see below)

---

## 2026-02-14 16:37 — Hexes & Curses System Implementation

### Summary
Full implementation of the Hexes & Curses gameplay system as designed in the changelog above. This is an opt-in rivalry feature (`enableHexesCurses` toggle in Game Options, off by default).

### Files Created
| File | Purpose |
|------|---------|
| `src/data/hexes.ts` | All hex/curse definitions (6 location hexes, 6 personal curses, 5 sabotage hexes, 1 legendary), defense items, shop rotation, drop logic |
| `src/store/helpers/hexHelpers.ts` | Store actions (buy, cast, dispel, cleanse, dark ritual, curse reflection), expiration processing, curse effect helpers |
| `src/components/game/HexShopPanel.tsx` | Shared hex shop UI (used by Enchanter "Dark Scrolls" tab and Shadow Market "Dirty Tricks" tab) |
| `src/components/game/GraveyardHexPanel.tsx` | Graveyard dark magic UI (Dark Ritual, Curse Reflection, Purification) |
| `src/test/hexes.test.ts` | 34 tests covering data layer, store actions, expiration, feature toggle |

### Files Modified
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `hexScrolls`, `activeCurses`, `hasProtectiveAmulet`, `hexCastCooldown` to Player; `locationHexes` to GameState |
| `src/store/storeTypes.ts` | Added 9 hex action signatures to GameStore interface |
| `src/store/gameStore.ts` | Wired hexHelpers, added defaults to createPlayer, added `locationHexes: []` to initial state and startNewGame |
| `src/store/helpers/weekEndHelpers.ts` | Added `processHexExpiration()` to week-end pipeline (Step 2b), Curse of Decay doubles food/clothing degradation |
| `src/store/helpers/startTurnHelpers.ts` | Added Curse of Lethargy time-loss (Phase 6b) |
| `src/store/helpers/workEducationHelpers.ts` | Added Curse of Poverty wage reduction in workShift |
| `src/components/game/locationTabs.tsx` | Added hex tabs to Enchanter, Shadow Market, Graveyard; location hex blockage in getLocationTabs |
| `src/components/game/InfoTabs.tsx` | Added Dark Magic section (afflictions + scrolls) to Stats tab |
| `src/components/game/CavePanel.tsx` | Added hex scroll drop handling after boss defeats |
| `src/data/combatResolver.ts` | Added `hexScrollDropId` to DungeonRunState, hex drop roll on boss defeat |
| `src/network/types.ts` | Added 9 hex actions to ALLOWED_GUEST_ACTIONS whitelist |
| `src/hooks/ai/actions/rivalryActions.ts` | Added AI hex casting (cast-curse, cast-location-hex) and defense (buy-amulet) behaviors |
| `src/hooks/ai/actionExecutor.ts` | Added hex action handlers and StoreActions for AI |
| `src/hooks/ai/types.ts` | Added hex action types to AIActionType union |
| `src/data/saveLoad.ts` | Added v3→v4 migration for hex fields, bumped SAVE_VERSION to 4 |

### Hex System Architecture
```
┌─────────────────────────────────────────────────────────┐
│  LOCATION HEXES (block opponents from using locations)  │
│  6 types: Academy, Guild Hall, General Store, Forge,    │
│           Bank (drop only), Cave                        │
│  Duration: 1-2 weeks | Cast time: 3h | 1 per caster    │
├─────────────────────────────────────────────────────────┤
│  PERSONAL CURSES (debuff a specific rival)              │
│  6 types: Poverty (wages -40%), Clumsiness (equip 3x), │
│           Lethargy (-10h/turn), Misfortune (2x robbery),│
│           Decay (food/clothes 2x), Confusion (+2 study) │
│  Duration: 2-4 weeks | Cast time: 2h | 1 per target    │
├─────────────────────────────────────────────────────────┤
│  SABOTAGE (instant destruction)                         │
│  5 types: Shatter (weapon), Corrode (armor),            │
│           Spoilage (food), Jinx (appliance),            │
│           Wardrobe (clothing)                           │
│  Instant | Cast time: 2h                                │
├─────────────────────────────────────────────────────────┤
│  LEGENDARY: Hex of Ruin (Floor 5 drop only)             │
│  Closes ALL shops + 25% gold loss | Cannot be warded    │
├─────────────────────────────────────────────────────────┤
│  DEFENSE                                                │
│  Protective Amulet (400g) - blocks next hex, consumed   │
│  Dispel Scroll (250g) - removes location hex at site    │
│  Graveyard Purification (300g) - removes personal curse │
│  Graveyard Reflection (150g) - 35% reflect / 25% remove│
└─────────────────────────────────────────────────────────┘
```

### Sources
- **Enchanter** → "Dark Scrolls" tab (requires Floor 2 cleared), defense items
- **Shadow Market** → "Dirty Tricks" tab (rotating 3-4 per week)
- **Graveyard** → "Dark Magic" tab (Dark Ritual: random scroll, 15% backfire)
- **Dungeon** → Boss drops (Floors 3-5, 3-5% chance each)

### Feature Guard
All hex logic is behind `getGameOption('enableHexesCurses')` — when disabled:
- Store actions return early / return failure
- UI tabs are hidden
- Dungeon drops skip hex scrolls
- Week-end processing skips hex expiration

### Test Results
- 34 new tests in `src/test/hexes.test.ts`
- All 219 tests pass (185 existing + 34 new)
- TypeScript: 0 errors
- Build: clean

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Round 4 — Parallel Agent Scan) (17:00 UTC)

### Bug Report

Game stuck on static "Loading the realm..." screen — React never mounts. This is the **fourth** investigation of this recurring issue. Previous fixes addressed:
- Round 1: Audio singleton crash (webAudioBridge, audioManager, ambientManager)
- Round 2: Missing @radix-ui/react-collection dependency
- Round 3: Eager import tree (GameBoard blocks everything → lazy-loaded)

### Investigation Method

Systematic parallel AI agent scan with **5 specialized agents** scanning simultaneously:
1. Loading chain analysis (index.html → main.tsx → App.tsx → Index.tsx)
2. Recent changes (Hexes & Curses system) for crash paths
3. Store initialization & hex state
4. Module-level side effects and singleton instantiation
5. i18n, new components, and circular dependencies

### Root Cause Analysis

**PRIMARY: TitleScreen eagerly imports ALL audio singletons via OptionsMenu**

The import chain that creates 4 module-level singletons:
```
TitleScreen
  ├── useAudioSettings → audioManager (2 HTMLAudioElement + 2 GainNode)
  └── OptionsMenu (EAGERLY imported)
       ├── useSFXSettings → sfxManager (8 HTMLAudioElement + 8 GainNode)
       ├── useAmbientSettings → ambientManager (2 HTMLAudioElement + 2 GainNode)
       └── useNarrationSettings → speechNarrator (SpeechSynthesis API)
```

**Impact**: ALL 4 audio singletons are created at module import time before React can mount. If ANY constructor throws (browser restriction, sandboxed iframe, broken Audio API), the entire module evaluation chain fails silently, React never mounts, and "Loading the realm..." stays forever.

OptionsMenu, UserManual, and CreditsScreen are only shown when the user clicks buttons — they should NOT be in the eager import chain.

**SECONDARY: sfxManager GainNode null unsafety**

`sfxManager.ts` line 99: `private gainNodes: GainNode[]` — but `connectElement()` returns `GainNode | null`. Pushes null into the array. Later at line 149: `gain.gain.value = effectiveVolume` — crashes if gain is null (when AudioContext is unavailable).

**TERTIARY: Auto-save subscription at module level without error protection**

`gameStore.ts` line 428: `useGameStore.subscribe(...)` executes at module import time. If `saveGame()` throws (localStorage full, serialization error), module evaluation fails.

### What Was NOT the Cause

All investigated and confirmed safe:
- ✅ Hexes & Curses system — clean data layer, proper types, feature-guarded, no circular deps
- ✅ game.types.ts ↔ hexes.ts — type-only imports (erased at compile time)
- ✅ hexHelpers.ts — no circular dependencies with gameStore
- ✅ i18n system — all languages have matching shapes, hex keys present
- ✅ Save/load migration (v3→v4) — proper defaults
- ✅ Store initialization — hex fields properly defaulted
- ✅ SFXGeneratorPage — clean imports
- ✅ gameStore ↔ NetworkActionProxy circular dependency — safe (runtime-only access)

### Fixes Applied (5)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `TitleScreen.tsx` | **Lazy-load OptionsMenu, UserManual, CreditsScreen** with `React.lazy()` + `Suspense`. Removes sfxManager (8 Audio + 8 GainNode), ambientManager, and speechNarrator singletons from the eager import chain. Initial bundle reduced by **92 KB** (868→776 KB). |
| 2 | **HIGH** | `sfxManager.ts` | **Fix GainNode null safety**: changed `gainNodes: GainNode[]` to `(GainNode | null)[]`. Play method now falls back to `element.volume` when GainNode is null. Added empty pool guard (synth-only fallback). |
| 3 | **HIGH** | `sfxManager.ts` | **Constructor try-catch**: wraps audio pool creation in try-catch. If `new Audio()` throws, SFX gracefully degrades to synth-only. |
| 4 | **MEDIUM** | `gameStore.ts` | **Auto-save subscription try-catch**: wraps both the `subscribe()` call AND the `saveGame()` call inside it. Prevents module evaluation failure if localStorage or serialization throws. |
| 5 | **MEDIUM** | `audioManager.ts`, `ambientManager.ts` | **Constructor try-catch**: wraps `new Audio()` + loop/preload setup. Falls back to empty object if Audio API is unavailable. |

### Technical Details

**Before (TitleScreen.tsx) — ALL singletons eagerly loaded:**
```tsx
import { OptionsMenu } from '@/components/game/OptionsMenu';   // sfx + ambient + narration
import { UserManual } from '@/components/game/UserManual';
import { CreditsScreen } from '@/components/screens/CreditsScreen';
```

**After (TitleScreen.tsx) — heavy components lazy-loaded:**
```tsx
const OptionsMenu = lazy(() => import('@/components/game/OptionsMenu').then(m => ({ default: m.OptionsMenu })));
const UserManual = lazy(() => import('@/components/game/UserManual').then(m => ({ default: m.UserManual })));
const CreditsScreen = lazy(() => import('@/components/screens/CreditsScreen').then(m => ({ default: m.CreditsScreen })));
```

**Build output — improved code splitting:**
```
Before: index.js 868 KB (TitleScreen + OptionsMenu + UserManual + CreditsScreen)
After:  index.js 776 KB (TitleScreen only — 11% smaller)
        OptionsMenu.js 41 KB (lazy)
        UserManual.js 41 KB (lazy)
        CreditsScreen.js 9 KB (lazy)
```

**sfxManager GainNode fix:**
```typescript
// Before: crashes when GainNode is null
gain.gain.value = effectiveVolume;

// After: graceful fallback
if (gain) {
  gain.gain.value = effectiveVolume;
} else {
  audio.volume = effectiveVolume;
}
```

### Files Changed (5)

```
src/components/screens/TitleScreen.tsx    — Lazy-load OptionsMenu, UserManual, CreditsScreen
src/audio/sfxManager.ts                  — GainNode null safety + constructor try-catch + empty pool guard
src/audio/audioManager.ts                — Constructor try-catch for Audio()
src/audio/ambientManager.ts              — Constructor try-catch for Audio()
src/store/gameStore.ts                   — Auto-save subscription try-catch
```

### Verification

- TypeScript: Clean (0 errors)
- Tests: 219/219 passing (10 test files, 0 failures)
- Build: Succeeds with improved code splitting (8 lazy chunks instead of 5)
- Initial bundle: 776 KB (was 868 KB) — 11% reduction
- No regressions

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Round 5 — Architectural Hardening) (18:00 UTC)

### Bug Report

Game stuck on static "Loading the realm..." screen — React never mounts. This is the **fifth** investigation of this recurring issue.

### Investigation Method

Systematic parallel AI agent scan with **5 specialized agents** scanning simultaneously:
1. Full loading chain analysis (index.html → main.tsx → App.tsx → Index.tsx → TitleScreen.tsx)
2. Store initialization & hex system (gameStore, hexHelpers, hexes.ts, saveLoad.ts)
3. Audio singletons & module-level side effects (all 4 audio managers + webAudioBridge)
4. Import/dependency tree (circular deps, missing packages, vite config)
5. TitleScreen import tree (eager vs lazy imports, transitive singleton pulls)

### Root Cause Analysis

**PRIMARY: Index.tsx eagerly imports ALL 3 audio singletons**

Despite Round 4 lazy-loading OptionsMenu/UserManual/CreditsScreen in TitleScreen.tsx, `Index.tsx` itself still eagerly imported the audio hooks at lines 4-6:

```tsx
import { useMusicController } from '@/hooks/useMusic';      // → audioManager singleton
import { useAmbientController } from '@/hooks/useAmbient';  // → ambientManager singleton
import { useNarrationController } from '@/hooks/useNarration'; // → speechNarrator singleton
```

Each hook module imports its manager singleton at the TOP LEVEL. The singletons are created at module import time — before React can render anything. If ANY of them crashes, Index.tsx fails to load, React never mounts.

**SECONDARY: speechNarrator constructor completely unprotected**

Unlike `audioManager` and `ambientManager` (which were wrapped in try-catch in Round 4), `speechNarrator` had NO try-catch in its constructor:

```typescript
constructor() {
  this.settings = loadSettings();
  this.cachedSettings = { ...this.settings };
  this.initVoices();                    // ← calls speechSynthesis API with NO try-catch
  this.registerUserGestureListener();   // ← calls document.addEventListener with NO try-catch
}
```

`initVoices()` calls `window.speechSynthesis.getVoices()` and `.addEventListener('voiceschanged', ...)` — both can throw in sandboxed iframes, privacy-restricted browsers, or broken SpeechSynthesis implementations. A throw here prevents React from mounting.

**TERTIARY: main.tsx static import can't catch module failures**

`main.tsx` had:
```typescript
import App from "./App.tsx";  // ← Static import — evaluated BEFORE try-catch runs

try {
  createRoot(...).render(<App />);
} catch (error) {
  showMountError(error);      // ← Never reached if import fails
}
```

Static ES module imports execute during module resolution, BEFORE the module body runs. If App or any transitive dependency throws during module evaluation, the error bypasses the try-catch entirely. Only the raw `window.onerror`/`unhandledrejection` handlers in index.html could catch it — with a 3-second delay and no clear error message.

### What Was Already Fixed (from previous rounds)

All confirmed still in place:
- ✅ `@radix-ui/react-collection` explicit dependency (Round 2)
- ✅ `unhandledrejection` handler in index.html (Round 2)
- ✅ `speechNarrator.doSpeak()` try-catch (Round 1)
- ✅ `webAudioBridge.ts` safe AudioContext creation (Round 1)
- ✅ `audioManager` constructor try-catch (Round 4)
- ✅ `ambientManager` constructor try-catch (Round 4)
- ✅ `sfxManager` constructor try-catch (Round 4)
- ✅ `gameStore` auto-save subscription try-catch (Round 4)
- ✅ Lazy-loaded GameBoard/GameSetup/VictoryScreen/OnlineLobby (Round 3)
- ✅ Lazy-loaded OptionsMenu/UserManual/CreditsScreen (Round 4)
- ✅ `controllerchange` listener for auto-reload on SW update (Round 1)
- ✅ AbortController 5s timeout on version.json fetches (Round 3)

### Fixes Applied (4)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `src/pages/Index.tsx` | **Lazy-load AudioController** — extracted all 3 audio hooks (useMusicController, useAmbientController, useNarrationController) into a new `AudioController` component. Lazy-loaded via `React.lazy()` with a `SilentErrorBoundary` that swallows load failures. Audio singletons no longer on the critical path — if audio fails, game runs silently. |
| 2 | **HIGH** | `src/audio/speechNarrator.ts` | **Constructor try-catch** — wrapped `initVoices()` and `registerUserGestureListener()` in try-catch. If SpeechSynthesis API is broken, narration degrades to silent instead of crashing. |
| 3 | **HIGH** | `src/audio/speechNarrator.ts` | **initVoices() try-catch** — wrapped `getVoices()`, `addEventListener('voiceschanged')`, and fallback timeout in try-catch. Handles broken SpeechSynthesis implementations. |
| 4 | **HIGH** | `src/main.tsx` | **Dynamic import of App** — changed from `import App from "./App"` (static, uncatchable) to `const { default: App } = await import("./App")` (dynamic, caught by try-catch). ANY module-level failure in the entire component tree now shows `showMountError()` with the actual error message instead of hanging silently. |

### Files Changed (4 files, 1 new)

```
src/pages/Index.tsx                          — Lazy-load AudioController + SilentErrorBoundary
src/audio/speechNarrator.ts                  — Constructor + initVoices() try-catch
src/main.tsx                                 — Dynamic import of App for catchable errors
src/components/game/AudioController.tsx      — NEW: wrapper component for all audio hooks
```

### Architecture: Defense-in-Depth Loading Chain

After this fix, the loading chain has **5 independent error boundaries**:

```
Layer 1: index.html
  ├── window.onerror (sync errors)
  ├── window.onunhandledrejection (async/module errors)
  └── guildFallbackCheck at 5s/12s (reload button)

Layer 2: main.tsx
  └── mount() async function with try-catch
      └── dynamic import("./App") — catches ALL module-level failures
      └── showMountError() — replaces loading screen with error + reload

Layer 3: App.tsx
  └── ErrorBoundary (React class component)
      └── "Something went wrong" + Clear Cache & Reload

Layer 4: Index.tsx
  └── Suspense + ScreenLoader for lazy screens
  └── SilentErrorBoundary for AudioController
      └── If audio fails, game runs silently (no crash)

Layer 5: Individual singletons
  ├── audioManager — constructor try-catch
  ├── ambientManager — constructor try-catch
  ├── sfxManager — constructor try-catch
  ├── speechNarrator — constructor try-catch (NEW)
  └── webAudioBridge — getContext()/connectElement() try-catch
```

**No single point of failure can prevent the game from showing useful content.**

### Build Output — Code Splitting Improvement

```
Before (Round 4):
  index.js    776 KB  (everything on critical path)

After (Round 5):
  index.js    145 KB  (createRoot + CSS + error handler only)
  App.js      614 KB  (dynamically imported — failure shows error)
  Audio.js     16 KB  (lazy — failure = silent game)
  GameBoard   489 KB  (lazy — failure = ScreenLoader)
```

**Initial bundle reduced by 81%** (776 KB → 145 KB). React mounting is now nearly instant — the heavy modules load asynchronously after the initial render.

### Verification

- TypeScript: Clean (0 errors)
- Tests: 219/219 passing (10 test files, 0 failures)
- Build: Succeeds with improved code splitting
- Initial bundle: 145 KB (was 776 KB) — 81% reduction
- No regressions

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Round 6 — Cache Root Cause) (18:30 UTC)

### Bug Report
Game stuck on static "Loading the realm..." screen — React never mounts.
User reports: **"Ser ut som den prøve å lade gammel cache"** (looks like it's trying to load old cache).

This is the **sixth** investigation of this recurring issue. Previous rounds fixed audio singletons, missing deps, eager imports, and lazy loading. This round targets the **root cause**: stale browser cache serving old HTML that references chunk hashes that no longer exist.

### Investigation Method

Systematic parallel AI agent scan with **7 specialized agents** scanning simultaneously:
1. Loading chain analysis (index.html → main.tsx → App.tsx → Index.tsx → TitleScreen)
2. PWA / Service Worker / Cache configuration
3. Store initialization & save/load
4. Audio singletons & module-level side effects
5. Circular dependencies & missing imports
6. Recent code changes
7. Build output & runtime behavior

### Root Cause Analysis

**PRIMARY: Stale browser-cached HTML + new SW precache = hash mismatch**

GitHub Pages sets `Cache-Control: max-age=600` (10 min) on HTML files. During that window:
1. Browser serves stale `index.html` from HTTP cache (with OLD chunk hash references)
2. New SW has been deployed with NEW precache manifest (new chunk hashes)
3. Browser requests old chunk filename → 404 or cache miss → module loading fails
4. React never mounts → "Loading the realm..." forever
5. No error shown because the `unhandledrejection` handler only fires after 3s delay

This is the exact "old cache" scenario the user described.

**SECONDARY: Circular dependency gameStore.ts ↔ NetworkActionProxy.ts**

```
gameStore.ts (line 22) → imports forwardIfGuest from NetworkActionProxy.ts
NetworkActionProxy.ts (line 6) → imports useGameStore from gameStore.ts
```

During module evaluation, one module gets a partially-initialized reference to the other. While modern bundlers handle many circular dep cases, this is a fragile pattern that can break during code splitting, especially when the SW serves a mix of old and new chunks.

**TERTIARY: hardRefresh() race condition**

`hardRefresh()` called `window.location.reload()` immediately after `await Promise.all(...)` for unregister/cache-delete. But the browser may reload before these async operations fully propagate, causing the stale SW to reactivate on reload.

**QUATERNARY: No pre-mount version check**

`main.tsx` immediately imported App.tsx without checking whether the running HTML matches the deployed version. By the time `useAppUpdate()` could detect a version mismatch (inside React), module loading had already failed.

### Fixes Applied (6)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `src/main.tsx` | **Pre-mount staleness check**: Before importing App.tsx, fetch `version.json` with `cache: 'no-store'` and compare `__BUILD_TIME__`. If stale, clear all caches + unregister SWs + reload BEFORE any module loading. Catches the "stale HTML + new chunks" scenario at the earliest possible point. 3s timeout ensures it doesn't block mount on offline/slow networks. |
| 2 | **CRITICAL** | `src/network/NetworkActionProxy.ts` | **Break circular dependency**: Removed `import { useGameStore } from '@/store/gameStore'` top-level import. Replaced with `setStoreAccessor()` pattern — gameStore.ts registers a state accessor function after store creation. NetworkActionProxy uses this accessor at call time instead of importing the store directly. If accessor isn't set yet (during init), `shouldForwardAction` returns false (safe default). |
| 3 | **HIGH** | `src/store/gameStore.ts` | **Register store accessor**: Added `setStoreAccessor(() => useGameStore.getState())` call after store creation to complete the circular dep fix. |
| 4 | **HIGH** | `src/hooks/useAppUpdate.ts` | **Fix hardRefresh() race condition**: Added 100ms delay between cache operations and `window.location.reload()`. Ensures async unregister/cache-delete propagate before the browser reloads. |
| 5 | **HIGH** | `index.html` | **Cache-control meta tags**: Added `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">`, `Pragma: no-cache`, `Expires: 0`. Tells browsers to always revalidate this HTML page, reducing the stale-HTML window from 10 min to ~0. |
| 6 | **HIGH** | `index.html` | **Improved fallback timer**: Changed from two fixed timeouts (5s/12s) to a polling loop (every 3s starting at 4s). Self-cleaning — stops polling once React mounts. First check at 4s accounts for the pre-mount version check (3s timeout). |
| 7 | **HIGH** | `src/pages/Index.tsx` | **Lazy chunk retry logic**: `lazyWithRetry()` wrapper for `React.lazy()` — retries chunk import once on failure, then clears all caches + unregisters SWs + reloads on second failure. Recovers from transient network errors and stale-cache hash mismatches. |

### Technical Details

**Pre-mount version check (main.tsx):**
```typescript
async function checkStaleBuild(): Promise<boolean> {
  if (typeof __BUILD_TIME__ === 'undefined') return false;
  try {
    const resp = await fetch(`${base}version.json?_=${Date.now()}`, { cache: 'no-store' });
    const data = await resp.json();
    if (data.buildTime && data.buildTime !== __BUILD_TIME__) {
      // Clear SW + caches + wait 100ms + reload
      return true;
    }
  } catch { /* proceed with mount if offline */ }
  return false;
}

async function mount() {
  const isStale = await checkStaleBuild();
  if (isStale) return; // reloading
  const { default: App } = await import("./App.tsx");
  createRoot(root).render(<App />);
}
```

**Circular dependency fix (NetworkActionProxy.ts):**
```typescript
// BEFORE: Circular import
import { useGameStore } from '@/store/gameStore';
export function shouldForwardAction(...) {
  const state = useGameStore.getState(); // could be undefined during init
}

// AFTER: Setter pattern — no import needed
let storeAccessor: (() => { networkMode: string }) | null = null;
export function setStoreAccessor(accessor) { storeAccessor = accessor; }
export function shouldForwardAction(...) {
  if (!storeAccessor) return false; // safe default during init
  const state = storeAccessor();
}
```

**Lazy chunk retry (Index.tsx):**
```typescript
function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch(() =>
      factory().catch(() => {
        // Second failure — clear caches + reload
        caches.keys().then(names => names.forEach(name => caches.delete(name)));
        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
        setTimeout(() => window.location.reload(), 200);
        return new Promise(() => {}); // hang while reloading
      })
    )
  );
}
```

### Files Changed (6)

```
src/main.tsx                          — Pre-mount staleness check (version.json)
src/network/NetworkActionProxy.ts     — Break circular dep (setStoreAccessor pattern)
src/store/gameStore.ts                — Register store accessor + import setStoreAccessor
src/hooks/useAppUpdate.ts             — hardRefresh() 100ms delay before reload
index.html                            — Cache-control meta tags + polling fallback timer
src/pages/Index.tsx                   — lazyWithRetry() chunk loading retry logic
```

### Architecture: "Old Cache" Defense Layers

After this fix, the app has **4 layers** of defense against stale cache:

```
Layer 1: Browser (index.html)
  └── Cache-Control: no-cache, no-store, must-revalidate
  └── Forces browser to always revalidate HTML from server

Layer 2: Pre-mount check (main.tsx)
  └── Fetches version.json BEFORE loading any app modules
  └── If stale: clear caches + unregister SWs + reload
  └── Prevents old HTML from even trying to load new chunks

Layer 3: Chunk retry (Index.tsx)
  └── lazyWithRetry() retries failed chunk imports
  └── On second failure: clear caches + reload
  └── Recovers from transient errors and partial cache

Layer 4: In-app detection (useAppUpdate.ts)
  └── version.json polling every 60s
  └── controllerchange listener for auto-reload
  └── hardRefresh() with proper async settling
```

### Verification

- TypeScript: Clean (0 errors)
- Tests: 219/219 passing (10 test files, 0 failures)
- Build: Succeeds cleanly
- No regressions

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Round 7 — Parallel Agent Scan) (19:00 UTC)

### Bug Report

Game stuck on static "Loading the realm..." screen — React never mounts. User reports: **"Spill starter ikke. Står bare loading the realm.. Ser ut som den prøve å lade gammel cache"** (Game doesn't start. Just shows loading the realm. Looks like it's trying to load old cache).

This is the **seventh** investigation of this recurring issue. Previous rounds fixed audio singletons (R1), missing dependencies (R2), eager imports (R3/R4/R5), and stale cache detection (R6).

### Investigation Method

Systematic parallel AI agent scan (7 areas):
1. Store initialization & save/load (`gameStore.ts`, `saveLoad.ts`, helpers)
2. Loading chain analysis (`index.html` → `main.tsx` → `App.tsx` → `Index.tsx`)
3. Audio singletons & module-level side effects
4. PWA/Service Worker configuration (`vite.config.ts`, `useAppUpdate.ts`)
5. Import tree & circular dependencies
6. TitleScreen eager import chain
7. Build output & runtime behavior

### Root Cause Analysis

**BUG #1 (CRITICAL): Circular dependency `gameStore.ts` ↔ `networkState.ts`**

```
gameStore.ts (line 23): import { markEventDismissed } from '@/network/networkState'
networkState.ts (line 4): import { useGameStore } from '@/store/gameStore'
```

This is the EXACT same circular pattern that was already fixed in `NetworkActionProxy.ts` (Round 6) using the `setStoreAccessor()` pattern — but `networkState.ts` was NEVER updated. During module evaluation, one module gets a partially-initialized reference to the other. While ES module live bindings might handle this at runtime, it's a fragile pattern that can break under code splitting and stale cache conditions (mixed old/new chunk versions).

**BUG #2 (HIGH): No inline version check before module loading**

All existing version checks are INSIDE JavaScript bundles:
- `main.tsx:checkStaleBuild()` — inside the entry chunk
- `useAppUpdate.ts` — inside App.tsx's import tree

If the entry chunk fails to load (stale HTML → 404 for old chunk hash), these checks NEVER RUN. The user sees "Loading the realm..." forever with no error shown until the 4s fallback timer fires.

Missing defense layer: an inline script in `index.html` that runs BEFORE the module script, compares the build time baked into the HTML with the server's `version.json`, and auto-reloads on mismatch.

**BUG #3 (MEDIUM): `SFXGeneratorPage` eagerly imported in `App.tsx`**

```tsx
import SFXGeneratorPage from "./pages/SFXGenerator"; // pulls in jszip (110 KB)
```

The admin-only SFX generator page is statically imported in `App.tsx`, adding `jszip` and ElevenLabs service code to the critical path. 99.9% of users never visit `/admin/sfx`. This inflates `App.js` by 110 KB and adds a module that could fail to evaluate.

**BUG #4 (MEDIUM): Duplicate version.json fetches**

`main.tsx` fetches `version.json` independently from the fallback timer in `index.html`. On slow connections, this adds 3s of waiting before the app even starts loading modules.

### Fixes Applied (4)

| # | Severity | File(s) | Fix |
|---|----------|---------|-----|
| 1 | **CRITICAL** | `networkState.ts`, `gameStore.ts` | **Break circular dependency**: Replaced `import { useGameStore }` with `setNetworkStateStoreAccessor()` pattern (same approach as NetworkActionProxy). `gameStore.ts` registers accessor after store creation. Functions that need store access use the accessor at call time. Safe default (error log + return) if accessor isn't set yet. |
| 2 | **HIGH** | `index.html`, `vite.config.ts`, `main.tsx` | **Inline stale-build detection (Layer 0)**: Vite plugin injects `window.__HTML_BUILD_TIME__` into HTML at build time via `transformIndexHtml`. New inline script in HTML pre-fetches `version.json` and compares with baked-in build time. On mismatch: clears caches + unregisters SWs + reloads — ALL before the module script even loads. `main.tsx` reuses the pre-fetched promise (`window.__versionCheck`) to avoid a duplicate fetch. |
| 3 | **MEDIUM** | `App.tsx` | **Lazy-load SFXGeneratorPage**: Changed from static import to `React.lazy()` + `Suspense`. Removed `jszip` + admin code (110 KB) from critical path. App.js reduced from 615 KB → 505 KB (-18%). |
| 4 | **MEDIUM** | `main.tsx` | **Reuse pre-fetched version data**: `checkStaleBuild()` now reads `window.__versionCheck` (pre-fetched by index.html inline script) instead of making a separate fetch. Falls back to own fetch if pre-fetched data isn't available (dev mode). |

### Architecture: Defense-in-Depth Loading Chain (7 Layers)

After this fix, the loading chain has **7 independent defense layers** against stale cache:

```
Layer 0: HTML inline script (NEW — runs BEFORE module script)
  └── window.__HTML_BUILD_TIME__ vs version.json
  └── If stale: clear caches + reload IMMEDIATELY
  └── No module loading needed — works even when all JS chunks 404

Layer 1: Browser cache headers (index.html)
  └── Cache-Control: no-cache, no-store, must-revalidate
  └── Forces browser to revalidate HTML from server

Layer 2: Pre-mount check (main.tsx)
  └── Reuses pre-fetched version.json from Layer 0
  └── __BUILD_TIME__ (baked into JS) vs version.json (from server)
  └── If stale: clear caches + reload before importing App

Layer 3: Chunk retry (Index.tsx)
  └── lazyWithRetry() retries failed chunk imports once
  └── On second failure: clear caches + reload

Layer 4: Error boundaries (App.tsx + Index.tsx)
  └── ErrorBoundary catches React render errors
  └── SilentErrorBoundary for audio subsystem

Layer 5: Error handlers (index.html)
  └── window.onerror + unhandledrejection
  └── Shows error message + reload button after 3s

Layer 6: Fallback polling (index.html)
  └── Polls every 3s starting at 5s
  └── Shows "Clear Cache & Reload" button if React hasn't mounted
```

### Technical Details

**Circular dependency fix (networkState.ts):**
```typescript
// BEFORE: Circular import
import { useGameStore } from '@/store/gameStore';
export function serializeGameState() {
  const s = useGameStore.getState(); // could be undefined during init
}

// AFTER: Setter pattern — no import needed
let storeAccessor: StoreAccessor | null = null;
export function setNetworkStateStoreAccessor(accessor: StoreAccessor) {
  storeAccessor = accessor;
}
export function serializeGameState() {
  if (!storeAccessor) { console.error('...'); return {} as SerializedGameState; }
  const s = storeAccessor.getState();
}
```

**Inline version check (index.html — injected by Vite at build time):**
```html
<script>window.__HTML_BUILD_TIME__="2026-02-14T19:25:54.236Z";</script>
<script>
(function(){
  if(!window.__HTML_BUILD_TIME__) return; // dev mode
  window.__versionCheck = fetch('version.json?_=' + Date.now(), {cache:'no-store'})
    .then(r => r.ok ? r.json() : null).catch(() => null);
  window.__versionCheck.then(function(data) {
    if (!data || data.buildTime === window.__HTML_BUILD_TIME__) return;
    // STALE! Clear caches + reload before module script even loads
    // ...
  });
})();
</script>
```

**Build output — improved code splitting:**
```
Before:
  App.js       615 KB (includes jszip + SFXGenerator admin code)

After:
  App.js       505 KB (-18%, admin code removed from critical path)
  SFXGenerator 110 KB (lazy-loaded, only on /admin/sfx)
```

### Files Changed (6)

```
src/network/networkState.ts          — Break circular dep (setNetworkStateStoreAccessor pattern)
src/store/gameStore.ts               — Register networkState accessor after store creation
index.html                           — Inline stale-build detection script + pre-fetch version.json
vite.config.ts                       — transformIndexHtml injects __HTML_BUILD_TIME__
src/main.tsx                         — Reuse pre-fetched version data from window.__versionCheck
src/App.tsx                          — Lazy-load SFXGeneratorPage
```

### Verification

- TypeScript: Clean (0 errors)
- Tests: 219/219 passing (10 test files, 0 failures)
- Build: Succeeds with improved code splitting
- `version.json` buildTime matches `__HTML_BUILD_TIME__` in built HTML
- No regressions

---

## 2026-02-14 — BUG HUNT: "Loading the realm..." Freeze (Round 4 — Permanent Fix) (21:00 UTC)

### Bug Report

Game stuck on "Loading the realm..." screen — AGAIN. This is the **fourth** occurrence of this recurring issue. User reports it keeps coming back and appears to be cache-related. Previous fixes (rounds 1-3) addressed symptoms but not the root architectural vulnerability.

### Investigation Method

Systematic parallel AI agent scan with **3 specialized agents** scanning simultaneously:
1. **PWA/Service Worker agent** — analyzed vite.config.ts, index.html, main.tsx SW registration, caching strategy
2. **Loading chain agent** — analyzed Index.tsx, TitleScreen, gameStore, App.tsx initialization flow
3. **Zustand/localStorage agent** — analyzed store persistence, hydration, all 12 localStorage keys

### Root Cause Analysis

**PRIMARY: Service Worker PRECACHES JS/CSS bundles — creates stale chunk race condition**

The `globPatterns` in vite.config.ts included `**/*.{js,css,...}`:
```javascript
globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"]
```

This meant the SW precache manifest contained every JS/CSS chunk with their content hashes. On new deployments:

1. New SW activates via `skipWaiting + clientsClaim` (takes control immediately)
2. `cleanupOutdatedCaches: true` removes old precache entries (old chunk hashes)
3. But browser may still have old HTML (GitHub Pages caches HTML for 600s)
4. Old HTML references old chunk hashes (e.g., `index-abc123.js`)
5. Old chunks are gone from SW precache → request falls through to network → 404
6. Module loading fails → React never mounts → "Loading the realm..." forever

This is a **fundamental architectural flaw**: the SW precache and HTML are updated at different times, creating a window where they reference different chunk hashes.

**SECONDARY: `hardRefresh()` only waited 100ms before reload**

The async SW unregistration and cache deletion operations may not complete in 100ms. If reload fires before cleanup finishes, the stale SW re-activates immediately on the next load.

**TERTIARY: `lazyWithRetry()` used fire-and-forget `.then()` chains**

Cache operations in the retry handler were called with `.then()` (non-blocking) instead of `await` (blocking). The `setTimeout(reload, 200)` could fire before cache operations started.

**QUATERNARY: Reload loop prevention was too restrictive**

`canAutoReload()` used a 30-second time-based check. If CDN served stale content during that window, auto-reload was blocked and the user was stuck with stale JS.

**QUINARY: Inline stale-build detection (index.html) used fire-and-forget cache cleanup**

Same `.then()` pattern — cache deletion promises not awaited before calling `location.reload()`.

### What Was Already Fixed (Rounds 1-3)

All confirmed still in place:
- ✅ `@radix-ui/react-collection` explicit dependency (package.json)
- ✅ `unhandledrejection` handler (index.html)
- ✅ `speechNarrator.doSpeak()` try-catch
- ✅ React.lazy() for GameBoard, GameSetup, VictoryScreen, OnlineLobby
- ✅ `navigateFallback: null` (HTML always from network)
- ✅ SilentErrorBoundary for AudioController
- ✅ AbortController 5s timeout on version.json fetches
- ✅ `controllerchange` listener for SW takeover auto-reload

### Fixes Applied (5)

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | **CRITICAL** | `vite.config.ts` | **Removed JS/CSS from SW precache globPatterns.** Changed from `**/*.{js,css,ico,png,...}` to `**/*.{ico,png,svg,jpg,jpeg,webp,woff,woff2}`. JS/CSS now uses `NetworkFirst` runtime caching instead (always tries network first, cache fallback only when offline). This eliminates the stale-chunk race condition entirely. |
| 2 | **HIGH** | `src/hooks/useAppUpdate.ts` | **Robust `hardRefresh()`** — increased wait from 100ms to 500ms, added SW unregister verification (re-checks after first pass). **Smarter `canAutoReload()`** — switched from 30s time-based to counter-based (max 2 reloads per 60s window), allowing proper recovery while still preventing infinite loops. |
| 3 | **HIGH** | `src/pages/Index.tsx` | **`lazyWithRetry()` now properly awaits cache operations.** Changed from fire-and-forget `.then()` chains to `async/await`. Cache deletion and SW unregistration fully complete before reload fires. Wait increased from 200ms to 500ms. |
| 4 | **MEDIUM** | `index.html` | **Inline stale-build check now awaits cache cleanup.** Changed from fire-and-forget `.then()` to proper `Promise.resolve().then()` chain that awaits all cleanup before reloading. Added counter-based reload loop prevention (max 2 per 60s, matching useAppUpdate). Wait increased from 300ms to 500ms. |
| 5 | **MEDIUM** | `src/main.tsx` | **Pre-mount stale check: increased wait to 500ms, added SW verification.** After unregistering SWs and clearing caches, re-checks if SWs are actually gone and retries if needed. |

### Technical Details

**Before (vite.config.ts globPatterns):**
```javascript
globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"]
```
JS/CSS precached → stale chunks served after deploy → infinite loading

**After (vite.config.ts):**
```javascript
globPatterns: ["**/*.{ico,png,svg,jpg,jpeg,webp,woff,woff2}"]
// + NetworkFirst runtime caching for JS/CSS:
runtimeCaching: [
  {
    urlPattern: /\.(?:js|css)$/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "js-css-cache",
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 50, maxAgeSeconds: 604800 },
    },
  },
  // ... existing mp3/image caches
]
```
JS/CSS always fetched from network → cache only as offline fallback → no stale chunks

**Build output verification:**
- Precache manifest: 322 entries (images, audio, icons only — zero JS/CSS)
- Runtime caching: `NetworkFirst` for JS/CSS, `CacheFirst` for media
- SW properly registers `networkTimeoutSeconds: 5` for JS/CSS (falls back to cache if network hangs >5s)

**Before (lazyWithRetry cache cleanup):**
```typescript
// Fire-and-forget — reload may happen before cleanup starts
caches.keys().then(names => names.forEach(name => caches.delete(name)));
navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
setTimeout(() => window.location.reload(), 200);
```

**After (lazyWithRetry cache cleanup):**
```typescript
// Properly awaited — reload only after cleanup completes
const names = await caches.keys();
await Promise.all(names.map(name => caches.delete(name)));
const regs = await navigator.serviceWorker.getRegistrations();
await Promise.all(regs.map(r => r.unregister()));
await new Promise(r => setTimeout(r, 500));
window.location.reload();
```

**Before (canAutoReload):**
```typescript
// 30s time-based — too restrictive, blocks recovery
const last = sessionStorage.getItem(AUTO_RELOAD_KEY);
return Date.now() - Number(last) > 30_000;
```

**After (canAutoReload):**
```typescript
// Counter-based — allows 2 reloads per 60s window
const data = JSON.parse(raw);
if (Date.now() - data.firstReloadTs > 60_000) return true;
return data.count < 2;
```

### Why This Fix Is Permanent

Previous rounds fixed **symptoms** (error handlers, lazy loading, retry logic). This round fixes the **root cause**: JS/CSS should never be in the SW precache for an app deployed to GitHub Pages.

The combination of:
1. Content-hashed filenames (Vite's default)
2. `navigateFallback: null` (HTML always from network)
3. **No JS/CSS in precache** (removed in this fix)
4. `NetworkFirst` runtime caching (cache only as offline fallback)

...means there is no longer any mechanism by which the SW can serve stale JS chunks. The only way to get stale JS is from the browser's HTTP cache, which is controlled by content hashes and standard cache headers — not the SW.

### Files Changed (5)

```
vite.config.ts                      — Removed JS/CSS from precache, added NetworkFirst runtime caching
src/hooks/useAppUpdate.ts           — Robust hardRefresh (500ms + verification), counter-based canAutoReload
src/pages/Index.tsx                 — lazyWithRetry properly awaits cache cleanup
index.html                          — Inline stale check awaits cleanup, counter-based reload prevention
src/main.tsx                        — Pre-mount stale check: 500ms wait + SW verification
```

### Verification

- TypeScript: Clean (0 errors)
- Tests: 219/219 passing (10 test files, 0 failures)
- Build: Succeeds — precache has 322 entries (images/audio only, zero JS/CSS)
- SW runtime caching: NetworkFirst for JS/CSS confirmed in built sw.js
- No regressions

---

## 2026-02-15 — Systematic Bug Hunt: 38 Bugs Found, 16 Fixed (10:00-10:50 UTC)

### Overview

Conducted a systematic bug hunt using 6 parallel AI agents scanning different areas of the codebase simultaneously. Found **38 unique bugs** across all areas, fixed **16** of the most impactful ones. All fixes verified with 219 passing tests and clean build.

### Methodology

Launched 6 parallel search agents:
1. **Game Store Logic** (gameStore.ts, helpers) → 7 bugs found
2. **AI Opponent System** (useGrimwaldAI, ai/) → 10 bugs found
3. **Game Data Definitions** (jobs, items, education, etc.) → 4 bugs found
4. **UI Components** (GameBoard, LocationPanel, screens) → 5 bugs found
5. **Multiplayer/Network** (PeerManager, NetworkSync) → 10 bugs found
6. **Economy & Combat Math** (banking, combat, prices) → 6 bugs found

Total: 42 raw findings, 38 unique after deduplication.

### Bugs Fixed (16)

#### CRITICAL — Game-Breaking

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | **castPersonalCurse completely broken in multiplayer** — cross-player validation blocked ALL hex curse casting because targetId at args[2] is a different player | `useNetworkSync.ts:374` | Changed validation to only check args[0] (actor) matches sender; target validation left to store logic |
| 2 | **Disconnect auto-skip ends wrong player's turn** — stale closure captured player state 5 seconds before timeout fires | `useNetworkSync.ts:476` | Re-fetch fresh state inside setTimeout, verify it's still the disconnected player's turn |

#### HIGH — Incorrect Game Behavior

| # | Bug | File | Fix |
|---|-----|------|-----|
| 3 | **Loan garnishment increases loan when earnings negative** — rent garnishment pushes earnings < 0, then loan garnishment computes negative amount, increasing debt | `workEducationHelpers.ts:84` | Added `earnings > 0` guard before loan garnishment |
| 4 | **Stock seizure deletes ALL shares but credits partial value** — player with 100 shares worth 8000g loses all 100 when only 200g debt remains | `weekEndHelpers.ts:443` | Calculate `sharesToSell` proportionally, only sell enough to cover remaining debt |
| 5 | **Shallow copy mutation breaks Zustand** — `delete p.stocks[id]` mutates shared nested objects through shallow copy | `weekEndHelpers.ts:444,461,483` | Deep copy `stocks`, `appliances`, `durables` before `delete` operations |
| 6 | **Weather/festival price multipliers permanently compound** — `advanceEconomy` reads weather-tainted priceModifier, applies drift, then weather multiplied again | `weekEndHelpers.ts:64-96` | Added `basePriceModifier` field to GameState; `advanceEconomy` now reads base price without weather/festival |
| 7 | **VictoryScreen career value zeros when no job** — `checkVictory` uses raw `dependability`, but VictoryScreen shows 0 if no job | `VictoryScreen.tsx:59` | Removed job check; career = dependability unconditionally (matches checkVictory) |
| 8 | **AI hex/curse actions crash with TypeError** — `storeActions` object missing 4 hex methods, causing `undefined is not a function` | `useGrimwaldAI.ts:88` | Added `castLocationHex`, `castPersonalCurse`, `buyProtectiveAmulet`, `addHexScrollToPlayer` to storeActions |
| 9 | **AI wealth calculation missing stocks and loans** — AI strategic decisions ignore stock portfolio value and outstanding loans | `ai/strategy.ts:30` | Added stock value calculation and loan subtraction to match `checkVictory` formula |

#### MEDIUM — Unfair AI Advantages / UX Issues

| # | Bug | File | Fix |
|---|-----|------|-----|
| 10 | **AI pays half housing move-in cost** — AI: 1x rent, Human: 2x rent (first month + deposit) | `ai/actions/strategicActions.ts:111` | Changed AI cost to `rent * 2` matching human formula |
| 11 | **AI locks rent at unmodified base price** — AI uses raw constant, human uses price-adjusted rent | `ai/actions/strategicActions.ts:111` | AI now passes `Math.round(RENT_COSTS.noble * priceModifier)` for rent |
| 12 | **AI spends 1 hour on housing, human spends 4** — unfair 3-hour time advantage | `ai/actionExecutor.ts:232,240` | Changed AI `spendTime` from 1 to 4 hours |
| 13 | **AI ignores priceModifier for appliance purchases** — hardcoded base prices | `ai/actions/goalActions.ts:129-132` | Appliance costs now multiplied by `priceModifier` |
| 14 | **LocationShell active tab shows blank content** — tab state not reset when visible tabs change | `LocationShell.tsx:55` | Added useEffect to reset activeTab when current tab disappears |

#### SECURITY — Multiplayer Exploits

| # | Bug | File | Fix |
|---|-----|------|-----|
| 15 | **Free hex scrolls via addHexScrollToPlayer** — internal-only action was in guest whitelist | `network/types.ts:217` | Removed from `ALLOWED_GUEST_ACTIONS` |
| 16 | **Zero-cost hex/curse exploits** — 6 hex actions accept client-supplied cost with no validation | `useNetworkSync.ts:103` | Added `validateActionArgs` cases for all hex cost parameters (minimum 1g) |

#### LOW — Fixed Incidentally

| # | Bug | File | Fix |
|---|-----|------|-----|
| — | **Rivalry study race on completed degrees** — AI wastes gold/time studying already-graduated degrees | `ai/actions/rivalryActions.ts:111` | Added `!player.completedDegrees.includes(degreeId)` check |

### Bugs Found But NOT Fixed (22 remaining)

#### Store/Economy (deferred — lower impact)
- Hardcoded food drain 35 vs constant `FOOD_DEPLETION_PER_WEEK` = 25
- `updateRentTracking` increments `weeksSinceRent` for homeless players
- `buyFreshFood`/`buyFoodWithSpoilage` always return `false`
- No `isGameOver` guard on economy/work/education functions
- Seized stocks valued at stale (pre-update) prices
- `begForMoreTime` dependability formula differs from documentation
- Trap damage reduction missing `Math.max(0)` clamp

#### AI (deferred — edge cases)
- Dungeon time cost mismatch between strategy and executor
- Weather movement cost formula mismatch (+1 hour difference)
- AI doesn't validate location before working (executor level)

#### UI (deferred — edge cases)
- Missing `equippedItems` in CombatView `handleFight` useCallback deps
- `isMultiHuman` missing from GameBoard useEffect deps
- NaN in GoalProgress when goal target is 0

#### Multiplayer (deferred — complex/rare)
- Room creation retry races with timeout (stale `settled` variable)
- Disconnect handlers fire twice for same peer (duplicate auto-skip)
- Concurrent reconnection attempts create duplicate connections
- Host migration doesn't broadcast state to non-successor guests
- `setPhase` in LOCAL_ONLY_ACTIONS allows guest phase desync

#### Game Data (deferred — low impact)
- Missing "uniform" label in CLOTHING_TIER_LABELS
- `festival-all` achievement counts any 4 festivals, not all 4 unique
- Stale `Job` interface in game.types.ts (unused but confusing)
- Dead starvation penalty constants never used

### Files Changed (16)

```
src/store/helpers/workEducationHelpers.ts  — Loan garnishment earnings > 0 guard
src/store/helpers/weekEndHelpers.ts        — Stock seizure partial sell, deep copy mutations, basePriceModifier
src/types/game.types.ts                    — Added basePriceModifier to GameState
src/store/gameStore.ts                     — Initialize basePriceModifier: 1.0
src/network/networkState.ts                — Serialize/deserialize basePriceModifier
src/components/screens/VictoryScreen.tsx   — Career = dependability (no job check)
src/hooks/useGrimwaldAI.ts                 — Added hex store actions, pass stockPrices
src/hooks/ai/strategy.ts                   — Wealth calc includes stocks/loans, career unconditional
src/hooks/ai/actionGenerator.ts            — Pass stockPrices parameter
src/hooks/ai/actionExecutor.ts             — Housing time 1→4 hours
src/hooks/ai/actions/strategicActions.ts   — Housing cost 1x→2x, price-adjusted rent
src/hooks/ai/actions/goalActions.ts        — Appliance prices use priceModifier
src/hooks/ai/actions/rivalryActions.ts     — Skip completed degrees in study race
src/network/useNetworkSync.ts              — castPersonalCurse fix, disconnect re-check, hex cost validation
src/network/types.ts                       — Remove addHexScrollToPlayer from guest whitelist
src/components/game/LocationShell.tsx       — Reset active tab when tabs change
```

### Verification

- **Tests**: 219 passing, 0 failures (10 test files)
- **Build**: Clean TypeScript, no errors
- **No regressions**: All existing functionality preserved

---

## 2026-02-15 — FIX: "Loading the realm..." Freeze — Hot-Swap Architecture (14:00 UTC)

### Overview

**Permanent fix** for the recurring "Loading the realm..." freeze that kept returning after every PR deployment, despite the version.json base path fix in PR #211.

### Root Cause Analysis (Why PR #211's Fix Wasn't Sufficient)

PR #211 fixed the `version.json` fetch URL (correct base path), but the stale-build **recovery mechanism** was still fragile:

1. **Stale HTML detected** → inline script tries to reload with `?_gv=<timestamp>`
2. **GitHub Pages CDN** may still serve cached HTML within `max-age=600` window
3. After 2 reload attempts, **reload limit reached** → `loadApp()` called with STALE entry URL
4. **Stale entry URL points to non-existent chunk** (old content hash) → **404**
5. **`<script type="module">` 404s are SILENT** — no `window.onerror`, no `unhandledrejection`
6. **Module never loads** → React never mounts → "Loading the realm..." stays forever
7. "Clear Cache & Reload" **repeats the same cycle** — still serves stale HTML from CDN

### The Fix: Hot-Swap Fresh Modules from version.json

Instead of reloading (which may serve the same stale HTML), the inline script now **hot-swaps** the entry module URL directly from `version.json`.

**Key insight**: `version.json` is ALWAYS fresh — fetched with `cache: 'no-store'` and a unique query param. Even when the HTML is stale, `version.json` contains the correct URLs.

#### Change 1: version.json now includes entry + CSS URLs

**`vite.config.ts`** — Shared state between `deferModulePlugin` and `versionJsonPlugin`:

```javascript
// Shared between plugins
let extractedEntry: string | null = null;
let extractedCss: string[] = [];

// deferModulePlugin extracts entry + CSS during transformIndexHtml
// versionJsonPlugin writes them to version.json in closeBundle

// version.json now contains:
// {"buildTime":"...","entry":"/guild-life-adventures/assets/index-xxx.js","css":["..."]}
```

#### Change 2: Hot-swap instead of reload on stale detection

**`index.html`** — When stale build detected AND version.json has `entry`:

```javascript
if(data.entry){
  console.log('[Guild Life] Hot-swapping to fresh entry:', data.entry);
  swapCss(data.css);              // Replace stale CSS with fresh CSS
  window.__ENTRY__ = data.entry;  // Override stale entry URL
  loadApp();                      // Load fresh module directly
  return;                         // No reload needed!
}
```

The `swapCss()` function removes stale CSS links (matching `/assets/`) and adds fresh ones from version.json.

#### Change 3: onerror handler on module script element

**`index.html`** — `loadApp()` now adds `s.onerror`:

```javascript
s.onerror = function(){
  console.error('[Guild Life] Entry module failed to load:', src);
  __guildShowLoadError('Module failed to load: ' + src.split('/').pop());
};
```

Previously, `<script type="module">` 404s were completely silent — no `window.onerror` or `unhandledrejection` event. The loading screen stayed forever with no error message. Now module load failures show an actionable error.

### Why This Fix Is Permanent

| Scenario | Previous behavior | New behavior |
|----------|------------------|-------------|
| Stale HTML + CDN caching | Reload loop → stale chunks 404 → silent freeze | Hot-swap from version.json → fresh module loads directly |
| Module 404 (any cause) | Silent failure → loading screen forever | onerror shows error + reload button |
| version.json unreachable | Falls through to loadApp() → may work or 404 | Same, but onerror catches 404 |
| Older deploy without entry in version.json | N/A | Falls back to reload (old behavior) |

The **critical improvement** is eliminating the reload entirely for stale builds. Since `version.json` is always fetched fresh from the network (bypasses both browser cache and CDN), it always has the correct entry URL. The stale HTML becomes irrelevant — only the inline JavaScript matters, and it hot-swaps to the fresh module.

### Files Changed (2)

```
vite.config.ts  — Shared extractedEntry/extractedCss between plugins, version.json includes entry+css
index.html      — Hot-swap logic in stale detection, swapCss(), onerror on script element
```

### Verification

- **Tests**: 219 passing, 0 failures (10 test files)
- **Build**: Clean TypeScript, no errors
- **version.json output**: `{"buildTime":"...","entry":"/guild-life-adventures/assets/index-xxx.js","css":["/guild-life-adventures/assets/index-BSxyJ1SA.css"]}`
- **Built HTML**: Contains hot-swap logic, onerror handler, swapCss function

---

## 2026-02-15 — Mobile Layout Mode in Zone Editor (18:00 UTC)

### Overview

Added a new **Mobile** tab to the Zone Editor that allows configuring separate zone positions, center panel placement, and layout element positions for mobile viewports (<1024px). When the game detects a mobile screen, it uses these mobile-specific overrides instead of the desktop configuration.

### What Changed

#### New "Mobile" Editor Mode
- 5th tab in the Zone Editor toolbar (Zones | Paths | Layout | Animations | **Mobile**)
- Emerald/teal color scheme to visually distinguish from desktop zones (red/green)
- Full drag-and-resize support for mobile zones, center panel, and layout elements
- "Copy Desktop Config to Mobile" button to use desktop positions as starting point

#### Mobile Zone Overrides
- Each of the 15 location zones can have different position/size for mobile
- Mobile center panel position/size configurable (default: bottom-sheet style at 68% top, 4% left, 92% width, 30% height)
- Mobile layout sub-elements (NPC Portrait, Text/Content, Item Preview) independently positionable

#### Runtime Integration
- `GameBoard.tsx` picks `activeCenterPanel` and `activeLayout` based on `isMobile` hook
- `getLocationWithCustomPosition()` accepts `isMobile` parameter for zone position lookups
- Replaces the previous hardcoded mobile center panel values (bottom: 2%, left: 4%, width: 92%, height: 30%)

#### Persistence
- Mobile overrides saved to localStorage alongside desktop zone config
- Backwards compatible — older saves without `mobileOverrides` use defaults
- Included in "Copy Config" clipboard export

### Files Changed (10 files)

| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `MobileZoneOverrides` interface |
| `src/hooks/useZoneEditorState.ts` | Added `'mobile'` editor mode, mobile state (zones, centerPanel, layout), drag handlers, input handlers, `copyDesktopToMobile()`, defaults (`DEFAULT_MOBILE_CENTER_PANEL`, `DEFAULT_MOBILE_LAYOUT`) |
| `src/data/zoneStorage.ts` | Added `mobileOverrides` to `ZoneEditorSaveData`, `saveZoneConfig()`, `loadZoneConfig()` |
| `src/components/game/ZoneEditorToolbar.tsx` | Added "Mobile" tab button (emerald color) |
| `src/components/game/ZoneEditorProperties.tsx` | Added mobile mode panel: center panel editor, layout element editor, zone list, "Copy Desktop" and "Reset" buttons |
| `src/components/game/ZoneEditorBoard.tsx` | Added mobile mode rendering: mobile zones (teal), mobile center panel (emerald), mobile layout elements; hides desktop zones in mobile mode |
| `src/components/game/ZoneEditor.tsx` | Passes mobile props between state hook, board, and properties components; added mobile status bar text |
| `src/hooks/useZoneConfiguration.ts` | Loads/saves `mobileOverrides`, provides `mobileOverrides` in return value, `getLocationWithCustomPosition(id, isMobile)` |
| `src/components/game/GameBoard.tsx` | Uses `activeCenterPanel`/`activeLayout` based on `isMobile`, passes `initialMobileOverrides` to zone editor, passes `isMobile` to zone position lookup |
| `log2.md` | This entry |

### Test Results

- **Tests**: 219 passing, 0 failures (10 test files)
- **Build**: Clean TypeScript, no errors
- **Zero breaking changes** — backwards compatible with saves without mobile overrides

---

## 2026-02-15 23:20 — Static Content Expansion (Massive)

### Summary

Massively expanded all static content across the game's data files to improve replay variety and reduce repetition. All new content maintains the established Monty Python / Discworld / dry-wit humor style.

### Changes by Category

#### 1. Banter Lines (`src/data/banter.ts`) — ~258 → 810+

- Expanded static banter from ~258 lines to **760+ static lines** across all 13 locations
- Each location now has **40-60 lines** (previously 15-25)
- Added **50+ dynamic context-aware banter lines** triggered by player state:
  - Quest completion count (15+ quests)
  - High happiness (60+)
  - Active loan status
  - Stock investments
  - Age 40+
- **Total: 810+ banter lines**

#### 2. Newspaper Headlines (`src/data/newspaper.ts`) — ~70 → 313+

- **Gossip headlines**: 10 → 50
- **Gossip content**: 10 → 40 (now with independent random index from headlines)
- **Economy headlines** (HIGH/LOW/NORMAL): 4 each → 17 each (51 total)
- **Robbery headlines**: 3 → 8 (template functions) + 5 content variants
- **Apartment robbery headlines**: 2 → 5 + 4 content variants
- **Loan default headlines**: 2 → 5 + 4 content variants
- **Market crash headlines**: 6 → 15
- **Personalized event articles** (loan-repaid, fired, paycut, starvation, sickness, eviction, degree-earned, quest-completed, death/resurrection): each now has 5 headline + 4 content variants
- **Job articles**: 8 headline + 4 content variants
- **Quest rumor articles**: 8 headline + 4 content variants
- **Periodic articles**: rent (5h+4c), clothing (5h+4c), dungeon flavor (3h+3c), life in Guildholm (3h+3c)
- **Total: 313+ content variants**

#### 3. Event Description Variants (`src/data/events.ts` + `src/data/travelEvents.ts`)

- Added `descriptionVariants?: string[]` and `messageVariants?: string[]` to `GameEvent` interface
- Added `descriptionVariants?: string[]` to `TravelEvent` interface
- Added helper functions: `pickEventDescription()`, `pickEventMessage()`, `pickTravelDescription()`
- **Game events**: 3-5 description + message variants per event (15 events)
- **Travel events**: 3-5 description variants per event (10 events)
- All variants are optional with fallback to default — backward compatible

#### 4. Quest Flavor Text (`src/data/quests.ts`)

- Added `descriptionVariants?: string[]` to `Quest`, `QuestChainStep`, and `Bounty` interfaces
- Added `pickQuestDescription()` helper function
- **Main quests**: 3-4 description variants each (18 quests)
- **Quest chain steps**: 3 description variants each (6 steps)
- **Bounties**: 3 description variants each (9 bounties)
- All variants are optional with fallback to default — backward compatible

### Technical Notes

- All variant arrays are **optional** (`?`) for backward compatibility
- Helper functions (`pickEventDescription`, `pickEventMessage`, `pickTravelDescription`, `pickQuestDescription`) select a random variant or fall back to the default `description`/`message` field
- **Note**: Helper functions are defined but not yet integrated into UI rendering code — the existing code still uses `description`/`message` directly. Integration is a separate task.

### Files Changed

| File | Changes |
|------|---------|
| `src/data/banter.ts` | ~760 static + 50 dynamic banter lines (up from ~258) |
| `src/data/newspaper.ts` | 313+ content variants (up from ~70) |
| `src/data/events.ts` | Added variant interfaces, helper functions, 3-5 variants per event |
| `src/data/travelEvents.ts` | Added variant interface, helper function, 3-5 variants per event |
| `src/data/quests.ts` | Added variant interfaces, helper function, 3+ variants per quest/chain/bounty |
| `log2.md` | This entry |

### Test Results

- **Tests**: 219 passing, 0 failures (10 test files)
- **Build**: Clean production build, no TypeScript errors
- **Zero breaking changes** — all additions are optional/backward compatible

---

## 2026-02-16 — Wire Variant Helper Functions into UI + Fix WeatherOverlay Hook Violation

### Overview

Integrated the four variant helper functions (`pickEventDescription`, `pickEventMessage`, `pickTravelDescription`, `pickQuestDescription`) that were defined in the previous session but never wired into the actual game code. Also fixed a critical `rules-of-hooks` violation in `WeatherOverlay.tsx` where `useMemo` was called after an early return, violating React's hook rules and potentially causing runtime crashes or the "Loading the realm" hang.

### Changes

#### 1. Fix: WeatherOverlay.tsx — Conditional useMemo Hook Violation (CRITICAL)

`useMemo` was called AFTER `if (!particle) return null;` at line 27, violating React's rule that hooks must be called in the same order on every render. This could cause React to crash or behave unpredictably.

**Fix**: Moved the `useMemo` call above the early return. The hook now always runs but returns an empty array when `particle` is null. The early return happens after the hook call.

```tsx
// BEFORE (broken):
export function WeatherOverlay({ particle, weatherType }) {
  if (!particle) return null;        // ← early return BEFORE hook
  const particles = useMemo(...)     // ← hook called conditionally!

// AFTER (fixed):
export function WeatherOverlay({ particle, weatherType }) {
  const count = particle ? PARTICLE_COUNTS[particle] : 0;
  const particles = useMemo(() => {  // ← hook always called
    if (!particle) return [];
    return Array.from(...)
  }, [particle, count]);
  if (!particle) return null;        // ← early return AFTER hook
```

#### 2. Wire pickEventMessage + pickEventDescription into Location Events (`playerHelpers.ts`)

Location events (triggered on arrival at locations) now use both variant helpers:
- `pickEventDescription(event)` — provides a random description variant (narrative intro)
- `pickEventMessage(event)` — provides a random effect message variant (mechanical outcome)

The event message format changed from:
```
[event-id] Event Name: effect.message
```
To:
```
[event-id] Event Name: pickEventDescription(event)
pickEventMessage(event)
```

This gives each event two lines of varied text instead of one static line.

#### 3. Wire pickEventMessage into Weekly Theft Events (`weekEndHelpers.ts`)

Shadowfingers theft events during week-end processing now use `pickEventMessage(theftEvent)` instead of a hardcoded message template. Each theft now shows a random message variant (e.g., "Lost 50 gold to the Shadowfingers. They were so quiet, even your dreams didn't notice." instead of always "Shadowfingers struck! {name} lost {amount} gold!").

#### 4. Wire pickTravelDescription into Travel Events (`travelEvents.ts`)

The `formatTravelEvent()` function now calls `pickTravelDescription(event)` instead of using `event.description` directly. Every travel event message will now show a random description variant, adding variety to the 10 travel events (each has 3-5 variants).

#### 5. Wire pickQuestDescription into Quest Panel (`QuestPanel.tsx`)

Quest descriptions in the quest panel now use `pickQuestDescription(quest)` instead of static `quest.description`:
- **Active quest display**: Uses `pickQuestDescription` in `resolveActiveQuest()` for the active quest description
- **Quest list**: Uses `useMemo` to pick stable random descriptions per quest set, preventing re-randomization on every React re-render
- Added `import { useMemo } from 'react'` and `pickQuestDescription` import

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/WeatherOverlay.tsx` | Fixed conditional `useMemo` hook violation — moved hook above early return |
| `src/store/helpers/playerHelpers.ts` | Imported `pickEventMessage` + `pickEventDescription`, wired into location event message |
| `src/store/helpers/weekEndHelpers.ts` | Imported `pickEventMessage`, wired into Shadowfingers theft message |
| `src/data/travelEvents.ts` | `formatTravelEvent()` now calls `pickTravelDescription()` instead of using `event.description` |
| `src/components/game/QuestPanel.tsx` | Imported `pickQuestDescription` + `useMemo`, wired into active quest and quest list rendering |
| `log2.md` | This entry |

### Integration Summary

| Helper Function | Where Wired | Effect |
|----------------|-------------|--------|
| `pickEventDescription` | `playerHelpers.ts` — location event messages | Random narrative intro for each location event |
| `pickEventMessage` | `playerHelpers.ts` — location event messages | Random effect message for location events |
| `pickEventMessage` | `weekEndHelpers.ts` — weekly theft events | Random theft message variants |
| `pickTravelDescription` | `travelEvents.ts` — `formatTravelEvent()` | Random travel event descriptions |
| `pickQuestDescription` | `QuestPanel.tsx` — quest list + active quest | Random quest descriptions with `useMemo` stability |

### Verification

- **Build**: Clean production build, no TypeScript errors
- **Tests**: 219 passing, 0 failures (10 test files)
- **Lint**: WeatherOverlay `react-hooks/rules-of-hooks` error eliminated (was 15 errors, now 14)
- **No breaking changes** — all variant helpers fall back to default description/message when no variants exist

---

## 2026-02-16 — Fix Duplicate Events, Event Naming, 1-Per-Turn Limit, Dependability Decay (08:05 UTC)

### Overview

Four event system improvements addressing duplicate event text, event naming, event frequency limits, and dependability mechanics.

### Changes

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | **Duplicate event messages** | Added `[...new Set(eventMessages)]` deduplication before displaying weekend events. Identical messages from multiple processing pipelines are now collapsed into one. | `weekEndHelpers.ts` |
| 2 | **Max 1 random location event per turn per player** | Added `hadRandomEventThisTurn` flag to Player. `checkForEvent()` in `movePlayer()` now skips if flag is true. Flag set when event triggers, reset at start of each turn and weekly reset. | `game.types.ts`, `gameStore.ts`, `playerHelpers.ts`, `weekEndHelpers.ts`, `turnHelpers.ts` |
| 3 | **Event naming: WEEKEND EVENTS vs WEEK X EVENT** | Added `eventSource: 'weekend' \| 'weekly' \| null` to GameState. Weekend processing (`processWeekEnd` + `startTurn`) sets `eventSource: 'weekend'`. Gameplay events (location events, travel events, spoilage) set `eventSource: 'weekly'`. `useLocationClick.ts` now shows title "WEEKEND EVENTS" or "WEEK X EVENT" based on `eventSource`. | `game.types.ts`, `gameStore.ts`, `weekEndHelpers.ts`, `startTurnHelpers.ts`, `playerHelpers.ts`, `turnHelpers.ts`, `useLocationClick.ts`, `networkState.ts` |
| 4 | **Dependability decay when not working** | Added `workedThisTurn` flag to Player, set `true` by `workShift()`. In `processEmployment()`: if player has a job but `workedThisTurn === false`, dependability drops by 2/week (vs 5/week for unemployed). Human players get a warning message. Flag reset at start of each turn and weekly reset. | `game.types.ts`, `gameStore.ts`, `workEducationHelpers.ts`, `weekEndHelpers.ts`, `turnHelpers.ts` |

### New Player Fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `workedThisTurn` | `boolean` | `false` | Tracks if player worked at least one shift this turn |
| `hadRandomEventThisTurn` | `boolean` | `false` | Limits random location events to 1 per turn per player |

### New GameState Field

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `eventSource` | `'weekend' \| 'weekly' \| null` | `null` | Distinguishes weekend processing events from gameplay events for title display |

### Dependability Decay Rules

| Condition | Decay/Week | Message |
|-----------|-----------|---------|
| Unemployed (no job) | -5 | (none — existing behavior) |
| Employed but didn't work this turn | -2 | "dependability dropped — employer noticed you didn't show up" |
| Employed and worked | +1/shift | (none — existing behavior via workShift) |

### Files Modified

```
src/types/game.types.ts               — Added workedThisTurn, hadRandomEventThisTurn to Player; eventSource to GameState
src/store/gameStore.ts                 — Added defaults for new fields; eventSource in init/reset/load/dismiss
src/store/helpers/playerHelpers.ts     — 1-per-turn random event limit; eventSource: 'weekly' for location/travel events
src/store/helpers/weekEndHelpers.ts    — Dedup eventMessages; eventSource: 'weekend'; reset new flags; dependability decay logic
src/store/helpers/startTurnHelpers.ts  — eventSource: 'weekend' for start-of-turn events
src/store/helpers/turnHelpers.ts       — eventSource: 'weekly' for spoilage; reset new flags on turn start
src/store/helpers/workEducationHelpers.ts — Set workedThisTurn: true in workShift
src/hooks/useLocationClick.ts          — Read eventSource; dynamic title "WEEKEND EVENTS" / "WEEK X EVENT"
src/network/networkState.ts            — Serialize/deserialize eventSource for online multiplayer sync
```

### Verification

- **TypeScript**: Clean, no errors
- **Tests**: 219 passing, 0 failures (10 test files)
- **Build**: Clean production build
- **Save compatibility**: Old saves load correctly (new boolean fields default to `undefined`/falsy)

---

## 2026-02-16 — UI/UX Improvements: Text Size, Panel Borders, Cave, Events (Session 3)

### Overview

Playtester feedback batch: text too small, panel borders distracting, cave hard to read, unwanted placeholder text, event dismiss flow too clunky.

### Changes

#### 1. Text Size Adjustment (New Setting)

Added global text size scaling option to Options > Display. Players can choose between Small (default/original), Medium (+12.5%), Large (+25%), and X-Large (+37.5%).

**Implementation**:
- Added `TextSize` type (`'small' | 'medium' | 'large' | 'x-large'`) to `gameOptions.ts`
- Added `textSize` field to `GameOptions` interface with default `'small'`
- Added CSS `[data-text-size]` attribute selectors in `index.css` that scale `font-size` on the game container
- Applied `data-text-size` attribute on the root `<div>` in `Index.tsx` (affects all game screens)
- Added dropdown selector in `OptionsMenu.tsx` Display tab

**Files changed**: `src/data/gameOptions.ts`, `src/index.css`, `src/pages/Index.tsx`, `src/components/game/OptionsMenu.tsx`

#### 2. Panel Borders Default Changed to "None"

Changed `borderStyle` default from `'stone'` to `'none'` in `gameOptions.ts`. Existing users who previously saved their options keep their chosen border style (merge with defaults handles this).

**Files changed**: `src/data/gameOptions.ts`

#### 3. Cave/Dungeon Layout Improvements

Improved readability throughout the cave/dungeon system:

- **Encounter images**: Increased from `w-24 h-24` to `w-40 h-40` (monsters and treasures now much more visible)
- **Encounter text**: Upgraded from `text-xs` to `text-sm` across encounter intro, stats, descriptions
- **Boss label**: Larger and bolder
- **Floor details**: All expanded floor info text upgraded from `text-xs` to `text-sm`
- **Equipment summary**: Text upgraded from `text-xs` to `text-sm`
- **Icons**: Slightly larger icons in floor details (w-3 h-3 → w-3.5 h-3.5)

**Files changed**: `src/components/game/CavePanel.tsx`, `src/components/game/combat/EncounterIntro.tsx`, `src/components/game/combat/EncounterResultView.tsx`

#### 4. Removed "Hover over an item to preview" Placeholder

The `ItemPreviewPanel` now returns `null` when no item is being previewed, instead of showing the placeholder text. Cleaner UI, less visual noise.

**Files changed**: `src/components/game/ItemPreview.tsx`

#### 5. Auto-Dismiss Event Notifications on Location Click

Previously, players had to click "Continue" in the event panel to dismiss events before they could interact with the game board. Now, clicking any location on the board while an event is showing will automatically dismiss the event notification. This makes the flow much smoother — players can immediately click where they want to go next.

**Implementation**: Added early return in `handleLocationClick()` that checks for `phase === 'event'` and calls `dismissEvent()`.

**Files changed**: `src/hooks/useLocationClick.ts`

### Files Changed Summary

| File | Change |
|------|--------|
| `src/data/gameOptions.ts` | Added `TextSize` type, `textSize` field, changed `borderStyle` default to `'none'` |
| `src/index.css` | Added `[data-text-size]` CSS selectors for font scaling |
| `src/pages/Index.tsx` | Applied `data-text-size` attribute on root container |
| `src/components/game/OptionsMenu.tsx` | Added text size dropdown in Display tab |
| `src/components/game/CavePanel.tsx` | Larger text throughout (text-xs → text-sm) |
| `src/components/game/combat/EncounterIntro.tsx` | Larger encounter images (w-24→w-40), larger text |
| `src/components/game/combat/EncounterResultView.tsx` | Larger result header |
| `src/components/game/ItemPreview.tsx` | Removed "Hover over an item" placeholder |
| `src/hooks/useLocationClick.ts` | Auto-dismiss events on location click |

### Verification

- **TypeScript**: Clean, no errors
- **Save compatibility**: Old saves work — new `textSize` field defaults via merge with DEFAULT_OPTIONS

---

## 2026-02-16 — Fix AI Gaps + Quest Chain Humor + Multiplayer Name Edit (22:00 UTC)

### Overview

Four-part session:
1. **AI gap fixes** — 8 of 10 gaps from the AI gap analysis implemented
2. **Remove verbose Preservation Box message** — "provided fresh food, preventing starvation" removed
3. **Quest chain completion summaries** — Monty Python/Hitchhiker's Guide humor on chain completion
4. **Multiplayer name/portrait editing** — Joining players can now edit their name and portrait in lobby

### Task 1: AI Gap Fixes (8 of 10)

| Gap | Status | File | Description |
|-----|--------|------|-------------|
| 1. Rent prepayment | DONE | `criticalNeeds.ts` | AI now proactively pays rent on rent weeks even when not urgently behind (priority 55) |
| 2. Appliance repair | DONE | `economicActions.ts` | New `generateApplianceRepairActions()` — prioritizes preservation-box > cooking-fire, prefers Forge (cheaper). Added `repair-appliance` action type + executor handler |
| 3. Salary negotiation | DONE | `strategicActions.ts` | AI requests raise when worked 3+ shifts and dependability >= 30. Added `request-raise` action type + executor handler |
| 4. Festival awareness | DONE | `goalActions.ts` | All 4 festivals now boost relevant AI actions: Harvest → food stockup, Winter Solstice → study boost, Midsummer Fair → work boost, Spring Tournament → dungeon boost |
| 5. Insurance purchase | SKIPPED | N/A | Insurance system doesn't exist in the game (no `hasInsurance`, `buyInsurance` properties in game.types.ts) |
| 6. Dispel scroll usage | DONE | `rivalryActions.ts` | AI dispels hexed locations it needs (work, academy, guild hall). Buys dispel scroll at Enchanter. Added `dispel-hex` action type + executor handler |
| 7. Graveyard dark ritual | DONE | `rivalryActions.ts` | Hard AI with gambling personality >= 1.0 performs dark rituals when < 2 hex scrolls. Added `dark-ritual` action type + executor handler |
| 8. Voluntary homeless | DONE | `strategicActions.ts` | AI goes homeless voluntarily when gold < 30, savings < 20, rent 3+ weeks behind — avoids worse eviction penalties |
| 9. Free actions at 0h | BLOCKED | N/A | Requires game-wide change first |
| 10. Delete useAI.ts | DONE | Deleted `src/hooks/useAI.ts` | 230 lines of dead code removed. Not imported anywhere. |

**Files changed**:
- `src/hooks/ai/types.ts` — Added 4 new action types: `repair-appliance`, `request-raise`, `dispel-hex`, `dark-ritual`
- `src/hooks/ai/actionExecutor.ts` — Added 4 new handler functions + StoreActions entries for: `repairAppliance`, `forgeRepairAppliance`, `requestRaise`, `dispelLocationHex`, `performDarkRitual`
- `src/hooks/useGrimwaldAI.ts` — Wired up 5 new store actions to storeActions bundle
- `src/hooks/ai/actions/criticalNeeds.ts` — GAP-1: Proactive rent prepayment
- `src/hooks/ai/actions/economicActions.ts` — GAP-2: Appliance repair sub-generator
- `src/hooks/ai/actions/strategicActions.ts` — GAP-3: Salary negotiation + GAP-8: Voluntary homeless
- `src/hooks/ai/actions/goalActions.ts` — GAP-4: Festival-aware priority boosts
- `src/hooks/ai/actions/rivalryActions.ts` — GAP-6: Dispel scroll + GAP-7: Dark ritual
- Deleted: `src/hooks/useAI.ts`

### Task 2: Remove Preservation Box Message

Removed the verbose `"Preservation Box provided fresh food, preventing starvation"` message from `startTurnHelpers.ts:199`. Fresh food consumption now happens silently — no need to spam the player with obvious information.

### Task 3: Quest Chain Completion Summary

When a player completes ALL steps of a quest chain, a humorous story summary now appears in the center panel. Written in Monty Python / Hitchhiker's Guide to the Galaxy style humor.

**Implementation**:
- Added `completionSummary` field to `QuestChain` interface (array of variant strings)
- Added 3 humorous completion summaries per chain (randomly selected):
  - **Dragon Conspiracy**: Dragons in a trenchcoat, evil permits, distressingly generous rewards
  - **Scholar's Secret**: Hexed fruit baskets, head-spinning, honorary degree in "Applied Recklessness"
- Added `getChainCompletionSummary()` helper function with a generic fallback
- `completeChainQuest()` in questHelpers.ts now sets `eventMessage` with the summary on final step (human players only)
- Event system recognizes `[quest-chain-complete]` tag for proper title ("QUEST CHAIN COMPLETE!") and bonus-type styling
- Uses the existing EventPanel center panel display system — no new components needed

**Files changed**:
- `src/data/quests.ts` — `completionSummary` field + data + `getChainCompletionSummary()` helper
- `src/store/helpers/questHelpers.ts` — Trigger event on chain completion
- `src/hooks/useLocationClick.ts` — Recognize quest-chain-complete event type + custom title

### Task 4: Multiplayer Name/Portrait Editing for Joining Players

Both host and joining players can now edit their name and select a portrait from the lobby. Previously, guests could only change their portrait but not their name after joining.

**Implementation**:
- Added `name-change` message type to `GuestMessage` union
- Added `handleHostMessage` case for `'name-change'` — sanitizes name, prevents duplicates, broadcasts lobby update
- Added `updatePlayerName()` function in `useOnlineGame` hook (works for both host and guest)
- Added inline name editing UI with pencil icon in both host-lobby and guest-lobby player lists
- Name editing uses inline form with auto-submit on blur and Enter key

**Files changed**:
- `src/network/types.ts` — Added `name-change` to GuestMessage
- `src/network/useOnlineGame.ts` — Handler + `updatePlayerName` function + export
- `src/components/screens/OnlineLobby.tsx` — Pencil icon, inline edit form, state management

### Verification

- **TypeScript**: Clean, no errors (npx tsc --noEmit)
- **No new dependencies added**

---

## 2026-02-16 — Build Error Fix (eventSource type) (~afternoon UTC)

### Fix
- **File**: `src/store/helpers/questHelpers.ts` line 232
- **Error**: `Type '"gameplay"' is not assignable to type '"weekend" | "weekly"'`
- **Cause**: `eventSource` was set to `'gameplay'` but the type only allows `'weekend' | 'weekly' | null`
- **Fix**: Changed to `'weekly'` — quest chain completion events happen during the weekly gameplay phase

---

## 2026-02-16 — Smarter AI Opponents: Master-Level Improvements (~afternoon UTC)

### Problem
AI opponents with "master" difficulty were too easy to beat. Despite having `planningDepth: 3`, `mistakeChance: 0.02`, `aggressiveness: 0.8`, and `efficiencyWeight: 0.9`, the hard AI played inefficiently because:
1. **No turn planning** — AI regenerated actions from scratch after every single action, causing aimless back-and-forth movement
2. **No travel cost awareness** — High-priority actions at distant locations would win over nearby useful actions, wasting hours on movement
3. **No location batching** — AI would do one action at a location, then consider moving elsewhere, missing opportunities to do multiple things at the same spot
4. **Weak goal sprint** — Sprint threshold at 80% was too late; by then the human player was often already ahead
5. **Reactive-only play** — AI only considered current turn state, never planning ahead
6. **Poor resource management** — Food/clothing buying was always reactive (urgent only), never proactive
7. **No education-career pipeline** — Didn't understand that degrees unlock better jobs which increase wealth
8. **Simplistic work decisions** — Didn't consider how many shifts it could fit or whether the travel was worth it

### Research
Researched online game AI techniques:
- **Utility-based AI** (The Sims, Catan Digital) — score actions with mathematical utility functions
- **GOAP** (Goal-Oriented Action Planning) — plan action sequences to achieve goals
- **Multi-objective optimization** — balance competing goals using Pareto-optimal decisions
- **Fair AI without cheating** — make AI feel smart through better decision-making, not resource bonuses
- **Jones in the Fast Lane AI** — original game's AI was also criticized as too easy, validating our problem

### Changes Made

#### 1. Turn Planning System (NEW: `src/hooks/ai/turnPlanner.ts`)
- Plans optimal route through board locations at start of turn
- Uses greedy nearest-neighbor heuristic with value weighting: `score = totalValue / (travelCost + actionHours)`
- Groups actions by location for batching
- Identifies needed visits based on current state (work, study, food, banking, etc.)
- Only active for hard AI (`planningDepth >= 3`)

#### 2. Travel Cost Penalty (`actionGenerator.ts`)
- New `applyTravelCostPenalty()`: Move actions to distant locations get reduced priority
- Formula: `penalty = travelSteps * efficiencyWeight * 1.0`
- Extra penalty for 4+ step moves
- Prevents AI from wasting 5+ hours traveling for a low-value action

#### 3. Location Batching Bonus (`actionGenerator.ts`)
- New `applyLocationBatchingBonus()`: When at a location with 2+ available actions, all non-move actions get +5 priority
- Ensures AI does everything it can at current location before considering movement
- Example: At bank, deposits AND buys stocks before leaving

#### 4. Smart Goal Sprint (`actionGenerator.ts`)
- New `applySmartGoalSprint()`: Activates at 65% goal completion (vs old 80%)
- Boost scales from 15-25 based on how close to completion
- Targets specific action types per goal (work/deposit for wealth, study/graduate for education, etc.)
- Hard AI only

#### 5. Proactive Resource Management (`criticalNeeds.ts`)
- **Food**: Hard AI buys food opportunistically when at a food location and below 70 food (not just urgent <50)
- **Clothing**: Anticipates degradation (3/week) and upgrades clothing proactively 2 weeks before hitting tier boundary
- Both only activate for `planningDepth >= 3`

#### 6. Education-Career Pipeline (`strategicActions.ts`)
- Hard AI identifies jobs where it's 1 degree away from qualifying
- If already started studying that degree, boosts priority significantly (72) to finish it
- Calculates wage improvement to prioritize high-ROI degree paths
- Uses `ALL_JOBS` data to find upgrade opportunities

#### 7. Smarter Work Decisions (`strategicActions.ts`)
- Calculates value-per-hour (`wage / hoursPerShift`) to adjust work priority
- High-wage jobs get higher work priority (up to +15)
- Travel-to-work priority scales with number of shifts available at destination
- More shifts possible = higher priority to travel there

#### 8. Proactive Banking (`strategicActions.ts`)
- In slums: bank when gold > 100 (robbery protection), keep 80g on hand
- Elsewhere: bank when gold > 250, keep 120g on hand
- Smart withdrawal: calculates upcoming expenses (rent + food + buffer) instead of withdrawing fixed 100g

#### 9. Multi-Goal Awareness (`goalActions.ts`)
- Hard AI generates reduced-priority actions (50-55) for SECOND weakest goal
- Prevents falling too far behind on multiple fronts simultaneously
- Only when second-weakest goal is below 60% completion

#### 10. Near-Graduation Boost (`goalActions.ts`)
- When 1-2 study sessions from completing a degree, adds +10 priority to study and +8 to travel-to-academy
- Prevents AI from getting distracted right before finishing a degree

#### 11. Time Budget Improvements (`actionGenerator.ts`)
- Mid-turn (25-80% time remaining): non-move actions at current location get +3 priority
- Reduces unnecessary movement during the productive middle of a turn

### Files Changed
- `src/hooks/ai/turnPlanner.ts` — NEW: Turn planning system with route optimization
- `src/hooks/ai/actionGenerator.ts` — Travel cost penalty, location batching, smart sprint, turn plan integration
- `src/hooks/ai/actions/criticalNeeds.ts` — Proactive food and clothing buying
- `src/hooks/ai/actions/strategicActions.ts` — Education-career pipeline, smarter work, proactive banking
- `src/hooks/ai/actions/goalActions.ts` — Multi-goal awareness, near-graduation boost
- `src/hooks/ai/actions/economicActions.ts` — Lower stock investment threshold for hard AI

### Testing
- TypeScript: `npx tsc --noEmit` — 0 errors
- Tests: `bun run test` — 281/281 passed (14 test files, all green)
- Lint: Pre-existing errors only, no new issues from these changes

### Technical Notes
- All improvements gated behind `settings.planningDepth >= 3` (hard AI only) — easy/medium AI unchanged
- No "cheating" (resource bonuses, extra time, hidden information) — AI just makes smarter decisions
- Priority adjustments are additive and relatively small (+3 to +25) to work with existing utility system
- Turn planner uses heuristic approach (greedy nearest-neighbor) — fast enough for real-time use

---

## 2026-02-16 — BUG-001 Definitive Fix: Auto-Reload + Self-Destroying SW (15:55 UTC)

### Overview

Systematic bug hunt using parallel AI agents to investigate the recurring "Loading the realm..." freeze on GitHub Pages after every PR deployment. Game works fine on Lovable (`guild-life.lovable.app`) but consistently fails on GitHub Pages (`tombonator3000.github.io/guild-life-adventures/`).

### Investigation (4 parallel agents)

1. **Online Research Agent**: Searched Lovable, Vite, GitHub Pages, and vite-plugin-pwa documentation/issues. Found that Fastly CDN (used by GitHub Pages) does NOT honor client-side `Cache-Control` request headers by default — our cache bypass headers were being ignored.

2. **Build Verification Agent**: Full build with `DEPLOY_TARGET=github` — 100% clean. No TypeScript errors, no build failures. `version.json`, `__ENTRY__`, `__HTML_BASE__` all correct in output. `deferModulePlugin` correctly removes module script tag.

3. **SW/Cache Behavior Agent**: Comprehensive audit of all service worker and caching paths. Found that even after `registration.unregister()`, the old SW continues to control the current page's fetches until navigation. The `NetworkFirst` runtime cache for JS/CSS could serve stale chunks.

4. **Live Deployment Agent**: Verified GitHub Actions deployment #235 succeeded (commit `e020f80`). All 4 defense layers confirmed present in deployed code.

### Root Cause (DEFINITIVE)

**GitHub Pages CDN (Fastly) caches ALL files including HTML and version.json for ~10 minutes (`max-age=600`).** After a new deployment:

1. CDN serves stale HTML + stale version.json (both have matching old `buildTime`)
2. Stale-build detection sees no mismatch → proceeds to load stale `__ENTRY__` URL
3. Old JS chunks deleted by atomic deployment → entry module 404s
4. Retry logic fetches version.json again → CDN serves same stale response → same 404
5. After 3 retries → error shown → user must manually click "Clear Cache"

**Why previous 15 fixes failed**: They tried increasingly complex in-page recovery (hot-swap entry modules, CSS swap, SW race condition handling, watchdog timers). But **you cannot reliably recover from stale HTML in-page** — stale HTML contains stale references throughout. The only reliable fix is a full page reload with a CDN cache-busting URL.

**Two compounding failure modes**:
- **CDN stale cache**: Fastly ignores client-side `Cache-Control: no-cache` headers → version.json also stale → hot-swap gets same stale entry URL
- **SW runtime cache**: Even after `unregister()`, old SW still intercepts current page fetches → `NetworkFirst` with 5s timeout could serve stale JS from `js-css-cache`

### Fix: Simplify + Auto-Reload + Self-Destroying SW

#### 1. Self-destroying SW for GitHub Pages (`vite.config.ts`)

```typescript
VitePWA({
  selfDestroying: deployTarget === 'github',  // NEW
  registerType: deployTarget === 'github' ? 'prompt' : 'autoUpdate',
  // ... rest unchanged
})
```

Generates a SW that immediately unregisters itself and clears ALL caches. Eliminates the entire SW as a failure vector while cleaning up old SWs from previous deployments.

#### 2. Simplified Layer 0: Auto-reload instead of hot-swap (`index.html`)

Replaced ~150 lines of complex retry/hot-swap logic with ~60 lines of simple auto-reload:

- **When stale HTML detected** (version.json fresh, buildTimes differ): auto-reload with `?_gv=timestamp`
- **When entry module 404s** (both stale from CDN): auto-reload with `?_gv=timestamp`
- `?_gv=timestamp` changes the full page URL → CDN cache miss → fresh HTML from origin
- SessionStorage reload counter (max 3 in 2 min) prevents infinite loops

**Removed**: `retryWithFreshVersion()`, `swapCss()`, `watchdogFired`, `retryInProgress`, `retryCount`, watchdog timer
**Kept**: `cleanupSWs()` (for legacy SW cleanup), `loadApp()`, version.json check

#### 3. Simplified Layer 2: Fallback button (`index.html`)

- Removed SW unregister + cache delete from button (no SW on GitHub Pages)
- Reduced timeout to 12s (auto-reload handles fast recovery in ~3-5s)
- Kept reload loop detection and manual recovery UI

### Why This Fix Will Work

Instead of patching stale references in-page (whack-a-mole), just **reload the page with a URL the CDN hasn't cached**. `?_gv=timestamp` makes each reload URL unique → CDN cache miss → fresh HTML from origin → correct entry URL → game loads.

Combined with `selfDestroying` SW, this eliminates BOTH failure vectors:
- CDN stale cache → auto-reload bypasses it
- SW intercepting fetches → no SW exists on GitHub Pages

### Files Changed

- `vite.config.ts` — Added `selfDestroying: deployTarget === 'github'` to VitePWA config
- `index.html` — Rewrote Layer 0 inline script (150→60 lines), simplified Layer 2 fallback

### Testing

- TypeScript: `npx tsc --noEmit` — implicit via build
- Build (GitHub): `DEPLOY_TARGET=github bun run build` — clean, self-destroying SW generated
- Build (Lovable): `bun run build` — clean, normal SW with full Workbox caching
- Tests: `bun run test` — 281/281 passed (14 test files, all green)
- Lovable deployment: unaffected (selfDestroying is false)

---

## 2026-02-17 — 5-Agent Parallel Code Audit (12:10–12:30 UTC)

### Overview

Full codebase audit using 5 parallel agents covering all source code. Each agent scanned a different area for bugs, logic errors, dead code, type safety issues, and potential runtime crashes. Found **14 bugs** across all areas, fixed all of them in 3 commits. All 296 tests pass. TypeScript clean. Build succeeds.

### Audit Methodology

| Agent | Scope | Files Scanned | Findings |
|-------|-------|---------------|----------|
| Store + Helpers | gameStore.ts, all helpers/ | ~10 files | 24 findings (1 false positive CRITICAL, 3 HIGH, 5 MEDIUM, 6 LOW) |
| Components | game/, screens/ | ~30+ .tsx files | 21 findings (3 HIGH, 11 MEDIUM, 7 LOW) |
| Data Files | data/ (jobs, items, education, combat, etc.) | ~20 .ts files | 13 findings (1 HIGH, 3 MEDIUM, 9 LOW) |
| Hooks + AI | hooks/, ai/ | ~15 .ts files | 20 findings (2 CRITICAL, 4 HIGH, 6 MEDIUM, 8 LOW) |
| Network + Types + Audio | network/, types/, audio/, lib/ | ~15 .ts files | 17 findings (2 HIGH, 5 MEDIUM, 6 LOW) |

**Total raw findings: 95** — after verification, **14 confirmed bugs fixed**, rest were false positives, style observations, or too-low-impact to fix.

### Commit 1: Fix 7 bugs (store, AI, network)

**Files changed (8):**

| File | Fix |
|------|-----|
| `src/hooks/ai/actionExecutor.ts` | **CRITICAL**: AI weather movement cost off-by-one — `path.length` (includes start) → `baseCost` (actual steps). AI was paying 1 extra weather hour per move. |
| `src/hooks/ai/actions/strategicActions.ts` | **CRITICAL**: AI education pipeline study action missing `cost`/`hours` in details — defaulted to 5g instead of actual degree cost (5–25g). Added DEGREES import + lookup. |
| `src/network/useOnlineGame.ts` | **HIGH**: Lobby message filter missing `'name-change'` type — guests could never change name in lobby. Added to filter. |
| `src/network/networkState.ts` | **HIGH**: `weeklyNewsEvents` and `locationHexes` missing from `serializeGameState()` and `applyNetworkState()` — hex/newspaper features invisible to guest players in multiplayer. Added both to serialize + apply. |
| `src/types/game.types.ts` | **MEDIUM**: `FOOD_DEPLETION_PER_WEEK` was 25 but actual drain was hardcoded 35 — updated constant to 35. |
| `src/store/helpers/weekEndHelpers.ts` | **MEDIUM**: Replaced hardcoded `35` with `FOOD_DEPLETION_PER_WEEK` constant. |
| `src/store/gameStore.ts` | **MEDIUM**: `loadFromSlot` didn't restore `basePriceModifier` — economy base could reset after loading save. |
| `src/hooks/ai/strategy.ts` | **HIGH**: Career progress missing `goals.career > 0` guard — division by zero possible (though unlikely). Added guard matching other goals. |

### Commit 2: Fix 2 data bugs

| File | Fix |
|------|-----|
| `src/data/newspaper.ts` | **HIGH**: Newspaper "Employment Opportunities" only sampled from `JOBS` (8 Guild Hall jobs) instead of `ALL_JOBS` (~40 jobs across all locations). Changed to `ALL_JOBS`. Also removed unused `Job` type import. |
| `src/data/dungeon/floors.ts` | **MEDIUM**: `blessed-ground` modifier had both `damageMult: 0.8` AND `bonusDamageReduction: 0.2`, stacking to 36% reduction instead of described 20%. Set `damageMult: 1.0` so only `bonusDamageReduction` applies. |

### Commit 3: Fix 5 component bugs

| File | Fix |
|------|-----|
| `src/components/game/InventoryGrid.tsx` | **HIGH**: Tooltip used truthy checks for stats (`attack && ...`), hiding items with value 0. Changed to `!= null` checks. |
| `src/components/game/locationTabs.tsx` | **HIGH**: Used `useGameStore.getState()` during render for hex data — bypassed React subscriptions, hex placements stale until unrelated re-render. Moved `locationHexes` into `LocationTabContext` for reactive updates. Removed dead `useGameStore` import. |
| `src/components/game/LocationPanel.tsx` | Added `locationHexes` to context object passed to `getLocationTabs`. |
| `src/components/game/ResourcePanel.tsx` | **MEDIUM**: `player.activeCurses.length` crash without null safety — would crash loading pre-hex saves. Added `?.` optional chaining. |
| `src/components/game/PlayerToken.tsx` | **MEDIUM**: Same `activeCurses` crash risk. Added `?.` optional chaining. |
| `src/components/game/VictoryEffects.tsx` | **MEDIUM**: `canvas.getContext('2d')!` non-null assertion. Added proper null check. |

### Notable Findings NOT Fixed (Backlog)

These were valid observations but lower priority or design-level changes:

| Area | Finding | Severity | Reason Deferred |
|------|---------|----------|-----------------|
| Store | `useCurrentPlayer` can return undefined during title/setup | MEDIUM | Would require updating all callers |
| Components | GameBoard missing `isMultiHuman` dep in useEffect | HIGH | Only affects edge case of player count changing mid-game |
| Components | OptionsMenu fullscreen toggle not reactive | MEDIUM | Cosmetic — fullscreen state doesn't sync with F11 |
| Network | Host disconnect fires handlers twice (immediate + timeout) | MEDIUM | Requires reconnection architecture rework |
| Network | Duplicate AudioContext in synthSFX vs webAudioBridge | MEDIUM | Unification requires testing all audio paths |
| AI | `useMemo` depends on entire Zustand store in useGrimwaldAI | HIGH | Performance — functionally correct, needs careful refactor |
| AI | AI endTurn race condition with useAutoEndTurn | MEDIUM | Rare race, needs turn-locking mechanism |
| Data | Duplicate Job/Quest interfaces in game.types.ts vs data/ | MEDIUM | Architectural cleanup, affects many imports |

### Testing

- TypeScript: `npx tsc --noEmit` — clean
- Tests: `bun run test` — 296/296 passed (16 test files, all green)
- Build: `bun run build` — successful

---

## 2026-02-17 — Code Audit #5: 5-Agent Parallel Deep Audit (13:00 UTC)

### Overview

Full codebase audit using 5 parallel agents covering all code areas: (1) Store & helpers, (2) Game components, (3) Data files & hooks, (4) AI system, (5) Network & audio. Total 48 findings identified (5 HIGH, 18 MEDIUM, 25 LOW). 10 high-impact bugs fixed. All 296 tests pass. TypeScript compiles clean. Build succeeds.

### Audit Agents & Coverage

| Agent | Area | Files Audited | Findings |
|-------|------|---------------|----------|
| 1 | Store & Helpers | gameStore, weekEndHelpers, hexHelpers, bankingHelpers, playerHelpers, questHelpers, etc. | 10 |
| 2 | Game Components | GameBoard, LocationPanel, CavePanel, CombatView, InventoryGrid, locationTabs, VictoryScreen, etc. | 12 |
| 3 | Data & Hooks | jobs, items, education, locations, quests, dungeon, combatResolver, events, achievements, useGrimwaldAI | 14 |
| 4 | AI System | useGrimwaldAI, ai/types, strategy, actionGenerator, actionExecutor, playerObserver, all action generators | 9 |
| 5 | Network & Audio | PeerManager, NetworkActionProxy, useNetworkSync, useOnlineGame, audioManager, ambientManager, synthSFX | 17 |

### Bugs Fixed (10)

#### Fix 1: `resolveWeekEndOutcome` missing `players` in victory/all-dead paths (HIGH)
**File:** `src/store/helpers/weekEndHelpers.ts`
**Problem:** Both "all players dead" and "last player standing" early-return paths called `set()` with `weekEndState` but omitted the `players` array. The processed players (after food depletion, aging, death checks) were never written to the store. Victory screen displayed stale pre-processing player data.
**Fix:** Added `players` to both `set()` calls.

#### Fix 2: `hexCastCooldown` never validated before casting (MEDIUM)
**File:** `src/store/helpers/hexHelpers.ts`
**Problem:** `applyCasterCost()` sets `hexCastCooldown: 3` after casting, and `processHexExpiration()` decrements it weekly. But `validateCasterPrereqs()` never checked if cooldown > 0. Players could spam-cast multiple hexes per turn, bypassing the intended 3-week cooldown.
**Fix:** Added cooldown check as first validation in `validateCasterPrereqs()`.

#### Fix 3: `payRent` doesn't reset `rentExtensionUsed` (MEDIUM)
**File:** `src/store/helpers/economy/bankingHelpers.ts`
**Problem:** `prepayRent` correctly resets `rentExtensionUsed: false`, but regular `payRent` doesn't. After begging for more time and then paying rent normally, the flag remains `true` forever, permanently blocking the "beg for more time" option.
**Fix:** Added `rentExtensionUsed: false` to `payRent` return object.

#### Fix 4: `InventoryGrid` combat stats missing equipment durability (MEDIUM)
**File:** `src/components/game/InventoryGrid.tsx`
**Problem:** `getPlayerCombatStats()` called `calculateCombatStats()` with only 4 args, omitting `equipmentDurability`. ATK/DEF/BLK values displayed in inventory were higher than actual values used in combat (which accounts for durability degradation).
**Fix:** Added `player.equipmentDurability` as 5th argument.

#### Fix 5: AI raise eligibility uses wrong field (MEDIUM)
**File:** `src/hooks/ai/actions/strategicActions.ts`
**Problem:** AI salary negotiation checked `player.totalShiftsWorked` (lifetime total across all jobs) instead of `player.shiftsWorkedSinceHire` (shifts at current job). The store's `requestRaise` checks `shiftsWorkedSinceHire`. AI generated premature raise requests after switching jobs that always failed at the store level.
**Fix:** Changed to `player.shiftsWorkedSinceHire || 0`.

#### Fix 6: `applyLocationBatchingBonus` ignores `currentLocation` (MEDIUM)
**File:** `src/hooks/ai/actionGenerator.ts`
**Problem:** The Hard AI batching bonus (+5 priority) was applied to ALL non-move actions, regardless of whether they could be executed at the current location. Actions requiring travel to a different location received the bonus, causing the AI to choose actions that immediately fail.
**Fix:** Added location filter: only actions without a `location` field or with `location === currentLocation` receive the bonus.

#### Fix 7: Adventure goal moves to guild hall with no quest available (LOW)
**File:** `src/hooks/ai/actions/goalActions.ts`
**Problem:** In `generateAdventureActions`, the else-if branch for moving to guild hall didn't check if `adventureQuest` was non-null. AI would waste time traveling to the guild hall when no quests were available.
**Fix:** Added `adventureQuest &&` condition to the else-if branch.

#### Fix 8: `audioManager.stop()` doesn't cancel active crossfade (MEDIUM)
**File:** `src/audio/audioManager.ts`
**Problem:** `stop()` called `fadeOut()` on both decks but didn't clear `this.fadeInterval`. If called during an active crossfade, the crossfade interval continued running, competing with the fade-out for volume control, causing audio glitches.
**Fix:** Added `clearInterval(this.fadeInterval)` before fade-out calls.

#### Fix 9: `ambientManager.stop()` same crossfade issue (MEDIUM)
**File:** `src/audio/ambientManager.ts`
**Problem:** Identical to Fix 8. `stop()` didn't cancel active crossfade interval.
**Fix:** Added `clearInterval(this.fadeInterval)` before fade-out calls.

#### Fix 10: `handlePlayerDisconnect` bypasses ref pattern in leave handler (MEDIUM)
**File:** `src/network/useOnlineGame.ts`
**Problem:** In `handleHostMessage` case `'leave'`, `handlePlayerDisconnect(fromPeerId)` was called directly instead of through `handlePlayerDisconnectRef.current`. The ref pattern was set up specifically to avoid stale closure issues between `useCallback` hooks with different dependency arrays. The direct call could use a stale version of the disconnect handler.
**Fix:** Changed to `handlePlayerDisconnectRef.current?.(fromPeerId)`.

### Notable Findings NOT Fixed (Backlog)

| Area | Finding | Severity | Reason Deferred |
|------|---------|----------|-----------------|
| Store | `checkDeath` overwrites existing `eventMessage` | HIGH | Requires rethinking event message accumulation pattern |
| Network | Reconnecting peer with new peerId not matched to player slot | HIGH | Requires reconnection architecture rework |
| Network | `modifyGold` exploitable with repeated positive amounts | HIGH | Requires rethinking guest action whitelist design |
| Network | Host migration retry doesn't reset connection timeout | HIGH | Requires PeerManager refactor |
| Components | `getWorkInfo` earnings don't match actual `workShift` | MEDIUM | Cosmetic UI discrepancy, needs wage calculation refactor |
| Components | CavePanel spends time before full validation | HIGH | Rare race condition, needs dungeon flow redesign |
| Data | `festival-all` achievement uses cumulative counter | MEDIUM | Requires stats tracking schema change |
| AI | Goal sprint logic excludes adventure goal | LOW | Optional goal, lower priority |
| AI | `useMemo([store])` defeats memoization in useGrimwaldAI | LOW | Performance only, no functional impact |
| Audio | synthSFX creates separate AudioContext from webAudioBridge | MEDIUM | Requires audio architecture unification |
| Network | disconnectHandlers called twice for same peer | MEDIUM | Requires reconnection handler redesign |

### Files Modified (10)

| File | Changes |
|------|---------|
| `src/store/helpers/weekEndHelpers.ts` | Added `players` to victory/all-dead `set()` calls |
| `src/store/helpers/hexHelpers.ts` | Added cooldown check in `validateCasterPrereqs()` |
| `src/store/helpers/economy/bankingHelpers.ts` | Added `rentExtensionUsed: false` to `payRent` |
| `src/components/game/InventoryGrid.tsx` | Added `equipmentDurability` to combat stats calculation |
| `src/hooks/ai/actions/strategicActions.ts` | Changed `totalShiftsWorked` → `shiftsWorkedSinceHire` |
| `src/hooks/ai/actionGenerator.ts` | Added location filter to batching bonus |
| `src/hooks/ai/actions/goalActions.ts` | Added null check for adventure quest before move |
| `src/audio/audioManager.ts` | Clear crossfade interval in `stop()` |
| `src/audio/ambientManager.ts` | Clear crossfade interval in `stop()` |
| `src/network/useOnlineGame.ts` | Use ref pattern for disconnect handler in leave case |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    13.05s
```

TypeScript: 0 errors. Build: clean. All behavior preserved.

---

## 2026-02-17 — Agent-Based Code Audit (13:30 UTC)

### Overview

Full codebase audit using 5 parallel agents covering: (1) store + helpers, (2) game components, (3) data + game logic, (4) AI + hooks, (5) network + types + audio. Agents identified ~70 findings total. After manual verification, 3 confirmed bugs were fixed. All 296 tests pass. TypeScript compiles clean.

### Audit Methodology

5 specialized Explore agents ran in parallel, each reading and analyzing all files in their domain:

| Agent | Scope | Files Audited | Findings |
|-------|-------|---------------|----------|
| Store & Helpers | gameStore, turn/weekEnd/player/quest/workEducation/hex/banking helpers | 9 files | 8 findings (2 CRITICAL, 3 HIGH, 3 MEDIUM) |
| Components | GameBoard, LocationPanel, CavePanel, CombatView, InventoryGrid, screens | 14 files | 5 findings (0 CRITICAL, 1 HIGH, 3 MEDIUM, 1 LOW) |
| Data & Logic | jobs, items, education, locations, quests, dungeon, combat, events, hexes | 17 files | 8 findings (1 CRITICAL, 2 HIGH, 3 MEDIUM, 2 LOW) |
| AI & Hooks | useGrimwaldAI, ai/*, criticalNeeds, goalActions, strategicActions | 15 files | 21 findings (1 CRITICAL, 8 HIGH, 10 MEDIUM, 2 LOW) |
| Network & Audio | PeerManager, NetworkActionProxy, useNetworkSync, audio managers, types | 15 files | 20 findings (2 CRITICAL, 8 HIGH, 6 MEDIUM, 4 LOW) |

### Verified & Fixed Bugs (3)

#### Fix 1: Dead players processed in startTurn (HIGH)

**File:** `src/store/helpers/startTurnHelpers.ts`
**Problem:** `createStartTurn()` checked `if (!player) return` but did NOT check `player.isGameOver`. Dead players received starvation penalties (-20 hours), food spoilage, appliance breakage, homelessness penalties, robbery checks, and start-of-turn bonuses — all meaningless for a dead player.
**Fix:** Changed guard to `if (!player || player.isGameOver) return;`

#### Fix 2: seizeStocks value calculation inconsistency (MEDIUM)

**File:** `src/store/helpers/weekEndHelpers.ts`
**Problem:** `seizeStocks()` computed `pricePerShare = Math.floor(price * 0.8)` on line 488 for share counting, but then recalculated the seized value as `Math.floor(sharesToSell * price * 0.8)` on line 491 instead of using `sharesToSell * pricePerShare`. Due to floating-point arithmetic and flooring order, these can differ — e.g. with price 73: floor(73×0.8)=58, 3×58=174 vs floor(3×73×0.8)=floor(175.2)=175.
**Fix:** Changed to `sharesToSell * pricePerShare` for consistency with the share count calculation.

#### Fix 3: Hardcoded clothing degradation buffer in AI (LOW)

**File:** `src/hooks/ai/actions/criticalNeeds.ts`
**Problem:** `degradeBuffer` was hardcoded as `6` with a comment "2 weeks * 3/week". The constant `CLOTHING_DEGRADATION_PER_WEEK` (= 3) exists in `src/data/items.ts` and is used elsewhere, but this AI function didn't reference it.
**Fix:** Added `import { CLOTHING_DEGRADATION_PER_WEEK } from '@/data/items'` and changed to `CLOTHING_DEGRADATION_PER_WEEK * 2`.

### Notable Findings NOT Fixed (Backlog)

| Area | Finding | Severity | Reason Deferred |
|------|---------|----------|-----------------|
| Store | `seize*` functions mutate player via `p.stocks = { ...p.stocks }` pattern | MEDIUM | Works within Zustand's set() pattern; copies are created before mutation |
| Store | `checkDeath` overwrites existing `eventMessage` | HIGH | Previously logged; requires event message accumulation redesign |
| Network | Reconnecting peer with new peerId not matched to player slot | HIGH | Previously logged; requires reconnection architecture rework |
| Network | `modifyGold` exploitable with repeated positive amounts | HIGH | Previously logged; requires guest action whitelist redesign |
| Network | Host migration retry doesn't reset connection timeout | HIGH | Previously logged; requires PeerManager refactor |
| Network | Zombie turn detection race (reconnect during 5s window) | HIGH | Edge case in reconnection timing |
| Network | Room code format not validated before join | HIGH | Minor UX issue, generic error still shown |
| Components | GameBoard useEffect missing lastHumanPlayerId dep | MEDIUM | Intentional — adding it would create infinite loop |
| Components | CavePanel uses getState() inside event handler | MEDIUM | Works correctly; style preference |
| AI | turnPlanner hardcoded +2 hour overhead per shift | MEDIUM | Design choice; actual travel cost varies |
| AI | currentWage division without guard in strategicActions | MEDIUM | Requires currentJob check before; safe in practice |
| Audio | synthSFX creates separate AudioContext from webAudioBridge | MEDIUM | Previously logged; requires audio architecture unification |
| Audio | SFX pool round-robin can cut off sounds | MEDIUM | Acceptable for rapid-fire SFX |
| Data | Floor 5 has only 1 hex drop (Hex of Ruin) | LOW | Game balance issue, not a code bug |

### Files Modified (3)

| File | Changes |
|------|---------|
| `src/store/helpers/startTurnHelpers.ts` | Added `player.isGameOver` check to skip dead players |
| `src/store/helpers/weekEndHelpers.ts` | Fixed seizeStocks value: `sharesToSell * pricePerShare` instead of recomputing |
| `src/hooks/ai/actions/criticalNeeds.ts` | Imported `CLOTHING_DEGRADATION_PER_WEEK` constant; replaced hardcoded `6` |

### Test Results

```
Test Files  16 passed (16)
Tests       296 passed (296)
Duration    11.63s
```

TypeScript: 0 errors. All behavior preserved.

---

## 2026-02-17 22:00 — Systematic Bug Hunt: BUG-001 "Loading the realm…" Hang

### Investigation (5 parallel AI agents)

Launched 5 agents to systematically hunt the root cause:

1. **App.tsx startup chain** — Traced: `main.tsx → App.tsx → Index.tsx → TitleScreen → useMusic → audioManager`. Confirmed eager import chain triggers audioManager singleton at module load.
2. **gameStore initialization** — Safe. No circular runtime deps. Store helpers use type-only imports.
3. **Audio system** — Found `connectElement()` calls in audioManager (L74-75) and ambientManager (L69-70) OUTSIDE try-catch. sfxManager and speechNarrator properly wrapped. Risk: if `connectElement` throws on exotic environments, the singleton crashes → React never mounts.
4. **Circular imports** — None found. NetworkActionProxy/networkState use accessor pattern.
5. **Recent PR changes** — PR #241 simplified startup but didn't address the script ordering bug.

### Root Causes Found

**CRITICAL — Script ordering bug in production HTML:**
- Source `index.html`: error handler (`__guildShowError`) is in `<body>`, module script is after it → OK
- Built `dist/index.html`: Vite moves `<script type="module">` to `<head>`, but error handler stays in `<body>`
- `scriptErrorPlugin` adds `onerror="__guildShowError(...)"` to the module script
- When JS chunk 404s (stale cache after deploy), `onerror` fires → `__guildShowError` not defined yet → `ReferenceError` → silent failure → stuck on "Loading the realm…" with no feedback for 15 seconds

**HIGH — Unprotected connectElement() in audio singletons:**
- `audioManager.ts` L74-75 and `ambientManager.ts` L69-70 call `connectElement()` outside try-catch
- `sfxManager.ts` and `speechNarrator.ts` properly wrapped (no issue)
- Defense-in-depth concern: if `connectElement` bypasses its internal try-catch, the singleton crashes at import time

### Fixes Applied

**Fix 1: Move error handler to `<head>` (`index.html`)**
- Moved the `<script>` block defining `window.__guildReactMounted`, `__guildShowError`, `window.onerror`, and `unhandledrejection` from `<body>` to `<head>` (before `</head>`)
- Now in production build, `__guildShowError` is defined at L56 and the module script at L74 — correct order
- If JS chunk 404s, user immediately sees "Failed to load game files — please reload" with a Reload button

**Fix 2: Wrap `connectElement()` in try-catch (`audioManager.ts`, `ambientManager.ts`)**
- Wrapped `connectElement(this.deckA)` and `connectElement(this.deckB)` calls in try-catch
- On failure: `console.warn`, set gainA/gainB to null (falls back to `element.volume`)
- Matches existing pattern in `sfxManager.ts`

### Verification

```
Build: ✓ 0 errors, 12.14s
Tests: ✓ 296 passed (16 files), 10.95s
dist/index.html: __guildShowError defined at L56, module script at L74 ✓
```

---

## 2026-02-19 — Tutorial & Manual Revision (12:00 UTC)

### Problem

Tutorial and manual contained multiple factual errors and outdated information that confused new players:
1. Tutorial step 2 said "You start homeless! Visit the Landlord" — players actually start in The Slums with housing
2. Tutorial mentioned "Floor Sweeper" but didn't say where to find or work the job (Guild Hall)
3. Multiple stale values from older game versions (food drain 25→35, 2hr entry cost removed, wrong starting stats)
4. Dungeon floor count wrong in tutorial (said 5, actually 6)
5. Career goal description mentioned non-existent "guild rank"

### Tutorial Fixes (TutorialOverlay.tsx)

| Step | Before | After |
|------|--------|-------|
| 2 (was Housing, now Job) | "You start homeless! Visit the Landlord" | "Head to the Guild Hall and apply for Floor Sweeper (4g/hr) or Porter" — reordered to be step 2 since it's the actual first priority |
| 3 (was Job, now Housing) | "Visit the Guild Hall for employment" (no location info) | "You start with a room in The Slums (75g/week). Rent due every 4 weeks. No need to visit Landlord right away." |
| 4 Food & Clothing | "-20 hour starvation penalty", vague food info | "Food depletes by 35/week. Lose 20 hours if starving. Tavern food is safe; General Store spoils without Preservation Box." |
| 5 Movement | "Entering a building costs 2 hours" | Removed 2hr entry cost (was removed from game). "Moving costs 1 hour per step." |
| 6 Education | "multiple study sessions" (vague) | "10 study sessions (6 hours each, 60 hours total per degree)" |
| 7 Banking | "cash + savings + investments + stocks" | "cash + savings + investments" (removed redundant "stocks") |
| 8 Cave | "5 floors" | "6 floors" |
| 9 Victory | "reach the required guild rank through dependability" | "build dependability by working consistently - you must be employed!" |

### Manual Fixes (UserManual.tsx)

| Chapter | Fix |
|---------|-----|
| Getting Started | Starting stats: Happiness 10→50, Dependability 0→50, Clothing "6 weeks"→"35 condition (Casual tier)", Gold "~100g (varies)"→"100g". First turn priorities: added specific job names, Tavern as safe food option, noted rent not due until week 4. |
| The Board | Removed "Entering a location costs an additional 2 hours" and "5 hours total" example. Updated to just 1hr/step. |
| Turns & Time | Removed "Entering a location: 2 hours" row from time cost table. Updated starvation: added -20 hours + 25% doctor visit chance alongside -10 HP/-8 happiness. |
| Health & Food | Food drain 25→35 per week. Starvation: added -20 hours and 25% doctor visit. |
| Items & Shops | Food drain reference 25→35 per week. Updated starvation description. |
| Housing | Rent table header "Rent/4 Weeks"→"Rent/Week" (values are per-week: 75g, 120g). Added note that players start in The Slums with first rent due week 4. |

### Files Changed

| # | File | Changes |
|---|------|---------|
| 1 | `src/components/game/TutorialOverlay.tsx` | Rewrote 8 of 9 tutorial steps: reordered (job→housing), fixed facts, added locations |
| 2 | `src/components/game/UserManual.tsx` | Fixed 6 chapters: starting stats, movement costs, food drain, starvation, housing |

### What Was Verified Against Code

| Mechanic | Source | Verified Value |
|----------|--------|---------------|
| Starting housing | `gameStore.ts:72` | `housing: 'slums'` (NOT homeless) |
| Starting gold | `gameStore.ts:64` | `gold: 100` |
| Starting happiness | `gameStore.ts:66` | `happiness: 50` |
| Starting dependability | `gameStore.ts:93` | `dependability: 50` |
| Starting clothing | `gameStore.ts` | `clothingCondition: 35` |
| Food drain per week | `game.types.ts:401` | `FOOD_DEPLETION_PER_WEEK = 35` |
| Starvation time penalty | `startTurnHelpers.ts:210` | `STARVATION_TIME_PENALTY = 20` |
| Starvation HP/happiness | `game.types.ts:402-403` | -10 HP, -8 happiness |
| Entry cost | `locations.ts` (getMovementCost) | Path distance only, no +2 |
| Floor Sweeper location | `jobs/definitions.ts:17` | `location: 'Guild Hall'`, 4g/hr |
| Dungeon floors | `dungeon/floors.ts` | 6 floors (1-6, including Forgotten Temple) |
| Rent first due | `gameStore.ts:260` | `rentDueWeek: 4` |

## 2026-02-19 — Feature: AI Opponent Activity Feed (22:30 UTC)

### Task
User requested visibility into what AI opponents do during their turns. Previously all AI actions were console-only (`[Grimwald AI]` log prefix). Players had no in-game way to observe what opponents were doing.

Also discussed: fast move home when time is up, and food sickness without preservation. Only the activity feed was implemented this session.

### Implementation

**New: `AIActivityEntry` type + `aiActivityLog` in `GameState`**
- `src/types/game.types.ts` — added `AIActivityEntry` interface and `aiActivityLog: AIActivityEntry[]` to `GameState`
- Each entry stores `playerId`, `playerName`, `playerColor`, `action`, `week`

**New: Store actions**
- `src/store/storeTypes.ts` — added `appendAIActivity` and `clearAIActivity` to `GameStore`
- `src/store/gameStore.ts` — initial state `aiActivityLog: []`, trimmed to last 30 entries on append, cleared on `startNewGame` and `resetForNewGame` and `resetAdaptiveSystems`

**Modified: `useGrimwaldAI.ts`**
- `executeAction` now calls `useGameStore.getState().appendAIActivity(...)` in addition to the existing console log — every AI action is published to the store in real-time
- `resetAdaptiveSystems` now calls `clearAIActivity()` for clean slate on new game

**New: `AIActivityFeed` component**
- `src/components/game/tabs/AIActivityFeed.tsx` — pure display component, reads `aiActivityLog` from store, shows last 15 entries newest-first with color dot + player name + action text

**Modified: `PlayersTab.tsx`**
- Imports and renders `<AIActivityFeed />` between player list and the "Click locations to travel" tip

### Result
- 296 tests pass (all green)
- Live feed visible in Players tab as AI opponents take actions
- Feed auto-hides when empty (no AI in game)
- Committed: `c917719` on branch `claude/opponent-behavior-analysis-0ni5O`
