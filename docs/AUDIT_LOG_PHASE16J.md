# Fase 16J – spiller- og tilskuerstatus

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16j-audience-state` ble opprettet fra fase 16I-merge `cb866672ebfab3c0ad9ea50fbeefa24c3c439fb7`.

## Mål

- Samle avledningene for lokal spiller, aktiv tur, venting og tilskuermodus uten å flytte nettverksstate.
- Beholde eksisterende forskjell mellom lokal spilling, online-spiller, ren tilskuer og utslått spiller.
- Gjøre grensetilfellene direkte testbare som ren logikk.

## Utført

- Opprettet `deriveGameBoardAudienceState.ts` som en ren funksjon uten React-state eller sideeffekter.
- Flyttet avledning av `isLocalPlayerTurn`, `isWaitingForOtherPlayer`, `localPlayer`, `isPureSpectator` og `isSpectating` ut av `GameBoard`.
- Beholdt lokale spill som alltid spillbare for gjeldende spiller.
- Beholdt ventemodus bare når en annen menneskelig spiller har tur i online-spill; AI-turer bruker fortsatt AI-overlegget i stedet.
- Beholdt klienter uten `localPlayerId` som rene tilskuere.
- Beholdt utslåtte online-spillere som tilskuere bare mens spillet pågår og minst én spiller fortsatt er aktiv.
- Beholdt vanlig sluttfase når alle spillere er ute eller fasen ikke er `playing`.
- Bruker `GameState['phase']` som autoritativ fasetype og den eksisterende `Player`-typen.
- Opprettet sju rene tester for lokal spilling, egen online-tur, annen menneskelig tur, AI-tur, ren tilskuer, utslått spiller og avsluttet spill.
- Utvidet strukturtestene med eksplisitt delegering og fravær av de gamle inline-avledningene.
- Ingen nettverksstate, turrekkefølge, AI-logikk, tilskuer-UI eller spillerstatus ble endret.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert sju nye audience-state-tester og GameBoard-strukturinvariantene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- Fem sammenhengende nettverks-/tilskueravledninger er samlet i én ren funksjon under 45 linjer.
- `GameBoard` beholder de autoritative inputene, men slipper å eie detaljreglene for hvem klienten representerer.
- Neste fase bør redusere gjentakelsen mellom desktop- og mobile `RightSideTabs`-props eller samle de gjenværende rene visningsmodellene.
