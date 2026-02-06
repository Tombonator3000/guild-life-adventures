# Guild Life Adventures - Development Log

## 2026-02-06 - Job Market Wage Display + Dungeon Per-Encounter Time

Two gameplay improvements: job listings now show real market wages, and dungeon encounters cost time individually.

### 1. Job Market Wage Display

**Problem:** Job listings in the Guild Hall showed the base wage (e.g. $7/h), but the actual offered wage was calculated based on economy when applying — leading to a confusing mismatch between listed and offered salary.

**Fix:** Market wages are now pre-calculated when selecting an employer, using the same `calculateOfferedWage(job, priceModifier)` formula. The listing shows the real market wage the player will receive if hired.

| Change | Before | After |
|--------|--------|-------|
| Job listing wage | Base wage ($7/h) | Market wage ($4-$18/h based on economy) |
| Wage consistency | Listed ≠ offered | Listed = offered |
| Hired modal text | "(Base: $7/h)" | "(Market rate at time of visit)" |

### 2. Dungeon Per-Encounter Time Cost

**Problem:** Full floor time (6-22 hours) was charged upfront when entering a floor. Once inside, all encounters (Fight, Continue Deeper, etc.) were free, making it impossible to leave mid-floor and do other things.

**Fix:** Time is now charged per encounter. Entry costs one encounter's worth of time. Each "Continue Deeper" costs another encounter's time. Players can leave if they run out of time (keeping all earned gold, no retreat penalty).

| Floor | Total Time | Per Encounter (4 enc.) |
|-------|-----------|----------------------|
| F1 Entrance Cavern | 6h (4h reduced) | 2h (1h reduced) |
| F2 Goblin Tunnels | 10h (8h reduced) | 3h (2h reduced) |
| F3 Undead Crypt | 14h (12h reduced) | 4h (3h reduced) |
| F4 Dragon's Lair | 18h (16h reduced) | 5h (4h reduced) |
| F5 The Abyss | 22h (20h reduced) | 6h (5h reduced) |

**New "Leave Dungeon" option:** When player doesn't have enough time for the next encounter, "Continue Deeper" is replaced with "Leave Dungeon" — player keeps all gold earned so far (no 50% retreat penalty).

**AI unaffected:** Grimwald AI still uses `autoResolveFloor()` which resolves all encounters at once, spending the full floor time upfront (equivalent to all encounters combined).

### Files Changed
- `src/components/game/GuildHallPanel.tsx` — pre-calculate market wages on employer select, display market wage in listing
- `src/components/game/CombatView.tsx` — accept `onSpendTime`/`encounterTimeCost` props, charge time per encounter, add Leave Dungeon option
- `src/components/game/CavePanel.tsx` — charge per-encounter time on entry, pass time props to CombatView, show per-encounter time in floor cards
- `src/data/dungeon.ts` — added `getEncounterTimeCost()` helper function
- TypeScript compiles cleanly, build succeeds, 91 tests pass

---

## 2026-02-06 - Screen Size Audit & Responsive Layout Fix

Fixed layout compression on non-16:9 screens (e.g. 1920×1200 laptops) and improved space utilization.

### Problem
- Game used a rigid 16:9 aspect ratio lock (`min(100vw, 177.78vh)` × `min(100vh, 56.25vw)`)
- On 1920×1200 (16:10): rendered at 1920×1080, wasting 120px vertically
- Side panels were inside the lock, losing height on taller screens
- Center info panel content was compressed with large padding/margins

### Layout Restructure
| Change | Before | After |
|--------|--------|-------|
| Outer container | 16:9 locked, centered | Full viewport (100vw × 100vh) |
| Side panels | Inside 16:9 box, limited height | Outside aspect lock, full viewport height |
| Board area | Fixed 76% of 16:9 container | Flex-1 with `aspect-ratio: 1216/900`, `max-height: 100%` |
| Board proportions | 1459×1080 on 1920 wide | Identical (aspect ratio preserved) |
| Zone alignment | Calibrated for board div | Unchanged (same board dimensions) |

### Resolution Behavior
| Resolution | Side Panel Height | Board Size | Notes |
|------------|------------------|------------|-------|
| 1920×1080 (16:9) | 1080px | 1459×1080 | Identical to before |
| 1920×1200 (16:10) | **1200px** (+120) | 1459×1080 | Side panels gain 120px |
| 2560×1440 (16:9) | 1440px | 1946×1440 | Fills perfectly |
| 1440×900 (16:10) | **900px** | 1094×810 | Panels use full height |

### Center Panel & Content
| Change | Before | After |
|--------|--------|-------|
| Center panel height | 53.4% of board | 55.5% (+2.1%) |
| Center panel top | 23.4% | 22.5% |
| ResourcePanel padding | p-4, mb-4 | p-3, mb-2 |
| Resource cards | p-2, text-lg values | p-1.5, text-base values |
| Resource grid gap | gap-2 | gap-1.5 |
| LocationPanel padding | p-4, mb-3 header | p-3, mb-2 header |
| Location header | text-xl, w-6 icon | text-lg, w-5 icon |
| Footer hint | text-xs, mt-2 pt-2 | text-[10px], mt-1 pt-1 |

### Files Changed
- `src/components/game/GameBoard.tsx` — layout restructure, center panel defaults
- `src/components/game/ResourcePanel.tsx` — compact padding, smaller resource cards
- `src/components/game/LocationPanel.tsx` — compact header and padding

---

## 2026-02-06 - Deferred Issues Batch Fix + AI Improvements

Major batch of fixes covering deferred issues, new AI actions, dungeon RPG improvements, and bug fixes.

### Bug Fixes
| Issue | Fix |
|-------|-----|
| Newspaper close button | `onClose` now clears `currentNewspaper` state — Dialog `open` prop was stuck true |
| Sickness cure not working | Added `cureSickness` store action — `onCureSickness` handler now sets `isSick = false` |
| Fence purchases not going to inventory | Used sword/shield from fence now added to durables and auto-equipped |
| "Sick - Visit Healer!" unclear | Updated text to "Sick - Visit Enchanter (Cure Ailments)!" |

### Game Mechanics
| Feature | Details |
|---------|---------|
| H7: MAX_FLOOR_ATTEMPTS | Enforced 2 dungeon runs per turn limit. Added `dungeonAttemptsThisTurn` to Player, reset at turn start |
| Cave access gating | Require at least 1 completed degree to enter dungeon. Shows lock screen with guidance |
| B2: Quest rewards rebalanced | E-rank: +67%, D-rank: +65%, C-rank: +75%, B-rank: +60%, A-rank: +70%, S-rank: +67% |
| B6: Cooking Fire nerfed | Now triggers every other week (even weeks only), halving effective bonus from +1/turn to +0.5/turn |
| RPG equipment system | No armor: +50% damage taken. No weapon: -70% gold earned. Combat shows penalties in bonuses |

### UI Changes
| Change | Details |
|--------|---------|
| Player header brown text | SideInfoTabs header changed from dark wood to parchment background with `text-wood-dark` |
| Guild rank visibility | Guild rank shown under name in `text-wood-dark/70` matching rest of panel |

### AI Improvements (AI-2 through AI-8, AI-12)
| Issue | Implementation |
|-------|---------------|
| AI-2: Sickness cure | Priority 92 when sick, travels to enchanter, pays 75g for cure |
| AI-3: Loan system | Takes 200g emergency loan when gold<20 and savings<20; repays when gold exceeds loan+100 |
| AI-4: Stock market | Medium/hard AI invests excess gold in stocks; sells when broke or doesn't need wealth |
| AI-5: Fresh food | Buys fresh food (25g/2 units) when has Preservation Box and stock<3 |
| AI-6: Weekend tickets | Buys tickets (jousting/theatre/bard) when happiness is weakest goal and gold>150 |
| AI-7: Selling/pawning | Pawns appliances when desperate (gold<10 with loan); sells inventory items when gold<20 |
| AI-8: Lottery tickets | Buys 5g ticket when gold>100 and week>3 (low priority=25) |
| AI-12: Route optimization | Boosts move priority +5 per extra need at same location (multi-need routing) |
| H9: AI dungeon health | AI checks dungeonAttemptsThisTurn>=2, health>20, and cave access before dungeon |

### Files Changed
- `src/components/game/LocationPanel.tsx` — newspaper close, sickness cure, fence purchases
- `src/components/game/CavePanel.tsx` — dungeon attempts limit, cave access gating
- `src/components/game/SideInfoTabs.tsx` — brown text styling, sick text update
- `src/components/game/PlayerInfoPanel.tsx` — sick text update
- `src/store/helpers/playerHelpers.ts` — added `cureSickness` action
- `src/store/storeTypes.ts` — added `cureSickness` type
- `src/store/gameStore.ts` — added `dungeonAttemptsThisTurn` to createPlayer
- `src/store/helpers/turnHelpers.ts` — reset dungeon attempts, cooking fire nerf
- `src/types/game.types.ts` — added `dungeonAttemptsThisTurn` to Player
- `src/data/dungeon.ts` — MAX_FLOOR_ATTEMPTS_PER_TURN = 2
- `src/data/combatResolver.ts` — no-equipment damage/gold penalties
- `src/data/quests.ts` — rebalanced all quest rewards
- `src/hooks/ai/types.ts` — 9 new AIActionType values
- `src/hooks/useGrimwaldAI.ts` — 9 new action handlers + dungeon health tracking
- `src/hooks/ai/actionGenerator.ts` — decision logic for all new AI actions + route optimization

---

## 2026-02-06 - Music Placeholder Files

Added placeholder MP3 files to `public/music/` folder for the audio system.

### Files Created
| File | Purpose |
|------|---------|
| `01MainTheme.mp3` | Title screen, game setup |
| `02OnTheStreet.mp3` | Default in-game track |
| `03guildhall.mp3` | Guild Hall location |
| `06Bank.mp3` | Bank location (new) |
| `09TheSlums.mp3` | The Slums location |
| `11EnchantersWorkshop.mp3` | Enchanter's Workshop |
| `13rustytankard.mp3` | Rusty Tankard tavern |
| `18OhWhatAWeekend.mp3` | Victory/weekend screen |

### Config Updated
- Added Bank track to `MUSIC_TRACKS` in musicConfig.ts
- Added Bank location mapping to `LOCATION_MUSIC`

---

## 2026-02-06 - Audio & Music System

Added a complete background music system with smooth crossfade transitions between tracks.

### Architecture
- `src/audio/audioManager.ts` — Singleton AudioManager with dual-deck (A/B) crossfade engine
- `src/audio/musicConfig.ts` — Track definitions, location-to-music mapping, screen-level music mapping
- `src/hooks/useMusic.ts` — React hooks: `useMusicController` (drives music from game state), `useAudioSettings` (volume/mute controls)

### Features
- **Crossfade transitions** (1.5s) between tracks when changing locations or screens
- **Location-specific music**: Guild Hall, The Slums, Enchanter's Workshop, Rusty Tankard each have unique tracks
- **Screen music**: Main Theme on title/setup screens, "Oh What a Weekend" on victory screen
- **Default game track**: "On the Street" plays for locations without a specific track
- **50% default volume** as baseline
- **Volume slider + mute toggle** in Options tab (RightSideTabs)
- **Mute button** on TitleScreen (next to dark mode toggle)
- **Keyboard shortcut**: M to toggle mute during gameplay
- **Persistent settings** — volume and mute state saved to localStorage (`guild-life-audio-settings`)
- **Autoplay-safe** — gracefully handles browser autoplay restrictions

### Music Tracks (MP3 files in `public/music/`)
| File | Context |
|------|---------|
| `01MainTheme.mp3` | Title screen, game setup |
| `02OnTheStreet.mp3` | Default in-game (no location-specific track) |
| `03guildhall.mp3` | Guild Hall location |
| `09TheSlums.mp3` | The Slums location |
| `11EnchantersWorkshop.mp3` | Enchanter's Workshop location |
| `13rustytankard.mp3` | Rusty Tankard location |
| `18OhWhatAWeekend.mp3` | Victory screen |

### Files Modified
- `src/pages/Index.tsx` — Added `useMusicController` hook
- `src/components/screens/TitleScreen.tsx` — Added mute toggle button
- `src/components/game/GameBoard.tsx` — Added M keyboard shortcut for mute
- `src/components/game/RightSideTabs.tsx` — Added Music section to Options tab with volume slider and mute

### Files Created
- `src/audio/audioManager.ts`
- `src/audio/musicConfig.ts`
- `src/hooks/useMusic.ts`
- `public/music/` (directory for MP3 files)

### Build & Tests
- TypeScript compiles cleanly (`tsc --noEmit`)
- Vite build succeeds
- All 91 tests pass

---

## 2026-02-06 - Fix 52 Bugs from Full Game Audit

Applied fixes for 52 issues found during the full game audit using 5 parallel fix agents.

### Files Modified (13)
`turnHelpers.ts`, `economyHelpers.ts`, `workEducationHelpers.ts`, `questHelpers.ts`, `storeTypes.ts`, `useGrimwaldAI.ts`, `actionGenerator.ts`, `ai/types.ts`, `locations.ts`, `combatResolver.ts`, `game.types.ts`, `VictoryScreen.tsx`, `QuestPanel.tsx`

### Critical Bugs Fixed: 14/14
| Bug | Fix |
|-----|-----|
| C1: Missing 2h entry cost | `getMovementCost` returns `pathDistance + 2` |
| C2: AI immune to startTurn | Removed `player.isAI` guard; AI gets all penalties |
| C3: Broken rent prepayment | `processWeekEnd` decrements `rentPrepaidWeeks` before incrementing `weeksSinceRent` |
| C4: `lockedRent` ignored | Rent uses `lockedRent > 0 ? lockedRent : RENT_COSTS[housing]` |
| C5: No death check in processWeekEnd | Inline death check loop after week-end processing |
| C6: 44% quests inaccessible | `completeDegree` now updates legacy `education` field via `DEGREE_TO_PATH` mapping |
| C7: Buy with 0 gold | Added `if (p.gold < cost) return p;` to all 9 purchase actions |
| C8: eventMessage overwrite | `startTurn` collects into `eventMessages[]` array, joins at end |
| C9: Home location binary | `getHomeLocation()` handles all 4 tiers (noble/modest/slums/homeless) |
| C10: Stale player data | Re-read `currentPlayer` from `get()` after doctor visit gold changes |
| C11: Lottery +925% EV | Grand: 2%/5000g → 0.1%/500g, Small: 5%/50g → 5.9%/20g (EV: 1.68g per 10g) |
| C12: Infinite wages | Cap at `3x job.baseWage` in `requestRaise` |
| C13: Double-charge breakage | Breakage only marks broken + -1 happiness; no auto gold charge |
| C14: AI hardcoded prices | All AI actions use `action.details` for dynamic prices |

### High Priority Bugs Fixed: 10/12
| Bug | Fix |
|-----|-----|
| H1: Eviction keeps items | Clears `durables`, `appliances`, `equipment`, `prepaid`, `lockedRent` |
| H2: VictoryScreen wealth | Added `stockValue - loanAmount` to wealth display |
| H3: Quest death check | `get().checkDeath(playerId)` after completeQuest |
| H4: QuestPanel missing param | Passes `player.dungeonFloorsCleared` to `canTakeQuest()` |
| H5: Rent partial pay | `if (p.gold < rentCost) return p;` |
| H6: Free education | Gold + time validation in `studyDegree`/`studySession` |
| H8: Per-player crash | Market crash now single global roll (moved outside player loop) |
| H10: AI relaxation | Rest action calls `modifyRelaxation` |
| H11: AI career quests | Career switch case adds quest-taking for guild rank |
| H12: Dual items | AI uses explicit `cost` in action details |

### Balance Fixes: 8/10
| Issue | Fix |
|-------|-----|
| B1: Loan death spiral | Interest capped at `Math.min(loanAmount, 2000)` |
| B3: Free retreat farming | `retreatFromDungeon` forfeits 50% gold |
| B4: Noble rent 500g | Reduced to 350g in `RENT_COSTS` |
| B5: Unconditional dep decay | Only decays if `!p.currentJob` |
| B7: No invest withdrawal | Added `withdrawInvestment` with 10% penalty |
| B8: Forced weekends | "Stay Home" (+1 happiness, free) as fallback |
| B9: One-shot rare drops | Repeat clears: 20% of normal drop rate |
| B10: 200-quest guild master | Flattened to 3/8/15/25/40/60 |

### AI Improvements: 8/16
| Gap | Fix |
|-----|-----|
| AI-1: No healing | Added `heal` action type in actionGenerator + useGrimwaldAI |
| AI-9: Graduation only when edu weak | Opportunistic graduation check always runs at Academy |
| AI-10: Only Rusty Tankard food | Added Shadow Market as food source |
| AI-11: Single appliance | Priority list: Cooking Fire > Scrying Mirror > Preservation Box |
| AI-13: Can't downgrade housing | Added `downgrade-housing` action when broke |
| AI-14: efficiencyWeight unused | Dynamic prices via `action.details` |
| AI-15: Career quest gap | Career case now takes quests for guild rank |
| AI-16: Wrong clothing location | Uses closest of Armory/General Store |

### Test Results
- TypeScript: Compiles cleanly
- Tests: 91/91 pass
- 13 files changed, +394/-117 lines

---

## 2026-02-06 - Full Game Audit (Agent Playthrough Analysis)

Conducted a comprehensive audit of the entire game using 6 specialized analysis agents, each focusing on a different subsystem. Agents read all source code and simulated full playthroughs to find bugs, exploits, balance issues, and missing features.

### Methodology
- Agent 1: Turn system, movement, starvation, homeless logic
- Agent 2: Grimwald AI decision engine and strategy
- Agent 3: All 14 location panels and their UI/actions
- Agent 4: Economy systems (stocks, loans, banking, work, shopping)
- Agent 5: Dungeon, combat, quest, and equipment systems
- Agent 6: Victory conditions, death mechanics, edge cases, game setup

---

### CRITICAL BUGS (14 issues)

#### C1: Missing 2-hour location entry cost
**Files:** `src/data/locations.ts:278`, `src/components/game/GameBoard.tsx:286`
Jones reference and CLAUDE.md both state "Entering locations costs 2 hours." The `getMovementCost()` function only returns path distance (1hr/step). The +2 entry cost is never applied anywhere. Players get 6-8 extra hours per turn.
**Fix:** Add `+ 2` to `getMovementCost()` when `from !== to`.

#### C2: AI immune to all startTurn penalties
**File:** `src/store/helpers/turnHelpers.ts:104`
`if (!player || player.isAI) return;` causes AI to bypass: starvation (-20h), doctor visits (-10h/-4hap/-gold), homeless penalties (-5hp/-8h), apartment robbery, appliance breakage, cooking fire bonus, and arcane tome income. AI gets up to 63% more effective time per turn.
**Fix:** Remove `player.isAI` guard. Suppress UI messages for AI separately.

#### C3: Rent prepayment system non-functional
**Files:** `src/store/helpers/economyHelpers.ts:240`, `src/store/helpers/turnHelpers.ts:519`
`rentPrepaidWeeks` is set by `prepayRent()` but never consumed. `processWeekEnd` unconditionally increments `weeksSinceRent += 1` and never checks `rentPrepaidWeeks`. Players who prepay rent still get eviction warnings and garnishment.
**Fix:** In `processWeekEnd`, check `rentPrepaidWeeks > 0`, decrement it, and skip `weeksSinceRent` increment.

#### C4: `lockedRent` field never used in calculations
**File:** `src/store/helpers/turnHelpers.ts:387`
Rent debt uses `RENT_COSTS[p.housing]` ignoring `p.lockedRent`. Players who lock in a favorable rent rate get no benefit.
**Fix:** Use `p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing]`.

#### C5: `processWeekEnd` can kill players without `checkDeath`
**File:** `src/store/helpers/turnHelpers.ts:370,432`
Health reduced by starvation (-10) and sickness (-15) in processWeekEnd, but `checkDeath` is never called. Players at 0 HP continue playing. Non-current players in multiplayer never get resurrection check.
**Fix:** Call `checkDeath` for all players at end of `processWeekEnd`.

#### C6: 44% of quests permanently inaccessible
**Files:** `src/data/quests.ts:260-285`, `src/store/helpers/workEducationHelpers.ts:170`
Quest `requiredEducation` checks old path-based `education` field (`fighter`, `mage`, `priest`, `business`), but the degree system (`completeDegree`) never updates this field. 8 of 18 quests are permanently blocked.
**Fix:** Map degree completions to legacy education fields, or rewrite quests to use `DegreeId`.

#### C7: Purchases succeed with insufficient gold
**File:** `src/store/helpers/economyHelpers.ts:64-76,95-108,136-178`
`buyItem`, `buyDurable`, `buyAppliance`, `repairAppliance`, `prepayRent`, `moveToHousing`, `buyFreshFood`, `buyLotteryTicket`, `buyTicket` all use `Math.max(0, p.gold - cost)` without checking `p.gold >= cost`. Items are added unconditionally.
**Fix:** Add `if (p.gold < cost) return p;` guard to all purchase actions.

#### C8: Multiple `eventMessage` overwrites in `startTurn`
**File:** `src/store/helpers/turnHelpers.ts:144-310`
6+ independent `set()` calls each overwrite `eventMessage`. If starvation AND doctor AND homeless happen, only the last message shows. `processWeekEnd` does this correctly with an array.
**Fix:** Collect messages into array, join at end (like `processWeekEnd`).

#### C9: Home location ignores `modest` and `homeless` tiers
**File:** `src/store/helpers/turnHelpers.ts:86,107,561`
`housing === 'noble' ? 'noble-heights' : 'slums'` sends `modest` and `homeless` players to slums. Appears in 6+ places.
**Fix:** Extract to `getHomeLocation(housing)` utility handling all 4 tiers.

#### C10: `startTurn` reads stale player data
**File:** `src/store/helpers/turnHelpers.ts:103,252`
Player captured once at line 103. After starvation doctor visit costs 200g, appliance breakage check at line 252 still sees old gold value. Breakage triggers when it shouldn't.
**Fix:** Re-read player from `get()` after each major `set()`, or batch all effects into single `set()`.

#### C11: Lottery expected value is +925%
**File:** `src/store/helpers/turnHelpers.ts:492-513`
10g ticket: 2% chance of 5000g (EV=100g) + 5% chance of 50g (EV=2.5g) = 102.5g EV per 10g ticket. Players should buy unlimited tickets every week.
**Fix:** Reduce grand prize to ~200g, or set drop to 0.1%, or cap tickets per week.

#### C12: No wage cap on raises
**File:** `src/store/helpers/workEducationHelpers.ts:86`
`newWage = player.currentWage + Math.ceil(player.currentWage * 0.15)` with no cap. After 20 raises from 25g/hr: ~406g/hr. Only 3 shifts needed between raises.
**Fix:** Cap at 2-3x base wage for the job.

