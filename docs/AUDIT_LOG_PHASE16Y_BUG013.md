# Phase 16Y – BUG-013 AI Failure Recovery

Dato: 26. juli 2026

## Omfang

Dette er punkt 4 i `Phase 16Y – Truth, Onboarding & Release Safety` og implementerer issue #391.

Målet er å unngå begge ytterpunktene:

- AI-en skal ikke forsøke nøyaktig samme avviste handling om og om igjen mot uendret tilstand.
- AI-en skal heller ikke huske en gammel feil etter at forutsetningene har endret seg og handlingen kan lykkes.

## Funn før endringen

### Normal AI-flyt hadde bare delvis beskyttelse

Normalflyten lagret en streng som kombinerte handling og et utvalg spillerdata. Dette gjorde at gull-, lokasjons- eller utdanningsendring kunne gi en ny key.

Men dersom alle genererte handlinger ble filtrert bort, brukte koden likevel `actions[0]` som fallback. Dermed kunne den velge akkurat den kjente, avviste handlingen på nytt.

### Skip/fast-flyten gikk utenom cachen

Ved «Skip AI Turn» kjørte AI-en en separat hurtigløkke som alltid forsøkte `fastActions[0]`. Den registrerte ikke failure-key og filtrerte heller ikke tidligere feil. En lokal teller stoppet etter tre feil, men den skilte ikke mellom:

- samme feil mot samme tilstand,
- ulike handlinger,
- en handling som burde blitt gyldig etter en statusendring.

### Action-identiteten var for smal

Den gamle identiteten valgte bare ett kjent felt fra `details` – for eksempel degreeId eller itemId. To handlinger mot samme item, men med ulik mengde eller annen konfigurasjon, kunne derfor kollidere.

### Failure-data var ustrukturert

En `Set<string>` kunne bare svare «har denne nøkkelen vært sett?». Den kunne ikke vise spiller, årsak eller antall forsøk mot samme signatur, og var vanskelig å feilsøke.

## Implementert løsning

### Strukturert failure record

Cachen er nå en `Map` med `AIFailedActionRecord`:

- `playerId`
- full `actionIdentity`
- `stateSignature`
- strukturert `reason`
- `attemptsForSignature`

Dette gjør failure-state forklarbar og isolert per AI-spiller.

### Full stabil action-identitet

Hele `action.details` serialiseres rekursivt med sorterte object keys. Handlinger med samme semantiske innhold får samme identitet uavhengig av key-rekkefølge, mens ulik mengde, target eller konfigurasjon gir egen identitet.

### Dependency-aware state signature

Signaturen dekker spiller-eide forutsetninger som kan avgjøre om en handling lykkes, blant annet:

- lokasjon og tid,
- gull, savings, stocks og lån,
- mat, helse, happiness og clothing,
- jobb, erfaring og dependability,
- bolig og rentestatus,
- grader og studieprogresjon,
- inventory, durables, appliances og utstyr,
- quest-, bounty- og dungeon-status,
- tickets, sickness, hexes og protection.

En handling blokkeres bare mens både action-identitet og denne signaturen er uendret.

### Felles API for normal og rask flyt

Begge løkkene bruker nå:

- `getViableAIActions()` før valg,
- `recordFailedAIAction()` etter en avvist handling.

Den normale løkken faller ikke lenger tilbake til en kjent blokkert handling dersom ingen andre valg finnes; den avslutter trygt. Fast-flyten bruker samme cache og kan derfor ikke spinne på en avvist topprioritetshandling.

### Multi-AI-isolasjon

Cache-keyen inkluderer spiller-ID. To AI-spillere med identisk status og samme ønskede handling deler derfor ikke failure-state.

## Regresjonstester

`src/hooks/ai/failedActionCache.test.ts` dekker:

- stabil full action-identitet,
- blokkering mot helt uendret state,
- retry etter gullendring,
- retry etter movement, tid, education, ownership eller equipment-endring,
- reset av attempt count ved ny state-signatur,
- isolasjon mellom AI-spillere,
- bevaring av eksplisitt end-turn,
- at både normal og fast/skip-kode bruker samme cache-API,
- at gammel fallback til full action-liste ikke kommer tilbake.

## Metadatafunn under arbeidet

Ved versjonsoppdateringen ble det oppdaget at `package.json` hadde riktig prosjektnavn, mens workspace-navnet i `bun.lock` fortsatt var den gamle Lovable-malens `vite_react_shadcn_ts`. Låsefilen regenereres med Bun 1.3.14 og release-policytesten utvides slik at package- og lock-metadata må være samstemt.

## Ikke endret

- Ingen AI-prioriteter eller difficulty-verdier.
- Ingen priser, rewards eller balanse.
- Ingen save- eller nettverksfelt.
- Failure-cachen lever bare i den lokale AI-hooken for gjeldende tur.

## Akseptansekriterier

- [x] Identisk handling og uendret relevant state blokkeres.
- [x] Gullendring tillater nytt forsøk.
- [x] Lokasjon, tid, utdanning og utstyr invaliderer gammel feil.
- [x] AI-spillere deler ikke failure-state.
- [x] Normal og fast/skip-flyt bruker samme mekanisme.
- [x] Kjente avviste handlinger brukes ikke som fallback.
- [ ] TypeScript, full Vitest, build, lint og Playwright er grønne.
