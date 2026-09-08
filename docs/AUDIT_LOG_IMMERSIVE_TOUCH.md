# Immersive board and touch menus — 2026-09-08

Base: `e80e4def6e70fed68c41048f3d6267d0b70640b6` (merged PR #413).

The owner supplied seven photographs of the game on a tablet. They show a crowded fullboard toolbar, a dropdown displaying both sidebars across almost the whole screen, and central menus that cannot be browsed with a finger. Existing city artwork, tokens, portraits and central board geometry are retained.

## Acceptance and implementation

| Request | Delivered behavior | Verification |
|---|---|---|
| Finger browsing in the middle window | Swipe left/up for the next menu page, right/down for the previous one. A drag does not become a purchase. Ordinary taps, native sliders, page buttons and keyboard focus still work. | Native Chromium touch events on actual Armory controls; multiple-page and single-page layouts. |
| Player information without sidebars | The toolbar portrait and every stationary map token open the existing Stats, Inventory and Goals content in a compact character dialog. Values follow the selected player's live state. Mobile HUD portraits open the existing character drawer. | Buy/equip an item, open its owner from the map, inspect inventory/goals, dismiss with Escape. No time spent by inspection. |
| Immersive default and manual | Immersive board is the default; an explicit sidebar choice is saved locally. Browser fullscreen remains separate and uses the existing user-gesture entry on New Adventure/Continue plus the fullscreen control. | Default, sidebar toggle, reload/Continue, B shortcut and in-game manual journey. |
| Better toolbar and menus | Readable player/resources/week header with 44px controls. One opaque parchment panel at a time, compact portrait, clear tabs, content-sized height, gentle backdrop and explicit close. Options, players, awards, save/manual and developer tools remain reachable. | Inspected desktop and tablet portrait/landscape captures; current-player turn remains visible in online play. |

## Findings and corrections

| Observation | Cause and correction |
|---|---|
| First swipe starting over a button was cancelled | Touch begins with implicit capture on the button. Moving capture to the viewport emits a bubbling lost-capture event from the button. Only losing the viewport's own capture now clears the gesture. Verified with native input, not synthetic React events. |
| Portrait tablet menu was only 64px high, with a blank area below | A mobile rule defined two rows while retaining the desktop's two columns. Both children occupied the short first row. Portrait explicitly uses one column; landscape retains its existing two-column layout. |
| Inspecting a player could show stale stats and inconsistent wage/health values | Replaced the duplicate quick-look implementation with the canonical sidebar content and a live player lookup. |
| Escape from a character dialog also opened the game menu | Dialogs now own Escape; gameplay shortcuts remain blocked while a dialog is open. Focus returns to the opening control. |
| A purchase toast intercepted the next-page button on narrow screens | Passive notifications no longer intercept pointer input; toasts containing buttons retain their interactive controls. |
| Old fullboard menu was touch-unfriendly and hid most of the board | Removed hover activation, delayed auto-hide and the two-sidebar dropdown. The new toolbar opens one focused dialog. |

Existing browser journeys now open character information through the portrait, select collapsed services after arrival, and click an uncovered part of a building rather than its character token. Classic weather/developer journeys explicitly retain sidebar mode. Menu measurements wait for the short page transition. Network, purchase and balance assertions remain intact.

## Validation

- Configured TypeScript, **765 unit tests in 101 files**, production build and ESLint pass (zero errors, 27 inherited warnings).
- Extended application TypeScript check retains the baseline's **185 diagnostics**, with none added.
- Three focused browser journeys pass: native touch at **1194×834** and **820×1180**, plus default/persistence/manual at **1280×720**.
- All **38 browser scenarios** have passing local coverage after corrections: 32 passed in the full run; the affected 15 scenarios were rerun (14 passed), and the final destination-arrival helper correction passed the remaining online scenario in isolation. The full CI run on the uploaded PR revision is recorded in the PR.
- Eight final layout captures were inspected. A subsequent passive-toast hit-testing correction does not change their visual layout and passed the affected phone journeys.
- Actual iPad/Safari hardware, physical speaker output and device frame rate are **UNVERIFIED**. Chromium touch emulation is not a claim of hardware performance.

## Runtime captures

| View | Capture |
|---|---|
| Immersive desktop | [Board and toolbar](qa/immersive-touch/immersion-desktop.webp) |
| Portrait tablet | [Menu](qa/immersive-touch/portrait-menu.webp), [character](qa/immersive-touch/portrait-character.webp) |
| Landscape tablet | [Menu](qa/immersive-touch/landscape-menu.webp), [character](qa/immersive-touch/landscape-character.webp) |
| Popup menus | [Options](qa/immersive-touch/landscape-options.webp), [players](qa/immersive-touch/landscape-players.webp) |
| In-game guide | [Display modes and controls](qa/immersive-touch/manual.webp) |

Screenshots are captured from the running game and encoded as WebP without retouching. The owner's original photographs are not copied into the repository.