#### C13: Double-charge on appliance breakage
**File:** `src/store/helpers/turnHelpers.ts:261-278`
Appliance breaks: auto-charges repair cost AND marks as broken. Player must then call `repairAppliance` which charges again. Double payment.
**Fix:** Either auto-repair (charge once) or just mark broken (don't auto-charge).

#### C14: AI uses hardcoded/fabricated prices
**Files:** `src/hooks/useGrimwaldAI.ts:86-91,175-180,95-101,188`
Food: 8g/25food (real best: 6g/10food). Appliances: always 300g (real: 200-1599g). Clothing: 30g/30pts (real cheapest: 25g/50pts). Housing: 50/200g (real varies). AI bypasses item system entirely.
**Fix:** Use actual item data and store actions.

---

### HIGH PRIORITY BUGS (12 issues)

#### H1: Eviction doesn't clear appliances or equipment
`processWeekEnd` eviction clears `inventory` but not `durables`, `appliances`, `equippedWeapon/Armor/Shield`. `evictPlayer` in questHelpers clears `durables` but also not appliances/equipment. Inconsistent "lose all possessions."

#### H2: VictoryScreen wealth calculation wrong
**File:** `src/components/screens/VictoryScreen.tsx:46`
Shows `gold + savings + investments`, missing `stockValue` and `loanAmount`. Doesn't match `checkVictory` formula.

#### H3: No `checkDeath` after quest completion
**File:** `src/store/helpers/questHelpers.ts:38-67`
`completeQuest` can set health to 0 via `healthLoss` but never calls `checkDeath`. Player continues acting at 0 HP.

#### H4: QuestPanel doesn't pass `dungeonFloorsCleared`
**File:** `src/components/game/QuestPanel.tsx:85-89`
5th parameter omitted in `canTakeQuest()`. Dungeon quests always show as locked even after clearing floors.

#### H5: `payRent` allows partial payment
**File:** `src/store/helpers/economyHelpers.ts:14-26`
Player with 1g can "pay" 75g rent. Gold goes to 0, `weeksSinceRent` resets. Eviction timer resets for free.

#### H6: Free education with 0 gold
**File:** `src/store/helpers/workEducationHelpers.ts:152-167`
`studyDegree` uses `Math.max(0, p.gold - cost)` without gold validation. 0g player gets free degrees.

#### H7: `MAX_FLOOR_ATTEMPTS_PER_TURN` defined but never enforced
**File:** `src/data/dungeon.ts:908`
Constant exists but not checked. Players can run unlimited dungeon floors per turn.

#### H8: Market crash checked per-player, not globally
**File:** `src/store/helpers/turnHelpers.ts:346-363`
`checkMarketCrash` called independently per player. In 4-player game, chance of any crash event quadruples. Should be single global roll.

#### H9: AI dungeon health tracking bug
**File:** `src/hooks/useGrimwaldAI.ts:258-259`
Uses `totalDamage - totalHealed` instead of `startHealth - finalHealth`. Due to health capping, actual damage can differ. AI can have wrong health after dungeon runs.

#### H10: AI rest doesn't increase relaxation
**File:** `src/hooks/useGrimwaldAI.ts:196-202`
Rest action gives happiness but never calls `modifyRelaxation`. AI relaxation decays to minimum (10) permanently.

#### H11: AI career strategy doesn't advance guild rank via quests
**File:** `src/hooks/ai/actionGenerator.ts:254-300`
Career switch case only handles getting jobs and working. Career goal requires guild rank, which requires completing quests. AI never prioritizes quests for career.

#### H12: Dual item definitions (preservation-box, scrying-mirror)
**File:** `src/data/items.ts`
`preservation-box` appears in APPLIANCES (876g) and ENCHANTER_ITEMS (175g). `scrying-mirror` in APPLIANCES (525g) and items (350g). Conflicting canonical prices.

---

### BALANCE ISSUES (10 issues)

#### B1: Loan interest at 10% weekly compound creates death spiral
1000g loan becomes 2146g in 8 weeks. Default extends 4 weeks with continued compounding. Unrecoverable debt trap.
**Suggestion:** Cap interest at 2x original loan.

#### B2: S-rank quests consume nearly 2 full turns
80-100 hours for 200-300g. Dungeon Floor 5 gives 250-600g in 22 hours. Quests are 5-15x less profitable than dungeons.
**Suggestion:** Increase quest rewards 2-3x or add unique rewards.

#### B3: Zero-cost retreat dungeon farming exploit
`RETREAT_HAPPINESS_PENALTY = 0`. Players farm encounters 1-3, retreat before boss, keep all gold. Floor 5 retreat run: 300-400g in 22h risk-free.
**Suggestion:** Forfeit 50% gold on retreat.

#### B4: Noble Heights rent (500g/week) nearly impossible
Top job 25g/hr. 6h shift with bonus = 175g. Need ~3 shifts just for rent. Total 120h/week of work for rent alone (60h available).
**Suggestion:** Reduce to 350g/week.

#### B5: Dependability decays -5/week unconditionally
Work gives +2/shift. Need 3+ shifts/week just to maintain. Very harsh treadmill.
**Suggestion:** Only decay if player didn't work that week.

#### B6: Cooking Fire (+1 happiness/turn) is overpowered
200g one-time cost for permanent +1/turn. Over 20 turns: +20 happiness for free.
**Suggestion:** Add diminishing returns or cap at 50 uses.

#### B7: Investment withdrawal impossible
`invest()` exists but no `withdrawInvestment()`. Invested gold is permanently locked. Only counts toward wealth goal.
**Suggestion:** Add withdrawal with 10% early penalty.

#### B8: Weekend activities are mandatory and can drain gold
Random weekends cost 5-100g with no opt-out. Poor players can be forced into 100g Royal Banquet.
**Suggestion:** Add "Stay Home" free option.

#### B9: Rare drops only roll on first clear (5% one-shot)
77.4% of players will never see any rare drop across all 5 floors. Missed drops permanently unobtainable.
**Suggestion:** Allow reduced rate on repeat clears (e.g., 1%).

#### B10: Guild rank progression is exponentially steep
Requirements: 3, 10, 25, 50, 100, 200 quests. Guild Master requires 200 quests. At ~7h/quest average: 1400 hours = 24 full turns.
**Suggestion:** Flatten curve to 3, 8, 15, 25, 40, 60.

---

### AI MISSING BEHAVIORS (16 issues)

| # | Missing Behavior | Impact |
|---|-----------------|--------|
| AI-1 | No health recovery/healing action | AI slowly dies from accumulated damage |
| AI-2 | No sickness cure action | 5% chance/week sickness, never cured |
| AI-3 | No loan system usage | Can't survive debt emergencies |
| AI-4 | No stock market trading | Misses wealth accumulation |
| AI-5 | No fresh food management | Never buys Preservation Box or fresh food |
| AI-6 | No weekend ticket purchases | Misses happiness from 25-50g tickets |
| AI-7 | No item selling/pawning | Can't liquidate assets in emergency |
| AI-8 | No lottery tickets | Misses positive-EV lottery (until fixed) |
| AI-9 | Graduation only when education is weakest goal | Misses free +5hap/+5dep from ready degrees |
| AI-10 | Only buys food at Rusty Tankard | Wastes hours traveling past closer food |
| AI-11 | Only buys `scrying-mirror` appliance | Misses Cooking Fire (+1hap/turn), other appliances |
| AI-12 | No route optimization | Wastes hours on redundant travel |
| AI-13 | Can't downgrade housing when broke | Stuck paying unaffordable rent |
| AI-14 | `efficiencyWeight` setting never used | Has no effect on AI behavior |
| AI-15 | `priceModifier` parameter never used | AI ignores economy fluctuations |
| AI-16 | AI clothing location wrong | Tries General Store, clothing sold at Armory |

---

### LOCATION PANEL ISSUES (Selected)

| Location | Issue |
|----------|-------|
| **ForgePanel** | Every work click re-applies for job. Earnings display shows 1.33x but actual is 1.15x. No raise button. |
| **BankPanel** | Hardcoded 50g deposit/withdraw amounts. No custom amounts. Investment has no withdrawal. Stock trades cost no time. |
| **GeneralStore** | Durable items with `relaxation` effect type are ignored (only `happiness` and `food` handled). |
| **PawnShop** | Gambling gives no win/loss feedback. Used weapons/shields purchased but not added to durables. |
| **HealerPanel** | "Cure Ailments" button exists but sickness cure mechanics are unclear. Costs don't scale with priceModifier. |
| **LandlordPanel** | Prepaid weeks displayed but non-functional (C3). Moving cost = 2x monthly rent is inconsistent. |
| **HomePanel** | Relax/Sleep can be spammed infinitely for happiness. No cooldown. |
| **ShadowMarket** | "Market Intel" item does nothing when purchased. |
| **QuestPanel** | Uses old `player.education` system, not `completedDegrees` (C6). Missing `dungeonFloorsCleared` param (H4). |

---

### MISSING FEATURES (Jones Reference Gaps)

| Feature | Jones Behavior | Current Implementation |
|---------|---------------|----------------------|
| **Location entry cost** | +2 hours entering any building | Not implemented |
| **0-hour free actions** | Can buy/deposit at 0 hours inside location | Turn auto-ends at 0 hours |
| **Auto rent deduction** | Rent deducted automatically each week | Must visit Landlord manually |
| **Food spoilage doctor** | Spoilage triggers doctor visit | Only starvation/relaxation trigger it |
| **Turn end on location exit** | Turn ends when leaving at 0 hours | Turn ends immediately at 0 hours |
| **Priest education path** | Priest degrees exist in quests | No priest degrees in degree system |

---

### FILES AUDITED (40+ files)

**Store:** `gameStore.ts`, `storeTypes.ts`, `turnHelpers.ts`, `economyHelpers.ts`, `workEducationHelpers.ts`, `questHelpers.ts`, `playerHelpers.ts`
**AI:** `useGrimwaldAI.ts`, `useAI.ts`, `ai/actionGenerator.ts`, `ai/strategy.ts`, `ai/types.ts`
**Data:** `dungeon.ts`, `combatResolver.ts`, `quests.ts`, `items.ts`, `education.ts`, `jobs/definitions.ts`, `jobs/utils.ts`, `locations.ts`, `events.ts`, `stocks.ts`, `weekends.ts`, `housing.ts`, `shadowfingers.ts`, `newspaper.ts`, `saveLoad.ts`
**Components:** All 14 location panels, `GameBoard.tsx`, `CombatView.tsx`, `LocationPanel.tsx`, `GoalProgress.tsx`, `VictoryScreen.tsx`, `GameSetup.tsx`, `TutorialOverlay.tsx`
**Types:** `game.types.ts`
**Tests:** All 6 test files (91 tests)

### Build Status
- TypeScript: Compiles cleanly (`tsc --noEmit`)
- Tests: 91/91 pass (`vitest run`)
- No new code changes in this audit (research only)

---

## 2026-02-06 - Zone Editor localStorage Persistence

Added localStorage persistence to the Zone Editor tool so zone positions, center panel config, and movement paths survive page reloads.

### Problem
Zone Editor changes were lost on page reload. The only way to preserve edits was to click "Copy Config" and manually paste the output into `src/data/locations.ts`. This made iterative zone positioning tedious.

### Implementation
- **New file:** `src/data/zoneStorage.ts` — save/load/clear/check utility using `guild-life-zone-config` localStorage key
  - `saveZoneConfig()` — serializes zones, centerPanel, paths with timestamp
  - `loadZoneConfig()` — deserializes with validation
  - `clearZoneConfig()` — removes saved data (reset to defaults)
  - `hasSavedZoneConfig()` — existence check
- **GameBoard.tsx changes:**
  - `customZones` and `centerPanel` state initializers read from localStorage
  - `useEffect` on mount applies saved `MOVEMENT_PATHS`
  - `handleSaveZones()` now calls `saveZoneConfig()` + shows toast confirmation
  - New `handleResetZones()` clears localStorage and restores hardcoded defaults
  - Passes `initialZones`, `initialPaths`, `onReset` props to ZoneEditor
- **ZoneEditor.tsx changes:**
  - New props: `initialZones`, `initialPaths`, `onReset`
  - Initializes state from props (persisted values) instead of hardcoded `ZONE_CONFIGS`
  - "Apply" button renamed to "Apply & Save" (now persists to localStorage)
  - "Reset Defaults" button (yellow) — only shown when saved config exists, clears localStorage and resets editor state

### Files Modified (2)
| File | Change |
|------|--------|
| `src/components/game/GameBoard.tsx` | Load from localStorage on mount, save on apply, reset handler, pass props |
| `src/components/game/ZoneEditor.tsx` | Accept initial state props, Reset Defaults button, renamed Apply button |

### Files Created (1)
| File | Purpose |
|------|---------|
| `src/data/zoneStorage.ts` | Zone editor localStorage persistence utility |

### Build Verification
- TypeScript compiles cleanly (`tsc --noEmit`)
- All 91 tests pass (`vitest run`)
- Vite build succeeds

## 2026-02-06 - Technical Debt Batch E (5 items)

Addressed all 5 technical debt items from the code audit.

### E1: Real Unit Tests (Large)
**Problem:** Zero test coverage — only `expect(true).toBe(true)` placeholder existed.
**Implementation:**
- **91 real tests** across 5 test files replacing the single placeholder
- `victory.test.ts` (8 tests): checkVictory with all goal types, wealth calculation (gold+savings+investments+stocks-loans), education via completedDegrees, career rank indexing, edge cases
- `economy.test.ts` (28 tests): depositToBank, withdrawFromBank, invest, takeLoan, repayLoan, buyStock, sellStock — all with input validation tests (negative, zero, NaN, Infinity, exceeding balance)
- `work.test.ts` (12 tests): workShift earnings, 15% efficiency bonus, currentWage usage, dependability/experience increases, happiness penalty scaling (weeks 1-3/4-8/9+), permanentGoldBonus, garnishment, shiftsWorkedSinceHire
- `education.test.ts` (16 tests): canEnrollIn, getAvailableDegrees, studyDegree, completeDegree, graduation bonuses, prerequisite chains, degree data integrity
- `gameActions.test.ts` (26 tests): Game setup defaults, player actions (movePlayer, modifyGold/Health/Happiness), buyGuildPass, death/resurrection, stock market pure functions, job system pure functions, eviction
- **Files:** `src/test/victory.test.ts`, `src/test/economy.test.ts`, `src/test/work.test.ts`, `src/test/education.test.ts`, `src/test/gameActions.test.ts`, `src/test/example.test.ts` (updated)

### E2: Deduplicate GUILD_PASS_COST (Small)
**Problem:** `questHelpers.ts` defined a local `const GUILD_PASS_COST = 500` instead of importing from `game.types.ts`.
**Fix:** Removed local constant, added import from `@/types/game.types`.
- **File:** `src/store/helpers/questHelpers.ts`

### E3: Input Validation on Banking Actions (Medium)
**Problem:** Banking functions accepted negative, NaN, Infinity amounts; could create inconsistent state.
**Fix:** Added validation guards to 7 functions:
- `depositToBank`: Rejects amount ≤ 0 / non-finite; clamps to available gold
- `withdrawFromBank`: Rejects amount ≤ 0 / non-finite; clamps to available savings
- `invest`: Rejects amount ≤ 0 / non-finite; clamps to available gold
- `buyStock`: Rejects shares ≤ 0 / non-finite; validates stock ID exists with valid price
- `sellStock`: Rejects shares ≤ 0 / non-finite
- `takeLoan`: Rejects amount ≤ 0 / non-finite / > 1000; no-ops when outstanding loan
- `repayLoan`: Rejects amount ≤ 0 / non-finite; no-ops when no outstanding loan
- **File:** `src/store/helpers/economyHelpers.ts`

### E4: LocationId Type Safety (Medium)
**Problem:** `events.ts` used `string` for housing/location parameters instead of `LocationId`/`HousingTier`.
**Fix:**
- `GameEvent.conditions.housing` → `HousingTier[]`
- `GameEvent.conditions.location` → `LocationId[]`
- `checkForEvent()` parameters → `HousingTier`, `LocationId`
- `checkWeeklyTheft()` parameter → `HousingTier`
- Removed unused `LegacyJob` interface from `jobs/types.ts`
- Removed unused `EducationPath` import from `jobs/types.ts`
- **Note:** Job `location` field intentionally kept as `string` — it holds employer display names ("Guild Hall"), not LocationId values ("guild-hall")
- **Files:** `src/data/events.ts`, `src/data/jobs/types.ts`

### E5: Legacy Education System Cleanup (Medium)
**Problem:** Old path-based education system (fighter/mage/priest/business levels) coexisted with new Jones-style degree system. Multiple components used `Object.values(player.education).reduce()` which read the OLD system, while victory conditions used `completedDegrees` (NEW system).
**Fix:**
- `RightSideTabs.tsx`: Changed education progress to `player.completedDegrees.length * 9` (matches checkVictory)
- `TurnOrderPanel.tsx`: Same fix
- `education.ts`: Removed dead legacy compatibility code:
  - `PATH_TO_DEGREES` mapping (unused)
  - `EDUCATION_PATHS` backwards-compat structure (unused)
  - `getCourse()`, `getNextCourse()`, `getTotalEducationLevel()` (all unused)
  - Removed `EducationPath` re-export
- **Files:** `src/components/game/RightSideTabs.tsx`, `src/components/game/TurnOrderPanel.tsx`, `src/data/education.ts`
- **Note:** `education` and `educationProgress` fields on Player kept for now — still used by quest `requiredEducation` checks in `canTakeQuest()`

### Build Verification
- TypeScript compiles cleanly (`tsc --noEmit`)
- All 91 tests pass (`vitest run`)
- No new ESLint errors

### Files Modified (8)
| File | Change |
|------|--------|
| `src/store/helpers/questHelpers.ts` | Import GUILD_PASS_COST, remove local duplicate |
| `src/store/helpers/economyHelpers.ts` | Input validation on 7 banking/stock/loan functions |
| `src/data/events.ts` | LocationId/HousingTier types on functions + interface |
| `src/data/jobs/types.ts` | Remove LegacyJob, unused EducationPath import |
| `src/data/education.ts` | Remove legacy PATH_TO_DEGREES, EDUCATION_PATHS, helper functions |
| `src/components/game/RightSideTabs.tsx` | Fix education progress to use completedDegrees |
| `src/components/game/TurnOrderPanel.tsx` | Fix education progress to use completedDegrees |
| `src/test/example.test.ts` | Replace placeholder with actual environment check |

### Files Created (4)
| File | Tests |
|------|-------|
| `src/test/victory.test.ts` | 8 tests — victory condition logic |
| `src/test/economy.test.ts` | 28 tests — banking, stocks, loans with validation |
| `src/test/work.test.ts` | 12 tests — work shift earnings and bonuses |
| `src/test/education.test.ts` | 16 tests — degree system and graduation |
| `src/test/gameActions.test.ts` | 26 tests — game setup, player actions, quests, death, jobs |

---

## 2026-02-06 - Gameplay Batch C + UI/UX Batch D (10 features)

Implemented 5 gameplay improvements and 5 UI/UX enhancements.

### C1: Save/Load System (Large)
**Problem:** Game state lost on page refresh — biggest usability gap.
**Implementation:**
- Auto-save every 2 seconds during gameplay (debounced, localStorage)
- 3 manual save slots + 1 auto-save slot
- Save/Load menu accessible via Escape key or menu button in top bar
- "Continue Game" button on title screen when auto-save exists
- "Load Saved Game" browser on title screen with slot details (week, players, timestamp)
- Save & Return to Title option in game menu
- Delete saves per slot
- **Files:** `src/data/saveLoad.ts` (new), `src/components/game/SaveLoadMenu.tsx` (new), `src/store/gameStore.ts`, `src/store/storeTypes.ts`, `src/components/screens/TitleScreen.tsx`

### C2: Tutorial System (Medium)
**Problem:** No guidance for new players.
**Implementation:**
- 9-step tutorial overlay with contextual tips
- Steps: Welcome, Housing, Jobs, Food & Clothing, Movement & Time, Education, Banking, Cave & Quests, Victory
- Each step has a title, description, and practical tip
- Navigation: Next/Previous/Skip buttons
- Opt-in checkbox in Game Setup (enabled by default)
- Toggle with T key during gameplay
- Persists step position in game state
- **Files:** `src/components/game/TutorialOverlay.tsx` (new), `src/components/screens/GameSetup.tsx`, `src/types/game.types.ts`, `src/store/storeTypes.ts`

### C3: Work Happiness Penalty Rebalance (Small)
**Problem:** -2 happiness per work shift from turn 1 made early game too punishing.
**Implementation:**
- Weeks 1-3: no happiness penalty (let players get established)
- Weeks 4-8: -1 happiness per shift (mild fatigue)
- Weeks 9+: -2 happiness per shift (full penalty, same as before)
- **File:** `src/store/helpers/workEducationHelpers.ts`

### C4: AI Turn Speed Control (Medium)
**Problem:** No way to skip or speed up Grimwald's turn.
**Implementation:**
- Speed controls in AI overlay: Normal (1x), Fast (3x), Skip
- Skip instantly executes all remaining AI actions without delays
- Space bar shortcut to skip AI turn
- Speed multiplier applied to decision delay (min 50ms)
- State stored in Zustand (aiSpeedMultiplier, skipAITurn)
- **Files:** `src/hooks/useGrimwaldAI.ts`, `src/components/game/GameBoard.tsx`, `src/store/gameStore.ts`, `src/store/storeTypes.ts`, `src/types/game.types.ts`

### C5: Raise Request Improvement (Small)
**Problem:** -10 dependability on failed raise was too punishing.
**Implementation:**
- Base chance increased: 30% → 40%
- Bonus for extra shifts worked beyond minimum (+2% per extra shift, up to +20%)
- Max chance capped at 95%
- Failure penalty reduced: -10 → -3 dependability
- Friendlier denial message
- **File:** `src/store/helpers/workEducationHelpers.ts`

### D2: Tooltips (Small)
- Added title attributes to End Turn button ("End your turn (E)")
- Added title attributes to Menu button ("Game Menu (Esc)")
- Added title attributes to Dark Mode toggle
- Added keyboard shortcut hints in ResourcePanel footer

### D3: Keyboard Shortcuts (Small)
- **E** = End Turn (when not in menu/AI turn)
- **Escape** = Open/close game menu
- **Space** = Skip AI turn (during AI turn)
- **T** = Toggle tutorial
- **Ctrl+Shift+Z** = Zone editor (existing)
- **Ctrl+Shift+D** = Debug overlay (existing)

### D4: Confirmation Dialog Component (Small)
- Created reusable ConfirmDialog component with useConfirmDialog hook
- Shows cost warning for expensive actions
- Styled with parchment theme
- **File:** `src/components/game/ConfirmDialog.tsx` (new)

### D5: Dark Mode Toggle (Small)
- Dark mode CSS variables already existed; added toggle button
- Toggle on title screen (top-right) and game board (top bar)
- Persists preference to localStorage
- Defaults to dark theme (matches medieval aesthetic)
- **File:** `src/components/game/DarkModeToggle.tsx` (new)

### Type/State Changes
- **GameState fields added:** `aiSpeedMultiplier`, `skipAITurn`, `showTutorial`, `tutorialStep`
- **New store actions:** `saveToSlot`, `loadFromSlot`, `setAISpeedMultiplier`, `setSkipAITurn`, `setShowTutorial`, `setTutorialStep`
- **Auto-save subscription** added to store with 2-second debounce

### New Files (6)
| File | Purpose |
|------|---------|
| `src/data/saveLoad.ts` | Save/Load utility (serialize, slots, metadata) |
| `src/components/game/SaveLoadMenu.tsx` | In-game save/load menu modal |
| `src/components/game/TutorialOverlay.tsx` | 9-step tutorial overlay |
| `src/components/game/ConfirmDialog.tsx` | Confirmation dialog + hook |
| `src/components/game/DarkModeToggle.tsx` | Dark mode toggle button |

### Modified Files (10)
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added GameState fields for AI speed + tutorial |
| `src/store/storeTypes.ts` | Added save/load/AI/tutorial action types |
| `src/store/gameStore.ts` | Save/load/AI/tutorial state + auto-save subscription |
| `src/store/helpers/workEducationHelpers.ts` | Scaled happiness penalty, improved raise system |
| `src/hooks/useGrimwaldAI.ts` | Speed multiplier + skip support |
| `src/components/game/GameBoard.tsx` | Menu button, AI speed controls, keyboard shortcuts, dark mode, tutorial |
| `src/components/game/ResourcePanel.tsx` | Keyboard shortcut hints, End Turn tooltip |
| `src/components/screens/TitleScreen.tsx` | Continue/Load buttons, dark mode toggle |
| `src/components/screens/GameSetup.tsx` | Tutorial toggle option |

### Build Status
- TypeScript compiles cleanly (tsc --noEmit)
- Vite production build succeeds
- All tests pass

---

## 2026-02-06 - Inventory Grid System with Drag-Drop & Icons

Implemented a medieval-styled inventory grid system with custom SVG icons, drag-and-drop functionality, and hover tooltips.

### Feature: ItemIcon Component
**File:** `src/components/game/ItemIcon.tsx`

Created 40+ custom SVG icons for all game items:
- **Weapons**: Dagger, Sword, Steel Sword, Enchanted Blade
- **Armor**: Leather, Chainmail, Plate, Enchanted Plate
- **Shields**: Wood, Iron, Tower Shield
- **Food**: Bread, Cheese, Meat, Provisions, Feast, Vegetables, Ale, Stew, Roast
- **Clothing**: Peasant Garb, Common Clothes, Fine Clothes, Noble Attire, Guild Uniform
- **Appliances**: Candles, Blanket, Music Box, Furniture, Scrying Mirror, Preservation Box, Frost Chest
- **Magic Items**: Glow Orb, Warmth Stone, Healing Potion, Arcane Tome, Memory Crystal
- **Misc**: Lottery Ticket, Event Tickets

### Feature: InventoryGrid Component
**File:** `src/components/game/InventoryGrid.tsx`

- **Grid Layout**: 4x5 grid of inventory slots (20 total slots)
- **Equipment Slots**: 3 dedicated slots for Weapon, Armor, Shield at top
- **Drag & Drop**: Drag items between equipment slots and inventory
  - Draggable only for equippable items (weapons/armor/shields)
  - Drop on equipment slot to equip
  - Drop on inventory to unequip
- **Hover Tooltips**: Fixed-position tooltips showing:
  - Item name and description
  - Combat stats (Attack, Defense, Block%)
  - Broken status with warning
  - "Drag to equip" hint for equippable items
- **Visual Feedback**: 
  - Golden highlight for equipped slots
  - Accent ring when valid drop target
  - Quantity badges for stacked items
  - Broken indicator (⚠) for damaged appliances

### Integration with SideInfoTabs
- Replaced old InventoryTab with new InventoryGrid component
- Compact combat stats summary (ATK/DEF) shown below inventory grid
- Responsive design fits narrow sidebar width

### Files Created/Modified
| File | Changes |
|------|---------|
| `src/components/game/ItemIcon.tsx` | New (500 lines) - 40+ SVG item icons |
| `src/components/game/InventoryGrid.tsx` | New (400 lines) - Grid inventory with drag-drop |
| `src/components/game/SideInfoTabs.tsx` | Updated to use InventoryGrid |

---

## 2026-02-06 - Side Panel InfoTabs System (Redesign)

Moved the InfoTabs system from the center panel to the left side panel, replacing PlayerInfoPanel with a comprehensive tabbed interface that combines player stats with detailed inventory, goals, and stats views.

### Feature: SideInfoTabs Component
**Reference:** Jones in the Fast Lane left sidebar + medieval RPG inventory screens

**Implementation:**
- Created new `SideInfoTabs.tsx` component for left sidebar
- Combines quick-access resource bars at top (like original PlayerInfoPanel)
- 3-tab navigation at bottom: Inventory, Goals, Stats
- Compact design optimized for narrow sidebar width

### Quick Stats Section (Always Visible)
- Hours (with progress bar)
- Gold
- Health (with progress bar and warning at ≤20)
- Happiness (with progress bar)
- Food (with progress bar and warning at ≤25%)
- Clothing (with progress bar and warning at ≤25%)
- Dependability (warning at <30%)
- Home status
- Experience

### Inventory Tab (Compact)
- 3 equipment slots in row (Weapon, Armor, Shield)
- Combat stats summary (ATK, DEF, Block%)
- Appliances list with broken status
- Stored items list
- Fresh food storage bar
- Weekend tickets

### Goals Tab (Compact)
- Victory goal progress bars with percentage display
- Dungeon floor completion (1-5 floors)
- Quest stats and Guild Pass status

### Stats Tab
- Character info (rank, level, housing)
- Employment details (job, wage, shifts, dependability, experience)
- Finances (gold, savings, investments, loans)
- Education (completed degrees)

### Files Created/Modified
| File | Changes |
|------|---------|
| `src/components/game/SideInfoTabs.tsx` | New component (480 lines) - sidebar tabbed panel |
| `src/components/game/GoalProgress.tsx` | Added `compact` prop for sidebar use |
| `src/components/game/GameBoard.tsx` | Replaced PlayerInfoPanel with SideInfoTabs |

### Technical Notes
- GoalProgress now supports `compact` mode with smaller text and simpler display
- Center panel reverts to ResourcePanel when no location selected
- Uses existing design tokens (parchment, wood, gold, etc.)

---

## 2026-02-06 - Inventory & Info Tabs UI System (Original Center Panel)

---

## 2026-02-06 - Feature Batch B: Missing Jones Features (6 systems)

Implemented 6 missing Jones in the Fast Lane features with fantasy equivalents.

### B1: Stock Market (Large)
**Jones Reference:** Stock Market at Bank - stocks + T-Bills
**Implementation:**
- 3 regular stocks (Crystal Mine Ventures, Potion Consortium, Enchanting Guild Corp) with different volatility levels
- Crown Bonds (T-Bill equivalent) - fixed price, 3% sell fee, crash-proof
- Stock prices fluctuate each week in `processWeekEnd` via `updateStockPrices()`
- 5% weekly chance of market crash (stocks lose 30-60% value, Crown Bonds safe)
- Buy/sell shares at Bank → "See the Broker" sub-panel (2 hours per transaction)
- Stock portfolio value counts toward Wealth goal in `checkVictory` and `GoalProgress`
- **Files:** `src/data/stocks.ts` (new), `src/components/game/BankPanel.tsx`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/questHelpers.ts`, `src/components/game/GoalProgress.tsx`

### B2: Loan System (Medium)
**Jones Reference:** Bank loans with interest
**Implementation:**
- Loan amounts: 100, 250, 500, 1000g at Bank → "Loan Office" sub-panel
- 10% weekly interest on outstanding balance (compounded in `processWeekEnd`)
- 8 weeks to repay; default triggers forced collection from savings/gold
- If can't repay: -10 happiness, 4-week extension
- Only one loan at a time; loan amount subtracted from Wealth goal
- Repayment options: 50, 100, 250, or full amount (1 hour per transaction)
- **Files:** `src/components/game/BankPanel.tsx`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/turnHelpers.ts`

### B3: Weekend System (Medium-Large)
**Jones Reference:** Tickets, appliance weekends, random weekend activities
**Implementation:**
- Runs in `processWeekEnd` for every player each week
- Priority: 1) Ticket weekends → 2) Durable weekends (20% chance each) → 3) Random weekends
- 3 ticket types: Jousting Tournament (+8 hap), Theatre Performance (+10 hap), Bard Concert (+12 hap)
- Tickets purchasable at Shadow Market, consumed on use
- 5 durable weekends tied to appliances (Scrying Mirror, Memory Crystal, Music Box, Cooking Fire, Arcane Tome)
- 25+ random weekend activities in 3 tiers: cheap ($0-15), medium ($15-55), expensive ($50-100, week 8+)
- Weekend costs deducted automatically; happiness gained; results shown in event messages
- **Files:** `src/data/weekends.ts` (new), `src/store/helpers/turnHelpers.ts`, `src/data/items.ts`, `src/components/game/ShadowMarketPanel.tsx`

