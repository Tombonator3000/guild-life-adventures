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
