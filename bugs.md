# Guild Life Adventures — Bug Catalog

> **Purpose**: Centralized catalog of all known bugs, their root causes, and fixes.
> Helps identify patterns and prevent recurring issues.

---

## BUG-001: "Loading the realm..." Freeze (RECURRING — FIXED permanently via hot-swap)

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Status** | FIXED (hot-swap architecture eliminates reload dependency) |
| **First seen** | 2026-02-14 |
| **Occurrences** | 14 fix attempts across PRs #185–#211 |
| **Symptom** | Game stuck on "Loading the realm..." loading screen, React never mounts |
| **Environment** | Production (GitHub Pages), after any new deployment |

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

### Lessons Learned
1. **Test with the actual deployment target** — The `<base>` tag lookup was never tested on GitHub Pages
2. **Verify defense layers actually fire** — The inline script's 404 was silently swallowed
3. **Centralize base path handling** — Don't compute base path differently in 3 places
4. **Log when stale detection can't run** — Would have revealed the 404 immediately
