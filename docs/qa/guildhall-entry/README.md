# Guildhall entry menus — 13 September 2026

## Target and scope

Tom approved the three Guild Life menu concepts from this conversation: gold/brass
buttons over Guildholm, parchment player cards, and preset-first victory goals.
His implementation correction is authoritative: **desktop and tablet first; mobile
is a bonus**. Existing board, original portraits, game rules, save slots and the
Players → Game Goals → game flow remain the foundation.

Acceptance criteria:
- Desktop (1440×900, 1280×720): a broad title composition and side-by-side game
  presets / goal summary, with no clipped controls or nested scrolling.
- Tablet (1024×768 landscape, 768×1024 portrait): readable layouts and at least
  48 px action targets; desktop space is used instead of scaling a phone layout.
- Six-player/four-AI limits, individual difficulty, portraits, custom goals,
  tutorial, save/resume and keyboard operation survive the visual overhaul.
- The optional 3D decoration never blocks menu operation, loads separately and
  releases GPU resources on leaving the title. Motion preferences are respected.

## Implementation decisions

- Broad title layout puts the guild identity beside the menu on desktop. iPad
  portrait uses a centered composition. Fine engraved corner pieces and shared
  CSS material layers keep actual text and controls editable.
- The setup is a framed parchment ledger, with two player cards per page. Native
  radio controls expose Novice / Cunning / Master directly. An empty roster slot
  offers an AI rival while retaining the solo path.
- Presets occupy a two-by-two group alongside actual goal values on wide screens.
  Tablet portrait puts the presets above the summary. Customization is a native
  disclosure. The sticky footer keeps party details and the next action together.
- Existing English rule text and exact preset values are reused. The concept's
  invented example save and replacement character faces are not product data.

## Three.js investigation and bounded implementation

Three.js 0.180 is isolated in the dynamically imported `guildSealScene` chunk. It
renders a small extruded compass medallion with brass/enamel materials, two lights
and a subtle mouse response. The 220×184 CSS pixel surface is capped at DPR 1.5.
There are no full-screen render targets, shadows, postprocessing or model/texture
network requests. CSS and real HTML render the buttons and labels.

- Full environment detail and width ≥701 px enable the scene. Phones, Calm, Off
  and reduced-motion use a CSS/icon seal immediately.
- WebGL2 failure or context loss leaves the static seal and functional menu.
- Hidden tabs stop the animation loop. Pointer listening is passive and mouse-only.
- Unmount removes listeners, observer, canvas, geometry, materials and renderer.
- The first production build measured the separate chunk at 505.74 kB / 129.03 kB
  gzip. This is a real download cost, accepted here for the requested 3D direction;
  it is not included in the synchronous menu module.

Later possibilities: depth-layered town artwork, local lantern light and a small
batched ember field. A rebuilt 3D town and full-screen bloom are deliberately not
part of this menu change. They would require new art and device measurements.

Primary reference: [Three.js WebGLRenderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html)
(WebGL2, pixel ratio, renderer disposal and context loss).

## Evidence and limitations

- PASS: TypeScript and nine setup/store and optional-GPU lifecycle tests.
- PASS: production build and repository ESLint (zero errors, 18 existing warnings).
- PENDING: CI regression suite and runtime captures.
- UNVERIFIED: sustained 60 fps and thermal behavior on physical desktop/iPad
  hardware. A small render surface or headless test is not a device benchmark.
- Local preview URLs are blocked by the supplied browser's URL policy. Visual
  evidence must come from the repository's normal CI captures and hosted preview.
