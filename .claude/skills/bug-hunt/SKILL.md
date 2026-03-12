---
name: bug-hunt
description: Spawn parallel agents to search for bugs across game mechanics, UI, AI, and store logic. Use when the user wants a broad bug sweep or suspects hidden issues.
user-invocable: true
argument-hint: [focus-area]
allowed-tools: Agent, Read, Grep, Glob, Bash, TodoWrite
model: opus
---

# Bug Hunt Skill

Launch a parallel bug hunt across the Guild Life Adventures codebase.

## Focus Area

If `$ARGUMENTS` is provided, focus the hunt on that area (e.g., "multiplayer", "AI", "quests", "economy", "UI"). Otherwise, run a broad sweep.

## Strategy

Launch 4 parallel Explore agents, each scanning a different domain:

### Agent 1: Game Mechanics & Store Logic
Search `src/store/`, `src/store/helpers/` for:
- State mutations outside Zustand actions
- Missing `!player.isAI` guards before `phase='event'` (BUG-014-D pattern)
- Career progress shown without job check
- Food spoilage flags set on regular food (shelf-stable bread/cheese)
- Employment check order (processEmployment before resetWeeklyFlags)
- Missing optional chaining on `activeCurses`
- Zustand actions starting with `use` prefix (ESLint hook rule violation)

### Agent 2: AI Opponent Logic
Search `src/hooks/ai/`, `src/hooks/useGrimwaldAI.ts` for:
- Personality weights below documented floors (social, education)
- Missing `floorId`/`questId`/`bountyId` in action keys (retry loops)
- Dungeon time budget not accounting for home travel
- Oscillation guard not exempting home location
- `aiIsThinking` not reset when phase !== 'playing'
- Actions remaining too low (should be 25)

### Agent 3: UI Components
Search `src/components/` for:
- React hooks called after early returns
- Missing `hasCurse` + `curses` props on CharacterPortrait
- Raw `player.dependability` shown without job check
- `[quest-objective]` substring match (should not include closing bracket)
- Dialog/modal not blocking keyboard shortcuts
- `DialogDescription` used where plain `<p>` should be (low contrast)
- Overflow-hidden clipping glow effects

### Agent 4: Quest & Dungeon Logic
Search `src/data/quests.ts`, `src/data/bounties.ts`, `src/store/helpers/questHelpers.ts` for:
- `nlChainProgress` vs `questChainProgress` confusion
- Missing `{}` as chainProgress for regular quests/bounties
- `requiredEducation: 'priest'` (no priest degrees exist — use 'mage')
- `getWeeklyBounties(week)` used instead of `getBounty(id)` for active bounty
- `appendEventMessage` called without `!player.isAI` guard

## Output

After all agents complete, compile findings into a structured report:

| # | Severity | File:Line | Description | CLAUDE.md Rule |
|---|----------|-----------|-------------|----------------|

Sort by severity (CRITICAL > HIGH > MEDIUM > LOW).

For each bug found:
1. Show the problematic code snippet
2. Reference the specific CLAUDE.md rule it violates
3. Suggest the fix

Do NOT fix bugs automatically — just report them. The user decides which to fix.
