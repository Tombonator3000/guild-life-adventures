# Fase 16A – GameBoard auxiliary layer

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16a-gameboard-overlays` og PR #351 ble opprettet fra fase 15C-merge `e95a971fc354130a9937377f82d5d7e3bdeced7e`.

## Mål

- Starte oppdelingen av den monolittiske `GameBoard`-komponenten uten å endre kartmotor, turkontroll, AI eller nettverk.
- Flytte root-level overlays, modaler og auxiliary UI ut av hovedkomponenten.

## Utført

- Opprettet `GameBoardAuxiliaryLayer.tsx`.
- Flyttet renderingansvaret for Zone Editor, `GameBoardOverlays`, save/load, Death Modal, Player Info Modal, PWA update banner, chat, contextual tips, spectator overlay og fullboard dropdown-meny til auxiliary-laget.
- Auxiliary-laget bruker `ComponentProps<typeof Component>` for de eksisterende komponentene i stedet for å innføre parallelle prop-/eventmodeller.
- Nullable komponentgrupper sendes som native prop-objekter eller `null`, slik at visningsbetingelsene fortsatt eies av `GameBoard` mens rendering er delegert.
- Fjernet de ti direkte komponentimportene fra `GameBoard` og erstattet den lange root-blokken med ett `GameBoardAuxiliaryLayer`-kall.
- Beholdt Zone Editor-konfigurasjon, online overlay-data, save/load-state, death/player-info-state, chat-identitet, spectator-state og fullboard-menu-callbacker uendret.
- Beholdt board-map, location zones, movement animation, center panel, curse/event-prioritering, sidepaneler og mobile drawers i `GameBoard`.
- Lagt til tre kildekodeinvarianter som håndhever delegation, native `ComponentProps` og størrelsesgrenser for både hovedkomponenten og auxiliary-laget.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til.

## Tester

GitHub Actions-run `30098135620`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert tre nye GameBoard-strukturinvarianter: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med save/load og ukeovergang: bestått.

## Resultat

- `GameBoard` har ikke lenger direkte renderingansvar for ti root-level auxiliary-komponenter.
- Overlay-/modalrekkefølgen og alle callbacks er bevart gjennom eksisterende komponentproptyper.
- Neste fase er å trekke selve board-map-renderingen (location zones, tokens, animation og visual overlays) ut i en fokusert board-canvas-komponent.
