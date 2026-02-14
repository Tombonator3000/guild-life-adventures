# MEMORY.md — Guild Life Adventures Master Reference

> **Purpose**: Single source of truth for understanding the entire project. Read this first before working on anything. Contains architecture, file maps, game mechanics, conventions, current status, and cross-references to all other documentation.
>
> **Last updated**: 2026-02-14

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Documentation Index](#2-documentation-index)
3. [Tech Stack & Commands](#3-tech-stack--commands)
4. [Architecture & File Map](#4-architecture--file-map)
5. [Game Mechanics Summary](#5-game-mechanics-summary)
6. [AI System Overview](#6-ai-system-overview)
7. [Multiplayer System Overview](#7-multiplayer-system-overview)
8. [Audio System](#8-audio-system)
9. [Visual Systems](#9-visual-systems)
10. [Economy & Balance](#10-economy--balance)
11. [Deployment & Distribution](#11-deployment--distribution)
12. [Testing](#12-testing)
13. [Development Conventions](#13-development-conventions)
14. [Current Status & Known Issues](#14-current-status--known-issues)
15. [Development Timeline](#15-development-timeline)

---

## 1. Project Identity

**Guild Life Adventures** is a fantasy life simulation game inspired by "Jones in the Fast Lane" (Sierra On-Line, 1991). Players compete to achieve victory goals in Wealth, Happiness, Education, and Career while managing time, resources, and life choices in a medieval fantasy setting.

- **Creator**: Tom Husby (Tombonator3000)
- **AI Pair Programmer**: Claude (Anthropic)
- **Repository**: `github.com/Tombonator3000/guild-life-adventures`
- **Live URL**: `https://tombonator3000.github.io/guild-life-adventures/`
- **Also hosted on**: Lovable (web IDE / hosting)
- **Game board**: Medieval fantasy town "Guildholm" with 15 locations in a ring layout
- **Style**: Medieval woodcut whimsical illustrations, parchment/wood UI theme, humor inspired by Monty Python, Discworld, and Hitchhiker's Guide

---

## 2. Documentation Index

All .md files in the project root, and what they contain:

| File | Size | Purpose | When to Read |
|------|------|---------|--------------|
| **MEMORY.md** | — | This file. Master project reference | Always read first |
| **CLAUDE.md** | ~100 lines | Quick reference for AI assistants (tech stack, project structure, key files, commands) | At session start |
| **log.md** | 14,278 lines / 732KB | Complete development history (2026-02-05 through 2026-02-14) | When investigating history of a specific feature or bug |
| **log2.md** | — | Continuation of log.md (new entries from 2026-02-14 onward) | For recent development context |
| **todo.md** | ~1000 lines | Task tracking — completed features by date + backlog | When planning next work |
| **agents.md** | ~320 lines | AI opponent system — personalities, difficulty, decision engine, strategy, file locations | When working on AI behavior |
| **multiplayer.md** | ~536 lines | Online multiplayer — architecture, protocol, security, reconnection, host migration, tests | When working on networking |
| **electron.md** | ~1026 lines | Electron desktop build guide — setup, packaging, itch.io, Steam | When building desktop version |
| **JONES_REFERENCE.md** | 800+ lines | Original "Jones in the Fast Lane" mechanics — goals, jobs, education, economy, items, robbery | When checking game design parity |
| **ITEMS.md** | ~200 lines | Complete item & purchase reference by location — prices, effects, requirements | When adjusting item balance |
| **EventCatalog.md** | ~200 lines | All 103 game events cataloged — weather, festivals, robbery, travel, random, market crashes | When adding/modifying events |
| **AUDIT-2026-02-12.md** | ~400 lines | Full game audit report (106 findings: 4 critical, 13 high, 32 medium, 57 low) | When fixing audit items |
| **README.md** | ~80 lines | Norwegian-language project description for GitHub | Rarely needed |

### Reading Priority for New Sessions

1. **MEMORY.md** (this file) — full project context
2. **todo.md** (backlog section) — what's left to do
3. **log2.md** — most recent work
4. **Specific .md** for the area being worked on (agents.md, multiplayer.md, etc.)

---

## 3. Tech Stack & Commands

| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| State Management | Zustand |
| Styling | Tailwind CSS + shadcn/ui |
| Testing | Vitest + Testing Library |
| Package Manager | Bun |
| Multiplayer | WebRTC P2P via PeerJS |
| Audio | Web Audio API (music, ambient, SFX with synth fallback) |
| PWA | vite-plugin-pwa + Workbox |
| Desktop (planned) | Electron + electron-vite + electron-builder |

### Commands

```bash
bun run dev          # Start development server (web)
bun run build        # Production build (web, GitHub Pages)
bun run build:github # Production build with GitHub Pages base path
bun run test         # Run all tests (185 tests, 9 files)
bun run test:watch   # Watch mode
bun run lint         # Run ESLint
```

### Desktop (Not Yet Implemented — See electron.md)

```bash
bun run dev:electron   # Electron dev with HMR
bun run build:win      # Windows installer
bun run build:linux    # Linux AppImage + deb
bun run build:mac      # macOS dmg
```

---

## 4. Architecture & File Map

### Directory Structure

```
src/
├── assets/              # Game images
│   └── items/           # 50 item images (medieval woodcut JPGs, 512×512)
├── audio/               # Audio system
│   ├── audioManager.ts      # Music player (dual-deck crossfade)
│   ├── ambientManager.ts    # Ambient sound loops
│   ├── sfxManager.ts        # Sound effects (MP3 + synth fallback)
│   ├── synthSFX.ts          # Web Audio API synth SFX
│   ├── musicConfig.ts       # Track→location/screen mappings
│   ├── ambientConfig.ts     # Ambient sound configs
│   └── webAudioBridge.ts    # iOS GainNode volume bridge
├── components/
│   ├── game/                # Game UI (GameBoard, LocationPanel, InfoTabs, etc.)
│   │   ├── GameBoard.tsx        # Main game board (player tokens, zones, weather, AI overlay)
│   │   ├── LocationPanel.tsx    # Location-specific UI (uses factory pattern)
│   │   ├── LocationShell.tsx    # NPC portrait + tab layout wrapper
│   │   ├── CavePanel.tsx        # Dungeon/combat UI
│   │   ├── CombatView.tsx       # Per-encounter combat display
│   │   └── ... (30+ components)
│   ├── screens/             # Full-screen views
│   │   ├── TitleScreen.tsx
│   │   ├── GameSetup.tsx
│   │   ├── OnlineLobby.tsx
│   │   ├── VictoryScreen.tsx
│   │   └── CreditsScreen.tsx
│   └── ui/                  # shadcn/ui base components
├── data/                    # Game data (pure data, no React)
│   ├── jobs.ts              # 37 job definitions, wage logic
│   ├── items.ts             # All items (food, durables, weapons, armor, appliances, clothing)
│   ├── education.ts         # 11 degrees, prerequisites, study sessions
│   ├── locations.ts         # 15 board locations, ring adjacency
│   ├── quests.ts            # 18 quests (E through S rank)
│   ├── bounties.ts          # Bounty board definitions
│   ├── dungeon.ts           # 5 dungeon floors, encounters, bosses
│   ├── combatResolver.ts    # Combat math (encounter resolution, auto-resolve)
│   ├── npcs.ts              # 12+ NPC definitions (name, portrait, greeting)
│   ├── events.ts            # Random events, robbery, market crashes
│   ├── travelEvents.ts      # 10 travel events (10% on 3+ step trips)
│   ├── weather.ts           # 5 weather types, effects, conflicts
│   ├── festivals.ts         # 4 seasonal festivals (12-week cycle)
│   ├── achievements.ts      # 24 achievements, cumulative stats
│   ├── portraits.ts         # 8 player + 4 AI portrait definitions
│   ├── ageMilestones.ts     # Birthday milestones (21, 25, 30, 40, 50, 60+)
│   └── zoneStorage.ts       # Zone editor localStorage persistence
├── hooks/                   # React hooks
│   ├── useGrimwaldAI.ts     # Main AI turn executor (227 lines after refactor)
│   ├── ai/                  # AI subsystem (modular)
│   │   ├── types.ts             # AI types, difficulty settings, personality profiles
│   │   ├── strategy.ts          # Pure strategy functions (dungeon, quest, equipment)
│   │   ├── actionGenerator.ts   # Priority-based action generation + personality weighting
│   │   ├── actionExecutor.ts    # 34 action handlers (handler map pattern)
│   │   ├── playerObserver.ts    # Human strategy observation + counter-strategy
│   │   ├── difficultyAdjuster.ts # Dynamic difficulty based on performance gap
│   │   └── actions/             # Action generators by category
│   │       ├── criticalNeeds.ts
│   │       ├── goalActions.ts
│   │       ├── strategicActions.ts
│   │       ├── economicActions.ts
│   │       ├── questDungeonActions.ts
│   │       └── rivalryActions.ts
│   ├── useAchievements.ts
│   ├── useMusicController.ts
│   ├── usePlayerAnimation.ts
│   ├── useAppUpdate.ts
│   ├── usePWAInstall.ts
│   └── useIsMobile.ts
├── network/                 # Online multiplayer
│   ├── types.ts             # Network message types, action whitelists
│   ├── PeerManager.ts       # WebRTC connection management (heartbeat, reconnection, ICE)
│   ├── NetworkActionProxy.ts # Guest action forwarding
│   ├── networkState.ts      # State serialization/deserialization
│   ├── useNetworkSync.ts    # State sync during gameplay
│   ├── useOnlineGame.ts     # Lobby management, room create/join, host migration
│   └── roomCodes.ts         # 6-char crypto room codes
├── store/                   # Zustand state management
│   ├── gameStore.ts         # Central store (wrapWithNetworkGuard)
│   └── helpers/             # Store action helpers (split from monolith)
│       ├── turnHelpers.ts
│       ├── startTurnHelpers.ts
│       ├── weekEndHelpers.ts    # 16 focused processors (refactored from 530-line function)
│       ├── playerHelpers.ts
│       ├── questHelpers.ts
│       ├── workEducationHelpers.ts
│       └── economy/
│           └── bankingHelpers.ts
├── test/                    # Test files
│   ├── victory.test.ts
│   ├── economy.test.ts
│   ├── work.test.ts
│   ├── education.test.ts
│   ├── gameActions.test.ts
│   ├── freshFood.test.ts
│   ├── age.test.ts
│   ├── multiplayer.test.ts  # 44 multiplayer tests
│   └── equipment.test.ts
├── types/
│   └── game.types.ts        # All TypeScript interfaces and constants
└── lib/
    └── i18n.ts              # Internationalization (EN/DE/ES/NO)

public/
├── music/        # 11 background music tracks (MP3)
├── ambient/      # 16 ambient sound loops (MP3)
├── sfx/          # 36 sound effects (MP3)
├── npcs/         # 12+ NPC portrait images (JPG)
├── portraits/    # Player/AI character portraits (JPG/SVG)
├── locations/    # Location background images
├── events/       # Event illustration woodcuts (35+ images)
├── dungeon/      # Dungeon encounter woodcuts (36 images)
├── textures/     # Weather/festival visual textures
└── pwa-*.png     # PWA icons (9 sizes)
```

### Key Files (Quick Reference)

| What | File |
|------|------|
| Central game state + all actions | `src/store/gameStore.ts` |
| All TypeScript types + constants | `src/types/game.types.ts` |
| Game board + player tokens + weather | `src/components/game/GameBoard.tsx` |
| Location-specific UI panels | `src/components/game/LocationPanel.tsx` |
| AI decision engine (main) | `src/hooks/useGrimwaldAI.ts` |
| AI action generation | `src/hooks/ai/actionGenerator.ts` |
| AI action execution (34 handlers) | `src/hooks/ai/actionExecutor.ts` |
| Combat math | `src/data/combatResolver.ts` |
| Week-end processing (16 processors) | `src/store/helpers/weekEndHelpers.ts` |
| Turn start processing | `src/store/helpers/startTurnHelpers.ts` |
| Network state sync | `src/network/useNetworkSync.ts` |
| Multiplayer lobby | `src/network/useOnlineGame.ts` |

---

## 5. Game Mechanics Summary

### Turn System
- Each turn = 1 week, 60 hours per player
- Movement costs 1 hour per location step (ring layout)
- Weather modifiers: snowstorm/thunderstorm/fog add +1 hour per step
- Starvation penalty: -20 hours if no food at turn start
- Players start each turn at their home (Slums or Noble Heights)
- Free actions allowed at 0 hours (buy items, deposit money)
- Cannot work/study/relax at 0 hours

### Victory Goals (Configurable 10-100 each)
- **Wealth**: (Gold + Savings + Stocks) / 100 = points
- **Happiness**: Accumulated from purchases, education, activities, appliances
- **Education**: Degrees earned × 9 points per degree
- **Career**: Equals Dependability stat (0 if unemployed)
- **Adventure** (optional 5th goal): Dungeon floors cleared + quest completions

### Locations (15 in ring layout)
Noble Heights → Graveyard → General Store → Bank → Forge → Guild Hall → Cave → Academy → Enchanter → Armory → Rusty Tankard → Shadow Market → Fence → Slums → Landlord → (back)

### Housing (2-tier, Jones-style)
- **The Slums**: 75g/week rent, robbery risk
- **Noble Heights**: 120g/week rent, safe from robbery
- Homeless: -5 HP, -8 hours/turn, 3x robbery chance

### Jobs (37 total, 10 career levels)
- Entry ($4-6/hr): Floor Sweeper, Porter, Errand Runner
- Mid ($10-14/hr): Market Vendor, Teacher, City Guard
- Top ($20-25/hr): Sage, Guild Treasurer, Master Artificer
- Requirements: experience, dependability, degrees, clothing tier

### Education (11 degrees, 4 paths)
- **Combat**: Combat Training → Advanced Combat → Master Tactician
- **Academic**: Junior Academy → Scholar Path → Advanced Scholar → Loremaster
- **Commerce**: Junior Academy → Commerce Degree
- **Trade**: Trade Guild Certificate → Arcane Studies

### Clothing (3-tier system, Jones-style)
- Casual (15+): Peasant Garb — entry jobs
- Dress (40+): Common/Fine Clothes — mid jobs
- Business (70+): Noble Attire, Guild Uniform — top jobs
- Degrades -3/week, must maintain tier for current job

### Equipment (Weapons, Armor, Shields)
- Durability system with degradation per dungeon use
- Tempering at Forge (improve stats), repair, salvage
- Progression: dagger → sword → steel sword → enchanted blade

### Dungeon (5 floors, 4 encounters each)
- Encounter types: treasure, healing, trap, combat, boss
- Boss must be defeated to clear floor
- Retreat possible (keep gold, floor not cleared)
- Rare drops: heal, gold bonus, max HP, Dragon Scale Shield, stat bonuses

### Economy
- Weekly priceModifier drift (gradual, ±0.02-0.06/week)
- Economic trends (recession/growth/stable, 3-7 week cycles)
- Stock market (3 stocks + Crown Bonds T-Bills)
- Loans (100-1000g, 10% weekly interest, 8-week repayment, forced collection)
- Market crashes during recession (pay cuts, layoffs)

### Events (103 total — see EventCatalog.md)
- Weather (5 types), Festivals (4 seasonal), Robbery, Theft, Travel events, Random location events, Market crashes, Doctor visits, Appliance breakage, Food spoilage, Weekend activities

---

## 6. AI System Overview

> **Full details**: See `agents.md`

### 4 AI Opponents
| Name | Personality | Focus | Color |
|------|------------|-------|-------|
| Grimwald | Generalist | Career | Pearl |
| Seraphina | Scholar | Education | Violet |
| Thornwick | Merchant | Wealth | Teal |
| Morgath | Warrior | Adventure | Rose |

### 3 Difficulty Levels
- **Easy**: 20% mistake chance, 800ms delay, reactive
- **Medium**: 8% mistakes, 500ms delay, 2-turn planning, counter-strategy
- **Hard**: 2% mistakes, 300ms delay, 3-turn planning, aggressive counter-strategy

### Key AI Features
- Priority-based action system with dynamic scoring
- Personality weight multipliers (education, wealth, combat, social, caution, gambling)
- Player strategy observation + counter-strategy (medium/hard)
- Dynamic difficulty adjustment (rubber-banding based on performance gap)
- 19 action types across 6 action generator modules
- 34 action handler functions in executor
- Failed action tracking (prevents re-attempting within same turn)
- Festival/weather awareness

### AI File Map
- Main: `src/hooks/useGrimwaldAI.ts` (227 lines)
- Types: `src/hooks/ai/types.ts`
- Strategy: `src/hooks/ai/strategy.ts`
- Action gen: `src/hooks/ai/actionGenerator.ts`
- Action exec: `src/hooks/ai/actionExecutor.ts`
- Observer: `src/hooks/ai/playerObserver.ts`
- Difficulty: `src/hooks/ai/difficultyAdjuster.ts`
- Actions: `src/hooks/ai/actions/*.ts` (6 files)

---

## 7. Multiplayer System Overview

> **Full details**: See `multiplayer.md`

### Architecture
- **WebRTC P2P** via PeerJS (host-authoritative)
- 6-char crypto room codes
- Full state sync (50ms debounced broadcast)
- 45+ whitelisted guest actions
- Cross-player validation (deep scan all arg positions)
- Argument bounds validation (max gold/health/etc.)
- Turn locking (guests can only act on their turn)
- Rate limiting (10 actions/sec per peer)

### Key Features
- Host migration (automatic successor election on disconnect)
- Reconnection system (30s grace period)
- Zombie player auto-skip (5s grace)
- 120s turn timeout
- Remote movement animation
- Portrait selection in lobby

### Multiplayer File Map
- All in `src/network/` (7 files, ~2,180 lines)
- 44 multiplayer tests in `src/test/multiplayer.test.ts`

---

## 8. Audio System

### 3 Audio Managers
- **Music**: `src/audio/audioManager.ts` — dual-deck A/B crossfade, 11 tracks
- **Ambient**: `src/audio/ambientManager.ts` — location-based ambient loops, 16 tracks
- **SFX**: `src/audio/sfxManager.ts` — event-triggered effects, 36 MP3s + Web Audio synth fallback

### iOS Compatibility
- Web Audio API GainNode bridge (`webAudioBridge.ts`) for iOS volume control
- Auto-resume AudioContext on user interaction
- All 3 managers route through GainNodes

### Audio Files
- `public/music/` — 11 MP3 tracks (Main Theme, Guild Hall, Slums, Cave, Noble Heights, Weekend, Winner, etc.)
- `public/ambient/` — 16 ambient loops
- `public/sfx/` — 36 sound effects

---

## 9. Visual Systems

### Weather Effects (CSS animations)
- **Snowstorm**: 60 snowflake particles
- **Thunderstorm**: 120 rain particles + lightning flashes + bolts + dark overlay
- **Drought**: Heat shimmer effect
- **Enchanted Fog**: Dense fog layers + magical blue glow
- **Harvest Rain**: 60 light rain particles + water droplets on screen

### Festival Overlays
- AI-generated textures in `public/textures/`
- Each festival has unique visual overlay

### Art Style
- Medieval woodcut whimsical illustrations
- Black ink on aged parchment
- 50 item images in `src/assets/items/` (512×512 JPG)
- 35+ event woodcuts in `public/events/`
- 36 dungeon encounter woodcuts in `public/dungeon/`
- 12+ NPC portraits in `public/npcs/`
- 8 player + 4 AI character portraits

### UI Theme
- Parchment background, wood frame borders
- Brown/dark text on parchment (no dark mode)
- shadcn/ui components with custom medieval styling
- Jones-style menu system with NPC portraits + tabs

---

## 10. Economy & Balance

### Price Reference (See ITEMS.md for complete list)
- Food: 5-85g (ale to feast supplies)
- Clothing: 25-250g (peasant garb to noble attire)
- Weapons: 35-600g (dagger to enchanted blade)
- Armor: 50-500g (leather to enchanted plate)
- Appliances: 75-475g (cooking fire to memory crystal)
- Rent: 75g/week (slums), 120g/week (noble)
- Guild Pass: 500g
- Education: varies by degree

### Job Wage Ranges
- L1 (entry): 4-6g/hr
- L5 (mid): 10-14g/hr
- L10 (top): 20-25g/hr
- Deterministic per-job-per-week wage hash (±10% variance)
- Career level wage floors (higher tier never pays less than lower)

### Key Balance Points
- Starting gold: ~50g
- Starting food: 50 (lasts ~1 week with 35/week drain)
- Quest gold/time ratios: 4.5 g/hr (E-rank) → 16.7 g/hr (S-rank)
- Dungeon: increasing gold rewards per floor, rare drops on boss defeats
- Starvation: -20 hours (1/3 of turn)
- Doctor visit: -10 hours, -4 happiness, -30 to -200g

---

## 11. Deployment & Distribution

### Web (Current)
- **GitHub Pages**: Auto-deploy via GitHub Actions on push to main
  - URL: `https://tombonator3000.github.io/guild-life-adventures/`
  - Uses `DEPLOY_TARGET=github` env var for base path
  - `.nojekyll` file prevents Jekyll processing
- **Lovable**: Also deployable from Lovable web IDE
- **PWA**: Installable progressive web app
  - Service worker: `autoUpdate` + `skipWaiting` + `clientsClaim`
  - HTML NOT precached (always fresh from network)
  - JS/CSS precached for speed
  - Auto-reload on version mismatch
  - 8s fallback timer with "Clear Cache & Reload"

### Desktop (Planned — See electron.md)
- Electron 40 + electron-vite 5 + electron-builder 26
- Target: itch.io (butler CLI) + Steam (future)
- Windows (NSIS + zip), Linux (AppImage + deb), macOS (dmg)
- React app needs ZERO changes for Electron

---

## 12. Testing

### Current: 185 tests across 9 files
```
src/test/
├── victory.test.ts      # Victory condition checks
├── economy.test.ts      # Banking, stocks, loans, economy
├── work.test.ts         # Job system, wages, shifts
├── education.test.ts    # Degrees, study sessions, prerequisites
├── gameActions.test.ts  # General game actions
├── freshFood.test.ts    # Preservation box, frost chest, spoilage (20 tests)
├── age.test.ts          # Age system, milestones, elder decay (19 tests)
├── multiplayer.test.ts  # Network, room codes, state sync (44 tests)
└── equipment.test.ts    # Durability, tempering, salvage
```

### Run Tests
```bash
bun run test           # All tests
bun run test:watch     # Watch mode
```

### What's NOT Tested (requires browser/WebRTC)
- PeerJS connection, WebRTC DataChannel, heartbeat, reconnection, host migration
- Full host-guest action roundtrip
- UI component rendering, animations

---

## 13. Development Conventions

### Code Style
- Zustand actions for ALL state changes (never mutate state directly)
- All game text in English (i18n via `src/lib/i18n.ts` for DE/ES/NO)
- Zone positions as percentages in `ZONE_CONFIGS`
- Appliance break chances: 1/51 (enchanter), 1/36 (market)
- Use `import.meta.env.BASE_URL` for ALL asset paths (GitHub Pages compatibility)

### File Organization
- Store helpers split by domain (turn, weekEnd, player, quest, economy)
- AI split into types/strategy/actionGenerator/actionExecutor/actions
- Network in `src/network/` (7 files)
- Audio in `src/audio/` (7 files)
- Game data in `src/data/` (pure functions, no React)

### Refactoring Patterns Used
- Handler map pattern (AI action executor: 34 handlers)
- Factory pattern (LocationPanel tab generation)
- Pipeline pattern (weekEndHelpers: 16 focused processors)
- Lookup table pattern (personality weights, counter-strategy)
- Dispatcher pattern (combat encounter resolution)

### Logging
- All significant changes logged to `log2.md` (previously `log.md`) with timestamps
- Each log entry: overview, what changed, files changed, test results
- Include code snippets for non-obvious changes

### When Working on Specific Areas
- **AI**: Read `agents.md` first, work in `src/hooks/ai/`
- **Multiplayer**: Read `multiplayer.md` first, work in `src/network/`
- **Balance**: Read `ITEMS.md` + `JONES_REFERENCE.md`, check `src/data/`
- **Events**: Read `EventCatalog.md`, check `src/data/events.ts` + `weather.ts` + `festivals.ts`
- **Desktop**: Read `electron.md`, create `electron/` directory
- **Audit items**: Read `AUDIT-2026-02-12.md` for remaining findings

---

## 14. Current Status & Known Issues

### Project Status (as of 2026-02-14)
- **Playable**: Yes — full single-player and online multiplayer
- **Tests**: 185 passing, 0 failures
- **Build**: Clean TypeScript, no ESLint errors
- **Jones compatibility**: ~91% of original features implemented
- **Art**: Medieval woodcut style across all 50 items, 35+ events, 36 dungeon encounters

### Remaining Backlog (from todo.md)

#### Critical/High Priority
- [ ] Add price validation to all buy functions (buyItem, buyDurable, buyTicket)
- [ ] Fix starvation penalties inconsistency (20hrs at turn-start vs 10hp at week-end)
- [ ] Implement loan default limits (prevent infinite extensions)
- [ ] Quest education requirements reference non-existent paths
- [ ] Make Frost Chest and Arcane Tome actually purchasable

#### Medium Priority
- [ ] AI: Add rent prepayment and appliance repair logic
- [ ] Mobile HUD: Add turn indicator and player color
- [ ] Dead player tokens visual distinction
- [ ] Fix keyboard shortcuts triggering inside modals

#### Low Priority
- [ ] Forge job teaser without actual implementation
- [ ] Player name duplicate/length validation
- [ ] Victory screen leaderboard for multi-player
- [ ] Spectator mode for dead players

#### Missing Jones Features
- [ ] Free actions when time runs out (buy items at 0 hours, can't work/study)
- [ ] Full pawn shop collateral/redemption system with time windows

### Audit Findings Remaining (from AUDIT-2026-02-12.md)
- 106 total findings, many fixed — check audit doc for remaining items
- Top unfixed: dual death paths (H4), AI hardcoded food/clothing bypass (H9/H11), opaque priest education path (H5)

---

## 15. Development Timeline

| Date | Major Milestones |
|------|-----------------|
| 2026-02-05 | Project created. Board system, zones, housing, jobs, education, AI opponent, movement, victory goals, economy, cave/dungeon design, equipment, quests |
| 2026-02-06 | Online multiplayer, PWA, multi-platform deploy, location panels, NPC portraits, audio/music, stock market, loans, weekends, zone editor, mobile layout, 112+ tests |
| 2026-02-07 | Multiplayer security audit, host migration, multi-AI opponents, deep audit (13 bugs), store redesign, career goal fix, 152+ tests |
| 2026-02-08 | Age system, weather events, festivals, iPad PWA, location backgrounds, forge gameplay, Jones pricing audit, thunderstorm/fog effects, 171+ tests |
| 2026-02-09 | Character portraits, achievements, travel events, bounty board, death modal, credits, ambient sounds, dark mode removal, GitHub Pages standalone, SFX system, 171+ tests |
| 2026-02-10 | Electron guide, weather-festival conflicts, gameplay balance batch, multiplayer security, 3 major refactors, AI personality overhaul, 176+ tests |
| 2026-02-11 | Internationalization (DE/ES/NO), AI-generated art (stone borders, weather textures, event woodcuts, item images), AI adaptive systems, festival overlays, humor overhaul, zone editor layout, iPad audio fix, job balance audit |
| 2026-02-12 | Full game audit (106 findings), 20 audit fixes, dungeon woodcuts, clothing 3-tier system, appliance bonuses, forced loans, crash tiers, relaxation, newspaper, equipment durability |
| 2026-02-13 | 2 code refactoring rounds, clothing quality, equipment durability, Jones compatibility audit (91%), food spoilage system, 185 tests |
| 2026-02-14 | PWA infinite loading fix, item image overhaul (50 medieval woodcuts), project documentation overhaul (log2.md + MEMORY.md) |

---

*This document should be updated whenever significant architectural changes are made, new systems are added, or documentation files change.*
