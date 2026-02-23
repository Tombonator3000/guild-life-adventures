

## Generate AI Room Graphics for All 16 Home Items

### What
Use Gemini AI to generate dedicated room-placement graphics for all 16 buyable home items. Currently these items show emoji fallbacks because `public/items/{id}.png` files don't exist.

### The 16 Items

**8 Appliances:** scrying-mirror, simple-scrying-glass, memory-crystal, music-box, cooking-fire, preservation-box, arcane-tome, frost-chest

**8 Durables:** candles, blanket, furniture, glow-orb, warmth-stone, dagger, sword, shield

### Implementation

**1. New Edge Function: `supabase/functions/generate-home-item/index.ts`**
- Based on existing `generate-border/index.ts` pattern (same auth, CORS, error handling)
- Takes `itemId` and `itemName` as input
- Uses `google/gemini-2.5-flash-image` via Lovable AI Gateway
- Prompt: "Medieval woodcut whimsical illustration of [item description] as placed in a medieval room, black ink on aged parchment, detailed line work, fantasy RPG item icon, 1:1 square, 512x512"
- Each item gets a tailored description (e.g. "an ornate scrying mirror hanging on a stone wall", "flickering candles on a wooden shelf")
- Returns base64 image data
- Handles 429/402 rate limits

**2. New Utility: `src/utils/homeItemImageCache.ts`**
- IndexedDB cache for generated images (base64 is too large for localStorage)
- `getCachedImage(itemId)` / `setCachedImage(itemId, dataUrl)` / `getAllCachedIds()` / `clearCache()`
- Simple wrapper around raw IndexedDB (no new dependencies)

**3. New Admin Component: `src/components/game/home/HomeItemGenerator.tsx`**
- Admin panel accessible from HomePanel (debug/dev mode toggle)
- "Generate All Room Graphics" button
- Generates items sequentially with 3-second delays between requests (rate limit protection)
- Progress bar showing current item being generated
- Stores results in IndexedDB cache
- "Clear Cache" option to regenerate
- Preview grid of all 16 items showing generated vs missing

**4. Update `RoomScene.tsx` ItemIcon Component**
- Add `useEffect` + state to check IndexedDB cache on mount
- Priority: IndexedDB cached image -> `public/items/{id}.png` -> emoji fallback
- Async loading with the same image element pattern

**5. Update `HomePanel.tsx`**
- Add a small admin button (only visible in dev) to open the generator

**6. Update `supabase/config.toml`** (create if missing)
- Add `generate-home-item` function with `verify_jwt = false`

**7. Update `log2.md`** with timestamp entry

**8. Update `CLAUDE.md`** with lessons learned

### Technical Details

**Files to create (3):**
| File | Purpose |
|------|---------|
| `supabase/functions/generate-home-item/index.ts` | Edge function for Gemini image generation |
| `src/utils/homeItemImageCache.ts` | IndexedDB cache utility |
| `src/components/game/home/HomeItemGenerator.tsx` | Admin UI for generating + previewing images |

**Files to modify (4):**
| File | Change |
|------|--------|
| `src/components/game/home/RoomScene.tsx` | ItemIcon checks IndexedDB cache first |
| `src/components/game/HomePanel.tsx` | Add generator toggle button |
| `log2.md` | Timestamp entry |
| `CLAUDE.md` | Updated conventions |

**Files to create (1):**
| File | Purpose |
|------|---------|
| `supabase/config.toml` | Edge function configuration |

**No new dependencies needed.** IndexedDB is a native browser API.

### Item Prompt Descriptions

Each item gets a specific room-placement description:
- **scrying-mirror**: "ornate magical mirror with swirling mist, mounted on a stone wall"
- **simple-scrying-glass**: "small enchanted crystal ball on a wooden stand"
- **memory-crystal**: "glowing purple crystal on a pedestal, storing magical memories"
- **music-box**: "ornate wooden music box with arcane runes, lid slightly open"
- **cooking-fire**: "eternal magical cooking flame in a stone hearth"
- **preservation-box**: "enchanted wooden chest with frost runes for preserving food"
- **arcane-tome**: "large ancient spellbook on a lectern, pages glowing faintly"
- **frost-chest**: "ice-encrusted storage chest radiating cold mist"
- **candles**: "cluster of melting candles in a brass holder on a shelf"
- **blanket**: "thick wool blanket draped over a simple wooden bed"
- **furniture**: "basic medieval wooden chair and small table"
- **glow-orb**: "floating magical orb emitting warm golden light"
- **warmth-stone**: "enchanted hearthstone glowing with inner warmth on the floor"
- **dagger**: "ornate dagger mounted on a wall bracket"
- **sword**: "longsword displayed on a wall-mounted rack"
- **shield**: "round wooden shield with iron boss hanging on the wall"

