# Guild Life Adventures – revisjonslogg

Denne filen er den permanente loggen for feilretting, sikkerhetsarbeid, testdekning og ytelsesforbedringer. Hver arbeidsfase skal føre opp hva som ble undersøkt, hva som ble endret, hvilke tester som ble kjørt og hva som fortsatt gjenstår.

## Status på opprinnelig prioritert liste

| Nr. | Punkt | Status | Merknad |
|---:|---|---|---|
| 1 | Beskytte online spill mot sabotasje/misbruk | Ferdig hovedsakelig | Sabotasje, beskyttelse og tip-off er host-autoritative. |
| 2 | Host-autoritativ multiplayer | Delvis ferdig | Aktør-ID, tur, rate limit og argumentgrenser valideres. Jobb og utdanning bruker nå semantiske gjestehandlinger; flere rå butikk-/økonomihandlinger står igjen. |
| 3 | Full save/load-gjenoppretting | Ferdig | Brett-hexer og ukentlige nyheter gjenopprettes. |
| 4 | Save-migrering v10 | Ferdig | Normalisering og migreringstester er lagt til. |
| 5 | Sikre reputation unlocks | Ferdig | Kjøp valideres atomisk på hosten. |
| 6 | Atomiske handlinger | Delvis ferdig | Healer, gravplass, gambling, avis, sabotasje og beskyttelse er atomiske. Jobb og utdanning er flyttet til host-resolvert intensjon; butikk-, økonomi-, bolig-, hex- og utstyrsverdier står igjen. |
| 7 | Hook-avhengigheter | Ferdig for kjente funn | AI-start, auto-end-turn, tastatur og zone-editor er rettet. |
| 8 | Playwright E2E | Delvis ferdig | Tittel- og setup-smoketester finnes. Full spillflyt, save/load og online avvisninger mangler. |
| 9 | Zustand-selectors | Delvis ferdig | Root, GameBoard og Grimwald AI bruker selectors/useShallow. `LocationPanel` bruker fortsatt hele store-objektet og må migreres manuelt. |
| 10 | AI failed-action cache / utdanning | Ferdig | Cache-nøkkelen følger relevant spillerstatus og tillater retry etter tilstandsendring. |
| 11 | Dokumentasjon | Ferdig grunnlag | README, arkitektur, testing, multiplayer-sikkerhet og denne revisjonsloggen er oppdatert. |
| 12 | Én pakkehåndterer | Ferdig | Bun er eneste pakkehåndterer; package-lock er fjernet. |
| 13 | PWA/cache-beslutning | Ferdig | Installerbar PWA uten applikasjons-cache for å unngå utdaterte deploy-filer. |
| 14 | Spillmoduser | Ferdig grunnlag | Quick, Standard, Adventure og Epic finnes. |

## Gjenstående prioritert rekkefølge

1. **Fjern resterende rå multiplayer-mutasjoner og klientstyrte priser.** Neste grupper er butikk/mat/billetter, utstyr/apparater, bolig/leie, hex/ritual og bank/investering.
2. **Utvid E2E-testene til faktisk spilling.** Opprett spill, start første tur, utfør en handling, avslutt tur, save/load og verifiser at ingen runtime-feil oppstår.
3. **Test online sikkerhetsavvisninger på protokollnivå.** Feil spiller-ID, feil tur, ugyldig pris og for store statsendringer skal avvises.
4. **Begrens resterende store-abonnementer manuelt.** Start med `LocationPanel`, som fortsatt leser hele Zustand-storen.
5. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
6. **Utvid regresjonstester for butikker og økonomi.** Canonical priser, lokasjoner, beholdning og krav skal testes direkte i store-laget.
7. **Rydd døde kompatibilitetslag.** Fjern gamle callback-props og numeriske legacy-funksjoner først når AI og alle lokale kallere er migrert.

## Fase 4 – 23. juli 2026

### Mål

- Lage en nøyaktig, maskinell inventarliste over gjenstående rå handlinger og ytelsesområder.
- Starte migrering av høyest risiko først.
- Oppdatere denne loggen ved hver commit og før merge.

### Utført

- Opprettet arbeidsgren `agent/audit-phase4` fra `main` etter merge av PR #325.
- Opprettet draft-PR #326.
- Opprettet denne permanente revisjonsloggen.
- Generert `docs/AUDIT_INVENTORY.md` fra hele `src`-treet.
- Inventaret fant:
  - 326 TypeScript/TSX-filer,
  - 727 linjer i `GameBoard.tsx`,
  - 78 rå `modify*`-kall utenfor store-laget,
  - 51 kall der klienten sender pris, beløp, tid eller effekt,
  - én Playwright E2E-fil med to smoke-tester.
- Valgt jobb og utdanning som første migreringsgruppe fordi gjesten kunne sende egen lønn, studiekostnad og tidsbruk.
- Lagt til host-resolverte handlinger:
  - `performWorkShift(playerId, 'full' | 'remaining')`,
  - `attendDegreeSession(playerId, degreeId, 'standard' | 'cram')`,
  - `prepayDegree(playerId, degreeId)`,
  - `graduateDegree(playerId, degreeId)`.
- Hosten slår nå opp jobblokasjon, klær, lønn, skiftlengde, Academy-lokasjon, degree-prerequisites, økonomisk prisfaktor, studietid, prepaid-status, progresjon og graduation-krav.
- Fjernet `workShift`, `studySession`, `studyDegree` og `payFullTuition` fra gjestenes allowlist. De beholdes foreløpig internt for AI-/legacy-kompatibilitet.
- Oppdatert `AcademyPanel`, `WorkSection`, `LocationPanel` og `locationTabs` til de semantiske handlingene.
- Lagt til `src/test/employmentEducationServices.test.ts` med seks tester for canonical lønn/tid, feil lokasjon, Academy-pris, tuition, graduation og allowlist.
- Oppdatert to eldre multiplayer-tester som feilaktig krevde de numeriske legacy-handlingene i allowlisten.
- Fjernet alle midlertidige workflow-, trigger-, patch- og valideringsfiler etter kontroll.

### Tester

Validering av kildekoden etter testrettelsen:

- Dependency install: bestått.
- TypeScript (`tsc --noEmit`): bestått.
- Målrettede jobb-/utdanningstester: bestått, 6 av 6.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

Den første fulltesten avdekket to utdaterte forventninger i `src/test/multiplayer.test.ts`; disse ble oppdatert til den nye sikkerhetsmodellen før den grønne sluttkjøringen.

### Resultat

- Online-gjester kan ikke lenger velge egen arbeidslønn, skiftlengde, studiepris, studietid eller full tuition-verdi.
- Lokalt spill og AI beholder eksisterende interne funksjoner, slik at migreringen ikke endrer AI-adferd i denne fasen.
- Fase 4 er klar for merge. Neste fase starter med host-resolverte kjøp av mat, ferskvarer, lotteribilletter og andre butikkvarer.
