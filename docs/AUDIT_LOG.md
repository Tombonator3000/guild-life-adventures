# Guild Life Adventures – revisjonslogg

Denne filen er den permanente loggen for feilretting, sikkerhetsarbeid, testdekning og ytelsesforbedringer. Hver arbeidsfase skal føre opp hva som ble undersøkt, hva som ble endret, hvilke tester som ble kjørt og hva som fortsatt gjenstår.

## Status på opprinnelig prioritert liste

| Nr. | Punkt | Status | Merknad |
|---:|---|---|---|
| 1 | Beskytte online spill mot sabotasje/misbruk | Ferdig hovedsakelig | Sabotasje, beskyttelse og tip-off er host-autoritative. |
| 2 | Host-autoritativ multiplayer | Delvis ferdig | Aktør-ID, tur, rate limit og argumentgrenser valideres. Jobb, utdanning og vanlige vendor-kjøp bruker nå semantiske gjestehandlinger. Utstyr, apparater, bolig, hex og flere økonomihandlinger står igjen. |
| 3 | Full save/load-gjenoppretting | Ferdig | Brett-hexer og ukentlige nyheter gjenopprettes. |
| 4 | Save-migrering v10 | Ferdig | Normalisering og migreringstester er lagt til. |
| 5 | Sikre reputation unlocks | Ferdig | Kjøp valideres atomisk på hosten. |
| 6 | Atomiske handlinger | Delvis ferdig | Healer, gravplass, gambling, avis, sabotasje, beskyttelse, jobb, utdanning og ordinære vendor-kjøp er host-resolverte. Utstyr/apparater, bolig/leie, hex/ritual og deler av bank/investering står igjen. |
| 7 | Hook-avhengigheter | Ferdig for kjente funn | AI-start, auto-end-turn, tastatur og zone-editor er rettet. |
| 8 | Playwright E2E | Delvis ferdig | Tittel- og setup-smoketester finnes. Full spillflyt, save/load og online avvisninger mangler. |
| 9 | Zustand-selectors | Delvis ferdig | Root, GameBoard og Grimwald AI bruker selectors/useShallow. `ShadowMarketPanel` ble begrenset i fase 5, men `LocationPanel` leser fortsatt hele store-objektet. |
| 10 | AI failed-action cache / utdanning | Ferdig | Cache-nøkkelen følger relevant spillerstatus og tillater retry etter tilstandsendring. |
| 11 | Dokumentasjon | Ferdig grunnlag | README, arkitektur, testing, multiplayer-sikkerhet, inventarrapport og denne revisjonsloggen er oppdatert. |
| 12 | Én pakkehåndterer | Ferdig | Bun er eneste pakkehåndterer; package-lock er fjernet. |
| 13 | PWA/cache-beslutning | Ferdig | Installerbar PWA uten applikasjons-cache for å unngå utdaterte deploy-filer. |
| 14 | Spillmoduser | Ferdig grunnlag | Quick, Standard, Adventure og Epic finnes. |

## Gjenstående prioritert rekkefølge

1. **Gjør utstyr og apparater host-autoritative.** Kjøp, reparasjon, pant, innløsning, temperering, smiereparasjon og salvage sender fortsatt pris eller verdi fra klienten.
2. **Gjør bolig og leie host-autoritative.** Prepaid rent, flytting og enkelte boligkostnader skal beregnes av hosten.
3. **Gjør hex- og ritualtjenester host-autoritative.** Scrollpris, amulett, rensing, ritual og refleksjon skal løses fra canonical data på hosten.
4. **Gjør bank/investering og øvrige rå handlinger strengere.** Klientvalgte beløp må få tydelige grenser, eierskapskontroll og semantiske handlinger der beløpet ikke skal være fritt.
5. **Utvid E2E-testene til faktisk spilling.** Opprett spill, start første tur, utfør handling, avslutt tur, save/load og verifiser at ingen runtime-feil oppstår.
6. **Test online sikkerhetsavvisninger på protokollnivå.** Feil spiller-ID, feil tur, feil vendor, ugyldig vare og manipulerte verdier skal avvises.
7. **Begrens resterende store-abonnementer.** Start med `LocationPanel`, som fortsatt leser hele Zustand-storen.
8. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
9. **Rydd døde kompatibilitetslag.** Fjern gamle callback-props og numeriske legacy-funksjoner først når AI og alle lokale kallere er migrert.

