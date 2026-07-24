# Fase 16H – animasjonssynkronisering

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16h-animation-sync` ble opprettet fra fase 16G-merge `72aebc9a366d6bb793f448115d47beca0e0e7cfe`.

## Mål

- Trekke synkronisering mellom AI-broen, nettverket og spilleranimasjonen ut av `GameBoard`.
- Beholde registrering og opprydding av den globale AI-animasjonscallbacken.
- Beholde venting på pågående lokal animasjon før en nettverksanimasjon konsumeres.

## Utført

- Opprettet `useGameBoardAnimationSync.ts`.
- Flyttet registrering av `startRemoteAnimation` i AI-animasjonsbroen til hooken.
- Beholdt opprydding med `registerAIAnimateCallback(null)` ved unmount eller callbackbytte.
- Flyttet konsumering av `remoteAnimation` til hooken.
- En ventende fjernanimasjon startes fortsatt bare når ingen spiller allerede animeres.
- Nettverksforespørselen ryddes fortsatt først etter at `startRemoteAnimation` er kalt.
- `GameBoard` leverer fortsatt de autoritative callbackene fra `usePlayerAnimation` og `useNetworkSync`.
- Opprettet fire hook-tester for broregistrering/opprydding, umiddelbar fjernanimasjon, venting på lokal animasjon og tom forespørsel.
- Utvidet strukturtestene med eksplisitt delegering og fravær av de gamle inline-effektene.
- Strammet størrelsesgrensen for `GameBoard` fra 440 til 430 linjer.
- Ingen animasjonsbane, bevegelseskostnad, nettverksmelding, AI-beslutning eller visuell presentasjon ble endret.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert fire nye animasjonssynkroniseringstester og GameBoard-strukturinvariantene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- `GameBoard` eier ikke lenger globale AI-broeffekter eller konsumering av nettverksanimasjoner.
- Registrering, opprydding og køventing er samlet og direkte testet i en hook under 45 linjer.
- Neste fase bør flytte den gjenværende appliance-breakage toast-effekten eller samle spectator-/lokalspiller-avledningene.
