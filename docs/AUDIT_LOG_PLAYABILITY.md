# Playability — Gauntlet-logg

Base: `4f003ce86e556295b1f2d1be17d13fd11264583b`. Branch: `agent/guild-life-playability`.
Arbeidsordre: [handlingsplan](design/PLAYABILITY_ACTION_PLAN.md).

## Baseline

Tidligere faktiske Chromium-bilder fra VFX-runden viser strukket mobilbrett og bankoversikt før handlinger: tre sider stående, seks liggende. Koden bruker `backgroundSize: 100% 100%` og generisk kolonnefragmentering for banktjenestene. Denne uken finnes ikke som samlet spilleroversikt; situasjonstips er knyttet til tutorial-valget.

Første korreksjon: mobil får et koordinatbevarende brett med samme bildeproporsjon og separat plass til det eksisterende handlingspanelet. Banken får navngitte tjenester og direkte bankhandlinger. Råd avledes fra faktisk spillerstatus og eksisterende regler.

Ingen merge eller produksjonsdeploy utføres automatisk.

## 2026-09-08 — første nettleserkontroll og korrigering

CI `34180368139` på `15b68a7`: typegate, enhetstester, build, lint og lydkontroll bestod. Browser ga 5 feil. Faktiske PNG-er viste originale brettproporsjoner i begge mobilretninger; bankhandlinger var direkte tilgjengelige. Feilene avdekket banktoasts over knapper, skalert knapp under panelinnlasting og huleinformasjon skjøvet ut av første side i landskap. Bankkvitteringer vises nå lokalt, panel-skalering fjernes og hulas kompakte grense tilpasses den nye dokken. Eldre tester for skjult uttaksknapp og obligatorisk ekstra vare-side oppdateres til synlig blokkering og tilgjengelig siste vare. Ingen tvungen scrolling eller omtegning av brettet.

Steg 2: 48 malte gjenstandsceller, felles ItemIcon for butikk/inventar/preview, kostnads-/utfallsrader for mat, utstyr og undervisning, korte numeriske ressursendringer og diplomer/stillinger. Produksjonsøkonomi gjenbrukes. Ressursmarkeringer respekterer Off/Calm og reduced motion.

Steg 3: 15 avgrensede aktiviteter ved eksisterende steder, med autoritativ ID-validering og én aktivitet per spiller/uke. Fire nye domenetester består, inkludert falske argumenter, feil aktør, replay og save/load. Vanlige info/bonusmeldinger samles; helgehendelser var allerede samlet. Kritiske hendelser beholder egen bekreftelse. Rapportinnhold bruker samme sideinndeling som lokasjoner.

## 2026-09-08 — kritisk review av stedskomponenten

Kjøring `34181333295`, revisjon `99ce30f`: 746 enhetstester, build, typegate, lint og lydkontroll bestod, men browser viste 21 feil/5 bestått. Faktisk screenshot og `error-context.md` fra mobilbanken viste «Maximum update depth exceeded» i feilgrensen. Rotårsaken var et nytt objekt fra en Zustand 5-selector i LocationShell. Tre primitive/stabile selectorer erstatter objektselectoren. En ny integrasjonstest monterer den virkelige LocationShell mot faktisk Zustand-store, utfører en aktivitet og avslutter festivalen; den består. Dette var en reell UI-regresjon, ikke et snapshot som skulle godtas. Nettleserkontrollen kjøres på nytt på `9e20976`.

NPC-favoritter følger seks konkrete, eksisterende oppdragsvalg. Valget registreres først etter autoritativ validering; ugyldige valg og ukjente lagringsnøkler ignoreres. Engangstilbud tar kun en ID på nettverket, validerer aktør/sted/tid/helse/minne og lagrer en begrenset kvitteringsliste. Kritisk review la også til blokkering for en annen spillers aktive stedshex og bokføring av faktisk gullforbruk.

Rivalrapporter sammenligner offentlig tilstand ved turstart/turslutt. De inkluderer faktisk automatisk arbeid ved turavslutning, ikke bare eksplisitte klikk. Nye turer skriver over forrige rapport. Ingen skjulte bankbeløp, oppdiktede hensikter eller ekstra figurer.

