# Guild Life Adventures – revisjonslogg

Denne filen er den permanente loggen for feilretting, sikkerhetsarbeid, testdekning og ytelsesforbedringer. Hver arbeidsfase skal føre opp hva som ble undersøkt, hva som ble endret, hvilke tester som ble kjørt og hva som fortsatt gjenstår.

## Status på opprinnelig prioritert liste

| Nr. | Punkt | Status | Merknad |
|---:|---|---|---|
| 1 | Beskytte online spill mot sabotasje/misbruk | Ferdig hovedsakelig | Sabotasje, beskyttelse og tip-off er host-autoritative. |
| 2 | Host-autoritativ multiplayer | Ferdig for menneske-UI og gjesteprotokoll | Aktør-ID, tur, allowlist, argumentform og host-avslag valideres. Rå `spendTime`/`modify*` er fjernet fra gjesteprotokollen; menneske-UI bruker semantiske host-handlinger. |
| 3 | Full save/load-gjenoppretting | Ferdig | Brett-hexer og ukentlige nyheter gjenopprettes. |
| 4 | Save-migrering v10 | Ferdig | Normalisering og migreringstester er lagt til. |
| 5 | Sikre reputation unlocks | Ferdig | Kjøp valideres atomisk på hosten. |
| 6 | Atomiske handlinger | Ferdig for menneske-UI | Reise, hjem/hvile, Cave-rest, healer, Tavern, dungeon, gravplass, gambling, avis, jobb, utdanning, vendor-/inventory-/equipment-/appliance-/housing-/hex-/finance-flyter er host-resolverte. Interne AI-/developer-kompatibilitetslag gjenstår. |
| 7 | Hook-avhengigheter | Ferdig for kjente funn | AI-start, auto-end-turn, tastatur og zone-editor er rettet. |
| 8 | Playwright E2E | Ferdig grunnflyt | Tittel, setup og en faktisk spillflyt med bankhandling, save/load og ukeovergang er dekket. Protokollavvisninger er dekket med enhetstester mot host-kjeden. |
| 9 | Zustand-selectors | Delvis ferdig | Root, GameBoard og Grimwald AI bruker selectors/useShallow. Flere paneler er begrenset, men `LocationPanel` leser fortsatt hele store-objektet. |
| 10 | AI failed-action cache / utdanning | Ferdig | Cache-nøkkelen følger relevant spillerstatus og tillater retry etter tilstandsendring. |
| 11 | Dokumentasjon | Ferdig grunnlag | README, arkitektur, testing, multiplayer-sikkerhet, inventarrapport og denne revisjonsloggen er oppdatert. |
| 12 | Én pakkehåndterer | Ferdig | Bun er eneste pakkehåndterer; package-lock er fjernet. |
| 13 | PWA/cache-beslutning | Ferdig | Installerbar PWA uten applikasjons-cache for å unngå utdaterte deploy-filer. |
| 14 | Spillmoduser | Ferdig grunnlag | Quick, Standard, Adventure og Epic finnes. |

## Gjenstående prioritert rekkefølge

1. **Fortsett AI-konsolideringen.** Ressurs-, utstyrs-, appliance- og dungeon-auto-resolve-handlerne bruker fortsatt enkelte rå/legacy-funksjoner. Rest, healer, sykdom, arbeid, lønnsforsøk og utdanning er ferdig migrert.
2. **Begrens resterende store-abonnementer.** Start med `LocationPanel`, som fortsatt leser hele Zustand-storen.
3. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
4. **Rydd døde kompatibilitetslag.** Fjern rå numeriske legacy-funksjoner når AI- og Developer-kallere er migrert eller eksplisitt isolert.

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

- Opprettet arbeidsgren `agent/audit-phase9-hex` og draft-PR #332 fra fase 8-merge `efc766a56213552e580ada737c5d64bdbb7b760b`.
- Maskinell skanning kartla klientprisede hex-kall, AI-kostfelt, numeriske protokollregler og whole-store-abonnementer.
- Lagt til `purchaseHexScroll(playerId, vendor, hexId)` med canonical Enchanter-stock eller ukentlig Shadow Market-rotasjon.
- Lagt til `useHexDefense(playerId, service, targetLocation?)` for Protective Amulet og målrettet Dispel.
- Lagt til `useGraveyardHexService(playerId, service)` for Dark Ritual, Curse Reflection og Purification.
- Hosten validerer feature toggle, fysisk vendor/lokasjon, gjeldende stock, floor-prerequisites, canonical pris, gull, tid, amulet-eierskap, aktiv curse og valgt hostile location hex.
- Scrollkjøp, amulett og dispel oppdaterer gull, tid, inventory/hex-state og statistikk atomisk.
- Eksisterende `castLocationHex` og `castPersonalCurse` ble beholdt fordi de allerede validerer scroll-eierskap, mål, lokasjon, tid, cooldown og amulet på hosten.
- Rettet en funksjonell selvmotsigelse: Dispel Scroll ble solgt hos Enchanter, men krevde tidligere at spilleren sto på den hexede lokasjonen. Spilleren velger nå en faktisk hostile location hex hos Enchanter, og hosten fjerner kun den valgte hexen.
- Oppdatert `HexShopPanel` og `GraveyardHexPanel` til avgrensede Zustand-selectors.
- Oppdatert AI til å sende bare vendor + hex-ID, target location eller service; prisfelt og separate gull-/tidsmutasjoner er fjernet.
- AI reiser nå til Enchanter for remote dispel i stedet for å reise til den blokkerte lokasjonen.
- Fjernet `buyHexScroll`, `buyProtectiveAmulet`, `dispelLocationHex`, `cleanseCurse`, `performDarkRitual` og `attemptCurseReflection` fra gjestenes allowlist og fjernet de gamle numeriske protokollreglene.
- Lagt til ni målrettede hex-regresjonstester og oppdatert multiplayer-testene.
- ESLint-runden avdekket at lokale store-action-navn med `use` ble tolket som React-hooks. Lokale aliaser ble endret uten å endre API-et.
- Fjernet alle midlertidige workflows, triggere, skanneresultater, patchskript og valideringslogger før merge.

