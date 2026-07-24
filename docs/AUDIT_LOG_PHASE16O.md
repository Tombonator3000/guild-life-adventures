# Fase 16O – umiddelbar DataConnection-reconnect

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16o-data-connection-reconnect` ble opprettet fra fase 16N-merge `82a36e36b1e0aad427a001d5b720e3485c455f65`.

## Problem

Når gjestens etablerte PeerJS `DataConnection` til host ble lukket, fjernet PeerManager forbindelsen og stoppet heartbeat. Status ble derimot ikke endret, og reconnect startet ikke direkte. Klienten kunne derfor se ut som tilkoblet helt til den gamle heartbeat-timeouten på opptil 15 sekunder våknet.

En naiv automatisk reconnect i `close`-handleren ville samtidig skapt rekursjon: `attemptReconnect()` lukket den gamle forbindelsen før den ble fjernet fra kartet, slik at close-handleren kunne starte enda en reconnect.

## Utført

- Gjestens aktive DataConnection-close setter status til `reconnecting` umiddelbart.
- Gammel heartbeat-timeout ryddes direkte ved forbindelsesbruddet.
- PeerManager starter `attemptReconnect()` i samme close-flyt i stedet for å vente opptil 15 sekunder.
- Dersom reconnect ikke kan startes fordi nødvendig peer-/romstate mangler, går status til `error`.
- `attemptReconnect()` fjerner nå den gamle forbindelsen fra connection-kartet før `close()` kalles. Dermed ignorerer den gamle close-handleren det bevisste byttet og kan ikke starte rekursivt.
- Opprettet `closeConnectionsSilently()` for bevisste tilkoblingsbytter og teardown.
- Host-migrering bruker stille lukking, slik at gjesten ikke forsøker å koble seg tilbake til den gamle hosten samtidig som den promoteres.
- `connectToNewHost()` bruker stille lukking, slik at bytte av host ikke starter reconnect mot gammel host.
- `destroy()` bruker stille lukking, slik at opprydding ikke starter nye nettverksforsøk.
- Opprettet to kontrollerte PeerJS-livsløpstester:
  - Spontan DataConnection-close starter en ny forbindelse umiddelbart og sender reconnect-identitet etter åpning.
  - Manuell Retry lukker gammel forbindelse uten rekursjon eller flere parallelle replacement-forbindelser.
- Produksjonsdiffen er 26 tillegg og 16 slettinger i PeerManager.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert de nye DataConnection-reconnect-testene og signaling-testene fra fase 16N.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- Gjester reagerer umiddelbart når host-dataforbindelsen faktisk lukkes.
- Retry, host-migrering og teardown kan ikke lenger forveksles med spontane nettverksbrudd.
- Neste fase bør hindre flere samtidige reconnect-forsøk dersom heartbeat, close-handler og brukertrykk treffer nesten samtidig.
