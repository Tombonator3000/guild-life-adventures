# Guild Life Adventures - Agents & AI System

## Overview

This document describes the AI system and agent logic in Guild Life Adventures.

## AI Opponent: Grimwald

Grimwald is the computer-controlled player that uses strategic decision-making to compete against human players.

### Priority List (useAI Hook)

The AI follows this priority list:

1. **Food** - If `foodLevel < 25`, go to General Store
2. **Rent** - If `weeksSinceRent >= 3` and can afford, pay rent
3. **Job** - If no job, apply at Guild Hall
4. **Work** - If has job, work a shift
5. **Quest** - If has active quest, complete it
6. **Education** - If can afford and has time, study
7. **Rest** - If health < 50, visit Healer

### Decision Logic

```typescript
// Pseudocode for AI decisions
if (player.foodLevel < 25) {
  return goTo('general-store', buyFood);
}
if (needsRent && canAffordRent) {
  return goTo('landlord', payRent);
}
if (!hasJob) {
  return goTo('guild-hall', applyForJob);
}
// ... etc
```

## File Locations

- **AI Hook**: `src/hooks/useAI.ts`
- **Game Store**: `src/store/gameStore.ts`
- **Player Types**: `src/types/game.types.ts`

## Player Attributes Used by AI

| Attribute | Description |
|-----------|-------------|
| `gold` | Available gold |
| `health` | Current health (0-100) |
| `happiness` | Happiness level (0-100) |
| `foodLevel` | Food level (0-100) |
| `dependability` | Job dependability (0-100) |
| `currentJob` | Active job ID |
| `activeQuest` | Active quest ID |

## Configuration

The AI opponent is activated at game start:
- Select "Include AI Opponent" in Game Setup
- AI has the color "Pearl" (#E5E5E5)
- Name: "Grimwald"

## Future Improvements

- [ ] More advanced decision tree
- [ ] Difficulty levels
- [ ] Learn from player strategies
- [ ] Multiplayer AI support
