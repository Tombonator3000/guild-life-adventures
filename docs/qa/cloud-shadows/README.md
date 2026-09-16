# Cloud Shadow Ground Layer

Base revision: `7704185c684fd0974b1e0fcfab17b0567d06b5ad`.

## Implemented

- The original high-resolution board JPEG remains the visible artwork.
- A single low-resolution Three.js multiplier quad adds only soft ground shadows. Two deterministic procedural fields drift independently through the shared environment clock.
- Final RGB multipliers are clamped to 0.65-1.0. Weather-specific strengths range from 0.15 to 0.33, with slight sampled-art desaturation and cooling where the source channel is not near black.
- The central desktop panel is neutral white in the multiplier; mobile's zero-sized rectangle masks nothing.
- Full animates, Calm renders deterministic time zero, and Off removes the shadow resources while retaining the board painting.
- The old Canvas sprite shadows and the Three weather cloud/shadow meshes are removed. Rain, snow, smoke, puddles, lights, birds, bird shadows, lightning, festivals and fog remain in their existing layers.
- WebGL import, creation, shader, draw and context-loss failures fall back to a fresh static Canvas2D multiplier surface.

## Validation

| Check | Result |
| --- | --- |
| TypeScript | PASS: app and node projects |
| Focused tests | PASS: 16 tests covering deterministic noise, bounds, temporal change, buffer caps, ownership, policy and board integration |
| Full Vitest | PASS: 114 files, 819 tests |
| ESLint | PASS with 18 pre-existing warnings; no cloud-shadow warning remains |
| Production build | PASS; existing chunk-size and mixed static/dynamic import warnings remain |
| Actual board browser path | PASS in headless Chromium: one draw call, animated time changed, board click passed through, Calm fixed time to 0, Off retained the painting, 1180x820 and 820x1180 resized correctly, forced WebGL loss produced the Canvas2D fallback |
| Visual inspection | PASS: screenshots show the sharp original board, sunlit gaps, no white/grey cloud masses, and an unchanged protected center panel |

Evidence: `cloud-shadow-time-a.png`, `cloud-shadow-time-b.png`, and `browser-results.json`.

The browser run observed an existing React ref warning from `ScreenEventFX`/`ThreeWeather`; no WebGL or shader errors occurred. Physical iPad performance and sustained 60 fps are unverified because no real device was available. The shared atmosphere clock intentionally paints at 30 Hz.