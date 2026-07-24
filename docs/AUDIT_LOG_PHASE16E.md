# Fase 16E – fokuserte GameBoard-abonnementer

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16e-gameboard-subscriptions` ble opprettet fra fase 16D-merge `8b582625eb91a5c1429df3fd1d2a29a9bd794956`.

## Mål

- Fjerne døde Zustand-bindinger og lokale aliaser fra `GameBoard`.
- Redusere unødvendige re-renders uten å endre spillflyt, handlinger eller presentasjon.
- Låse den smalere selector-kontrakten med en strukturtest.

## Utført

- Fjernet `selectLocation` fra `GameBoard` sin selector og destructuring fordi handlingen ikke ble brukt i komponenten.
- Fjernet `skipAITurn` fra selector og destructuring fordi verdien aldri ble lest. Dette hindrer at endringer i flagget alene utløser en unødvendig `GameBoard`-render.
- Beholdt `setSkipAITurn`, som fortsatt brukes av tastaturflyt, AI-overlays og sidepanelene.
- Fjernet det ubrukte `activeLayout`-aliaset.
- Beholdt `layout`, som fortsatt sendes som `initialLayout` til Zone Editor.
- Utvidet `gameBoardStructure.test.ts` med eksplisitte invarianter for de fjernede bindingene og de fortsatt nødvendige handlingene.
- Strammet størrelsesgrensen for `GameBoard` fra 490 til 470 linjer.
- Ingen spillregler, nettverksprotokoll, AI-beslutninger, eventkø, kartmotor eller UI-adferd ble endret.

## Tester

GitHub Actions-run `30102813378`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert GameBoard-strukturinvariantene: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang: bestått.

## Resultat

- `GameBoard` abonnerer ikke lenger på `skipAITurn`-verdien den aldri leste.
- To andre døde bindinger er fjernet uten å flytte ansvar eller endre komponentgrensene.
- Neste fase bør trekke eventkø-koordineringen ut i en fokusert hook, med eksplisitte tester for vanlige hendelser og weekend-hendelser.
