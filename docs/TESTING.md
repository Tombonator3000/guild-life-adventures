# Testing og validering

## Lokal kontroll

Prosjektet bruker Bun 1.3.14 som eneste runtime og pakkehåndterer. `bun.lock` er den eneste autoritative lockfilen.

```bash
bun install --frozen-lockfile
bun run check:types
bun run test
bun run build
bun run lint
node scripts/audit-audio.mjs --fail-on-silent --fail-on-duplicates
bunx playwright install --only-shell chromium
bun run test:e2e
```

Lydkontrollen krever at `ffmpeg` og `ffprobe` er tilgjengelig lokalt.

Den samlede lokale hovedkontrollen kan kjøres med:

```bash
bun run validate
```

Playwright og FFmpeg-kontrollen kjøres separat fordi nettleser- og medieverktøy må installeres på maskinen eller CI-runneren.

## Testnivåer

- **Enhetstester:** priser, regler, migrering, AI-hjelpere, lydkonfigurasjon og atomiske store-handlinger.
- **Komponent- og hooktester:** regresjoner som AI-starttimer, pending-state og brukerinteraksjon.
- **Nettverkstester:** aktørbinding, argumentvalidering og avvisning av forsøk på å handle som en annen spiller.
- **Audio integrity:** FFprobe/FFmpeg kontrollerer dekoding, varighet og signalnivå; SHA-256 avdekker eksakte dubletter.
- **E2E-smoke:** tittelskjermen laster, nytt spill kan åpnes, og spilloppsettet vises uten runtime-feil.
- **Release-smoke:** publisert GitHub Pages-side og `version.json` må kunne hentes etter deploy.

## Regresjonsregel

En produksjonsfeil skal få en test som feiler på den gamle implementasjonen. AI-regresjonen der planleggingstimeren ble avbrutt av egen rerender er et eksempel: testen rerendrer samme AI-spiller før timeren går ut og krever at AI-turen likevel starter én gang.

AI-handlinger som feiler caches med både handlingens identitet og spillerens relevante tilstand. Testene skal bekrefte at nøyaktig samme forsøk blokkeres, men at handlingen kan prøves igjen etter endringer i blant annet gull, lokasjon eller utdanningsprogresjon.

En ny MP3 skal ikke konfigureres før filen finnes, kan dekodes og passerer lydintegritetsjobben. En effekt uten godkjent fil skal bruke en eksplisitt synth-definisjon, ikke en manglende URL som tilfeldig fallback.

## GitHub Actions

Workflowen `Agent validation` kjøres for alle `agent/**`-grener og pull requests mot `main`. Den kan også kalles som en gjenbrukbar workflow og brukes derfor som første jobb i produksjonsdeployen.

Valideringen kontrollerer:

- eksakt Bun-versjon,
- at bare `bun.lock` finnes,
- frozen dependency install,
- TypeScript,
- enhetstester,
- produksjonsbuild,
- ESLint,
- ugyldige, lydløse og eksakt dupliserte MP3-filer,
- Playwright-smoketester i Chromium.

Audio audit-rapporten lastes opp som både JSON og Markdown i Actions. Terskelen for stillhet er maksimalt signal på `-70 dB` eller lavere.

`Deploy to GitHub Pages` kan ikke bygge før valideringen er grønn. Dersom PartyKit er konfigurert, må serverdeployen også lykkes før Pages-klienten bygges. Manglende PartyKit-secrets gir en tydelig notice og kontrollert skip; delvis konfigurasjon eller faktisk deployfeil stopper releasen.

Etter publisering kjøres en HTTP-smoketest mot både hovedsiden og `version.json`.

## Nye lagringsfelt

Når lagringsformatet utvides, legg til test som minst dekker:

- innlasting av forrige versjon,
- manglende nested-felt,
- save/load roundtrip,
- vedvarende brett- og nyhetstilstand.
