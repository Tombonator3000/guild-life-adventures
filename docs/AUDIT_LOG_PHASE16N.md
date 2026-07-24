# Fase 16N – PeerJS signaling-reconnect

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16n-signaling-reconnect` ble opprettet fra fase 16M-merge `0b5f7641f8699d5c3658e31378fc914c69f3fbe3`.

## Problem

Både `createRoom` og `joinRoom` bruker et lokalt `settled`-flagg for å sørge for at oppstarts-Promise bare fullføres én gang. PeerJS sender imidlertid et nytt `open`-signal når forbindelsen til signaling-serveren kommer tilbake. De gamle handlerne returnerte umiddelbart når `settled` allerede var sann.

Resultatet var at status først ble satt til `reconnecting` ved `disconnected`, men aldri tilbake til `connected` etter vellykket signaling-reconnect. UI-et kunne derfor bli stående på `Reconnecting...` selv om forbindelsen igjen fungerte.

## Utført

- Hostens `open`-handler skiller nå mellom første oppstart og et senere signaling-reconnect.
- Ved senere host-`open` settes status tilbake til `connected` og heartbeat-kontrollen startes på nytt.
- Gjestens `open`-handler sjekker ved senere signaling-reconnect om den eksisterende dataforbindelsen til host fortsatt er åpen.
- Når dataforbindelsen overlevde signaling-bruddet, settes gjestens status tilbake til `connected` og heartbeat startes på nytt.
- Oppstarts-Promise fullføres fortsatt bare én gang.
- Eksisterende eksplisitt reconnect, connection-timeout, heartbeat-timeout og host-migrering ble ikke endret.
- Opprettet to PeerJS-livsløpstester med en kontrollert fake Peer/DataConnection:
  - Host: `connected → disconnected → reconnecting → open → connected`.
  - Gjest med overlevende dataforbindelse: `connected → disconnected → reconnecting → open → connected`.
- Diffkontrollen viser 15 tillegg og 2 slettinger i produksjonsfilen.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert de nye signaling-reconnect-testene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- Host og gjest blir ikke lenger stående i `reconnecting` etter at PeerJS-signaling faktisk er tilbake.
- Heartbeat-overvåkningen fornyes etter signaling-reconnect.
- Neste fase bør håndtere tilfellet der gjestens selve DataConnection lukkes, slik at reconnect starter umiddelbart i stedet for å vente på heartbeat-timeout.
