import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const logPath = 'docs/AUDIT_LOG.md';
let text = readFileSync(logPath, 'utf8');
text = text.replace(
  'Jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr og bolig bruker semantiske gjestehandlinger. Hex og enkelte økonomihandlinger står igjen.',
  'Jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr, bolig og hex-tjenester bruker semantiske gjestehandlinger. Enkelte bank-/økonomihandlinger står igjen.',
);
text = text.replace(
  'Healer, gravplass, gambling, avis, sabotasje, beskyttelse, jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr og bolig er host-resolverte. Hex/ritual og deler av bank/investering står igjen.',
  'Healer, gravplass, gambling, avis, sabotasje, beskyttelse, jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr, bolig og hex-/ritualtjenester er host-resolverte. Deler av bank/investering står igjen.',
);

const priorityStart = text.indexOf('## Gjenstående prioritert rekkefølge');
const phase4Start = text.indexOf('## Fase 4', priorityStart);
if (priorityStart < 0 || phase4Start < 0) throw new Error('Audit priority headings not found');
const priority = `## Gjenstående prioritert rekkefølge

1. **Gjør bank/investering og øvrige rå handlinger strengere.** Klientvalgte beløp må få tydelige grenser, eierskapskontroll og semantiske handlinger der beløpet ikke skal være fritt.
2. **Utvid E2E-testene til faktisk spilling.** Opprett spill, start første tur, utfør handling, avslutt tur, save/load og verifiser at ingen runtime-feil oppstår.
3. **Test online sikkerhetsavvisninger på protokollnivå.** Feil spiller-ID, feil tur, feil vendor/service, ugyldig vare og manipulerte verdier skal avvises.
4. **Begrens resterende store-abonnementer.** Start med \`LocationPanel\`, som fortsatt leser hele Zustand-storen.
5. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
6. **Rydd døde kompatibilitetslag.** Fjern gamle callback-props og numeriske legacy-funksjoner først når AI og alle lokale kallere er migrert.

`;
text = text.slice(0, priorityStart) + priority + text.slice(phase4Start);

const phase9Start = text.indexOf('## Fase 9');
if (phase9Start < 0) throw new Error('Phase 9 heading not found');
const phase9 = `## Fase 9 – 23. juli 2026

### Mål

- Gjøre scrollkjøp, hex-forsvar og Graveyard dark-magic-tjenester host-autoritative.
- Beholde den eksisterende host-validerte casting-logikken.

### Utført

- Opprettet arbeidsgren \`agent/audit-phase9-hex\` og draft-PR #332 fra fase 8-merge \`efc766a56213552e580ada737c5d64bdbb7b760b\`.
- Maskinell skanning kartla klientprisede hex-kall, AI-kostfelt, numeriske protokollregler og whole-store-abonnementer.
- Lagt til \`purchaseHexScroll(playerId, vendor, hexId)\` med canonical Enchanter-stock eller ukentlig Shadow Market-rotasjon.
- Lagt til \`useHexDefense(playerId, service, targetLocation?)\` for Protective Amulet og målrettet Dispel.
- Lagt til \`useGraveyardHexService(playerId, service)\` for Dark Ritual, Curse Reflection og Purification.
- Hosten validerer feature toggle, fysisk vendor/lokasjon, gjeldende stock, floor-prerequisites, canonical pris, gull, tid, amulet-eierskap, aktiv curse og valgt hostile location hex.
- Scrollkjøp, amulett og dispel oppdaterer gull, tid, inventory/hex-state og statistikk atomisk.
- Eksisterende \`castLocationHex\` og \`castPersonalCurse\` ble beholdt fordi de allerede validerer scroll-eierskap, mål, lokasjon, tid, cooldown og amulet på hosten.
- Rettet en funksjonell selvmotsigelse: Dispel Scroll ble solgt hos Enchanter, men krevde tidligere at spilleren sto på den hexede lokasjonen. Spilleren velger nå en faktisk hostile location hex hos Enchanter, og hosten fjerner kun den valgte hexen.
- Oppdatert \`HexShopPanel\` og \`GraveyardHexPanel\` til avgrensede Zustand-selectors.
- Oppdatert AI til å sende bare vendor + hex-ID, target location eller service; prisfelt og separate gull-/tidsmutasjoner er fjernet.
- AI reiser nå til Enchanter for remote dispel i stedet for å reise til den blokkerte lokasjonen.
- Fjernet \`buyHexScroll\`, \`buyProtectiveAmulet\`, \`dispelLocationHex\`, \`cleanseCurse\`, \`performDarkRitual\` og \`attemptCurseReflection\` fra gjestenes allowlist og fjernet de gamle numeriske protokollreglene.
- Lagt til ni målrettede hex-regresjonstester og oppdatert multiplayer-testene.
- ESLint-runden avdekket at lokale store-action-navn med \`use\` ble tolket som React-hooks. Lokale aliaser ble endret uten å endre API-et.
- Fjernet alle midlertidige workflows, triggere, skanneresultater, patchskript og valideringslogger før merge.

### Tester

GitHub Actions-run \`30003787680\`:

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
- PR #332 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.
`;
writeFileSync(logPath, text.slice(0, phase9Start) + phase9);

const temporaryPaths = [
  '.github/workflows/apply-phase9-hex.yml',
  '.github/workflows/apply-phase9-lint.yml',
  '.github/workflows/phase9-full-validation.yml',
  '.github/workflows/phase9-hex-scan.yml',
  '.github/workflows/finalize-phase9.yml',
  'phase9-finalize-trigger.txt',
  'phase9-hex-scan-trigger.txt',
  'phase9-hex-trigger.txt',
  'phase9-lint-trigger.txt',
  'phase9-validation-trigger.txt',
  'phase9-hex-scan.txt',
  'scripts/apply-phase9-hex.mjs',
  'scripts/patch-phase9-lint.mjs',
  'scripts/finalize-phase9.mjs',
];
for (const path of temporaryPaths) {
  if (existsSync(path)) rmSync(path, { force: true });
}
if (existsSync('validation')) {
  for (const name of ['phase9-build.txt','phase9-chromium.txt','phase9-full-tests.txt','phase9-install.txt','phase9-lint.txt','phase9-playwright.txt','phase9-result.txt','phase9-runner.txt','phase9-targeted-tests.txt','phase9-typescript.txt']) {
    const path = `validation/${name}`;
    if (existsSync(path)) rmSync(path, { force: true });
  }
}
console.log('Phase 9 log finalized and temporary files removed');
