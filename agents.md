# Guild Life Adventures - Agents & AI System

## Overview

This document describes the AI system and agent logic in Guild Life Adventures. The AI opponent "Grimwald" is inspired by "Jones" from the classic Sierra game "Jones in the Fast Lane" (1991).

## AI Opponent: Grimwald

Grimwald is the computer-controlled player that uses strategic decision-making to compete against human players. Unlike simple reactive AI, Grimwald uses goal-oriented planning to pursue victory.

### Difficulty Levels

Grimwald has three difficulty levels, each with different behavior characteristics:

| Difficulty | Name | Description |
|------------|------|-------------|
| Easy | Novice Grimwald | 20% mistake chance, slower reactions, reactive decisions |
| Medium | Cunning Grimwald | 8% mistake chance, strategic planning (2 turns ahead) |
| Hard | Master Grimwald | 2% mistake chance, highly efficient, plans 3 turns ahead |

### Difficulty Settings

```typescript
interface DifficultySettings {
  aggressiveness: number;    // How hard AI pushes toward goals (0-1)
  planningDepth: number;     // How many turns ahead AI considers (1-3)
  mistakeChance: number;     // Chance of suboptimal decision (0-1)
  efficiencyWeight: number;  // How much AI values time optimization (0-1)
  decisionDelay: number;     // MS between AI actions (visual pacing)
}
```

### AI Decision Engine

The AI uses a priority-based action system with dynamic scoring based on:

1. **Goal Progress Analysis** - Identifies weakest goal and prioritizes actions toward it
2. **Resource Urgency** - Calculates critical needs (food, rent, clothing, health)
3. **Strategic Planning** - Considers education paths, job upgrades, banking strategy

### Priority Categories

#### Critical Needs (Priority 85-100)
Actions that prevent game-ending states:
- **Food** (priority 95-100): Prevent starvation (-20 hours penalty)
- **Rent** (priority 85-90): Prevent eviction
- **Clothing** (priority 70-75): Maintain job requirements

#### Goal-Oriented Actions (Priority 60-85)
Strategic actions based on weakest goal:
- **Education Focus**: Study degrees that unlock better jobs
- **Wealth Focus**: Work shifts, deposit to bank, avoid robbery
- **Happiness Focus**: Buy appliances, rest at home
- **Career Focus**: Apply for better jobs, build dependability

#### General Strategic Actions (Priority 45-70)
- Get first job if unemployed
- Upgrade jobs when better offers available
- Banking strategy (deposit excess gold to avoid robbery)
- Housing upgrade consideration

### Goal Progress Tracking

```typescript
interface GoalProgress {
  wealth: { current: number; target: number; progress: number };
  happiness: { current: number; target: number; progress: number };
  education: { current: number; target: number; progress: number };
  career: { current: number; target: number; progress: number };
  overall: number; // Average progress toward all goals
}
```

### Resource Urgency Calculation

The AI constantly monitors resource levels:

| Resource | Critical (1.0) | Concerning (0.5-0.6) | Normal (0.1) |
|----------|----------------|----------------------|--------------|
| Food | < 25 | < 50 | >= 50 |
| Rent | 3+ weeks overdue | 2 weeks overdue | < 2 weeks |
| Clothing | < 25 | < 50 | >= 50 |
| Health | < 30 | < 50 | >= 50 |

### Strategic Behaviors

#### Education Strategy
- Prioritizes degrees that unlock high-paying jobs
- Considers prerequisite chains
- Values education points for goal progress

#### Career Strategy
- Starts with any available job
- Upgrades when 20%+ better wage available
- Builds dependability through consistent work

#### Banking Strategy
- Deposits excess gold (> 200-300g buffer) to avoid robbery
- Withdraws when cash falls below 50g
- Strategic AI keeps larger buffer in high-value situations

#### Housing Strategy
- Considers upgrading from Slums when:
  - Has valuable appliances/durables (robbery risk)
  - Has sufficient gold (> 300g)
  - Aggressiveness setting permits

### Action Execution

The AI executes actions with delays for visual feedback:
- Easy: 800ms between actions
- Medium: 500ms between actions
- Hard: 300ms between actions

Safety limits prevent infinite loops (max 15 actions per turn).

## File Locations

| File | Purpose |
|------|---------|
| `src/hooks/useGrimwaldAI.ts` | Main AI decision engine |
| `src/hooks/useAI.ts` | Legacy simple AI (deprecated) |
| `src/store/gameStore.ts` | Game state and actions |
| `src/types/game.types.ts` | TypeScript types including AIDifficulty |
| `src/components/game/GameBoard.tsx` | AI turn integration |

## Player Attributes Used by AI

| Attribute | AI Usage |
|-----------|----------|
| `gold` | Banking decisions, purchase ability |
| `savings` | Withdrawal decisions, total wealth |
| `health` | Rest decisions, death avoidance |
| `happiness` | Appliance purchases, goal tracking |
| `foodLevel` | Food purchase urgency |
| `clothingCondition` | Clothing purchase decisions |
| `dependability` | Job qualification, career goal |
| `experience` | Job qualification tracking |
| `currentJob` | Work decisions, upgrade checks |
| `completedDegrees` | Education progress, job unlocks |
| `housing` | Robbery risk assessment |
| `weeksSinceRent` | Rent payment urgency |

## Configuration

The AI opponent is configured at game start:
1. Select "Include Grimwald (AI Opponent)" in Game Setup
2. Choose difficulty level (Easy/Medium/Hard)
3. AI uses Pearl color (#E5E5E5)
4. Name: "Grimwald"

## Visual Feedback

During Grimwald's turn, players see:
- "Grimwald is Scheming..." overlay with animated icons
- Difficulty-specific flavor text
- Toast notifications for AI actions
- Console logs for debugging (in development)

## References

Based on Jones AI from "Jones in the Fast Lane" (Sierra, 1991):
- [Jones in the Fast Lane Wiki](https://jonesinthefastlane.fandom.com/wiki/Jones)
- [MobyGames Entry](https://www.mobygames.com/game/370/jones-in-the-fast-lane/)
- [Hardcore Gaming 101](http://www.hardcoregaming101.net/jones-in-the-fast-lane/)

## Future Improvements

- [x] Goal-oriented decision making
- [x] Difficulty levels
- [x] Strategic planning (education/career paths)
- [x] Resource management
- [x] Banking strategy
- [ ] Personality variants (aggressive, defensive, balanced)
- [ ] Learning from player strategies
- [ ] Multiplayer AI support (multiple Grimwalds)
- [ ] Difficulty auto-adjustment based on player performance
