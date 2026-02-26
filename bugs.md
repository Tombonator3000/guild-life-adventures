# Guild Life Adventures — Bug Catalog

> **Purpose**: Centralized catalog of all known bugs, their root causes, and fixes.
> Helps identify patterns and prevent recurring issues.

---

## BUG-001: "Loading the realm..." Freeze (RECURRING — FIX #17: 2026-02-17)

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Status** | FIXED (error handler moved to `<head>` + audio singleton hardening) |
| **First seen** | 2026-02-14 |
| **Occurrences** | 17 fix attempts across PRs #185–#241 |
| **Symptom** | Game stuck on "Loading the realm..." loading screen, React never mounts |
| **Environment** | Production (GitHub Pages + Lovable), after any new deployment |

### Root Cause (DEFINITIVE — found 2026-02-15)

**The inline stale-build detection script in `index.html` used the WRONG base path to fetch `version.json` on GitHub Pages.**

```javascript
// BROKEN CODE (in index.html inline script):
var base = document.querySelector('base[href]');
base = base ? base.getAttribute('href') : '/';
fetch(base + 'version.json?_=' + Date.now(), ...)
```

There is **no `<base>` tag** in the HTML, so `base` always defaulted to `'/'`. On GitHub Pages (where the app lives at `/guild-life-adventures/`), this fetched:

- **Actual**: `https://tombonator3000.github.io/version.json` → **404**
- **Expected**: `https://tombonator3000.github.io/guild-life-adventures/version.json`

**Impact**: The stale-build detection — the entire purpose of the deferred module loading system built across PRs #200-#206 — **never actually worked on GitHub Pages**. It always got a 404, fell through to `loadApp()`, and loaded whatever stale chunks were in the HTML.

### Why Previous Fixes Failed

| PR | What it did | Why it didn't fix the root cause |
|----|-------------|----------------------------------|
| #185 | Added cache-busting `?_gv=` param | Didn't address stale detection at all |
| #188-191 | Audio singleton try-catch | Treated symptom, not cause |
| #194 | Missing radix-ui dep | Unrelated one-off issue |
| #195 | Lazy-loaded heavy screens | Reduced blast radius, didn't prevent stale loading |
| #198 | Lazy-loaded audio, wrapped auto-save | Defense in depth, but stale detection still broken |
| #199 | AudioController in SilentErrorBoundary | More defense, still broken |
| #200 | Pre-mount staleness check in main.tsx | **This check uses correct base** (`import.meta.env.BASE_URL`), but runs AFTER module loads — too late if chunks already 404'd |
| #201 | Inline stale-build detection | **Introduced the broken `<base>` lookup** — never worked |
| #204 | Removed JS/CSS from SW precache | Good defense but stale HTML still loaded bad chunks |
| #205 | `deferModulePlugin` | Great architecture but inline version check used wrong base |
| #206 | Fixed all location.reload() calls | Completeness pass, didn't fix version check URL |

### Definitive Fix

```javascript
// vite.config.ts — inject base path alongside build time:
window.__HTML_BUILD_TIME__ = "...";
window.__HTML_BASE__ = "/guild-life-adventures/";

// index.html — use injected base instead of broken <base> lookup:
var base = window.__HTML_BASE__ || '/';
fetch(base + 'version.json?_=' + Date.now(), ...)
```

### Additional Hardening

1. **Save data validation** — `loadFromSlot()` now validates `phase` and `players` before applying
2. **hardRefresh() timeout** — 5s timeout on SW/cache cleanup to prevent infinite hang
3. **Corrupted save detection** — Invalid saves are logged and deleted instead of crashing

### Why PR #211's Fix Wasn't Sufficient (found 2026-02-15)

PR #211 fixed the version.json fetch URL, but the **recovery mechanism** (reload with `?_gv=`) was fragile:
- GitHub Pages CDN may serve cached HTML even with `?_gv=` param within `max-age=600`
- After 2 reload attempts, reload limit reached → `loadApp()` called with STALE entry URL
- Stale entry URL → 404 → `<script type="module">` 404s are **SILENT** (no window.onerror)
- Module never loads → React never mounts → "Loading the realm..." forever

