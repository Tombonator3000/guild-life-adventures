# Playability — skjermbilder og verifikasjon

Dette er faktiske Chromium-skjermbilder fra spillet. PNG-filene er kopiert uendret fra CI. Revisjon, kjøring, opprinnelig filnavn og SHA-256 står i [kildemanifestet](screenshots/sources.json). Alle bilder fra første kontroll nedenfor gjelder `6dd579c`, [CI 34182998684](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34182998684).

| Spillreise | Bilde | Kontroll |
| --- | --- | --- |
| Ukeplan, 390×844 | [Denne uken](screenshots/this-week-390x844.png) | Samme brettforhold, separate handlinger, situasjonsriktige råd med tutorial avslått |
| Bank, 390×844 | [Bankhandlinger](screenshots/bank-390x844.png) | Innskudd/uttak på første side, lokal kvittering og synlige kontrollflater |
| Megler, 844×390 | [The Broker](screenshots/broker-844x390.png) | Faktisk kjøp/salg, gebyrer og navngitte banktjenester |
| Arrangement, 844×390 | [Byaktivitet](screenshots/city-activity-844x390.png) | Pris, tid og faktisk begrenset utfall før et frivillig valg |
| NPC-minne, 390×844 | [Personlig tilbud](screenshots/npc-memory-390x844.png) | Synlig navn/portrett og engangstilbud fra et registrert oppdragsvalg |
| Gjenstander, 1280×720 | [Butikk og inventar](screenshots/painted-items-1280x720.png) | Samme malte gjenstandscelle i butikk og inventar, originale portretter og brett |
| Inventar, 844×390 | [Kompakt portrett](screenshots/inventory-844x390.png) | Rettet på `dd4568a`: opprinnelig portrett, synlige faner og gjenstanden helt innenfor skjermen |
| Lån, 844×390 | [Loans](screenshots/loans-844x390.png) | Rettet på `dd4568a`: arbeidshistorikk og lånevilkår uten kvittering fra forrige banktjeneste |

Den første grønne kjøringen bestod 752 enhetstester, 32 nettlesertester uten retries, seedet simulatorprøve, typegate, build, lint og lydkontroll. Den visuelle kontrollen fant likevel et inventarpanel uten tilstrekkelig høyde i liggende mobil og en salgskvittering som fulgte med til Loans. Rettelsene og den nye kontrollen dokumenteres i [Gauntlet-loggen](../../AUDIT_LOG_PLAYABILITY.md).

Sluttkontroll av implementasjonen: [CI 34183620307](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34183620307) på `dd4568aaee581fa989cd6f9f53695857bb3da377` bestod samme samlede gate, med 752 enhetstester og 32 nettlesertester uten retries. De to siste bildene er fra denne kjøringen og er visuelt inspisert. Gjenstandstesten krever nå full synlighet i viewport på desktop og begge mobilretninger. Deretter er bare dokumentasjon og bevis lagt til.

[Balanserapporten](balance/report.md) inneholder 1000 fullførte spill på frosset produksjons-AI, med [aggregater](balance/summary.json) og [alle spillerløp](balance/games.json.gz). Fire målsett har 250 spill hver; null fastlåste spill, ukegrense-avbrudd eller fangede runtimefeil. AI-baselinen bruker ikke nye byaktiviteter eller NPC-tilbud; disse er kontrollert separat med autoritative handlinger og nettleserreiser.

Fysisk Samsung S24, mobil nettleserchrome/tastatur og langvarig 60 fps er ikke verifisert her. Den utvidede app-typesjekken har fortsatt de samme 185 eksisterende diagnostikkene som ved start; ingen nye diagnostikker ble introdusert. Originale brettbilder, NPC-portretter og spillerfigurer er bevart. Handlingsvinduene bruker sider/tjenester; inventarets eksisterende innholdsområde kan fortsatt rulles.
