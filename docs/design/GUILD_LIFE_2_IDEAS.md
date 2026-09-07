# Deferred: Guild Life 2

Owner decision, 7 September 2026: the larger city redesign, replacement HUD and new planning/gameplay systems below are ideas for a future sequel. They are not the current implementation plan. See CLASSIC_VISUAL_DIRECTION.md for the active scope. This archived brainstorm is in the owner's language.

# Guild Life Adventures: designbrief og idébank

7. september 2026. Kildegrunnlag: GitHub main på `244df16364606cb5432d2151428456e59ab30bca`, etter merge av PR 405. Gjennomgang av spillregler, jobb- og utdanningsdata, turavslutning, mål, alternativer og UI-komponenter. Publisert desktopgrensesnitt ble også inspisert i nettleser, med reise til Guild Hall. Det er ikke gjennomført en hel kamp eller en ny mobiltest i denne gjennomgangen. Forslag om balanse er hypoteser som trenger spilltesting. Ingen spillkode er endret.

## Retningen jeg anbefaler

Et sosialt livsstrategispill om å komme seg opp i Guildholm: fra enkle kår til et godt liv, mens andre spillere prøver å komme dit først. Fantasyverdenen gjør hverdagsproblemene morsomme: husleie, jobbintervju, skolepenger og dårlig mat eksisterer sammen med forbannelser, magiske husholdningsapparater og farlige ekspedisjoner.

Den viktigste ressursen er tid. Det mest interessante spørsmålet er: Hva skal jeg bruke denne uka på, og hva må jeg gi avkall på? Jobb gir inntekt, utdanning gir fremtidige muligheter, hjemmet gir trygghet, og eventyr gir risiko og fremgang. UI-et bør gjøre dette valget tydelig og morsomt.

Spillet har allerede mye innhold. Neste steg bør gjøre innholdet lettere å forstå, bruke og føle eierskap til. Behold humor, bybrett, økonomisk konkurranse og fantasyhverdagen.

## Slik fungerer spillet nå

1. Du starter i Slums med 100 gull, uten jobb, med grunnleggende klær og 50 prosent mat.
2. Hver spillertur representerer en uke med 60 tilgjengelige timer, før eventuelle straffer. Du reiser mellom 15 steder langs byens ring. Avstand og vær påvirker reisetiden.
3. Du bruker timer og penger på jobb, utdanning, mat, bolig, bank, utstyr, fornøyelser og eventyr. Krav til utdanning, erfaring, pålitelighet og klær knytter progresjonen sammen.
4. Når du avslutter turen, brukes resterende timer automatisk ut fra stedet: arbeid ved arbeidsplassen, hvile hjemme eller enklere hvile andre steder. Dette er en strategisk handling som knappen ikke forklarer godt nok.
5. Etter at spillerne har hatt tur, behandles ukeskiftet: blant annet mat, klær, økonomi, lån, hendelser og arbeidstilknytning. Husleie har fireukersintervall, selv om enkelte datafelt har navn som antyder ukentlig leie. Spillerne starter turene hjemme.
6. Du konkurrerer om å oppfylle alle aktive seiersmål. Standard i oppsettet er 5000 gull i beregnet nettoformue, 100 lykke, 45 utdanningspoeng og 75 pålitelighet mens du er ansatt. Eventyrmålet er valgfritt. Nettoformue trekker fra lån, men dagens formel er ikke et komplett regnskap over alle typer gjeld.

Dette viderefører Jones-strukturen med fire livsmål. Guild Life legger på blant annet oppdrag, dungeon, omdømme og magi. Standardmålet for utdanning betyr fem grader. Normalt krever det 50 studieøkter på seks timer, altså 300 studietimer før reise, arbeid og andre behov. Studiehjelpemidler reduserer antall økter; korte cram-økter finnes også. Dette er en indikasjon på repetisjon, ikke en måling av faktisk kampvarighet.

## Viktigste funn og forslag

