

# Festival Grafikk og Animasjoner

Legge til visuell grafikk og animasjoner for de 4 sesongfestivalene, etter same monster som WeatherOverlay. Hvert festival far unike AI-genererte teksturer og CSS-animasjoner som vises over spillbrettet nar festivalen er aktiv.

## De 4 festivalene og deres visuelle konsept

### 1. Harvest Festival (Hostfestival)
- **AI-teksturer**: Fallende hveteaks og eplblader, gylden kornkrans-border
- **Animasjoner**: Sakte fallende kornaks-partikler, varm gylden glod-overlay, "abundance shimmer"
- **Fargepalett**: Gull, rav, varm oransje

### 2. Winter Solstice (Vintersolverv)
- **AI-teksturer**: Iskrystaller, frostrammer, nordlys-bands
- **Animasjoner**: Glittrende frost-partikler som faller sakte, nordlys-lignende fargebolgerer oppe, blatt/lilla skimmer
- **Fargepalett**: Isblatt, lilla, solv

### 3. Spring Tournament (Varturnering)
- **AI-teksturer**: Turnerings-bannere/flagg, sverd-kryss-emblem, konfetti
- **Animasjoner**: Vaiende bannere pa sidene, fallende konfetti-partikler, glimt-effekter
- **Fargepalett**: Rod, gull, solvhvit

### 4. Midsummer Fair (Midtsommerfest)
- **AI-teksturer**: Festlige lanterner, fargerike band/streamers, blomsterkranser
- **Animasjoner**: Svevende lanterner som stiger opp, fargerike streamers, varm festlig glod
- **Fargepalett**: Varme farger, gront, gult, rodt

## Teknisk implementering

### Nye filer
- `src/components/game/FestivalOverlay.tsx` — Ny komponent etter WeatherOverlay-monstre
- 8 AI-genererte PNG-teksturer i `src/assets/`:
  - `harvest-grain.png`, `harvest-glow.png`
  - `solstice-frost.png`, `solstice-aurora.png`
  - `tourney-banner.png`, `tourney-confetti.png`
  - `fair-lantern.png`, `fair-streamers.png`

### Endringer i eksisterende filer
- **`GameBoard.tsx`**: Importere `FestivalOverlay` og rendre den ved siden av `WeatherOverlay`, med `activeFestival` fra store
- **`log.md`**: Dokumentere endringene

### FestivalOverlay-arkitektur
- Tar `activeFestival: FestivalId | null` som prop
- Returnerer `null` nar ingen festival er aktiv
- Bruker `pointer-events: none` og `z-index: 34` (under weather pa 35)
- Hver festival har sin egen sub-komponent (HarvestLayer, SolsticeLayer, TourneyLayer, FairLayer)
- CSS `@keyframes`-animasjoner for partikler og overlays
- AI-genererte PNG-teksturer som bakgrunnsbilder med blend modes

### Animasjonsdetaljer per festival

**Harvest**: Fallende kornaks (15-20 partikler, slow fall 8-12s), gylden overlay med `screen` blend, pulserende varmt lys
**Solstice**: Frostpartikler (glitter, 25 stk), nordlys-gradient som oscillerer horisontalt, blatt skimmer
**Tourney**: Konfetti-partikler (30 stk, multi-farge, rotasjon), banner-lignende elementer pa sidene med svaie-animasjon
**Fair**: Lanterner som stiger opp (10-15 stk, slow rise 10-15s), streamer-overlay, varm festglod

