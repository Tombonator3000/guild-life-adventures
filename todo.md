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

## In Progress

*No active tasks*

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

**Phase 5: Integration**
- [ ] Connect dungeon quests to floor clear requirements
- [ ] Add rare drops to loot tables (Goblin's Lucky Coin, Dragon Scale, etc.)
- [ ] Add dungeon exploration to Grimwald AI decision engine
- [ ] Balance dungeon rewards with economy

### Missing Jones Features (Priority)
Based on JONES_REFERENCE.md analysis:

**Not Implemented:**
- [ ] Stock Market/Trading System
  - Individual stock purchases/sales
  - T-Bills (safe investment, no crash risk)
  - Market volatility and trading
  - Broker NPC at Bank
- [ ] Loan System
  - Request loans from Bank
  - Interest on loans
  - Repayment schedule
  - Loan defaults and consequences

**Partially Implemented:**
- [ ] Weekend System
  - Entertainment tickets (Baseball, Theatre, Concert)
  - Weekend activities with costs ($5-100)
  - Durable-triggered weekends (20% chance each)
  - Ticket priority system
- [ ] Doctor/Healer System
  - Proper healer location/NPC
  - Doctor visit mechanic (-10 Hours, -4 Happiness, -$30-200)
  - Sickness cure functionality
  - Relaxation-triggered health issues

### Gameplay
- [x] Balance quest rewards
- [ ] Add more random events
- [ ] Improve AI opponent strategies
- [ ] Sound effects and music

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