## Fase 4 – 23. juli 2026

### Mål

- Lage en nøyaktig, maskinell inventarliste over gjenstående rå handlinger og ytelsesområder.
- Starte migrering av høyest risiko først.
- Oppdatere denne loggen ved hver commit og før merge.

### Utført

- Opprettet arbeidsgren `agent/audit-phase4` og PR #326.
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
- Lagt til seks målrettede regresjonstester.
- Oppdatert to eldre multiplayer-tester til den nye sikkerhetsmodellen.
- Fjernet alle midlertidige workflow-, trigger-, patch- og valideringsfiler.

### Tester

- Dependency install: bestått.
- TypeScript (`tsc --noEmit`): bestått.
- Målrettede jobb-/utdanningstester: bestått, 6 av 6.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

### Resultat

- Online-gjester kan ikke lenger velge egen arbeidslønn, skiftlengde, studiepris, studietid eller full tuition-verdi.
- Lokalt spill og AI beholder eksisterende interne funksjoner, slik at migreringen ikke endret AI-adferd.
- PR #326 ble squash-merget til `main` som commit `3d01ad5556b6165cb0c39b1c3f1bcba6bdf06fdb`.

## Fase 5 – 23. juli 2026

### Mål

- Fjerne klientstyrt pris, matverdi, ferskmatmengde og ticket-type fra General Store og Shadow Market.
- Beholde eksisterende kataloger, rabatter, storage-regler og spillbalanse.
- Redusere store-abonnementet i `ShadowMarketPanel`.

### Utført

- Opprettet arbeidsgren `agent/audit-phase5` fra fase 4-commit og draft-PR #327.
- Lagt til `purchaseVendorItem(playerId, vendor, itemId)` i `src/store/helpers/economy/vendorHelpers.ts`.
- Klienten sender nå bare spiller-ID, vendor og vare-ID.
- Hosten slår opp og validerer:
  - om varen finnes i riktig katalog,
  - General Store-pris eller Shadow Market-rabatt,
  - gjeldende economy modifier,
  - nok gull,
  - matverdi og ferskmatmengde,
  - Preservation Box/Frost Chest-kapasitet,
  - hidden spoilage-flagg,
  - lottery-effekt,
  - weekend ticket-type og duplicate ownership,
  - scholar-item og duplicate ownership,
  - happiness-effekt.
- Hele kjøpet utføres i én state-transaksjon, inkludert `totalGoldSpent`.
- Oppdatert `GeneralStorePanel` til `purchaseVendorItem` for shelf-stable mat, ferskmat og lotteribilletter.
- Oppdatert `ShadowMarketPanel` til samme handling for ordinære varer, lottery, weekend tickets og scholar items.
- `ShadowMarketPanel` bruker nå separate Zustand-selectors i stedet for å abonnere på hele store-objektet.
- Apparater i Shadow Market ble bevisst ikke tatt med; de har egne breakage-, source- og repair-regler og behandles i neste fase.
- Fjernet `buyFreshFood`, `buyFoodWithSpoilage`, `buyLotteryTicket` og `buyTicket` fra gjestenes allowlist.
- Lagt til `src/test/vendorServices.test.ts` med sju tester for canonical pris/effekt, fresh-food capacity, Shadow Market-rabatt, duplicate tickets, lottery, scholar item, feil lokasjon og allowlist.
- Oppdatert multiplayer-testens aktørliste til `purchaseVendorItem`.
- Fjernet alle midlertidige workflow-, trigger-, resultat- og patchfiler før merge.

### Tester

Valideringsrun `29996459512`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert sju nye vendor-tester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

### Resultat

- En online-gjest kan ikke lenger diktere pris, matverdi, ferskmatmengde eller ticket-type ved kjøp i General Store og ordinære deler av Shadow Market.
- General Store- og Shadow Market-kjøp deler nå én canonical host-handling.
- Neste fase er utstyr og apparater: `buyAppliance`, reparasjon, pant/innløsning, `buyDurable`, temperering, smiereparasjon og salvage.