### B4: Doctor Visit Triggers (Small)
**Jones Reference:** Starvation/low relaxation trigger forced doctor visit
**Implementation:**
- Starvation trigger: 25% chance when starving → -10 Hours, -4 Happiness, -30 to 200g
- Low relaxation trigger: 20% chance when relaxation ≤ 15 → same penalties
- Both check in `startTurn` for human players
- **Files:** `src/store/helpers/turnHelpers.ts`

### B5: Food Storage System (Medium)
**Jones Reference:** Refrigerator (6 units) + Freezer (12 units)
**Implementation:**
- Preservation Box (existing, = Refrigerator): stores up to 6 fresh food units
- Frost Chest (new appliance, = Freezer): doubles storage to 12 units, available at Enchanter (1200g) and Shadow Market (900g)
- 3 fresh food items at General Store: Fresh Vegetables (+2 units), Fresh Meat (+3), Fresh Provisions Bundle (+6)
- Fresh food auto-consumed at turn start if regular foodLevel is 0 (prevents starvation)
- Spoilage: all fresh food lost if Preservation Box breaks
- Fresh Food section appears in General Store only when player owns Preservation Box
- Frost Chest displayed in HomePanel room scene
- **Files:** `src/data/items.ts`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/turnHelpers.ts`, `src/components/game/GeneralStorePanel.tsx`, `src/components/game/HomePanel.tsx`

### B6: Lottery / Fortune's Wheel (Small)
**Jones Reference:** Lottery tickets with weekly drawing
**Implementation:**
- Buy Fortune's Wheel tickets at Shadow Market (10g base, affected by price modifier)
- Multiple tickets per week allowed (each increases odds independently)
- Drawing at week end in `processWeekEnd`: 2% grand prize (5,000g), 5% small prize (50g) per ticket
- Winners get +25 happiness (grand) or +5 happiness (small)
- Tickets reset to 0 after each drawing
- **Files:** `src/data/items.ts`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/turnHelpers.ts`, `src/components/game/ShadowMarketPanel.tsx`

### Type/State Changes
- **Player fields added:** `stocks`, `loanAmount`, `loanWeeksRemaining`, `tickets`, `freshFood`, `lotteryTickets`
- **GameState fields added:** `stockPrices`, `weekendEvent`
- **New store actions:** `buyStock`, `sellStock`, `takeLoan`, `repayLoan`, `buyFreshFood`, `buyLotteryTicket`, `buyTicket`, `dismissWeekendEvent`
- **Modified victory calculation:** Wealth = Cash + Savings + Investments + StockValue - LoanAmount

### New Files (2)
| File | Purpose |
|------|---------|
| `src/data/stocks.ts` | Stock definitions, price fluctuation logic, portfolio value calculation |
| `src/data/weekends.ts` | Weekend activities, ticket types, durable weekends, activity selection |

### Modified Files (14)
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added Player fields, GameState fields, WeekendEventResult interface |
| `src/store/gameStore.ts` | New defaults in createPlayer, stockPrices/weekendEvent in state, dismissWeekendEvent action |
| `src/store/storeTypes.ts` | Added all new action signatures to GameStore interface |
| `src/store/helpers/economyHelpers.ts` | buyStock, sellStock, takeLoan, repayLoan, buyFreshFood, buyLotteryTicket, buyTicket |
| `src/store/helpers/turnHelpers.ts` | Doctor triggers, fresh food consumption/spoilage, loan interest, weekends, lottery, stock prices |
| `src/store/helpers/questHelpers.ts` | Updated checkVictory wealth calculation to include stocks and loans |
| `src/data/items.ts` | Frost Chest appliance, fresh food items, ticket items, Fortune's Wheel ticket, new Item fields |
| `src/components/game/BankPanel.tsx` | Complete rewrite: 3 views (main/broker/loans), stock trading, loan office |
| `src/components/game/ShadowMarketPanel.tsx` | Lottery tickets, weekend tickets, reorganized sections |
| `src/components/game/GeneralStorePanel.tsx` | Fresh food section with storage display |
| `src/components/game/LocationPanel.tsx` | Wire up all new store actions to child components |
| `src/components/game/HomePanel.tsx` | Frost Chest position in room scene |
| `src/components/game/GoalProgress.tsx` | Wealth calculation includes stocks/loans |

### Verification
- TypeScript check passes (`tsc --noEmit`)
- Build passes (`vite build`)
- Tests pass (`vitest run`)

---

## 2026-02-06 - Bugfix Batch A: Education Progress, Work Income, Async Imports, MaxHealth

### Bug A1: Education Progress Display Mismatch

**Problem:** `GoalProgress.tsx` calculated education using `Object.values(player.education).reduce(...)` (old path-level system), but `checkVictory()` in `questHelpers.ts` uses `player.completedDegrees.length * 9` (new Jones-style degree system). Players saw misleading progress bars that didn't match actual victory conditions.

**Fix:** Changed `GoalProgress.tsx` to use `player.completedDegrees.length * 9`, matching the `checkVictory` calculation exactly.

### Bug A2: Work Income Display Shows 33% But Actual Is 15%

**Problem:** `WorkSection.tsx` calculated displayed earnings with `hoursPerShift * 1.33 * wage` (33% bonus), but the actual `workShift` action in `workEducationHelpers.ts` uses `Math.ceil(hours * 1.15)` (15% bonus). The 33% was the old multiplier before the economy rebalance. Players expected more gold than they actually earned.

**Fix:** Changed `WorkSection.tsx` to replicate the actual workShift logic: apply `Math.ceil(hoursPerShift * 1.15)` bonus for 6+ hour shifts, then multiply by wage.

### Bug A3: Async Imports in Store Actions (Race Conditions)

**Problem:** Two store actions used `import().then()` for dynamic imports:
- `applyRareDrop` in `economyHelpers.ts` — `import('@/data/dungeon').then(...)`
- `completeQuest` in `questHelpers.ts` — `import('@/data/quests').then(...)`

The async callbacks meant `set()` state updates happened in a later microtask, racing with other synchronous state changes. Neither `dungeon.ts` nor `quests.ts` imports from the store, so the "avoid circular deps" comment was incorrect — no circular dependency exists.

**Fix:** Replaced both dynamic `import().then()` calls with top-level static imports. State updates now happen synchronously within the action, eliminating race conditions.

### Bug A4: modifyMaxHealth Inconsistent Logic

**Problem:** `modifyMaxHealth` in `playerHelpers.ts` had `health: Math.min(p.health, p.maxHealth + amount)` — this used the raw `maxHealth + amount` to cap health, ignoring the `Math.max(50, ...)` floor applied to maxHealth itself. The `applyRareDrop` `permanent_max_health` case had the same issue: it set health to `p.health + effect.value` without capping to the new maxHealth.

**Fix:**
- `modifyMaxHealth`: Compute `newMaxHealth = Math.max(50, p.maxHealth + amount)` first, then cap health to `newMaxHealth`.
- `applyRareDrop` `permanent_max_health`: Same pattern — compute clamped newMax, cap health to it.

### Files Modified (5 files)
| File | Changes |
|------|---------|
| `src/components/game/GoalProgress.tsx` | Use `completedDegrees.length * 9` instead of old `education` path sum |
| `src/components/game/WorkSection.tsx` | Use `1.15` bonus matching actual `workShift` logic |
| `src/store/helpers/economyHelpers.ts` | Static import of `DUNGEON_FLOORS`, sync `applyRareDrop`, fixed `permanent_max_health` cap |
| `src/store/helpers/questHelpers.ts` | Static import of `getQuest`, sync `completeQuest` |
| `src/store/helpers/playerHelpers.ts` | Fixed `modifyMaxHealth` to use clamped newMaxHealth for health cap |

### Verification
- Build passes (`npx vite build`)
- Tests pass (`npx vitest run`)
## 2026-02-05 - Improvement Proposals (Code Audit & Gap Analysis)

A full codebase audit and gap analysis against JONES_REFERENCE.md was performed. Below are categorized improvement proposals, from highest to lowest priority.

---

### Category A: Bugs & Logic Errors (Fix ASAP)

#### A1. Education Progress Display Mismatch (HIGH)
**Files**: `src/components/game/GoalProgress.tsx:17`, `src/store/helpers/questHelpers.ts:180`

**Problem**: GoalProgress shows education using the OLD `player.education` map:
```typescript
const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);
```
But victory checking (`checkVictory`) uses the NEW `player.completedDegrees` system:
```typescript
const totalEducation = player.completedDegrees.length * 9;
```
Players see a misleading progress bar that doesn't match actual win conditions.

**Fix**: Replace the education calculation in GoalProgress.tsx with `player.completedDegrees.length * 9`.

#### A2. Work Earnings Display Mismatch (MEDIUM)
**Files**: `src/components/game/WorkSection.tsx:24`, `src/store/helpers/workEducationHelpers.ts:20`

**Problem**: WorkSection displays earnings using a 33% bonus multiplier:
```typescript
const earnings = Math.ceil(jobData.hoursPerShift * 1.33 * player.currentWage);
```
But actual workShift calculation uses 15% bonus:
```typescript
const bonusHours = hours >= 6 ? Math.ceil(hours * 1.15) : hours;
```
Players see higher expected earnings than they actually receive.

**Fix**: Update WorkSection to use `1.15` multiplier, or better yet, extract the bonus calculation to a shared utility.

#### A3. Async Imports in Store Actions — Race Conditions (HIGH)
**Files**: `src/store/helpers/economyHelpers.ts:319`, `src/store/helpers/questHelpers.ts:42`

**Problem**: `applyRareDrop` and quest helpers use `import(...).then()` inside action creators. The state update happens asynchronously — the function returns before the drop is applied. If other state changes happen in the meantime, state could be corrupted.

**Fix**: Convert dynamic imports to static imports at the top of the file. The dungeon and quest data modules are small and always needed when these actions run.

#### A4. modifyMaxHealth Logic (LOW-MEDIUM)
**File**: `src/store/helpers/playerHelpers.ts:127`

