# Guild Life Adventures – revisjonslogg

Denne filen er den permanente loggen for feilretting, sikkerhetsarbeid, testdekning og ytelsesforbedringer. Hver arbeidsfase skal føre opp hva som ble undersøkt, hva som ble endret, hvilke tester som ble kjørt og hva som fortsatt gjenstår.

## Status på opprinnelig prioritert liste

| Nr. | Punkt | Status | Merknad |
|---:|---|---|---|
| 1 | Beskytte online spill mot sabotasje/misbruk | Ferdig hovedsakelig | Sabotasje, beskyttelse og tip-off er host-autoritative. |
| 2 | Host-autoritativ multiplayer | Delvis ferdig | Aktør-ID, tur, rate limit og argumentgrenser valideres. Jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr og bolig bruker semantiske gjestehandlinger. Hex og enkelte økonomihandlinger står igjen. |
| 3 | Full save/load-gjenoppretting | Ferdig | Brett-hexer og ukentlige nyheter gjenopprettes. |
| 4 | Save-migrering v10 | Ferdig | Normalisering og migreringstester er lagt til. |
| 5 | Sikre reputation unlocks | Ferdig | Kjøp valideres atomisk på hosten. |
| 6 | Atomiske handlinger | Delvis ferdig | Healer, gravplass, gambling, avis, sabotasje, beskyttelse, jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr og bolig er host-resolverte. Hex/ritual og deler av bank/investering står igjen. |
| 7 | Hook-avhengigheter | Ferdig for kjente funn | AI-start, auto-end-turn, tastatur og zone-editor er rettet. |
| 8 | Playwright E2E | Delvis ferdig | Tittel- og setup-smoketester finnes. Full spillflyt, save/load og online avvisninger mangler. |
| 9 | Zustand-selectors | Delvis ferdig | Root, GameBoard og Grimwald AI bruker selectors/useShallow. Flere paneler er begrenset, men `LocationPanel` leser fortsatt hele store-objektet. |
| 10 | AI failed-action cache / utdanning | Ferdig | Cache-nøkkelen følger relevant spillerstatus og tillater retry etter tilstandsendring. |
| 11 | Dokumentasjon | Ferdig grunnlag | README, arkitektur, testing, multiplayer-sikkerhet, inventarrapport og denne revisjonsloggen er oppdatert. |
| 12 | Én pakkehåndterer | Ferdig | Bun er eneste pakkehåndterer; package-lock er fjernet. |
| 13 | PWA/cache-beslutning | Ferdig | Installerbar PWA uten applikasjons-cache for å unngå utdaterte deploy-filer. |
| 14 | Spillmoduser | Ferdig grunnlag | Quick, Standard, Adventure og Epic finnes. |

## Gjenstående prioritert rekkefølge

1. **Gjør hex- og ritualtjenester host-autoritative.** Scrollpris, amulett, rensing, ritual og refleksjon skal løses fra canonical data på hosten.
2. **Gjør bank/investering og øvrige rå handlinger strengere.** Klientvalgte beløp må få tydelige grenser, eierskapskontroll og semantiske handlinger der beløpet ikke skal være fritt.
3. **Utvid E2E-testene til faktisk spilling.** Opprett spill, start første tur, utfør handling, avslutt tur, save/load og verifiser at ingen runtime-feil oppstår.
4. **Test online sikkerhetsavvisninger på protokollnivå.** Feil spiller-ID, feil tur, feil vendor/service, ugyldig vare og manipulerte verdier skal avvises.
5. **Begrens resterende store-abonnementer.** Start med `LocationPanel`, som fortsatt leser hele Zustand-storen.
6. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
7. **Rydd døde kompatibilitetslag.** Fjern gamle callback-props og numeriske legacy-funksjoner først når AI og alle lokale kallere er migrert.

## Fase 4 – 23. juli 2026

### Mål

- Lage en nøyaktig, maskinell inventarliste over gjenstående rå handlinger og ytelsesområder.
- Starte migrering av høyest risiko først.
- Oppdatere denne loggen ved hver commit og før merge.

### Utført

