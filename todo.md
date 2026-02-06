# Guild Life Adventures - Todo List

## Completed (2026-02-05)

- [x] Full economy & happiness audit — all values rebalanced
  - Gold income reduced (work bonus, quests, cave, investments)
  - Happiness sources nerfed (relax, sleep, items, quests)
  - Costs increased (food, rent)
  - See log.md for full details

- [x] Quest reward balancing — gold rewards cut ~50% across all ranks
  - E-rank: 6-15g (was 10-25g)
  - D-rank: 18-22g (was 30-40g)
  - S-rank: 200-300g (was 500-750g)

- [x] Guild Pass system — 500g required before taking quests
  - Prevents immediate quest grinding from turn 1
  - Forces early-game job/income focus
  - AI updated to buy pass when affordable

- [x] Homeless penalties — real consequences for no housing
  - -5 health, -8 hours per turn
  - 3x street robbery chance, 2x weekly theft
  - Makes housing an urgent early priority

## Completed (2026-02-05)

- [x] Movement path drawing system in Zone Editor
  - Zones/Paths mode toggle
  - SVG path visualization on board
  - Click to add waypoints, drag to reposition, right-click to remove
  - Waypoint coordinate editing in properties panel
  - AnimatedPlayerToken follows waypoints instead of straight lines
  - Debug overlay shows movement paths
  - Export includes MOVEMENT_PATHS in copied config

## Completed (Phase 4 - Combat System)

- [x] Implement combat resolution formula (Player Power vs Encounter Power)
  - Extracted `resolveEncounter()` from Phase 3 auto-resolve
  - Same formula: power ratio, damage reduction, block chance, gold scaling
  - Pure-function state machine in `src/data/combatResolver.ts`
- [x] Add encounter-by-encounter floor progression
  - State machine: encounter-intro → encounter-result → floor-summary
  - Player steps through each encounter individually
  - HP bar and encounter counter shown throughout
- [x] Create combat result display (damage, gold, items found)
  - Per-encounter results: damage, gold, healing, potion drops
  - Education bonus activation display (which bonuses triggered)
  - Low health warning at ≤30%
  - Floor summary with complete encounter log and totals
- [x] Add boss encounter mechanics
  - Special red-themed boss cards with "Floor Boss" label
  - "Fight Boss!" action button
  - No retreat once boss encounter is next
  - Boss defeat required to clear floor
- [x] Add education bonuses to combat display
  - Shows which bonuses activated per encounter (Trap Sense, Arcane Sight, dmg reduction, ATK bonus, gold bonus, Potion Brewing)
  - Bonuses listed in encounter result view
- [x] Add retreat mechanic (new feature)
  - Between encounters, player can "Retreat" to keep earned gold
  - Floor not marked cleared on retreat
  - No happiness penalty for strategic retreat
  - Cannot retreat once committed to boss fight
- [x] Add auto-resolve function for AI (Phase 5 prep)
  - `autoResolveFloor()` in combatResolver.ts
  - Same resolution logic, runs all encounters without UI
  - Ready for Grimwald AI integration in Phase 5
- [x] TypeScript compiles cleanly, build succeeds, tests pass

## Completed (Phase 5 - Integration: Quests + AI + Balance)

- [x] Quest ↔ Dungeon connection — dungeon-dive requires Floor 1, deep-dungeon-clear requires all 5
- [x] Rare drops integration — all 5 effect types (heal, gold bonus, max health, equippable, happiness+stats)
- [x] Dragon Scale Shield added as RARE_DROP_ITEMS (auto-equip on drop, unstealable)
- [x] permanentGoldBonus field on Player — applied in workShift earnings
- [x] Grimwald AI dungeon exploration — getBestDungeonFloor, autoResolveFloor, equipment buying
- [x] Grimwald AI quest system — getBestQuest, shouldBuyGuildPass, take/complete quest
- [x] Grimwald AI equipment strategy — getNextEquipmentUpgrade (weapon/armor/shield upgrade paths)
- [x] Guild rank loot multiplier connected — 0.8× novice → 1.5× guild-master applied to combat gold
- [x] TypeScript compiles cleanly, build succeeds, tests pass, no new ESLint errors

## Completed (2026-02-05)

- [x] Fix single-player "last man standing" auto-win bug
  - Added `players.length > 1` guard to both `endTurn()` and `processWeekEnd()`
  - Single-player must now complete all victory goals to win
  - Multiplayer "last man standing" still works correctly

## Completed (2026-02-06)

- [x] Bugfix Batch A — 4 bugs fixed
  - [x] Education progress display: GoalProgress now uses `completedDegrees.length * 9` matching checkVictory
  - [x] Work income display: WorkSection now uses 1.15 bonus matching actual workShift calculation
  - [x] Async import race conditions: Replaced `import().then()` with static imports in economyHelpers and questHelpers
  - [x] modifyMaxHealth inconsistency: Uses clamped newMaxHealth for health cap; fixed applyRareDrop too

