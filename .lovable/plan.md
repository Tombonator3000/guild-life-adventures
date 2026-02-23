

## Quest LOQ Integrity Tests + Bug Fixes

### Bugs Found

1. **CRITICAL: `lost-cat` quest is broken** -- The quest has an objective at `noble-heights`, but `LocationPanel.tsx` returns `HomePanel` early for home locations (line 130-144), so the quest objective banner is never shown. Player cannot complete "Check Noble Heights" and the quest is permanently stuck.

2. **NL chains skip LOQ entirely** -- `getQuestLocationObjectives` returns `[]` for `nlchain:` quests (line 832). The `NonLinearChainStep` interface has no `locationObjectives` field.

3. **No validation for duplicate objective IDs** -- If two quests accidentally share an objective ID, progress could bleed across quests.

### Fix 1: `lost-cat` quest objective location

Change the `noble-heights` objective to a non-home location (e.g. `landlord` -- the Landlord's office is thematically adjacent to Noble Heights). This avoids the HomePanel early-return problem entirely without needing to refactor LocationPanel.

**File:** `src/data/quests.ts`
- Change `lost-cat-home` objective: `locationId: 'noble-heights'` to `locationId: 'landlord'`
- Update description/actionText to fit ("Ask the Landlord" instead of "Check Noble Heights")

### Fix 2: Add quest objective banner to HomePanel

Even after fixing `lost-cat`, the HomePanel should still show quest objectives if a future quest uses home locations. Add the quest objective banner to `HomePanel.tsx` as a secondary fix.

**File:** `src/components/game/HomePanel.tsx`
- Import `getQuestLocationObjectives` and add the same objective banner logic
- Show it above the room scene when a pending objective exists at the current home location

### Fix 3: Test file for LOQ integrity

Create `src/test/questLOQ.test.ts` with the following test cases:

| Test | What it verifies |
|------|-----------------|
| All quest LOQ locationIds are valid | Every `locationId` in every objective exists in the `LocationId` type / BOARD_PATH |
| No objectives at home locations | Ensures no quest sends the player to noble-heights or slums (HomePanel dead-end) |
| No duplicate objective IDs across all quests | Every objective ID is globally unique |
| Chain quest steps have valid LOQ locationIds | Same validation for QUEST_CHAINS steps |
| getQuestLocationObjectives returns correct data | Unit test for regular quests, chain quests, and bounties |
| allLocationObjectivesDone works correctly | Test with empty, partial, and full progress |
| Objective IDs match their parent quest prefix | Convention check (e.g. `rat-ext-*` belongs to `rat-extermination`) |
| Every quest has at least one LOQ | Verify no quest was missed |

### Improvement Ideas (noted, not implemented now)

- **NL chain LOQ support**: Add `locationObjectives` to `NonLinearChainStep` and update `getQuestLocationObjectives` to handle `nlchain:` prefixed quests
- **Bounty LOQ**: Add simple location objectives to bounties for more engaging gameplay
- **Quest objective ordering**: Currently objectives must be completed in order (array index). Could support unordered objectives for more flexibility
- **LOQ time cost**: Objectives are free (no time spent). Could add a `timeCost` field per objective

### Technical Summary

**Files to modify (3):**

| File | Change |
|------|--------|
| `src/data/quests.ts` | Fix `lost-cat` objective from `noble-heights` to `landlord` |
| `src/components/game/HomePanel.tsx` | Add quest objective banner as safety net |
| `log2.md` | Timestamp entry |

**Files to create (1):**

| File | Purpose |
|------|---------|
| `src/test/questLOQ.test.ts` | LOQ integrity and dead-end validation tests |

