# Online flerspiller og sikkerhet

## Autoritetsmodell

Hosten er eneste autoritet for spilltilstanden. En gjest sender en forespørsel med handlingsnavn, argumenter og request-ID. Hosten utfører handlingen mot sin store og sender deretter resultat og ny tilstand tilbake.

## Tillatte handlinger

`ALLOWED_GUEST_ACTIONS` er en eksplisitt allowlist. Interne tur-, belønnings-, fullførings- og debughandlinger skal aldri legges til der. Nye sammensatte handlinger bør få egne semantiske metoder, for eksempel `purchaseNewspaper`, fremfor klientstyrte kombinasjoner av `modifyGold`, `spendTime` og belønningskall.

## Valideringskrav

En host-autoritativ handling skal validere:

- at spiller-ID tilhører den tilkoblede gjesten,
- at det er spillerens tur når handlingen krever det,
- at spilleren står på riktig lokasjon,
- at målet finnes og er lovlig,
- at pris, tid og effekt hentes fra kanoniske spilldata,
- at spilleren har nok gull, tid og øvrige forutsetninger,
- at hele endringen skjer i én atomisk store-oppdatering.

## UI-regel

Gjeste-UI skal ikke vise suksess før hostens synkroniserte tilstand eller action-resultat bekrefter handlingen. Knapper bør låses mens forespørselen venter for å hindre duplikater.

## Testing

Nye nettverkshandlinger skal ha tester for:

- gyldig handling,
- feil aktør,
- feil lokasjon,
- utilstrekkelige ressurser,
- manipulerte pris- eller effektargumenter,
- at ingen delvis endring skjer ved avvisning.