### Permanent Fix: Hot-Swap Architecture

Instead of reloading (fragile), the inline script now hot-swaps the entry module from `version.json`:
1. `version.json` now includes `entry` and `css` URLs (always fresh via `cache:'no-store'`)
2. When stale HTML detected: swap `window.__ENTRY__` to fresh URL, replace CSS links, load directly
3. Added `onerror` handler on `<script type="module">` to catch silent 404s

### Why Hot-Swap Still Caused "Clear Cache" Loop (found 2026-02-15)

The hot-swap mechanism works correctly. The problem was the DEFENSE LAYERS fighting each other:

1. **Premature fallback button** — appeared after 3s, before module finished loading (4-8s on slow connections). Users clicked it → unnecessary reload → same button appeared → loop.
2. **`checkStaleBuild()` in main.tsx had no reload limit** — if inline script's version.json fetch failed transiently, this function would detect stale and reload with NO loop counter → infinite reloads.
3. **`cacheReload()` fire-and-forget** — SW unregister + cache delete started but not awaited (300ms delay). Reload could fire while old SW still active.
4. **`useAppUpdate` auto-reload on mount** — conflicted with inline hot-swap, causing double detection and double reloads.

### Fix: Simplify Defense Layers (2026-02-15)

- Added loading state flags (`__guildAppLoading`, `__guildAppFailed`, `__guildReactMounted`) for smart fallback timing
- Added reload loop protection (max 3 reloads in 2 min via sessionStorage)
- Made `cacheReload()` await cleanup before reloading (3s timeout)
- Removed `checkStaleBuild()` from main.tsx (redundant with inline script)
- Removed auto-reload from `useAppUpdate` (shows banner instead)

### Why PR #213's Fix STILL Caused Reload Loop (found 2026-02-15, 15:35 UTC)

PR #213 added a `controllerchange` event listener in `useAppUpdate.ts` that called `hardRefresh()` whenever the SW controller changed. This was intended as a safety net for mid-session SW updates, but it fired on EVERY page load:

1. `hardRefresh()` unregisters the SW and reloads
2. On reload, `useRegisterSW` registers a NEW SW
3. New SW installs → `skipWaiting` → `clientsClaim` → controller changes from `null` to new SW
4. `controllerchange` fires → `hardRefresh()` → GOTO step 1

**Compounding factor**: `hardRefresh()` had NO reload loop protection — it never checked the `sessionStorage` counter that the fallback button used. `lazyWithRetry()` also lacked this check.

### Final Fix: Unified Reload Loop Protection (2026-02-15)

1. **`controllerchange` → shows update banner** instead of calling `hardRefresh()`. The version polling and hot-swap handle new deploys; the user decides when to reload.
2. **`hardRefresh()` checks `sessionStorage` reload counter** (max 3 reloads in 2 min) before reloading. Shared counter with index.html fallback.
3. **`lazyWithRetry()` checks the same counter** before clearing caches and reloading.
4. **ErrorBoundary uses `hardRefresh()`** instead of inline logic, inheriting loop protection.

**Key principle**: ALL programmatic reload paths now share a single `sessionStorage` counter. No code path can trigger `location.replace()` or `location.reload()` more than 3 times in 2 minutes.

### Why ALL Previous Fixes Were Insufficient (found 2026-02-15, late)

Even after 15 fix attempts, TWO fundamental problems remained:

**Problem A: CDN cache bypass was incomplete.** The inline script's `version.json` fetch used `{cache:'no-store'}` which only bypasses the **browser's** HTTP cache. It did NOT include `Cache-Control: no-cache` request headers to bypass the **CDN** cache (Fastly/GitHub Pages). When both HTML and version.json were stale from CDN cache (matching buildTimes), the hot-swap never triggered. The stale entry URL 404'd silently.

