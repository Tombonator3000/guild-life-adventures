# Guild Life — balansebaseline

Kilde: [113a774](https://github.com/Tombonator3000/guild-life-adventures/commit/113a7748e9c3c71d38eb4968d6175fae3a94543e). Frø 20260908–20261907; 1000 unike spillforsøk, 1000 fullførte spill.
Utfall: victory: 1000. Avbrutte eller fastlåste spill telles ikke som fullført.

## Varighet og seiersvilkår

| Målsett | Forsøk / fullført | Median uker | 90-persentil | Målseier | Siste overlevende |
| --- | ---: | ---: | ---: | ---: | ---: |
| quick | 250 / 250 | 15 | 20 | 250 | 0 |
| standard | 250 / 250 | 36 | 67 | 237 | 13 |
| adventure | 250 / 250 | 49 | 107 | 230 | 20 |
| epic | 250 / 250 | 98 | 148 | 151 | 99 |

Seiertypen klassifiseres fra siste tilstand: full måloppnåelse versus seier uten alle mål oppnådd. Det siste er siste-overlevende-regelen. Det er viktig å skille disse når et krevende målsett ser kort ut.

## Personligheter og tapsspiraler

| AI | Seire | Død i siste tilstand | Sult observert | Hjemløs observert | Forfalt lån observert |
| --- | ---: | ---: | ---: | ---: | ---: |
| grimwald | 381 (38.1%) | 193 | 249 | 63 | 60 |
| seraphina | 223 (22.3%) | 149 | 304 | 214 | 169 |
| thornwick | 291 (29.1%) | 182 | 744 | 438 | 23 |
| morgath | 105 (10.5%) | 375 | 424 | 246 | 280 |

Sult, hjemløshet og forfalte lån telles som antall spillerløp der tilstanden ble observert ved minst én ukegrense. Kortvarige problemer midt i uken kan dermed bli oversett. Sammenheng med tap er ikke alene bevis for årsak.

## Tidlig ledelse og opphenting

175 spill hadde en klar leder etter uke 5 (minst 5 prosentpoeng foran nummer to). Lederen vant 51 av disse (29.1%). I 5 av 1000 målbare spill vant en spiller som lå minst 20 prosentpoeng bak lederen i uke 5.

Dette er observasjoner av samlet, avgrenset målprogresjon. Målet har takeffekter og er ikke en kausal test av en comeback-mekanikk.

## Faktisk innholdsbruk

| Handling | Spill med vellykket bruk | Vellykkede forsøk | Avviste forsøk |
| --- | ---: | ---: | ---: |
| apply-job | 1000 | 13909 | 0 |
| buy-appliance | 896 | 14949 | 0 |
| buy-clothing | 1000 | 34388 | 0 |
| buy-equipment | 1000 | 19786 | 881 |
| buy-food | 1000 | 527503 | 4661 |
| buy-fresh-food | 289 | 1483 | 0 |
| buy-guild-pass | 890 | 2500 | 0 |
| buy-lottery-ticket | 578 | 2623 | 0 |
| buy-protection | 662 | 7239 | 0 |
| buy-stock | 100 | 1133 | 0 |
| buy-ticket | 815 | 7913 | 0 |
| buy-tip-off | 233 | 8561 | 0 |
| complete-location-objective | 1000 | 53964 | 0 |
| complete-quest | 1000 | 35084 | 0 |
| cure-sickness | 265 | 343 | 5 |
| deposit-bank | 764 | 43421 | 31918 |
| downgrade-housing | 0 | 0 | 5345 |
| explore-dungeon | 760 | 26473 | 10475 |
| graduate | 1000 | 15123 | 0 |
| heal | 662 | 16669 | 0 |
| move | 1000 | 922142 | 25 |
| move-housing | 714 | 1890 | 718 |
| pawn-appliance | 839 | 10317 | 0 |
| pay-rent | 1000 | 39670 | 0 |
| repair-appliance | 444 | 1837 | 509 |
| repair-equipment | 468 | 3609 | 0 |
| repay-loan | 340 | 1951 | 0 |
| request-raise | 983 | 12383 | 24982 |
| rest | 663 | 8329 | 0 |
| sabotage-player | 0 | 0 | 24295 |
| sell-stock | 56 | 139 | 0 |
| study | 1000 | 159662 | 96506 |
| take-bounty | 1000 | 18913 | 0 |
| take-chain-quest | 399 | 1793 | 0 |
| take-loan | 367 | 2476 | 0 |
| take-quest | 856 | 16279 | 0 |
| temper-equipment | 901 | 6482 | 0 |
| withdraw-bank | 364 | 3248 | 0 |
| work | 1000 | 781923 | 83460 |

## Metode og begrensninger

Måleren monterer produksjonens `useGrimwaldAI` og bruker faktiske store-handlinger og turregler. Fire personligheter roterer startrekkefølge. Målsett og vanskelighetsgrad roterer systematisk; detaljdata inneholder hver kombinasjon. Første frø i hver serie gjentas med identisk resultat. Ingen lønninger, priser, mål eller prioriteringer justeres av måleren.
Spillvalg: weather=true, festivals=true, aging=false, permadeath=true. Kun lyd, visuell reiseanimasjon og tilfeldig småprat utelates. Reacts engangsinitialisering skjer før den seedede RNG-en installeres.
Alle spillere er AI. Tilpasning mot menneskelige motspillere og menneskelig opplevelse må fortsatt testes separat. Nye byaktiviteter og NPC-tilbud har foreløpig ingen AI-generator og inngår derfor ikke i bruksfrekvensene. De autoritative handlingene er testet separat.

Reproduser med kommandoene i `scripts/balance/README.md`. `summary.json` inneholder aggregater og kilde-tre; `games.json.gz` inneholder alle frø, handlinger, avvisninger, sluttmål og ukentlige progresjonspunkter.
