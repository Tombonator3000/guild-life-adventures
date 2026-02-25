

## Plan: Weekend Clutter Reduction, Fullboard Gold Display, Quest Event Title

### Task 1: Reduce Weekend Message Clutter

**Problem**: When multiple things happen (eviction + weekend activity + food spoilage + sickness + homeless penalties), the weekend screen shows 5+ messages with redundant info. Examples:
- "food has gone bad without a Preservation Box!" + "got sick from eating spoiled food!" should merge into just "got sick from eating spoiled food!"
- When eviction happens, mundane weekend activity text ("Watched townsfolk...") should be suppressed

**Changes**:

**File: `src/store/helpers/startTurnHelpers.ts`**
- Merge food spoilage messages: when sickness triggers from spoiled food, don't push the separate "food has gone bad" message. Only push the sickness message (which already implies spoiled food). Change lines 174-183: push "food has gone bad" only if sickness does NOT trigger. The sickness message itself should be reworded to include the spoilage info: e.g., "Tuck got sick from spoiled food! No Preservation Box. Healer charged Xg. -10h, -4 Happiness."

**File: `src/store/helpers/weekEndHelpers.ts`**
- In `limitWeekendMessages()`: when ANY critical event is present, suppress weekend activity messages (the `[rw-*]` tagged ones). Add a filter step that removes `[rw-` prefixed messages when critical events exist. Also reduce `MAX_WEEKEND_MESSAGES` from 5 to 4.
- Merge homeless messages: "slept on the streets" and "is miserable without a home" are both in startTurnHelpers (not weekend), so they won't conflict. But the food-related pair is the main issue.

**File: `src/store/helpers/startTurnHelpers.ts`** (homeless messages)
- Merge "slept on the streets. -5 health, -8 hours." and "is miserable without a home. (-3 Happiness)" into ONE message: "Tuck slept on the streets. -5 health, -8 hours, -3 Happiness." by moving the happiness info into the homeless penalty message.

### Task 2: Add Gold to Fullboard Mode Top Bar

**File: `src/components/game/TopDropdownMenu.tsx`**
- Add a gold display item to the left section of the trigger bar (line ~178-210), after the time display. Show gold icon + player gold amount. Same styling as existing items (text-parchment text-[11px]).

```tsx
<span className="text-parchment/40">|</span>
<span className="flex items-center gap-1" title={`${player.gold} gold`}>
  <Coins className="w-3 h-3 text-amber-300" />
  <span className="text-amber-200 font-bold">{player.gold}g</span>
</span>
```

### Task 3: Quest Event Title → "QUEST EVENT"

**File: `src/hooks/useLocationClick.ts`**
- Change the `[quest-objective]` event title from `'QUEST PROGRESS'` to `'QUEST EVENT'` (line ~228). This matches the user's request from the screenshot (vedlegg 4).

### Documentation Updates

**File: `log2.md`** — Add timestamped entry documenting all three changes.
**File: `CLAUDE.md`** — Add convention: when critical weekend events occur (eviction, death, etc.), suppress mundane weekend activity messages. Merge redundant food spoilage + sickness into single message.

### Files Summary

| File | Change |
|------|--------|
| `src/store/helpers/startTurnHelpers.ts` | Merge food spoilage+sickness into one message; merge homeless+miserable into one |
| `src/store/helpers/weekEndHelpers.ts` | Suppress weekend activity when critical events present; reduce MAX to 4 |
| `src/components/game/TopDropdownMenu.tsx` | Add gold display to fullboard trigger bar |
| `src/hooks/useLocationClick.ts` | Change quest-objective title to "QUEST EVENT" |
| `CLAUDE.md` | Document conventions |
| `log2.md` | Timestamped entry |

