# Fase 16M – korrekt nettverksstatus i spillet

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16m-connection-indicator` ble opprettet fra fase 16L-merge `57a3894b83f349ad5db37d095b813b70bae1acff`.

## Problem

`isOnline` beskriver at spillet kjører i host-/guest-modus, ikke at forbindelsen faktisk er oppe. Den gamle indikatoren viste derfor alltid teksten `Online` og et Wi-Fi-symbol når `isOnline` var sann. Ved frakobling kunne spilleren samtidig se `Connection Lost` øverst og `Online` nederst, i noen tilfeller med grønt symbol og gammel latency.

## Utført

- Opprettet `deriveConnectionIndicator.ts` som autoritativ presentasjonsmodell for alle `ConnectionStatus`-verdier.
- `connected` viser `Online`, Wi-Fi-symbol og latency-farge etter eksisterende terskler.
- `connecting` viser `Connecting` og spinner uten stale latency.
- `reconnecting` viser `Reconnecting` og spinner uten å hevde at forbindelsen er online.
- `disconnected` viser `Offline` med rødt frakoblet-symbol.
- `error` viser `Connection Error` med rødt frakoblet-symbol.
- Romkoden beholdes i indikatoren slik at spilleren fortsatt kan identifisere sesjonen under reconnect.
- Latency vises fortsatt bare for gjester, men nå bare når status faktisk er `connected` og latency er større enn null.
- La til `role="status"` og `aria-live="polite"` på statusindikatoren.
- La til `role="alert"` på connection-lost-banneret.
- Opprettet fem rene tester for statusmodellen, inkludert latency-tersklene.
- Opprettet fire komponenttester som verifiserer connected, connecting, reconnecting, disconnected og error i den faktiske overlay-renderingen.
- Første komponenttestrunde avdekket at CSS-margin ga visuell avstand, men ikke et faktisk tekstmellomrom mellom romkode og latency. Dette ble rettet slik at skjermleserteksten nå blir `Online (ROOM) 42ms` i stedet for `Online (ROOM)42ms`.
- Ingen nettverksprotokoll, reconnect-handling, latency-beregning eller romkode ble endret.

## Tester

GitHub Actions-run `30112228429`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert nye status- og overlay-tester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- Spilleren får ikke lenger motstridende `Online` og `Connection Lost` samtidig.
- Stale latency skjules under connecting, reconnecting, disconnected og error.
- Statuspresentasjonen er samlet, typekontrollert, tilgjengelig for skjermleser og direkte testet.
- Neste fase bør undersøke om reconnect-banneret trenger en eksplisitt timeout-/feilmelding når automatiske reconnect-forsøk aldri fullføres.