## Completed (2026-02-06)

- [x] Feature Batch B — 6 missing Jones features implemented
  - [x] B1: Stock Market — 3 stocks + Crown Bonds (T-Bills), broker UI at Bank, weekly price fluctuations, market crashes
  - [x] B2: Loan System — Bank loans (100-1000g), 10% weekly interest, 8-week repayment, forced collection on default
  - [x] B3: Weekend System — 3 ticket types, 5 durable weekends, 25+ random activities, auto-runs in processWeekEnd
  - [x] B4: Doctor Visit Triggers — 25% on starvation, 20% on low relaxation, -10h/-4hap/-30-200g
  - [x] B5: Food Storage — Fresh food units in Preservation Box (6 max), Frost Chest doubles to 12, auto-consume, spoilage
  - [x] B6: Lottery (Fortune's Wheel) — Tickets at Shadow Market, weekly drawing, 2% grand (5000g), 5% small (50g)

## Completed (2026-02-06)

- [x] Technical Debt Batch E — 5 items resolved
  - [x] E1: Real unit tests — 91 tests across 5 files (victory, economy, work, education, game actions)
  - [x] E2: Deduplicate GUILD_PASS_COST — import from game.types instead of local copy
  - [x] E3: Input validation — 7 banking/stock/loan functions validated (negative, NaN, Infinity, overflow)
  - [x] E4: LocationId types — events.ts uses HousingTier/LocationId instead of string
  - [x] E5: Legacy education cleanup — removed dead PATH_TO_DEGREES/EDUCATION_PATHS, fixed 2 display components

## Completed (2026-02-06)

- [x] Zone Editor localStorage persistence
  - [x] Created `src/data/zoneStorage.ts` — save/load/clear utility with `guild-life-zone-config` key
  - [x] GameBoard loads saved zone config on mount (zones, centerPanel, movement paths)
  - [x] "Apply & Save" persists all zone editor changes to localStorage
  - [x] "Reset Defaults" button clears localStorage and restores hardcoded values
  - [x] ZoneEditor initializes from saved state instead of hardcoded defaults

## Completed (2026-02-06)

- [x] Audio & Music System — background music with crossfade transitions
  - [x] AudioManager singleton with dual-deck A/B crossfade engine
  - [x] Music config mapping locations and screens to MP3 tracks
  - [x] useMusicController hook drives music from game phase + player location
  - [x] Volume slider and mute toggle in Options tab
  - [x] Mute button on TitleScreen
  - [x] M keyboard shortcut for mute during gameplay
  - [x] 50% default volume, persistent settings (localStorage)
  - [x] 7 tracks: MainTheme, OnTheStreet, GuildHall, TheSlums, EnchantersWorkshop, RustyTankard, OhWhatAWeekend

## Completed (2026-02-06)

- [x] Job Market Wage Display — show real market-adjusted wages in job listings
  - Pre-calculate offered wages when selecting employer using `calculateOfferedWage(job, priceModifier)`
  - Job listings show market wage instead of base wage
  - Hired modal says "(Market rate at time of visit)" instead of showing base wage
  - Wage shown in listing = wage offered on hire (no more mismatch)

- [x] Dungeon Per-Encounter Time Cost — each encounter costs time, not just entry
  - Added `getEncounterTimeCost()` to dungeon.ts (floor time / 4 encounters, rounded up)
  - Entry charges one encounter's time; "Continue Deeper" charges another
  - "Leave Dungeon" option when out of time (keeps all gold, no retreat penalty)
  - Floor cards show per-encounter time + total (e.g. "2h/encounter (6h total)")
  - AI unaffected (still auto-resolves full floor with full time cost)

## Completed (2026-02-06)

- [x] Cave/Dungeon Audit — 5 bugs found and fixed
  - [x] Bug 1 (CRITICAL): dungeonAttemptsThisTurn not reset in processWeekEnd — permanent "Too fatigued" after 2 runs
  - [x] Bug 2: No checkDeath after dungeon combat — player survived at 0 HP until next turn
  - [x] Bug 3: Player paid 2h extra per floor vs AI due to Math.ceil rounding
  - [x] Bug 4: Defeat kept 100% gold while retreat kept 50% (perverse incentive) — defeat now keeps 25%
  - [x] Bug 5: Combat HP bar showed entry health instead of maxHealth — misleading at low HP

## Completed (2026-02-06)

- [x] Guild Hall Salary Negotiation — market rate raise for current job
  - If market wage > current wage, "Request Raise" button appears on current job listing
  - Shows salary comparison modal with old/new wage and raise amount
  - `negotiateRaise` store action updates wage without resetting shifts or dependability
  - Costs 1 hour to negotiate (same as job application)

## Completed (2026-02-06)

- [x] Players always start turn at home (Slums or Noble Heights)
  - Simplified `getHomeLocation()` — `noble` → Noble Heights, all others → The Slums
  - Matches Jones in the Fast Lane's two-apartment system
  - Previously `modest` mapped to Landlord (rent office) and `homeless` to Rusty Tankard (tavern)

## Completed (2026-02-06)

- [x] Preservation Box & Frost Chest Audit — 8 bugs fixed, 20 tests added
  - [x] Bug 1 (CRITICAL): Appliance breakage ran after food checks — broken box didn't spoil food until next turn
  - [x] Bug 2: freshFood not cleared on eviction — counter persisted after losing all appliances
  - [x] Bug 3: No event message when fresh food prevents starvation
  - [x] Bug 4: Food spoilage didn't trigger doctor visit (Jones: 25% chance on spoilage)
  - [x] Bug 5: InfoTabs showed 12 max even with broken Frost Chest (missing isBroken check)
  - [x] Bug 6: Frost Chest purchasable without Preservation Box (no prerequisite enforcement)
  - [x] Bug 7: No message when excess food spoils from overcapacity
  - [x] Bug 8: Misleading "Auto-consumed weekly" description in General Store
  - [x] 20 unit tests in src/test/freshFood.test.ts

## Completed (2026-02-06)

- [x] Location Panel Layout Overhaul — Jones-style menu system with NPC portraits
  - [x] Created `src/data/npcs.ts` — 12 NPC definitions (name, title, portrait, greeting, colors)
  - [x] Created `src/components/game/LocationShell.tsx` — portrait + tab layout wrapper
  - [x] Refactored `LocationPanel.tsx` — all 12 non-home locations use LocationShell with tabs
  - [x] Guild Hall split into Quests / Jobs / Work tabs (eliminates vertical scrolling)
  - [x] Enchanter split into Healing / Appliances / Work tabs
  - [x] Shadow Market split into Market / Work tabs
  - [x] Single-tab locations show content without tab bar (no wasted space)
  - [x] Work tab only visible when player works at that location
  - [x] TypeScript compiles, build succeeds

## Completed (2026-02-06)

- [x] Location Panel Layout Optimization — reduce scrolling, bigger NPC portraits
  - [x] NPC portrait: 96×96px → 128×144px (33%/50% bigger), emoji text-5xl → text-7xl
  - [x] Portrait column: w-28 → w-36, NPC name text-xs → text-sm
  - [x] Header compacted: two-line → single-line with inline description, text-lg → text-sm
  - [x] Padding reduced: p-3 → p-2 when at location
  - [x] Removed max-h constraints from 7 sub-panels (QuestPanel, GuildHallPanel, AcademyPanel, EnchanterPanel, PawnShopPanel)
  - [x] Content now fills full panel height via flex-1 overflow-y-auto (single scroll context)
  - [x] Build succeeds, all 112 tests pass

## Completed (2026-02-06)

- [x] Fix NPC portrait bug — empty content area on first location visit
  - Root cause: `LocationShell` reused across locations, `activeTab` state was stale
  - Fix: `key={locationId}` on `<LocationShell>` forces remount on location change
- [x] JPG/PNG NPC portrait support with emoji fallback
  - `NpcPortrait.tsx` component: tries `portraitImage`, falls back to emoji on error
  - All 12 NPCs have `portraitImage` paths pointing to `public/npcs/<name>.jpg`
  - Drop real images into `public/npcs/` to replace emoji placeholders

## Completed (2026-02-06)

- [x] NPC Placeholder Portraits — 12 placeholder JPG files created
  - 256×288px placeholders with accent colors, diamond emblem, name/title
  - All 12 locations: Aldric, Mathilda, Brynn, Gunther, Lyra, Shade, Elara, Magnus, Cave, Korr, Tomas, Whiskers
  - Replace with real art by dropping new files in `public/npcs/`

## Completed (2026-02-06)

- [x] Happiness Decay Rebalance — 6 fixes to prevent happiness draining too fast
  - [x] Fix 1: Apply housing happinessBonus per turn (BUG — was defined but never used)
  - [x] Fix 2: Reduce work happiness penalty (-2/wk9+ → -1/wk5+)
  - [x] Fix 3: Reduce starvation happiness penalty (15 → 8)
  - [x] Fix 4: Reduce theft/robbery happiness penalties (50-75% reduction, Jones-aligned)
  - [x] Fix 5: Increase relax/sleep happiness gains (Relax +3→+5, Sleep +5→+8)
  - [x] Fix 6: Weighted weekend activity selection (better activities more likely when affordable)

## Completed (2026-02-06)

- [x] Partial Travel — walk as far as possible when not enough time
  - GameBoard handles partial animation + auto-end-turn
  - LocationPanel shows "Head toward {location}" with warning text
  - Player uses all remaining hours, walks partial path, turn ends automatically

- [x] Equipment/Appliance Loss Notifications — 3 fixes
  - [x] Fix: Apartment robbery now unequips stolen equipment (was a bug — equipped items stayed after durable stolen)
  - [x] Eviction message now lists destroyed equipment and appliances by name
  - [x] Appliance breakage toast notification (was stored in state but never displayed)

## Completed (2026-02-06)

- [x] Cave Combat Damage Fix & Dungeon Audit — 4 issues fixed
  - [x] Bug 1 (CRITICAL): Player/AI not taking correct damage — `totalHealed` included wasted overheal, causing net damage to be underestimated (or negative). Fixed with `healthChange = currentHealth - startHealth`
  - [x] Bug 2 (FAIRNESS): AI kept 100% gold on defeat (player kept 25%). Fixed with `defeatGoldMult`
  - [x] Bug 3 (FAIRNESS): AI had no happiness penalty on defeat (player lost -2). Fixed
  - [x] Balance: Added Mushroom Grotto (+8 HP, Floor 2) and Sanctified Pool (+12 HP, Floor 3) healing encounters

## Completed (2026-02-06)

- [x] Cave/Dungeon Music — `20Cave.mp3` plays when player is at The Cave
  - Added cave track to `MUSIC_TRACKS` and `LOCATION_MUSIC` in `src/audio/musicConfig.ts`
  - AudioManager crossfades to cave music on entry, back to default on exit
  - Music persists throughout dungeon combat encounters

## Completed (2026-02-06)

- [x] Offline PWA Support — Progressive Web App with offline capability and installability
  - [x] vite-plugin-pwa integration with Workbox service worker
  - [x] Web App Manifest (name, icons, theme, landscape orientation)
  - [x] 9 PNG icon sizes + maskable icon + Apple touch icon from SVG source
  - [x] Service worker precaches all 64 assets (including 10MB game board)
  - [x] Runtime CacheFirst caching for music (1yr) and images (30d)
  - [x] usePWAInstall hook + Download button on TitleScreen
  - [x] HTML meta tags (theme-color, apple-mobile-web-app-capable)
  - [x] Build succeeds, 110/112 tests pass

## Completed (2026-02-06)

- [x] Multi-Platform Game Runner — deployable from both GitHub Pages and Lovable
  - [x] Dynamic base path via `DEPLOY_TARGET` env var (vite.config.ts)
  - [x] Safe lovable-tagger import (try/catch dynamic import)
  - [x] BrowserRouter basename from `import.meta.env.BASE_URL`
  - [x] Fixed 18+ hardcoded absolute asset paths (music, SFX, NPC portraits, links)
  - [x] GitHub Actions workflow for auto-deploy to GitHub Pages
  - [x] `build:github` script in package.json
  - [x] 404.html SPA redirect for GitHub Pages routing
  - [x] All 112 tests pass, both build targets succeed

## Completed (2026-02-06)

- [x] Forge, Cave & Turn-End Bug Fixes — 3 critical gameplay bugs fixed
  - [x] Bug 1: Forge work bypass — replaced ForgePanel with WorkSection (requires Guild Hall hire)
  - [x] Bug 2a: Cave damage deferred — now applied per-encounter via onEncounterHealthDelta callback
  - [x] Bug 2b: Mid-combat death — checkDeath called after each encounter, combat ends if player dies
  - [x] Bug 2c: AI missing death check — added checkDeath after Grimwald dungeon combat
  - [x] Bug 2d: Cave damage too low — increased base damage 40-60% across all 5 floors
  - [x] Bug 3a: Turn-end race condition — added scheduledEndTurnRef + timer guards to prevent double endTurn
  - [x] Bug 3b: Education Math.max — added Math.max(0) safety to studySession and studyDegree

## In Progress

*No active tasks*

## Full Game Audit Findings (2026-02-06)

See log.md "Full Game Audit (Agent Playthrough Analysis)" for complete details with file references.

### Critical Bugs (14/14 fixed)
- [x] C1: Add 2-hour location entry cost — **FIXED** `getMovementCost` returns `pathDistance + 2`
- [x] C2: Fix AI startTurn immunity — **FIXED** Removed `player.isAI` guard
- [x] C3: Fix rent prepayment system — **FIXED** `processWeekEnd` decrements prepaidWeeks
- [x] C4: Use lockedRent in rent calculations — **FIXED** `lockedRent > 0 ? lockedRent : RENT_COSTS`
- [x] C5: Call checkDeath in processWeekEnd — **FIXED** Inline death check loop
- [x] C6: Fix quest education requirements — **FIXED** `DEGREE_TO_PATH` mapping in completeDegree
- [x] C7: Add gold validation to all purchase actions — **FIXED** 9 actions validated
- [x] C8: Batch eventMessages in startTurn — **FIXED** Collected into array, joined at end
- [x] C9: Fix home location for modest/homeless tiers — **FIXED** `getHomeLocation()` helper
- [x] C10: Fix stale player data in startTurn — **FIXED** Re-read after doctor visit
- [x] C11: Fix lottery expected value — **FIXED** EV now 1.68g per 10g ticket
- [x] C12: Add wage cap on raises — **FIXED** Cap at 3x base job wage
- [x] C13: Fix double-charge on appliance breakage — **FIXED** No auto gold charge
- [x] C14: Fix AI hardcoded/fabricated prices — **FIXED** Dynamic via action.details

### High Priority Bugs (10/12 fixed)
- [x] H1: Clear appliances/equipment on eviction — **FIXED**
- [x] H2: Fix VictoryScreen wealth calculation — **FIXED** Added stocks - loans
- [x] H3: Add checkDeath after quest completion — **FIXED**
- [x] H4: Pass dungeonFloorsCleared to QuestPanel — **FIXED**
- [x] H5: Validate gold before payRent — **FIXED**
- [x] H6: Validate gold before studyDegree — **FIXED**
- [x] H7: Enforce MAX_FLOOR_ATTEMPTS_PER_TURN — **FIXED** 2 runs/turn, tracked per player
- [x] H8: Make market crash a global event — **FIXED**
- [x] H9: Fix AI dungeon health tracking — **FIXED** Checks health>20 + attempt limit before dungeon
- [x] H10: AI rest should increase relaxation — **FIXED**
- [x] H11: AI career strategy should prioritize quests — **FIXED**
- [x] H12: Resolve dual item definitions — **FIXED** via action details

### Balance Issues (10/10 fixed)
- [x] B1: Cap loan interest at 2x — **FIXED** Cap at 2000g
- [x] B2: Increase quest rewards — **FIXED** All ranks +60-75% gold, +happiness
- [x] B3: Add retreat penalty — **FIXED** 50% gold forfeit
- [x] B4: Reduce Noble Heights rent — **FIXED** 500→350g
- [x] B5: Only decay dependability if unemployed — **FIXED**
- [x] B6: Nerf Cooking Fire — **FIXED** Now every other week (even weeks only)
- [x] B7: Add investment withdrawal — **FIXED** 10% penalty
- [x] B8: Add "Stay Home" free weekend option — **FIXED**
- [x] B9: Allow rare drops on repeat clears — **FIXED** 20% rate
- [x] B10: Flatten guild rank quest requirements — **FIXED** Max=60

### AI Improvements (16/16 fixed)
- [x] AI-1: Add healing/health recovery — **FIXED**
- [x] AI-2: Add sickness cure action — **FIXED** Goes to enchanter, pays 75g
- [x] AI-3: Add loan system usage — **FIXED** Emergency 200g loan when broke
- [x] AI-4: Add stock market trading — **FIXED** Medium/hard AI invests excess gold
- [x] AI-5: Add fresh food management — **FIXED** Buys with Preservation Box
- [x] AI-6: Add weekend ticket purchases — **FIXED** Buys tickets for happiness
- [x] AI-7: Add item selling/pawning — **FIXED** Pawns when desperate
- [x] AI-8: Add lottery ticket purchases — **FIXED** Low priority 5g gamble
- [x] AI-9: Make graduation opportunistic — **FIXED**
- [x] AI-10: Buy food at closest store — **FIXED** Shadow Market added
- [x] AI-11: Buy varied appliances — **FIXED** Cooking Fire priority
- [x] AI-12: Add route optimization — **FIXED** Multi-need location priority boost
- [x] AI-13: Allow housing downgrade when broke — **FIXED**
- [x] AI-14: Dynamic prices in actions — **FIXED**
- [x] AI-15: Career quests for guild rank — **FIXED**
- [x] AI-16: Fix clothing purchase location — **FIXED**

## Proposed Improvements (2026-02-05 Code Audit)

See log.md "Improvement Proposals (Code Audit & Gap Analysis)" for full details.

### Bugs (Fix ASAP)
- [x] A1: Fix education progress display — **FIXED** GoalProgress uses `completedDegrees * 9`
- [x] A2: Fix earnings display — **FIXED** WorkSection uses 1.15 bonus
- [x] A3: Fix async imports in store actions — **FIXED** Static imports
- [x] A4: Decide on consistent modifyMaxHealth behavior — **FIXED** Clamped newMaxHealth

### Missing Jones Features
- [x] B1: Stock Market / Trading System (regular stocks + T-Bills) — **DONE**
- [x] B2: Loan System (bank loans with interest) — **DONE**
- [x] B3: Weekend System (ticket events, appliance weekends, random weekends) — **DONE**
- [x] B4: Doctor Visit triggers (starvation → doctor, low relaxation → doctor) — **DONE**
- [x] B5: Fresh Food storage system (Refrigerator/Freezer units) — **DONE**
- [x] B6: Lottery Tickets — **DONE**

### Gameplay
- [x] C1: Save/Load game state (localStorage) — **DONE** Auto-save + 3 manual slots
- [x] C2: Tutorial / new player guidance — **DONE** 9-step tutorial overlay
- [x] C3: Rebalance work happiness penalty for early game — **DONE** Scaled by week
- [x] C4: Game speed control / skip AI turn — **DONE** 1x/3x/skip controls
- [x] C5: Improve raise request system (less punishing) — **DONE** -3 dep instead of -10

### UI/UX
- [ ] D1: Mobile/responsive layout
- [x] D2: Tooltips for all buttons and icons — **DONE** Title attributes + shortcut hints
- [x] D3: Keyboard shortcuts for common actions — **DONE** E/Esc/Space/T
- [x] D4: Confirmation dialogs for expensive actions — **DONE** ConfirmDialog component
- [x] D5: Dark mode — **DONE** Toggle with localStorage persistence

### Technical Debt
- [x] E1: Write real unit tests (victory, earnings, education, AI) — **DONE** 91 tests across 5 files
- [x] E2: Deduplicate GUILD_PASS_COST constant — **DONE** Import from game.types
- [x] E3: Add input validation to banking actions — **DONE** 7 functions validated
- [x] E4: Use LocationId type instead of string in location functions — **DONE** events.ts typed
- [x] E5: Clean up legacy education system references — **DONE** Dead code removed, displays fixed

## Completed (Phase 3 - Cave UI Overhaul)

- [x] Replace CavePanel explore/rest with floor selection interface
  - 5 collapsible floor cards with status icons (cleared/available/locked)
  - Color-coded borders, expandable details
- [x] Show equipment check before entering a floor
  - Uses `checkFloorRequirements()` from dungeon.ts
  - Shows red ✗ for each unmet requirement, green ✓ when all met
  - Disabled button with reason text
- [x] Display dungeon progress (floors cleared, boss status)
  - Progress bar (X/5 floors)
  - Boss name and power shown per floor
  - Rare drop hints (revealed after first clear)
- [x] Keep basic "Rest in Cave" option
  - Retained at bottom of panel (8 hrs, +15 HP, +1 happiness)
- [x] Auto-resolve combat system
  - Generates encounters from dungeon.ts floor data
  - Power-ratio based damage/gold calculation
  - Education bonuses (trap disarm, arcane, damage reduction, potions)
  - First clear: happiness bonus + rare drop check
  - Re-runs for gold farming
- [x] Store action: `clearDungeonFloor(playerId, floorId)`
- [x] TypeScript compiles cleanly, build succeeds, tests pass

## Completed (Phase 2 - Dungeon Data)

- [x] Create `src/data/dungeon.ts` with all types and interfaces
- [x] Define 5 floor definitions (Entrance Cavern → Goblin Tunnels → Undead Crypt → Dragon's Lair → The Abyss)
- [x] Define encounter tables per floor (4 encounters per pool + 1 boss each)
- [x] Define loot tables and rare drops per floor (5% chance unique items)
- [x] Add 6 education dungeon bonuses (trap disarm, damage reduction, arcane sight, etc.)
- [x] Add floor unlock logic and equipment requirement checks
- [x] Add helper functions (checkFloorRequirements, calculateEducationBonuses, generateFloorEncounters, etc.)
- [x] Guild rank loot multipliers (80% novice → 150% guild master)
- [x] TypeScript compiles cleanly (tsc --noEmit passes)

## Completed (Phase 1 - Equipment System)

- [x] Add combat fields to Player interface (equippedWeapon, equippedArmor, equippedShield, dungeonFloorsCleared)
- [x] Add EquipmentSlot and EquipmentStats types to game.types.ts
- [x] Add attack/defense stats to existing weapons (Dagger +5 ATK, Iron Sword +15 ATK, Shield +5 DEF/10% BLK)
- [x] Add new equipment tiers:
  - Weapons: Steel Sword (+25 ATK, Floor 2), Enchanted Blade (+40 ATK, Floor 3)
  - Armor: Leather (+10 DEF), Chainmail (+20 DEF, Floor 2), Plate (+35 DEF, Floor 3), Enchanted Plate (+50 DEF, Floor 4)
  - Shields: Iron Shield (+10 DEF/15% BLK), Tower Shield (+15 DEF/25% BLK, Floor 2)
- [x] Add equip/unequip actions to gameStore (via economyHelpers)
- [x] Selling equipped durable auto-unequips
- [x] Update ArmoryPanel: Combat stats summary, buy/equip/unequip UI, locked items for uncleared floors
- [x] Update CavePanel: Equipment-aware combat (defense reduces damage, attack increases gold, shield blocks, weapon enables fighting back)
- [x] TypeScript compiles cleanly (tsc --noEmit passes)

---

## Backlog

### Dungeon & Combat System (Rogue-Lite RPG)
See log.md "Game Gap Analysis & Rogue-Lite RPG Design Proposal" for full design.

**Phase 3: Cave UI Overhaul** ✅ DONE
- [x] Replace CavePanel explore/rest with floor selection interface
- [x] Show equipment check before entering a floor
- [x] Display dungeon progress (floors cleared, boss status)
- [x] Keep basic "Rest in Cave" option

**Phase 4: Combat System** ✅ DONE
- [x] Implement combat resolution formula (Player Power vs Encounter Power)
- [x] Add encounter-by-encounter floor progression
- [x] Create combat result display (damage, gold, items found)
- [x] Add boss encounter mechanics
- [x] Add education bonuses to combat (Trade Guild disarms traps, Combat Training reduces damage, etc.)
- [x] Add retreat mechanic (keep partial gold, floor not cleared)
- [x] Add auto-resolve function for AI (Phase 5 prep)

**Phase 5: Integration** ✅ DONE
- [x] Connect dungeon quests to floor clear requirements
- [x] Add rare drops to loot tables (Goblin's Lucky Coin, Dragon Scale, etc.)
- [x] Add dungeon exploration to Grimwald AI decision engine
- [x] Balance dungeon rewards with economy (guild rank loot multiplier)

### Missing Jones Features (Priority) — ALL DONE
Based on JONES_REFERENCE.md analysis:

**All Implemented (Batch B, 2026-02-06):**
- [x] Stock Market/Trading System — 3 stocks + Crown Bonds, broker at Bank
- [x] Loan System — Bank loans, 10% weekly interest, 8-week repayment
- [x] Weekend System — Tickets, durable weekends, 25+ random activities
- [x] Doctor/Healer System — Auto-triggers on starvation & low relaxation
- [x] Fresh Food Storage — Preservation Box (6 units), Frost Chest (12 units)
- [x] Lottery / Fortune's Wheel — Weekly drawing at Shadow Market

### Gameplay
- [x] Balance quest rewards
- [ ] Add more random events
- [ ] Improve AI opponent strategies
- [x] Sound effects and music — **DONE** (music system with crossfade, 7 tracks, per-location)

### UI/UX
- [ ] Responsive design for mobile
- [ ] Animations for player movement
- [ ] Tooltips for all buttons
- [ ] Dark mode support
- [x] Zone Editor for visual positioning (Ctrl+Shift+Z)
- [x] Debug overlay for zone boundaries (Ctrl+Shift+D)
- [x] Movement path drawing in Zone Editor (roads instead of straight lines)

### Technical
- [ ] Unit tests for gameStore
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Save game state (localStorage)

### Content
- [ ] More quest types (dungeon-linked)
- [ ] More jobs
- [ ] Seasonal events
- [ ] Achievements/trophies

---

## Completed

### 2026-02-05 - Refactor Large Files
- [x] gameStore.ts: 1363 → 177 lines (extracted 5 helper modules in store/helpers/)
- [x] LocationPanel.tsx: 1104 → 448 lines (extracted 11 component files)
- [x] useGrimwaldAI.ts: 945 → 294 lines (extracted 3 modules in hooks/ai/)
- [x] jobs.ts: 813 → 1 line (split into jobs/ directory with types, definitions, utils)
- [x] All builds and tests pass, backwards-compatible barrel re-exports

### 2026-02-05 - Side Panels, Direct Travel, Auto-Turn End, Death System
- [x] Created PlayerInfoPanel component for left side of game board
- [x] Created TurnOrderPanel component for right side of game board
- [x] Implemented direct travel on location click (no more "Travel" button)
- [x] Implemented auto-return to housing when time runs out
- [x] Implemented player death system with game over state
- [x] Added isGameOver field to Player interface
- [x] Updated endTurn to skip dead players
- [x] Updated processWeekEnd to skip dead players
- [x] Last player standing wins automatically

### 2026-02-05 - Jones Wiki Reference Documentation
- [x] Fetched Jones wiki main page and navigation
- [x] Fetched all Goals pages (Happiness, Career, Education, Wealth)
- [x] Fetched Location pages (Apartments, Stores, etc.)
- [x] Fetched Gameplay mechanics pages (Relaxation, Stats, etc.)
- [x] Fetched Job and Education pages
- [x] Fetched Items and Economy pages
- [x] Created comprehensive JONES_REFERENCE.md file (800+ lines)
- [x] Identified implementation gaps (Stock Market, Loans, Weekend, Doctor)
- [x] Updated todo.md with missing features

### 2026-02-05 - Jones-Style Turn System and Board Movement
- [x] Researched Jones in the Fast Lane wiki for Turn and Hour mechanics
- [x] Implemented 60-hour turn system (changed from 168)
- [x] Created board path system with 14 locations in a ring
- [x] Shortest path calculation (clockwise or counter-clockwise)
- [x] Movement costs 1 Hour per location step
- [x] Players start in The Slums (not Guild Hall)
- [x] Starvation time penalty: -20 Hours if no food at turn start
- [x] Updated ResourcePanel to show 60-hour max with warning

### 2026-02-05 - Jones-Style Housing & Appliances System
- [x] Researched Jones in the Fast Lane wiki for Low-Cost Housing and Appliances
- [x] Implemented 7 fantasy appliances (Scrying Mirror, Memory Crystal, Music Box, etc.)
- [x] Added appliance breakage system (1/51 enchanter, 1/36 market/pawn)
- [x] Added appliance repair at Enchanter's Workshop
- [x] Created EnchanterPanel (Socket City equivalent)
- [x] Created ShadowMarketPanel (Z-Mart equivalent with cheaper used items)
- [x] Updated PawnShopPanel with appliance pawn/buy (40% pawn, 50% buy)
- [x] Implemented rent prepayment (1/4/8 weeks)
- [x] Implemented rent lock-in when moving to new housing
- [x] Updated Landlord UI with prepay options and rate comparison
- [x] Added Cooking Fire per-turn happiness bonus (+1)
- [x] Added Arcane Tome random income generation (15% chance)
- [x] Happiness bonus only on first purchase of each appliance type

### 2026-02-05 - Jones-Style Employment Office
- [x] Employer list view (Guild Hall, Bank, Forge, Academy, etc.)
- [x] Click employer to see available positions
- [x] Job application system with accept/reject
- [x] Shows exact reason for rejection (missing degrees, exp, dep, clothing)
- [x] Offered wage varies 50-250% based on economy
- [x] Can accept or decline job offers

### 2026-02-05 - Jones-Style Working System Overhaul
- [x] Variable wage offers (50-250% of base wage based on economy)
- [x] Market crash events (pay cut at 80%, layoffs)
- [x] Experience capped at maxExperience
- [x] Dependability capped at maxDependability
- [x] Forge job system with variable wages

### 2026-02-05 - Jones-Style Education/Jobs Overhaul
- [x] Researched Jones in the Fast Lane wiki for degrees and jobs
- [x] Implemented 11-degree system with prerequisites (Trade Guild, Junior Academy, etc.)
- [x] Added 30+ jobs across 8 locations with degree requirements
- [x] Graduation bonuses (+5 happiness, +5 dependability, permanent stat increases)
- [x] Updated Academy UI to show available/locked degrees
- [x] Career progression from Floor Sweeper ($4/hr) to Guild Master's Assistant ($25/hr)

### 2026-02-05 - Shadowfingers Robbery System
- [x] Implemented Shadowfingers character (criminal NPC)
- [x] Street Robbery system (Bank/Black's Market, Week 4+)
- [x] Apartment Robbery system (slums housing, durables)
- [x] Added Relaxation stat (10-50, affects robbery chance)
- [x] Added Durables system (items stored at apartment)
- [x] Educational items that cannot be stolen (Encyclopedia, Dictionary, Atlas)
- [x] ShadowfingersModal with newspaper-style display
- [x] Integrated robbery checks into game flow

### 2026-02-05 - Zone System
- [x] Implemented zone-based coordinate system for game board
- [x] Added ZoneConfig interface for precise positioning
- [x] Created visual Zone Editor tool
- [x] Added debug overlay for zone visualization
- [x] Added "The Cave" location with exploration mechanics
- [x] Center info panel properly isolated for text display

### 2026-02-05 - Localization
- [x] Verified all game text is in English
- [x] Translated agents.md to English
- [x] Translated log.md to English
- [x] Translated todo.md to English
- [x] Documentation completed (agents.md, log.md, todo.md, README.md)
- [x] Quest System implemented
- [x] Newspaper (The Guildholm Herald)
- [x] Pawn Shop (The Fence)
- [x] Healer's Sanctuary
- [x] Rent consequences system
- [x] Death & resurrection mechanic
- [x] AI logic (Grimwald)
- [x] Event display system
- [x] Advanced job system
- [x] Enhanced robbery events
- [x] Rent debt system

---

## Notes

See `plan.md` for complete implementation status.
See `log.md` for detailed development history.
See `agents.md` for AI system documentation.
