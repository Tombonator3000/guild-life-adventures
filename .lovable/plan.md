

## Two-Part Plan: Multi-LOQ for NL Chains + Quest Messages in Center Panel

### Part 1: Expand NL Chain LOQs to 2-3 per step

Currently each NL chain step has exactly 1 `locationObjective`. This will be expanded so most steps require visiting 2-3 locations before the step can be completed at Guild Hall.

**File: `src/data/questChains.ts`** -- Add additional objectives to each step:

| Step | Current LOQ | New LOQ additions |
|------|-------------|-------------------|
| **Thieves' Guild** | | |
| tg-1 (Street Rumours) | Shadow Market | + Rusty Tankard ("Gather rumours from the regulars") |
| tg-2 (Guard Raid) | Armory | + Guild Hall ("Coordinate with the guard captain") |
| tg-3 (Inside Job) | Fence | + Shadow Market ("Scout the heist location") |
| tg-4 (Double Agent) | Rusty Tankard | + Fence ("Exchange coded messages") + Bank ("Stash your double-agent earnings") |
| tg-5 (Reckoning) | Guild Hall | + Armory ("Final gear check before the showdown") |
| **Cursed Artifact** | | |
| ca-1 (Whispering Stone) | Shadow Market | + Enchanter ("Identify the artifact's magic") |
| ca-2 (Arcane Analysis) | Academy | + Enchanter ("Borrow arcane instruments") |
| ca-3 (Merchant's Favour) | General Store | + Shadow Market ("Meet the merchant for instructions") |
| ca-4 (Purification) | Enchanter | + Academy ("Consult final ritual texts") + Graveyard ("Gather midnight reagents") |

**File: `src/test/questLOQ.test.ts`** -- Existing tests already validate multi-objective correctness (unique IDs, valid locations). No new test code needed, but the test count verification may need updating.

---

### Part 2: Quest Notifications in Center Panel (Not Toasts)

**Problem**: When completing a quest location objective, the feedback is a `toast.success()` popup. The user wants all quest messages to appear in the center panel using the same `EventPanel` system as weekly events.

**Approach**: Instead of calling `toast.success(completionText)`, the `completeLocationObjective` store action will set `eventMessage` and switch `phase` to `'event'`. The EventPanel will then display the message with a "Continue" button.

**Files to change:**

| File | Change |
|------|--------|
| `src/store/helpers/questHelpers.ts` | `completeLocationObjective` sets `eventMessage` + `phase: 'event'` with the objective's `completionText` |
| `src/components/game/LocationPanel.tsx` | Remove `toast.success()` call after `completeLocationObjective`; the store now handles display |
| `src/components/game/HomePanel.tsx` | Same removal of `toast.success()` |
| `src/hooks/useLocationClick.ts` | Add keyword detection for quest objective events (e.g. `quest-objective` tag) so `extractEventId` and `extractEventType` handle them correctly |

**How it works:**

1. Player clicks "Complete Objective" button on LocationPanel
2. `completeLocationObjective` in store updates player progress AND sets `eventMessage: "[quest-objective] The completionText here"`, `phase: 'event'`
3. GameBoard detects `phase === 'event'` and shows EventPanel in center panel
4. Player clicks "Continue" to dismiss and return to location view

**Event type mapping**: Quest objective completions will use type `'bonus'` (gold coin icon, positive green) since they are achievements. The `extractEventType` function in `useLocationClick.ts` will detect the `[quest-objective]` tag.

---

### Files Summary

| File | Action |
|------|--------|
| `src/data/questChains.ts` | Add 2nd/3rd LOQ to each NL chain step |
| `src/store/helpers/questHelpers.ts` | `completeLocationObjective` sets `eventMessage` + `phase: 'event'` |
| `src/components/game/LocationPanel.tsx` | Remove `toast.success()` after objective completion |
| `src/components/game/HomePanel.tsx` | Remove `toast.success()` after objective completion |
| `src/hooks/useLocationClick.ts` | Add `quest-objective` to event ID/type detection |
| `src/test/questLOQ.test.ts` | Update test counts if needed |
| `log2.md` | Timestamp entry for both changes |
| `CLAUDE.md` | Document convention: quest notifications use EventPanel, not toasts |

