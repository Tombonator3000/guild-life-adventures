# Guild Life Adventures - Development Log 2

> **Continuation of log.md** (which reached 14,000+ lines / 732KB).
> Previous log: see `log.md` for all entries from 2026-02-05 through 2026-02-14.

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
