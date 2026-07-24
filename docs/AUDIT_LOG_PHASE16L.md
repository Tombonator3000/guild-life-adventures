# Fase 16L – samlet GameBoard UI-state

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16l-ui-state` ble opprettet fra fase 16K-merge `0c29bba5aa1a4ebeea8eb3aaed06fa8541d70f8c`.

## Mål

- Samle den lokale, flyktige UI-staten som fortsatt lå spredt i `GameBoard`.
- Erstatte gjentatte anonyme åpne-, lukke- og toggle-callbacks med navngitte, stabile handlinger.
- Beholde tastaturhookens direkte setter-kontrakt og mobilens close-before-open-regler.

## Utført

- Opprettet `useGameBoardUiState.ts`.
- Flyttet state for Zone Editor, debug-overlay, spillmeny, begge mobilskuffer, fullboard-modus og valgt spiller til hooken.
- Beholdt de fire setter-funksjonene som `useGameBoardKeyboard` trenger for tastatursnarveier.
- Opprettet stabile `useCallback`-handlinger for åpning, lukking og toggling.
- Mobil spillmeny lukker fortsatt høyreskuffen før menyen åpnes.
- Mobil Zone Editor lukker fortsatt høyreskuffen før editoren åpnes.
- Desktop-handlinger, Mobile HUD, SaveLoadMenu, Zone Editor, PlayerInfoModal og TopDropdownMenu bruker nå navngitte handlinger.
- Fullboard-modus har egne `enterFullboard`- og `exitFullboard`-handlinger, mens tastaturhooken fortsatt kan toggle via setter.
- Opprettet fem hook-tester for starttilstand, vanlig åpne/lukke-flyt, mobil meny, mobil Zone Editor, debug-toggle og spillerinfo.
- Utvidet strukturtestene med eksplisitt UI-state-delegering og fravær av lokal `useState` i `GameBoard`.
- Ingen modalrekkefølge, tastatursnarvei, mobil skuffeflyt, fullboard-adferd eller visuell presentasjon ble endret.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert fem nye UI-state-tester og GameBoard-strukturinvariantene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- `GameBoard` har ikke lenger lokal `useState` eller direkte React-import.
- Flyktig UI-state og overgangsregler er samlet og direkte testet i én hook.
- Neste fase bør gjennomgå de gjenværende propmodellene til `GameBoardAuxiliaryLayer`, men bare trekke ut rene visningsmodeller som faktisk reduserer kompleksitet.
