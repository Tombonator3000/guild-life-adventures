# Living town atmosphere — 14 September 2026

Base: `225b59b7a79d4888c17eeb7d5d253c52460b72a0`, after Three.js weather PR #428 was merged.

## Delivered scope

| Request | Implementation |
| --- | --- |
| Smoke and leaves follow the same wind | One deterministic wind/gust field and accumulated drift shared by Canvas and Three.js. Smoke leans with the current wind; leaves, clouds, falling rain and snow use the same direction. Weather changes do not teleport the drift field. |
| Light reflected in puddles | Re-anchored effects to the three actual painted puddles near the slums/fence; warm window and cool sky glints, broken horizontal reflection strips, rain rings and a storm-light response clipped to the water. These are stylized light reflections, not ray-traced reflections of the live DOM. |
| Forge sparks when working | Short ballistic spark bursts and hearth glow after confirmed same-job work-shift progress at the forge. No button-click prediction. Rejected/repeated snapshots do not emit; local save-load replacement is excluded. At most three short overlapping bursts. |
| Snow gradually collects on roofs | Sixteen hand-traced roof-plane masks, including chimney cutouts. Soft drifts, fine grain and edge highlights build over about 42 seconds of active atmosphere time, then melt over about 55 seconds after snow (18 in drought). Existing roof art remains visible. Ruined slum roofs are intentionally not blanketed across their holes. |
| Occasional 3D birds | Actual XYZ body/head/beak/tail and articulated wing geometry. 3 birds on compact/coarse-pointer devices, 5 on desktop; wingbeat/glide cycles, banking, light shading and ground shadows. A 13-second crossing every 54 seconds, alternating direction. No flock crossings in thunderstorms or snowstorms. Existing graveyard crow controls remain; the old crossing sprite flock is only used as fallback. |

The board, tokens, gameplay rules, jobs, wages, weather costs and menus are unchanged. This layer does not mutate gameplay state or persist decorative snow/bursts into saved games.

## Acceptance and review

- Actual new-game / hire / forge-work path must trigger one burst, then expire it.
- Snow must grow while snowing, remain immediately after weather changes, then melt; UI remains clear.
- Birds must be real non-flat geometry, infrequent and absent during dangerous weather.
- Full/Calm/Off, reduced motion, hidden-tab pausing, resize and WebGL fallback must remain functional.
- Source build, types, focused tests and actual production-browser captures must agree.

| Finding | Impact | Correction |
| --- | --- | --- |
| Old puddle anchors did not match the painted water | Light appeared on dry ground | Re-traced the three visible puddles in original board UV coordinates |
| Initial snow had large high-contrast dots | Looked like white pebbles, not accumulating snow | Soft overlapping drifts over finer grain and a translucent continuous base |
| Low forge sparks could sit behind the player token | Successful work feedback was easy to miss | Higher/larger ballistic arc, still anchored to the existing hearth |
| Bird depth is unnecessary during rain/cloud-only frames | Avoidable framebuffer work | Only clear the depth buffer when a flock is visible; bird material uses a single double-sided pass |
| Slow software-rendered test time differs from wall time | A 20-second test wait was too short to reach the intended flight position | Wait for the existing effect clock with a bounded software-host allowance; do not increase production animation speed |

## Performance and lifecycle

One shared 30 Hz atmosphere clock and one WebGL renderer. No new dependency, image-generation service, texture download, live DOM capture or render loop. Roof snow uses one 1536px-wide cached atlas, updated at 1/16 coverage steps; only roof bounds are copied during frames. Wind/snow state persists across renderer resize and does not advance twice when both surfaces render the same clock sample. Sparks expire on that same clock and are cleared when animated effects are disabled.

Physical desktop/iPad sustained 60 fps and Safari are **UNVERIFIED**. Headless Chromium/SwiftShader measurements are diagnostics, not device-performance claims. External Google Fonts are unavailable in this test environment, so screenshots use the existing fallback fonts.

## Final checkpoint

Tested local source commit: `5a489594d1e508d5b409210eacfca29f96d1e967`.
Tested source tree: `f351e0914ce87c2e8e87821b7556cc30cdb68bc8`.
The delivery checkpoint adds this evidence only; application source is identical.

- Production Vite build: PASS (existing large-chunk advisory remains).
- Application and Node TypeScript checks: PASS.
- ESLint for all changed source/test files and `git diff --check`: PASS.
- Focused unit/component suite: 18/18 PASS across TownAtmosphere, EffectManager, useStorm and GameBoardCanvas.
- Production Chromium end-to-end suite: 3/3 PASS, 0 retries/flaky failures, 210.9 seconds on the final run. Includes living-town actions, material/weather regressions and Three/Canvas fallback controls.
- Final observed snow coverage before melting: 0.612; one confirmed forge burst; shared Canvas/WebGL wind X: 14.848 in both layers. No app exceptions or shader errors.
- Software-rendered storm timing: 139 samples, 17.23 average fps, p95 133.3 ms, p99 166.7 ms. This does **not** meet or verify 60 fps; it is not a physical desktop/iPad benchmark. No performance uplift is claimed. Hardware testing remains open.
- Expected harness limitations: unavailable external fonts, aborted music request during navigation, ReadPixels diagnostic stall and unsupported WEBGL_lose_context warning. Controls and forced fallback still pass.

Unaltered final runtime captures:

- [3D birds over the original board](mesh-birds-desktop.png)
- [Successful forge work and sparks](forge-action-sparks.png)
- [Reflections and rain rings](puddle-reflections.png)
- [Accumulated roof snow, desktop](snow-roofs-desktop.png)
- [Accumulated roof snow, tablet viewport](snow-roofs-tablet.png)

Run the regression tests with `npx playwright test e2e/living-town.spec.ts e2e/material-weather.spec.ts e2e/three-weather.spec.ts`. This checkpoint used a production preview on port 4189, one worker and headless Chromium/SwiftShader; the tablet capture is a viewport test, not physical-device validation.
