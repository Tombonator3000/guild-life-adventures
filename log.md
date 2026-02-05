# Guild Life Adventures - Development Log

## 2026-02-05 - Shadowfingers Robbery System

### Completed
- Implemented Shadowfingers character - a criminal who robs players
- Added Street Robbery system (triggered when leaving Bank or Black's Market)
- Added Apartment Robbery system (triggered at start of turn for slums residents)
- Added Relaxation stat (10-50, affects apartment robbery chance)
- Added Durables system (items stored at apartment, can be stolen)
- Added educational items (Encyclopedia, Dictionary, Atlas) that cannot be stolen
- Created ShadowfingersModal component with newspaper-style headline display
- Integrated robbery checks into game flow

### Street Robbery Rules
- Only triggers on Week 4 or later
- Only when leaving Bank (1/31 chance, ~3.2%) or Black's Market (1/51 chance, ~1.95%)
- Only if player has cash
- Takes ALL player cash
- -3 Happiness penalty

### Apartment Robbery Rules
- Only affects players in slums housing
- Only if player owns durables
- Chance = 1 / (relaxation + 1), ranging ~2% to ~9% per turn
- Each durable type has 25% chance to be stolen (all items of that type)
- Encyclopedia, Dictionary, Atlas CANNOT be stolen
- -4 Happiness penalty

### Files Added
- `src/data/shadowfingers.ts` - Robbery logic and constants
- `src/components/game/ShadowfingersModal.tsx` - Robbery event modal with image

### Files Modified
- `src/types/game.types.ts` - Added DurableItems interface, relaxation stat, previousLocation tracking
- `src/data/items.ts` - Added isDurable/isUnstealable flags, educational items, ACADEMY_ITEMS
- `src/store/gameStore.ts` - Added robbery checks, durables management, ShadowfingersEvent state
- `src/components/game/GameBoard.tsx` - Integrated ShadowfingersModal

### Image Setup
To display the Shadowfingers character image, save the provided image to:
`src/assets/shadowfingers.jpg`

---

## 2026-02-05 - Editor Board Info Controls

### Completed
- Enhanced Zone Editor to support center info panel editing
- Added drag-to-move and drag-to-resize for center panel (yellow area)
- Added numeric input fields for precise center panel adjustments
- Updated export function to include both zone configs AND center panel config
- Center panel position now syncs between editor and game board in real-time

### New Features
- **Center Panel Editing**: Click the yellow "Info Panel" button in Zone Editor sidebar
  - Drag the yellow panel to reposition
  - Drag corner handle to resize
  - Use numeric inputs for precise positioning
- **Enhanced Export**: "Copy Config" now exports:
  - `ZONE_CONFIGS` for all location zones
  - `CENTER_PANEL_CONFIG` for the info panel position
- Center panel changes apply immediately when clicking "Apply"

### Files Modified
- `src/components/game/ZoneEditor.tsx` - Added CenterPanelConfig type, center panel editing UI
- `src/components/game/GameBoard.tsx` - Added centerPanel state, uses editable positions

### Export Format Example
```typescript
// Zone configurations for game board locations
export const ZONE_CONFIGS: ZoneConfig[] = [
  { id: 'noble-heights', x: 0.0, y: 0.0, width: 10.0, height: 28.0 },
  // ... more zones
];

// Center info panel configuration
export const CENTER_PANEL_CONFIG = {
  top: 15.8,
  left: 15.2,
  width: 69.6,
  height: 49.2,
};
```

---

## 2026-02-05 - Game Board Zone System

### Completed
- Implemented robust zone-based coordinate system for game board
- Added new `ZoneConfig` interface for precise zone positioning (x, y, width, height percentages)
- Added `ZONE_CONFIGS` array in `locations.ts` for easy coordinate editing
- Added new location: "The Cave" with exploration and rest mechanics
- Created visual Zone Editor (`ZoneEditor.tsx`) with:
  - Drag-to-move zone positioning
  - Drag-to-resize zone sizing
  - Numeric input fields for precise adjustments
  - Grid overlay for alignment
  - Copy configuration to clipboard feature
- Added debug overlay to GameBoard (toggle with Debug button or Ctrl+Shift+D)
- Added Zone Editor button to GameBoard (Ctrl+Shift+Z to open)
- Center info panel clearly marked - ALL info text displays ONLY in center area

### New Features
- **Zone Editor**: Visual tool for adjusting zone boundaries
  - Open with "Edit Zones" button or Ctrl+Shift+Z
  - Drag zones to reposition
  - Drag corner handles to resize
  - Export updated coordinates to clipboard
- **Debug Overlay**: Shows zone boundaries on game board
  - Toggle with "Debug" button or Ctrl+Shift+D
  - Red overlays show location zones
  - Yellow overlay shows center info panel

### Files Modified
- `src/types/game.types.ts` - Added 'cave' LocationId, added ZoneConfig interface
- `src/data/locations.ts` - Added ZONE_CONFIGS, added Cave location
- `src/components/game/GameBoard.tsx` - Integrated zone editor and debug overlay
- `src/components/game/LocationPanel.tsx` - Added Cave location actions
- `src/components/game/ZoneEditor.tsx` - NEW: Visual zone editing tool

### Zone Coordinates (percentages)
```
Top row:
- noble-heights: x=0, y=0, w=10, h=28
- landlord: x=10, y=0, w=10, h=17
- slums: x=20, y=0, w=11, h=17
- fence: x=31, y=0, w=12, h=17
- general-store: x=43, y=0, w=10, h=17
- shadow-market: x=53, y=0, w=12, h=17

Right side:
- rusty-tankard: x=85, y=17, w=15, h=23
- armory: x=85, y=40, w=15, h=25

Bottom row:
- forge: x=0, y=65, w=14, h=35
- guild-hall: x=31, y=75, w=14, h=25
- cave: x=45, y=78, w=10, h=22
- academy: x=55, y=75, w=14, h=25
- enchanter: x=85, y=65, w=15, h=35

Left side:
- bank: x=0, y=28, w=10, h=22

Center Info Panel:
- top=15.8%, left=15.2%, width=69.6%, height=49.2%
```

### Notes
- The Zone Editor allows real-time adjustment of zone positions
- Use "Copy Config" button to export coordinates for permanent update in code
- Center panel (yellow area) is the ONLY place where info text should display
- All zones can now be precisely mapped to match the actual game board image

---

## 2026-02-05 - Game Text Localization Check

### Completed
- Verified ALL game text is already in English
- Translated `agents.md` from Norwegian to English
- Updated `log.md` format to English

### Files Verified (All in English)
**Data Files:**
- `src/data/items.ts` - Item names and descriptions
- `src/data/locations.ts` - Location names and descriptions
- `src/data/quests.ts` - Quest names and descriptions
- `src/data/events.ts` - Event names and messages
- `src/data/newspaper.ts` - Headlines and articles
- `src/data/jobs.ts` - Job names and descriptions
- `src/data/education.ts` - Course names and descriptions
- `src/data/housing.ts` - Housing tier names and descriptions

**Component Files:**
- `src/components/screens/TitleScreen.tsx` - Title and buttons
- `src/components/screens/GameSetup.tsx` - Setup labels
- `src/components/game/LocationPanel.tsx` - All location UI text
- `src/components/game/ResourcePanel.tsx` - Resource labels
- `src/components/game/QuestPanel.tsx` - Quest UI text
- `src/components/game/EventModal.tsx` - Event display text
- `src/components/game/HealerPanel.tsx` - Healer services
- `src/components/game/PawnShopPanel.tsx` - Pawn shop text
- `src/components/game/NewspaperModal.tsx` - Newspaper UI
- `src/components/game/GoalProgress.tsx` - Victory goals

**Type Files:**
- `src/types/game.types.ts` - Guild ranks, education paths, player colors

### Notes
- All 500+ game text strings are confirmed to be in English
- Documentation files (agents.md, log.md, todo.md) were in Norwegian - now translated
- No code changes required for game text

---

## 2026-02-05 - Documentation

### Completed
- Created `agents.md` - AI system documentation
- Created `log.md` - this development log
- Created `todo.md` - project task list
- Updated `README.md` with project-specific information
- Committed and pushed to `claude/create-documentation-files-b9oLb`

### Commit
```
87f0f2e Add project documentation files
```

### Notes
- Project is a fantasy version of "Jones in the Fast Lane"
- Built with React, TypeScript, Vite, Zustand, and Tailwind CSS
- All main mechanics are implemented per `plan.md`

---

## Previous Development (from commit history)

### ce47b05 - Align panel inside white frame
- Adjusted panel placement in user interface

### 96cd4df - Changes
- Various changes

### 933d9c3 - Center panel aligned precisely
- Precisely aligned center panel

### c08ecae - Changes
- Various changes

### dfb9c7f - Enhance Guild Life mechanics
- Improved game mechanics

---

## Log Template

```markdown
## DATE - TITLE

### Completed
- Item 1
- Item 2

### Issues
- Problem description

### Next Steps
- Upcoming tasks
```
