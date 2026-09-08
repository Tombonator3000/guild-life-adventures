# Additive board VFX implementation — 2026-09-08

Base: `c6e87e2a7e20401b7095ab2a36845a9825737e84` (merged plan, PR #409).
Branch: `agent/board-vfx-implementation`.
Reference: `docs/design/BOARD_VFX_IMPLEMENTATION_PLAN.md`.

## Delivery scope

One implementation PR with staged commits covers the four planned slices. This avoids parallel dependent PRs. The original board image, buildings, portraits, token components, movement rules and menu geometry are preserved. No concept river or invented resource rows were added.

The DOM board now has a shared EffectManager, a world/local Canvas2D layer and a screen Canvas2D layer. Native WebGL samples the original board for optional drought shimmer. Smoke, painted leaves, cloud shadows, existing crows, sparse bird flocks, forge embers, tower light, localized puddles, rain, snow, dust, fog and festival decoration use the same paused clock. Old standalone SVG/CSS effect components and their independent particle loop are removed.

Screen effects clear explicit UI regions; world effects clip the active center-panel rectangle. All surfaces are pointer-transparent and hidden from accessibility APIs. Existing Full/Calm/Off storage is retained. Calm and OS reduced motion paint still lighting/decoration; Off unmounts surfaces. Hidden tabs suspend the shared clock and thunder. Mobile caps precipitation at 120 and the total pooled sprite budget at 180, with DPR capped at 1.25 (desktop 480 / 1.5).

Existing icons receive small embossed medallions. Sidebar paper, wood and scenic background use existing structure and portrait art. All border themes, including default None, remain available.

## Gauntlet findings

| Observation | Impact | Correction / evidence |
| --- | --- | --- |
| Two generated transparency attempts contained checkerboards | Visible squares would pollute the board | Rejected both. Selected a black-matte atlas with one-time runtime alpha extraction. |
| Independent old effects had separate animation paths | Duplicate motion and inconsistent lifecycle | Removed old renderers; one manager owns RAF scheduling. |
| Structural test named retired components | Test checked outdated architecture | Updated it to require BoardEnvironment while retaining token/location delegation checks. |
| Screen mask could miss portal dialogs and custom panel movement | Camera effects could remain beneath translucent UI | Observe portal mounting and center-panel geometry markers; clear protected regions. |
| Local browser installation unavailable in the prior session | No trustworthy runtime screenshots yet | Use repository CI browser journeys and inspect its actual PNG artifacts. |
| Work environment disconnected before checkpoint | Previous turn could not publish | Files recovered intact on 2026-09-08; continue on the same branch. |

## Validation checkpoint

Implementation is awaiting complete runtime review. Unit suite, production build, lint and baseline-aware app type comparison are in progress. Browser journeys cover existing banking, forge work/raise and mobile menu actions, all six weather states, all four festivals, and Full/Calm/Off. Performance numbers must be reported with the exact browser/build conditions; physical Samsung S24 remains unverified without device evidence.

No merge or production deployment has been performed by this work.

## First runtime review — 35acb66

Run: https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34175854816

733 unit tests, build, TypeScript workflow check, lint and audio audit passed. Browser suite: 18 passed, 1 failed. Weather/festivals, bank, forge work/raise, Cave, updates and mobile journeys passed. The guided first turn failed because the noninteractive contextual tip intercepted the Guild Hall click. Its body is now pointer-transparent; its close button remains interactive. The original guided-turn journey stays unchanged and must pass on the correction commit.

Inspected actual CI PNGs: clear, snow, drought, tournament, storm/forge and mobile storm/bank. Original art and menu structure are intact, new material icons are legible, smoke/leaf textures have no black squares, and actions remain readable. Snow revealed missing desktop frost because corners were behind sidebars: anchor frost to the visible board rectangle and keep the painted branches inside it. Pennant proportions were too narrow: use square atlas dimensions. Added sparse screen-space foreground flakes/confetti and a shared screen reservation so festival+storm combinations obey the total mobile cap. Added pixel-alpha, static Calm-clock, mobile snow/drought and WebGL ready/fallback evidence to the next browser run.

The board SHA-256 still equals `fcbbcaaf3d711628a11e4b9a4d9680bf4652a467b31deda6bb1338a7c6aa6d80`. Token/portrait components and location data have no diff from the base. The explicit app TypeScript check has exactly the same 185 pre-existing diagnostics as baseline, with no added or removed diagnostic lines after normalizing source line positions.
