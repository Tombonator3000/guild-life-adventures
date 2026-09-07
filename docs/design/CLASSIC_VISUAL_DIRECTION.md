# Guild Life: classic board, living visits

Owner direction, 7 September 2026. Supersedes the broader redesign brainstorm.

Next VFX/icon/sidebar implementation order: [Board VFX implementation plan](BOARD_VFX_IMPLEMENTATION_PLAN.md). This plan preserves the existing artwork and layout. Its proposed effects are not yet implemented. For the current service navigation and no-inner-scroll location pages, the later [window/Cave/update pass](../qa/window-cave-update/README.md) supersedes the scrolling description below.

## Fixed identity

- A digital board game first. Preserve the existing city artwork, all location positions, travel paths, sidebars and central frame.
- Preserve the original caricature characters, names and humour. The realistic blacksmith in the previous concept is not a replacement for Korr.
- Use the forge concept's lively workplace and clear menu composition inside the existing central frame.
- Larger structural and gameplay ideas are deferred to Guild Life 2; see GUILD_LIFE_2_IDEAS.md.

## Current implementation

The shared LocationShell uses existing location interiors at full visibility with the original character artwork, name and dialogue. Native CSS composes the images without modifying the raster assets. Five decorative motes and a slow local light pulse follow Full/Calm/Off, reduced motion and document visibility. Original portrait videos retain their image fallback and stop in calm/hidden states.

Service navigation uses illustrated icons, contrasting selected buttons and horizontal overflow instead of wrapping several rows into the action area. Existing service content and actions remain available. The shared work card shows job, wage, full/short shift hours, take-home pay, resulting hours/gold and happiness loss. It uses the actual pay and garnishment functions. Missing clothes and insufficient time are explained before clicking. Original work panels now share the same earnings preview.

Narrow central frames use a short illustrated character scene above the menu, keeping characters visible rather than hiding them on phones. The outer board layout and central frame dimensions are unchanged. In shallow landscape frames, service content and the work card scroll together. The existing mobile resource strip starts with gold/time and scrolls horizontally instead of clipping its first resources.

## Acceptance and evidence

- All ten workplaces show their existing character asset and a usable service menu.
- Work and bank actions operate through existing store/network services.
- Full and short shift preview agrees with actual results, including festival and debt cases.
- Character and work controls remain visible in phone portrait and landscape layouts.
- No new save fields, balance changes, dependencies or replacement images.

Validation status will be recorded in log.md and the pull request after execution. Physical Samsung S24 performance requires owner-device verification.