**Problem**: When maxHealth increases, current health is clamped to the new max but not increased to take advantage of the new capacity. This is technically correct (health doesn't magically fill), but `applyRareDrop` for `permanent_max_health` (economyHelpers.ts:343-344) does increase both — creating inconsistent behavior between the two code paths.

**Fix**: Decide on one behavior and apply it consistently. If max health increases should also heal, update `modifyMaxHealth` to match `applyRareDrop`.

---

### Category B: Missing Jones Features (Gameplay Gaps)

Based on JONES_REFERENCE.md, these core Jones mechanics are not yet implemented:

#### B1. Stock Market / Trading System (LARGE)
Jones has a full stock market at the Bank: regular stocks with economy-driven price fluctuation, and risk-free T-Bills (3% sell fee, no crash risk). T-Bills count toward Liquid Assets and can't be robbed or wiped by market crashes. This is a major wealth management feature that adds strategic depth.

**Scope**: New BankPanel section, stock price simulation per turn, buy/sell UI, T-Bill vs. regular stock choice, crash effects on stocks.

#### B2. Loan System (MEDIUM)
Jones allows bank loans with interest and repayment schedules. Failed loan requests cost happiness. This creates an early-game financing option — borrow for education or equipment, pay back with job earnings.

**Scope**: New BankPanel section, loan state on Player, interest calculation per turn, garnishment on default.

#### B3. Weekend System (MEDIUM-LARGE)
Between turns, Jones has automatic weekend activities: ticket-based (Baseball/Theatre/Concert), durable-triggered (20% chance per appliance), and random weekends. Costs range from $5-100. This creates a happiness income/drain mechanic and makes appliance ownership more meaningful.

**Scope**: Weekend event generator, ticket items, weekend result display between turns, appliance weekend triggers.

#### B4. Doctor Visit Triggers (SMALL)
In Jones, starvation, food spoilage, and low relaxation can trigger a Doctor Visit: -10 hours, -4 happiness, -$30-200. Currently the game has a Healer location but no automatic doctor visits from starvation/relaxation.

**Fix**: Add doctor visit checks in `processWeekEnd` when starvation or low relaxation is detected.

#### B5. Fresh Food Storage System (MEDIUM)
Jones has Refrigerator (stores 6 Fresh Food units) and Freezer (12 units). Fresh food from the grocery store prevents starvation and spoils without proper storage. Currently, Guild Life has a simpler foodLevel percentage system.

**Scope**: Would require reworking the food system from percentage to unit-based, adding food inventory, spoilage checks.

#### B6. Lottery Tickets (SMALL)
Jones has lottery tickets as a gambling mechanic. Fixed price, chance to win big ($5,000). Fun, low-effort addition.

**Scope**: New item at Shadow Market or General Store, random draw on weekend/turn end.

---

### Category C: Gameplay & Balance Improvements

#### C1. Save/Load Game State (HIGH PRIORITY)
**Currently missing entirely.** Games are lost on page refresh. This is the single biggest usability gap.

**Implementation**: Serialize Zustand store to localStorage. Add save/load buttons. Auto-save at turn end. Allow multiple save slots.

#### C2. No Tutorial or New Player Guidance
The game has many interconnected systems (housing, jobs, education, food, equipment, dungeon, quests, guild ranks) with no in-game explanation. New players will be lost.

**Options**:
- First-turn tutorial overlay highlighting key locations
- "Advisor" tooltip system explaining each panel
- Quick-start guide accessible from title screen

#### C3. Work Happiness Penalty Too Harsh Early Game
Working costs -2 happiness per shift (workEducationHelpers.ts:47). In early game with low wages, players lose happiness faster than they can earn it through other means. Consider scaling the penalty based on job satisfaction or wage level.

#### C4. No Game Speed Control for AI Turns
Grimwald AI has hardcoded delays (300-800ms per action, up to 15 actions per turn). No way to skip or speed up. Long AI turns can be tedious.

**Fix**: Add a "Skip AI Turn" button or speed multiplier setting.

#### C5. Raise Request System Could Be Improved
The raise system (workEducationHelpers.ts:57-99) has a -10 dependability penalty on failure, which is very punishing. Jones lets you re-apply for your current job at the Employment Office to get the current market rate — no penalty.

---

### Category D: UI/UX Improvements

#### D1. No Mobile/Responsive Layout
The game board and panels are designed for desktop. No responsive breakpoints for mobile or tablet. The game board image requires a large viewport.

#### D2. Missing Tooltips
Buttons and icons throughout the game have no hover tooltips. Players must experiment to understand what each action does.

#### D3. No Keyboard Shortcuts
No keyboard navigation for common actions (end turn, work, study, etc.). Would improve power-user experience significantly.

#### D4. No Undo for Misclicks
Accidentally clicking a location starts travel immediately. No confirmation dialog for expensive or time-consuming actions. A simple "Are you sure?" for travel when time is low would prevent frustration.

#### D5. Dark Mode
Not critical but commonly requested. Tailwind makes this straightforward with `dark:` variants.

---

### Category E: Technical Debt & Code Quality

#### E1. Zero Real Test Coverage (CRITICAL)
**File**: `src/test/example.test.ts` — contains only `expect(true).toBe(true)`.

No tests for: state mutations, victory conditions, financial calculations, education progression, death system, robbery logic, AI decision engine. Any refactoring or balance change risks introducing silent regressions.

**Priority tests to write:**
1. `checkVictory()` — all goal combinations
2. `workShift()` — earnings, garnishment, bonus calculations
3. `processWeekEnd()` — starvation, rent, appliance breakage
4. `completeDegree()` — prerequisite validation, graduation bonuses
5. AI action generation — priority scoring, critical needs detection

#### E2. Duplicate GUILD_PASS_COST Constant
**Files**: `src/store/helpers/questHelpers.ts:14` and `src/types/game.types.ts:242`

Hardcoded `500` in two places. Should import from a single source.

#### E3. Input Validation Missing in Banking
**File**: `src/store/helpers/economyHelpers.ts:25-50`

`depositToBank` and `withdrawFromBank` don't validate that amounts are positive. Negative amounts would exploit the system (deposit -100 = free gold). The UI prevents this, but the store should be self-protecting.

#### E4. Type Safety in Location Functions
**File**: `src/data/locations.ts:278`

`getMovementCost` accepts `string` instead of `LocationId`. Invalid location IDs silently return 0 instead of producing a type error.

#### E5. Legacy Education System Code
GoalProgress.tsx and potentially other components still reference `player.education` (old system) instead of `player.completedDegrees` (new system). Dead code paths should be cleaned up.

---

### Summary: Recommended Priority Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | A1: Fix education progress display | Small | High — players see wrong progress |
| 2 | A2: Fix earnings display | Small | Medium — misleading UI |
| 3 | A3: Fix async imports | Small | High — prevents race conditions |
| 4 | C1: Save/load game | Medium | Critical — games lost on refresh |
| 5 | E1: Write core tests | Medium | High — safety net for all future work |
| 6 | B1: Stock market | Large | High — major strategic depth |
| 7 | B3: Weekend system | Medium | Medium — happiness/economy depth |
| 8 | B2: Loan system | Medium | Medium — early-game financing |
| 9 | C2: Tutorial/guidance | Medium | Medium — new player retention |
| 10 | D1: Mobile responsive | Large | Medium — broader audience |

---

## 2026-02-05 - Fix: Single-Player Win Condition (Last Man Standing Bug)

### Problem
In a single-player game, the player would automatically win as "last man standing" on their very first turn end. The `endTurn()` and `processWeekEnd()` functions in `turnHelpers.ts` both checked `alivePlayers.length === 1` without considering whether the game was single-player or multiplayer. Since a solo player is always the only one alive, the victory screen triggered immediately — bypassing all goal requirements (Wealth, Happiness, Education, Career).

### Root Cause
Two locations in `src/store/helpers/turnHelpers.ts`:
1. **`endTurn()`** (line 57): `if (alivePlayers.length === 1)` → instant "last one standing" win
2. **`processWeekEnd()`** (line 387): Same check at end of week

Both triggered regardless of total player count.

### Solution
Added a guard to both "last man standing" checks: only trigger when there are **multiple players** (`state.players.length > 1` / `updatedPlayers.length > 1`). In single-player games, the player must now achieve all four victory goals (Wealth, Happiness, Education, Career) via `checkVictory()` to win.

### Files Modified (1 file)
| File | Changes |
|------|---------|
| `src/store/helpers/turnHelpers.ts` | Added `&& state.players.length > 1` guard to both "last man standing" checks in `endTurn()` and `processWeekEnd()` |

### Verification
- TypeScript: 0 errors (`tsc --noEmit`)
- Tests: 1/1 passing
- Logic: Single-player → must complete goals. Multiplayer → last survivor still wins.

---

## 2026-02-05 - Phase 5: Integration (Quests + AI + Balance)

### Problem
The game's subsystems — dungeon, quests, combat, AI (Grimwald), and economy — existed in isolation. Dungeon quests (`dungeon-dive`, `deep-dungeon-clear`) had no connection to actual floor clears. Rare drops from bosses were displayed as toasts but never applied to the player. Grimwald AI had no knowledge of dungeons, equipment, quests, or the guild pass. The loot multiplier system (guild rank → gold bonus) was defined but never used.

### Solution: 6-Part Integration

#### 1. Quest ↔ Dungeon Connection
- Added `requiresDungeonFloor` and `requiresAllDungeonFloors` fields to Quest interface
- `dungeon-dive` (B-rank) now requires Floor 1 cleared
- `deep-dungeon-clear` (S-rank) now requires all 5 floors cleared
- Updated `canTakeQuest()` to validate dungeon floor requirements (new `dungeonFloorsCleared` param)

#### 2. Rare Drop System Integration
- Added `permanentGoldBonus` field to Player interface (default 0)
- Created `applyRareDrop` store action in economyHelpers that handles all 5 effect types:
  - `heal` → instant HP restore (Cave Mushroom)
  - `permanent_gold_bonus` → permanent % bonus to work earnings (Goblin's Lucky Coin)
  - `permanent_max_health` → increase max health cap (Undead Amulet)
  - `equippable` → add as durable item + auto-equip (Dragon Scale Shield)
  - `happiness_and_stats` → happiness + stat cap increases (Demon's Heart)
- Added Dragon Scale Shield to ALL_ITEMS as a RARE_DROP_ITEMS category (isUnstealable)
- Connected `applyRareDrop` through CavePanel → LocationPanel → GameStore
- Applied `permanentGoldBonus` in `workShift` earnings calculation

#### 3. Grimwald AI — Dungeon Exploration
- Added 5 new `AIActionType` values: `buy-equipment`, `explore-dungeon`, `buy-guild-pass`, `take-quest`, `complete-quest`
- Strategy functions in `strategy.ts`:
  - `getBestDungeonFloor()` — evaluates uncleared floors, checks requirements, power ratio, and time budget
  - `getNextEquipmentUpgrade()` — weapon/armor/shield upgrade path (dagger → sword → steel → enchanted)
  - `shouldBuyGuildPass()` — gold threshold varies by AI difficulty
  - `getBestQuest()` — picks best quest by gold/time ratio (strategic) or raw gold (simple)
- Action generation in `actionGenerator.ts` — dungeon/quest actions with contextual priorities
- Full action execution in `useGrimwaldAI.ts` — calls `autoResolveFloor()` with loot multiplier, applies gold/health/happiness/rare drops

#### 4. Loot Multiplier Balance
- Connected guild rank loot multiplier (novice 0.8× → guild-master 1.5×) to combat resolver
- Added `lootMultiplier` parameter to `autoResolveFloor()` (default 1.0)
- Applied in CombatView (human players) via `getLootMultiplier(floor, player.guildRank)`
- Applied in Grimwald AI dungeon exploration

### Files Modified (15 files)
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `permanentGoldBonus` to Player |
| `src/data/quests.ts` | Quest-dungeon fields, updated canTakeQuest |
| `src/data/items.ts` | Dragon Scale Shield in RARE_DROP_ITEMS |
| `src/data/combatResolver.ts` | lootMultiplier param on autoResolveFloor |
| `src/store/storeTypes.ts` | Added applyRareDrop to GameStore |
| `src/store/gameStore.ts` | permanentGoldBonus default in createPlayer |
| `src/store/helpers/economyHelpers.ts` | applyRareDrop action (5 effect types) |
| `src/store/helpers/workEducationHelpers.ts` | Apply permanentGoldBonus in workShift |
| `src/hooks/ai/types.ts` | 5 new AIActionType values |
| `src/hooks/ai/strategy.ts` | 4 new strategy functions (dungeon/quest) |
| `src/hooks/ai/actionGenerator.ts` | Dungeon/quest action generation |
| `src/hooks/useGrimwaldAI.ts` | 5 new action execution cases |
| `src/components/game/CavePanel.tsx` | applyRareDrop prop + usage |
| `src/components/game/CombatView.tsx` | Loot multiplier in handleFinish |
| `src/components/game/LocationPanel.tsx` | Pass applyRareDrop to CavePanel |

### Verification
- TypeScript: 0 errors (`tsc --noEmit`)
- Build: Succeeds (`vite build` → 587 KB JS, 88 KB CSS)
- Tests: 1/1 passing
- ESLint: No new errors (2 pre-existing in actionGenerator.ts)

---

## 2026-02-05 - Phase 4: Combat System (Encounter Resolution)

### Problem
The dungeon system (Phase 3) used auto-resolve combat — clicking "Enter Floor" instantly resolved all 4 encounters at once and showed a toast notification with totals. Players had no agency during combat: no ability to see individual encounters, no retreat option mid-floor, no step-by-step feedback on damage/gold/bonuses. Combat was invisible and felt like a black box.

### Solution
Replaced auto-resolve with an encounter-by-encounter combat system. Players now step through each encounter individually, seeing detailed results and making tactical decisions (fight/retreat) between encounters.

### Architecture

**Combat Resolver Module** (`src/data/combatResolver.ts`):
- Pure-function state machine for combat resolution, separate from UI
- Types: `EncounterResult`, `DungeonRunState`, `CombatPhase`, `CombatStats`, `AutoResolveResult`
- `initDungeonRun()` — Generate encounters, set up initial state
- `resolveEncounter()` — Resolve a single encounter (same formula as Phase 3 auto-resolve, extracted and enriched)
- `applyEncounterResult()` — Apply result to run state, advance phase
- `advanceToNextEncounter()` — Move to next encounter (player chose "Continue")
- `retreatFromDungeon()` — Strategic retreat with partial rewards
- `autoResolveFloor()` — Auto-resolve entire floor (for AI in Phase 5)
- Helper functions: `getEncounterAction()`, `getEncounterIcon()`

**Combat View Component** (`src/components/game/CombatView.tsx`):
Three sub-views managed by the combat state machine:

1. **EncounterIntro** — Shows encounter card with:
   - Type-specific icon and color theme (red for boss, amber for treasure, cyan for healing, orange for trap)
   - Enemy name, flavor text, power/damage/gold stats
   - HP bar with health percentage coloring (green/yellow/red)
   - Encounter counter (e.g., "Encounter 2 of 4")
   - Arcane warning for ethereal enemies
   - Action button: "Fight!" / "Search" / "Disarm" / "Drink" / "Fight Boss!"

2. **EncounterResultView** — Shows post-encounter results:
   - Damage taken (with block indicator)
   - Gold earned
   - Healing received
   - Trap disarmed status
   - Healing potion found (Alchemy bonus)
   - Education bonuses that activated (listed with icons)
   - Updated HP bar
   - Low health warning at ≤30% HP
   - "Continue Deeper" / "Retreat" buttons

3. **FloorSummaryView** — Shows full floor results:
   - Success/retreat/defeat header with appropriate icon
   - Complete encounter log with per-encounter damage/gold
   - Total gold earned, total damage taken, healing received
   - First clear happiness bonus
   - Rare drop notification (purple themed)
   - "Return to Dungeon" button

**Retreat Mechanic** (new):
- Between encounters, player can choose to retreat
- Retreating keeps all gold earned so far
- Floor is NOT marked as cleared on retreat
- No happiness penalty for strategic retreat
- Cannot retreat before the boss encounter (committed once boss is next)

**CavePanel Refactored** (`src/components/game/CavePanel.tsx`):
- Removed inline `resolveFloorRun()` function
- Added `activeFloor` state to toggle between floor selection and combat view
- `handleEnterFloor()` now spends time and switches to CombatView
- `handleCombatComplete()` receives `CombatRunResult` and applies all effects to store
- Floor selection UI unchanged

### Combat Formula (unchanged from Phase 3, extracted to resolveEncounter)
```
attackPower = baseATK * (1 + eduAttackBonus)
effATK = requiresArcane && !hasArcane ? attackPower * 0.3 : attackPower
playerPower = effATK + DEF * 0.5
ratio = playerPower / encounterPower

damage = baseDamage * max(0.3, 1 - ratio * 0.5) * (1 - eduDmgReduction)
if blocked: damage *= 0.5
damage = max(1, damage)

gold = baseGold * (1 + eduGoldBonus) * min(1.5, ratio)
```

### Files Created
- `src/data/combatResolver.ts` — Combat state machine, encounter resolution, auto-resolve (380 lines)
- `src/components/game/CombatView.tsx` — Encounter-by-encounter combat UI (340 lines)

### Files Modified
- `src/components/game/CavePanel.tsx` — Removed auto-resolve, integrated CombatView, added state toggle (578 → 484 lines)

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`vite build`)
- All tests pass (`vitest run`)
- ESLint clean on all modified files

---

## 2026-02-05 - Phase 3: Cave UI Overhaul (Floor Selection Interface)

### Problem
The Cave location had a simple "Explore the Cave" button with random outcomes (treasure, lost, creature encounter) and a "Rest in Cave" option. This didn't use the dungeon floor system designed in Phase 2 (`src/data/dungeon.ts`), which defines 5 floors with encounters, bosses, requirements, and loot tables. The cave UI needed a complete overhaul to show floor selection, equipment checks, dungeon progress, and integrate with the Phase 2 data.

### Solution
Replaced the CavePanel with a full dungeon floor selection interface that shows all 5 floors with their status, requirements, and lets players enter floors with auto-resolved combat.

### Architecture

**New CavePanel** (`src/components/game/CavePanel.tsx`):
- **Dungeon Progress Bar** — Visual progress tracker showing X/5 floors cleared with gradient bar
- **Equipment Summary** — Compact ATK/DEF/BLK display with tip for unequipped players
- **Education Bonuses** — Shows active dungeon bonuses from completed degrees (Trap Sense, Arcane Sight, damage reduction, attack bonus, gold bonus, potion chance)
- **Floor Selection Cards** — 5 collapsible floor cards, each showing:
  - Status: Cleared (green checkmark), Available (sword or warning), Locked (lock icon)
  - Color-coded left border (green/amber/red/gray)
  - Expanded view with: description, time cost, gold range, health risk, boss info, rare drop hint, requirements checklist, recommended degrees
  - "Enter Floor" / "Re-enter Floor" button with disabled state reasons
- **Rest in Cave** — Kept from old design (8 hours, +15 HP, +1 happiness)

**Floor Status Logic**:
- `cleared` — Player has beaten the boss (green, re-enterable for gold farming)
- `available` — Previous floor cleared but may not meet equipment requirements
- `locked` — Previous floor not yet cleared

**Auto-Resolve Combat** (`resolveFloorRun` function):
- Generates 3 random encounters + 1 boss per floor via `generateFloorEncounters()`
- Resolves each encounter based on player power vs encounter power ratio
- Treasure encounters: Gold with gold bonus
- Healing encounters: Restore HP mid-floor
- Trap encounters: Take damage, or skip if Trade Guild disarm ability
- Combat/Boss encounters: Damage inversely proportional to power ratio, gold proportional, block chance rolls, arcane requirement check
- Education bonuses applied: damage reduction, attack bonus, gold bonus, healing potion drops
- First clear: Marks floor cleared, awards happiness bonus, 5% rare drop check
- Re-runs: Gold farming without happiness bonus or rare drops

**Store Changes**:
- Added `clearDungeonFloor(playerId, floorId)` action to `economyHelpers.ts`
- Added type to `storeTypes.ts` GameStore interface
- Updates `player.dungeonFloorsCleared` array (idempotent, won't duplicate)

### Files Modified
- `src/components/game/CavePanel.tsx` — Complete rewrite (137 → 578 lines): floor selection UI, auto-resolve combat, education bonuses display
- `src/components/game/LocationPanel.tsx` — Added `clearDungeonFloor` to store destructure and CavePanel props
- `src/store/storeTypes.ts` — Added `clearDungeonFloor` to GameStore interface
- `src/store/helpers/economyHelpers.ts` — Implemented `clearDungeonFloor` action

### Combat Formula
```
attackPower = baseATK * (1 + eduAttackBonus)
effATK = requiresArcane && !hasArcane ? attackPower * 0.3 : attackPower
playerPower = effATK + DEF * 0.5
ratio = playerPower / encounterPower

damage = baseDamage * max(0.3, 1 - ratio * 0.5) * (1 - eduDmgReduction)
if blocked: damage *= 0.5
damage = max(1, damage)

gold = baseGold * (1 + eduGoldBonus) * min(1.5, ratio)
```

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`vite build`)
- All tests pass (`vitest run`)

---

## 2026-02-05 - Movement Path Drawing System (Zone Editor)

### Problem
Player tokens moved in straight lines between zone centers during animation, ignoring the road layout on the game board image. This looked unnatural because the tokens would "fly" over buildings and terrain instead of following the visible roads/paths.

### Solution
Added a movement path drawing system to the Zone Editor that allows defining custom waypoints between adjacent locations. The AnimatedPlayerToken now follows these waypoints during movement animation, resulting in more detailed and road-accurate player movement.

### Architecture

**Data Model**: `MOVEMENT_PATHS` in `src/data/locations.ts`
- Record keyed by `"fromId_toId"` (clockwise direction in BOARD_PATH)
- Values are arrays of `[x%, y%]` waypoints between zone centers
- Counter-clockwise travel automatically reverses waypoints
- Helper functions: `getSegmentWaypoints()`, `getAnimationPoints()`, `getPathKey()`

**Zone Editor** (`src/components/game/ZoneEditor.tsx`):
- New **Zones/Paths** mode toggle in the editor header
- **Paths mode**: Shows all 14 adjacent edges as SVG polylines on the board
- Click an edge in the right panel or on the SVG to select it
- Click on the board to add waypoints to the selected edge
- Drag waypoints to reposition them (with mouse)
- Right-click a waypoint to remove it
- Per-waypoint X/Y coordinate editing in the properties panel
- "Clear" button to remove all waypoints from an edge
- Green lines = edges with waypoints defined, gray dashed = straight line (no waypoints)
- Cyan highlight = currently selected edge
- "Copy Config" now exports MOVEMENT_PATHS alongside ZONE_CONFIGS and CENTER_PANEL_CONFIG

**Animation** (`src/components/game/AnimatedPlayerToken.tsx`):
- Replaced zone-center-only animation with full waypoint chain
- `getAnimationPoints(path)` builds: zone1Center → waypoints → zone2Center → waypoints → zone3Center
- Animation speed: 150ms per waypoint (faster than the old 300ms per zone step, since there are more points)
- CSS transition duration also reduced to 150ms for smooth interpolation

**Debug Overlay** (`src/components/game/GameBoard.tsx`):
- Debug overlay (Ctrl+Shift+D) now renders movement path lines
- Shows all 14 edges with their waypoints
- Green solid lines for paths with waypoints, gray dashed for straight connections

### How to Use
1. Open Zone Editor (Ctrl+Shift+Z or "Edit Zones" button)
2. Switch to "Paths" tab
3. Select an edge (e.g., "noble-heights → general-store") from the right panel
4. Click on the board to add waypoints along the road
5. Drag waypoints to fine-tune positions
6. Right-click to remove individual waypoints
7. Click "Apply" to activate paths in-game
8. Click "Copy Config" to get the code for `locations.ts`

### Files Modified
- `src/data/locations.ts` — Added `MOVEMENT_PATHS`, `MovementWaypoint` type, `getPathKey()`, `getSegmentWaypoints()`, `getAnimationPoints()` helpers
- `src/components/game/ZoneEditor.tsx` — Added Zones/Paths mode toggle, full path drawing UI with SVG visualization, waypoint drag/add/remove, coordinate editing, path export
- `src/components/game/AnimatedPlayerToken.tsx` — Replaced zone-center jumping with waypoint-chain animation using `getAnimationPoints()`
- `src/components/game/GameBoard.tsx` — Updated `handleSaveZones` to accept and apply movement paths, added path visualization to debug overlay

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`vite build`)
- All tests pass (`vitest run`)

---

## 2026-02-05 - Balance: Quest Rewards, Guild Pass, Homeless Penalties

### Problem
Three balance issues identified:
1. **Quest gold rewards too generous** — Players accumulated gold too quickly through quests, trivializing the economy
2. **Quests available too early** — Players could immediately start grinding quests at the Guild Hall from turn 1 with no investment
3. **No homeless penalty** — Being homeless had no mechanical downside besides rent being free, removing incentive to find housing

### Changes

#### 1. Quest Gold Rewards Reduced (~50% across the board)

All quest gold rewards and happiness rewards reduced significantly. Higher-rank quests took bigger proportional cuts since they compounded the problem most:

| Rank | Quest | Old Gold | New Gold | Old Hap | New Hap |
|------|-------|----------|----------|---------|---------|
| E | Rat Extermination | 20g | 12g | 2 | 1 |
| E | Package Delivery | 10g | 6g | 1 | 1 |
| E | Herb Gathering | 15g | 8g | 2 | 1 |
| E | Find the Lost Cat | 25g | 15g | 3 | 2 |
| D | Escort Merchant | 35g | 20g | 3 | 2 |
| D | Guard Duty | 30g | 18g | 1 | 1 |
| D | Urgent Courier Run | 40g | 22g | 2 | 1 |
| C | Bandit Hunt | 60g | 35g | 5 | 3 |
| C | Lost Artifact | 75g | 40g | 5 | 3 |
| C | Curse Investigation | 55g | 30g | 4 | 2 |
| B | Monster Slaying | 120g | 60g | 8 | 5 |
| B | Dungeon Dive | 150g | 75g | 10 | 6 |
| B | Exorcism | 100g | 50g | 6 | 4 |
| A | Dragon Investigation | 200g | 100g | 12 | 7 |
| A | Demon Cult | 250g | 120g | 15 | 8 |
| A | Ancient Evil Awakens | 225g | 110g | 12 | 7 |
| S | Deep Dungeon Clear | 500g | 200g | 25 | 12 |
| S | Dragon Slayer | 750g | 300g | 30 | 15 |

#### 2. Guild Pass Required for Quests (500g)

New mechanic: Players must purchase a **Guild Pass** (500g) at the Guild Hall before they can access the quest board. This:
- Creates an early-game gold sink and investment decision
- Prevents immediate quest grinding from turn 1
- Forces players to earn money through jobs first before questing
- Adds strategic depth (save up 500g early vs. spend on housing/gear first)

**Implementation:**
- Added `hasGuildPass: boolean` to Player interface
- Added `GUILD_PASS_COST = 500` constant
- Added `buyGuildPass(playerId)` store action
- Guild Hall UI shows "Buy Guild Pass" prompt when player doesn't have one
- Quest board only accessible after purchasing the pass
- Grimwald AI updated to buy Guild Pass when it can afford it

#### 3. Homeless Penalties

Being homeless now has real consequences each turn:
- **-5 health** per turn (sleeping on the streets is dangerous)
- **-8 hours** per turn (wasted time finding shelter, less productive)
- **3x street robbery chance** from Shadowfingers (homeless are easier targets)
- **2x weekly theft probability** (more vulnerable to pickpockets)

This makes getting housing an urgent early priority and adds meaningful trade-offs to the homeless state.

### Files Modified
- `src/data/quests.ts` — All quest gold/happiness rewards reduced
- `src/types/game.types.ts` — Added `hasGuildPass` to Player, `GUILD_PASS_COST` constant
- `src/store/gameStore.ts` — Added `hasGuildPass: false` default
- `src/store/storeTypes.ts` — Added `buyGuildPass` to GameStore interface
- `src/store/helpers/questHelpers.ts` — Added `buyGuildPass` action
- `src/store/helpers/turnHelpers.ts` — Added homeless penalty (health + time) at start of turn
- `src/data/shadowfingers.ts` — Added `HOMELESS_ROBBERY_MULTIPLIER` (3x street robbery chance)
- `src/data/events.ts` — Added 2x weekly theft multiplier for homeless
- `src/components/game/LocationPanel.tsx` — Guild Pass gate UI at Guild Hall
- `src/hooks/useAI.ts` — AI buys Guild Pass before attempting quests

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Build/test blocked by pre-existing dependency issue (cssesc package missing), not related to these changes

---

## 2026-02-05 - Bug Fix: Slums Crash (JonesButton ReferenceError)

### Problem
Game crashed with `ReferenceError: JonesButton is not defined` when navigating to the Slums location while the player had no housing (`player.housing === 'homeless'`).

### Root Cause
`src/components/game/HomePanel.tsx` used the `JonesButton` component on line 52 (in the homeless player branch) but never imported it. All other panel files (GuildHallPanel, AcademyPanel, WorkSection) correctly import `JonesButton` from `./JonesStylePanel`, but HomePanel was missing this import.

### How It Triggers
1. Player visits the Slums location on the board
2. `LocationPanel.tsx` routes both `'slums'` and `'noble-heights'` to `HomePanel`
3. `HomePanel` checks `player.housing === 'homeless'` (line 45)
4. If homeless, it renders a "You have no home" message with a `<JonesButton label="DONE" />` (line 52)
5. Since `JonesButton` is not imported → crash

### Fix
Added missing import to `HomePanel.tsx`:
```typescript
import { JonesButton } from './JonesStylePanel';
```

### Files Modified
- `src/components/game/HomePanel.tsx` — Added missing `JonesButton` import

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`bun run build`)
- All tests pass (`bun run test`)

---

## 2026-02-05 - Phase 2 Implementation: Dungeon Data (dungeon.ts)

