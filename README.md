# Guild Life Adventures

Et turbasert fantasy-livssimuleringsspill inspirert av *Jones in the Fast Lane*. Spillerne konkurrerer om rikdom, lykke, utdanning, karriere og valgfrie eventyrmål i byen Guildholm.

## Spillfunksjoner

- Lokal flerspiller med skjermbytte mellom spillerne.
- Host-autoritativ online flerspiller med lobby, reconnect og chat.
- Én eller flere AI-motstandere med individuell vanskelighetsgrad.
- Arbeid, lønnsforhandlinger, utdanning og gradssystem.
- Oppdrag, bounty-jakt, dungeon floors og quest chains.
- Bolig, mat, klær, helse, avslapning og apparater.
- Bank, sparing, lån, Broker-aksjer og dynamiske priser.
- Sabotasje, beskyttelse, tips, forbannelser og omdømme.
- Versjonerte lagringer med migrering av eldre saves.
- Installérbar PWA uten caching av spillkode.

## Kom i gang

Prosjektet bruker **Bun 1.3.14** som eneste runtime og pakkehåndterer. Den tekstbaserte `bun.lock` er den eneste autoritative lockfilen.

```bash
# Installer eksakte avhengigheter
bun install --frozen-lockfile

# Start utviklingsserver
bun run dev

# Kjør TypeScript-kontroll
bun run check:types

# Kjør enhetstester
bun run test

# Kjør Playwright-testene
bunx playwright install --only-shell chromium
bun run test:e2e

# Kjør lint
bun run lint

# Bygg produksjonsversjon
bun run build

# Kjør den lokale hovedvalideringen
bun run validate

# Mål MP3-integritet (krever FFmpeg/FFprobe)
node scripts/audit-audio.mjs --fail-on-silent --fail-on-duplicates

# Bygg for GitHub Pages
bun run build:github
```

## Teknologi

- React 18 og TypeScript
- Vite
- Zustand 5
- Tailwind CSS og shadcn/ui
- Vitest, Testing Library og Playwright
- PeerJS/PartyKit-baserte nettverkslag
- Web Audio API og verifiserte MP3-filer
- vite-plugin-pwa

## Arkitektur

Spilltilstanden ligger i Zustand og er delt i domenehandlinger under `src/store/helpers/`. Komplekse kjøp og tjenester skal utføres atomisk: pris, tid, krav og effekt beregnes av én store-handling.

Online gjester sender semantiske handlinger til hosten. Hosten validerer aktør, tur, lokasjon og kanoniske spilldata før tilstanden endres og synkroniseres tilbake.

## Kvalitetskontroll

Pull requests mot `main` og alle `agent/**`-grener kontrolleres med den gjenbrukbare workflowen `Agent validation`:

- låsefil- og Bun-versjonskontroll
- TypeScript
- Vitest-regresjonstester
- produksjonsbuild
- ESLint
- FFmpeg-kontroll av ugyldige, lydløse og eksakt dupliserte MP3-filer
- Playwright-smoketester i Chromium

Produksjonsdeploy til GitHub Pages kaller den samme valideringsworkflowen og kan ikke bygge eller publisere før den er grønn. En konfigurert PartyKit-server må også deployes uten feil før klienten publiseres. Etter Pages-deploy kontrolleres både den publiserte HTML-siden og `version.json`.

Produksjonsfeil skal få en regresjonstest. Lagringsendringer skal ha migrerings- og roundtrip-tester.

## Aktiv utvikling

GitHub Issues er kilden til sannhet for uferdig arbeid. Fase 16Y følges i [issue #390](https://github.com/Tombonator3000/guild-life-adventures/issues/390). `todo.md` er bare en kort inngangsside; fullført historikk ligger i auditlogger, bugkatalog, utviklingslogg og Git history.

## Dokumentasjon

- [Aktiv arbeidsliste](./todo.md)
- [Prosjektstyring og definition of done](./docs/PROJECT_MANAGEMENT.md)
- [Arkitektur](./docs/ARCHITECTURE.md)
- [Online flerspiller og sikkerhet](./docs/MULTIPLAYER_SECURITY.md)
- [Testing og validering](./docs/TESTING.md)
- [Audio inventory og proveniensstatus](./docs/AUDIO_INVENTORY.md)
- [AI-system](./agents.md)
- [Bugkatalog](./bugs.md)
- [Utviklingslogg](./log.md)
- [Lovable-plan](./.lovable/plan.md)

## PWA-policy

Spillet kan installeres som PWA. Service worker brukes for installasjon og oppdateringssignal, men cacher bevisst ingen JavaScript-, CSS- eller navigasjonsfiler. Nye deployer skal derfor hentes fra nettverket i stedet for å bruke gammel spillkode fra Cache Storage.

## Lisens

MIT
