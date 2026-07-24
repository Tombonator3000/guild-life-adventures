# Fase 14D – AI dungeon auto-resolve

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase14d-ai-dungeon` og PR #346 ble opprettet fra fase 14C-merge `b04fd7db1c512289e68c95868cc39e35bc52db8b`.

## Mål

- Fjerne AI-ens separate dungeon-resolver og rå settlement-kjede.
- La AI bruke samme host-eide encounters, randomness, tidsbruk, helse, loot, drops, durability og records som den interaktive kampen.

## Utført

- Fjernet AI-handlerens egne beregninger for combat stats, education bonuses, floor time, festivalgull og loot multiplier.
- Fjernet direkte handlerkall til `spendTime`, `modifyGold`, `modifyHealth`, `modifyHappiness`, `clearDungeonFloor`, `applyRareDrop` og `applyDurabilityLoss`.
- `handleExploreDungeon` sender nå bare floor-ID og driver den eksisterende host-sessionen synkront gjennom `beginDungeonRun`, `resolveDungeonEncounter`, `advanceDungeonRun` og `finalizeDungeonRun`.
- AI bruker samme genererte encounterliste og dungeon modifier som menneskespilleren. Ingen ekstra `autoResolveFloor`-tilstand eller separat settlement opprettes.
- Ved nok tid fortsetter AI til neste encounter. Ved tidsmangel bruker den canonical `leave`-flyten og finaliserer runnen uten å etterlate aktiv session.
- Lagt til en hard sikkerhetsgrense på 64 state-overganger, slik at korrupt session-state ikke kan låse en AI-turn i en uendelig løkke.
- Floor requirements, Cave-lokasjon, attempts, første encounter-tid, skade, drops, equipment snapshot, record og death checks håndheves av de eksisterende host-servicene.
- Lagt til fem integrasjonstester gjennom `executeAIAction` for full session/settlement, blokkering av alle innsendte rå mutatorer, floor requirements, feil lokasjon, tidsmangel og ugyldig floor-ID.
- Ingen midlertidige workflows, triggere eller patchskript ble lagt til.

## Tester

GitHub Actions-run `30095069947`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert fem nye AI dungeon-sessiontester: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Title/setup-smoke og deterministisk komplett lokal spillflyt: bestått.

## Resultat

- AI og menneskespillere har nå én felles dungeon state-maskin og settlement-implementasjon.
- AI kan ikke lenger bruke en separat rå kjede for tid, skade, gull, happiness, floor clear, drops eller durability.
- Neste fase er å fjerne de nå ubrukte dungeon-/asset-legacyreferansene fra AI-ens `StoreActions` og Zustand-selector, og deretter begrense `LocationPanel` sitt whole-store-abonnement.
