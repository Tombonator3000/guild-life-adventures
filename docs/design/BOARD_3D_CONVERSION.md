# Guild Life — 3D board conversion

Status: production slice in `agent/3d-board-conversion`, 15 September 2026.

## Intent

The existing 2D Guildholm board remains the rules and visual identity authority. This slice adds a reversible 3D presentation and playtest route so a player can travel between the same fifteen locations, spend hours, perform a small location action, and end a turn.

Core player loop:

1. Drag the diorama to inspect Guildholm and click a landmark.
2. Read the canonical ring-route time cost.
3. Travel to the landmark if enough hours remain.
4. Perform the location's lightweight prototype action and observe the resource response.
5. End the turn to receive a fresh twelve-hour budget.

## Fixed decisions

- Representation: real-time 3D diorama with Three.js runtime, authored Blender `.blend` source and `.glb` handoff.
- Delivery: same Vite/React web app, separate `/board-3d` route and title-menu entry; 2D board is untouched.
- Topology: the exact `BOARD_PATH` order and `getPath` movement cost remain canonical.
- Art direction: painterly medieval tabletop fantasy, chunky readable silhouettes, warm parchment center, moss/stone/timber/terracotta palette, soft shadows and restrained detail.
- Model generation: no Magnific/Tripo integration is available in the current workspace. The buildings are deterministic Blender-authored primitives with a documented generator script, an honest substitute for the requested handoff while preserving editability.
- Image concepts: the built-in image generator was attempted for three previews but returned account usage-limit 429; the existing `game-board.jpeg` and approved environment assets remain the visual references.

## Content envelope

| Scope | Included in this slice | Deliberate cut |
| --- | --- | --- |
| Landmarks | All 15 canonical locations with distinct silhouettes | Full interior scenes and character rigs |
| Traversal | Click-select, shortest canonical route, hours, animated arrival feedback | Multiplayer synchronization |
| Actions | One readable prototype action per location; forge/guild/cave/academy/home update sample resources | Full store-service parity |
| Camera | Orbit, zoom, reset-friendly home view | Cinematic camera tours |
| Runtime | Browser route inside existing Vite app | Native desktop build |
| Art | Blender GLB plus editable generator script | Tripo/Magnific-generated meshes unavailable here |

## Stack and handoffs

| Responsibility | Tool/version | Input | Output | Integration | Status |
| --- | --- | --- | --- | --- | --- |
| Canonical topology | Existing TypeScript data | `BOARD_PATH`, `getPath` | stable location IDs and costs | `src/data/board3d.ts`, runtime page | VERIFIED WORKING |
| 3D authoring | Blender 4.5.13 LTS | deterministic Python scene script | `.blend`, `.glb`, render | `public/board3d/` | VERIFIED WORKING |
| Authoring inspection | Blender MCP stdio, reviewed local bridge | saved `.blend` | datablock summary, render, reopen check | `evidence/blender-mcp-3d-board/` | VERIFIED WORKING |
| Browser runtime | Three.js 0.180.0 + GLTFLoader + OrbitControls | exported GLB | orbitable, clickable diorama | `/board-3d` | VERIFIED after browser run |
| Generator candidates | Magnific/Tripo | external service | — | no connector or authorized account route in workspace | UNAVAILABLE |

## Acceptance criteria

1. The GLB loads in the actual Vite production preview and shows a recognizable 15-location 3D Guildholm diorama with a clear central play area.
2. Each canonical location can be selected by a real pointer click; selection exposes its name and route cost.
3. Travel consumes the canonical number of hours and commits the player to the clicked destination after an arrival animation interval.
4. A location action gives readable feedback and at least the key prototype resources change at Forge, Guild Hall, Cave, Academy and Slums.
5. The 2D app still passes its relevant source/build checks; the 3D route has a direct opening instruction and evidence tied to the same source revision.

## Production increments

- A. Board blockout and Blender export: 15 building roots, ring road, central parchment, lights, camera, GLB.
- B. Browser handoff: actual GLB import, orbit controls, clickable landmarks, player token.
- C. Playtest loop: route cost, travel, action feedback, week reset and return link.
- D. Gauntlet checkpoint: runtime screenshot, input journey, build/test/lint, Blender MCP summary/render/reopen, limitations.
