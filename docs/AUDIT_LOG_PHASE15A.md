# Fase 15A – LocationPanel-selectors

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase15a-location-selectors` og PR #348 ble opprettet fra fase 14E-merge `fc9b4aa5d6054933d991dbcf628f85ac33275ba0`.

## Mål

- Fjerne `LocationPanel` sitt whole-store-abonnement uten å endre funksjon eller brukerflyt.
- Låse endringen med en kildekodeinvariant, slik at komponenten ikke senere går tilbake til `useGameStore()` uten selector.

## Funn

- `LocationPanel` brukte tidligere `const store = useGameStore();` og abonnerte dermed på hele Zustand-storen.
- Panelet ble derfor rerendret ved irrelevante endringer i blant annet tutorial, nettverk, overlays og AI-state, selv når de åpne lokasjonstabene ikke brukte disse verdiene.
- Komponenten trenger fremdeles et stort sett med data og actionreferanser fordi den bygger `LocationTabContext`, men dette settet kan avgrenses eksplisitt.

## Utført

- Importerte `useShallow` fra `zustand/react/shallow`.
- Erstattet whole-store-abonnementet med én eksplisitt shallow selector som bare velger data og actionreferanser komponenten faktisk bruker.
- Valgte data dekker vær/reisekostnad, spillere, økonomi, uke/avis, aksjekurser og location hexes.
- Valgte actions dekker reise, lokasjonslukking/turslutt, avis, arbeid/utdanning, quests, jobb, equipment/appliance-services og øvrige callbacker som fortsatt inngår i `LocationTabContext`.
- Ingen panelregler, priser, state-mutasjoner, tabs, reiseberegning eller visuell rendering ble endret.
- Lagt til tre kildekodeinvarianter som bekrefter `useShallow`, fravær av `useGameStore()` uten selector og tilstedeværelse av nødvendige data-/servicefelt.
- Første testversjon brukte `import.meta.url` for å finne kildefilen og feilet i GitHub-run `30095968370`, mens TypeScript var grønn. Teststien ble gjort stabil med `resolve(process.cwd(), 'src/components/game/LocationPanel.tsx')`.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til.

## Tester

Endelig GitHub Actions-run `30096156626`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert tre nye selector-invarianter: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- `LocationPanel` rerendres ikke lenger ved store-endringer utenfor det eksplisitte dependency-settet.
- Funksjon og panelinnhold er uendret.
- Neste fase er å kartlegge og fjerne døde felt i `LocationTabContext`, slik at selector-settet kan reduseres ytterligere og gamle rå callback-props kan ryddes bort.
