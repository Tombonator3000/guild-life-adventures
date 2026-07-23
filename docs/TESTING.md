# Testing og validering

## Lokal kontroll

Prosjektet bruker Bun som eneste pakkehåndterer.

```bash
bun install --frozen-lockfile
bunx tsc --noEmit
bunx vitest run
bun run build
bun run lint
```

## Testnivåer

- **Enhetstester:** priser, regler, migrering, AI-hjelpere og atomiske store-handlinger.
- **Komponent- og hooktester:** regresjoner som AI-starttimer, pending-state og brukerinteraksjon.
- **Nettverkstester:** aktørbinding, argumentvalidering og avvisning av forsøk på å handle som en annen spiller.
- **E2E-smoke:** tittelskjermen laster, nytt spill kan åpnes, og spilloppsettet vises uten runtime-feil.

## Regresjonsregel

En produksjonsfeil skal få en test som feiler på den gamle implementasjonen. AI-regresjonen der planleggingstimeren ble avbrutt av egen rerender er et eksempel: testen rerendrer samme AI-spiller før timeren går ut og krever at AI-turen likevel starter én gang.

AI-handlinger som feiler caches med både handlingens identitet og spillerens relevante tilstand. Testene skal bekrefte at nøyaktig samme forsøk blokkeres, men at handlingen kan prøves igjen etter endringer i blant annet gull, lokasjon eller utdanningsprogresjon.

## GitHub Actions

Workflowen `Agent validation` kjøres for alle `agent/**`-grener og pull requests mot `main`. Den skal være grønn før merge og kontrollerer TypeScript, enhetstester, produksjonsbuild, ESLint og Playwright-smoketester i Chromium.

## Nye lagringsfelt

Når lagringsformatet utvides, legg til test som minst dekker:

- innlasting av forrige versjon,
- manglende nested-felt,
- save/load roundtrip,
- vedvarende brett- og nyhetstilstand.
