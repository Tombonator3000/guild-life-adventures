# Fase 14C – AI-utstyr og apparater

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase14c-ai-equipment-appliances` og PR #345 ble opprettet fra fase 14B-merge `1693cd854d4bf3c539c6f32d3955a6ced5728eed`.

## Mål

- Flytte AI-ens apparat- og utstyrskjøp, temperering, reparasjon og pant til de eksisterende canonical host-servicene.
- Beholde generatorenes kostnadsestimater som prioriteringsdata, men hindre at de styrer faktisk pris, slot, tid eller effekt.

## Utført

- `handleBuyAppliance` bestemmer vendor fra spillerens autoritative lokasjon og bruker `purchaseAppliance`.
- Manipulert `details.source` eller `details.cost` påvirker ikke kjøpet.
- Den historiske AI-shoppingtimen bevares ved Enchanter og Shadow Market. Fence-kjøp bruker servicehandlingens allerede innebygde time og dobbelttrekkes ikke.
- `handleBuyEquipment` krever faktisk Armory-lokasjon og bruker `purchaseEquipmentItem`.
- Equipment-slot hentes fra canonical item-katalog gjennom `getItem`; AI-sendt slot ignoreres. Kjøpt utstyr auto-equippes i riktig slot og beholder den historiske AI-shoppingtimen.
- Temperering og utstyrsreparasjon bruker `useEquipmentService`, som beregner canonical pris, tid, happiness og durability fra host-state.
- Pant bruker `useApplianceService(..., 'pawn', ...)`, slik at AI-sendt pawn value ignoreres.
- Apparatreparasjon velger `repair-forge` eller `repair-enchanter` fra faktisk lokasjon. AI-sendt location/cost ignoreres.
- Lagt til sju integrasjonstester gjennom `executeAIAction` for appliancepris/source, Armory-pris/slot, temperering, utstyrsreparasjon, pantverdi, reparasjonssted og feil lokasjon uten state-endring.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til i denne fasen.

## Tester

GitHub Actions-run `30094366371`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert sju nye equipment/appliance-integrasjonstester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- AI kan ikke lenger diktere apparatpris/source, utstyrspris/slot, tempereringspris, reparasjonspris/-sted eller pantverdi.
- Equipment- og appliance-flytene bruker samme canonical services som menneske-UI-et.
- Neste AI-delfase er dungeon auto-resolve og deretter opprydding av gjenværende rå AI-/developer-kompatibilitetslag.
