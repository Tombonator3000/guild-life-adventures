

## Two-Part Plan: Hex Visual Effect + AI Hex Purchasing

### Part 1: Cursed Player Portrait Visual Effect

Add a magical "cursed" overlay effect on player portraits when a player has active curses/hexes. This will be a pulsing purple/dark aura visible on all portrait instances.

**What the player sees:**
- A glowing, pulsing purple/dark magical aura around the portrait frame
- Subtle animated particle-like effect (CSS-only, using box-shadow and keyframes)
- Visible on the game board token, sidebar portrait, turn order panel, and players tab

**Implementation:**

1. **Modify `CharacterPortrait.tsx`** — Add an optional `hasCurse` prop. When true, render an overlay `div` with a pulsing purple/dark aura animation using CSS `box-shadow` and a new keyframe animation.

2. **Add CSS keyframe** `curse-pulse` in `tailwind.config.ts` — A subtle purple glow that pulses in and out (alternating opacity/spread of a purple box-shadow).

3. **Pass `hasCurse` prop** from these components:
   - `PlayerToken.tsx` — check `player.activeCurses.length > 0`
   - `AnimatedPlayerToken.tsx` — same check
   - `ResourcePanel.tsx` — same check  
   - `TurnOrderPanel.tsx` — same check
   - `PlayersTab.tsx` — same check

### Part 2: AI Hex Scroll Purchasing

The AI can already **cast** hexes and buy amulets, but it **never buys hex scrolls**. This is the critical missing link — the AI generates cast actions only when `hexScrolls.length > 0`, but never acquires scrolls.

**Implementation:**

1. **Add `'buy-hex-scroll'` to `AIActionType`** in `src/hooks/ai/types.ts`.

2. **Add purchase logic in `rivalryActions.ts`** — When hex feature is enabled, rival is threatening, AI has gold, and AI is at Shadow Market or Enchanter with no scrolls:
   - Pick an appropriate hex from the current stock (`getShadowMarketHexStock` or `getEnchanterHexStock`)
   - Prefer personal curses (direct impact) over location hexes
   - Generate a `buy-hex-scroll` action with priority ~60
   - Morgath personality gets a priority boost (aggressive)

3. **Add `handleBuyHexScroll` handler in `actionExecutor.ts`** — Calls `store.buyHexScroll(player.id, hexId, cost)`.

4. **Add handler to `ACTION_HANDLERS` map** in `actionExecutor.ts`.

5. **Add travel-to-shadow-market action** — If AI has gold, no scrolls, and rival is threatening, generate a move action to Shadow Market (priority ~50) so the AI proactively visits to buy hexes.

### Technical Details

```text
Files to modify:
  src/components/game/CharacterPortrait.tsx    -- add hasCurse prop + overlay
  tailwind.config.ts                           -- add curse-pulse animation
  src/components/game/PlayerToken.tsx           -- pass hasCurse
  src/components/game/AnimatedPlayerToken.tsx   -- pass hasCurse
  src/components/game/ResourcePanel.tsx         -- pass hasCurse
  src/components/game/TurnOrderPanel.tsx        -- pass hasCurse
  src/components/game/tabs/PlayersTab.tsx       -- pass hasCurse
  src/hooks/ai/types.ts                        -- add 'buy-hex-scroll' type
  src/hooks/ai/actions/rivalryActions.ts        -- add buy logic + travel
  src/hooks/ai/actionExecutor.ts               -- add handler
  log2.md                                      -- log changes
```

### Estimated scope
- ~120 lines of new code across 11 files
- No new dependencies
- All existing tests remain unaffected (hex buying is additive)