- Opprettet arbeidsgren `agent/audit-phase4` og PR #326.
- Opprettet denne permanente revisjonsloggen.
- Generert `docs/AUDIT_INVENTORY.md` fra hele `src`-treet.
- Inventaret fant 326 TypeScript/TSX-filer, 727 linjer i `GameBoard.tsx`, 78 rå `modify*`-kall, 51 klientleverte pris-/beløps-/tidsverdier og én E2E-fil med to smoke-tester.
- Lagt til host-resolverte handlinger for arbeid, studietimer, prepaid tuition og graduation.
- Fjernet `workShift`, `studySession`, `studyDegree` og `payFullTuition` fra gjestenes allowlist.
- Oppdatert Academy-, arbeids- og multiplayer-flytene og la til seks målrettede regresjonstester.
- Fjernet alle midlertidige workflow-, trigger-, patch- og valideringsfiler.

### Tester

- Dependency install, TypeScript, seks målrettede tester, full Vitest, build, ESLint og Playwright Chromium: bestått.

### Resultat

- Online-gjester kan ikke lenger velge egen arbeidslønn, skiftlengde, studiepris, studietid eller full tuition-verdi.
- PR #326 ble squash-merget til `main` som commit `3d01ad5556b6165cb0c39b1c3f1bcba6bdf06fdb`.

## Fase 5 – 23. juli 2026

### Mål

- Fjerne klientstyrt pris, matverdi, ferskmatmengde og ticket-type fra General Store og Shadow Market.
- Beholde eksisterende kataloger, rabatter, storage-regler og spillbalanse.

### Utført

- Opprettet arbeidsgren `agent/audit-phase5` og PR #327.
- Lagt til `purchaseVendorItem(playerId, vendor, itemId)`.
- Hosten slår opp katalog, economy modifier, vendor-rabatt, nok gull, mat-/happiness-effekt, ferskmatkapasitet, spoilage-flagg, lottery, weekend tickets og scholar items.
- Oppdatert General Store og Shadow Market til den canonical handlingen.
- Fjernet `buyFreshFood`, `buyFoodWithSpoilage`, `buyLotteryTicket` og `buyTicket` fra gjestenes allowlist.
- Begrenset Zustand-abonnementet i `ShadowMarketPanel`.
- Lagt til sju vendor-regresjonstester og oppdatert multiplayer-testen.
- Fjernet alle midlertidige workflow-, trigger-, resultat- og patchfiler.

### Tester

Valideringsrun `29996459512`: TypeScript, full Vitest, build, ESLint og Playwright Chromium bestått.

### Resultat

- En online-gjest kan ikke lenger diktere pris, matverdi, ferskmatmengde eller ticket-type ved vendor-kjøp.
- PR #327 ble squash-merget til `main` som commit `95cce81a2b8c5bb76d62e2282e78379c67649053`.

## Fase 6A – 23. juli 2026

### Mål

- Gjøre hele apparatlivsløpet host-autoritativt uten å endre breakage- og happiness-reglene.
- Skille apparater fra våpen/rustning fordi de bruker forskjellige pris-, reparasjons- og eierskapsregler.

### Utført

- Opprettet arbeidsgren `agent/audit-phase6-appliances` og draft-PR #328.
- Lagt til `purchaseAppliance(playerId, vendor, applianceId)` for Enchanter, Shadow Market og Fence.
- Lagt til `useApplianceService(playerId, service, applianceId)` for reparasjon hos Enchanter/Forge og pant/innløsning hos Fence.
- Hosten validerer vendor, canonical pris, source, duplicate ownership, Frost Chest-prerequisite, first-purchase happiness, repair cost/tid, pawn value, pawn record, utløpsfrist og redeem cost.
- Kjøp, reparasjon, pant og innløsning utføres atomisk med gull, tid, happiness og statistikk i samme state-transaksjon.
- Fence-kjøp trekker nå den ene timen som UI-et allerede viste; tidligere ble tiden vist, men ikke trukket.
- Oppdatert Enchanter-, Shadow Market-, Pawn Shop-, Forge- og Location-panelene.
- Fjernet `buyAppliance`, `repairAppliance`, `pawnAppliance`, `redeemAppliance` og `forgeRepairAppliance` fra gjestenes allowlist.
- Lagt til åtte apparat-regresjonstester og oppdatert begge multiplayer-testlistene.
- Rettet lokale variabelnavn slik at store-handlingen ikke mistolkes som en React-hook av ESLint.
- Fjernet alle midlertidige workflows, triggere, patchskript og diagnostikkfiler før merge.

