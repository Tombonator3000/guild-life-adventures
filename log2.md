# Guild Life Adventures - Development Log 2

> **Continuation of log.md** (which reached 14,000+ lines / 732KB).
> Previous log: see `log.md` for all entries from 2026-02-05 through 2026-02-14.

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

### Development Statistics (from log.md)

- **Total test count**: 185 tests across 9 test files (as of 2026-02-14)
- **Total development days**: 10 (Feb 5-14, 2026)
- **Major systems built**: 25+ (board, jobs, education, housing, economy, combat, quests, multiplayer, AI, PWA, audio, weather, festivals, achievements, portraits, age, equipment durability, clothing tiers, inventory, zone editor, debug tools, internationalization, electron guide)
- **Bug fixes documented**: 200+ across all audit sessions
- **Refactoring passes**: 3 (complex functions, AI system, weekEnd helpers)

---