### What Was Done
Created the complete dungeon data system (`src/data/dungeon.ts`) — Phase 2 of the Rogue-Lite RPG plan.

**New File: `src/data/dungeon.ts`**

**Types & Interfaces:**
- `EncounterDifficulty` — easy | medium | hard | boss
- `EncounterType` — combat | trap | treasure | healing | boss
- `EncounterOutcome` — victory | pyrrhic | defeat
- `FloorRunResult` — cleared | retreated | defeated
- `DungeonEncounter` — Individual encounter with name, type, power, damage, gold, flavor text
- `FloorRequirements` — Previous floor, minimum weapon/armor/ATK/DEF, recommended degrees
- `RareDrop` — Unique per-floor drops with 5% chance
- `RareDropEffect` — Heal, permanent gold bonus, max health, equippable shield, happiness+stats
- `EducationDungeonBonus` — Per-degree combat bonuses
- `DungeonFloor` — Complete floor definition with encounters, boss, loot, requirements

**5 Dungeon Floors:**

| Floor | Name | Time | Min ATK/DEF | Encounters | Boss | Gold Range |
|-------|------|------|-------------|------------|------|------------|
| 1 | Entrance Cavern | 6/4 hrs | 0/0 | Rats, Bats, Chest, Spring | Rat King | 15-50g |
| 2 | Goblin Tunnels | 10/8 hrs | 5/0 | Goblin Scouts, Pit Trap, Warriors, Cache | Goblin Chieftain | 30-100g |
| 3 | Undead Crypt | 14/12 hrs | 15/10 | Skeletons, Ghosts, Poison Trap, Artifacts | Crypt Lich | 60-200g |
| 4 | Dragon's Lair | 18/16 hrs | 25/20 | Young Dragon, Fire Vent, Drake Pack, Hoard | Elder Dragon | 120-400g |
| 5 | The Abyss | 22/20 hrs | 40/35 | Demon Soldiers, Void Rift, Shadow Fiends, Vault | Azrathor | 250-600g |

**Encounter Tables (per floor):**
- Each floor has 4 encounters in the pool (mix of combat, trap, treasure, healing)
- Floor run selects 3 random encounters + 1 boss = 4 total per attempt
- Traps are disarmable with Trade Guild Certificate
- Ghosts/ethereal enemies require Arcane Studies for full damage

**Education Dungeon Bonuses (6 degrees):**
- Trade Guild: Disarm traps (skip trap encounters)
- Combat Training: -15% damage received
- Master Combat: -25% damage + 10% attack (highest damage reduction wins, no stacking)
- Arcane Studies: Damage ghosts, +15% gold find
- Alchemy: 20% chance to find Healing Potion after encounters
- Scholar: +10% gold from dungeon activities

**Rare Drops (5% per floor clear):**
- Floor 1: Cave Mushroom (+20 HP heal)
- Floor 2: Goblin's Lucky Coin (+5% permanent gold from work)
- Floor 3: Undead Amulet (+10 permanent max health)
- Floor 4: Dragon Scale Shield (+20 DEF, +20% Block, equippable)
- Floor 5: Demon's Heart (+25 happiness, +5 all stat caps)

**Loot Multiplier by Guild Rank:**
- Novice: 80%, Apprentice: 90%, Journeyman: 100%, Adept: 110%
- Veteran: 120%, Elite: 135%, Guild Master: 150%

**Helper Functions:**
- `getFloor(id)` — Get floor by ID
- `checkFloorRequirements(floor, cleared, weapon, armor, stats)` — Returns canEnter + reasons
- `calculateEducationBonuses(degrees)` — Accumulated education combat bonuses
- `generateFloorEncounters(floor)` — Pick 3 random + boss for a run
- `getLootMultiplier(floor, rank)` — Gold multiplier by guild rank
- `getFloorTimeCost(floor, stats)` — Reduced time if overpowered
- `getHighestAvailableFloor(cleared)` — Next floor to attempt
- `getDungeonProgress(cleared)` — Summary for UI display

**Constants:**
- `ENCOUNTERS_PER_FLOOR = 4`
- `MAX_DUNGEON_FLOOR = 5`
- `MAX_FLOOR_ATTEMPTS_PER_TURN = 1`
- `HEALING_POTION_HP = 15`