### Tester

Endelig valideringsrun `29998119190`: dependency install, TypeScript, 398 av 398 Vitest-tester, build, ESLint og Playwright Chromium bestått.

### Resultat

- Online-gjester kan ikke lenger velge apparatpris, vendor source, reparasjonspris, reparasjonstid, pantverdi eller innløsningskostnad.
- Ødelagte apparater kan ikke lenger erstattes som et nytt kjøp; spilleren må bruke reparasjonstjenesten.
- PR #328 ble squash-merget til `main` som commit `f823af7e8f5e905a642e25379b4114d932173007`.

## Fase 6B – 23. juli 2026

### Mål

- Gjøre våpen, rustning, skjold, klær og Fence-bruktvarer host-autoritative.
- Flytte kjøpspris, tempereringskostnad, reparasjonskostnad, tidsbruk og salvage-verdi fra klienten til canonical data på hosten.
- Beholde AI-/lokal kompatibilitet mens gjeste-allowlisten strammes inn.

### Utført

- Opprettet arbeidsgren `agent/audit-phase6-equipment` og draft-PR #329 fra merge-commit `f823af7e8f5e905a642e25379b4114d932173007`.
- Lagt til `purchaseEquipmentItem(playerId, vendor, itemId, mode)` for Armory-klær, backup-outfit, våpen, rustning, skjold og Fence-bruktvarer.
- Lagt til `useEquipmentService(playerId, service, itemId)` for temperering, durability-reparasjon og salvage hos Forge.
- Hosten validerer katalog, vendor, lokasjon, economy modifier, canonical pris, dungeon-krav, gull, tid, slot, eierskap, durability, temperering og salvage-opprydding.
- Kjøp, temperering, reparasjon og salvage utføres atomisk med gull, tid, happiness, equipment state og statistikk i samme state-transaksjon.
- Oppdatert `ArmoryPanel`, `ForgePanel`, `PawnShopPanel`, `LocationPanel` og `locationTabs`.
- Fjernet `buyDurable`, `sellDurable`, `temperEquipment`, `forgeRepairEquipment` og `salvageEquipment` fra gjestenes allowlist.
- Fjernet døde Fence-callbacks og den gamle lokale gamblingtabellen.
- Lagt til ni målrettede regresjonstester og oppdatert begge multiplayer-testlistene.
- Fjernet alle midlertidige workflows, triggere, patchskript og valideringslogger før merge.

### Tester

- Dependency install, TypeScript, 9 av 9 målrettede tester, full Vitest, build, ESLint og Playwright Chromium: bestått.

### Resultat

- Online-gjester kan ikke lenger diktere Armory-pris, Fence-bruktvarepris/-effekt, tempereringskostnad, reparasjonskostnad, service-tid eller salvage-verdi.
- Salvage rydder korrekt opp equipped slot, durability og tempered state når siste eksemplar forsvinner.
- PR #329 ble squash-merget til `main` som commit `39d5935631e414b8643e446b9079c703c8fa5714`.

## Fase 7 – 23. juli 2026

### Mål

- Gjøre vanlig inventory-salg hos Fence host-autoritativt.
- Fjerne `buyItem` og `sellItem` fra gjestenes allowlist uten å ødelegge AI-salg eller quest-inventory.

### Utført

- Opprettet arbeidsgren `agent/audit-phase7-inventory` og draft-PR #330 fra fase 6B-merge `39d5935631e414b8643e446b9079c703c8fa5714`.
- Maskinell skanning fant ingen `buyItem`-kallere og bare to `sellItem`-kallere: Fence-UI-et og AI-handleren.
- Lagt til `sellInventoryItem(playerId, itemId)`.
- Hosten validerer Fence-lokasjon, inventory-eierskap og canonical salgspris.
- Ukjente quest-/legacy-items beholder kompatibilitetsverdien på minimum 5 gull.
- Salg fjerner ett matching inventory-eksemplar og oppdaterer `totalGoldEarned` atomisk.
- Oppdatert Fence-UI, location-kontekst og AI til å sende bare vare-ID.
- Fjernet `buyItem` og `sellItem` fra gjestenes allowlist og lagt til `sellInventoryItem`.
- Lagt til fem målrettede regresjonstester og oppdatert multiplayer-testene.
- Fjernet alle midlertidige workflows, triggere, skanneresultater, patchskript og valideringslogger før merge.

