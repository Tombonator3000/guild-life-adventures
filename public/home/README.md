# Home artwork

Created with OpenAI ImageGen for Guild Life Adventures on 2026-09-08.

Two 1536 × 1024 painted interiors share the same bed, desk, wall and bookshelf surfaces. Noble Heights was generated as a material/furnishing variation of the Slums reference. A transparent sheet supplied sixteen painted objects, cropped to individual alpha WebPs. The room backgrounds use WebP quality 88; objects use quality 92 with lossless alpha.

Art direction: a warm, lived-in medieval room, front view with a slight downward angle, quiet daylight, empty shelves and desk surfaces. Noble Heights uses carved furniture and finer stonework in the same composition. Objects use matching light, perspective and contact shadows. Books form a collection on the existing shelf; bedding belongs on the existing bed; appliances occupy the desk, hearth and floor.

`src/components/game/home/roomLayout.ts` is the canonical placement map in scene coordinates. `RoomScene` composites these raster assets in one SVG coordinate system, so the furniture remains aligned while the whole scene resizes. Ownership and broken status come from the saved player inventory. The board, city buildings, tokens, portraits and shop/inventory item illustrations retain their existing assets.

Legacy percent positions apply to the previous room backgrounds and are not used in these scenes.