**Problem B: Service worker interference.** The SW with `skipWaiting: true` + `clientsClaim: true` + `registerType: 'autoUpdate'` caused mid-visit takeover bugs across 5+ PRs. Each fix for the SW created a new issue because the SW's lifecycle is inherently incompatible with the stale-cache recovery mechanism.

### Nuclear Fix (2026-02-15, late)

1. **CDN cache bypass**: Added `headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}` to the inline version.json fetch. These request headers tell CDN proxies to revalidate with the origin.
2. **Module onerror retry**: When entry module 404s, automatically retry by fetching version.json again (CDN may have updated since first fetch) and hot-swap to fresh entry URL. Up to 2 retries.
3. **Inline SW unregister**: Unregister ALL service workers as the first action in the loading pipeline, BEFORE the version check. Eliminates old/broken SWs from interfering with fetches.
4. **SW neutered for GitHub Pages**: Changed `registerType` to `'prompt'` (was `'autoUpdate'`) and disabled `skipWaiting`/`clientsClaim` for GitHub Pages builds. New SWs install but don't activate until all tabs are closed. No mid-visit takeover, no `controllerchange` events, no reload loops.

### Why PR #241's Simplified Startup Still Hung (found 2026-02-17)

PR #241 radically simplified the startup pipeline (removed deferred loading, inline version check, etc.) but the hang persisted. **Two new root causes found via parallel AI agent investigation:**

**Root Cause A — Script ordering bug in production HTML:**
- In source `index.html`, the error handler script (`__guildShowError`) was in `<body>` and the module entry script came after it — correct order
- Vite's production build moves `<script type="module">` to `<head>` but leaves the error handler in `<body>`
- `scriptErrorPlugin` adds `onerror="__guildShowError(...)"` to the module script in `<head>`
- When JS chunk 404s (stale cache), `onerror` fires → `__guildShowError` not yet defined (still in `<body>`) → `ReferenceError` → silent failure → stuck on "Loading the realm…" for 15s

**Root Cause B — Unprotected `connectElement()` in audio singletons:**
- `audioManager.ts` L74-75 and `ambientManager.ts` L69-70 called `connectElement()` outside try-catch
- `sfxManager.ts` and `speechNarrator.ts` were properly wrapped
- If `connectElement` throws on exotic environments, the module-level singleton crashes → import fails → React never mounts

### Fix #17 (2026-02-17)

1. **Moved error handler to `<head>`** — `__guildShowError`, `window.onerror`, and `unhandledrejection` listener now defined in `<head>` before Vite's module script. Verified in `dist/index.html`: error handler at L56, module script at L74.
2. **Wrapped `connectElement()` in try-catch** — Both `audioManager.ts` and `ambientManager.ts` constructors now catch `connectElement` failures and fall back to `gainA/gainB = null` (element.volume fallback). Matches existing pattern in `sfxManager.ts`.

---

## BUG-002: Autosave Victory Loop

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | FIXED (2026-02-15) |
| **Root cause** | Autosave captures state RIGHT BEFORE victory → Continue loads pre-victory state → checkVictory fires → instant re-victory → infinite loop |
| **Fix** | Delete autosave on all 5 victory paths; `resetForNewGame` action clears all state |

---