**Design Decisions:**
- Damage reduction from education is non-stacking (best value wins) to prevent master-combat + combat-training giving 40% reduction
- Floor time cost has a "reduced" variant for overpowered players (1.5x minimum stats)
- Equipment requirements check both item equipped AND stat thresholds (can't skip dagger requirement with magic buffs)
- Encounters use basePower for combat formula and baseDamage for direct HP loss (traps/healing use baseDamage only)
- Boss encounters always have `requiresArcane` on Floors 3 and 5 (Lich and Demon Lord) — arcane studies gives significant advantage

### Files Created
- `src/data/dungeon.ts` — All dungeon data, types, and helper functions

### Files Not Modified
- `src/types/game.types.ts` — No changes needed (Player already has `dungeonFloorsCleared` from Phase 1)
- No other files modified — Phase 2 is data-only

### Status
- [x] Phase 1: Equipment system — **COMPLETE**
- [x] Phase 2: Dungeon data (dungeon.ts) — **COMPLETE**
- [ ] Phase 3: Cave UI overhaul (floor selection)
- [ ] Phase 4: Combat system (encounter resolution)
- [ ] Phase 5: Integration (quests + AI + balance)

---

## 2026-02-05 - Phase 1 Implementation: Equipment System

### What Was Done
Implemented the full equipment system (Phase 1 of the Rogue-Lite RPG plan).

**Types (game.types.ts):**
- Added `EquipmentSlot` type ('weapon' | 'armor' | 'shield')
- Added `EquipmentStats` interface (attack, defense, blockChance)
- Added to Player: `equippedWeapon`, `equippedArmor`, `equippedShield`, `dungeonFloorsCleared`

**Items (items.ts):**
- Extended Item interface with `equipSlot`, `equipStats`, `requiresFloorCleared`
- Added `armor` and `shield` to ItemCategory
- Updated existing weapons with combat stats (Dagger +5 ATK, Iron Sword +15 ATK, Shield +5 DEF/10% BLK)
- Added new equipment tiers:
  - Steel Sword (250g, +25 ATK, requires Floor 2)
  - Enchanted Blade (500g, +40 ATK, requires Floor 3)
  - Leather Armor (75g, +10 DEF)
  - Chainmail (200g, +20 DEF, requires Floor 2)
  - Plate Armor (450g, +35 DEF, requires Floor 3)
  - Enchanted Plate (900g, +50 DEF, requires Floor 4)
  - Iron Shield (120g, +10 DEF/15% BLK)
  - Tower Shield (300g, +15 DEF/25% BLK, requires Floor 2)
- Added helper functions: `getEquipmentBySlot()`, `getEquipStats()`, `calculateCombatStats()`

**Store (economyHelpers.ts, storeTypes.ts):**
- Added `equipItem(playerId, itemId, slot)` and `unequipItem(playerId, slot)` actions
- Updated `sellDurable` to auto-unequip sold items
- Player defaults include new fields (all null/empty)

**UI (ArmoryPanel.tsx):**
- Complete rewrite with sections: Clothing, Weapons, Armor, Shields
- Combat stats summary box (ATK/DEF/BLK with equipped item names)
- Buy items you don't own (with price, Jones-style dotted line)
- Equip/unequip owned items (green highlight when equipped)
- Locked items show floor requirement when not yet available
- Stat labels on all equipment items

**UI (CavePanel.tsx):**
- Equipment status display showing ATK/DEF/BLK
- Context-aware tips based on gear level
- Equipment now affects exploration:
  - Attack increases treasure find chance and gold amount
  - Defense reduces creature damage
  - Shield block chance halves damage on proc
  - Having a weapon enables fighting back (earn gold from creature encounters)
  - Without weapon: full damage, more happiness loss

### Files Modified
- `src/types/game.types.ts` — New types and Player fields
- `src/data/items.ts` — Equipment stats, new items, helper functions
- `src/store/storeTypes.ts` — equipItem/unequipItem in GameStore interface
- `src/store/helpers/economyHelpers.ts` — equip/unequip/sell logic
- `src/store/gameStore.ts` — Player defaults
- `src/components/game/ArmoryPanel.tsx` — Full equipment UI
- `src/components/game/CavePanel.tsx` — Equipment-aware combat
- `src/components/game/LocationPanel.tsx` — Pass new props to ArmoryPanel

### Status
- [x] Phase 1: Equipment system — **COMPLETE**
- [ ] Phase 2: Dungeon data (dungeon.ts)
- [ ] Phase 3: Cave UI overhaul (floor selection)
- [ ] Phase 4: Combat system (encounter resolution)
- [ ] Phase 5: Integration (quests + AI + balance)

---

## 2026-02-05 - Game Gap Analysis & Rogue-Lite RPG Design Proposal

### Task Summary
Comprehensive analysis of what's missing in the game, with design proposals for rogue-lite RPG elements including functional combat, equipment, and dungeon progression.

### Current State Analysis

**What EXISTS but is broken/cosmetic:**
- Weapons (Dagger, Iron Sword, Shield) exist as items but are **cosmetic only** — they give happiness bonuses, not combat stats
- Cave has two buttons (Explore/Rest) with hardcoded random outcomes (20% treasure, 40% creature dealing 8-22 damage)
- 21 quests exist with rank system (E through S), but all triggered from Guild Hall only
- No combat stats on Player interface (no attack, defense, equippedWeapon, equippedArmor)

**What was DESIGNED (in log.md) but NEVER IMPLEMENTED:**
- 5-floor dungeon system with progressive difficulty
- Equipment requirements per floor
- Encounter types (Rats, Goblins, Skeletons, Dragons, Demons)
- Combat resolution formula
- Education bonuses in combat
- `dungeon.ts` file — does not exist

**Missing Jones Features (from JONES_REFERENCE.md):**
- Stock Market / T-Bills trading system
- Loan system (Bank)
- Weekend activity system
- Doctor/Healer visit mechanic (sickness exists but no cure)
- Save/Load game (localStorage)

### Design Decision: Guild Hall vs Cave for Quests

**Recommendation: Guild Hall = accept quests, Cave = execute dungeon quests**

Reasoning:
1. Guild Hall is the "Employment Office" equivalent — it's where you get contracts/missions
2. The Cave is the unique location that differentiates this game from Jones in the Fast Lane
3. Non-dungeon quests (escort, merchant, investigation) remain "auto-complete" from Guild Hall
4. Dungeon quests require going to Cave and clearing specific floors
5. This creates a natural gameplay loop: Guild Hall → equip at Armory → enter Cave → return to Guild Hall

### Proposed System: Rogue-Lite Dungeon & Combat

#### 1. Equipment System (make weapons/armor functional)

**New Player fields:**
- `equippedWeapon: string | null` — currently equipped weapon ID
- `equippedArmor: string | null` — currently equipped armor ID
- `equippedShield: string | null` — currently equipped shield ID
- `attackPower: number` — calculated from weapon + education bonuses
- `defensePower: number` — calculated from armor + shield + education bonuses
- `dungeonFloorsCleared: number[]` — floors cleared at least once (e.g. [1, 2, 3])

**Weapons (Armory — expanded):**

| Weapon | Price | Attack | Unlock |
|--------|-------|--------|--------|
| Simple Dagger | 35g | +5 | Always |
| Iron Sword | 90g | +15 | Always |
| Steel Sword | 250g | +25 | Floor 2 cleared |
| Enchanted Blade | 500g | +40 | Floor 3 cleared |

**Armor (Armory — new):**

| Armor | Price | Defense | Unlock |
|-------|-------|---------|--------|
| Leather Armor | 75g | +10 | Always |
| Chainmail | 200g | +20 | Floor 2 cleared |
| Plate Armor | 450g | +35 | Floor 3 cleared |
| Enchanted Plate | 900g | +50 | Floor 4 cleared |

**Shields (Armory — expanded):**

| Shield | Price | Defense | Block% |
|--------|-------|---------|--------|
| Wooden Shield | 45g | +5 | 10% |
| Iron Shield | 120g | +10 | 15% |
| Tower Shield | 300g | +15 | 25% |

#### 2. Five-Floor Dungeon System

| Floor | Name | Time | Requirements | Enemies | Gold Range |
|-------|------|------|-------------|---------|------------|
| 1 | Entrance Cavern | 6 hrs | None | Rats, Bats | 15-40g |
| 2 | Goblin Tunnels | 10 hrs | Dagger + Floor 1 | Goblins, Traps | 30-80g |
| 3 | Undead Crypt | 14 hrs | Sword + Armor + Floor 2 | Skeletons, Ghosts | 60-150g |
| 4 | Dragon's Lair | 18 hrs | Steel Sword + Chainmail + Floor 3 | Young Dragons | 120-300g |
| 5 | The Abyss | 22 hrs | Enchanted Blade + Plate + Floor 4 | Demon Lords | 250-600g |

**Rogue-lite elements:**
- 3-4 random encounters per floor from encounter tables
- Last encounter is always a boss (must defeat to "clear" floor)
- One floor-clear attempt per turn (fatigue)
- Defeat = lose found gold, retreat to entrance, keep equipment
- Health reaching 0 in dungeon = same death system (resurrection if 100g savings)

#### 3. Combat Resolution Formula

```
Encounter Power = Floor Base × (1 + random(0, 0.5))
Player Power = attackPower + defensePower + educationBonus

Damage Taken = max(5, Encounter Power - defensePower × 0.6)
Shield Block = random < blockChance ? damage × 0.5 : 0
Gold Found = Floor Base Gold × (1 + attackPower / 100)

Results:
- Player Power > Encounter × 1.5 → Full Victory (max gold, min damage)
- Player Power > Encounter → Victory (normal gold, normal damage)
- Player Power > Encounter × 0.5 → Pyrrhic Victory (half gold, double damage)
- Else → Defeat (no gold, heavy damage, forced retreat)
```

#### 4. Education Bonuses in Dungeon

| Degree | Combat Effect |
|--------|---------------|
| Trade Guild Certificate | Disarm traps (skip trap encounters on Floor 2) |
| Combat Training | -15% damage received |
| Master Combat | -25% damage received, +10% attack power |
| Arcane Studies | Can damage ghosts on Floor 3, +15% gold find |
| Alchemy | 20% chance to find Healing Potion after encounters |
| Scholar Degree | +10% XP/gold from all dungeon activities |

#### 5. Rare Drops (Rogue-Lite Loot)

5% chance per floor clear for a unique drop:
- Floor 1: "Cave Mushroom" — consumable, +20 health
- Floor 2: "Goblin's Lucky Coin" — permanent +5% gold from all work
- Floor 3: "Undead Amulet" — permanent +10 max health
- Floor 4: "Dragon Scale Shield" — equippable, +20 defense, +20% block
- Floor 5: "Demon's Heart" — one-time +25 happiness, +5 to all stat caps

#### 6. Quest Integration with Dungeon

Move dungeon quests from "auto-complete at Guild Hall" to requiring actual floor clears:

| Quest | Rank | Requirement | Reward |
|-------|------|------------|--------|
| Rat Extermination | E | Clear Floor 1 | 25g, +2 happiness |
| Goblin Bounty | D | Clear Floor 2 | 50g, +5 happiness |
| Crypt Cleansing | C | Clear Floor 3 | 100g, +8 happiness |
| Dragon Slayer | A | Defeat Floor 4 boss | 250g, +15 happiness |
| Seal the Abyss | S | Defeat Floor 5 boss | 500g, +30 happiness |

Non-dungeon quests (escort, investigation, delivery) remain auto-complete from Guild Hall.

#### 7. Implementation Plan

**Phase 1 — Equipment System:**
- Add combat fields to Player interface in `game.types.ts`
- Add attack/defense stats to weapons/armor in `items.ts`
- Add equip/unequip actions to gameStore
- Update Armory UI to show equip buttons and combat stats

**Phase 2 — Dungeon Data:**
- Create `src/data/dungeon.ts` with floor definitions, encounter tables, boss data
- Add floor unlock logic and requirement checks

**Phase 3 — Cave UI Overhaul:**
- Replace simple Explore/Rest buttons with floor selection interface
- Equipment check before entering a floor
- Show dungeon progress (floors cleared, best loot found)

**Phase 4 — Combat System:**
- Implement combat resolution with the formula above
- Add encounter-by-encounter progression through a floor
- Create combat result screen (damage taken, gold found, items found)
- Add boss encounter special mechanics

**Phase 5 — Integration:**
- Connect dungeon quests to floor clears
- Add rare drops to loot tables
- Education bonuses applied to combat calculations
- Grimwald AI: Add dungeon exploration to AI decision engine

### Other Missing Features (Priority Ordered)

| Feature | Priority | Description | Effort |
|---------|----------|-------------|--------|
| Save/Load Game | HIGH | localStorage save/load, critical for playability | Medium |
| Doctor/Healer Mechanic | HIGH | Cure sickness at Healer location (-10 hrs, -4 happiness, -30-200g) | Small |
| Stock Market/T-Bills | MEDIUM | Trading at Bank, T-Bills safe, stocks risky | Medium |
| Loan System | MEDIUM | Bank loans with interest and consequences | Small |
| Weekend Activities | LOW | Automatic between-turn activities with costs | Medium |
| Sound Effects | LOW | Audio feedback for actions | Large |

### Files to Create/Modify

**New files:**
- `src/data/dungeon.ts` — Floor definitions, encounter tables, loot tables, boss data
- `src/components/game/DungeonPanel.tsx` — Dungeon exploration UI (replaces CavePanel interior)

**Modified files:**
- `src/types/game.types.ts` — Add combat stats, equipment fields, dungeon progress to Player
- `src/data/items.ts` — Add attack/defense stats to weapons/armor, new equipment tiers
- `src/store/gameStore.ts` — Equip/unequip actions, dungeon actions
- `src/components/game/CavePanel.tsx` — Floor selection, equipment check, dungeon entry
- `src/components/game/ArmoryPanel.tsx` — Show combat stats, equip buttons
- `src/data/quests.ts` — Connect dungeon quests to floor requirements
- `src/hooks/ai/actionGenerator.ts` — Add dungeon exploration to Grimwald AI

### Status
- [x] Analysis complete
- [x] Design complete
- [ ] Phase 1: Equipment system
- [ ] Phase 2: Dungeon data
- [ ] Phase 3: Cave UI overhaul
- [ ] Phase 4: Combat system
- [ ] Phase 5: Integration

---

## 2026-02-05 - Full Economy & Happiness Balance Audit

### Task Summary
Performed a comprehensive audit of the game economy and happiness systems, comparing values against Jones in the Fast Lane reference. Found multiple balance issues causing gold to accumulate too fast, happiness to be trivially easy, and costs to be too low relative to income.

### Audit Findings

**Gold Income - Too High:**
1. **Work bonus (33%)**: 6hr shifts paid as 8hrs → entry jobs earned 320g/turn, mid-level 800g/turn
2. **Quest rewards**: S-rank quests gave 1000-1500g + 50-60 happiness — economy-breaking
3. **Cave exploration**: 30% chance of 20-70g for just 4 hours with no prerequisites
4. **Investment returns**: 2% weekly = 104% annual compound — infinite money engine
5. **Savings interest**: 0.5% weekly = 26% annual — too generous for safe storage

**Gold Sinks - Too Cheap:**
1. **Food**: Mystery Meat at 3g for +15 food, bread at 5g — starvation impossible
2. **Rent**: Slums at 50g/week — trivial when entry workers earn 200g+/turn
3. **Clothing**: Already reasonable

**Happiness - Trivially Easy:**
1. **Sleep**: +20 happiness for 8hrs — could max happiness in 1.5 turns
2. **Relax**: +10 happiness per use — Noble Heights (2hrs) = 5 happiness/hr rate
3. **Stolen Goods**: 20g for +10 happiness — cheapest happiness in the game
4. **Item purchases**: Enchanter items gave up to +15 happiness per purchase
5. **Cave explore**: 30% chance of +10 happiness for 4hrs

### Changes Applied

#### Gold Income Nerfs
| Source | Before | After | Reasoning |
|--------|--------|-------|-----------|
| Work bonus multiplier | 1.33x (33%) | 1.15x (15%) | Entry job per shift: 32g → 28g |
| E-rank quest gold | 15-30g | 10-25g | Slight reduction |
| D-rank quest gold | 40-60g | 30-40g | ~30% reduction |
| C-rank quest gold | 90-120g | 55-75g | ~40% reduction |
| B-rank quest gold | 180-250g | 100-150g | ~40% reduction |
| A-rank quest gold | 400-500g | 200-250g | ~50% reduction |
| S-rank quest gold | 1000-1500g | 500-750g | ~50% reduction |
| Cave treasure (gold) | 20-70g (30% chance) | 10-35g (20% chance) | Less gold, lower chance |
| Cave explore time | 4 hrs | 6 hrs | Fewer explores per turn |
| Investment returns | 2% weekly | 0.5% weekly | Prevents infinite money |
| Savings interest | 0.5% weekly | 0.1% weekly | Banks are safe, not profitable |

#### Happiness Nerfs
| Source | Before | After | Reasoning |
|--------|--------|-------|-----------|
| Sleep | +20 happiness | +5 happiness | Was trivial to max happiness |
| Relax | +10 happiness | +3 happiness | Consistent with Jones relaxation |
| Stolen Goods | +10 happiness (20g) | +3 happiness (30g) | Was cheapest happiness source |
| Ale | +3 happiness (3g) | +1 happiness (5g) | Too cheap |
| Candles | +2 happiness (10g) | +1 happiness (12g) | Minor item |
| Blanket | +5 happiness (25g) | +2 happiness (30g) | Overvalued |
| Glow Orb | +5 happiness (50g) | +2 happiness (60g) | Overvalued |
| Warmth Stone | +10 happiness (100g) | +3 happiness (120g) | Overvalued |
| Preservation Box (item) | +8 happiness (150g) | +2 happiness (175g) | Utility, not happiness |
| Scrying Mirror (item) | +15 happiness (300g) | +4 happiness (350g) | Was biggest happiness exploit |
| Dagger | +3 happiness (30g) | +1 happiness (35g) | Minor item |
| Iron Sword | +8 happiness (80g) | +2 happiness (90g) | Overvalued |
| Shield | +4 happiness (40g) | +1 happiness (45g) | Minor item |
| Encyclopedia | +5 happiness | +2 happiness | Utility, not happiness |
| Dictionary | +3 happiness | +1 happiness | Utility |
| Atlas | +4 happiness | +1 happiness | Utility |
| Education completion (old) | +10 happiness | +5 happiness | Matches Jones |
| E-rank quest happiness | 2-8 | 1-3 | Proportional reduction |
| B-rank quest happiness | 12-20 | 6-10 | Proportional reduction |
| S-rank quest happiness | 50-60 | 25-30 | Still rewarding but not game-ending |
| Cave treasure happiness | +10 | +3 | Proportional to gold nerf |
| Cave spring happiness | +5 | +2 | Slight reduction |
| Cave rest happiness | +3 | +1 | Minor |
| Cave danger happiness loss | -10 | -5 | Balanced with reduced gains |

#### Cost Increases
| Expense | Before | After | Reasoning |
|---------|--------|-------|-----------|
| Slums rent | 50g/week | 75g/week | +50% — more meaningful |
| Modest rent | 150g/week | 200g/week | +33% |
| Noble rent | 400g/week | 500g/week | +25% — luxury costs more |
| Noble relaxation rate | 2 hrs | 3 hrs | Was too efficient for happiness |
| Modest relaxation rate | 4 hrs | 5 hrs | Slight increase |
| Bread | 5g | 8g | Food is a real expense now |
| Cheese | 8g | 15g | More realistic |
| Salted Meat | 15g | 25g | ~1g per food point |
| Week of Provisions | 30g | 50g | 1g per food point |
| Feast Supplies | 50g | 85g | Slight premium |
| Mystery Meat | 3g (+15 food) | 6g (+10 food) | Was absurdly cheap |
| Stew | 8g (+20 food) | 12g (+15 food) | Slightly less efficient |
| Roast Dinner | 15g (+35 food) | 22g (+30 food) | More expensive |
| Tavern Feast | 30g (+50 food) | 45g (+50 food) | Price increase |

#### Other Changes
- Default happiness victory goal reduced from 100 to 75
- Cave explore time increased from 4 to 6 hours (fewer explores per turn)
- Cave rest time increased from 6 to 8 hours
- Cave danger chance increased from 30% to 40%
- Housing happiness bonuses reduced (Modest 5→3, Noble 15→5)

### Economy After Rebalance (example turn)

**Entry-level worker (Floor Sweeper, 4g/hr):**
- Per shift (6hrs): 7 * 4 = 28g (was 32g)
- Max shifts per turn: ~8 shifts (48hrs) = 224g (was ~320g)
- Weekly expenses: Rent 75g + Food ~25g = 100g
- Net per turn: ~124g (was ~220g) — more reasonable progression

**Mid-level worker (Market Vendor, 10g/hr):**
- Per shift (6hrs): 7 * 10 = 70g (was 80g)
- Max shifts: ~8 = 560g (was 800g)
- Net per turn: ~460g — still good but not economy-breaking

**Happiness per turn (Slums housing):**
- 3 relax sessions (24hrs) + 1 sleep (8hrs) = 9 + 5 = 14 happiness (was 50)
- Requires multiple turns to build happiness — makes it a real strategic choice

### Files Modified
- `src/store/helpers/workEducationHelpers.ts` — Work bonus 1.33→1.15, education completion +10→+5
- `src/store/helpers/turnHelpers.ts` — Investment 2%→0.5%, savings 0.5%→0.1%
- `src/data/quests.ts` — All quest gold and happiness rewards reduced 30-50%
- `src/data/items.ts` — Food prices increased, happiness values reduced across all items
- `src/data/housing.ts` — Rent increased, happiness bonuses reduced, relaxation rates adjusted
- `src/types/game.types.ts` — RENT_COSTS updated
- `src/components/game/CavePanel.tsx` — Gold, happiness, time, and risk rebalanced
- `src/components/game/HomePanel.tsx` — Relax +10→+3, Sleep +20→+5, tooltips updated
- `src/store/gameStore.ts` — Default happiness goal 100→75

### Verification
- Build passes (`npx vite build`)
- Tests pass (`npx vitest run`)

---

## 2026-02-05 - Fix Guild Job Location Restrictions & Raise Requirements

### Task Summary
Fixed two gameplay bugs:
1. Players could work and request raises at the Guild Hall even when their job was at a different location (e.g., Bank, Forge, Tavern)
2. Players could request a raise immediately after being hired without working any shifts

### Bug 1: Guild Hall Work Restriction

**Problem:**
The Guild Hall's work section checked `player.currentJob && currentJobData` but did NOT check if the job's `location` was `'Guild Hall'`. This meant a player employed as a Bank Janitor could visit the Guild Hall and work their shift there — which makes no sense.

**Fix:**
Added a `canWorkAtGuildHall` check: `currentJobData.location === 'Guild Hall'`. The work button and raise button now only appear at the Guild Hall when the player's job is actually located there. Other locations (Bank, Forge, Academy, etc.) already had correct location checks via the `WorkSection` component.

### Bug 2: Raise Without Working

**Problem:**
The `requestRaise` function had no check for how many shifts the player had worked. A player could get hired and immediately request (and potentially receive) a raise with 30-80% success chance.

**Fix:**
- Added `shiftsWorkedSinceHire` field to the Player interface (tracks work shifts since last hire)
- Field resets to 0 when: hired for a new job, fired for low dependability, or laid off due to market crash
- Field increments by 1 each time `workShift` is called
- `requestRaise` now requires at least 3 shifts worked before allowing a raise request
- Raise button is disabled in UI when insufficient shifts, with tooltip showing progress

### Files Modified
- `src/types/game.types.ts` - Added `shiftsWorkedSinceHire` field to Player interface
- `src/store/gameStore.ts` - Initialize `shiftsWorkedSinceHire: 0` for new players
- `src/store/helpers/playerHelpers.ts` - Reset `shiftsWorkedSinceHire` to 0 on `setJob`
- `src/store/helpers/workEducationHelpers.ts` - Increment counter in `workShift`, add minimum shift check in `requestRaise`
- `src/store/helpers/turnHelpers.ts` - Reset counter on fired/layoff events
- `src/components/game/LocationPanel.tsx` - Add `canWorkAtGuildHall` check, disable raise button when insufficient shifts

### Verification
- Build passes (`bun run build`)
- Tests pass (`bun run test`)

---

## 2026-02-05 - Jones-Style Home Interior Display

### Task Summary
When a player visits their home location (The Slums or Noble Heights), the center panel now shows a large visual room scene — just like in Jones in the Fast Lane's apartment view. The room displays owned appliances and durables as furniture, with Relax, Sleep, and Done buttons at the bottom.

### Features Implemented

**1. Full-Panel Home Scene (CSS Art)**
- The home view takes over the entire center panel (no parchment wrapper/header)
- Visual room scene drawn entirely with CSS: walls, floor, window, door, bed, table, chair
- Different visual themes for each housing tier:
  - **The Slums**: Dark stone walls, rough wood floor, cracks in walls, rats scurrying
  - **Noble Heights**: Purple/elegant walls, decorative wallpaper, chandelier, rug, painting
  - **Modest Dwelling**: Neutral brown tones (in-between)

**2. Appliances Displayed in Room**
- All 7 Jones-style appliances have assigned positions and emoji icons in the room:
  - Scrying Mirror (🪞), Memory Crystal (💎), Music Box (🎵), Cooking Fire (🔥), Preservation Box (📦), Arcane Tome (📖), Simple Scrying Glass (🔮)
- Broken appliances shown dimmed/greyed with ✗ indicator
- Durable items (candles, blanket, furniture, weapons, etc.) also shown in the room
- Appliance legend bar at bottom lists all owned items by name

**3. Action Buttons (Jones-Style)**
- **RELAX**: Green button, costs housing-tier hours (+10 happiness, +3 relaxation)
- **SLEEP**: Blue button, 8 hours (+20 happiness, +10 health, +5 relaxation)
- **DONE**: Brown button, closes the home panel
- Buttons disabled with visual feedback when not enough time
- Both Relax and Sleep now also increase the Relaxation stat (was missing before)

**4. Room Details**
- "Home Sweet Home" / "~ Noble Living ~" wall sign
- Window with moon/sun visible
- Door with handle
- Relaxation stat display in top-right corner
- Empty room hint text when no items owned

### Files Modified
- `src/components/game/HomePanel.tsx` - Complete rewrite with visual room scene
- `src/components/game/LocationPanel.tsx` - Home locations bypass parchment wrapper; pass `modifyRelaxation` and `onDone` props

### Technical Details
- Room scene uses absolute positioning with percentage-based coordinates for responsive scaling
- `clamp()` used throughout for font sizes to scale with viewport
- Housing tier determines wall/floor colors, decorative elements, and ambient details
- Appliance/durable positions are defined as constant maps for easy adjustment

### Visual Comparison (Jones → Guild Life)
| Jones | Guild Life |
|-------|------------|
| "LOW COST APARTMENT" header | "The Slums" header |
| Cockroaches in low-cost | Rats in slums |
| Furniture appears when bought | Appliances/durables appear when owned |
| RELAX button | RELAX button (+relaxation stat) |
| DONE button | DONE button |

---

## 2026-02-05 - Refactor Large Files

### Goal
Split the 4 largest source files into smaller, focused modules for maintainability.

### Changes

**gameStore.ts (1363 → 177 lines)**
Extracted Zustand store actions into factory-function helper modules:
- `src/store/storeTypes.ts` - SetFn/GetFn type aliases
- `src/store/helpers/playerHelpers.ts` - Player stat modifications (modifyGold, modifyHealth, etc.)
- `src/store/helpers/economyHelpers.ts` - Banking, rent, housing, appliance, buy/sell actions
- `src/store/helpers/turnHelpers.ts` - endTurn, startTurn, processWeekEnd logic
- `src/store/helpers/workEducationHelpers.ts` - workShift, studyDegree, completeDegree, requestRaise
- `src/store/helpers/questHelpers.ts` - Quest actions, death check, guild rank, eviction, victory check

Main gameStore.ts now imports and composes these via `create<GameStore>((set, get) => ({ ...createPlayerActions(set, get), ... }))`.

**LocationPanel.tsx (1104 → 448 lines)**
Extracted each location's switch case into its own component:
- `ActionButton.tsx` - Shared action button component
- `WorkSection.tsx` - Reusable work-shift section (jones/wood-frame variants)
- `TavernPanel.tsx` - Rusty Tankard (food/drink)
- `BankPanel.tsx` - Banking services
- `GeneralStorePanel.tsx` - Food & provisions
- `ArmoryPanel.tsx` - Clothing & weapons
- `AcademyPanel.tsx` - Education/degrees
- `LandlordPanel.tsx` - Housing & rent
- `CavePanel.tsx` - Cave exploration
- `ForgePanel.tsx` - Forge jobs
- `HomePanel.tsx` - Rest at noble-heights/slums

LocationPanel.tsx now delegates to these via the switch statement, passing store actions as props.

**useGrimwaldAI.ts (945 → 294 lines)**
Extracted pure logic into `src/hooks/ai/`:
- `types.ts` - AI types, interfaces, difficulty settings
- `strategy.ts` - Goal progress, resource urgency, job/degree selection, banking strategy
- `actionGenerator.ts` - The main `generateActions()` function (~400 lines of decision logic)

Main hook file now imports these modules and re-exports types for backwards compatibility.

**jobs.ts (813 → 1 line barrel re-export)**
Split into `src/data/jobs/`:
- `types.ts` - Job, JobOffer, Employer interfaces
- `definitions.ts` - All job constant arrays (GUILD_HALL_JOBS, FORGE_JOBS, etc.)
- `utils.ts` - canWorkJob, getAvailableJobs, getJobOffers, applyForJob, etc.
- `index.ts` - Barrel re-export

Original `jobs.ts` re-exports from `./jobs/index` for backwards compatibility.

### Result
- No file over 640 lines (sidebar.tsx is a shadcn/ui component, not ours)
- Build passes, tests pass
- All existing imports unchanged (backwards-compatible barrel re-exports)
- 24 new focused module files created

---

## 2026-02-05 - Fix Game Crash After 3 Rounds (Event Phase Not Handled)

### Problem
The game would suddenly "crash" and return to the title screen after approximately 3 rounds of play. This happened consistently when weekly events occurred (starvation, sickness, rent warnings, market crashes, etc.).

### Root Cause
In `src/pages/Index.tsx`, the `switch` statement that routes between screens based on `phase` did **not** handle the `'event'` phase:

```typescript
// BEFORE (broken)
switch (phase) {
  case 'title':      return <TitleScreen />;
  case 'setup':      return <GameSetup />;
  case 'playing':    return <GameBoard />;
  case 'victory':    return <VictoryScreen />;
  default:           return <TitleScreen />; // <-- 'event' falls here!
}
```

When `processWeekEnd()` in `gameStore.ts` fires at the end of each round of player turns, it generates event messages (food depletion, sickness, market crashes, rent warnings, etc.) and sets `phase: 'event'`. Since `Index.tsx` had no `case 'event'`, it fell through to the `default` case, which rendered `<TitleScreen />` — making the game appear to crash back to the start screen.

The `GameBoard` component already contains an `EventModal` that correctly handles the `'event'` phase and dismisses it back to `'playing'`, but it never got rendered because `Index.tsx` already switched away from it.

### Why After ~3 Rounds
After all players complete their turns, `processWeekEnd()` runs. There is a very high cumulative probability of at least one event message being generated each week:
- Food depletion always happens (25 per week), so starvation warnings trigger often
- 5% sickness chance per player per week
- Market crash events (5% pay cut, 3% layoff)
- Rent debt warnings after 4 weeks
- Shadowfingers theft events

By round 3, with food depleting and stats changing, the probability of hitting at least one event approaches ~100%.

### Solution
Added `case 'event'` to the switch statement in `Index.tsx`, falling through to render `<GameBoard />` (same as `'playing'`):

```typescript
// AFTER (fixed)
case 'playing':
case 'event':
  return <GameBoard />;
```

This allows the `EventModal` inside `GameBoard` to properly display and dismiss event messages.

### Files Modified
- `src/pages/Index.tsx` - Added `case 'event'` to phase routing switch

### Verification
- Build completes successfully (`bun run build`)
- The `'event'` phase now correctly shows the GameBoard with EventModal overlay
- Dismissing the event modal returns to `'playing'` phase as intended

---

## 2026-02-05 - Fix Game Startup Circular Dependency Error

### Problem
The game failed to start with JavaScript error:
```
ReferenceError: Cannot access 'I' before initialization
```

This error appeared in the minified production build, indicating a circular dependency issue during module initialization.

### Root Cause
Duplicate type definitions were causing circular dependency issues:
1. `DegreeId` was defined in BOTH `game.types.ts` AND `education.ts`
2. `EducationPath` was defined in `game.types.ts`, `education.ts`, AND `jobs.ts`

The import chain created a circular dependency:
- `gameStore.ts` → imports from `education.ts`
- `education.ts` → defined its own `DegreeId`
- `jobs.ts` → imported `DegreeId` from `education.ts` (local import)
- This created initialization conflicts during module loading

### Solution
Consolidated type definitions to have a single source of truth:

**education.ts:**
- Removed local `DegreeId` and `EducationPath` type definitions
- Import from `@/types/game.types` instead
- Added re-export for backwards compatibility with existing imports

**jobs.ts:**
- Changed import from `./education` to `@/types/game.types`
- Removed duplicate `EducationPath` type definition

**gameStore.ts:**
- Removed redundant `DegreeIdType` alias import

### Files Modified
- `src/data/education.ts` - Import and re-export types from game.types
- `src/data/jobs.ts` - Import types from game.types
- `src/store/gameStore.ts` - Remove redundant type alias

### Verification
- Build completes successfully (`bun run build`)
- Dev server starts without errors (`bun run dev`)
- No more circular dependency initialization errors

---

## 2026-02-05 - Cave & Dungeon Exploration System Design

### Task Summary
Designing a comprehensive dungeon exploration system for The Cave location - the unique feature that differentiates Guild Life Adventures from Jones in the Fast Lane.

### Design Goals
1. Make The Cave the game's unique selling point
2. Create equipment requirements (armor/weapons) for deeper exploration
3. Link education/skills to better quest outcomes
4. Provide meaningful progression through dungeon floors

### Proposed System: Multi-Floor Dungeon

**5 Dungeon Floors with Progressive Difficulty:**

| Floor | Name | Equipment Required | Education Bonus | Gold Range | Health Risk |
|-------|------|-------------------|-----------------|------------|-------------|
| 1 | Entrance Cavern | None | None | 20-50g | 5-15 |
| 2 | Goblin Tunnels | Dagger + Casual | Trade Guild: disarm traps | 40-100g | 15-25 |
| 3 | Undead Crypt | Sword + Leather Armor | Arcane Studies: damage ghosts | 80-200g | 25-40 |
| 4 | Dragon's Lair | Iron Sword + Chainmail + Combat Training | Master Combat: -20% damage | 150-400g | 40-60 |
| 5 | The Abyss | Full Plate + Master Combat + Arcane Studies | All bonuses stack | 300-1000g | 50-80 |

### New Equipment System

**Weapons (Armory):**
| Weapon | Price | Attack Bonus | Unlocks Floor |
|--------|-------|--------------|---------------|
| Dagger | 25g | +5 | 2 |
| Iron Sword | 100g | +15 | 3 |
| Steel Sword | 250g | +25 | 4 |
| Enchanted Blade | 500g | +40 | 5 |

**Armor (Armory):**
| Armor | Price | Defense Bonus | Unlocks Floor |
|-------|-------|---------------|---------------|
| Leather Armor | 50g | +10 | 3 |
| Chainmail | 150g | +25 | 4 |
| Plate Armor | 400g | +40 | 5 |
| Enchanted Plate | 800g | +60 | Bonus only |

### Education Bonuses in Dungeon

| Degree | Combat Effect |
|--------|---------------|
| Trade Guild Certificate | Can disarm traps (avoid trap damage) |
| Combat Training | -10% health damage received |
| Master Combat | -20% health damage, required for Floor 4 |
| Arcane Studies | +20% gold find, can damage ghosts |
| Alchemy | 15% chance to find healing potions |
| Scholar Degree | +10% XP from dungeon clears |

### Encounter Types per Floor

**Floor 1 - Entrance Cavern:**
- Rats, Bats (easy encounters)
- Lost treasure chests
- Healing spring (rare)
- Time: 4 hours

**Floor 2 - Goblin Tunnels:**
- Goblins (medium difficulty)
- Pit traps (Trade Guild disarms)
- Goblin treasure cache
- Time: 8 hours

**Floor 3 - Undead Crypt:**
- Skeletons (hard)
- Ghosts (need Arcane Studies to damage)
- Ancient artifacts
- Rare education scrolls
- Time: 12 hours

**Floor 4 - Dragon's Lair:**
- Young dragons (very hard)
- Dragon hoard treasure
- Legendary weapon drops (rare)
- Boss encounters possible
- Time: 16 hours

**Floor 5 - The Abyss:**
- Demon lords (extreme)
- Massive gold rewards
- Unique items (once per game)
- Victory point bonus (+5 happiness)
- Time: 20 hours

### Combat Resolution

```
Damage Received = Base Damage × (1 - Defense%) × (1 - Education%)
Gold Found = Base Gold × (1 + Attack%) × (1 + Education%)

Where:
- Defense% = Armor bonus / 100
- Attack% = Weapon bonus / 100
- Education% = Applicable degree bonuses
```

### Integration with Existing Systems

1. **Quest System:** Move dungeon-related quests to Cave
   - "Dungeon Dive" → Requires Floor 2 clear
   - "Monster Slaying" → Requires Floor 3 clear
   - "Dragon Slayer" → Requires Floor 4 boss kill

2. **Guild Rank:** Higher rank = better loot tables
   - Novice: 80% normal loot
   - Journeyman: 100% normal loot
   - Veteran: 120% normal loot
   - Elite: 150% normal loot

3. **Happiness:** Successful dives give happiness bonus
   - Floor 1 clear: +3
   - Floor 3 clear: +8
   - Floor 5 clear: +20

4. **Career Goal:** Dungeon clears count toward completedQuests

### Implementation Plan

**Phase 1: Equipment System**
- Add weapon/armor types to items.ts
- Add attack/defense stats to Player
- Update Armory UI to sell combat gear

**Phase 2: Dungeon Floor System**
- Create dungeon.ts with floor definitions
- Add floor unlock logic
- Create encounter tables

**Phase 3: Cave UI Overhaul**
- Floor selection interface
- Equipment check before entering
- Progress tracking (floors cleared)

**Phase 4: Combat System**
- Implement damage/loot calculations
- Add encounter resolution
- Create dungeon completion rewards

### Files to Modify
- `src/types/game.types.ts` - Add combat stats, equipment types
- `src/data/items.ts` - Add weapons and armor
- `src/data/dungeon.ts` - NEW: Dungeon floor definitions
- `src/store/gameStore.ts` - Add dungeon actions
- `src/components/game/LocationPanel.tsx` - Update Cave panel
- `src/components/game/DungeonPanel.tsx` - NEW: Dungeon exploration UI

### Status
- [x] Design complete
- [ ] Phase 1: Equipment system
- [ ] Phase 2: Dungeon floors
- [ ] Phase 3: Cave UI
- [ ] Phase 4: Combat system

---

## 2026-02-05 - Fix Workplace Access (Work Buttons)

### Task Summary
Fixed the bug where players could not work at Rusty Tankard even when employed there. Added "Work" buttons to all workplace locations so players can work shifts at their current job when visiting the appropriate location.

### Problem
- Players employed at Rusty Tankard (tavern jobs like Dishwasher, Cook, Barmaid) could not work their shifts
- The Rusty Tankard panel only showed food/drink items, with no work option
- Other locations like Bank, Academy, Armory, Enchanter, General Store, and Shadow Market also lacked work buttons

### Solution
Added conditional "Work" sections to all location panels that check:
1. If player has a current job
2. If that job's location matches the current location
3. If so, display a "Work Shift" button showing expected earnings

### Locations Updated

| Location | Job Types Available |
|----------|---------------------|
| Rusty Tankard | Dishwasher, Tavern Cook, Barmaid/Barkeep, Head Chef, Tavern Manager |
| Bank | Bank Janitor, Bank Teller, Guild Treasurer |
| General Store | Market Porter, Shop Clerk, Shop Manager |
| Academy | Library Assistant, Scribe, Teacher, Senior Teacher, Academy Lecturer, Sage, Weapons Instructor |
| Armory | City Guard, Caravan Guard, Arena Fighter |
| Enchanter | Scroll Copier, Enchantment Assistant, Alchemist, Potion Brewer |
| Shadow Market | Market Vendor |

### UI Implementation
Each location now displays a "WORK" section when applicable:
- Shows current job name and hourly wage
- "Work Shift" button with expected earnings (hours × wage × 1.33 bonus)
- Shows hours required per shift
- Button disabled if not enough time remaining

### Files Modified
- `src/components/game/LocationPanel.tsx` - Added work buttons to 7 location panels:
  - `rusty-tankard` case
  - `bank` case
  - `general-store` case
  - `academy` case
  - `armory` case
  - `enchanter` case
  - `shadow-market` case

### Technical Details
Each location panel now checks:
```typescript
const jobData = player.currentJob ? getJob(player.currentJob) : null;
const canWorkHere = jobData && jobData.location === 'Location Name';

// Then renders work section if canWorkHere && jobData
```

---

## 2026-02-05 - Smart Grimwald AI Opponent System

### Task Summary
Implemented a comprehensive, intelligent AI opponent system for Grimwald inspired by "Jones" from Jones in the Fast Lane (Sierra, 1991). The new AI uses goal-oriented decision making with difficulty levels.

### Features Implemented

**1. Three Difficulty Levels**
- **Novice Grimwald (Easy)**: 20% mistake chance, reactive decisions, 800ms action delay
- **Cunning Grimwald (Medium)**: 8% mistake chance, 2-turn planning depth, 500ms delay
- **Master Grimwald (Hard)**: 2% mistake chance, 3-turn planning depth, 300ms delay

**2. Goal-Oriented Decision Engine**
- Calculates progress toward all victory goals (Wealth, Happiness, Education, Career)
- Identifies weakest goal and prioritizes actions to improve it
- Adaptive strategy based on current game state

**3. Priority-Based Action System**
- **Critical Actions (85-100)**: Food (prevent starvation), rent (prevent eviction)
- **Goal Actions (60-85)**: Education, work, banking based on weakest goal
- **Strategic Actions (45-70)**: Job upgrades, housing upgrades, banking deposits

**4. Resource Management**
- Monitors food, rent, clothing, health urgency levels
- Makes intelligent decisions about resource allocation
- Prevents game-ending states (starvation, eviction)

**5. Strategic Behaviors**
- **Education**: Prioritizes degrees that unlock high-paying jobs
- **Career**: Gets jobs, upgrades when 20%+ better wage available
- **Banking**: Deposits excess gold to avoid robbery, withdraws when low
- **Housing**: Considers upgrading to Noble Heights to protect valuables

**6. Visual Feedback**
- "Grimwald is Scheming..." overlay during AI turns
- Animated icons (Bot, Brain) with difficulty-specific text
- Toast notifications for AI actions
- Console logging for debugging

### Files Created
- `src/hooks/useGrimwaldAI.ts` - New comprehensive AI decision engine (600+ lines)

### Files Modified
- `src/types/game.types.ts` - Added AIDifficulty type, difficulty names/descriptions
- `src/store/gameStore.ts` - Added aiDifficulty state, updated startNewGame signature
- `src/components/screens/GameSetup.tsx` - Added AI difficulty selector UI
- `src/components/game/GameBoard.tsx` - Integrated AI turn handling with visual feedback
- `agents.md` - Complete rewrite with new AI documentation
- `log.md` - Added this entry

### Technical Architecture

**DifficultySettings Interface:**
```typescript
interface DifficultySettings {
  aggressiveness: number;    // Goal pursuit intensity (0-1)
  planningDepth: number;     // Turns to plan ahead (1-3)
  mistakeChance: number;     // Suboptimal decision chance (0-1)
  efficiencyWeight: number;  // Time optimization value (0-1)
  decisionDelay: number;     // MS between actions
}
```

**Goal Progress Tracking:**
```typescript
interface GoalProgress {
  wealth: { current, target, progress };
  happiness: { current, target, progress };
  education: { current, target, progress };
  career: { current, target, progress };
  overall: number; // Average progress
}
```

**Action Priority System:**
- Each possible action gets a priority score (1-100)
- Actions sorted by priority, highest executed first
- Mistake chance can swap top two actions for easier difficulty
- Safety limit of 15 actions per turn prevents infinite loops

### Game Setup UI
Added difficulty selection when Grimwald is enabled:
- Three clickable buttons with icons (Brain/Zap/Crown)
- Shows selected difficulty with description
- Stores selection in game state

### References
Based on research from:
- [Jones in the Fast Lane Wiki](https://jonesinthefastlane.fandom.com/wiki/Jones)
- [MobyGames](https://www.mobygames.com/game/370/jones-in-the-fast-lane/)
- [Hardcore Gaming 101](http://www.hardcoregaming101.net/jones-in-the-fast-lane/)

---

## 2026-02-05 - Fix Responsive Layout (Consistent Screen Sizing)

### Task Summary
Fixed the game board layout to maintain consistent proportions regardless of screen size. The center panel, side panels, and game board now scale uniformly on all screen sizes.

### Problem
- Side panels used fixed pixel widths (`w-[180px]`)
- Game board margins were fixed (`mx-[180px]`)
- This caused layout inconsistencies on different screen sizes
- Elements would not scale proportionally when window size changed

### Solution
Implemented a viewport-based responsive container that maintains a 16:9 aspect ratio:

**Layout Structure:**
```
[Left Panel 12%] [Game Board 76%] [Right Panel 12%]
```

**Key Changes:**
1. **Main Container**: Uses CSS `min()` function to calculate dimensions
   - Width: `min(100vw, 177.78vh)` - limits width based on height
   - Height: `min(100vh, 56.25vw)` - limits height based on width
   - This ensures 16:9 aspect ratio while fitting any screen

2. **Side Panels**: Changed from fixed 180px to 12% of container width
   - Uses `flex-shrink-0` to prevent compression
   - Padding uses percentage (`p-[0.5%]`) for proportional spacing
   - Panel content padding also uses percentage (`p-[4%]`)

3. **Game Board**: Takes 76% of container width
   - Height fills container (`h-full`)
   - Background image uses `bg-contain` to maintain aspect ratio

4. **Center Panel**: Already used percentages, now scales with game board
   - Position percentages are relative to game board container
   - Maintains same proportions at all screen sizes

### Files Modified
- `src/components/game/GameBoard.tsx` - Complete layout restructure:
  - Replaced absolute positioned side panels with flex layout
  - Added viewport-based responsive container
  - Changed fixed pixel values to percentages
- `src/components/game/PlayerInfoPanel.tsx` - Changed padding to percentage
- `src/components/game/TurnOrderPanel.tsx` - Changed padding to percentage

### Technical Details

**Aspect Ratio Math:**
- 16:9 ratio means: width = 1.7778 × height, height = 0.5625 × width
- `min(100vw, 177.78vh)` ensures width doesn't exceed what 16:9 allows for screen height
- `min(100vh, 56.25vw)` ensures height doesn't exceed what 16:9 allows for screen width

**Layout Distribution:**
```typescript
const SIDE_PANEL_WIDTH_PERCENT = 12;  // Each side panel
const GAME_BOARD_WIDTH_PERCENT = 76;  // Center game board
// Total: 12 + 76 + 12 = 100%
```

**Container Styling:**
```tsx
<div
  className="relative flex items-stretch"
  style={{
    width: 'min(100vw, 177.78vh)',
    height: 'min(100vh, 56.25vw)',
  }}
>
```

### Result
The game now displays consistently on:
- Wide monitors (pillarboxed with black bars on sides)
- Tall monitors (letterboxed with black bars on top/bottom)
- 16:9 monitors (fills entire screen)
- All elements scale proportionally together

---

## 2026-02-05 - Standardize Panel Layout (Jones-Style UI)

### Task Summary
Standardized the center panel (info) layout at different locations to match the classic Jones in the Fast Lane UI style, with:
- Items displayed with dotted lines connecting names to prices (like "Hamburgers........ $83")
- Clean list format for employers, education options, etc.
- Section headers styled like the original game
- Consistent color scheme matching the retro aesthetic

### Files Created
- `src/components/game/JonesStylePanel.tsx` - New component library with:
  - `JonesPanel` - Main panel wrapper with dark background
  - `JonesPanelHeader` - Green header bar styled like Jones locations
  - `JonesPanelContent` - Content container
  - `JonesSectionHeader` - Brown sub-section headers
  - `JonesMenuItem` - Item with dotted line to price (........$XX)
  - `JonesListItem` - Simple list item (for employers, etc.)
  - `JonesInfoRow` - Label: value display row
  - `JonesButton` - Styled action button

### Panels Updated

**1. Rusty Tankard (Monolith Burgers equivalent)**
- Jones-style header with title and subtitle
- Food items listed with dotted prices
- Time cost indicator at bottom

**2. General Store (Black's Market equivalent)**
- Section headers for "FOOD & PROVISIONS" and "OTHER ITEMS"
- Items with dotted line pricing
- Newspaper and supplies in clean list format

**3. Shadow Market (Z-Mart equivalent)**
- Discount goods section
- Used magical items with break chance warning
- Appliances listed with happiness bonus notes

**4. Guild Hall / Employment Office**
- Employer list matching Jones' Employment Office style
- Simple list of employer names
- Current employment status section
- Job details with base wage and requirements
- Application result modals styled consistently

**5. Academy (Hi-Tech University equivalent)**
- Available courses listed with progress
- Graduate button for completed courses
- Locked courses section showing prerequisites

**6. Bank**
- Financial services with info rows
- Deposit/withdraw/invest options with prices

**7. Armory**
- Clothing and weapons sections
- Items with dotted line pricing

### Visual Style
- Dark brown background (`#3d3224`)
- Green header bars (`#2a5c3a`)
- Brown section headers (`#8b7355`)
- Gold accent color for prices (`#c9a227`)
- Cream text color (`#e0d4b8`)
- Dotted lines connecting labels to prices

### Files Modified
- `src/components/game/LocationPanel.tsx` - Updated 7 location panels
- `src/components/game/ShadowMarketPanel.tsx` - Full Jones-style rewrite
- `src/components/game/GuildHallPanel.tsx` - Full Jones-style rewrite

---

## 2026-02-05 - Fix Victory Goals Check

### Bug Description
The game was declaring victory even when the player had NOT achieved the victory goals. As shown in screenshot:
- Wealth: 150G (Goal: 2000G) - NOT MET
- Happiness: 68 (Goal: 75) - NOT MET
- Education: 0 (Goal: 2) - NOT MET
- Guild Rank: APPRENTICE (Rank 2+) - UNCLEAR

### Root Causes Found

**1. `checkVictory` was NEVER called:**
- The function existed but was never invoked during gameplay
- Only way to win was "last player standing" which didn't check goals

**2. Education check used wrong system:**
- Used old `player.education` object (fighter/mage/priest/business)
- Should use new Jones-style `completedDegrees` array
- Each degree = 9 education points

**3. VictoryScreen showed wrong message:**
- Always displayed "has achieved all victory goals!"
- Even when player won by "last standing" without meeting goals

### Fixes Applied

**1. Fixed `checkVictory` education calculation:**
```typescript
// Before: OLD education system
const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);

// After: Jones-style completedDegrees (9 points per degree)
const totalEducation = player.completedDegrees.length * 9;
```

**2. Added `checkVictory` call in `endTurn`:**
- Now checks if current player achieved victory goals before switching turns
- Returns early if victory achieved

**3. Updated VictoryScreen:**
- Detects "last standing" vs "goals achieved" victory
- Shows appropriate message for each type
- Added visual indicators (check/X) for each goal
- Green background for met goals, red for unmet

### Files Modified
- `src/store/gameStore.ts` - Fixed education calc, added checkVictory call in endTurn
- `src/components/screens/VictoryScreen.tsx` - Added goal checking and visual indicators

### Technical Details

**Victory now triggers correctly:**
```typescript
endTurn: () => {
  // Check victory goals BEFORE switching turns
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer && !currentPlayer.isGameOver) {
    if (get().checkVictory(currentPlayer.id)) {
      return; // Victory achieved
    }
  }
  // Continue with normal turn switching...
}
```

**VictoryScreen now shows:**
- Different messages: "has achieved all victory goals!" vs "is the last one standing!"
- Per-goal status: green checkmark for met, red X for unmet
- Proper education display using completedDegrees

---

## 2026-02-05 - Player Movement Animation, Home Location Start, and Job Fixes

### Task Summary
Implemented animated player movement along the board path, made players start each turn at their home location, and fixed job locations to match actual game board locations.

### 1. Animated Player Movement
Created a new animation system that shows player tokens moving step-by-step along the board path when traveling.

**Implementation:**
- Created `AnimatedPlayerToken.tsx` component that animates through path waypoints
- Uses `getPath()` to calculate the shortest route between locations
- Animation speed: 300ms per step along the path
- Player token is elevated above location zones during animation
- Movement completes with the actual game state update

**Key Features:**
- Player token visually moves through each intermediate location
- Current player indicator disabled during animation
- Click disabled on locations during animation to prevent conflicts
- Smooth CSS transitions for movement

### 2. Players Start at Home Location
Players now return to their housing location at the start of each turn (like Jones in the Fast Lane).

**Rules:**
- Slums/Homeless players start at "The Slums"
- Noble Heights players start at "Noble Heights"
- Applies at start of new turns and at start of new week

**Modified:**
- `endTurn()` - Moves next player to their home before starting turn
- `processWeekEnd()` - Moves first player to their home at week start
- `startTurn()` - Additional safety check for player location

### 3. Fixed Job Locations
Fixed jobs that referenced non-existent board locations:

**Before → After:**
- Military jobs (City Guard, Caravan Guard, Arena Fighter): "Guildholm"/"Arena" → "Armory"
- Court Advisor: "Noble Heights" → "Guild Hall"

### 4. Added Rusty Tankard Jobs (Monolith Burgers Equivalent)
Added 5 new tavern jobs at The Rusty Tankard (fantasy equivalent of Monolith Burgers):

| Job | Wage | Requirements |
|-----|------|--------------|
| Dishwasher | $4/hr | None |
| Tavern Cook | $5/hr | 10 Exp, 20 Dep, Casual |
| Barmaid/Barkeep | $6/hr | 15 Exp, 25 Dep, Casual |
| Head Chef | $10/hr | Trade Guild, 25 Exp, 35 Dep |
| Tavern Manager | $14/hr | Commerce, 40 Exp, 45 Dep, Dress |

### Files Created
- `src/components/game/AnimatedPlayerToken.tsx` - Animated movement component

### Files Modified
- `src/components/game/GameBoard.tsx` - Integrated animation system
- `src/store/gameStore.ts` - Home location start logic
- `src/data/jobs.ts` - Fixed locations, added TAVERN_JOBS

### Technical Details

**Animation System:**
```typescript
// Animation path state
const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
const [animationPath, setAnimationPath] = useState<LocationId[] | null>(null);

// Calculate path and start animation
const path = getPath(currentPlayer.currentLocation, destination);
setAnimatingPlayer(currentPlayer.id);
setAnimationPath(path);
```

**Home Location Logic:**
```typescript
// Determine home based on housing
const homeLocation: LocationId = player.housing === 'noble' ? 'noble-heights' : 'slums';

// Move player to home at turn start
set({
  players: state.players.map((p, index) =>
    index === nextIndex
      ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation }
      : p
  ),
});
```

---

## 2026-02-05 - CLAUDE.md and Victory Screen

### Task Summary
Created CLAUDE.md documentation file and implemented the Victory Screen to fix a TODO comment.

### 1. CLAUDE.md Created
Created a comprehensive CLAUDE.md file that provides:
- Project overview (fantasy life sim inspired by Jones in the Fast Lane)
- Tech stack documentation (React, TypeScript, Vite, Zustand, Tailwind)
- Quick commands for development
- Project structure overview
- Key files reference table
- Game mechanics summary (turn system, victory goals, locations, housing, jobs, education)
- Documentation file references
- Code conventions
- Testing instructions

### 2. Victory Screen Implemented
Fixed the TODO in `src/pages/Index.tsx` by creating a proper VictoryScreen component:

**Features:**
- Displays winning player's name with their color
- Shows animated victory banner with Crown, Trophy, and Star icons
- Final stats display showing:
  - Wealth (gold + savings + investments)
  - Happiness
  - Education level
  - Guild Rank
- Compares stats against victory goals
- "Return to Title" and "New Game" buttons
- Handles edge case when all players perished (Game Over screen)

### Files Created
- `CLAUDE.md` - Project documentation for Claude
- `src/components/screens/VictoryScreen.tsx` - Victory screen component

### Files Modified
- `src/pages/Index.tsx` - Replaced TODO with VictoryScreen import and usage

### Technical Details
```typescript
// Victory check (from gameStore.ts)
const totalWealth = player.gold + player.savings + player.investments;
const wealthMet = totalWealth >= goals.wealth;
const happinessMet = player.happiness >= goals.happiness;
const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);
const educationMet = totalEducation >= goals.education;
```

---

## 2026-02-05 - Side Panels, Direct Travel, Auto-Turn End, and Death System

### Task Summary
Implemented major UI and gameplay improvements to utilize the unused black areas on the sides of the game board and improve gameplay flow.

### 1. Left Side Panel - Player Info Panel
Created `PlayerInfoPanel.tsx` component that displays:
- Player name, color, and guild rank
- All vital stats with progress bars:
  - Time remaining (Hours)
  - Gold
  - Health
  - Happiness
  - Food level
  - Clothing condition
  - Dependability
  - Current wage (if employed)
  - Housing status
  - Experience
- Warning indicators for critical stats (low health, low food, etc.)
- Sick/Dead status indicators

### 2. Right Side Panel - Turn Order Panel
Created `TurnOrderPanel.tsx` component that displays:
- Turn order with all players
- Current turn indicator (crown icon)
- Each player's progress toward victory (circular progress indicator)
- Player status (gold, time remaining)
- Dead player indicators (skull icon, grayed out)
- AI player indicators (bot icon)
- Victory goals summary
- Game tip

### 3. Direct Travel on Click
**Before:** Players had to click a location, then click a "Travel to X" button
**After:** Clicking a location directly travels there if:
- Player has enough time
- Shows success toast with location name
- If not enough time, shows error toast but still opens location panel

### 4. Auto-Return to Housing When Time Runs Out
When a player's time reaches 0:
- Shows toast notification
- Automatically ends turn after 500ms delay
- Next player's turn begins

### 5. Player Death System
**Health reaches 0:**
- First checks for resurrection (requires 100g in savings)
- If can resurrect: Health restored to 50, moved to Enchanter
- If cannot resurrect: Player marked as `isGameOver: true`

**Game Over handling:**
- Dead players are skipped in turn order
- Dead players don't receive weekly effects
- If only one player remains alive, they win automatically
- If all players die, game shows "All players have perished"

### Files Created
- `src/components/game/PlayerInfoPanel.tsx` - Left side player stats panel
- `src/components/game/TurnOrderPanel.tsx` - Right side turn order panel

### Files Modified
- `src/components/game/GameBoard.tsx` - Added side panels, direct travel, auto-return logic
- `src/store/gameStore.ts` - Updated endTurn, processWeekEnd, checkDeath for death system
- `src/types/game.types.ts` - Added `isGameOver` field to Player interface

### Layout Changes
- Left panel: 180px wide, shows current player info
- Right panel: 180px wide, shows turn order and goals
- Game board container: Adjusted with margins for side panels

### Technical Details
```typescript
// Direct travel implementation
const handleLocationClick = (locationId: string) => {
  if (isCurrentLocation) {
    // Toggle location panel
  } else {
    const moveCost = getMovementCost(currentLocation, locationId);
    if (timeRemaining >= moveCost) {
      movePlayer(playerId, locationId, moveCost);
      toast.success(`Traveled to ${locationName}`);
    } else {
      toast.error('Not enough time!');
    }
  }
};

// Auto-return when time runs out
useEffect(() => {
  if (currentPlayer && phase === 'playing') {
    if (currentPlayer.timeRemaining <= 0) {
      toast.info(`${name}'s time is up! Returning home...`);
      setTimeout(() => endTurn(), 500);
    }
  }
}, [currentPlayer?.timeRemaining]);
```

---

## 2026-02-05 - Jones in the Fast Lane Wiki Reference Documentation

### Task
Created comprehensive reference documentation by scraping the Jones in the Fast Lane wiki (jonesinthefastlane.fandom.com) to serve as an authoritative source for game mechanics implementation.

### Research Process
- Performed systematic web searches across all wiki categories
- Extracted information about: Goals, Time/Turns, Stats, Locations, Housing, Jobs, Education, Economy, Items, Food, Clothing, Robbery, Weekends, Stocks, Pawn Shop
- Direct wiki fetching was blocked (403), used web search to gather content

### Created: JONES_REFERENCE.md

A comprehensive 800+ line reference document containing:

**Goals System:**
- Wealth Goal: $100 = 1 point, need $10,000 for 100 points
- Happiness Goal: Multiple sources (+5 graduation, +3 computer, etc.)
- Education Goal: 9 points per degree, 11 degrees = 100 max
- Career Goal: Equals Dependability stat

**Time System:**
- 60 Hours per turn
- Movement costs ~1 Hour per location step
- Entering location = +2 Hours
- Starvation penalty = -20 Hours
- Doctor visit = -10 Hours, -4 Happiness, -$30-200

**Stats:**
- Experience: Gained by working, capped at maxExperience
- Dependability: Gained by working, capped at maxDependability
- Relaxation: 10-50 range, decreases by 1/turn, affects robbery chance

**Jobs:**
- 20+ jobs documented with wages and requirements
- Entry: $4-6/hr (Janitor, Cook)
- Mid: $8-14/hr (Checker, Butcher, Teacher)
- Top: $20-25/hr (Broker, Professor, Engineer, GM)
- Wages vary 50-250% based on economy

**Education:**
- 11 degrees in prerequisite tree
- 10 lessons per degree (reducible to 8 with items)
- Graduation bonus: +5 Happiness, +5 Dependability, +5 max caps

**Appliances:**
- Socket City: Higher prices, 1/51 break chance, better happiness
- Z-Mart: Lower prices, 1/36 break chance
- Full price list for TV, VCR, Stereo, Microwave, Refrigerator, Computer

**Robbery (Wild Willy → Shadowfingers):**
- Street: Week 4+, leaving Bank/Market, takes ALL cash, -3 Happiness
- Apartment: Low-Cost Housing only, 1/(relaxation+1) chance, -4 Happiness
- Items that can't be stolen: Computer, Refrigerator, Freezer, Encyclopedia, etc.

**Economy:**
- Fluctuates every turn
- Market crashes: Pay cuts (80%), Layoffs
- Affects item prices, job wages offered, new rent

**Weekend System:**
- Automatic activities between turns
- Ticket priorities: Baseball > Theatre > Concert
- Durable-triggered weekends (20% chance each)
- Cost ranges: Cheap ($5-20), Medium ($15-55), Expensive ($50-100)

### Implementation Mapping Table
Created complete mapping from Jones concepts to Guild Life fantasy equivalents:
- Locations (14 mapped)
- Appliances (7 mapped)
- Degrees (11 mapped)
- Characters (Wild Willy → Shadowfingers, Jones AI → Grimwald)

### Files Created
- `JONES_REFERENCE.md` - Comprehensive reference guide (800+ lines)

### Source References
30+ wiki pages cited including Goals, Turn, Locations, Jobs, Degrees, Economy, Wild Willy, Appliances, and more.

### Implementation Gap Analysis

**Fully Implemented (~80%):**
- Goals system (Wealth, Happiness, Education, Career)
- Time/Turn system (60 hours, turn structure)
- Stats (Experience, Dependability, Relaxation)
- Food system (Fast Food, Fresh Food, Starvation, Refrigerator)
- Clothing system (Casual, Dress, Business, wear out)
- Appliance/Durables system with break mechanics
- Shadowfingers robbery (Street and Apartment)
- Market crash events (Pay cuts, Layoffs)
- Lottery tickets
- Rent system with prepayment

**Partially Implemented:**
- Weekend/Relaxation system (mechanics exist but not as activities)
- Doctor/Healer visits (sickness exists but no healing mechanic)

**Not Implemented:**
- Stock Market/T-Bills trading system
- Loan system (request, interest, repayment)
- Entertainment tickets (Baseball, Theatre, Concert)
- Weekend activity costs ($5-100)

---

## 2026-02-05 - Jones-Style Turn System and Board Movement

### Research Summary (from jonesinthefastlane.fandom.com)

**Turn System:**
- Each player's turn is split into 60 Hours (time points)
- Players spend Hours on actions and movement
- Turn ends once all 60 Hours are spent
- Free actions may be performed after time runs out

**Movement:**
- Players move around a ring of locations on the board
- Full lap around the board costs ~10 Hours
- Players can move in either direction (clockwise/counter-clockwise)
- Shortest route is automatically calculated

**Starting Location:**
- Players start at their apartment (The Slums for new players)

**Starvation Penalty:**
- If no food at turn start: Lose 20 Hours (1/3 of turn!)
- Having a Refrigerator (Preservation Box) with food prevents this

### Implementation Completed

**60-Hour Turn System:**
- Changed `HOURS_PER_TURN` from 168 to 60 (Jones-style)
- Updated all time references to use the new constant
- ResourcePanel now shows "Hours" with proper 60-hour max

**Board Path System:**
- Created `BOARD_PATH` array defining the ring of 14 locations
- Path goes clockwise: noble-heights → general-store → bank → forge → guild-hall → cave → academy → enchanter → armory → rusty-tankard → shadow-market → fence → slums → landlord
- Added `calculatePathDistance()` function for shortest route
- Added `getPath()` function to get actual path between locations

**Movement Cost:**
- Each step along the path costs 1 Hour
- Maximum distance (half the board) = 7 Hours
- Shortest route is automatically chosen

**Starting Location:**
- Players now start in 'slums' instead of 'guild-hall'
- Matches Jones in the Fast Lane starting position

**Starvation Time Penalty:**
- Added check at turn start
- If no food and no Preservation Box: -20 Hours
- Shows event message explaining the penalty

### Files Modified
- `src/types/game.types.ts` - Added HOURS_PER_TURN constant (60)
- `src/data/locations.ts` - Added BOARD_PATH, calculatePathDistance(), getPath()
- `src/store/gameStore.ts` - Updated to use HOURS_PER_TURN, start in slums, starvation penalty
- `src/components/game/ResourcePanel.tsx` - Updated to show 60-hour max

### Board Path Layout
```
        noble-heights ─── landlord ─── slums ─── fence
              │                                    │
        general-store                        shadow-market
              │                                    │
            bank                            rusty-tankard
              │                                    │
            forge                              armory
              │                                    │
        guild-hall ─── cave ─── academy ─── enchanter
```

---

## 2026-02-05 - Jones-Style Housing & Appliances System

### Research Summary (from jonesinthefastlane.fandom.com)

**Low-Cost Housing (The Slums):**
- Wild Willy (Shadowfingers) robs players in Low-Cost Housing
- Apartment robbery only happens at Low-Cost Housing with durables
- Chance based on Relaxation stat (1/(relaxation+1)), ranging 2-9% per turn
- Le Securité (Noble Heights equivalent) is safe from robbery
- Players can lock in lower rent when economy drops
- Rent can be prepaid multiple weeks in advance
- Salary garnishment (50%) if rent is overdue

**Appliances (Socket City = Enchanter's Workshop):**
- All appliances can break, requiring repair
- Socket City items: lower break chance (1/51), higher repair cost
- Z-Mart items: higher break chance (1/36), cheaper to buy
- Pawn Shop items: same 1/36 break chance as Z-Mart
- Break chance only triggers if player has >$500 cash
- Repair cost: 1/20 to 1/4 of original purchase price
- Each break: -1 Happiness
- Happiness bonus only on FIRST purchase of each type

**Appliance Types (Jones → Fantasy):**
| Jones | Fantasy (Guild Life) | Socket City Price | Z-Mart Price | Happiness |
|-------|---------------------|------------------|--------------|-----------|
| Color TV | Scrying Mirror | 525g | 450g | +2/+1 |
| B&W TV | Simple Scrying Glass | - | 220g | +1 |
| VCR | Memory Crystal | 475g | 300g | +2/+1 |
| Stereo | Music Box | 325g | 350g | +2/+1 |
| Microwave | Cooking Fire | 276g | 200g | +1/turn |
| Refrigerator | Preservation Box | 876g | 650g | +2/+1 |
| Computer | Arcane Tome | 1599g | - | +3, random income |

**Pawn Shop Mechanics:**
- Pawn item: 40% of original price
- Redeem within few weeks: 50% of original price
- After expiry: item goes on sale for 50% price
- Pawned items from Socket City keep 1/51 break chance if redeemed
- Bought from Pawn Shop: always 1/36 break chance

### Implementation Plan

1. **Housing System Update:**
   - Add rent prepayment (pay multiple weeks ahead)
   - Add rent lock-in when signing new lease
   - Update landlord UI with these options

2. **Appliances System:**
   - Update items.ts with complete appliance list
   - Add breakChance and source (enchanter/market/pawn) to durables
   - Add appliance breakage check at start of turn
   - Add repair cost calculation

3. **Location Updates:**
   - Enchanter's Workshop: Full appliance shop (Socket City)
   - Shadow Market: Cheaper used appliances (Z-Mart)
   - The Fence: Pawn/redeem/buy mechanics for appliances

### Implementation Completed

**New Types Added (game.types.ts):**
- `ApplianceSource`: 'enchanter' | 'market' | 'pawn'
- `APPLIANCE_BREAK_CHANCE`: Break chances by source (1/51 enchanter, 1/36 market/pawn)
- `OwnedAppliance`: Interface with itemId, originalPrice, source, isBroken, purchasedFirstTime
- `AppliancesInventory`: Record of owned appliances
- Player fields: `appliances`, `applianceHistory`, `rentPrepaidWeeks`, `lockedRent`

**New Appliances (items.ts):**
| Fantasy Name | Jones Equivalent | Enchanter Price | Market Price | Happiness |
|--------------|-----------------|-----------------|--------------|-----------|
| Scrying Mirror | Color TV | 525g | 450g | +2/+1 |
| Simple Scrying Glass | B&W TV | - | 220g | +1 |
| Memory Crystal | VCR | 475g | 300g | +2/+1 |
| Enchanted Music Box | Stereo | 325g | 350g | +2/+1 |
| Eternal Cooking Fire | Microwave | 276g | 200g | +1/turn |
| Preservation Box | Refrigerator | 876g | 650g | +2/+1 |
| Arcane Tome | Computer | 1599g | - | +3, income |

**New Store Functions (gameStore.ts):**
- `buyAppliance(playerId, applianceId, price, source)` - Buy with happiness tracking
- `repairAppliance(playerId, applianceId)` - Fix broken appliance
- `pawnAppliance(playerId, applianceId, pawnValue)` - Pawn for 40% value
- `prepayRent(playerId, weeks, totalCost)` - Pay rent in advance
- `moveToHousing(playerId, tier, cost, lockInRent)` - Move with rent lock-in

**startTurn Updates:**
- Appliance breakage check (only if gold > 500)
- Auto-repair with cost deduction
- Cooking Fire per-turn happiness bonus (+1)
- Arcane Tome random income (15% chance, 10-60g)

**New UI Components:**
- `EnchanterPanel.tsx` - Socket City equivalent with repair section
- `ShadowMarketPanel.tsx` - Z-Mart equivalent with used appliances
- `PawnShopPanel.tsx` - Updated with appliance pawn/buy

**Landlord UI Updates:**
- Shows locked rent vs market rate
- Prepay 1/4/8 weeks options
- Moving locks in current market rate
- Shows savings when locked rate < market

### Files Modified
- `src/types/game.types.ts` - New appliance types and player fields
- `src/data/items.ts` - APPLIANCES array, helper functions
- `src/store/gameStore.ts` - New functions, startTurn appliance logic
- `src/components/game/LocationPanel.tsx` - Updated all relevant locations
- `src/components/game/PawnShopPanel.tsx` - Appliance pawn/buy
- `src/components/game/EnchanterPanel.tsx` - NEW
- `src/components/game/ShadowMarketPanel.tsx` - NEW

---

## 2026-02-05 - Guild Hall (Jones-Style Employment System)

### Implementation

Created Guild Hall panel - our fantasy version of Jones' Employment Office:

**Employer List View:**
- Shows list of employers (Guild Hall, General Store, Bank, Forge, Academy, etc.)
- Each employer shows number of available positions
- Click on employer to see their jobs

**Job Application System:**
- Click on a job to apply (costs 1 hour)
- System checks ALL qualifications:
  - Required degrees (education)
  - Required experience points
  - Required dependability percentage
  - Required clothing level
- Shows HIRED! or APPLICATION DENIED with specific reason

**Application Results:**
- Success: Shows offered wage (50-250% of base based on economy)
- Can accept or decline the offer
- Failure: Shows exactly what's missing (degrees, exp, dep, clothing)

### Files
- `src/components/game/GuildHallPanel.tsx` - Guild Hall job seeking panel
- `src/data/jobs.ts` - Added Employer interface, getEmployers(), applyForJob()
- `src/components/game/LocationPanel.tsx` - Integrated GuildHallPanel

---

## 2026-02-05 - Jones-Style Working System Overhaul

### Research Summary (from jonesinthefastlane.fandom.com)

**Jones in the Fast Lane Job System:**
- Jobs have base wages but actual offered wages vary 50-250% based on economy
- Players can request raises if market rate exceeds their current wage
- Market crashes can cause:
  - Pay cuts (wages reduced to 80%)
  - Layoffs (job loss)
- Experience and Dependability are capped at maximum values
- Each degree earned increases max caps permanently

### Implementation Completed

**Variable Wage Offers (Jones-style):**
- Jobs now offer wages between 50-250% of base wage
- Economy modifier affects wage offers
- UI shows wage quality indicators (🔥 Great pay! / ⚠️ Low offer)
- Players can see when market rate exceeds their current wage

**Market Crash Events:**
- 5% weekly chance of pay cut (20% wage reduction)
- 3% weekly chance of layoff (job loss)
- Events affect happiness and trigger event messages

**Experience/Dependability Caps:**
- Experience now properly capped at `maxExperience` (starts at 100)
- Dependability capped at `maxDependability` (starts at 100)
- Completing degrees increases these caps (+5 each)

**Employment Office Overhaul:**
- Guild Hall now shows "Employment Office" with job offers
- Each job shows offered wage with economy-based variation
- Color coding: green for high offers, red for low offers
- Current job market rate shown for raise negotiation

**Forge Job System Update:**
- Forge now uses variable wage offers
- Shows unavailable jobs message when lacking qualifications
- Earnings calculated with bonus multiplier

### Files Modified
- `src/data/jobs.ts` - Added JobOffer interface and getJobOffers function
- `src/data/events.ts` - Added market crash events and checkMarketCrash function
- `src/store/gameStore.ts` - Added market crash handling and experience caps
- `src/components/game/LocationPanel.tsx` - Updated Guild Hall and Forge UI

### Technical Details

**New Job Functions:**
```typescript
// Calculate offered wage (50-250% of base)
calculateOfferedWage(job: Job, economyModifier: number): JobOffer

// Get all available job offers with economy wages
getJobOffers(degrees, clothing, exp, dep, economy): JobOffer[]

// Check for market crash events
checkMarketCrash(hasJob: boolean): MarketCrashResult
```

---

## 2026-02-05 - Zone Configurations Update

### Completed
- Updated ZONE_CONFIGS in `src/data/locations.ts` with precise coordinates from visual editor
- Updated CENTER_PANEL_CONFIG in both `ZoneEditor.tsx` and `GameBoard.tsx`

### New Zone Coordinates
All coordinates are percentages relative to the game board:
- noble-heights: x=10.6, y=0.3, w=15.2, h=30.2
- landlord: x=30.9, y=2.5, w=9.9, h=18.9
- slums: x=41.9, y=1.1, w=18.2, h=21.2
- fence: x=61.1, y=0.0, w=13.1, h=20.6
- general-store: x=11.0, y=35.9, w=15.2, h=18.9
- shadow-market: x=74.7, y=0.8, w=14.9, h=18.8
- rusty-tankard: x=74.9, y=20.9, w=14.4, h=19.6
- armory: x=74.9, y=41.0, w=14.3, h=22.7
- forge: x=11.9, y=74.3, w=13.3, h=25.2
- guild-hall: x=26.9, y=77.0, w=14.3, h=23.0
- cave: x=45.0, y=78.0, w=10.0, h=22.0
- academy: x=58.9, y=77.0, w=14.8, h=22.8
- enchanter: x=74.6, y=65.0, w=15.0, h=35.0
- bank: x=10.9, y=55.8, w=14.6, h=17.0

### Center Panel Configuration
- top: 23.4%
- left: 26.7%
- width: 46.5%
- height: 53.4%

### Files Modified
- `src/data/locations.ts` - Updated ZONE_CONFIGS array
- `src/components/game/ZoneEditor.tsx` - Updated DEFAULT_CENTER_PANEL
- `src/components/game/GameBoard.tsx` - Updated DEFAULT_CENTER_PANEL

---

## 2026-02-05 - Jones in the Fast Lane Education/Jobs Overhaul

### Research Summary (from jonesinthefastlane.fandom.com)

**Jones in the Fast Lane Degree System:**
The original game has 11 degrees organized in a tree structure:

1. **Starting Degrees** (no prerequisites):
   - Trade School - unlocks mid-level jobs like Butcher
   - Junior College - gateway to advanced degrees

2. **From Trade School:**
   - Electronics - jobs at Socket City
   - Pre-Engineering → Engineering - factory top jobs

3. **From Junior College:**
   - Academic → Graduate School → Post Doctoral → Research (Professor path)
   - Business Administration - management jobs
   - Electronics (also requires Trade School)
   - Pre-Engineering (also requires Trade School)

4. **Key Jobs and Requirements:**
   - Entry: Janitor ($4-6/hr), Cook, Clerk
   - Mid: Butcher (Trade School), Checker ($10/hr)
   - High: Engineer ($23/hr), Broker ($22/hr), Professor ($20/hr)
   - Top: General Manager ($25/hr) - requires Engineering + Business Admin

**Graduation Bonuses:**
- +5 Happiness
- +5 Dependability
- +5 Max Dependability (permanent)
- +5 Max Experience (permanent)

**Course Mechanics:**
- 10 sessions to complete a degree
- $50 base enrollment fee
- Up to 4 courses simultaneously
- Each degree = +9 education points

### Plan for Guild Life Adventures

Adapt the Jones system to fantasy setting:

**Education Paths (replacing current 4-path system):**
1. **Trade Guild** (Trade School equivalent) → unlocks basic trade jobs
2. **Junior Academy** (Junior College) → gateway to advanced paths
3. **Arcane Studies** (Electronics) → enchanting/magic tech jobs
4. **Combat Engineering** (Pre-Engineering → Engineering) → forge/factory jobs
5. **Scholar's Path** (Academic → Grad → Post Doc → Research) → professor/sage
6. **Commerce Academy** (Business Admin) → management jobs

**Fantasy Job Equivalents:**
- Clerk → Shop Assistant
- Butcher → Market Vendor
- Broker → Guild Treasurer
- Engineer → Master Artificer
- Professor → Sage/Loremaster
- General Manager → Guild Master (location)

### Implementation Completed

**New Degree System (11 degrees like Jones):**
1. **Trade Guild Certificate** - Starting degree, unlocks basic trade jobs
2. **Junior Academy Diploma** - Starting degree, gateway to advanced studies
3. **Arcane Studies Certificate** - Requires Trade Guild, magic-related jobs
4. **Combat Training Certificate** - Requires Trade Guild, military jobs
5. **Master Combat Degree** - Requires Combat Training, top forge/military jobs
6. **Scholar Degree** - Requires Junior Academy, Teacher job
7. **Advanced Scholar Degree** - Requires Scholar, Senior Teacher
8. **Sage Studies Certificate** - Requires Advanced Scholar, Lecturer
9. **Loremaster Degree** - Requires Sage Studies, Sage/Court Advisor jobs
10. **Commerce Degree** - Requires Junior Academy, management jobs
11. **Alchemy Degree** - Requires Arcane Studies + Junior Academy, Alchemist jobs

**New Job System (30+ jobs across 8 locations):**
- Entry-level: Floor Sweeper ($4/hr), Market Porter ($4/hr), Forge Laborer ($4/hr)
- Mid-level: Market Vendor ($10/hr - Trade Guild), Journeyman Smith ($10/hr)
- High-level: Teacher ($14/hr - Scholar), Guild Accountant ($14/hr - Commerce)
- Top-level: Forge Manager ($23/hr), Guild Treasurer ($22/hr), Sage ($20/hr)
- Ultimate: Guild Master's Assistant ($25/hr - requires 3 top degrees!)

**Graduation Bonuses (like Jones):**
- +5 Happiness
- +5 Dependability
- +5 Max Dependability (permanent)
- +5 Max Experience (permanent)

### Files Modified
- `src/data/education.ts` - Complete rewrite with Jones-style degree tree
- `src/data/jobs.ts` - 30+ new jobs with degree requirements
- `src/types/game.types.ts` - Added DegreeId type and player fields
- `src/store/gameStore.ts` - Added studyDegree/completeDegree functions
- `src/components/game/LocationPanel.tsx` - New Academy UI with degree progression

---

## 2026-02-05 - Shadowfingers Robbery System

### Completed
- Implemented Shadowfingers character - a criminal who robs players
- Added Street Robbery system (triggered when leaving Bank or Black's Market)
- Added Apartment Robbery system (triggered at start of turn for slums residents)
- Added Relaxation stat (10-50, affects apartment robbery chance)
- Added Durables system (items stored at apartment, can be stolen)
- Added educational items (Encyclopedia, Dictionary, Atlas) that cannot be stolen
- Created ShadowfingersModal component with newspaper-style headline display
- Integrated robbery checks into game flow

### Street Robbery Rules
- Only triggers on Week 4 or later
- Only when leaving Bank (1/31 chance, ~3.2%) or Black's Market (1/51 chance, ~1.95%)
- Only if player has cash
- Takes ALL player cash
- -3 Happiness penalty

### Apartment Robbery Rules
- Only affects players in slums housing
- Only if player owns durables
- Chance = 1 / (relaxation + 1), ranging ~2% to ~9% per turn
- Each durable type has 25% chance to be stolen (all items of that type)
- Encyclopedia, Dictionary, Atlas CANNOT be stolen
- -4 Happiness penalty

### Files Added
- `src/data/shadowfingers.ts` - Robbery logic and constants
- `src/components/game/ShadowfingersModal.tsx` - Robbery event modal with image

### Files Modified
- `src/types/game.types.ts` - Added DurableItems interface, relaxation stat, previousLocation tracking
- `src/data/items.ts` - Added isDurable/isUnstealable flags, educational items, ACADEMY_ITEMS
- `src/store/gameStore.ts` - Added robbery checks, durables management, ShadowfingersEvent state
- `src/components/game/GameBoard.tsx` - Integrated ShadowfingersModal

### Image Setup
To display the Shadowfingers character image, save the provided image to:
`src/assets/shadowfingers.jpg`

---

## 2026-02-05 - Editor Board Info Controls

### Completed
- Enhanced Zone Editor to support center info panel editing
- Added drag-to-move and drag-to-resize for center panel (yellow area)
- Added numeric input fields for precise center panel adjustments
- Updated export function to include both zone configs AND center panel config
- Center panel position now syncs between editor and game board in real-time

### New Features
- **Center Panel Editing**: Click the yellow "Info Panel" button in Zone Editor sidebar
  - Drag the yellow panel to reposition
  - Drag corner handle to resize
  - Use numeric inputs for precise positioning
- **Enhanced Export**: "Copy Config" now exports:
  - `ZONE_CONFIGS` for all location zones
  - `CENTER_PANEL_CONFIG` for the info panel position
- Center panel changes apply immediately when clicking "Apply"

### Files Modified
- `src/components/game/ZoneEditor.tsx` - Added CenterPanelConfig type, center panel editing UI
- `src/components/game/GameBoard.tsx` - Added centerPanel state, uses editable positions

### Export Format Example
```typescript
// Zone configurations for game board locations
export const ZONE_CONFIGS: ZoneConfig[] = [
  { id: 'noble-heights', x: 0.0, y: 0.0, width: 10.0, height: 28.0 },
  // ... more zones
];

// Center info panel configuration
export const CENTER_PANEL_CONFIG = {
  top: 15.8,
  left: 15.2,
  width: 69.6,
  height: 49.2,
};
```

---

## 2026-02-05 - Game Board Zone System

### Completed
- Implemented robust zone-based coordinate system for game board
- Added new `ZoneConfig` interface for precise zone positioning (x, y, width, height percentages)
- Added `ZONE_CONFIGS` array in `locations.ts` for easy coordinate editing
- Added new location: "The Cave" with exploration and rest mechanics
- Created visual Zone Editor (`ZoneEditor.tsx`) with:
  - Drag-to-move zone positioning
  - Drag-to-resize zone sizing
  - Numeric input fields for precise adjustments
  - Grid overlay for alignment
  - Copy configuration to clipboard feature
- Added debug overlay to GameBoard (toggle with Debug button or Ctrl+Shift+D)
- Added Zone Editor button to GameBoard (Ctrl+Shift+Z to open)
- Center info panel clearly marked - ALL info text displays ONLY in center area

### New Features
- **Zone Editor**: Visual tool for adjusting zone boundaries
  - Open with "Edit Zones" button or Ctrl+Shift+Z
  - Drag zones to reposition
  - Drag corner handles to resize
  - Export updated coordinates to clipboard
- **Debug Overlay**: Shows zone boundaries on game board
  - Toggle with "Debug" button or Ctrl+Shift+D
  - Red overlays show location zones
  - Yellow overlay shows center info panel

### Files Modified
- `src/types/game.types.ts` - Added 'cave' LocationId, added ZoneConfig interface
- `src/data/locations.ts` - Added ZONE_CONFIGS, added Cave location
- `src/components/game/GameBoard.tsx` - Integrated zone editor and debug overlay
- `src/components/game/LocationPanel.tsx` - Added Cave location actions
- `src/components/game/ZoneEditor.tsx` - NEW: Visual zone editing tool

### Zone Coordinates (percentages)
```
Top row:
- noble-heights: x=0, y=0, w=10, h=28
- landlord: x=10, y=0, w=10, h=17
- slums: x=20, y=0, w=11, h=17
- fence: x=31, y=0, w=12, h=17
- general-store: x=43, y=0, w=10, h=17
- shadow-market: x=53, y=0, w=12, h=17

Right side:
- rusty-tankard: x=85, y=17, w=15, h=23
- armory: x=85, y=40, w=15, h=25

Bottom row:
- forge: x=0, y=65, w=14, h=35
- guild-hall: x=31, y=75, w=14, h=25
- cave: x=45, y=78, w=10, h=22
- academy: x=55, y=75, w=14, h=25
- enchanter: x=85, y=65, w=15, h=35

Left side:
- bank: x=0, y=28, w=10, h=22

Center Info Panel:
- top=15.8%, left=15.2%, width=69.6%, height=49.2%
```

### Notes
- The Zone Editor allows real-time adjustment of zone positions
- Use "Copy Config" button to export coordinates for permanent update in code
- Center panel (yellow area) is the ONLY place where info text should display
- All zones can now be precisely mapped to match the actual game board image

---

## 2026-02-05 - Game Text Localization Check

### Completed
- Verified ALL game text is already in English
- Translated `agents.md` from Norwegian to English
- Updated `log.md` format to English

### Files Verified (All in English)
**Data Files:**
- `src/data/items.ts` - Item names and descriptions
- `src/data/locations.ts` - Location names and descriptions
- `src/data/quests.ts` - Quest names and descriptions
- `src/data/events.ts` - Event names and messages
- `src/data/newspaper.ts` - Headlines and articles
- `src/data/jobs.ts` - Job names and descriptions
- `src/data/education.ts` - Course names and descriptions
- `src/data/housing.ts` - Housing tier names and descriptions

**Component Files:**
- `src/components/screens/TitleScreen.tsx` - Title and buttons
- `src/components/screens/GameSetup.tsx` - Setup labels
- `src/components/game/LocationPanel.tsx` - All location UI text
- `src/components/game/ResourcePanel.tsx` - Resource labels
- `src/components/game/QuestPanel.tsx` - Quest UI text
- `src/components/game/EventModal.tsx` - Event display text
- `src/components/game/HealerPanel.tsx` - Healer services
- `src/components/game/PawnShopPanel.tsx` - Pawn shop text
- `src/components/game/NewspaperModal.tsx` - Newspaper UI
- `src/components/game/GoalProgress.tsx` - Victory goals

**Type Files:**
- `src/types/game.types.ts` - Guild ranks, education paths, player colors

### Notes
- All 500+ game text strings are confirmed to be in English
- Documentation files (agents.md, log.md, todo.md) were in Norwegian - now translated
- No code changes required for game text

---

## 2026-02-05 - Documentation

### Completed
- Created `agents.md` - AI system documentation
- Created `log.md` - this development log
- Created `todo.md` - project task list
- Updated `README.md` with project-specific information
- Committed and pushed to `claude/create-documentation-files-b9oLb`

### Commit
```
87f0f2e Add project documentation files
```

### Notes
- Project is a fantasy version of "Jones in the Fast Lane"
- Built with React, TypeScript, Vite, Zustand, and Tailwind CSS
- All main mechanics are implemented per `plan.md`

---

## Previous Development (from commit history)

### ce47b05 - Align panel inside white frame
- Adjusted panel placement in user interface

### 96cd4df - Changes
- Various changes

### 933d9c3 - Center panel aligned precisely
- Precisely aligned center panel

### c08ecae - Changes
- Various changes

### dfb9c7f - Enhance Guild Life mechanics
- Improved game mechanics

---

## Log Template

```markdown
## DATE - TITLE

### Completed
- Item 1
- Item 2

### Issues
- Problem description

### Next Steps
- Upcoming tasks
```
