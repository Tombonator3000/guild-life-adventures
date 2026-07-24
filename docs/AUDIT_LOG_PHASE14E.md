# Fase 14E – AI inventory sale binding

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase14e-ai-interface-cleanup` og PR #347 ble opprettet fra fase 14D-merge `57f743ff1630ab38b3eb46533a3848ba0eba5cba`.

## Mål

- Kartlegge den gjenværende AI-`StoreActions`-/selectorflaten etter fase 14A–14D.
- Rette konkrete runtime-feil før den større selector-refaktoren.

## Funn

- AI-handleren `handleSellItem` forventet `sellInventoryItem`, men `useGrimwaldAI` leverte fortsatt legacy-bindingen `sellItem`.
- Resultatet var at AI-salg kunne kaste `store.sellInventoryItem is not a function`, selv om den canonical Fence-servicen var implementert og testet for menneske-UI.
- Flere rå actions ligger fortsatt som ubrukte referanser i `StoreActions` og den store Zustand-selectorblokken. De er ikke gjestetillatt og har ingen aktive handlerkall etter fase 14A–14D.
- En trygg full opprydding krever at selectorblokken deles samtidig, slik at store typeflate og abonnement ikke divergerer igjen. Dette tas sammen med den planlagte `LocationPanel`-/selector-refaktoren.

## Utført

- `handleSellItem` bruker nå den autoritative `useGameStore.getState().sellInventoryItem` direkte, samme mønster som de canonical equipment-, appliance- og dungeon-handlerne.
- AI-sendt `price` ignoreres; Fence-lokasjon, eierskap og canonical salgspris valideres av host-servicen.
- Lagt til en regresjonstest der den innsendte legacy `sellItem`-bindingen kaster og `sellInventoryItem` mangler i det innsendte actionsettet. Salget lykkes likevel gjennom den autoritative storen.
- Testen bekrefter den bevarte 5g fallback-prisen for `investment-document`.
- Lagt til test som avviser salg utenfor Fence uten å fjerne varen eller endre gull.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til.

## Tester

GitHub Actions-run `30095585908`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert to nye AI inventory-salgstester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- AI inventory-salg fungerer igjen og bruker samme host-autoritative Fence-service som menneskespillere.
- Den bredere oppryddingen av ubrukte `StoreActions`-referanser gjøres sammen med selector-splittingen, slik at runtime-binding og typeflate endres atomisk.
- Neste fase er å begrense `LocationPanel` sitt whole-store-abonnement og etablere mindre selectorgrupper som også kan gjenbrukes av AI-hooken.
