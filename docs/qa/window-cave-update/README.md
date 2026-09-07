# Window, Cave and update pass

PR: https://github.com/Tombonator3000/guild-life-adventures/pull/408
Base: d5a71f9 (merged PR407). Preserve the city, center frame and original caricatures.

## Acceptance and implementation

- Location services wrap into complete rows. Very shallow frames use a service chooser showing the same complete grid. Long content turns with Previous/Next, with no inner scrollbars and no duplicate live controls. Keyboard focus reveals its page; changing an inner service resets to its first page.
- Cave planning separates Explore, Prepare gear and Run records. Encounters retain original woodcut art with restrained light/motion. Dark ink, explicit encounter progress, health before/after and a gold ledger clarify each outcome. Combat choices stay in a fixed footer; story and outcome explanations expand on demand. Small landscape frames show a compact enemy/health overview. Banter cannot cover an active dungeon.
- Retreat and settlement previews use the canonical payout calculation, including rank/festival adjustments. Blood Moon excludes springs from the draw; an old saved spring explains its blocked state. Host-owned actions and save fields are unchanged.
- One shared deployment monitor bounds requests, checks on focus/reconnect and each minute, and supports both marker fields. Startup mounts directly. Update Now saves a local game before guarded cache refresh; online sessions must finish or be left first.

## Review and corrections

| Observation and evidence | User impact | Correction |
| --- | --- | --- |
| Initial CI 34103981587: paged work/application controls not reachable by old journeys; page retained after inner service changes | Players could land beyond the newly opened content | Reset inner-service page, compact work overview, explicit service picker in shallow frames; tests use actual page buttons |
| CI 34121058282: Smithing first page showed only an icon; Cave choices were on a separate page | Almost empty landing view and unclear next action | Keep Forge title/icon together; compact Cave story; dock encounter choices outside the page flow |
| CI 34122408881: 19 browser journeys passed; reviewed phone captures still showed banter over Cave and no enemy on page one | Mobile encounter obscured | Hide banter during active runs, compact landscape enemy/health overview, allow portrait encounter cards to fragment |
| Explicit application type comparison found a missing records icon import | Opening populated Run records could crash | Restore import and extend the real retreat journey through records |
| User screenshot promised no healing during Blood Moon yet offered Healing Spring | UI contradicted the rule | Filter new encounter pool and explain blocked old encounters; exercise all six floors |

## Deployment investigation

GitHub Pages run 34101881407 successfully published merged PR407. Lovable project metadata reports latest source commit d5a71f9, confirming source sync. Neither proves the exact build currently served by the custom domain.

The existing SW has no application asset precache and may remain byte-identical across releases; version polling is the primary signal. The old hook only recognized buildTime, duplicated registration timers and did not check on wake/reconnect. main.tsx separately awaited an unbounded root-path request and reloaded from localStorage history. The new monitor compares the running bundle with the deployed marker. Production emits version and buildTime from the same build timestamp.

The live custom domain could not be inspected from this environment. A push is not itself evidence of publication. After release, retain an older guild-life.com tab, publish the new build, focus the tab (or wait one minute), and confirm Update Now appears and Continue Game restores the saved player after clicking it. The automated update journey changes the manifest response; it does not publish to the domain.

## Verification

Verified runtime: e872a8e047e55b33159cdc1b01e1819fc026a19e.
CI: https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34123923654
Job: 101748029461. Runtime screenshot artifact: 10019454628 (38 PNGs).

731 unit tests in 91 files and all 19 browser journeys passed, together with production build, configured type check, ESLint (27 inherited warnings / 0 errors) and audio integrity audit. Final changes after this runtime are documentation only.

| Gate | Result | Evidence |
| --- | --- | --- |
| Required behavior | PASS | Wrapped services and final goods reached at all three sizes; real Cave entry, result, retreat, settlement and populated records; update notification/save/reload journey |
| Visual quality | PASS | Inspected final desktop encounter/outcome, compact landscape outcome, Forge title and update banner; phone encounter/outcome and market captures reviewed in preceding identical-layout revision |
| Regressions | PASS | 731 unit tests, 19 browser journeys and production checks; no additions to the separately tracked application type baseline |
| Reviewable delivery | PASS | Source and reproducible journeys in PR408; original board/frame/caricatures preserved |
| Custom-domain release | UNVERIFIED | Requires an actual publication and an older live tab; no production deployment performed |
| Physical-device performance | UNVERIFIED | Browser viewport tests are not a physical phone benchmark |

Final image review confirmed landscape health before/after and encounter gold on page one, with Continue/Retreat always reachable. Cave art and titles remain visible on the first portrait page; extended stats and explanations turn pages. In tiny landscape frames the compact overview comes first, with full encounter details on following pages. Banter does not obscure an active dungeon. The update screenshot was captured after its entrance animation and shows the actual rendered prompt.

Previous runtime e0c94ae passed 731 unit tests in 91 files, 19 browser journeys, production build, configured root type check, lint (27 inherited warnings) and audio audit. CI 34122408881 / job 101743251014; screenshot artifact 10018861516. Explicit application type checking on the corrected revision retains the baseline's 185 diagnostics, with no additions; the configured root check is not proof of a clean application-level check.

Browser coverage: all ten workplaces and core classic loop, tutorial first turn, online rejection recovery, market services and final goods at 1280×720 / 844×390 / 390×844, actual Cave entry/encounter/retreat/settlement/records, and update notification/save/reload. Motion respects Full/Calm/Off and reduced-motion preferences. Physical-device frame rate, speaker balance and the next custom-domain publication remain unverified.

No merge or production deployment performed.
