# Three.js atmosphere — 14 September 2026

Base: `181980f6645ab592dc790603b9a15ceb17a8f637` (includes opponent tactics / home return, PR #427).
Scope: the existing Guild Life top-down board, artwork, tokens, rules and menu layout remain authoritative. Desktop and tablet are the primary targets.

## Selected direction

A layered 2.5D atmosphere using the installed Three.js 0.180.0. Procedural shaded cloud sheets drift at different speeds, with offset soft shadows; instanced rain streaks vary in depth, speed and size; slow glossy camera droplets leave narrow wet trails along the board edges. A branching edge lightning stroke and short light wash follow the existing thunder event.

The camera droplets use procedural lighting and highlights. They do not refract the live DOM/game board. This avoids duplicating the board as a GPU texture or capturing menus every frame.

Alternatives considered: replacing the map with a full 3D town would change the approved game; fullscreen volumetric ray marching and refraction would increase GPU work and complicate menu readability. Layered shader geometry preserves the intended look and has a bounded workload.

## Acceptance checks

1. Clouds, moving rain, wet trails and storm light are visibly present on the actual board.
2. Central panels, sidebars, HUD and dialogs remain clear and clickable; effects never intercept input.
3. Weather changes reuse one renderer. Desktop/tablet resize changes dimensions and budgets without losing the context.
4. Calm/reduced motion removes animated WebGL; Off removes atmosphere; context/shader/import failures retain the established Canvas weather.
5. Snow, fog, forge work and delayed thunder still work. No weather logic or gameplay random sequence is changed by our visual sampling.

## Implementation and budget

- One transparent WebGL canvas, shared existing 30 Hz atmosphere clock; token/UI animation keeps its own timing.
- Five draw calls maximum during a strike: cloud shadows, clouds, rain, droplets, lightning. Two in clear weather, four in rain.
- Up to 300 rain streaks / 20 camera drops / 4 clouds + 4 shadows on desktop. Coarse pointers (including iPad desktop-site mode) or viewports below 1024 CSS px use 120 / 10 / 3 + 3. Harvest rain uses about one third of the storm streak count.
- DPR capped at 1.25 desktop, 1 for coarse pointers/narrow layouts. No depth buffer, multisampling, postprocessing, per-frame DOM reads or pixel readback in production.
- Measured board bounds and protected UI rectangles clip the shader. ResizeObserver, protected-panel mount/unmount, resize, scroll and completed transitions update those bounds.
- Existing 2D rain/cloud-shadow/camera-drop strokes are suppressed only after the Three renderer succeeds. Smoke, leaves, wildlife, forge/tower lights, puddles, fog, snow and festival effects stay in their existing layer.
- Geometry, materials, context, observers and callbacks are released on removal. Background-tab pausing uses the existing environment policy.

## Review and corrections

| Observation | Impact | Correction / verification |
| --- | --- | --- |
| First cloud/drop pass was too faint in runtime screenshots | Too little visual improvement | Increased shaded cloud volume, bead size and wet-trail contrast; inspected recaptured gameplay |
| A breakpoint change recreated the renderer on the same canvas after context disposal | Context loss could leave empty weather | Keep the renderer across resize, adjust instance budgets/DPR in place; browser asserts a live context after tablet rotation |
| Existing forge regression scrolled a control while the mobile layout was remounting | Test could fail on a detached element | Wait for the mobile work control before scrolling; retain all original work/raise/audio assertions |

## Proposed next effects (not implemented in this change)

| Priority | Effect | Placement / trigger | Why it fits |
| --- | --- | --- | --- |
| 1 | Wind shared by smoke, leaves and cloud movement | Gusts across town; stronger in storms | Makes existing layers feel like one weather system |
| 2 | Warm puddle reflections and stronger local ripples | Existing puddles near paths, only during/after rain | Adds depth to the painted ground without inventing a river |
| 3 | Short forge spark bursts and heat glow | Successful work/smithing action at the forge | Makes a player action visibly affect the town |
| 4 | Snow accumulation masks on roofs and tree tops | Gradual change during a snowstorm; retreat after it ends | Gives winter a material change beyond falling particles; requires masks matched to the actual board art |
| 5 | Small rune pulse and drifting motes at the Enchanter's Tower | Successful magical purchase/action | Fits the fantasy town and draws attention only when relevant |
| 6 | Brief tournament confetti instead of continuous screen filling | Festival announcement / round start | Strong event punctuation with quieter normal turns |

Technical references consulted: [Three.js renderer documentation](https://threejs.org/docs/) for renderer options, DPR and cleanup; exact shipped API/types checked against the repository's installed 0.180.0 dependency. The art direction and proposed effects above are design judgments.

## Final validation

Tested source revision: `2b94a3a018fc1dbcb5492afc0ed56bcca72051e4`. The following documentation-only commit records evidence for those exact source files.

| Gate | Result | Evidence / limits |
| --- | --- | --- |
| Behavior | PASS | `three-weather.spec.ts`: actual new-game path, live GPU context and nonempty rendered pixels, weather switch, immersive mode, resize/rotation, snow, reduced motion and forced WebGL loss |
| UI protection | PASS | GPU readback sampled 151,055 painted pixels, zero alpha at the protected panel centre; forge work/raise and developer controls remain usable |
| Visual | PASS for inspected desktop/tablet layouts | Unaltered production-build screenshots below; cloud/rain movement checked across frame captures. These are Chromium viewport checks, not Safari/iPad hardware tests |
| Regressions | PASS for focused scope | 11 unit tests; two browser journeys, including existing forge, weather/audio and phone-layout regression; TypeScript (app/node), scoped ESLint and production build pass |
| Performance on test host | MEASURED, below 60 fps | 8 s headless software-rendered storm: 174 frame samples, average 21.57 fps, p95 83.4 ms, p99 116.6 ms. The host uses SwiftShader, not a hardware GPU. This is not evidence of device performance |
| Sustained desktop/iPad 60 fps | UNVERIFIED | Requires production build on real target devices. Effect paint cadence intentionally remains 30 Hz; gameplay/UI target remains 60 Hz |
| Delivery | Approved for GitHub branch / PR | User explicitly approved publishing the source and screenshots. Upload uses the connected GitHub account because local Git has no HTTPS login. No merge or production deployment is claimed. |

`gpu-pixels.json`, `cloud-runtime-timing.json`, `browser-results.json` and `unit-tests.txt` retain the checks. Existing font requests to Google failed in this restricted test environment; screenshots therefore use the game's fallback fonts. Build retains the project's existing large-chunk warning.

Actual gameplay captures:

- [Desktop immersive storm](storm-immersive.png)
- [Tablet landscape 1180 × 820](rain-tablet-1180.png)
- [Tablet portrait 820 × 1180](rain-tablet-820.png)

The blank parchment visible inside the mobile board art is part of the existing painted board with the actionable menu moved below it; this change does not redesign that layout.


Delivery checkpoint: the user approved publishing `agent/three-weather-atmosphere` to `Tombonator3000/guild-life-adventures` and opening a PR after the initial automatic review rejection. The source revision above identifies the locally tested implementation; API publication preserves its file contents, with this delivery-note update only.
