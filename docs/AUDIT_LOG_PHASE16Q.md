# Fase 16Q – gameplay reconnect-resync

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16q-gameplay-reconnect-resync` ble opprettet fra fase 16P-merge `34ebbb31a2c1356f65194abca525d2a8badfc7af`.

## Problem

Etter at gjesten opprettet en replacement-DataConnection sendte PeerManager meldingen `{ type: 'reconnect', playerName }`. Lobbyhooken hadde en reconnect-handler, men den hooken er demontert når spillet går fra `online-lobby` til `playing`.

Under aktivt spill er det `useNetworkSync` som eier hostens meldingslytter. Denne håndterte action, movement og chat, men ignorerte reconnect-meldingen. En gjest kunne derfor få grønn nettverksstatus uten å få fersk game state. Dersom spillstate hadde endret seg under bruddet, fortsatte gjesten med stale data.

## Utført

- Opprettet `handleGameplayReconnect` som en liten, ren og direkte testbar reconnect-resync-flyt.
- Hostens aktive gameplay-lytter behandler nå `reconnect` før vanlige action-meldinger.
- Reconnect godtas bare når den aktuelle PeerJS-ID-en allerede har en autoritativ `peerId → playerId`-mapping i PeerManager.
- Kjent peer får umiddelbart en målrettet `state-sync` med hostens nåværende serialiserte spillstate.
- Host broadcaster `player-reconnected` med lagret, betrodd spillernavn. Navnet fra gjestemeldingen brukes bare som fallback når registry mangler navn.
- Peer-ID-en fjernes fra `disconnectedPeersRef`, slik at spilleren ikke lenger behandles som zombie etter resync.
- Rate-limit-historikk ryddes og turn-timeout nullstilles etter godkjent reconnect.
- Ukjent PeerJS-ID avvises uten state-sync, broadcast eller tillit til påstått spillernavn.
- Opprettet tre helper-tester for kjent peer, navnefallback og ukjent peer.
- Opprettet tre integrasjonstester som låser reconnect-grenen, rekkefølgen før action-validering og cleanup etter godkjenning.
- Ingen action-regel, movement-validering, chat, turn-timeout, nettverksmeldingstype eller game-state-format ble endret.

## Avgrensning

Denne fasen løser vanlig reconnect der PeerJS-identiteten fortsatt er den samme og derfor allerede er mappet. Page-refresh eller full ny PeerJS-identitet avvises fortsatt. Det er bevisst: navn alene er ikke sterk nok identitet til å overta en eksisterende spillerplass.

## Tester

GitHub Actions-run `30115179257`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert nye reconnect-helper- og integrasjonstester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- Vanlige gameplay-reconnects mottar nå alltid autoritativ state-sync før videre handlinger.
- En reconnectet spiller blir ikke stående som zombie eller med gammel rate-limit-/turn-timeout-state.
- Ukjente nye PeerJS-ID-er kan ikke hente spillstate ved å påstå et eksisterende navn.
- Neste fase bør innføre en faktisk reconnect-legitimasjon for page-refresh og ny PeerJS-ID, ikke basere overtakelse på navn alene.
