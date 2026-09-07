# Vellum, brass and rolling thunder

Owner reference: supplied Forge work-card crop and current Forge screenshot, 7 September 2026. Preserve the original city, center frame and caricatures. This is a classic-board polish pass, not Guild Life 2.

## Acceptance

1. A workplace opens with a prominent work card, actual net-pay preview, raise conditions and career requirements. Existing services stay accessible.
2. Parchment material, embossed gold CTA, stronger type hierarchy and explanatory Forge empty state bring the existing frame closer to the reference.
3. Layered rain/snow, ground splash coronas and alpha-textured mist render beneath controls. Storm lightning returns with delayed thunder; harvest rain never triggers it. Calm, Off, reduced motion and hidden tabs suppress animation.
4. Button activations use existing audio settings; contextual sounds cover menus, work, equipment, money, study and healing. Synchronous action feedback wins over generic clicks; disabled controls stay silent.
5. Work, raise and bank services continue through existing game/network actions. No city layout, portraits, balance, save fields or dependencies change.

## Assets

Built-in image generation produced two authored runtime materials, then standard resize/WebP export preserved the originals and mist alpha. No screenshots were altered.

- `src/assets/ui/vellum.webp`: seamless, uniformly lit ivory vellum, fine fibers and honey patina; no text, objects, borders, shadows or dark stains. Original prompt: “Use case: stylized-concept. Asset type: seamless tileable square parchment material texture for an existing medieval fantasy boardgame menu, not a UI mockup. Full bleed flat scan of warm ivory old vellum with fine natural fibers, subtle mottled honey patina, tiny irregular speckles, soft artisanal wear. Center and edges equally lit, uniformly light enough for dark readable text. Beautiful tactile high resolution hand painted realistic game material. No objects, no letters, no symbols, no border, no shadows, no fold creases, no dark stains, no vignette. Seamless repeatable texture.”
- `src/assets/ui/weather-mist.webp`: original prompt: “Use case: stylized-concept. Asset type: one production VFX fog sprite on a genuinely transparent background for a medieval boardgame, to be composited over a richly illustrated town. A single wide low bank of softly lit pale silver gray volumetric mist, intricate wispy turbulent fine detail and realistic vapor filaments, irregular cloudy wisps dissolving softly to fully transparent on EVERY edge with generous transparent margin. Horizontal shape, delicate thin vapor, lit softly from above. Natural cinematic weather, no sparkles, no fantasy objects, no ground, no text, no frame, no checkerboard pattern, no black or solid background. Alpha transparency is essential.”

The storm renderer uses deterministic visual seeds, cached soft canvas sprites, three depth scales, bounded pixel ratio (1.5 desktop / 1.25 mobile) and a lower mobile particle/paint budget. These are implementation limits, not measured device-performance claims. Physical phone performance and speaker balance remain UNVERIFIED.

## Verification

Targeted unit tests pass for thunder timing/cancellation, no gameplay RNG use, contextual feedback/disabled controls/no duplicate synchronous sounds, mute/volume routing and existing wage previews. The jsdom test explicitly does not render canvas pixels; the browser journey checks real nonempty canvas output.

`e2e/material-weather.spec.ts` hires a Forge Laborer via the real Guild Hall menu, works three shifts, requests a raise, inspects careers and smithing, visits storm/snow/fog/rain, checks the thunder audio source, and works at phone viewport sizes. `e2e/classic-locations.spec.ts` still visits all ten workplaces and exercises banking.

Runtime capture review and final CI results pending at this initial checkpoint. The baseline has 185 pre-existing application TypeScript diagnostics that the configured root check does not expose; changes must add none.
