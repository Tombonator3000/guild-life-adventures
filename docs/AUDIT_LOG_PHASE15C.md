# Fase 15C – splittede location-tab-fabrikker

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase15c-split-location-tabs` og PR #350 ble opprettet fra fase 15B-merge `8801265a80e517e00acdf6446c52b5929fe0e1a0`.

## Mål

- Dele den tidligere rundt 860 linjer lange `locationTabs.tsx` etter domene.
- Erstatte legacy-interfacet og overgangscasten med den faktiske smale context-kontrakten.
- Beholde alle lokasjoner, tabs, hex-lås, work footer og reputation-injeksjon funksjonelt uendret.

## Utført

- Opprettet `locationTabContext.ts` med den faktiske reaktive context-kontrakten og fabrikktypene.
- Context inneholder bare data og semantiske services som tab-implementasjonene faktisk leser.
- Flyttet Guild Hall, Tavern, Forge, Academy, Bank, General Store, Armory, Enchanter og Landlord til `locationTabFactories/coreTabs.tsx`.
- Flyttet Shadow Market, Fence, Graveyard og Cave til `locationTabFactories/marketAdventureTabs.tsx`.
- Erstattet `locationTabs.tsx` med en liten orchestrator som håndterer work footer, hex-/ruin-lås, fabrikkoppslag, standardtab og reputation-tab.
- Beholdt alle eksisterende location-ID-er og tab-ID-er i de nye fabrikkregistrene.
- Forenklet tidligere dynamiske import-callbacker for sabotage, protection, tip-off og reputation til direkte autoritative `useGameStore.getState()`-kall med samme resultatbehandling.
- Fjernet `DeadLocationTabContextField`, `ActiveLocationTabContext` og overgangscasten fra `LocationPanel`.
- `LocationPanel` bygger nå `LocationTabContext` direkte og TypeScript kontrollerer hele kontrakten.
- Utvidet kildekodeinvariantene til å lese orchestrator, context og begge fabrikkmodulene.
- Testene håndhever at orchestratoren er under 190 linjer, at fabrikkmodulene inneholder forventede lokasjoner, og at legacy-feltene ikke finnes i noen av de splittede modulene.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til.

## Tester

GitHub Actions-run `30097507943`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert oppdaterte selector-/modulgrenseinvarianter: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- Den monolittiske tab-filen er erstattet av en liten policy-orchestrator og to fokuserte domenefabrikker.
- Context-kontrakten er nå faktisk, smal og fullstendig TypeScript-kontrollert uten cast.
- `LocationPanel` og location-tab-systemet er lettere å vedlikeholde og kan videreoptimaliseres per domene.
- Neste prioritet er å dele `GameBoard` sin overlay-/layout-/controllerlogikk i mindre komponenter og hooks uten funksjonsendring.
