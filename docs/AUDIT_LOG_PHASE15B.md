# Fase 15B – redusert reaktiv LocationTabContext

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase15b-location-context` og PR #349 ble opprettet fra fase 15A-merge `f7dff19634a086fc93a9ee91a879cf32973f7cb3`.

## Mål

- Redusere `LocationPanel` sin reaktive actionflate ytterligere etter at whole-store-abonnementet var fjernet.
- Kartlegge hvilke legacy-felt i `LocationTabContext` som faktisk ikke leses av noen tab-fabrikk.

## Funn

- General Store kjøper avis gjennom sin egen `purchaseNewspaper`-selector. `LocationPanel.handleBuyNewspaper` og `onBuyNewspaper` var derfor helt døde.
- Tab-implementasjonen leser ikke de rå `modifyGold`, `modifyHappiness`, `modifyHealth`, `modifyFood`, `modifyClothing`, `modifyMaxHealth`, `modifyRelaxation` eller `spendTime`-callbackene.
- Tab-implementasjonen leser heller ikke `completeLocationObjective`, `clearDungeonFloor`, `applyRareDrop`, `purchaseVendorItem`, `cureSickness` eller `setEventMessage` fra context.
- `completeLocationObjective` brukes fortsatt av quest-banneret i selve `LocationPanel`, og må derfor være valgt i panelets selector selv om det ikke sendes videre til tab-fabrikkene.

## Utført

- Fjernet 14 obsolete actionreferanser fra den reaktive `useShallow`-selectoren: `purchaseNewspaper`, sju `modify*`-actions, `spendTime`, `clearDungeonFloor`, `applyRareDrop`, `purchaseVendorItem`, `cureSickness` og `setEventMessage`.
- Fjernet 15 døde felt fra context-objektet som sendes til tab-fabrikkene, inkludert `completeLocationObjective` og `onBuyNewspaper`.
- Fjernet den døde General Store-avisflyten fra `LocationPanel`, inkludert `NEWSPAPER_COST`-importen og `handleBuyNewspaper`.
- Beholdt `onShowNewspaper`, fordi Shadow Market fortsatt åpner den genererte avisen i `NewspaperModal`.
- Definerte en eksplisitt `ActiveLocationTabContext` som `Omit<LocationTabContext, DeadLocationTabContextField>`.
- La inn en dokumentert overgangscast ved grensen til den gamle `locationTabs.tsx`-signaturen. Casten er avgrenset og støttes av kildekodeinvarianter som beviser at de utelatte feltene ikke leses av implementasjonen.
- Utvidet selector-testen til seks invariantsjekker for nødvendige felt, fjernede reactive actions, redusert context og fravær av legacy-feltene utenfor interface-erklæringen.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til.

## Tester

GitHub Actions-run `30096873376`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert seks LocationPanel-/context-invarianter: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- `LocationPanel` abonnerer på vesentlig færre actionreferanser og sender ikke lenger døde rå callbacker til tab-fabrikkene.
- Avis, arbeid, utdanning, quests, equipment/appliance-services, reise og hex-visning fungerer uendret.
- Neste fase er å splitte den store `locationTabs.tsx`-filen etter domene og erstatte legacy-interfacet med den faktiske aktive context-typen, slik at overgangscasten kan fjernes.
