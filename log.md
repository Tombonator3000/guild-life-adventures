# Guild Life Adventures - Development Log

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
