# Board VFX implementation-plan audit

## 2026-09-07 — Additive board VFX, icon and sidebar implementation plan (Gauntlet)


Prepared docs/design/BOARD_VFX_IMPLEMENTATION_PLAN.md against main 693ca1500e4f04b80b2c855f3bc5e68bb39928a9 (merged PR #408). Inspected existing board/environment/weather/festival code, options, sidebar/icon components, QA records, original board pixels and five owner-referenced VFX concepts. The shared ChatGPT message could not be fetched; no conclusions rely on its unread contents.

The plan preserves the board, characters, tokens, geometry and navigation. It specifies one managed Canvas 2D atmosphere system, an isolated heat-distortion shader, masked screen effects, reusable materials and icon medallions, an asset pipeline, four sequential implementation deliveries and evidence gates. Corrections from critical review: reuse existing Full/Calm/Off storage and precipitation clock, preserve crow editor settings and borderStyle, do not invent the concept river or resources, and disclose the existing 33 ms mobile paint limit. Physical performance and all proposed new runtime effects remain UNVERIFIED.

Documentation only: no game code, images, dependencies, saves or rules changed. Checked document links, current source paths/event identifiers, board hash and documentation-only diff. No runtime tests or performance benchmarks were run for this planning change. Added a navigation link from CLASSIC_VISUAL_DIRECTION.md and clarified that PR #408 supersedes its older scrolling description. Next bounded implementation is the ambient/icon/sidebar foundation; this planning entry does not claim that implementation or deployment has happened.