## BUG-003: Shadow Market Hex Tab Crash

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | FIXED (2026-02-14, PR #207) |
| **Root cause** | `players` not destructured from `ctx` in `shadowMarketTabs()` → `ReferenceError` |
| **Fix** | Added `players` to destructuring in `locationTabs.tsx` |

---

## BUG-004: Multi-AI Standing Still

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | FIXED (2026-02-07) |
| **Root cause** | `aiIsThinking` state not reset between consecutive AI players |
| **Fix** | Added `lastAIPlayerIdRef` tracking for proper state reset |

---

## BUG-005: Mobile Center Panel Too Large

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | FIXED (2026-02-15) |
| **Root cause** | Center panel height was 65% of screen, blocking game board interaction |
| **Fix** | Reduced to 30%, compact floating panel with 92% width and rounded corners |

---

## Pattern Analysis

### Recurring Theme: Stale Cache After Deploy
- GitHub Pages caches HTML for 10 minutes (`max-age=600`)
- Vite content-hashes JS/CSS chunks → old URLs disappear on new deploy
- Multiple defense layers built but the PRIMARY defense (inline version check) was broken
- All other defenses are secondary: they handle edge cases but can't prevent the core issue

### Additional Hardening (2026-02-16)

Even after the nuclear fix, edge cases remained where the loading system could hang silently:

1. **Watchdog timer** (12s after module injection) — catches silent module failures where `onerror` never fires (module loads but evaluation hangs, dependency imports fail silently)
2. **Mount timeout** (15s) — if `import("./App.tsx")` never resolves, sets `__guildAppFailed` flag so fallback button and watchdog can act
3. **CDN propagation retry** — when version.json returns the same stale entry URL, waits 2s and retries (up to 3 attempts) instead of giving up immediately
4. **Faster fallback button** — reduced from 15s to 12s threshold

### Additional Hardening (2026-02-16, session 2)

Systematic bug hunt with parallel agents. No new code bugs found in recent PRs (#216, #218, #219, #220). Build, TypeScript, and 219 tests all pass. Root cause remains BUG-001 CDN cache with three newly identified edge cases:

1. **SW unregister race condition** — The SW unregister was fire-and-forget (async) but the version.json fetch started immediately in a separate `<script>` block. An old SW could intercept the version.json fetch and serve cached response before unregistration completed. **Fix**: Chain SW unregister BEFORE version check using `Promise.race([unregisterSW(), timeout(2s)])` → then fetchVersion.

2. **No user feedback during loading** — Static "Loading the realm..." text gave no indication of progress, causing users to think the app was frozen and click Clear Cache prematurely. **Fix**: Dynamic status text via `__guildSetStatus()`: "Checking for updates..." → "Loading game modules..." → "Starting game..." → "Retrying... (attempt N/3)" → "Loading is slow — retrying..."

3. **Module retry with same URL** — When version.json returned the same entry URL (CDN propagation delay), the retry waited 2s then tried again with the exact same URL. **Fix**: Append `?_cb=timestamp` cache-buster to the module URL on retry, forcing CDN to fetch fresh from origin.

4. **Favicon 404 on GitHub Pages** — `<link rel="icon" href="/favicon.png">` resolved to `tombonator3000.github.io/favicon.png` instead of `/guild-life-adventures/favicon.png`. Same for apple-touch-icon. **Fix**: Changed to relative paths (`href="favicon.png"`).

5. **Reduced watchdog timer** — From 12s to 10s for faster retry on silent failures.

### Definitive Fix: Auto-Reload + Self-Destroying SW (2026-02-16, session 3)

Parallel agent investigation (4 agents) identified why ALL previous in-page recovery attempts failed:

1. **Fastly CDN ignores client-side `Cache-Control` headers** — `cache:'no-store'` and `Cache-Control: no-cache` request headers only bypass the BROWSER cache. Fastly doesn't honor client cache-control headers by default. So version.json was ALSO CDN-stale, making hot-swap get the same stale entry URL.

2. **`registration.unregister()` doesn't stop the current SW** — Even after unregistering, the old SW continues to control the current page's fetches. The `NetworkFirst` runtime cache could serve stale JS chunks from `js-css-cache`.

**Key insight**: You cannot reliably recover from stale HTML in-page. Stale HTML has stale references everywhere (CSS links, preloads, inline timestamps, entry URLs). Patching each one is whack-a-mole. The only reliable fix is a full page reload with a URL the CDN hasn't cached.

**Fix**:
1. `selfDestroying: true` in VitePWA for GitHub Pages — SW immediately unregisters itself and clears all caches. Eliminates SW as failure vector.
2. Replace hot-swap retry logic (~150 lines) with auto-reload (~60 lines) — when stale HTML detected or entry 404s, reload with `?_gv=timestamp` which creates a CDN cache miss. SessionStorage counter prevents loops (max 3 in 2 min).

### Lessons Learned
1. **Test with the actual deployment target** — The `<base>` tag lookup was never tested on GitHub Pages
2. **Verify defense layers actually fire** — The inline script's 404 was silently swallowed
3. **Centralize base path handling** — Don't compute base path differently in 3 places
4. **Log when stale detection can't run** — Would have revealed the 404 immediately
5. **`cache:'no-store'` only bypasses browser cache, NOT CDN cache** — Must also send `Cache-Control: no-cache` request header for CDN bypass
6. **Service workers and stale-cache recovery are fundamentally incompatible** — Disable aggressive SW behavior (skipWaiting/clientsClaim) on CDN-cached hosts
7. **Add retry mechanisms, not just detection** — When a module 404s, try fetching version.json again instead of immediately giving up
8. **Proactive watchdog > reactive error handlers** — Some failures produce no signal; check the end result (did React mount?) rather than waiting for specific errors
9. **Chain async cleanup before dependent operations** — Fire-and-forget cleanup can race with the operations that depend on it being complete
10. **Show progress during loading** — Users interpret static text as frozen; dynamic status prevents premature cache clears
11. **Deduplicate retry attempts** — Watchdog and onerror can fire independently; use a lock flag to prevent parallel retry chains
12. **Track pipeline state for fallback UI** — Without a `versionCheckStarted` flag, the fallback button can show prematurely while version check is still running normally
13. **Simpler is more reliable** — 15 fixes with increasing complexity all failed. The simplest approach (reload the page) was the most reliable
14. **CDN behavior is undocumented** — Fastly's default query-string handling and client-header behavior isn't well-documented. Don't assume CDN cache bypass works
15. **Self-destroying SW is the cleanest migration** — Instead of neutering the SW (prompt + no skipWaiting), just make it destroy itself and clean up old caches

### Fix #16: Universal Self-Destroying SW + Hot-Swap (2026-02-17)

Previous "definitive fix" only applied self-destroying SW to GitHub Pages. On Lovable, the SW was still active with skipWaiting + clientsClaim, causing the same stale cache issues. Fix:

1. **`selfDestroying: true` on ALL platforms** — SW is universally a liability for this game. The marginal value of image/music caching doesn't justify the catastrophic failure modes.
2. **Hot-swap from version.json** — When stale HTML detected AND version.json has a fresh `entry` URL, load it directly (plus swap CSS links) instead of reloading. Eliminates CDN-ignores-query-params failure mode.
3. **Nuclear Reset button** — Clears sessionStorage, localStorage, Cache Storage, unregisters all SWs, then reloads with cache-buster. Last resort escape hatch.
4. **Diagnostic info on fallback** — Shows entry URL, build time, loading flags, and error count to aid debugging.

---

## BUG-006: Dependability Always Drops (Even When Player Worked)

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Status** | FIXED (2026-02-16) |
| **Root cause** | `resetWeeklyFlags()` called BEFORE `processEmployment()` in `processPlayerWeekEnd()` — reset `workedThisTurn` to false before checking it |
| **Fix** | Swapped call order: employment check runs first, then weekly flags reset. Also changed penalty from flat -2 to -10% |

---

## BUG-007: Too Many Events Per Week (Event Spam)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Status** | FIXED (2026-02-16) |
| **Root cause** | 9+ independent event systems could all trigger in the same week. No cap on random events per week. High individual probabilities compounded. |
| **Fix** | (1) Added 20% gate on location events, 30% gate on weekly theft. (2) Split deterministic/random processors. (3) Max 1 random event per week per player (theft OR sickness, not both). |

---

## BUG-008: `useRemainingTime` Flagged as Hook Rule Violation (2026-02-23)

| Field | Value |
|-------|-------|
| **Severity** | Medium (lint error blocks CI) |
| **Status** | FIXED (2026-02-23) |
| **Root cause** | Zustand store action named `useRemainingTime` in `workEducationHelpers.ts`. ESLint's `react-hooks/rules-of-hooks` treats any function starting with `use` as a React hook. Using it in an `onClick` callback (`() => useRemainingTime(player.id)`) triggered the lint error "React Hook cannot be called inside a callback". |
| **Fix** | Renamed to `spendRemainingTime` in `storeTypes.ts`, `workEducationHelpers.ts`, and `ResourcePanel.tsx`. |

---

## BUG-009: Dragon Scale Shield Unsalvageable (basePrice: 0) (2026-02-23)

| Field | Value |
|-------|-------|
| **Severity** | Low-Medium |
| **Status** | FIXED (2026-02-23) |
| **Root cause** | `dragon-scale-shield` in `RARE_DROP_ITEMS` had `basePrice: 0` (correct for a dungeon drop with no purchase price). But `getSalvageValue()` computes `Math.round(item.basePrice * 0.6 * priceModifier)` → 0g. Same for `getTemperCost()` which uses `Math.max(30, ...)` (floor saves it), but salvage is permanently 0. |
| **Fix** | Set `basePrice: 800` → salvage value 480g (reasonable for a legendary rare drop). |

---

## BUG-010: `activeCurses?.find()` Missing Optional Chain (2026-02-23)

| Field | Value |
|-------|-------|
| **Severity** | Medium (crash risk on old saves) |
| **Status** | FIXED (2026-02-23) |
| **Root cause** | `locationTabs.tsx` line 746: `ctx.player.activeCurses.find(...)` would crash if `activeCurses` is undefined on saves pre-dating the curses feature. TypeScript types it as non-optional, but save migration doesn't guarantee it's initialized. |
| **Fix** | Changed to `ctx.player.activeCurses?.find(...)` for defensive null safety. |

---

## BUG-011: Variable Shadowing in workShift (p vs player) (2026-02-23)

| Field | Value |
|-------|-------|
| **Severity** | Low (code correctness, not runtime bug) |
| **Status** | FIXED (2026-02-23) |
| **Root cause** | `workEducationHelpers.ts` `workShift` used outer `p` (pre-mutation snapshot from `state.players.find()`) on lines 165-166 for `dependability` and `experience` updates, while lines 162-164 and 167+ all correctly used inner `player` (the `state.players.map()` iteration variable). Both variables point to the same player object so values were identical, but the mixing was confusing and inconsistent. |
| **Fix** | Changed `p.maxDependability`, `p.dependability`, `p.maxExperience`, `p.experience` to `player.*` on lines 165-166. |

---

## BUG-012: CommitmentPlan Shared Across AI Players (2026-02-23)

| Field | Value |
|-------|-------|
| **Severity** | Medium (incorrect AI behavior in multi-AI games) |
| **Status** | FIXED (2026-02-23) |
| **Root cause** | `useGrimwaldAI` is a single hook instance shared by all AI players. The `commitmentPlanRef` is one ref holding one `CommitmentPlan`. `CommitmentPlan` had no `playerId` field, and `isCommitmentValid()` never checked player identity. When AI Player A finished their turn and AI Player B's turn started, Player B would inherit Player A's commitment plan. If the plan was still "valid" under Player B's game state (e.g., same degree not yet earned), Player B would follow it for up to `maxDuration` turns instead of generating their own plan. |
| **Fix** | Added `playerId: string` to the `CommitmentPlan` interface in `types.ts`. All 7 plan creation points in `commitmentPlan.ts` now include `playerId: player.id`. `isCommitmentValid()` now returns `false` immediately if `plan.playerId !== player.id`, ensuring each AI player always generates their own commitment plan. Updated 6 test plan objects in `newSystems.test.ts` with `playerId`. |

---

## BUG-014: Seraphina (AI) Freezes — Three Concurrent Root Causes (2026-02-26, FIXED)

| Field | Value |
|-------|-------|
| **Severity** | Critical (game restart required) |
| **Status** | FIXED (2026-02-26) |
| **Symptom** | An AI player (most often Seraphina) stops taking any actions during her turn; game must be restarted |

### Root Cause A — `aiIsThinking` not reset after week-end events

**Files**: `useAITurnHandler.ts`

When `processWeekEnd()` fires, two things happen simultaneously in one Zustand `set()` call:
1. `currentPlayerIndex` advances to the first alive player of the new week
2. `phase` is set to `'event'`

React batches both. When Effect 1 fires (watches `phase`), it clears `aiTurnStartedRef` and `lastAIPlayerIdRef` but NOT `aiIsThinking`. Effect 2 fires next (watches `currentPlayer?.id`) but by then `lastAIPlayerIdRef` is already `null` (Effect 1 ran first), so the `lastAIPlayerIdRef && ...` condition is always `false`. If the first player of the new week is an AI, `aiIsThinking` stays `true` from the previous AI's turn, the reset block never fires (no `lastAIPlayerIdRef`), and the start block (`!aiIsThinking`) is permanently blocked → AI freezes.

**Fix**: Added `setAiIsThinking(false)` inside the `phase !== 'playing'` early-return block in Effect 1. This resets `aiIsThinking` whenever the game is in event/setup/victory phase, guaranteeing it's `false` when `phase` returns to `'playing'`.

### Root Cause B — `useAutoEndTurn` races with AI step loop (easy difficulty)

**Files**: `useAutoEndTurn.ts`

`useAutoEndTurn` watches `currentPlayer.timeRemaining` and schedules `endTurn()` in 500ms when time hits 0. The AI's step loop (easy difficulty = 800ms delay) fires AFTER the `useAutoEndTurn` timer. Timeline:
- T+0: AI action reduces time to 0
- T+500ms: `useAutoEndTurn` fires `endTurn()` → turn advances to next player
- T+800ms: Stale AI step fires, finds `timeRemaining=0` for old player → fires `endTurn()` AGAIN → double-advance, skipping a player

This cascades: `useAITurnHandler` starts the skipped player's `runAITurn` with a 1000ms delay, but the phantom `endTurn()` may advance past them too.

**Fix**: Added `if (currentPlayer.isAI) return false;` at the top of `checkAutoReturn`. The AI manages its own `endTurn()` via `runAITurn/step()`. `useAutoEndTurn` is for human players only.

### Root Cause C — Stale AI step calls `endTurn()` after turn was externally advanced

**Files**: `useGrimwaldAI.ts`

When any external code (Root Cause B, or future code) advances `currentPlayerIndex`, old scheduled step-callbacks from the previous AI's loop are still in the timer queue. When they fire, they find the old player's `timeRemaining=0` and call `endTurn()` again, double-advancing the game.

**Fix**: `runAITurn` now captures `startingPlayerIndex = useGameStore.getState().currentPlayerIndex` before the step loop. Each `step()` call checks `state.currentPlayerIndex !== startingPlayerIndex` and returns early (with `isExecutingRef.current = false`) if the turn was advanced externally. Also wrapped the initialization block (before the step loop) in try-catch: if any helper function throws (e.g., `generateCommitmentPlan`, `recordPerformance`), `isExecutingRef` is reset and `endTurn()` is called so the game recovers rather than freezing with `isExecutingRef=true` permanently.

---

## BUG-013: failedActionsRef Blocks Re-attempt After State Change (2026-02-23, KNOWN)

| Field | Value |
|-------|-------|
| **Severity** | Low (AI suboptimal play, not a crash) |
| **Status** | KNOWN — not fixed (complex to solve safely) |
| **Root cause** | `useGrimwaldAI.ts`: When an AI action fails (e.g. "buy food" fails because gold < price), the action key is added to `failedActionsRef` to prevent infinite retry loops. But if the AI later earns enough gold during the same turn, the "buy food" action remains blocked for the rest of the turn — the ref is only cleared at turn start. The failure reason was transient but the block is permanent for the turn. |
| **Impact** | AI may fail to buy food/essentials when gold was the issue, potentially starving despite being able to afford it later in the turn. |
| **Non-fix reason** | The failedActionsRef exists to prevent infinite retry loops. A proper fix requires tracking *why* an action failed to know when to retry — a significant refactor of AI action execution. Mitigated by: turns are 1 week, most actions get retried next turn, and starvation is handled by the weekly food check. |
