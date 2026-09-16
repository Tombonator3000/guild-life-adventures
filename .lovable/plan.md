# Cloud Shadow Ground Layer

## Goal
Add broad, soft, organic cloud shadows to the existing 2D board painting without changing the board art, layout, gameplay, player artwork, menus, 3D Board Lab, or unrelated effects. Desktop and tablet remain the priority.

## Implementation
1. **Create one dedicated ground-shadow renderer**
   - Add a board-sized, pointer-transparent, accessibility-hidden canvas directly above `game-board.jpeg` and below zones, stationary tokens, animated tokens, path indicators, menus, and UI.
   - Drive it from the existing `EffectManager`; do not add another animation loop or game-state writes.
   - Use one bounded draw-call Three.js shader pass with two independently seeded procedural noise fields, distinct scales and slow diagonal drift vectors. Combine them into a soft mask with clear sunlit gaps, typical core darkening of 20–28%, and a hard maximum of 35%.
   - Use multiplicative RGB output suitable for CSS `mix-blend-mode: multiply`, with a subtle cool/desaturated multiplier derived from the sampled board texture rather than claiming alpha-only desaturation.

2. **Integrate policy, clipping, resilience, and drought behavior**
   - Full mode animates slowly; Calm/system reduced-motion renders one deterministic static frame; Off unmounts the layer. Hidden tabs pause through the shared manager.
   - Protect the existing percentage center-panel rectangle, including the current zero-sized mobile rectangle, and preserve exact registration on resize, fullscreen, and orientation changes.
   - Add a low-cost Canvas2D static fallback for import, texture, WebGL, shader, and context-loss failures. Handle asynchronous unmount safely and dispose renderer resources, textures, observers, and manager registrations.
   - Keep the original JPEG as the sharp visible artwork. Adjust drought heat shimmer composition so it cannot replace or fully obscure the shadow layer.

3. **Remove duplicate cloud ownership only**
   - Remove the two legacy cloud-shadow sprites from `drawEnvironment.ts`.
   - Remove `shadowMesh`, `cloudMesh`, their shaders, and instance updates from `threeWeatherRenderer.ts`.
   - Preserve rain, snow, smoke, puddles, lantern/tower/window glows, birds, bird shadows, droplets, lightning, festivals, and all existing gameplay/UI behavior. Ensure light/glow painting remains above the new ground shadows.

4. **Add focused automated coverage**
   - Unit-test deterministic private noise, temporal change without a 30-second reset, mask/strength bounds, layer order and pointer protection, Full/Calm/Off behavior, shared-clock registration, cleanup, fallback, context loss, and async unmount.
   - Update existing environment and Three-weather assertions to reflect the single cloud-shadow owner while retaining weather fallback coverage.

5. **Verify the actual game board and document evidence**
   - Run focused tests, full Vitest, TypeScript checks, scoped lint plus full lint reporting, and production build.
   - Run Playwright on a real new-game board: capture two separated effect times; inspect for dark-only organic shadows and sunlit gaps; verify tokens/UI stay above, protected panel pixels remain unaffected, board clicks and tablet touch/scroll work, fullscreen/resize/orientation stay registered, Calm is static, Off removes the layer, drought retains shadows, and forced WebGL loss falls back without errors.
   - Save a concise dated implementation/test log under `docs/qa/`, including measured conditions, exact results, tested source commit SHA, and an explicit note that physical iPad performance remains unverified unless measured on hardware. Do not publish or change visibility.

## Technical constraints
- No new dependencies, generated art, gameplay RNG, per-frame React renders, per-frame layout reads, fullscreen post-processing, or replacement/downsampling of the visible board image.
- Keep shader/fallback state private to the visual layer and stable across normal weather/store updates.
- The final report will list changed files, exact test totals/results, the current commit SHA, and any remaining unverified hardware performance.