### Tester

GitHub Actions-run `30003787680`:

- Dependency install: bestått.
- TypeScript: bestått.
- Målrettede hex-tester: bestått, 9 av 9.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

### Resultat

- Online-gjester og AI kan ikke lenger velge scrollpris, defense-pris, ritualpris, rensepris, refleksjonspris eller separat tidsbruk.
- Hexcasting er fortsatt funksjonelt og bruker den eksisterende strengere host-valideringen.
- PR #332 ble squash-merget til `main` som commit `c0c23f013b82105f66cba6a3868ab966894a4ce7`.

## Fase 10 – 23. juli 2026

### Mål

- Gjøre bankoverføringer, investeringer, aksjehandel og lån host-autoritative.
- Skille frie, men strengt validerte brukerbeløp fra canonical priser og låneprodukter.

### Utført

- Opprettet arbeidsgren `agent/audit-phase10-finance` og draft-PR #333 fra fase 9-merge `c0c23f013b82105f66cba6a3868ab966894a4ce7`.
- Maskinell skanning kartla Bank-UI, store-laget, AI-handlerne, nettverksallowlist, protokollregler og eksisterende økonomitester.
- Lagt til `transferBankFunds(playerId, direction, amount)` for eksakte innskudd og uttak.
- Lagt til `manageInvestment(playerId, service, amount)` med canonical 10 % early-withdrawal penalty.
- Lagt til `tradeStock(playerId, side, stockId, shares)` med live host-pris, gyldig aksje-ID, heltallsantall, eierskap og canonical Crown Bond-salgsgebyr.
- Lagt til `manageLoan(playerId, service, amount)` med bankens fire canonical låneprodukter 100/250/500/1000 gull, jobbhistorikk, ett lån av gangen og eksakt tilbakebetaling.
- Alle finanshandlingene krever fysisk Bank-lokasjon og avviser desimaler, negative tall, overdrafts, ugyldige produkter og beløp over sikker grense i stedet for å clampes stille.
- Oppdatert `BankPanel` fra seks action-props til fire avgrensede Zustand-selectors og resultatbaserte toast-meldinger.
- Gjorde den eksisterende investment-mekanikken synlig i Bank-panelet med invester/uttak-knapper; avkastnings- og straffereglene ble ikke endret.
- Oppdatert `locationTabs` og `LocationPanel` ved å fjerne åtte legacy finansprops.
- Oppdatert AI til de semantiske handlingene. AI sender ikke lenger aksjepris, og forecast-lån rundes opp til nærmeste gyldige låneprodukt.
- Fjernet `depositToBank`, `withdrawFromBank`, `invest`, `withdrawInvestment`, `buyStock`, `sellStock`, `takeLoan` og `repayLoan` fra gjestenes allowlist.
- Lagt til ni målrettede finansregresjonstester og oppdatert multiplayer-/actor-validation-testene.
- Første lint-runde fant én `prefer-const`-feil i den nye testfilen. Den ble rettet uten endring av spillkode.
- Fjernet alle midlertidige workflows, triggere, skanneresultater, patchskript og valideringslogger før merge.

### Tester

GitHub Actions-run `30005423775`:

- Dependency install: bestått.
- TypeScript: bestått.
- Målrettede finanstester: bestått, 9 av 9.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

### Resultat

- Online-gjester og AI kan ikke lenger diktere saldooverføringer uten dekning, aksjepris, aksjegebyr, låneprodukt eller tilbakebetalingsbeløp utover faktisk gjeld/kontanter.
- De store klientprisede økonomihandlingene fra den opprinnelige revisjonen er nå migrert.
- PR #333 ble squash-merget til `main` som commit `75d1b4f227df4ae694c0b83641be26d5238ea8dc`.

