# Guild Life Adventures - Development Log

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
