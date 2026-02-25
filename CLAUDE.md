# CLAUDE.md

## Project Overview

**Guild Life Adventures** is a fantasy life simulation game inspired by "Jones in the Fast Lane" (Sierra On-Line, 1991). Players compete to achieve victory goals in Wealth, Happiness, Education, and Career while managing time, resources, and life choices in a medieval fantasy setting.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS + shadcn/ui components
- **Testing**: Vitest + Testing Library
- **Package Manager**: Bun

## Quick Commands

```bash
bun run dev       # Start development server
bun run build     # Production build
bun run test      # Run tests
bun run lint      # Run ESLint
```

## Project Structure

```
src/
├── components/
│   ├── game/           # Game UI components (GameBoard, LocationPanel, etc.)
│   ├── screens/        # Full-screen views (TitleScreen, GameSetup)
│   └── ui/             # shadcn/ui components
├── data/               # Game data (jobs, items, quests, education, locations)
├── hooks/              # React hooks (useAI, use-toast)
├── store/              # Zustand store (gameStore.ts)
├── types/              # TypeScript types (game.types.ts)
└── assets/             # Images (game-board.jpeg)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/store/gameStore.ts` | Central game state and all game actions |
| `src/types/game.types.ts` | TypeScript interfaces and constants |
| `src/data/jobs.ts` | Job definitions and employment logic |
| `src/data/education.ts` | Degree system with prerequisites |
| `src/data/locations.ts` | Board locations and movement costs |
| `src/data/items.ts` | Items, appliances, and durables |
| `src/hooks/useAI.ts` | AI opponent (Grimwald) logic |

## Game Mechanics

### Turn System
- Each turn = 1 week with 60 hours
- Movement costs 1 hour per location step
- Starvation penalty: -20 hours if no food at turn start

### Victory Goals
- **Wealth**: Gold + bank deposits (100g = 1 point)
- **Happiness**: Accumulated from purchases, education, activities
- **Education**: Degrees earned (9 points per degree)
- **Career**: Equals Dependability stat

### Locations (14 total in ring layout)
Noble Heights → General Store → Bank → Forge → Guild Hall → Cave → Academy → Enchanter → Armory → Rusty Tankard → Shadow Market → Fence → Slums → Landlord → (back to Noble Heights)

### Housing
- **The Slums**: Cheap rent, robbery risk
- **Noble Heights**: Expensive, safe from robbery

### Jobs
- Entry ($4-6/hr): Floor Sweeper, Porter
- Mid ($10-14/hr): Market Vendor, Teacher
- Top ($20-25/hr): Sage, Guild Treasurer, Master Artificer

### Education (11 degrees)
Trade Guild Certificate → Arcane Studies / Combat Training
Junior Academy → Scholar Path → Loremaster / Commerce Degree

## Documentation

- `agents.md` - AI opponent documentation
- `log.md` - Development history
- `todo.md` - Task tracking
- `JONES_REFERENCE.md` - Original game reference (800+ lines)

## Code Conventions

