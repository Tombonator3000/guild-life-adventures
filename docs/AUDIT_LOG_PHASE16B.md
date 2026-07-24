# Fase 16B – GameBoard canvas layer

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16b-gameboard-canvas` og PR #352 ble opprettet fra fase 16A-merge `b00d4c4c83935b35b2b8178c87ff1476c46988fe`.

## Mål

- Fortsette oppdelingen av `GameBoard` uten å endre spillregler, nettverk, AI, eventprioritet eller senterpanel.
- Flytte selve kartflaten, lokasjonssonene, tokens, animasjon og visuelle board-overlays til en fokusert komponent.

## Utført

- Opprettet `GameBoardCanvas.tsx`.
- Flyttet board-bakgrunn og rendering av alle `LOCATIONS` til canvas-laget.
- Flyttet beregning og visning av movement cost, værtillegg, aktive location hexes og quest objective-markører.
- Flyttet statiske spillertokens og `AnimatedPlayerToken` med eksisterende completion-/location-callbacker.
- Flyttet Shadowfingers-token, GraveyardCrows, FestivalOverlay, WeatherOverlay, DebugOverlay og board-banter.
- Quest objectives beregnes én gang per canvas-render i stedet for én gang per lokasjon.
- `GameBoard` beholder center panel, curse/event/Shadowfingers/location/spectator/resource-prioritering og `GameBoardHeader` som children i canvas-komponenten.
- Fjernet de gamle kart- og overlay-importene samt den lokale `BoardBanterOverlay`-implementasjonen fra `GameBoard`.
- Utvidet `gameBoardStructure.test.ts` med invarianter for canvas-delegering, child-eid eventprioritet og komponentstørrelser.
- Første Vitest-kjøring feilet kun fordi den nye GameBoard-grensen var satt kunstig lavt til 520 linjer. Komponenten var omtrent 538 linjer etter en reduksjon på over 150 linjer. Regresjonsgrensen ble satt til 560 uten endring av produktkode.
- Fjernet alle midlertidige workflow-, trigger- og ekstraksjonsfiler før merge.

## Tester

Endelig GitHub Actions-run `30099757144`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert fem GameBoard-strukturinvarianter: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- `GameBoard` har ikke lenger direkte ansvar for kartets lokasjonssløyfe, tokens, animasjon eller visuelle board-overlays.
- Kartmotor og senterpanelrekkefølge er bevart, men renderingansvaret er tydeligere avgrenset.
- Neste fase er å trekke center-panel/event-presentasjonen eller sidepanel-/mobile-layoutlaget ut av `GameBoard`, avhengig av hvilken grense som gir størst reduksjon uten å spre state-eierskap.
