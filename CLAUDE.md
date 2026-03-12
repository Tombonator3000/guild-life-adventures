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
- **Multiplayer room listing**: MQTT over WebSocket via HiveMQ free public broker (`src/network/gameListing.ts`) — replaces PartyKit (removed 2026-03-04). No configuration required.

## Quick Commands

```bash
bun run dev       # Start development server
bun run build     # Production build
bun run test      # Run tests
bun run lint      # Run ESLint
```

## Claude Code Workflow Tools

### Built-in Commands (use these regularly)
- `/simplify` — Run after every feature. Spawns 3 parallel agents to review changed code for reuse, quality, and efficiency. Accepts optional focus: `/simplify focus on performance`
- `/security-review` — Run before pushing multiplayer or network changes. Analyzes pending changes for security vulnerabilities.
- `/diff` — Interactive diff viewer for uncommitted changes. Better than `git diff` for reviewing work before committing.
- `/compact [focus]` — Compact conversation when context gets long. Pass a focus area to preserve important context: `/compact focus on AI opponent logic`
- `/batch <instruction>` — For large refactors across many files. Spawns 5-30 isolated worktree agents, each opens a PR.

### Custom Skills (in `.claude/skills/`)
- `/test-game [filter]` — Run test suite with structured failure analysis. Reports failing tests with root cause and suggested fix.
- `/bug-hunt [focus-area]` — Parallel bug sweep across 4 domains (store logic, AI, UI, quests). Reports bugs without auto-fixing. Focus areas: "multiplayer", "AI", "quests", "economy", "UI".

## Project Structure

