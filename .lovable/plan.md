
# Plan: Guild Life - Jones in the Fast Lane Implementation

## Status: ✅ FULLY IMPLEMENTED

All missing features from the original Jones in the Fast Lane have been implemented with fantasy theming.

## Implemented Features

### ✅ 1. Quest System (Guild Hall)
- 18 quests ranked E to S with increasing difficulty/rewards
- QuestPanel component for accepting and completing quests
- Guild rank progression based on completed quests
- Education and equipment requirements for some quests

### ✅ 2. Newspaper (The Guildholm Herald)
- Weekly newspaper generator with economy, jobs, quests, and gossip articles
- Available at General Store or Shadow Market (discounted)
- NewspaperModal component

### ✅ 3. Pawn Shop (The Fence) - Enhanced
- PawnShopPanel component
- Sell items from inventory at 50% value
- Buy used items at discounted prices
- Three-tier gambling system

### ✅ 4. Healer's Sanctuary
- HealerPanel component at Enchanter's Workshop
- Minor, Moderate, and Full healing options
- Cure sickness
- Health blessing (increases max HP)

### ✅ 5. Rent Consequences
- Warning after 4 weeks overdue
- Automatic eviction after 8 weeks
- Lose all items on eviction
- Event warnings in processWeekEnd

### ✅ 6. Death Mechanic
- checkDeath() function
- Resurrection if player has 100g in savings
- Moved to Healer's Sanctuary on resurrection

### ✅ 7. AI Logic (Grimwald)
- useAI hook with decision logic
- Prioritizes: food, rent, job, quests, education, rest

### ✅ 8. Event Display System
- EventModal component
- Shows weekly events at week start
- Shadowfingers theft, sickness, eviction warnings

### ✅ 9. Advanced Job System (NEW!)
- **Dependability Stat**: 0-100%, decays 5% weekly, increases with work
- **Job Hiring**: Must get hired at Guild Hall (takes time, sets wage)
- **Work Bonus**: 6+ hour shifts pay 33% bonus (8h worth for 6h work)
- **Wage Garnishment**: 50% + 2g deducted from earnings if rent overdue (4+ weeks)
- **Request Raise**: Can request 15% raise based on dependability (30-80% success chance)
- **Job Loss**: Fired if dependability drops below 20%

### ✅ 10. Enhanced Robbery Events (NEW!)
- Bank Heist: 20% chance when leaving bank with 200+ gold
- Shadow Market Ambush: 25% chance with 150+ gold
- Pickpocket events at shady locations

### ✅ 11. Rent Debt System (NEW!)
- Accumulates 25% of rent weekly when overdue
- Garnishment pays down debt before player receives earnings

## New Files
- src/data/quests.ts
- src/data/newspaper.ts
- src/hooks/useAI.ts
- src/components/game/QuestPanel.tsx
- src/components/game/EventModal.tsx
- src/components/game/NewspaperModal.tsx
- src/components/game/HealerPanel.tsx
- src/components/game/PawnShopPanel.tsx

## Updated Files
- src/types/game.types.ts (Player extended with currentWage, dependability, experience, rentDebt)
- src/store/gameStore.ts (requestRaise, improved workShift with bonus/garnishment, processWeekEnd with dependability)
- src/components/game/LocationPanel.tsx (job system, raise button)
- src/components/game/ResourcePanel.tsx (dependability & wage display)
- src/components/game/GameBoard.tsx (EventModal integration)
- src/data/events.ts (bank/shadow market robbery events)

## Fantasy Name Translations
| Original | Guild Life |
|----------|------------|
| Wild Willy | Shadowfingers |
| Employment Office | Guild Hall |
| Newspaper | The Guildholm Herald |
| Jones | Grimwald |
| Hospital | Healer's Sanctuary |
| Diploma | Guild Certificate |
| Welfare Office | Temple of Charity |

