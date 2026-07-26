# Fase 16S – nullbasert goal completion

Dato: 26. juli 2026

## Problem

Spillerlisten viste 18 prosent fremgang ved vanlig spillstart. Årsaken var at startverdiene 100 gull og 50 lykke ble regnet som allerede opptjent fremgang mot målene.

## Endring

- Ny felles beregning i `calculateGoalProgress.ts`.
- 100 gull og 50 lykke brukes som nullpunkt.
- Vanlig spillstart viser 0 prosent.
- Fremgang beregnes fra starttilstanden til valgt mål.
- Formue inkluderer gull, sparekonto, investeringer og aksjer, og trekker fra lån.
- Arbeidsledige har 0 i karrierefremgang.
- Adventure teller bare når det målet er aktivert.
- Verdier under startpunktet vises som 0, og fullførte mål som 100.
- Fem tester dekker start, halv fremgang, aksjer og lån, adventure og yttergrenser.

## Avgrensning

Seierskravene er ikke endret. Bare prosentvisningen er rettet.

## Validering

GitHub Actions-run `30199199934`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert de nye goal-progress-testene: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright og Chromium: bestått.
- Komplett deterministisk lokal spillflyt: bestått.
