
# Plan: Komplett Jones in the Fast Lane-funksjonalitet

## Status: ✅ IMPLEMENTERT

Alle manglende funksjoner fra det originale Jones in the Fast Lane-spillet er nå implementert med fantasy-tematikk.

## Implementerte funksjoner

### ✅ 1. Quest-system (Guild Hall)
- Quest-datastruktur med 18 quests rangert E til S
- QuestPanel-komponent for å ta og fullføre quests
- Guild rank progression basert på fullførte quests
- Krav til utdanning og utstyr for noen quests

### ✅ 2. Newspaper (The Guildholm Herald)
- Avis-generator med økonomi, jobb, quest og gossip-artikler
- Kjøpes på General Store eller Shadow Market (rabattert)
- NewspaperModal-komponent

### ✅ 3. Pawn Shop (The Fence) - Forbedret
- PawnShopPanel-komponent
- Selge items fra inventory
- Kjøpe brukte items til rabattert pris
- Forbedret gambling med tre nivåer

### ✅ 4. Healer's Sanctuary
- HealerPanel-komponent ved Enchanter's Workshop
- Minor, Moderate og Full healing
- Cure sickness
- Health blessing (øker max HP)

### ✅ 5. Husleie-konsekvenser
- Etter 4 uker: Varsel i Landlord-panelet
- Etter 8 uker: Automatisk eviction
- Mister alle items ved eviction
- Event-varsler ved processWeekEnd

### ✅ 6. Døds-mekanikk
- checkDeath()-funksjon
- Resurrection hvis man har 100g i savings
- Flyttes til Healer's ved resurrection

### ✅ 7. AI-logikk for Grimwald
- useAI hook med beslutningslogikk
- Prioriterer: mat, husleie, jobb, quests, studier, hvile

### ✅ 8. Event Display System
- EventModal-komponent
- Viser ukentlige hendelser ved ukestart
- Shadowfingers-tyveri, sykdom, eviction-varsler

## Nye filer
- src/data/quests.ts
- src/data/newspaper.ts
- src/hooks/useAI.ts
- src/components/game/QuestPanel.tsx
- src/components/game/EventModal.tsx
- src/components/game/NewspaperModal.tsx
- src/components/game/HealerPanel.tsx
- src/components/game/PawnShopPanel.tsx

## Oppdaterte filer
- src/types/game.types.ts (Player utvidet med activeQuest, hasNewspaper, isSick)
- src/store/gameStore.ts (nye actions og forbedret processWeekEnd)
- src/components/game/LocationPanel.tsx (integrert alle nye systemer)
- src/components/game/GameBoard.tsx (EventModal integrert)

## Fantasy-navneoversettelser
| Original | Guild Life |
|----------|------------|
| Wild Willy | Shadowfingers |
| Employment Office | Guild Hall |
| Newspaper | The Guildholm Herald |
| Jones | Grimwald |
| Hospital | Healer's Sanctuary |
| Diploma | Guild Certificate |
| Welfare Office | Temple of Charity |

