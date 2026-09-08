# Playability — Gauntlet-logg

Base: `4f003ce86e556295b1f2d1be17d13fd11264583b`. Branch: `agent/guild-life-playability`.
Arbeidsordre: [handlingsplan](design/PLAYABILITY_ACTION_PLAN.md).

## Baseline

Tidligere faktiske Chromium-bilder fra VFX-runden viser strukket mobilbrett og bankoversikt før handlinger: tre sider stående, seks liggende. Koden bruker `backgroundSize: 100% 100%` og generisk kolonnefragmentering for banktjenestene. Denne uken finnes ikke som samlet spilleroversikt; situasjonstips er knyttet til tutorial-valget.

Første korreksjon: mobil får et koordinatbevarende brett med samme bildeproporsjon og separat plass til det eksisterende handlingspanelet. Banken får navngitte tjenester og direkte bankhandlinger. Råd avledes fra faktisk spillerstatus og eksisterende regler.

Ingen merge eller produksjonsdeploy utføres automatisk.
