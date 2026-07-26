# Fase 16V – permadeath, spectatorvalg, Hall of Fame og sikker turfortsettelse

Dato: 26. juli 2026

## Feilen

Når en spiller døde med permadeath aktivert, ble spilleren korrekt markert med `isGameOver`. Auto-turhooken forsøkte deretter å kalle `checkDeath()` en gang til. Den funksjonen returnerer tidlig for en spiller som allerede er markert død, og auto-turhooken tolket dette som at den ikke skulle avslutte turen.

Resultatet var en game-breaking lås:

- Den døde spilleren ble stående som aktiv spiller.
- Spilleren kunne fortsatt forsøke å bevege seg rundt på kartet.
- Andre menneskelige spillere og AI fikk aldri startet turene sine.
- Spectator-visningen eksisterte, men spillet kom ikke frem til en ny aktiv spiller.

## Endring – død og spectator

- Auto-turflyten sjekker nå `currentPlayer.isGameOver` direkte.
- Host/lokal klient hopper automatisk videre fra en eliminert tur etter 100 ms.
- Guest-klienter får aldri lov til å endre den autoritative turrekkefølgen; hosten utfører hoppet og synkroniserer resultatet.
- En death-causing event kan ikke bli stående i `event`-fasen og blokkere AI. Turhoppet gjenoppretter `playing`, fjerner den gamle hendelsesmeldingen og starter neste tur.
- Døde spillere regnes aldri som `isLocalPlayerTurn` og kan derfor ikke bevege seg eller utføre handlinger.
- Online vises death-modal bare til klienten som eier den døde spilleren. Andre klienter blokkeres ikke av en annen spillers dødsskjerm.
- Permadeath-skjermen viser nå et eksplisitt valg:
  - `Spectate Game` når andre spillere fortsatt lever.
  - `Leave Game`, `Leave & Close Room` for en host, eller `End Game` lokalt.
- Hvis ingen overlever, avsluttes også solo-spill korrekt med `All players have perished. Game Over!`.
- Når en spiller velger å forlate et aktivt online-spill, sendes leave/kick-melding, session storage og nettverkssporing ryddes, PeerManager stenges og klienten returneres til en ren tittelskjerm.
- En eliminert gjests lokale spectate-valg beholdes over senere turn-syncs. Det samme death-eventet åpnes ikke på nytt hver gang turen skifter; bare et nytt eller erstattet death-event kan vises.
- Når hosten velger `Leave & Close Room`, håndterer gameplay-lytteren `kicked` direkte og returnerer alle gjester til en ren tittelskjerm i stedet for reconnect-loop.

## Endring – hovedskjerm og oppdateringslogg

- La til en synlig `Hall of Fame`-knapp på hovedskjermen.
- Hall of Fame kan åpnes uten å starte et spill.
- Viser lokal highscore og valgfri Community World Ranking i egne faner.
- Støtter filtrering etter målprofil og tydelig unverified-merking for community-resultater.
- Lokal Hall of Fame fungerer også når world-ranking-serveren ikke er konfigurert.
- Oppdaterte `What's New` med versjon `v0.10.0` datert 26. juli 2026.
- Changelogen beskriver den nye sluttskjermen, Victory Race/Overall MVP, lokal og global highscore, nullbasert målprogresjon, permadeath-rettelsen, spectatorvalg og korrekt solo game over.

## Forventet spillerflyt

1. Spilleren mottar fatal skade.
2. Spilleren markeres eliminert og mister umiddelbart handlingsrett.
3. Host/lokal klient flytter automatisk turen til neste levende spiller.
4. Hvis neste spiller er AI, starter AI-turnen automatisk.
5. Den døde spilleren velger om hen vil se resten av spillet eller forlate.
6. En spectator kan se turer, status og chat, men kan ikke bevege seg eller påvirke spillet.
7. Hvis hosten lukker rommet, returneres gjestene til tittelskjermen uten reconnect-loop.

## Tester og validering

GitHub Actions-run `30202703520` var fullstendig grønn før oppryddingscommiten:

- Dependency install: bestått.
- TypeScript: bestått.
- Full Vitest-pakke: bestått.
- Produksjonsbuild: bestått.
- ESLint: bestått.
- Playwright og Chromium: bestått.
- Komplett deterministisk lokal spillflyt: bestått.

Fokuserte tester dekker:

- Audience-state som beviser at en eliminert current player ikke kan handle.
- Store-flyter for solo game over, neste levende menneske og neste AI.
- Auto-turn fra `event` til `playing` etter en eliminert tur.
- At guest-klienten ikke kan gjøre det autoritative turhoppet.
- `Spectate Game`, `Leave Game` og `View Game Over` i DeathModal.
- At dismissed death-event beholdes lokalt over turbytter, men erstattes av en ny spillers death-event.
- At `kicked` håndteres i gameplay og kjører `cleanupActiveOnlineGame()`.
- Tittelknapp, Hall of Fame-skjerm, world-ranking-fallback og oppdatert `What's New`.

Den midlertidige debug-workflowen ble fjernet før merge. En siste ren GitHub Actions-kjøring uten diagnostikkfil kreves før fase 16V merges.
