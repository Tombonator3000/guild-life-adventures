# Fase 14B – AI-ressurskjøp

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase14b-ai-resources` og PR #344 ble opprettet fra fase 14A-merge `bb8ee72b0ff8363674ff2b50dc479779e7e33983`.

## Mål

- Flytte AI-ens mat-, klær-, ferskmat-, billett- og lotterikjøp til de samme canonical katalogene som menneske-UI bruker.
- Beholde AI-ens historiske shoppingkostnad på én time uten å la AI-details styre pris eller effekt.

## Utført

- Lagt til intern `purchaseAIResourceItem(playerId, vendor, itemId)` som delegerer til canonical General Store-/Shadow Market-, Tavern- og Armory-services og trekker én time bare etter et vellykket kjøp.
- Migrerte AI-mat ved General Store til `cheese`, ved Rusty Tankard til `stew` og ved Shadow Market til `mystery-meat`. Falske `cost`/`foodGain`-detaljer ignoreres.
- Migrerte klær til Armory-katalogen. AI velger canonical vare-ID fra ønsket clothing-nivå, mens hosten bestemmer pris, faktisk condition og purchase happiness.
- Rettet et gammelt generatoravvik der AI kunne forsøke å kjøpe klær ved General Store. AI reiser nå alltid til Armory for klær.
- Migrerte ferskmat til General Store-katalogen og rettet et gammelt avvik der AI også kunne forsøke kjøpet ved Shadow Market.
- Migrerte bard-concert-, theatre- og jousting-billetter til Shadow Market-katalogen.
- Migrerte lotteribilletter til canonical vendor-service. Eksisterende særregel som tillater lotteri ved både General Store og Shadow Market er bevart.
- Fjernet `buyFoodWithSpoilage`, `buyFreshFood`, `buyTicket`, `buyLotteryTicket`, `modifyFood` og `modifyClothing` fra AI-ens `StoreActions`/Zustand-selector der de ikke lenger var nødvendige.
- Lagt til sju integrasjonstester som kjører gjennom `executeAIAction` og verifiserer canonical pris, rabatt, effekt, lagringsregler, shoppingtid og at avviste kjøp ikke koster tid.

## Tester

GitHub Actions-run `30078819942`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert sju nye ressurskatalogtester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- AI kan ikke lenger diktere pris eller effekt for mat, klær, ferskmat, billetter eller lotteri.
- Ressurskjøp følger de samme katalogene, rabattene og kapasitetsreglene som menneskespillere, mens AI-ens tidligere én-times shoppingkostnad er bevart.
- Neste AI-delfase er equipment/appliance, deretter dungeon auto-resolve.

Denne faseposten er opprettet separat fordi GitHub blokkerte den selvfjernende sluttworkflowen som skulle appendere posten til `docs/AUDIT_LOG.md`. Ingen fasehistorikk er overskrevet. Posten kan samles inn i hovedloggen ved neste redaksjonelle loggkonsolidering.