| Område | Observert nå | Foreslått forbedring |
|---|---|---|
| Informasjonshierarki | Ressurser gjentas i venstre panel og midtpanelet; mål finnes flere steder. To sidepaneler bruker til sammen 24 prosent av desktopbredden. | Én fast ressurslinje. Én kompakt målvisning. Resten åpnes ved behov. Bruk frigjort plass til byen og aktuelle valg. |
| Mobil | HUD samler navn, fem ressurser, uke, marked, turknapp og flere ikonknapper på én rad. Flere tekster er 8–11 px. | To ryddige HUD-rader, større tekst, store berøringsflater og et handlingspanel nederst. Detaljer åpnes fra Town, Goals, Bag og Week. |
| Neste handling | Mange steder og systemer, men lite fremheving av hva som bringer akkurat denne spilleren videre. | Et valgfritt festet delmål: «Kvalifiser til Shop Clerk». Vis manglende krav og relevante steder. Spilleren velger mål selv. |
| Career | Seiersmålet er pålitelighet ved ansettelse, selv om jobbdata også har karrierenivå og figuren har guild-rang. | Forklar dagens mål tydelig. Vis jobbstigen separat. Eventuell overgang til et reelt karrierenivå som seiersmål må være en egen regelendring. |
| Turavslutning | End Turn kan utløse svært forskjellig bruk av gjenværende timer. | Vis konkret forhåndsvisning: «Avslutt her: bruk 12 timer på arbeid». Ta med kjente trekk og varsler. Unngå ekstra bekreftelse hver gang. |
| Arbeidsresultat | Enkelte visninger beregner inntekt direkte som timer × lønn × 1,15. Den faktiske handlingen har også festival-/spillerpåvirkning og trekk. | Én felles beregning for forhåndsvisning og faktisk handling. Vis brutto, trekk og netto når det er relevant. Dette er funnet ved kodegjennomgang; avvikstilfellene er ikke reproduksjonstestet her. |
| Hendelser | En reisehendelse uten valg erstattet handlingspanelet og krevde Continue under nettleserbesøket. | Kort melding og lesbar historikk for små hendelser. Eget panel ved viktige konsekvenser eller et faktisk valg. Meldinger må kunne leses uten tidspress. |
| Liv og personlighet | NPC-dialog, stedsbakgrunner, omdømme og innredet hjem finnes allerede. Stedsbakgrunner vises svært svakt bak paneler. | Gjør eksisterende scener og NPC-reaksjoner mer synlige. La kjøp og milepæler endre hjem og byens respons. |

## Tre visuelle konsepter

Tre separate konseptbilder ble laget i samtalen. De er idéillustrasjoner, ikke implementerte skjermbilder eller eksakte kart-/regelspesifikasjoner.

**1. Bybrett med et fast handlingspanel.** Byen fyller mesteparten av skjermen. En samlet HUD viser penger og tid. Et panel til høyre viser valgt sted, kostnad, planlagt resultat og rivalaktivitet. Mål ligger i en kompakt rad nederst. Det åpne torget i bildet er et større kunstnerisk forslag: dagens brettbilde har et stort innebygd midtfelt, så bare å fjerne UI-et vil ikke skape denne byen. Et kartløft krever nytt eller utvidet bakgrunnsmotiv, bevaring av alle 15 spillsteder og ny kontroll av treffsoner og reiseruter. Første implementasjon bør beholde dagens lokasjonsrekkefølge. Stolper og kartplassering i konseptet er illustrative.

**2. Mobil med byen over og handlingen under.** Vis et lesbart utsnitt av byen, med mulighet til å se hele kartet eller velge sted fra en liste. Et panel nederst viser reisekostnad, mulig aktivitet og primærknapp. Reiseknappen utfører bare reisen; totalprisen for reise pluss klasse er en planleggingsvisning. Etter ankomst velger spilleren klasse. Hele kartet må fortsatt være raskt tilgjengelig, slik at god mobilstørrelse ikke fjerner den strategiske oversikten.

**3. Besøk hos Korr i smia.** Arbeidsgiveren står i en scene, med eksisterende humor og et ryddig handlingspanel. Tid, inntekt og neste karrieresteg er synlige. Eksemplet viser Apprentice Smith: åtte timer med åtte gull i timen gir 73 gull med den enkle 15 prosent-bonusen, før andre modifikatorer eller trekk. En endelig UI-visning må også vise kjente endringer i lykke og andre ressurser. Behold eksisterende figurers identitet når endelige illustrasjoner lages.