- Use Zustand actions for all state changes
- All game text in English
- Zone positions defined as percentages in `ZONE_CONFIGS`
- Appliances have break chances (1/51 enchanter, 1/36 market)
- All React hooks (useState, useMemo, useEffect) MUST be called before any early returns in components
- Edge functions use direct fetch with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (no supabase client import)
- AI-generated item graphics cached in IndexedDB (homeItemImageCache.ts), not localStorage (base64 too large)
- Home item room graphics use "Medieval woodcut whimsical illustration" prompt style for consistency
- Tutorial toggle: always call `setShowTutorial(enableTutorial)` unconditionally on game start — do NOT use `if (enableTutorial) setShowTutorial(true)` (omitting the false branch leaves a stale true from previous session)
- Tutorial system: only ONE tutorial system exists — `ContextualTips` (context-aware interactive guide). `TutorialOverlay` (9-step static tutorial) has been removed from rendering. `ContextualTips` uses `if (!showTutorial || ...) return null` — it shows ONLY when tutorial is ON, hides when OFF. Do NOT re-add `TutorialOverlay` or create a second tutorial system.
- OG meta image: use `https://guild-life.com/og-image.png` (stable). Never use signed cloud storage URLs (they expire). Place a 1200×630 PNG at `public/og-image.png`.
- Player portrait classes defined in `src/data/portraits.ts` → `PLAYER_PORTRAITS` array. Add new classes there; place matching images in `public/portraits/<id>.jpg`.
- Regular food (bread/cheese) is shelf-stable: `buyFoodWithSpoilage` must NOT set `foodBoughtWithoutPreservation: true`. Only `buyFreshFood` (fresh vegetables/meat) sets this flag for end-of-turn spoilage. Setting it on regular food causes starvation after purchase (end-of-turn 50% reduction + weekly drain = 0 food).
- `applyDependabilityDecay` (weekEndHelpers.ts): must check `clothingCondition <= 0` (naked) BEFORE the clothing threshold check. Jobs with `requiredClothing: 'none'` have threshold=0, so `0 < 0` is false and naked players are not exempted — but `workShift` blocks them via `<= 0`. Keep both checks in sync.
- `processEndOfTurnSpoilage` (turnHelpers.ts): only clears `freshFood = 0` when fresh food spoils. Do NOT reduce `foodLevel` — that was causing existing regular food to be halved when fresh food spoiled.
- Employment check order: `processEmployment` MUST run BEFORE `resetWeeklyFlags` in `processPlayerWeekEnd` so `workedThisTurn` is still set when checking for the dependability penalty.
- Zustand store actions MUST NOT start with `use` — ESLint's `react-hooks/rules-of-hooks` treats any `use`-prefixed function as a React hook and will error if it's called inside a callback. Use verbs like `spend`, `apply`, `process`, `buy` instead (e.g., `spendRemainingTime` not `useRemainingTime`).
- Rare drop items (RARE_DROP_ITEMS in items.ts) must have a non-zero `basePrice` for salvage/temper to work. Items with `basePrice: 0` return 0g from `getSalvageValue()` (no Math.max floor). Use a representative market value (e.g., 800g for legendary gear).
- `activeCurses` on Player should always be accessed with optional chaining (`player.activeCurses?.find(...)`) in UI code to guard against old saves that may not have this field initialized.
- `getQuestLocationObjectives` and `allLocationObjectivesDone` accept optional `chainProgress` parameter for chain quest LOQ support. Always pass `player.questChainProgress` when calling these from UI code.
- Quest objective completion notifications use EventPanel (center panel), NOT toasts. `completeLocationObjective` sets `eventMessage` with `[quest-objective]` tag + `phase: 'event'`. Do NOT add `toast.success()` after calling `completeLocationObjective`.
- Appliance repair: Forge is cheaper (50% of Enchanter cost, min 5g, 3h) vs Enchanter (5–25% of `originalPrice`, 2h). The curse notification (`CurseAppliancePanel`) must show BOTH options. `hexHelpers.ts` stores `originalPrice` in `applianceBreakageEvent` so the panel can compute both ranges. Do NOT use `originalPrice * 0.5` as the displayed repair cost — that is the old wrong formula.
- End-of-turn remaining time: NO "Rest X & End" button exists. Remaining hours are auto-consumed in `endTurn` via `applyRemainingTimeAtLocation` (turnHelpers.ts): at job location → partial work shift; at own home → proportional relax/sleep bonuses (happiness, health, relaxation); anywhere else → generic rest (1 happiness per 4 hours). Do NOT re-add the button to ResourcePanel.

## Testing

```bash
bun run test              # Run all tests
bun run test:watch        # Watch mode
```

Tests are in `src/test/` directory.

## Admin Tools

