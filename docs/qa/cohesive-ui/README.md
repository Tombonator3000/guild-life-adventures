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
