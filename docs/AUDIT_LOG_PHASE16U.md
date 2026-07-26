# Fase 16U – frivillig community world ranking

Dato: 26. juli 2026

## Mål

- Gjøre den lokale prestasjonsscoren synlig på tvers av enheter og online-spillere.
- Beholde lokal Hall of Fame som fullverdig fallback.
- Unngå automatisk opplasting av navn eller score.
- Være ærlig om at klientberegnede resultater ikke er fullstendig jukresikre.

## Utført

- Utvidet den eksisterende PartyKit-serveren med persistent leaderboard-lagring.
- Bruker et eget PartyKit-rom, `leaderboard`, og lagrer de 100 beste resultatene.
- Serveren validerer navn, modus, uke, booleans og scoreområdet 0–10 000.
- Maksimalt fem nye innsendinger per forbindelse per time.
- Samme submission-ID behandles idempotent og lager ikke duplikater.
- Klienten validerer også alle rader som kommer tilbake fra serveren.
- World ranking er frivillig: spilleren må først lagre lokalt og deretter trykke `Submit to World Ranking`.
- Viser bare topp 25 for samme målprofil som det avsluttede spillet.
- Merker listen tydelig som `Community World Ranking – unverified`.
- Opplyser hvilke felter som sendes til serveren.
- Når `VITE_PARTYKIT_HOST` mangler eller er en placeholder, deaktiveres world ranking uten å påvirke lokal highscore eller multiplayer.
- Oppdaterte `.env.example` og la til `docs/WORLD_RANKING_DEPLOYMENT.md`.

## Tester

GitHub Actions-run `30200840578`:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke, inkludert protokoll-, klient-, server-, komponent- og strukturtestene: bestått.
- PartyKit-handlerne ble faktisk importert og kjørt mot simulert persistent storage: bestått.
- Ugyldig score, duplikat-ID, sjette innsending og eksplisitt limit-henting: bestått.
- Komponenten laster ranking uten automatisk opplasting og sender først etter knappetrykk: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright og Chromium: bestått.
- Komplett deterministisk lokal spillflyt med world-ranking-fallback: bestått.

## Driftsstatus

Koden er klar, men world ranking blir først offentlig tilgjengelig når PartyKit er deployet og produksjonsbygget får `VITE_PARTYKIT_HOST`. Uten dette viser spillet lokal-only-modus.

## Sikkerhetsgrense

Serveren kan stoppe åpenbare ugyldige eller spammede data, men kan ikke verifisere hele spillforløpet. Fullt verifisert ranking krever en autoritativ server som kjører spillreglene, ikke bare lagrer sluttresultatet.
