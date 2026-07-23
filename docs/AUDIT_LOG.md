# Guild Life Adventures – revisjonslogg

Denne filen er den permanente loggen for feilretting, sikkerhetsarbeid, testdekning og ytelsesforbedringer. Hver arbeidsfase skal føre opp hva som ble undersøkt, hva som ble endret, hvilke tester som ble kjørt og hva som fortsatt gjenstår.

## Status på opprinnelig prioritert liste

| Nr. | Punkt | Status | Merknad |
|---:|---|---|---|
| 1 | Beskytte online spill mot sabotasje/misbruk | Ferdig hovedsakelig | Sabotasje, beskyttelse og tip-off er host-autoritative. |
| 2 | Host-autoritativ multiplayer | Delvis ferdig | Aktør-ID, tur, rate limit og argumentgrenser valideres. Eldre rå mutasjoner og klientsendte priser finnes fortsatt i allowlisten. |
| 3 | Full save/load-gjenoppretting | Ferdig | Brett-hexer og ukentlige nyheter gjenopprettes. |
| 4 | Save-migrering v10 | Ferdig | Normalisering og migreringstester er lagt til. |
| 5 | Sikre reputation unlocks | Ferdig | Kjøp valideres atomisk på hosten. |
| 6 | Atomiske handlinger | Delvis ferdig | Healer, gravplass, gambling, avis, sabotasje og beskyttelse er atomiske. Flere butikk-, økonomi- og utdanningsflyter sender fortsatt pris/effekt fra klienten. |
| 7 | Hook-avhengigheter | Ferdig for kjente funn | AI-start, auto-end-turn, tastatur og zone-editor er rettet. |
| 8 | Playwright E2E | Delvis ferdig | Tittel- og setup-smoketester finnes. Full spillflyt, save/load og online avvisninger mangler. |
| 9 | Zustand-selectors | Delvis ferdig | Root, GameBoard og Grimwald AI bruker selectors/useShallow. Flere store komponenter bør fortsatt inventeres. |
| 10 | AI failed-action cache / utdanning | Ferdig | Cache-nøkkelen følger relevant spillerstatus og tillater retry etter tilstandsendring. |
| 11 | Dokumentasjon | Ferdig grunnlag | README, arkitektur, testing og multiplayer-sikkerhet er oppdatert. |
| 12 | Én pakkehåndterer | Ferdig | Bun er eneste pakkehåndterer; package-lock er fjernet. |
| 13 | PWA/cache-beslutning | Ferdig | Installerbar PWA uten applikasjons-cache for å unngå utdaterte deploy-filer. |
| 14 | Spillmoduser | Ferdig grunnlag | Quick, Standard, Adventure og Epic finnes. |

## Gjenstående prioritert rekkefølge

1. **Fjern rå multiplayer-mutasjoner og klientstyrte priser.** Erstatt dem med semantiske, atomiske handlinger der hosten slår opp pris, tidsbruk, krav og effekt.
2. **Utvid E2E-testene til faktisk spilling.** Opprett spill, start første tur, utfør en handling, avslutt tur, save/load og verifiser at ingen runtime-feil oppstår.
3. **Test online sikkerhetsavvisninger på protokollnivå.** Feil spiller-ID, feil tur, ugyldig pris og for store statsendringer skal avvises.
4. **Inventer og begrens resterende hele-store Zustand-abonnementer.** Prioriter komponenter som rerendres under bevegelse og AI-turer.
5. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
6. **Utvid regresjonstester for butikker, jobb og utdanning.** Canonical priser og krav skal testes direkte i store-laget.
7. **Rydd døde kompatibilitetslag.** Fjern gamle callback-props og allowlist-poster først når alle kallere er migrert.

## Fase 4 – 23. juli 2026

### Mål

- Lage en nøyaktig, maskinell inventarliste over gjenstående rå handlinger og ytelsesområder.
- Starte migrering av høyest risiko først.
- Oppdatere denne loggen ved hver commit og før merge.

### Utført

- Opprettet arbeidsgren `agent/audit-phase4` fra `main` etter merge av PR #325.
- Opprettet denne permanente revisjonsloggen.

### Pågår

- Automatisk kildekodeinventering av rå statsmutasjoner, klientstyrte priser/kostnader, store Zustand-abonnementer og E2E-dekning.

### Tester

- Ikke kjørt ennå i denne fasen.

### Gjenstår i fasen

- Generere inventarrapport.
- Velge første migreringsgruppe basert på faktisk antall kallere og risiko.
- Implementere atomiske host-handlinger og tilhørende tester.
- Kjøre TypeScript, enhetstester, build, lint og Playwright.