Simulatorens røykprøve fullførte alle fire målsett og gjentok første frø identisk. 1000 frø måles i fire disjunkte serier på frosset kilde `f04d8e6` (tilsvarende GitHub `113a7748e9c3c71d38eb4968d6175fae3a94543e`); produksjons-AI, økonomi og turregler er uendret av måleren. UI-rettelsene etter dette påvirker ikke kjøringene. Detaljrapport og avbruddsantall legges til etter fullføring.

## 2026-09-08 — fullført balansebaseline og visuell detaljkontroll

1000 av 1000 unike spill fullført, null fastlåste/ukegrense-avbrudd og null fangede runtimefeil. Fire serier gjentok sitt første frø identisk. Alle fire målsett har 250 spill, med rotert rekkefølge og vanskelighetsgrad. Medianvarighet: Quick 15, Standard 36, Adventure 49, Epic 98 uker. Epic hadde 99/250 siste-overlevende-seire; dette må ikke forveksles med rask måloppnåelse. Full lossless-detaljdata og aggregater er lagret under `docs/qa/playability/balance`. Baseline måler eksisterende AI; den bruker ikke nye byaktiviteter eller personlige tilbud. Handlingsavvisninger og personlighetsforskjeller står synlig i rapporten.

CI `34182254977` på `9e20976`: 752 enhetstester og simulator-røykprøve bestod. Browser: 28 bestått, 3 gjenstandstester feilet på feil testnavn (“Dagger” versus “Simple Dagger”) og menyåpning før reiseanimasjon var ferdig. Én eldre dev-aktivering var flaky og bestod retry; testen venter nå på den faktiske tittelanimasjonen før femklikk-gesten. Faktiske screenshots bekrefter bank/Broker/Loans/Overview, byvalg og NPC-tilbud på desktop og begge mobilretninger. NPC-navn under snakkeboblen i stående mobil og en manglende oversettelsesnøkkel for tomt våpenspor ble også identifisert og rettet.

## 2026-09-08 — grønn CI og inventarfunn fra faktisk bilde

CI `34182998684` på `6dd579c`: alle 752 enhetstester, 32 nettlesertester uten retries, simulatorprøve, build, typegate, lint og lydkontroll bestod. De faktiske PNG-ene bekreftet rettet NPC-navn og våpentekst, bankhandlinger og ukeplan. Inventarbildet i 844×390 avslørte likevel at det store portrettet tok nesten hele panelets høyde. `toBeVisible` bekreftet bare at elementet var rendret, ikke at det var innenfor synsfeltet. Portrettet beholder samme bilde og forhold, men får en kompakt rad i lav mobil-landskapvisning. Gjenstandstesten krever nå `toBeInViewport({ratio:1})`. Ny samlet CI kreves før levering.

Bildet av Loans viste også kvitteringen fra forrige aksjesalg. Banktjenestene får hver sin React-nøkkel slik at midlertidig kvittering og inntastinger starter på nytt ved tjenestebytte. Nettlesertesten avviser lekket salgskvittering på lånesiden.

## 2026-09-08 — verifisert implementasjon

CI `34183620307` på `dd4568aaee581fa989cd6f9f53695857bb3da377` bestod alle steg: 752 enhetstester, reproduserbar tre-spillsprøve, typegate, produksjonsbygg, lint, lydkontroll og 32 nettlesertester uten retries. Faktiske nye PNG-er fra artefakt `10039889224` viser hele gjenstanden og et kompakt originalportrett i 844×390, samt lånesiden uten en fremmed salgskvittering. Den skjerpede viewport-asserten består i 390×844, 844×390 og 1280×720.

Åtte uendrede runtime-PNG-er med revisjon, kjøring og SHA-256 er bevart i [QA-pakken](qa/playability/README.md). Den utvidede app-typesjekken er sammenlignet med startbaseline: samme 185 eksisterende diagnostikker, ingen nye. Git-diffen for grafiske ressurser inneholder bare de nye gjenstandsatlasene og deres metadata; brett, portretter og figurer er ikke byttet ut. Etter denne funksjonskontrollen tilføyes bare planstatus, logg og QA-bevis. PR #412 leveres samlet for gjennomgang; ingen automatisk merge eller produksjonsdeploy.