## Fase 11 – 24. juli 2026

### Mål

- Utvide Playwright fra title/setup-smoke til en faktisk spillbar ende-til-ende-flyt.
- Verifisere at bankhandling, manuell lagring, state-mutasjon, innlasting og ukeovergang fungerer uten runtime-feil.

### Utført

- Opprettet arbeidsgren `agent/audit-phase11-e2e` og draft-PR #334 fra fase 10-merge `75d1b4f227df4ae694c0b83641be26d5238ea8dc`.
- Lagt til `e2e/gameplay.spec.ts`, som oppretter en énspiller gjennom den faktiske setup-UI-en, slår av tutorial og starter eventyret.
- Testen reiser direkte til Bank via kartet, setter inn 50 gull gjennom den host-autoritative finanshandlingen og verifiserer at uttak blir tilgjengelig.
- Testen lagrer eksplisitt til `Save Slot 1`, tar ut de 50 gullene for å mutere state, laster den manuelle lagringen og verifiserer at `Savings 50g` gjenopprettes.
- Testen avslutter turen gjennom den synlige `End Turn`-knappen og verifiserer overgang til uke 2.
- Testen samler `pageerror`-hendelser og feiler dersom nettleseren rapporterer en ukontrollert runtime-feil.
- Første Chromium-runde avdekket utdaterte setup-selektorer (`Start Local Game`, spillerantallsknapp, gammelt navn-/tutorial-felt). Testen ble oppdatert til dagens `New Adventure`-flyt.
- Andre Chromium-runde avdekket at kartklikk allerede utfører reisen direkte; den ikke-eksisterende mellomknappen `Travel to Bank` ble fjernet fra testen.
- Tredje Chromium-runde bekreftet at save/load gjenopprettet 50 gull i savings, men at innlasting korrekt lukker lokasjonspanelet. Kontrollen ble flyttet fra en Bank-knapp til den persistente `Finances`-seksjonen.
- Ingen midlertidige valideringslogger eller testartefakter er lagt til i repository-diffen.

### Tester

Endelig GitHub Actions-run `30049006317`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Eksisterende title/setup-smoketester: bestått.
- Ny komplett spillflyt med bank, save/load og ukeovergang: bestått.

### Resultat

- En reell lokal spilløkt er nå dekket fra tittelskjerm til uke 2.
- Save/load er verifisert gjennom brukergrensesnittet, ikke bare gjennom store-enhetstester.
- PR #334 ble squash-merget til `main` som commit `2f73636e08f702e770c4879520e81d3734831996`.

## Fase 12 – 24. juli 2026

### Mål

- Teste den faktiske host-mottakerkjeden mot manipulerte gjestemeldinger.
- Avvise feil tur, spoofet spiller-ID, disallowed actions, ugyldig vendor/service, ukjent vare og manipulerte numeriske verdier.
- Sikre at et autoritativt store-avslag rapporteres som avslag til gjesten.

### Utført

- Opprettet arbeidsgren `agent/audit-phase12-protocol-security` og draft-PR #335 fra fase 11-merge `2f73636e08f702e770c4879520e81d3734831996`.
- Flyttet turn-, allowlist-, actor- og argumentvalidering ut av `useNetworkSync` til rene funksjoner i `actionValidation.ts`.
- `processGuestActionRequest` brukes nå både av host-hooken og regresjonstestene, slik at testene dekker samme beslutningskjede som produksjonskoden.
- Lagt til eksplisitt validering av:
  - negativ, desimal eller overdreven tidsbruk,
  - ukjent destinasjon og manipulert reisepris,
  - ugyldige vendor-, service- og mode-enums,
  - ikke-canonical låneprodukt,
  - desimaler og ugyldige finansbeløp,
  - rå statsmutasjoner utenfor sikkerhetsgrensene.
- Oppdaget og rettet en protokollfeil i `executeAction`: funksjonen rapporterte tidligere `true` når en store-handling returnerte `{ success: false }`, så lenge den ikke kastet exception.
- `executeAction` propagerer nå både boolean `false` og `ActionResult.success` korrekt.
- Ukjent vendor-vare og ukjent aksje-ID blir nå korrekt sendt tilbake som `Action failed` uten state-endring.
- Lagt til åtte protokolltester som dekker feil tur, host/local-only actions, actor spoofing, negative timer, gratis/ukjent reise, ugyldige enums, manipulerte verdier, host-avslag og gyldig kontrollhandling.
- Fjernet midlertidig patch-workflow og patchskript før merge.

### Tester

GitHub Actions-run `30049975906`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert åtte nye protokolltester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og komplett lokal spillflyt: bestått.

### Resultat

