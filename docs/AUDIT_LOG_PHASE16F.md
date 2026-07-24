# Fase 16F – GameBoard eventkø

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16f-gameboard-event-queue` ble opprettet fra fase 16E-merge `1c63b45d662997e8f97e34ab6e0294e6f4662309`.

## Mål

- Trekke eventkø-state og flerlinjekoordinering ut av `GameBoard`.
- Beholde nøyaktig forskjell mellom vanlige hendelser og weekend-hendelser.
- Teste faktisk hook-adferd, ikke bare kildekodestruktur.

## Utført

- Opprettet `useGameBoardEventQueue.ts`.
- Flyttet `eventQueueIdx`, reset ved ny event-ID, linjesplitting, nummerert tittel og dismiss-flyt til hooken.
- Vanlige hendelser viser fortsatt én ikke-tom beskrivelseslinje om gangen og kaller først store-handlingen etter siste linje.
- Weekend-hendelser beholder hele flerlinjeteksten samlet og avvises i ett steg.
- En ny event-ID nullstiller køen til første linje.
- `GameBoard` sender fortsatt `currentEvent`, `eventSource` og den autoritative `dismissEvent`-handlingen inn i hooken.
- Opprettet fire hook-tester for vanlig flerlinjekø, weekend-hendelse, event-ID-bytte og fravær av event.
- Utvidet strukturtestene med eksplisitt hook-delegering og fravær av den gamle inline-kølogikken.
- Strammet størrelsesgrensen for `GameBoard` fra 470 til 450 linjer og satte egen grense for eventkø-hooken.
- Ingen eventinnhold, prioritering, store-handling, spillregel, nettverksflyt eller visuell presentasjon ble endret.

## Tester

GitHub Actions-run `30103384671`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert fire nye eventkø-tester og GameBoard-strukturinvariantene: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- `GameBoard` eier ikke lenger intern eventkø-state eller linjesplitting.
- Eventkøens særregler er samlet og direkte testet i en hook under 60 linjer.
- Neste fase bør vurdere turbytte-/hotseat-koordineringen eller samle de rene spectator-avledningene i en fokusert hook.
