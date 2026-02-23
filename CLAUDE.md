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

## Testing

```bash
bun run test              # Run all tests
bun run test:watch        # Watch mode
```

Tests are in `src/test/` directory.

## Admin Tools

- `/admin/sfx` — Sound effect generator (ElevenLabs)
- HomePanel 🎨 button (dev mode) — Room item graphics generator (Gemini)
