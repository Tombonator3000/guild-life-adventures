# Fase 16I – appliance-breakage varsel

Dato: 24. juli 2026

## Utgangspunkt

Arbeidsgren `agent/audit-phase16i-appliance-notification` ble opprettet fra fase 16H-merge `362ee59e8c0c3d04d4aebf2921987fbc423dd2d4`.

## Mål

- Trekke den siste løse sideeffekten ut av `GameBoard`.
- Beholde toast-varsling og automatisk dismiss for vanlige apparatbrudd.
- Beholde curse-brudd i den dedikerte modalflyten uten toast eller tidlig dismiss.

## Utført

- Opprettet `useApplianceBreakageNotification.ts`.
- Flyttet oppslag av apparatnavn, toast-tekst, varighet og dismiss til hooken.
- Beholdt fallback til `applianceId` når gamle eller ukjente save-data mangler i item-katalogen.
- Vanlige apparatbrudd viser fortsatt toast i seks sekunder og avvises etter varslingen er sendt.
- Brudd med `fromCurse` ignoreres fortsatt av toast-flyten slik at `CurseAppliancePanel` kan vise hendelsen.
- `GameBoard` sender fortsatt den autoritative breakage-eventen og store-handlingen til hooken.
- Fjernet direkte avhengigheter til `getAppliance`, `toast` og `useEffect` fra `GameBoard`.
- Opprettet fire hook-tester for kjent apparat, ukjent apparat, curse-brudd og manglende event.
- Utvidet strukturtestene med eksplisitt delegering og fravær av den gamle inline-effekten.
- Strammet størrelsesgrensen for `GameBoard` fra 430 til 420 linjer.
- Ingen reparasjonskostnad, curse-modal, store-state, spillregel eller visuell tekst ble endret.

## Tester

Valideres i GitHub Actions med:

- Dependency install.
- TypeScript.
- Full Vitest-pakke, inkludert fire nye notification-tester og GameBoard-strukturinvariantene.
- Produksjonsbuild.
- ESLint.
- Playwright-runner og Chromium.
- Title/setup-smoke og deterministisk komplett lokal spillflyt med kartreise, bank, save/load og ukeovergang.

## Resultat

- `GameBoard` har ikke lenger egne React-effekter.
- Toast-, fallback- og curse-avgrensningen er samlet og direkte testet i en hook under 40 linjer.
- Neste fase bør samle spectator-/lokalspiller-avledningene eller begynne å redusere store prop-objekter uten å skjule state-eierskapet.
