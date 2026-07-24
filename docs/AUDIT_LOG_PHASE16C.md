# Fase 16C – GameBoard center panel

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16c-gameboard-center` og PR #353 ble opprettet fra fase 16B-merge `f87e046d761940dea24415a463bca043abb52751`.

## Mål

- Fortsette oppdelingen av `GameBoard` uten å flytte state, eventkø eller callback-eierskap ut av hovedkomponenten.
- Trekke curse/event/Shadowfingers/location/spectator/resource-presentasjonen og dens prioriteringsrekkefølge inn i en fokusert komponent.

## Utført

- Opprettet `GameBoardCenterPanel.tsx`.
- Flyttet den visuelle senterpanelrammen, mobil synlighetsregel og presentasjonsrekkefølgen til den nye komponenten.
- Beholdt prioriteringen: toad curse, appliance curse, Shadowfingers, queued event, selected location, spectator panel og til slutt resource panel.
- Beholdt `CursePanelOverlay` som overlegg når spilleren er cursed, men ikke mens toad/appliance-curse-panelet vises.
- `GameBoard` eier fortsatt event queue, dismiss-callbacker, selected location, spectator state og alle prop-objektene.
- Bruker `ComponentProps` og `ElementType` fra React for de eksisterende panelene i stedet for parallelle modeller.
- Fjernet åtte direkte presentasjonsimporter fra `GameBoard`.
- Utvidet strukturtestene med eksplisitt center-delegering, native prop-typer, prioritetsrekkefølge og størrelsesgrenser.
- Ingen spillregler, nettverksflyt, kartmotor eller callbacks ble endret.
- Fjernet alle midlertidige workflow-, trigger- og ekstraksjonsfiler før merge.

## Tester

GitHub Actions-run `30100285975`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert seks GameBoard-strukturinvarianter: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- `GameBoard` bygger nå bare state-avledede prop-objekter for senterpanelet og har ikke lenger direkte ansvar for panelenes rendering eller prioritetskjede.
- Event- og location-presentasjonen er samlet i en komponent under 100 linjer med native props.
- Neste fase er å trekke desktop/mobile sidepanel-layouten ut av `GameBoard`, eller samle state-/hook-koordineringen i mindre hooks dersom det gir en renere grense.
