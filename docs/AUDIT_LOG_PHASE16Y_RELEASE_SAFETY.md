# Phase 16Y – Release Safety Audit Log

Dato: 26. juli 2026

## Omfang

Dette er punkt 2 i `Phase 16Y – Truth, Onboarding & Release Safety`.

Målet er at samme commit som blir publisert skal ha:

1. deterministisk dependency-oppløsning,
2. full TypeScript-, test-, build-, lint- og nettleservalidering,
3. synlig og kontrollerbar serverdeploy,
4. verifisering av den faktisk publiserte siden.

## Funn før endringen

### Flytende verktøyversjoner

Både validerings- og deployworkflow brukte `bun-version: latest`. En ny Bun-release kunne derfor endre installasjon eller build uten at repositoryet var endret.

### To Bun-lockfiler

Repositoryet inneholdt både `bun.lock` og `bun.lockb`, mens README pekte på den binære filen som autoritativ. Nyere Bun brukte samtidig den tekstbaserte filen. Dette gjorde det uklart hvilken dependency-graf som faktisk gjaldt.

### Playwright ble installert under CI

Valideringen kjørte `bun add --dev --no-save @playwright/test`. Testverktøyets versjon var dermed ikke deklarert i `package.json` eller låst sammen med resten av prosjektet.

### Pages-deploy hadde egen, svakere installasjon

Deployworkflow kjørte `bun install` uten `--frozen-lockfile` og publiserte direkte på push til `main`. Den var ikke teknisk avhengig av den komplette valideringsworkflowen.

### PartyKit-feil ble skjult

Serveren ble startet med `npx partykit@latest deploy`, og steget hadde `continue-on-error: true`. En faktisk serverfeil kunne derfor etterfølges av en vellykket klientdeploy.

### Ingen kontroll av publisert resultat

Workflowen stoppet etter GitHub Pages-deploy og kontrollerte ikke at HTML eller `version.json` faktisk var tilgjengelig.

## Implementert løsning

### Verktøy og dependency-graf

- Bun er låst til `1.3.14` i `package.json` og begge workflows.
- `package.json` har prosjektname `guild-life-adventures` og versjon `0.10.1`.
- `@playwright/test` er deklarert som eksakt `1.61.1` devDependency.
- `bun.lock` er regenerert med den låste toolchainen.
- `bun.lockb` er fjernet.
- Valideringen avviser repositoryet dersom `bun.lockb` kommer tilbake.

### Gjenbrukbar validering

`Agent validation` støtter nå `workflow_call` og brukes både av pull requests og produksjonsdeploy.

Den kontrollerer:

- Bun-versjon og lockfile-policy,
- frozen install,
- TypeScript,
- Vitest,
- produksjonsbuild,
- ESLint,
- Playwright i Chromium.

Vitest-, lint- og nettleserartefakter beholdes for feilsøking.

### Sikrere deployrekkefølge

`Deploy to GitHub Pages` følger denne rekkefølgen:

1. kall komplett `Agent validation`,
2. kontroller PartyKit-konfigurasjon,
3. deploy PartyKit med repositoryets låste CLI dersom konfigurert,
4. bygg GitHub Pages med frozen install,
5. publiser Pages,
6. hent den publiserte siden og `version.json` med retry.

Dersom begge PartyKit-secrets mangler, vises en tydelig notice og serverdeploy hoppes kontrollert over. Dersom bare én secret finnes, eller en konfigurert deploy feiler, stopper releasen.

### Vedlikehold

Dependabot er aktivert ukentlig for:

- Bun dependencies,
- GitHub Actions.

Oppdateringer kommer dermed som synlige pull requests og passerer samme validering før merge.

## Regresjonsbeskyttelse

`src/test/releasePipeline.test.ts` kontrollerer at:

- bare `bun.lock` finnes,
- Bun og Playwright er låst,
- valideringsworkflowen er gjenbrukbar og frozen,
- dynamisk `bun add` ikke kommer tilbake,
- deploy avhenger av validering og PartyKit,
- `partykit@latest` og `continue-on-error` ikke kommer tilbake,
- publisert side og `version.json` røykprøves.

## Ikke endret

- Ingen spillbalanse eller spillmekanikk.
- Ingen lagringsmigrering.
- Ingen endring i nettverksprotokollen.
- Ingen nye produksjonssecrets.

## Akseptansekriterier

- [ ] Frozen Bun install med kun `bun.lock`
- [ ] TypeScript grønn
- [ ] Full Vitest-suite grønn
- [ ] Produksjonsbuild grønn
- [ ] ESLint grønn
- [ ] Playwright grønn
- [ ] Reusable validation kan kalles av deployworkflow
- [ ] PartyKit-feil kan ikke skjules
- [ ] GitHub Pages røykprøves etter publisering
