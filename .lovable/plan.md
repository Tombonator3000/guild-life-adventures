
# Plan: Komplett Jones in the Fast Lane-funksjonalitet

Jeg vil implementere alle manglende funksjoner fra det originale Jones in the Fast Lane-spillet, oversatt til fantasy-tematikk.

## Oversikt over nye funksjoner

### 1. Quest-system (Guild Hall)
Spillere kan ta oppdrag rangert fra E til S, med økende vanskelighetsgrad og belønninger. Fullførte quests gir guild rank progression.

**Quest-rangeringer:**
- E-Rank: Enkle oppdrag (Rat Extermination, Package Delivery)
- D-Rank: Grunnleggende oppdrag (Escort Merchant, Guard Duty)
- C-Rank: Moderate oppdrag (Bandit Hunt, Lost Artifact)
- B-Rank: Vanskelige oppdrag (Monster Slaying, Dungeon Dive)
- A-Rank: Elite oppdrag (Dragon Investigation, Demon Cult)
- S-Rank: Legendary oppdrag (Deep Dungeon Clear)

### 2. Newspaper (The Guildholm Herald)
Kjøpes på Shadow Market eller General Store. Gir info om:
- Pris-endringer denne uken
- Tilgjengelige jobber
- Quest-rykter
- Tilfeldige nyheter

### 3. Pawn Shop (The Fence) - Forbedret
- Selge items fra inventory
- Kjøpe brukte items til rabattert pris
- Eksisterende gambling beholdes

### 4. Sykdom og Healers Temple
Ny lokasjon eller handling ved Enchanter's Workshop:
- Betale for healing
- Kurere sykdommer
- Helse-buff

### 5. Husleie-konsekvenser
- Etter 4 uker uten betaling: Varsel
- Etter 8 uker: Kastes ut (blir homeless)
- Mister items i inventaret

### 6. Døds-mekanikk
- Ved 0 helse: Game Over
- Mulighet for "resurrection" hvis man har spart penger

### 7. AI-logikk for Grimwald
Enkel beslutningslogikk:
- Prioriter matbehov ved lav mat
- Jobb når lav på penger
- Studer når råd til det
- Ta quests for guild rank

### 8. Event Display System
- Vise ukentlige hendelser
- Vise Shadowfingers-tyveri
- Vise sykdom/ulykker

## Teknisk implementering

### Nye filer

**src/data/quests.ts**
```text
- Quest-datastruktur med id, navn, rank, belønninger
- 15-20 forskjellige quests
- Funksjon for å filtrere quests basert på guild rank
- Krav til utdanning/utstyr for noen quests
```

**src/data/newspaper.ts**
```text
- Nyhetsartikkel-generator
- Jobblisteformat
- Prisrapport
```

**src/hooks/useAI.ts**
```text
- AI-beslutningslogikk for Grimwald
- Prioritering av handlinger
- Automatisk tur-utførelse
```

### Endringer i eksisterende filer

**src/store/gameStore.ts**
- Legg til `takeQuest`, `completeQuest`, `abandonQuest`
- Legg til `promoteGuildRank` basert på completedQuests
- Legg til `evictPlayer` for husleie-konsekvenser
- Legg til `checkDeath` for helse = 0
- Legg til `activeQuest` på Player-typen
- Forbedre `processWeekEnd` med eviction-sjekk

**src/types/game.types.ts**
- Utvid Player med `activeQuest`, `newspaper`
- Legg til Quest-relaterte typer

**src/components/game/LocationPanel.tsx**
- Utvid Guild Hall med quest-liste og quest-taking
- Utvid The Fence med pawn/sell-funksjon
- Legg til Healer-handlinger
- Legg til avis-kjøp

**src/data/items.ts**
- Legg til "Guildholm Herald" (newspaper)
- Legg til healing items

### UI-forbedringer

**src/components/game/QuestPanel.tsx** (ny)
- Vise tilgjengelige quests
- Quest-detaljer med krav
- Accept/Complete-knapper

**src/components/game/EventModal.tsx** (ny)
- Vise ukentlige hendelser
- Shadowfingers-angrep
- Sykdoms-varsler

**src/components/game/NewspaperModal.tsx** (ny)
- Vise ukens nyheter
- Pris-informasjon
- Jobb-oversikt

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

## Prioritert rekkefølge

1. Quest-system (kjernefunksjonalitet)
2. Event display system (feedback til spiller)
3. Husleie-konsekvenser (game stakes)
4. Døds-mekanikk (game over)
5. Pawn shop forbedringer
6. Newspaper
7. AI-logikk
8. Healer/sykdom

## Estimert omfang

- **Nye filer**: 5-6 filer
- **Endrede filer**: 6-8 filer
- **Totalt**: Ca. 800-1000 linjer ny kode
