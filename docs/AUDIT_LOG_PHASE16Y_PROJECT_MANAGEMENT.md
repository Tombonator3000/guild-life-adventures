# Phase 16Y – Project Management Audit Log

Dato: 26. juli 2026

## Omfang

Dette er punkt 3 i `Phase 16Y – Truth, Onboarding & Release Safety`.

Målet er å gjøre det tydelig:

- hva som faktisk gjenstår,
- hvor nye oppgaver skal registreres,
- hvordan arbeid går fra idé til ferdig merge,
- hvor historiske funn og gjennomførte endringer skal lagres.

## Funn før endringen

### `todo.md` var en historisk dump

Filen blandet:

- gamle fullførte features,
- utdaterte regelbeskrivelser,
- bugjakter,
- tekniske revisjoner,
- aktive oppgaver,
- planer som allerede var implementert.

Den eneste tydelig åpne kodeoppgaven, BUG-013, lå begravd mellom hundrevis av fullførte punkter.

### GitHub Issues var ikke aktiv backlog

Repositoryet hadde ingen tydelig fase-tracker eller konkrete issues for den prioriterte forbedringsplanen. Status måtte rekonstrueres fra `todo.md`, `bugs.md`, auditlogger, PR-er og samtalehistorikk.

### Ingen standardisert intake

Nye bugs og forbedringer manglet faste krav til:

- reproduksjon,
- eksisterende system som er kontrollert,
- acceptance criteria,
- non-goals,
- regresjonstest,
- sikkerhets- og migreringshensyn.

### Completed work and future work used the same surface

Dette gjorde `todo.md` stadig lengre og økte risikoen for at gammel informasjon ble tolket som dagens spillregler eller aktive prioriteringer.

## Implementert løsning

### Aktiv tracker og fokuserte issues

- #390 — Phase 16Y tracker
- #391 — BUG-013 AI failed-action invalidation
- #392 — placeholder/silent audio
- #393 — interactive first-turn onboarding
- #394 — online/mobile/endgame browser coverage
- #395 — seeded multi-game balance simulator

Issue #390 er nå den aktive fasestatusen. De øvrige sakene har konkrete problemformuleringer og acceptance criteria.

### Kort `todo.md`

`todo.md` er redusert til:

- aktuell fase,
- prioriterte aktive saker,
- arbeidsregler,
- lenker til sentrale dokumenter.

Den tidligere fulle versjonen er bevart i Git history gjennom commit `de99992`. Tekniske konklusjoner finnes fortsatt i `bugs.md`, `log.md` og daterte auditlogger.

### Dokumentert arbeidsflyt

`docs/PROJECT_MANAGEMENT.md` definerer:

- GitHub Issues som source of truth,
- prioritet P0–P3,
- branch/PR-flyt,
- definition of done,
- logging policy,
- aktive Phase 16Y-saker.

### Templates

Lagt til:

- bug issue form,
- improvement issue form,
- issue-form config med lenke til aktiv tracker,
- pull-request template med validering og sikkerhetssjekker.

### Regresjonsbeskyttelse

`src/test/projectManagement.test.ts` kontrollerer at:

- `todo.md` holder seg under 100 linjer,
- aktiv tracker og P0-saker er synlige,
- gamle completed-seksjoner ikke kommer tilbake,
- prosjektstyringsdokumentet inneholder delivery hierarchy og definition of done,
- issue- og PR-templatene beholder kravene til reproduksjon, existing-system check, non-goals og regresjon/sikkerhet.

## Arbeidsregel fremover

- Uferdig arbeid: GitHub Issue.
- Implementasjon og validering: Pull request.
- Fullført teknisk historikk: auditlogg, bugkatalog, changelog og Git history.
- `todo.md`: kort navigasjon, aldri full utviklingshistorikk.

## Ikke endret

- Ingen spillkode eller balanse.
- Ingen save- eller nettverksformat.
- Ingen historiske bugbeskrivelser ble slettet fra `bugs.md`.
- Ingen gamle commits eller auditlogger ble omskrevet.

## Akseptansekriterier

- [x] Aktiv fase har tracker issue.
- [x] Prioriterte neste oppgaver har egne issues.
- [x] `todo.md` er kort og peker til source of truth.
- [x] Arbeidsflyt og definition of done er dokumentert.
- [x] Issue- og PR-templates finnes.
- [x] Historisk informasjon er fortsatt tilgjengelig.
- [ ] Full GitHub Actions-validering grønn.
