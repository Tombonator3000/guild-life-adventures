# Cohesive UI - Gauntlet record

Baseline: main `6d62e4d`, tree `34f1ec3a227191d3e57f9e360f840df377b37c1e`.
Reference and complete surface inventory: [design contract](../../design/COHESIVE_UI.md).
Review performed sequentially by the implementing agent; no independent-user or
independent-agent evaluation is claimed.

| Observation | Evidence | Player impact | Correction | Verification |
| --- | --- | --- | --- | --- |
| Options has gray low-contrast controls and a narrow form | Actual live Options capture and source | Weak hierarchy; wasted desktop width | Shared parchment/wood frame, readable type, gold selections | Pending runtime review |
| Most support menus have hand-built modal containers | Source wrappers in Options, SaveLoad, Manual, Credits, news, scores | Inconsistent focus, Escape and close targets | Shared GuildDialog with Radix focus/dismissal and 44 px Close | Added nested-menu browser journey |
| Manual chapters run horizontally | UserManual source | Chapters hidden off-screen | Desktop chapter index and narrow labelled select | Added desktop/tablet journey |
| Required quest branch exposes a dead Close button | QuestPanel passes no-op onCancel | Button appears broken; extra full-screen window | Required choice owns the current center quest page | Focused regression passes |
| Credits initially show a viewport of blank space and ignore music mute | CreditsScreen spacer and direct Audio volume | Delayed access; unexpected sound | Immediate content, optional rolling, existing music preferences | Muted/reduced-motion regression passes; runtime pending |
| Online heading uses dark ink on dark background | OnlineLobby source | Hard to identify the screen | Gold/cream title and brass/parchment cards | Added online-entry capture |
| Decorative wood frames inherit hover transforms | index.css generic wood-frame rule | Non-controls jump on hover | Limit hover/active rule to actual buttons | Source and runtime check |

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
