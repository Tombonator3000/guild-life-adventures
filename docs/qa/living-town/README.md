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

## Recovery and verified delivery

Application source is identical to recovered GitHub commit `f7054bb6f0530c729cbc37feabeb053d8b4d4253`. The previous task's unpublished source was transferred from its cloud workspace and merged via PR #429 while local verification was in progress. This follow-up completes the test harness and missing evidence. No application changes were needed after recovery.

Validation on local Kubuntu using the production build, Bun 1.3.14, Three.js 0.180.0 and Playwright 1.61.1 / Chromium 149:

| Gate | Result | Evidence / limitation |
| --- | --- | --- |
| TypeScript | PASS | App and Node projects |
| Unit/component tests | PASS | 811 tests in 111 files |
| Production build | PASS | Existing large-chunk advisory |
| ESLint | PASS | Zero errors, 18 existing warnings; changed test also checked separately |
| Required browser journeys | PASS | 3/3, zero retries, 128.5 seconds; production preview, one worker, video/trace disabled |
| Revised living-town test | PASS | Repository configuration, 67.1 seconds, no retries; checks accumulation rate against effect time as well as coverage and melt |
| Visual inspection | PASS | Actual desktop and tablet viewport screenshots below; paired bird frames show movement; sparks clear the token; glints align with the water; snow follows roof planes |
| Input protection / fallback | PASS | Protected panel alpha zero; weather controls, rotation, reduced motion and forced WebGL fallback exercised |
| Hardware performance | UNVERIFIED | No physical iPad or Safari measurement |

The local browser run observed matching wind X values of 14.994 in both renderers, one confirmed forge burst, and roof snow coverage 0.637 before clearing the weather and verifying melt. Full numerical results and test durations are in [browser-results.json](browser-results.json).

The initial local run with continuous video/trace hit the 85-second snow wait at coverage 0.455 while the machine was under heavy memory pressure. Its trace grew to about 200 MB. One lightweight three-test run passed, but a subsequent run still timed out at coverage 0.527 under variable host load. The final test therefore checks snow growth against the actual effect clock (including its rate), allows at most 180 seconds to accumulate 26 effect seconds, and still requires more than 60% coverage followed by melting. It disables continuous recording while retaining explicit screenshots, console diagnostics and normal failure screenshots. This revised test passed with the repository configuration. Application timing and snow rates were not changed to make the test pass.

An 8-second software-rendered storm sample produced 117 intervals, 14.50 average fps, p95/p99 83.4 ms. This diagnostic does not meet 60 fps and is not a physical GPU/iPad result. No performance improvement or hardware performance guarantee is claimed. Viewport sizes were 1440 × 960 and 1180 × 820; the regression suite also exercises portrait/landscape layout and fallback.

Unaltered runtime captures:

- [3D birds over the original board](mesh-birds-desktop.png) · [Later flight frame](mesh-birds-flight.png)
- [Successful forge work and sparks](forge-action-sparks.png)
- [Reflections and rain rings](puddle-reflections.png)
- [Snow at the start](snow-start.png) · [Accumulated roof snow, desktop](snow-roofs-desktop.png)
- [Accumulated roof snow, tablet viewport](snow-roofs-tablet.png)

For a production check, run `bun run build`, start `bun run preview --host 127.0.0.1 --port 4173`, then run `bun x playwright test e2e/living-town.spec.ts e2e/material-weather.spec.ts e2e/three-weather.spec.ts --workers=1`. The living-town journey controls its own recording settings so CI and local runs retain the same animation assertions.
