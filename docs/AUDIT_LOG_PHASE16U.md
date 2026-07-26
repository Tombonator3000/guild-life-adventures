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

- Protokolltester for validering, tekstgrenser, korrupte rader og sortering.
- Klientkonfigurasjonstester for PartyKit-host og fallback.
- Faktiske PartyKit-handler-tester for lagring, broadcast, idempotens, ugyldig score, rate limiting og initial henting.
- Komponenttester som beviser at score ikke sendes automatisk, men bare etter eksplisitt knappetrykk.
- Strukturtester som låser frivillighet, unverified-merking, servergrenser og graceful fallback.
- Full GitHub Actions-validering kjøres før merge.

## Driftsstatus

Koden er klar, men world ranking blir først offentlig tilgjengelig når PartyKit er deployet og produksjonsbygget får `VITE_PARTYKIT_HOST`. Uten dette viser spillet lokal-only-modus.

## Sikkerhetsgrense

Serveren kan stoppe åpenbare ugyldige eller spammede data, men kan ikke verifisere hele spillforløpet. Fullt verifisert ranking krever en autoritativ server som kjører spillreglene, ikke bare lagrer sluttresultatet.
