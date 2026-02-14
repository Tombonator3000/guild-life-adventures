# Guild Life Adventures - Development Log 2

> **Continuation of log.md** (which reached 14,000+ lines / 732KB).
> Previous log: see `log.md` for all entries from 2026-02-05 through 2026-02-14.

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

### Development Statistics (from log.md)

- **Total test count**: 185 tests across 9 test files (as of 2026-02-14)
- **Total development days**: 10 (Feb 5-14, 2026)
- **Major systems built**: 25+ (board, jobs, education, housing, economy, combat, quests, multiplayer, AI, PWA, audio, weather, festivals, achievements, portraits, age, equipment durability, clothing tiers, inventory, zone editor, debug tools, internationalization, electron guide)
- **Bug fixes documented**: 200+ across all audit sessions
- **Refactoring passes**: 3 (complex functions, AI system, weekEnd helpers)

---
