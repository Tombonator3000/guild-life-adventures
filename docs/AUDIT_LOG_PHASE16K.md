# Fase 16K – delte høyrepanel-props

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16k-right-panel-props` ble opprettet fra fase 16J-merge `73316038ecf7f9ea29abe86aa3dc88e1c29719b4`.

## Mål

- Fjerne gjentakelsen mellom desktop- og mobilvarianten av `RightSideTabs`.
- Beholde felles spiller-, mål- og AI-data identiske på begge flater.
- Beholde egne callbacks der desktop og mobil faktisk oppfører seg forskjellig.

## Utført

- Delte `RightSideTabs`-props i `SharedRightSideProps`, `RightSideActions` og `DesktopRightSideActions` basert på komponentens native `ComponentProps`.
- `GameBoard` sender nå spillerliste, aktiv spiller, mål, debug-status, AI-status, hastighet og skip-handling én gang via `sharedRightSideProps`.
- Desktop beholder egne handlinger for spillmeny, debug, Zone Editor og fullboard-modus.
- Mobil beholder egne meny- og Zone Editor-handlinger som lukker høyreskuffen før neste lag åpnes.
- `GameBoardSidePanels` kombinerer de delte propsene med riktig variant-actions ved rendering.
- Fjernet de parallelle komplette objektene `desktopRightProps` og `mobileRightProps`.
- Utvidet strukturtestene med native prop-typer, eksplisitt prop-sammensetting og fravær av de gamle dupliserte objektene.
- Strammet størrelsesgrensen for `GameBoard` fra 435 til 425 linjer.
- Ingen spillerdata, AI-kontroll, debug-funksjon, mobil skuffeflyt eller fullboard-adferd ble endret.

## Tester

GitHub Actions-run `30106465218`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert GameBoard-strukturinvariantene: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- Felles `RightSideTabs`-data finnes nå bare ett sted i `GameBoard`.
- Forskjellen mellom desktop- og mobilhandlinger er tydelig og typekontrollert.
- Neste fase bør vurdere om de store `GameBoardAuxiliaryLayer`-propobjektene kan få samme behandling, men bare der callback-adferden faktisk er felles.
