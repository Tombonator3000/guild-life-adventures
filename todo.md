# Guild Life Adventures - Todo List

## Completed (2026-02-07)

- [x] Store Layout Redesign — General Store, Shadow Market, Armory, Rusty Tankard
  - General Store: Jones-style Black's Market — removed candles/blanket/music box, added lottery tickets
  - Shadow Market & Armory: Dark brown text on parchment bg, larger text (text-base)
  - All 4 locations: Larger NPC portraits (160×192px), wider portrait columns
  - Rusty Tankard: Items fill center panel with justify-center layout
  - New JonesMenuItem/JonesInfoRow props: darkText, largeText
  - New NpcPortrait size prop: normal/large
  - New LocationShell largePortrait prop

- [x] Career Goal Fix — Career now uses dependability (Jones-style) instead of guild rank
  - Career = dependability stat, 0 if unemployed (matches Jones in the Fast Lane)
  - Default goal changed from rank 4 to 75 dependability
  - All UI, tests, AI, save migration updated
- [x] Dungeon Victory Contributions — Dungeon floor clears now give +3/5/7/10/15 dependability
  - Added `dependabilityOnClear` to DungeonFloor type and all 5 floor definitions
  - Total +40 dependability across all 5 floors (contributing to career goal)

- [x] Academy Course & Job Validation — 6 issues fixed, 2 missing jobs added
  - Added missing `researcher` job (Advanced Scholar → 16g/hr at Academy)
  - Added missing `merchant-assistant` job (Commerce → 12g/hr at General Store)
  - Fixed `assistant-clerk` degree mapping (moved to trade-guild, matching actual requirement)
  - Added 4 missing jobs to unlocksJobs (bank-teller, tavern-chef, tavern-manager, journeyman-smith)
  - Removed duplicate library-assistant from scholar unlocksJobs
  - Full degree→job mapping documented in log.md

- [x] Shadow Market: Market Intel now functional — gives +5 happiness (was pure placeholder)

- [x] Multi-AI standing still bug fixed — non-Grimwald AI players now take actions
  - Root cause: aiIsThinking state not reset between consecutive AI players
  - Added lastAIPlayerIdRef tracking for proper state reset between AI turns

- [x] Guild Hall salary stabilization — wages no longer fluctuate on same-turn re-entry
  - Pre-calculate all wages via useMemo on mount (stable per priceModifier)
  - Wages only change when weekly economy updates

- [x] Multiplayer Deep Audit & Fixes — 7 bugs fixed, 32 tests added, multiplayer.md created
  - Rate limiting on guest actions (10/sec sliding window)
  - Zombie disconnected players auto-skipped (5s grace period)
  - TURN server deprecation handled (STUN-only + extensible TURN config)
  - Dismissed events persistence across sessions fixed (auto-clear on turn/week change)
  - Movement animation path validation (max 16 steps)
  - Action result timeout for guests (10s timeout tracking)
  - Network state cleanup on disconnect/game-end
  - 32 multiplayer unit tests in src/test/multiplayer.test.ts
  - Comprehensive multiplayer.md reference document

- [x] Multi-AI opponent support — up to 4 named AI players
  - Grimwald, Seraphina, Thornwick, Morgath with unique colors
  - Per-AI difficulty (Easy/Medium/Hard)
  - Revamped GameSetup UI with add/remove/configure per AI
  - Each AI plays with independent strategy based on its difficulty
  - Backwards compatible with legacy single-AI flag

- [x] Deep audit bug fixes — 13 bugs found and fixed
  - payRent ignoring lockedRent price
  - AI buyFreshFood parameter order swapped (cost/units)
  - AI immune to street robbery (gameplay effects now apply)
  - startTurn overwriting processWeekEnd event messages
  - AI apply-job using random wage instead of economy-based priceModifier
  - AI pay-rent ignoring lockedRent
  - Double resurrection exploit (wasResurrectedThisWeek flag)
  - Preservation Box duplicate definitions removed from ENCHANTER_ITEMS
  - Guild rank requirements mismatch (hardcoded vs constant)
  - AI skip turn infinite loop protection
  - Dead AI continues acting after death
  - Hardcoded quest ID 'patrol-e' in AI career goal
  - Privacy screen between local multiplayer turns

## Backlog (From Deep Audit)

### Critical/High Priority
- [ ] Add price validation to all buy functions (buyItem, buyDurable, buyTicket)
- [ ] Fix starvation penalties inconsistency (20hrs at turn-start vs 10hp at week-end)
- [ ] Implement loan default limits (prevent infinite extensions)
- [ ] Quest education requirements reference non-existent paths
- [ ] Make Frost Chest and Arcane Tome actually purchasable
- [x] Reset network state on victory screen (soft lock bug) — **FIXED** resetNetworkState() on disconnect
- [x] Fix event modal dismissal desync in online multiplayer — **FIXED** auto-clear on turn/week change