```
src/
├── components/
│   ├── game/           # Game UI components (GameBoard, LocationPanel, etc.)
│   ├── screens/        # Full-screen views (TitleScreen, GameSetup)
│   └── ui/             # shadcn/ui components
├── data/               # Game data (jobs, items, quests, education, locations)
├── hooks/              # React hooks (useAI, use-toast)
│   └── ai/handlers/    # AI action handler submodules (6 domain files)
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
- **Career**: Equals Dependability stat — BUT only counts when employed (`player.currentJob` must be set). Career goal progress = 0 when unemployed. This applies to `GoalProgress.tsx`, `evaluateGoals` (questHelpers.ts), `SpectatorPanel.tsx`, `TurnOrderPanel.tsx`, and `PlayersTab.tsx`. Do NOT show raw `player.dependability` as career progress without a job check.

### Locations (14 total in ring layout)
Noble Heights → General Store → Bank → Forge → Guild Hall → Cave → Academy → Enchanter → Armory → Rusty Tankard → Shadow Market → Fence → Slums → Landlord → (back to Noble Heights)

### Housing
- **The Slums**: Cheap rent, robbery risk
- **Noble Heights**: Expensive, safe from robbery

### Jobs
- Entry ($4-6/hr): Floor Sweeper, Porter — `careerLevel 1–2` jobs are NOT blocked by other players (multiple players may share them). In `GuildHallPanel.tsx`, `isTakenByOther` is `!!jobHolder && job.careerLevel > 2`. Only careerLevel 3+ jobs are exclusive slots.
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
- `version.json` format: `public/version.json` (dev) has `{ "version": "..." }`, but `dist/version.json` (prod, from `versionJsonPlugin`) has `{ "buildTime": "..." }`. In `main.tsx`, always read BOTH fields: `const versionKey = data.version ?? data.buildTime`. NEVER store or compare `undefined` from localStorage — `localStorage.setItem(key, undefined)` stores the string `"undefined"`, which never matches subsequent reads and causes an infinite reload loop (BUG-015).
- Player portrait classes defined in `src/data/portraits.ts` → `PLAYER_PORTRAITS` array (23 portraits in 4 groups: warriors, mystics, rogues, folk). Add new classes there; place matching images in `public/portraits/<id>.jpg`. `PortraitPicker` uses category tabs via `PORTRAIT_GROUPS` and `PortraitGroup` type.
- Regular food (bread/cheese) is shelf-stable: `buyFoodWithSpoilage` must NOT set `foodBoughtWithoutPreservation: true` OR `hasStoreBoughtFood: true`. Only `buyFreshFood` (fresh vegetables/meat) sets those flags. Setting `hasStoreBoughtFood` on regular food causes `processRegularFoodSpoilage` to fire every turn start (55% sick chance per week) even on shelf-stable bread/cheese. Setting `foodBoughtWithoutPreservation` causes starvation after purchase (end-of-turn 50% reduction + weekly drain = 0 food).
- `applyDependabilityDecay` (weekEndHelpers.ts): must check `clothingCondition <= 0` (naked) BEFORE the clothing threshold check. Jobs with `requiredClothing: 'none'` have threshold=0, so `0 < 0` is false and naked players are not exempted — but `workShift` blocks them via `<= 0`. Keep both checks in sync.
- `processEndOfTurnSpoilage` (turnHelpers.ts): only clears `freshFood = 0` when fresh food spoils. Do NOT reduce `foodLevel` — that was causing existing regular food to be halved when fresh food spoiled.
- Employment check order: `processEmployment` MUST run BEFORE `resetWeeklyFlags` in `processPlayerWeekEnd` so `workedThisTurn` is still set when checking for the dependability penalty.
- Zustand store actions MUST NOT start with `use` — ESLint's `react-hooks/rules-of-hooks` treats any `use`-prefixed function as a React hook and will error if it's called inside a callback. Use verbs like `spend`, `apply`, `process`, `buy` instead (e.g., `spendRemainingTime` not `useRemainingTime`).
- Rare drop items (RARE_DROP_ITEMS in items.ts) must have a non-zero `basePrice` for salvage/temper to work. Items with `basePrice: 0` return 0g from `getSalvageValue()` (no Math.max floor). Use a representative market value (e.g., 800g for legendary gear).
- `activeCurses` on Player should always be accessed with optional chaining (`player.activeCurses?.find(...)`) in UI code to guard against old saves that may not have this field initialized. Use `(player.activeCurses?.length ?? 0) > 0` pattern (not `player.activeCurses?.length > 0` which gives `number | undefined`). Store helpers (hexHelpers.ts etc.) may access directly since `activeCurses: []` is always initialized in `createPlayer()` and save migration (v3→v4).
- `CharacterPortrait` curse display: when `hasCurse` is true, the portrait border turns `border-purple-500` with an outer box-shadow glow (`0 0 14px 4px rgba(147,51,234,0.55)`). Pass `curses={player.activeCurses}` to enable a hover tooltip (via Radix Tooltip — `TooltipProvider` is already at app root) showing each hex name and weeks remaining via `getHexById(curse.hexId)`. All call sites that render player portraits during gameplay MUST pass both `hasCurse` and `curses` props. In `SideInfoTabs`, the outer wrapper div (which has `overflow-hidden`) must ALSO get the purple border + box-shadow directly, since `overflow-hidden` clips the portrait's own glow.
- `ShadowfingersModal`: uses parchment/scroll styling matching EventPanel — `parchment-panel` DialogContent, `font-display text-card-foreground` for all text, `gold-button` for Continue. Do NOT use `DialogDescription` (renders as `text-muted-foreground italic` — very low contrast). Use plain `<p>` with `font-display text-base text-card-foreground` instead.
- `allLocationObjectivesDone` and `getQuestLocationObjectives`: regular quest branches (`completeQuest`) and bounty branches (`completeBounty`) in `questHelpers.ts` must pass `{}` as the explicit third `chainProgress` argument — these quest types have no chain context but the parameter should be explicit for consistency. Pattern: `allLocationObjectivesDone(player.activeQuest, player.questLocationProgress ?? [], {})`.
- `appendEventMessage` (playerHelpers.ts): sets `phase='event'` unconditionally. ALL call sites must be guarded with `!player.isAI` BEFORE calling this function. Do not call it from AI code paths. The function itself has no internal guard — the guard must be at the call site.
- `getQuestLocationObjectives` and `allLocationObjectivesDone` accept optional `chainProgress` parameter for chain quest LOQ support. Always pass `player.questChainProgress` when calling these from UI code.
- Quest objective completion notifications use EventPanel (center panel), NOT toasts. `completeLocationObjective` sets `eventMessage` with `[quest-objective]` tag + `phase: 'event'`. Do NOT add `toast.success()` after calling `completeLocationObjective`.
- Appliance repair: Forge is cheaper (50% of Enchanter cost, min 5g, 3h) vs Enchanter (5–25% of `originalPrice`, 2h). The curse notification (`CurseAppliancePanel`) must show BOTH options. `hexHelpers.ts` stores `originalPrice` in `applianceBreakageEvent` so the panel can compute both ranges. Do NOT use `originalPrice * 0.5` as the displayed repair cost — that is the old wrong formula.
- End-of-turn remaining time: NO "Rest X & End" button exists. Remaining hours are auto-consumed in `endTurn` via `applyRemainingTimeAtLocation` (turnHelpers.ts): at job location → partial work shift; at own home → proportional relax/sleep bonuses (happiness, health, relaxation); anywhere else → generic rest (1 happiness per 4 hours). Do NOT re-add the button to ResourcePanel.
- Keyboard shortcuts in `useGameBoardKeyboard.ts`: block all non-modifier game shortcuts (E/T/M/F/B) when any Radix dialog is open via `document.querySelector('[role="dialog"]')`. Ctrl+Shift dev shortcuts and Escape are still allowed. This prevents end-turn, tutorial toggle, etc. from firing while a modal is open.
- Quest `requiredEducation` paths: valid EducationPath values are `'fighter' | 'mage' | 'priest' | 'business'`. However, NO `priest` degrees exist in `education.ts` — the priest path always stays at level 0. Use `'mage'` instead for quests requiring scholarly/spiritual knowledge. Confirmed quests `exorcism` and `haunted-library` fixed to use `mage` path (2026-03-02).
- Player name validation in `GameSetup.tsx`: names are trimmed, must be non-empty, max 20 chars, and unique across all players (human + AI, case-insensitive). Error shown inline above the Begin Adventure button.
- ESLint config (`eslint.config.js`): test file override disabling `@typescript-eslint/no-explicit-any` MUST be placed AFTER the main config block — flat config applies rules in order, last matching block wins. Pattern: `{ files: ["**/*.test.ts", "**/*.test.tsx", "src/test/**/*.ts"], rules: { "@typescript-eslint/no-explicit-any": "off" } }` at end of `tseslint.config(...)`.
- Empty TypeScript interfaces in shadcn/ui: use `type Foo = Bar` instead of `interface Foo extends Bar {}` to avoid `@typescript-eslint/no-empty-object-type` error.
- `getItemPrice(item, priceModifier)` only reads `item.basePrice`. Avoid passing a partial object cast as `any` — use `Math.round(basePrice * priceModifier)` directly when you only have the price field.
- `completedDegrees.includes()` casts: `completedDegrees` is `DegreeId[]`. When iterating `Object.entries(DEGREES)`, the key is `string` → cast as `DegreeId`. When iterating `job.requiredDegrees` (already `DegreeId[]`), no cast needed. When using `plan.targetId` (`string | undefined`), cast as `DegreeId`.

## Testing

```bash
bun run test              # Run all tests
bun run test:watch        # Watch mode
```

Tests are in `src/test/` directory.

## Admin Tools

- HomePanel 🎨 button (dev mode) — Room item graphics generator (Gemini)
- `getQuestLocationObjectives()` handles ALL quest types (regular, chain, bounty, nlchain). Do NOT filter by quest type before calling it — it internally resolves the correct objectives for any prefix. Previously, QuestPanel filtered to only `quest`/`chain` types, causing nlchain LOQs to be invisible.
- Guild Hall auto-tab: When a player has an active quest/bounty, `LocationPanel` computes `defaultTab` ('quests' or 'bounties') and passes it to `LocationShell` so the relevant tab opens automatically.
- `hadRandomEventThisTurn` gates BOTH location arrival events AND travel events — max 1 random event per week total. Travel events must check this flag before rolling AND set it to `true` when a travel event fires. Re-fetch player state before the travel event check (stale snapshot from location event won't reflect the updated flag). In `processPlayerWeekEnd`, save `hadRandomEventThisTurn` BEFORE calling `resetWeeklyFlags`, then use the saved value to gate week-end random events (theft/sickness) — prevents double events in one week.
- Random event chances: location events gate = 5% (`events.ts`), travel events = 5% (`travelEvents.ts` `TRAVEL_EVENT_CHANCE`), week-end random events = 5% gate (`WEEK_END_RANDOM_EVENT_CHANCE` in `weekEndHelpers.ts`). All are limited to 1 per week by `hadRandomEventThisTurn`.
- Weekend event messages are filtered to max 4 via `limitWeekendMessages()` in `weekEndHelpers.ts`. Critical events (eviction, starvation, death, robbery, loan default, CRASH) always fill slots before ordinary ones (weekend activity, lottery, weather). When critical events are present, mundane weekend activity messages (`[rw-*]` tagged) are fully suppressed. Weekend events are shown on ONE screen in `GameBoard.tsx` (no pagination) — `isWeekendEvent = eventSource === 'weekend'` skips the queue and passes full description to `EventPanel` at once.
- Weekend message merging: food spoilage + sickness = one message (sickness implies spoilage). Homeless "slept on streets" + "miserable" = one message with all penalties. Don't add separate "miserable without home" message in `processStartOfTurnBonuses` — the happiness penalty is still applied, but the message is merged into `processHomelessPenalty`.
- AI oscillation prevention: `useGrimwaldAI.ts` uses `visitedLocationsRef` (a `useRef<Set<string>>`) to track visited locations each turn. Moves to already-visited locations get a -20 priority penalty applied before selecting `bestAction`. Reset at each turn start (seeded with `player.currentLocation`). Successful moves add the destination to the set. This prevents the AI wasting hours bouncing between two locations. **Exception**: the home location (slums/noble-heights) is NEVER penalized by the oscillation guard — returning home at end of turn is intended behavior (`generateHomeReturnActions`). The `playerHome` variable exempts it from the −20 penalty in `penalizedActions` map. Without this, home-return priority drops from 96 → 76, which Morgath's `combat:1.6`-scaled dungeon (93) would beat.
- AI turn isolation: `useAutoEndTurn` MUST skip AI players (`if (currentPlayer.isAI) return false`). AI manages its own `endTurn()` via `runAITurn/step()`. Letting `useAutoEndTurn` fire for AI (500ms timeout) races with easy-AI steps (800ms delay) → double `endTurn()` → skipped turns and cascading inconsistencies.
- AI stale-step guard: `runAITurn` captures `startingPlayerIndex = useGameStore.getState().currentPlayerIndex` before the step loop. Each `step()` call checks `state.currentPlayerIndex !== startingPlayerIndex` and aborts if another code path advanced the turn externally. This prevents phantom `endTurn()` calls after the turn is over. NOTE: the guard only checks playerIndex, NOT `phase` — any store action that sets `phase = 'event'` without an `isAI` guard disrupts `useAITurnHandler` while the step loop keeps running.
- AI `phase='event'` guard rule (BUG-014-D): ALL store actions that set `phase = 'event'` MUST be guarded with `!player.isAI`. If an AI's step loop triggers `phase = 'event'`, `useAITurnHandler` resets its tracking flags; after `endTurn()`, phase stays 'event' (endTurn does NOT reset phase), freezing the next player's turn. Pattern: split the `set()` into two — one for player state (unconditional), one for event (guarded). Confirmed safe: `appendEventMessage`, `processEndOfTurnSpoilage`, `completeChainQuest`, `makeNLChainChoice`, `startTurnHelpers`. BUG-014-D source: `completeLocationObjective` was missing this guard (fixed 2026-03-01 in questHelpers.ts).
- AI turn init try-catch: The initialization block in `runAITurn` (observeHumanPlayers, recordPerformance, generateCommitmentPlan, etc.) is wrapped in try-catch. If any helper throws, `isExecutingRef.current = false` and `endTurn()` are called so the game recovers rather than freezing permanently.
- AI `aiIsThinking` reset: In `useAITurnHandler`, when `phase !== 'playing'` (event/setup/victory), ALWAYS call `setAiIsThinking(false)` before returning. Without this, when week-end events fire (`phase='event'`), `lastAIPlayerIdRef` gets cleared but `aiIsThinking` stays `true`. When the phase returns to `'playing'`, the reset block can't fire (no `lastAIPlayerIdRef`) so `aiIsThinking=true` blocks the start block → AI freezes permanently at the start of the new week.
- Active bounty UI must resolve details with `getBounty(activeBountyId)` (full bounty pool), NOT `getWeeklyBounties(week)`. Weekly rotation changes between turns; using weekly list can hide an in-progress bounty and block completion UI in Guild Hall.
- Quest/bounty woodcut illustrations: 42 images in `src/assets/quests/`. Mapping in `src/assets/quests/index.ts` via `getQuestImage(questId)`. EventPanel tries `getQuestImage` before `getEventImage`. Quest objective events embed quest ID: `[quest-objective:activeQuestId]` tag format.
- Active bounty/quest UI must resolve details with `getBounty(activeBountyId)` (full bounty pool), NOT `getWeeklyBounties(week)`. This applies to BOTH `BountyBoardPanel.resolveActiveBounty` AND `QuestPanel.resolveActiveQuest`. Weekly rotation changes between turns; using weekly list can hide an in-progress bounty and block completion UI.
- Quest/bounty woodcut illustrations: 51 images in `src/assets/quests/`. Mapping in `src/assets/quests/index.ts` via `getQuestImage(questId)`. EventPanel tries `getQuestImage` before `getEventImage`. Quest objective events embed quest ID: `[quest-objective:activeQuestId]` tag format.
- Bounty pool: 18 bounties total, 4 shown per week (deterministic rotation). Each bounty has 1 LOQ, 3 description variants, and a dedicated woodcut illustration. Weekly quest rotation: 8 quests per week (seeded shuffle from full pool).
- NL chain LOQ resolution: When calling `getQuestLocationObjectives` or `allLocationObjectivesDone` for nlchain quests, pass `player.nlChainProgress` (NOT `player.questChainProgress`). `questChainProgress` is for linear chains only. Using the wrong progress map causes step 0 LOQs to show instead of the current step's LOQs. This applies to ALL call sites: QuestPanel, LocationPanel, HomePanel, GameBoard (map markers), BountyBoardPanel, questHelpers (store), and AI questDungeonActions. Pattern: `const chainProgressForLOQ = activeQuest?.startsWith('nlchain:') ? player.nlChainProgress : player.questChainProgress;`
- Event title for quest objectives: Check `eventMessage?.includes('quest-objective')` (substring match), NOT `includes('[quest-objective]')`. The actual tag format is `[quest-objective:questId]` — the closing bracket comes after the quest ID, so `[quest-objective]` as an exact substring doesn't match.
- AI education pipeline: `generateProactiveEducationActions` in strategicActions.ts fires REGARDLESS of weakest goal. `generateEducationPipelineActions` allows STARTING new degrees (not just finishing). `getWeakestGoal` redirects career/wealth to education ONLY when education progress < 35% (NOT 50% — too aggressive) AND margin < 0.15 (NOT 0.2). Commitment plan duration for degrees: medium=4, hard=6 turns. Cash flow gate: `costPerSession + 15` (not `* 3`). Work base priority: 55 (not 50), wage boost up to 25 for hard AI.
- AI action handlers: `actionExecutor.ts` is the dispatcher; actual handler implementations live in `src/hooks/ai/handlers/` grouped by domain (resource, employment/education, housing/finance, equipment, quest/dungeon, hex). Add new handlers to the appropriate domain file and register in `ACTION_HANDLERS` map in `actionExecutor.ts`.
- AI action limit: `actionsRemaining = 25` (NOT 15 — too low, AI ends turns with 20+ hours left). Located in `useGrimwaldAI.ts`.
- AI failed action key: `actionKey()` in `useGrimwaldAI.ts` MUST include `floorId`, `questId`, `bountyId`, `ticketType` — not just `degreeId/jobId/itemId`. Missing fields cause AI to retry the same failed dungeon/quest action each step, wasting the entire action budget.
- AI cash flow forecast: `USABLE_HOURS_PER_TURN = 28` (NOT 40 — too optimistic) and `SHORTFALL_THRESHOLD = 120` (NOT 50 — too low). In `strategy.ts forecastCashFlow()`.
- AI goal sprint: `getWeakestGoal()` sprints at >= 72% (NOT 80%). `applySmartGoalSprint()` in actionGenerator.ts uses >= 55% (NOT 65%). Both lower thresholds = AI closes goals faster.
- AI resource urgency: food urgency = 0.7 at <40 food (was no tier between <50→0.6 and <25→1.0). Rent urgency = 0.35 at 1 week overdue (was 0.1 → jump straight to 0.5). In `strategy.ts calculateResourceUrgency()`.
- AI difficulty settings: hard AI aggressiveness=0.95 (NOT 0.9), mistakeChance=0.01 (NOT 0.02), efficiencyWeight=0.95 (NOT 0.9). Medium: aggressiveness=0.7, mistakeChance=0.05, efficiencyWeight=0.7. In `types.ts DIFFICULTY_SETTINGS`.
- AI personality weights vs goal generator interaction: `generateGoalActions` only fires ONE goal's actions (weakest goal). Personality weights then scale those actions. Wealth-focused AIs (Thornwick `wealth:1.5`) still generate work actions at priority 120 even when happiness is weakest goal, because secondary generators fire. Happiness actions at 0.7x scale → 44 lose to work at 120. Fix: `generateHappinessFloorActions` in `criticalNeeds.ts` provides a universal happiness floor (priority 95-145 before scaling) regardless of which goal is weakest.
- AI personality weight self-defeat: Thornwick's old `education:0.8` weight caused him to skip education→high-wage pipeline, leaving him at ~58g/shift vs balanced Grimwald's ~172g/shift. Wealth-focused AIs NEED education to unlock high-paying jobs. Thornwick corrected to `education:1.1`. Never set a wealth-focused AI's education weight below 1.0.
- `ResourceUrgency` in `types.ts` has a `happiness` field (added 2026-03-06). `calculateResourceUrgency` in `strategy.ts` calculates it (0=fine, 1=critical). `generateHappinessFloorActions` in `criticalNeeds.ts` uses this urgency to enforce a minimum happiness for all AIs.
- AI `social` weight floor rule: `generateHappinessFloorActions` base priorities are 145/120/95 (emergency/urgent/proactive). After `social` weight scaling, urgent tier (120) must beat the highest competing action priority. For Thornwick (`wealth:1.5`), work = 80×1.5=120 → need `social >= 1.1` (120×1.1=132 > 120). For Morgath (`wealth:0.9`), work = 80×0.9=72 → need `social >= 0.8` (120×0.8=96 > 72). Never set `social` below these thresholds or happiness will permanently crash.
- AI dungeon access gate: `hasCaveAccess = player.completedDegrees.length > 0` in `questDungeonActions.ts`. A combat AI (`combat:1.6`) with `education:0.7` will NEVER enter the dungeon because it never earns a degree. Always keep warrior/combat AI education weight ≥ 0.9 so they get at least Combat Training (their natural first degree). Fixed: Morgath `education: 0.7 → 0.9`.
- AI dungeon time budget: When at Cave, `generateQuestDungeonActions` checks `player.timeRemaining > floorTime + homeCostAfter`. If the AI can't do the dungeon AND return home, dungeon priority drops to 15 (very low) so `generateHomeReturnActions` (priority 96) wins. Without this, Morgath (`combat:1.6`) would start dungeon with 10h left, finish with 4h, and be stranded at Cave (7 steps from Slums).
- "Your Scrolls" section header in `HexShopPanel.tsx`: uses `text-sm font-bold` with explicit dark colors per variant (`#4a1072` enchanter, `#7c3aed` shadow-market). Do NOT use `accentColor` variable for this heading — shadow-market's `#c084fc` is too light on red-50 background.
- AI graduation travel: BOTH `generateGraduationActions` AND `generateEducationActions` must generate a `move` to academy when `sessionsLeft <= 0` and NOT at academy. Graduation is free (no gold cost) and gives education points + happiness — always worth traveling for. Priority 80-82. Add early `return` after generating graduate/travel action to avoid also suggesting study of a completed degree.
- AI proactive education cap: hard AI pursues up to 8 degrees (was 4), medium AI up to 5. Defined as `const degreeCap = settings.planningDepth >= 3 ? 8 : 5` in `generateProactiveEducationActions`.
- AI job upgrade threshold: hard AI upgrades for any >10% wage improvement (`upgradeThreshold = 1.1`); medium/easy require 20% (`1.2`).
- AI education pipeline (depth >= 2): medium AI now participates in the job-unlock pipeline (was hard-only). Hard AI uses 1.2x wage target threshold; medium uses 1.3x.
- AI festival actions: all festival bonus priorities boosted by ~6-10 points since festivals are time-limited. Wage festivals also generate a travel action to job location (not just boosting work when already there).
- Multiplayer room listing uses **MQTT over WebSocket** via the free HiveMQ public broker (`wss://broker.hivemq.com:8884/mqtt`). Implementation: `src/network/gameListing.ts`. Broker is zero-config — no account, no deploy, no env var needed. Retained MQTT messages give guests an instant full room list on subscribe. MQTT 5.0 `messageExpiryInterval: 300s` auto-expires stale rooms. Do NOT re-add PartyKit or Firebase for room listing. `src/lib/partykit.ts` still exists for reference but `isPartykitConfigured()` is no longer called in the listing flow.
- Regular food (bread/cheese) is shelf-stable: `buyFoodWithSpoilage` must NOT set `foodBoughtWithoutPreservation: true` OR `hasStoreBoughtFood: true`. Only `buyFreshFood` (fresh vegetables/meat) sets those flags. Setting `hasStoreBoughtFood` on regular food causes `processRegularFoodSpoilage` to fire every turn start (55% sick chance per week) even on shelf-stable bread/cheese. Setting `foodBoughtWithoutPreservation` causes starvation after purchase (end-of-turn 50% reduction + weekly drain = 0 food).
- `applyDependabilityDecay` (weekEndHelpers.ts): must check `clothingCondition <= 0` (naked) BEFORE the clothing threshold check. Jobs with `requiredClothing: 'none'` have threshold=0, so `0 < 0` is false and naked players are not exempted — but `workShift` blocks them via `<= 0`. Keep both checks in sync.
- `processEndOfTurnSpoilage` (turnHelpers.ts): only clears `freshFood = 0` when fresh food spoils. Do NOT reduce `foodLevel` — that was causing existing regular food to be halved when fresh food spoiled.
- Employment check order: `processEmployment` MUST run BEFORE `resetWeeklyFlags` in `processPlayerWeekEnd` so `workedThisTurn` is still set when checking for the dependability penalty.
- Multiplayer reconnect: Guest sessions saved to `sessionStorage` (`guild-life-online-session`) with `{ roomCode, playerName, slot, timestamp }`. Sessions expire after 30 minutes. `useOnlineGame` exposes `savedSession` and `rejoinGame()`. Clear session on intentional disconnect or game end. Rejoin prompt shown in Online menu via `OnlineLobby.tsx`.
- Multiplayer connection UI: `GameBoardOverlays.tsx` shows connection-lost banner when `connectionStatus !== 'connected'` during online play. Banner shows "Reconnecting..." with spinner OR "Connection Lost" with Retry button. `useNetworkSync` exposes `connectionStatus` and `attemptReconnect`.
- Multiplayer lobby chat: `LobbyChat` component in `OnlineLobby.tsx` handles pre-game chat. Messages use `chat-message` type through PeerManager, handled in both host and guest message filters in `useOnlineGame.ts`. Lobby chat state is local to the lobby (not persisted to game state).
- Spectator chat identity: `ChatPanel` sender info must use `localPlayer?.name` for dead-player spectators and `"Spectator"` for pure spectators — never `currentPlayer.name` (which is the active turn player). Pass correct `senderName`/`senderColor` props from `GameBoard.tsx`.
- Player portrait classes defined in `src/data/portraits.ts` → `PLAYER_PORTRAITS` array (23 portraits in 4 groups: warriors, mystics, rogues, folk). Add new classes there; place matching images in `public/portraits/<id>.jpg`. `PortraitPicker` uses category tabs via `PORTRAIT_GROUPS` and `PortraitGroup` type.
- `PLAYER_COLORS` in `game.types.ts` has 6 entries (Crimson, Azure, Emerald, Amber, Violet, Rose). `MAX_TOTAL_PLAYERS` in `GameSetup.tsx` is 6. `gameStore.ts:startNewGame` indexes `PLAYER_COLORS[index]` for human players — never exceed 6 human players without adding more colors first. `AI_OPPONENTS` has 4 entries — max 4 AI opponents. `GameSetup.tsx` uses `canAddMoreAI` guard (`aiOpponents.length < AI_OPPONENTS.length`). `startNewGame` caps with `.slice(0, AI_OPPONENTS.length)`. Never use `AI_OPPONENTS[i] || AI_OPPONENTS[0]` fallback — it creates duplicate player IDs.
- `PlayerToken` accepts optional `onClickPlayer?: (player: Player) => void` prop. When set on a non-current player, renders with pointer cursor + hover scale. Uses `e.stopPropagation()` to prevent the parent `LocationZone` click from also firing (prevents accidental movement when viewing player info).
- `processHomelessPenalty` (startTurnHelpers.ts): MUST apply all three penalties — health, timeRemaining, AND happiness. The HOMELESS_HAPPINESS_PENALTY constant and event message both reference happiness but the `updatePlayerById` call must include `happiness: Math.max(0, p.happiness - HOMELESS_HAPPINESS_PENALTY)` or it silently skips the penalty.
- AI appliance repair time cost: `handleRepairAppliance` in `actionExecutor.ts` MUST call `store.spendTime(player.id, location === 'forge' ? 3 : 2)`. Forge repair = 3h, Enchanter repair = 2h. Do NOT use 1h (old bug, fixed 2026-03-01). Also check `cost === 0` return value — if repair failed (not enough gold), return false immediately.
- `BountyBoardPanel.tsx` LOQ resolution: Bounties are standalone quests, never chain or nlchain. Pass `{}` (empty object) for `chainProgress` when calling `getQuestLocationObjectives` or `allLocationObjectivesDone` inside the active bounty block. Never check `startsWith('nlchain:')` inside that block — it's unreachable since `resolveActiveBounty` only returns for `'bounty:'` prefix quests.
- Pawn shop redemption (2026-03-02): `pawnAppliance` stores a `PawnedAppliance` record in `player.pawnedAppliances[]` (fields: applianceId, originalPrice, pawnedWeek, expiresWeek = pawnedWeek+6). `redeemAppliance` checks `week <= expiresWeek`, deducts 50% original price via `getRedeemPrice()`, restores appliance. `processPawnExpiration` in weekEndHelpers.ts expires records where `newWeek > expiresWeek`. Save version is now 6 (v5→v6 migration adds `prepaidDegrees: {}`). `PawnShopPanel` requires `week` prop (passed from `locationTabs.tsx` as `ctx.week`).
- Jones-style full-course tuition (2026-03-06): `payFullTuition(playerId, degreeId, totalCost, sessions)` in `workEducationHelpers.ts` deducts gold and sets `player.prepaidDegrees[degreeId] = sessions`. `studyDegree` checks `prepaidDegrees[degreeId]` first — if > 0, session costs 0g (time only) and decrements the counter. AcademyPanel shows "Enroll Full Course" button + "Tuition paid — N free sessions remaining" badge. Never double-prepay (guard: `if (p.prepaidDegrees[degreeId]) return p`). Access with `(player.prepaidDegrees ?? {})[degreeId]` in UI for old-save safety.
- Music track variants (2026-03-06): `MusicTrack` in `musicConfig.ts` has optional `variants?: string[]` for 2-3 variant files per location. `pickTrackFile(track)` randomly selects from the pool. `audioManager.play()` calls `pickTrackFile` and passes a `fallbackUrl` (the default file) to `crossfadeTo` — if a variant 404s, an `error` listener retries with the default. Placeholder variant filenames follow pattern `03guildhall_v2.mp3`. Drop real files in `/public/music/` to activate them.
- Location services preview (2026-03-06): `LOCATION_SERVICES` in `LocationPanel.tsx` maps each `LocationId` to a human-readable string[] of what the location offers. Shown as a "What's here" list below the disabled travel button when a player has 0 time remaining and cannot reach the location. Uses `LOCATION_SERVICES[locationId]` — all 14 locations covered.
- Dev mode gate: Developer tab and debug keyboard shortcuts (Ctrl+Shift+D/Z) are hidden unless dev mode is activated by clicking the Shield icon on TitleScreen 5 times within 2 seconds. Session-only (module-level flag in `src/hooks/useDevMode.ts`). `RightSideTabs` filters out the 'developer' tab, `useGameBoardKeyboard` gates shortcuts behind `isDevMode()`.
- Keyboard board navigation (2026-03-09): `useKeyboardLocationNav` hook in `src/hooks/useKeyboardLocationNav.ts`. Tab/Shift+Tab + Arrow keys cycle through `BOARD_PATH` locations; Space/Enter triggers `handleLocationClick`. Enabled only when `options.enableKeyboardNav` is true AND no Radix dialog is open. Visual focus ring shown via `isKeyboardFocused` prop on `LocationZone`. Toggle in Options tab (Accessibility section). Hook is disabled when AI is thinking or not the local player's turn.
- A/B outfit system (2026-03-09): `player.backupOutfit: number | null` — stored secondary outfit condition. `swapOutfits(playerId)` swaps active ↔ stored. `storeBackupOutfit(playerId, condition, cost)` buys an outfit into backup slot. At Armory, when player's backup is lower condition, each clothing item shows an extra "Store as Backup Outfit" option. At home (noble-heights/slums), Wardrobe bar shows both outfit conditions and a "Swap Outfits" button. Both actions are in `workEducationHelpers.ts` and exposed via `storeTypes.ts` + `LocationTabContext`.
- Book reading at Academy (2026-03-09): `readBook(playerId, hours, cost)` action in `workEducationHelpers.ts` — spends time + gold, gives `hours * 1.5` happiness. Academy now has a "📖 Library" tab with 3 reading options (2h/4h/6h). Reading is purely for happiness/fun, no education progress. Action is in `locationTabs.ts` academyTabs.
- Short shift / Cram study (2026-03-09): `WorkSection.tsx` shows a "Short Shift Xh" button when `player.timeRemaining < jobData.hoursPerShift` and `> 0` — calls `workShift` with remaining time for proportional pay. `AcademyPanel.tsx` shows a "Cram Session Xh" button when time is insufficient for a full session but still > 0 — calls `studyDegree` with remaining time, counts as 1 full session at full cost. Both use existing store actions with arbitrary hours.
- Home item hover info (2026-03-09): `RoomScene.tsx` wraps all items in `HoverableItem` component that shows `HomeItemTooltip` (name, description, effect/bonus) on hover. Appliances show their per-turn bonus (cooking fire food, arcane tome income). Broken appliances show "BROKEN — needs repair". Durables show their happiness/relaxation effect via `getItem(id).effect`.
- Token animations (2026-03-09): Two new keyframes in `tailwind.config.ts`: `token-arrive` (bounce-in when player token appears at a location, applied to `PlayerToken` via `animate-token-arrive`) and `token-walk` (wobble during movement, applied to `AnimatedPlayerToken` when `animationPath` is set). `AnimatedPlayerToken` uses `linear` transition during walk for smoother movement.
