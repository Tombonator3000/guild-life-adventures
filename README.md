# Guild Life Adventures

Et fantasy-livssimuleringsspill inspirert av det klassiske "Jones in the Fast Lane".

## Om spillet

Guild Life Adventures er et turbasert strategispill hvor du navigerer livet som eventyrer i fantasy-byen Guildholm. Balanser arbeid, utdanning, quests og personlige behov mens du streber etter suksess.

### Spillfunksjoner

- **Quest System** - Ta pa deg oppdrag rangert fra E til S med okende belonninger
- **Jobb & Karriere** - Sok jobber, jobb skift, be om lonnsforhoyelse
- **Utdanning** - Fire veier: Fighter, Mage, Priest, Business
- **Housing** - Fra hjemlos til Noble Heights
- **AI-motstander** - Konkurrer mot Grimwald
- **Dynamisk okonomi** - Prissvingninger, investeringer, bank

### Lokasjoner i Guildholm

| Lokasjon | Funksjon |
|----------|----------|
| Guild Hall | Jobber, quests, guild-rang |
| Academy | Utdanning |
| Bank | Sparing, investeringer |
| General Store | Mat, klrer, avis |
| The Fence | Kjop/salg brukte varer, gambling |
| Healer's Sanctuary | Helbredelse |
| Noble Heights | Luksusbolig |
| The Slums | Rimelig bolig |

## Kom i gang

```bash
# Installer avhengigheter
npm install

# Start utviklingsserver
npm run dev

# Bygg for produksjon
npm run build

# Kjor tester
npm test
```

## Teknologi

- **React 18** - UI-bibliotek
- **TypeScript** - Typesikkerhet
- **Vite** - Byggverkty
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI-komponenter

## Dokumentasjon

- [agents.md](./agents.md) - AI-system og agentlogikk
- [todo.md](./todo.md) - Prosjektoppgaver og backlog
- [log.md](./log.md) - Utviklingslogg
- [.lovable/plan.md](./.lovable/plan.md) - Implementasjonsplan

## Spillmekanikker

### Tid
- 168 timer per uke
- Handlinger koster tid
- Uke slutter nar alle spillere har brukt opp tiden

### Ressurser
- **Gull** - Hovedvaluta
- **Helse** - 0 = dod (kan gjenopplives)
- **Lykke** - Paviker spillopplevelsen
- **Mat** - Synker ukentlig, sult skader helse
- **Klr** - Degraderes over tid

### Mal
Velg dine mal ved spillstart:
- Rikdom (gull + sparing + investeringer)
- Lykke (prosent)
- Utdanning (antall nivaer)
- Karriere (guild-rang)

## Lisens

MIT
