import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const logPath = 'docs/AUDIT_LOG.md';
let text = readFileSync(logPath, 'utf8');
text = text.replace(
  'Jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr, bolig og hex-tjenester bruker semantiske gjestehandlinger. Enkelte bank-/økonomihandlinger står igjen.',
  'Jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr, bolig, hex-tjenester og finans bruker semantiske gjestehandlinger. De største klientprisede spillhandlingene er nå migrert.',
);
text = text.replace(
  'Healer, gravplass, gambling, avis, sabotasje, beskyttelse, jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr, bolig og hex-/ritualtjenester er host-resolverte. Deler av bank/investering står igjen.',
  'Healer, gravplass, gambling, avis, sabotasje, beskyttelse, jobb, utdanning, vendor-kjøp, inventory-salg, apparater, utstyr, bolig, hex-/ritualtjenester og finans er host-resolverte.',
);

const priorityStart = text.indexOf('## Gjenstående prioritert rekkefølge');
const phase4Start = text.indexOf('## Fase 4', priorityStart);
if (priorityStart < 0 || phase4Start < 0) throw new Error('Audit priority headings not found');
const priority = `## Gjenstående prioritert rekkefølge

1. **Utvid E2E-testene til faktisk spilling.** Opprett spill, start første tur, utfør handling, avslutt tur, save/load og verifiser at ingen runtime-feil oppstår.
2. **Test online sikkerhetsavvisninger på protokollnivå.** Feil spiller-ID, feil tur, feil vendor/service, ugyldig vare og manipulerte verdier skal avvises.
3. **Begrens resterende store-abonnementer.** Start med \`LocationPanel\`, som fortsatt leser hele Zustand-storen.
4. **Del opp GameBoard videre.** Flytt avledet tilstand og overlay-/layoutlogikk til mindre hooks/komponenter uten å endre funksjon.
5. **Rydd døde kompatibilitetslag.** Fjern gamle callback-props og numeriske legacy-funksjoner først når AI og alle lokale kallere er migrert.

`;
text = text.slice(0, priorityStart) + priority + text.slice(phase4Start);

const phase10Start = text.indexOf('## Fase 10');
if (phase10Start < 0) throw new Error('Phase 10 heading not found');
const phase10 = `## Fase 10 – 23. juli 2026

### Mål

- Gjøre bankoverføringer, investeringer, aksjehandel og lån host-autoritative.
- Skille frie, men strengt validerte brukerbeløp fra canonical priser og låneprodukter.

### Utført

- Opprettet arbeidsgren \`agent/audit-phase10-finance\` og draft-PR #333 fra fase 9-merge \`c0c23f013b82105f66cba6a3868ab966894a4ce7\`.
- Maskinell skanning kartla Bank-UI, store-laget, AI-handlerne, nettverksallowlist, protokollregler og eksisterende økonomitester.
- Lagt til \`transferBankFunds(playerId, direction, amount)\` for eksakte innskudd og uttak.
- Lagt til \`manageInvestment(playerId, service, amount)\` med canonical 10 % early-withdrawal penalty.
- Lagt til \`tradeStock(playerId, side, stockId, shares)\` med live host-pris, gyldig aksje-ID, heltallsantall, eierskap og canonical Crown Bond-salgsgebyr.
- Lagt til \`manageLoan(playerId, service, amount)\` med bankens fire canonical låneprodukter 100/250/500/1000 gull, jobbhistorikk, ett lån av gangen og eksakt tilbakebetaling.
- Alle finanshandlingene krever fysisk Bank-lokasjon og avviser desimaler, negative tall, overdrafts, ugyldige produkter og beløp over sikker grense i stedet for å clampes stille.
- Oppdatert \`BankPanel\` fra seks action-props til fire avgrensede Zustand-selectors og resultatbaserte toast-meldinger.
- Gjorde den eksisterende investment-mekanikken synlig i Bank-panelet med invester/uttak-knapper; avkastnings- og straffereglene ble ikke endret.
- Oppdatert \`locationTabs\` og \`LocationPanel\` ved å fjerne åtte legacy finansprops.
- Oppdatert AI til de semantiske handlingene. AI sender ikke lenger aksjepris, og forecast-lån rundes opp til nærmeste gyldige låneprodukt.
- Fjernet \`depositToBank\`, \`withdrawFromBank\`, \`invest\`, \`withdrawInvestment\`, \`buyStock\`, \`sellStock\`, \`takeLoan\` og \`repayLoan\` fra gjestenes allowlist.
- Lagt til ni målrettede finansregresjonstester og oppdatert multiplayer-/actor-validation-testene.
- Første lint-runde fant én \`prefer-const\`-feil i den nye testfilen. Den ble rettet uten endring av spillkode.
- Fjernet alle midlertidige workflows, triggere, skanneresultater, patchskript og valideringslogger før merge.

### Tester

GitHub Actions-run \`30005423775\`:

- Dependency install: bestått.
- TypeScript: bestått.
- Målrettede finanstester: bestått, 9 av 9.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright-runner og Chromium-installasjon: bestått.
- Playwright-smoketester i Chromium: bestått.

### Resultat

- Online-gjester og AI kan ikke lenger diktere saldooverføringer uten dekning, aksjepris, aksjegebyr, låneprodukt eller tilbakebetalingsbeløp utover faktisk gjeld/kontanter.
- De store klientprisede økonomihandlingene fra den opprinnelige revisjonen er nå migrert.
- PR #333 er klar for squash-merge. Merge-SHA føres inn ved starten av neste fase.
`;
writeFileSync(logPath, text.slice(0, phase10Start) + phase10);

const paths = [
  '.github/workflows/apply-phase10-finance.yml',
  '.github/workflows/phase10-finance-scan.yml',
  '.github/workflows/phase10-full-validation.yml',
  'phase10-finance-scan-trigger.txt',
  'phase10-finance-trigger.txt',
  'phase10-validation-trigger.txt',
  'phase10-finance-scan.txt',
  'scripts/apply-phase10-finance.mjs',
  'scripts/finalize-phase10.mjs',
];
for (const path of paths) if (existsSync(path)) rmSync(path, { force: true });
if (existsSync('validation')) {
  for (const name of ['build','chromium','full-tests','install','lint','playwright','result','runner','targeted-tests','typescript']) {
    const path = `validation/phase10-${name}.txt`;
    if (existsSync(path)) rmSync(path, { force: true });
  }
}
console.log('Phase 10 finalized');
