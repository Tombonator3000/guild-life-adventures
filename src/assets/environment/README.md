# Guildholm effect atlas

`fantasy-atlas.webp` is a 1024 × 1024, 4 × 4 painted sprite atlas, generated with the built-in ImageGen tool for this implementation. No map, building or portrait asset was replaced.

| Row | Left to right |
| --- | --- |
| 0 | Four soft chimney-smoke stages |
| 1 | Slate cloud, silver cloud, ochre dust, golden bloom |
| 2 | Oak, olive, maple, russet leaves |
| 3 | Dry leaf, camera droplet, frost corner, hanging pennant |

Production prompt: “Illustrated fantasy VFX sprite atlas, four by four equal cells, four evolving wispy warm-grey smoke stages; two broad cloud masks; ochre dust wisp; golden light bloom; four distinct painted autumn leaves; dry leaf; glass rain droplet; intricate ice/frost corner; burgundy-and-gold medieval pennant. Isolated sprites on pure black, generous cell gutters, no labels, no UI, no new board or characters. Painterly tabletop-game style, not photorealism or flat icons.”

The first two transparency attempts contained baked checkerboards and were rejected. The selected black-matte source is converted to alpha **once** by `effectAssets.ts`, then cached. Never read pixels during animation. The sprites are loaded only when FX is enabled; an asset failure degrades to simple lighting and precipitation without affecting the game.

The existing crow silhouette, mist and vellum remain reused. `../ui/sidebar-landscape.webp` is a new 384 × 576 paper decoration, generated with the same built-in tool using: “Distant medieval hilltop castle, mountain valley and pine forest, muted sage/dusty blue/sepia watercolour on warm ivory parchment. Landscape in the lower half, fading to unmarked paper above. No text, UI, border or people.” It sits behind existing sidebar contents and adds no vertical space.

The generated sources were only resized and exported to WebP. Runtime compositing prepares the matte. New decoded atlas + sprites cost about 8 MiB; the optional drought texture is bounded to 2048 px desktop / 1024 px mobile. Original board decode and canvas backing stores are separate from that texture budget.