- En gjest kan ikke lenger få ekstra tid med negative timer, flytte gratis eller bruke en oppdiktet destinasjon/reisepris.
- Feil spiller, feil tur, disallowed actions og ugyldige servicevalg stoppes før store-dispatch.
- Semantiske host-avslag rapporteres korrekt til gjesten i stedet for som falsk suksess.
- Rå legacy-handlinger er fortsatt gjestetillatt innenfor validerte grenser og står først på neste migreringsliste.
- PR #335 ble squash-merget til `main` som commit `f62c2a2a9a123eb1feb205131b2bbb49c2f02167`.

## Fase 13A – 24. juli 2026

### Mål

- Fjerne rå `setJob(playerId, jobId, wage)` og `negotiateRaise(playerId, wage)` fra gjestenes protokoll.
- La hosten beregne jobbkrav, stillingseksklusivitet og ukens deterministiske markedslønn.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13-raw-guest-actions` og draft-PR #336 fra fase 12-merge `f62c2a2a9a123eb1feb205131b2bbb49c2f02167`.
- Kjørte en ny maskinell skanning av dagens rå UI-/AI-kallere etter fase 4–12.
- Lagt til `acceptJobOffer(playerId, jobId)`, der hosten kontrollerer Guild Hall-lokasjon, gyldig jobb, utdanning, klær, erfaring, dependability og eksklusivitet for stillinger over karrierenivå 2.
- Hosten beregner tilbudt lønn med den eksisterende deterministiske funksjonen basert på jobb, economy modifier og uke.
- Lagt til `acceptMarketRaise(playerId)`, der hosten slår opp nåværende jobb og setter nøyaktig canonical markedslønn bare dersom den faktisk er høyere.
- Guild Hall-panelet sender nå bare jobb-ID eller lønnsøkning-intensjon; klientberegnet lønn brukes kun til visning.
- AI sender nå bare jobb-ID og bruker samme host-handling som menneskespilleren. Separat klientstyrt søknadstid er fjernet.
- Fjernet `setJob` og `negotiateRaise` fra gjestenes allowlist. Legacy-funksjonene beholdes internt inntil alle kompatibilitetslag kan ryddes samlet.
- Lagt til sju regresjonstester for canonical lønn, feil lokasjon, manglende kvalifikasjoner, opptatt høy stilling, delt entry-level-stilling, canonical market raise og allowlist.
- Fjernet alle midlertidige skanne-, workflow-, trigger- og patchfiler før merge.

### Tester

GitHub Actions-run `30050832605`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert sju nye jobbtilbudstester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og komplett lokal spillflyt: bestått.

### Resultat

- En online-gjest eller AI kan ikke lenger velge egen startlønn eller markedslønnsøkning.
- Hosten håndhever kvalifikasjoner og eksklusivitet selv om UI- eller AI-forhåndskontrollen manipuleres.
- De neste rå høyrisikogruppene er `spendTime` og `modify*`.
- PR #336 ble squash-merget til `main` som commit `ae6e1300070ccd2ffa7a27860fefc9e203081172`.

## Fase 13B – 24. juli 2026

### Mål

- Fjerne rå `movePlayer(playerId, destination, timeCost)` fra gjestenes protokoll.
- Beholde vanlig, delvis og omdirigert kartanimasjon, men la hosten validere den faktiske ruten og beregne kostnaden.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13b-travel` og draft-PR #337 fra fase 13A-merge `ae6e1300070ccd2ffa7a27860fefc9e203081172`.
- Lagt til `travelPlayer(playerId, route)`, der hosten validerer at ruten starter ved spillerens autoritative posisjon, bare inneholder kjente brettlokasjoner og består av gyldige nabosteg.
- Hosten beregner tidskostnaden fra faktisk antall rutesteg og gjeldende vær; klienten sender ikke lenger `timeCost`.
- Ruter er begrenset til maksimalt én lokasjon per tilgjengelig turntime for å avvise urimelig store payloads.
- Eksisterende interne `movePlayer` beholdes som én implementasjon av posisjonsendring, ran og reise-/lokasjonseventer, men er fjernet fra gjestenes allowlist.
- `usePlayerAnimation` akkumulerer nå full faktisk rute ved omdirigering midt i animasjonen. Dette retter samtidig en fase-12-regresjon der en omdirigert rute kunne bli avvist fordi den var lengre enn korteste vei.
- Direkte reise fra LocationPanel bruker samme route-intent og viser værjustert kostnad. Delvis reise velger bare så mange steg hostens værkostnad tillater.
- AI bruker samme route-intent, men beholder bevegelsesbroadcast og visuell tokenanimasjon.
- Oppdaterte protokoll- og multiplayer-forventningene: `travelPlayer` er tillatt, `movePlayer` er blokkert.
- Lagt til sju rutetester for canonical kostnad, vær, feil start, ukjent/ikke-nabo-steg, omdirigert lang rute, for lite tid og allowlist.
- En for bred mellomoppdatering av `multiplayer.test.ts` ble oppdaget av CI. Originalfilen ble gjenopprettet fra `main`, og bare de to nødvendige reiseforventningene ble påført.
- Playwrights første sluttforsøk avdekket testflakiness: en tilfeldig Shadowfingers-hendelse kunne stjele alt gull på bankreisen og skjule banktjenestene. E2E-testen fryser nå sannsynlighetskast før appstart, slik at den tester bank/save/load-flyten deterministisk uten å slå av hendelser i produktkoden.
- Fjernet alle midlertidige workflow-, trigger-, resultat- og patchfiler før merge.

