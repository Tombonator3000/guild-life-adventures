# Guild Life Adventures - Development Log

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
