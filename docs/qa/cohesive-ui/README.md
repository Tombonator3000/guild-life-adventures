# Cohesive UI - Gauntlet record

Baseline: main `6d62e4d`, tree `34f1ec3a227191d3e57f9e360f840df377b37c1e`.
Reference and complete surface inventory: [design contract](../../design/COHESIVE_UI.md).
Review performed sequentially by the implementing agent; no independent-user or
independent-agent evaluation is claimed.

| Observation | Evidence | Player impact | Correction | Verification |
| --- | --- | --- | --- | --- |
| Options has gray low-contrast controls and a narrow form | Actual live Options capture and source | Weak hierarchy; wasted desktop width | Shared parchment/wood frame, readable type, gold selections | PASS: final runtime review below |
| Most support menus have hand-built modal containers | Source wrappers in Options, SaveLoad, Manual, Credits, news, scores | Inconsistent focus, Escape and close targets | Shared GuildDialog with Radix focus/dismissal and 44 px Close | PASS: nested-menu browser journey |
| Manual chapters run horizontally | UserManual source | Chapters hidden off-screen | Desktop chapter index and narrow labelled select | PASS: desktop/tablet journey |
| Required quest branch exposes a dead Close button | QuestPanel passes no-op onCancel | Button appears broken; extra full-screen window | Required choice owns the current center quest page | Focused regression passes |
| Credits initially show a viewport of blank space and ignore music mute | CreditsScreen spacer and direct Audio volume | Delayed access; unexpected sound | Immediate content, optional rolling, existing music preferences | PASS: music/motion regression and runtime review |
| Online heading uses dark ink on dark background | OnlineLobby source | Hard to identify the screen | Gold/cream title and brass/parchment cards | PASS: online-entry capture and Back/name retention |
| Decorative wood frames inherit hover transforms | index.css generic wood-frame rule | Non-controls jump on hover | Limit hover/active rule to actual buttons | PASS: source and runtime check |

Local checkpoint: production build, app/build TypeScript, 779 existing unit tests
and two new focused regressions pass. ESLint has zero errors and 18 inherited
warnings. Full browser validation, visual quality and delivery remain pending.
This record is updated after validation of the final revision.

New runtime coverage: `e2e/menu-consistency.spec.ts`, alongside the existing full
browser suite. CI captures each system dialog at four sizes and each location on
the original board. Physical desktop/iPad Safari performance remains UNVERIFIED.


## First complete CI review

Runtime `b5aa60717bdfcc210bd925977dee72b8c9831eb5` (tree
`f4f28619f056487f0e9f91ec5f2dd60febd0c41b`) passed 781 tests in 107 files,
app/build TypeScript, production build, lint, seeded balance and audio gates.
[CI run](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34787777209).
The 49 existing browser scenarios passed. All 15 location visits and service
selections completed, including the separate homes. The five new scenarios failed
on the same measurement: a nominal 44 px Close target was measured during the
normal scale-in animation. Measurement now waits for fonts and finite opening
animation completion, with 0.1 px tolerance for floating-point coordinates. Layout
assertions remain gates but are soft so later captures survive a layout finding.

[Runtime captures](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34787777209/artifacts/10327362551)
were inspected at native size and as contact sheets. The original board, scenes
and location controls stayed inside their frame. Shared gold service selections
read consistently across the 15 locations. Findings corrected for the next run:

- Off switches nearly disappeared into the paper. Added a darker track outline
  and distinct thumb.
- Home rest/sleep/Done and legacy Jones buttons retained unrelated flat or
  blue/green styles. They now use shared gold and parchment with 44 px controls.
- The Options/install initial captures were partly in motion; settled captures
  and the remaining support-menu journeys are still pending.

Delivery and the final browser/visual gate remain pending. This is sequential
review, not an independent user evaluation or a physical Safari measurement.


## Final verified runtime

Runtime `29f07ff312c6f69d2bbe1cda4a0b37db3328a017`, tree
`7b0d23a0368bfe0215386ce798d6aee33dc33179`, is the accepted implementation.
[Final CI run](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34788453371)
/ job `103808139495` passed every configured gate:

| Gate | Result |
| --- | --- |
| App/build TypeScript and production build | PASS |
| Unit tests | 781 passed in 107 files |
| Browser journeys | 54 passed, no failed or flaky cases reported |
| ESLint | 0 errors, 18 inherited warnings |
| Seeded balance smoke | PASS, 3 games |
| Audio audit | PASS, no silent or duplicate assets |

[Final runtime captures](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34788453371/artifacts/10326559947)
include all four support-menu sizes (1440x900, 1024x768, 768x1024, 390x844), the
iPad install guide, every location and the existing gameplay captures. Reviewed
native-size manual, large-text Options, online entry, in-game save menu and
furnished phone home, plus contact sheets of every support screen and all 15
locations. The revised Off controls are distinct on parchment. Home actions
match the shared buttons. All manual chapters remain available, with a compact
selector on portrait tablet and phone. Gold selection, dark headers, paper
reading areas and reachable footers form a consistent hierarchy. No blocking
visual mismatch remains against this design contract.

Keyboard checks pass for Escape, nested dialogs, trapped Tab and focus return.
Save/change/load, banking, jobs, Cave, online synchronization and reconnection
remain covered by the full regression suite. The surface inventory includes
source-reviewed conditional views; it does not claim every possible saved-game
state was visually exercised. Physical iPad Safari, sustained frame rate and
thermal behavior remain UNVERIFIED.

This final checkpoint changes documentation only. The implementation stays at the
verified runtime above. Merge and publication verification are recorded on
[PR #421](https://github.com/Tombonator3000/guild-life-adventures/pull/421).