### Tester

GitHub Actions-run `30000990865`: dependency install, TypeScript, 5 av 5 målrettede tester, full Vitest, build, ESLint og Playwright Chromium bestått.

### Resultat

- Online-gjester og AI kan ikke lenger diktere salgspris for inventory-items.
- `buyItem` har ingen kallere og er ikke lenger gjestetillatt; funksjonen beholdes foreløpig internt for kompatibilitet.
- PR #330 ble squash-merget til `main` som commit `5d8f22a0adc5abbbc8ad73d8a12c35cabdb41307`.

## Fase 8 – 23. juli 2026

### Mål

- Gjøre leiebetaling, flytting og rent extension host-autoritativt.
- Flytte pris, locked rent og tidsbruk fra klienten til canonical host-regler.

### Utført

- Opprettet arbeidsgren `agent/audit-phase8-housing` og draft-PR #331 fra fase 7-merge `5d8f22a0adc5abbbc8ad73d8a12c35cabdb41307`.
- Maskinell skanning kartla Landlord-UI, store-laget, AI-handlerne og alle rent-feltene.
- Lagt til `payHousingRent(playerId, weeks)` med tillatte perioder 1, 4 eller 8 uker.
- Lagt til `moveHousingAtLandlord(playerId, tier)` og `requestRentExtensionAtLandlord(playerId)`.
- Hosten validerer:
  - at spilleren befinner seg hos Landlord,
  - at kontoret er åpent i rent week eller ved alvorlig restanse,
  - gyldig boligtype og at spilleren ikke allerede bor der,
  - canonical markedsleie eller eksisterende locked rent,
  - depositum/første betaling, gull og tidsbruk,
  - gyldig prepaid-periode,
  - rent-extension-krav, én bruk per syklus og dependability-basert sjanse.
- Leie, flytting og rent extension oppdaterer gull, tid, prepaid weeks, locked rent, overdue-status, happiness og statistikk atomisk.
- Oppdatert `LandlordPanel` til tre avgrensede Zustand-selectors og fjernet alle pris-/tids-callbacks.
- Oppdatert `locationTabs` og `LocationPanel` ved å fjerne legacy boligprops.
- Oppdatert AI-handlerne til de semantiske handlingene og fjernet `cost`, `rent` og separat `spendTime`.
- Rettet AI-ens rent affordability-sjekk til å bruke economy modifier når leien ikke er låst. Første patch traff feil destrukturering; statisk kontroll oppdaget dette før CI, og den målrettede rettelsen ble verifisert.
- Fjernet `setHousing`, `payRent`, `prepayRent`, `moveToHousing` og `begForMoreTime` fra gjestenes allowlist.
- Lagt til åtte målrettede bolig-regresjonstester og oppdatert multiplayer-testene.
- Fjernet alle midlertidige workflows, triggere, skanneresultater og patchskript før merge.

### Tester

GitHub Actions-run `30002093672`:

- Dependency install: bestått.
- TypeScript: bestått.
- Målrettede boligtester: bestått, 8 av 8.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

### Resultat

- Online-gjester og AI kan ikke lenger velge leiepris, totalbeløp, locked rent, flyttekostnad eller service-tid.
- AI-downgrade bruker nå samme canonical flyttekostnad som menneskespilleren i stedet for gratis flytting.
- PR #331 ble squash-merget til `main` som commit `efc766a56213552e580ada737c5d64bdbb7b760b`.

## Fase 9 – 23. juli 2026

### Mål

- Gjøre scrollkjøp, hex-forsvar og Graveyard dark-magic-tjenester host-autoritative.
- Beholde den eksisterende host-validerte casting-logikken.

### Utført

- Opprettet arbeidsgren `agent/audit-phase9-hex` fra fase 8-merge `efc766a56213552e580ada737c5d64bdbb7b760b`.
- Maskinell skanning kartla alle klientprisede hex-kall, AI-kostfelt og whole-store-abonnementer.

### Pågår

- Innføring av semantiske shop-, defense- og Graveyard-tjenester og migrering av UI/AI.

### Tester

- Ikke kjørt ennå i fase 9.