### Tester

- Fokuspakke etter testrestaurering: 59 av 59 tester bestått (sju reise, åtte protokoll og 44 multiplayer).
- Full sluttvalidering i GitHub Actions-run `30052162170`:
  - Dependency install: bestått.
  - TypeScript: bestått.
  - Full Vitest-pakke: bestått.
  - Produksjonsbuild: bestått.
  - ESLint: bestått.
  - Playwright-runner og Chromium-installasjon: bestått.
  - Title/setup-smoke og komplett lokal spillflyt: bestått.
- Ren PR-validering etter deterministic E2E-retting og artefaktrydding: GitHub Actions-run `30052428663`, alle steg bestått uten retry-artefakter.

### Resultat

- En online-gjest kan ikke lenger diktere reisetid eller teleportere med et manipulert prisargument.
- Hosten priser den faktiske animerte ruten, inkludert gyldige omdirigeringer og vær.
- Neste rå høyrisikogruppe er `spendTime` og de gjenværende `modify*`-handlingene.
- PR #337 ble squash-merget til `main` som commit `3469429ae20787c23cec04ff463831a094ebc662`.

## Fase 13C – 24. juli 2026

### Mål

- Fjerne separate `spendTime`, `modifyHappiness`, `modifyHealth` og `modifyRelaxation`-kall fra den gjestestyrte Home-UI-en.
- Beholde eksisterende boligforskjeller og recovery-balanse, men bruke én atomisk host-handling.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13c-raw-effects` og draft-PR #338 fra fase 13B-merge `3469429ae20787c23cec04ff463831a094ebc662`.
- Kjørte en ny maskinell skanning av alle gjenværende `spendTime`, `modify*` og `cureSickness`-kallere etter fase 13B.
- Skanningen grupperte de gjenværende rå flytene i hjem, tavern/healer, dungeon og enkelte interne AI-/developerbaner.
- Lagt til `performHomeActivity(playerId, activity)`, der gjesten bare sender `relax` eller `sleep`.
- Hosten kontrollerer at spilleren faktisk leier boligen og står ved riktig hjemmelokasjon.
- Slums-relax bruker canonical 8 timer; Noble Heights-relax bruker canonical 3 timer. Sleep bruker 8 timer.
- Hosten anvender alle tids-, happiness-, health- og relaxation-effekter i én state-oppdatering med eksisterende caps.
- HomePanel mottar ikke lenger rå tid-/stat-callbacks fra LocationPanel.
- Lagt til eksplisitt protokollvalidering av aktivitetstypen og registrert `performHomeActivity` i gjestenes allowlist.
- Lagt til seks regresjonstester for Slums/Noble-tid, capped sleep-recovery, feil hjem, homeless/for lite tid og protokoll-enum.
- Interne AI-reservebaner ble ikke endret i denne delfasen for å unngå en samtidig balanseendring; de står fortsatt på migreringslisten.
- Fjernet alle midlertidige skanne-, workflow-, trigger- og patchfiler før merge.

### Tester

GitHub Actions-run `30052983382`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert seks nye hjemmetester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

### Resultat

- En online-gjest kan ikke lenger velge egen hviletid eller separate home-recovery-effekter.
- Hjemmeaktivitetene er atomiske og bruker samme authoritative state for bolig, lokasjon, tid og caps.
- Neste rå gjestedomene er tavern/healer og dungeon.
- PR #338 ble squash-merget til `main` som commit `b7f492f674bcc1e92bcda3fb443e40e4cd3f2b69`.

## Fase 13D – 24. juli 2026

### Mål

- Fullføre Healer-migreringen ved å fjerne døde rå gold/time/health-callbacker fra UI-kjeden.
- Blokkere direkte gjestekall til `cureSickness` og bruke den eksisterende canonical `useHealerService`-handlingen som eneste nettverksinngang.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13d-tavern-healer` og draft-PR #339 fra fase 13C-merge `b7f492f674bcc1e92bcda3fb443e40e4cd3f2b69`.
- Bekreftet at store-laget allerede hadde en korrekt host-autoritativ `useHealerService(playerId, serviceId)` med canonical pris, tid, lokasjon, sickness-, health- og max-health-regler.
- Oppdaget at HealerPanel allerede kalte canonical service direkte, men fortsatt deklarerte gamle callback-props, mens LocationTabs fortsatt sendte separate `modifyGold`, `modifyHealth`, `spendTime`, `cureSickness` og `modifyMaxHealth`-callbacks.
- Fjernet alle døde healer-callbacker fra HealerPanel og LocationTabs. Pris- og effektberegninger i panelet brukes nå kun til visning og disabled-state.
- Fjernet `cureSickness` fra gjestenes allowlist. Legacy-funksjonen beholdes internt for eldre AI-/lokalkallere inntil de migreres i en egen fase.
- Oppdatert multiplayer-forventningene slik at `useHealerService` er tillatt og direkte `cureSickness` er blokkert.
- Lagt til seks regresjonstester for economy-justert healing, faste cure/blessing-priser, feil lokasjon, unødvendig behandling, manglende gull/tid og protokoll-/allowlist-regler.
- Fjernet alle midlertidige workflow-, trigger- og patchfiler før merge.

