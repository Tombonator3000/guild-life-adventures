# Fase 16R – sikker page-refresh rejoin

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16r-secure-page-rejoin` ble opprettet fra fase 16Q-merge `f1efd4b5efb9f750c276f5d7aea628d1f44dbbe2`.

## Problem

Fase 16Q gjorde vanlig reconnect trygg når gjesten beholdt samme PeerJS-ID. En full page-refresh oppretter derimot en helt ny PeerJS-ID. Hostens gamle `peerId → playerId`-mapping kunne derfor ikke brukes.

Den tidligere lobby-rejoinen identifiserte spilleren med navn og lagret slot. Det er ikke tilstrekkelig som overtakelsesbevis: to spillere kan ha samme navn, og en fremmed klient kan påstå et eksisterende navn eller slot. En ny PeerJS-ID måtte derfor få en faktisk hemmelig legitimasjon før den kunne overta en spillerplass eller motta state-sync.

## Utført

- Opprettet et separat reconnect-credential-system med 192-bit tilfeldig token generert av `crypto.getRandomValues`.
- Credential bindes til romkode, spiller-ID, spillernavn, PeerJS-ID og utstedelsestid.
- Token har maksimal levetid på 30 minutter.
- Host utsteder token bare til en allerede autoritativt mappet peer.
- Gjesten lagrer token i `sessionStorage`, slik at det følger samme nettleserfane gjennom refresh uten å bli delt globalt mellom faner.
- La til nye nettverksmeldinger for credential-request og credential-distribusjon.
- En ny PeerJS-ID kan overta en spillerplass bare når romkode, spiller-ID og token alle stemmer.
- Ved godkjent rebind flyttes den sikre peer-overstyringen til ny ID, mens gammel ID eksplisitt revokeres.
- Action-, movement-, zombie- og disconnect-validering bruker nå den sikre resolveren, ikke bare PeerManagers opprinnelige lobby-mapping.
- Host sender autoritativ state-sync til den nye ID-en og utsteder en oppdatert credential etter vellykket rejoin.
- Gammel og ny rate-limit-state ryddes, og zombie-markører for begge PeerJS-ID-er fjernes.
- Ukjent ID med feil rom, spiller eller token får ingen state-sync og ingen spillerrettigheter.

## Lobby→spill-broen

`useNetworkSync` monteres først når fasen allerede er `playing`. Ved page-refresh står gjesten fortsatt i `online-lobby`, så den hooken kunne ikke fullføre rejoin alene.

- Opprettet `useSecurePageRejoin`, montert globalt i `Index` før de lazy-loadede skjermene.
- Hooken lytter etter credential og state-sync mens lobbyen fortsatt vises.
- Den sender lagret credential når PeerJS er connected og prøver igjen hvert andre sekund, maksimalt ti ganger, til autoritativ state-sync mottas.
- Når state-sync mottas, brukes eksisterende `applyNetworkState`, som flytter fasen til `playing` og monterer vanlig GameBoard/network sync.
- Meldingslytterne registreres før bootstrap-utvekslingen starter, slik at raske credential- eller state-sync-meldinger ikke mistes i lobby→spill-overgangen.

## Tester

GitHub Actions-run `30117030585`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert secure-rejoin-, credential-, gameplay- og integrasjonstestene: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

Nye testområder:

- Fem hook-tester for global page-rejoin: umiddelbar sending, venting på connected, credential-oppdatering, autoritativ state-sync, begrenset retry og manglende credential.
- Fem credential-tester for tokenformat, samme-rom-remount, rombytte, sikker rebind, feil credential og sessionStorage-expiry.
- Fire gameplay-reconnect-tester, inkludert ny PeerJS-ID og revokering av gammel ID.
- Utvidede integrasjonstester for global montering, listener-before-bootstrap, meldingskontrakter og bruk av sikker resolver i alle gameplay-paths.

## Avgrensning

- Credential ligger bare i samme nettleserfanes `sessionStorage`. Åpning på en annen enhet eller i en annen fane krever en fremtidig eksplisitt overførings-/invitasjonsflyt.
- Dersom hostfanen selv lastes helt på nytt, forsvinner det minnebaserte tokenregisteret. Det er bevisst foreløpig; persistering av hosthemmeligheter må designes separat og bør ikke legges i vanlig game save.
- Eldre aktive sesjoner som ble startet før denne versjonen har ingen token og kan ikke bruke sikker page-refresh-rejoin.

## Resultat

- Page-refresh med ny PeerJS-ID kan nå gjenoppta riktig spillerplass uten navne- eller slot-baserte overtakelser.
- En gammel PeerJS-ID mister alle gameplay-rettigheter når plassen flyttes.
- Host lekker ikke spillstate til klienter som bare påstår et eksisterende navn.