Felles stil: varmt tre, lys pergament, messing, tydelig typografi og moderat dekorasjon. Sans serif til tall og forklaringer, karakterfull serif til overskrifter. Primærknapper skal ha konsekvent farge og minst omtrent 44–48 CSS-pikslers berøringsflate som designmål. Unngå å krympe hele desktoplayouten til telefon.

## Gameplay-idéer som bygger på eksisterende systemer

**A. Gjør uka planleggbar.** Fest inntil tre intensjoner, for eksempel arbeid, mat og skole. Vis samlet kjent tidskostnad og hva som blir igjen til andre behov. Start med en planleggingsvisning; eventuell automatisk utføring må stoppe ved hendelser, endrede priser eller manglende forutsetninger. Ikke gi gratis reise eller omgå regler.

**B. Reduser gjentatte klikk ved arbeid og studier.** Velg et antall økter og se konsekvensene før start. Utfør de vanlige handlingene én etter én, med mulighet til å stoppe. Dette bevarer tidsøkonomien. En enkelt lang arbeidsøkt kan i dagens logikk gi andre resultater enn flere korte, fordi blant annet pålitelighet og skifttelling øker per handling. En slik forenkling må derfor ikke bare slå sammen timer.

**C. Gjør karriereveien til en konkret ambisjon.** Vis nåværende jobb, et valgt neste yrke, forventet lønnsforskjell og de faktiske kravene. Skill «kvalifisert» fra «ledig jobb» der tilbudslogikken krever det. Akademiet bør fortelle hvilke jobber en grad åpner, og jobbskjermen bør kunne vise relevante grader. Dette bruker eksisterende jobb- og gradsdata.

**D. La rivalene skape historier.** Motstanderhandlinger kan allerede vises, men er avslått som standard. Lag en kort oppsummering av observerbare milepæler: ny jobb, fullført grad, bedre bolig, dyrt uhell. Spilleren kan følge utviklingen uten å se hvert klikk. Behold skjulte forhold skjult dersom modusens regler krever det. Ikke innfør kunstige bonuser til AI for å skape dramatikk.

**E. Gjør bylivet til strategiske muligheter.** Festivaler har allerede tidsplan og bonuser. Fremhev neste festival og handlinger den påvirker. Et synlig festivalforvarsel gir grunn til å spare, studere eller planlegge en ekspedisjon. Værmeldinger om fremtidig tilfeldig vær krever en egen beslutning om hvor mye spilleren faktisk kan vite. Start med kjent vær og kjent varighet, ikke garantert informasjon om fremtidige kast.

**F. Gjør hjemmet til følelsesmessig progresjon.** Utvid eksisterende romscene: varmt lys når du har råd til komfort, synlige bøker etter studier, bedre innredning og reaksjoner fra besøkende. La hver større investering få et tydelig visuelt resultat og en forståelig nytte. Et hjemkjøp kan representere trygghet, tidsbesparelse og personlighet samtidig.

**G. Knytt eventyr tydeligere til livet i byen.** Bruk eksisterende oppdrag og dungeon som alternative måter å finansiere utdanning, skaffe omdømme eller oppnå en livsambisjon. Presenter risiko og kostnader før avreise. Unngå at alle effektive strategier må gå gjennom dungeon; en arbeidende borger bør være en interessant og levedyktig vei til seier.

**H. Gi ukeskiftet en kort fortelling.** En oppsummering med «Dette tjente du», «Dette kostet livet», «Dette oppnådde du» og «Dette bør du vite neste uke». Marker milepæler fremfor å ramse opp alle interne statsendringer. Et eksisterende avis-/nyhetssystem kan være presentasjonsramme, fremfor enda en uavhengig meny.

**I. Tydeligere spillmoduser.** Quick, Standard, Adventure og Epic finnes allerede som målforvalg. Gjør forskjellene lettere å forstå, og vurder en vennlig introduksjonsmodus uten permanent død. Permanent død er aktiv som standard nå. Eventuelle endringer i moduser bør være bevisste, synlige valg som også fungerer likt for vert, gjest og AI.

