# Fase 16D – GameBoard sidepanel-layout

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16d-gameboard-side-panels` ble opprettet fra fase 16C-merge `2431c8952498b57249e32720f7d9412ec8d4dcd6`.

## Mål

- Fortsette oppdelingen av `GameBoard` uten å flytte lokal state, nettverksstate eller callback-eierskap ut av hovedkomponenten.
- Trekke desktop-sidepaneler, mobil-HUD og mobile drawers inn i én fokusert presentasjonskomponent.
- Beholde samme responsive synlighet, fullboard-oppførsel, DOM-rekkefølge og mobilflyt for meny og Zone Editor.

## Utført

- Opprettet `GameBoardSidePanels.tsx`.
- Flyttet rendering av `SideInfoTabs`, `RightSideTabs`, `MobileHUD`, `MobileDrawer` og `StoneBorderFrame` ut av `GameBoard`.
- Flyttet den responsive root-rammen og den fleksible brettkolonnen til samme layoutkomponent.
- Beholdt desktop-bredden på 12 prosent og den opprinnelige DOM-rekkefølgen: mobil-HUD, venstre panel, brett, høyre panel, mobile drawers og auxiliary UI.
- Beholdt mobil-HUD før brettet og venstre/høyre drawers med samme titler og innhold.
- `GameBoard` eier fortsatt drawer-state, meny-state, debug/zone-editor-state, AI-speed, skip-turn og fullboard-state.
- Mobilcallbackene lukker fortsatt høyre drawer før Save-meny eller Zone Editor åpnes.
- Bruker `ComponentProps`, `ElementType`, `ReactNode` og `Pick` fra React og de eksisterende komponentene i stedet for parallelle prop-modeller.
- Utvidet strukturtestene med eksplisitt sidepanel-delegering, native prop-typer, responsive invarianter, DOM-rekkefølge, mobil callback-rekkefølge og størrelsesgrenser.
- Ingen spillregler, eventkø, kartmotor, nettverksprotokoll eller lagringsflyt ble endret.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert GameBoard-strukturinvariantene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- `GameBoard` har ikke lenger direkte import-, render- eller rammeansvar for fem sidepanelkomponenter.
- Desktop- og mobilpresentasjonen er samlet i en komponent under 100 linjer uten CSS-basert omorganisering av tastaturrekkefølgen.
- Neste fase bør vurdere om header-presentasjonen eller den store state-/hook-koordineringen kan trekkes ut uten å skjule eierskapet til spillflyten.
