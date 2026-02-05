# Guild Life Adventures - Todo List

## Completed (2026-02-05)

- [x] Full economy & happiness audit — all values rebalanced
  - Gold income reduced (work bonus, quests, cave, investments)
  - Happiness sources nerfed (relax, sleep, items, quests)
  - Costs increased (food, rent)
  - See log.md for full details

## In Progress

*No active tasks*

---

## Backlog

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
- [ ] Balance quest rewards
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

### Technical
- [ ] Unit tests for gameStore
- [ ] E2E tests with Playwright
- [ ] Performance optimization
- [ ] Save game state (localStorage)

### Content
- [ ] More quest types
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
