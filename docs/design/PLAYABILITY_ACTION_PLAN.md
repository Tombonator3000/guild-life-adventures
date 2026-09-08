# Guild Life — handlingsplan etter VFX

Dato: 2026-09-08. Base: `4f003ce86e556295b1f2d1be17d13fd11264583b` (PR #410).
Eierbestilling: implementer analysen, først mobilens proporsjoner, bankens handlingssider og «Denne uken», deretter resten.

## Fast utgangspunkt

Samme brettbilde, bygninger, portretter, figurer og top-down spill. Behold eksisterende økonomi, autoritative nettverkshandlinger, tilgjengelighetsvalg og lagringer. Mobil kan plassere dagens handlingspanel under/ved siden av det samme brettet. Ingen intern scrolling i handlingsvinduene. Grafikk og klikksoner skal følge samme koordinater.

## Rekkefølge og akseptanse

| Steg | Leveranse | Observerbart krav | Kontroll |
| --- | --- | --- | --- |
| 1 | Mobilbrett, bank, Denne uken | Originale bildeproporsjoner i begge mobilretninger; innskudd/uttak på første side; maks tre situasjonsriktige råd også når tutorial er avslått | 390×844, 844×390 og desktop; bankhandling og reise; råd med renteforskudd/lånefrist |
| 2 | Tydelige handlinger og grafisk respons | Felles visning av kostnad, tid, utfall og blokkering; malte gjenstandsbilder i butikk/inventar; korte ressurs- og milepælmarkeringer | Virkelige kjøp/studier/arbeid; redusert bevegelse; ingen nye spillregler i UI |
| 3 | Aktive arrangementer og ukesrapport | Valg ved eksisterende steder under festival/vær; begrenset deltakelse; vanlige ukemeldinger samlet, alvorlige hendelser tydelige | Autoritative valideringer, avvist/gjentatt handling, save/load og browserreise |
| 4 | Balansemåling | Reproduserbare komplette spill med produksjonsregler/AI; maskinlesbar rapport og Markdown; varighet, mål, strategier, tapsspiraler og innholdsbruk | Fast seed, liten CI-prøve og minst 1000 spill; skill fullførte spill fra avbrutte |
| 5 | NPC-minner og rivaler | Konkrete eksisterende oppdragsvalg får senere NPC-respons/tilbud; synlige rivalhandlinger oppsummeres fra faktisk state | Ingen oppdiktede AI-begrunnelser; eldre saves og nettverk; begrensede/validerte tilbud |
| 6 | Sluttkontroll | Original grafikkidentitet bevart, nye spillreiser dokumentert, ingen nye app-typefeil | Relevante tester + full CI; inspiser faktiske bilder; én samlet PR uten automatisk merge |

Balanseendringer krever målt grunnlag. Eksisterende fame/infamy, oppdragsforgreninger, AI-hastighet, karrierevisning og festivalbonuser bygges videre på. Oppgave #395 brukes for simulatoren og #394 for nettleserdekning.

## Status

Avkrysning gjelder implementert funksjonalitet. Samlet nettleser- og leveransekontroll fullføres i steg 6.

- [x] Steg 1 — mobil, bank og ukeplan
- [x] Steg 2 — handlinger og grafikk
- [x] Steg 3 — arrangementer og rapport
- [x] Steg 4 — simulator og baseline
- [x] Steg 5 — NPC-er og rivaler
- [x] Steg 6 — verifisert leveranse

Fullført implementasjon: [Gauntlet-logg](../AUDIT_LOG_PLAYABILITY.md), [faktiske skjermbilder](../qa/playability/README.md) og [1000-spillsrapport](../qa/playability/balance/report.md). Samlet funksjonskontroll på `dd4568a`: 752 enhetstester og 32 nettlesertester uten retries, samt simulatorprøve, typegate, build, lint og lydkontroll bestod.

Fysisk Samsung S24 og langvarig 60 fps er ikke verifisert i arbeidsmiljøet. Utvidet app-typesjekk har 185 eksisterende diagnostikker ved start; nye feil skal ikke aksepteres. Fremdrift, korreksjoner og kilderevisjon for bevis føres i `docs/AUDIT_LOG_PLAYABILITY.md`.
