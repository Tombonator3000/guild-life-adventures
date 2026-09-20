# Mobile readability and navigation pass

## Goal
Make phone play readable, easy to tap, and simple to navigate without changing game rules, board artwork, desktop layout, or tablet priorities.

## Changes
1. **Keep guidance off the play area**
   - On phones, replace the large guided-tour card with a compact instruction bar below the map and above the action area.
   - Show only the current task, a clear dismiss control, and an optional expandable detail view.
   - Never display the contextual tip card at the same time as the guided tutorial.
   - Keep target highlighting visible without intercepting taps.

2. **Make the mobile map easier to use**
   - Give the map more usable height and keep the action panel independently scrollable.
   - Make location zones proper keyboard/touch controls with accessible names.
   - Add minimum 44×44 touch hit areas where the painted location area is smaller, while preserving visual placement.
   - Keep drag-to-pan and fit/zoom controls, but enlarge the zoom control and improve its contrast.

3. **Reduce mobile interface density**
   - Collapse the top status area into one concise row with the essential resources and three 44×44 controls.
   - Hide decorative NPC copy and nonessential supporting text on narrow phones while retaining action consequences.
   - Keep service selection compact and ensure the current action remains prominent.

4. **Improve contrast and text sizing**
   - Replace faint gold-on-parchment instructional text with dark semantic text.
   - Raise phone body/supporting text to readable sizes and strengthen disabled-state contrast without making disabled controls look active.
   - Ensure all mobile controls have visible focus states and at least 44×44 targets.

5. **Validate the real game screen**
   - Add focused accessibility tests for guide placement, single-guide behavior, semantic map controls, and tap-target sizes.
   - Test a real new game at 390×844 and iPad portrait/landscape, including tutorial navigation and opening a location.
   - Run TypeScript, full tests, lint, and production build; document the result without publishing.

## Scope guard
No gameplay, economy, artwork, desktop board, multiplayer rules, visibility, or publishing changes.