### Medium Priority
- [ ] AI: Add difficulty-based decision thresholds (currently only speed differs)
- [ ] AI: Add rent prepayment and appliance repair logic
- [ ] AI: Add competition awareness (check other players' progress)
- [ ] Mobile HUD: Add turn indicator and player color
- [ ] Dead player tokens visual distinction
- [ ] Fix keyboard shortcuts triggering inside modals
- [x] Remove or implement housing tier 'modest' — **FIXED** Hidden from LandlordPanel (Jones 2-tier system)

### Low Priority
- [ ] Forge job teaser without actual implementation
- [ ] Player name duplicate/length validation
- [ ] Victory screen leaderboard for multi-player
- [ ] Spectator mode for dead players
- [ ] AI stock market strategy (buy low, sell high)

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

## Completed (2026-02-06)

- [x] Full Balance Audit: Education vs Jobs vs Quests vs Cave
  - [x] Bug: 3 quests impossible (Monster Slaying, Dragon Investigation, Dragon Slayer) — fighter level 3/4 required but max = 2
    - Fixed all three to fighter level 2 (gated by guild rank instead)
  - [x] Balance: All 18 quests rebalanced — gold/time ratios now competitive with equivalent-tier jobs
    - E-rank: 4.5-5.0 g/hr (was 2.5-3.0), time 3-6h (was 4-10h)
    - D-rank: 5.0-7.0 g/hr (was 1.75-2.5), time 6-10h (was 12-20h)
    - C-rank: 7.5-8.1 g/hr (was 2.7), time 8-12h (was 20-28h)
    - B-rank: 10-11 g/hr (was 2.78-3.54), time 10-16h (was 24-40h)
    - A-rank: 11.8-13.3 g/hr (was 3.56-3.65), time 18-22h (was 48-56h)
    - S-rank: 15-16.7 g/hr (was 5.0), time 30-36h (was 80-100h)
  - [x] Verified: Education paths balanced (combat=cheap/fast, academic=education victory, commerce=efficient)
  - [x] Verified: Job wage progression well-structured (4-25g/hr across 10 levels)
  - [x] Verified: Dungeon floor difficulty/rewards properly scaled
  - [x] Verified: Career victory goal achievable in ~2-3 weeks with rebalanced quests
  - See log.md for full analysis with ROI calculations

## Completed (2026-02-06)

- [x] Online Multiplayer (WebRTC P2P via PeerJS)
  - [x] PeerManager singleton — WebRTC connection management via PeerJS
  - [x] Room code system — 6-char alphanumeric codes (no ambiguous chars)
  - [x] OnlineLobby screen — create/join rooms, player list, game settings
  - [x] Host-authoritative state sync — host broadcasts full GameState on changes (50ms debounce)
  - [x] NetworkActionProxy — intercepts guest store actions, forwards to host via WebRTC
  - [x] wrapWithNetworkGuard — all 50+ store actions automatically network-aware
  - [x] Turn lock — guests can't act when not their turn (spectator view mode)
  - [x] "Waiting for [player]..." overlay during other players' turns
  - [x] Connection status indicator (online badge + room code)
  - [x] Auto-save disabled for guest mode
  - [x] "Online Multiplayer" button on TitleScreen
  - [x] Build succeeds, all 112 tests pass

## Completed (2026-02-06)

- [x] Economy Stabilization — gradual drift replaces random weekly priceModifier
  - [x] Economic cycle system: trend (-1/0/1) lasting 3-7 weeks before changing
  - [x] Gradual price drift: ±0.02-0.06 per week instead of full random reset
  - [x] Narrowed wage offer range: 0.7-1.6× (was 0.5-2.5×)
  - [x] Market crashes only during recession trend (was random every week)
  - [x] Stock crashes only during recession (10% per recession week, was 5% every week)
  - [x] Trend arrow indicator on GameBoard (↑↓↔)
  - [x] Newspaper trend forecast text
  - [x] Network sync and save/load updated with new economy fields

## Completed (2026-02-06)

- [x] Standardize Beige/Brown Text Design — 15 files updated
  - [x] Fix newspaper article text visibility (text-muted-foreground → text-parchment-dark on wood-frame)
  - [x] Standardize ShadowfingersModal from raw amber to design system
  - [x] All wood-frame elements: text-card → text-parchment (mode-independent light color)
  - [x] All text-muted-foreground inside wood-frame → text-parchment-dark
  - [x] Established design standard: wood-frame uses text-parchment/text-parchment-dark

## Completed (2026-02-06)

- [x] Online Multiplayer Deep Audit & Fix — 8 bugs fixed
  - [x] Bug 1 (CRITICAL): No turn validation in useNetworkSync — host executed any guest action without checking turn
  - [x] Bug 2 (CRITICAL): No peerId → playerId mapping — host couldn't identify which player sent action
  - [x] Bug 3 (CRITICAL): HOST_INTERNAL_ACTIONS executed locally on guest — caused state divergence
  - [x] Bug 4 (HIGH): Guest ran auto-end-turn logic — duplicate endTurn calls skipping players
  - [x] Bug 5 (HIGH): applyNetworkState missing shadowfingersEvent/applianceBreakageEvent fields
  - [x] Bug 6 (MEDIUM): Stale closure in useOnlineGame — new guests rejected after lobby join
  - [x] Bug 7 (MEDIUM): game-start message missing lobby data — guest couldn't find their slot
  - [x] Bug 8 (LOW): "Only host can broadcast" warning spammed console
  - Build succeeds, TypeScript clean, 111/112 tests pass (1 pre-existing)

## Completed (2026-02-06)

- [x] Online Multiplayer: Remote Movement Visibility
  - [x] Added `movement-animation` (host→guest) and `movement-start` (guest→host) message types
  - [x] `startRemoteAnimation()` in usePlayerAnimation — visual-only animation without movePlayer
  - [x] `broadcastMovement()` in useNetworkSync — host broadcasts directly, guest via host relay
  - [x] GameBoard broadcasts movement on local player move, animates on remote movement receive
  - [x] Build succeeds, 111/112 tests pass (1 pre-existing)

## Completed (2026-02-06)

- [x] Online Multiplayer Deep Audit & Architecture Fix — 10 critical + 8 high bugs fixed
  - [x] C1: Consolidated duplicate serializeGameState/applyNetworkState into `src/network/networkState.ts`
  - [x] C2: Added ALLOWED_GUEST_ACTIONS whitelist (45 actions) — blocks guests from calling internal actions
  - [x] C3: Removed duplicate store subscription in useOnlineGame (only useNetworkSync broadcasts now)
  - [x] C4: Split message handlers — useOnlineGame=lobby only, useNetworkSync=game only (no duplicate processing)
  - [x] C5: Guard AI turn handler for guest mode — prevents AI running on guest clients
  - [x] C6: Fix auto-end-turn for guest — guest forwards endTurn to host when time=0 (was deadlocking)
  - [x] C7: Fix host peerId mapping — exclude 'host' literal from peer→player map
  - [x] C8: Fix connection timeout race condition — settled guard prevents double resolve/reject
  - [x] C9: Block settings changes during active game (host fairness)
  - [x] C10: Remove selectedLocation from network sync (local-only UI state)
  - [x] H1: Auto-deduplicate player names in lobby (prevent wrong player identification)
  - Build succeeds, all 112 tests pass

## Completed (2026-02-06)

- [x] Mobile Game Layout — responsive design for Samsung S24 and other mobile devices
  - [x] `useIsMobile` hook — matchMedia-based viewport detection (< 1024px = mobile)
  - [x] `MobileHUD` component — compact top bar with player info, 5 resource chips, End Turn, drawer toggles
  - [x] `MobileDrawer` component — slide-out overlay drawers for Stats/Inventory/Goals (left) and Players/Options (right)
  - [x] `GameBoard.tsx` — conditional mobile layout: side panels hidden, full-width board, bottom sheet location panel (65% height)
  - [x] `LocationShell.tsx` — mobile mode: compact NPC avatar (28px) inline instead of 144px portrait column
  - [x] Board fully visible when no location selected, bottom sheet appears on location tap
  - [x] AI overlay, online indicators, and waiting overlay have compact mobile variants
  - [x] Build succeeds, all 112 tests pass, TypeScript clean

## Completed (2026-02-07) — Multiplayer Security Audit & Host Migration

- [x] Deep audit of all 7 network files (~1930 lines) — 5 issues found and fixed
- [x] Cross-player validation deep scan — now checks ALL argument positions (was args[0] only)
- [x] Argument bounds validation — host-side caps on modifyGold(+500), modifyHealth(±100), etc.
- [x] Room code crypto — crypto.getRandomValues() replaces Math.random()
- [x] Dead code cleanup — removed useless loop in skipZombieTurn
- [x] **Host migration** — automatic successor election on host disconnect
  - Lobby data stored for migration (all peerIds + slots)
  - PeerManager.promoteToHost() and connectToNewHost() methods
  - 10s migration timeout, 3s follower connection delay
  - Successor = lowest slot guest
- [x] 7 new multiplayer tests (32→39 total)
- [x] multiplayer.md fully updated with audit findings and new features

- [x] Fix Center Panel Alignment — zone editor + game board aspect ratio mismatch
  - ZoneEditor used `aspect-video` (16:9) while GameBoard used custom 1.351:1 ratio
  - `bg-contain` created ~9.4% vertical gaps between image and container
  - Exported shared `BOARD_ASPECT_RATIO` constant, both files now use same ratio
  - Changed `bg-contain` → `backgroundSize: 100% 100%` in both GameBoard and ZoneEditor
  - Unified DEFAULT_CENTER_PANEL values between ZoneEditor and useZoneConfiguration
  - Build passes, 152 tests pass

## Completed (2026-02-08)

- [x] Location Backgrounds, Event Panel, & For Rent Display
  - [x] RoomScene: Replaced CSS-drawn room with background images (noble-heights.png, slums.png)
  - [x] EventPanel: Weekend events render inline in center panel (not Dialog overlay)
  - [x] For Rent: Unrented housing locations show "For Rent" image with Landlord redirect
  - [x] Placeholder images in public/locations/ (replace with actual art)
  - [x] Build succeeds, 171 tests pass

- [x] Auto-Update Check for Installed PWA
  - [x] Changed `registerType` from `autoUpdate` to `prompt` in vite.config.ts
  - [x] Created `useAppUpdate` hook with `useRegisterSW` + 60-minute periodic update check
  - [x] Created `UpdateBanner` component — parchment-panel notification with "Update Now" button
  - [x] Integrated banner in TitleScreen and GameBoard
  - [x] Build succeeds, 171 tests pass

- [x] Age System — player aging with birthday milestones, elder effects, and UI
  - [x] `age: number` field on Player (starts at 18), ages 1 year per 4 weeks
  - [x] Birthday milestones: age 21 (+5 hap), 25 (+2 maxHP), 30 (+5 hap/+5 dep), 40 (-2 maxHP/+3 hap), 50 (-5 maxHP/+5 hap)
  - [x] Elder decay: age 60+ loses 3 maxHealth per birthday (floor at 10)
  - [x] Health crises: age 50+ has 3% weekly chance of -15 HP
  - [x] Work fatigue: age 45+ gets extra -1 happiness on long shifts (6+ hours)
  - [x] AI: health threshold scales with age, capped at 80% maxHealth (prevents infinite loop)
  - [x] UI: age shown in PlayerInfoPanel, SideInfoTabs, InfoTabs, VictoryScreen
  - [x] Save migration v1→v2: adds age to old saves based on week count
  - [x] 19 new tests in `src/test/age.test.ts`

- [x] Age System Bug Audit — 7 bugs found and fixed during playthrough
  - [x] Bug 1: AI infinite healing loop at elder ages (maxHP < heal threshold)
  - [x] Bug 2: modifyMaxHealth floor inconsistency (50 → 10, matching aging floor)
  - [x] Bug 3: Unused Cake import in PlayerInfoPanel
  - [x] Bug 5: Work happiness penalty stacking too harsh at 45+ (now only long shifts)
  - [x] Bug 7: Truthiness check for milestone.maxHealth would skip value 0
  - [x] Bug 8: Milestones at 60+ suppressed elder decay (now independent)
  - [x] Flaky test: freshFood starvation test (mocked Math.random for determinism)
  - Build passes, 171 tests pass (19 new)

- [x] AI Agent Balance Audit — 8 bugs/imbalances found and fixed
  - [x] Fix 1: AI rent urgency threshold (> → >=) — triggers 1 week earlier, prevents surprise eviction
  - [x] Fix 2: AI pawning priority inversion — pawn (85) now above heal (80) when broke, added move-to-fence
  - [x] Fix 3: AI housing upgrade for easy difficulty — easy AI now upgrades when 3+ valuables at risk
  - [x] Fix 4: AI loan repayment buffer reduced (100→50) — less interest wasted
  - [x] Fix 5: Week-end starvation double penalty removed — Jones only has -20hrs at turn start
  - [x] Fix 6: AI goal specialization — sprint goals >=80% complete before weakest goal
  - [x] Fix 7: AI failed action tracking — prevents re-attempting failed actions within same turn
  - [x] Fix 8: AI happiness rest path — added move-to-home when not at home
  - Build passes, 171 tests pass

- [x] Housing Cost Audit — 5 bugs found and fixed
  - [x] Bug 1 (HIGH): HOUSING_DATA noble weeklyRent=500 disagrees with RENT_COSTS=350 — synced to 350
  - [x] Bug 2 (MEDIUM): `modest` tier shown in LandlordPanel but half-implemented — hidden from move options
  - [x] Bug 3 (MEDIUM): AI rent check uses RENT_COSTS ignoring lockedRent — fixed in criticalNeeds.ts
  - [x] Bug 4 (MEDIUM): AI downgrade check uses RENT_COSTS ignoring lockedRent — fixed in strategicActions.ts
  - [x] Bug 5 (LOW): Dead code canAffordHousing/getUpgradeOptions/getDowngradeOptions — removed
  - Balance verdict: Slums (75g) fair, Noble (350g) fair for mid-tier+, homeless penalties harsh but motivating

## Completed (2026-02-08)

- [x] Weekend Event Music — `18OhWhatAWeekend.mp3` plays during weekend events
  - `useMusicController` accepts optional `eventMessage`, detects "Weekend:" prefix
  - Crossfades to weekend track on event display, returns to location music on dismiss
  - Build succeeds, 171 tests pass

- [x] Jones Pricing Audit — Rent & Appliance Price Corrections
  - [x] Noble Heights rent: 350g/wk → 120g/wk (Jones Security is $498/month ≈ $125/week)
  - [x] Modest Dwelling rent: 200g/wk → 95g/wk (was more expensive than Noble after fix)
  - [x] Memory Crystal enchanter: 475g → 333g (Jones VCR Socket City = $333)
  - [x] Memory Crystal market: 300g → 250g (Jones VCR Z-Mart = $250)
  - [x] All other prices verified correct vs Jones (wages, appliances, food, education, clothing)
  - Build passes, 171 tests pass

- [x] Weather Events System — rare weather with CSS particle effects
  - 5 weather types: Snowstorm (snow), Thunderstorm (rain), Drought (heatwave), Enchanted Fog (fog), Harvest Rain (light rain)
  - ~8% chance per week, lasts 1-3 weeks
  - Effects: movement cost modifier, price multiplier, happiness per week, food spoilage
  - CSS particle animations: 60 snowflakes, 80 raindrops, fog layers, heat shimmer
  - Guarded by `enableWeatherEvents` game option
  - Weather indicator in top bar, network sync, save/load support
  - Build succeeds, 171 tests pass

## Completed (2026-02-08)

- [x] Noble Heights Location Music — `10Noble-Heights.mp3` plays when player is at Noble Heights
  - Added track to `MUSIC_TRACKS` and `LOCATION_MUSIC` in `src/audio/musicConfig.ts`
  - Placeholder MP3 in `public/music/` (replace with real track)
  - AudioManager crossfades to Noble Heights music on location entry

- [x] Victory Music — `19Winner.mp3` plays when a player wins the game
  - Added `'winner'` track to `MUSIC_TRACKS` in `src/audio/musicConfig.ts`
  - Changed `SCREEN_MUSIC.victory` from `'weekend'` to `'winner'`
  - useMusicController already handles victory phase via SCREEN_MUSIC lookup
  - Build succeeds, 171 tests pass

- [x] Thunderstorm Visual Effects — lightning flashes, bolts, and dark storm overlay
  - ThunderstormLayer: Two staggered lightning flashes (7s/11s), two bolt shapes via clipPath, dark overlay
  - WeatherOverlay: Added weatherType prop to distinguish thunderstorm from harvest-rain
  - GameBoard: Passes weather.type to WeatherOverlay

- [x] Enchanted Fog Visual Effects — dense atmospheric fog with magical glow
  - EnchantedFogLayer: Dense bottom fog band, mid-level wisps, upper thin fog, subtle blue glow
  - Renders only for enchanted-fog weather type

- [x] Free Bank Services — all banking operations now cost 0 hours
  - Removed spendTime calls from BankPanel (deposit, withdraw, invest, stocks, loans)
  - Removed timeRemaining checks from all banking buttons
  - Updated AI (useGrimwaldAI.ts) to not spend time on banking actions
  - Build succeeds, 171 tests pass

- [x] iPad PWA Compatibility — 6 issues fixed for iPad/iOS PWA support
  - [x] Added `viewport-fit=cover` to viewport meta tag (required for notched iPads)
  - [x] Added safe-area-inset CSS utility classes (notch, home indicator, status bar)
  - [x] Fixed 100vh issue — `min-h-screen-safe` / `h-screen-safe` using `100dvh` with fallback
  - [x] iOS install guide — device detection + 3-step "Add to Home Screen" modal
  - [x] iOS standalone mode detection (`navigator.standalone`)
  - [x] UpdateBanner safe-area-aware bottom positioning
  - [x] Applied to all screens: TitleScreen, GameSetup, GameBoard, VictoryScreen, OnlineLobby
  - [x] Build succeeds, 171 tests pass

## Completed (2026-02-09)

- [x] Bounty Board Tab & Quest Guild Pass Gate
  - Guild Hall tabs: Jobs (default) | Bounties | Quests | Work
  - Quests tab hidden until Guild Pass purchased (was visible with prompt)
  - Bounties reverted to free (no Guild Pass required)
  - New BountyBoardPanel component with guild pass purchase, reputation bar, bounty board
  - QuestPanel exports ReputationBar/ScaledRewardDisplay for reuse
  - AI getBestBounty() no longer requires Guild Pass
  - Build passes, 171 tests pass

- [x] Adventure Goal Victory Goals Integration — 4 fixes for adventure goal visibility
  - GameSetup: Dynamic goal count text ("four" → "five" when adventure enabled)
  - GameSetup: Presets preserve adventure setting instead of resetting to 0
  - PlayersTab: Overall progress % includes adventure when enabled (was /4, now /5)
  - TurnOrderPanel: Same overall progress fix
  - Build passes, 171 tests pass

- [x] Guild Pass Quest Requirement — all quests hidden until Guild Pass purchased
  - Quest tab shows only "Guild Pass Required" prompt with purchase button when no pass
  - Bounties now require Guild Pass (previously were free)
  - Added guard to `takeBounty()` store action
  - AI `getBestBounty()` now checks for Guild Pass before considering bounties
  - Build passes, 171 tests pass

- [x] Dummy Audio Files — 52 placeholder MP3s for SFX and ambient systems
  - 36 SFX files in `public/sfx/` (matching `SFX_LIBRARY` in sfxManager.ts)
  - 16 ambient files in `public/ambient/` (matching `AMBIENT_TRACKS` in ambientConfig.ts)
  - Minimal silent MP3s (~4KB each), replace with real assets by dropping files in place
  - Synth fallback (synthSFX.ts) remains primary SFX source until real MP3s added

- [x] Guild Rank Promotion Bug Fix — Legendary Champion couldn't start journeyman quests
  - Root cause: `promoteGuildRank()` used `completedQuests` (only from regular quests) instead of `guildReputation` (from all quest-like activities)
  - Fix: Changed to use `guildReputation`, added multi-rank promotion loop, added promotion after bounty completion
  - Build passes, 171 tests pass

- [x] Quest Panel UI Redesign — matches job listing style from Guild Hall
  - Replaced dark wood-frame cards with light parchment cards (bg-[#e0d4b8])
  - Replaced gold-button CSS with JonesButton component (same as job Apply buttons)
  - JonesSectionHeader for bounty/chain/quest section headers
  - Compact layout with stats inline, button on right side
  - Build passes, 171 tests pass

- [x] Graveyard Path Reorder — path now matches visual board layout
  - Board path changed: noble-heights → graveyard → general-store (was noble-heights → general-store → graveyard)
  - Movement paths updated with new adjacency keys and waypoints
  - Travel time unchanged (1 step per edge, fair and consistent)
  - Fixed Morthos.jpg NPC portrait case mismatch (morthos.jpg → Morthos.jpg)

- [x] C1: Seasonal Festivals — 4 festivals every 12 weeks with unique effects
  - Created `src/data/festivals.ts` — Harvest Festival, Winter Solstice, Spring Tournament, Midsummer Fair
  - Festival cycle: one every 12 weeks, rotating in order
  - Effects: happiness bonus, gold bonus, price multiplier, education bonus, dependability bonus, wage multiplier, dungeon gold multiplier
  - Integrated into `processWeekEnd` — festival effects applied to all players
  - Festival wage multiplier in `workShift` (e.g., Midsummer Fair +15%)
  - Festival dungeon gold multiplier in `CombatView` and AI dungeon handler
  - Added `enableFestivals` game option with toggle in OptionsMenu
  - Added `activeFestival` to GameState, save/load, and network sync

- [x] C4: AI Rival Enhancement — AI competes for quests/jobs
  - Created `src/hooks/ai/actions/rivalryActions.ts` — competitive AI behavior
  - AI analyzes rival players' progress, identifies biggest threat
  - Rivalry actions: steal rival's job, race for quests, block education, aggressive banking
  - Only active on medium/hard difficulty (planningDepth >= 2)
  - Added `rivals: Player[]` to ActionContext for all action generators
  - Integrated into main action generator pipeline

- [x] C6: Achievements — meta-progression across multiple games
  - Created `src/data/achievements.ts` — 24 achievements across 6 categories
  - Categories: Wealth, Combat, Education, Social, Exploration, Mastery
  - Persisted in localStorage across games
  - Cumulative stats tracked: gamesWon, totalGoldEarned, totalQuestsCompleted, totalDegreesEarned, etc.
  - Achievement checks at: victory, quest completion, degree completion, dungeon clear, festival attendance
  - Created `src/hooks/useAchievements.ts` — React hook with useSyncExternalStore
  - Created `src/components/game/AchievementsPanel.tsx` — UI panel with progress bar
  - Added "Achievements" tab to RightSideTabs

- [x] C7: Random Travel Events — random events during travel (10% chance)
  - Created `src/data/travelEvents.ts` — 10 travel events (positive, negative, mixed)
  - 10% chance on trips of 3+ steps
  - Events: Found Coin Purse, Wandering Merchant, Hidden Shortcut, Street Bard, Pickpocket, Muddy Road, etc.
  - Effects: gold, happiness, time, health changes
  - Integrated into `movePlayer` in playerHelpers.ts
  - Travel event message shown to human players via eventMessage/phase system

## Completed (2026-02-09)

- [x] Salary Stabilization & Job/Education Balance Audit — 3 systemic fixes
  - [x] Fix 1: Replaced random wage variance (±45%) with deterministic per-job-per-week hash (±10%)
  - [x] Fix 2: Added career level wage floors — higher-tier jobs can never pay less than lower-tier
  - [x] Fix 3: Rebalanced 9 underpaid jobs (Scroll Copier, City Guard, Apprentice Smith, Shop Clerk, etc.)
  - [x] Corrected 3 career level misclassifications (Errand Runner, Tavern Cook, Bank Janitor: L1→L2)
  - [x] Full education → job progression audit — all paths verified fair and logical
  - Build passes, 171 tests pass

- [x] Character Portrait System — player & AI character portraits
  - [x] 8 player portraits (Warrior, Mage, Rogue, Cleric, Ranger, Bard, Paladin, Merchant)
  - [x] 4 AI portraits (Grimwald, Seraphina, Thornwick, Morgath)
  - [x] Portrait picker modal in GameSetup (click colored circle to choose)
  - [x] SVG placeholder art with unique class silhouettes
  - [x] JPG support: drop files into public/portraits/ to replace placeholders
  - [x] Portraits shown in game board tokens (static + animated)
  - [x] Portraits shown in all UI panels (7 components updated)
  - [x] Backwards compatible: null portraitId = colored circle fallback
  - Build passes, 171 tests pass

- [x] AI Scheming Modal Expansion — larger modal with AI character portrait
- [x] Speech Bubble Points at NPC Portrait — tail repositioned to left side above portrait
- [x] Landlord Rent Week Restriction — Landlord only open during rent collection weeks
  - Office closed with info message during non-rent weeks
  - Emergency access when 3+ weeks overdue
  - AI rent/housing actions gated by same rule

- [x] GitHub Pages Standalone Deployment — game fully runnable from GitHub without Lovable
  - Verified all asset paths use `import.meta.env.BASE_URL` (18+ categories checked)
  - Added `.nojekyll` to GitHub Actions workflow (prevents Jekyll ignoring `_`-prefixed files)
  - Removed dead hardcoded path `SHADOWFINGERS_IMAGE` from shadowfingers.ts
  - GitHub Actions auto-deploys on push to main
  - URL: `https://tombonator3000.github.io/guild-life-adventures/`
  - Build passes, 171 tests pass

## Completed (2026-02-09)

- [x] Remove Dark Mode & Fix Text Visibility — all text now brown/visible
  - Deleted DarkModeToggle component and all 3 usage sites (GameBoardHeader, TitleScreen, OptionsMenu)
  - Removed `.dark` CSS block (38 lines) from index.css
  - Removed `dark` class from `<html>` in index.html
  - Added missing `--wood-dark` CSS variable and `wood.dark` Tailwind color
  - Fixed invisible player name in SideInfoTabs (`text-wood-dark` was referencing undefined color)
  - Removed `darkMode: ["class"]` from tailwind.config.ts
  - Removed `dark:` prefix from alert.tsx and chart.tsx
  - Build passes, 171 tests pass

## Completed (2026-02-09)

- [x] Fix Ambient Sounds Not Playing — 4 bugs found and fixed
  - [x] Bug 1 (PRIMARY): currentTrackId set before play() succeeds → autoplay-blocked tracks never retry
  - [x] Bug 2: No resume mechanism after autoplay block → added click/touch/keydown resume listeners
  - [x] Bug 3: Very low effective volume (8% minimum) → raised to 18% minimum
  - [x] Bug 4: PWA missing ambient/*.mp3 and sfx/*.mp3 in includeAssets → added
  - Same fixes applied to audioManager.ts (music) for consistency
  - Build passes, 171 tests pass

## Completed (2026-02-09)

- [x] Mid-Movement Destination Redirect — click new location while token is moving to change destination
  - usePlayerAnimation: pathVersion state + redirectAnimation function
  - useLocationClick: allows redirect during animation instead of blocking
  - GameBoard: passes redirect props, uses pathVersion as AnimatedPlayerToken key
  - Works with full travel, partial travel, weather costs, and online multiplayer

- [x] Debug Tools Expansion — comprehensive developer panel for testing game events
  - Weather control (all 5 types + clear)
  - Victory & game controls (trigger win, check victory, force week end, force turns)
  - Festival controls (all 4 festivals + clear)
  - Resource controls (gold, health, happiness, food, clothing, time, relaxation)
  - Event triggers (event message, robbery, weekend, doctor visit)
  - Player state controls (cure sickness, max health, guild pass, guild rank)
  - Teleport to any of 15 board locations (0 time cost)

## Completed (2026-02-09)

- [x] Fix Mobile Game Startup (iPad & Android) — 5 issues fixed
  - [x] Moved Google Fonts from CSS @import to HTML <link> (render-blocking fix)
  - [x] Made all screen containers scrollable on mobile (overflow-hidden → overflow-y-auto)
  - [x] Added top-level React Error Boundary (prevents blank white screen on JS errors)
  - [x] Added mobile touch optimizations (touch-action, tap-highlight, active states)
  - [x] Fixed background images from absolute to fixed (stay in place when scrolling)
  - Build passes, 171 tests pass

- [x] Fix Landlord Closed Image — closed.jpg not showing due to hardcoded path missing BASE_URL
  - Changed `src="/locations/closed.jpg"` → `src={import.meta.env.BASE_URL + "locations/closed.jpg"}`
  - Same pattern as all other location images (for-rent.jpg, noble-heights.jpg, slums.jpg)

- [x] Death Modal — dramatic overlay when player HP reaches 0
  - Full-screen dark red overlay with animated skull, "YOU ARE DEAD" title
  - 3 death paths: resurrection (100g savings), free respawn (permadeath OFF, 20 HP at graveyard), permanent death
  - `DeathEvent` type, `deathEvent` state field, `dismissDeathEvent` action
  - Network sync support for online multiplayer
  - AI deaths use eventMessage instead of modal

- [x] Credits / About Screen — rolling text on title menu
  - "About" button on TitleScreen opens full-screen credits sequence
  - Guild-Life-Logo.jpg as background with dark overlay
  - Auto-scrolling credits at 40px/sec with fade mask
  - Random MP3 from 11 game tracks plays during credits
  - Humorous credits text: Tom Husby & Claude, tech stack thanks, bug history
  - Build passes, 171 tests pass

## Completed (2026-02-09)

- [x] Multiplayer Portrait Selection — portrait picker in online multiplayer lobby
  - Added `portraitId` to `LobbyPlayer` network type
  - New `portrait-select` guest→host message type
  - Host and guest can click their avatar to open portrait picker
  - Portraits synced via lobby-update broadcasts
  - Portrait selections passed to `startNewGame()` on game start
  - CharacterPortrait replaces plain colored circles in lobby player list
  - Build passes, 171 tests pass

- [x] iPad Board Stretch & Credits Music Fix
  - Board: removed aspect ratio lock, board now fills 100% available space (no more black bars on iPad)
  - Credits: audioManager.stop() on mount, audioManager.play('main-theme') on unmount (no music overlap)
  - Build passes, 171 tests pass

## Completed (2026-02-10)

- [x] GameBoardHeader positioning — moved Week/Market display from `top-4` to `top-1` (upper edge)
- [x] SFX autoplay bug fix — MP3s no longer permanently marked as failed after browser autoplay block
  - Distinguished `NotAllowedError` (autoplay blocked) from real load errors
  - All 36 MP3 files in public/sfx/ verified matching SFX_LIBRARY
- [x] Portrait imageError persistence fix — reset `imageError` state when `portraitId` changes
  - Fixes seraphina.jpg and other portraits not showing after a previous portrait load failure
  - Added `useEffect` reset in CharacterPortrait.tsx

- [x] Refactor weekEndHelpers.ts — split 530-line god-function into 16 focused helpers
  - 4 global system processors: advanceEconomy, advanceWeatherSystem, checkFestival, calculateFinalPrice
  - 12 per-player processors: resetWeeklyFlags, processEmployment, processNeeds, processWeatherOnPlayer, processFestivalOnPlayer, processHousing, processFinances, processSickness, processLoans, processLeisure, processAging, updateRentTracking
  - Pipeline orchestrator: processPlayerWeekEnd, processDeathChecks
  - Zero behavior changes — 171 tests pass, build succeeds

## Completed (2026-02-10)

- [x] Refactor useGrimwaldAI.ts executeAction — 34-case switch → handler map pattern
  - Created `src/hooks/ai/actionExecutor.ts` with 34 named handler functions
  - Defined `StoreActions` interface bundling 37 store actions
  - `ACTION_HANDLERS` record maps AIActionType → handler function
  - useGrimwaldAI.ts reduced from 627 → 227 lines (64% reduction)
  - useCallback dependency array reduced from 35 items → 1 object
  - Zero behavior changes — 171 tests pass, build succeeds

- [x] Remove 2-hour location entry delay — movement now costs only path distance (1 hr/step)
  - `getMovementCost()` returns `calculatePathDistance()` directly (removed `+ 2`)
  - playerHelpers travel event step calc updated (no longer subtracts 2)
  - CLAUDE.md updated, comments cleaned up
- [x] Enhanced Rain Effect — visible rain overlay draws over screen during rain weather
  - New `RainLayer` component: wet overlay, diagonal streaks, splash ripples at bottom
  - Rain particle count 80→120, light-rain 40→60
  - Rain particles larger and more visible (opacity/size increased)
  - Heavy rain (thunderstorm) vs light rain (harvest-rain) intensity variants
  - Build passes, 171 tests pass

- [x] Gameplay Balance & Feature Batch — 6 changes
  - [x] Scaled resurrection cost based on wealth (100g base + 10% of wealth above 500g, max 2000g)
  - [x] Shadowfingers increased steal chance for rich players (1.5x-2.5x at 1000g+ carried gold)
  - [x] Happiness penalty (-8) on resurrection (paid and free respawn)
  - [x] Adventure Goal added to Online Multiplayer lobby (toggle + slider, presets preserve setting)
  - [x] Job blocking between players (can't take job held by another active player, AI respects too)
  - [x] Removed "Invest 100 Gold" from banking services (stocks/broker is the real investment system)
  - Build passes, 171 tests pass

- [x] Multiplayer Improvement Audit & Security Hardening — 7 bugs fixed, 5 tests added
  - [x] Bug 1 (CRITICAL): activeFestival not synced — guests missed festival effects (wage/gold/happiness bonuses)
  - [x] Bug 2 (HIGH): dismissDeathEvent missing from LOCAL_ONLY_ACTIONS — death modal flicker on guest
  - [x] Bug 3 (HIGH): 3 equipment actions missing from ALLOWED_GUEST_ACTIONS — guests can't temper/repair/salvage
  - [x] Bug 4 (HIGH): Debug actions not in LOCAL_ONLY — forwarded to host and rejected
  - [x] Bug 5 (MEDIUM): No lobby player name validation — long names/control chars could crash UI
  - [x] Bug 6 (MEDIUM): Room code modulo bias — rejection sampling for uniform distribution
  - [x] Bug 7 (MEDIUM): No argument validation for equipment actions — temperEquipment/salvageEquipment uncapped
  - 5 new multiplayer tests (39→44 total)
  - Build passes, 176 tests pass

## In Progress

*No active tasks*

## Standalone Exe / Steam Distribution (Research Complete 2026-02-09)

### Decision: Electron is the recommended framework

- [x] Research all framework options (Electron, Tauri, NW.js, Neutralinojs, etc.)
- [x] Evaluate Steam overlay compatibility
- [x] Evaluate WebRTC/PeerJS compatibility for multiplayer
- [x] Evaluate Steamworks SDK integration options
- [x] Document Steam store submission requirements
- [x] Log findings to log.md

### Implementation Steps (When Ready)

- [ ] Set up Electron + electron-vite project structure
- [ ] Create `electron/main.ts` (window management, Steamworks init)
- [ ] Create `electron/preload.ts` (IPC bridge)
- [ ] Configure electron-builder for Win/Mac/Linux packaging
- [ ] Migrate save games from localStorage to file system (Node.js fs)
- [ ] Integrate `steamworks.js` for achievements/overlay/cloud saves
- [ ] Add Steam overlay repaint workaround for static screens
- [ ] Register Steamworks Partner account ($100 Steam Direct fee)
- [ ] Create Steam store page (2+ weeks before launch)
- [ ] Submit build for Steam review
- [ ] Test with Steamworks App ID 480 (Spacewar) during development

## Proposed Improvements (2026-02-08 Analysis)

Full details with design specs in log.md "Game Improvement Proposals (Gameplay, Quests, Cave, General)"

### Tier 1 — High Impact, Moderate Effort
- [x] A2: Dungeon Random Modifiers — per-run random modifier (Cursed Halls, Lucky Day, Blood Moon, etc.) **DONE 2026-02-09**
- [ ] B1: Quest Chains — multi-part quests (e.g., "The Dragon Conspiracy" 3-part chain)
- [x] C7: Random Travel Events — 10% chance of random event during 3+ step travel **DONE 2026-02-09**
- [ ] B2: Repeatable Daily Bounties — 3 rotating weekly bounty board quests at Guild Hall
- [ ] D1: Fix starvation penalty consistency (-20h only, remove -10hp week-end duplicate)
- [ ] D2: Make Frost Chest & Arcane Tome actually purchasable at Enchanter
- [ ] D3: Implement loan default limits (max 3 extensions, then forced collection)
- [ ] D4: Fix quest education requirements (priest level → actual degrees)

### Tier 2 — High Impact, Higher Effort
- [x] A1: Dungeon Floor 6 "The Forgotten Temple" — ultra-endgame floor with Loremaster requirement **DONE 2026-02-09**
- [x] C1: Seasonal Festivals — Harvest Festival, Winter Solstice, Spring Tournament, Midsummer Fair (every 12 weeks) **DONE 2026-02-09**
- [x] C6: Achievements / Trophy System — lifetime achievements persisted in localStorage **DONE 2026-02-09**
- [ ] A3: Dungeon Companion System — hire companions before dungeon runs (Torchbearer, Mercenary, Healer, Treasure Hunter)
- [ ] B4: Quest Failure Consequences — -2 happiness, -3 dependability, 2-week cooldown on failed quests

### Tier 3 — Nice to Have
- [ ] B5: Guild Reputation System — quest completion tracking with milestone bonuses (+5/10/15/20% gold)
- [ ] C2: NPC Relationship / Favor System — location loyalty discounts (5-15%)
- [ ] C3: Skill / Talent System — passive unlocks from gameplay actions (Haggler, Dungeon Veteran, etc.)
- [ ] E1: Equipment Preview Before Combat — power comparison display
- [ ] E2: Dungeon Run History — track last 5 runs per floor
- [ ] E3: Auto-Equip Best Gear button in CavePanel
- [ ] E4: Post-Combat Loot Summary breakdown
- [ ] E5: Dungeon Shortcuts — skip early floors after clearing later ones
- [x] A4: Dungeon Leaderboard / Best Times — personal best tracking **DONE 2026-02-09**
- [x] A5: Mini-Boss Encounters — 15% wandering boss on re-runs **DONE 2026-02-09**
- [ ] B3: Quest Difficulty Scaling — rewards scale with player progression
- [x] C4: AI Rival Enhancement — competitive quest/job targeting **DONE 2026-02-09**
- [ ] C5: Insurance System at Bank — theft, health, equipment policies
- [ ] C8: Night/Day Cycle — different bonuses in last 20h of turn
- [ ] D5: Dead player visual distinction (greyed out tokens)
- [ ] D6: Keyboard shortcuts focus trapping inside modals
- [ ] D7: Victory leaderboard for multi-player

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
- [x] D1: Mobile/responsive layout — **DONE** (MobileHUD, MobileDrawer, bottom sheet, useIsMobile hook)
- [x] D2: Tooltips for all buttons and icons — **DONE** Title attributes + shortcut hints
- [x] D3: Keyboard shortcuts for common actions — **DONE** E/Esc/Space/T
- [x] D4: Confirmation dialogs for expensive actions — **DONE** ConfirmDialog component
- [x] D5: Dark mode — **REMOVED** (conflicted with parchment aesthetic, all text now always brown)

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
- [x] Responsive design for mobile — **DONE** (mobile layout for Samsung S24)
- [ ] Animations for player movement
- [ ] Tooltips for all buttons
- [x] Dark mode support — **REMOVED** (game uses fixed parchment/brown theme)
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