### Tester

GitHub Actions-run `30053545732`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert seks nye healer-tester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

### Resultat

- En online-gjest kan ikke lenger kurere sykdom direkte eller kombinere klientvalgt pris, tid og helseeffekt.
- Healer-UI og host bruker nå én canonical serviceinngang.
- Neste rå gjestedomene er Tavern og dungeon.
- PR #339 ble squash-merget til `main` som commit `cb2a518034e9581b7b96d4cda2ec038878a87c74`.

## Fase 13E – 24. juli 2026

### Mål

- Fjerne separate klientstyrte gull-, mat-, humør- og helsekall fra Tavern.
- Flytte øl-/slagsmålstelleren fra lokal React-state til hostens Player-state, slik at risikoen ikke kan nullstilles ved å lukke panelet.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13e-tavern` og draft-PR #340 fra fase 13D-merge `cb2a518034e9581b7b96d4cda2ec038878a87c74`.
- Lagt til `purchaseTavernItem(playerId, itemId)`, der gjesten bare sender vare-ID.
- Hosten validerer Rusty Tankard-lokasjon, canonical Tavern-katalog, gjeldende economy-pris og tilgjengelig gull.
- Hosten anvender mat- eller happiness-effekten med eksisterende caps og registrerer gold spent atomisk.
- Flyttet øltelleren fra TavernPanels lokale `useState` til `Player.tavernAlesDrunkThisTurn`.
- Lagt til feltet ved spilleropprettelse, save-normalisering og turn-/ukereset, slik at gamle lagringer backfilles og risikoen nullstilles på riktig tidspunkt.
- Etter sjette øl ruller hosten 35 % brawl-sjanse, 5–15 skade og canonical eventmelding. Klienten kan ikke velge skade eller nullstille telleren ved panelbytte.
- TavernPanel sender ikke lenger `modifyGold`, `modifyFood`, `modifyHappiness`, `modifyHealth`, `spendTime` eller `setEventMessage`-callbacker.
- Registrert `purchaseTavernItem` i gjestenes allowlist og lagt til eksplisitt strengvalidering av vare-ID.
- Lagt til seks regresjonstester for canonical pris/food cap, avviste kjøp, persistent ølteller, tvunget brawl, turn-reset, save-backfill og protokollvalidering.
- Fjernet alle midlertidige skanne-, workflow-, trigger- og patchfiler før merge.

### Tester

GitHub Actions-run `30073493988`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert seks nye Tavern-tester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

### Resultat

- En online-gjest kan ikke lenger diktere Tavern-pris eller separate mat-, humør- og helseeffekter.
- Brawl-risikoen er host-eid, lagringskompatibel og kan ikke omgås ved å åpne panelet på nytt.
- Neste rå gjestedomene er dungeon og øvrige `modify*`/`spendTime`-flyter.
- PR #340 ble squash-merget til `main` som commit `4732b2f0636c9fda47a0fa1c7102ddfe8603ee7b`.

## Fase 13F – 24. juli 2026

### Mål

- Fjerne klientstyrt dungeon-tid, skade, gull, humør, durability, floor clear og drops fra den interaktive kampflyten.
- Beholde encounter-for-encounter-UI-et, men flytte hele kampens state-maskin og tilfeldighetskast til hosten.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13f-dungeon` og draft-PR #341 fra fase 13E-merge `4732b2f0636c9fda47a0fa1c7102ddfe8603ee7b`.
- Kartleggingen avdekket at `CombatView` tidligere genererte encounters, modifier, block, potion, rare drop og hex drop med klientens `Math.random()`, mens `CavePanel` etterpå sendte separate gull-, helse-, humør-, durability- og progresjonskall.
- Lagt til en serialiserbar `DungeonRunSession` og fire semantiske handlinger: `beginDungeonRun`, `resolveDungeonEncounter`, `advanceDungeonRun` og `finalizeDungeonRun`.
- Hosten validerer Cave-lokasjon, floor-ID, degree-/equipmentkrav, attempt-grense, helse og canonical encounter-tid før en run opprettes.
- Encounterliste, modifier, kampstats, education bonuses og utstyr-ID-er snapshots på hosten ved start.
- Hosten ruller og anvender all encounter-skade/healing, block, potion, loot og drops. Klienten sender bare valg som fight, continue, skip healing, retreat, leave og finish.
- Gold, happiness, dungeon record, first clear, dependability/fame, rare drop, hex scroll og durability settlement bruker bare host-sessionen.
- Durability påføres utstyret som var snapshot ved run-start. Et testet mid-run gear-swap kan derfor ikke flytte slitasjen til et annet våpen.
- Aktive dungeon-sessions synkroniseres til gjester gjennom vanlig state-sync, slik at panelet kan lukkes og åpnes uten å miste eller regenerere kampen.
- End turn og manuell save blokkeres mens en session er aktiv. Sessions er transiente og gjenopprettes ikke fra save-filer.
- `CombatView` er nå en ren presentasjon av hostens run-state og inneholder ingen lokal kampresolver eller lokal randomness.
- Fjernet rå `incrementDungeonAttempts` og `applyDurabilityLoss` fra gjestenes allowlist og fjernet alle rå dungeon-callbacker fra CavePanel/LocationTabs.
- AI-ens auto-resolve er allerede en host/lokal intern bane og var ikke en gjesteangrepsflate; den beholdes foreløpig, men står på listen for senere samling med samme service-lag.
- Lagt til sju regresjonstester for canonical inngangstid/attempt, avviste innganger, host-resolved encounter, continue-tid, prematur settlement/end-turn-flukt, gear-swap-sikker settlement og protokoll/state-sync.
- Fjernet alle midlertidige workflow-, trigger- og patchfiler før merge.