- `/admin/sfx` — Sound effect generator (ElevenLabs)
- HomePanel 🎨 button (dev mode) — Room item graphics generator (Gemini)
- `getQuestLocationObjectives()` handles ALL quest types (regular, chain, bounty, nlchain). Do NOT filter by quest type before calling it — it internally resolves the correct objectives for any prefix. Previously, QuestPanel filtered to only `quest`/`chain` types, causing nlchain LOQs to be invisible.
- Guild Hall auto-tab: When a player has an active quest/bounty, `LocationPanel` computes `defaultTab` ('quests' or 'bounties') and passes it to `LocationShell` so the relevant tab opens automatically.
- `hadRandomEventThisTurn` gates BOTH location arrival events AND travel events — max 1 random event per week total. Travel events must check this flag before rolling AND set it to `true` when a travel event fires. Re-fetch player state before the travel event check (stale snapshot from location event won't reflect the updated flag). In `processPlayerWeekEnd`, save `hadRandomEventThisTurn` BEFORE calling `resetWeeklyFlags`, then use the saved value to gate week-end random events (theft/sickness) — prevents double events in one week.
- Random event chances: location events gate = 5% (`events.ts`), travel events = 5% (`travelEvents.ts` `TRAVEL_EVENT_CHANCE`), week-end random events = 5% gate (`WEEK_END_RANDOM_EVENT_CHANCE` in `weekEndHelpers.ts`). All are limited to 1 per week by `hadRandomEventThisTurn`.
- Weekend event messages are filtered to max 4 via `limitWeekendMessages()` in `weekEndHelpers.ts`. Critical events (eviction, starvation, death, robbery, loan default, CRASH) always fill slots before ordinary ones (weekend activity, lottery, weather). When critical events are present, mundane weekend activity messages (`[rw-*]` tagged) are fully suppressed. Weekend events are shown on ONE screen in `GameBoard.tsx` (no pagination) — `isWeekendEvent = eventSource === 'weekend'` skips the queue and passes full description to `EventPanel` at once.
- Weekend message merging: food spoilage + sickness = one message (sickness implies spoilage). Homeless "slept on streets" + "miserable" = one message with all penalties. Don't add separate "miserable without home" message in `processStartOfTurnBonuses` — the happiness penalty is still applied, but the message is merged into `processHomelessPenalty`.
- AI oscillation prevention: `useGrimwaldAI.ts` uses `visitedLocationsRef` (a `useRef<Set<string>>`) to track visited locations each turn. Moves to already-visited locations get a -20 priority penalty applied before selecting `bestAction`. Reset at each turn start (seeded with `player.currentLocation`). Successful moves add the destination to the set. This prevents the AI wasting hours bouncing between two locations.
- Active bounty/quest UI must resolve details with `getBounty(activeBountyId)` (full bounty pool), NOT `getWeeklyBounties(week)`. This applies to BOTH `BountyBoardPanel.resolveActiveBounty` AND `QuestPanel.resolveActiveQuest`. Weekly rotation changes between turns; using weekly list can hide an in-progress bounty and block completion UI.
- Quest/bounty woodcut illustrations: 51 images in `src/assets/quests/`. Mapping in `src/assets/quests/index.ts` via `getQuestImage(questId)`. EventPanel tries `getQuestImage` before `getEventImage`. Quest objective events embed quest ID: `[quest-objective:activeQuestId]` tag format.
- Bounty pool: 18 bounties total, 4 shown per week (deterministic rotation). Each bounty has 1 LOQ, 3 description variants, and a dedicated woodcut illustration. Weekly quest rotation: 8 quests per week (seeded shuffle from full pool).
- NL chain LOQ resolution: When calling `getQuestLocationObjectives` or `allLocationObjectivesDone` for nlchain quests, pass `player.nlChainProgress` (NOT `player.questChainProgress`). `questChainProgress` is for linear chains only. Using the wrong progress map causes step 0 LOQs to show instead of the current step's LOQs. This applies to ALL call sites: QuestPanel, LocationPanel, HomePanel, GameBoard (map markers), BountyBoardPanel, questHelpers (store), and AI questDungeonActions. Pattern: `const chainProgressForLOQ = activeQuest?.startsWith('nlchain:') ? player.nlChainProgress : player.questChainProgress;`
- Event title for quest objectives: Check `eventMessage?.includes('quest-objective')` (substring match), NOT `includes('[quest-objective]')`. The actual tag format is `[quest-objective:questId]` — the closing bracket comes after the quest ID, so `[quest-objective]` as an exact substring doesn't match.
