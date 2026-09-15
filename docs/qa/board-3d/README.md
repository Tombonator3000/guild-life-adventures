# 3D board conversion — Gauntlet checkpoint

This file records the 3D conversion evidence for branch `agent/3d-board-conversion` on 15 September 2026. It deliberately separates Blender authoring evidence, browser runtime evidence and measured performance.

## Scope

`/board-3d` is a production slice, not a replacement for the full 2D rules UI. It uses the same fifteen-location ring and canonical path distance. The player starts in Slums with 12 hours, can travel, perform a compact action, and end the turn.

## Evidence slots

| Gate | Result | Evidence |
| --- | --- | --- |
| Blender script creates saved editable scene | PASS | `public/board3d/guildholm_3d_board.blend` — 15 location roots with Tripo assets and fallback-capable generator |
| GLB export | PASS | `public/board3d/guildholm_3d_board.glb` — 13.4 MB handoff, 77,790 triangles |
| Blender MCP summary/reopen | PASS | `summary-tripo-decimated.json`, `reopen-tripo-decimated.json`, `audit-tripo-decimated.json` — 15 roots, 141 mesh objects, 77,790 triangles, 15/15 Tripo roots |
| Blender authoring render | PASS | `evidence/blender-mcp-3d-board/guildholm_3d_board.png` |
| Per-location JPG background plates | PASS | `public/board3d/backgrounds/manifest.json` — 15 named crops from the original 5056×3392 board; browser QA returned 200/image/jpeg for all 15 |
| Browser runtime loads GLB | PASS | `evidence/blender-mcp-3d-board/runtime-initial.png` |
| Real click/select/travel/action journey | PASS | `browser-results.json`, `runtime-playtest-enchanter.png` — Slums → Enchanter, 12 → 7 hours, action feedback, week reset |
| Responsive layout | PASS | `browser-results.json`, `runtime-mobile.png`, `runtime-portrait.png` — no horizontal overflow at 844×390 or 390×844 |
| TypeScript/tests/build/lint | PASS | typecheck, Vitest suite, Vite production build, full lint with 0 errors (18 pre-existing warnings) |
| In-app CUA preview | UNVERIFIED | Admin security blocked opening the localhost tab; production preview was verified with automated Chromium instead |
| 60 fps target on physical target hardware | UNVERIFIED | headless SwiftShader sample improved to 48.7 ms average / 66.6 ms p95 after the runtime budget pass; no physical device measurement in this environment |
| Magnific/Tripo asset handoff | PASS | 15/15 `tripo-p1` GLBs generated from the 15 JPG plates, downloaded, normalized and integrated. Batch used 8,120 credits; 12,355 remain in the current session |
| 3D bird layer | PASS | six shared low-poly bird instances with runtime wing/bob animation; excluded from landmark hit testing |

## Review checklist

- Preserve original 2D board pixels and location topology.
- Inspect silhouettes at overview and gameplay distance.
- Check GLB material references, origin/scale, normals and file payload.
- Capture unaltered browser runtime evidence at desktop and a narrow viewport.
- Keep any software-rendered/headless timing diagnostic separate from a physical 60 fps claim.

## Verified playtest path

The automated production-preview pass performs a real canvas pointer click on the Enchanter landmark, reads the five-hour route cost, travels from Slums, waits for arrival, activates **Lad magien**, and ends the turn. The captured result has no browser console errors or page errors.

The 3D authoring source is editable and now integrates all fifteen accepted Tripo landmark meshes. Raw generated candidates are retained under `evidence/blender-mcp-3d-board/tripo-batch/`, the Enchanter pilot remains under `tripo-pilot/`, and `public/board3d/tripo-manifest.json` records source hashes, face budgets and normalization. The requested image concept pass is separate and previously hit a 429 usage limit.

## Opening

From the repository root, use the installed project runtime to start Vite and open `/board-3d`. The title screen also has a **3D Board Lab** entry once the route is built.

To regenerate the plates after changing the source board, run `scripts/split_board_backgrounds.mjs`. The crop manifest keeps each location's source rectangle explicit and replaceable for a future Tripo handoff.
