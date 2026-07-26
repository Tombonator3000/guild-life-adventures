# Fase 16V – permadeath, spectatorvalg og sikker turfortsettelse

Dato: 26. juli 2026

## Feilen

Når en spiller døde med permadeath aktivert, ble spilleren korrekt markert med `isGameOver`. Auto-turhooken forsøkte deretter å kalle `checkDeath()` en gang til. Den funksjonen returnerer tidlig for en spiller som allerede er markert død, og auto-turhooken tolket dette som at den ikke skulle avslutte turen.

Resultatet var en game-breaking lås:

- Den døde spilleren ble stående som aktiv spiller.
- Spilleren kunne fortsatt forsøke å bevege seg rundt på kartet.
- Andre menneskelige spillere og AI fikk aldri startet turene sine.
- Spectator-visningen eksisterte, men spillet kom ikke frem til en ny aktiv spiller.

## Endring

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

## Forventet spillerflyt

1. Spilleren mottar fatal skade.
2. Spilleren markeres eliminert og mister umiddelbart handlingsrett.
3. Host/lokal klient flytter automatisk turen til neste levende spiller.
4. Hvis neste spiller er AI, starter AI-turnen automatisk.
5. Den døde spilleren velger om hen vil se resten av spillet eller forlate.
6. En spectator kan se turer, status og chat, men kan ikke bevege seg eller påvirke spillet.

## Tester

- Audience-state-test som beviser at en eliminert current player ikke kan handle.
- Store-tester for solo game over, neste levende menneske og neste AI.
- Hook-test som beviser at en død autoritativ tur automatisk går videre fra `event` til `playing`.
- Hook-test som beviser at guest-klienten ikke kan gjøre det autoritative turhoppet.
- DeathModal-test for `Spectate Game`, `Leave Game` og `View Game Over`.
- Strukturtest for per-klient death-modal, spectatorvalg, zero-survivor-avslutning og reell nettverksopprydding.
- Full GitHub Actions-validering kjøres før merge.
