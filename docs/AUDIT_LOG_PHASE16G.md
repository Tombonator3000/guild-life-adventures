# Fase 16G – hotseat turbytte

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16g-hotseat-transition` ble opprettet fra fase 16F-merge `e17123c7873e67123aad4b5d062de5dc8523be5a`.

## Mål

- Trekke lokal hotseat-koordinering ut av `GameBoard`.
- Beholde overgangen bare mellom aktive menneskelige spillere i lokale flerspillerspill.
- Unngå render-state for en verdi som kun brukes til å huske forrige menneskelige spiller.

## Utført

- Opprettet `useGameBoardTurnTransition.ts`.
- Flyttet beregningen av aktive menneskelige spillere, lokal flerspillerstatus og forrige menneskelige spiller til hooken.
- Erstattet `lastHumanPlayerId` som React-state med en ref, siden verdien ikke brukes i rendering.
- Beholdt `showTurnTransition` som state fordi den styrer det synlige hotseat-overlegget.
- AI-turer ignoreres fortsatt, men mennesket før og etter AI-turen sammenlignes.
- Online-spill viser fortsatt ikke lokalt hotseat-overlegg.
- Spillere som er ute av spillet teller fortsatt ikke mot kravet om minst to aktive mennesker.
- Turendringer utenfor `playing` spores fortsatt uten å vise et gammelt overlegg når spillfasen starter.
- `GameBoard` sender fortsatt `players`, `currentPlayer`, `phase` og `isOnline` til hooken, og overlayet bruker hookens dismiss-handler.
- Opprettet fem hook-tester for vanlig turbytte, AI-mellomledd, online-spill, eliminerte spillere og faseskifte.
- Utvidet strukturtestene med eksplisitt delegering og fravær av den gamle inline-state/logikken.
- Strammet størrelsesgrensen for `GameBoard` fra 450 til 440 linjer.
- Ingen turrekkefølge, AI-logikk, nettverksflyt, spillerstatus eller visuell presentasjon ble endret.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert fem nye hotseat-tester og GameBoard-strukturinvariantene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- `GameBoard` eier ikke lenger state for forrige menneskelige spiller eller hotseat-beregningen.
- Forrige spiller lagres uten å utløse en ekstra render ved hvert menneskelig turbytte.
- Neste fase bør samle spectator-/lokalspiller-avledningene eller redusere de gjenværende store prop-objektene i `GameBoard`.