**J. Mer situasjonsbestemt byliv.** Smia lyser mens arbeidet foregår, NPC-er søker ly i uvær, markedet pyntes til festival og hjemmet gjenspeiler velstand. Fortsett med få, lokale bevegelser og rolige lydlag. Miljøeffekter bør ikke skjule klikkmål eller bremse turene. Behold Full, Calm, Off og redusert bevegelse. Fugler, røyk og lys skal støtte lesbarhet og stemning.

## Rekkefølge for videre arbeid

| Trinn | Leveranse | Hva vi bør kontrollere |
|---|---|---|
| 1 | Samlet HUD, større mobilkontroller, tydelige måltekster og konsekvensvisning | Nye spillere kan finne penger/tid, forklare Career og forutsi effekten av End Turn. Gjør standardmål konsistente mellom oppsett og store-default; oppsett har 100 lykke, store-default har 75. |
| 2 | Jobbsti, gradsoversikt og færre gjentatte klikk | Samme ressurstrekk og hendelser som manuelle handlinger; ingen forskjell mellom lokal, AI og nettspill. Kontroller lønnsforhåndsvisning og klær som arbeidskrav. |
| 3 | Ukeoppsummering, rivalmilepæler, synlige festivalmuligheter | Mindre venting og flere forståelige beslutninger. Mål tid per tur, klikk per uke og misforståelser i spilltest. |
| 4 | Nytt kartmotiv og levende stedsbesøk | Alle 15 lokasjoner tilgjengelige, samme reiselogikk, god desktop-/mobiloversikt, lesbarhet og ytelse på faktisk telefon. |
| 5 | Eventuelle balanseendringer og mer varierte seiersveier | Flere spillbare strategier, rimelig kampvarighet og tilfredsstillende sluttfase. Endre én hovedhypotese om gangen. |

Gjennomfør korte spilltester med nye spillere og erfarne Jones-spillere. Be dem forklare hvorfor de valgte å jobbe, studere eller reise. Hvis de kan klikke riktig, men ikke forklare konsekvensene, er UI-et fortsatt uklart. Kontroller særlig om sluttfasen blir en passiv jakt på siste mål, om fem grader oppleves som arbeid, og om økonomiske tilbakeslag har forståelige veier tilbake. Dette er åpne designspørsmål, ikke dokumenterte balansefeil.

## Kilder og sporbarhet

- [Gjennomgått GitHub-revisjon](https://github.com/Tombonator3000/guild-life-adventures/tree/244df16364606cb5432d2151428456e59ab30bca)
- [Oppsett og målforvalg](https://github.com/Tombonator3000/guild-life-adventures/blob/244df16364606cb5432d2151428456e59ab30bca/src/components/screens/GameSetup.tsx)
- [Turavslutning og automatisk tidsbruk](https://github.com/Tombonator3000/guild-life-adventures/blob/244df16364606cb5432d2151428456e59ab30bca/src/store/helpers/turnHelpers.ts)
- [Seiersberegning](https://github.com/Tombonator3000/guild-life-adventures/blob/244df16364606cb5432d2151428456e59ab30bca/src/store/helpers/questHelpers.ts)
- [Utdanning](https://github.com/Tombonator3000/guild-life-adventures/blob/244df16364606cb5432d2151428456e59ab30bca/src/data/education.ts)
- [Mobil HUD](https://github.com/Tombonator3000/guild-life-adventures/blob/244df16364606cb5432d2151428456e59ab30bca/src/components/game/MobileHUD.tsx)
- [Stedspresentasjon](https://github.com/Tombonator3000/guild-life-adventures/blob/244df16364606cb5432d2151428456e59ab30bca/src/components/game/LocationShell.tsx)
- [Jones-bakgrunn og manualarkiv hos Sierra Gamers](https://www.sierragamers.com/jones-in-the-fast-lane/)

Den tidligere delte X-artikkelen var ikke fullt tilgjengelig. Ingen forslag her fremstilles som verifiserte råd fra den artikkelen.
