# 3D board conversion — Gauntlet checkpoint

This file records the 3D conversion evidence for branch `agent/3d-board-conversion` on 15 September 2026. It deliberately separates Blender authoring evidence, browser runtime evidence and measured performance.

## Scope

`/board-3d` is a production slice, not a replacement for the full 2D rules UI. It uses the same fifteen-location ring and canonical path distance. The player starts in Slums with 12 hours, can travel, perform a compact action, and end the turn.

## Evidence slots

| Gate | Result | Evidence |
| --- | --- | --- |
| Blender script creates saved editable scene | PASS | `public/board3d/guildholm_3d_board.blend` — 15 location roots, 301 objects |
| GLB export | PASS | `public/board3d/guildholm_3d_board.glb` — 2.8 MB handoff |
| Blender MCP summary/reopen | PASS | `evidence/blender-mcp-3d-board/summary-final.json`, `reopen-final.json` — 15 roots, 283 meshes, 19,290 triangles |
| Blender authoring render | PASS | `evidence/blender-mcp-3d-board/guildholm_3d_board.png` |
| Browser runtime loads GLB | PASS | `evidence/blender-mcp-3d-board/runtime-initial.png` |
| Real click/select/travel/action journey | PASS | `browser-results.json`, `runtime-playtest-enchanter.png` — Slums → Enchanter, 12 → 7 hours, action feedback, week reset |
| Responsive layout | PASS | `browser-results.json`, `runtime-mobile.png`, `runtime-portrait.png` — no horizontal overflow at 844×390 or 390×844 |
| TypeScript/tests/build/lint | PASS | typecheck, 813 Vitest tests, Vite production build, full lint with 0 errors (18 pre-existing warnings) |
| In-app CUA preview | UNVERIFIED | Admin security blocked opening the localhost tab; production preview was verified with automated Chromium instead |
| 60 fps target on physical target hardware | UNVERIFIED | no physical device measurement in this environment |
| Magnific/Tripo asset handoff | UNAVAILABLE | no installed connector or authorized external asset route |

## Review checklist

- Preserve original 2D board pixels and location topology.
- Inspect silhouettes at overview and gameplay distance.
- Check GLB material references, origin/scale, normals and file payload.
- Capture unaltered browser runtime evidence at desktop and a narrow viewport.
- Keep any software-rendered/headless timing diagnostic separate from a physical 60 fps claim.

## Verified playtest path

The automated production-preview pass performs a real canvas pointer click on the Enchanter landmark, reads the five-hour route cost, travels from Slums, waits for arrival, activates **Lad magien**, and ends the turn. The captured result has no browser console errors or page errors.

The 3D authoring source is procedural and editable. Magnific/Tripo and the requested image concept pass were not available in this workspace, so those limitations remain explicit rather than being represented as completed handoffs.

## Opening

From the repository root, use the installed project runtime to start Vite and open `/board-3d`. The title screen also has a **3D Board Lab** entry once the route is built.