### Tester

GitHub Actions-run `30074836980`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert sju nye dungeon-sessiontester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

### Resultat

- En online-gjest kan ikke lenger generere sitt eget dungeon-resultat eller sende ønsket tid, skade, loot, durability eller drops.
- Interaktiv dungeon er en host-eid, synkronisert state-maskin med canonical settlement.
- Neste sikkerhetsarbeid er å migrere de gjenværende generelle `modify*`/`spendTime`-flytene og deretter samle interne AI-reservebaner.
- PR #341 ble squash-merget til `main` som commit `5b19ae43a58bd308744535a9e201ed6f39b39171`.

## Fase 13G – 24. juli 2026

### Mål

- Fjerne hele den rå `spendTime`/`modify*`-gruppen fra online-gjestenes protokoll.
- Migrere de siste menneskestyrte UI-kallerne til semantiske host-handlinger uten å endre eksisterende spillbalanse.

### Utført

- Opprettet arbeidsgren `agent/audit-phase13g-remaining-raw` og draft-PR #342 fra fase 13F-merge `5b19ae43a58bd308744535a9e201ed6f39b39171`.
- Den første maskinelle skanningen ga feilaktig null funn fordi runneren manglet `rg` og kommandoen var beskyttet av `|| true`. Skanneren ble omskrevet i ren Python og kjørt på nytt før noen konklusjon ble trukket.
- Den korrigerte skanningen fant tre gjenværende menneske-UI-domener: Cave-rest, avis ved General Store/Shadow Market og døde Graveyard-callbacker.
- Oppdaget samtidig en skjult kodefeil etter dungeon-migreringen: CavePanels Rest-knapp refererte til frie `spendTime`, `modifyHealth` og `modifyHappiness`-navn som ikke lenger var props. Bundleren aksepterte dem som globale identifikatorer, men knappen ville feilet ved bruk.
- Lagt til `performCaveRest(playerId)`. Hosten validerer Cave-lokasjon, ingen aktiv dungeon-session, minst åtte timer og manglende helse, og anvender canonical åtte timer, inntil 15 healing og +1 happiness atomisk.
- Begge avis-knappene bruker nå eksisterende `purchaseNewspaper(playerId, vendor)`, slik at hosten beregner pris, lokasjon og eierskap. Klienten genererer bare visningsinnholdet etter vellykket kjøp.
- Fjernet døde `onPray`, `onMourn` og `onBlessMaxHealth`-props fra GraveyardPanel/LocationTabs. Panelet brukte allerede canonical `useGraveyardService` direkte.
- Fjernet `spendTime`, `modifyGold`, `modifyHealth`, `modifyHappiness`, `modifyFood`, `modifyClothing`, `modifyMaxHealth` og `modifyRelaxation` fra `ALLOWED_GUEST_ACTIONS`.
- Fjernet de foreldede numeriske `STAT_MODIFIER_RULES` og rå `spendTime`-valideringen. Direkte rå kall avvises nå ved allowlist-porten som `Action not allowed`.
- Oppdaterte protokoll- og multiplayer-testene slik at den nye invarianten er eksplisitt: rå tid-/statshandlinger er aldri gjestetillatt.
- Lagt til fem Cave-rest-/protokolltester for canonical effekter, health cap, avviste tilstander, aktiv dungeon-session og blokkering av samtlige rå handlinger.
- Sluttskanningen bekrefter at ingen vanlig menneske-UI-kode bruker rå `modify*`/`spendTime`. Gjenværende kall finnes bare i DeveloperTab og interne AI-handlerbaner, som ikke er gjestetillatt.
- En gammel multiplayer-test krevde fortsatt at rå statshandlinger skulle stå i whitelisten. Diagnosen viste én feil og 489 beståtte tester; testen ble erstattet med den motsatte sikkerhetsinvarianten uten å redusere øvrig testdekning.
- Fjernet alle midlertidige skanne-, diagnose-, workflow-, trigger-, resultat- og patchfiler før merge.

