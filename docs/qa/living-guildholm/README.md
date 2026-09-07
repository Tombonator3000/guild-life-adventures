# Living Guildholm - Gauntlet checkpoint

Date: 2026-09-07. Base: f6f1aa71199b63f705b170e27d5f3a37f2a9957f.

## Target and acceptance

Keep the existing illustrated ring-board artwork and game rules. Add restrained life at real artwork anchors: smoke, forge embers, warm tavern/bank lighting, magical tower windows, leaves and passing birds. Weather must reflect the current game weather. Controls and travel must remain usable; decoration must respect reduced motion, hidden tabs and a mobile particle budget.

Reference supplied: https://x.com/AleiahLock/status/2096607552628781312 . Search indexed the article title, but direct fetch returned 403 and the browser timed out. Full article content is UNVERIFIED. No implementation claim is attributed to unread article text. The user's explicit environmental brief and existing board are the visual targets.

## Findings and corrections

| Observation | Evidence / impact | Correction | Verification |
| --- | --- | --- | --- |
| Weather tooltip counts starting location | Canvas used `getPath(...).length`, while travel charges edges; adjacent snow travel shows 3h but charges 2h | Use path distance for extra weather hours | Regression compares rendered tooltip with actual store deduction |
| Rain and lightning paint over action panels | Old weather z-index 35 versus center panel z-index 10 | Put all environment in one isolated z-index 1 group, zones above it, center unchanged | Browser weather and bank action journey prepared |
| Decorative rain consumes global randomness and duplicates streaks/droplets | Old renderer creates 120 drops plus streaks, splash and sliding-window drops | Deterministic SVG precipitation in board coordinates; 64 desktop or 24 mobile storm drops | Renderer regression, mobile browser count |
| No control over continuous board animation | Crow, festival and weather loops run regardless of reduced motion or hidden tab | Full/Calm/Off local preference, live system media subscription, visibility pause | Component regressions and browser media change |
| Mobile options tabs lose accessible name | Label span hidden below sm breakpoint | Explicit label on tab buttons | Browser locates Display by accessible name at 390px |

## Validation

- Targeted unit/component regressions: PASS, 24 tests including existing component boundaries.
- Initial TypeScript check: PASS.
- Full unit suite: PASS, 718 tests across 86 files. Production build: PASS. ESLint: PASS. CI browser results pending at first checkpoint.
- Baseline production game opened and visually inspected in cloud Chrome.
- Local preview service runs, but cloud browser rejects the internal preview address with ERR_BLOCKED_BY_CLIENT. Local interactive visual QA unavailable in this environment.
- CI browser suite captures all six weather states, desktop/mobile bank actions and mobile settings. Artifacts now upload on success as well as failure for inspectable evidence.
- Physical Samsung S24 performance and sustained 60 fps: UNVERIFIED. CI frame timings are explicitly labeled and cannot establish physical-device performance.

No new gameplay state fields, migrations, network actions, external services or runtime dependencies.

## First CI review (bd3d3f6)

Run: https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34090919421

- TypeScript, 718 unit tests, build, lint and audio integrity: PASS.
- Existing browser regression suite: 12 PASS, including online rejoin, rejected Sabotage/Fence actions and room closure.
- Two new environment journeys: FAIL before reaching the board. Trace reports that the title welcome paragraph intercepts the intended developer button. Corrected the existing button's stacking order and shortened the test gesture timeout to fail promptly. This keeps actual UI clicks in the test rather than bypassing the bug with forced clicks.
- All 42 local audio files also passed decoding/silence/duplicate checks.
- Follow-up CI and screenshots must be reviewed before promoting PR #405 from draft.


## Final automated verification (4b1a685)

Run: https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34091717238

| Gate | Result | Evidence |
| --- | --- | --- |
| TypeScript, production build, ESLint | PASS | Same-source CI run above |
| Unit/component regressions | PASS | 718 tests across 86 files |
| Browser regressions | PASS | All 14 tests passed in 1.8 minutes, including six weather states, actual changing smoke transform, mobile bank action, display controls, reduced motion and existing online tests |
| Audio integrity | PASS | 42 files; no invalid, silent or duplicate files |
| Manual visual review | UNVERIFIED | CI created screenshots, but the local execution environment disconnected before images could be opened |
| Physical S24 / sustained 60 fps | UNVERIFIED | No physical device available; CI timing does not establish device performance |
| Delivery | PASS for draft source PR | PR #405; no merge or production deployment |

Screenshot artifact: https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34091717238/artifacts/10007151759 (10.8 MB). Includes desktop clear/rain/snow/fog/drought/storm, a later storm frame, desktop and mobile bank action, and mobile display settings.

The final checkpoint commit changes documentation only; runtime and tests are identical to the verified 4b1a685 revision. PR stays draft until someone can inspect the actual screenshots. The next concrete step is to open these artifacts, review artwork alignment and legibility, and correct any demonstrated visual gaps before merge.
