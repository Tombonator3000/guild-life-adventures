# Fase 16P – serialiserte reconnect-forsøk

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16p-reconnect-guard` ble opprettet fra fase 16O-merge `ddf8ea2646de5744a2c982eba00ae16db82fb5bb`.

## Problem

Et gjesteforsøk på reconnect kan utløses fra flere steder nesten samtidig: DataConnection-close, heartbeat-timeout og Retry-knappen. Før denne fasen kunne hvert kall starte en ny PeerJS DataConnection eller en ny signaling-reconnect. Det åpnet for parallelle forbindelser, dupliserte reconnect-meldinger og race conditions der et gammelt forsøk kunne vinne etter host-migrering eller teardown.

## Utført

- La til én eksplisitt reconnect-guard i PeerManager.
- Senere reconnect-triggere mens et forsøk pågår returnerer som håndtert, men oppretter ingen ny DataConnection og starter ikke PeerJS-reconnect på nytt.
- Hvert faktisk reconnect-forsøk får en monoton `attemptId`.
- Callbackene for signaling-open, signaling-timeout, DataConnection-open, error og timeout sjekker at forsøket fortsatt er aktivt.
- Et fullført eller feilet forsøk frigjør guardet slik at Retry kan starte et nytt forsøk.
- `connectToHost` kan nå få en relevanskontroll. En gammel DataConnection som åpner etter at forsøket er ugyldiggjort blir lukket uten å overskrive status eller connection-kart.
- Nytt rom, ny join, host-promotering, hostbytte og destroy ugyldiggjør eventuelle gamle reconnect-callbacks.
- Beholdt eksisterende immediate reconnect, signaling-reconnect, heartbeat og reconnect-identitet.
- Utvidet DataConnection-testene med tre nye race-scenarier:
  - Flere Retry-kall mens replacement-forbindelsen venter gir bare én replacement.
  - Feilet replacement frigjør guardet og lar neste Retry starte.
  - Flere Retry-kall mens signaling-serveren kobles opp igjen gir bare ett PeerJS-reconnect og én replacement etter `open`.
- Produksjonsdiffen er 61 tillegg og 7 slettinger i PeerManager.

## Tester

GitHub Actions-run `30114301661`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert fem DataConnection-reconnect-tester og signaling-testene fra fase 16N: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- Heartbeat, close-handler og Retry kan ikke lenger opprette parallelle reconnect-forsøk.
- Gamle callbacks kan ikke koble klienten tilbake til en foreldet host etter host-migrering eller teardown.
- Neste fase bør kontrollere reconnect-identiteten på hostsiden, særlig hvordan ny PeerJS-ID matches mot tidligere spiller når DataConnection blir erstattet.
