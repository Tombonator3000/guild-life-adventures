# Arkitektur

## Oversikt

Guild Life Adventures er en Vite/React-applikasjon med Zustand som sentral spilltilstand. Spillet støtter lokal flerspiller, AI-motstandere og host-autoritativ online flerspiller.

## Hovedområder

- `src/components/screens/` – tittelskjerm, spilloppsett, lobby og seier.
- `src/components/game/` – spillbrett, lokasjonspaneler, HUD, modaler og overlays.
- `src/store/gameStore.ts` – opprettelse av store og sammensetting av handlingsmoduler.
- `src/store/helpers/` – domenehandlinger for spillere, økonomi, turer, arbeid, utdanning, oppdrag og forbannelser.
- `src/hooks/ai/` – handlingsgenerering, strategi, utførelse og adaptiv AI.
- `src/network/` – lobby, synkronisering, action-proxy og validering av gjestehandlinger.
- `src/data/` – statiske spilldata, priser, lagring og migrering.
- `src/test/` og `*.test.ts(x)` – enhets- og regresjonstester.

## Tilstandsregler

Komplekse kjøp og tjenester skal være atomiske store-handlinger. Klienten sender bare identifikatorer og valg; hosten slår opp pris, tidskostnad, krav og effekt. UI-et skal ikke kombinere flere rå `modify*`-kall for én handling.

Online gjester utfører ikke spillhandlinger lokalt. `NetworkActionProxy` sender tillatte handlinger til hosten, som validerer aktør og argumenter før tilstanden endres og synkroniseres tilbake.

## Lagring

Lagringsformatet har versjonsnummer og normaliseres ved innlasting. Nye vedvarende felt må:

1. få en trygg standardverdi i spiller- eller spilltilstanden,
2. tas med i normaliseringen,
3. dekkes av migreringstest,
4. gjenopprettes eksplisitt i `loadFromSlot`.

## PWA og oppdateringer

Spillet er installérbart som PWA, men service worker cacher bevisst ingen applikasjonsfiler. Dette reduserer risikoen for at gammel JavaScript eller CSS blir liggende etter en deploy. `version.json` brukes som primær oppdateringskontroll.
