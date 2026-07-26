# Fase 16W – avviste online-handlinger og ikke-blokkerende Fence-gambling

Dato: 26. juli 2026

## Bekreftede feil

### Paneler låst etter avslag

Sabotage-, protection- og tip-off-panelene brukte lokal `pending`-state. Når hosten avviste en online-handling, fikk gjesten feilmelding umiddelbart, men panelet fikk ikke vite hvilket request som var avslått. Det forble derfor låst med `Waiting for host…` frem til 10-sekunders fallback-timeout.

### Gambling åpnet blokkende event

`gambleAtFence` satte `phase: 'event'` og `eventMessage` etter hvert menneskelig veddemål. Dermed åpnet hvert raske bet et blokkende eventpanel som måtte lukkes manuelt.

## Rettelser

- `NetworkActionProxy` lagrer actionnavn og argumenter sammen med request-ID.
- En felles `subscribeActionResult`-kanal varsler panelene når hosten svarer eller requesten faktisk timer ut.
- SabotagePanel låser opp umiddelbart ved avvist `sabotagePlayer`.
- FenceProtectionPanel låser opp umiddelbart ved avvist `buyProtection` og `buyTipOff`.
- Resultatmatching krever riktig actor/player-ID i tillegg til mål, option eller ukeantall.
- 10-sekunders timeout beholdes kun som fallback dersom hosten ikke svarer.
- `gambleAtFence` endrer ikke lenger `phase`, `eventMessage` eller `eventSource`.
- Samme odds, innsats, tidsbruk, gull, lykke og statistikk beholdes.
- Lokale spillere og host får resultatet som en ikke-blokkerende toast.

## Tester

- Nettverksresultat-test for requestmetadata, avslag, success og ukjent request-ID.
- Store-test som bekrefter at et gyldig Fence-bet lar spillet stå i `playing` med `eventMessage === null`.
- Tre komponenttester som faktisk klikker tjenesten, bekrefter `Waiting for host…`, simulerer host-avslag og bekrefter umiddelbar opplåsing for:
  - sabotage
  - protection
  - tip-off

## Avgrensning

Ingen priser, sannsynligheter, effekter eller seiersregler er endret. Endringen gjelder responsivitet og presentasjon av resultater.