### Tester

GitHub Actions-run `30076482644`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert fem nye Cave-rest-/protokolltester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

### Resultat

- Online-gjester har ikke lenger noen generell inngang for å sende egen tidsbruk, gullendring, skade, healing, mat, clothing, max-health, happiness eller relaxation.
- Alle menneskestyrte handlinger som påvirker disse verdiene går gjennom navngitte host-services med canonical regler.
- Den gjenværende rå koden er isolert til lokale Developer-verktøy og interne AI-reservebaner.
- Neste fase er å samle AI-reservebanene på de samme semantiske servicehandlingene og deretter begrense `LocationPanel` sitt Zustand-abonnement.
- PR #342 ble squash-merget til `main` som commit `817eee595ced0cec11c612fedf238d20c5083158`.

## Fase 14A – 24. juli 2026

### Mål

- Samle AI-ens kjernehandlinger på de samme canonical servicehandlingene som menneske-UI bruker.
- Beholde AI-ens beslutningslogikk og prioriteringer, men fjerne duplisert pris-, tids-, lønns- og effektlogikk fra utførelseslaget.

### Utført

- Opprettet arbeidsgren `agent/audit-phase14a-ai-services` og draft-PR #343 fra fase 13G-merge `817eee595ced0cec11c612fedf238d20c5083158`.
- Kjørte en Python-basert kallerskanning for `rest`, `heal`, `cure-sickness`, `work`, `study`, `graduate` og `request-raise`, inkludert generatorer, handlers, UI, store og tester.
- Migrerte AI-rest til `performHomeActivity(playerId, 'relax')`. AI-sendt `hours`, `happinessGain` og `relaxGain` påvirker ikke lenger state.
- Migrerte healing og sykdomskur til `useHealerService(playerId, 'minor' | 'cure')`.
- Justerte helse-generatorens forhåndskontroll fra hardkodet 30g til canonical Minor Healing-pris `round(25 * priceModifier)`.
- Dette fjerner en gammel AI-spesialregel på 30g/2t. AI bruker nå samme Minor Healing som spilleren: 25g før economy-modifier, én time og 25 HP.
- Migrerte arbeid til `performWorkShift(playerId, 'full')`, slik at host-staten bestemmer jobb, lokasjon, skiftlengde og gjeldende lønn selv om AI-details manipuleres.
- Migrerte studier til `attendDegreeSession(playerId, degreeId, 'standard')`, slik at Academy-lokasjon, pris, timer, prerequisites, prepaid tuition og progresjon løses canonical.
- Migrerte graduation til `graduateDegree(playerId, degreeId)`.
- Lønnskartleggingen fant at den eksisterende `requestRaise` også brukes i menneske-UI uten tidskostnad, mens AI historisk betalte én time. For å bevare denne balanseforskjellen ble `attemptWorkplaceRaise(playerId)` lagt til som intern semantisk AI-wrapper.
- `attemptWorkplaceRaise` validerer faktisk arbeidssted og minst én time, kjører eksisterende raise-regler og trekker én time etter et gyldig forsøk, også ved avslag. Feil arbeidssted eller manglende tid koster ingenting.
- Fjernet `workShift`, `studyDegree`, `completeDegree`, `cureSickness` og `requestRaise` fra AI-ens `StoreActions`/Zustand-selector og erstattet dem med de canonical referansene.
- AI-generatorenes handlingstyper, prioriteter, ruteforslag og failed-action-logikk ble ikke endret.
- Lagt til åtte integrasjonstester mot den virkelige storen. Testene sender bevisst falske `cost`, `hours`, `wage`, `healAmount`, `happinessGain` og `relaxGain` og bekrefter at hostens katalog/state vinner.
- Ressurs-, utstyrs-, appliance- og dungeon-auto-resolve-handlerne ble bevisst holdt utenfor denne delfasen fordi de krever egne katalog- og kampvalg.
- Fjernet alle midlertidige skanne-, workflow-, trigger- og patchfiler før merge.

### Tester

GitHub Actions-run `30077964760`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert åtte nye AI-serviceintegrasjonstester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

### Resultat

- AI kan ikke lenger bruke egne numeriske effektdata for rest, healer, sykdom, arbeid eller utdanning.
- Kjernehandlingene følger samme canonical regler som menneskespillere, og AI-ens eksisterende lønnsforsøk beholder sin tidligere tidskostnad.
- Neste AI-delfase er ressurs- og katalogkjøp, deretter equipment/appliance og dungeon auto-resolve.
- PR #343 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.
