# Guild Life Adventures

Et turbasert fantasy-livssimuleringsspill inspirert av *Jones in the Fast Lane*. Spillerne konkurrerer om rikdom, lykke, utdanning, karriere og valgfrie eventyrmål i byen Guildholm.

## Spillfunksjoner

- Lokal flerspiller med skjermbytte mellom spillerne.
- Host-autoritativ online flerspiller med lobby, reconnect og chat.
- Én eller flere AI-motstandere med individuell vanskelighetsgrad.
- Arbeid, lønnsforhandlinger, utdanning og gradssystem.
- Oppdrag, bounty-jakt, dungeon floors og quest chains.
- Bolig, mat, klær, helse, avslapning og apparater.
- Bank, investeringer, lån, aksjer og dynamiske priser.
- Sabotasje, beskyttelse, tips, forbannelser og omdømme.
- Versjonerte lagringer med migrering av eldre saves.
- Installérbar PWA uten caching av spillkode.

## Kom i gang

Prosjektet bruker **Bun** som eneste pakkehåndterer. `bun.lockb` er den autoritative lockfilen.

```bash
# Installer eksakte avhengigheter
bun install --frozen-lockfile

# Start utviklingsserver
bun run dev

# Kjør TypeScript-kontroll
bunx tsc --noEmit

# Kjør tester
bunx vitest run

# Kjør lint
bun run lint

# Bygg produksjonsversjon
bun run build

# Bygg for GitHub Pages
bun run build:github
```

## Teknologi

- React 18 og TypeScript
- Vite
- Zustand 5
- Tailwind CSS og shadcn/ui
- Vitest og Testing Library
- PeerJS/Partykit-baserte nettverkslag
- vite-plugin-pwa

## Arkitektur

Spilltilstanden ligger i Zustand og er delt i domenehandlinger under `src/store/helpers/`. Komplekse kjøp og tjenester skal utføres atomisk: pris, tid, krav og effekt beregnes av én store-handling.

Online gjester sender semantiske handlinger til hosten. Hosten validerer aktør, tur, lokasjon og kanoniske spilldata før tilstanden endres og synkroniseres tilbake.

## Kvalitetskontroll

Pull requests mot `main` kontrolleres med GitHub Actions:

- TypeScript
- Vitest-regresjonstester
- produksjonsbuild
- ESLint

Produksjonsfeil skal få en regresjonstest. Lagringsendringer skal ha migrerings- og roundtrip-tester.

## Dokumentasjon

- [Arkitektur](./docs/ARCHITECTURE.md)
- [Online flerspiller og sikkerhet](./docs/MULTIPLAYER_SECURITY.md)
- [Testing og validering](./docs/TESTING.md)
- [AI-system](./agents.md)
- [Prosjektoppgaver](./todo.md)
- [Utviklingslogg](./log.md)
- [Lovable-plan](./.lovable/plan.md)

## PWA-policy

Spillet kan installeres som PWA. Service worker brukes for installasjon og oppdateringssignal, men cacher bevisst ingen JavaScript-, CSS- eller navigasjonsfiler. Nye deployer skal derfor hentes fra nettverket i stedet for å bruke gammel spillkode fra Cache Storage.

## Lisens

MIT
