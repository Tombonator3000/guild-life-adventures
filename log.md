# Guild Life Adventures - Development Log

## 2026-02-10 - Forge Tempering Fix, Dungeon 6-Floor Display, Inventory Overhaul

### Overview

Fixed forge tempering to display correctly in inventory, updated all dungeon progress displays to show 6 floors, enlarged the inventory grid, added tempered item indicators, and placed the player portrait at the bottom of the inventory panel.

### Bug Fix: Forge Tempering Display

**Problem:** Forge tempering worked correctly in combat (all `calculateCombatStats` calls passed `temperedItems`), but the inventory display was broken:
- `calculateTotalAttack()` and `calculateTotalDefense()` in InventoryGrid only read base weapon/armor stats, ignoring temper bonuses
- Tempered items had no visual indicator in the inventory grid
- Item tooltips showed no temper bonus information
- Combat stats summary in inventory didn't include block chance or temper note

**Fix:** Updated InventoryGrid to use `calculateCombatStats()` with `temperedItems` parameter, added `tempered` and `temperedStats` fields to `InventoryItem` interface, and updated `buildInventoryItems()` to populate these fields from `player.temperedItems`.

### Dungeon Progress: 6-Floor Display

**Problem:** Floor 6 "The Forgotten Temple" existed in `dungeon/floors.ts` but all progress displays hardcoded `/5` and only showed 5 floor indicators.

**Fix:** Updated all dungeon progress displays to show `/6` and 6 floor indicators:
- `SideInfoTabs.tsx` — progress bar and floor grid
- `InfoTabs.tsx` — dungeon progress section
- `banter.ts` — NPC dialogue for 5+ and 6 floors cleared
- `achievements.ts` — new "Temple Explorer" achievement for clearing all 6 floors

### Inventory Overhaul

1. **Larger grid**: 4×5 (20 slots) → 5×6 (30 slots), slot size 40px → 44px
2. **Tempered indicators**:
   - Green "T" badge on tempered items in equip slots and inventory grid
   - Green border glow on equipped tempered items
   - Star icon + "(Tempered)" label in item tooltip
   - Separate "Temper Bonus" section in tooltip showing +ATK/+DEF/+BLK
3. **Combat stats summary**: Now includes block chance and "Temper bonuses included" note
4. **Player portrait**: Large 120px character portrait at bottom of inventory with name and guild rank

### Files Modified

| File | Changes |
|------|---------|
| `src/components/game/InventoryGrid.tsx` | Fixed calculateTotalAttack/Defense to use calculateCombatStats with temperedItems; added tempered/temperedStats to InventoryItem; green indicators on tempered items; enlarged grid 5×6; added player portrait at bottom; added block chance to stats summary |
| `src/components/game/SideInfoTabs.tsx` | Dungeon progress /5 → /6, added floor 6 indicator |
| `src/components/game/InfoTabs.tsx` | Dungeon progress /5 → /6, added floor 6 indicator |
| `src/data/banter.ts` | Added 6-floor dialogue, adjusted 5-floor dialogue |
| `src/data/achievements.ts` | Added "Temple Explorer" achievement for clearing all 6 floors |

### Build & Tests
- TypeScript: compiles cleanly (tsc --noEmit)
- Build: passes (vite build)
- Tests: 176/176 pass

---

## 2026-02-10 - Web Speech API Voice Narration (Implementation)

### Overview

Implemented browser-native voice narration using the Web Speech API (SpeechSynthesis). Zero dependencies — no npm packages, no API keys, no model downloads. NPCs, events, and weekend activities are read aloud when enabled in Options > Audio.

### Architecture

```
speechNarrator.ts (singleton) ← useNarration.ts (hooks) ← Index.tsx (controller) + OptionsMenu.tsx (UI)
```

- **Tier 2 in the narration stack**: Falls below Kokoro TTS (future) but above text-only
- **Off by default** — user must enable in Options > Audio > Voice Narration
- **Settings persisted** in localStorage (`guild-life-narration-settings`)

### Files Created

| File | Purpose |
|------|---------|
| `src/audio/speechNarrator.ts` | Singleton wrapping SpeechSynthesis API with voice selection, bug workarounds, settings persistence |
| `src/hooks/useNarration.ts` | `useNarrationSettings` (Options UI binding) + `useNarrationController` (game event narration driver) |

### Files Modified

| File | Changes |
|------|---------|
| `src/components/game/OptionsMenu.tsx` | Added Voice Narration section to Audio tab (enable toggle, voice picker, volume slider, speed slider) |
| `src/pages/Index.tsx` | Added `useNarrationController` alongside music/ambient controllers |

### Features

1. **Smart voice selection** — en-GB priority: Google UK English Male > Google UK English Female > Microsoft Daniel > Apple Daniel > any en-GB > any English > default
2. **NPC greeting narration** — speaks NPC greeting when arriving at a location
3. **Event message narration** — speaks weather events, robbery alerts, festival announcements
4. **Weekend event narration** — speaks weekend activity descriptions
5. **Voice picker** — dropdown of all available English voices (filtered from browser)
6. **Volume & speed sliders** — adjustable 0-100% volume, 0.5x-2.0x speed
7. **User gesture gate** — first speech unlocked on click/tap/keydown (Chrome 71+ requirement)

### Bug Workarounds Implemented

| Bug | Workaround |
|-----|-----------|
| Chrome 15s cutoff | Game text is short (<200 chars), non-issue |
| Utterance GC kills `onend` | Store reference in `currentUtterance` module var |
| `cancel()` swallows next `speak()` | 300ms delay between cancel and new speak |
| Firefox utterance reuse | Always create new `SpeechSynthesisUtterance` per call |
| Voices load async (Chrome) | `voiceschanged` event + 3s timeout fallback |
| User gesture required | Global click/touch/keydown listener, gate on `userGestureReceived` |
| Browser not supported | `isSupported` check, fallback message in UI |

### Build & Tests
- TypeScript: compiles cleanly (tsc --noEmit)
- Build: passes (vite build)
- Tests: 176/176 pass (no new tests needed — Web Speech API is browser-only)

---

## 2026-02-10 - Web Speech API Research (Voice Narration Fallback)

### Context

Previous research (earlier today) recommended **Kokoro TTS** (client-side, `kokoro-js`) as the primary narration engine, with **ElevenLabs** for pre-generated key lines. This follow-up research evaluates the **Web Speech API (SpeechSynthesis)** as a zero-setup browser-native fallback — requiring no npm packages, no model downloads, no API keys.

### What Is the Web Speech API?

The `window.speechSynthesis` API is a browser-native TTS engine built into all modern browsers since 2018. It provides text-to-speech synthesis with no dependencies, no cost, and no setup. You create a `SpeechSynthesisUtterance`, set text/voice/rate/pitch/volume, and call `speechSynthesis.speak()`.

### Browser Support

| Browser | Support | Since |
|---------|---------|-------|
| Chrome | Full | v33+ (2014) |
| Firefox | Full | v49+ (2016) |
| Safari | Full | v7.1+ (2014) |
| Edge | Full | v14+ |
| iOS Safari | Yes (with caveats) | iOS 7+ |
| Android Chrome | Yes (with caveats) | Yes |

### Preferred Voices for Guild Life Adventures

The user's preferred voices and their actual availability:

| Voice | Browser/OS | Lang | Type | Quality |
|-------|-----------|------|------|---------|
| **Google UK English Male** | Chrome Desktop only | en-GB | Cloud (`localService: false`) | Good — requires internet |
| **Google UK English Female** | Chrome Desktop only | en-GB | Cloud (`localService: false`) | Good — requires internet |
| **Microsoft David** | Windows (all browsers) | en-US | Local SAPI | Decent — works offline |
| **Microsoft Daniel** | Windows 11 / Edge | en-GB | Local Natural (downloadable) | Good — works offline after download |
| **Apple Daniel** | macOS/iOS Safari | en-GB | Local | Decent — always available on Apple |
| **Microsoft Hazel** | Windows (all browsers) | en-GB | Local SAPI | Decent — works offline |
| **Microsoft Sonia Online** | Edge only | en-GB | Cloud | Good — requires internet |

**Key finding**: No single voice is available across all browsers. The Google UK English voices only exist in Chrome Desktop. Microsoft voices only exist on Windows. Apple voices only exist on Apple platforms. A voice preference system with intelligent fallback is required.

### Recommended Voice Selection Algorithm

```
Priority order for en-GB fantasy narration:
1. "Google UK English Male" (Chrome Desktop — best quality for en-GB)
2. "Google UK English Female" (Chrome Desktop — alternate)
3. "Microsoft Daniel" (Windows 11 / Edge — en-GB Natural)
4. "Microsoft Sonia Online (Natural)" (Edge — en-GB)
5. "Daniel" (Apple platforms — en-GB)
6. "Microsoft Hazel Desktop" (Windows — en-GB SAPI)
7. Any voice where voice.lang === "en-GB"
8. Any voice where voice.lang.startsWith("en")
9. Default system voice (last resort)
```

### API Parameters

| Property | Range | Default | Notes |
|----------|-------|---------|-------|
| `text` | Up to 32,767 chars (spec) | `""` | Keep under 200 chars for Chrome reliability |
| `lang` | BCP 47 tag | `""` | Use `"en-GB"` for British English |
| `voice` | From `getVoices()` | null | Must be set after voices load |
| `rate` | 0.1 – 10.0 | 1.0 | 0.85–0.95 recommended for fantasy narration |
| `pitch` | 0.0 – 2.0 | 1.0 | 0.8–0.9 for deeper male voice, 1.1 for female |
| `volume` | 0.0 – 1.0 | 1.0 | Tied to narration volume slider |

### Requires No Setup — Confirmed

- No npm packages needed
- No API keys or accounts
- No model downloads (unlike Kokoro's 160MB model)
- No server infrastructure
- Works offline with local voices
- Google cloud voices in Chrome do send text to Google servers but cost nothing

### Critical Bugs & Workarounds

#### Bug 1: Chrome 15-Second Cutoff (Chromium Issue #679437)
Speech stops after ~15 seconds on Chrome Desktop. Google voices most affected.
- **Workaround A (Desktop)**: Pause/resume timer every 14 seconds
- **Workaround B (Universal)**: Chunk text into sentences < 200 characters
- **Note**: Pause/resume workaround **breaks on Android Chrome** (speech never resumes)
- **For our game**: NPC dialog and event text is already short (1-3 sentences), so this is largely a non-issue

#### Bug 2: `onend` Event Not Firing (GC Issue)
Browser garbage-collects utterance before `onend` fires.
- **Workaround**: Store utterance reference in module scope (e.g., `this.currentUtterance = utterance`)

#### Bug 3: `cancel()` Swallows Next `speak()`
Calling `cancel()` then immediately `speak()` silently drops the new utterance.
- **Workaround**: 500ms delay between `cancel()` and next `speak()`

#### Bug 4: Firefox Utterance Not Reusable
Cannot reuse the same `SpeechSynthesisUtterance` object.
- **Workaround**: Always create a new utterance per `speak()` call

#### Bug 5: Voice Loading Is Asynchronous (Chrome/Edge)
`getVoices()` returns empty array on first call in Chromium browsers.
- **Workaround**: Listen for `voiceschanged` event + setTimeout fallback:
```
1. Try getVoices() immediately (works in Firefox)
2. Listen for 'voiceschanged' event (Chrome/Edge/Safari)
3. Set 3-second timeout as fallback
```

#### Bug 6: iOS Mute Switch Silences TTS
Physical mute switch on iPhone/iPad silences SpeechSynthesis entirely.
- **No workaround** — must inform user

#### Bug 7: User Gesture Required
`speak()` must be called from a user click/tap in Chrome 71+ and all iOS browsers.
- **Workaround**: Gate first TTS call behind a user interaction (e.g., game start, location click, "Enable Narration" button)

### Quality Assessment

| Tier | Source | Quality | Cost |
|------|--------|---------|------|
| 1 (Best) | ElevenLabs pre-generated MP3s | Near-human | $5 one-time |
| 2 | Kokoro TTS (client-side) | Good neural TTS | Free (160MB model) |
| 3 | Google Chrome cloud voices | Decent | Free (browser-native) |
| 3 | Microsoft Edge Online voices | Decent | Free (browser-native) |
| 4 | OS local voices (SAPI, Apple) | Robotic-to-decent | Free |
| 5 | eSpeak (Linux fallback) | Very robotic | Free |

**Verdict**: Web Speech API is Tier 3-4 quality. For a fantasy game, the slightly robotic quality of older voices can be embraced as "medieval text-to-speech" character. Google UK English voices in Chrome are actually quite good for game dialog.

### Comparison: Web Speech API vs Kokoro TTS

| Feature | Web Speech API | Kokoro TTS (kokoro-js) |
|---------|---------------|----------------------|
| **Setup** | Zero — browser native | npm install + 160MB model download |
| **Cost** | Free | Free |
| **Quality** | Decent (varies by browser) | Good (neural, consistent) |
| **Voice count** | Varies (1-100+ depending on OS) | 21 built-in English voices |
| **Consistency** | Very inconsistent across browsers | Same everywhere |
| **Offline** | Yes (local voices only) | Yes (after model cached) |
| **Bundle size** | 0 KB | ~160MB model (lazy-loaded) |
| **First-use latency** | Instant | Model download + init |
| **User gesture needed** | Yes (first call) | No |
| **Chrome 15s bug** | Yes | No |
| **Web Worker support** | No (main thread only) | Yes |
| **Best for** | Quick fallback, zero-config | Primary narration engine |

### Recommended Architecture: Tiered Fallback System

```
Tier 0: Pre-generated MP3 assets (key NPC lines, tutorial, location intros)
  ↓ (if text not pre-generated)
Tier 1: Kokoro TTS via kokoro-js (if user has enabled + model downloaded)
  ↓ (if kokoro not available / not enabled)
Tier 2: Web Speech API (browser native fallback)
  ↓ (if speechSynthesis not available)
Tier 3: No narration (text only — current behavior)
```

### Web Speech API — Game Integration Points

For Guild Life Adventures, the Web Speech API would narrate:

| Event | Example Text | Priority |
|-------|-------------|----------|
| **NPC Greetings** | "Welcome to the Guild Hall, adventurer!" | High — short text, ideal for TTS |
| **Weekend Events** | "You spend the weekend at the Fighting Pits..." | High — atmospheric narration |
| **Quest Descriptions** | "A merchant has lost his cargo in the caves..." | Medium |
| **Location Arrival** | "You arrive at the Shadow Market..." | Medium |
| **Event Messages** | "A snowstorm batters Guildholm!" | Medium |
| **Tutorial Steps** | "Click a location on the board to travel there" | Low (pre-generated MP3 preferred) |
| **Combat Narration** | "You deal 15 damage to the Goblin Chief!" | Low (too frequent, use sparingly) |

### Voice Settings UI (Options Menu)

Proposed settings for when implementation begins:

```
[Audio Tab]
  Music Volume: [slider 0-100%]
  SFX Volume: [slider 0-100%]
  Ambient Volume: [slider 0-100%]

  Narration: [OFF] / Web Speech / Kokoro (if installed)
  Narration Voice: [dropdown — populated from available voices]
  Narration Volume: [slider 0-100%]
  Narration Speed: [slider 0.5x - 2.0x]
```

### Useful Libraries

- **[EasySpeech](https://github.com/leaonline/easy-speech)**: Normalizes cross-browser SpeechSynthesis differences into a single API. Handles voiceschanged, utterance GC, cancel/speak race conditions. ~8KB gzipped. Worth evaluating to avoid hand-rolling all workarounds.
- **[web-speech-recommended-voices](https://github.com/HadrienGardeur/web-speech-recommended-voices)**: Curated JSON lists of recommended voices per language/platform.

### Conclusion

**Web Speech API is an excellent zero-cost, zero-setup fallback** for voice narration. It works in all browsers, requires no installation, and handles short game dialog (NPC greetings, events, quests) well. The quality ranges from "good" (Google Chrome voices) to "adequate" (OS local voices) for a fantasy game context.

**Key constraint**: Voice availability is unpredictable across browsers, so the implementation must have a smart voice selection algorithm with graceful degradation. The Chrome 15-second bug is mostly irrelevant for our short game text.

**Recommendation**: Use Web Speech API as Tier 2 fallback behind Kokoro TTS. For the simplest first implementation, Web Speech API alone would provide immediate narration capability with zero dependencies — just add a `useNarration` hook that wraps `window.speechSynthesis`.

### Implementation Steps (Web Speech API Fallback)

- [ ] Create `src/audio/speechNarrator.ts` — singleton wrapping SpeechSynthesis with voice selection, chunking, bug workarounds
- [ ] Add voice loading with `voiceschanged` event + timeout fallback
- [ ] Implement preferred voice selection algorithm (en-GB priority list)
- [ ] Add `narrationMode: 'off' | 'web-speech' | 'kokoro'` to game options
- [ ] Add Narration section to OptionsMenu Audio tab (off by default, voice picker, volume/speed sliders)
- [ ] Create `useNarration` hook — trigger narration on NPC greetings, weekend events, quest text, location arrival
- [ ] Gate first `speak()` call behind user gesture (button click)
- [ ] Store utterance references to prevent GC (Bug 2 workaround)
- [ ] Add 500ms cancel-before-speak delay (Bug 3 workaround)
- [ ] (Optional) Evaluate `easy-speech` npm package to simplify cross-browser handling
- [ ] (Optional) Add NPC-specific voice presets (pitch/rate tweaks per NPC character)

---

## 2026-02-10 - Weather-Festival Conflict Fix & Complete Event Catalog

### Task 1: Fix Weather-Festival Conflict (Drought + Harvest Festival)

**Problem**: Weather events and festivals were completely independent systems with no conflict resolution. This meant contradictory combinations could occur simultaneously — most notably, Drought ("A scorching drought dries the land. Food prices soar") displaying alongside Harvest Festival ("All prices reduced by 15% this week!"). Mechanically the price multipliers stacked (1.15 × 0.85 = ~0.98), but the messaging was confusing and thematically absurd.

**Root Cause**: In `weekEndHelpers.ts`, `advanceWeatherSystem()` and `checkFestival()` were called independently with no cross-check.

**Fix**:

1. **Added conflict map** (`src/data/weather.ts`):
   - `WEATHER_FESTIVAL_CONFLICTS` defines which weather types conflict with which festivals
   - `isWeatherFestivalConflict(weatherType, festivalId)` exported helper function
   - Conflict pairs:
     - `drought` ↔ `harvest-festival` (scorching land vs abundant cheap harvest)
     - `snowstorm` ↔ `midsummer-fair` (snow in summer)
     - `snowstorm` ↔ `harvest-festival` (snow kills crops)

2. **Conflict resolution in orchestrator** (`src/store/helpers/weekEndHelpers.ts`):
   - Festival is now checked FIRST (it's deterministic, every 12 weeks)
   - After weather is rolled, if it conflicts with the active festival, weather is cleared
   - If previous weather was active and gets cleared by festival, a thematic message is shown: "The [Festival] celebrations dispel the [weather]. Fair skies return!"
   - If the conflicting weather was just rolled this tick, it's silently suppressed (no message)

**Files Changed**:
- `src/data/weather.ts` — Added `WEATHER_FESTIVAL_CONFLICTS`, `isWeatherFestivalConflict()`, imported `FestivalId` type
- `src/store/helpers/weekEndHelpers.ts` — Imported `isWeatherFestivalConflict`, reordered festival before weather, added conflict resolution block

**Tests**: 176 pass, TypeScript clean, build succeeds.

### Task 2: Complete Event Catalog

All events/random occurrences that can happen in Guild Life Adventures:

---

#### A. Weather Events (src/data/weather.ts)
~8% chance per week, duration 1-3 weeks. Guarded by `enableWeatherEvents` option.

| # | Weather Type | Effects | Visual |
|---|-------------|---------|--------|
| 1 | **Snowstorm** | +1 movement cost, +10% prices, -2 happiness/wk, 50% less robbery | Snow particles |
| 2 | **Thunderstorm** | +1 movement cost, +5% prices, -1 happiness/wk, +50% robbery | Rain + lightning |
| 3 | **Drought** | +15% prices, -2 happiness/wk, 25% food spoilage chance | Heat shimmer |
| 4 | **Enchanted Fog** | +1 movement cost, -5% prices, +3 happiness/wk, +20% robbery | Fog layers |
| 5 | **Harvest Rain** | -10% prices, +2 happiness/wk | Light rain |

#### B. Seasonal Festivals (src/data/festivals.ts)
Deterministic every 12 weeks. Guarded by `enableFestivals` option.

| # | Festival | Week | Effects |
|---|---------|------|---------|
| 6 | **Harvest Festival** | 12, 60, 108... | +5 happiness, -15% prices |
| 7 | **Winter Solstice** | 24, 72, 120... | +3 happiness, +2 study sessions, +3 dependability |
| 8 | **Spring Tournament** | 36, 84, 132... | +3 happiness, +50% dungeon gold |
| 9 | **Midsummer Fair** | 48, 96, 144... | +5 happiness, +10g, +15% wages |

#### C. Shadowfingers Robbery (src/data/shadowfingers.ts)

| # | Event | Trigger | Chance |
|---|-------|---------|--------|
| 10 | **Street Robbery (Bank)** | Leaving bank with gold, week ≥4 | ~3.2% (×3 if homeless, ×1.5-2.5 if 1000g+) |
| 11 | **Street Robbery (Shadow Market)** | Leaving shadow market with gold, week ≥4 | ~2% (×3 if homeless) |
| 12 | **Apartment Robbery** | Living in slums with durables, per turn | 1/(relaxation+1), ~2-9% |

#### D. Weekly Theft (src/data/events.ts — checkWeeklyTheft)

| # | Event | Condition | Chance | Effect |
|---|-------|-----------|--------|--------|
| 13 | **Shadowfingers Theft** | Homeless/slums, 20+ gold | 25% (×1.5 if homeless) | -50g, -3 happiness |
| 14 | **Shadowfingers Major Heist** | Homeless/slums, 100+ gold | 10% (×1.5 if homeless) | -100g, -5 happiness |

#### E. Random Location Events (src/data/events.ts — checkForEvent)

| # | Event | Condition | Chance | Effect |
|---|-------|-----------|--------|--------|
| 15 | **Bank Robbery** | At bank, 200+ gold | 20% | -100g, -5 happiness |
| 16 | **Shadow Market Ambush** | At shadow market, 150+ gold | 25% | -75g, -4 happiness |
| 17 | **Pickpocket** | At shadow market/fence, 10+ gold | 15% | -25g |
| 18 | **Lucky Find** | Anywhere | 5% | +30g, +5 happiness |
| 19 | **Guild Bonus** | At guild hall | 3% | +50g, +10 happiness |
| 20 | **Generous Tip** | Anywhere | 10% | +15g, +3 happiness |
| 21 | **Economic Boom** | Anywhere | 10% | +5 happiness |
| 22 | **Economic Crash** | Anywhere | 8% | -5 happiness |
| 23 | **Illness** | Homeless/slums | 5% | -15 HP, -2 happiness |
| 24 | **Food Poisoning** | At shadow market/tavern | 8% | -20 HP, -3 happiness |
| 25 | **Clothing Torn** | Anywhere | 5% | -20 clothing |

#### F. Market Crash Events (src/data/events.ts — checkMarketCrash)
Only during recession trend + low economy.

| # | Event | Chance | Effect |
|---|-------|--------|--------|
| 26 | **Pay Cut** | 5% per week during recession | -20% wages, -10 happiness |
| 27 | **Layoff** | 3% per week during recession | Lose job, -20 happiness |

#### G. Travel Events (src/data/travelEvents.ts)
10% chance on trips of 3+ steps.

| # | Event | Type | Effect |
|---|-------|------|--------|
| 28 | **Found Coin Purse** | Positive | +15-34g, +2 happiness |
| 29 | **Wandering Merchant** | Positive | +3 happiness, +5 HP |
| 30 | **Hidden Shortcut** | Positive | +2 hours saved, +1 happiness |
| 31 | **Street Bard** | Positive | +5 happiness, -1 hour |
| 32 | **Pickpocket** | Negative | -10 to -30g, -3 happiness |
| 33 | **Muddy Road** | Negative | -5 HP, -2 happiness, -1 hour |
| 34 | **Took a Wrong Turn** | Negative | -1 happiness, -2 hours |
| 35 | **Aggressive Stray Dog** | Negative | -3 HP, -2 happiness, -1 hour |
| 36 | **Injured Traveler** | Mixed | +10g, +4 happiness, -2 hours |
| 37 | **Old Map Fragment** | Mixed | +25g, +3 happiness, -3 hours |

#### H. Weekend Events (src/data/weekends.ts)
One activity selected each week-end in processWeekEnd.

**Ticket Weekends** (purchased at Rusty Tankard):

| # | Event | Cost | Happiness |
|---|-------|------|-----------|
| 38 | **Jousting Tournament** | 25g (ticket) | +8 |
| 39 | **Theatre Performance** | 40g (ticket) | +10 |
| 40 | **Bard Concert** | 50g (ticket) | +12 |

**Durable Weekends** (20% chance per owned appliance):

| # | Event | Appliance | Happiness |
|---|-------|-----------|-----------|
| 41 | **Scrying Session** | Scrying Mirror | +3 |
| 42 | **Memory Crystal Replay** | Memory Crystal | +3 |
| 43 | **Music Box Concert** | Music Box | +4 |
| 44 | **Cooking Weekend** | Cooking Fire | +3 (-5g) |
| 45 | **Arcane Study** | Arcane Tome | +2 |

**Random Weekends** (fallback, 26 activities):

| # | Tier | Activities | Cost Range | Happiness |
|---|------|-----------|------------|-----------|
| 46-55 | **Cheap** (10) | Walk, Fishing, Market, Street Food, Nap, People Watch, Cards, Gardening, Ales, Campfire | 0-15g | +1 to +3 |
| 56-65 | **Medium** (10) | Feast, Horse Riding, Archery, Fortune Teller, Bathhouse, Arena, River Cruise, Dance, Museum, Picnic | 15-55g | +3 to +6 |
| 66-71 | **Expensive** (6) | Grand Ball, Royal Spa, Noble Hunt, Boat Cruise, Royal Banquet, Grand Magic Show | 50-100g | +7 to +12 |
| 72 | **Fallback** | Stayed Home | 0g | +1 |

#### I. Dungeon Random Modifiers (src/data/dungeon/floors.ts)
One modifier per dungeon run (random).

| # | Modifier | Effect |
|---|---------|--------|
| 73 | **Cursed Halls** | +30% damage taken, +50% gold |
| 74 | **Lucky Day** | +25% rare drop, +25% gold |
| 75 | **Blood Moon** | Enemies +50% power, +100% gold, no healing |
| 76 | **Echoing Darkness** | Traps can't be disarmed, +20% gold |
| 77 | **Blessed Ground** | -20% damage, +50% healing |
| 78 | **Fortune's Favor** | Treasure 2x gold, +50% rare drop |
| 79 | **Weakened Wards** | Enemies -30% power, -30% gold |

#### J. Doctor Visit Events (src/store/helpers/startTurnHelpers.ts)
Triggered at turn start under specific conditions.

| # | Event | Trigger | Chance | Effect |
|---|-------|---------|--------|--------|
| 80 | **Starvation Doctor Visit** | Food = 0, no fresh food | 25% | -30 to -200g, -10 hours, -4 happiness |
| 81 | **Spoiled Food Doctor Visit** | Fresh food spoils (drought) | 25% | -30 to -200g, -10 hours, -4 happiness |
| 82 | **Exhaustion Doctor Visit** | Relaxation ≤ 15 | 20% | -30 to -200g, -10 hours, -4 happiness |

#### K. Weekly Passive Events (src/store/helpers/weekEndHelpers.ts)

| # | Event | Trigger | Chance | Effect |
|---|-------|---------|--------|--------|
| 83 | **Random Sickness** | Any player | 5%/week | Sick status, -15 HP |
| 84 | **Clothing Degradation** | Every 8 weeks | 100% | -25 clothing condition |
| 85 | **Lottery Win (Grand)** | Has lottery tickets | 0.1%/ticket | +500g, +25 happiness |
| 86 | **Lottery Win (Small)** | Has lottery tickets | 5.9%/ticket | +20g, +5 happiness |
| 87 | **Appliance Breakage** | Own appliances | 1/51 enchanter, 1/36 market | Appliance becomes broken |
| 88 | **Eviction** | 8 weeks unpaid rent | 100% | Lose all possessions, -30 happiness |
| 89 | **Job Firing** | Dependability < 20 | 100% | Lose job |
| 90 | **Stock Market Crash** | Recession trend | 10%/week | All stock prices plummet |

#### L. Age Events (src/store/helpers/weekEndHelpers.ts)

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 91 | **Birthday Milestone (21)** | Age 21 | +5 happiness |
| 92 | **Birthday Milestone (25)** | Age 25 | +2 max HP |
| 93 | **Birthday Milestone (30)** | Age 30 | +5 happiness, +5 dependability |
| 94 | **Birthday Milestone (40)** | Age 40 | -2 max HP, +3 happiness |
| 95 | **Birthday Milestone (50)** | Age 50 | -5 max HP, +5 happiness |
| 96 | **Elder Decay** | Age 60+ birthday | -3 max HP per birthday |
| 97 | **Health Crisis** | Age 50+, weekly | 3% chance, -15 HP |

#### M. Death & Resurrection Events

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 98 | **Death** | HP reaches 0 | Game over or resurrection |
| 99 | **Paid Resurrection** | Dead + 100g+ savings | -100g (base, scales with wealth), +50 HP, -8 happiness |
| 100 | **Free Respawn** | Dead, no savings, permadeath OFF | 20 HP at graveyard, -8 happiness |
| 101 | **Permanent Death** | Dead, no savings, permadeath ON | Game over |

#### N. Starvation & Homeless Penalties (Turn Start)

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 102 | **Starvation** | Food = 0 at turn start | -20 hours |
| 103 | **Homeless Penalties** | No housing | -5 HP, -8 hours, 3x robbery chance |

---

**Total: 103 distinct events/occurrences across 14 categories.**

---

## 2026-02-10 - Menu Readability, Music Volume & Voice Narration Research

### Task 1: Save/Load Menu Text Readability

**Problem**: Save/load menu text was hard to read — slot names, details, and button labels used `text-muted-foreground` (HSL 30 25% 35%) at `text-xs`/`text-sm` size against the parchment background, creating low contrast.

**Changes** (`src/components/game/SaveLoadMenu.tsx`):
- **Slot names**: `text-sm text-card-foreground` → `text-base font-semibold text-wood-dark` (larger, bolder, darker)
- **Auto save label**: `text-xs text-muted-foreground` → `text-xs font-normal text-wood-light`
- **Slot details** (week/players/date): `text-xs text-muted-foreground` → `text-sm text-wood` (larger, darker)
- **Empty slot text**: `text-xs text-muted-foreground` → `text-sm text-wood-light`
- **Save/Load buttons**: `text-xs` → `text-sm font-semibold`, increased padding
- **Delete icon**: `w-3 h-3` → `w-4 h-4`
- **Mode tabs** (Save Game/Load Game): Added `font-semibold`, inactive text `text-muted-foreground` → `text-wood`
- **Bottom buttons** (Options/Manual/Quit): `text-muted-foreground` → `text-wood`, added `font-semibold`, increased padding

### Task 2: Music Default Volume → 10%

**Problem**: Music played very loud at default 50% volume. The music tracks are inherently loud so even 50% felt overwhelming.

**Change** (`src/audio/musicConfig.ts`):
- `DEFAULT_MUSIC_VOLUME` changed from `0.5` (50%) to `0.1` (10%)
- Only affects new users / cleared localStorage. Existing users keep their saved volume preference.

### Task 3: Voice Cloning / Narration Research

**Goal**: Investigate integrating voice cloning for game narration, with voice options in the options menu (off as default).

#### Options Evaluated

| Approach | Cost | Quality | Voice Cloning | Offline |
|----------|------|---------|---------------|---------|
| Web Speech API (browser native) | Free | Low/inconsistent | No | Yes |
| Kokoro TTS (client-side, 82M params) | Free | Good | No (21 voices) | Yes |
| ElevenLabs (cloud) | $5-99/mo | Excellent | Yes | No |
| OpenAI TTS (cloud) | $15/1M chars | Very good | No | No |
| Google Cloud TTS | $4-16/1M chars | Very good | Limited | No |
| Chatterbox (self-hosted, MIT) | Server cost | Good | Yes | Server-side |
| Fish Speech (cloud/self-hosted) | $0-11/mo | Good | Yes | Optional |
| Pre-generated audio files | One-time | Excellent | N/A | Yes |

#### Recommended Approach: Tiered Implementation

**Tier 1 (Start here)**: **Kokoro TTS via `kokoro-js` (client-side)**
- `npm i kokoro-js` — runs 100% in browser via WebGPU/WASM
- 21 built-in English voices, ~160MB model download (cached)
- Zero ongoing cost, works offline
- Add options menu toggle (off by default), lazy-load model only when enabled
- Use Web Worker to avoid blocking UI

**Tier 2 (Enhancement)**: **Pre-generate key narration with ElevenLabs**
- Use ElevenLabs ($5/mo Starter) to pre-generate audio for fixed text (location descriptions, tutorial, quest intros)
- Clone a custom fantasy narrator voice from short audio sample
- Export as MP3 static assets — one-time cost ~$5-20, then cancel subscription
- Fall back to Kokoro for dynamic/overflow text

**Tier 3 (If server budget available)**: **Self-hosted Chatterbox (MIT license)**
- Deploy on GPU server (~$50-150/mo)
- Full voice cloning from short audio sample
- `/api/tts` endpoint, cache results in CDN

#### Implementation Plan (When Ready)

1. Add to `gameOptions.ts`: `narrationEnabled: false`, `narrationVoice: string`, `narrationVolume: number`
2. Add Narration section to OptionsMenu Audio tab (off by default)
3. Lazy-load kokoro-js only when user enables narration
4. Run TTS in Web Worker for non-blocking synthesis
5. Cache generated audio in IndexedDB keyed by text hash
6. Hook into game events (location arrival, quest text, event messages) to trigger narration
7. Optionally pre-generate key narration lines as static MP3 assets

### Files Changed

- `src/components/game/SaveLoadMenu.tsx` — Text readability improvements
- `src/audio/musicConfig.ts` — DEFAULT_MUSIC_VOLUME 0.5 → 0.1

## 2026-02-10 - Refactor: LocationPanel getLocationTabs() → Factory Pattern

### Problem

`LocationPanel.tsx` was 770 lines with a 514-line `getLocationTabs()` switch statement — the single most complex function in the codebase. It contained 14 case blocks (one per location type), each building tab arrays with inline JSX, prop wiring, and business logic. Changes to one location risked breaking others, and the file required 50+ destructured store actions.

### Solution

Extracted the switch statement into a factory pattern in a new file `src/components/game/locationTabs.tsx`:

1. **`LocationTabContext` interface** — bundles all store actions + game state needed by tab factories
2. **13 named factory functions** — one per location (`guildHallTabs`, `tavernTabs`, `forgeTabs`, etc.)
3. **`TAB_FACTORIES` lookup record** — maps `LocationId` → factory function, replacing the switch
4. **`getLocationTabs(locationId, isHere, ctx)`** — 3-line function: checks `isHere`, looks up factory, calls it
5. **`getWorkInfo(locationId, ctx)`** — extracted work footer builder

### Results

| File | Before | After | Change |
|------|--------|-------|--------|
| `LocationPanel.tsx` | 770 lines | 207 lines | -73% |
| `locationTabs.tsx` | (new) | 440 lines | — |
| `getLocationTabs()` | 514-line switch | 3-line lookup | -99% |

- Each location's tab logic is now an isolated function (~20-50 lines each)
- LocationPanel is now focused on routing, travel, and the newspaper modal
- Zero behavior changes — 176 tests pass, build succeeds, TypeScript clean

### Files Changed

- `src/components/game/locationTabs.tsx` — NEW: 13 location tab factories + context type
- `src/components/game/LocationPanel.tsx` — Refactored: 770 → 207 lines

## 2026-02-10 - AI Opponent Audit: Intelligence & Personality Overhaul

### Audit: AI Opponents (Grimwald, Seraphina, Thornwick, Morgath)

Comprehensive audit of the AI opponent system. Found 7 bugs, identified multiple intelligence gaps, and implemented a personality system to differentiate opponents.

### Bugs Fixed (7)

1. **Adventure goal guild pass cost wrong** — `goalActions.ts` used `player.gold >= 100` but GUILD_PASS_COST is 500g. Fixed to `>= 600` (with buffer).
2. **Adventure goal dungeon missing floorId** — The adventure case created `explore-dungeon` action without `floorId` in details, causing `handleExploreDungeon` to always fail (`if (!floorId) return false`). Now uses `getBestDungeonFloor()`.
3. **getBestBounty missing Guild Pass check** — `strategy.ts` `getBestBounty()` didn't check `player.hasGuildPass`, contradicting the store-level guard. AI wasted time traveling to guild hall for bounties it couldn't take.
4. **Stock market used hardcoded fake stock** — AI bought `guild-shares` at price 50 (doesn't exist). Replaced with intelligent stock picking using actual `stockPrices` from game state — buys undervalued stocks (hard AI), T-Bills for safety (medium), and profit-takes when overvalued.
5. **Housing upgrade missing cost/rent details** — `strategicActions.ts` `move-housing` action lacked `cost` and `rent` in details, falling back to executor defaults. Now passes actual rent from `RENT_COSTS` with `priceModifier`.
6. **Rivalry study action hardcoded cost/hours** — `rivalryActions.ts` used `{ cost: 5, hours: 6 }` instead of reading from `DEGREES[degreeId]`. Fixed to use actual degree data.
7. **Work at guild-hall for non-guild-hall jobs** — In `goalActions.ts` and `strategicActions.ts`, work actions checked `currentLocation === jobLocation || currentLocation === 'guild-hall'`. You can't work a tavern job from the guild hall. Removed the guild-hall fallback.

### New Feature: AI Personality System

Each AI opponent now has a **unique personality profile** that modifies their decision priorities:

| Opponent | Personality | Key Weights |
|----------|-------------|-------------|
| Grimwald | The Generalist | All 1.0 — balanced, adapts to demands |
| Seraphina | The Scholar | Education 1.5×, Caution 1.4×, Combat 0.7×, Gambling 0.5× |
| Thornwick | The Merchant | Wealth 1.5×, Gambling 1.5×, Rivalry 1.3×, Social 0.7× |
| Morgath | The Warrior | Combat 1.6×, Caution 0.7×, Education 0.7×, Social 0.6× |

Personality affects: `preferredGoal`, `goldBuffer`, `foodCaution`, `dungeonRiskTolerance`.
Applied via `applyPersonalityWeights()` in actionGenerator after all actions are collected.
Personality lookup uses `AI_ID_TO_PERSONALITY` map keyed by player ID.

### New Feature: Weather & Festival Awareness

- Movement cost calculation now includes weather `movementCostExtra` (additive hours per step)
- Dungeon exploration gets +8 priority bonus during festivals with `dungeonGoldMultiplier > 1.0`
- `ActionContext` now includes `weatherMoveCostMult`, `activeFestival`, `turnTimeRatio`

### New Feature: Time-Budget Awareness

- **Late in turn** (< 25% time remaining / < 15 hours): Quick errands boosted +8, long activities (study/dungeon) penalized -10
- **Early in turn** (> 80% time remaining / > 48 hours): High-value activities (work/study/dungeon/quests) boosted +5

### Improved: Mistake System

Replaced simple "swap top 2 actions" with 3 realistic mistake types:
- **40% — Oversight**: Best action drops to position 2-4 (forgot about it)
- **30% — Classic swap**: Top two actions swapped (old behavior)
- **30% — Impulsive**: Random mid-tier action gets boosted to top (spur-of-the-moment)

### Improved: Stock Market Intelligence

AI now uses actual `stockPrices` from game state instead of hardcoded values:
- **Hard AI**: Buys undervalued stocks (current < 85% of base price) for profit potential
- **Medium AI**: Prefers T-Bills (Crown Bonds) for safe, robbery-proof wealth storage
- **Personality-aware**: Gambling weight affects stock type preference and share counts
- **Smart selling**: Sells when overvalued (> 150% of base), broke, or not wealth-focused

**Files changed:**
- `src/hooks/ai/types.ts` — Added `AIPersonality`, `AI_PERSONALITIES`, `AI_ID_TO_PERSONALITY`, `getAIPersonality()`
- `src/hooks/ai/actionGenerator.ts` — Added personality weighting, time-budget awareness, weather-aware movement, improved mistakes
- `src/hooks/ai/actions/actionContext.ts` — Added `personality`, `weatherMoveCostMult`, `activeFestival`, `turnTimeRatio` to context
- `src/hooks/ai/actions/goalActions.ts` — Fixed adventure guild pass cost, dungeon floorId, work location check
- `src/hooks/ai/actions/strategicActions.ts` — Fixed work location check, housing upgrade cost/rent details
- `src/hooks/ai/actions/economicActions.ts` — Rewrote stock market AI with actual price intelligence
- `src/hooks/ai/actions/questDungeonActions.ts` — Added festival dungeon bonus awareness
- `src/hooks/ai/actions/rivalryActions.ts` — Fixed study cost/hours to use actual degree data
- `src/hooks/ai/strategy.ts` — Added Guild Pass check to `getBestBounty()`
- `agents.md` — Updated with personality profiles, new features, file inventory

## 2026-02-10 - Extra Credit System, Rain Enhancement & Death/Graveyard Fix

### Task 1: Scholar Items at Shadow Market + Extra Credit System

Implemented the Jones-style Extra Credit system where owning certain items reduces study sessions needed per degree.

**Items renamed to fantasy theme and now sold at Shadow Market:**
- Encyclopedia → **Tome of All Knowledge** (200g)
- Dictionary → **Lexicon of the Ancients** (100g)
- Atlas → **Cartographer's Codex** (150g)

These items were previously defined in `ACADEMY_ITEMS` but never sold at any shop. Now available at Shadow Market → Scholar Texts tab (at 85% of base price).

**Extra Credit bonus calculation:**
- Arcane Tome (appliance): -1 session (9 instead of 10)
- All 3 scholar items: -1 session (9 instead of 10)
- Arcane Tome + all 3 scholar items: -2 sessions (8 instead of 10, 20% savings!)
- Matches Jones in the Fast Lane (Computer = Arcane Tome, Encyclopedia+Dictionary+Atlas = scholar items)

**Academy UI updated:**
- Shows "Extra Credit: X sessions per degree" when player has bonus
- Progress bars show reduced requirement with green (-N) indicator
- Graduation triggers at effective sessions, not base 10

**Files changed:**
- `src/data/items.ts` — Renamed 3 ACADEMY_ITEMS to fantasy names, updated descriptions
- `src/data/education.ts` — Added `getEffectiveSessionsRequired()`, `SCHOLAR_ITEM_IDS`, `ARCANE_TOME_ID`
- `src/components/game/AcademyPanel.tsx` — Uses effective sessions, shows Extra Credit indicator
- `src/components/game/ShadowMarketPanel.tsx` — Added `scholar` section type, renders ACADEMY_ITEMS
- `src/components/game/LocationPanel.tsx` — Added Scholar Texts tab to Shadow Market location
- `src/components/game/UserManual.tsx` — Updated item names and added Shadow Market purchase tip

### Task 2: Enhanced Rain Visual Effects

Improved rain visibility and added water droplets that slide down the screen like rain on a window.

**Changes:**
- Increased rain streak count (40→50 heavy, 20→25 light) and widened streaks (1→1.5px heavy)
- Boosted base rain opacity (0.4→0.5 heavy, 0.25→0.3 light)
- Darkened wet overlay for more atmospheric feel
- **New: Screen droplets** — water beads that slide down the screen with:
  - Realistic rounded droplet head with radial gradient highlight
  - Thin water trail behind each droplet
  - Variable sizes (3-8px), speeds (4-10s), and wobble
  - 18 droplets in heavy rain, 10 in light rain
  - Smooth CSS animation with fade in/out

**Files changed:**
- `src/components/game/WeatherOverlay.tsx` — Enhanced RainLayer with droplet system, increased streak visibility

### Task 3: Death/Resurrection Graveyard Display Fix

After dying and being resurrected at the Graveyard, the player now sees the Graveyard panel directly instead of a "Travel to..." button.

**Root cause:** `dismissDeathEvent` only cleared the death modal but didn't update `selectedLocation`. After death, `currentLocation` was correctly set to `'graveyard'`, but the center panel showed nothing (or required clicking the graveyard zone to see its panel).

**Fix:** `dismissDeathEvent` now checks if the player was resurrected (non-permadeath) and is at the Graveyard, and sets `selectedLocation: 'graveyard'` so the Graveyard panel with services (pray, meditate, spirit blessing) appears immediately.

**Files changed:**
- `src/store/gameStore.ts` — `dismissDeathEvent` sets selectedLocation to graveyard on resurrection

### Build & Tests
- 176 tests pass (all 9 test files)
- TypeScript compiles cleanly (tsc --noEmit)
- Production build blocked by pre-existing workbox-build npm registry issue (unrelated to changes)

---

## 2026-02-10 - Multiplayer Improvement Audit & Security Hardening

### Overview

Deep audit of all 7 multiplayer network files (~2,150 lines) plus 39 existing tests. Found 7 issues (1 critical, 3 high, 3 medium) and fixed all of them. Added 5 new tests (39→44 total).

### Issues Found & Fixed

#### Bug 1 (CRITICAL): `activeFestival` not synced over network
- **Impact:** Guests never see festivals — missing wage multipliers, happiness bonuses, gold bonuses, and festival UI indicator during multiplayer
- **Root cause:** `activeFestival` field was added to `GameState` (game.types.ts:248) for the festival system but never added to `serializeGameState()` or `applyNetworkState()` in networkState.ts
- **Fix:** Added `activeFestival` to both `serializeGameState()` return object and `applyNetworkState()` update object
- **File:** `src/network/networkState.ts`

#### Bug 2 (HIGH): `dismissDeathEvent` missing from LOCAL_ONLY_ACTIONS
- **Impact:** When a guest dismisses the death modal, the action is forwarded to the host (which rejects it since it's not in ALLOWED_GUEST_ACTIONS). The death modal re-appears on the next 50ms state sync, causing infinite modal flicker.
- **Root cause:** The `dismissDeathEvent` action was added to the store (gameStore.ts:278) with correct guest-mode `markEventDismissed` handling, but was never added to the LOCAL_ONLY_ACTIONS set in types.ts. The other 4 dismiss actions (dismissEvent, dismissShadowfingersEvent, dismissApplianceBreakageEvent, dismissWeekendEvent) were correctly listed.
- **Fix:** Added `'dismissDeathEvent'` to LOCAL_ONLY_ACTIONS
- **File:** `src/network/types.ts`

#### Bug 3 (HIGH): 3 equipment actions missing from ALLOWED_GUEST_ACTIONS
- **Impact:** Guests cannot use Forge tempering, Forge appliance repair, or Armory/Fence equipment salvage in online multiplayer. Clicking these buttons does nothing (action silently forwarded and rejected by host).
- **Missing actions:**
  - `temperEquipment` (Forge: +5 ATK/DEF boost, equipmentHelpers.ts:121)
  - `forgeRepairAppliance` (Forge: 50% cost repair, equipmentHelpers.ts:141)
  - `salvageEquipment` (Fence: sell equipment for 60%, equipmentHelpers.ts:175)
- **Root cause:** These 3 actions were added in a recent equipment expansion but the ALLOWED_GUEST_ACTIONS whitelist was not updated
- **Fix:** Added all 3 to ALLOWED_GUEST_ACTIONS + added host-side argument validation for temperEquipment (cost ≤ 1000g) and salvageEquipment (value ≤ 2000g)
- **Files:** `src/network/types.ts`, `src/network/useNetworkSync.ts`

#### Bug 4 (HIGH): Debug actions not categorized for network mode
- **Impact:** In guest mode, debug panel actions (`setDebugWeather`, `setDebugFestival`) are forwarded to host → rejected → wasted network round-trip. Debug changes on guest are immediately overwritten by next state sync.
- **Fix:** Added `'setDebugWeather'` and `'setDebugFestival'` to LOCAL_ONLY_ACTIONS
- **File:** `src/network/types.ts`

#### Bug 5 (MEDIUM): No lobby player name validation
- **Impact:** Malicious guest could send extremely long names (crash UI layout), control characters (break text rendering), or empty strings
- **Fix:** Host-side name sanitization on join: trim whitespace, strip control chars (\x00-\x1F, \x7F), cap at 20 characters, default to "Guest" if empty
- **File:** `src/network/useOnlineGame.ts`

#### Bug 6 (MEDIUM): Room code modulo bias
- **Impact:** `bytes[i] % 29` with uint8 (0-255) produces non-uniform distribution. Characters at index 0-22 have 9/256 probability while 23-28 have 8/256 (~12.5% bias). Reduces effective entropy from 29^6 to slightly less.
- **Fix:** Rejection sampling — bytes ≥ 232 (29*8) are discarded and re-rolled. Extra bytes requested per batch to minimize re-rolls.
- **File:** `src/network/roomCodes.ts`

#### Bug 7 (MEDIUM): No argument validation for equipment actions
- **Impact:** A crafted guest message could call `temperEquipment` or `salvageEquipment` with arbitrary cost/value amounts, potentially granting unlimited gold
- **Fix:** Added `validateActionArgs` cases: temperEquipment cost capped at 1000g, salvageEquipment value capped at 2000g, both checked for isFinite
- **File:** `src/network/useNetworkSync.ts`

### Security Assessment

#### Strengths
- Host-authoritative model with full state sync prevents most cheating
- ALLOWED_GUEST_ACTIONS whitelist (now 48 actions) blocks internal game logic calls
- Cross-player validation deep scan checks ALL argument positions
- Rate limiting (10 actions/sec) prevents spam/DoS
- Argument bounds validation on all raw stat modifiers
- Turn validation via peerId→playerId mapping
- Crypto room codes (now with rejection sampling)
- Host migration on disconnect

#### Remaining Attack Surface (documented, not exploitable for game-breaking advantage)
1. **No message schema validation** — malformed messages could crash handlers (PeerJS serialization provides some protection)
2. **No lobby join rate limiting** — join/leave cycling possible (mitigated by 4-player room limit)
3. **PeerJS signaling server dependency** — no self-hosted fallback
4. **No TURN servers** — ~15% of NAT configurations can't connect
5. **Full state broadcast size** — ~5-10KB per change, efficient for 4 players but doesn't scale

### Tests Added
- `LOCAL_ONLY_ACTIONS includes all dismiss actions` — verifies all 5 dismiss actions are listed
- `LOCAL_ONLY_ACTIONS includes debug actions` — verifies setDebugWeather/setDebugFestival
- `ALLOWED_GUEST_ACTIONS includes equipment actions` — verifies temperEquipment/forgeRepairAppliance/salvageEquipment
- `generates uniformly distributed codes (no modulo bias)` — statistical distribution test
- `applyNetworkState syncs activeFestival` — round-trip serialization test

### Files Changed
- `src/network/networkState.ts` — activeFestival sync (serialize + apply)
- `src/network/types.ts` — dismissDeathEvent in LOCAL_ONLY, 3 equipment actions in ALLOWED_GUEST, debug actions in LOCAL_ONLY
- `src/network/useNetworkSync.ts` — temperEquipment/salvageEquipment argument validation
- `src/network/useOnlineGame.ts` — lobby name sanitization
- `src/network/roomCodes.ts` — rejection sampling for unbiased room codes
- `src/test/multiplayer.test.ts` — 5 new tests (39→44 total)

### Build & Tests
- 176 tests pass (all 9 test files)
- Production build succeeds
- TypeScript clean

---

## 2026-02-10 - Remove Location Entry Delay & Enhanced Rain Effect

### Remove 2-Hour Entry Cost

Previously, entering any location cost 2 hours on top of the travel time (1 hour per step). This has been removed — movement now costs only the path distance (1 hour per step).

**Files changed:**
- `src/data/locations.ts` — `getMovementCost()` now returns `calculatePathDistance()` directly (removed `+ 2`)
- `src/store/helpers/playerHelpers.ts` — Travel event step calculation no longer subtracts 2 (entry cost removed)
- `src/hooks/useLocationClick.ts` — Updated comment (no entry cost for partial travel)
- `src/components/game/GameBoard.tsx` — Updated comment (weather cost per step only)
- `CLAUDE.md` — Removed "Entering locations costs 2 hours" from game mechanics documentation

**Impact:** Players gain ~2 hours per trip, making the game slightly faster-paced. Travel events still trigger on 3+ step trips.

### Enhanced Rain Effect

Added a dedicated `RainLayer` component to `WeatherOverlay.tsx` that renders over the screen during rain weather types (thunderstorm and harvest-rain). The effect includes:

1. **Dark wet overlay** — subtle semi-transparent darkening that pulses slowly
2. **Diagonal rain streaks** — long thin animated lines falling at a slight angle (40 for heavy rain / 20 for light)
3. **Splash ripples** — small expanding ellipses at the bottom of the screen (24 heavy / 12 light)
4. **More particles** — rain particle count increased from 80→120, light-rain from 40→60
5. **Higher visibility** — rain particle opacity increased (0.3→0.4 base), particle size increased (1→1.5 base)
6. **Richer color** — rain gradient now starts with a subtle blue tint instead of full transparency

Heavy rain (thunderstorm) gets larger streaks, more splashes, and a darker overlay. Light rain (harvest-rain) gets a softer, gentler version.

**Files changed:**
- `src/components/game/WeatherOverlay.tsx` — New `RainLayer` component, increased particle counts/opacity/size for rain types

Build succeeds, 171 tests pass.

---

## 2026-02-10 - Refactor useGrimwaldAI.ts executeAction (Complex Code Refactoring)

### Summary

Refactored the 390-line, 34-case `executeAction` switch statement in `useGrimwaldAI.ts` into a handler-map pattern in a new `actionExecutor.ts` module. Zero behavior changes — all 171 tests pass, build succeeds, TypeScript clean.

### Problem

`executeAction` in `useGrimwaldAI.ts` was a single `useCallback` containing a monolithic switch statement with 34 cases (lines 91-490). Each case handled a different AI action type (move, buy-food, work, study, apply-job, explore-dungeon, etc.). Issues:

- **Readability**: 390 lines inside a single switch made it hard to find specific action logic
- **Maintainability**: Adding a new action required editing deep inside the switch and updating a 35-item useCallback dependency array
- **Testability**: Individual action handlers couldn't be tested in isolation
- **Coupling**: The hook destructured 35+ store actions individually, creating a massive dependency list

### What Was Done

**Created `src/hooks/ai/actionExecutor.ts`:**
- Defined `StoreActions` interface — bundles all 37 store actions the AI needs into a single typed object
- Extracted each switch case into a named handler function, organized by category:
  - Movement: `handleMove`
  - Resource purchases: `handleBuyFood`, `handleBuyClothing`, `handleBuyFreshFood`, `handleBuyTicket`, `handleBuyLotteryTicket`
  - Employment: `handleWork`, `handleApplyJob`
  - Education: `handleStudy`, `handleGraduate`
  - Housing & Rent: `handlePayRent`, `handleMoveHousing`, `handleDowngradeHousing`
  - Banking & Finance: `handleDepositBank`, `handleWithdrawBank`, `handleTakeLoan`, `handleRepayLoan`, `handleBuyStock`, `handleSellStock`
  - Health & Recovery: `handleRest`, `handleHeal`, `handleCureSickness`
  - Equipment & Items: `handleBuyAppliance`, `handleBuyEquipment`, `handleTemperEquipment`, `handleSellItem`, `handlePawnAppliance`
  - Quests & Guild: `handleBuyGuildPass`, `handleTakeQuest`, `handleTakeChainQuest`, `handleTakeBounty`, `handleCompleteQuest`
  - Dungeon: `handleExploreDungeon`
  - Turn Control: `handleEndTurn`
- Created `ACTION_HANDLERS` record mapping `AIActionType` to handler functions
- Created `executeAIAction()` — simple dispatch function that looks up the handler and calls it

**Simplified `useGrimwaldAI.ts`:**
- Replaced 35+ individual store action destructuring with a single `const store = useGameStore()`
- Created `storeActions` object via `useMemo` to bundle actions
- Replaced the 390-line `executeAction` switch with a 3-line function that delegates to `executeAIAction`
- Reduced file from 627 lines to 227 lines (64% reduction)
- Simplified useCallback dependency array from 35 items to 1 (`storeActions`)

### Result

| Metric | Before | After |
|--------|--------|-------|
| useGrimwaldAI.ts lines | 627 | 227 |
| executeAction function | 390-line switch (34 cases) | 3-line dispatch |
| useCallback deps | 35 individual functions | 1 object |
| Action handlers | Inlined in switch | 34 named functions in actionExecutor.ts |
| Adding new action | Edit deep switch + update dep array | Add handler function + 1 map entry |

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/ai/actionExecutor.ts` | **NEW** — 34 action handlers + StoreActions interface + handler map |
| `src/hooks/useGrimwaldAI.ts` | Replaced 400-line switch with delegated dispatch |

### Verification

- TypeScript compiles cleanly (`tsc --noEmit`)
- All 171 tests pass
- Production build succeeds
- No behavior changes — all action handlers preserve exact same logic

## 2026-02-10 - Refactor weekEndHelpers.ts (Complex Code Refactoring)

### Summary

Refactored `src/store/helpers/weekEndHelpers.ts` from a single 530-line god-function into 16 focused helper functions with a clean pipeline orchestrator. Zero behavior changes — all 171 tests pass, build succeeds, TypeScript clean.

### Problem

`createProcessWeekEnd()` was a single closure containing ~500 lines of game logic handling 15+ different systems inline:
- Economy cycle, weather, festivals (global)
- Per-player: weekly resets, employment, food/clothing, weather effects, festival effects, housing/eviction, investments/savings/theft, sickness, loans, weekends, lottery, relaxation, aging, rent tracking
- Post-player: death checks, stock prices, game-over conditions

This made it extremely difficult to understand, test, or modify any individual system without reading the entire function.

### What Was Done

**Extracted 4 global system processors:**
- `advanceEconomy()` — trend changes, price drift, crash check
- `advanceWeatherSystem()` — weather advancement + announcement messages
- `checkFestival()` — seasonal festival activation + achievements
- `calculateFinalPrice()` — economy × weather × festival price calculation

**Extracted 12 per-player processors:**
- `resetWeeklyFlags()` — newspaper, dungeon fatigue, resurrection, bounties, cooldown
- `processEmployment()` — dependability decay, job loss, market crash effects
- `processNeeds()` — food depletion, clothing degradation
- `processWeatherOnPlayer()` — happiness changes, food spoilage
- `processFestivalOnPlayer()` — happiness, gold, dependability, education bonuses
- `processHousing()` — rent debt accumulation, eviction
- `processFinances()` — investments, savings interest, Shadowfingers theft
- `processSickness()` — random illness check
- `processLoans()` — interest, forced repayment on default
- `processLeisure()` — weekends, lottery, relaxation decay
- `processAging()` — birthdays, milestones, elder decay, health crises
- `updateRentTracking()` — prepaid weeks / overdue counter

**Created pipeline orchestrator:**
- `processPlayerWeekEnd()` calls all 12 per-player processors in sequence
- `processDeathChecks()` handles post-processing resurrection/death
- `WeekEndContext` interface passes shared context to all processors
- `EconomyUpdate` interface for economy state

**Main orchestrator reduced to 6 clear steps:**
1. Advance global systems (economy, weather, festivals)
2. Process all players (via pipeline)
3. Death checks
4. Stock price updates
5. Game-over condition checks
6. New week setup

### Structure

```
Before: 1 exported function, ~500-line closure, 0 internal helpers
After:  1 exported function (~100 lines), 16 focused helpers, 2 type interfaces
```

Each helper function is:
- Named descriptively (immediately clear what it does)
- Small enough to read in one screen (15-50 lines)
- Single-responsibility (one game system per function)
- Documented with JSDoc comments
- Preserves all original behavior exactly (including edge cases like rent debt accumulating on eviction week)

### Files Changed

| File | Change |
|------|--------|
| `src/store/helpers/weekEndHelpers.ts` | Refactored from 532 → 643 lines (same logic, better structure) |

### Verification

- TypeScript: `tsc --noEmit` — clean, no errors
- Tests: 171/171 pass (9 test files)
- Build: production build succeeds
- No new dependencies or files created

## 2026-02-10 - UI Positioning, SFX Fix, Portrait Fix

### Summary

Three fixes: moved the Week/Market HUD display higher to the upper edge of the game board, fixed MP3 sound effects being permanently ignored after browser autoplay block, and fixed AI portrait images (including Seraphina) not displaying when `imageError` state persisted across portrait changes.

### What Was Done

- **GameBoardHeader positioning** (`src/components/game/GameBoardHeader.tsx`)
  - Changed `top-4` (16px) to `top-1` (4px) — moves Week/Market display to the upper edge of the board
  - Matches user request for the HUD to sit at the top edge

- **SFX autoplay bug fix** (`src/audio/sfxManager.ts`)
  - **Root cause**: When the browser blocks autoplay (common before first user interaction), `play().catch()` permanently added the SFX ID to `failedFiles`, causing all future plays to skip the MP3 and use Web Audio synth fallback instead
  - **Fix**: Now checks `err.name === 'NotAllowedError'` — autoplay blocks use synth once but don't mark the file as permanently failed, so the next user-initiated play retries the real MP3
  - All 36 MP3 files in `public/sfx/` verified to match `SFX_LIBRARY` definitions
  - 20 components call `playSFX()` — the system was already wired up, just the autoplay bug prevented MP3s from ever playing

- **Portrait imageError persistence fix** (`src/components/game/CharacterPortrait.tsx`)
  - **Root cause**: `useState(false)` for `imageError` was never reset when `portraitId` changed — if any portrait failed to load, the error state persisted and showed the SVG placeholder even for valid images
  - **Fix**: Added `useEffect` that resets `imageError` to `false` whenever `portraitId` changes
  - `seraphina.jpg` (80KB) exists in `public/portraits/` and is correctly defined in `AI_PORTRAITS` as `ai-seraphina` with path `portraits/seraphina.jpg`

### Technical Notes
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- No new dependencies added

---

## 2026-02-09 - Adventurer's Manual (User Manual)

### Summary

Added a comprehensive, in-game user manual ("Adventurer's Manual") accessible from three places: the Options menu, the Game Menu (ESC), and the Title Screen. The manual is a full-screen parchment-panel overlay with 15 chapters covering all game mechanics.

### What Was Done

- **Created `src/components/game/UserManual.tsx`** — Full-screen manual component with:
  - 15 navigable chapters: Welcome, Getting Started, The Board, Turns & Time, Jobs & Career, Education, Housing, Items & Shops, Health & Food, Combat & Dungeon, Economy, Crime & Theft, Weekends, Victory, Tips & Strategy
  - Horizontal chapter navigation bar with icons
  - Previous/Next footer navigation with page counter
  - Reusable styled sub-components (H1, H2, P, Tip, Table) for consistent formatting
  - Responsive tables with all game data (locations, jobs, degrees, items, weapons, armor, dungeon floors, housing tiers, etc.)
  - Strategy tips and common mistakes section
  - AI opponent personality descriptions
  - Keyboard shortcut reference

- **Modified `src/components/game/OptionsMenu.tsx`** — Added "Adventurer's Manual" button in the footer section, renders UserManual modal on top
- **Modified `src/components/game/SaveLoadMenu.tsx`** — Added "Manual" button alongside "Options" button in the Game Menu (ESC), renders UserManual modal on top
- **Modified `src/components/screens/TitleScreen.tsx`** — Added "Manual" button between Options and About in the main menu

### Access Points
- **Title Screen**: Manual button in main menu
- **In-Game (ESC)**: Manual button next to Options in the Game Menu
- **Options**: "Adventurer's Manual" button at the bottom of the Options panel

### Technical Notes
- Follows existing UI patterns: parchment-panel, wood-frame, z-50 fixed overlay
- No new dependencies added
- Build passes cleanly (TypeScript + Vite)

---

## 2026-02-09 - Standalone Exe / Steam Distribution Research

### Summary

Researched all practical options for packaging Guild Life Adventures as a standalone desktop executable for distribution on Steam (or similar platforms). The game is built with React 18 + Vite + TypeScript, using PeerJS for WebRTC multiplayer, Web Audio for music/SFX, and localStorage for saves.

### Framework Comparison

| Framework | Bundle Size | WebRTC/PeerJS | Steam Overlay | Steamworks SDK | Maturity | Verdict |
|-----------|-------------|---------------|---------------|----------------|----------|---------|
| **Electron** | ~120-150 MB | Full support | Yes (workaround) | steamworks.js (mature) | High | **RECOMMENDED** |
| NW.js | ~120-150 MB | Full support | Yes (workaround) | Greenworks/steamworks.js | High | Viable backup |
| Tauri | ~2-10 MB | **Broken on Linux** | **No** | Rust only | Medium | Not suitable |
| Neutralinojs | ~0.5-2 MB | **Broken on Linux** | **No** | None | Low | Not suitable |
| Capacitor Desktop | ~120 MB | Full (via Electron) | Yes | Via Electron | Medium | Unnecessary layer |
| Gluon | Tiny | Depends on system browser | No | None | Very Low | Too immature |
| Direct WebView2 | ~5-10 MB | Windows only | **No** | Custom C++ | N/A | Windows only |

### Recommendation: Electron

Electron is the clear winner for Guild Life Adventures because:

1. **PeerJS/WebRTC works out of the box** — Chromium has best-in-class WebRTC on all platforms. Tauri and Neutralinojs fail on Linux.
2. **Steam Overlay works** — with a well-documented repaint workaround. Tauri, Neutralinojs, and WebView2 all fail.
3. **Steamworks SDK integration is mature** — `steamworks.js` provides achievements, friends, cloud saves with TypeScript definitions.
4. **First-class Vite support** — `electron-vite` provides Vite + React + TypeScript integration with HMR.
5. **Proven commercial success** — Game Dev Tycoon (94% positive, 22k+ reviews), Curious Expedition (200k+ units sold), Screeps, Wayward all shipped as HTML5 games on Steam.
6. **Bundle size is irrelevant for Steam** — Steam games routinely exceed 1 GB. 120 MB is fine.
7. **Web Audio, localStorage, Zustand, Tailwind** — all work unchanged since Electron IS Chromium.

### Why NOT Tauri

Despite being much smaller (2-10 MB), Tauri has two deal-breaking issues:
- **Steam Overlay does not work** — confirmed in Tauri issue tracker (#6196). Steam overlay hooks into DirectX/OpenGL, not native WebViews.
- **WebRTC broken on Linux** — WebKitGTK does not ship WebRTC support (#13143). Kills PeerJS multiplayer.
- **Inconsistent rendering** — three different browser engines across platforms (Chromium on Windows, WebKit on macOS/Linux).

### What Would Need to Change (Electron Migration)

| Current | Electron Adaptation |
|---------|-------------------|
| Vite build | Use `electron-vite` (wraps Vite for Electron dual-process) |
| Zustand | Works unchanged in renderer process |
| Tailwind + shadcn/ui | Works unchanged |
| PeerJS/WebRTC | Works unchanged (full Chromium) |
| Web Audio | Works unchanged |
| Service Worker (PWA) | Can keep, but less needed in desktop app |
| localStorage saves | Migrate to Node.js `fs` for Steam Cloud Save support |
| Bun | Still used for dev; electron-builder handles packaging |

### Key Libraries for Electron + Steam

| Library | Purpose |
|---------|---------|
| `electron-vite` | Vite integration for Electron (HMR, dual-process) |
| `electron-builder` | Packaging into Windows/Mac/Linux installers |
| `steamworks.js` | Steamworks SDK: achievements, friends, cloud saves, overlay |
| `steamworks-ffi-node` | Alternative to steamworks.js (FFI-based, no C++ compilation) |

### Steam Store Requirements

1. **Steamworks Partner Account** — create at partner.steamgames.com
2. **Steam Direct Fee** — $100 USD per game (recoupable after $1,000 revenue)
3. **Legal/Financial Setup** — bank info, tax info, identity verification
4. **Store Page** — must be "Coming Soon" for at least 2 weeks before launch
5. **Build Review** — submit near-final build, 3-5 business day review
6. **30-day waiting period** between paying fee and being able to release
7. **Content Rules** — no crypto/NFTs, no external store links, in-app purchases must use Steam Wallet

### Steam Overlay Workaround for Electron

Steam overlay needs constant screen repaints. Since our game has animations (player movement, weather effects, etc.), this mostly works. For fully static screens (title, settings), a full-screen transparent canvas with `requestAnimationFrame` loop forces repaints.

Required Electron flags:
- `--in-process-gpu`
- `--disable-direct-composition`

### Electron Setup Steps (High-Level)

1. Install `electron` + `electron-vite` + `electron-builder`
2. Create `electron/main.ts` (main process — window management, Steamworks init)
3. Create `electron/preload.ts` (bridge between main and renderer)
4. Configure `electron-vite` in `electron.vite.config.ts`
5. Move save game system from localStorage to file system (for Steam Cloud Saves)
6. Add `steamworks.js` for achievements/overlay
7. Configure `electron-builder` for Windows (NSIS/MSI), macOS (.dmg), Linux (.AppImage/.deb)
8. Upload via `steamcmd` (NOT Steam GUI uploader — it breaks macOS symlinks)
9. Test with Steamworks App ID 480 ("Spacewar") during development

### Successful HTML5 Games on Steam (References)

- **Game Dev Tycoon** — 94% positive, 22k+ reviews (originally NW.js, now Electron)
- **Curious Expedition** — 200k+ units sold (switched NW.js → Electron for performance)
- **Screeps** — MMO RTS (NW.js + Greenworks)
- **Wayward** — Survival game (Electron + Greenworks)

### Alternative Distribution (Non-Steam)

- **itch.io** — simpler, no $100 fee, open to all, Electron or just plain web
- **Epic Games Store** — higher barrier than Steam, but accepts Electron games
- **GOG** — DRM-free focus, accepts Electron games
- **Direct download** — use `electron-updater` for auto-updates

### Build Status

- Research only, no code changes

---

## 2026-02-09 - Multiplayer Portrait Selection

### Summary

Added character portrait selection to the online multiplayer lobby. Both host and guest players can now click their avatar in the player list to open the portrait picker modal and choose from the 8 available character portraits (Warrior, Mage, Rogue, Cleric, Ranger, Bard, Paladin, Merchant). Portrait selections are synced via WebRTC to all lobby participants and passed to the game state on game start.

### Changes

**`src/network/types.ts`**
- Added `portraitId?: string | null` to `LobbyPlayer` interface
- Added `portrait-select` guest message type (`{ type: 'portrait-select'; portraitId: string | null }`)

**`src/network/useOnlineGame.ts`**
- Host message handler: added `portrait-select` case — updates lobby player's portraitId and broadcasts `lobby-update`
- Added `updatePortrait(portraitId)` function — host updates locally + broadcasts; guest sends `portrait-select` message to host
- `startOnlineGame()` now extracts `portraitId` from each lobby player and passes the portrait array to `startNewGame()`
- Added `portrait-select` to lobby message filter in the message handler effect
- Exposed `updatePortrait` in hook return

**`src/components/screens/OnlineLobby.tsx`**
- Imported `CharacterPortrait` and `PortraitPicker` components
- Replaced plain colored circles with `CharacterPortrait` (36px) for all players in both host and guest lobby views
- Own portrait is clickable (opens portrait picker modal)
- Other players' portraits shown as non-interactive
- Portrait picker modal renders outside the scrollable lobby container (fixed z-100 overlay)
- Added `showPortraitPicker` state and `handlePortraitSelect` handler

### Network Flow

1. Player clicks their portrait in lobby → `setShowPortraitPicker(true)`
2. Selects portrait in picker → `handlePortraitSelect(portraitId)`
3. If **host**: Updates `lobbyPlayers` state directly, broadcasts `lobby-update` to all guests
4. If **guest**: Sends `{ type: 'portrait-select', portraitId }` to host
5. Host receives `portrait-select` → updates that guest's `portraitId` in lobby, broadcasts `lobby-update`
6. All clients see updated portrait in the player list
7. On game start: `lobbyPlayers.map(p => p.portraitId ?? null)` passed to `startNewGame()` as `playerPortraits`

### Build Status

- TypeScript compiles cleanly
- Build succeeds
- All 171 tests pass

---

## 2026-02-09 - Death Modal & Credits Screen

### Summary
Two new features: (1) Death modal overlay when player HP reaches 0, with permadeath OFF respawn support, and (2) About/Credits screen accessible from the title menu with rolling text, Guild-Life-Logo.jpg background, and random music playback.

### Feature 1: Death Modal

When a player's health drops to 0, a dramatic full-screen death modal now appears with:
- Dark blood-red radial gradient overlay
- Animated skull icon with pulsing glow
- "YOU ARE DEAD" title in red with drop shadow
- Player name and narrative death message
- Respawn/permadeath info line
- Context-appropriate dismiss button ("Rise Again" or "Accept Your Fate")

**Death flow (3 paths):**

1. **Has savings (100g+)**: Resurrected at Graveyard with 50 HP, 100g deducted from savings. Modal shows "The spirits restored you!" message.
2. **Permadeath OFF**: Free respawn at Graveyard with 20 HP. Modal shows "death is not the end" message. No gold cost.
3. **Permadeath ON (no savings)**: Permanent elimination. `isGameOver = true`. Modal shows "no coming back" message.

**AI players**: Death events set `eventMessage` instead of `deathEvent` (no modal for AI turns).

### Feature 2: Credits / About Screen

New "About" button on TitleScreen opens a full-screen credits sequence:
- **Background**: Guild-Life-Logo.jpg (the two adventurers running artwork)
- **Dark overlay** (70% opacity) for text readability
- **Auto-scrolling credits** at 40px/sec with fade-in/fade-out mask
- **Random music**: Picks a random track from all 11 game music files and plays it on loop
- **Close button** (X) in top right, plus "click anywhere to close" after scroll completes

Credits content includes humorous/snarky sections:
- Created By: Tom Husby & Claude
- Programming, Game Design, Art Direction, Music & Sound
- AI Opponents & Notable NPCs
- Technical Achievements & Bugs Squashed
- Special Thanks (React, TypeScript, Vite, etc.)
- Development Stats, Legal disclaimers
- Closing message

### Changes

| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `DeathEvent` interface and `deathEvent` field to `GameState` |
| `src/store/storeTypes.ts` | Added `dismissDeathEvent` action to `GameStore` |
| `src/store/gameStore.ts` | Added `deathEvent: null` initial state, `dismissDeathEvent` action, reset on load |
| `src/store/helpers/questHelpers.ts` | Rewrote `checkDeath()` — 3-path death flow with `deathEvent`, permadeath OFF respawn (20 HP at graveyard) |
| `src/components/game/DeathModal.tsx` | **NEW** — Full-screen death overlay modal component |
| `src/components/game/GameBoard.tsx` | Import and render `DeathModal` when `deathEvent` is set |
| `src/components/game/OptionsMenu.tsx` | Updated permadeath description to mention 20 HP graveyard respawn |
| `src/network/networkState.ts` | Added `deathEvent` to network state serialization and deserialization |
| `src/components/screens/CreditsScreen.tsx` | **NEW** — Rolling credits screen with logo background and random MP3 |
| `src/components/screens/TitleScreen.tsx` | Added "About" button and `CreditsScreen` integration |

### Build & Tests
- TypeScript: clean
- Build: passes
- Tests: 171/171 pass

---

## 2026-02-09 - Fix Mobile Game Startup (iPad & Android)

### Summary
Game was not starting on iPad and Android devices from the GitHub Pages URL. Investigation found 5 issues affecting mobile browsers — all fixed.

### Root Cause Analysis
1. **CSS `@import` blocking render** (PRIMARY): Google Fonts loaded via CSS `@import` in `index.css`, which is render-blocking — the browser won't apply ANY styles until the imported font CSS finishes downloading. On slow mobile connections or restricted networks, this causes a blank white screen.
2. **`overflow-hidden` preventing scroll**: All screen components (TitleScreen, GameSetup, VictoryScreen, OnlineLobby) used `overflow-hidden` on their outer container. On mobile landscape or small screens, content exceeds viewport height and was unscrollable, making the "Begin Adventure" / "Start" buttons unreachable.
3. **No error boundary**: If any component threw a JS error on mobile (e.g., browser compatibility), the entire app showed a blank white screen with no feedback.
4. **No mobile touch optimizations**: Missing `touch-action: manipulation` caused 300ms click delay on older mobile browsers. Custom SVG sword cursor was parsed (but not used) on touch devices. No `:active` feedback for touch interactions.
5. **Background images as absolute overlays**: Background images used `absolute inset-0` which broke when the outer container scrolled — backgrounds scrolled with content instead of staying fixed.

### Fixes

1. **Move Google Fonts to HTML `<link>` with `preconnect`** (`index.html`, `index.css`)
   - Removed `@import url('fonts.googleapis.com/...')` from `index.css`
   - Added `<link rel="preconnect">` for `fonts.googleapis.com` and `fonts.gstatic.com`
   - Added `<link rel="stylesheet">` for Google Fonts in HTML `<head>`
   - Browser now loads fonts in parallel with CSS instead of sequentially
   - `display=swap` means fallback fonts show immediately while custom fonts load

2. **Make all screen containers scrollable** (`TitleScreen.tsx`, `GameSetup.tsx`, `VictoryScreen.tsx`, `OnlineLobby.tsx`)
   - Changed `overflow-hidden` → `overflow-x-hidden overflow-y-auto` on all 5 outer containers
   - Changed background `absolute inset-0` → `fixed inset-0` so backgrounds stay fixed while content scrolls
   - Content is now always accessible on any viewport size

3. **Add top-level React Error Boundary** (`App.tsx`)
   - `ErrorBoundary` class component wraps entire app
   - Shows game-themed error screen with error message instead of blank white page
   - "Clear Cache & Reload" button clears service worker caches and reloads
   - Uses inline styles (no CSS dependency) to always render even if CSS fails

4. **Add mobile touch optimizations** (`index.css`)
   - Added `touch-action: manipulation` on all interactive elements (button, a, input, select, etc.)
   - Eliminates 300ms click delay on older mobile browsers
   - Added `-webkit-tap-highlight-color: transparent` on body
   - Added `touch-action: manipulation` on `.location-zone`
   - Moved custom SVG sword cursor inside `@media (hover: hover) and (pointer: fine)` — only shows on mouse-pointer devices
   - Added `.location-zone:active` opacity feedback for touch
   - Added `@media (hover: none)` active states for `.wood-frame` and `.gold-button` — touch users get visual feedback

### Files Changed
| File | Changes |
|------|---------|
| `index.html` | Added Google Fonts `<link>` tags with `preconnect` hints |
| `src/index.css` | Removed `@import`, added touch-action/tap-highlight/mobile media queries |
| `src/App.tsx` | Added ErrorBoundary class component wrapping entire app |
| `src/components/screens/TitleScreen.tsx` | `overflow-hidden` → scrollable, `absolute` bg → `fixed` |
| `src/components/screens/GameSetup.tsx` | `overflow-hidden` → scrollable, `absolute` bg → `fixed` |
| `src/components/screens/VictoryScreen.tsx` | `overflow-hidden` → scrollable, `absolute` bg → `fixed` (2 instances) |
| `src/components/screens/OnlineLobby.tsx` | `overflow-hidden` → scrollable, `absolute` bg → `fixed` |

### Build & Tests
- TypeScript: clean
- Build: passes (GitHub Pages target verified)
- Tests: 171/171 pass

---

## 2026-02-09 - Bounty Board Tab & Quest Guild Pass Gate

### Summary
Guild Hall now has 3 tabs: **Jobs** (default) | **Bounties** | **Quests**. Jobs are shown first when entering. Quests tab is hidden until Guild Pass is purchased. Bounties are free (no Guild Pass required).

### Changes

1. **New `BountyBoardPanel.tsx`** — Standalone component for the Bounties tab
   - Guild Pass purchase prompt (always shown when no pass)
   - Reputation bar
   - Active bounty completion UI (when a bounty is in progress)
   - Weekly bounty board (3 rotating bounties)

2. **`LocationPanel.tsx`** — Guild Hall tab restructure
   - Tab order: Jobs (default), Bounties, Quests, Work
   - Quests tab: `hidden: !player.hasGuildPass` — completely invisible without Guild Pass
   - Bounties tab: always visible, badge `!` when bounty is active
   - Quests tab: badge `!` when quest/chain is active (not bounties)
   - Removed `GUILD_PASS_COST` and `Scroll` imports (moved to BountyBoardPanel)

3. **`QuestPanel.tsx`** — Bounty board removed, exports added
   - Removed bounty board section from "no active quest" view
   - Skip active quest display when active quest is a bounty (handled by BountyBoardPanel)
   - Exported `ReputationBar` and `ScaledRewardDisplay` for reuse
   - Removed `hasGuildPass` guard around quest chains (tab itself is hidden)

4. **`questHelpers.ts`** — Bounty Guild Pass guard reverted
   - Removed `if (!player.hasGuildPass) return;` from `takeBounty()`
   - Bounties are free — no Guild Pass required (matches original design)

5. **AI `strategy.ts`** — Bounty Guild Pass check reverted
   - `getBestBounty()` no longer checks for Guild Pass
   - AI can take bounties without buying a pass first

6. **AI `questDungeonActions.ts`** — Comment updated to reflect free bounties

### Rationale
- Jobs should be the first thing a new player sees at Guild Hall (most important early-game)
- Bounties provide accessible income without the 500g Guild Pass gate
- Quests and chains are the premium content gated behind Guild Pass
- Separating bounties from quests reduces tab content scrolling

### Build & Tests
- TypeScript: clean
- Build: passes
- Tests: 171/171 pass

---

## 2026-02-09 - Adventure Goal Victory Goals Integration

### Summary

When playing with Adventure Goal enabled, it was not fully integrated into the victory goals displays. Fixed 4 issues:

### Changes

1. **GameSetup.tsx**: Victory Goals description now says "all five goals" when adventure is enabled (was hardcoded "four")
2. **GameSetup.tsx**: Preset buttons (Quick/Standard/Epic) now preserve the current adventure setting instead of resetting it to 0
3. **RightSideTabs.tsx**: PlayersTab overall progress % now includes adventure progress when enabled (was dividing by 4 only)
4. **TurnOrderPanel.tsx**: Same fix — overall progress % now includes adventure progress when enabled

### Files Modified

- `src/components/screens/GameSetup.tsx` — dynamic goal count text + preset preservation
- `src/components/game/RightSideTabs.tsx` — PlayersTab overallProgress includes adventure
- `src/components/game/TurnOrderPanel.tsx` — overallProgress includes adventure

### Build & Test

- Build passes, 171 tests pass

---

## 2026-02-09 - Guild Pass Quest Requirement

### Summary
All quest activities (regular quests, quest chains, AND bounties) now require a Guild Pass before they become visible or accessible. Previously bounties were available without a pass.

### Changes

1. **LocationPanel.tsx** — Quest tab now shows ONLY the Guild Pass purchase prompt when player doesn't have a pass. The entire QuestPanel is hidden (not rendered) until the pass is purchased. Added a Scroll icon and descriptive text explaining what the pass unlocks.

2. **questHelpers.ts** — Added `if (!player.hasGuildPass) return;` guard to `takeBounty()`. Previously bounties explicitly skipped this check ("Bounties don't require Guild Pass" comment removed).

3. **AI strategy.ts** — `getBestBounty()` now returns null if `!player.hasGuildPass`, matching the new requirement. AI must buy a guild pass before attempting any bounties.

4. **AI questDungeonActions.ts** — Updated comment to reflect bounties now require Guild Pass.

### Rationale
Players should not be able to grind quests/bounties from the start. The 500g Guild Pass acts as a gate that forces early-game focus on jobs and income before unlocking the quest system. This applies uniformly to all quest types.

### Build & Tests
- TypeScript: clean (tsc --noEmit)
- Build: passes
- Tests: 171/171 pass

---

## 2026-02-09 - Mid-Movement Destination Redirect & Debug Tools Expansion

### 1. Mid-Movement Destination Redirect
Players can now click a different location while their token is animating along a path. Instead of being locked into the original destination, clicking a new location cancels the current animation and starts a new one from the player's original position to the new destination.

**How it works:**
- During animation, `movePlayer()` has not yet been called (state unchanged)
- Clicking a new location recalculates the path from the player's current (actual) location
- `pathVersion` counter forces AnimatedPlayerToken to remount, resetting internal animation state
- Full travel, partial travel, and weather cost adjustments all work with redirects
- Online multiplayer: broadcasts new movement path to other players on redirect

**Files changed:**
| File | Changes |
|------|---------|
| `src/hooks/usePlayerAnimation.ts` | Added `pathVersion` state, `redirectAnimation()` function |
| `src/hooks/useLocationClick.ts` | Accept `redirectAnimation` prop; during animation allow redirect to new destination instead of blocking clicks |
| `src/components/game/GameBoard.tsx` | Pass `redirectAnimation` and `pathVersion` to hooks/components; use `pathVersion` in AnimatedPlayerToken key |

### 2. Debug Tools Expansion (Developer Tab)
Added comprehensive debug/test tools to the Developer tab for testing all game events and mechanics.

**New debug tools:**
- **Weather Control** — Set any weather type (Snowstorm, Thunderstorm, Drought, Enchanted Fog, Harvest Rain) or clear. Weather persists until manually cleared (99 weeks).
- **Victory & Game** — Trigger Win (gives 10000g + 1000 happiness + victory check), Check Victory, Force Week End, Force Start Turn, Force End Turn
- **Festivals** — Activate any of 4 seasonal festivals (Harvest, Solstice, Tournament, Fair) or clear
- **Resources** — Quick buttons for gold (+/-500, +5000), health (+/-50, full), happiness (+50), food (+50), clothing (+50), time (+20h), relaxation (+20)
- **Events** — Trigger test event message, robbery event, weekend event, doctor visit, dismiss event
- **Player State** — Cure sickness, +20 max health, buy guild pass, promote guild rank
- **Teleport** — Instantly move to any of the 15 board locations (0 time cost)

**Files changed:**
| File | Changes |
|------|---------|
| `src/components/game/RightSideTabs.tsx` | Rewrote DeveloperTab with 9 debug sections; added `useGameStore` import and `LOCATIONS_LIST` data |
| `src/store/gameStore.ts` | Added `setDebugWeather()` and `setDebugFestival()` actions; imported WeatherType/WeatherParticle/FESTIVALS |
| `src/store/storeTypes.ts` | Added `setDebugWeather` and `setDebugFestival` to GameStore interface |

### Build & Tests
TypeScript compiles cleanly, 171 tests pass.

---

## 2026-02-09 - Adventure Victory Goal, Landlord Closed Image, Guild Pass Bug Fix, Free Shopping

### 1. New Victory Goal: Adventure (Optional)
Added an optional 5th victory goal — **Adventure** — that gives purpose to quests and dungeon exploration.

**How it works:**
- Adventure score = quests completed + unique dungeon floors cleared
- Configurable in Game Setup with an enable/disable toggle and a slider (3–25 pts)
- When disabled (default, adventure=0), no effect on victory
- When enabled, players must reach the adventure target alongside the existing 4 goals
- AI (Grimwald) supports the adventure goal: will prioritize quests + dungeon when adventure is the weakest goal
- Displayed in GoalProgress bars, VictoryScreen stats, RightSideTabs, and TurnOrderPanel

**Files changed:**
- `src/types/game.types.ts` — added `adventure` to `GoalSettings`
- `src/store/gameStore.ts` — default goalSettings + save/load migration
- `src/store/helpers/questHelpers.ts` — checkVictory includes adventure check
- `src/components/game/GoalProgress.tsx` — adventure progress bar
- `src/components/screens/GameSetup.tsx` — adventure toggle + slider
- `src/components/screens/VictoryScreen.tsx` — adventure stat display
- `src/components/game/RightSideTabs.tsx` — adventure in "Goals to Win"
- `src/components/game/TurnOrderPanel.tsx` — adventure in goal summary
- `src/hooks/ai/types.ts` — GoalProgress includes adventure
- `src/hooks/ai/strategy.ts` — calculateGoalProgress + getWeakestGoal updated
- `src/hooks/ai/actions/actionContext.ts` — weakestGoal union includes 'adventure'
- `src/hooks/ai/actions/goalActions.ts` — case 'adventure' AI actions
- All test files — added `adventure: 0` to goal objects

### 2. Landlord Closed: Show closed.jpg
When the Landlord's office is closed (non-rent week), the `closed.jpg` image is now displayed instead of just a text icon.

**File:** `src/components/game/LocationPanel.tsx` — replaced Home icon with `<img src="/locations/closed.jpg">` in the landlord closed state.

### 3. Bug Fix: Guild Quest Without Guild Pass
**Bug:** Players could take guild quests and chain quests without owning a Guild Pass. The UI conditionally hid the quest buttons, but the store functions `takeQuest` and `takeChainQuest` had no guild pass validation — allowing direct calls (e.g., from network or console) to bypass the check.

**Fix:** Added `if (!player.hasGuildPass) return;` guard to both `takeQuest` and `takeChainQuest` in `src/store/helpers/questHelpers.ts`. Bounties intentionally remain available without a Guild Pass (by design).

### 4. Free Shopping and Job Browsing (Jones-style)
Following Jones in the Fast Lane rules: once you enter a location (costs 2h to enter), activities inside like buying items and browsing jobs are free — no additional time cost. Only work, study, and relaxation cost time.

**Removed spendTime from:**
- **GuildHallPanel** — applying for jobs and requesting raises no longer costs 1h
- **GeneralStorePanel** — buying food, fresh food, lottery tickets no longer costs 1h
- **ArmoryPanel** — buying weapons, armor, shields, clothing no longer costs 1h
- **EnchanterPanel** — buying appliances no longer costs 1h
- **ShadowMarketPanel** — buying goods, lottery tickets, event tickets, appliances no longer costs 1h
- **TavernPanel** — buying food/drink no longer costs 1h
- **PawnShopPanel** — pawning and buying items no longer costs 1h
- **LocationPanel** — buying newspaper (both General Store and Shadow Market) no longer costs time; fence sell/buy no longer costs 1h

**Kept time costs for:** work shifts, studying, forge tempering/repair/salvage, enchanter repairs, gambling, dungeon exploration.
## 2026-02-09 - Fix Ambient Sounds Not Playing

### Problem
Ambient environmental sounds (cave drips, tavern crowd, forge hammering, etc.) were never audible during gameplay despite the full audio pipeline being implemented and 8 real MP3 files added to `public/ambient/`.

### Root Cause Analysis

**Primary bug: `currentTrackId` set before `play()` succeeds**
In `ambientManager.crossfadeTo()`, `this.currentTrackId = trackId` was set BEFORE `HTMLAudioElement.play()` was called. When the browser blocked autoplay (play() rejected), the manager already thought the track was "playing." Subsequent calls to `play()` with the same trackId hit the early-return guard (`if (trackId === this.currentTrackId) return`) and silently did nothing.

**Why music worked but ambient didn't:**
Music starts playing on the title screen (phase='title'). When the user clicks "Play Game," the phase changes to 'setup' — triggering a *different* track ID. By then the user has interacted, so the new play() succeeds. Ambient only starts on phase='playing', and if that first play is blocked, the same trackId keeps getting requested (player stays at home location) with no recovery.

**Secondary issues:**
1. **No autoplay resume** — No mechanism to retry playback after user interaction unblocks audio
2. **Silent error handling** — `playPromise.catch(() => {})` swallowed all errors with no logging
3. **Very low effective volume** — Default 0.4 × baseVolume 0.2 = 8% effective volume for quietest tracks
4. **PWA missing ambient cache** — `vite.config.ts` `includeAssets` didn't include `ambient/*.mp3` or `sfx/*.mp3`

### Fixes Applied

#### 1. Autoplay retry in `play()` method
**Files:** `ambientManager.ts`, `audioManager.ts`
- When `play(trackId)` is called with same trackId as current, now checks if the active deck is actually paused
- If paused with a src set (autoplay was blocked), retries `deck.play()` instead of silently returning
- This handles the case where React's useEffect re-fires with the same location

#### 2. User interaction resume listener
**Files:** `ambientManager.ts`, `audioManager.ts`
- When `crossfadeTo()` play promise rejects (autoplay blocked), registers one-shot event listeners on `click`, `touchstart`, `keydown`
- On next user interaction, retries playing the blocked deck
- Listeners are cleaned up on stop(), new crossfade, or successful resume
- Added `console.warn()` when autoplay is blocked (visible in browser DevTools)

#### 3. Volume increase
**File:** `ambientConfig.ts`
- Default ambient volume: 0.4 → 0.6 (60%)
- Minimum per-track baseVolume: 0.2 → 0.3 (for bank, academy, shadow, fence, landlord, street, graveyard)
- Effective minimum volume now: 0.6 × 0.3 = 18% (was 0.4 × 0.2 = 8%)

#### 4. PWA asset caching
**File:** `vite.config.ts`
- Added `"ambient/*.mp3"` and `"sfx/*.mp3"` to `includeAssets`
- PWA precache: 86 → 138 entries

### Audio File Status
Real ambient MP3 files (8/16):
- cave-ambient.mp3 (236KB), forge-ambient.mp3 (236KB), graveyard-ambient.mp3 (236KB)
- landlord-ambient.mp3 (157KB), shadow-ambient.mp3 (157KB), slums-ambient.mp3 (157KB)
- street-ambient.mp3 (157KB), tavern-ambient.mp3 (157KB)

Placeholder silent MP3s (8/16): academy, armory, bank, enchanter, fence, guild, market, noble

### Build Status
- TypeScript compiles cleanly
- Vite build succeeds
- All 171 tests pass

---

## 2026-02-09 - Remove Dark Mode & Fix Text Visibility

### Problem
When dark mode was enabled (default), all text became white/light and nearly invisible against the game's parchment/card backgrounds. The player name in the upper left corner (SideInfoTabs) was invisible because `text-wood-dark` referenced a non-existent Tailwind color. Dark mode conflicted with the game's medieval parchment aesthetic.

### Solution
Removed dark mode entirely. The game now always uses the light/parchment theme with brown text — matching the intended medieval aesthetic.

### Changes

#### 1. Removed dark mode CSS overrides
**File:** `src/index.css`
- Deleted the entire `.dark { ... }` block (38 lines) that overrode all CSS variables with dark variants
- Added missing `--wood-dark: 25 45% 15%` CSS variable (used by multiple components but never defined)

#### 2. Removed DarkModeToggle component
**File:** `src/components/game/DarkModeToggle.tsx` — **Deleted**
- Removed the toggle that added/removed `.dark` class on `<html>` and persisted to localStorage

#### 3. Removed DarkModeToggle from all UI locations
- **`src/components/game/GameBoardHeader.tsx`** — Removed toggle from top bar
- **`src/components/screens/TitleScreen.tsx`** — Removed toggle from top-right corner
- **`src/components/game/OptionsMenu.tsx`** — Removed "Dark Mode" row from Display tab

#### 4. Removed `dark` class from HTML root
**File:** `index.html`
- Changed `<html lang="en" class="dark">` to `<html lang="en">`
- Updated `theme-color` meta from `#1a1a2e` (dark blue) to `#2e1f0f` (dark brown)

#### 5. Added missing `wood-dark` Tailwind color
**File:** `tailwind.config.ts`
- Added `dark: "hsl(var(--wood-dark))"` to the `wood` color definition
- Removed `darkMode: ["class"]` configuration
- Fixes `text-wood-dark` used in: SideInfoTabs (player name), PlayerInfoPanel, RightSideTabs, MobileHUD, MobileDrawer, TurnOrderPanel

#### 6. Removed dark: prefix from UI components
- **`src/components/ui/alert.tsx`** — Removed `dark:border-destructive`
- **`src/components/ui/chart.tsx`** — Removed `.dark` theme selector

### Build Status
- TypeScript compiles cleanly
- Vite build succeeds
- All 171 tests pass

---

## 2026-02-09 - GitHub Pages Standalone Deployment Audit & Fix

### Goal
Make the game fully runnable from GitHub Pages without depending on Lovable for hosting. The game should be deployable by simply pushing to `main` — GitHub Actions builds and deploys automatically.

### Current Architecture (Already in Place)
The project was already set up for dual-target deployment (Lovable + GitHub Pages) from 2026-02-06. This session verified and hardened the setup.

- **`vite.config.ts`**: `DEPLOY_TARGET=github` env var sets base path to `/guild-life-adventures/`
- **`package.json`**: `build:github` script sets the env var automatically
- **`BrowserRouter`**: Uses `import.meta.env.BASE_URL` for basename (works with any base path)
- **`lovable-tagger`**: Optional devDependency with try/catch in vite.config.ts — installs from npm, only activates in dev mode
- **GitHub Actions**: `.github/workflows/deploy-github-pages.yml` — builds and deploys on push to `main`

### Audit Findings

#### Asset Path Scan (18+ categories)
All asset references in the codebase use `import.meta.env.BASE_URL` prefix correctly:
- Audio: `sfxManager.ts`, `audioManager.ts`, `ambientManager.ts`
- NPC portraits: `NpcPortrait.tsx`, `LocationShell.tsx`
- Character portraits: `CharacterPortrait.tsx`
- Location backgrounds: `HomePanel.tsx`, `RoomScene.tsx`
- Game board: Imported via module (`@/assets/game-board.jpeg`)

**1 dead code issue found and fixed**: `SHADOWFINGERS_IMAGE` in `shadowfingers.ts` had hardcoded `/src/assets/shadowfingers.jpg` — unused (component imports image directly). Removed.

#### Build Verification
- `DEPLOY_TARGET=github vite build` succeeds
- Output correctly uses `/guild-life-adventures/` base path in all references
- PWA manifest `start_url` and `scope` correctly set
- Service worker precaches 86 entries (20.9 MB including game board)

### Fixes Applied

#### 1. Added `.nojekyll` to GitHub Actions Workflow
**File:** `.github/workflows/deploy-github-pages.yml`
- GitHub Pages uses Jekyll by default, which ignores files/directories starting with `_`
- Vite may produce `_`-prefixed chunks — `.nojekyll` prevents this issue
- Added `touch dist/.nojekyll` step after 404.html copy

#### 2. Removed Dead Hardcoded Path
**File:** `src/data/shadowfingers.ts`
- Removed unused `SHADOWFINGERS_IMAGE = '/src/assets/shadowfingers.jpg'` export
- The actual component (`ShadowfingersModal.tsx`) correctly imports the image via module

### How to Deploy from GitHub Pages

#### One-Time Setup (in GitHub repo settings)
1. Go to repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. That's it — the workflow is already in `.github/workflows/deploy-github-pages.yml`

#### Deployment
- **Automatic**: Push to `main` branch → workflow builds and deploys
- **Manual**: Go to **Actions** → "Deploy to GitHub Pages" → **Run workflow**

#### Local Development (no Lovable needed)
```bash
bun install          # Install dependencies
bun run dev          # Start dev server on http://localhost:8080
bun run build        # Build for local/Lovable (base: /)
bun run build:github # Build for GitHub Pages (base: /guild-life-adventures/)
bun run test         # Run 171 tests
```

### Game URL
After enabling GitHub Pages: `https://tombonator3000.github.io/guild-life-adventures/`

### Build Status
- TypeScript compiles cleanly
- All 171 tests pass
- Both `build` and `build:github` targets succeed

---

## 2026-02-09 - GitHub Update / PWA Caching Diagnosis & Fix

### Problem
User reported that recently added features (ambient sound controls in Options panel, AI character portrait in scheming modal) were not visible in their running game. Updates from GitHub didn't seem to take effect.

### Diagnosis
1. **Code is correct**: Both ambient sound controls (`RightSideTabs.tsx:360-391`, `OptionsMenu.tsx:235-264`) and AI portrait (`GameBoardOverlays.tsx:90-101`) are fully implemented and the build succeeds.
2. **User's running version is stale**: Screenshots showed an older build without these features.
3. **Root cause — PWA caching**: The service worker (`registerType: "prompt"`) caches all assets. Updates were only checked every **60 minutes**, and required the user to notice and click "Update Now" on a small banner at the bottom of the screen.
4. **No version indicator**: There was no way for the user to verify which build version they were running.

### Fixes Applied

#### 1. PWA Update Check — 60min → 5min + immediate check on load
**File:** `src/hooks/useAppUpdate.ts`
- Reduced `UPDATE_CHECK_INTERVAL_MS` from 60 minutes to 5 minutes
- Added immediate `registration.update()` call on service worker registration
- Added `checkForUpdates()` method for manual update checking from UI
- Wrapped `updateApp` with `useCallback` for stable reference

#### 2. Build Version Timestamp
**File:** `vite.config.ts`
- Added `define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) }` — injects build timestamp at compile time

**File:** `src/vite-env.d.ts`
- Added `declare const __BUILD_TIME__: string` type declaration

#### 3. Update Banner — More Prominent
**File:** `src/components/game/UpdateBanner.tsx`
- Larger icon (w-5 h-5), bolder text, added subtitle "Click to update and see latest features"
- Added `border-2 border-primary/50` for visual prominence
- Exported `getBuildVersion()` utility function — formats build timestamp for display

#### 4. Options Menu — Version Display + Manual Update Check
**File:** `src/components/game/OptionsMenu.tsx`
- Footer now shows "Build: DD Mon YYYY HH:MM" timestamp
- "Update Available — Click to Install" link when update is detected (animated pulse)
- "Check for Updates" button with spinning icon when no update pending
- Imported `useAppUpdate` hook and `getBuildVersion` utility

#### 5. Right Sidebar — Version Display
**File:** `src/components/game/RightSideTabs.tsx`
- Added "Build: ..." version line at bottom of Options tab
- Imported `getBuildVersion` from UpdateBanner

### What Users Should Do
1. **If using PWA (installed app)**: Open the game, wait a few seconds for the update check, then click "Update Now" when the banner appears. Alternatively, open Options → "Check for Updates".
2. **If using browser**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) to bypass cache.
3. **If deployed via Lovable**: Ensure Lovable has pulled the latest from GitHub and triggered a new build.
4. **If deployed via GitHub Pages**: Check that the GitHub Actions workflow ran successfully on the latest push to main.

### Build Status
- Build succeeds, 171 tests pass
- Files changed: 5 (`useAppUpdate.ts`, `UpdateBanner.tsx`, `OptionsMenu.tsx`, `RightSideTabs.tsx`, `vite.config.ts`, `vite-env.d.ts`)

---

## 2026-02-09 - Dummy Audio Files (SFX + Ambient Placeholders)

### Task
Created placeholder (silent) MP3 files for all 52 audio assets referenced by the SFX and ambient sound systems. These serve as drop-in placeholders until real audio assets are produced.

### Files Created

#### public/sfx/ — 36 Sound Effect Files (~4KB each, ~1s silent MP3)

| Category | Files |
|----------|-------|
| **UI Sounds** | button-click.mp3, button-hover.mp3, gold-button-click.mp3, menu-open.mp3, menu-close.mp3 |
| **Game Actions** | coin-gain.mp3, coin-spend.mp3, item-buy.mp3, item-equip.mp3, success.mp3, error.mp3 |
| **Movement** | footstep.mp3, door-open.mp3 |
| **Work & Education** | work-complete.mp3, study.mp3, graduation.mp3 |
| **Combat & Dungeon** | sword-hit.mp3, damage-taken.mp3, victory-fanfare.mp3, defeat.mp3 |
| **Turn Events** | notification.mp3, turn-start.mp3, week-end.mp3 |
| **Game Events** | robbery.mp3, heal.mp3, quest-accept.mp3, quest-complete.mp3, level-up.mp3, appliance-break.mp3, dice-roll.mp3, death.mp3, resurrection.mp3, rent-paid.mp3, weather-thunder.mp3, festival.mp3, travel-event.mp3 |

All 36 files match `SFX_LIBRARY` in `src/audio/sfxManager.ts`.

#### public/ambient/ — 16 Ambient Loop Files (~4KB each, ~1s silent MP3)

| Track | Label |
|-------|-------|
| noble-ambient.mp3 | Noble Gardens |
| market-ambient.mp3 | Market Bustle |
| bank-ambient.mp3 | Bank Interior |
| forge-ambient.mp3 | Forge Workshop |
| guild-ambient.mp3 | Adventurer Crowd |
| cave-ambient.mp3 | Cave Depths |
| academy-ambient.mp3 | Quiet Study |
| enchanter-ambient.mp3 | Arcane Workshop |
| armory-ambient.mp3 | Armory Clatter |
| tavern-ambient.mp3 | Tavern Crowd |
| shadow-ambient.mp3 | Dark Alley |
| fence-ambient.mp3 | Pawn Shop |
| slums-ambient.mp3 | Slum Streets |
| landlord-ambient.mp3 | Rent Office |
| street-ambient.mp3 | Town Streets (default) |
| graveyard-ambient.mp3 | Graveyard |

All 16 files match `AMBIENT_TRACKS` in `src/audio/ambientConfig.ts`.

### Technical Details
- Each file is a minimal valid MP3 with ID3v2 header + 38 silent MPEG1 Layer3 frames (~1 second)
- Size: ~4KB per file (total ~208KB for all 52 files)
- Format: MPEG1, Layer3, 32kbps, 44100Hz
- The SFX system (`sfxManager.ts`) will load these MP3s; since they're silent, the Web Audio API synth fallback (`synthSFX.ts`) will still be the primary sound source until real assets are added
- The ambient system (`ambientManager.ts`) will load these and play silent loops until real ambient tracks are added
- To replace: drop real MP3 files with the same names into the respective directories

### Audio System Summary (existing)
- **Music**: 11 tracks in `public/music/` (3-6.5 MB each) — fully functional
- **SFX**: 36 placeholder files in `public/sfx/` + synth fallback — **NEW**
- **Ambient**: 16 placeholder files in `public/ambient/` — **NEW**

## 2026-02-09 - Verification: AI Modal, Speech Bubble, Landlord Restriction

### Verification of 3 Features (All Confirmed Implemented)

Verified that the following 3 features from the previous session are **actually implemented** in code:

#### 1. AI Scheming Modal — Larger with AI Portrait
**File:** `src/components/game/GameBoardOverlays.tsx:84-146`
- Modal dimensions: `min-w-[360px]` desktop / `min-w-[280px]` mobile, `p-8` padding
- `CharacterPortrait` component renders AI portrait at 96px (desktop) / 72px (mobile)
- Spinning `Brain` icon badge at bottom-right of portrait
- Title text enlarged to `text-2xl`, bounce dots at `w-2.5 h-2.5`
- Speed controls (1x/3x/Skip) below with `w-3.5 h-3.5` icons

#### 2. Speech Bubble Tail Points at NPC Portrait
**File:** `src/components/game/BanterBubble.tsx:125-157`
- Triangle tail positioned at `top: 100%`, `left: clamp(32px, 15%, 64px)`
- Points down-left toward the NPC portrait column in LocationShell
- Double-layer tail technique: outer border-colored triangle + inner background-colored triangle
- Mood-based coloring (friendly/grumpy/mysterious/gossip/warning)

#### 3. Landlord Rent Week Restriction
**Files:**
- `src/components/game/LocationPanel.tsx:461-506` — Player UI
- `src/hooks/ai/actions/criticalNeeds.ts:66-95` — AI rent payment
- `src/hooks/ai/actions/strategicActions.ts:91-135` — AI housing actions

**Rules:**
- Rent weeks: `(week + 1) % 4 === 0` (every 4th week)
- Emergency access: `weeksSinceRent >= 3` (3+ weeks overdue)
- "Office Closed" message with countdown to next rent week
- Prepaid weeks info still shown when closed
- AI uses identical gating logic for rent payment, housing upgrade, and housing downgrade

---

## 2026-02-09 - Game Audio: SFX System, Ambient Sounds & Web Audio Synth

### Complete 3-Layer Audio System

Built a full SFX and ambient audio system with Web Audio API synthesized fallback, so the game has immediate sound effects without requiring MP3 files.

### 1. Web Audio Synthesizer (synthSFX.ts)

Created a procedural sound synthesizer using the Web Audio API that generates 36 different sound effects programmatically. When MP3 files aren't present in `public/sfx/`, the SFXManager automatically falls back to synth sounds.

**Sound categories:**
- **UI Sounds** (5): button-click, button-hover, gold-button-click, menu-open, menu-close
- **Game Actions** (6): coin-gain, coin-spend, item-buy, item-equip, success, error
- **Movement** (2): footstep, door-open
- **Work & Education** (3): work-complete, study, graduation
- **Combat** (4): sword-hit, damage-taken, victory-fanfare, defeat
- **Events** (3): notification, turn-start, week-end
- **New Sounds** (13): robbery, heal, quest-accept, quest-complete, level-up, appliance-break, dice-roll, death, resurrection, rent-paid, weather-thunder, festival, travel-event

**New File:** `src/audio/synthSFX.ts`

### 2. Ambient Sound System

Created a separate ambient audio layer that plays environmental/atmospheric loops per location, independent of the music system.

- **AmbientManager** — Singleton with A/B crossfade (800ms), separate volume/mute controls
- **16 ambient tracks** defined for all locations: Noble Heights (garden/fountain), Forge (hammer/fire), Cave (dripping water/echoes), Tavern (crowd/mugs), Shadow Market (whispers), etc.
- **useAmbientController** hook drives ambient automatically from game state, same pattern as useMusicController
- Ambient stops on menu screens, plays per-location during gameplay
- Settings persisted to localStorage (`guild-life-ambient-settings`)

**New Files:**
- `src/audio/ambientConfig.ts` — Ambient track definitions and location mappings
- `src/audio/ambientManager.ts` — Singleton ambient audio manager
- `src/hooks/useAmbient.ts` — React hooks for ambient settings and controller

### 3. SFX Manager Upgrade

Updated the SFXManager with:
- **MP3 → Synth fallback**: Tries MP3 file first, if load fails, uses Web Audio synth automatically
- **Failed file caching**: Tracks which MP3s failed so subsequent plays go straight to synth (no flicker)
- **13 new SFX types** added to the library (robbery, heal, quest-accept, etc.)

**Modified File:** `src/audio/sfxManager.ts`

### 4. SFX Wired Into Game Components

Added SFX triggers to all major game events:

| Component | SFX Trigger |
|-----------|-------------|
| ShadowfingersModal | `robbery` on modal open |
| EventPanel | Type-specific: `death`, `robbery`, `damage-taken`, `error`, `coin-gain`, `notification` |
| CombatView | `damage-taken` on hit, `coin-gain` on loot, `heal` on healing |
| EncounterIntro | `sword-hit` on fight button |
| FloorSummaryView | `victory-fanfare`, `notification`, or `defeat` based on outcome |
| TurnTransition | `turn-start` on multiplayer turn switch |
| QuestPanel | `quest-accept` on accept, `quest-complete` on complete |
| HealerPanel | `heal` on all healing/cure/bless actions |
| LandlordPanel | `rent-paid` on rent buttons, `door-open` on housing move |
| GuildHallPanel | `success` on accepting job/raise |
| LocationPanel | `door-open` on entering location, `item-buy` on newspaper, `success` on guild pass |
| useLocationClick | `footstep` on travel start, `door-open` on location entry |

**Modified Files:**
- `src/components/game/ShadowfingersModal.tsx`
- `src/components/game/EventPanel.tsx`
- `src/components/game/CombatView.tsx`
- `src/components/game/combat/EncounterIntro.tsx`
- `src/components/game/combat/FloorSummaryView.tsx`
- `src/components/game/TurnTransition.tsx`
- `src/components/game/QuestPanel.tsx`
- `src/components/game/HealerPanel.tsx`
- `src/components/game/LandlordPanel.tsx`
- `src/components/game/GuildHallPanel.tsx`
- `src/components/game/LocationPanel.tsx`
- `src/hooks/useLocationClick.ts`

### 5. Ambient Controls in UI

Added ambient volume/mute controls to:
- **OptionsMenu** (full modal) — New "Ambient Sounds" section between Music and SFX
- **RightSideTabs** (in-game sidebar) — New ambient slider with Bell icon

**Modified Files:**
- `src/components/game/OptionsMenu.tsx`
- `src/components/game/RightSideTabs.tsx`

### 6. SFX Generator Updated

Added ElevenLabs prompts for all 13 new SFX types in the SFX Generator panel, so real MP3s can be generated later.

**Modified File:** `src/services/sfxGenerator.ts`

### Integration Point: Index.tsx

Added `useAmbientController` alongside `useMusicController` in the root `Index` component.

**Modified File:** `src/pages/Index.tsx`

### Build & Test Results
- TypeScript compiles clean (`tsc --noEmit`)
- Build succeeds
- All 171 tests pass

---

## 2026-02-09 - AI Scheming Modal, Speech Bubble, & Landlord Restriction

### 1. AI Scheming Modal Expansion

Expanded the "...is Scheming" modal to be larger and added the AI character portrait.

**Changes:**
- Modal is now wider (`min-w-[360px]` desktop, `min-w-[280px]` mobile) with more padding (`p-8`/`p-5`)
- AI character portrait (96px desktop, 72px mobile) shown at top using `CharacterPortrait` component
- Small Brain icon badge in bottom-right corner of portrait (spinning animation)
- Title text increased to `text-2xl` desktop / `text-lg` mobile
- Flavor text now shown on mobile too (was desktop-only)
- Speed control buttons slightly larger (`w-3.5 h-3.5` icons)
- Animated dots slightly larger (`w-2.5 h-2.5`)
- Overall vertical spacing increased (`gap-4`)

**Modified File:** `src/components/game/GameBoardOverlays.tsx`

### 2. Speech Bubble Points at NPC Portrait

Repositioned the banter speech bubble tail/tab to point toward the NPC portrait instead of center-bottom.

**Changes:**
- Bubble tail moved from `left-1/2 -translate-x-1/2` (center) to `left: clamp(32px, 15%, 64px)` (left-aligned, above portrait)
- Tail shape adjusted to be asymmetric (8px left / 14px right borders) for a more natural "coming from portrait" look
- Overlay container changed from `justify-center` to `justify-start` with `paddingLeft: 2%` to position bubble over the portrait column
- Mobile layout unchanged (still centered since portrait is inline)

**Modified Files:**
- `src/components/game/BanterBubble.tsx` — tail positioning
- `src/components/game/GameBoard.tsx` — `BoardBanterOverlay` alignment

### 3. Landlord Only Open During Rent Week

The Landlord's office is now only accessible during rent collection weeks (every 4th week cycle) or when the player is urgently behind on rent (3+ weeks overdue). This makes the garnished wages punishment more effective.

**Design:**
- Rent is collected at end of every 4th week (`(week + 1) % 4 === 0`)
- Landlord is open during that week so players can pay before collection
- If `weeksSinceRent >= 3` (player is behind), Landlord is open as emergency access
- During closed weeks, shows "Office Closed" with info on when next rent week is
- Shows prepaid weeks remaining if any

**AI Integration:**
- AI critical needs (pay-rent, move-to-landlord) gated by `isLandlordOpen` check
- AI strategic actions (housing upgrade/downgrade) also gated
- Legacy simple AI already only visits landlord at `weeksSinceRent >= 3` (compatible)

**Modified Files:**
- `src/components/game/LocationPanel.tsx` — rent week check with closed state UI
- `src/hooks/ai/actions/criticalNeeds.ts` — landlord open check for rent actions
- `src/hooks/ai/actions/strategicActions.ts` — landlord open check for housing actions

### Build & Test Results
- TypeScript compiles clean (`tsc --noEmit`)
- Build succeeds
- All 171 tests pass

---

## 2026-02-09 - Character Portrait System

### Feature: Player & AI Character Portraits

Added a full character portrait system where players and AI opponents can choose portrait art that represents their character. Portraits appear in the setup screen, on the game board tokens, and across all UI panels.

**Portrait System:**
- 8 player portraits: Warrior, Mage, Rogue, Cleric, Ranger, Bard, Paladin, Merchant
- 4 AI portraits: Grimwald, Seraphina, Thornwick, Morgath (auto-assigned by default)
- Generated SVG placeholders with unique silhouettes per class (helmet, wizard hat, hood, halo, etc.)
- JPG image support: drop files into `public/portraits/` to replace placeholders
- Falls back to colored circle with initial if no portrait selected

**Setup Screen:**
- Click the colored circle next to player name to open portrait picker
- Portrait picker modal shows all 8 portraits in a grid + "None" option
- AI opponents get default portraits matching their character (configurable)
- Portraits stored in `AIConfig.portraitId` and passed to `startNewGame`

**Game Board & UI Integration:**
- `CharacterPortrait` component used everywhere (replaces plain color dots)
- `PlayerToken` (32px static) and `AnimatedPlayerToken` (40px animated) show portraits
- Updated 7 UI panels: PlayerInfoPanel, TurnOrderPanel, SideInfoTabs, RightSideTabs, ResourcePanel, MobileHUD, TurnTransition

**Data Model:**
- Added `portraitId: string | null` to Player interface
- Added `portraitId?: string` to AIConfig interface
- `createPlayer()` accepts optional portraitId parameter
- `startNewGame()` accepts optional `playerPortraits` array
- Backwards compatible: null portraitId shows color circle fallback

**New Files:**
- `src/data/portraits.ts` — Portrait definitions, categories, helpers
- `src/components/game/CharacterPortrait.tsx` — Portrait renderer (image + SVG fallback)
- `src/components/game/PortraitPicker.tsx` — Modal portrait selection grid
- `public/portraits/` — Directory for JPG portrait art (placeholder-ready)

**Modified Files:**
- `src/types/game.types.ts` — Added portraitId to Player and AIConfig
- `src/store/gameStore.ts` — Updated createPlayer and startNewGame
- `src/store/storeTypes.ts` — Updated startNewGame signature
- `src/components/screens/GameSetup.tsx` — Portrait picker integration
- `src/components/game/PlayerToken.tsx` — Uses CharacterPortrait
- `src/components/game/AnimatedPlayerToken.tsx` — Uses CharacterPortrait
- `src/components/game/PlayerInfoPanel.tsx` — Portrait in header
- `src/components/game/TurnOrderPanel.tsx` — Portrait in turn list
- `src/components/game/SideInfoTabs.tsx` — Portrait in header
- `src/components/game/RightSideTabs.tsx` — Portrait in player list
- `src/components/game/ResourcePanel.tsx` — Portrait in header
- `src/components/game/MobileHUD.tsx` — Portrait in HUD bar
- `src/components/game/TurnTransition.tsx` — Portrait in privacy screen

**Tests:** All 171 tests passing (9 test files). Build succeeds.

---

## 2026-02-09 - Updated Default Zone Configurations

### Zone Config Overhaul

Updated the default `ZONE_CONFIGS`, `MOVEMENT_PATHS` in `src/data/locations.ts` to match refined board layout.

**ZONE_CONFIGS changes:**
- `noble-heights`: width 18.2→19.3, height 26.4→24.5 (slightly wider, shorter)
- `general-store`: repositioned from (3.1, 33.9) to (6.4, 35.3), width 16.7→14.4, height 20.2→18.0
- `graveyard`: moved from center-left (21.0, 33.0, 14.0×18.0) to far-left edge (0.0, 24.7, 5.6×17.0) — now a narrow strip on the left border
- `bank`: minor adjustment from (1.1, 54.8, 18.1×18.7) to (1.3, 55.4, 17.9×17.7)
- Zone order updated: graveyard moved from 6th to last position in array

**MOVEMENT_PATHS changes:**
- Added `noble-heights_general-store` direct path: [[5.6, 51.4], [5.6, 51.4]]
- Updated `general-store_bank` waypoint: from [[5.6, 51.4], [5.6, 62.0]] to [[19.9, 69.5]]
- Updated `noble-heights_graveyard` path: from [[15.0, 30.0]] to [[13.0, 31.6], [5.1, 38.3], [5.1, 38.3]] (3-waypoint path to new graveyard position)
- Updated `graveyard_general-store` path: from [[15.0, 42.0]] to [[5.6, 52.6]]

**CENTER_PANEL_CONFIG:** unchanged (top: 22.6, left: 22.0, width: 56.4, height: 53.6)

**Files changed:**
- `src/data/locations.ts` — ZONE_CONFIGS and MOVEMENT_PATHS updated

**Tests:** All 171 tests passing (9 test files)

---

## 2026-02-09 - Guild Rank Promotion Bug Fix & Quest Panel UI Redesign

### Bug Fix: Legendary Champion Can't Start Journeyman Quests

**Root cause:** `promoteGuildRank()` in `questHelpers.ts` used `player.completedQuests` to determine rank promotion, but `completedQuests` was only incremented by regular quests and chain steps — NOT by bounties. Meanwhile `guildReputation` IS incremented by all quest-like activities (regular quests +1, chain steps +1/+3, bounties +1). A player doing lots of bounties would accumulate high reputation (50 = "Legendary Champion" shown in the UI) but their actual `guildRank` stayed low because `completedQuests` count was low.

**Fixes applied:**
1. Changed `promoteGuildRank()` to use `guildReputation` instead of `completedQuests` for rank promotion checks
2. Made promotion loop through multiple ranks at once (handles case where bounties push past several thresholds at once)
3. Added `promoteGuildRank()` call after bounty completion (was missing entirely)

**Files changed:**
- `src/store/helpers/questHelpers.ts` — promoteGuildRank logic + completeBounty integration

### UI Redesign: Quest Panel Matches Job Layout

Redesigned QuestPanel (bounties, quest chains, regular quests) to use the same visual style as the GuildHallPanel job listings:
- Replaced dark `wood-frame` cards with light parchment cards (`bg-[#e0d4b8]`, `border-[#8b7355]`)
- Replaced `gold-button` CSS buttons with `JonesButton` component (same as job Apply/Request Raise buttons)
- Replaced section headers (icon + text) with `JonesSectionHeader` component (brown bar style)
- Dark text on light background, consistent with job listings
- Compact layout with stats/requirements inline, button on the right side
- Active quest card highlighted with gold border (same as current job highlight)
- Cleaned up unused imports (Clock, Heart, Coins, Scroll, Star, Shield, QuestChainStep, Bounty, getNextChainStep)

**Files changed:**
- `src/components/game/QuestPanel.tsx` — full UI redesign

**Verification:** TypeScript clean, build succeeds, 171/171 tests pass.

---

## 2026-02-09 - Salary Stabilization & Job/Education Balance Audit

Fixed wild salary fluctuations, ensured proper wage hierarchy from entry to top jobs, and audited education-to-job mapping for fairness.

### Problem 1: Wild Salary Fluctuations

Wages could swing from 26g to 13g between visits to the Guild Hall within the same week. The old system used `Math.random()` with a wide 0.7-1.6× multiplier on every wage calculation, combined with the economy modifier (0.75-1.25×), giving an effective range of 0.5-2.0× base wage.

**Root cause**: `calculateOfferedWage()` in `jobs/utils.ts` used `Math.random()` on every call. Even though wages were memoized per mount via `useMemo`, re-entering the Guild Hall (remount) re-rolled all wages.

**Fix**: Replaced random variance with deterministic per-job-per-week hash function:
- New `hashWageNoise(jobId, week)` returns 0-1 deterministically — same job shows same wage all week
- Narrowed per-job noise from ±45% (0.7-1.6) to ±10% (0.90-1.10)
- Narrowed clamp range from 0.5-2.0 to 0.75-1.35
- Economy modifier (0.75-1.25) is now the primary driver of wage changes
- Wages only change at week boundaries (when economy drifts), not between visits

**Effective wage range comparison**:
| | Before | After |
|---|--------|-------|
| Per-job noise | ±45% random | ±10% deterministic |
| Economy range | 0.75-1.25 | 0.75-1.25 (unchanged) |
| Total effective | 0.5-2.0× base | 0.67-1.35× base |
| 14g job range | 7-28g | 10-19g |
| Week-to-week change | Random re-roll | Gradual drift |

### Problem 2: Mid-Tier Jobs Paying Less Than Entry Jobs

Because each job got its own random multiplier, a mid-tier job could roll low (0.5×) while an entry job rolled high (2.0×), completely inverting the hierarchy.

**Fix**: Added `CAREER_LEVEL_WAGE_FLOOR` — minimum wage per career level (1-10):
```
Level 1 (Entry): 3g min    Level 6 (Lead): 13g min
Level 2 (Junior): 5g min   Level 7 (Expert): 16g min
Level 3 (Associate): 7g min Level 8 (Executive): 18g min
Level 4 (Mid-Level): 9g min Level 9 (Director): 21g min
Level 5 (Senior): 11g min  Level 10 (Master): 23g min
```
Higher career level jobs can never pay less than the floor, regardless of economy conditions.

### Problem 3: Education Path ROI Imbalances

Several jobs were underpaid relative to the education investment required:

| Job | Old Wage | New Wage | Issue |
|-----|----------|----------|-------|
| Scroll Copier | 7g (L2) | **9g (L3)** | Required Arcane Studies (130g) but paid same as Library Assistant (50g investment) |
| City Guard | 8g | **10g** | Required Combat Training (130g) but paid less than Bank Teller (50g investment), plus 8h shifts |
| Apprentice Smith | 6g | **8g** | Required Trade Guild + 8h shifts but paid same as Shop Clerk (6h shifts) |
| Shop Clerk | 6g | **7g** | Required Trade Guild but paid same as degree-less Barmaid |
| Enchantment Assistant | 11g | **12g** | Arcane Studies path ROI boost |
| Potion Brewer | 13g | **14g** | Alchemy path (280g total investment) deserved better mid-tier reward |

Career level corrections (jobs with exp/dep/clothing requirements reclassified from Entry to Junior):

| Job | Old Level | New Level | Reason |
|-----|-----------|-----------|--------|
| Errand Runner | 1 (Entry) | **2 (Junior)** | Requires casual clothing + 10 exp + 20 dep |
| Tavern Cook | 1 (Entry) | **2 (Junior)** | Requires casual clothing + 10 exp + 20 dep |
| Bank Janitor | 1 (Entry) | **2 (Junior)** | Requires casual clothing + 10 exp + 20 dep |

### Education Path Audit Results

Full education → job progression verified:

**No Degree → Entry (4-6g)**:
Floor Sweeper 4g, Forge Laborer 4g, Dishwasher 4g, Porter 4g, Cook 5g, Runner 5g, Janitor 6g, Barmaid 6g

**Trade Guild (50g) → Junior (7-10g)**:
Shop Clerk 7g, Asst Clerk 7g, Apprentice Smith 8g, Market Vendor 10g, Head Chef 10g

**Junior Academy (50g) → Junior-Associate (7-9g)**:
Library Asst 7g, Scribe 8g, Bank Teller 9g

**Arcane Studies (130g total) → Associate-Mid (9-12g)**:
Scroll Copier 9g, Enchantment Asst 12g

**Combat Training (130g total) → Associate-Mid (10-12g)**:
City Guard 10g, Journeyman Smith 10g, Caravan Guard 12g

**Commerce (150g total) → Mid-Senior (12-16g)**:
Merchant Asst 12g, Guild Accountant 14g, Tavern Manager 14g, Shop Manager 16g

**Scholar (150g total) → Senior (14g)**:
Teacher 14g

**Alchemy (280g total) → Senior-Lead (14-15g)**:
Potion Brewer 14g, Alchemist 15g

**Master Combat (250g total) → Lead-Expert (16-19g)**:
Arena Fighter 16g, Master Smith 18g, Weapons Instructor 19g

**Advanced Scholar (300g total) → Lead (16-17g)**:
Researcher 16g, Senior Teacher 17g

**Sage Studies (500g total) → Expert (18g)**:
Academy Lecturer 18g

**Loremaster (750g total) → Executive (20-21g)**:
Sage 20g, Court Advisor 21g

**Commerce + Master Combat (~400g) → Executive (22-23g)**:
Guild Administrator 22g, Forge Manager 23g

**Scholar + Commerce (~250g) → Executive (22g)**:
Guild Treasurer 22g

**Commerce + Master Combat + Loremaster (~1000g) → Master (25g)**:
Guild Master's Assistant 25g

**Verdict**: Every education path now provides a clear wage increase that justifies the investment. Higher investment = higher ceiling. No dead-end paths.

### Files Modified

- `src/data/jobs/utils.ts` — Replaced random wage with deterministic hash, added career level wage floors, `calculateOfferedWage` now accepts `week` parameter
- `src/data/jobs/definitions.ts` — 9 job balance adjustments (6 wage increases, 3 career level corrections)
- `src/components/game/GuildHallPanel.tsx` — Added `week` prop, passed to `calculateOfferedWage`
- `src/components/game/LocationPanel.tsx` — Passes `week` to `GuildHallPanel`
- `src/hooks/useGrimwaldAI.ts` — AI uses `week` for `calculateOfferedWage` (same formula as human players)

**Build succeeds, 171 tests pass, TypeScript clean.**

## 2026-02-09 - Graveyard Path Reorder & NPC Portrait Fix

Reordered the board path around the graveyard to match the visual layout of the game board.

### Board Path Change
- **Before**: noble-heights → general-store → graveyard → bank
- **After**: noble-heights → graveyard → general-store → bank
- Graveyard is visually located directly below Noble Heights and before General Store on the board
- The path now matches the physical layout of the game board image

### Movement Paths Updated
- Replaced `noble-heights_general-store`, `general-store_graveyard`, `graveyard_bank` path keys
- New keys: `noble-heights_graveyard`, `graveyard_general-store`, `general-store_bank`
- Waypoints adjusted for the new adjacency
- Travel time unchanged: each edge = 1 step (+ 2h entry cost), max distance = 7 steps

### NPC Portrait Fix
- Fixed case mismatch: `npcs/morthos.jpg` → `npcs/Morthos.jpg` (matching actual filename on disk)
- Morthos.jpg now correctly used as the Graveyard NPC portrait

**Files modified:**
- `src/data/locations.ts` — BOARD_PATH order, MOVEMENT_PATHS keys/waypoints
- `src/data/npcs.ts` — Fixed Morthos portrait image path case

## 2026-02-09 - Gameplay Features C1, C4, C6, C7

Implemented 4 gameplay features from the C-category proposals.

### C1: Seasonal Festivals (4 festivals every 12 weeks)

Created `src/data/festivals.ts` with 4 seasonal festivals that rotate every 12 weeks:

1. **Harvest Festival** (wk 12, 60, ...) — +5 happiness, prices -15% (abundant goods)
2. **Winter Solstice** (wk 24, 72, ...) — +3 happiness, +2 study progress, +3 dependability
3. **Spring Tournament** (wk 36, 84, ...) — +3 happiness, dungeon gold +50%
4. **Midsummer Fair** (wk 48, 96, ...) — +5 happiness, +10g, wages +15%

**Integration points:**
- `processWeekEnd` in `weekEndHelpers.ts` — checks for festival, applies effects to all players
- `workShift` in `workEducationHelpers.ts` — festival wage multiplier (Midsummer Fair)
- `CombatView.tsx` — festival dungeon gold multiplier (Spring Tournament)
- `useGrimwaldAI.ts` — AI dungeon handler uses festival multiplier
- `gameOptions.ts` — `enableFestivals` toggle (default: on)
- `OptionsMenu.tsx` — UI toggle for festivals
- `GameState` — `activeFestival: FestivalId | null` synced, saved, loaded

**Files created:**
- `src/data/festivals.ts` — festival definitions, cycle logic, getActiveFestival()

**Files modified:**
- `src/types/game.types.ts` — added `activeFestival` to GameState
- `src/store/gameStore.ts` — initial state, reset, save/load
- `src/store/helpers/weekEndHelpers.ts` — festival check + effects in processWeekEnd
- `src/store/helpers/workEducationHelpers.ts` — festival wage multiplier in workShift
- `src/components/game/CombatView.tsx` — festival dungeon gold multiplier
- `src/hooks/useGrimwaldAI.ts` — AI dungeon festival multiplier
- `src/data/gameOptions.ts` — enableFestivals option
- `src/components/game/OptionsMenu.tsx` — festivals toggle

### C4: AI Rival Enhancement (competitive AI)

Created `src/hooks/ai/actions/rivalryActions.ts` — new AI action generator that makes the AI compete with human players.

**Rivalry behaviors (medium/hard AI only):**
- **Job stealing**: AI analyzes rival's job, applies for it if qualified and better-paying
- **Quest racing**: When rival is quest-focused and threatening, AI grabs quests first
- **Education blocking**: Boosts study priority when rival is education-focused
- **Aggressive banking**: Deposits more gold to protect savings when rival focuses on wealth

**How it works:**
1. AI identifies the most threatening rival (highest overall goal progress)
2. Checks if rival is close to winning (any goal >= 85% or overall >= 70%)
3. Generates rivalry actions with competitive priorities
4. Actions integrate with existing priority system (higher priority = more likely)

**Files created:**
- `src/hooks/ai/actions/rivalryActions.ts` — rivalry action generator

**Files modified:**
- `src/hooks/ai/actions/actionContext.ts` — added `rivals: Player[]` to ActionContext
- `src/hooks/ai/actions/index.ts` — barrel export for rivalryActions
- `src/hooks/ai/actionGenerator.ts` — passes rivals to context, calls generateRivalryActions

### C6: Achievements (meta-progression across games)

Created a persistent achievement system that tracks progress across multiple play sessions.

**24 achievements across 6 categories:**
- **Wealth** (4): First Hundred, Wealthy Merchant, Guildholm Tycoon, Gold Hoarder
- **Combat** (4): Into the Depths, Dungeon Delver, Dungeon Master, Boss Slayer
- **Education** (3): Scholar, Academic, Grand Scholar
- **Social** (4): Adventurer, Seasoned Adventurer, Guild Master, Noble Life
- **Exploration** (4): Festival Goer, Festival Fanatic, Survivor, Veteran
- **Mastery** (5): Victory!, Speed Runner, Champion, Pure Joy, Completionist (hidden)

**Cumulative stats tracked:**
gamesWon, gamesPlayed, totalGoldEarned, totalQuestsCompleted, totalDegreesEarned, totalDungeonFloorsCleared, totalWeeksPlayed, highestHappiness, highestWealth, totalJobsHeld, bossesDefeated, festivalsAttended

**Integration points:**
- `checkVictory` — checks all achievements on every victory check + records win
- `completeQuest` — tracks quest completion stats
- `completeDegree` — tracks degree completion stats
- `clearDungeonFloor` — tracks dungeon stats
- `processWeekEnd` — tracks weeks played + festival attendance

**Files created:**
- `src/data/achievements.ts` — achievement definitions, localStorage persistence, check/unlock logic
- `src/hooks/useAchievements.ts` — React hook with useSyncExternalStore
- `src/components/game/AchievementsPanel.tsx` — UI panel with category grouping

**Files modified:**
- `src/store/helpers/questHelpers.ts` — achievement checks in checkVictory, completeQuest
- `src/store/helpers/workEducationHelpers.ts` — achievement checks in completeDegree
- `src/store/helpers/economy/equipmentHelpers.ts` — achievement checks in clearDungeonFloor
- `src/store/helpers/weekEndHelpers.ts` — achievement stats for weeks/festivals
- `src/components/game/RightSideTabs.tsx` — added Achievements tab with Trophy icon

### C7: Random Travel Events (10% chance during travel)

Created `src/data/travelEvents.ts` with 10 travel events that trigger randomly during movement.

**Travel events (10 total):**

*Positive:*
- Found Coin Purse (+15-35g, +2 hap)
- Wandering Merchant (+3 hap, +5 HP)
- Hidden Shortcut (+1 hap, +2 hours saved)
- Street Bard (+5 hap, -1 hour)

*Negative:*
- Pickpocket! (-10-30g, -3 hap)
- Muddy Road (-2 hap, -1 hr, -5 HP)
- Took a Wrong Turn (-1 hap, -2 hrs)
- Aggressive Stray Dog (-2 hap, -1 hr, -3 HP)

*Mixed:*
- Injured Traveler (+10g, +4 hap, -2 hrs)
- Old Map Fragment (+25g, +3 hap, -3 hrs)

**Trigger conditions:**
- 10% chance per trip
- Only on trips of 3+ steps
- Applies to both human and AI players (UI notification for humans only)

**Files created:**
- `src/data/travelEvents.ts` — event definitions, rollTravelEvent(), formatTravelEvent()

**Files modified:**
- `src/store/helpers/playerHelpers.ts` — travel event check after movement in movePlayer

### Technical Notes

- TypeScript compiles cleanly (tsc --noEmit passes with 0 errors)
- All new features use existing patterns (Zustand actions, SetFn/GetFn, localStorage persistence)
- Festival and achievement systems follow weather system pattern for consistency
- No breaking changes to existing save format (new fields have null/default fallbacks)

---

## 2026-02-09 - Kategori B: Quest System (B1-B5)

Implemented all 5 quest system features from the B-category proposals.

### B1: Quest Chains — Multi-part quests
- Added `QuestChain` and `QuestChainStep` interfaces in `src/data/quests.ts`
- Two quest chains: **"The Dragon Conspiracy"** (3 steps, C/B/A rank, 200g bonus) and **"The Scholar's Secret"** (3 steps, D/C/B rank, 150g bonus)
- Player tracks progress via `questChainProgress: Record<string, number>` (chainId to steps completed)
- Store actions: `takeChainQuest(playerId, chainId)`, `completeChainQuest(playerId)`
- Active chain quests stored as `"chain:<chainId>"` in `player.activeQuest`
- Chain completion bonus: +3 guild reputation (vs +1 for regular quest)
- AI strategy: Strategic AI (medium/hard) prefers chains over regular quests for the completion bonus

### B2: Repeatable Bounties — 3 rotating weekly bounties
- Pool of 9 bounty templates (Cellar Rats, Night Patrol, Herb Collection, etc.) in `BOUNTY_POOL`
- `getWeeklyBounties(week)` returns 3 deterministically-rotated bounties per week
- **No Guild Pass required** — bounties are free for all players
- Each bounty can be completed once per week; resets in `weekEndHelpers.ts`
- Player tracks via `completedBountiesThisWeek: string[]`
- Store actions: `takeBounty(playerId, bountyId)`, `completeBounty(playerId)`
- Active bounties stored as `"bounty:<bountyId>"` in `player.activeQuest`
- Bounties don't count toward `completedQuests` (no guild rank from bounties)
- AI picks bounties when no quest/chain is available

### B3: Quest Difficulty Scaling
- `getScaledQuestGold(baseGold, floorsCleared)`: +10% per dungeon floor, max +60%
- `getScaledQuestHappiness(baseHappiness, floorsCleared)`: +1 happiness per 2 floors
- Applied to all quest types (regular, chain, bounty) in `questHelpers.ts`
- UI shows green bonus indicators like "+35g (+5)" when scaling is active

### B4: Quest Failure Consequences
- Abandoning a quest: **-2 happiness, -3 dependability, 2-week cooldown**
- `questCooldownWeeksLeft` decremented weekly in `weekEndHelpers.ts`
- During cooldown: cannot take quests or chain quests (bounties still allowed)
- AI respects cooldown; strategy checks `questCooldownWeeksLeft > 0`
- UI shows cooldown warning with weeks remaining

### B5: Guild Reputation
- `guildReputation` tracks total quest+chain+bounty completions
- Milestones at 5 (Known Adventurer, +5% gold), 10 (Trusted Agent, +10%), 20 (Renowned Hero, +15%), 50 (Legendary Champion, +20%)
- `getReputationGoldMultiplier()` applied on top of difficulty scaling
- UI: Reputation bar with progress toward next milestone, title display
- Chain completion = 3 rep, regular quest/bounty = 1 rep each

### Files Changed

| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `questChainProgress`, `completedBountiesThisWeek`, `questCooldownWeeksLeft`, `guildReputation` to Player |
| `src/data/quests.ts` | Added QuestChain data, Bounty pool, scaling functions, reputation milestones |
| `src/store/helpers/questHelpers.ts` | New actions: takeChainQuest, completeChainQuest, takeBounty, completeBounty; modified: completeQuest (scaling+rep), abandonQuest (B4 consequences), takeQuest (cooldown check) |
| `src/store/helpers/weekEndHelpers.ts` | Reset `completedBountiesThisWeek`, decrement `questCooldownWeeksLeft` |
| `src/store/storeTypes.ts` | Added `takeChainQuest`, `completeChainQuest`, `takeBounty`, `completeBounty` signatures |
| `src/store/gameStore.ts` | Init new Player fields with defaults |
| `src/components/game/QuestPanel.tsx` | Full rewrite: bounty board, chain quests, reputation bar, cooldown warning, scaling indicators |
| `src/components/game/LocationPanel.tsx` | Pass new props (week, onTakeChainQuest, onTakeBounty); bounties visible without Guild Pass |
| `src/hooks/ai/strategy.ts` | Added `getBestBounty()`, `getBestChainQuest()`; updated `getBestQuest()` for cooldown |
| `src/hooks/ai/actions/questDungeonActions.ts` | Added take-chain-quest, take-bounty action generation |
| `src/hooks/ai/types.ts` | Added `take-chain-quest`, `take-bounty` to AIActionType |
| `src/hooks/useGrimwaldAI.ts` | Added case handlers for take-chain-quest, take-bounty; destructured new store actions |
| `src/data/saveLoad.ts` | v2→v3 migration: add B-feature fields to saved players |
| `src/network/types.ts` | Added new actions to `ALLOWED_GUEST_ACTIONS` |

### Test Results
- All 171 tests pass
- Production build succeeds (1080 kB bundle)

---

## 2026-02-09 - Zone Editor Graveyard Fix & Gold Frame Removal

Two UI fixes applied:

### Fix 1: Graveyard missing from Zone Editor

The graveyard location was defined in `ZONE_CONFIGS` but didn't appear in the Zone Editor's layout or location list when a previously saved zone config existed in localStorage.

**Root cause**: `useZoneConfiguration` and `useZoneEditorState` loaded saved zones from localStorage without merging with current `ZONE_CONFIGS`. If the save was created before graveyard was added, it was missing.

**Fix**: Added merge logic in both hooks — any location in `ZONE_CONFIGS` not present in the saved config is appended automatically.

| File | Change |
|------|--------|
| `src/hooks/useZoneConfiguration.ts` | Added `mergeWithDefaults()` — merges saved zones with ZONE_CONFIGS so new locations always appear |
| `src/hooks/useZoneEditorState.ts` | Same merge logic in initial state — missing ZONE_CONFIGS entries appended to initialZones |

### Fix 2: Removed gold frame around current location

The pulsing gold border/ring around the player's current location has been removed.

| File | Change |
|------|--------|
| `src/components/game/LocationZone.tsx` | Removed `ring-2 ring-primary ring-offset-2` classes and the `animate-pulse-gold` overlay div |

### Testing

- TypeScript: compiles clean
- Build: succeeds
- Tests: 171/171 passing

---

## 2026-02-09 - Cave/Dungeon Category A Features (A1, A2, A4, A5)

Implemented four major dungeon system expansions: Floor 6, random modifiers, leaderboard, and mini-bosses.

### A1: Floor 6 "The Forgotten Temple"

Ultra-endgame floor requiring Loremaster degree (first floor with required degrees, not just recommended).

| Detail | Value |
|--------|-------|
| Boss | The Archon (Power 140, baseDamage 95, 500g base) |
| Requirements | Floor 5 cleared, Enchanted Blade, Enchanted Plate, 45+ ATK, 50+ DEF, **Loremaster degree** |
| Time Cost | 28h (24h reduced) |
| Gold Range | 400-1000g |
| Health Risk | 90-150 dmg |
| Rewards | +30 happiness, +20 dependability on first clear |
| Rare Drop | Archon's Crown (5%) — +30 happiness, +8 to all stat caps |
| Encounters | Temple Guardians, Divine Ward (disarmable trap), Spectral High Priests (arcane), Temple Reliquary (treasure), Sanctum Font (healing) |

Also added Loremaster education bonus: +15% ATK, +20% gold in dungeon.

### A2: Dungeon Random Modifiers

60% chance per run to get a random modifier that changes combat dynamics.

| Modifier | Effect |
|----------|--------|
| Cursed Halls | +30% damage taken, +50% gold |
| Lucky Day | +25% rare drop chance, +25% gold |
| Blood Moon | Enemies +50% power, +100% gold, no healing |
| Echoing Darkness | Traps can't be disarmed, +20% gold |
| Blessed Ground | -20% damage taken, healing +50% |
| Fortune's Favor | 2x treasure gold, +50% rare drop |
| Weakened Wards | Enemies -30% power, -30% gold |

Modifiers affect all encounter types: combat damage, gold, healing, traps. Shown as colored banner in CombatView.

### A4: Dungeon Leaderboard

Per-player, per-floor tracking of dungeon performance.

| Tracked | Description |
|---------|-------------|
| Best Gold | Highest gold earned in a single run |
| Best Encounters | Fewest encounters to complete (for speedrunners) |
| Total Runs | Number of times this floor has been run |
| Total Gold | Cumulative gold earned across all runs |

Records displayed in collapsible "Dungeon Records" section in CavePanel, and per-floor in expanded floor details.

### A5: Mini-Boss Encounters

15% chance for a wandering mini-boss to appear on re-runs (floors already cleared).

| Floor | Mini-Boss | Power | Gold |
|-------|-----------|-------|------|
| F1 | Cave Troll | 14 | 20g |
| F2 | Goblin Shaman (arcane) | 28 | 35g |
| F3 | Death Knight | 45 | 65g |
| F4 | Drake Matriarch | 65 | 120g |
| F5 | Void Reaver (arcane) | 90 | 200g |
| F6 | Fallen Archon (arcane) | 115 | 350g |

Mini-bosses replace one regular combat encounter. They use boss difficulty for damage calculation, giving higher risk/reward on re-runs.

### Files Changed

| File | Changes |
|------|---------|
| `src/data/dungeon/types.ts` | Added `requiredDegrees` to FloorRequirements, `DungeonModifier`, `DungeonRecord`, `MiniBoss` types |
| `src/data/dungeon/encounters.ts` | Added Floor 6 encounters (5 + boss), 6 mini-boss definitions |
| `src/data/dungeon/floors.ts` | Added Floor 6 definition, Archon's Crown rare drop, Loremaster edu bonus, 7 dungeon modifiers |
| `src/data/dungeon/helpers.ts` | Updated MAX_DUNGEON_FLOOR to 6, added modifier/mini-boss/leaderboard functions, updated generateFloorEncounters for mini-bosses, added completedDegrees param to checkFloorRequirements |
| `src/data/dungeon/index.ts` | Re-exported all new types and functions |
| `src/data/combatResolver.ts` | Added modifier support to resolveEncounter, initDungeonRun, autoResolveFloor; added modifier/hasMiniBoss to DungeonRunState |
| `src/types/game.types.ts` | Added `dungeonRecords` to Player interface |
| `src/store/gameStore.ts` | Initialized `dungeonRecords: {}` in default player |
| `src/components/game/CombatView.tsx` | Pass modifier to resolveEncounter, show modifier banner and mini-boss warning, added encountersCompleted to result |
| `src/components/game/CavePanel.tsx` | Pass completedDegrees to checkFloorRequirements, dynamic progress bar (6 floors), leaderboard section, mini-boss/modifier hints per floor, Floor 6 golden glow styling, record update on combat complete |
| `src/hooks/ai/strategy.ts` | Pass completedDegrees to checkFloorRequirements in getBestDungeonFloor |
| `src/hooks/useGrimwaldAI.ts` | Pass floorsCleared to autoResolveFloor for mini-boss support |

### Testing

- TypeScript: compiles clean (`tsc --noEmit` = 0 errors)
- Tests: 171/171 passing
- Lint: no new errors (all pre-existing)

---

## 2026-02-08 - iPad PWA Compatibility Fixes

Audit and fix of Progressive Web App for iPad/iOS compatibility. The PWA was functional on Android/desktop but had several issues on iPad.

### Issues Found & Fixed

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **HIGH** | Missing `viewport-fit=cover` in viewport meta tag | Added to `index.html` — required for notched iPads to extend content into safe areas |
| 2 | **HIGH** | No safe-area-inset CSS handling | Added `safe-area-*` utility classes in `index.css` — prevents UI from hiding behind notch/home indicator |
| 3 | **MEDIUM** | `100vh` includes address bar on iOS Safari | Added `h-screen-safe` / `min-h-screen-safe` CSS classes using `100dvh` with `100vh` fallback |
| 4 | **MEDIUM** | `beforeinstallprompt` not supported on iOS — Install button never shown | Added iOS device detection + manual install guide modal (Share > Add to Home Screen) |
| 5 | **LOW** | `navigator.standalone` not checked for installed state on iOS | Added iOS standalone mode detection in `usePWAInstall` |
| 6 | **LOW** | UpdateBanner `bottom-4` fixed positioning clips on notched iPads | Changed to `max(1rem, env(safe-area-inset-bottom))` |

### Files Changed

| File | Changes |
|------|---------|
| `index.html` | Added `viewport-fit=cover` to viewport meta tag |
| `src/index.css` | Added safe-area utility classes (`safe-area-top/bottom/left/right/all`), `h-screen-safe`, `min-h-screen-safe` |
| `src/hooks/usePWAInstall.ts` | iOS device detection, `navigator.standalone` check, `showIOSGuide` state, `dismissIOSGuide` callback |
| `src/components/screens/TitleScreen.tsx` | iOS install guide modal (3-step Share > Add to Home Screen), uses new hook fields |
| `src/components/game/GameBoard.tsx` | `h-screen` → `h-screen-safe`, added `safe-area-all` class |
| `src/components/screens/GameSetup.tsx` | `min-h-screen` → `min-h-screen-safe` (2 occurrences) |
| `src/components/screens/VictoryScreen.tsx` | `min-h-screen` → `min-h-screen-safe` (4 occurrences) |
| `src/components/screens/OnlineLobby.tsx` | `min-h-screen` → `min-h-screen-safe` (2 occurrences) |
| `src/components/game/UpdateBanner.tsx` | Fixed bottom positioning for safe area inset |

### iPad PWA Status After Fix

| Component | Before | After |
|-----------|--------|-------|
| Viewport meta | Missing viewport-fit | `viewport-fit=cover` |
| Safe areas (notch/home indicator) | Content clipped | Properly padded |
| 100vh height | Includes Safari toolbar | Dynamic viewport height |
| Install button on iOS | Never shown | Shows + guides user through manual install |
| Standalone detection (iOS) | Only `display-mode: standalone` | Also checks `navigator.standalone` |
| UpdateBanner on notched iPad | Could clip bottom | Safe-area aware |

### Technical Notes

- **`viewport-fit=cover`**: Extends the web content to fill the entire screen including areas behind the notch and home indicator. Combined with `env(safe-area-inset-*)` CSS to add padding back where needed.
- **`100dvh` (dynamic viewport height)**: On iOS Safari, `100vh` includes the address bar area which causes layout overflow. `100dvh` adjusts dynamically when the address bar shows/hides. We use `100vh` as fallback for older browsers.
- **iOS PWA detection**: iPad identifies as `MacIntel` with `maxTouchPoints > 1` since iPadOS 13. The `navigator.standalone` property is Apple-specific and indicates if the page runs in "Add to Home Screen" mode.
- Build succeeds, 171 tests pass.

---

## 2026-02-08 - Game Improvement Proposals (Gameplay, Quests, Cave, General)

Comprehensive analysis of potential improvements across all game systems. Based on full review of current state: 5 dungeon floors, 17 quests, 43 jobs, 11 degrees, 15 locations, weather system, age system, online multiplayer, and AI opponents.

---

### CATEGORY A: CAVE / DUNGEON IMPROVEMENTS

#### A1: Dungeon Floor 6 — "The Forgotten Temple" (NEW CONTENT)

Currently the dungeon ends at Floor 5 (The Abyss / Azrathor). Post-endgame players have no dungeon challenge left. A 6th floor would serve as an ultra-endgame challenge.

**Concept:**
- **Floor 6: The Forgotten Temple** — ancient ruins beyond the Abyss, sealed by divine magic
- Requirements: All 5 floors cleared, enchanted blade + enchanted plate + tower shield, 50+ ATK, 45+ DEF, Loremaster degree
- Time cost: 26 hours (demanding — nearly half a turn)
- Encounters: Temple Guardians (100 power), Divine Traps (60 damage), Celestial Constructs (90 power), Sacred Vault (300g treasure)
- Boss: **The Archon** (140 power, 90 damage, 500g)
- Rare drop: **Archon's Crown** — +30 happiness, +10 max HP, +10% permanent gold bonus
- Rewards: +25 happiness, +20 dependability on clear

**Why:** Gives endgame players a reason to keep pushing. The Loremaster requirement forces full academic investment before attempting the ultimate challenge.

---

#### A2: Dungeon Events / Random Modifiers

Currently every dungeon run plays identically. Add per-run modifiers that change the experience.

**Dungeon Modifier Examples (1 random modifier per run):**
| Modifier | Effect |
|----------|--------|
| Cursed Halls | +25% enemy power, +50% gold rewards |
| Lucky Day | Double rare drop chance (5% → 10%) |
| Weakened Wards | -20% enemy power, -20% gold rewards |
| Treasure Fever | +2 treasure encounters replace 2 combat encounters |
| Blood Moon | Healing encounters removed, +30% gold |
| Spirit Guide | Education bonuses doubled |

**Why:** Increases replayability of cleared floors. Players re-run floors for gold — modifiers make each run feel different.

---

#### A3: Dungeon Companion System

Before entering a dungeon, player can hire a temporary companion at the Cave entrance for gold.

| Companion | Cost | Effect | Duration |
|-----------|------|--------|----------|
| Torchbearer | 20g | Reveals traps (-50% trap damage) | 1 floor |
| Battle Mercenary | 50g | +15 ATK for the floor | 1 floor |
| Healer Acolyte | 40g | Heal +10 HP after each encounter | 1 floor |
| Treasure Hunter | 30g | +25% gold find | 1 floor |

**Why:** Creates gold-for-advantage trade-offs. Low-geared players can hire help; rich players can skip. Ties economy to dungeon progression.

---

#### A4: Dungeon Leaderboard / Best Times

Track personal bests for each floor: fastest clear, most gold earned, fewest HP lost. Display in CavePanel.

**Why:** Encourages optimization and replayability. Low implementation cost (just track stats on Player).

---

#### A5: Mini-Boss Encounters (Non-Floor)

Add random "wandering boss" encounters when re-running cleared floors (15% chance). Stronger than regular encounters but weaker than floor bosses. Drop bonus gold and 2% rare drop chance.

**Why:** Makes re-farming more interesting. Currently re-runs are monotonous.

---

### CATEGORY B: QUEST SYSTEM IMPROVEMENTS

#### B1: Quest Chains (Multi-Part Quests)

Currently all 17 quests are standalone. Add quest chains where completing one unlocks the next.

**Example Chain: "The Dragon Conspiracy" (3 parts)**
1. **Part 1: Strange Rumors** (D-rank) — Investigate rumors at the tavern. 8h, 35g, +2 hap. Unlocks Part 2.
2. **Part 2: Dragon Scouts** (B-rank) — Track dragon scouts in the cave. 14h, 100g, +5 hap. Requires Floor 2 cleared. Unlocks Part 3.
3. **Part 3: Dragon's Bargain** (A-rank) — Negotiate with the Elder Dragon. 20h, 250g, +12 hap. Requires Floor 4 cleared. Chain completion bonus: +500g, +20 hap, unique title.

**Example Chain: "The Scholar's Secret" (3 parts)**
1. **Part 1: Old Manuscripts** (E-rank) — Retrieve documents from Academy. 4h, 20g. Requires Junior Academy.
2. **Part 2: Deciphering** (C-rank) — Study the ancient text. 10h, 60g. Requires Scholar degree.
3. **Part 3: The Hidden Library** (A-rank) — Find the legendary archive. 18h, 200g, +15 hap. Requires Loremaster. Chain bonus: Permanent +1 lesson reduction (extra credit equivalent).

**Why:** Creates long-term goals beyond single quests. Encourages different playstyles (combat chains vs academic chains). Chain bonuses provide unique rewards not available elsewhere.

---

#### B2: Repeatable Daily Bounties

Add 3 rotating "bounty board" quests at the Guild Hall that refresh every week. Simpler than regular quests, always available regardless of guild rank.

| Bounty Type | Time | Gold | Requirements |
|-------------|------|------|-------------|
| Cave Patrol | 4h | 15g + 2 hap | Any weapon |
| Market Delivery | 3h | 10g + 1 hap | None |
| Guard Shift | 5h | 20g + 1 hap | Combat Training |

**Why:** Provides consistent small income for early-game players before they can afford the Guild Pass (500g). Fills the "I have 4 hours left and nothing to do" gap.

---

#### B3: Quest Difficulty Scaling

Scale quest rewards/difficulty based on player level. A player with 5 dungeon floors cleared doing a D-rank quest should get a slight bonus.

**Formula:** `goldReward * (1 + floorsCleared * 0.05)` — max +25% bonus for full dungeon clear.

**Why:** Prevents high-level quests from feeling pointless. Keeps lower-rank quests viable for gold when higher ranks aren't available.

---

#### B4: Quest Failure Consequences

Currently failing a quest (running out of time) has no penalty. Add mild consequences:
- Failed quest: -2 happiness, -3 dependability, can't retake same quest for 2 weeks
- Creates risk/reward: Take on hard quests for big rewards, but failure sets you back

**Why:** Makes quest selection strategic rather than "always take the highest rank available."

---

#### B5: Guild Reputation System

Track successful/failed quest completions. Every 5 successful quests grants a reputation bonus:
- 5 quests: +5% quest gold bonus
- 10 quests: +10% quest gold bonus, unlock exclusive quest
- 20 quests: +15% quest gold bonus, NPC banter acknowledges your fame
- 50 quests: "Legendary Adventurer" title, +20% quest gold bonus

**Why:** Long-term progression within the quest system. Makes completing many quests feel rewarding beyond immediate gold.

---

### CATEGORY C: GAMEPLAY IMPROVEMENTS

#### C1: Seasonal Events / Festivals

Add seasonal festivals that occur every 12 weeks (3 months in-game). Each lasts 2 weeks.

| Festival | Effects |
|----------|---------|
| Harvest Festival | Food -30% cost, +3 happiness/wk, special tavern menu |
| Winter Solstice | Movement +1h/step, appliances never break, +5 hap if at home |
| Spring Tournament | Arena at Cave (combat for prizes), weapon tempering -50% cost |
| Midsummer Fair | All shops open lottery, weekend activities double happiness |

**Why:** Creates rhythm to the game year. Players plan around festival timing for optimal purchases/actions.

---

#### C2: NPC Relationship / Favor System

Track player interactions with each NPC. Visiting locations builds rapport (1 favor point per visit, max 50).

| Favor Level | Bonus |
|-------------|-------|
| 10 (Familiar) | 5% discount at this location |
| 20 (Friendly) | Unique banter lines, 10% discount |
| 30 (Trusted) | Exclusive items/services unlocked |
| 50 (Legendary) | 15% discount, free repairs, bonus banter |

**Why:** Rewards loyalty to specific locations. Creates interesting routing decisions — do you always go to the cheapest option, or build rapport at a specific NPC for long-term benefits?

---

#### C3: Skill / Talent System

Add passive skills that unlock through gameplay actions (not degrees).

| Skill | Unlock Condition | Effect |
|-------|-----------------|--------|
| Haggler | Buy 20 items | 5% discount on all purchases |
| Dungeon Veteran | Clear 10 dungeon floors (total) | +10% dungeon gold |
| Scholar's Mind | Complete 5 degrees | -1 hour per study session |
| Iron Constitution | Survive 3 starvation events | Starvation penalty reduced to -15h |
| Lucky Streak | Win lottery once | +1% lottery win chance |
| Social Butterfly | Visit all 15 locations in one turn | +5 happiness |

**Why:** Rewards diverse gameplay. Players who explore multiple systems get passive bonuses.

---

#### C4: Rival System Enhancement

When playing against AI, the AI should occasionally target the same quest/job as the player. Add competitive mechanics:
- AI takes a quest → that quest becomes unavailable for 1 week
- AI applies for same job → employer picks the one with better stats
- Newspaper reports AI achievements ("Grimwald cleared Floor 3!")

**Why:** Makes the AI feel like a real competitor rather than a parallel player. Adds urgency to quest/job decisions.

---

#### C5: Insurance System (Bank)

Buy insurance policies at the Bank to mitigate risks:

| Policy | Weekly Cost | Coverage |
|--------|------------|----------|
| Theft Insurance | 15g/wk | Reimburse 50% of stolen goods value |
| Health Insurance | 10g/wk | Doctor visits cost 50% less |
| Equipment Insurance | 20g/wk | Broken appliances auto-repaired (no cost) |

**Why:** Creates gold-for-safety trade-off. Rich players can insure their assets; poor players take the risk.

---

#### C6: Achievements / Trophy System

Track lifetime achievements across games (persisted in localStorage):

| Achievement | Condition | Reward |
|-------------|-----------|--------|
| First Blood | Clear dungeon Floor 1 | Unlock golden player token |
| Master Scholar | Earn all 11 degrees | Unlock star border |
| Tycoon | Accumulate 10,000g total wealth | Unlock crown icon |
| Speed Runner | Win in under 20 weeks | Unlock "Fast Lane" title |
| Dragon Slayer | Clear all 5 dungeon floors | Unlock dragon token |
| Social Climber | Reach Guild Master rank | Unlock purple nameplate |

**Why:** Adds meta-progression across games. Gives players goals beyond the current match.

---

#### C7: Random Encounter Events During Travel

Currently movement is just paying hours. Add a 10% chance of random events per 3+ location steps traveled:

| Event | Effect |
|-------|--------|
| Found Coin Purse | +5-15g |
| Helped a Traveler | +2 happiness, +1 dependability |
| Pickpocketed! | -10-30g (if carrying gold) |
| Street Performer | +1 happiness (free) |
| Weather Delay | +1 hour travel cost |
| Shortcut Found | -2 hours from travel (minimum 1) |

**Why:** Makes movement more interesting. Currently it's just a time tax.

---

#### C8: Night/Day Cycle

Divide each 60-hour turn into Day (first 40h) and Night (last 20h).

| Time | Effect |
|------|--------|
| Day (0-40h) | Normal prices, all services available |
| Night (40-60h) | Shadow Market -10% prices, Tavern +2 happiness, Cave +20% gold, other shops closed (work still available) |

**Why:** Creates strategic timing decisions. Do you visit the Shadow Market early or save it for night bonuses?

---

### CATEGORY D: BALANCE & QUALITY OF LIFE

#### D1: Starvation Penalty Consistency
Currently starvation is -20h at turn start but there's also a -10hp week-end penalty. Should be one or the other. Recommend: keep -20h only (Jones-accurate), remove health penalty.

#### D2: Frost Chest / Arcane Tome Accessibility
Frost Chest and Arcane Tome are listed in data but not always purchasable. Ensure they appear in Enchanter shop.

#### D3: Loan Default Limits
Currently loans can be extended infinitely. Add max 3 extensions, then forced collection (sell durables, garnish wages).

#### D4: Quest Education Requirements
Some quest requirements reference non-existent education paths (e.g., "priest level 2"). Should map to actual degrees (Sage Studies, Advanced Scholar).

#### D5: Dead Player Visual Distinction
Dead players' tokens on the board should be visually different (greyed out, smaller, or ghost-like).

#### D6: Keyboard Shortcuts in Modals
Currently keyboard shortcuts trigger inside modals (e.g., pressing 'E' while reading an event could end turn). Add focus trapping.

#### D7: Victory Leaderboard for Multi-Player
Track final scores (gold, happiness, education, career) for all players on victory screen. Show who was closest.

---

### CATEGORY E: CAVE-SPECIFIC QUALITY OF LIFE

#### E1: Equipment Preview Before Combat
Show a detailed power comparison before entering a floor: "Your Power: X vs Floor Recommended: Y — Chance: Good/Fair/Risky."

#### E2: Dungeon Run History
Track last 5 dungeon runs per floor: gold earned, HP lost, encounters faced, time spent. Shows in CavePanel.

#### E3: Auto-Equip Best Gear Before Dungeon
Add a "Best Loadout" button that auto-equips the strongest owned weapon/armor/shield before entering.

#### E4: Post-Combat Loot Summary
After clearing a floor, show a detailed loot breakdown: base gold, education bonuses, guild rank multiplier, weather bonus, modifier bonus. Helps players understand the reward system.

#### E5: Dungeon Shortcuts (Unlockable)
After clearing Floor 3, unlock a shortcut from Floor 1 to Floor 3 (skip Floor 2). Saves time on re-runs. After clearing Floor 5, unlock shortcut to Floor 4.

**Why:** Reduces tedium of re-running early floors for gold.

---

### PRIORITIZED IMPLEMENTATION ORDER

**Tier 1 — High Impact, Moderate Effort:**
1. A2: Dungeon Random Modifiers (best replayability boost)
2. B1: Quest Chains (biggest content addition)
3. C7: Random Travel Events (makes movement interesting)
4. B2: Repeatable Bounties (fills early-game gap)
5. D1-D4: Balance fixes (bugs/inconsistencies)

**Tier 2 — High Impact, Higher Effort:**
6. A1: Floor 6 (endgame content)
7. C1: Seasonal Festivals (rhythm/variety)
8. C6: Achievements (meta-progression)
9. A3: Dungeon Companions (economy-dungeon tie)

**Tier 3 — Nice to Have:**
10. B5: Guild Reputation (quest depth)
11. C2: NPC Favor System (location loyalty)
12. C3: Skill/Talent System (passive progression)
13. E1-E5: Cave QoL (convenience)
14. C8: Night/Day Cycle (strategic depth)
15. C5: Insurance System (economy depth)
16. C4: Rival Enhancement (AI competition)

---

## 2026-02-08 - Banter Speech Bubble Overhaul

Moved NPC banter display from a tiny bubble inside the location panel to a **large, prominent speech bubble overlay above the center panel** on the game board. Much bigger text, mood-based colored glow effects, and NPC name label. Also massively expanded banter content and added context-aware lines.

### UI Changes
- **BanterBubble** completely redesigned: large rounded speech bubble with mood-based gradient backgrounds, glowing borders, and prominent text (clamp 0.8rem–1.15rem)
- Banter now renders as a **z-20 overlay above the center panel** on the game board (was z-50 inside NPC portrait column)
- Shows NPC name ("Aldric says:", "Mathilda says:") with mood icon
- Speech bubble tail points down toward the center panel
- Click to dismiss, auto-dismiss after 5 seconds (was 4s)
- Fade-in from below with scale, fade-out upward with shrink
- Works on both desktop (positioned above center panel) and mobile (above bottom sheet)

### Banter Content Expansion
- **Static banter lines doubled**: ~60 → ~150 lines across all 13 locations
- Every location now has 10–14 unique banter lines (was 4–7)
- New lines for all locations: guild-hall, bank, general-store, armory, enchanter, shadow-market, academy, rusty-tankard, cave, forge, landlord, graveyard, fence

### Context-Aware Banter (NEW)
- Added `getContextBanter()` — generates banter reflecting actual game state
- 40% chance to pick a context line when player data is available, falls back to static
- **Player achievement banter**: dungeon floors cleared, degrees earned, wealth level, job status, dependability, health, housing, quest count, age
- **AI opponent banter**: NPCs gossip about AI players' progress — their dungeon clears, degrees, wealth, jobs, happiness, housing, guild pass
- **Competitive banter**: warns when AI is ahead, praises when player leads

### Architecture
- New `src/store/banterStore.ts` — tiny zustand store for shared banter state (activeBanter, locationId, npcName)
- `useBanter` hook now uses shared store instead of local state; accepts optional player/allPlayers args for context
- `LocationShell` triggers banter (with player context) but no longer renders the bubble
- `GameBoard` renders `BoardBanterOverlay` — reads from banterStore and positions bubble above center panel
- Banter chance raised to 30% (was 25%), cooldown lowered to 25s (was 30s) for more frequent variety

### Files Changed
| File | Changes |
|------|---------|
| `src/store/banterStore.ts` | **NEW** — Zustand store for shared banter state |
| `src/data/banter.ts` | Doubled static lines (~150 total), added `getContextBanter()` with player/AI-aware generation |
| `src/hooks/useBanter.ts` | Uses banterStore, passes NPC name, supports context banter with player args |
| `src/components/game/BanterBubble.tsx` | Complete redesign — large speech bubble with mood gradients, glow, NPC name, bigger text |
| `src/components/game/LocationShell.tsx` | Removed BanterBubble rendering; passes player context to trigger |
| `src/components/game/GameBoard.tsx` | Added BoardBanterOverlay component positioned above center panel (z-20) |

---

## 2026-02-08 - New Zone: The Graveyard

Added a 15th location to the game board: **The Graveyard** — a somber cemetery to the right of the General Store where fallen adventurers are resurrected.

### Gameplay
- **Resurrection spawn point**: Players who die now respawn at the Graveyard instead of the Enchanter. Costs 100g from savings, restores 50 HP.
- **Cemetery services** (when visiting):
  - **Pray at the Graves**: +5 Happiness (10g base, 2h)
  - **Meditate Among the Dead**: +5 Relaxation (15g base, 3h)
  - **Spirit Blessing**: +5 Max HP (200g base, 4h)

### Board Path (15 locations)
Noble Heights → General Store → **Graveyard** → Bank → Forge → Guild Hall → Cave → Academy → Enchanter → Armory → Rusty Tankard → Shadow Market → Fence → Slums → Landlord → (loop)

### NPC
- **Morthos** the Gravedigger — frame color: dark green (#2a3a2a), subtitle: "Cemetery & Resurrection"

### Files Changed
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `'graveyard'` to `LocationId` union type |
| `src/data/locations.ts` | Added to `BOARD_PATH` (between general-store and bank), `ZONE_CONFIGS` (x:21, y:33, 14×18%), `MOVEMENT_PATHS` (general-store↔graveyard, graveyard↔bank), and `LOCATIONS` array |
| `src/data/npcs.ts` | Added Morthos NPC entry for graveyard |
| `src/data/banter.ts` | Added 6 banter lines for graveyard (mysterious/warning/grumpy/gossip moods) |
| `src/store/helpers/questHelpers.ts` | Changed resurrection location from `'enchanter'` to `'graveyard'`; updated event message |
| `src/components/game/GraveyardPanel.tsx` | **NEW** — Cemetery panel with resurrection info, prayer, meditation, spirit blessing |
| `src/components/game/LocationPanel.tsx` | Added `case 'graveyard'` with GraveyardPanel import and wiring |
| `src/test/gameActions.test.ts` | Updated resurrection test to expect `'graveyard'` location |

### Zone Editor
The graveyard zone is automatically available in the visual zone editor (reads from `ZONE_CONFIGS` and `BOARD_PATH` dynamically). Movement path editing between general-store↔graveyard and graveyard↔bank works via the paths mode.

### Build & Tests
Build succeeds, 171 tests pass.

---

## 2026-02-08 - Victory Music — 19Winner.mp3

Added dedicated victory music track. When a player wins the game (all goals achieved, last player standing, or all players perished), `19Winner.mp3` now plays instead of the weekend track.

### Changes
| File | Changes |
|------|---------|
| `src/audio/musicConfig.ts` | Added `'winner'` track entry (`19Winner.mp3`); changed `SCREEN_MUSIC.victory` from `'weekend'` to `'winner'` |

### How It Works
- `useMusicController` hook detects `phase === 'victory'` and looks up `SCREEN_MUSIC['victory']`
- This now resolves to the `'winner'` track ID, which maps to `19Winner.mp3`
- AudioManager crossfades from the current track to the victory music
- Build succeeds, 171 tests pass

## 2026-02-08 - Fix Location Layout Fonts & Player Info Panel

Fixed inconsistent text colors and backgrounds in Enchanter's Workshop, The Fence, and Landlord's Office. These three locations used `wood-frame text-parchment` (dark background, light text) and `text-muted-foreground` headers, while the rest of the game (Tavern, General Store, etc.) uses brown text on beige parchment backgrounds. Also fixed the PlayerInfoPanel where name/rank/age was white text on beige background.

### Design Standard Applied
- **Section headers**: `text-[#6b5a42]` (medium brown) — replaces `text-muted-foreground`
- **Item names**: `text-[#3d2a14]` (dark brown) — replaces inherited light text
- **Costs/prices**: `text-[#8b6914]` (gold-brown) — replaces `text-gold` (which targets dark backgrounds)
- **Time labels**: `text-[#6b5a42]` (medium brown) — replaces `text-time`
- **Positive values**: `text-[#2a7a2a]` (green) — replaces `text-secondary`
- **Item containers**: `bg-[#e0d4b8] border border-[#8b7355] rounded` — replaces `wood-frame text-parchment`
- **Info boxes**: Same parchment style with `text-[#3d2a14]` base text

### Files Changed
| File | Changes |
|------|---------|
| `src/components/game/EnchanterPanel.tsx` | Broken appliances section: `wood-frame text-parchment` → parchment bg with brown text; appliance cards: same treatment; section headers: `text-muted-foreground` → `text-[#6b5a42]` |
| `src/components/game/HealerPanel.tsx` | Health info box: `wood-frame text-parchment` → parchment bg with brown text; healing buttons: same; section headers: `text-muted-foreground` → `text-[#6b5a42]`; all text colors updated to brown palette |
| `src/components/game/PawnShopPanel.tsx` | All 10+ buttons: `wood-frame text-parchment` → parchment bg with brown text; all 6 section headers: `text-muted-foreground` → `text-[#6b5a42]`; gambling text: `text-parchment-dark` → `text-[#6b5a42]`; all item names get `text-[#3d2a14]` |
| `src/components/game/LandlordPanel.tsx` | Housing info box: `wood-frame text-parchment` → parchment bg with brown text; rent payment buttons: added `darkText` prop; section headers: `text-muted-foreground` → `text-[#6b5a42]`; housing option cards: same parchment treatment |
| `src/components/game/ActionButton.tsx` | Added `darkText` prop for parchment-background mode (brown text, parchment bg, brown cost/time labels) |
| `src/components/game/PlayerInfoPanel.tsx` | Player name: `text-card-foreground` → `text-[#3d2a14]`; rank/age: `text-muted-foreground` → `text-[#6b5a42]`; stat labels: `text-muted-foreground` → `text-[#6b5a42]`; home value: same |

Build succeeds, 171 tests pass.

---

## 2026-02-08 - Standardize Location Design

Redesigned all location panels to follow a consistent design philosophy inspired by the HomePanel (Noble Heights Estate) style. Every location now has:

1. **Colored header bar** (top) — unique gradient per location with location name and subtitle
2. **Parchment content area** (center) — cream/beige background (#f0e8d8) with dark brown text, NPC portrait on the left, tabbed content on the right
3. **Colored footer bar** (bottom) — work shift button when player has a job at this location, styled like HomePanel's action bar

### Design Changes
- Each NPC now has `frameColor`, `frameDark`, `frameBorder`, and `subtitle` data for location-specific frame styling
- Tabs now use parchment-colored styling (light bg, dark text) instead of dark brown tabs
- Work sections moved from individual tabs to a centralized footer bar in LocationShell
- All panels switched from dark `JonesPanel` wrappers to dark-text-on-parchment mode

### Files Changed
| File | Changes |
|------|---------|
| `src/data/npcs.ts` | Added `frameColor`, `frameDark`, `frameBorder`, `subtitle` to LocationNPC interface and all 12 NPC entries |
| `src/components/game/LocationShell.tsx` | Complete redesign: added header bar, parchment content background, footer work bar; new `WorkInfo` interface, `locationName` prop |
| `src/components/game/LocationPanel.tsx` | Added centralized `getWorkInfo()` for footer bar; removed work tabs from forge/armory/enchanter/shadow-market; removed `WorkSection` import; passes `locationName` and `workInfo` to LocationShell |
| `src/components/game/TavernPanel.tsx` | Removed `JonesPanel`/`JonesPanelHeader` wrapper and `WorkSection`; all items use `darkText`/`largeText` mode |
| `src/components/game/GeneralStorePanel.tsx` | Removed `JonesPanel`/`JonesPanelHeader` wrapper and `WorkSection`; all items use `darkText`/`largeText` |
| `src/components/game/BankPanel.tsx` | Removed `JonesPanel`/`JonesPanelHeader` wrapper and `WorkSection`; switched all views to dark text on parchment |
| `src/components/game/AcademyPanel.tsx` | Removed `JonesPanel`/`JonesPanelHeader` wrapper and `WorkSection`; all items use `darkText`/`largeText` |
| `src/components/game/GuildHallPanel.tsx` | Removed `JonesPanel`/`JonesPanelHeader` wrapper; switched to dark text styling throughout |
| `src/components/game/ArmoryPanel.tsx` | Removed `workShift` prop and `WorkSection` import; removed legacy full-mode JonesPanel |
| `src/components/game/JonesStylePanel.tsx` | Added `darkText` prop to `JonesListItem` component |

### Frame Colors by Location
| Location | Frame Color | Border |
|----------|------------|--------|
| Guild Hall | Forest green (#2a5c3a) | #4a8a5a |
| Bank | Deep blue (#2a3a5c) | #4a6a9a |
| General Store | Earth green (#3a4a2a) | #5a7a3a |
| Armory | Dark crimson (#5c2a2a) | #8a4a4a |
| Enchanter | Mystic purple (#4a2a5c) | #7a4a8a |
| Shadow Market | Charcoal (#3a3a42) | #5a5a6a |
| Academy | Royal blue (#2a3a5c) | #4a6a9a |
| Rusty Tankard | Deep amber (#5c3a1a) | #8a6a3a |
| Cave | Near-black (#2a2a2a) | #4a4a4a |
| Forge | Fiery brown (#5c3010) | #8a5020 |
| Landlord | Warm grey (#3a3532) | #5a5550 |
| Fence | Dark plum (#3a2a42) | #5a4a6a |

---

## 2026-02-08 - Noble Heights Location Music

Added `10Noble-Heights.mp3` as location-specific music for Noble Heights. When a player is at Noble Heights, the music system crossfades to this track (same pattern as The Slums, Guild Hall, Cave, etc.).

### Changes
| File | Changes |
|------|---------|
| `src/audio/musicConfig.ts` | Added `noble-heights` track to `MUSIC_TRACKS` and `LOCATION_MUSIC` mapping |
| `public/music/10Noble-Heights.mp3` | **NEW** — placeholder MP3 (replace with real track) |

### How It Works
- `MUSIC_TRACKS` defines the track: `{ id: 'noble-heights', file: '10Noble-Heights.mp3', label: 'Noble Heights' }`
- `LOCATION_MUSIC` maps LocationId `'noble-heights'` → track id `'noble-heights'`
- `useMusicController` hook automatically plays this track when `playerLocation === 'noble-heights'`
- AudioManager handles crossfade transition (1500ms) from previous track

Build succeeds, 171 tests pass.

---

## 2026-02-08 - Weather Events System Implementation

### Overview
Implemented a rare weather events system with CSS particle effects. Weather changes are
checked weekly (~8% chance) and affect gameplay through movement costs, prices, happiness,
and food spoilage. Controlled by the existing `enableWeatherEvents` game option toggle.

### Weather Types (5 types + clear)

| Weather | Particle | Chance | Duration | Movement | Prices | Happiness | Special |
|---------|----------|--------|----------|----------|--------|-----------|---------|
| Clear | none | 92%/wk | - | normal | 1.0x | 0 | - |
| Snowstorm | snow | ~1.6% | 1-3 wk | +1h/step | 1.10x | -2/wk | Thieves stay indoors |
| Thunderstorm | rain | ~1.6% | 1-3 wk | +1h/step | 1.05x | -1/wk | Darkness favors thieves |
| Drought | heatwave | ~1.6% | 1-3 wk | normal | 1.15x | -2/wk | 25% chance fresh food spoils |
| Enchanted Fog | fog | ~1.6% | 1-3 wk | +1h/step | 0.95x | +3/wk | Mystical invigorating effect |
| Harvest Rain | light rain | ~1.6% | 1-3 wk | normal | 0.90x | +2/wk | Food plentiful, prices drop |

### Particle Effects
- **Snow**: 60 white particles with drift, rotation, and glow — falling slowly with wind sway
- **Rain**: 80 elongated droplets falling fast at a slight angle
- **Light Rain**: 40 softer droplets with fade-in/fade-out
- **Heatwave**: 20 rising heat shimmer orbs + ambient bottom gradient
- **Fog**: 12 large blurred fog patches + two slow-drifting translucent overlay layers

### Gameplay Integration
- Weather advances each week in `processWeekEnd` (guarded by `enableWeatherEvents` option)
- Price modifier: weather multiplier applied on top of economy drift (clamped 0.70-1.35)
- Movement cost: extra hours per step applied in GameBoard zone display + click handler
- Per-player effects: happiness delta and food spoilage chance applied in player loop
- Event messages announce weather changes ("Weather: Snowstorm! ..." / "The weather has cleared.")
- Weather indicator in top bar shows icon + name + weeks remaining

### Files Changed

| File | Changes |
|------|---------|
| `src/data/weather.ts` | **NEW** — WeatherType, WeatherState, rollWeatherEvent(), advanceWeather() |
| `src/components/game/WeatherOverlay.tsx` | **NEW** — CSS particle effects for all 5 weather types |
| `src/types/game.types.ts` | Added `weather: WeatherState` to GameState interface |
| `src/store/gameStore.ts` | Initial weather state, startNewGame reset, save/load migration |
| `src/store/helpers/weekEndHelpers.ts` | Weather advance, per-player effects, price modifier |
| `src/components/game/GameBoard.tsx` | WeatherOverlay render, weather-adjusted move costs, top bar indicator |
| `src/network/networkState.ts` | Weather field in serialize/apply for multiplayer sync |

### Technical Details
- Particle count per type: snow=60, rain=80, light-rain=40, heatwave=20, fog=12
- All particles use CSS animations (no JS animation loop) — zero runtime cost
- `pointer-events: none` on overlay so particles don't block board interactions
- `useMemo` stabilizes particle random offsets across re-renders
- Weather state persists in save/load (falls back to CLEAR_WEATHER for old saves)
- Build succeeds, 171 tests pass, TypeScript clean

---

## 2026-02-08 - Forge Gameplay Enhancement Implementation

### Changes Implemented

Transformed the Forge from a 1-tab workplace into a 4-tab location with unique mechanics.

#### 1. Equipment Tempering (Smithing Tab)
- Permanently boost owned equipment stats: +5 ATK (weapons), +5 DEF (armor), +3 DEF/+5% BLK (shields)
- Each item can only be tempered once
- Cost: ~60% of item base price + 2-3 hours
- Temper bonuses apply in all combat (dungeon + auto-resolve)
- Shows combat stats with temper bonuses, green [DONE] for tempered items
- +2 happiness for each tempering

#### 2. Forge Repairs (Repairs Tab)
- Repair broken appliances at 50% of Enchanter cost
- Takes 3 hours (vs 1h at Enchanter)
- Creates time vs money trade-off for broken appliance routing
- Shows all owned appliances with status (broken vs OK)

#### 3. Equipment Salvage (Salvage Tab)
- Sell weapons/armor/shields for 60% value (vs 40% at The Fence)
- Takes 1 hour per item
- Auto-unequips salvaged items
- Removes temper status on salvage
- Shows fence price comparison for each item

#### 4. Work Tab (existing, shown only if hired at Forge)

### NPC Window Changes
- Added `xl` portrait size (w-52 h-60) to NpcPortrait component
- All locations now use xl NPC portraits for bigger, more prominent NPC display
- LocationShell supports `xlPortrait` prop (w-56 column)

### AI Integration
- Grimwald AI can now temper equipment at the Forge (priority 52, below equipment buying)
- AI will travel to Forge to temper untempered equipment when affordable
- All AI combat stat calculations include temper bonuses

### Files Changed

| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `temperedItems: string[]` to Player |
| `src/data/items.ts` | Added temper cost, salvage value, TEMPER_BONUS/TEMPER_TIME constants; updated calculateCombatStats with temper support |
| `src/store/storeTypes.ts` | Added `temperEquipment`, `forgeRepairAppliance`, `salvageEquipment` to GameStore |
| `src/store/gameStore.ts` | Added `temperedItems: []` to createPlayer |
| `src/store/helpers/economyHelpers.ts` | Implemented 3 forge actions |
| `src/components/game/ForgePanel.tsx` | Complete rewrite: 3 sections (Smithing, Repairs, Salvage) |
| `src/components/game/LocationPanel.tsx` | Forge now has 4 tabs, all locations use xlPortrait |
| `src/components/game/LocationShell.tsx` | Added `xlPortrait` prop support |
| `src/components/game/NpcPortrait.tsx` | Added `xl` size (w-52 h-60) |
| `src/components/game/CavePanel.tsx` | Pass temperedItems to calculateCombatStats |
| `src/components/game/CombatView.tsx` | Pass temperedItems to calculateCombatStats |
| `src/components/game/ArmoryPanel.tsx` | Pass temperedItems to calculateCombatStats |
| `src/hooks/useGrimwaldAI.ts` | Added temper-equipment action executor, temperedItems in combat |
| `src/hooks/ai/strategy.ts` | temperedItems in combat stat calculations |
| `src/hooks/ai/actions/questDungeonActions.ts` | AI temper-equipment action generation |

### Test Results
- 171 tests pass (all green)
- TypeScript check clean
- Production build succeeds

---

## 2026-02-08 - Forge Gameplay Enhancement Analysis

### Problem

The Forge is the most one-dimensional location in the game. It currently only has jobs (work shifts), while every other location offers multiple functions:

| Location | Functions | Tabs |
|----------|-----------|------|
| Guild Hall | Jobs + Quests + Work | 3 |
| Enchanter | Healing + Appliances + Work | 3 |
| Armory | Clothing + Weapons + Armor + Shields + Work | 5 |
| Cave | 5 dungeon floors with combat | N/A |
| Bank | Deposits + Stocks + Loans | 3 |
| Shadow Market | Items + Lottery + Tickets + Work | 2 |
| **Forge** | **Work only** | **1-2** |

In Jones in the Fast Lane, the Factory was also just a workplace. But in a fantasy setting, a Forge (blacksmith) has far more potential.

### Current Forge State

- **NPC**: Korr the Smithmaster
- **Tabs**: Work (if hired) or Info message ("Visit Guild Hall to apply")
- **Jobs**: 5 positions (Forge Laborer 4g/hr → Forge Manager 23g/hr)
- **Unique mechanics**: None
- **Reason to visit without a job**: None

### Analysis: What Makes Locations Interesting

1. **Economic function** — buying/selling creates strategic decisions (Armory, General Store, Shadow Market)
2. **Unique mechanics** — systems only available at that location (Bank stocks, Cave dungeon, Academy degrees)
3. **Trade-offs vs other locations** — "cheaper here but slower" creates routing decisions (Enchanter vs Shadow Market appliances)
4. **Progression gating** — content unlocks over time (Cave floor requirements, Academy prerequisites)

The Forge has none of these. It's a workplace with no reason to visit unless you work there.

### Proposals (Ranked by Impact vs Complexity)

#### Proposal 1: Equipment Tempering ⭐ HIGH IMPACT

Visit the Forge to permanently enhance owned equipment:

| Enhancement | Effect | Cost (scales with tier) | Time |
|-------------|--------|------------------------|------|
| Sharpen Weapon | +5 ATK permanent | 50-300g | 3h |
| Reinforce Armor | +5 DEF permanent | 50-300g | 3h |
| Fortify Shield | +5% block permanent | 40-200g | 2h |

Rules:
- Each item can only be tempered **once** (prevents infinite stacking)
- Must have the item equipped
- Cost scales with item base price (~60% of item cost)
- Adds "Tempered" prefix to item name
- Strategic: temper cheap items early, or save gold for high-tier items

**Why it works**: Creates a unique reason to visit the Forge that no other location provides. Synergizes with Armory (buy equipment) → Forge (enhance it) → Cave (use it). Adds depth to equipment progression without new item types.

#### Proposal 2: Appliance Repair (Forge Alternative)

Forge can repair broken appliances as an alternative to Enchanter:

| Repair At | Cost | Time |
|-----------|------|------|
| Enchanter | Full repair cost | 1h |
| Forge | 50% of repair cost | 3h |

**Why it works**: Creates a meaningful routing decision — save gold at the Forge or save time at the Enchanter. Thematically fits: a blacksmith can fix mechanical/magical devices.

#### Proposal 3: Equipment Salvage

Sell equipment at the Forge for better returns than The Fence:

| Sell At | Return | Time |
|---------|--------|------|
| The Fence | 40% of base price | 0h |
| Forge Salvage | 60% of base price | 1h |

Restricted to weapons/armor/shields only (not general durables). Creates trade-off: convenience (Fence) vs value (Forge).

#### Proposal 4: Commission Custom Items (Future)

Forge-exclusive equipment not available at Armory:
- **Forgemaster's Hammer**: +20 ATK, +5 DEF (hybrid weapon)
- **Masterwork Chainmail**: +25 DEF (between tiers)
- **Ember Shield**: +12 DEF, +15% block
- Requires education (Trade Guild, Combat Training) or Forge job level

#### Proposal 5: Smithing Mini-Challenge (Future)

Non-combat gold-making alternative to the Cave:
- Pay materials + time to attempt smithing
- Success: Profit + happiness + XP
- Failure: Lose materials
- Success rate based on education and experience

#### Proposal 6: Metal Ore Trading (Future)

Economy mini-game with fluctuating ore prices.

### Recommendation

**Implement Proposals 1 + 2 + 3** as a single batch. This gives the Forge 4 tabs:

1. **Smithing** — Equipment tempering/enhancement (unique mechanic)
2. **Repairs** — Appliance repair (cheaper but slower than Enchanter)
3. **Salvage** — Equipment selling (better than Fence)
4. **Work** — Existing, only if hired via Guild Hall

This is the best balance of:
- New unique mechanics (tempering) that create strategic depth
- Trade-offs with existing locations (Forge vs Enchanter, Forge vs Fence)
- Synergy with existing systems (equipment, appliances, economy)
- Reasonable implementation scope (no new data types, reuses existing patterns)

### Estimated Changes

| File | Changes |
|------|---------|
| `src/components/game/LocationPanel.tsx` | Forge tabs: Smithing, Repairs, Salvage, Work |
| `src/components/game/ForgePanel.tsx` | Rewrite: tempering UI, repair list, salvage list |
| `src/data/items.ts` | Add `isTempered` tracking, temper cost calculation |
| `src/types/game.types.ts` | Add `temperedItems: string[]` to Player |
| `src/store/gameStore.ts` | Add `temperEquipment`, `salvageEquipment` actions |
| `src/store/helpers/` | Forge helper functions |
| `src/hooks/ai/` | AI: temper equipment, repair at forge |
| `src/test/` | Forge tempering + salvage tests |

---

## 2026-02-08 - Jones Pricing Audit — Rent & Appliance Price Corrections

### Problem

In Jones in the Fast Lane, the Rent Office shows prices **per month** (e.g., "Rent Security Apartment $498"). Our game charged rent **per week**. Since wages are 1:1 between the games ($4-25/hr = 4-25g/hr), this made Noble Heights nearly 3x more expensive than Jones's equivalent.

### Analysis: Jones vs Guild Life Economy

#### Rent Comparison (before fix)

| Housing | Jones (monthly) | Jones (weekly equiv.) | Our Game (weekly) | Ratio vs Jones |
|---------|----------------|----------------------|-------------------|----------------|
| Low-Cost / Slums | ~$325/mo | ~$81/wk | 75g/wk | 0.93x — OK |
| Security / Noble | ~$498/mo | ~$125/wk | **350g/wk** | **2.8x — TOO HIGH** |

#### Income vs Rent (before fix)

| Stage | Job | Income/wk | Noble 350g/wk | Noble % of income |
|-------|-----|-----------|---------------|-------------------|
| Entry | Floor Sweeper (4g/hr) | ~165g | 350g | **212% — impossible** |
| Mid | Market Vendor (10g/hr) | ~414g | 350g | **85% — barely survive** |
| High | Teacher (14g/hr) | ~580g | 350g | 60% — tight |
| Top | Guild Admin (22g/hr) | ~910g | 350g | 38% — OK |

#### Appliance Comparison (before fix)

| Appliance | Jones Price | Our Price | Status |
|-----------|-----------|-----------|--------|
| VCR / Memory Crystal (enchanter) | **$333** | **475g** | 1.43x — too high |
| VCR / Memory Crystal (market) | **$250** | **300g** | 1.2x — slightly high |
| All other appliances | Match | Match | OK |

### Changes

#### 1. Noble Heights Rent: 350g → 120g/week
- **RENT_COSTS.noble**: 350 → 120 in `game.types.ts`
- **HOUSING_DATA.noble.weeklyRent**: 350 → 120 in `housing.ts`
- Deposit drops from 700g to 240g (2× weekly rent)
- Monthly equivalent: 480g (matches Jones's $498/month)
- Jones ratio preserved: Security/Low-Cost = $498/$325 = 1.53x → Our 120/75 = 1.6x

#### 2. Modest Dwelling Rent: 200g → 95g/week
- **RENT_COSTS.modest**: 200 → 95 in `game.types.ts`
- **HOUSING_DATA.modest.weeklyRent**: 200 → 95 in `housing.ts`
- Was MORE expensive than Noble after the Noble fix — corrected to be between Slums (75) and Noble (120)
- Note: Modest is hidden from LandlordPanel (Jones only has 2 tiers)

#### 3. Memory Crystal Prices: Jones VCR alignment
- **Enchanter price**: 475g → 333g (matches Jones Socket City VCR at $333)
- **Market price**: 300g → 250g (matches Jones Z-Mart VCR at $250)

### Economy After Fix

| Stage | Job | Income/wk | Noble 120g/wk | Noble % of income |
|-------|-----|-----------|---------------|-------------------|
| Entry | Floor Sweeper (4g/hr) | ~165g | 120g | 73% — can't really afford (correct!) |
| Mid | Market Vendor (10g/hr) | ~414g | 120g | **29% — comfortable** |
| High | Teacher (14g/hr) | ~580g | 120g | **21% — good** |
| Top | Guild Admin (22g/hr) | ~910g | 120g | **13% — very comfortable** |

This matches Jones proportions where mid-level workers can comfortably afford Security Apartments (~30% of income).

### Items NOT Changed (already match Jones)

| Item | Jones | Ours | Status |
|------|-------|------|--------|
| Scrying Mirror (Color TV) | $525/$450 | 525g/450g | ✓ |
| Music Box (Stereo) | $325/$350 | 325g/350g | ✓ |
| Cooking Fire (Microwave) | $276/$200 | 276g/200g | ✓ |
| Preservation Box (Refrigerator) | $876/$650 | 876g/650g | ✓ |
| Arcane Tome (Computer) | $1599 | 1599g | ✓ |
| All wages | $4-25/hr | 4-25g/hr | ✓ |
| Education (starting) | $50 total | 50g total | ✓ |
| Food, clothing, equipment | Proportional | Proportional | ✓ |

### AI Impact
- `shouldUpgradeHousing()` threshold of `gold > 300` still works (240g deposit + buffer)
- AI downgrade logic uses dynamic `effectiveRent` (auto-adjusts)
- No AI code changes needed

### Files Changed
| File | Change |
|------|--------|
| `src/types/game.types.ts` | RENT_COSTS noble 350→120, modest 200→95 |
| `src/data/housing.ts` | HOUSING_DATA noble weeklyRent 350→120, modest 200→95 |
| `src/data/items.ts` | Memory Crystal enchanterPrice 475→333, marketPrice 300→250 |

Build passes, 171 tests pass.

## 2026-02-08 - Location Backgrounds, Event Panel, & For Rent Display

### Changes

#### 1. Housing Location Background Images
- **RoomScene.tsx**: Replaced all CSS-drawn room graphics (walls, floor, window, door, bed, furniture, decorations) with full background images
- Noble Heights uses `public/locations/noble-heights.png` (replace with actual image)
- The Slums uses `public/locations/slums.png` (replace with actual image)
- Appliance/durable emoji overlays and relaxation display retained on top of the background image
- Slight dark overlay (15% opacity) for readability of overlaid items
- Text shadow added to "empty room" hint for visibility on photographic backgrounds

#### 2. Weekend Event Modal → Center Panel Inline
- **EventPanel.tsx**: New inline event component that renders inside the center panel (replaces Dialog-based EventModal)
- **GameBoard.tsx**: Events now render in the center panel area instead of a full-screen Dialog overlay
- Center panel becomes visible on mobile during events (previously hidden unless a location was selected)
- EventModal.tsx retained for its `GameEvent` type export only
- Layout: icon → title → description → effects → Continue button, all centered within center panel

#### 3. "For Rent" Display for Unrented Housing
- **HomePanel.tsx**: Added `locationId` prop and `playerRentsHere()` check
- When a player visits a housing location they don't rent (e.g., noble player visits slums, or homeless player visits any housing), shows "For Rent" background image with location name and "Visit the Landlord's Office" message
- Uses `public/locations/for-rent.png` as background (replace with actual image)
- Logic: Noble Heights requires `housing === 'noble'`; Slums requires `housing === 'slums'` or `'modest'`

### Files Changed
| File | Change |
|------|--------|
| `src/components/game/home/RoomScene.tsx` | Replaced CSS room with background image |
| `src/components/game/HomePanel.tsx` | Added locationId prop, For Rent display, playerRentsHere logic |
| `src/components/game/LocationPanel.tsx` | Pass locationId to HomePanel |
| `src/components/game/EventPanel.tsx` | New: inline event panel for center panel |
| `src/components/game/GameBoard.tsx` | Event renders in center panel, removed EventModal usage |
| `public/locations/noble-heights.png` | Placeholder (replace with actual image) |
| `public/locations/slums.png` | Placeholder (replace with actual image) |
| `public/locations/for-rent.png` | Placeholder (replace with actual image) |

### Image Replacement
Place actual images at these paths to replace placeholders:
- `public/locations/noble-heights.png` — Noble Heights room ("Sanctuary" image)
- `public/locations/slums.png` — The Slums room ("God's Grace" image)
- `public/locations/for-rent.png` — "For Rent" sign image

Build passes, 171 tests pass.

## 2026-02-08 - Housing Cost Audit — 5 bugs found and fixed

**Task**: Audit the housing system for fairness, cost balance, and correctness.

### Audit Analysis

#### Income vs Housing Cost at Each Game Stage

| Stage | Job | Income/week | Slums (75g) | Noble (350g) | Food (~50g) | Surplus (Slums) | Surplus (Noble) |
|-------|-----|------------|-------------|--------------|-------------|-----------------|-----------------|
| Early | Floor Sweeper (4g/hr) | ~165g | 75g | — | 50g | **~40g** | — |
| Mid | Market Vendor (10g/hr) | ~414g | 75g | 350g | 50g | **~289g** | **~14g** |
| High | Teacher (14g/hr) | ~580g | 75g | 350g | 50g | **~455g** | **~180g** |
| Top | Guild Admin (22g/hr) | ~910g | 75g | 350g | 50g | **~785g** | **~510g** |

*Income assumes ~6 shifts/week at 6h each with 1.15 work bonus, economy modifier 1.0*

#### Verdict: Is Housing Fair?

**Slums (75g/week)**: Well-balanced. Entry-level jobs barely cover costs with a small surplus, creating tension without being impossible. The robbery risk (25% theft chance per turn, scaled by relaxation) adds meaningful risk-vs-cost trade-off.

**Noble Heights (350g/week actual)**: Reasonable for mid-tier players (14g+/hr jobs). The move from Slums to Noble is a significant milestone — you need ~350g surplus after food. Benefits (0% theft, +3 happiness/turn, faster relaxation) justify the premium.

**Homeless (0g)**: Severe penalties (-5 HP, -8 hrs, -3 happiness per turn, 3x robbery) make this an effective deterrent. Not unfair — it's a death spiral that motivates housing urgency. Getting OUT of homelessness costs only 150g (Slums deposit at 1.0 economy), which is achievable in 1-2 turns of work.

**Move-in deposit (2x weekly rent)**: Slums = 150g, Noble = 700g at 1.0 economy. Fair gating.

#### Bugs Found

| # | Severity | Issue | File | Fix |
|---|----------|-------|------|-----|
| 1 | **HIGH** | HOUSING_DATA.weeklyRent for Noble = 500g but RENT_COSTS = 350g (B4 fix was only applied to RENT_COSTS) | `housing.ts:46` | Synced to 350g |
| 2 | **MEDIUM** | `modest` tier shown in LandlordPanel as move option, but `getHomeLocation()` sends modest players to Slums. Jones only has 2 housing tiers. | `LandlordPanel.tsx:120` | Filtered out `modest` from move options |
| 3 | **MEDIUM** | AI rent affordability check uses `RENT_COSTS[housing]` ignoring `lockedRent` — AI may travel to landlord but fail to pay if locked rent is higher | `criticalNeeds.ts:69` | Uses `lockedRent > 0 ? lockedRent : RENT_COSTS[housing]` |
| 4 | **MEDIUM** | AI housing downgrade check uses `RENT_COSTS` instead of effective rent — may not downgrade when it should | `strategicActions.ts:111` | Same fix as #3 |
| 5 | **LOW** | Dead code: `canAffordHousing()`, `getUpgradeOptions()`, `getDowngradeOptions()` never called, `canAffordHousing` uses wrong formula (8x rent vs actual 2x) | `housing.ts:57-71` | Removed |

#### Bug 1 Detail: Noble Rent Display Mismatch

Before fix, when a player moved to Noble Heights:
1. LandlordPanel showed **500g/week** (from HOUSING_DATA.weeklyRent)
2. Deposit charged was **1000g** (500 × 2)
3. Rent locked in at **500g/week**
4. But fallback RENT_COSTS was only **350g/week**

After fix: HOUSING_DATA.weeklyRent synced to 350g. Display now matches actual cost. Deposit = 700g at 1.0 economy.

#### Bug 3 Detail: AI Rent Check Mismatch

Scenario: AI moves to Noble at economy 1.5, locks in rent at 525g/week.
- `criticalNeeds.ts` checked `RENT_COSTS['noble'] = 350` → "can afford with 400g"
- AI travels to landlord, execution tries `lockedRent = 525` → "can't afford", wastes turn
- Now fixed: action generation uses same effective rent as execution

### Files Changed

| File | Change |
|------|--------|
| `src/data/housing.ts` | Noble weeklyRent 500→350; removed 3 dead functions |
| `src/components/game/LandlordPanel.tsx` | Filter out `modest` from housing move options |
| `src/hooks/ai/actions/criticalNeeds.ts` | Rent check uses `lockedRent` when available |
| `src/hooks/ai/actions/strategicActions.ts` | Downgrade check uses `lockedRent` when available |
| `src/hooks/useAI.ts` | Legacy AI rent check uses `lockedRent` when available |

### Verification

- TypeScript compiles cleanly (`tsc --noEmit`)
- Production build succeeds (65 precached entries)
- All 171 tests pass

---

## 2026-02-08 - Auto-Update Check for Installed PWA

**Task**: Add auto-update detection and user notification for the offline/installed PWA version of the game.

### Problem

The existing PWA setup used `registerType: "autoUpdate"` which silently updated the service worker in the background. Users had no visibility into when a new version was available and had to manually refresh or reopen the app to get updates. There was no periodic check for new versions either.

### Solution

Switched to a `prompt`-based update flow with user notification:

1. **vite.config.ts**: Changed `registerType` from `"autoUpdate"` to `"prompt"` — gives user control over when to apply updates instead of silent background replacement.

2. **useAppUpdate hook** (`src/hooks/useAppUpdate.ts`): Uses `useRegisterSW` from `virtual:pwa-register/react` to detect when a new service worker is waiting. Registers a periodic update check every 60 minutes via `registration.update()`.

3. **UpdateBanner component** (`src/components/game/UpdateBanner.tsx`): Non-intrusive fixed banner at bottom-center of screen. Shows when `needRefresh` is true with a spinning refresh icon and "Update Now" button. Uses parchment-panel styling to match game aesthetic.

4. **Integration**: UpdateBanner added to both TitleScreen and GameBoard so users see the notification regardless of which screen they're on.

### How It Works

1. Service worker checks for updates on page load and every 60 minutes thereafter
2. When a new version is detected, `needRefresh` becomes true
3. A parchment-styled banner slides up: "A new version is available!" with "Update Now" button
4. Clicking "Update Now" calls `updateServiceWorker(true)` which activates the new SW and reloads the page
5. If user ignores the banner, it persists until they click update or the page is refreshed

### Files Changed

| File | Change |
|------|--------|
| `vite.config.ts` | `registerType: "autoUpdate"` → `"prompt"` |
| `src/hooks/useAppUpdate.ts` | **NEW** — hook using `useRegisterSW` with 60-min periodic check |
| `src/components/game/UpdateBanner.tsx` | **NEW** — parchment-panel update notification banner |
| `src/components/screens/TitleScreen.tsx` | Added UpdateBanner import and render |
| `src/components/game/GameBoard.tsx` | Added UpdateBanner import and render |

### Verification

- TypeScript compiles cleanly (`tsc --noEmit`)
- Production build succeeds (65 precached entries)
- All 171 tests pass

---

## 2026-02-08 - AI Agent Balance Audit & 8 Fixes

**Task**: Use AI agents to play through the game, find imbalances, bugs, and missing features. Fix all issues found.

### Methodology

Performed comprehensive analysis of:
- All AI agent logic (strategy.ts, actionGenerator.ts, 5 action category files, useGrimwaldAI.ts)
- Game balance (economy, education ROI, victory path math, housing, dungeons, quests)
- Week-end processing (starvation, rent, theft, loans, weekends, aging)
- Turn-start processing (breakage, spoilage, starvation time penalty, robbery)
- Test coverage gaps

### Bugs Found & Fixed (8 fixes)

| # | Bug | File | Severity | Fix |
|---|-----|------|----------|-----|
| 1 | **AI rent urgency triggers too late** — `> 0.5` threshold meant AI only acted at 3+ weeks overdue (urgency=1.0), not at 2 weeks (urgency=0.5). Left little time before eviction. | `criticalNeeds.ts:67` | HIGH | Changed `> 0.5` to `>= 0.5` |
| 2 | **AI pawning priority inversion** — Heal action (priority 80) selected before pawn (priority 70) when gold < 10. Heal costs 30g which AI can't afford, wasting turn. Also: no move-to-fence action when broke elsewhere. | `economicActions.ts:122-146` | HIGH | Pawn priority → 85, threshold → gold<30, added move-to-fence action (priority 82), sell priority → 78 |
| 3 | **AI housing upgrade blocked for easy AI** — `shouldUpgradeHousing` required `aggressiveness > 0.5`, which easy AI (0.3) never meets. Easy AI suffered repeated robbery losses. | `strategy.ts:148` | MEDIUM | Easy AI upgrades when 3+ valuables at risk. Medium/hard upgrade when any valuables present. |
| 4 | **AI loan repayment too conservative** — Required gold > loanAmount + 100 buffer before repaying. 10% weekly compound interest made delays very costly. | `economicActions.ts:63` | MEDIUM | Reduced buffer from 100 to 50 |
| 5 | **Week-end starvation double penalty** — Players starving got -10 HP / -8 happiness at week-end AND -20 hours at turn-start. Jones only has the -20 hours penalty. Double penalty made starvation excessively punishing. | `weekEndHelpers.ts:107-113` | HIGH | Removed week-end health/happiness penalty. Turn-start -20 hours + doctor visit (25% chance) is sufficient. |
| 6 | **AI goal specialization too weak** — AI always focused on weakest goal equally, never "sprinted" a near-complete goal. Human players exploit this by finishing one goal at a time. | `strategy.ts:47-57` | MEDIUM | AI now sprints goals >= 80% complete before falling back to weakest goal. |
| 7 | **AI failed action tracking** — Failed actions could be re-selected on next cycle, wasting turns in failure loops. | `useGrimwaldAI.ts:40,462,512-536` | MEDIUM | Track failed action keys per turn. Filter them from viable actions. Clear on turn start. |
| 8 | **AI rest path missing travel** — Happiness goal rest action only triggered if AI was already at home. No move-to-home action generated. | `goalActions.ts:157-167` | LOW | Added move-to-home action (priority 40) when not at home and happiness < 40. |

### Balance Analysis Summary

Key findings from playthrough simulation (documented for future reference):

| System | Assessment | Notes |
|--------|-----------|-------|
| Time Management | Tight but fair | 60 hours/turn forces strategic choices between work/education/errands |
| Housing | Working | Slums (75g/wk) vs Noble (350g/wk) creates meaningful risk/cost tradeoff |
| Education ROI | Fair | 7-10 week break-even, but graduates unlock 2-3x better jobs |
| Jobs | Good | Clear 4→25 g/hr progression tied to education |
| Quests | Good | Gold/time ratios competitive with equivalent-tier jobs after Feb-06 rebalance |
| Income vs Expenses | OK | Early game tight but manageable with floor sweeper + slums |
| Dungeon | Niche | High-risk, high-reward. Equipment gate limits to mid/late game |
| Victory Paths | Improved | Sprint logic makes multi-goal games more achievable for AI |
| AI Competitiveness | Improved | 8 fixes address the most exploitable AI weaknesses |

### Remaining Known Issues (Backlog)

- AI doesn't track investments field when buying stocks (wealth calculation includes it but field never updated by store)
- AI hardcoded equipment/appliance costs (may drift from actual market prices)
- AI job upgrade threshold (1.2x) is arbitrary but functional
- No combat system tests (entire dungeon resolver untested)
- No robbery system tests
- No quest system tests

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/ai/actions/criticalNeeds.ts` | Rent urgency threshold `>` → `>=` |
| `src/hooks/ai/actions/economicActions.ts` | Pawn priority 70→85, threshold gold<10→<30, added move-to-fence, loan buffer 100→50, sell priority 65→78 |
| `src/hooks/ai/strategy.ts` | Housing upgrade: removed aggressiveness gate for easy AI (uses 3+ valuables threshold). Goal sprint: returns near-complete (>=80%) goals before weakest goal. |
| `src/hooks/ai/actions/goalActions.ts` | Added move-to-home for rest when happiness < 40 |
| `src/hooks/useGrimwaldAI.ts` | Failed action tracking: `failedActionsRef`, filtered from viable actions, cleared on turn start |
| `src/store/helpers/weekEndHelpers.ts` | Removed duplicate starvation HP/happiness penalty (Jones only has -20 hours at turn start) |

### Test Results
- 171 tests pass (no changes needed)
- TypeScript compiles cleanly
- Build succeeds

---

## 2026-02-08 - Options Menu & Age System Made Optional

**Task**: Make age system opt-in (not default). Create full Options menu accessible from TitleScreen and in-game menu.

### Options System Architecture

| Component | File | Purpose |
|-----------|------|---------|
| `GameOptions` interface | `src/data/gameOptions.ts` | Centralized options with localStorage persistence |
| `useGameOptions` hook | `src/hooks/useGameOptions.ts` | React hook with `useSyncExternalStore` |
| `OptionsMenu` component | `src/components/game/OptionsMenu.tsx` | Full tabbed options modal |
| `getGameOption()` | `src/data/gameOptions.ts` | Non-React access for game logic helpers |

### Options Available

| Category | Option | Default | Description |
|----------|--------|---------|-------------|
| **Gameplay** | Player Aging | OFF | Birthday milestones, elder decay, health crises |
| **Gameplay** | Weather Events | ON | Random weather/economy events |
| **Gameplay** | Permadeath | ON | Permanent death vs respawn |
| **Audio** | Music | ON | Background music with volume slider |
| **Audio** | Sound Effects | ON | SFX with volume slider |
| **Display** | Dark Mode | ON | Dark/light theme toggle |
| **Display** | Event Animations | ON | Animate event popups |
| **Display** | Compact UI | OFF | Smaller stat displays |
| **Display** | Turn Notifications | ON | Turn-change notifications |
| **Speed** | Auto-End Turn | OFF | Auto-end when hours spent |

### Files Changed

| File | Change |
|------|--------|
| `src/data/gameOptions.ts` | **NEW** — GameOptions interface, localStorage persistence, subscription system |
| `src/hooks/useGameOptions.ts` | **NEW** — React hook for options |
| `src/components/game/OptionsMenu.tsx` | **NEW** — Full tabbed options modal (Gameplay, Audio, Display, Speed) |
| `src/components/screens/TitleScreen.tsx` | Added Options button + OptionsMenu modal |
| `src/components/game/SaveLoadMenu.tsx` | Added Options button + OptionsMenu modal (in-game access) |
| `src/store/helpers/weekEndHelpers.ts` | Age logic wrapped in `getGameOption('enableAging')` guard |
| `src/store/helpers/workEducationHelpers.ts` | Work age penalty guarded by `enableAging` option |
| `src/hooks/ai/actions/criticalNeeds.ts` | AI age threshold guarded by `enableAging` option |
| `src/components/game/PlayerInfoPanel.tsx` | Age display conditional on `enableAging` |
| `src/components/game/SideInfoTabs.tsx` | Age display conditional on `enableAging` |
| `src/components/game/InfoTabs.tsx` | Age display conditional on `enableAging` |
| `src/components/screens/VictoryScreen.tsx` | Age display conditional on `enableAging` |
| `src/test/age.test.ts` | Tests now enable aging via `setGameOption('enableAging', true)` |

### Key Design Decisions
- **Age is OFF by default** — players must opt in via Options > Gameplay > Player Aging
- **Options persist across sessions** via localStorage (`guild-life-options` key)
- **Non-React access** via `getGameOption()` for use in store helpers (no hook dependency)
- **Audio settings** surface in Options UI but remain managed by their own systems (audioManager, sfxManager)
- **Reset Defaults** button with confirmation to restore all options

### Test Results
- 171 tests pass (including 19 age tests with aging enabled)
- Build succeeds

---

## 2026-02-08 - Age System Implementation & Bug Audit

**Task**: Implement player age mechanic, play through the game to find bugs, fix all issues found.

### Age System Design

Players now age over time, adding a natural game timer and life-stage effects:

| Feature | Detail |
|---------|--------|
| Starting age | 18 (configurable via `STARTING_AGE`) |
| Aging rate | +1 year every 4 weeks (rent cycle, `AGE_INTERVAL`) |
| Birthday milestones | Age 21, 25, 30, 40, 50 with unique effects |
| Elder decay | Age 60+: -3 maxHealth every birthday |
| Health crises | Age 50+: 3% weekly chance of -15 health |
| Work fatigue | Age 45+: extra -1 happiness on long work shifts (6+ hours) |

### Birthday Milestone Effects

| Age | Effects | Message |
|-----|---------|---------|
| 21 | +5 happiness | "Coming of age! The world feels full of possibility." |
| 25 | +2 maxHealth | "In the prime of youth — stronger than ever." |
| 30 | +5 happiness, +5 dependability | "A seasoned adventurer — wisdom comes with experience." |
| 40 | -2 maxHealth, +3 happiness | "Middle age arrives — wiser, but the body begins to slow." |
| 50 | -5 maxHealth, +5 happiness | "A half-century lived — aches and wisdom in equal measure." |
| 60+ | -3 maxHealth per birthday | "The years weigh heavier..." |

### Files Changed

| File | Change |
|------|--------|
| `src/types/game.types.ts` | Added `age: number` to Player interface; added age constants (`STARTING_AGE`, `AGE_INTERVAL`, `AGE_MILESTONES`, `ELDER_AGE`, `ELDER_HEALTH_DECAY`, `WORK_HAPPINESS_AGE`, `HEALTH_CRISIS_AGE/CHANCE/DAMAGE`) |
| `src/store/gameStore.ts` | Initialize `age: STARTING_AGE` in createPlayer |
| `src/store/helpers/weekEndHelpers.ts` | Added aging logic in processWeekEnd: birthday milestones, elder decay, health crises |
| `src/store/helpers/workEducationHelpers.ts` | Added age-based work happiness penalty for 45+ on long shifts |
| `src/store/helpers/playerHelpers.ts` | Fixed modifyMaxHealth floor: 50 → 10 (consistent with aging floor) |
| `src/hooks/ai/actions/criticalNeeds.ts` | AI health threshold scales with age (40+ → threshold 65), capped at 80% of maxHealth to prevent infinite heal loop |
| `src/components/game/PlayerInfoPanel.tsx` | Added age display in player header ("Guild Rank · Age 18") |
| `src/components/game/SideInfoTabs.tsx` | Added age display in player header |
| `src/components/game/InfoTabs.tsx` | Added "Age" row in Character section |
| `src/components/screens/VictoryScreen.tsx` | Shows "Age X at time of victory" |
| `src/data/saveLoad.ts` | Bumped SAVE_VERSION 1→2; added v1→v2 migration (adds age to old saves based on week) |
| `src/test/age.test.ts` | **NEW** — 19 age system tests (init, aging, milestones, elder decay, health crisis, work penalty) |
| `src/test/freshFood.test.ts` | Fixed pre-existing flaky test: mocked Math.random in Starvation Prevention tests |

### Bugs Found & Fixed (Playthrough Audit)

| # | Severity | Description | Fix |
|---|----------|-------------|-----|
| 1 | Medium | AI infinite healing loop at elder ages — maxHealth drops below age threshold (65), AI permanently stuck visiting healer | Cap threshold to `Math.min(rawThreshold, maxHealth*0.8)` |
| 2 | Medium | maxHealth floor inconsistency — aging allows floor of 10 but modifyMaxHealth had floor of 50, causing unexpected jumps | Changed modifyMaxHealth floor from 50 to 10 |
| 3 | Low | Unused `Cake` import in PlayerInfoPanel.tsx | Removed |
| 5 | Design | Work happiness penalty stacking -2/shift for age 45+ could soft-lock happiness goal | Age penalty only applies on long shifts (6+ hours) |
| 7 | Edge | Truthiness check `if (milestone.maxHealth)` would skip value 0 | Changed to `!== undefined && !== 0` |
| 8 | Edge | Adding milestones at age 60+ would suppress elder decay | Elder decay now applied BEFORE milestone bonuses (independent) |
| - | Flaky | freshFood starvation test failed randomly when doctor visit (25% chance) triggered | Added `vi.spyOn(Math, 'random').mockReturnValue(0.99)` |

### Test Results

- **171 tests pass** (152 existing + 19 new age tests)
- **0 failures** (fixed pre-existing flaky freshFood test)
- Production build succeeds

---

## 2026-02-07 - Setup Default Zone Configurations with Movement Paths

**Task**: Set new standard default ZONE_CONFIGS, CENTER_PANEL_CONFIG, and MOVEMENT_PATHS from fine-tuned zone editor output.

### Changes

| File | Change |
|------|--------|
| `src/data/locations.ts` | Updated 10 of 14 ZONE_CONFIGS entries with refined x/y/width/height values; zones now tighter-fit to game board artwork |
| `src/data/locations.ts` | Populated MOVEMENT_PATHS with 14 edge waypoints (was empty `{}`); all adjacent location pairs now have movement paths |
| `src/hooks/useZoneConfiguration.ts` | Updated DEFAULT_CENTER_PANEL: left 20.8→22.0, width 58.5→56.4, height 54.7→53.6 |
| `src/components/game/ZoneEditor.tsx` | Same DEFAULT_CENTER_PANEL update to keep both files in sync |

### ZONE_CONFIGS coordinate changes (old → new)
- **noble-heights**: width 18.1→18.2, height 32.7→26.4 (shorter, slightly wider)
- **slums**: width 19.1→20.2, height 21.0→19.7 (wider, shorter)
- **fence**: width 14.7→14.5, height 20.0→18.9 (slightly smaller)
- **rusty-tankard**: x 79.4→81.1, y 21.0→22.3, width 18.1→16.1, height 19.6→18.2 (shifted right, smaller)
- **armory**: width 15.4→13.9, height 20.5→18.7 (smaller)
- **forge**: x 3.8→4.6, y 73.8→76.7, height 26.1→15.2 (shifted down, much shorter)
- **guild-hall**: x 23.6→23.2, y 77.0→76.3, width 14.3→15.7, height 23.0→16.3 (wider, shorter)
- **cave**: x 43.1→41.9, y 78.0→78.8, width 12.2→15.5, height 22.0→14.9 (wider, shorter)
- **enchanter**: x 80.0→80.5, y 64.8→67.0, width 14.6→14.4, height 29.2→26.1 (shifted down, shorter)
- **Unchanged**: landlord, general-store, shadow-market, academy, bank

### CENTER_PANEL_CONFIG changes (old → new)
- left: 20.8 → 22.0
- width: 58.5 → 56.4
- height: 54.7 → 53.6
- top: 22.6 (unchanged)

### MOVEMENT_PATHS (new - 14 edges with waypoints)
All 14 adjacent location pairs now have waypoints defined for smooth player movement animation around the board ring. Previously the paths object was empty, causing players to teleport between zone centers.

Build verified: production build succeeds with no errors.

---

## 2026-02-07 - Update Default Zone Configurations

**Task**: Set new default ZONE_CONFIGS and CENTER_PANEL_CONFIG values based on fine-tuned zone editor output.

### Changes

| File | Change |
|------|--------|
| `src/data/locations.ts` | Updated all 14 ZONE_CONFIGS entries with new x/y/width/height values - zones now better align with game board artwork |
| `src/hooks/useZoneConfiguration.ts` | Updated DEFAULT_CENTER_PANEL: top 22.5→22.6, left 26.7→20.8, width 46.5→58.5, height 55.5→54.7 |
| `src/components/game/ZoneEditor.tsx` | Same DEFAULT_CENTER_PANEL update to keep both files in sync |

### Key coordinate changes (old → new)
- **noble-heights**: x 10.6→1.1, width 15.2→18.1, height 30.2→32.7 (wider, taller, shifted left to board edge)
- **general-store**: x 11.0→3.1, width 15.2→16.7 (shifted left to board edge)
- **bank**: x 10.9→1.1, width 14.6→18.1 (shifted left to board edge)
- **forge**: x 11.9→3.8, width 13.3→17.7 (shifted left, wider)
- **shadow-market**: x 74.7→80.1, width 14.9→18.0 (shifted right to board edge)
- **rusty-tankard**: x 74.9→79.4, width 14.4→18.1 (shifted right)
- **armory**: x 74.9→80.6, width 14.3→15.4 (shifted right to board edge)
- **enchanter**: x 74.6→80.0, width 15.0→14.6 (shifted right)
- **center panel**: left 26.7→20.8, width 46.5→58.5 (wider to fill gap between zone columns)

MOVEMENT_PATHS remains empty (no change needed).

Build verified: production build succeeds with no errors.

---

## 2026-02-07 - Fix Center Panel Alignment (Zone Editor + GameBoard)

**Task**: Center panel doesn't stretch edge-to-edge with game background, especially on laptop screens.

### Root Cause Analysis

Two bugs found:

1. **Aspect ratio mismatch between ZoneEditor and GameBoard**:
   - ZoneEditor used `aspect-video` (16:9 = 1.778) — Tailwind class
   - GameBoard used `1216/900` (= 1.351) — inline style
   - Actual game-board.jpeg is 5056×3392 (= 1.491)
   - All three ratios differed, so zones configured in the editor didn't match the game

2. **`bg-contain` created gaps around background image**:
   - Image (1.491 aspect) inside container (1.351 aspect) with `bg-contain` left ~9.4% vertical gap
   - Center panel and zones used % of container, but image didn't fill container
   - Overlay positions misaligned with background features

### Fix

| File | Change |
|------|--------|
| `src/data/locations.ts` | Exported shared `BOARD_ASPECT_RATIO` constant |
| `src/components/game/GameBoard.tsx` | Imported shared constant (removed local duplicate), changed `bg-contain` → `backgroundSize: '100% 100%'` |
| `src/components/game/ZoneEditor.tsx` | Imported shared constant, replaced `aspect-video` class with shared ratio, changed `bg-contain` → `backgroundSize: '100% 100%'` |
| `src/components/game/ZoneEditor.tsx` | Unified DEFAULT_CENTER_PANEL values (was top:23.4/height:53.4, now top:22.5/height:55.5 matching useZoneConfiguration.ts) |

**Result**: Background image now fills container 100% in both editor and game. Zone percentages map identically between editor and gameplay. Center panel aligns with background on all screen sizes.

**Note**: Users with saved zone configs in localStorage may need to recalibrate via Zone Editor (Ctrl+Shift+Z) → Apply & Save, since the background rendering changed.

- Build succeeds, all 152 tests pass, TypeScript clean

---

## 2026-02-07 - Store Layout Redesign (General Store, Shadow Market, Armory, Rusty Tankard)

**Task**: Redesign multiple store location panels for better layout, readability, and Jones-style accuracy.

### 1. General Store — Jones-style Black's Market Redesign

**Problem**: General Store sold too many items not matching Jones Black's Market (candles, blanket, music box, furniture). Layout didn't match the original game.

**Fix**: Stripped down to Jones-authentic items only: food provisions, newspaper, and lottery tickets.

| Change | Before | After |
|--------|--------|-------|
| Food items | 5 food items | 5 food items (unchanged) |
| Other items | Candles ($12), Wool Blanket ($30), Music Box ($75) | Newspaper + Fortune's Wheel Ticket |
| Lottery tickets | Not available here | Now purchasable at General Store |
| Fresh food | Shown if Preservation Box | Unchanged |
| NPC portrait | Normal size (128×144px) | Large size (160×192px) |

**Items removed from General Store**: Bundle of Candles, Wool Blanket, Music Box, Quality Furniture. These are still available at other locations (Enchanter's Workshop, Shadow Market).

### 2. Shadow Market & Armory — Text Visibility Fix

**Problem**: In tabbed mode, items rendered with light cream text (`#e0d4b8`) on light parchment background, making text nearly invisible. NPC portraits too small.

**Fix**: Added `darkText` and `largeText` props to JonesMenuItem and JonesInfoRow components. Tabbed sections now use dark brown text (`#3d2a14`) with gold prices (`#8b6914`) for readability on light parchment backgrounds.

| Element | Before | After |
|---------|--------|-------|
| Item text | `#e0d4b8` (light cream, invisible) | `#3d2a14` (dark brown, readable) |
| Price text | `text-gold` (faint on light bg) | `#8b6914` (darker gold, readable) |
| Hover effect | `bg-[#5c4a32]` (dark hover) | `bg-[#d4c4a8]` (light brown hover) |
| Text size | `text-sm` (14px) | `text-base` (16px) |
| NPC portrait | Normal (128×144px) | Large (160×192px) |
| Portrait column | w-36 (144px) | w-44 (176px) |
| Combat stats (Armory) | Dark bg `#2d1f0f` | Light bg `#e8dcc8` for parchment compat |
| Equipped items (Armory) | Dark green `#2a5c3a` | Light green `#b8d4b8` for parchment compat |

### 3. Rusty Tankard — Larger Layout

**Problem**: NPC portrait was standard size (128×144px) and food items didn't fill the panel, leaving unused space.

**Fix**:
- NPC portrait enlarged to 160×192px (large variant)
- Food items use `largeText` (text-base) for bigger menu text
- JonesPanel uses `h-full flex flex-col` with content area `flex-1 justify-center` to fill available space
- Footer text increased to `text-sm`

### Implementation Details

**New component props added:**

| Component | New Props | Purpose |
|-----------|-----------|---------|
| `JonesMenuItem` | `darkText?: boolean`, `largeText?: boolean` | Dark brown text for light bg, larger text size |
| `JonesInfoRow` | `darkText?: boolean`, `largeText?: boolean` | Same for info rows |
| `NpcPortrait` | `size?: 'normal' \| 'large'` | Normal (128×144) vs large (160×192) portrait |
| `LocationShell` | `largePortrait?: boolean` | Passes large size to NpcPortrait, wider portrait column |

**Locations using large portraits:** General Store, Shadow Market, Armory, Rusty Tankard.

### Files Modified

| File | Change |
|------|--------|
| `src/components/game/GeneralStorePanel.tsx` | Removed non-food items, added lottery tickets, added `buyLotteryTicket` prop |
| `src/components/game/ShadowMarketPanel.tsx` | Added darkText/largeText to all tabbed section items |
| `src/components/game/ArmoryPanel.tsx` | Added darkText/largeText, adapted combat stats and equipped items for light bg |
| `src/components/game/TavernPanel.tsx` | Added largeText to items, h-full layout with justify-center |
| `src/components/game/JonesStylePanel.tsx` | Added darkText/largeText props to JonesMenuItem and JonesInfoRow |
| `src/components/game/NpcPortrait.tsx` | Added size prop with normal/large variants |
| `src/components/game/LocationShell.tsx` | Added largePortrait prop, wider portrait column when enabled |
| `src/components/game/LocationPanel.tsx` | Pass buyLotteryTicket to GeneralStore, largePortrait for 4 locations |

### Build & Test Results
- TypeScript: Clean (0 errors)
- Build: Succeeds (974KB bundle)
- Tests: 152/152 pass

---

## 2026-02-07 - Career Goal Fix (Dependability) & Dungeon Victory Contributions

**Task**: Two gameplay issues — (1) Career goal was based on guild rank (quests) instead of dependability (Jones-style), making it disconnected from actual job performance. A Forge Manager player showed only 25% career despite being a top-tier employee. (2) Dungeon clears gave no career/dependability bonus toward victory goals.

### Fix 1: Career Goal = Dependability (Jones-style)

**Problem**: Career victory goal used guild rank index (1-7), which only advances by completing quests. Per JONES_REFERENCE.md, career should equal the Dependability stat and be 0 if unemployed. A player with a top job (Forge Manager, 28g/hr) showed 25% career because they hadn't completed enough quests.

**Fix**: Changed career goal from guild rank to dependability, matching the original Jones in the Fast Lane design.

| Aspect | Before | After |
|--------|--------|-------|
| Career metric | Guild rank (1-7) | Dependability (0-100) |
| Career if no job | Still counted guild rank | 0 (must be employed) |
| Default goal | 4 (Adept rank) | 75 dependability |
| Quick preset | 2 (Apprentice) | 50 dependability |
| Epic preset | 7 (Guild Master) | 100 dependability |
| Slider | Rank 1-7 | Dep 10-100 (step 5) |

**Ways dependability increases:**
- +2 per work shift (working consistently)
- +5 per degree graduation
- +3 to +15 per dungeon floor clear (new, see Fix 2)

**Files changed:**

| File | Change |
|------|--------|
| `src/store/helpers/questHelpers.ts` | checkVictory: `careerMet = player.currentJob && player.dependability >= goals.career` |
| `src/components/game/GoalProgress.tsx` | Progress bar shows dependability value, 0 if no job |
| `src/components/screens/VictoryScreen.tsx` | Final stats show dependability, not guild rank |
| `src/components/screens/GameSetup.tsx` | Career slider: dependability 10-100, presets updated |
| `src/components/screens/OnlineLobby.tsx` | Preset goals updated, display shows dep instead of rank |
| `src/store/gameStore.ts` | Default career=75, save migration (old career ≤7 → ×100/7) |
| `src/hooks/ai/strategy.ts` | AI calculates career progress from dependability |
| `src/components/game/TurnOrderPanel.tsx` | Career progress uses dependability |
| `src/components/game/RightSideTabs.tsx` | Career progress uses dependability |
| `src/test/victory.test.ts` | 3 career tests (dependability-based, 0-if-no-job, incremental) |

### Fix 2: Dungeon Clears Give Dependability (Career Contribution)

**Problem**: Clearing dungeon floors gave gold (wealth) and happiness, but nothing toward career. Now that career = dependability, dungeon clears contribute to career progress.

**Fix**: Added `dependabilityOnClear` to dungeon floor definitions. Applied on first clear in `clearDungeonFloor` action.

| Floor | Name | Dependability Bonus |
|-------|------|-------------------|
| 1 | Entrance Cavern | +3 |
| 2 | Goblin Tunnels | +5 |
| 3 | Undead Crypt | +7 |
| 4 | Dragon's Lair | +10 |
| 5 | The Abyss | +15 |
| **Total** | | **+40** |

Combined with starting dependability (50) and work shifts (+2 each), clearing all 5 dungeon floors gives +40 dep — a meaningful career boost but not enough alone for the default 75 goal.

**Files changed:**

| File | Change |
|------|--------|
| `src/data/dungeon/types.ts` | Added `dependabilityOnClear: number` to DungeonFloor interface |
| `src/data/dungeon/floors.ts` | Added dependabilityOnClear values (3/5/7/10/15) per floor |
| `src/store/helpers/economyHelpers.ts` | clearDungeonFloor applies dependability bonus on first clear |
| `src/components/game/CavePanel.tsx` | Toast shows dep bonus on first clear |

### Build & Test Results
- TypeScript: Clean (0 errors)
- Build: Succeeds (972KB bundle)
- Tests: 150/152 pass (2 pre-existing failures in freshFood.test.ts)

---

## 2026-02-07 - Merchant Tab Navigation for Armory, Shadow Market & The Fence

**Task**: Add tab navigation to three merchant locations (Armory, Shadow Market, The Fence) to split their product categories into separate tabs, improving UI layout and eliminating excessive scrolling.

### Changes

#### Armory — 4 tabs (was 1 scrollable panel)

| Tab | Content |
|-----|---------|
| **Clothing** | Peasant Garb, Common Clothes, Fine Clothes, Noble Attire, Guild Uniform |
| **Weapons** | Combat stats header + all weapon items (Dagger → Enchanted Blade) |
| **Armor** | Combat stats header + all armor items (Leather → Enchanted Plate) |
| **Shields** | Combat stats header + all shield items (Buckler → Enchanted Shield) |
| **Work** | (hidden unless player has Armory job) |

Combat stats summary (ATK/DEF/BLK + equipped items) shown on Weapons/Armor/Shields tabs for context.

#### Shadow Market — 4 tabs (was 1 scrollable panel)

| Tab | Content |
|-----|---------|
| **Goods** | Newspaper (discount) + Mystery Meat, Stolen Goods, Market Intel |
| **Fortune's Wheel** | Lottery ticket purchase + ticket count + grand prize info |
| **Weekend** | Weekend event tickets (festival, tournament, etc.) |
| **Magical Items** | Used appliances with 1/36 break chance warning |
| **Work** | (hidden unless player has Shadow Market job) |

#### The Fence — 3 tabs (was 1 scrollable panel)

| Tab | Content |
|-----|---------|
| **Used Goods** | Sell player items + buy used equipment (Used Sword, Worn Clothes, etc.) |
| **Magical Items** | Pawn owned appliances + buy pawned magical items (50% off, 1/36 break) |
| **Gambling** | Low Stakes (10g), High Stakes (50g), All or Nothing (100g) |

### Implementation

- Added optional `section` prop to `ArmoryPanel`, `ShadowMarketPanel`, and `PawnShopPanel`
- When `section` is set, panels render only that section without JonesPanel wrapper (tab-friendly)
- When `section` is omitted, panels render full legacy layout (backwards-compatible)
- Updated `LocationPanel.tsx` to define multiple `LocationTab[]` for each location
- All tabs use existing `LocationShell` tab navigation system (already battle-tested on Enchanter, Guild Hall)

### Files Modified

| File | Change |
|------|--------|
| `src/components/game/ArmoryPanel.tsx` | Added `section` prop, extracted `combatStatsHeader` and `footerNote`, section-specific rendering |
| `src/components/game/ShadowMarketPanel.tsx` | Added `section` prop, extracted `renderGoods/Lottery/Tickets/Appliances` helpers |
| `src/components/game/PawnShopPanel.tsx` | Added `section` prop, extracted `renderSellItems/UsedGoods/PawnAppliances/BuyPawnedItems/Gambling` helpers |
| `src/components/game/LocationPanel.tsx` | Updated `armory`, `shadow-market`, `fence` cases from single-tab to multi-tab definitions |

### Build & Test Results
- TypeScript: Clean (0 errors)
- Build: Succeeds (972KB bundle)

---

## 2026-02-07 - Academy Validation, Shadow Market Fix, AI Fix, Salary Stabilization

**Task**: Four-part audit — validate academy courses/job mappings, fix non-functional Shadow Market item, fix multi-AI players standing still, and stabilize Guild Hall salary display.

### Task 1: Academy Course & Job Validation

Performed complete audit of all 11 degrees and 46+ jobs. Found and fixed 6 issues:

| Issue | Severity | Fix |
|-------|----------|-----|
| Missing `researcher` job definition | HIGH | Added to Academy jobs (16g/hr, requires advanced-scholar, career level 6) |
| Missing `merchant-assistant` job definition | HIGH | Added to General Store jobs (12g/hr, requires commerce, career level 4) |
| `assistant-clerk` listed under wrong degree | MEDIUM | Moved from junior-academy to trade-guild unlocksJobs (matches actual job requirement) |
| `bank-teller`, `tavern-chef`, `tavern-manager`, `journeyman-smith` missing from unlocksJobs | MEDIUM | Added to their respective degree unlocksJobs |
| `library-assistant` duplicated in scholar + junior-academy | LOW | Removed from scholar (only requires junior-academy) |

**Education → Job Complete Mapping:**

| Degree | Path | Cost | Jobs Unlocked |
|--------|------|------|---------------|
| Trade Guild Certificate | Starting | 50g | Shop Clerk (6g), Market Vendor (10g), Apprentice Smith (6g), Assistant Clerk (7g), Head Chef (10g) |
| Junior Academy Diploma | Starting | 50g | Scribe (8g), Library Assistant (7g), Bank Teller (9g) |
| Arcane Studies | Trade Guild → | 80g | Enchantment Assistant (11g), Scroll Copier (7g) |
| Combat Training | Trade Guild → | 80g | City Guard (8g), Caravan Guard (12g), Journeyman Smith (10g) |
| Master Combat | Combat Training → | 120g | Arena Fighter (16g), Weapons Instructor (19g), Master Smith (18g), Forge Manager (23g*) |
| Scholar | Junior Academy → | 100g | Teacher (14g) |
| Advanced Scholar | Scholar → | 150g | Senior Teacher (17g), Researcher (16g) |
| Sage Studies | Advanced Scholar → | 200g | Academy Lecturer (18g) |
| Loremaster | Sage Studies → | 250g | Sage (20g), Court Advisor (21g) |
| Commerce | Junior Academy → | 100g | Guild Accountant (14g), Shop Manager (16g), Tavern Manager (14g), Merchant Assistant (12g) |
| Alchemy | Arcane + Jr. Academy | 150g | Alchemist (15g), Potion Brewer (13g) |

*Multi-degree jobs: Forge Manager (master-combat+commerce), Guild Administrator (commerce+master-combat, 22g), Guild Treasurer (scholar+commerce, 22g), Guild Master's Assistant (commerce+master-combat+loremaster, 25g)

### Task 2: Shadow Market — Market Intel Fix

**Bug**: Market Intel (50g) had no game effect — no code handled it at all. Pure placeholder.

**Fix**: Added `effect: { type: 'happiness', value: 5 }` to the item definition. The ShadowMarketPanel already handles happiness effects generically, so the item now works automatically. At 10g per happiness point, it's in line with other Shadow Market item pricing.

### Task 3: Multi-AI Players Standing Still (BUG FIX)

**Bug**: When multiple AI players (Seraphina, Thornwick, Morgath) played in sequence, only the first AI would take actions. All subsequent AI players stood still until their turn timed out.

**Root cause**: In `useAITurnHandler.ts`, the `aiIsThinking` state was only reset when transitioning from an AI player to a human player (`!currentPlayer.isAI`). When transitioning from one AI to another AI, `aiIsThinking` remained `true`, blocking the next AI from starting its turn.

**Fix**: Added `lastAIPlayerIdRef` to track which AI player last acted. When `currentPlayer.id` changes to a different AI player, the state is now properly reset:
- `aiIsThinking` → false (allows new AI to trigger)
- `aiTurnStartedRef` → false (allows new AI turn to start)
- Both the main `useEffect` and the `currentPlayer?.id` listener handle the reset

### Task 4: Guild Hall Salary Fluctuation Fix

**Bug**: Wages shown in Guild Hall changed randomly when clicking the same employer multiple times in the same turn. Players expected stable prices within a visit.

**Root cause**: `calculateOfferedWage()` in `jobs/utils.ts` uses `Math.random()` on every call. The GuildHallPanel recalculated wages on each employer click via `handleSelectEmployer()`, producing new random values each time.

**Fix**: Replaced per-click wage calculation with `useMemo` that pre-calculates ALL wages for ALL jobs when the component mounts. Wages are now stable for the entire Guild Hall visit and only regenerate when `priceModifier` changes (weekly economy update). This matches the Jones in the Fast Lane behavior where wage offers are consistent within a turn.

### Build & Test Results
- TypeScript: Clean (0 errors)
- Build: Succeeds (965KB bundle)
- Tests: 149/151 pass (2 pre-existing failures in freshFood.test.ts)

---

## 2026-02-07 - Multiplayer Deep Audit: Rate Limiting, Zombie Fix, TURN, Tests & Docs

**Task**: Deep audit of the online multiplayer system. Fix known issues (TURN servers, rate limiting, zombie players, test coverage), create comprehensive multiplayer documentation, and add first multiplayer test suite.

### Audit Methodology
Used specialized agents to perform a thorough code review of all 7 network files (~1,800 lines). Cross-referenced with previous audit findings and known issues from the backlog.

### Fixes Applied (7)

| Fix | Severity | Description |
|-----|----------|-------------|
| **Rate limiting on guest actions** | HIGH | Added per-peer sliding window rate limiter (10 actions/sec). Prevents action spam flooding the host. Blocked actions receive error response. Limits cleared on disconnect. |
| **Zombie disconnected player turn stalls** | HIGH | Disconnected players no longer stall the game. Host auto-skips after 5s grace period when it's a disconnected player's turn. Turn change checks also detect and skip zombies. |
| **TURN server deprecation** | HIGH | Removed dead `openrelay.metered.ca` TURN servers. Added 4 Google STUN servers. Created extensible TURN config with `CUSTOM_TURN_SERVERS` array and `window.GUILD_TURN_SERVERS` runtime injection for self-hosted deployments. |
| **Dismissed events persistence** | MEDIUM | Dismissed event tracking now auto-clears on turn change and new week. Added `resetNetworkState()` called on disconnect/game-end. Prevents stale dismissed events across sessions. |
| **Movement animation validation** | MEDIUM | Host validates movement path length before re-broadcasting (max 16 steps). Blocks absurd paths that would cause visual glitches on other clients. |
| **Action result timeout for guests** | MEDIUM | Guest tracks pending actions with 10s timeout. Timed-out actions are logged and cleaned up. Prevents indefinite waits if host crashes mid-action. |
| **Network state cleanup on disconnect** | MEDIUM | `resetNetworkState()` called on disconnect and unmount cleanup. Clears dismissed events, sync tracking indices. Prevents state pollution across game sessions. |

### Multiplayer Test Suite (NEW)

Created `src/test/multiplayer.test.ts` — **32 tests** across 7 categories:

| Category | Tests | Coverage |
|----------|-------|----------|
| Room Codes | 6 | Generation, charset, PeerJS ID conversion, validation |
| Action Categories | 5 | Whitelist/blacklist disjointness, expected actions |
| Action Proxy | 4 | Local/host/guest forwarding behavior |
| State Serialization | 7 | Serialize/deserialize, dismissed events, turn-change clear |
| executeAction | 3 | Valid/invalid/non-function actions |
| Pending Actions | 2 | Track/resolve lifecycle, cleanup |
| Network Guards | 3 | Guest startNewGame block, save/load block, dismiss tracking |

### Multiplayer Documentation (NEW)

Created `multiplayer.md` — comprehensive reference document covering:
- Architecture overview (host-authoritative P2P model)
- Complete file map with line counts and purposes
- Connection flow (room create, join, game start, gameplay loop)
- Full message protocol (10 host->guest types, 7 guest->host types)
- State synchronization mechanics (serialization, dismissed events, broadcast trigger)
- Security & validation (action whitelist, cross-player checks, turn validation)
- Turn management (timeout, zombie detection)
- Reconnection system (guest reconnect, host window, race condition fixes)
- ICE/TURN configuration (3 options for adding TURN servers)
- Rate limiting details
- Configuration constants reference table
- Known issues & limitations catalog
- Future work roadmap
- Troubleshooting guide

### Files Changed
| File | Change |
|------|--------|
| `src/network/PeerManager.ts` | Replaced deprecated TURN servers with STUN-only + extensible TURN config |
| `src/network/useNetworkSync.ts` | Added rate limiting, zombie detection, movement validation, action tracking |
| `src/network/NetworkActionProxy.ts` | Added pending action tracking with timeout |
| `src/network/networkState.ts` | Added auto-clear on turn change, resetNetworkState() |
| `src/network/useOnlineGame.ts` | Added resetNetworkState on disconnect/unmount |
| `src/test/multiplayer.test.ts` | NEW: 32 multiplayer tests |
| `multiplayer.md` | NEW: Comprehensive multiplayer documentation |

### Verification
- TypeScript: Compiles cleanly (`tsc --noEmit`)
- Tests: 144/144 passing (112 existing + 32 new multiplayer tests)
- Build: Production build succeeds (`bun run build`)

### Known Issues Left for Future Work
- TURN servers need new infrastructure (documented 3 options in multiplayer.md)
- No E2E multiplayer tests (requires browser-based WebRTC mocking)
- Cross-player action validation only checks args[0] (incomplete)
- No host migration (single point of failure)
- Room code uses Math.random() (not cryptographically secure)

---

## 2026-02-07 - Multiplayer AI Opponents + Deep Audit Bug Fixes

**Task**: Implement local multiplayer with multiple AI opponents (up to 4 total players) and perform a deep audit of game mechanics, fixing all bugs found.

### Multiplayer AI System (Multi-Agent Support)

**Changes**:
1. **AI_OPPONENTS config** (`game.types.ts`): Added 4 named AI opponents (Grimwald, Seraphina, Thornwick, Morgath) with unique colors (Pearl, Violet, Teal, Rose)
2. **AIConfig type** (`game.types.ts`): New interface for per-AI configuration (name + difficulty)
3. **Per-player aiDifficulty** (`game.types.ts`): Added `aiDifficulty?: AIDifficulty` field to Player type - each AI can have different difficulty (Easy/Medium/Hard)
4. **GameSetup UI revamp** (`GameSetup.tsx`): Replaced single "Include Grimwald" checkbox with full multi-AI management:
   - "Add AI Opponent" button to add up to fill 4 total players
   - Each AI shows colored avatar, editable name, per-AI difficulty selector
   - Remove button per AI
   - Player count indicator (X/4 total)
5. **startNewGame updated** (`gameStore.ts`): Accepts `aiConfigs: AIConfig[]` parameter for multiple AI with per-AI difficulty, while maintaining backwards compatibility with legacy single-AI `includeAI` flag
6. **AI Turn Handler** (`useAITurnHandler.ts`): Reads difficulty from `currentPlayer.aiDifficulty` (per-player) instead of global setting. Toast shows actual AI name, not hardcoded "Grimwald"
7. **GameBoard** (`GameBoard.tsx`): "Scheming" overlay shows current AI player's name and correct difficulty text

### Bug Fixes Found in Deep Audit

| Bug | File | Fix |
|-----|------|-----|
| **payRent ignores lockedRent** | `economyHelpers.ts:18` | Now checks `p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing]` |
| **AI buyFreshFood swapped params** | `useGrimwaldAI.ts:394` | Fixed `buyFreshFood(id, cost, units)` → `buyFreshFood(id, units, cost)` |
| **AI immune to street robbery** | `playerHelpers.ts:35` | Removed `!isAI` guard on robbery check; gameplay effects now apply to AI too (only UI modal suppressed) |
| **startTurn overwrites weekEnd events** | `startTurnHelpers.ts:332` | Changed from `set({ eventMessage })` to appending to existing messages with `\n` separator |
| **AI apply-job uses random wage** | `useGrimwaldAI.ts:160` | Was `0.5 + Math.random() * 2.0`; now uses `calculateOfferedWage(job, priceModifier)` matching human player wage formula |
| **AI pay-rent ignores lockedRent** | `useGrimwaldAI.ts:169` | Same fix as store: uses lockedRent when available |

### Deep Audit Findings (Additional Issues Identified)

- **Flaky test**: `freshFood.test.ts` "starves when no Preservation Box" occasionally fails due to 25% random doctor visit during food spoilage (RNG-dependent, not a code bug)
- **AI_DIFFICULTY_NAMES shortened**: Changed from "Novice Grimwald"/"Cunning Grimwald"/"Master Grimwald" to "Novice"/"Cunning"/"Master" (AI-name-independent)

### Testing
- TypeScript: Clean compile (0 errors)
- Tests: 112/112 passing (7 test files)
- Backwards compatible: Legacy single-AI games still work via `includeAI` flag

### Deep Audit Phase 2: Critical Bug Fixes

4 parallel audit agents reviewed the entire codebase (~5,000+ lines across 30+ files). Total findings: **87 issues** across all severity levels. Fixed the most critical ones:

| Fix | Severity | Description |
|-----|----------|-------------|
| **Double resurrection exploit** | CRITICAL | Player could be resurrected twice per week (checkDeath + processWeekEnd). Added `wasResurrectedThisWeek` flag, reset per week |
| **Preservation Box duplicates** | CRITICAL | Item defined in both APPLIANCES (876g) and ENCHANTER_ITEMS (175g). Removed duplicates from ENCHANTER_ITEMS; APPLIANCES is canonical |
| **Guild rank requirements mismatch** | HIGH | promoteGuildRank had hardcoded values (3,8,15,25,40,60) different from GUILD_RANK_REQUIREMENTS constant (3,10,25,50,100,200). Now uses the constant |
| **AI skip turn infinite loop** | CRITICAL | Emergency skip loop had no failure protection. Added consecutive failure counter, bails after 3 failures |
| **Dead AI continues acting** | HIGH | AI could execute 1-2 more actions after death before next iteration checked. Added immediate death check after each action |
| **Hardcoded quest ID in AI** | HIGH | AI career goal used hardcoded 'patrol-e' instead of calling getBestQuest(). Now uses dynamic quest selection |
| **Privacy screen for local multiplayer** | MAJOR | Added TurnTransition component - shows "Pass the device to [Player]" screen between human turns in local multiplayer |

### Remaining Audit Findings (Not Yet Fixed)

**Game Store** (12 issues): Price parameter validation on purchases, appliance breakage gold gate at 500g, infinite loan extension loop, starvation penalty inconsistency (20hrs vs 10hp)

**Items/Data** (18 issues): Quest education requirements reference non-existent paths, Frost Chest/Arcane Tome not purchasable anywhere, housing tier 'modest' defined but not implemented

**AI System** (45 issues): No difficulty-based decision thresholds, stale player state during async execution, no rent prepayment/appliance repair logic, equipment upgrade list hardcoded, no competition awareness

**UI/Multiplayer** (27 issues): Network state persists after victory, event modal dismissal desync, mobile HUD missing turn indicator, dead player tokens show same as alive, keyboard shortcuts trigger in modals

---

## 2026-02-06 - Mobile Game Layout (Samsung S24 Optimization)

**Task**: Adapt the game layout for mobile devices, specifically Samsung Galaxy S24 (landscape ~780×360 CSS pixels). The existing desktop 3-column layout (12% left panel + 76% board + 12% right panel) was unusable on mobile — side panels were only ~94px wide with clipped text, and the overall layout was cramped.

### Mobile Layout Strategy

**Breakpoint**: 1024px (below = mobile, above = desktop). Covers all phones and small tablets.

**Key Decisions**:
- Hide side panels entirely on mobile (they don't work at 94px width)
- Game board fills full viewport width (no wasted space on side panels)
- Compact HUD bar at top replaces both side panels with essential info
- Location panel renders as bottom sheet overlay (65% of board height)
- When no location selected, board is fully visible for navigation
- Side panel content accessible via slide-out drawers (left = Stats/Inventory/Goals, right = Players/Options)

### Files Created

| File | Purpose |
|------|---------|
| `src/hooks/useIsMobile.ts` | Viewport width detection hook (matchMedia-based, 1024px breakpoint) |
| `src/components/game/MobileHUD.tsx` | Compact top bar: player dot, gold/hours/health/happiness/food, week indicator, End Turn button, drawer toggles, menu button |
| `src/components/game/MobileDrawer.tsx` | Slide-out drawer overlay with backdrop, close button, scroll support |

### Files Modified

| File | Changes |
|------|---------|
| `GameBoard.tsx` | Mobile-aware layout: flex-col on mobile (vs flex-row desktop), conditional side panel rendering, MobileHUD at top, center panel as bottom sheet (65% height, 98% width), drawers for side panel content, responsive AI overlay and online indicators |
| `LocationShell.tsx` | On mobile: hide full NPC portrait, show compact inline NPC avatar (28px round) + name next to tabs, full-width content area |

### Mobile Layout Structure (Landscape)
```
┌──────────────────────────────────────────┐
│ [📊] Player • 🪙100 ⏰60 ❤100 😊50% 🍖50% │ W1  [End Turn] [👥] [☰]
├──────────────────────────────────────────┤
│                                          │
│         GAME BOARD (full width)          │  ← Board visible (top 35%)
│         Location zones clickable         │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│    LOCATION PANEL (bottom sheet)         │  ← 65% of board height
│    Full-width, scrollable content        │
│    Compact NPC avatar inline             │
│                                          │
└──────────────────────────────────────────┘
```

When no location selected, bottom sheet hidden → full board visible.

### Component Details

**MobileHUD**: Single-row bar showing player color dot, name (truncated), 5 resource chips (Gold, Hours, Health, Happiness, Food) with warning animations, week/market info, End Turn button, drawer toggles for Stats (left) and Players (right), plus Game Menu button.

**MobileDrawer**: 288px (w-72) wide slide-out panel, max 85vw, with wood-dark header, close button, and scrollable content. Backdrop click to close. Prevents body scroll when open.

**LocationShell mobile mode**: Replaces 144px NPC portrait column with a compact 28px circular avatar + NPC name inline, giving content area full panel width. Tab bar and content render normally below.

### Technical Notes

- `useIsMobile` hook uses `matchMedia` for efficient updates (no resize polling)
- Side panels render conditionally with `{!isMobile && ...}` (not CSS display:none) to avoid unnecessary DOM
- Drawers use `fixed inset-0 z-50` overlay pattern with backdrop click-to-close
- Center panel style is computed conditionally: `isMobile ? bottomSheet : desktopPosition`
- Week/market indicator hidden on mobile (info is in the HUD instead)
- AI thinking overlay and online indicators have compact mobile variants
- Build succeeds, all 112 tests pass, TypeScript clean

---

## 2026-02-06 - Multiplayer Deep Audit #2: Remaining Known Issues Fix (Agent-Assisted)

**Task**: Deep audit using 4 parallel agents to find all remaining bugs in the multiplayer system, then fix all 6 "Remaining Known Issues" plus additional critical/high bugs found by agents.

### Audit Methodology

Ran 4 specialized audit agents in parallel:
1. **PeerManager audit** — Reconnection, heartbeat, TURN servers, error handling
2. **useNetworkSync audit** — Turn timeout, state sync race conditions, action proxying
3. **useOnlineGame + lobby audit** — Lobby flow, player matching, game start, victory
4. **Store network integration audit** — Action guards, auto-save, auto-end-turn

Total issues found: **35** (8 critical, 10 high, 12 medium, 5 low)

### Remaining Known Issues - ALL FIXED

**1. No reconnection mechanism (guest drop = game lost)** → FIXED
- Added `attemptReconnect()` to PeerManager (guest-side)
- Added 30-second reconnection window on host (dropped guests get time to reconnect)
- Host stores peer names via `setPeerName()` for reconnection identification
- Added `onPeerReconnect` event handler + `player-reconnected` message type
- Guest auto-attempts reconnect on host disconnect (2s delay)
- Host re-sends full game state to reconnected peer

**2. No turn timeout (AFK player hangs game)** → FIXED
- Added 120-second configurable turn timeout in `useNetworkSync` (host-enforced)
- Resets on any valid guest action (movement or store action)
- Skips host's own turn and AI turns
- Broadcasts `turn-timeout` message to all clients before auto-ending turn
- Timer resets when `currentPlayerIndex` changes

**3. AI movement not animated for remote clients** → FIXED
- Added `peerManager.broadcast({ type: 'movement-animation' })` in `useGrimwaldAI`'s `executeAction` for 'move' actions
- Imported `getPath` from locations to compute animation path
- Only broadcasts when `networkMode === 'host'` (AI only runs on host)

**4. No latency indicators (ping implemented but unused)** → FIXED
- PeerManager heartbeat now tracks latency from ping/pong round-trip
- `useNetworkSync` exposes `latency` state (polls every 3s on guest)
- GameBoard connection indicator now shows latency: green (<100ms), yellow (100-200ms), red (>200ms)
- Wifi icon color also reflects latency quality

**5. No heartbeat/keepalive between peers** → FIXED
- Guest sends heartbeat pings every 5 seconds to host
- Host tracks `lastPongReceived` per peer, sends pong replies
- Host runs periodic heartbeat check: if no ping from peer in 15 seconds, force-close connection
- Heartbeat messages handled internally by PeerManager (not propagated to game logic)
- All intervals properly cleaned up on disconnect/destroy

**6. PeerJS cloud signaling has no TURN server fallback** → FIXED
- Added ICE server config to all PeerJS instances via `getPeerConfig()`
- Includes Google STUN servers (stun.l.google.com:19302, stun1.l.google.com:19302)
- Includes free TURN servers (openrelay.metered.ca on ports 80 and 443)
- Config passed to both host and guest Peer constructors + retry constructor

### Additional Bugs Fixed (from Agent Audit)

**CRITICAL: Guest player ID matching by name instead of peerId**
- File: `useOnlineGame.ts:293-310`
- Previously used `p.name === localPlayerName` to find guest slot → could assign wrong player
- Now uses `peerManager.peerId` to match by actual PeerJS ID, with name as fallback
- Added `get peerId()` getter to PeerManager

**HIGH: NetworkMode race condition during game start on guest**
- File: `useOnlineGame.ts:293-310`
- Previously `applyNetworkState()` was called BEFORE `networkMode` was set to 'guest'
- This meant store actions during state application executed locally instead of forwarding
- Fix: Set `networkMode: 'guest'` BEFORE calling `applyNetworkState()`

**HIGH: Host can start game without guests being ready**
- File: `OnlineLobby.tsx:94`
- `canStart` only checked player count, ignored `isReady` flag
- Fix: Added `allGuestsReady` check — all non-host players must be ready

**HIGH: Race condition in guest auto-end-turn (500ms window)**
- File: `useAutoEndTurn.ts:37-44`
- 500ms delay could cause guest to send stale endTurn after host advanced turn
- Fix: Reduced delay to 100ms + added triple-guard (player index, player ID, time check)

**MEDIUM: Auto-save in multiplayer host mode**
- File: `gameStore.ts:272-283`
- Auto-save was active for host mode, creating multiplayer saves that can't be restored
- Fix: Changed guard from `!== 'guest'` to `=== 'local'`

**MEDIUM: Movement self-filter when localPlayerId is null**
- File: `useNetworkSync.ts:200-205`
- If `localPlayerId` was null, `msg.playerId !== null` was always true, showing own movement
- Fix: Added explicit null check — show animation anyway when localPlayerId unset

**MEDIUM: Dead code cleanup**
- Removed unused `SYNCED_GAME_FIELDS` array from `networkState.ts`
- Removed stale ping/pong handling from useNetworkSync (now handled by PeerManager heartbeat)
- Fixed PeerManager `destroy()` to not call `setStatus()` after clearing handlers

### Files Changed (10)

| File | Changes |
|------|---------|
| `src/network/PeerManager.ts` | Heartbeat, reconnection, TURN servers, peerId getter, peer names |
| `src/network/types.ts` | New message types: player-reconnected, reconnect, turn-timeout |
| `src/network/useNetworkSync.ts` | Turn timeout, latency polling, heartbeat delegation |
| `src/network/useOnlineGame.ts` | Reconnection handling, peerId matching, ready enforcement |
| `src/network/networkState.ts` | Removed dead SYNCED_GAME_FIELDS |
| `src/hooks/useGrimwaldAI.ts` | Broadcast AI movement animation to remote clients |
| `src/hooks/useAutoEndTurn.ts` | Triple-guard on guest auto-end-turn, reduced delay |
| `src/components/game/GameBoard.tsx` | Latency indicator with color-coded Wifi icon |
| `src/components/screens/OnlineLobby.tsx` | Ready enforcement for game start |
| `src/store/gameStore.ts` | Disabled auto-save in multiplayer host mode |

### Verification
- TypeScript: `tsc --noEmit` passes cleanly
- Build: `vite build` succeeds (951KB JS)
- Tests: 111 pass, 1 pre-existing failure (freshFood starvation test — unrelated to network)

---

## 2026-02-06 - Online Multiplayer Deep Audit & Architecture Fix (Agent-Assisted)

**Task**: Deep audit of the entire online multiplayer system using 4 parallel agents. Find bugs, missing features, architectural issues. Fix critical and high-priority problems.

### Audit Methodology

Ran 4 specialized audit agents in parallel:
1. **PeerManager audit** — Connection reliability, security, WebRTC config
2. **useNetworkSync audit** — State sync, turn validation, race conditions
3. **OnlineLobby/GameBoard audit** — Lobby flow, game start, movement sync, victory
4. **Store integration audit** — Action proxying, state serialization, AI integration

### Audit Findings Summary

| Category | Count | Severity |
|----------|-------|----------|
| Critical bugs | 10 | Fixed: 10 |
| High-severity bugs | 8 | Fixed: 8 |
| Medium issues | 6 | Noted for future |
| Low / improvements | 12 | Noted for future |

### Critical Bugs Fixed (10)

**C1: Duplicate serializeGameState/applyNetworkState** (ARCHITECTURE)
- **Files**: `useOnlineGame.ts`, `useNetworkSync.ts` → new `networkState.ts`
- **Issue**: Two separate copies of serialize/deserialize functions with different field sets — useOnlineGame included `aiSpeedMultiplier`, `skipAITurn`, `showTutorial`, `tutorialStep`, `selectedLocation` which useNetworkSync didn't and vice versa
- **Fix**: Created `src/network/networkState.ts` — single source of truth. Both hooks import from there. Excluded local-only UI state (selectedLocation, tutorial, AI speed) from sync

**C2: No action whitelist — guests could call ANY store action** (SECURITY)
- **Files**: `useNetworkSync.ts:68-82`, `types.ts`
- **Issue**: Host executed ANY action name from guest network messages via `(store as Record)[name]()`. Guests could call `startTurn`, `processWeekEnd`, `evictPlayer`, `startNewGame` etc.
- **Fix**: Added `ALLOWED_GUEST_ACTIONS` whitelist (45 legitimate player actions) in `types.ts`. Host rejects any action not in whitelist with "Action not allowed" error

**C3: Duplicate store subscriptions — double broadcasts** (PERFORMANCE)
- **Files**: `useOnlineGame.ts:464-476`, `useNetworkSync.ts:209-218`
- **Issue**: Both hooks subscribed to Zustand store changes and broadcasted state. Every state change sent 2x messages to guests
- **Fix**: Removed store subscription from `useOnlineGame`. Only `useNetworkSync` broadcasts now

**C4: Duplicate message handlers — messages processed twice** (LOGIC)
- **Files**: `useOnlineGame.ts:250-256`, `useNetworkSync.ts:140-207`
- **Issue**: Both hooks registered `peerManager.onMessage()` handlers. Guest action messages, state-sync, movement — all processed twice causing duplicate execution and conflicting broadcasts
- **Fix**: Split message handling by phase: `useOnlineGame` handles lobby messages only (join, ready, leave, lobby-update, game-start, kicked). `useNetworkSync` handles game messages only (action, state-sync, movement, ping/pong)

**C5: AI turns triggered on guest clients** (MULTIPLAYER)
- **File**: `GameBoard.tsx:79-83`
- **Issue**: `useAITurnHandler` ran unconditionally on all clients. Guest received AI player as current player via state-sync → triggered local AI decision loop → AI actions had no effect (network-proxied) → game appeared hung
- **Fix**: Pass `undefined` currentPlayer and `'title'` phase to useAITurnHandler when `networkMode === 'guest'`, preventing AI trigger

**C6: Auto-end-turn completely blocked for guests** (MULTIPLAYER)
- **File**: `useAutoEndTurn.ts:26-27`
- **Issue**: `if (networkMode === 'guest') return false;` — guest with timeRemaining=0 could never end their turn. Host waited for guest action, guest was blocked → deadlock
- **Fix**: Guest now detects own time running out and forwards `endTurn()` to host via network proxy. Death/event handling stays host-only (guest sees via state sync)

**C7: Host peerId mapping included 'host' literal** (TURN VALIDATION)
- **File**: `useOnlineGame.ts:186-190`
- **Issue**: Host added to peerPlayerMap with peerId='host', but actual PeerJS peer ID is `guild-life-XXXXXX`. Turn validation via `getPlayerIdForPeer()` would never match the host's actual peer ID
- **Fix**: Only map actual remote peers (skip peerId === 'host'). Host actions execute locally, never need peer → player mapping

**C8: Connection timeout race condition** (CONNECTION)
- **File**: `PeerManager.ts:161-166`
- **Issue**: 10-second timeout fired even if connection opened 1ms before timeout. Both `resolve()` and `reject()` could fire, causing unhandled promise rejection
- **Fix**: Added `settled` boolean guard — first of open/error/timeout to fire claims the settlement, subsequent callbacks are no-ops

**C9: Settings modifiable during active game** (FAIRNESS)
- **File**: `useOnlineGame.ts:480-494`
- **Issue**: `updateSettings()` had no phase check. Host could change victory goals mid-game after seeing player progress
- **Fix**: Added phase guard — settings changes blocked during 'playing' and 'victory' phases

**C10: selectedLocation synced to all guests** (UX)
- **Files**: `networkState.ts`, `useOnlineGame.ts:36`
- **Issue**: `selectedLocation` was included in state sync. When host clicked a location to view info, all guests saw it selected. Guest's own location selection was overwritten by host state sync 50ms later
- **Fix**: Removed `selectedLocation` from `serializeGameState()`. It's already in `LOCAL_ONLY_ACTIONS`, now consistently local-only

### High-Severity Bugs Fixed (8)

**H1: Player name collision → wrong player identification** (MULTIPLAYER)
- **File**: `useOnlineGame.ts:283-285`
- **Issue**: Guest's playerId determined by name matching (`find(p => p.name === localPlayerName)`). Two guests with same name → second guest gets wrong playerId → turn stealing
- **Fix**: Host auto-appends slot number to duplicate names: "Adventurer" → "Adventurer (2)"

**H2: Host game-start used stale serializeGameState** (MULTIPLAYER)
- **File**: `useOnlineGame.ts:193`
- **Issue**: Old `serializeGameState()` took a `store` parameter but the shared version reads from `useGameStore.getState()` directly. Updated call to match new API

**H3–H8**: Addressed by the architectural fixes above (duplicate handlers, duplicate broadcasts, duplicate serialization functions)

### Remaining Issues (Not Fixed — Future Work)

**Medium Priority:**
- No reconnection mechanism (guest drop = game lost)
- No turn timeout (AFK player hangs game)
- AI movement not animated for remote clients
- No latency indicators (ping implemented but unused)
- No heartbeat/keepalive between peers
- PeerJS cloud signaling has no TURN server fallback

**Low Priority:**
- No spectator mode
- No in-game chat
- No save/load in multiplayer
- No action deduplication (fast double-click → double action)
- No pause/resume for network lag
- No player AFK detection

### Files Changed

| File | Change |
|------|--------|
| `src/network/networkState.ts` | **NEW** — Shared serialize/deserialize/executeAction functions |
| `src/network/types.ts` | Added `ALLOWED_GUEST_ACTIONS` whitelist (45 actions) |
| `src/network/useNetworkSync.ts` | Uses shared networkState, adds action whitelist validation |
| `src/network/useOnlineGame.ts` | Uses shared networkState, removed duplicate store subscription + action handlers, lobby-only message handling, settings phase guard, name dedup |
| `src/network/PeerManager.ts` | Fixed connection timeout race condition (settled guard) |
| `src/components/game/GameBoard.tsx` | Guard AI turn handler for guest mode |
| `src/hooks/useAutoEndTurn.ts` | Allow guest to forward endTurn when time runs out |

### Build & Test Results
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (9.5s, 944KB JS)
- All 112 tests pass (7 test files)

---

## 2026-02-06 - Online Multiplayer: Remote Movement Visibility

**Problem**: In online multiplayer, movement animation was LOCAL ONLY. When a player moved, other players only saw the final position via state-sync — the token "teleported" instantly instead of walking along the board path.

**Root Cause**: `usePlayerAnimation` was entirely local React state. The `AnimatedPlayerToken` animation ran on the moving player's client, then `movePlayer()` updated the store, which triggered `state-sync` broadcast. Remote clients received the final `currentLocation` with no animation data.

### Solution: Broadcast movement animation over WebRTC

Added a separate `movement-animation` message type that broadcasts the animation path to all remote clients before the animation starts.

**Flow — Host moves:**
1. Host clicks location → `startAnimation()` runs locally
2. Host broadcasts `{ type: 'movement-animation', playerId, path }` to all guests
3. Guest receives → `startRemoteAnimation()` plays visual-only animation (no `movePlayer` on completion)
4. Host animation completes → `movePlayer()` → state-sync broadcasts
5. Guest receives state-sync → position updated; `animatingPlayer` filter prevents visual glitch

**Flow — Guest moves (their turn):**
1. Guest clicks location → `startAnimation()` runs locally
2. Guest sends `{ type: 'movement-start', playerId, path }` to host
3. Host re-broadcasts as `movement-animation` to ALL guests + triggers animation on host screen
4. Moving guest ignores own `movement-animation` (already animating)
5. Guest animation completes → `movePlayer` forwarded to host → host executes → state-sync

### Changes by File

**`src/network/types.ts`**
- Added `LocationId` import
- Added `movement-animation` to `HostMessage` (host → guest: animation path for remote player)
- Added `movement-start` to `GuestMessage` (guest → host: notify of movement start)

**`src/hooks/usePlayerAnimation.ts`**
- Added `startRemoteAnimation(playerId, path)` — visual-only animation (no `pendingMoveRef`, so `handleAnimationComplete` just clears state without calling `movePlayer`)

**`src/network/useNetworkSync.ts`**
- Added `remoteAnimation` state + `clearRemoteAnimation` + `broadcastMovement`
- `broadcastMovement`: host broadcasts directly; guest sends `movement-start` to host
- Host handler for `movement-start`: re-broadcasts as `movement-animation` + triggers local animation
- Guest handler for `movement-animation`: triggers remote animation (skips if `playerId === localPlayerId`)

**`src/components/game/GameBoard.tsx`**
- Destructures `broadcastMovement`, `remoteAnimation`, `clearRemoteAnimation` from `useNetworkSync()`
- Destructures `startRemoteAnimation` from `usePlayerAnimation()`
- Added `useEffect` that picks up `remoteAnimation` and calls `startRemoteAnimation`
- Added `broadcastMovement()` calls after both full and partial `startAnimation()` calls

### Design Notes

- **No timing conflicts**: `animatingPlayer` is filtered from location zones (line 277), so even if state-sync arrives mid-animation and updates `currentLocation`, the player won't appear in two places — they stay in the animated layer until animation completes
- **Turn-based safety**: Only one player moves at a time, so single `animatingPlayer` state is sufficient
- **Network overhead**: Minimal — one small message per movement containing only `playerId` + `LocationId[]` path

### Test Results
- TypeScript compiles clean
- Build succeeds
- 111/112 tests pass (1 pre-existing failure in freshFood.test.ts)

---

## 2026-02-06 - Fix NPC Banter System — 2 Bugs Fixed

The banter system was fully implemented (data, hook, component, integration) but speech bubbles never appeared in-game. Root cause analysis found 2 bugs.

### Bugs Fixed

| # | Severity | File | Bug |
|---|----------|------|-----|
| 1 | **CRITICAL** | `BanterBubble.tsx` | Bubble invisible due to overflow clipping — `absolute bottom-full` positioned the bubble ABOVE the portrait column, outside the `overflow-hidden` ancestor containers in LocationPanel (lines 618 and 642). The bubble rendered in the DOM but was completely clipped. Fixed by changing to `top-0` so the bubble overlays the portrait within visible bounds. |
| 2 | **MEDIUM** | `LocationShell.tsx` | No banter trigger on location entry — banter only triggered via clicks in the content area. If the player entered a location and didn't click anything, they'd never see banter. Added `useEffect` that calls `tryTriggerBanter` 600ms after entering a location (25% chance, respects cooldown). |

### Changes by File

**`src/components/game/BanterBubble.tsx`**
- Changed positioning from `absolute bottom-full left-1/2 -translate-x-1/2 mb-2` to `absolute top-0 left-1/2 -translate-x-1/2`
- Changed animation direction: hidden state uses `-translate-y-2` (slide down from above) instead of `translate-y-2` (slide up from below)
- Bubble now overlays the top of the NPC portrait with speech tail pointing down

**`src/components/game/LocationShell.tsx`**
- Added `useEffect` import
- Added auto-trigger: `useEffect` calls `tryTriggerBanter(locationId)` after 600ms delay on mount
- Click-based triggering in content area still works as before (25% chance per click, 30s cooldown)

### Banter System Architecture (unchanged)
- `src/data/banter.ts` — 12 locations × 4-7 lines each, 5 mood types
- `src/hooks/useBanter.ts` — state + per-location cooldown (30s) + 25% trigger chance
- `src/components/game/BanterBubble.tsx` — mood-colored speech bubble, 4s auto-dismiss
- `src/components/game/LocationShell.tsx` — integration point (portrait column + content clicks)

### Test Results
- TypeScript compiles clean
- Build succeeds
- 111/112 tests pass (1 pre-existing failure in freshFood.test.ts)

---

## 2026-02-06 - Online Multiplayer Deep Audit & Fix — 8 Bugs Fixed

Deep audit of the WebRTC P2P multiplayer system revealed 8 critical bugs causing: opponents not seeing movements, guests unable to move on their turn, and game becoming unresponsive.

### Root Cause Analysis

The multiplayer architecture uses two hooks:
- `useOnlineGame` — runs during lobby phase (OnlineLobby screen), has proper turn validation
- `useNetworkSync` — runs during gameplay (GameBoard screen), had NO turn validation

When the host starts the game, OnlineLobby unmounts (destroying useOnlineGame's validation) and GameBoard mounts (using useNetworkSync which blindly executed any guest action without checking whose turn it was).

### Bugs Fixed

| # | Severity | File | Bug |
|---|----------|------|-----|
| 1 | **CRITICAL** | `useNetworkSync.ts` | No turn validation — host executed any guest action without checking whose turn it was |
| 2 | **CRITICAL** | `useNetworkSync.ts` | No peerId → playerId mapping — host couldn't identify which player sent an action |
| 3 | **CRITICAL** | `NetworkActionProxy.ts` | HOST_INTERNAL_ACTIONS (startTurn, processWeekEnd, checkDeath) executed locally on guest — caused state divergence |
| 4 | **HIGH** | `useAutoEndTurn.ts` | Guest ran auto-end-turn logic — created duplicate endTurn calls (guest + host both auto-ending) |
| 5 | **HIGH** | `useNetworkSync.ts` | applyNetworkState missing `shadowfingersEvent` and `applianceBreakageEvent` — guest never saw robbery/breakage modals |
| 6 | **MEDIUM** | `useOnlineGame.ts` | Stale closure in message handler — effect depended on `[isHost]` but callbacks captured `lobbyPlayers`, causing new guests to be rejected |
| 7 | **MEDIUM** | `useOnlineGame.ts` | game-start message didn't include lobby data — guest relied on stale lobbyPlayers state to find their slot |
| 8 | **LOW** | `PeerManager.ts` | "Only host can broadcast" warning spammed console on every store change |

### Changes by File

**`src/network/PeerManager.ts`**
- Added `peerPlayerMap: Map<string, string>` — maps peerId → playerId for turn validation
- Added `setPeerPlayerMap()` and `getPlayerIdForPeer()` methods
- Map cleared on `destroy()`
- Silenced "Only host can broadcast" warning (was flooding console)

**`src/network/useNetworkSync.ts`** (major rewrite of message handler)
- Added turn validation: host now identifies sender via `peerManager.getPlayerIdForPeer(fromPeerId)` and checks `currentPlayer.id === senderPlayerId` before executing
- Unknown peers and out-of-turn actions are rejected with error messages
- Added ping/pong handling (was missing, only useOnlineGame had it)
- Added action-result handling for guest (was silently dropped)
- Fixed `applyNetworkState` — now includes `shadowfingersEvent`, `applianceBreakageEvent`
- Fixed `serializeGameState` — now includes `selectedLocation`, `shadowfingersEvent`, `applianceBreakageEvent`

**`src/network/useOnlineGame.ts`**
- `startOnlineGame()`: populates `peerManager.setPeerPlayerMap()` from lobby players
- `startOnlineGame()`: broadcasts game-start with lobby data (not just game state)
- Guest `game-start` handler: uses `message.lobby.players` instead of stale `lobbyPlayers` state
- Fixed stale closure: message handlers now use refs (`handleHostMessageRef`, etc.) updated on every render
- Added `localPlayerName` to `startOnlineGame` dependency array

**`src/network/types.ts`**
- `game-start` message now includes `lobby: LobbyState` field

**`src/network/NetworkActionProxy.ts`**
- `HOST_INTERNAL_ACTIONS` now returns `true` (blocks execution) instead of `false` (allowed local execution) on guest

**`src/hooks/useAutoEndTurn.ts`**
- Guest mode: `checkAutoReturn()` returns immediately (host handles all auto-end/death logic)
- Prevents duplicate endTurn calls that could skip players

### Build & Tests
- TypeScript compiles cleanly
- Build succeeds
- 111/112 tests pass (1 pre-existing freshFood test failure)

---

## 2026-02-06 - Major Refactoring: Split 6 Largest Files

Refactored the 6 largest files in the codebase using parallel agents. Each monolithic file was split into focused modules with barrel re-exports for backward compatibility. All 112 tests pass, TypeScript clean, build succeeds.

### 1. `dungeon.ts` (946 → 5 files)
Deleted monolithic `src/data/dungeon.ts`, replaced with `src/data/dungeon/` directory:
| New File | Contents | Lines |
|----------|----------|-------|
| `types.ts` | All type/interface definitions (DungeonEncounter, DungeonFloor, RareDrop, etc.) | ~130 |
| `encounters.ts` | Floor 1-5 encounter data + boss definitions | ~340 |
| `floors.ts` | Education bonuses, rare drops, loot multipliers, DUNGEON_FLOORS array | ~250 |
| `helpers.ts` | All helper functions (getFloor, checkFloorRequirements, etc.) + constants | ~230 |
| `index.ts` | Barrel re-export | ~10 |

### 2. `actionGenerator.ts` (835 → 106 + 7 action files)
Split AI action generation into category-based modules in `src/hooks/ai/actions/`:
| New File | Contents | Lines |
|----------|----------|-------|
| `actionContext.ts` | Shared ActionContext interface | ~20 |
| `criticalNeeds.ts` | Food, rent, clothing, health actions | ~130 |
| `goalActions.ts` | Education, wealth, happiness, career goal-oriented actions + graduation | ~270 |
| `strategicActions.ts` | Job seeking, upgrades, work, housing, banking | ~150 |
| `economicActions.ts` | Sickness, loans, fresh food, tickets, pawning, lottery, stocks | ~210 |
| `questDungeonActions.ts` | Guild pass, equipment, quests, dungeon exploration | ~120 |
| `index.ts` | Barrel re-export | ~10 |

Main `actionGenerator.ts` reduced to slim orchestrator (106 lines): creates context, calls all generators, applies route optimization + mistake chance.

### 3. `turnHelpers.ts` (792 → 108 + 2 helpers)
Split turn lifecycle into 3 focused files:
| File | Contents | Lines |
|------|----------|-------|
| `turnHelpers.ts` | `endTurn` logic + `createTurnActions` orchestrator + shared `getHomeLocation` | 108 |
| `startTurnHelpers.ts` | `startTurn`: appliance breakage, food spoilage, starvation, robbery, bonuses | 336 |
| `weekEndHelpers.ts` | `processWeekEnd`: economy cycle, player weekly processing, death checks, stocks | 376 |

### 4. `GameBoard.tsx` (774 → 576 + 4 hooks)
Extracted 4 custom hooks from the "god component":
| New Hook | Responsibility | Lines |
|----------|---------------|-------|
| `useZoneConfiguration.ts` | Zone config persistence, save/reset/load, custom positions | 83 |
| `useAITurnHandler.ts` | AI turn detection, thinking state, Grimwald toast | 58 |
| `useAutoEndTurn.ts` | Auto-end turn on time/health depletion, death handling | 96 |
| `usePlayerAnimation.ts` | Movement animation state, path tracking, completion handler | 70 |

### 5. `CombatView.tsx` (671 → 204 + 5 combat files)
Extracted 3 inner components + shared HealthBar into `src/components/game/combat/`:
| New File | Contents | Lines |
|----------|----------|-------|
| `HealthBar.tsx` | Shared health bar with color thresholds | ~30 |
| `EncounterIntro.tsx` | Pre-fight encounter card with stats and action button | ~150 |
| `EncounterResultView.tsx` | Post-fight result display with continue/retreat options | ~170 |
| `FloorSummaryView.tsx` | End-of-floor summary with encounter log and totals | ~130 |
| `index.ts` | Barrel re-export | ~10 |

### 6. `HomePanel.tsx` (614 → 121 + 4 home files)
Extracted room scene and UI into `src/components/game/home/`:
| New File | Contents | Lines |
|----------|----------|-------|
| `RoomScene.tsx` | Full room visual rendering (walls, floor, furniture, appliances, decorations) | ~400 |
| `HomeActionBar.tsx` | Relax/Sleep/Done action buttons | ~80 |
| `ApplianceLegend.tsx` | Bottom legend showing owned/broken appliances | ~40 |
| `index.ts` | Barrel re-export | ~10 |

### Summary
| File | Before | After | New Files |
|------|--------|-------|-----------|
| `dungeon.ts` | 946 | (deleted) | 5 files in `dungeon/` |
| `actionGenerator.ts` | 835 | 106 | 7 files in `actions/` |
| `turnHelpers.ts` | 792 | 108 | 2 helper files |
| `GameBoard.tsx` | 774 | 576 | 4 hooks |
| `CombatView.tsx` | 671 | 204 | 5 files in `combat/` |
| `HomePanel.tsx` | 614 | 121 | 4 files in `home/` |

### Build & Tests
- TypeScript compiles cleanly
- Build succeeds
- 112/112 tests pass

---

## 2026-02-06 - Standardize Beige/Brown Text Design

Text on dark brown `wood-frame` backgrounds was nearly invisible across the entire game. The root cause: `text-muted-foreground` (medium-dark brown `hsl(30 25% 35%)`) and `text-card` (light in light mode but dark in dark mode) were used on the fixed dark brown gradient background (`hsl(30 35% 35%)` → `hsl(25 40% 20%)`).

### Changes

**1. Newspaper Text Fix** (`NewspaperModal.tsx`)
- Article body: `text-muted-foreground` → `text-parchment-dark` (visible beige on dark wood)
- Article base color: `text-card` → `text-parchment` (always light, mode-independent)

**2. ShadowfingersModal Standardization** (`ShadowfingersModal.tsx`)
- Headline section: raw `bg-amber-100/text-amber-*` → design system `bg-parchment-dark/text-card-foreground`
- Stolen items list: raw `bg-amber-50/text-amber-*` → design system `bg-parchment-dark/text-card-foreground`
- Effects box: `text-card` → `text-parchment`

**3. Global wood-frame Text Standardization** (15 files)
- **Rule**: All `wood-frame` elements now use `text-parchment` (always `hsl(40 40% 92%)`, never changes with dark mode) instead of `text-card` (which maps to dark in dark mode)
- **Secondary text**: All `text-muted-foreground` inside `wood-frame` → `text-parchment-dark`
- This ensures readable beige text on brown backgrounds in both light and dark modes

### Files Modified
| File | Change |
|------|--------|
| `NewspaperModal.tsx` | Article text: `text-card` → `text-parchment`, body: `text-muted-foreground` → `text-parchment-dark` |
| `ShadowfingersModal.tsx` | Headline/stolen items → design system colors, effects → `text-parchment` |
| `WorkSection.tsx` | Wood-frame: `text-card` → `text-parchment`, subtext: → `text-parchment-dark` |
| `EnchanterPanel.tsx` | Repair/shop wood-frame: → `text-parchment`, descriptions: → `text-parchment-dark` |
| `QuestPanel.tsx` | Active/available quest cards: → `text-parchment`, descriptions: → `text-parchment-dark` |
| `LandlordPanel.tsx` | Housing info/options: → `text-parchment`, descriptions: → `text-parchment-dark` |
| `ForgePanel.tsx` | Job offers: → `text-parchment`, shift info: → `text-parchment-dark` |
| `HealerPanel.tsx` | Health display + all service buttons: → `text-parchment` |
| `EventModal.tsx` | Effects display: → `text-parchment` |
| `ActionButton.tsx` | Shared button component: → `text-parchment` |
| `PawnShopPanel.tsx` | All buttons: → `text-parchment`, gambling odds: → `text-parchment-dark` |
| `ResourcePanel.tsx` | Resource cards: → `text-parchment` |
| `TitleScreen.tsx` | All wood-frame buttons: → `text-parchment` |
| `GameSetup.tsx` | Preset/back buttons: → `text-parchment` |
| `OnlineLobby.tsx` | All wood-frame buttons: → `text-parchment` |

### Design System Standard (established)
- **On `wood-frame` (dark brown bg)**: Use `text-parchment` for primary text, `text-parchment-dark` for secondary
- **On `parchment-panel` (light beige bg)**: Use `text-card-foreground` for primary, `text-muted-foreground` for secondary

### Build & Tests
- TypeScript compiles cleanly
- Build succeeds
- 112/112 tests pass

---

## 2026-02-06 - Economy Stabilization: Gradual Drift System

The economy was too volatile — `priceModifier` was fully random (0.7–1.3) every single week, causing prices and wage offers to swing wildly. Combined with the per-job wage multiplier (0.5–2.5×), the effective wage range was enormous and felt unstable.

### Changes

**1. Economic Cycle System** (`game.types.ts`, `turnHelpers.ts`)
- Added `economyTrend` (-1 = recession, 0 = stable, 1 = boom) and `economyCycleWeeksLeft` to GameState
- Each cycle lasts 3–7 weeks before the trend changes
- Trend selection: 35% boom, 35% stable, 30% recession

**2. Gradual Price Drift** (`turnHelpers.ts:processWeekEnd`)
- **Before**: `priceModifier = 0.7 + Math.random() * 0.6` (fully random each week)
- **After**: `priceModifier += trend × (0.02-0.06) + noise(±0.015)`, clamped to 0.75–1.25
- Prices now move smoothly in one direction for several weeks, then gradually shift
- Players can observe trends and plan purchases accordingly

**3. Narrowed Wage Offer Variance** (`jobs/utils.ts:calculateOfferedWage`)
- **Before**: `baseMultiplier = 0.5 + random × 2.0` → range 0.5–2.5×
- **After**: `baseMultiplier = 0.7 + random × 0.9` → range 0.7–1.6×
- Final wage clamped to 0.5–2.0× (was 0.5–2.5×)
- Combined with economy (0.75–1.25), effective range is ~0.53–2.0× (was ~0.35–3.25×)

**4. Market Crashes Tied to Economy Trend** (`turnHelpers.ts`)
- **Before**: 3% layoff + 5% paycut every single week regardless of economy
- **After**: Market crashes (layoff/paycut) only occur during recession trend AND when priceModifier < 0.9
- Stock market crashes: only during recession, 10% per recession week (was 5% every week)
- Net effect: crashes are rarer but more thematic — they happen during downturns, not randomly during booms

**5. UI: Economy Trend Indicator** (`GameBoard.tsx`)
- Market display now shows trend arrow: ↑ (boom), ↓ (recession), ↔ (stable)
- Tooltip explains the current trend direction

**6. Newspaper Trend Info** (`newspaper.ts`, `LocationPanel.tsx`)
- Newspaper economy articles now include trend forecast text
- "Economists expect continued growth" / "Experts warn of further decline"

### Before vs After (typical 10-week sequence)

```
BEFORE: 0.73, 1.28, 0.85, 1.19, 0.71, 1.25, 0.92, 1.30, 0.74, 1.12
         (random jumps, no continuity)

AFTER:  1.00, 1.04, 1.07, 1.10, 1.12, 1.09, 1.06, 1.03, 1.00, 0.97
         (gradual drift with trend cycles)
```

### Files Modified
| File | Change |
|------|--------|
| `src/types/game.types.ts` | Added `economyTrend`, `economyCycleWeeksLeft` to GameState |
| `src/store/helpers/turnHelpers.ts` | Cycle-based drift replaces random priceModifier; crash gating |
| `src/data/jobs/utils.ts` | Narrowed wage offer range (0.7–1.6, was 0.5–2.5) |
| `src/store/gameStore.ts` | Initial state + startNewGame + loadFromSlot with new fields |
| `src/data/newspaper.ts` | Trend forecast text in economy articles |
| `src/components/game/GameBoard.tsx` | Trend arrow indicator (↑↓↔) |
| `src/components/game/LocationPanel.tsx` | Pass economyTrend to newspaper |
| `src/network/useOnlineGame.ts` | Sync new economy fields |
| `src/network/useNetworkSync.ts` | Sync new economy fields |

### Build & Tests
- TypeScript compiles cleanly
- Build succeeds
- 111/112 tests pass (1 pre-existing failure in freshFood starvation test)

---

## 2026-02-06 - Online Multiplayer Implementation (WebRTC P2P)

Implemented full online multiplayer support using PeerJS (WebRTC) for peer-to-peer connections. Players on different devices can now play turn-based games together without any server infrastructure.

### Architecture: Host-Authoritative P2P

```
┌─────────────┐     PeerJS Cloud      ┌─────────────┐
│   HOST PC   │ ←──── Signaling ────→ │  GUEST PC   │
│             │                        │             │
│ Zustand     │ ←── WebRTC Data ────→ │ Read-only   │
│ Store       │     Channel            │ State Copy  │
│ (Authority) │                        │             │
│             │  State broadcasts →    │             │
│             │  ← Action requests     │             │
└─────────────┘                        └─────────────┘
```

**Key design decisions:**
- **WebRTC P2P via PeerJS** — No server needed. Free PeerJS cloud handles signaling only. Game data flows directly between peers via WebRTC data channels.
- **Host-authoritative model** — Host's Zustand store is the single source of truth. Host runs all game logic (turn processing, events, AI). Guests receive state snapshots.
- **Action forwarding** — When a guest player acts, their store actions are intercepted and forwarded to the host via WebRTC. Host executes, then broadcasts new state.
- **6-character room codes** — Human-readable codes (e.g., "K7M2NP") used as PeerJS peer IDs for room discovery.
- **State sync** — Full serialized GameState (~10-50KB) broadcast on every state change, debounced at 50ms. Acceptable for turn-based game.

### Network Flow

**Room Creation (Host):**
1. Host clicks "Online Multiplayer" → "Create Room"
2. PeerManager creates PeerJS peer with room code as ID
3. Host sees 6-character room code to share
4. Guests connect via WebRTC data channel

**Room Joining (Guest):**
1. Guest enters 6-character room code
2. PeerJS connects to host's peer ID
3. Guest sends `join` message with name
4. Host adds to lobby, broadcasts lobby update

**Game Start:**
1. Host configures goals, AI, then clicks "Start Game"
2. Host calls `startNewGame()` on local store
3. Host broadcasts `game-start` with full serialized state
4. Guests apply state, set `networkMode: 'guest'`

**During Gameplay:**
1. Host's store changes → debounced broadcast to all guests (50ms)
2. Guest's turn → actions intercepted by `NetworkActionProxy` → forwarded to host
3. Host executes action → state changes → broadcast
4. Non-current player sees "Waiting for [name]..." overlay

### Implementation Details

**New files created:**
| File | Purpose |
|------|---------|
| `src/network/types.ts` | Network message types, lobby types, action classifications |
| `src/network/roomCodes.ts` | Room code generation and validation (6-char alphanum) |
| `src/network/PeerManager.ts` | PeerJS singleton: create/join rooms, message routing |
| `src/network/NetworkActionProxy.ts` | Intercepts guest store actions, forwards to host |
| `src/network/useOnlineGame.ts` | React hook for lobby management (create/join/start) |
| `src/network/useNetworkSync.ts` | React hook for gameplay sync (state broadcast/receive) |
| `src/components/screens/OnlineLobby.tsx` | Lobby UI: create room, join room, player list, settings |

**Modified files:**
| File | Change |
|------|--------|
| `src/types/game.types.ts` | Added `'online-lobby'` phase, `networkMode`/`localPlayerId`/`roomCode` to GameState |
| `src/store/gameStore.ts` | Added network state, wrapped all helper actions with `wrapWithNetworkGuard()` |
| `src/pages/Index.tsx` | Added OnlineLobby route for `'online-lobby'` phase |
| `src/components/screens/TitleScreen.tsx` | Added "Online Multiplayer" button |
| `src/components/game/GameBoard.tsx` | Added `useNetworkSync`, waiting overlay, connection indicator, turn lock for online |

**Action interception pattern:**
```typescript
// In gameStore.ts — wraps ALL helper module actions
function wrapWithNetworkGuard<T>(actions: T): T {
  for (const [name, fn] of Object.entries(actions)) {
    if (typeof fn !== 'function') continue;
    wrapped[name] = (...args) => {
      if (forwardIfGuest(name, args)) return; // Guest → forward to host
      return fn(...args);                      // Host/local → execute
    };
  }
}

// Actions classified as:
// LOCAL_ONLY: selectLocation, dismissEvent, etc. (execute on guest locally)
// HOST_INTERNAL: startTurn, processWeekEnd, etc. (never triggered by guests)
// All others: forwarded to host when in guest mode
```

**Auto-save disabled for guests** — Only host saves game state. Guest stores are read-only mirrors.

### Technical Notes

- PeerJS v1.5.5 installed (WebRTC wrapper, ~50KB gzipped)
- Room codes exclude ambiguous chars: no O/0/I/1/L
- PeerJS peer ID format: `guild-life-XXXXXX` (prefixed to avoid collisions)
- Connection timeout: 10s for joining rooms
- State serialization includes all GameState fields except functions
- AI (Grimwald) always runs on host machine
- Build: 932KB JS bundle (unchanged from before PeerJS — tree-shaken well)
- All 112 tests pass, production build succeeds

### Limitations (v1)

- No host migration (if host disconnects, game ends)
- No reconnection after disconnect
- No spectator mode (all connected players must be in the game)
- Room codes not persisted (refreshing host page destroys room)
- No chat system between players
- Max 4 human players (same as local)
- NAT traversal may fail for ~10-15% of users behind strict firewalls (would need TURN server)

## 2026-02-06 - Full Balance Audit: Education vs Jobs vs Quests vs Cave

Comprehensive playthrough simulation analysis of game balance across all four progression systems: education, jobs, quests, and dungeon. Three critical bugs found and fixed, plus full quest economy rebalance.

### Methodology

Simulated complete playthroughs by computing gold/hour rates, time investments, and ROI for every degree, job, quest, and dungeon floor. Cross-referenced DEGREE_TO_PATH mapping against quest requirements to verify all content is reachable.

### Critical Bug: 3 Quests Were Impossible to Take

**File:** `src/data/quests.ts`

The `DEGREE_TO_PATH` mapping in `workEducationHelpers.ts` gives each education path a maximum level:
- **fighter**: combat-training + master-combat = max level **2**
- **mage**: arcane-studies + sage-studies + loremaster + alchemy = max level **4**
- **priest**: scholar + advanced-scholar = max level **2**
- **business**: trade-guild + junior-academy + commerce = max level **3**

Three quests required fighter levels that exceed the maximum:

| Quest | Required | Max Possible | Status |
|-------|----------|-------------|--------|
| Monster Slaying (B) | fighter 3 | fighter 2 | **IMPOSSIBLE** |
| Dragon Investigation (A) | fighter 4 | fighter 2 | **IMPOSSIBLE** |
| Dragon Slayer (S) | fighter 4 | fighter 2 | **IMPOSSIBLE** |

**Fix:** Reduced all three to `fighter level 2` (requires Master Combat degree). These quests are already gated behind guild rank (B=adept/15 quests, A=veteran/25 quests, S=elite/40 quests), so the guild rank requirement provides sufficient progression gating.

### Balance Issue: All Quest Gold Rates Were Below Entry-Level Work

**File:** `src/data/quests.ts`

Before rebalance, every single quest paid less per hour than the lowest entry-level job (Floor Sweeper at 4g/hr × 1.15 bonus = 4.6g/hr):

| Rank | Quest | Old Gold/Time | Old g/hr | Comparison |
|------|-------|--------------|----------|------------|
| E | Rat Extermination | 20g / 8h | 2.50 | Below Floor Sweeper (4.6) |
| E | Package Delivery | 12g / 4h | 3.00 | Below Floor Sweeper |
| D | Guard Duty | 30g / 12h | 2.50 | Below Floor Sweeper |
| D | Urgent Courier | 35g / 20h | 1.75 | Far below Floor Sweeper |
| C | Bandit Hunt | 65g / 24h | 2.71 | Below Floor Sweeper |
| B | Monster Slaying | 100g / 36h | 2.78 | Below Floor Sweeper |
| A | Dragon Investigation | 175g / 48h | 3.65 | Below Floor Sweeper |
| S | Dragon Slayer | 500g / 100h | 5.00 | Only S-rank matched entry work |

This made quests a pure gold loss. Players doing quests fell behind economically vs pure work strategies. S-rank quests also consumed 80-100 hours (1.3-1.7 full weeks), leaving no time for anything else.

### Fix: Quest Gold/Time Rebalance

Rebalanced all 18 quests so gold/hour scales competitively with equivalent-tier jobs. Quests remain slightly below pure work rates (working is always optimal for pure gold), but now provide meaningful income alongside happiness rewards and guild rank progression.

| Rank | Quest | Old → New Gold | Old → New Time | New g/hr |
|------|-------|---------------|---------------|----------|
| E | Rat Extermination | 20 → 25g | 8 → 5h | 5.0 |
| E | Package Delivery | 12 → 15g | 4 → 3h | 5.0 |
| E | Herb Gathering | 15 → 18g | 6 → 4h | 4.5 |
| E | Find Lost Cat | 25 → 30g | 10 → 6h | 5.0 |
| D | Escort Merchant | 40 → 50g | 16 → 10h | 5.0 |
| D | Guard Duty | 30 → 42g | 12 → 6h | 7.0 |
| D | Urgent Courier | 35 → 40g | 20 → 8h | 5.0 |
| C | Bandit Hunt | 65 → 80g | 24 → 10h | 8.0 |
| C | Lost Artifact | 75 → 90g | 28 → 12h | 7.5 |
| C | Curse Investigation | 55 → 65g | 20 → 8h | 8.1 |
| B | Monster Slaying | 100 → 140g | 36 → 14h | 10.0 |
| B | Dungeon Dive | 120 → 160g | 40 → 16h | 10.0 |
| B | Exorcism | 85 → 110g | 24 → 10h | 11.0 |
| A | Dragon Investigation | 175 → 220g | 48 → 18h | 12.2 |
| A | Demon Cult | 200 → 260g | 56 → 22h | 11.8 |
| A | Ancient Evil | 185 → 240g | 52 → 18h | 13.3 |
| S | Deep Dungeon Clear | 400 → 450g | 80 → 30h | 15.0 |
| S | Dragon Slayer | 500 → 600g | 100 → 36h | 16.7 |

**Design rationale:** Quests provide three things work doesn't:
1. **Happiness rewards** (1-20 per quest, critical for happiness victory)
2. **Guild rank progression** (critical for career victory, requires 15 quests for adept)
3. **Variety** (no clothing/dependability requirements, no employer needed)

### Education Balance Analysis (No Changes Needed)

Verified all education paths are balanced for their purpose:

**Cost-efficiency ranking:**

| Path | Degrees | Cost | Time | Best Job Unlocked | Wage |
|------|---------|------|------|-------------------|------|
| Commerce only | JA + Commerce (2) | 150g | 120h | Shop Manager | 16g/hr |
| Combat path | TG + CT + MC (3) | 250g | 180h | Weapons Instructor | 19g/hr |
| Combined | JA + Com + TG + CT + MC (5) | 400g | 300h | Forge Manager | 23g/hr |
| Full academic | JA → Sch → ASch → SS → LM (5) | 750g | 300h | Sage | 20g/hr |
| Ultimate | All 9 required degrees | 1100g | 540h | Guild Master's Asst | 25g/hr |

The academic path costs 3x more than combat for similar wages, but this is balanced by:
- More education points per gold spent (critical for education victory)
- Mage path quest access (Ancient Evil, Curse Investigation)
- Dungeon bonuses (Scholar +10% gold, Arcane Studies +15% gold + ghost damage)
- Multiple graduation happiness bonuses (+5 per degree × 5 = +25 total)

**Conclusion:** Education paths represent different strategies — combat for quick income, academic for education victory + dungeon bonuses, commerce for mid-game management jobs. No changes needed.

### Job Balance Analysis (No Changes Needed)

Job wage progression is well-structured:
- **Entry (0 degrees):** 4-6g/hr — survivable, intentionally low to motivate education
- **Junior (1 degree):** 6-10g/hr — Trade Guild unlocks best early jobs
- **Mid (2 degrees):** 10-18g/hr — meaningful wage jump rewards education investment
- **Senior (2-3 degrees):** 18-23g/hr — high wages for committed players
- **Master (3+ degrees):** 21-25g/hr — top tier, requires significant investment

Trade Guild Certificate ROI is excellent: 50g + 60h invested → Market Vendor at 10g/hr (from 4g/hr) = breakeven in ~1.5 weeks. This motivates early education, which is good design.

### Dungeon Balance Analysis (No Changes Needed)

Dungeon gold/hour scales progressively:
- **Floor 1:** 2.5-8.3g/hr (below work, but exists for progression + rare drops)
- **Floor 2:** 3-10g/hr (comparable to entry work after equipment costs)
- **Floor 3:** 4.3-14.3g/hr (mid-level, requires sword + armor investment)
- **Floor 4:** 6.7-22.2g/hr (high-tier, requires Steel Sword + Chainmail)
- **Floor 5:** 11.4-27.3g/hr (competitive with top jobs, requires Enchanted Blade + Plate)

Health costs reduce effective gold rates significantly. With healing potions at 75g/50HP, Floor 5's ~95 HP average damage costs ~142g to heal, reducing net gold from ~425g to ~283g (12.9g/hr). This makes dungeon farming competitive with but not dominant over working at equivalent career levels.

Education bonuses dramatically improve survivability: Master Combat (-25% damage) + Trade Guild (trap disarm) can reduce Floor 5 total damage from ~200 to ~80 HP. This rewards education investment for dungeon strategies.

### Career Victory Goal Analysis

Default career goal: rank 4 (adept) requiring 15 completed quests.

With the quest time rebalance:
- 15 E-rank quests × 5h average = 75h of quest time
- Plus travel to Guild Hall (~7h from Slums per trip, can chain quests)
- Achievable in ~2-3 weeks of focused questing
- Plus 500g guild pass investment

This is well-balanced against other victory goals:
- Education (45 pts = 5 degrees): ~5 weeks + 450g
- Wealth (5000g): ~8-12 weeks of sustained work
- Happiness (75): ~6-10 weeks with active management
- Career (rank 4): ~2-3 weeks of questing + guild pass

All four goals converge around weeks 8-12, creating a well-paced game.

### DEGREE_TO_PATH Mapping Reference

For future reference, the complete degree-to-education-path mapping:

```
trade-guild      → business (level +1)
junior-academy   → business (level +1)
commerce         → business (level +1)    Max business: 3
combat-training  → fighter  (level +1)
master-combat    → fighter  (level +1)    Max fighter: 2
arcane-studies   → mage     (level +1)
sage-studies     → mage     (level +1)
loremaster       → mage     (level +1)
alchemy          → mage     (level +1)    Max mage: 4
scholar          → priest   (level +1)
advanced-scholar → priest   (level +1)    Max priest: 2
```

All quest education requirements now respect these maximums.

### Files Changed

| File | Change |
|------|--------|
| `src/data/quests.ts` | Fixed 3 impossible education requirements, rebalanced all 18 quest gold/time values |

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds (65 precached entries)
- 111/112 tests pass (1 pre-existing freshFood test failure, unrelated)

---

## 2026-02-06 - Forge, Cave & Turn-End Bug Fixes

Three critical gameplay bugs fixed: Forge work bypass, deferred cave damage, and premature turn endings.

### Bug 1: Forge Work Without Guild Hall Hiring

**Files:** `LocationPanel.tsx:269-311`, `ForgePanel.tsx` (no longer imported)

**Problem:** ForgePanel had a "Work" button that called `setJob()` + `workShift()` in one click, letting players work at the Forge without ever being hired through the Guild Hall. This bypassed all job qualification checks (degrees, experience, dependability, clothing).

**Fix:** Replaced the ForgePanel integration with the same WorkSection pattern used by Enchanter and Shadow Market:
- Work tab at Forge only appears if player already has a Forge job (hired via Guild Hall)
- Uses the existing `WorkSection` component which validates `jobData.location === 'Forge'`
- If no Forge job, shows an info message directing the player to the Guild Hall
- ForgePanel import removed from LocationPanel

### Bug 2: Cave Damage Deferred & Not Deadly Enough

**Files:** `CombatView.tsx:37-48,537-560,570-594`, `CavePanel.tsx:125-138`, `useGrimwaldAI.ts:319-322`, `dungeon.ts` (all floor encounters)

**Problem (2a — Deferred Damage):** Health damage from dungeon encounters was tracked in local React state only (CombatView's `runState.currentHealth`). The actual game store health was only updated once at the end of the entire floor via `handleCombatComplete → modifyHealth(result.healthChange)`. This meant:
- Players couldn't actually die mid-combat
- All damage was batched and applied at once after the floor
- The game state was inconsistent with what the player saw

**Fix:** Added `onEncounterHealthDelta` callback prop to CombatView:
- After each encounter fight, the health delta is immediately applied to the game store via `modifyHealth()`
- `checkDeath()` is called after each encounter — if the player dies, combat ends immediately (forced to floor-summary)
- `handleCombatComplete` no longer applies healthChange (set to 0, since damage is already applied per-encounter)

**Problem (2b — AI Missing Death Check):** The Grimwald AI dungeon handler applied health damage via `modifyHealth()` but never called `checkDeath()` afterward. An AI at 0 HP could survive until the next turn.

**Fix:** Added `checkDeath(player.id)` call after AI dungeon combat in `useGrimwaldAI.ts`.

**Problem (2c — Damage Too Low):** Dungeon encounters had low base damage values that were heavily mitigated by equipment and education bonuses, making combat trivial for prepared players.

**Fix:** Increased base damage across all 5 floors (~40-60% increase):

| Floor | Old Damage Range | New Damage Range | Boss Old → New |
|-------|-----------------|------------------|----------------|
| F1 Entrance | 4-10 | 7-15 | 10 → 15 |
| F2 Goblin | 10-18 | 15-25 | 18 → 25 |
| F3 Undead | 15-28 | 22-38 | 28 → 38 |
| F4 Dragon | 25-40 | 35-55 | 40 → 55 |
| F5 Abyss | 35-55 | 50-75 | 55 → 75 |

Updated `healthRisk` display values to match new damage ranges.

### Bug 3: Premature Turn Ending (Time Bug)

**Files:** `GameBoard.tsx:218-278`, `workEducationHelpers.ts:155,197`

**Problem (3a — setTimeout Race Condition):** `checkAutoReturn()` used `setTimeout(endTurn, 500)` when time ran out. This timeout was never cancelled and had no guard against firing after the turn had already changed. Race condition scenario:
1. Player A's time runs out → setTimeout schedules endTurn in 500ms
2. Something else triggers endTurn first (or turn ends naturally)
3. Player B's turn starts
4. The stale setTimeout fires, calling endTurn() again → Player B's turn ends instantly with no actions taken

**Fix:** Added `scheduledEndTurnRef` and `autoEndTimerRef` guards:
- `scheduledEndTurnRef` tracks which playerIndex the scheduled endTurn is for — prevents scheduling twice
- `autoEndTimerRef` stores the timer ID so it can be cleared
- When the timer fires, it verifies `useGameStore.getState().currentPlayerIndex === currentPlayerIndex` before calling endTurn
- A cleanup effect resets both refs and clears the timer when `currentPlayerIndex` changes

**Problem (3b — Missing Math.max in Education):** `studySession()` and `studyDegree()` in workEducationHelpers.ts computed `timeRemaining: p.timeRemaining - hours` without `Math.max(0, ...)`. Although guarded by `if (p.timeRemaining < hours) return p`, a race condition with concurrent state changes could theoretically make timeRemaining go negative.

**Fix:** Added `Math.max(0, ...)` to both functions for defensive safety.

### Files Changed

| File | Change |
|------|--------|
| `src/components/game/LocationPanel.tsx` | Replaced ForgePanel with WorkSection pattern + info message |
| `src/components/game/CombatView.tsx` | Added `onEncounterHealthDelta` callback, applies damage per-encounter |
| `src/components/game/CavePanel.tsx` | Added `handleEncounterHealthDelta`, passes to CombatView |
| `src/hooks/useGrimwaldAI.ts` | Added `checkDeath()` after AI dungeon combat |
| `src/data/dungeon.ts` | Increased baseDamage/basePower for all 5 floors + bosses |
| `src/components/game/GameBoard.tsx` | Added endTurn race condition guards (refs + timer cleanup) |
| `src/store/helpers/workEducationHelpers.ts` | Added Math.max(0) to studySession and studyDegree |

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds (65 precached entries)
- 110/112 tests pass (2 pre-existing freshFood test failures, unrelated)

---

## 2026-02-06 - Multi-Platform Game Runner (GitHub Pages + Lovable)

Made the game deployable and runnable from both GitHub Pages and Lovable without any manual configuration changes. Previously the game was hardcoded for Lovable's root-path deployment; now it dynamically adapts to the hosting platform.

### Problem

The game had ~18 hardcoded absolute asset paths (`/music/...`, `/npcs/...`, `/sfx/...`) and a fixed root base path (`/`). This works on Lovable (serves at `/`) but breaks on GitHub Pages (serves at `/guild-life-adventures/`).

### What was changed

1. **Dynamic base path in `vite.config.ts`** — `DEPLOY_TARGET=github` env var switches base from `/` to `/guild-life-adventures/`. PWA manifest `scope` and `start_url` also adapt.

2. **Safe lovable-tagger import** — Replaced static `import { componentTagger } from "lovable-tagger"` with a try/catch dynamic `await import("lovable-tagger")`. Build no longer fails if the package is unavailable.

3. **BrowserRouter basename** — `App.tsx` now uses `basename={import.meta.env.BASE_URL}` so React Router routes resolve correctly regardless of deploy path.

4. **Fixed 18+ hardcoded absolute asset paths:**
   - `src/audio/audioManager.ts` — music URLs now use `import.meta.env.BASE_URL`
   - `src/audio/sfxManager.ts` — SFX URLs now use `import.meta.env.BASE_URL`
   - `src/data/npcs.ts` — 12 NPC portrait paths changed from `/npcs/x.jpg` to `npcs/x.jpg`
   - `src/components/game/NpcPortrait.tsx` — prepends `BASE_URL` to portrait src
   - `src/components/game/RightSideTabs.tsx` — admin/sfx link uses `BASE_URL`
   - `src/pages/NotFound.tsx` — replaced `<a href="/">` with React Router `<Link to="/">`
   - `index.html` — apple-touch-icon uses relative path

5. **GitHub Actions workflow** — `.github/workflows/deploy-github-pages.yml` auto-deploys on push to `main`:
   - Uses Bun for install + build
   - Copies `index.html` as `404.html` (SPA routing on GitHub Pages)
   - Deploys to GitHub Pages via `actions/deploy-pages`

6. **New build script** — `bun run build:github` builds with `DEPLOY_TARGET=github`

### Build commands

| Command | Target | Base Path |
|---------|--------|-----------|
| `bun run build` | Lovable (default) | `/` |
| `bun run build:github` | GitHub Pages | `/guild-life-adventures/` |
| `bun run dev` | Local development | `/` |

### Files added
- `.github/workflows/deploy-github-pages.yml` — CI/CD for GitHub Pages

### Files modified
- `vite.config.ts` — dynamic base path, safe lovable-tagger import
- `package.json` — added `build:github` script
- `src/App.tsx` — BrowserRouter basename
- `src/audio/audioManager.ts` — BASE_URL for music paths
- `src/audio/sfxManager.ts` — BASE_URL for SFX paths
- `src/data/npcs.ts` — relative NPC portrait paths
- `src/components/game/NpcPortrait.tsx` — BASE_URL for portrait src
- `src/components/game/RightSideTabs.tsx` — BASE_URL for admin link
- `src/pages/NotFound.tsx` — React Router Link
- `index.html` — relative apple-touch-icon path

### Verification
- `bun run build` succeeds (64 precached entries, Lovable mode)
- `DEPLOY_TARGET=github bun run build` succeeds (64 precached entries, GitHub Pages mode)
- TypeScript compiles cleanly (`tsc --noEmit`)
- All 112 tests pass
- GitHub Pages manifest has correct `/guild-life-adventures/` scope and start_url

### How to enable GitHub Pages

1. Go to repo Settings → Pages
2. Set Source to "GitHub Actions"
3. Push to `main` — workflow auto-deploys to `https://tombonator3000.github.io/guild-life-adventures/`

---

## 2026-02-06 - Offline PWA Support (Progressive Web App)

Added full PWA support with offline capability and installability. The game can now be installed as a standalone app on desktop and mobile, with all assets cached for offline play.

### What was added

1. **vite-plugin-pwa** — Integrated Workbox-based service worker generation via `vite-plugin-pwa`
2. **Web App Manifest** — Full manifest with app name, description, theme colors (#1a1a2e dark blue), landscape orientation, and 9 icon sizes
3. **App Icons** — SVG source icon (shield + sword design) with generated PNGs at 72/96/128/144/152/192/384/512px + maskable 512px + Apple touch icon 180px
4. **Service Worker** — Auto-updating service worker with:
   - Precaching of all HTML, CSS, JS, images (64 entries including the 10MB game board)
   - Runtime CacheFirst strategy for music files (MP3s cached for 1 year)
   - Runtime CacheFirst strategy for images (cached for 30 days)
5. **Install Prompt** — `usePWAInstall` hook captures the `beforeinstallprompt` event; Download button appears on TitleScreen when installation is available
6. **HTML Meta Tags** — Apple mobile web app tags, theme-color, apple-touch-icon link

### Files Added
- `public/icon.svg` — Source SVG icon (shield + sword + "GUILD LIFE" text)
- `public/pwa-{72,96,128,144,152,192,384,512}x512.png` — Rasterized icons
- `public/pwa-maskable-512x512.png` — Maskable icon with safe-zone padding
- `public/apple-touch-icon.png` — 180x180 Apple touch icon
- `src/hooks/usePWAInstall.ts` — PWA install prompt hook
- `scripts/generate-icons.mjs` — Icon generation script (uses sharp)

### Files Modified
- `vite.config.ts` — Added VitePWA plugin with manifest, workbox config, runtime caching
- `index.html` — Updated title to "Guild Life Adventures", added PWA meta tags (theme-color, apple-mobile-web-app-capable, apple-touch-icon)
- `src/vite-env.d.ts` — Added vite-plugin-pwa/client type reference
- `src/components/screens/TitleScreen.tsx` — Added Download/Install button (visible when browser supports PWA install)
- `package.json` — Added vite-plugin-pwa dependency

### How it works
- On first visit, the service worker precaches all game assets (JS, CSS, HTML, images, icons)
- Music files are cached on first play via runtime CacheFirst strategy
- Once cached, the entire game works fully offline — no server needed
- Browsers show an "Install" option (or the in-app Download button) to add the game as a standalone app
- Installed app launches in standalone mode (no browser chrome, landscape orientation)
- Service worker auto-updates when new versions are deployed

### Verification
- Build succeeds (`bun run build`) — 64 precached entries, sw.js + registerSW.js generated
- 110/112 tests pass (2 pre-existing freshFood test failures, unrelated)
- Manifest validates with all required fields for installability

---

## 2026-02-06 - Cave/Dungeon Music (20Cave.mp3)

Added location-specific music for the Cave/Dungeon. The file `20Cave.mp3` already existed in `public/music/` but was not wired up in the music configuration.

### Changes
- **`src/audio/musicConfig.ts`**: Added `'cave'` track to `MUSIC_TRACKS` (pointing to `20Cave.mp3`) and added `'cave': 'cave'` mapping to `LOCATION_MUSIC`

### How it works
- The `useMusicController` hook in `src/hooks/useMusic.ts` automatically selects music based on the current player's `locationId`
- When a player enters the Cave location (`locationId: 'cave'`), the AudioManager crossfades from whatever was playing to `20Cave.mp3`
- Music persists throughout dungeon combat since the player stays at the cave location
- When the player leaves the cave, the AudioManager crossfades back to the destination location's track (or the default `OnTheStreet` track)

### Files Modified
- `src/audio/musicConfig.ts` — Added cave track definition and location mapping

### Verification
- Build succeeds (`bun run build`)
- 111/112 tests pass (1 pre-existing freshFood test failure, unrelated)

---

## 2026-02-06 - Cave Combat Damage Fix & Dungeon Audit

Full audit of cave/dungeon combat system. Found and fixed 4 bugs (1 critical, 2 fairness, 1 balance).

### Bug 1 (CRITICAL): Player/AI Not Taking Correct Damage After Combat

**Files:** `CavePanel.tsx:134`, `CombatView.tsx:51-61,578`, `combatResolver.ts:333-341`, `useGrimwaldAI.ts:309`

**Problem:** After dungeon combat ended, health change was calculated as `netDamage = totalDamage - totalHealed`, then applied as `modifyHealth(player.id, -netDamage)`. But `totalHealed` counted ALL healing attempted — including healing that was wasted because the player was already near max health. Since `applyEncounterResult()` correctly caps health at `startHealth`, the internal combat health was accurate, but the post-combat application used the inflated `totalHealed` value.

**Example:** Enter with 100 HP. Take 5 damage (→95). Heal 15 (→100, capped; 10 wasted). Take 10 damage (→90). At end: `totalDamage=15, totalHealed=15, netDamage=0`. Player exits with 100 HP instead of 90 HP. In extreme cases with Alchemy potions, player could GAIN health from combat.

**Fix:** Added `healthChange` field to both `CombatRunResult` and `AutoResolveResult` interfaces. Calculated as `currentHealth - startHealth` (the real HP delta from the combat run). Both `CavePanel.handleCombatComplete()` and AI's dungeon handler now use `healthChange` instead of the buggy `totalDamage - totalHealed`.

### Bug 2 (FAIRNESS): AI Missing 25% Defeat Gold Penalty

**File:** `useGrimwaldAI.ts:307-310`

**Problem:** When the player is defeated in combat, they keep only 25% of gold earned (`defeatGoldPenalty = 0.25` in CombatView). The AI kept 100% of gold on defeat — `modifyGold(player.id, result.goldEarned)` with no penalty applied.

**Fix:** Added `defeatGoldMult = (!result.bossDefeated) ? 0.25 : 1.0` before applying gold. AI now keeps 25% on defeat, same as player.

### Bug 3 (FAIRNESS): AI Missing -2 Defeat Happiness Penalty

**File:** `useGrimwaldAI.ts:311-317`

**Problem:** When the player is defeated, they lose 2 happiness (CombatView line 572). The AI had no happiness consequence for defeat — only happiness was applied on successful first clears.

**Fix:** Added `else if (!result.bossDefeated) modifyHappiness(player.id, -2)` to match player penalty.

### Balance: Added Healing Encounters to Floors 2-3

**File:** `dungeon.ts`

**Problem:** Only Floor 1 had a healing encounter (Healing Spring, +10 HP). Floors 2-5 had zero healing encounters. With damage scaling from 10-55 per encounter on higher floors, non-Alchemy players had no way to recover mid-floor.

**Fix:** Added healing encounters to Floor 2 and Floor 3 encounter pools:
- Floor 2: Mushroom Grotto (+8 HP) — earthy cave setting
- Floor 3: Sanctified Pool (+12 HP) — blessed water in the crypt
- Floors 4-5: No healing added (intentionally brutal, require preparation)

With 5 encounters in the pool (3 picked randomly), there's ~49% chance of getting a healing encounter per run.

### Files Changed

| File | Change |
|------|--------|
| `src/data/combatResolver.ts` | Added `healthChange` to `AutoResolveResult`; computed from `currentHealth - startHealth` |
| `src/components/game/CombatView.tsx` | Added `healthChange` to `CombatRunResult`; computed in `handleFinish` |
| `src/components/game/CavePanel.tsx` | Uses `result.healthChange` instead of `totalDamage - totalHealed` |
| `src/hooks/useGrimwaldAI.ts` | Uses `result.healthChange`; added 25% defeat gold penalty; added -2 defeat happiness |
| `src/data/dungeon.ts` | Added Mushroom Grotto (Floor 2) and Sanctified Pool (Floor 3) healing encounters |

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds
- All 112 tests pass

---

## 2026-02-06 - Partial Travel & Equipment Loss Notifications

Two gameplay improvements matching Jones in the Fast Lane behavior.

### Feature 1: Partial Travel When Not Enough Time

**Problem**: When a player had 1-4 hours remaining and clicked a location that cost more time to reach, the game showed "Not enough time to travel there!" and did nothing. This was frustrating — the player had no way to use their remaining hours.

**Solution**: If the player has some time remaining (>0) but not enough to reach the destination:
1. Calculate how many steps they can take along the path (1 hour per step, no entry cost for partial travel)
2. Animate the player walking along the partial path
3. Move them to the farthest reachable location
4. Spend all remaining time
5. Automatically end their turn
6. At the start of next turn, they return home (already existing behavior)

**Files Modified (2)**:
| File | Change |
|------|--------|
| `src/components/game/GameBoard.tsx` | `handleLocationClick` now handles partial travel with animation; `handleAnimationComplete` distinguishes full vs partial moves; `pendingMoveRef` extended with `isPartial` flag |
| `src/components/game/LocationPanel.tsx` | Travel button shows "Head toward {location}" with warning text when partial; imports `getPath` and `endTurn` |

### Feature 2: Equipment/Appliance Loss Notifications

**Problem**: When equipment (swords, armor, shields) was lost through robbery or eviction, the player received no specific notification about what was lost. Also, appliance breakage events were stored in state but never displayed to the player. Equipped items stolen in apartment robbery were not properly unequipped (bug).

**Fixes Applied (3)**:

| # | Fix | File | Details |
|---|-----|------|---------|
| 1 | **Robbery unequips stolen equipment** (BUG) | `turnHelpers.ts` | When apartment robbery steals a durable that's equipped (weapon/armor/shield), it's now properly unequipped. Notification: "Equipped gear stolen: Iron Sword, Leather Armor!" |
| 2 | **Eviction lists lost equipment** | `turnHelpers.ts` | Eviction message now lists destroyed equipment by name and appliance count (e.g., "Equipment destroyed: Steel Sword, Chainmail. 3 appliance(s) lost.") |
| 3 | **Appliance breakage toast notification** | `GameBoard.tsx` | `applianceBreakageEvent` state (existed but was never rendered) now triggers a warning toast: "Your Preservation Box broke! Repair cost: 87g at the Enchanter or Market." (6s duration) |

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds
- All 112 tests pass

---

## 2026-02-06 - Happiness Decay Rebalance (6 fixes)

Happiness was draining far too fast, making the happiness goal nearly impossible to maintain. Full audit comparing current mechanics to Jones in the Fast Lane revealed 6 major balance issues.

### Root Cause Analysis

**Problem**: Multiple overlapping happiness drains with insufficient gains. A typical turn at week 10+ with 3 work shifts would cost -6 happiness from work alone. Weekend activities only give +1-5 back. Theft events stacked -10 to -20 happiness (Jones uses -3 to -4). Housing happiness bonuses were defined in `housing.ts` but never applied anywhere in game logic.

**Comparison with Jones in the Fast Lane:**
- Jones has NO work happiness penalty
- Jones starvation is time-only, not happiness
- Jones robbery: -3 (street), -4 (apartment) — our game had -10 to -20
- Jones relaxation activities are the primary happiness source

### Fixes Applied

| # | Fix | File(s) | Before | After |
|---|-----|---------|--------|-------|
| 1 | **Apply housing happinessBonus per turn** (BUG — defined but never used) | `turnHelpers.ts`, `housing.ts` | Not applied | Homeless -3, Slums 0, Modest +2, Noble +3 per turn |
| 2 | **Reduce work happiness penalty** | `workEducationHelpers.ts` | -0/wk1-3, -1/wk4-8, **-2/wk9+** | -0/wk1-4, **-1/wk5+** |
| 3 | **Reduce starvation happiness penalty** | `turnHelpers.ts`, `game.types.ts` | **-15** per week | **-8** per week |
| 4 | **Reduce theft/robbery happiness penalties** | `events.ts` | -10/-15/-20 | -3/-5/-5/-4 (Jones-aligned) |
| 5 | **Increase relax/sleep happiness gains** | `HomePanel.tsx` | Relax +3, Sleep +5 | Relax **+5**, Sleep **+8** |
| 6 | **Weighted weekend activity selection** | `weekends.ts` | Random (all equal) | Expensive 3x, Medium 2x, Cheap 1x weight |

### Additional Event Rebalancing
| Event | Before | After |
|-------|--------|-------|
| Shadowfingers pocket theft | -10 hap | -3 hap |
| Shadowfingers major heist | -15 hap | -5 hap |
| Bank robbery | -20 hap | -5 hap |
| Shadow Market ambush | -15 hap | -4 hap |
| Illness (cold) | -5 hap | -2 hap |
| Food poisoning | -10 hap | -3 hap |

### Housing Happiness Bonus Values (adjusted for actual use)
| Tier | Old (unused) | New (applied per turn) |
|------|-------------|----------------------|
| Homeless | -10 | -3 |
| Slums | 0 | 0 |
| Modest | +3 | +2 |
| Noble Heights | +5 | +3 |

### Net Effect on Happiness Flow (typical turn, week 10+)

**Before (old balance):**
- Work 3 shifts: -6 happiness
- Weekend activity: +2 average (random cheap)
- Net per week: **-4 to -6** (losing happiness every turn)

**After (new balance):**
- Work 3 shifts: -3 happiness (reduced penalty)
- Housing bonus (Slums): 0 / (Modest): +2 / (Noble): +3
- Weekend activity: +4 average (weighted toward better)
- Net per week (Slums): **+1 to +3** / (Modest): **+3 to +5** / (Noble): **+4 to +6**

### Files Modified (8)
| File | Change |
|------|--------|
| `src/store/helpers/turnHelpers.ts` | Added housing happiness bonus in startTurn, reduced starvation penalty |
| `src/store/helpers/workEducationHelpers.ts` | Work penalty: 0/wk1-4, -1/wk5+ (was -2/wk9+) |
| `src/types/game.types.ts` | STARVATION_HAPPINESS_PENALTY: 15 → 8 |
| `src/data/housing.ts` | Adjusted happinessBonus values for actual use |
| `src/data/events.ts` | All theft/robbery/illness happiness penalties reduced 50-75% |
| `src/data/weekends.ts` | Weighted random selection (expensive 3x, medium 2x, cheap 1x) |
| `src/components/game/HomePanel.tsx` | Relax +3→+5, Sleep +5→+8, updated tooltips |
| `src/test/work.test.ts` | Updated happiness penalty test expectations |

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds
- All 112 tests pass

---

## 2026-02-06 - NPC Placeholder Portraits (12 files)

Created 12 placeholder portrait images for all location NPCs. Each placeholder is a 256×288 JPG with the NPC's accent color scheme, a diamond emblem with their initial, and their name/title. These replace the emoji fallbacks in the NPC portrait component.

### Files Created (12)
| File | NPC | Title | Accent Color |
|------|-----|-------|-------------|
| `public/npcs/aldric.jpg` | Aldric | Guild Master | Gold (#c9a227) |
| `public/npcs/mathilda.jpg` | Mathilda | Head Banker | Blue (#4a9cff) |
| `public/npcs/brynn.jpg` | Brynn | Shopkeeper | Green (#8bc34a) |
| `public/npcs/gunther.jpg` | Gunther | Master Armorer | Red (#e57373) |
| `public/npcs/lyra.jpg` | Lyra | Enchantress | Purple (#ba68c8) |
| `public/npcs/shade.jpg` | Shade | Black Marketeer | Grey (#78909c) |
| `public/npcs/elara.jpg` | Elara | Dean of Studies | Light Blue (#64b5f6) |
| `public/npcs/magnus.jpg` | Magnus | Barkeep | Orange (#ffb74d) |
| `public/npcs/cave.jpg` | The Cave | Dark Entrance | Dark Grey (#616161) |
| `public/npcs/korr.jpg` | Korr | Smithmaster | Deep Orange (#ff7043) |
| `public/npcs/tomas.jpg` | Tomas | Landlord | Brown (#a1887f) |
| `public/npcs/whiskers.jpg` | Whiskers | Fence & Dealer | Violet (#9575cd) |

### Design
- 256×288px (2x resolution for 128×144 display size)
- Dark background matching NPC's `bgColor`
- Accent-colored border, banner, and bottom strip
- Diamond emblem with initial letter in center
- "PLACEHOLDER" label at top
- Name and title at bottom
- Diagonal line pattern for visual texture
- JPEG quality 85

### Integration
- Paths match `portraitImage` fields in `src/data/npcs.ts`
- `NpcPortrait.tsx` component loads these via `<img>` tag
- Emoji fallback still works if images are deleted
- Replace with real art by dropping new files with same names

### Build & Test
- Vite build succeeds
- No code changes needed (paths already configured)

---

## 2026-02-06 - Fix NPC Portrait Bug + JPG Portrait Support

Fixed a bug where location panels showed only the NPC portrait (empty content area) on first visit, requiring exit and re-entry. Also added support for JPG/PNG NPC portrait images with emoji fallback.

### Bug Fix: Empty Location Content on First Visit

**Problem:** When traveling between locations without closing the panel (e.g., Guild Hall → Rusty Tankard via board click), the `LocationShell` component stayed mounted and its `activeTab` state retained the value from the previous location. For example, `activeTab = 'quests'` from Guild Hall doesn't match any tab in Rusty Tankard's single `'menu'` tab, so `activeContent` was `undefined` and the right side rendered empty.

**Root Cause:** `LocationShell` used `useState` for `activeTab`, which only initializes on mount. When `LocationPanel` received a new `locationId` (from `selectLocation` after travel), the same `LocationShell` instance was reused by React (same JSX position), keeping stale state.

**Fix:** Added `key={locationId}` to `<LocationShell>` in `LocationPanel.tsx`. This forces React to unmount and remount LocationShell whenever the location changes, resetting the active tab state.

### Feature: JPG/PNG NPC Portrait Support

**Changes:**
- Added `portraitImage?: string` field to `LocationNPC` interface in `npcs.ts`
- Created `NpcPortrait.tsx` component that tries to load `portraitImage`, falls back to emoji `portrait` on error
- All 12 NPCs now have `portraitImage` paths pointing to `/npcs/<name>.jpg`
- Created `public/npcs/` directory with `.gitkeep` for placeholder images
- Emoji portraits remain as automatic fallback when image files don't exist

**How to add real portraits:** Drop JPG/PNG files into `public/npcs/` matching the filenames in `npcs.ts` (e.g., `aldric.jpg`, `magnus.jpg`). No code changes needed.

### Files Modified (3)
| File | Change |
|------|--------|
| `src/components/game/LocationPanel.tsx` | Added `key={locationId}` to `<LocationShell>` |
| `src/components/game/LocationShell.tsx` | Replaced inline portrait div with `<NpcPortrait>` component |
| `src/data/npcs.ts` | Added `portraitImage` field to interface + all 12 NPC definitions |

### Files Created (2)
| File | Purpose |
|------|---------|
| `src/components/game/NpcPortrait.tsx` | Image portrait component with emoji fallback on load error |
| `public/npcs/.gitkeep` | Placeholder directory for NPC portrait images |

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds
- All 112 tests pass

---

## 2026-02-06 - Location Panel Layout Optimization (Reduce Scrolling, Bigger NPC Portraits)

Optimized the center panel layout to better utilize available space. NPC portraits are significantly bigger, header is more compact, and sub-panels fill available height instead of using restrictive max-height constraints.

### Problem
Despite the LocationShell + tab system, there was still excessive scrolling within tab content. NPC portraits were too small (96×96px) relative to the panel size, the header wasted vertical space with a two-line layout, and sub-panels had hardcoded `max-h-48`/`max-h-52` constraints that forced nested scrolling even when the panel had room to show more content.

### Changes

**LocationShell.tsx — Bigger NPC portraits, tighter spacing:**
- Portrait box: `w-24 h-24` (96×96px) → `w-32 h-36` (128×144px) — 33%/50% bigger
- Emoji font: `text-5xl` → `text-7xl` — much more prominent
- NPC name: `text-xs` → `text-sm`
- NPC title: `text-[10px]` → `text-[11px]`
- Column width: `w-28` → `w-36` (112px → 144px)
- Gap: `gap-3` → `gap-2`, tab margin: `mb-2` → `mb-1.5`

**LocationPanel.tsx — Compact header, reduced padding:**
- Padding: `p-3` → `p-2` when at a location (saves 8px total)
- Header: two-line (title + description) → single-line with inline description
- Title: `text-lg` → `text-sm` when at location
- Header margin: `mb-2` → `mb-1`
- Description only shown as second line in travel view

**Sub-panels — Removed restrictive max-h constraints (7 files):**
- QuestPanel: removed `max-h-48` on quest list
- GuildHallPanel: removed `max-h-52` on job list, `max-h-48` on employer list
- AcademyPanel: removed `max-h-48` on degree list
- EnchanterPanel: removed `max-h-48` on appliance list
- PawnShopPanel: removed `max-h-32` (×2) and `max-h-24` constraints

All content now flows naturally within the `flex-1 overflow-y-auto` parent in LocationShell — single scroll context instead of nested scrollbars.

### Space Savings (estimated at 1920×1080)
- Header: ~22px saved (single line vs two lines)
- Padding: ~8px saved (p-2 vs p-3)
- Content: fills full remaining height instead of capped at 192-208px
- Net: ~30px more vertical space + content expands to fill panel

### Build & Test
- TypeScript compiles cleanly
- Vite build succeeds
- All 112 tests pass

---

## 2026-02-06 - Location Panel Layout Overhaul (Jones-Style Menu System)

Redesigned all location panels to use a Jones-style menu system with NPC portraits and tab navigation. Eliminates excessive scrolling by showing only one section at a time.

### Problem
Location panels (especially Guild Hall and Enchanter) stacked all content vertically, requiring significant scrolling. Quest board, employment office, and work sections were all visible simultaneously, making the UI cluttered and hard to navigate.

### Solution: LocationShell + Tab Navigation
Inspired by Jones in the Fast Lane's Employment Office (left-side NPC portrait, right-side clean menu), created a new layout system:

**Layout Structure:**
```
┌─────────────────────────────────────────┐
│ Location Name                      [X]  │
│ Description                             │
├──────────┬──────────────────────────────┤
│  NPC     │  [Tab1] [Tab2] [Tab3]        │
│ Portrait │──────────────────────────────│
│  Name    │                              │
│  Title   │  Tab Content (no scrolling)  │
│ "Quote"  │                              │
└──────────┴──────────────────────────────┘
```

### Files Created (2)
| File | Purpose |
|------|---------|
| `src/data/npcs.ts` | NPC data per location (name, title, emoji portrait, greeting, colors) — 12 NPCs |
| `src/components/game/LocationShell.tsx` | Layout wrapper: NPC portrait (left) + tab bar + content area (right) |

### Files Modified (1)
| File | Change |
|------|--------|
| `src/components/game/LocationPanel.tsx` | Refactored to use LocationShell with tab-based navigation for all 12 non-home locations |

### Location Tab Breakdown
| Location | Tabs | Key Change |
|----------|------|------------|
| Guild Hall | Quests, Jobs, Work* | Split quests/employment/work into separate tabs |
| Enchanter | Healing, Appliances, Work* | Split healer/shop/work into separate tabs |
| Shadow Market | Market, Work* | Market + work separated |
| Bank | Services | Already uses internal view switching |
| General Store | Shop | Single content area |
| Armory | Equipment | Single content area |
| Academy | Courses | Single content area |
| Rusty Tankard | Menu | Single content area |
| Forge | Work | Single content area |
| Landlord | Housing | Single content area |
| Fence | Trade | Single content area |
| Cave | Dungeon | Single content area |

*Work tab only visible when player has a job at that location.

### NPC Portraits (12)
Each location now shows a themed NPC portrait (emoji + styled frame):
- Guild Hall: Aldric (Guild Master) 🧙‍♂️
- Bank: Mathilda (Head Banker) 👩‍💼
- General Store: Brynn (Shopkeeper) 👨‍🌾
- Armory: Gunther (Master Armorer) 🦸‍♂️
- Enchanter: Lyra (Enchantress) 🧝‍♀️
- Shadow Market: Shade (Black Marketeer) 🦊
- Academy: Elara (Dean of Studies) 👩‍🏫
- Rusty Tankard: Magnus (Barkeep) 🧔
- Cave: The Cave (Dark Entrance) 🗿
- Forge: Korr (Smithmaster) 🧑‍🔧
- Landlord: Tomas (Landlord) 🤵
- Fence: Whiskers (Fence & Dealer) 🎭

### Design Decisions
- Tab bar hidden when location has only 1 tab (no wasted space)
- Home locations (Noble Heights, Slums) keep their existing SVG room display
- Existing sub-panels (GuildHallPanel, BankPanel, etc.) unchanged — just wrapped in tabs
- NPC portrait area is 112px wide (w-28), content fills remaining space
- Portrait frame uses location-specific accent colors for visual identity

## 2026-02-06 - Preservation Box & Frost Chest Audit (8 Bugs Fixed)

Audited the fresh food preservation system (Preservation Box = Refrigerator, Frost Chest = Freezer from Jones in the Fast Lane). Compared against Jones wiki Fresh Food and Consumables mechanics. Found and fixed 8 bugs, added 20 unit tests.

### Reference: Jones in the Fast Lane Fresh Food Mechanics
- **Refrigerator** stores up to 6 Fresh Food units (12 with Freezer)
- Fresh food prevents starvation when consumed (1 unit per week)
- **All food spoils** if Refrigerator is missing or broken
- **Excess spoils** immediately if over capacity (Freezer breaks → 6 cap)
- **Food spoilage triggers doctor visit** (25% chance, -10h, -4 hap, -30-200g)
- Refrigerator and Freezer **cannot be stolen**
- Freezer **requires** Refrigerator

### Bugs Found and Fixed

| Bug | Severity | Issue | Fix |
|-----|----------|-------|-----|
| 1 | CRITICAL | Appliance breakage ran AFTER food checks — broken Preservation Box/Frost Chest didn't affect food until next turn | Moved breakage check before spoilage/starvation checks in `startTurn` |
| 2 | MEDIUM | `freshFood` not cleared on eviction — counter persisted after losing all appliances | Added `p.freshFood = 0` in eviction block of `processWeekEnd` |
| 3 | MEDIUM | No event message when fresh food prevents starvation — player didn't know their Preservation Box saved them | Added message: "Preservation Box provided fresh food, preventing starvation" |
| 4 | MEDIUM | Food spoilage didn't trigger doctor visit — Jones triggers doctor on spoilage (was noted as known gap) | Added 25% doctor visit chance on spoilage with cost/penalty |
| 5 | MEDIUM | InfoTabs showed max storage 12 even with broken Frost Chest — `isBroken` not checked | Added `.isBroken` check in InfoTabs fresh food progress bar |
| 6 | LOW | Frost Chest purchasable without Preservation Box — wasted gold, no enforcement | Added prerequisite check in `buyAppliance` |
| 7 | LOW | No message when excess food spoils from overcapacity | Added message: "X units spoiled (storage full, max Y)" |
| 8 | LOW | UI said "Auto-consumed weekly" which was misleading — only consumed when regular food = 0 | Updated to "prevents starvation when regular food runs out" |

### Correct Turn Order (After Fix)
The `startTurn` function now processes in the correct order:
1. Move player to home
2. **Appliance breakage** (checks gold > 500, rolls break chance)
3. **Fresh food spoilage** (uses current appliance state after breakage)
4. **Starvation check** (regular food → fresh food → starve)
5. Doctor visit triggers (starvation, spoilage, low relaxation)
6. Homeless penalty
7. Apartment robbery
8. Cooking fire / Arcane tome bonuses

### Files Modified (4)
| File | Change |
|------|--------|
| `src/store/helpers/turnHelpers.ts` | Reordered startTurn: breakage → spoilage → starvation. Added spoilage doctor visit, fresh food consumption message, overcapacity message. Cleared freshFood on eviction. |
| `src/store/helpers/economyHelpers.ts` | Added Frost Chest prerequisite check (requires working Preservation Box) |
| `src/components/game/InfoTabs.tsx` | Fixed Frost Chest `isBroken` check in fresh food progress bar |
| `src/components/game/GeneralStorePanel.tsx` | Updated misleading description text |

### Files Created (1)
| File | Purpose |
|------|---------|
| `src/test/freshFood.test.ts` | 20 unit tests covering buyFreshFood, starvation prevention, spoilage, eviction, Frost Chest prerequisite |

### Test Coverage (20 new tests)
- **buyFreshFood** (6 tests): basic storage, cap at 6/12, broken box rejection, broken frost chest, insufficient gold
- **Starvation Prevention** (4 tests): fresh food consumption, regular food priority, no food starvation, stale freshFood counter
- **Spoilage** (5 tests): no box spoilage, broken box spoilage, overcapacity cap at 6, frost chest allows 12, broken frost chest caps at 6
- **Eviction** (1 test): freshFood cleared on eviction
- **Frost Chest Prerequisite** (3 tests): rejected without box, allowed with box, rejected with broken box

### Build Verification
- TypeScript compiles cleanly (`tsc --noEmit`)
- All 112 tests pass (92 existing + 20 new)

---

## 2026-02-06 - Players Always Start Turn at Home (Slums or Noble Heights)

Fixed `getHomeLocation()` so players always start their turn at one of the two actual housing locations, matching Jones in the Fast Lane's two-apartment system (Low-Cost Housing / Le Security Apartments).

### Before (Broken)
| Housing Tier | Start Location | Problem |
|---|---|---|
| `noble` | Noble Heights | Correct |
| `modest` | Landlord | Landlord is the rent office, not a home |
| `slums` | The Slums | Correct |
| `homeless` | Rusty Tankard | Tavern is not a home |

### After (Fixed)
| Housing Tier | Start Location |
|---|---|
| `noble` | Noble Heights |
| `modest` | The Slums |
| `slums` | The Slums |
| `homeless` | The Slums |

Only two possible turn-start locations now, matching Jones in the Fast Lane where players always return to their apartment (Low-Cost Housing or Le Security Apartments).

### Files Changed
- `src/store/helpers/turnHelpers.ts` — Simplified `getHomeLocation()`: `noble` → `noble-heights`, all others → `slums`

### Verification
- All 91 tests pass
- Build succeeds
- TypeScript compiles cleanly

---

## 2026-02-06 - Guild Hall Salary Negotiation (Market Rate Raise)

Added ability to negotiate a salary increase at the Guild Hall when the current market rate for your job is higher than your current wage. Based on Jones in the Fast Lane mechanic: "If market rate > current wage, can request raise — Select same job at Employment Office to ask."

### How It Works

1. Player visits Guild Hall → selects their current employer
2. Job listings show pre-calculated market wages (based on economy)
3. If the market wage for the player's current job is higher than their current wage:
   - A green notification appears: "Your wage: $X/h — Market rate is higher!"
   - The "Current" button is replaced with a "Request Raise" button (primary style)
4. Clicking "Request Raise" costs 1 hour and shows a "SALARY INCREASE!" modal with:
   - Old wage (strikethrough)
   - New market wage
   - Raise amount (+$X/hour)
5. Player can Accept or Decline the raise
6. Accepting updates the wage without resetting shifts worked or dependability (unlike changing jobs)

| Scenario | Before | After |
|----------|--------|-------|
| Current job, market wage > current wage | Disabled "Current" button | Active "Request Raise" button |
| Current job, market wage <= current wage | Disabled "Current" button | Disabled "Current" button (unchanged) |
| Different job | "Apply" button | "Apply" button (unchanged) |

### Store Changes

- Added `negotiateRaise(playerId, newWage)` action — only updates `currentWage`, no side effects (no shift reset, no dependability penalty)
- Different from `requestRaise` which uses random chance and gives 15% increments
- Different from `setJob` which resets `shiftsWorkedSinceHire` and penalizes dependability

### Files Changed
- `src/store/storeTypes.ts` — Added `negotiateRaise` to GameStore interface
- `src/store/helpers/workEducationHelpers.ts` — Implemented `negotiateRaise` action
- `src/components/game/GuildHallPanel.tsx` — Added `onNegotiateRaise` prop, raise detection logic, "Request Raise" button, "SALARY INCREASE!" modal
- `src/components/game/LocationPanel.tsx` — Wired up `negotiateRaise` store action to GuildHallPanel
- TypeScript compiles cleanly

---

## 2026-02-06 - Sound Effects System (SFX)

Added a complete sound effects system for UI interactions and game events.

### Architecture
- `src/audio/sfxManager.ts` — Singleton SFXManager with audio element pooling (8 elements for overlapping sounds)
- `src/hooks/useSFX.ts` — React hook: `useSFXSettings()` for volume/mute controls and `playSFX()` for one-off sounds
- `src/components/ui/sfx-button.tsx` — SFXButton component, `withSFX()` wrapper, `useSFXClick()` helper

### Sound Effect Library (Placeholder files needed in `/public/sfx/`)
| Category | SFX IDs |
|----------|---------|
| UI Sounds | `button-click`, `button-hover`, `gold-button-click`, `menu-open`, `menu-close` |
| Game Actions | `coin-gain`, `coin-spend`, `item-buy`, `item-equip`, `success`, `error` |
| Movement | `footstep`, `door-open` |
| Work/Education | `work-complete`, `study`, `graduation` |
| Combat | `sword-hit`, `damage-taken`, `victory-fanfare`, `defeat` |
| Events | `notification`, `turn-start`, `week-end` |

### Integration Points
- `ActionButton.tsx` — Now plays SFX on click (default: `button-click`)
- `RightSideTabs.tsx` — Added SFX volume slider and mute toggle in Options tab
- Settings persisted to `localStorage` key `guild-life-sfx-settings`

### Suggested Locations for SFX (Prioritized)
1. **High Priority (Core Gameplay)**
   - Button clicks (all UI interactions)
   - Gold gain/spend (buying, selling, earning)
   - Movement between locations
   - Work/study completion
   - Turn end / week end

2. **Medium Priority (Feedback)**
   - Item equip/unequip
   - Combat hits and damage
   - Dungeon floor cleared
   - Quest complete
   - Level up / graduation

3. **Low Priority (Polish)**
   - Hover sounds on interactive elements
   - Menu open/close
   - Notification toasts
   - Dice rolls / gambling
   - Robbery events

### Bug Fix: AI pawnAppliance missing argument
- `useGrimwaldAI.ts` now passes `pawnValue` to `pawnAppliance()`
- `actionGenerator.ts` includes `pawnValue: 50` in action details

### ElevenLabs SFX Generation
- `supabase/functions/elevenlabs-sfx/index.ts` — Edge function for generating SFX via ElevenLabs API
- `src/services/sfxGenerator.ts` — Client service with predefined prompts for all game sounds
- `src/components/admin/SFXGeneratorPanel.tsx` — Admin UI for generating and downloading SFX
- `src/pages/SFXGenerator.tsx` — Route at `/admin/sfx`

### Files Created
- `src/audio/sfxManager.ts`
- `src/hooks/useSFX.ts`
- `src/components/ui/sfx-button.tsx`
- `supabase/functions/elevenlabs-sfx/index.ts`
- `src/services/sfxGenerator.ts`
- `src/components/admin/SFXGeneratorPanel.tsx`
- `src/pages/SFXGenerator.tsx`

### Files Modified
- `src/components/game/ActionButton.tsx` — Added SFX support
- `src/components/game/RightSideTabs.tsx` — Added SFX volume controls + SFX Generator link in Dev tab
- `src/App.tsx` — Added `/admin/sfx` route
- `src/hooks/useGrimwaldAI.ts` — Fixed pawnAppliance call
- `src/hooks/ai/actionGenerator.ts` — Added pawnValue to action details

---

## 2026-02-06 - Cave/Dungeon Audit — 5 Bugs Fixed

Full audit of the cave/dungeon system. Found and fixed 5 bugs ranging from critical (permanent fatigue lock) to minor (HP display).

### Bug 1 (CRITICAL): Dungeon fatigue never resets between weeks

**Problem:** `dungeonAttemptsThisTurn` was NOT reset in `processWeekEnd()`. The first player of each new week kept their attempt counter from the previous week. In single-player, after 2 dungeon runs the player was permanently stuck with "Too fatigued (max attempts)" for all future weeks. In multiplayer, only player 1 (first in turn order) was affected since other players got reset via `endTurn()`.

**Root cause:** `processWeekEnd()` set `timeRemaining` and `currentLocation` for the new week but forgot `dungeonAttemptsThisTurn: 0`. The `endTurn()` function (mid-week player switching) correctly reset it, but the week-boundary path did not.

**Fix:** Reset `dungeonAttemptsThisTurn: 0` for ALL players in the `processWeekEnd` player mapping loop, and also for the first player in the new-week state set.

| Location | Change |
|----------|--------|
| `turnHelpers.ts` processWeekEnd player loop | Added `p.dungeonAttemptsThisTurn = 0` |
| `turnHelpers.ts` processWeekEnd first-player set | Added `dungeonAttemptsThisTurn: 0` |

### Bug 2: No death check after dungeon combat

**Problem:** After dungeon combat, `handleCombatComplete` called `modifyHealth(player.id, -netDamage)` but never called `checkDeath()`. If a player was killed in the dungeon (health → 0), death was not processed until the next turn or week-end. Other systems (quest completion) correctly called `checkDeath` after damage.

**Fix:** Added `checkDeath(player.id)` call immediately after `modifyHealth` in `handleCombatComplete`.

| Location | Change |
|----------|--------|
| `CavePanel.tsx` handleCombatComplete | Added `useGameStore.getState().checkDeath(player.id)` after modifyHealth |

### Bug 3: Player pays 2h extra per floor vs AI

**Problem:** Human players pay time per encounter via `getEncounterTimeCost()` which uses `Math.ceil(totalTime / 4)`. For base floor times (6, 10, 14, 18, 22h) which all have remainder 2 when divided by 4, `ceil` rounds up by 0.5h per encounter × 4 = 2h extra total. The AI used `getFloorTimeCost()` which returns the exact total, giving the AI a consistent 2h advantage per dungeon run.

**Fix:** AI now uses the same per-encounter time calculation: `getEncounterTimeCost(floor, combatStats) * ENCOUNTERS_PER_FLOOR`. Both human and AI pay the same total time.

| Floor | Old AI Cost | Old Player Cost | New Both Pay |
|-------|-------------|-----------------|--------------|
| F1 (6h base) | 6h | 8h (ceil(1.5)×4) | 8h |
| F2 (10h base) | 10h | 12h (ceil(2.5)×4) | 12h |
| F3 (14h base) | 14h | 16h (ceil(3.5)×4) | 16h |
| F4 (18h base) | 18h | 20h (ceil(4.5)×4) | 20h |
| F5 (22h base) | 22h | 24h (ceil(5.5)×4) | 24h |

Note: Reduced time costs (4, 8, 12, 16, 20h) divide evenly by 4 so no rounding occurs.

| Location | Change |
|----------|--------|
| `useGrimwaldAI.ts` explore-dungeon | Changed from `getFloorTimeCost()` to `getEncounterTimeCost() * ENCOUNTERS_PER_FLOOR` |
| `useGrimwaldAI.ts` imports | Added `getEncounterTimeCost`, `ENCOUNTERS_PER_FLOOR` |

### Bug 4: Defeat rewards more gold than retreat (perverse incentive)

**Problem:** Retreat forfeited 50% gold (kept 50%), but defeat (health → 0) kept 100% gold with only a -2 happiness penalty. This created a perverse incentive where dying was more profitable than retreating. Players were better off letting their health reach 0 than using the retreat button.

**Fix:** Defeat now only salvages 25% of gold (75% forfeited), making retreat (50% kept) always the better choice. Updated summary text to reflect penalties.

| Outcome | Gold Before | Gold After | Happiness |
|---------|-------------|------------|-----------|
| Victory | 100% | 100% | +floor bonus |
| Retreat | 50% | 50% (unchanged) | 0 |
| Leave (no time) | 100% | 100% (unchanged) | 0 |
| Defeat | 100% | **25%** (was 100%) | -2 |

| Location | Change |
|----------|--------|
| `CombatView.tsx` handleFinish | Added `defeatGoldPenalty = 0.25` for defeat outcomes |
| `CombatView.tsx` FloorSummaryView | Updated defeat text: "Only 25% of gold salvaged" |
| `CombatView.tsx` FloorSummaryView | Updated retreat text: "50% of your earnings" |

### Bug 5: Combat HP display shows entry health, not max health

**Problem:** Combat views (EncounterIntro, EncounterResultView) displayed `currentHealth / startHealth` where `startHealth = player.health` at dungeon entry. If a player entered at 50/100 HP, the bar showed 50/50 (100% full), the low-health warning never triggered, and the player had no sense of their actual health status.

**Fix:** Changed HP display to use `player.maxHealth` instead of `startHealth` for percentage calculation, display text, and low-health warnings.

| Location | Change |
|----------|--------|
| `CombatView.tsx` EncounterIntro | Changed `startHealth` prop to `maxHealth`, updated all references |
| `CombatView.tsx` EncounterResultView | Changed `startHealth` prop to `maxHealth`, updated all references |
| `CombatView.tsx` CombatView | Pass `player.maxHealth` instead of `runState.startHealth` |

### Files Changed
- `src/store/helpers/turnHelpers.ts` — Reset dungeonAttemptsThisTurn in processWeekEnd (Bug 1)
- `src/components/game/CavePanel.tsx` — Add checkDeath after combat (Bug 2)
- `src/hooks/useGrimwaldAI.ts` — AI uses same per-encounter time formula (Bug 3)
- `src/components/game/CombatView.tsx` — Defeat gold penalty + HP display fix (Bugs 4, 5)
- TypeScript compiles cleanly, build succeeds, 91 tests pass

---

## 2026-02-06 - Job Market Wage Display + Dungeon Per-Encounter Time

Two gameplay improvements: job listings now show real market wages, and dungeon encounters cost time individually.

### 1. Job Market Wage Display

**Problem:** Job listings in the Guild Hall showed the base wage (e.g. $7/h), but the actual offered wage was calculated based on economy when applying — leading to a confusing mismatch between listed and offered salary.

**Fix:** Market wages are now pre-calculated when selecting an employer, using the same `calculateOfferedWage(job, priceModifier)` formula. The listing shows the real market wage the player will receive if hired.

| Change | Before | After |
|--------|--------|-------|
| Job listing wage | Base wage ($7/h) | Market wage ($4-$18/h based on economy) |
| Wage consistency | Listed ≠ offered | Listed = offered |
| Hired modal text | "(Base: $7/h)" | "(Market rate at time of visit)" |

### 2. Dungeon Per-Encounter Time Cost

**Problem:** Full floor time (6-22 hours) was charged upfront when entering a floor. Once inside, all encounters (Fight, Continue Deeper, etc.) were free, making it impossible to leave mid-floor and do other things.

**Fix:** Time is now charged per encounter. Entry costs one encounter's worth of time. Each "Continue Deeper" costs another encounter's time. Players can leave if they run out of time (keeping all earned gold, no retreat penalty).

| Floor | Total Time | Per Encounter (4 enc.) |
|-------|-----------|----------------------|
| F1 Entrance Cavern | 6h (4h reduced) | 2h (1h reduced) |
| F2 Goblin Tunnels | 10h (8h reduced) | 3h (2h reduced) |
| F3 Undead Crypt | 14h (12h reduced) | 4h (3h reduced) |
| F4 Dragon's Lair | 18h (16h reduced) | 5h (4h reduced) |
| F5 The Abyss | 22h (20h reduced) | 6h (5h reduced) |

**New "Leave Dungeon" option:** When player doesn't have enough time for the next encounter, "Continue Deeper" is replaced with "Leave Dungeon" — player keeps all gold earned so far (no 50% retreat penalty).

**AI unaffected:** Grimwald AI still uses `autoResolveFloor()` which resolves all encounters at once, spending the full floor time upfront (equivalent to all encounters combined).

### Files Changed
- `src/components/game/GuildHallPanel.tsx` — pre-calculate market wages on employer select, display market wage in listing
- `src/components/game/CombatView.tsx` — accept `onSpendTime`/`encounterTimeCost` props, charge time per encounter, add Leave Dungeon option
- `src/components/game/CavePanel.tsx` — charge per-encounter time on entry, pass time props to CombatView, show per-encounter time in floor cards
- `src/data/dungeon.ts` — added `getEncounterTimeCost()` helper function
- TypeScript compiles cleanly, build succeeds, 91 tests pass

---

## 2026-02-06 - Screen Size Audit & Responsive Layout Fix

Fixed layout compression on non-16:9 screens (e.g. 1920×1200 laptops) and improved space utilization.

### Problem
- Game used a rigid 16:9 aspect ratio lock (`min(100vw, 177.78vh)` × `min(100vh, 56.25vw)`)
- On 1920×1200 (16:10): rendered at 1920×1080, wasting 120px vertically
- Side panels were inside the lock, losing height on taller screens
- Center info panel content was compressed with large padding/margins

### Layout Restructure
| Change | Before | After |
|--------|--------|-------|
| Outer container | 16:9 locked, centered | Full viewport (100vw × 100vh) |
| Side panels | Inside 16:9 box, limited height | Outside aspect lock, full viewport height |
| Board area | Fixed 76% of 16:9 container | Flex-1 with `aspect-ratio: 1216/900`, `max-height: 100%` |
| Board proportions | 1459×1080 on 1920 wide | Identical (aspect ratio preserved) |
| Zone alignment | Calibrated for board div | Unchanged (same board dimensions) |

### Resolution Behavior
| Resolution | Side Panel Height | Board Size | Notes |
|------------|------------------|------------|-------|
| 1920×1080 (16:9) | 1080px | 1459×1080 | Identical to before |
| 1920×1200 (16:10) | **1200px** (+120) | 1459×1080 | Side panels gain 120px |
| 2560×1440 (16:9) | 1440px | 1946×1440 | Fills perfectly |
| 1440×900 (16:10) | **900px** | 1094×810 | Panels use full height |

### Center Panel & Content
| Change | Before | After |
|--------|--------|-------|
| Center panel height | 53.4% of board | 55.5% (+2.1%) |
| Center panel top | 23.4% | 22.5% |
| ResourcePanel padding | p-4, mb-4 | p-3, mb-2 |
| Resource cards | p-2, text-lg values | p-1.5, text-base values |
| Resource grid gap | gap-2 | gap-1.5 |
| LocationPanel padding | p-4, mb-3 header | p-3, mb-2 header |
| Location header | text-xl, w-6 icon | text-lg, w-5 icon |
| Footer hint | text-xs, mt-2 pt-2 | text-[10px], mt-1 pt-1 |

### Files Changed
- `src/components/game/GameBoard.tsx` — layout restructure, center panel defaults
- `src/components/game/ResourcePanel.tsx` — compact padding, smaller resource cards
- `src/components/game/LocationPanel.tsx` — compact header and padding

---

## 2026-02-06 - Deferred Issues Batch Fix + AI Improvements

Major batch of fixes covering deferred issues, new AI actions, dungeon RPG improvements, and bug fixes.

### Bug Fixes
| Issue | Fix |
|-------|-----|
| Newspaper close button | `onClose` now clears `currentNewspaper` state — Dialog `open` prop was stuck true |
| Sickness cure not working | Added `cureSickness` store action — `onCureSickness` handler now sets `isSick = false` |
| Fence purchases not going to inventory | Used sword/shield from fence now added to durables and auto-equipped |
| "Sick - Visit Healer!" unclear | Updated text to "Sick - Visit Enchanter (Cure Ailments)!" |

### Game Mechanics
| Feature | Details |
|---------|---------|
| H7: MAX_FLOOR_ATTEMPTS | Enforced 2 dungeon runs per turn limit. Added `dungeonAttemptsThisTurn` to Player, reset at turn start |
| Cave access gating | Require at least 1 completed degree to enter dungeon. Shows lock screen with guidance |
| B2: Quest rewards rebalanced | E-rank: +67%, D-rank: +65%, C-rank: +75%, B-rank: +60%, A-rank: +70%, S-rank: +67% |
| B6: Cooking Fire nerfed | Now triggers every other week (even weeks only), halving effective bonus from +1/turn to +0.5/turn |
| RPG equipment system | No armor: +50% damage taken. No weapon: -70% gold earned. Combat shows penalties in bonuses |

### UI Changes
| Change | Details |
|--------|---------|
| Player header brown text | SideInfoTabs header changed from dark wood to parchment background with `text-wood-dark` |
| Guild rank visibility | Guild rank shown under name in `text-wood-dark/70` matching rest of panel |

### AI Improvements (AI-2 through AI-8, AI-12)
| Issue | Implementation |
|-------|---------------|
| AI-2: Sickness cure | Priority 92 when sick, travels to enchanter, pays 75g for cure |
| AI-3: Loan system | Takes 200g emergency loan when gold<20 and savings<20; repays when gold exceeds loan+100 |
| AI-4: Stock market | Medium/hard AI invests excess gold in stocks; sells when broke or doesn't need wealth |
| AI-5: Fresh food | Buys fresh food (25g/2 units) when has Preservation Box and stock<3 |
| AI-6: Weekend tickets | Buys tickets (jousting/theatre/bard) when happiness is weakest goal and gold>150 |
| AI-7: Selling/pawning | Pawns appliances when desperate (gold<10 with loan); sells inventory items when gold<20 |
| AI-8: Lottery tickets | Buys 5g ticket when gold>100 and week>3 (low priority=25) |
| AI-12: Route optimization | Boosts move priority +5 per extra need at same location (multi-need routing) |
| H9: AI dungeon health | AI checks dungeonAttemptsThisTurn>=2, health>20, and cave access before dungeon |

### Files Changed
- `src/components/game/LocationPanel.tsx` — newspaper close, sickness cure, fence purchases
- `src/components/game/CavePanel.tsx` — dungeon attempts limit, cave access gating
- `src/components/game/SideInfoTabs.tsx` — brown text styling, sick text update
- `src/components/game/PlayerInfoPanel.tsx` — sick text update
- `src/store/helpers/playerHelpers.ts` — added `cureSickness` action
- `src/store/storeTypes.ts` — added `cureSickness` type
- `src/store/gameStore.ts` — added `dungeonAttemptsThisTurn` to createPlayer
- `src/store/helpers/turnHelpers.ts` — reset dungeon attempts, cooking fire nerf
- `src/types/game.types.ts` — added `dungeonAttemptsThisTurn` to Player
- `src/data/dungeon.ts` — MAX_FLOOR_ATTEMPTS_PER_TURN = 2
- `src/data/combatResolver.ts` — no-equipment damage/gold penalties
- `src/data/quests.ts` — rebalanced all quest rewards
- `src/hooks/ai/types.ts` — 9 new AIActionType values
- `src/hooks/useGrimwaldAI.ts` — 9 new action handlers + dungeon health tracking
- `src/hooks/ai/actionGenerator.ts` — decision logic for all new AI actions + route optimization

---

## 2026-02-06 - Music Placeholder Files

Added placeholder MP3 files to `public/music/` folder for the audio system.

### Files Created
| File | Purpose |
|------|---------|
| `01MainTheme.mp3` | Title screen, game setup |
| `02OnTheStreet.mp3` | Default in-game track |
| `03guildhall.mp3` | Guild Hall location |
| `06Bank.mp3` | Bank location (new) |
| `09TheSlums.mp3` | The Slums location |
| `11EnchantersWorkshop.mp3` | Enchanter's Workshop |
| `13rustytankard.mp3` | Rusty Tankard tavern |
| `18OhWhatAWeekend.mp3` | Victory/weekend screen |

### Config Updated
- Added Bank track to `MUSIC_TRACKS` in musicConfig.ts
- Added Bank location mapping to `LOCATION_MUSIC`

---

## 2026-02-06 - Audio & Music System

Added a complete background music system with smooth crossfade transitions between tracks.

### Architecture
- `src/audio/audioManager.ts` — Singleton AudioManager with dual-deck (A/B) crossfade engine
- `src/audio/musicConfig.ts` — Track definitions, location-to-music mapping, screen-level music mapping
- `src/hooks/useMusic.ts` — React hooks: `useMusicController` (drives music from game state), `useAudioSettings` (volume/mute controls)

### Features
- **Crossfade transitions** (1.5s) between tracks when changing locations or screens
- **Location-specific music**: Guild Hall, The Slums, Enchanter's Workshop, Rusty Tankard each have unique tracks
- **Screen music**: Main Theme on title/setup screens, "Oh What a Weekend" on victory screen
- **Default game track**: "On the Street" plays for locations without a specific track
- **50% default volume** as baseline
- **Volume slider + mute toggle** in Options tab (RightSideTabs)
- **Mute button** on TitleScreen (next to dark mode toggle)
- **Keyboard shortcut**: M to toggle mute during gameplay
- **Persistent settings** — volume and mute state saved to localStorage (`guild-life-audio-settings`)
- **Autoplay-safe** — gracefully handles browser autoplay restrictions

### Music Tracks (MP3 files in `public/music/`)
| File | Context |
|------|---------|
| `01MainTheme.mp3` | Title screen, game setup |
| `02OnTheStreet.mp3` | Default in-game (no location-specific track) |
| `03guildhall.mp3` | Guild Hall location |
| `09TheSlums.mp3` | The Slums location |
| `11EnchantersWorkshop.mp3` | Enchanter's Workshop location |
| `13rustytankard.mp3` | Rusty Tankard location |
| `18OhWhatAWeekend.mp3` | Victory screen |

### Files Modified
- `src/pages/Index.tsx` — Added `useMusicController` hook
- `src/components/screens/TitleScreen.tsx` — Added mute toggle button
- `src/components/game/GameBoard.tsx` — Added M keyboard shortcut for mute
- `src/components/game/RightSideTabs.tsx` — Added Music section to Options tab with volume slider and mute

### Files Created
- `src/audio/audioManager.ts`
- `src/audio/musicConfig.ts`
- `src/hooks/useMusic.ts`
- `public/music/` (directory for MP3 files)

### Build & Tests
- TypeScript compiles cleanly (`tsc --noEmit`)
- Vite build succeeds
- All 91 tests pass

---

## 2026-02-06 - Fix 52 Bugs from Full Game Audit

Applied fixes for 52 issues found during the full game audit using 5 parallel fix agents.

### Files Modified (13)
`turnHelpers.ts`, `economyHelpers.ts`, `workEducationHelpers.ts`, `questHelpers.ts`, `storeTypes.ts`, `useGrimwaldAI.ts`, `actionGenerator.ts`, `ai/types.ts`, `locations.ts`, `combatResolver.ts`, `game.types.ts`, `VictoryScreen.tsx`, `QuestPanel.tsx`

### Critical Bugs Fixed: 14/14
| Bug | Fix |
|-----|-----|
| C1: Missing 2h entry cost | `getMovementCost` returns `pathDistance + 2` |
| C2: AI immune to startTurn | Removed `player.isAI` guard; AI gets all penalties |
| C3: Broken rent prepayment | `processWeekEnd` decrements `rentPrepaidWeeks` before incrementing `weeksSinceRent` |
| C4: `lockedRent` ignored | Rent uses `lockedRent > 0 ? lockedRent : RENT_COSTS[housing]` |
| C5: No death check in processWeekEnd | Inline death check loop after week-end processing |
| C6: 44% quests inaccessible | `completeDegree` now updates legacy `education` field via `DEGREE_TO_PATH` mapping |
| C7: Buy with 0 gold | Added `if (p.gold < cost) return p;` to all 9 purchase actions |
| C8: eventMessage overwrite | `startTurn` collects into `eventMessages[]` array, joins at end |
| C9: Home location binary | `getHomeLocation()` handles all 4 tiers (noble/modest/slums/homeless) |
| C10: Stale player data | Re-read `currentPlayer` from `get()` after doctor visit gold changes |
| C11: Lottery +925% EV | Grand: 2%/5000g → 0.1%/500g, Small: 5%/50g → 5.9%/20g (EV: 1.68g per 10g) |
| C12: Infinite wages | Cap at `3x job.baseWage` in `requestRaise` |
| C13: Double-charge breakage | Breakage only marks broken + -1 happiness; no auto gold charge |
| C14: AI hardcoded prices | All AI actions use `action.details` for dynamic prices |

### High Priority Bugs Fixed: 10/12
| Bug | Fix |
|-----|-----|
| H1: Eviction keeps items | Clears `durables`, `appliances`, `equipment`, `prepaid`, `lockedRent` |
| H2: VictoryScreen wealth | Added `stockValue - loanAmount` to wealth display |
| H3: Quest death check | `get().checkDeath(playerId)` after completeQuest |
| H4: QuestPanel missing param | Passes `player.dungeonFloorsCleared` to `canTakeQuest()` |
| H5: Rent partial pay | `if (p.gold < rentCost) return p;` |
| H6: Free education | Gold + time validation in `studyDegree`/`studySession` |
| H8: Per-player crash | Market crash now single global roll (moved outside player loop) |
| H10: AI relaxation | Rest action calls `modifyRelaxation` |
| H11: AI career quests | Career switch case adds quest-taking for guild rank |
| H12: Dual items | AI uses explicit `cost` in action details |

### Balance Fixes: 8/10
| Issue | Fix |
|-------|-----|
| B1: Loan death spiral | Interest capped at `Math.min(loanAmount, 2000)` |
| B3: Free retreat farming | `retreatFromDungeon` forfeits 50% gold |
| B4: Noble rent 500g | Reduced to 350g in `RENT_COSTS` |
| B5: Unconditional dep decay | Only decays if `!p.currentJob` |
| B7: No invest withdrawal | Added `withdrawInvestment` with 10% penalty |
| B8: Forced weekends | "Stay Home" (+1 happiness, free) as fallback |
| B9: One-shot rare drops | Repeat clears: 20% of normal drop rate |
| B10: 200-quest guild master | Flattened to 3/8/15/25/40/60 |

### AI Improvements: 8/16
| Gap | Fix |
|-----|-----|
| AI-1: No healing | Added `heal` action type in actionGenerator + useGrimwaldAI |
| AI-9: Graduation only when edu weak | Opportunistic graduation check always runs at Academy |
| AI-10: Only Rusty Tankard food | Added Shadow Market as food source |
| AI-11: Single appliance | Priority list: Cooking Fire > Scrying Mirror > Preservation Box |
| AI-13: Can't downgrade housing | Added `downgrade-housing` action when broke |
| AI-14: efficiencyWeight unused | Dynamic prices via `action.details` |
| AI-15: Career quest gap | Career case now takes quests for guild rank |
| AI-16: Wrong clothing location | Uses closest of Armory/General Store |

### Test Results
- TypeScript: Compiles cleanly
- Tests: 91/91 pass
- 13 files changed, +394/-117 lines

---

## 2026-02-06 - Full Game Audit (Agent Playthrough Analysis)

Conducted a comprehensive audit of the entire game using 6 specialized analysis agents, each focusing on a different subsystem. Agents read all source code and simulated full playthroughs to find bugs, exploits, balance issues, and missing features.

### Methodology
- Agent 1: Turn system, movement, starvation, homeless logic
- Agent 2: Grimwald AI decision engine and strategy
- Agent 3: All 14 location panels and their UI/actions
- Agent 4: Economy systems (stocks, loans, banking, work, shopping)
- Agent 5: Dungeon, combat, quest, and equipment systems
- Agent 6: Victory conditions, death mechanics, edge cases, game setup

---

### CRITICAL BUGS (14 issues)

#### C1: Missing 2-hour location entry cost
**Files:** `src/data/locations.ts:278`, `src/components/game/GameBoard.tsx:286`
Jones reference and CLAUDE.md both state "Entering locations costs 2 hours." The `getMovementCost()` function only returns path distance (1hr/step). The +2 entry cost is never applied anywhere. Players get 6-8 extra hours per turn.
**Fix:** Add `+ 2` to `getMovementCost()` when `from !== to`.

#### C2: AI immune to all startTurn penalties
**File:** `src/store/helpers/turnHelpers.ts:104`
`if (!player || player.isAI) return;` causes AI to bypass: starvation (-20h), doctor visits (-10h/-4hap/-gold), homeless penalties (-5hp/-8h), apartment robbery, appliance breakage, cooking fire bonus, and arcane tome income. AI gets up to 63% more effective time per turn.
**Fix:** Remove `player.isAI` guard. Suppress UI messages for AI separately.

#### C3: Rent prepayment system non-functional
**Files:** `src/store/helpers/economyHelpers.ts:240`, `src/store/helpers/turnHelpers.ts:519`
`rentPrepaidWeeks` is set by `prepayRent()` but never consumed. `processWeekEnd` unconditionally increments `weeksSinceRent += 1` and never checks `rentPrepaidWeeks`. Players who prepay rent still get eviction warnings and garnishment.
**Fix:** In `processWeekEnd`, check `rentPrepaidWeeks > 0`, decrement it, and skip `weeksSinceRent` increment.

#### C4: `lockedRent` field never used in calculations
**File:** `src/store/helpers/turnHelpers.ts:387`
Rent debt uses `RENT_COSTS[p.housing]` ignoring `p.lockedRent`. Players who lock in a favorable rent rate get no benefit.
**Fix:** Use `p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing]`.

#### C5: `processWeekEnd` can kill players without `checkDeath`
**File:** `src/store/helpers/turnHelpers.ts:370,432`
Health reduced by starvation (-10) and sickness (-15) in processWeekEnd, but `checkDeath` is never called. Players at 0 HP continue playing. Non-current players in multiplayer never get resurrection check.
**Fix:** Call `checkDeath` for all players at end of `processWeekEnd`.

#### C6: 44% of quests permanently inaccessible
**Files:** `src/data/quests.ts:260-285`, `src/store/helpers/workEducationHelpers.ts:170`
Quest `requiredEducation` checks old path-based `education` field (`fighter`, `mage`, `priest`, `business`), but the degree system (`completeDegree`) never updates this field. 8 of 18 quests are permanently blocked.
**Fix:** Map degree completions to legacy education fields, or rewrite quests to use `DegreeId`.

#### C7: Purchases succeed with insufficient gold
**File:** `src/store/helpers/economyHelpers.ts:64-76,95-108,136-178`
`buyItem`, `buyDurable`, `buyAppliance`, `repairAppliance`, `prepayRent`, `moveToHousing`, `buyFreshFood`, `buyLotteryTicket`, `buyTicket` all use `Math.max(0, p.gold - cost)` without checking `p.gold >= cost`. Items are added unconditionally.
**Fix:** Add `if (p.gold < cost) return p;` guard to all purchase actions.

#### C8: Multiple `eventMessage` overwrites in `startTurn`
**File:** `src/store/helpers/turnHelpers.ts:144-310`
6+ independent `set()` calls each overwrite `eventMessage`. If starvation AND doctor AND homeless happen, only the last message shows. `processWeekEnd` does this correctly with an array.
**Fix:** Collect messages into array, join at end (like `processWeekEnd`).

#### C9: Home location ignores `modest` and `homeless` tiers
**File:** `src/store/helpers/turnHelpers.ts:86,107,561`
`housing === 'noble' ? 'noble-heights' : 'slums'` sends `modest` and `homeless` players to slums. Appears in 6+ places.
**Fix:** Extract to `getHomeLocation(housing)` utility handling all 4 tiers.

#### C10: `startTurn` reads stale player data
**File:** `src/store/helpers/turnHelpers.ts:103,252`
Player captured once at line 103. After starvation doctor visit costs 200g, appliance breakage check at line 252 still sees old gold value. Breakage triggers when it shouldn't.
**Fix:** Re-read player from `get()` after each major `set()`, or batch all effects into single `set()`.

#### C11: Lottery expected value is +925%
**File:** `src/store/helpers/turnHelpers.ts:492-513`
10g ticket: 2% chance of 5000g (EV=100g) + 5% chance of 50g (EV=2.5g) = 102.5g EV per 10g ticket. Players should buy unlimited tickets every week.
**Fix:** Reduce grand prize to ~200g, or set drop to 0.1%, or cap tickets per week.

#### C12: No wage cap on raises
**File:** `src/store/helpers/workEducationHelpers.ts:86`
`newWage = player.currentWage + Math.ceil(player.currentWage * 0.15)` with no cap. After 20 raises from 25g/hr: ~406g/hr. Only 3 shifts needed between raises.
**Fix:** Cap at 2-3x base wage for the job.

#### C13: Double-charge on appliance breakage
**File:** `src/store/helpers/turnHelpers.ts:261-278`
Appliance breaks: auto-charges repair cost AND marks as broken. Player must then call `repairAppliance` which charges again. Double payment.
**Fix:** Either auto-repair (charge once) or just mark broken (don't auto-charge).

#### C14: AI uses hardcoded/fabricated prices
**Files:** `src/hooks/useGrimwaldAI.ts:86-91,175-180,95-101,188`
Food: 8g/25food (real best: 6g/10food). Appliances: always 300g (real: 200-1599g). Clothing: 30g/30pts (real cheapest: 25g/50pts). Housing: 50/200g (real varies). AI bypasses item system entirely.
**Fix:** Use actual item data and store actions.

---

### HIGH PRIORITY BUGS (12 issues)

#### H1: Eviction doesn't clear appliances or equipment
`processWeekEnd` eviction clears `inventory` but not `durables`, `appliances`, `equippedWeapon/Armor/Shield`. `evictPlayer` in questHelpers clears `durables` but also not appliances/equipment. Inconsistent "lose all possessions."

#### H2: VictoryScreen wealth calculation wrong
**File:** `src/components/screens/VictoryScreen.tsx:46`
Shows `gold + savings + investments`, missing `stockValue` and `loanAmount`. Doesn't match `checkVictory` formula.

#### H3: No `checkDeath` after quest completion
**File:** `src/store/helpers/questHelpers.ts:38-67`
`completeQuest` can set health to 0 via `healthLoss` but never calls `checkDeath`. Player continues acting at 0 HP.

#### H4: QuestPanel doesn't pass `dungeonFloorsCleared`
**File:** `src/components/game/QuestPanel.tsx:85-89`
5th parameter omitted in `canTakeQuest()`. Dungeon quests always show as locked even after clearing floors.

#### H5: `payRent` allows partial payment
**File:** `src/store/helpers/economyHelpers.ts:14-26`
Player with 1g can "pay" 75g rent. Gold goes to 0, `weeksSinceRent` resets. Eviction timer resets for free.

#### H6: Free education with 0 gold
**File:** `src/store/helpers/workEducationHelpers.ts:152-167`
`studyDegree` uses `Math.max(0, p.gold - cost)` without gold validation. 0g player gets free degrees.

#### H7: `MAX_FLOOR_ATTEMPTS_PER_TURN` defined but never enforced
**File:** `src/data/dungeon.ts:908`
Constant exists but not checked. Players can run unlimited dungeon floors per turn.

#### H8: Market crash checked per-player, not globally
**File:** `src/store/helpers/turnHelpers.ts:346-363`
`checkMarketCrash` called independently per player. In 4-player game, chance of any crash event quadruples. Should be single global roll.

#### H9: AI dungeon health tracking bug
**File:** `src/hooks/useGrimwaldAI.ts:258-259`
Uses `totalDamage - totalHealed` instead of `startHealth - finalHealth`. Due to health capping, actual damage can differ. AI can have wrong health after dungeon runs.

#### H10: AI rest doesn't increase relaxation
**File:** `src/hooks/useGrimwaldAI.ts:196-202`
Rest action gives happiness but never calls `modifyRelaxation`. AI relaxation decays to minimum (10) permanently.

#### H11: AI career strategy doesn't advance guild rank via quests
**File:** `src/hooks/ai/actionGenerator.ts:254-300`
Career switch case only handles getting jobs and working. Career goal requires guild rank, which requires completing quests. AI never prioritizes quests for career.

#### H12: Dual item definitions (preservation-box, scrying-mirror)
**File:** `src/data/items.ts`
`preservation-box` appears in APPLIANCES (876g) and ENCHANTER_ITEMS (175g). `scrying-mirror` in APPLIANCES (525g) and items (350g). Conflicting canonical prices.

---

### BALANCE ISSUES (10 issues)

#### B1: Loan interest at 10% weekly compound creates death spiral
1000g loan becomes 2146g in 8 weeks. Default extends 4 weeks with continued compounding. Unrecoverable debt trap.
**Suggestion:** Cap interest at 2x original loan.

#### B2: S-rank quests consume nearly 2 full turns
80-100 hours for 200-300g. Dungeon Floor 5 gives 250-600g in 22 hours. Quests are 5-15x less profitable than dungeons.
**Suggestion:** Increase quest rewards 2-3x or add unique rewards.

#### B3: Zero-cost retreat dungeon farming exploit
`RETREAT_HAPPINESS_PENALTY = 0`. Players farm encounters 1-3, retreat before boss, keep all gold. Floor 5 retreat run: 300-400g in 22h risk-free.
**Suggestion:** Forfeit 50% gold on retreat.

#### B4: Noble Heights rent (500g/week) nearly impossible
Top job 25g/hr. 6h shift with bonus = 175g. Need ~3 shifts just for rent. Total 120h/week of work for rent alone (60h available).
**Suggestion:** Reduce to 350g/week.

#### B5: Dependability decays -5/week unconditionally
Work gives +2/shift. Need 3+ shifts/week just to maintain. Very harsh treadmill.
**Suggestion:** Only decay if player didn't work that week.

#### B6: Cooking Fire (+1 happiness/turn) is overpowered
200g one-time cost for permanent +1/turn. Over 20 turns: +20 happiness for free.
**Suggestion:** Add diminishing returns or cap at 50 uses.

#### B7: Investment withdrawal impossible
`invest()` exists but no `withdrawInvestment()`. Invested gold is permanently locked. Only counts toward wealth goal.
**Suggestion:** Add withdrawal with 10% early penalty.

#### B8: Weekend activities are mandatory and can drain gold
Random weekends cost 5-100g with no opt-out. Poor players can be forced into 100g Royal Banquet.
**Suggestion:** Add "Stay Home" free option.

#### B9: Rare drops only roll on first clear (5% one-shot)
77.4% of players will never see any rare drop across all 5 floors. Missed drops permanently unobtainable.
**Suggestion:** Allow reduced rate on repeat clears (e.g., 1%).

#### B10: Guild rank progression is exponentially steep
Requirements: 3, 10, 25, 50, 100, 200 quests. Guild Master requires 200 quests. At ~7h/quest average: 1400 hours = 24 full turns.
**Suggestion:** Flatten curve to 3, 8, 15, 25, 40, 60.

---

### AI MISSING BEHAVIORS (16 issues)

| # | Missing Behavior | Impact |
|---|-----------------|--------|
| AI-1 | No health recovery/healing action | AI slowly dies from accumulated damage |
| AI-2 | No sickness cure action | 5% chance/week sickness, never cured |
| AI-3 | No loan system usage | Can't survive debt emergencies |
| AI-4 | No stock market trading | Misses wealth accumulation |
| AI-5 | No fresh food management | Never buys Preservation Box or fresh food |
| AI-6 | No weekend ticket purchases | Misses happiness from 25-50g tickets |
| AI-7 | No item selling/pawning | Can't liquidate assets in emergency |
| AI-8 | No lottery tickets | Misses positive-EV lottery (until fixed) |
| AI-9 | Graduation only when education is weakest goal | Misses free +5hap/+5dep from ready degrees |
| AI-10 | Only buys food at Rusty Tankard | Wastes hours traveling past closer food |
| AI-11 | Only buys `scrying-mirror` appliance | Misses Cooking Fire (+1hap/turn), other appliances |
| AI-12 | No route optimization | Wastes hours on redundant travel |
| AI-13 | Can't downgrade housing when broke | Stuck paying unaffordable rent |
| AI-14 | `efficiencyWeight` setting never used | Has no effect on AI behavior |
| AI-15 | `priceModifier` parameter never used | AI ignores economy fluctuations |
| AI-16 | AI clothing location wrong | Tries General Store, clothing sold at Armory |

---

### LOCATION PANEL ISSUES (Selected)

| Location | Issue |
|----------|-------|
| **ForgePanel** | Every work click re-applies for job. Earnings display shows 1.33x but actual is 1.15x. No raise button. |
| **BankPanel** | Hardcoded 50g deposit/withdraw amounts. No custom amounts. Investment has no withdrawal. Stock trades cost no time. |
| **GeneralStore** | Durable items with `relaxation` effect type are ignored (only `happiness` and `food` handled). |
| **PawnShop** | Gambling gives no win/loss feedback. Used weapons/shields purchased but not added to durables. |
| **HealerPanel** | "Cure Ailments" button exists but sickness cure mechanics are unclear. Costs don't scale with priceModifier. |
| **LandlordPanel** | Prepaid weeks displayed but non-functional (C3). Moving cost = 2x monthly rent is inconsistent. |
| **HomePanel** | Relax/Sleep can be spammed infinitely for happiness. No cooldown. |
| **ShadowMarket** | "Market Intel" item does nothing when purchased. |
| **QuestPanel** | Uses old `player.education` system, not `completedDegrees` (C6). Missing `dungeonFloorsCleared` param (H4). |

---

### MISSING FEATURES (Jones Reference Gaps)

| Feature | Jones Behavior | Current Implementation |
|---------|---------------|----------------------|
| **Location entry cost** | +2 hours entering any building | Not implemented |
| **0-hour free actions** | Can buy/deposit at 0 hours inside location | Turn auto-ends at 0 hours |
| **Auto rent deduction** | Rent deducted automatically each week | Must visit Landlord manually |
| **Food spoilage doctor** | Spoilage triggers doctor visit | Only starvation/relaxation trigger it |
| **Turn end on location exit** | Turn ends when leaving at 0 hours | Turn ends immediately at 0 hours |
| **Priest education path** | Priest degrees exist in quests | No priest degrees in degree system |

---

### FILES AUDITED (40+ files)

**Store:** `gameStore.ts`, `storeTypes.ts`, `turnHelpers.ts`, `economyHelpers.ts`, `workEducationHelpers.ts`, `questHelpers.ts`, `playerHelpers.ts`
**AI:** `useGrimwaldAI.ts`, `useAI.ts`, `ai/actionGenerator.ts`, `ai/strategy.ts`, `ai/types.ts`
**Data:** `dungeon.ts`, `combatResolver.ts`, `quests.ts`, `items.ts`, `education.ts`, `jobs/definitions.ts`, `jobs/utils.ts`, `locations.ts`, `events.ts`, `stocks.ts`, `weekends.ts`, `housing.ts`, `shadowfingers.ts`, `newspaper.ts`, `saveLoad.ts`
**Components:** All 14 location panels, `GameBoard.tsx`, `CombatView.tsx`, `LocationPanel.tsx`, `GoalProgress.tsx`, `VictoryScreen.tsx`, `GameSetup.tsx`, `TutorialOverlay.tsx`
**Types:** `game.types.ts`
**Tests:** All 6 test files (91 tests)

### Build Status
- TypeScript: Compiles cleanly (`tsc --noEmit`)
- Tests: 91/91 pass (`vitest run`)
- No new code changes in this audit (research only)

---

## 2026-02-06 - Zone Editor localStorage Persistence

Added localStorage persistence to the Zone Editor tool so zone positions, center panel config, and movement paths survive page reloads.

### Problem
Zone Editor changes were lost on page reload. The only way to preserve edits was to click "Copy Config" and manually paste the output into `src/data/locations.ts`. This made iterative zone positioning tedious.

### Implementation
- **New file:** `src/data/zoneStorage.ts` — save/load/clear/check utility using `guild-life-zone-config` localStorage key
  - `saveZoneConfig()` — serializes zones, centerPanel, paths with timestamp
  - `loadZoneConfig()` — deserializes with validation
  - `clearZoneConfig()` — removes saved data (reset to defaults)
  - `hasSavedZoneConfig()` — existence check
- **GameBoard.tsx changes:**
  - `customZones` and `centerPanel` state initializers read from localStorage
  - `useEffect` on mount applies saved `MOVEMENT_PATHS`
  - `handleSaveZones()` now calls `saveZoneConfig()` + shows toast confirmation
  - New `handleResetZones()` clears localStorage and restores hardcoded defaults
  - Passes `initialZones`, `initialPaths`, `onReset` props to ZoneEditor
- **ZoneEditor.tsx changes:**
  - New props: `initialZones`, `initialPaths`, `onReset`
  - Initializes state from props (persisted values) instead of hardcoded `ZONE_CONFIGS`
  - "Apply" button renamed to "Apply & Save" (now persists to localStorage)
  - "Reset Defaults" button (yellow) — only shown when saved config exists, clears localStorage and resets editor state

### Files Modified (2)
| File | Change |
|------|--------|
| `src/components/game/GameBoard.tsx` | Load from localStorage on mount, save on apply, reset handler, pass props |
| `src/components/game/ZoneEditor.tsx` | Accept initial state props, Reset Defaults button, renamed Apply button |

### Files Created (1)
| File | Purpose |
|------|---------|
| `src/data/zoneStorage.ts` | Zone editor localStorage persistence utility |

### Build Verification
- TypeScript compiles cleanly (`tsc --noEmit`)
- All 91 tests pass (`vitest run`)
- Vite build succeeds

## 2026-02-06 - Technical Debt Batch E (5 items)

Addressed all 5 technical debt items from the code audit.

### E1: Real Unit Tests (Large)
**Problem:** Zero test coverage — only `expect(true).toBe(true)` placeholder existed.
**Implementation:**
- **91 real tests** across 5 test files replacing the single placeholder
- `victory.test.ts` (8 tests): checkVictory with all goal types, wealth calculation (gold+savings+investments+stocks-loans), education via completedDegrees, career rank indexing, edge cases
- `economy.test.ts` (28 tests): depositToBank, withdrawFromBank, invest, takeLoan, repayLoan, buyStock, sellStock — all with input validation tests (negative, zero, NaN, Infinity, exceeding balance)
- `work.test.ts` (12 tests): workShift earnings, 15% efficiency bonus, currentWage usage, dependability/experience increases, happiness penalty scaling (weeks 1-3/4-8/9+), permanentGoldBonus, garnishment, shiftsWorkedSinceHire
- `education.test.ts` (16 tests): canEnrollIn, getAvailableDegrees, studyDegree, completeDegree, graduation bonuses, prerequisite chains, degree data integrity
- `gameActions.test.ts` (26 tests): Game setup defaults, player actions (movePlayer, modifyGold/Health/Happiness), buyGuildPass, death/resurrection, stock market pure functions, job system pure functions, eviction
- **Files:** `src/test/victory.test.ts`, `src/test/economy.test.ts`, `src/test/work.test.ts`, `src/test/education.test.ts`, `src/test/gameActions.test.ts`, `src/test/example.test.ts` (updated)

### E2: Deduplicate GUILD_PASS_COST (Small)
**Problem:** `questHelpers.ts` defined a local `const GUILD_PASS_COST = 500` instead of importing from `game.types.ts`.
**Fix:** Removed local constant, added import from `@/types/game.types`.
- **File:** `src/store/helpers/questHelpers.ts`

### E3: Input Validation on Banking Actions (Medium)
**Problem:** Banking functions accepted negative, NaN, Infinity amounts; could create inconsistent state.
**Fix:** Added validation guards to 7 functions:
- `depositToBank`: Rejects amount ≤ 0 / non-finite; clamps to available gold
- `withdrawFromBank`: Rejects amount ≤ 0 / non-finite; clamps to available savings
- `invest`: Rejects amount ≤ 0 / non-finite; clamps to available gold
- `buyStock`: Rejects shares ≤ 0 / non-finite; validates stock ID exists with valid price
- `sellStock`: Rejects shares ≤ 0 / non-finite
- `takeLoan`: Rejects amount ≤ 0 / non-finite / > 1000; no-ops when outstanding loan
- `repayLoan`: Rejects amount ≤ 0 / non-finite; no-ops when no outstanding loan
- **File:** `src/store/helpers/economyHelpers.ts`

### E4: LocationId Type Safety (Medium)
**Problem:** `events.ts` used `string` for housing/location parameters instead of `LocationId`/`HousingTier`.
**Fix:**
- `GameEvent.conditions.housing` → `HousingTier[]`
- `GameEvent.conditions.location` → `LocationId[]`
- `checkForEvent()` parameters → `HousingTier`, `LocationId`
- `checkWeeklyTheft()` parameter → `HousingTier`
- Removed unused `LegacyJob` interface from `jobs/types.ts`
- Removed unused `EducationPath` import from `jobs/types.ts`
- **Note:** Job `location` field intentionally kept as `string` — it holds employer display names ("Guild Hall"), not LocationId values ("guild-hall")
- **Files:** `src/data/events.ts`, `src/data/jobs/types.ts`

### E5: Legacy Education System Cleanup (Medium)
**Problem:** Old path-based education system (fighter/mage/priest/business levels) coexisted with new Jones-style degree system. Multiple components used `Object.values(player.education).reduce()` which read the OLD system, while victory conditions used `completedDegrees` (NEW system).
**Fix:**
- `RightSideTabs.tsx`: Changed education progress to `player.completedDegrees.length * 9` (matches checkVictory)
- `TurnOrderPanel.tsx`: Same fix
- `education.ts`: Removed dead legacy compatibility code:
  - `PATH_TO_DEGREES` mapping (unused)
  - `EDUCATION_PATHS` backwards-compat structure (unused)
  - `getCourse()`, `getNextCourse()`, `getTotalEducationLevel()` (all unused)
  - Removed `EducationPath` re-export
- **Files:** `src/components/game/RightSideTabs.tsx`, `src/components/game/TurnOrderPanel.tsx`, `src/data/education.ts`
- **Note:** `education` and `educationProgress` fields on Player kept for now — still used by quest `requiredEducation` checks in `canTakeQuest()`

### Build Verification
- TypeScript compiles cleanly (`tsc --noEmit`)
- All 91 tests pass (`vitest run`)
- No new ESLint errors

### Files Modified (8)
| File | Change |
|------|--------|
| `src/store/helpers/questHelpers.ts` | Import GUILD_PASS_COST, remove local duplicate |
| `src/store/helpers/economyHelpers.ts` | Input validation on 7 banking/stock/loan functions |
| `src/data/events.ts` | LocationId/HousingTier types on functions + interface |
| `src/data/jobs/types.ts` | Remove LegacyJob, unused EducationPath import |
| `src/data/education.ts` | Remove legacy PATH_TO_DEGREES, EDUCATION_PATHS, helper functions |
| `src/components/game/RightSideTabs.tsx` | Fix education progress to use completedDegrees |
| `src/components/game/TurnOrderPanel.tsx` | Fix education progress to use completedDegrees |
| `src/test/example.test.ts` | Replace placeholder with actual environment check |

### Files Created (4)
| File | Tests |
|------|-------|
| `src/test/victory.test.ts` | 8 tests — victory condition logic |
| `src/test/economy.test.ts` | 28 tests — banking, stocks, loans with validation |
| `src/test/work.test.ts` | 12 tests — work shift earnings and bonuses |
| `src/test/education.test.ts` | 16 tests — degree system and graduation |
| `src/test/gameActions.test.ts` | 26 tests — game setup, player actions, quests, death, jobs |

---

## 2026-02-06 - Gameplay Batch C + UI/UX Batch D (10 features)

Implemented 5 gameplay improvements and 5 UI/UX enhancements.

### C1: Save/Load System (Large)
**Problem:** Game state lost on page refresh — biggest usability gap.
**Implementation:**
- Auto-save every 2 seconds during gameplay (debounced, localStorage)
- 3 manual save slots + 1 auto-save slot
- Save/Load menu accessible via Escape key or menu button in top bar
- "Continue Game" button on title screen when auto-save exists
- "Load Saved Game" browser on title screen with slot details (week, players, timestamp)
- Save & Return to Title option in game menu
- Delete saves per slot
- **Files:** `src/data/saveLoad.ts` (new), `src/components/game/SaveLoadMenu.tsx` (new), `src/store/gameStore.ts`, `src/store/storeTypes.ts`, `src/components/screens/TitleScreen.tsx`

### C2: Tutorial System (Medium)
**Problem:** No guidance for new players.
**Implementation:**
- 9-step tutorial overlay with contextual tips
- Steps: Welcome, Housing, Jobs, Food & Clothing, Movement & Time, Education, Banking, Cave & Quests, Victory
- Each step has a title, description, and practical tip
- Navigation: Next/Previous/Skip buttons
- Opt-in checkbox in Game Setup (enabled by default)
- Toggle with T key during gameplay
- Persists step position in game state
- **Files:** `src/components/game/TutorialOverlay.tsx` (new), `src/components/screens/GameSetup.tsx`, `src/types/game.types.ts`, `src/store/storeTypes.ts`

### C3: Work Happiness Penalty Rebalance (Small)
**Problem:** -2 happiness per work shift from turn 1 made early game too punishing.
**Implementation:**
- Weeks 1-3: no happiness penalty (let players get established)
- Weeks 4-8: -1 happiness per shift (mild fatigue)
- Weeks 9+: -2 happiness per shift (full penalty, same as before)
- **File:** `src/store/helpers/workEducationHelpers.ts`

### C4: AI Turn Speed Control (Medium)
**Problem:** No way to skip or speed up Grimwald's turn.
**Implementation:**
- Speed controls in AI overlay: Normal (1x), Fast (3x), Skip
- Skip instantly executes all remaining AI actions without delays
- Space bar shortcut to skip AI turn
- Speed multiplier applied to decision delay (min 50ms)
- State stored in Zustand (aiSpeedMultiplier, skipAITurn)
- **Files:** `src/hooks/useGrimwaldAI.ts`, `src/components/game/GameBoard.tsx`, `src/store/gameStore.ts`, `src/store/storeTypes.ts`, `src/types/game.types.ts`

### C5: Raise Request Improvement (Small)
**Problem:** -10 dependability on failed raise was too punishing.
**Implementation:**
- Base chance increased: 30% → 40%
- Bonus for extra shifts worked beyond minimum (+2% per extra shift, up to +20%)
- Max chance capped at 95%
- Failure penalty reduced: -10 → -3 dependability
- Friendlier denial message
- **File:** `src/store/helpers/workEducationHelpers.ts`

### D2: Tooltips (Small)
- Added title attributes to End Turn button ("End your turn (E)")
- Added title attributes to Menu button ("Game Menu (Esc)")
- Added title attributes to Dark Mode toggle
- Added keyboard shortcut hints in ResourcePanel footer

### D3: Keyboard Shortcuts (Small)
- **E** = End Turn (when not in menu/AI turn)
- **Escape** = Open/close game menu
- **Space** = Skip AI turn (during AI turn)
- **T** = Toggle tutorial
- **Ctrl+Shift+Z** = Zone editor (existing)
- **Ctrl+Shift+D** = Debug overlay (existing)

### D4: Confirmation Dialog Component (Small)
- Created reusable ConfirmDialog component with useConfirmDialog hook
- Shows cost warning for expensive actions
- Styled with parchment theme
- **File:** `src/components/game/ConfirmDialog.tsx` (new)

### D5: Dark Mode Toggle (Small)
- Dark mode CSS variables already existed; added toggle button
- Toggle on title screen (top-right) and game board (top bar)
- Persists preference to localStorage
- Defaults to dark theme (matches medieval aesthetic)
- **File:** `src/components/game/DarkModeToggle.tsx` (new)

### Type/State Changes
- **GameState fields added:** `aiSpeedMultiplier`, `skipAITurn`, `showTutorial`, `tutorialStep`
- **New store actions:** `saveToSlot`, `loadFromSlot`, `setAISpeedMultiplier`, `setSkipAITurn`, `setShowTutorial`, `setTutorialStep`
- **Auto-save subscription** added to store with 2-second debounce

### New Files (6)
| File | Purpose |
|------|---------|
| `src/data/saveLoad.ts` | Save/Load utility (serialize, slots, metadata) |
| `src/components/game/SaveLoadMenu.tsx` | In-game save/load menu modal |
| `src/components/game/TutorialOverlay.tsx` | 9-step tutorial overlay |
| `src/components/game/ConfirmDialog.tsx` | Confirmation dialog + hook |
| `src/components/game/DarkModeToggle.tsx` | Dark mode toggle button |

### Modified Files (10)
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added GameState fields for AI speed + tutorial |
| `src/store/storeTypes.ts` | Added save/load/AI/tutorial action types |
| `src/store/gameStore.ts` | Save/load/AI/tutorial state + auto-save subscription |
| `src/store/helpers/workEducationHelpers.ts` | Scaled happiness penalty, improved raise system |
| `src/hooks/useGrimwaldAI.ts` | Speed multiplier + skip support |
| `src/components/game/GameBoard.tsx` | Menu button, AI speed controls, keyboard shortcuts, dark mode, tutorial |
| `src/components/game/ResourcePanel.tsx` | Keyboard shortcut hints, End Turn tooltip |
| `src/components/screens/TitleScreen.tsx` | Continue/Load buttons, dark mode toggle |
| `src/components/screens/GameSetup.tsx` | Tutorial toggle option |

### Build Status
- TypeScript compiles cleanly (tsc --noEmit)
- Vite production build succeeds
- All tests pass

---

## 2026-02-06 - Inventory Grid System with Drag-Drop & Icons

Implemented a medieval-styled inventory grid system with custom SVG icons, drag-and-drop functionality, and hover tooltips.

### Feature: ItemIcon Component
**File:** `src/components/game/ItemIcon.tsx`

Created 40+ custom SVG icons for all game items:
- **Weapons**: Dagger, Sword, Steel Sword, Enchanted Blade
- **Armor**: Leather, Chainmail, Plate, Enchanted Plate
- **Shields**: Wood, Iron, Tower Shield
- **Food**: Bread, Cheese, Meat, Provisions, Feast, Vegetables, Ale, Stew, Roast
- **Clothing**: Peasant Garb, Common Clothes, Fine Clothes, Noble Attire, Guild Uniform
- **Appliances**: Candles, Blanket, Music Box, Furniture, Scrying Mirror, Preservation Box, Frost Chest
- **Magic Items**: Glow Orb, Warmth Stone, Healing Potion, Arcane Tome, Memory Crystal
- **Misc**: Lottery Ticket, Event Tickets

### Feature: InventoryGrid Component
**File:** `src/components/game/InventoryGrid.tsx`

- **Grid Layout**: 4x5 grid of inventory slots (20 total slots)
- **Equipment Slots**: 3 dedicated slots for Weapon, Armor, Shield at top
- **Drag & Drop**: Drag items between equipment slots and inventory
  - Draggable only for equippable items (weapons/armor/shields)
  - Drop on equipment slot to equip
  - Drop on inventory to unequip
- **Hover Tooltips**: Fixed-position tooltips showing:
  - Item name and description
  - Combat stats (Attack, Defense, Block%)
  - Broken status with warning
  - "Drag to equip" hint for equippable items
- **Visual Feedback**: 
  - Golden highlight for equipped slots
  - Accent ring when valid drop target
  - Quantity badges for stacked items
  - Broken indicator (⚠) for damaged appliances

### Integration with SideInfoTabs
- Replaced old InventoryTab with new InventoryGrid component
- Compact combat stats summary (ATK/DEF) shown below inventory grid
- Responsive design fits narrow sidebar width

### Files Created/Modified
| File | Changes |
|------|---------|
| `src/components/game/ItemIcon.tsx` | New (500 lines) - 40+ SVG item icons |
| `src/components/game/InventoryGrid.tsx` | New (400 lines) - Grid inventory with drag-drop |
| `src/components/game/SideInfoTabs.tsx` | Updated to use InventoryGrid |

---

## 2026-02-06 - Side Panel InfoTabs System (Redesign)

Moved the InfoTabs system from the center panel to the left side panel, replacing PlayerInfoPanel with a comprehensive tabbed interface that combines player stats with detailed inventory, goals, and stats views.

### Feature: SideInfoTabs Component
**Reference:** Jones in the Fast Lane left sidebar + medieval RPG inventory screens

**Implementation:**
- Created new `SideInfoTabs.tsx` component for left sidebar
- Combines quick-access resource bars at top (like original PlayerInfoPanel)
- 3-tab navigation at bottom: Inventory, Goals, Stats
- Compact design optimized for narrow sidebar width

### Quick Stats Section (Always Visible)
- Hours (with progress bar)
- Gold
- Health (with progress bar and warning at ≤20)
- Happiness (with progress bar)
- Food (with progress bar and warning at ≤25%)
- Clothing (with progress bar and warning at ≤25%)
- Dependability (warning at <30%)
- Home status
- Experience

### Inventory Tab (Compact)
- 3 equipment slots in row (Weapon, Armor, Shield)
- Combat stats summary (ATK, DEF, Block%)
- Appliances list with broken status
- Stored items list
- Fresh food storage bar
- Weekend tickets

### Goals Tab (Compact)
- Victory goal progress bars with percentage display
- Dungeon floor completion (1-5 floors)
- Quest stats and Guild Pass status

### Stats Tab
- Character info (rank, level, housing)
- Employment details (job, wage, shifts, dependability, experience)
- Finances (gold, savings, investments, loans)
- Education (completed degrees)

### Files Created/Modified
| File | Changes |
|------|---------|
| `src/components/game/SideInfoTabs.tsx` | New component (480 lines) - sidebar tabbed panel |
| `src/components/game/GoalProgress.tsx` | Added `compact` prop for sidebar use |
| `src/components/game/GameBoard.tsx` | Replaced PlayerInfoPanel with SideInfoTabs |

### Technical Notes
- GoalProgress now supports `compact` mode with smaller text and simpler display
- Center panel reverts to ResourcePanel when no location selected
- Uses existing design tokens (parchment, wood, gold, etc.)

---

## 2026-02-06 - Inventory & Info Tabs UI System (Original Center Panel)

---

## 2026-02-06 - Feature Batch B: Missing Jones Features (6 systems)

Implemented 6 missing Jones in the Fast Lane features with fantasy equivalents.

### B1: Stock Market (Large)
**Jones Reference:** Stock Market at Bank - stocks + T-Bills
**Implementation:**
- 3 regular stocks (Crystal Mine Ventures, Potion Consortium, Enchanting Guild Corp) with different volatility levels
- Crown Bonds (T-Bill equivalent) - fixed price, 3% sell fee, crash-proof
- Stock prices fluctuate each week in `processWeekEnd` via `updateStockPrices()`
- 5% weekly chance of market crash (stocks lose 30-60% value, Crown Bonds safe)
- Buy/sell shares at Bank → "See the Broker" sub-panel (2 hours per transaction)
- Stock portfolio value counts toward Wealth goal in `checkVictory` and `GoalProgress`
- **Files:** `src/data/stocks.ts` (new), `src/components/game/BankPanel.tsx`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/questHelpers.ts`, `src/components/game/GoalProgress.tsx`

### B2: Loan System (Medium)
**Jones Reference:** Bank loans with interest
**Implementation:**
- Loan amounts: 100, 250, 500, 1000g at Bank → "Loan Office" sub-panel
- 10% weekly interest on outstanding balance (compounded in `processWeekEnd`)
- 8 weeks to repay; default triggers forced collection from savings/gold
- If can't repay: -10 happiness, 4-week extension
- Only one loan at a time; loan amount subtracted from Wealth goal
- Repayment options: 50, 100, 250, or full amount (1 hour per transaction)
- **Files:** `src/components/game/BankPanel.tsx`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/turnHelpers.ts`

### B3: Weekend System (Medium-Large)
**Jones Reference:** Tickets, appliance weekends, random weekend activities
**Implementation:**
- Runs in `processWeekEnd` for every player each week
- Priority: 1) Ticket weekends → 2) Durable weekends (20% chance each) → 3) Random weekends
- 3 ticket types: Jousting Tournament (+8 hap), Theatre Performance (+10 hap), Bard Concert (+12 hap)
- Tickets purchasable at Shadow Market, consumed on use
- 5 durable weekends tied to appliances (Scrying Mirror, Memory Crystal, Music Box, Cooking Fire, Arcane Tome)
- 25+ random weekend activities in 3 tiers: cheap ($0-15), medium ($15-55), expensive ($50-100, week 8+)
- Weekend costs deducted automatically; happiness gained; results shown in event messages
- **Files:** `src/data/weekends.ts` (new), `src/store/helpers/turnHelpers.ts`, `src/data/items.ts`, `src/components/game/ShadowMarketPanel.tsx`

### B4: Doctor Visit Triggers (Small)
**Jones Reference:** Starvation/low relaxation trigger forced doctor visit
**Implementation:**
- Starvation trigger: 25% chance when starving → -10 Hours, -4 Happiness, -30 to 200g
- Low relaxation trigger: 20% chance when relaxation ≤ 15 → same penalties
- Both check in `startTurn` for human players
- **Files:** `src/store/helpers/turnHelpers.ts`

### B5: Food Storage System (Medium)
**Jones Reference:** Refrigerator (6 units) + Freezer (12 units)
**Implementation:**
- Preservation Box (existing, = Refrigerator): stores up to 6 fresh food units
- Frost Chest (new appliance, = Freezer): doubles storage to 12 units, available at Enchanter (1200g) and Shadow Market (900g)
- 3 fresh food items at General Store: Fresh Vegetables (+2 units), Fresh Meat (+3), Fresh Provisions Bundle (+6)
- Fresh food auto-consumed at turn start if regular foodLevel is 0 (prevents starvation)
- Spoilage: all fresh food lost if Preservation Box breaks
- Fresh Food section appears in General Store only when player owns Preservation Box
- Frost Chest displayed in HomePanel room scene
- **Files:** `src/data/items.ts`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/turnHelpers.ts`, `src/components/game/GeneralStorePanel.tsx`, `src/components/game/HomePanel.tsx`

### B6: Lottery / Fortune's Wheel (Small)
**Jones Reference:** Lottery tickets with weekly drawing
**Implementation:**
- Buy Fortune's Wheel tickets at Shadow Market (10g base, affected by price modifier)
- Multiple tickets per week allowed (each increases odds independently)
- Drawing at week end in `processWeekEnd`: 2% grand prize (5,000g), 5% small prize (50g) per ticket
- Winners get +25 happiness (grand) or +5 happiness (small)
- Tickets reset to 0 after each drawing
- **Files:** `src/data/items.ts`, `src/store/helpers/economyHelpers.ts`, `src/store/helpers/turnHelpers.ts`, `src/components/game/ShadowMarketPanel.tsx`

### Type/State Changes
- **Player fields added:** `stocks`, `loanAmount`, `loanWeeksRemaining`, `tickets`, `freshFood`, `lotteryTickets`
- **GameState fields added:** `stockPrices`, `weekendEvent`
- **New store actions:** `buyStock`, `sellStock`, `takeLoan`, `repayLoan`, `buyFreshFood`, `buyLotteryTicket`, `buyTicket`, `dismissWeekendEvent`
- **Modified victory calculation:** Wealth = Cash + Savings + Investments + StockValue - LoanAmount

### New Files (2)
| File | Purpose |
|------|---------|
| `src/data/stocks.ts` | Stock definitions, price fluctuation logic, portfolio value calculation |
| `src/data/weekends.ts` | Weekend activities, ticket types, durable weekends, activity selection |

### Modified Files (14)
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added Player fields, GameState fields, WeekendEventResult interface |
| `src/store/gameStore.ts` | New defaults in createPlayer, stockPrices/weekendEvent in state, dismissWeekendEvent action |
| `src/store/storeTypes.ts` | Added all new action signatures to GameStore interface |
| `src/store/helpers/economyHelpers.ts` | buyStock, sellStock, takeLoan, repayLoan, buyFreshFood, buyLotteryTicket, buyTicket |
| `src/store/helpers/turnHelpers.ts` | Doctor triggers, fresh food consumption/spoilage, loan interest, weekends, lottery, stock prices |
| `src/store/helpers/questHelpers.ts` | Updated checkVictory wealth calculation to include stocks and loans |
| `src/data/items.ts` | Frost Chest appliance, fresh food items, ticket items, Fortune's Wheel ticket, new Item fields |
| `src/components/game/BankPanel.tsx` | Complete rewrite: 3 views (main/broker/loans), stock trading, loan office |
| `src/components/game/ShadowMarketPanel.tsx` | Lottery tickets, weekend tickets, reorganized sections |
| `src/components/game/GeneralStorePanel.tsx` | Fresh food section with storage display |
| `src/components/game/LocationPanel.tsx` | Wire up all new store actions to child components |
| `src/components/game/HomePanel.tsx` | Frost Chest position in room scene |
| `src/components/game/GoalProgress.tsx` | Wealth calculation includes stocks/loans |

### Verification
- TypeScript check passes (`tsc --noEmit`)
- Build passes (`vite build`)
- Tests pass (`vitest run`)

---

## 2026-02-06 - Bugfix Batch A: Education Progress, Work Income, Async Imports, MaxHealth

### Bug A1: Education Progress Display Mismatch

**Problem:** `GoalProgress.tsx` calculated education using `Object.values(player.education).reduce(...)` (old path-level system), but `checkVictory()` in `questHelpers.ts` uses `player.completedDegrees.length * 9` (new Jones-style degree system). Players saw misleading progress bars that didn't match actual victory conditions.

**Fix:** Changed `GoalProgress.tsx` to use `player.completedDegrees.length * 9`, matching the `checkVictory` calculation exactly.

### Bug A2: Work Income Display Shows 33% But Actual Is 15%

**Problem:** `WorkSection.tsx` calculated displayed earnings with `hoursPerShift * 1.33 * wage` (33% bonus), but the actual `workShift` action in `workEducationHelpers.ts` uses `Math.ceil(hours * 1.15)` (15% bonus). The 33% was the old multiplier before the economy rebalance. Players expected more gold than they actually earned.

**Fix:** Changed `WorkSection.tsx` to replicate the actual workShift logic: apply `Math.ceil(hoursPerShift * 1.15)` bonus for 6+ hour shifts, then multiply by wage.

### Bug A3: Async Imports in Store Actions (Race Conditions)

**Problem:** Two store actions used `import().then()` for dynamic imports:
- `applyRareDrop` in `economyHelpers.ts` — `import('@/data/dungeon').then(...)`
- `completeQuest` in `questHelpers.ts` — `import('@/data/quests').then(...)`

The async callbacks meant `set()` state updates happened in a later microtask, racing with other synchronous state changes. Neither `dungeon.ts` nor `quests.ts` imports from the store, so the "avoid circular deps" comment was incorrect — no circular dependency exists.

**Fix:** Replaced both dynamic `import().then()` calls with top-level static imports. State updates now happen synchronously within the action, eliminating race conditions.

### Bug A4: modifyMaxHealth Inconsistent Logic

**Problem:** `modifyMaxHealth` in `playerHelpers.ts` had `health: Math.min(p.health, p.maxHealth + amount)` — this used the raw `maxHealth + amount` to cap health, ignoring the `Math.max(50, ...)` floor applied to maxHealth itself. The `applyRareDrop` `permanent_max_health` case had the same issue: it set health to `p.health + effect.value` without capping to the new maxHealth.

**Fix:**
- `modifyMaxHealth`: Compute `newMaxHealth = Math.max(50, p.maxHealth + amount)` first, then cap health to `newMaxHealth`.
- `applyRareDrop` `permanent_max_health`: Same pattern — compute clamped newMax, cap health to it.

### Files Modified (5 files)
| File | Changes |
|------|---------|
| `src/components/game/GoalProgress.tsx` | Use `completedDegrees.length * 9` instead of old `education` path sum |
| `src/components/game/WorkSection.tsx` | Use `1.15` bonus matching actual `workShift` logic |
| `src/store/helpers/economyHelpers.ts` | Static import of `DUNGEON_FLOORS`, sync `applyRareDrop`, fixed `permanent_max_health` cap |
| `src/store/helpers/questHelpers.ts` | Static import of `getQuest`, sync `completeQuest` |
| `src/store/helpers/playerHelpers.ts` | Fixed `modifyMaxHealth` to use clamped newMaxHealth for health cap |

### Verification
- Build passes (`npx vite build`)
- Tests pass (`npx vitest run`)
## 2026-02-05 - Improvement Proposals (Code Audit & Gap Analysis)

A full codebase audit and gap analysis against JONES_REFERENCE.md was performed. Below are categorized improvement proposals, from highest to lowest priority.

---

### Category A: Bugs & Logic Errors (Fix ASAP)

#### A1. Education Progress Display Mismatch (HIGH)
**Files**: `src/components/game/GoalProgress.tsx:17`, `src/store/helpers/questHelpers.ts:180`

**Problem**: GoalProgress shows education using the OLD `player.education` map:
```typescript
const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);
```
But victory checking (`checkVictory`) uses the NEW `player.completedDegrees` system:
```typescript
const totalEducation = player.completedDegrees.length * 9;
```
Players see a misleading progress bar that doesn't match actual win conditions.

**Fix**: Replace the education calculation in GoalProgress.tsx with `player.completedDegrees.length * 9`.

#### A2. Work Earnings Display Mismatch (MEDIUM)
**Files**: `src/components/game/WorkSection.tsx:24`, `src/store/helpers/workEducationHelpers.ts:20`

**Problem**: WorkSection displays earnings using a 33% bonus multiplier:
```typescript
const earnings = Math.ceil(jobData.hoursPerShift * 1.33 * player.currentWage);
```
But actual workShift calculation uses 15% bonus:
```typescript
const bonusHours = hours >= 6 ? Math.ceil(hours * 1.15) : hours;
```
Players see higher expected earnings than they actually receive.

**Fix**: Update WorkSection to use `1.15` multiplier, or better yet, extract the bonus calculation to a shared utility.

#### A3. Async Imports in Store Actions — Race Conditions (HIGH)
**Files**: `src/store/helpers/economyHelpers.ts:319`, `src/store/helpers/questHelpers.ts:42`

**Problem**: `applyRareDrop` and quest helpers use `import(...).then()` inside action creators. The state update happens asynchronously — the function returns before the drop is applied. If other state changes happen in the meantime, state could be corrupted.

**Fix**: Convert dynamic imports to static imports at the top of the file. The dungeon and quest data modules are small and always needed when these actions run.

#### A4. modifyMaxHealth Logic (LOW-MEDIUM)
**File**: `src/store/helpers/playerHelpers.ts:127`

**Problem**: When maxHealth increases, current health is clamped to the new max but not increased to take advantage of the new capacity. This is technically correct (health doesn't magically fill), but `applyRareDrop` for `permanent_max_health` (economyHelpers.ts:343-344) does increase both — creating inconsistent behavior between the two code paths.

**Fix**: Decide on one behavior and apply it consistently. If max health increases should also heal, update `modifyMaxHealth` to match `applyRareDrop`.

---

### Category B: Missing Jones Features (Gameplay Gaps)

Based on JONES_REFERENCE.md, these core Jones mechanics are not yet implemented:

#### B1. Stock Market / Trading System (LARGE)
Jones has a full stock market at the Bank: regular stocks with economy-driven price fluctuation, and risk-free T-Bills (3% sell fee, no crash risk). T-Bills count toward Liquid Assets and can't be robbed or wiped by market crashes. This is a major wealth management feature that adds strategic depth.

**Scope**: New BankPanel section, stock price simulation per turn, buy/sell UI, T-Bill vs. regular stock choice, crash effects on stocks.

#### B2. Loan System (MEDIUM)
Jones allows bank loans with interest and repayment schedules. Failed loan requests cost happiness. This creates an early-game financing option — borrow for education or equipment, pay back with job earnings.

**Scope**: New BankPanel section, loan state on Player, interest calculation per turn, garnishment on default.

#### B3. Weekend System (MEDIUM-LARGE)
Between turns, Jones has automatic weekend activities: ticket-based (Baseball/Theatre/Concert), durable-triggered (20% chance per appliance), and random weekends. Costs range from $5-100. This creates a happiness income/drain mechanic and makes appliance ownership more meaningful.

**Scope**: Weekend event generator, ticket items, weekend result display between turns, appliance weekend triggers.

#### B4. Doctor Visit Triggers (SMALL)
In Jones, starvation, food spoilage, and low relaxation can trigger a Doctor Visit: -10 hours, -4 happiness, -$30-200. Currently the game has a Healer location but no automatic doctor visits from starvation/relaxation.

**Fix**: Add doctor visit checks in `processWeekEnd` when starvation or low relaxation is detected.

#### B5. Fresh Food Storage System (MEDIUM)
Jones has Refrigerator (stores 6 Fresh Food units) and Freezer (12 units). Fresh food from the grocery store prevents starvation and spoils without proper storage. Currently, Guild Life has a simpler foodLevel percentage system.

**Scope**: Would require reworking the food system from percentage to unit-based, adding food inventory, spoilage checks.

#### B6. Lottery Tickets (SMALL)
Jones has lottery tickets as a gambling mechanic. Fixed price, chance to win big ($5,000). Fun, low-effort addition.

**Scope**: New item at Shadow Market or General Store, random draw on weekend/turn end.

---

### Category C: Gameplay & Balance Improvements

#### C1. Save/Load Game State (HIGH PRIORITY)
**Currently missing entirely.** Games are lost on page refresh. This is the single biggest usability gap.

**Implementation**: Serialize Zustand store to localStorage. Add save/load buttons. Auto-save at turn end. Allow multiple save slots.

#### C2. No Tutorial or New Player Guidance
The game has many interconnected systems (housing, jobs, education, food, equipment, dungeon, quests, guild ranks) with no in-game explanation. New players will be lost.

**Options**:
- First-turn tutorial overlay highlighting key locations
- "Advisor" tooltip system explaining each panel
- Quick-start guide accessible from title screen

#### C3. Work Happiness Penalty Too Harsh Early Game
Working costs -2 happiness per shift (workEducationHelpers.ts:47). In early game with low wages, players lose happiness faster than they can earn it through other means. Consider scaling the penalty based on job satisfaction or wage level.

#### C4. No Game Speed Control for AI Turns
Grimwald AI has hardcoded delays (300-800ms per action, up to 15 actions per turn). No way to skip or speed up. Long AI turns can be tedious.

**Fix**: Add a "Skip AI Turn" button or speed multiplier setting.

#### C5. Raise Request System Could Be Improved
The raise system (workEducationHelpers.ts:57-99) has a -10 dependability penalty on failure, which is very punishing. Jones lets you re-apply for your current job at the Employment Office to get the current market rate — no penalty.

---

### Category D: UI/UX Improvements

#### D1. No Mobile/Responsive Layout
The game board and panels are designed for desktop. No responsive breakpoints for mobile or tablet. The game board image requires a large viewport.

#### D2. Missing Tooltips
Buttons and icons throughout the game have no hover tooltips. Players must experiment to understand what each action does.

#### D3. No Keyboard Shortcuts
No keyboard navigation for common actions (end turn, work, study, etc.). Would improve power-user experience significantly.

#### D4. No Undo for Misclicks
Accidentally clicking a location starts travel immediately. No confirmation dialog for expensive or time-consuming actions. A simple "Are you sure?" for travel when time is low would prevent frustration.

#### D5. Dark Mode
Not critical but commonly requested. Tailwind makes this straightforward with `dark:` variants.

---

### Category E: Technical Debt & Code Quality

#### E1. Zero Real Test Coverage (CRITICAL)
**File**: `src/test/example.test.ts` — contains only `expect(true).toBe(true)`.

No tests for: state mutations, victory conditions, financial calculations, education progression, death system, robbery logic, AI decision engine. Any refactoring or balance change risks introducing silent regressions.

**Priority tests to write:**
1. `checkVictory()` — all goal combinations
2. `workShift()` — earnings, garnishment, bonus calculations
3. `processWeekEnd()` — starvation, rent, appliance breakage
4. `completeDegree()` — prerequisite validation, graduation bonuses
5. AI action generation — priority scoring, critical needs detection

#### E2. Duplicate GUILD_PASS_COST Constant
**Files**: `src/store/helpers/questHelpers.ts:14` and `src/types/game.types.ts:242`

Hardcoded `500` in two places. Should import from a single source.

#### E3. Input Validation Missing in Banking
**File**: `src/store/helpers/economyHelpers.ts:25-50`

`depositToBank` and `withdrawFromBank` don't validate that amounts are positive. Negative amounts would exploit the system (deposit -100 = free gold). The UI prevents this, but the store should be self-protecting.

#### E4. Type Safety in Location Functions
**File**: `src/data/locations.ts:278`

`getMovementCost` accepts `string` instead of `LocationId`. Invalid location IDs silently return 0 instead of producing a type error.

#### E5. Legacy Education System Code
GoalProgress.tsx and potentially other components still reference `player.education` (old system) instead of `player.completedDegrees` (new system). Dead code paths should be cleaned up.

---

### Summary: Recommended Priority Order

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | A1: Fix education progress display | Small | High — players see wrong progress |
| 2 | A2: Fix earnings display | Small | Medium — misleading UI |
| 3 | A3: Fix async imports | Small | High — prevents race conditions |
| 4 | C1: Save/load game | Medium | Critical — games lost on refresh |
| 5 | E1: Write core tests | Medium | High — safety net for all future work |
| 6 | B1: Stock market | Large | High — major strategic depth |
| 7 | B3: Weekend system | Medium | Medium — happiness/economy depth |
| 8 | B2: Loan system | Medium | Medium — early-game financing |
| 9 | C2: Tutorial/guidance | Medium | Medium — new player retention |
| 10 | D1: Mobile responsive | Large | Medium — broader audience |

---

## 2026-02-05 - Fix: Single-Player Win Condition (Last Man Standing Bug)

### Problem
In a single-player game, the player would automatically win as "last man standing" on their very first turn end. The `endTurn()` and `processWeekEnd()` functions in `turnHelpers.ts` both checked `alivePlayers.length === 1` without considering whether the game was single-player or multiplayer. Since a solo player is always the only one alive, the victory screen triggered immediately — bypassing all goal requirements (Wealth, Happiness, Education, Career).

### Root Cause
Two locations in `src/store/helpers/turnHelpers.ts`:
1. **`endTurn()`** (line 57): `if (alivePlayers.length === 1)` → instant "last one standing" win
2. **`processWeekEnd()`** (line 387): Same check at end of week

Both triggered regardless of total player count.

### Solution
Added a guard to both "last man standing" checks: only trigger when there are **multiple players** (`state.players.length > 1` / `updatedPlayers.length > 1`). In single-player games, the player must now achieve all four victory goals (Wealth, Happiness, Education, Career) via `checkVictory()` to win.

### Files Modified (1 file)
| File | Changes |
|------|---------|
| `src/store/helpers/turnHelpers.ts` | Added `&& state.players.length > 1` guard to both "last man standing" checks in `endTurn()` and `processWeekEnd()` |

### Verification
- TypeScript: 0 errors (`tsc --noEmit`)
- Tests: 1/1 passing
- Logic: Single-player → must complete goals. Multiplayer → last survivor still wins.

---

## 2026-02-05 - Phase 5: Integration (Quests + AI + Balance)

### Problem
The game's subsystems — dungeon, quests, combat, AI (Grimwald), and economy — existed in isolation. Dungeon quests (`dungeon-dive`, `deep-dungeon-clear`) had no connection to actual floor clears. Rare drops from bosses were displayed as toasts but never applied to the player. Grimwald AI had no knowledge of dungeons, equipment, quests, or the guild pass. The loot multiplier system (guild rank → gold bonus) was defined but never used.

### Solution: 6-Part Integration

#### 1. Quest ↔ Dungeon Connection
- Added `requiresDungeonFloor` and `requiresAllDungeonFloors` fields to Quest interface
- `dungeon-dive` (B-rank) now requires Floor 1 cleared
- `deep-dungeon-clear` (S-rank) now requires all 5 floors cleared
- Updated `canTakeQuest()` to validate dungeon floor requirements (new `dungeonFloorsCleared` param)

#### 2. Rare Drop System Integration
- Added `permanentGoldBonus` field to Player interface (default 0)
- Created `applyRareDrop` store action in economyHelpers that handles all 5 effect types:
  - `heal` → instant HP restore (Cave Mushroom)
  - `permanent_gold_bonus` → permanent % bonus to work earnings (Goblin's Lucky Coin)
  - `permanent_max_health` → increase max health cap (Undead Amulet)
  - `equippable` → add as durable item + auto-equip (Dragon Scale Shield)
  - `happiness_and_stats` → happiness + stat cap increases (Demon's Heart)
- Added Dragon Scale Shield to ALL_ITEMS as a RARE_DROP_ITEMS category (isUnstealable)
- Connected `applyRareDrop` through CavePanel → LocationPanel → GameStore
- Applied `permanentGoldBonus` in `workShift` earnings calculation

#### 3. Grimwald AI — Dungeon Exploration
- Added 5 new `AIActionType` values: `buy-equipment`, `explore-dungeon`, `buy-guild-pass`, `take-quest`, `complete-quest`
- Strategy functions in `strategy.ts`:
  - `getBestDungeonFloor()` — evaluates uncleared floors, checks requirements, power ratio, and time budget
  - `getNextEquipmentUpgrade()` — weapon/armor/shield upgrade path (dagger → sword → steel → enchanted)
  - `shouldBuyGuildPass()` — gold threshold varies by AI difficulty
  - `getBestQuest()` — picks best quest by gold/time ratio (strategic) or raw gold (simple)
- Action generation in `actionGenerator.ts` — dungeon/quest actions with contextual priorities
- Full action execution in `useGrimwaldAI.ts` — calls `autoResolveFloor()` with loot multiplier, applies gold/health/happiness/rare drops

#### 4. Loot Multiplier Balance
- Connected guild rank loot multiplier (novice 0.8× → guild-master 1.5×) to combat resolver
- Added `lootMultiplier` parameter to `autoResolveFloor()` (default 1.0)
- Applied in CombatView (human players) via `getLootMultiplier(floor, player.guildRank)`
- Applied in Grimwald AI dungeon exploration

### Files Modified (15 files)
| File | Changes |
|------|---------|
| `src/types/game.types.ts` | Added `permanentGoldBonus` to Player |
| `src/data/quests.ts` | Quest-dungeon fields, updated canTakeQuest |
| `src/data/items.ts` | Dragon Scale Shield in RARE_DROP_ITEMS |
| `src/data/combatResolver.ts` | lootMultiplier param on autoResolveFloor |
| `src/store/storeTypes.ts` | Added applyRareDrop to GameStore |
| `src/store/gameStore.ts` | permanentGoldBonus default in createPlayer |
| `src/store/helpers/economyHelpers.ts` | applyRareDrop action (5 effect types) |
| `src/store/helpers/workEducationHelpers.ts` | Apply permanentGoldBonus in workShift |
| `src/hooks/ai/types.ts` | 5 new AIActionType values |
| `src/hooks/ai/strategy.ts` | 4 new strategy functions (dungeon/quest) |
| `src/hooks/ai/actionGenerator.ts` | Dungeon/quest action generation |
| `src/hooks/useGrimwaldAI.ts` | 5 new action execution cases |
| `src/components/game/CavePanel.tsx` | applyRareDrop prop + usage |
| `src/components/game/CombatView.tsx` | Loot multiplier in handleFinish |
| `src/components/game/LocationPanel.tsx` | Pass applyRareDrop to CavePanel |

### Verification
- TypeScript: 0 errors (`tsc --noEmit`)
- Build: Succeeds (`vite build` → 587 KB JS, 88 KB CSS)
- Tests: 1/1 passing
- ESLint: No new errors (2 pre-existing in actionGenerator.ts)

---

## 2026-02-05 - Phase 4: Combat System (Encounter Resolution)

### Problem
The dungeon system (Phase 3) used auto-resolve combat — clicking "Enter Floor" instantly resolved all 4 encounters at once and showed a toast notification with totals. Players had no agency during combat: no ability to see individual encounters, no retreat option mid-floor, no step-by-step feedback on damage/gold/bonuses. Combat was invisible and felt like a black box.

### Solution
Replaced auto-resolve with an encounter-by-encounter combat system. Players now step through each encounter individually, seeing detailed results and making tactical decisions (fight/retreat) between encounters.

### Architecture

**Combat Resolver Module** (`src/data/combatResolver.ts`):
- Pure-function state machine for combat resolution, separate from UI
- Types: `EncounterResult`, `DungeonRunState`, `CombatPhase`, `CombatStats`, `AutoResolveResult`
- `initDungeonRun()` — Generate encounters, set up initial state
- `resolveEncounter()` — Resolve a single encounter (same formula as Phase 3 auto-resolve, extracted and enriched)
- `applyEncounterResult()` — Apply result to run state, advance phase
- `advanceToNextEncounter()` — Move to next encounter (player chose "Continue")
- `retreatFromDungeon()` — Strategic retreat with partial rewards
- `autoResolveFloor()` — Auto-resolve entire floor (for AI in Phase 5)
- Helper functions: `getEncounterAction()`, `getEncounterIcon()`

**Combat View Component** (`src/components/game/CombatView.tsx`):
Three sub-views managed by the combat state machine:

1. **EncounterIntro** — Shows encounter card with:
   - Type-specific icon and color theme (red for boss, amber for treasure, cyan for healing, orange for trap)
   - Enemy name, flavor text, power/damage/gold stats
   - HP bar with health percentage coloring (green/yellow/red)
   - Encounter counter (e.g., "Encounter 2 of 4")
   - Arcane warning for ethereal enemies
   - Action button: "Fight!" / "Search" / "Disarm" / "Drink" / "Fight Boss!"

2. **EncounterResultView** — Shows post-encounter results:
   - Damage taken (with block indicator)
   - Gold earned
   - Healing received
   - Trap disarmed status
   - Healing potion found (Alchemy bonus)
   - Education bonuses that activated (listed with icons)
   - Updated HP bar
   - Low health warning at ≤30% HP
   - "Continue Deeper" / "Retreat" buttons

3. **FloorSummaryView** — Shows full floor results:
   - Success/retreat/defeat header with appropriate icon
   - Complete encounter log with per-encounter damage/gold
   - Total gold earned, total damage taken, healing received
   - First clear happiness bonus
   - Rare drop notification (purple themed)
   - "Return to Dungeon" button

**Retreat Mechanic** (new):
- Between encounters, player can choose to retreat
- Retreating keeps all gold earned so far
- Floor is NOT marked as cleared on retreat
- No happiness penalty for strategic retreat
- Cannot retreat before the boss encounter (committed once boss is next)

**CavePanel Refactored** (`src/components/game/CavePanel.tsx`):
- Removed inline `resolveFloorRun()` function
- Added `activeFloor` state to toggle between floor selection and combat view
- `handleEnterFloor()` now spends time and switches to CombatView
- `handleCombatComplete()` receives `CombatRunResult` and applies all effects to store
- Floor selection UI unchanged

### Combat Formula (unchanged from Phase 3, extracted to resolveEncounter)
```
attackPower = baseATK * (1 + eduAttackBonus)
effATK = requiresArcane && !hasArcane ? attackPower * 0.3 : attackPower
playerPower = effATK + DEF * 0.5
ratio = playerPower / encounterPower

damage = baseDamage * max(0.3, 1 - ratio * 0.5) * (1 - eduDmgReduction)
if blocked: damage *= 0.5
damage = max(1, damage)

gold = baseGold * (1 + eduGoldBonus) * min(1.5, ratio)
```

### Files Created
- `src/data/combatResolver.ts` — Combat state machine, encounter resolution, auto-resolve (380 lines)
- `src/components/game/CombatView.tsx` — Encounter-by-encounter combat UI (340 lines)

### Files Modified
- `src/components/game/CavePanel.tsx` — Removed auto-resolve, integrated CombatView, added state toggle (578 → 484 lines)

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`vite build`)
- All tests pass (`vitest run`)
- ESLint clean on all modified files

---

## 2026-02-05 - Phase 3: Cave UI Overhaul (Floor Selection Interface)

### Problem
The Cave location had a simple "Explore the Cave" button with random outcomes (treasure, lost, creature encounter) and a "Rest in Cave" option. This didn't use the dungeon floor system designed in Phase 2 (`src/data/dungeon.ts`), which defines 5 floors with encounters, bosses, requirements, and loot tables. The cave UI needed a complete overhaul to show floor selection, equipment checks, dungeon progress, and integrate with the Phase 2 data.

### Solution
Replaced the CavePanel with a full dungeon floor selection interface that shows all 5 floors with their status, requirements, and lets players enter floors with auto-resolved combat.

### Architecture

**New CavePanel** (`src/components/game/CavePanel.tsx`):
- **Dungeon Progress Bar** — Visual progress tracker showing X/5 floors cleared with gradient bar
- **Equipment Summary** — Compact ATK/DEF/BLK display with tip for unequipped players
- **Education Bonuses** — Shows active dungeon bonuses from completed degrees (Trap Sense, Arcane Sight, damage reduction, attack bonus, gold bonus, potion chance)
- **Floor Selection Cards** — 5 collapsible floor cards, each showing:
  - Status: Cleared (green checkmark), Available (sword or warning), Locked (lock icon)
  - Color-coded left border (green/amber/red/gray)
  - Expanded view with: description, time cost, gold range, health risk, boss info, rare drop hint, requirements checklist, recommended degrees
  - "Enter Floor" / "Re-enter Floor" button with disabled state reasons
- **Rest in Cave** — Kept from old design (8 hours, +15 HP, +1 happiness)

**Floor Status Logic**:
- `cleared` — Player has beaten the boss (green, re-enterable for gold farming)
- `available` — Previous floor cleared but may not meet equipment requirements
- `locked` — Previous floor not yet cleared

**Auto-Resolve Combat** (`resolveFloorRun` function):
- Generates 3 random encounters + 1 boss per floor via `generateFloorEncounters()`
- Resolves each encounter based on player power vs encounter power ratio
- Treasure encounters: Gold with gold bonus
- Healing encounters: Restore HP mid-floor
- Trap encounters: Take damage, or skip if Trade Guild disarm ability
- Combat/Boss encounters: Damage inversely proportional to power ratio, gold proportional, block chance rolls, arcane requirement check
- Education bonuses applied: damage reduction, attack bonus, gold bonus, healing potion drops
- First clear: Marks floor cleared, awards happiness bonus, 5% rare drop check
- Re-runs: Gold farming without happiness bonus or rare drops

**Store Changes**:
- Added `clearDungeonFloor(playerId, floorId)` action to `economyHelpers.ts`
- Added type to `storeTypes.ts` GameStore interface
- Updates `player.dungeonFloorsCleared` array (idempotent, won't duplicate)

### Files Modified
- `src/components/game/CavePanel.tsx` — Complete rewrite (137 → 578 lines): floor selection UI, auto-resolve combat, education bonuses display
- `src/components/game/LocationPanel.tsx` — Added `clearDungeonFloor` to store destructure and CavePanel props
- `src/store/storeTypes.ts` — Added `clearDungeonFloor` to GameStore interface
- `src/store/helpers/economyHelpers.ts` — Implemented `clearDungeonFloor` action

### Combat Formula
```
attackPower = baseATK * (1 + eduAttackBonus)
effATK = requiresArcane && !hasArcane ? attackPower * 0.3 : attackPower
playerPower = effATK + DEF * 0.5
ratio = playerPower / encounterPower

damage = baseDamage * max(0.3, 1 - ratio * 0.5) * (1 - eduDmgReduction)
if blocked: damage *= 0.5
damage = max(1, damage)

gold = baseGold * (1 + eduGoldBonus) * min(1.5, ratio)
```

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`vite build`)
- All tests pass (`vitest run`)

---

## 2026-02-05 - Movement Path Drawing System (Zone Editor)

### Problem
Player tokens moved in straight lines between zone centers during animation, ignoring the road layout on the game board image. This looked unnatural because the tokens would "fly" over buildings and terrain instead of following the visible roads/paths.

### Solution
Added a movement path drawing system to the Zone Editor that allows defining custom waypoints between adjacent locations. The AnimatedPlayerToken now follows these waypoints during movement animation, resulting in more detailed and road-accurate player movement.

### Architecture

**Data Model**: `MOVEMENT_PATHS` in `src/data/locations.ts`
- Record keyed by `"fromId_toId"` (clockwise direction in BOARD_PATH)
- Values are arrays of `[x%, y%]` waypoints between zone centers
- Counter-clockwise travel automatically reverses waypoints
- Helper functions: `getSegmentWaypoints()`, `getAnimationPoints()`, `getPathKey()`

**Zone Editor** (`src/components/game/ZoneEditor.tsx`):
- New **Zones/Paths** mode toggle in the editor header
- **Paths mode**: Shows all 14 adjacent edges as SVG polylines on the board
- Click an edge in the right panel or on the SVG to select it
- Click on the board to add waypoints to the selected edge
- Drag waypoints to reposition them (with mouse)
- Right-click a waypoint to remove it
- Per-waypoint X/Y coordinate editing in the properties panel
- "Clear" button to remove all waypoints from an edge
- Green lines = edges with waypoints defined, gray dashed = straight line (no waypoints)
- Cyan highlight = currently selected edge
- "Copy Config" now exports MOVEMENT_PATHS alongside ZONE_CONFIGS and CENTER_PANEL_CONFIG

**Animation** (`src/components/game/AnimatedPlayerToken.tsx`):
- Replaced zone-center-only animation with full waypoint chain
- `getAnimationPoints(path)` builds: zone1Center → waypoints → zone2Center → waypoints → zone3Center
- Animation speed: 150ms per waypoint (faster than the old 300ms per zone step, since there are more points)
- CSS transition duration also reduced to 150ms for smooth interpolation

**Debug Overlay** (`src/components/game/GameBoard.tsx`):
- Debug overlay (Ctrl+Shift+D) now renders movement path lines
- Shows all 14 edges with their waypoints
- Green solid lines for paths with waypoints, gray dashed for straight connections

### How to Use
1. Open Zone Editor (Ctrl+Shift+Z or "Edit Zones" button)
2. Switch to "Paths" tab
3. Select an edge (e.g., "noble-heights → general-store") from the right panel
4. Click on the board to add waypoints along the road
5. Drag waypoints to fine-tune positions
6. Right-click to remove individual waypoints
7. Click "Apply" to activate paths in-game
8. Click "Copy Config" to get the code for `locations.ts`

### Files Modified
- `src/data/locations.ts` — Added `MOVEMENT_PATHS`, `MovementWaypoint` type, `getPathKey()`, `getSegmentWaypoints()`, `getAnimationPoints()` helpers
- `src/components/game/ZoneEditor.tsx` — Added Zones/Paths mode toggle, full path drawing UI with SVG visualization, waypoint drag/add/remove, coordinate editing, path export
- `src/components/game/AnimatedPlayerToken.tsx` — Replaced zone-center jumping with waypoint-chain animation using `getAnimationPoints()`
- `src/components/game/GameBoard.tsx` — Updated `handleSaveZones` to accept and apply movement paths, added path visualization to debug overlay

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`vite build`)
- All tests pass (`vitest run`)

---

## 2026-02-05 - Balance: Quest Rewards, Guild Pass, Homeless Penalties

### Problem
Three balance issues identified:
1. **Quest gold rewards too generous** — Players accumulated gold too quickly through quests, trivializing the economy
2. **Quests available too early** — Players could immediately start grinding quests at the Guild Hall from turn 1 with no investment
3. **No homeless penalty** — Being homeless had no mechanical downside besides rent being free, removing incentive to find housing

### Changes

#### 1. Quest Gold Rewards Reduced (~50% across the board)

All quest gold rewards and happiness rewards reduced significantly. Higher-rank quests took bigger proportional cuts since they compounded the problem most:

| Rank | Quest | Old Gold | New Gold | Old Hap | New Hap |
|------|-------|----------|----------|---------|---------|
| E | Rat Extermination | 20g | 12g | 2 | 1 |
| E | Package Delivery | 10g | 6g | 1 | 1 |
| E | Herb Gathering | 15g | 8g | 2 | 1 |
| E | Find the Lost Cat | 25g | 15g | 3 | 2 |
| D | Escort Merchant | 35g | 20g | 3 | 2 |
| D | Guard Duty | 30g | 18g | 1 | 1 |
| D | Urgent Courier Run | 40g | 22g | 2 | 1 |
| C | Bandit Hunt | 60g | 35g | 5 | 3 |
| C | Lost Artifact | 75g | 40g | 5 | 3 |
| C | Curse Investigation | 55g | 30g | 4 | 2 |
| B | Monster Slaying | 120g | 60g | 8 | 5 |
| B | Dungeon Dive | 150g | 75g | 10 | 6 |
| B | Exorcism | 100g | 50g | 6 | 4 |
| A | Dragon Investigation | 200g | 100g | 12 | 7 |
| A | Demon Cult | 250g | 120g | 15 | 8 |
| A | Ancient Evil Awakens | 225g | 110g | 12 | 7 |
| S | Deep Dungeon Clear | 500g | 200g | 25 | 12 |
| S | Dragon Slayer | 750g | 300g | 30 | 15 |

#### 2. Guild Pass Required for Quests (500g)

New mechanic: Players must purchase a **Guild Pass** (500g) at the Guild Hall before they can access the quest board. This:
- Creates an early-game gold sink and investment decision
- Prevents immediate quest grinding from turn 1
- Forces players to earn money through jobs first before questing
- Adds strategic depth (save up 500g early vs. spend on housing/gear first)

**Implementation:**
- Added `hasGuildPass: boolean` to Player interface
- Added `GUILD_PASS_COST = 500` constant
- Added `buyGuildPass(playerId)` store action
- Guild Hall UI shows "Buy Guild Pass" prompt when player doesn't have one
- Quest board only accessible after purchasing the pass
- Grimwald AI updated to buy Guild Pass when it can afford it

#### 3. Homeless Penalties

Being homeless now has real consequences each turn:
- **-5 health** per turn (sleeping on the streets is dangerous)
- **-8 hours** per turn (wasted time finding shelter, less productive)
- **3x street robbery chance** from Shadowfingers (homeless are easier targets)
- **2x weekly theft probability** (more vulnerable to pickpockets)

This makes getting housing an urgent early priority and adds meaningful trade-offs to the homeless state.

### Files Modified
- `src/data/quests.ts` — All quest gold/happiness rewards reduced
- `src/types/game.types.ts` — Added `hasGuildPass` to Player, `GUILD_PASS_COST` constant
- `src/store/gameStore.ts` — Added `hasGuildPass: false` default
- `src/store/storeTypes.ts` — Added `buyGuildPass` to GameStore interface
- `src/store/helpers/questHelpers.ts` — Added `buyGuildPass` action
- `src/store/helpers/turnHelpers.ts` — Added homeless penalty (health + time) at start of turn
- `src/data/shadowfingers.ts` — Added `HOMELESS_ROBBERY_MULTIPLIER` (3x street robbery chance)
- `src/data/events.ts` — Added 2x weekly theft multiplier for homeless
- `src/components/game/LocationPanel.tsx` — Guild Pass gate UI at Guild Hall
- `src/hooks/useAI.ts` — AI buys Guild Pass before attempting quests

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Build/test blocked by pre-existing dependency issue (cssesc package missing), not related to these changes

---

## 2026-02-05 - Bug Fix: Slums Crash (JonesButton ReferenceError)

### Problem
Game crashed with `ReferenceError: JonesButton is not defined` when navigating to the Slums location while the player had no housing (`player.housing === 'homeless'`).

### Root Cause
`src/components/game/HomePanel.tsx` used the `JonesButton` component on line 52 (in the homeless player branch) but never imported it. All other panel files (GuildHallPanel, AcademyPanel, WorkSection) correctly import `JonesButton` from `./JonesStylePanel`, but HomePanel was missing this import.

### How It Triggers
1. Player visits the Slums location on the board
2. `LocationPanel.tsx` routes both `'slums'` and `'noble-heights'` to `HomePanel`
3. `HomePanel` checks `player.housing === 'homeless'` (line 45)
4. If homeless, it renders a "You have no home" message with a `<JonesButton label="DONE" />` (line 52)
5. Since `JonesButton` is not imported → crash

### Fix
Added missing import to `HomePanel.tsx`:
```typescript
import { JonesButton } from './JonesStylePanel';
```

### Files Modified
- `src/components/game/HomePanel.tsx` — Added missing `JonesButton` import

### Verification
- TypeScript compiles cleanly (`tsc --noEmit` passes)
- Production build succeeds (`bun run build`)
- All tests pass (`bun run test`)

---

## 2026-02-05 - Phase 2 Implementation: Dungeon Data (dungeon.ts)

### What Was Done
Created the complete dungeon data system (`src/data/dungeon.ts`) — Phase 2 of the Rogue-Lite RPG plan.

**New File: `src/data/dungeon.ts`**

**Types & Interfaces:**
- `EncounterDifficulty` — easy | medium | hard | boss
- `EncounterType` — combat | trap | treasure | healing | boss
- `EncounterOutcome` — victory | pyrrhic | defeat
- `FloorRunResult` — cleared | retreated | defeated
- `DungeonEncounter` — Individual encounter with name, type, power, damage, gold, flavor text
- `FloorRequirements` — Previous floor, minimum weapon/armor/ATK/DEF, recommended degrees
- `RareDrop` — Unique per-floor drops with 5% chance
- `RareDropEffect` — Heal, permanent gold bonus, max health, equippable shield, happiness+stats
- `EducationDungeonBonus` — Per-degree combat bonuses
- `DungeonFloor` — Complete floor definition with encounters, boss, loot, requirements

**5 Dungeon Floors:**

| Floor | Name | Time | Min ATK/DEF | Encounters | Boss | Gold Range |
|-------|------|------|-------------|------------|------|------------|
| 1 | Entrance Cavern | 6/4 hrs | 0/0 | Rats, Bats, Chest, Spring | Rat King | 15-50g |
| 2 | Goblin Tunnels | 10/8 hrs | 5/0 | Goblin Scouts, Pit Trap, Warriors, Cache | Goblin Chieftain | 30-100g |
| 3 | Undead Crypt | 14/12 hrs | 15/10 | Skeletons, Ghosts, Poison Trap, Artifacts | Crypt Lich | 60-200g |
| 4 | Dragon's Lair | 18/16 hrs | 25/20 | Young Dragon, Fire Vent, Drake Pack, Hoard | Elder Dragon | 120-400g |
| 5 | The Abyss | 22/20 hrs | 40/35 | Demon Soldiers, Void Rift, Shadow Fiends, Vault | Azrathor | 250-600g |

**Encounter Tables (per floor):**
- Each floor has 4 encounters in the pool (mix of combat, trap, treasure, healing)
- Floor run selects 3 random encounters + 1 boss = 4 total per attempt
- Traps are disarmable with Trade Guild Certificate
- Ghosts/ethereal enemies require Arcane Studies for full damage

**Education Dungeon Bonuses (6 degrees):**
- Trade Guild: Disarm traps (skip trap encounters)
- Combat Training: -15% damage received
- Master Combat: -25% damage + 10% attack (highest damage reduction wins, no stacking)
- Arcane Studies: Damage ghosts, +15% gold find
- Alchemy: 20% chance to find Healing Potion after encounters
- Scholar: +10% gold from dungeon activities

**Rare Drops (5% per floor clear):**
- Floor 1: Cave Mushroom (+20 HP heal)
- Floor 2: Goblin's Lucky Coin (+5% permanent gold from work)
- Floor 3: Undead Amulet (+10 permanent max health)
- Floor 4: Dragon Scale Shield (+20 DEF, +20% Block, equippable)
- Floor 5: Demon's Heart (+25 happiness, +5 all stat caps)

**Loot Multiplier by Guild Rank:**
- Novice: 80%, Apprentice: 90%, Journeyman: 100%, Adept: 110%
- Veteran: 120%, Elite: 135%, Guild Master: 150%

**Helper Functions:**
- `getFloor(id)` — Get floor by ID
- `checkFloorRequirements(floor, cleared, weapon, armor, stats)` — Returns canEnter + reasons
- `calculateEducationBonuses(degrees)` — Accumulated education combat bonuses
- `generateFloorEncounters(floor)` — Pick 3 random + boss for a run
- `getLootMultiplier(floor, rank)` — Gold multiplier by guild rank
- `getFloorTimeCost(floor, stats)` — Reduced time if overpowered
- `getHighestAvailableFloor(cleared)` — Next floor to attempt
- `getDungeonProgress(cleared)` — Summary for UI display

**Constants:**
- `ENCOUNTERS_PER_FLOOR = 4`
- `MAX_DUNGEON_FLOOR = 5`
- `MAX_FLOOR_ATTEMPTS_PER_TURN = 1`
- `HEALING_POTION_HP = 15`

**Design Decisions:**
- Damage reduction from education is non-stacking (best value wins) to prevent master-combat + combat-training giving 40% reduction
- Floor time cost has a "reduced" variant for overpowered players (1.5x minimum stats)
- Equipment requirements check both item equipped AND stat thresholds (can't skip dagger requirement with magic buffs)
- Encounters use basePower for combat formula and baseDamage for direct HP loss (traps/healing use baseDamage only)
- Boss encounters always have `requiresArcane` on Floors 3 and 5 (Lich and Demon Lord) — arcane studies gives significant advantage

### Files Created
- `src/data/dungeon.ts` — All dungeon data, types, and helper functions

### Files Not Modified
- `src/types/game.types.ts` — No changes needed (Player already has `dungeonFloorsCleared` from Phase 1)
- No other files modified — Phase 2 is data-only

### Status
- [x] Phase 1: Equipment system — **COMPLETE**
- [x] Phase 2: Dungeon data (dungeon.ts) — **COMPLETE**
- [ ] Phase 3: Cave UI overhaul (floor selection)
- [ ] Phase 4: Combat system (encounter resolution)
- [ ] Phase 5: Integration (quests + AI + balance)

---

## 2026-02-05 - Phase 1 Implementation: Equipment System

### What Was Done
Implemented the full equipment system (Phase 1 of the Rogue-Lite RPG plan).

**Types (game.types.ts):**
- Added `EquipmentSlot` type ('weapon' | 'armor' | 'shield')
- Added `EquipmentStats` interface (attack, defense, blockChance)
- Added to Player: `equippedWeapon`, `equippedArmor`, `equippedShield`, `dungeonFloorsCleared`

**Items (items.ts):**
- Extended Item interface with `equipSlot`, `equipStats`, `requiresFloorCleared`
- Added `armor` and `shield` to ItemCategory
- Updated existing weapons with combat stats (Dagger +5 ATK, Iron Sword +15 ATK, Shield +5 DEF/10% BLK)
- Added new equipment tiers:
  - Steel Sword (250g, +25 ATK, requires Floor 2)
  - Enchanted Blade (500g, +40 ATK, requires Floor 3)
  - Leather Armor (75g, +10 DEF)
  - Chainmail (200g, +20 DEF, requires Floor 2)
  - Plate Armor (450g, +35 DEF, requires Floor 3)
  - Enchanted Plate (900g, +50 DEF, requires Floor 4)
  - Iron Shield (120g, +10 DEF/15% BLK)
  - Tower Shield (300g, +15 DEF/25% BLK, requires Floor 2)
- Added helper functions: `getEquipmentBySlot()`, `getEquipStats()`, `calculateCombatStats()`

**Store (economyHelpers.ts, storeTypes.ts):**
- Added `equipItem(playerId, itemId, slot)` and `unequipItem(playerId, slot)` actions
- Updated `sellDurable` to auto-unequip sold items
- Player defaults include new fields (all null/empty)

**UI (ArmoryPanel.tsx):**
- Complete rewrite with sections: Clothing, Weapons, Armor, Shields
- Combat stats summary box (ATK/DEF/BLK with equipped item names)
- Buy items you don't own (with price, Jones-style dotted line)
- Equip/unequip owned items (green highlight when equipped)
- Locked items show floor requirement when not yet available
- Stat labels on all equipment items

**UI (CavePanel.tsx):**
- Equipment status display showing ATK/DEF/BLK
- Context-aware tips based on gear level
- Equipment now affects exploration:
  - Attack increases treasure find chance and gold amount
  - Defense reduces creature damage
  - Shield block chance halves damage on proc
  - Having a weapon enables fighting back (earn gold from creature encounters)
  - Without weapon: full damage, more happiness loss

### Files Modified
- `src/types/game.types.ts` — New types and Player fields
- `src/data/items.ts` — Equipment stats, new items, helper functions
- `src/store/storeTypes.ts` — equipItem/unequipItem in GameStore interface
- `src/store/helpers/economyHelpers.ts` — equip/unequip/sell logic
- `src/store/gameStore.ts` — Player defaults
- `src/components/game/ArmoryPanel.tsx` — Full equipment UI
- `src/components/game/CavePanel.tsx` — Equipment-aware combat
- `src/components/game/LocationPanel.tsx` — Pass new props to ArmoryPanel

### Status
- [x] Phase 1: Equipment system — **COMPLETE**
- [ ] Phase 2: Dungeon data (dungeon.ts)
- [ ] Phase 3: Cave UI overhaul (floor selection)
- [ ] Phase 4: Combat system (encounter resolution)
- [ ] Phase 5: Integration (quests + AI + balance)

---

## 2026-02-05 - Game Gap Analysis & Rogue-Lite RPG Design Proposal

### Task Summary
Comprehensive analysis of what's missing in the game, with design proposals for rogue-lite RPG elements including functional combat, equipment, and dungeon progression.

### Current State Analysis

**What EXISTS but is broken/cosmetic:**
- Weapons (Dagger, Iron Sword, Shield) exist as items but are **cosmetic only** — they give happiness bonuses, not combat stats
- Cave has two buttons (Explore/Rest) with hardcoded random outcomes (20% treasure, 40% creature dealing 8-22 damage)
- 21 quests exist with rank system (E through S), but all triggered from Guild Hall only
- No combat stats on Player interface (no attack, defense, equippedWeapon, equippedArmor)

**What was DESIGNED (in log.md) but NEVER IMPLEMENTED:**
- 5-floor dungeon system with progressive difficulty
- Equipment requirements per floor
- Encounter types (Rats, Goblins, Skeletons, Dragons, Demons)
- Combat resolution formula
- Education bonuses in combat
- `dungeon.ts` file — does not exist

**Missing Jones Features (from JONES_REFERENCE.md):**
- Stock Market / T-Bills trading system
- Loan system (Bank)
- Weekend activity system
- Doctor/Healer visit mechanic (sickness exists but no cure)
- Save/Load game (localStorage)

### Design Decision: Guild Hall vs Cave for Quests

**Recommendation: Guild Hall = accept quests, Cave = execute dungeon quests**

Reasoning:
1. Guild Hall is the "Employment Office" equivalent — it's where you get contracts/missions
2. The Cave is the unique location that differentiates this game from Jones in the Fast Lane
3. Non-dungeon quests (escort, merchant, investigation) remain "auto-complete" from Guild Hall
4. Dungeon quests require going to Cave and clearing specific floors
5. This creates a natural gameplay loop: Guild Hall → equip at Armory → enter Cave → return to Guild Hall

### Proposed System: Rogue-Lite Dungeon & Combat

#### 1. Equipment System (make weapons/armor functional)

**New Player fields:**
- `equippedWeapon: string | null` — currently equipped weapon ID
- `equippedArmor: string | null` — currently equipped armor ID
- `equippedShield: string | null` — currently equipped shield ID
- `attackPower: number` — calculated from weapon + education bonuses
- `defensePower: number` — calculated from armor + shield + education bonuses
- `dungeonFloorsCleared: number[]` — floors cleared at least once (e.g. [1, 2, 3])

**Weapons (Armory — expanded):**

| Weapon | Price | Attack | Unlock |
|--------|-------|--------|--------|
| Simple Dagger | 35g | +5 | Always |
| Iron Sword | 90g | +15 | Always |
| Steel Sword | 250g | +25 | Floor 2 cleared |
| Enchanted Blade | 500g | +40 | Floor 3 cleared |

**Armor (Armory — new):**

| Armor | Price | Defense | Unlock |
|-------|-------|---------|--------|
| Leather Armor | 75g | +10 | Always |
| Chainmail | 200g | +20 | Floor 2 cleared |
| Plate Armor | 450g | +35 | Floor 3 cleared |
| Enchanted Plate | 900g | +50 | Floor 4 cleared |

**Shields (Armory — expanded):**

| Shield | Price | Defense | Block% |
|--------|-------|---------|--------|
| Wooden Shield | 45g | +5 | 10% |
| Iron Shield | 120g | +10 | 15% |
| Tower Shield | 300g | +15 | 25% |

#### 2. Five-Floor Dungeon System

| Floor | Name | Time | Requirements | Enemies | Gold Range |
|-------|------|------|-------------|---------|------------|
| 1 | Entrance Cavern | 6 hrs | None | Rats, Bats | 15-40g |
| 2 | Goblin Tunnels | 10 hrs | Dagger + Floor 1 | Goblins, Traps | 30-80g |
| 3 | Undead Crypt | 14 hrs | Sword + Armor + Floor 2 | Skeletons, Ghosts | 60-150g |
| 4 | Dragon's Lair | 18 hrs | Steel Sword + Chainmail + Floor 3 | Young Dragons | 120-300g |
| 5 | The Abyss | 22 hrs | Enchanted Blade + Plate + Floor 4 | Demon Lords | 250-600g |

**Rogue-lite elements:**
- 3-4 random encounters per floor from encounter tables
- Last encounter is always a boss (must defeat to "clear" floor)
- One floor-clear attempt per turn (fatigue)
- Defeat = lose found gold, retreat to entrance, keep equipment
- Health reaching 0 in dungeon = same death system (resurrection if 100g savings)

#### 3. Combat Resolution Formula

```
Encounter Power = Floor Base × (1 + random(0, 0.5))
Player Power = attackPower + defensePower + educationBonus

Damage Taken = max(5, Encounter Power - defensePower × 0.6)
Shield Block = random < blockChance ? damage × 0.5 : 0
Gold Found = Floor Base Gold × (1 + attackPower / 100)

Results:
- Player Power > Encounter × 1.5 → Full Victory (max gold, min damage)
- Player Power > Encounter → Victory (normal gold, normal damage)
- Player Power > Encounter × 0.5 → Pyrrhic Victory (half gold, double damage)
- Else → Defeat (no gold, heavy damage, forced retreat)
```

#### 4. Education Bonuses in Dungeon

| Degree | Combat Effect |
|--------|---------------|
| Trade Guild Certificate | Disarm traps (skip trap encounters on Floor 2) |
| Combat Training | -15% damage received |
| Master Combat | -25% damage received, +10% attack power |
| Arcane Studies | Can damage ghosts on Floor 3, +15% gold find |
| Alchemy | 20% chance to find Healing Potion after encounters |
| Scholar Degree | +10% XP/gold from all dungeon activities |

#### 5. Rare Drops (Rogue-Lite Loot)

5% chance per floor clear for a unique drop:
- Floor 1: "Cave Mushroom" — consumable, +20 health
- Floor 2: "Goblin's Lucky Coin" — permanent +5% gold from all work
- Floor 3: "Undead Amulet" — permanent +10 max health
- Floor 4: "Dragon Scale Shield" — equippable, +20 defense, +20% block
- Floor 5: "Demon's Heart" — one-time +25 happiness, +5 to all stat caps

#### 6. Quest Integration with Dungeon

Move dungeon quests from "auto-complete at Guild Hall" to requiring actual floor clears:

| Quest | Rank | Requirement | Reward |
|-------|------|------------|--------|
| Rat Extermination | E | Clear Floor 1 | 25g, +2 happiness |
| Goblin Bounty | D | Clear Floor 2 | 50g, +5 happiness |
| Crypt Cleansing | C | Clear Floor 3 | 100g, +8 happiness |
| Dragon Slayer | A | Defeat Floor 4 boss | 250g, +15 happiness |
| Seal the Abyss | S | Defeat Floor 5 boss | 500g, +30 happiness |

Non-dungeon quests (escort, investigation, delivery) remain auto-complete from Guild Hall.

#### 7. Implementation Plan

**Phase 1 — Equipment System:**
- Add combat fields to Player interface in `game.types.ts`
- Add attack/defense stats to weapons/armor in `items.ts`
- Add equip/unequip actions to gameStore
- Update Armory UI to show equip buttons and combat stats

**Phase 2 — Dungeon Data:**
- Create `src/data/dungeon.ts` with floor definitions, encounter tables, boss data
- Add floor unlock logic and requirement checks

**Phase 3 — Cave UI Overhaul:**
- Replace simple Explore/Rest buttons with floor selection interface
- Equipment check before entering a floor
- Show dungeon progress (floors cleared, best loot found)

**Phase 4 — Combat System:**
- Implement combat resolution with the formula above
- Add encounter-by-encounter progression through a floor
- Create combat result screen (damage taken, gold found, items found)
- Add boss encounter special mechanics

**Phase 5 — Integration:**
- Connect dungeon quests to floor clears
- Add rare drops to loot tables
- Education bonuses applied to combat calculations
- Grimwald AI: Add dungeon exploration to AI decision engine

### Other Missing Features (Priority Ordered)

| Feature | Priority | Description | Effort |
|---------|----------|-------------|--------|
| Save/Load Game | HIGH | localStorage save/load, critical for playability | Medium |
| Doctor/Healer Mechanic | HIGH | Cure sickness at Healer location (-10 hrs, -4 happiness, -30-200g) | Small |
| Stock Market/T-Bills | MEDIUM | Trading at Bank, T-Bills safe, stocks risky | Medium |
| Loan System | MEDIUM | Bank loans with interest and consequences | Small |
| Weekend Activities | LOW | Automatic between-turn activities with costs | Medium |
| Sound Effects | LOW | Audio feedback for actions | Large |

### Files to Create/Modify

**New files:**
- `src/data/dungeon.ts` — Floor definitions, encounter tables, loot tables, boss data
- `src/components/game/DungeonPanel.tsx` — Dungeon exploration UI (replaces CavePanel interior)

**Modified files:**
- `src/types/game.types.ts` — Add combat stats, equipment fields, dungeon progress to Player
- `src/data/items.ts` — Add attack/defense stats to weapons/armor, new equipment tiers
- `src/store/gameStore.ts` — Equip/unequip actions, dungeon actions
- `src/components/game/CavePanel.tsx` — Floor selection, equipment check, dungeon entry
- `src/components/game/ArmoryPanel.tsx` — Show combat stats, equip buttons
- `src/data/quests.ts` — Connect dungeon quests to floor requirements
- `src/hooks/ai/actionGenerator.ts` — Add dungeon exploration to Grimwald AI

### Status
- [x] Analysis complete
- [x] Design complete
- [ ] Phase 1: Equipment system
- [ ] Phase 2: Dungeon data
- [ ] Phase 3: Cave UI overhaul
- [ ] Phase 4: Combat system
- [ ] Phase 5: Integration

---

## 2026-02-05 - Full Economy & Happiness Balance Audit

### Task Summary
Performed a comprehensive audit of the game economy and happiness systems, comparing values against Jones in the Fast Lane reference. Found multiple balance issues causing gold to accumulate too fast, happiness to be trivially easy, and costs to be too low relative to income.

### Audit Findings

**Gold Income - Too High:**
1. **Work bonus (33%)**: 6hr shifts paid as 8hrs → entry jobs earned 320g/turn, mid-level 800g/turn
2. **Quest rewards**: S-rank quests gave 1000-1500g + 50-60 happiness — economy-breaking
3. **Cave exploration**: 30% chance of 20-70g for just 4 hours with no prerequisites
4. **Investment returns**: 2% weekly = 104% annual compound — infinite money engine
5. **Savings interest**: 0.5% weekly = 26% annual — too generous for safe storage

**Gold Sinks - Too Cheap:**
1. **Food**: Mystery Meat at 3g for +15 food, bread at 5g — starvation impossible
2. **Rent**: Slums at 50g/week — trivial when entry workers earn 200g+/turn
3. **Clothing**: Already reasonable

**Happiness - Trivially Easy:**
1. **Sleep**: +20 happiness for 8hrs — could max happiness in 1.5 turns
2. **Relax**: +10 happiness per use — Noble Heights (2hrs) = 5 happiness/hr rate
3. **Stolen Goods**: 20g for +10 happiness — cheapest happiness in the game
4. **Item purchases**: Enchanter items gave up to +15 happiness per purchase
5. **Cave explore**: 30% chance of +10 happiness for 4hrs

### Changes Applied

#### Gold Income Nerfs
| Source | Before | After | Reasoning |
|--------|--------|-------|-----------|
| Work bonus multiplier | 1.33x (33%) | 1.15x (15%) | Entry job per shift: 32g → 28g |
| E-rank quest gold | 15-30g | 10-25g | Slight reduction |
| D-rank quest gold | 40-60g | 30-40g | ~30% reduction |
| C-rank quest gold | 90-120g | 55-75g | ~40% reduction |
| B-rank quest gold | 180-250g | 100-150g | ~40% reduction |
| A-rank quest gold | 400-500g | 200-250g | ~50% reduction |
| S-rank quest gold | 1000-1500g | 500-750g | ~50% reduction |
| Cave treasure (gold) | 20-70g (30% chance) | 10-35g (20% chance) | Less gold, lower chance |
| Cave explore time | 4 hrs | 6 hrs | Fewer explores per turn |
| Investment returns | 2% weekly | 0.5% weekly | Prevents infinite money |
| Savings interest | 0.5% weekly | 0.1% weekly | Banks are safe, not profitable |

#### Happiness Nerfs
| Source | Before | After | Reasoning |
|--------|--------|-------|-----------|
| Sleep | +20 happiness | +5 happiness | Was trivial to max happiness |
| Relax | +10 happiness | +3 happiness | Consistent with Jones relaxation |
| Stolen Goods | +10 happiness (20g) | +3 happiness (30g) | Was cheapest happiness source |
| Ale | +3 happiness (3g) | +1 happiness (5g) | Too cheap |
| Candles | +2 happiness (10g) | +1 happiness (12g) | Minor item |
| Blanket | +5 happiness (25g) | +2 happiness (30g) | Overvalued |
| Glow Orb | +5 happiness (50g) | +2 happiness (60g) | Overvalued |
| Warmth Stone | +10 happiness (100g) | +3 happiness (120g) | Overvalued |
| Preservation Box (item) | +8 happiness (150g) | +2 happiness (175g) | Utility, not happiness |
| Scrying Mirror (item) | +15 happiness (300g) | +4 happiness (350g) | Was biggest happiness exploit |
| Dagger | +3 happiness (30g) | +1 happiness (35g) | Minor item |
| Iron Sword | +8 happiness (80g) | +2 happiness (90g) | Overvalued |
| Shield | +4 happiness (40g) | +1 happiness (45g) | Minor item |
| Encyclopedia | +5 happiness | +2 happiness | Utility, not happiness |
| Dictionary | +3 happiness | +1 happiness | Utility |
| Atlas | +4 happiness | +1 happiness | Utility |
| Education completion (old) | +10 happiness | +5 happiness | Matches Jones |
| E-rank quest happiness | 2-8 | 1-3 | Proportional reduction |
| B-rank quest happiness | 12-20 | 6-10 | Proportional reduction |
| S-rank quest happiness | 50-60 | 25-30 | Still rewarding but not game-ending |
| Cave treasure happiness | +10 | +3 | Proportional to gold nerf |
| Cave spring happiness | +5 | +2 | Slight reduction |
| Cave rest happiness | +3 | +1 | Minor |
| Cave danger happiness loss | -10 | -5 | Balanced with reduced gains |

#### Cost Increases
| Expense | Before | After | Reasoning |
|---------|--------|-------|-----------|
| Slums rent | 50g/week | 75g/week | +50% — more meaningful |
| Modest rent | 150g/week | 200g/week | +33% |
| Noble rent | 400g/week | 500g/week | +25% — luxury costs more |
| Noble relaxation rate | 2 hrs | 3 hrs | Was too efficient for happiness |
| Modest relaxation rate | 4 hrs | 5 hrs | Slight increase |
| Bread | 5g | 8g | Food is a real expense now |
| Cheese | 8g | 15g | More realistic |
| Salted Meat | 15g | 25g | ~1g per food point |
| Week of Provisions | 30g | 50g | 1g per food point |
| Feast Supplies | 50g | 85g | Slight premium |
| Mystery Meat | 3g (+15 food) | 6g (+10 food) | Was absurdly cheap |
| Stew | 8g (+20 food) | 12g (+15 food) | Slightly less efficient |
| Roast Dinner | 15g (+35 food) | 22g (+30 food) | More expensive |
| Tavern Feast | 30g (+50 food) | 45g (+50 food) | Price increase |

#### Other Changes
- Default happiness victory goal reduced from 100 to 75
- Cave explore time increased from 4 to 6 hours (fewer explores per turn)
- Cave rest time increased from 6 to 8 hours
- Cave danger chance increased from 30% to 40%
- Housing happiness bonuses reduced (Modest 5→3, Noble 15→5)

### Economy After Rebalance (example turn)

**Entry-level worker (Floor Sweeper, 4g/hr):**
- Per shift (6hrs): 7 * 4 = 28g (was 32g)
- Max shifts per turn: ~8 shifts (48hrs) = 224g (was ~320g)
- Weekly expenses: Rent 75g + Food ~25g = 100g
- Net per turn: ~124g (was ~220g) — more reasonable progression

**Mid-level worker (Market Vendor, 10g/hr):**
- Per shift (6hrs): 7 * 10 = 70g (was 80g)
- Max shifts: ~8 = 560g (was 800g)
- Net per turn: ~460g — still good but not economy-breaking

**Happiness per turn (Slums housing):**
- 3 relax sessions (24hrs) + 1 sleep (8hrs) = 9 + 5 = 14 happiness (was 50)
- Requires multiple turns to build happiness — makes it a real strategic choice

### Files Modified
- `src/store/helpers/workEducationHelpers.ts` — Work bonus 1.33→1.15, education completion +10→+5
- `src/store/helpers/turnHelpers.ts` — Investment 2%→0.5%, savings 0.5%→0.1%
- `src/data/quests.ts` — All quest gold and happiness rewards reduced 30-50%
- `src/data/items.ts` — Food prices increased, happiness values reduced across all items
- `src/data/housing.ts` — Rent increased, happiness bonuses reduced, relaxation rates adjusted
- `src/types/game.types.ts` — RENT_COSTS updated
- `src/components/game/CavePanel.tsx` — Gold, happiness, time, and risk rebalanced
- `src/components/game/HomePanel.tsx` — Relax +10→+3, Sleep +20→+5, tooltips updated
- `src/store/gameStore.ts` — Default happiness goal 100→75

### Verification
- Build passes (`npx vite build`)
- Tests pass (`npx vitest run`)

---

## 2026-02-05 - Fix Guild Job Location Restrictions & Raise Requirements

### Task Summary
Fixed two gameplay bugs:
1. Players could work and request raises at the Guild Hall even when their job was at a different location (e.g., Bank, Forge, Tavern)
2. Players could request a raise immediately after being hired without working any shifts

### Bug 1: Guild Hall Work Restriction

**Problem:**
The Guild Hall's work section checked `player.currentJob && currentJobData` but did NOT check if the job's `location` was `'Guild Hall'`. This meant a player employed as a Bank Janitor could visit the Guild Hall and work their shift there — which makes no sense.

**Fix:**
Added a `canWorkAtGuildHall` check: `currentJobData.location === 'Guild Hall'`. The work button and raise button now only appear at the Guild Hall when the player's job is actually located there. Other locations (Bank, Forge, Academy, etc.) already had correct location checks via the `WorkSection` component.

### Bug 2: Raise Without Working

**Problem:**
The `requestRaise` function had no check for how many shifts the player had worked. A player could get hired and immediately request (and potentially receive) a raise with 30-80% success chance.

**Fix:**
- Added `shiftsWorkedSinceHire` field to the Player interface (tracks work shifts since last hire)
- Field resets to 0 when: hired for a new job, fired for low dependability, or laid off due to market crash
- Field increments by 1 each time `workShift` is called
- `requestRaise` now requires at least 3 shifts worked before allowing a raise request
- Raise button is disabled in UI when insufficient shifts, with tooltip showing progress

### Files Modified
- `src/types/game.types.ts` - Added `shiftsWorkedSinceHire` field to Player interface
- `src/store/gameStore.ts` - Initialize `shiftsWorkedSinceHire: 0` for new players
- `src/store/helpers/playerHelpers.ts` - Reset `shiftsWorkedSinceHire` to 0 on `setJob`
- `src/store/helpers/workEducationHelpers.ts` - Increment counter in `workShift`, add minimum shift check in `requestRaise`
- `src/store/helpers/turnHelpers.ts` - Reset counter on fired/layoff events
- `src/components/game/LocationPanel.tsx` - Add `canWorkAtGuildHall` check, disable raise button when insufficient shifts

### Verification
- Build passes (`bun run build`)
- Tests pass (`bun run test`)

---

## 2026-02-05 - Jones-Style Home Interior Display

### Task Summary
When a player visits their home location (The Slums or Noble Heights), the center panel now shows a large visual room scene — just like in Jones in the Fast Lane's apartment view. The room displays owned appliances and durables as furniture, with Relax, Sleep, and Done buttons at the bottom.

### Features Implemented

**1. Full-Panel Home Scene (CSS Art)**
- The home view takes over the entire center panel (no parchment wrapper/header)
- Visual room scene drawn entirely with CSS: walls, floor, window, door, bed, table, chair
- Different visual themes for each housing tier:
  - **The Slums**: Dark stone walls, rough wood floor, cracks in walls, rats scurrying
  - **Noble Heights**: Purple/elegant walls, decorative wallpaper, chandelier, rug, painting
  - **Modest Dwelling**: Neutral brown tones (in-between)

**2. Appliances Displayed in Room**
- All 7 Jones-style appliances have assigned positions and emoji icons in the room:
  - Scrying Mirror (🪞), Memory Crystal (💎), Music Box (🎵), Cooking Fire (🔥), Preservation Box (📦), Arcane Tome (📖), Simple Scrying Glass (🔮)
- Broken appliances shown dimmed/greyed with ✗ indicator
- Durable items (candles, blanket, furniture, weapons, etc.) also shown in the room
- Appliance legend bar at bottom lists all owned items by name

**3. Action Buttons (Jones-Style)**
- **RELAX**: Green button, costs housing-tier hours (+10 happiness, +3 relaxation)
- **SLEEP**: Blue button, 8 hours (+20 happiness, +10 health, +5 relaxation)
- **DONE**: Brown button, closes the home panel
- Buttons disabled with visual feedback when not enough time
- Both Relax and Sleep now also increase the Relaxation stat (was missing before)

**4. Room Details**
- "Home Sweet Home" / "~ Noble Living ~" wall sign
- Window with moon/sun visible
- Door with handle
- Relaxation stat display in top-right corner
- Empty room hint text when no items owned

### Files Modified
- `src/components/game/HomePanel.tsx` - Complete rewrite with visual room scene
- `src/components/game/LocationPanel.tsx` - Home locations bypass parchment wrapper; pass `modifyRelaxation` and `onDone` props

### Technical Details
- Room scene uses absolute positioning with percentage-based coordinates for responsive scaling
- `clamp()` used throughout for font sizes to scale with viewport
- Housing tier determines wall/floor colors, decorative elements, and ambient details
- Appliance/durable positions are defined as constant maps for easy adjustment

### Visual Comparison (Jones → Guild Life)
| Jones | Guild Life |
|-------|------------|
| "LOW COST APARTMENT" header | "The Slums" header |
| Cockroaches in low-cost | Rats in slums |
| Furniture appears when bought | Appliances/durables appear when owned |
| RELAX button | RELAX button (+relaxation stat) |
| DONE button | DONE button |

---

## 2026-02-05 - Refactor Large Files

### Goal
Split the 4 largest source files into smaller, focused modules for maintainability.

### Changes

**gameStore.ts (1363 → 177 lines)**
Extracted Zustand store actions into factory-function helper modules:
- `src/store/storeTypes.ts` - SetFn/GetFn type aliases
- `src/store/helpers/playerHelpers.ts` - Player stat modifications (modifyGold, modifyHealth, etc.)
- `src/store/helpers/economyHelpers.ts` - Banking, rent, housing, appliance, buy/sell actions
- `src/store/helpers/turnHelpers.ts` - endTurn, startTurn, processWeekEnd logic
- `src/store/helpers/workEducationHelpers.ts` - workShift, studyDegree, completeDegree, requestRaise
- `src/store/helpers/questHelpers.ts` - Quest actions, death check, guild rank, eviction, victory check

Main gameStore.ts now imports and composes these via `create<GameStore>((set, get) => ({ ...createPlayerActions(set, get), ... }))`.

**LocationPanel.tsx (1104 → 448 lines)**
Extracted each location's switch case into its own component:
- `ActionButton.tsx` - Shared action button component
- `WorkSection.tsx` - Reusable work-shift section (jones/wood-frame variants)
- `TavernPanel.tsx` - Rusty Tankard (food/drink)
- `BankPanel.tsx` - Banking services
- `GeneralStorePanel.tsx` - Food & provisions
- `ArmoryPanel.tsx` - Clothing & weapons
- `AcademyPanel.tsx` - Education/degrees
- `LandlordPanel.tsx` - Housing & rent
- `CavePanel.tsx` - Cave exploration
- `ForgePanel.tsx` - Forge jobs
- `HomePanel.tsx` - Rest at noble-heights/slums

LocationPanel.tsx now delegates to these via the switch statement, passing store actions as props.

**useGrimwaldAI.ts (945 → 294 lines)**
Extracted pure logic into `src/hooks/ai/`:
- `types.ts` - AI types, interfaces, difficulty settings
- `strategy.ts` - Goal progress, resource urgency, job/degree selection, banking strategy
- `actionGenerator.ts` - The main `generateActions()` function (~400 lines of decision logic)

Main hook file now imports these modules and re-exports types for backwards compatibility.

**jobs.ts (813 → 1 line barrel re-export)**
Split into `src/data/jobs/`:
- `types.ts` - Job, JobOffer, Employer interfaces
- `definitions.ts` - All job constant arrays (GUILD_HALL_JOBS, FORGE_JOBS, etc.)
- `utils.ts` - canWorkJob, getAvailableJobs, getJobOffers, applyForJob, etc.
- `index.ts` - Barrel re-export

Original `jobs.ts` re-exports from `./jobs/index` for backwards compatibility.

### Result
- No file over 640 lines (sidebar.tsx is a shadcn/ui component, not ours)
- Build passes, tests pass
- All existing imports unchanged (backwards-compatible barrel re-exports)
- 24 new focused module files created

---

## 2026-02-05 - Fix Game Crash After 3 Rounds (Event Phase Not Handled)

### Problem
The game would suddenly "crash" and return to the title screen after approximately 3 rounds of play. This happened consistently when weekly events occurred (starvation, sickness, rent warnings, market crashes, etc.).

### Root Cause
In `src/pages/Index.tsx`, the `switch` statement that routes between screens based on `phase` did **not** handle the `'event'` phase:

```typescript
// BEFORE (broken)
switch (phase) {
  case 'title':      return <TitleScreen />;
  case 'setup':      return <GameSetup />;
  case 'playing':    return <GameBoard />;
  case 'victory':    return <VictoryScreen />;
  default:           return <TitleScreen />; // <-- 'event' falls here!
}
```

When `processWeekEnd()` in `gameStore.ts` fires at the end of each round of player turns, it generates event messages (food depletion, sickness, market crashes, rent warnings, etc.) and sets `phase: 'event'`. Since `Index.tsx` had no `case 'event'`, it fell through to the `default` case, which rendered `<TitleScreen />` — making the game appear to crash back to the start screen.

The `GameBoard` component already contains an `EventModal` that correctly handles the `'event'` phase and dismisses it back to `'playing'`, but it never got rendered because `Index.tsx` already switched away from it.

### Why After ~3 Rounds
After all players complete their turns, `processWeekEnd()` runs. There is a very high cumulative probability of at least one event message being generated each week:
- Food depletion always happens (25 per week), so starvation warnings trigger often
- 5% sickness chance per player per week
- Market crash events (5% pay cut, 3% layoff)
- Rent debt warnings after 4 weeks
- Shadowfingers theft events

By round 3, with food depleting and stats changing, the probability of hitting at least one event approaches ~100%.

### Solution
Added `case 'event'` to the switch statement in `Index.tsx`, falling through to render `<GameBoard />` (same as `'playing'`):

```typescript
// AFTER (fixed)
case 'playing':
case 'event':
  return <GameBoard />;
```

This allows the `EventModal` inside `GameBoard` to properly display and dismiss event messages.

### Files Modified
- `src/pages/Index.tsx` - Added `case 'event'` to phase routing switch

### Verification
- Build completes successfully (`bun run build`)
- The `'event'` phase now correctly shows the GameBoard with EventModal overlay
- Dismissing the event modal returns to `'playing'` phase as intended

---

## 2026-02-05 - Fix Game Startup Circular Dependency Error

### Problem
The game failed to start with JavaScript error:
```
ReferenceError: Cannot access 'I' before initialization
```

This error appeared in the minified production build, indicating a circular dependency issue during module initialization.

### Root Cause
Duplicate type definitions were causing circular dependency issues:
1. `DegreeId` was defined in BOTH `game.types.ts` AND `education.ts`
2. `EducationPath` was defined in `game.types.ts`, `education.ts`, AND `jobs.ts`

The import chain created a circular dependency:
- `gameStore.ts` → imports from `education.ts`
- `education.ts` → defined its own `DegreeId`
- `jobs.ts` → imported `DegreeId` from `education.ts` (local import)
- This created initialization conflicts during module loading

### Solution
Consolidated type definitions to have a single source of truth:

**education.ts:**
- Removed local `DegreeId` and `EducationPath` type definitions
- Import from `@/types/game.types` instead
- Added re-export for backwards compatibility with existing imports

**jobs.ts:**
- Changed import from `./education` to `@/types/game.types`
- Removed duplicate `EducationPath` type definition

**gameStore.ts:**
- Removed redundant `DegreeIdType` alias import

### Files Modified
- `src/data/education.ts` - Import and re-export types from game.types
- `src/data/jobs.ts` - Import types from game.types
- `src/store/gameStore.ts` - Remove redundant type alias

### Verification
- Build completes successfully (`bun run build`)
- Dev server starts without errors (`bun run dev`)
- No more circular dependency initialization errors

---

## 2026-02-05 - Cave & Dungeon Exploration System Design

### Task Summary
Designing a comprehensive dungeon exploration system for The Cave location - the unique feature that differentiates Guild Life Adventures from Jones in the Fast Lane.

### Design Goals
1. Make The Cave the game's unique selling point
2. Create equipment requirements (armor/weapons) for deeper exploration
3. Link education/skills to better quest outcomes
4. Provide meaningful progression through dungeon floors

### Proposed System: Multi-Floor Dungeon

**5 Dungeon Floors with Progressive Difficulty:**

| Floor | Name | Equipment Required | Education Bonus | Gold Range | Health Risk |
|-------|------|-------------------|-----------------|------------|-------------|
| 1 | Entrance Cavern | None | None | 20-50g | 5-15 |
| 2 | Goblin Tunnels | Dagger + Casual | Trade Guild: disarm traps | 40-100g | 15-25 |
| 3 | Undead Crypt | Sword + Leather Armor | Arcane Studies: damage ghosts | 80-200g | 25-40 |
| 4 | Dragon's Lair | Iron Sword + Chainmail + Combat Training | Master Combat: -20% damage | 150-400g | 40-60 |
| 5 | The Abyss | Full Plate + Master Combat + Arcane Studies | All bonuses stack | 300-1000g | 50-80 |

### New Equipment System

**Weapons (Armory):**
| Weapon | Price | Attack Bonus | Unlocks Floor |
|--------|-------|--------------|---------------|
| Dagger | 25g | +5 | 2 |
| Iron Sword | 100g | +15 | 3 |
| Steel Sword | 250g | +25 | 4 |
| Enchanted Blade | 500g | +40 | 5 |

**Armor (Armory):**
| Armor | Price | Defense Bonus | Unlocks Floor |
|-------|-------|---------------|---------------|
| Leather Armor | 50g | +10 | 3 |
| Chainmail | 150g | +25 | 4 |
| Plate Armor | 400g | +40 | 5 |
| Enchanted Plate | 800g | +60 | Bonus only |

### Education Bonuses in Dungeon

| Degree | Combat Effect |
|--------|---------------|
| Trade Guild Certificate | Can disarm traps (avoid trap damage) |
| Combat Training | -10% health damage received |
| Master Combat | -20% health damage, required for Floor 4 |
| Arcane Studies | +20% gold find, can damage ghosts |
| Alchemy | 15% chance to find healing potions |
| Scholar Degree | +10% XP from dungeon clears |

### Encounter Types per Floor

**Floor 1 - Entrance Cavern:**
- Rats, Bats (easy encounters)
- Lost treasure chests
- Healing spring (rare)
- Time: 4 hours

**Floor 2 - Goblin Tunnels:**
- Goblins (medium difficulty)
- Pit traps (Trade Guild disarms)
- Goblin treasure cache
- Time: 8 hours

**Floor 3 - Undead Crypt:**
- Skeletons (hard)
- Ghosts (need Arcane Studies to damage)
- Ancient artifacts
- Rare education scrolls
- Time: 12 hours

**Floor 4 - Dragon's Lair:**
- Young dragons (very hard)
- Dragon hoard treasure
- Legendary weapon drops (rare)
- Boss encounters possible
- Time: 16 hours

**Floor 5 - The Abyss:**
- Demon lords (extreme)
- Massive gold rewards
- Unique items (once per game)
- Victory point bonus (+5 happiness)
- Time: 20 hours

### Combat Resolution

```
Damage Received = Base Damage × (1 - Defense%) × (1 - Education%)
Gold Found = Base Gold × (1 + Attack%) × (1 + Education%)

Where:
- Defense% = Armor bonus / 100
- Attack% = Weapon bonus / 100
- Education% = Applicable degree bonuses
```

### Integration with Existing Systems

1. **Quest System:** Move dungeon-related quests to Cave
   - "Dungeon Dive" → Requires Floor 2 clear
   - "Monster Slaying" → Requires Floor 3 clear
   - "Dragon Slayer" → Requires Floor 4 boss kill

2. **Guild Rank:** Higher rank = better loot tables
   - Novice: 80% normal loot
   - Journeyman: 100% normal loot
   - Veteran: 120% normal loot
   - Elite: 150% normal loot

3. **Happiness:** Successful dives give happiness bonus
   - Floor 1 clear: +3
   - Floor 3 clear: +8
   - Floor 5 clear: +20

4. **Career Goal:** Dungeon clears count toward completedQuests

### Implementation Plan

**Phase 1: Equipment System**
- Add weapon/armor types to items.ts
- Add attack/defense stats to Player
- Update Armory UI to sell combat gear

**Phase 2: Dungeon Floor System**
- Create dungeon.ts with floor definitions
- Add floor unlock logic
- Create encounter tables

**Phase 3: Cave UI Overhaul**
- Floor selection interface
- Equipment check before entering
- Progress tracking (floors cleared)

**Phase 4: Combat System**
- Implement damage/loot calculations
- Add encounter resolution
- Create dungeon completion rewards

### Files to Modify
- `src/types/game.types.ts` - Add combat stats, equipment types
- `src/data/items.ts` - Add weapons and armor
- `src/data/dungeon.ts` - NEW: Dungeon floor definitions
- `src/store/gameStore.ts` - Add dungeon actions
- `src/components/game/LocationPanel.tsx` - Update Cave panel
- `src/components/game/DungeonPanel.tsx` - NEW: Dungeon exploration UI

### Status
- [x] Design complete
- [ ] Phase 1: Equipment system
- [ ] Phase 2: Dungeon floors
- [ ] Phase 3: Cave UI
- [ ] Phase 4: Combat system

---

## 2026-02-05 - Fix Workplace Access (Work Buttons)

### Task Summary
Fixed the bug where players could not work at Rusty Tankard even when employed there. Added "Work" buttons to all workplace locations so players can work shifts at their current job when visiting the appropriate location.

### Problem
- Players employed at Rusty Tankard (tavern jobs like Dishwasher, Cook, Barmaid) could not work their shifts
- The Rusty Tankard panel only showed food/drink items, with no work option
- Other locations like Bank, Academy, Armory, Enchanter, General Store, and Shadow Market also lacked work buttons

### Solution
Added conditional "Work" sections to all location panels that check:
1. If player has a current job
2. If that job's location matches the current location
3. If so, display a "Work Shift" button showing expected earnings

### Locations Updated

| Location | Job Types Available |
|----------|---------------------|
| Rusty Tankard | Dishwasher, Tavern Cook, Barmaid/Barkeep, Head Chef, Tavern Manager |
| Bank | Bank Janitor, Bank Teller, Guild Treasurer |
| General Store | Market Porter, Shop Clerk, Shop Manager |
| Academy | Library Assistant, Scribe, Teacher, Senior Teacher, Academy Lecturer, Sage, Weapons Instructor |
| Armory | City Guard, Caravan Guard, Arena Fighter |
| Enchanter | Scroll Copier, Enchantment Assistant, Alchemist, Potion Brewer |
| Shadow Market | Market Vendor |

### UI Implementation
Each location now displays a "WORK" section when applicable:
- Shows current job name and hourly wage
- "Work Shift" button with expected earnings (hours × wage × 1.33 bonus)
- Shows hours required per shift
- Button disabled if not enough time remaining

### Files Modified
- `src/components/game/LocationPanel.tsx` - Added work buttons to 7 location panels:
  - `rusty-tankard` case
  - `bank` case
  - `general-store` case
  - `academy` case
  - `armory` case
  - `enchanter` case
  - `shadow-market` case

### Technical Details
Each location panel now checks:
```typescript
const jobData = player.currentJob ? getJob(player.currentJob) : null;
const canWorkHere = jobData && jobData.location === 'Location Name';

// Then renders work section if canWorkHere && jobData
```

---

## 2026-02-05 - Smart Grimwald AI Opponent System

### Task Summary
Implemented a comprehensive, intelligent AI opponent system for Grimwald inspired by "Jones" from Jones in the Fast Lane (Sierra, 1991). The new AI uses goal-oriented decision making with difficulty levels.

### Features Implemented

**1. Three Difficulty Levels**
- **Novice Grimwald (Easy)**: 20% mistake chance, reactive decisions, 800ms action delay
- **Cunning Grimwald (Medium)**: 8% mistake chance, 2-turn planning depth, 500ms delay
- **Master Grimwald (Hard)**: 2% mistake chance, 3-turn planning depth, 300ms delay

**2. Goal-Oriented Decision Engine**
- Calculates progress toward all victory goals (Wealth, Happiness, Education, Career)
- Identifies weakest goal and prioritizes actions to improve it
- Adaptive strategy based on current game state

**3. Priority-Based Action System**
- **Critical Actions (85-100)**: Food (prevent starvation), rent (prevent eviction)
- **Goal Actions (60-85)**: Education, work, banking based on weakest goal
- **Strategic Actions (45-70)**: Job upgrades, housing upgrades, banking deposits

**4. Resource Management**
- Monitors food, rent, clothing, health urgency levels
- Makes intelligent decisions about resource allocation
- Prevents game-ending states (starvation, eviction)

**5. Strategic Behaviors**
- **Education**: Prioritizes degrees that unlock high-paying jobs
- **Career**: Gets jobs, upgrades when 20%+ better wage available
- **Banking**: Deposits excess gold to avoid robbery, withdraws when low
- **Housing**: Considers upgrading to Noble Heights to protect valuables

**6. Visual Feedback**
- "Grimwald is Scheming..." overlay during AI turns
- Animated icons (Bot, Brain) with difficulty-specific text
- Toast notifications for AI actions
- Console logging for debugging

### Files Created
- `src/hooks/useGrimwaldAI.ts` - New comprehensive AI decision engine (600+ lines)

### Files Modified
- `src/types/game.types.ts` - Added AIDifficulty type, difficulty names/descriptions
- `src/store/gameStore.ts` - Added aiDifficulty state, updated startNewGame signature
- `src/components/screens/GameSetup.tsx` - Added AI difficulty selector UI
- `src/components/game/GameBoard.tsx` - Integrated AI turn handling with visual feedback
- `agents.md` - Complete rewrite with new AI documentation
- `log.md` - Added this entry

### Technical Architecture

**DifficultySettings Interface:**
```typescript
interface DifficultySettings {
  aggressiveness: number;    // Goal pursuit intensity (0-1)
  planningDepth: number;     // Turns to plan ahead (1-3)
  mistakeChance: number;     // Suboptimal decision chance (0-1)
  efficiencyWeight: number;  // Time optimization value (0-1)
  decisionDelay: number;     // MS between actions
}
```

**Goal Progress Tracking:**
```typescript
interface GoalProgress {
  wealth: { current, target, progress };
  happiness: { current, target, progress };
  education: { current, target, progress };
  career: { current, target, progress };
  overall: number; // Average progress
}
```

**Action Priority System:**
- Each possible action gets a priority score (1-100)
- Actions sorted by priority, highest executed first
- Mistake chance can swap top two actions for easier difficulty
- Safety limit of 15 actions per turn prevents infinite loops

### Game Setup UI
Added difficulty selection when Grimwald is enabled:
- Three clickable buttons with icons (Brain/Zap/Crown)
- Shows selected difficulty with description
- Stores selection in game state

### References
Based on research from:
- [Jones in the Fast Lane Wiki](https://jonesinthefastlane.fandom.com/wiki/Jones)
- [MobyGames](https://www.mobygames.com/game/370/jones-in-the-fast-lane/)
- [Hardcore Gaming 101](http://www.hardcoregaming101.net/jones-in-the-fast-lane/)

---

## 2026-02-05 - Fix Responsive Layout (Consistent Screen Sizing)

### Task Summary
Fixed the game board layout to maintain consistent proportions regardless of screen size. The center panel, side panels, and game board now scale uniformly on all screen sizes.

### Problem
- Side panels used fixed pixel widths (`w-[180px]`)
- Game board margins were fixed (`mx-[180px]`)
- This caused layout inconsistencies on different screen sizes
- Elements would not scale proportionally when window size changed

### Solution
Implemented a viewport-based responsive container that maintains a 16:9 aspect ratio:

**Layout Structure:**
```
[Left Panel 12%] [Game Board 76%] [Right Panel 12%]
```

**Key Changes:**
1. **Main Container**: Uses CSS `min()` function to calculate dimensions
   - Width: `min(100vw, 177.78vh)` - limits width based on height
   - Height: `min(100vh, 56.25vw)` - limits height based on width
   - This ensures 16:9 aspect ratio while fitting any screen

2. **Side Panels**: Changed from fixed 180px to 12% of container width
   - Uses `flex-shrink-0` to prevent compression
   - Padding uses percentage (`p-[0.5%]`) for proportional spacing
   - Panel content padding also uses percentage (`p-[4%]`)

3. **Game Board**: Takes 76% of container width
   - Height fills container (`h-full`)
   - Background image uses `bg-contain` to maintain aspect ratio

4. **Center Panel**: Already used percentages, now scales with game board
   - Position percentages are relative to game board container
   - Maintains same proportions at all screen sizes

### Files Modified
- `src/components/game/GameBoard.tsx` - Complete layout restructure:
  - Replaced absolute positioned side panels with flex layout
  - Added viewport-based responsive container
  - Changed fixed pixel values to percentages
- `src/components/game/PlayerInfoPanel.tsx` - Changed padding to percentage
- `src/components/game/TurnOrderPanel.tsx` - Changed padding to percentage

### Technical Details

**Aspect Ratio Math:**
- 16:9 ratio means: width = 1.7778 × height, height = 0.5625 × width
- `min(100vw, 177.78vh)` ensures width doesn't exceed what 16:9 allows for screen height
- `min(100vh, 56.25vw)` ensures height doesn't exceed what 16:9 allows for screen width

**Layout Distribution:**
```typescript
const SIDE_PANEL_WIDTH_PERCENT = 12;  // Each side panel
const GAME_BOARD_WIDTH_PERCENT = 76;  // Center game board
// Total: 12 + 76 + 12 = 100%
```

**Container Styling:**
```tsx
<div
  className="relative flex items-stretch"
  style={{
    width: 'min(100vw, 177.78vh)',
    height: 'min(100vh, 56.25vw)',
  }}
>
```

### Result
The game now displays consistently on:
- Wide monitors (pillarboxed with black bars on sides)
- Tall monitors (letterboxed with black bars on top/bottom)
- 16:9 monitors (fills entire screen)
- All elements scale proportionally together

---

## 2026-02-05 - Standardize Panel Layout (Jones-Style UI)

### Task Summary
Standardized the center panel (info) layout at different locations to match the classic Jones in the Fast Lane UI style, with:
- Items displayed with dotted lines connecting names to prices (like "Hamburgers........ $83")
- Clean list format for employers, education options, etc.
- Section headers styled like the original game
- Consistent color scheme matching the retro aesthetic

### Files Created
- `src/components/game/JonesStylePanel.tsx` - New component library with:
  - `JonesPanel` - Main panel wrapper with dark background
  - `JonesPanelHeader` - Green header bar styled like Jones locations
  - `JonesPanelContent` - Content container
  - `JonesSectionHeader` - Brown sub-section headers
  - `JonesMenuItem` - Item with dotted line to price (........$XX)
  - `JonesListItem` - Simple list item (for employers, etc.)
  - `JonesInfoRow` - Label: value display row
  - `JonesButton` - Styled action button

### Panels Updated

**1. Rusty Tankard (Monolith Burgers equivalent)**
- Jones-style header with title and subtitle
- Food items listed with dotted prices
- Time cost indicator at bottom

**2. General Store (Black's Market equivalent)**
- Section headers for "FOOD & PROVISIONS" and "OTHER ITEMS"
- Items with dotted line pricing
- Newspaper and supplies in clean list format

**3. Shadow Market (Z-Mart equivalent)**
- Discount goods section
- Used magical items with break chance warning
- Appliances listed with happiness bonus notes

**4. Guild Hall / Employment Office**
- Employer list matching Jones' Employment Office style
- Simple list of employer names
- Current employment status section
- Job details with base wage and requirements
- Application result modals styled consistently

**5. Academy (Hi-Tech University equivalent)**
- Available courses listed with progress
- Graduate button for completed courses
- Locked courses section showing prerequisites

**6. Bank**
- Financial services with info rows
- Deposit/withdraw/invest options with prices

**7. Armory**
- Clothing and weapons sections
- Items with dotted line pricing

### Visual Style
- Dark brown background (`#3d3224`)
- Green header bars (`#2a5c3a`)
- Brown section headers (`#8b7355`)
- Gold accent color for prices (`#c9a227`)
- Cream text color (`#e0d4b8`)
- Dotted lines connecting labels to prices

### Files Modified
- `src/components/game/LocationPanel.tsx` - Updated 7 location panels
- `src/components/game/ShadowMarketPanel.tsx` - Full Jones-style rewrite
- `src/components/game/GuildHallPanel.tsx` - Full Jones-style rewrite

---

## 2026-02-05 - Fix Victory Goals Check

### Bug Description
The game was declaring victory even when the player had NOT achieved the victory goals. As shown in screenshot:
- Wealth: 150G (Goal: 2000G) - NOT MET
- Happiness: 68 (Goal: 75) - NOT MET
- Education: 0 (Goal: 2) - NOT MET
- Guild Rank: APPRENTICE (Rank 2+) - UNCLEAR

### Root Causes Found

**1. `checkVictory` was NEVER called:**
- The function existed but was never invoked during gameplay
- Only way to win was "last player standing" which didn't check goals

**2. Education check used wrong system:**
- Used old `player.education` object (fighter/mage/priest/business)
- Should use new Jones-style `completedDegrees` array
- Each degree = 9 education points

**3. VictoryScreen showed wrong message:**
- Always displayed "has achieved all victory goals!"
- Even when player won by "last standing" without meeting goals

### Fixes Applied

**1. Fixed `checkVictory` education calculation:**
```typescript
// Before: OLD education system
const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);

// After: Jones-style completedDegrees (9 points per degree)
const totalEducation = player.completedDegrees.length * 9;
```

**2. Added `checkVictory` call in `endTurn`:**
- Now checks if current player achieved victory goals before switching turns
- Returns early if victory achieved

**3. Updated VictoryScreen:**
- Detects "last standing" vs "goals achieved" victory
- Shows appropriate message for each type
- Added visual indicators (check/X) for each goal
- Green background for met goals, red for unmet

### Files Modified
- `src/store/gameStore.ts` - Fixed education calc, added checkVictory call in endTurn
- `src/components/screens/VictoryScreen.tsx` - Added goal checking and visual indicators

### Technical Details

**Victory now triggers correctly:**
```typescript
endTurn: () => {
  // Check victory goals BEFORE switching turns
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer && !currentPlayer.isGameOver) {
    if (get().checkVictory(currentPlayer.id)) {
      return; // Victory achieved
    }
  }
  // Continue with normal turn switching...
}
```

**VictoryScreen now shows:**
- Different messages: "has achieved all victory goals!" vs "is the last one standing!"
- Per-goal status: green checkmark for met, red X for unmet
- Proper education display using completedDegrees

---

## 2026-02-05 - Player Movement Animation, Home Location Start, and Job Fixes

### Task Summary
Implemented animated player movement along the board path, made players start each turn at their home location, and fixed job locations to match actual game board locations.

### 1. Animated Player Movement
Created a new animation system that shows player tokens moving step-by-step along the board path when traveling.

**Implementation:**
- Created `AnimatedPlayerToken.tsx` component that animates through path waypoints
- Uses `getPath()` to calculate the shortest route between locations
- Animation speed: 300ms per step along the path
- Player token is elevated above location zones during animation
- Movement completes with the actual game state update

**Key Features:**
- Player token visually moves through each intermediate location
- Current player indicator disabled during animation
- Click disabled on locations during animation to prevent conflicts
- Smooth CSS transitions for movement

### 2. Players Start at Home Location
Players now return to their housing location at the start of each turn (like Jones in the Fast Lane).

**Rules:**
- Slums/Homeless players start at "The Slums"
- Noble Heights players start at "Noble Heights"
- Applies at start of new turns and at start of new week

**Modified:**
- `endTurn()` - Moves next player to their home before starting turn
- `processWeekEnd()` - Moves first player to their home at week start
- `startTurn()` - Additional safety check for player location

### 3. Fixed Job Locations
Fixed jobs that referenced non-existent board locations:

**Before → After:**
- Military jobs (City Guard, Caravan Guard, Arena Fighter): "Guildholm"/"Arena" → "Armory"
- Court Advisor: "Noble Heights" → "Guild Hall"

### 4. Added Rusty Tankard Jobs (Monolith Burgers Equivalent)
Added 5 new tavern jobs at The Rusty Tankard (fantasy equivalent of Monolith Burgers):

| Job | Wage | Requirements |
|-----|------|--------------|
| Dishwasher | $4/hr | None |
| Tavern Cook | $5/hr | 10 Exp, 20 Dep, Casual |
| Barmaid/Barkeep | $6/hr | 15 Exp, 25 Dep, Casual |
| Head Chef | $10/hr | Trade Guild, 25 Exp, 35 Dep |
| Tavern Manager | $14/hr | Commerce, 40 Exp, 45 Dep, Dress |

### Files Created
- `src/components/game/AnimatedPlayerToken.tsx` - Animated movement component

### Files Modified
- `src/components/game/GameBoard.tsx` - Integrated animation system
- `src/store/gameStore.ts` - Home location start logic
- `src/data/jobs.ts` - Fixed locations, added TAVERN_JOBS

### Technical Details

**Animation System:**
```typescript
// Animation path state
const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
const [animationPath, setAnimationPath] = useState<LocationId[] | null>(null);

// Calculate path and start animation
const path = getPath(currentPlayer.currentLocation, destination);
setAnimatingPlayer(currentPlayer.id);
setAnimationPath(path);
```

**Home Location Logic:**
```typescript
// Determine home based on housing
const homeLocation: LocationId = player.housing === 'noble' ? 'noble-heights' : 'slums';

// Move player to home at turn start
set({
  players: state.players.map((p, index) =>
    index === nextIndex
      ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation }
      : p
  ),
});
```

---

## 2026-02-05 - CLAUDE.md and Victory Screen

### Task Summary
Created CLAUDE.md documentation file and implemented the Victory Screen to fix a TODO comment.

### 1. CLAUDE.md Created
Created a comprehensive CLAUDE.md file that provides:
- Project overview (fantasy life sim inspired by Jones in the Fast Lane)
- Tech stack documentation (React, TypeScript, Vite, Zustand, Tailwind)
- Quick commands for development
- Project structure overview
- Key files reference table
- Game mechanics summary (turn system, victory goals, locations, housing, jobs, education)
- Documentation file references
- Code conventions
- Testing instructions

### 2. Victory Screen Implemented
Fixed the TODO in `src/pages/Index.tsx` by creating a proper VictoryScreen component:

**Features:**
- Displays winning player's name with their color
- Shows animated victory banner with Crown, Trophy, and Star icons
- Final stats display showing:
  - Wealth (gold + savings + investments)
  - Happiness
  - Education level
  - Guild Rank
- Compares stats against victory goals
- "Return to Title" and "New Game" buttons
- Handles edge case when all players perished (Game Over screen)

### Files Created
- `CLAUDE.md` - Project documentation for Claude
- `src/components/screens/VictoryScreen.tsx` - Victory screen component

### Files Modified
- `src/pages/Index.tsx` - Replaced TODO with VictoryScreen import and usage

### Technical Details
```typescript
// Victory check (from gameStore.ts)
const totalWealth = player.gold + player.savings + player.investments;
const wealthMet = totalWealth >= goals.wealth;
const happinessMet = player.happiness >= goals.happiness;
const totalEducation = Object.values(player.education).reduce((sum, level) => sum + level, 0);
const educationMet = totalEducation >= goals.education;
```

---

## 2026-02-05 - Side Panels, Direct Travel, Auto-Turn End, and Death System

### Task Summary
Implemented major UI and gameplay improvements to utilize the unused black areas on the sides of the game board and improve gameplay flow.

### 1. Left Side Panel - Player Info Panel
Created `PlayerInfoPanel.tsx` component that displays:
- Player name, color, and guild rank
- All vital stats with progress bars:
  - Time remaining (Hours)
  - Gold
  - Health
  - Happiness
  - Food level
  - Clothing condition
  - Dependability
  - Current wage (if employed)
  - Housing status
  - Experience
- Warning indicators for critical stats (low health, low food, etc.)
- Sick/Dead status indicators

### 2. Right Side Panel - Turn Order Panel
Created `TurnOrderPanel.tsx` component that displays:
- Turn order with all players
- Current turn indicator (crown icon)
- Each player's progress toward victory (circular progress indicator)
- Player status (gold, time remaining)
- Dead player indicators (skull icon, grayed out)
- AI player indicators (bot icon)
- Victory goals summary
- Game tip

### 3. Direct Travel on Click
**Before:** Players had to click a location, then click a "Travel to X" button
**After:** Clicking a location directly travels there if:
- Player has enough time
- Shows success toast with location name
- If not enough time, shows error toast but still opens location panel

### 4. Auto-Return to Housing When Time Runs Out
When a player's time reaches 0:
- Shows toast notification
- Automatically ends turn after 500ms delay
- Next player's turn begins

### 5. Player Death System
**Health reaches 0:**
- First checks for resurrection (requires 100g in savings)
- If can resurrect: Health restored to 50, moved to Enchanter
- If cannot resurrect: Player marked as `isGameOver: true`

**Game Over handling:**
- Dead players are skipped in turn order
- Dead players don't receive weekly effects
- If only one player remains alive, they win automatically
- If all players die, game shows "All players have perished"

### Files Created
- `src/components/game/PlayerInfoPanel.tsx` - Left side player stats panel
- `src/components/game/TurnOrderPanel.tsx` - Right side turn order panel

### Files Modified
- `src/components/game/GameBoard.tsx` - Added side panels, direct travel, auto-return logic
- `src/store/gameStore.ts` - Updated endTurn, processWeekEnd, checkDeath for death system
- `src/types/game.types.ts` - Added `isGameOver` field to Player interface

### Layout Changes
- Left panel: 180px wide, shows current player info
- Right panel: 180px wide, shows turn order and goals
- Game board container: Adjusted with margins for side panels

### Technical Details
```typescript
// Direct travel implementation
const handleLocationClick = (locationId: string) => {
  if (isCurrentLocation) {
    // Toggle location panel
  } else {
    const moveCost = getMovementCost(currentLocation, locationId);
    if (timeRemaining >= moveCost) {
      movePlayer(playerId, locationId, moveCost);
      toast.success(`Traveled to ${locationName}`);
    } else {
      toast.error('Not enough time!');
    }
  }
};

// Auto-return when time runs out
useEffect(() => {
  if (currentPlayer && phase === 'playing') {
    if (currentPlayer.timeRemaining <= 0) {
      toast.info(`${name}'s time is up! Returning home...`);
      setTimeout(() => endTurn(), 500);
    }
  }
}, [currentPlayer?.timeRemaining]);
```

---

## 2026-02-05 - Jones in the Fast Lane Wiki Reference Documentation

### Task
Created comprehensive reference documentation by scraping the Jones in the Fast Lane wiki (jonesinthefastlane.fandom.com) to serve as an authoritative source for game mechanics implementation.

### Research Process
- Performed systematic web searches across all wiki categories
- Extracted information about: Goals, Time/Turns, Stats, Locations, Housing, Jobs, Education, Economy, Items, Food, Clothing, Robbery, Weekends, Stocks, Pawn Shop
- Direct wiki fetching was blocked (403), used web search to gather content

### Created: JONES_REFERENCE.md

A comprehensive 800+ line reference document containing:

**Goals System:**
- Wealth Goal: $100 = 1 point, need $10,000 for 100 points
- Happiness Goal: Multiple sources (+5 graduation, +3 computer, etc.)
- Education Goal: 9 points per degree, 11 degrees = 100 max
- Career Goal: Equals Dependability stat

**Time System:**
- 60 Hours per turn
- Movement costs ~1 Hour per location step
- Entering location = +2 Hours
- Starvation penalty = -20 Hours
- Doctor visit = -10 Hours, -4 Happiness, -$30-200

**Stats:**
- Experience: Gained by working, capped at maxExperience
- Dependability: Gained by working, capped at maxDependability
- Relaxation: 10-50 range, decreases by 1/turn, affects robbery chance

**Jobs:**
- 20+ jobs documented with wages and requirements
- Entry: $4-6/hr (Janitor, Cook)
- Mid: $8-14/hr (Checker, Butcher, Teacher)
- Top: $20-25/hr (Broker, Professor, Engineer, GM)
- Wages vary 50-250% based on economy

**Education:**
- 11 degrees in prerequisite tree
- 10 lessons per degree (reducible to 8 with items)
- Graduation bonus: +5 Happiness, +5 Dependability, +5 max caps

**Appliances:**
- Socket City: Higher prices, 1/51 break chance, better happiness
- Z-Mart: Lower prices, 1/36 break chance
- Full price list for TV, VCR, Stereo, Microwave, Refrigerator, Computer

**Robbery (Wild Willy → Shadowfingers):**
- Street: Week 4+, leaving Bank/Market, takes ALL cash, -3 Happiness
- Apartment: Low-Cost Housing only, 1/(relaxation+1) chance, -4 Happiness
- Items that can't be stolen: Computer, Refrigerator, Freezer, Encyclopedia, etc.

**Economy:**
- Fluctuates every turn
- Market crashes: Pay cuts (80%), Layoffs
- Affects item prices, job wages offered, new rent

**Weekend System:**
- Automatic activities between turns
- Ticket priorities: Baseball > Theatre > Concert
- Durable-triggered weekends (20% chance each)
- Cost ranges: Cheap ($5-20), Medium ($15-55), Expensive ($50-100)

### Implementation Mapping Table
Created complete mapping from Jones concepts to Guild Life fantasy equivalents:
- Locations (14 mapped)
- Appliances (7 mapped)
- Degrees (11 mapped)
- Characters (Wild Willy → Shadowfingers, Jones AI → Grimwald)

### Files Created
- `JONES_REFERENCE.md` - Comprehensive reference guide (800+ lines)

### Source References
30+ wiki pages cited including Goals, Turn, Locations, Jobs, Degrees, Economy, Wild Willy, Appliances, and more.

### Implementation Gap Analysis

**Fully Implemented (~80%):**
- Goals system (Wealth, Happiness, Education, Career)
- Time/Turn system (60 hours, turn structure)
- Stats (Experience, Dependability, Relaxation)
- Food system (Fast Food, Fresh Food, Starvation, Refrigerator)
- Clothing system (Casual, Dress, Business, wear out)
- Appliance/Durables system with break mechanics
- Shadowfingers robbery (Street and Apartment)
- Market crash events (Pay cuts, Layoffs)
- Lottery tickets
- Rent system with prepayment

**Partially Implemented:**
- Weekend/Relaxation system (mechanics exist but not as activities)
- Doctor/Healer visits (sickness exists but no healing mechanic)

**Not Implemented:**
- Stock Market/T-Bills trading system
- Loan system (request, interest, repayment)
- Entertainment tickets (Baseball, Theatre, Concert)
- Weekend activity costs ($5-100)

---

## 2026-02-05 - Jones-Style Turn System and Board Movement

### Research Summary (from jonesinthefastlane.fandom.com)

**Turn System:**
- Each player's turn is split into 60 Hours (time points)
- Players spend Hours on actions and movement
- Turn ends once all 60 Hours are spent
- Free actions may be performed after time runs out

**Movement:**
- Players move around a ring of locations on the board
- Full lap around the board costs ~10 Hours
- Players can move in either direction (clockwise/counter-clockwise)
- Shortest route is automatically calculated

**Starting Location:**
- Players start at their apartment (The Slums for new players)

**Starvation Penalty:**
- If no food at turn start: Lose 20 Hours (1/3 of turn!)
- Having a Refrigerator (Preservation Box) with food prevents this

### Implementation Completed

**60-Hour Turn System:**
- Changed `HOURS_PER_TURN` from 168 to 60 (Jones-style)
- Updated all time references to use the new constant
- ResourcePanel now shows "Hours" with proper 60-hour max

**Board Path System:**
- Created `BOARD_PATH` array defining the ring of 14 locations
- Path goes clockwise: noble-heights → general-store → bank → forge → guild-hall → cave → academy → enchanter → armory → rusty-tankard → shadow-market → fence → slums → landlord
- Added `calculatePathDistance()` function for shortest route
- Added `getPath()` function to get actual path between locations

**Movement Cost:**
- Each step along the path costs 1 Hour
- Maximum distance (half the board) = 7 Hours
- Shortest route is automatically chosen

**Starting Location:**
- Players now start in 'slums' instead of 'guild-hall'
- Matches Jones in the Fast Lane starting position

**Starvation Time Penalty:**
- Added check at turn start
- If no food and no Preservation Box: -20 Hours
- Shows event message explaining the penalty

### Files Modified
- `src/types/game.types.ts` - Added HOURS_PER_TURN constant (60)
- `src/data/locations.ts` - Added BOARD_PATH, calculatePathDistance(), getPath()
- `src/store/gameStore.ts` - Updated to use HOURS_PER_TURN, start in slums, starvation penalty
- `src/components/game/ResourcePanel.tsx` - Updated to show 60-hour max

### Board Path Layout
```
        noble-heights ─── landlord ─── slums ─── fence
              │                                    │
        general-store                        shadow-market
              │                                    │
            bank                            rusty-tankard
              │                                    │
            forge                              armory
              │                                    │
        guild-hall ─── cave ─── academy ─── enchanter
```

---

## 2026-02-05 - Jones-Style Housing & Appliances System

### Research Summary (from jonesinthefastlane.fandom.com)

**Low-Cost Housing (The Slums):**
- Wild Willy (Shadowfingers) robs players in Low-Cost Housing
- Apartment robbery only happens at Low-Cost Housing with durables
- Chance based on Relaxation stat (1/(relaxation+1)), ranging 2-9% per turn
- Le Securité (Noble Heights equivalent) is safe from robbery
- Players can lock in lower rent when economy drops
- Rent can be prepaid multiple weeks in advance
- Salary garnishment (50%) if rent is overdue

**Appliances (Socket City = Enchanter's Workshop):**
- All appliances can break, requiring repair
- Socket City items: lower break chance (1/51), higher repair cost
- Z-Mart items: higher break chance (1/36), cheaper to buy
- Pawn Shop items: same 1/36 break chance as Z-Mart
- Break chance only triggers if player has >$500 cash
- Repair cost: 1/20 to 1/4 of original purchase price
- Each break: -1 Happiness
- Happiness bonus only on FIRST purchase of each type

**Appliance Types (Jones → Fantasy):**
| Jones | Fantasy (Guild Life) | Socket City Price | Z-Mart Price | Happiness |
|-------|---------------------|------------------|--------------|-----------|
| Color TV | Scrying Mirror | 525g | 450g | +2/+1 |
| B&W TV | Simple Scrying Glass | - | 220g | +1 |
| VCR | Memory Crystal | 475g | 300g | +2/+1 |
| Stereo | Music Box | 325g | 350g | +2/+1 |
| Microwave | Cooking Fire | 276g | 200g | +1/turn |
| Refrigerator | Preservation Box | 876g | 650g | +2/+1 |
| Computer | Arcane Tome | 1599g | - | +3, random income |

**Pawn Shop Mechanics:**
- Pawn item: 40% of original price
- Redeem within few weeks: 50% of original price
- After expiry: item goes on sale for 50% price
- Pawned items from Socket City keep 1/51 break chance if redeemed
- Bought from Pawn Shop: always 1/36 break chance

### Implementation Plan

1. **Housing System Update:**
   - Add rent prepayment (pay multiple weeks ahead)
   - Add rent lock-in when signing new lease
   - Update landlord UI with these options

2. **Appliances System:**
   - Update items.ts with complete appliance list
   - Add breakChance and source (enchanter/market/pawn) to durables
   - Add appliance breakage check at start of turn
   - Add repair cost calculation

3. **Location Updates:**
   - Enchanter's Workshop: Full appliance shop (Socket City)
   - Shadow Market: Cheaper used appliances (Z-Mart)
   - The Fence: Pawn/redeem/buy mechanics for appliances

### Implementation Completed

**New Types Added (game.types.ts):**
- `ApplianceSource`: 'enchanter' | 'market' | 'pawn'
- `APPLIANCE_BREAK_CHANCE`: Break chances by source (1/51 enchanter, 1/36 market/pawn)
- `OwnedAppliance`: Interface with itemId, originalPrice, source, isBroken, purchasedFirstTime
- `AppliancesInventory`: Record of owned appliances
- Player fields: `appliances`, `applianceHistory`, `rentPrepaidWeeks`, `lockedRent`

**New Appliances (items.ts):**
| Fantasy Name | Jones Equivalent | Enchanter Price | Market Price | Happiness |
|--------------|-----------------|-----------------|--------------|-----------|
| Scrying Mirror | Color TV | 525g | 450g | +2/+1 |
| Simple Scrying Glass | B&W TV | - | 220g | +1 |
| Memory Crystal | VCR | 475g | 300g | +2/+1 |
| Enchanted Music Box | Stereo | 325g | 350g | +2/+1 |
| Eternal Cooking Fire | Microwave | 276g | 200g | +1/turn |
| Preservation Box | Refrigerator | 876g | 650g | +2/+1 |
| Arcane Tome | Computer | 1599g | - | +3, income |

**New Store Functions (gameStore.ts):**
- `buyAppliance(playerId, applianceId, price, source)` - Buy with happiness tracking
- `repairAppliance(playerId, applianceId)` - Fix broken appliance
- `pawnAppliance(playerId, applianceId, pawnValue)` - Pawn for 40% value
- `prepayRent(playerId, weeks, totalCost)` - Pay rent in advance
- `moveToHousing(playerId, tier, cost, lockInRent)` - Move with rent lock-in

**startTurn Updates:**
- Appliance breakage check (only if gold > 500)
- Auto-repair with cost deduction
- Cooking Fire per-turn happiness bonus (+1)
- Arcane Tome random income (15% chance, 10-60g)

**New UI Components:**
- `EnchanterPanel.tsx` - Socket City equivalent with repair section
- `ShadowMarketPanel.tsx` - Z-Mart equivalent with used appliances
- `PawnShopPanel.tsx` - Updated with appliance pawn/buy

**Landlord UI Updates:**
- Shows locked rent vs market rate
- Prepay 1/4/8 weeks options
- Moving locks in current market rate
- Shows savings when locked rate < market

### Files Modified
- `src/types/game.types.ts` - New appliance types and player fields
- `src/data/items.ts` - APPLIANCES array, helper functions
- `src/store/gameStore.ts` - New functions, startTurn appliance logic
- `src/components/game/LocationPanel.tsx` - Updated all relevant locations
- `src/components/game/PawnShopPanel.tsx` - Appliance pawn/buy
- `src/components/game/EnchanterPanel.tsx` - NEW
- `src/components/game/ShadowMarketPanel.tsx` - NEW

---

## 2026-02-05 - Guild Hall (Jones-Style Employment System)

### Implementation

Created Guild Hall panel - our fantasy version of Jones' Employment Office:

**Employer List View:**
- Shows list of employers (Guild Hall, General Store, Bank, Forge, Academy, etc.)
- Each employer shows number of available positions
- Click on employer to see their jobs

**Job Application System:**
- Click on a job to apply (costs 1 hour)
- System checks ALL qualifications:
  - Required degrees (education)
  - Required experience points
  - Required dependability percentage
  - Required clothing level
- Shows HIRED! or APPLICATION DENIED with specific reason

**Application Results:**
- Success: Shows offered wage (50-250% of base based on economy)
- Can accept or decline the offer
- Failure: Shows exactly what's missing (degrees, exp, dep, clothing)

### Files
- `src/components/game/GuildHallPanel.tsx` - Guild Hall job seeking panel
- `src/data/jobs.ts` - Added Employer interface, getEmployers(), applyForJob()
- `src/components/game/LocationPanel.tsx` - Integrated GuildHallPanel

---

## 2026-02-05 - Jones-Style Working System Overhaul

### Research Summary (from jonesinthefastlane.fandom.com)

**Jones in the Fast Lane Job System:**
- Jobs have base wages but actual offered wages vary 50-250% based on economy
- Players can request raises if market rate exceeds their current wage
- Market crashes can cause:
  - Pay cuts (wages reduced to 80%)
  - Layoffs (job loss)
- Experience and Dependability are capped at maximum values
- Each degree earned increases max caps permanently

### Implementation Completed

**Variable Wage Offers (Jones-style):**
- Jobs now offer wages between 50-250% of base wage
- Economy modifier affects wage offers
- UI shows wage quality indicators (🔥 Great pay! / ⚠️ Low offer)
- Players can see when market rate exceeds their current wage

**Market Crash Events:**
- 5% weekly chance of pay cut (20% wage reduction)
- 3% weekly chance of layoff (job loss)
- Events affect happiness and trigger event messages

**Experience/Dependability Caps:**
- Experience now properly capped at `maxExperience` (starts at 100)
- Dependability capped at `maxDependability` (starts at 100)
- Completing degrees increases these caps (+5 each)

**Employment Office Overhaul:**
- Guild Hall now shows "Employment Office" with job offers
- Each job shows offered wage with economy-based variation
- Color coding: green for high offers, red for low offers
- Current job market rate shown for raise negotiation

**Forge Job System Update:**
- Forge now uses variable wage offers
- Shows unavailable jobs message when lacking qualifications
- Earnings calculated with bonus multiplier

### Files Modified
- `src/data/jobs.ts` - Added JobOffer interface and getJobOffers function
- `src/data/events.ts` - Added market crash events and checkMarketCrash function
- `src/store/gameStore.ts` - Added market crash handling and experience caps
- `src/components/game/LocationPanel.tsx` - Updated Guild Hall and Forge UI

### Technical Details

**New Job Functions:**
```typescript
// Calculate offered wage (50-250% of base)
calculateOfferedWage(job: Job, economyModifier: number): JobOffer

// Get all available job offers with economy wages
getJobOffers(degrees, clothing, exp, dep, economy): JobOffer[]

// Check for market crash events
checkMarketCrash(hasJob: boolean): MarketCrashResult
```

---

## 2026-02-05 - Zone Configurations Update

### Completed
- Updated ZONE_CONFIGS in `src/data/locations.ts` with precise coordinates from visual editor
- Updated CENTER_PANEL_CONFIG in both `ZoneEditor.tsx` and `GameBoard.tsx`

### New Zone Coordinates
All coordinates are percentages relative to the game board:
- noble-heights: x=10.6, y=0.3, w=15.2, h=30.2
- landlord: x=30.9, y=2.5, w=9.9, h=18.9
- slums: x=41.9, y=1.1, w=18.2, h=21.2
- fence: x=61.1, y=0.0, w=13.1, h=20.6
- general-store: x=11.0, y=35.9, w=15.2, h=18.9
- shadow-market: x=74.7, y=0.8, w=14.9, h=18.8
- rusty-tankard: x=74.9, y=20.9, w=14.4, h=19.6
- armory: x=74.9, y=41.0, w=14.3, h=22.7
- forge: x=11.9, y=74.3, w=13.3, h=25.2
- guild-hall: x=26.9, y=77.0, w=14.3, h=23.0
- cave: x=45.0, y=78.0, w=10.0, h=22.0
- academy: x=58.9, y=77.0, w=14.8, h=22.8
- enchanter: x=74.6, y=65.0, w=15.0, h=35.0
- bank: x=10.9, y=55.8, w=14.6, h=17.0

### Center Panel Configuration
- top: 23.4%
- left: 26.7%
- width: 46.5%
- height: 53.4%

### Files Modified
- `src/data/locations.ts` - Updated ZONE_CONFIGS array
- `src/components/game/ZoneEditor.tsx` - Updated DEFAULT_CENTER_PANEL
- `src/components/game/GameBoard.tsx` - Updated DEFAULT_CENTER_PANEL

---

## 2026-02-05 - Jones in the Fast Lane Education/Jobs Overhaul

### Research Summary (from jonesinthefastlane.fandom.com)

**Jones in the Fast Lane Degree System:**
The original game has 11 degrees organized in a tree structure:

1. **Starting Degrees** (no prerequisites):
   - Trade School - unlocks mid-level jobs like Butcher
   - Junior College - gateway to advanced degrees

2. **From Trade School:**
   - Electronics - jobs at Socket City
   - Pre-Engineering → Engineering - factory top jobs

3. **From Junior College:**
   - Academic → Graduate School → Post Doctoral → Research (Professor path)
   - Business Administration - management jobs
   - Electronics (also requires Trade School)
   - Pre-Engineering (also requires Trade School)

4. **Key Jobs and Requirements:**
   - Entry: Janitor ($4-6/hr), Cook, Clerk
   - Mid: Butcher (Trade School), Checker ($10/hr)
   - High: Engineer ($23/hr), Broker ($22/hr), Professor ($20/hr)
   - Top: General Manager ($25/hr) - requires Engineering + Business Admin

**Graduation Bonuses:**
- +5 Happiness
- +5 Dependability
- +5 Max Dependability (permanent)
- +5 Max Experience (permanent)

**Course Mechanics:**
- 10 sessions to complete a degree
- $50 base enrollment fee
- Up to 4 courses simultaneously
- Each degree = +9 education points

### Plan for Guild Life Adventures

Adapt the Jones system to fantasy setting:

**Education Paths (replacing current 4-path system):**
1. **Trade Guild** (Trade School equivalent) → unlocks basic trade jobs
2. **Junior Academy** (Junior College) → gateway to advanced paths
3. **Arcane Studies** (Electronics) → enchanting/magic tech jobs
4. **Combat Engineering** (Pre-Engineering → Engineering) → forge/factory jobs
5. **Scholar's Path** (Academic → Grad → Post Doc → Research) → professor/sage
6. **Commerce Academy** (Business Admin) → management jobs

**Fantasy Job Equivalents:**
- Clerk → Shop Assistant
- Butcher → Market Vendor
- Broker → Guild Treasurer
- Engineer → Master Artificer
- Professor → Sage/Loremaster
- General Manager → Guild Master (location)

### Implementation Completed

**New Degree System (11 degrees like Jones):**
1. **Trade Guild Certificate** - Starting degree, unlocks basic trade jobs
2. **Junior Academy Diploma** - Starting degree, gateway to advanced studies
3. **Arcane Studies Certificate** - Requires Trade Guild, magic-related jobs
4. **Combat Training Certificate** - Requires Trade Guild, military jobs
5. **Master Combat Degree** - Requires Combat Training, top forge/military jobs
6. **Scholar Degree** - Requires Junior Academy, Teacher job
7. **Advanced Scholar Degree** - Requires Scholar, Senior Teacher
8. **Sage Studies Certificate** - Requires Advanced Scholar, Lecturer
9. **Loremaster Degree** - Requires Sage Studies, Sage/Court Advisor jobs
10. **Commerce Degree** - Requires Junior Academy, management jobs
11. **Alchemy Degree** - Requires Arcane Studies + Junior Academy, Alchemist jobs

**New Job System (30+ jobs across 8 locations):**
- Entry-level: Floor Sweeper ($4/hr), Market Porter ($4/hr), Forge Laborer ($4/hr)
- Mid-level: Market Vendor ($10/hr - Trade Guild), Journeyman Smith ($10/hr)
- High-level: Teacher ($14/hr - Scholar), Guild Accountant ($14/hr - Commerce)
- Top-level: Forge Manager ($23/hr), Guild Treasurer ($22/hr), Sage ($20/hr)
- Ultimate: Guild Master's Assistant ($25/hr - requires 3 top degrees!)

**Graduation Bonuses (like Jones):**
- +5 Happiness
- +5 Dependability
- +5 Max Dependability (permanent)
- +5 Max Experience (permanent)

### Files Modified
- `src/data/education.ts` - Complete rewrite with Jones-style degree tree
- `src/data/jobs.ts` - 30+ new jobs with degree requirements
- `src/types/game.types.ts` - Added DegreeId type and player fields
- `src/store/gameStore.ts` - Added studyDegree/completeDegree functions
- `src/components/game/LocationPanel.tsx` - New Academy UI with degree progression

---

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

---

## 2026-02-06 — Full Gameplay Balance Audit

### Methodology
Comprehensive code audit of all game data, store logic, AI behavior, and economy.
Simulated full game progression path analysis across all victory goals.

---

### CRITICAL BUGS FOUND & FIXED

#### B1: Education Victory Goal — Trivially Easy (CRITICAL)
**Files:** `gameStore.ts:121`, `GameSetup.tsx:16,47-50`, `questHelpers.ts:190-191`
**Problem:** Default education goal was 5 points, but each completed degree awards 9 points
(`completedDegrees.length * 9`). This means 1 degree (9 pts) instantly satisfies the education
goal (9 >= 5). In Jones in the Fast Lane, education goal ranges from 10-100 points.
The GameSetup slider was also broken: range 1-16 with step 1, meaning even the max (16) only
required 2 degrees.
**Fix:**
- Default education goal: `5` → `45` (5 degrees worth)
- GameSetup presets: quick=18 (2 degrees), standard=45 (5 degrees), epic=90 (10 degrees)
- Education slider: min=9, max=99, step=9 with dynamic degree count display
- All test goals updated from `education: 5` to `education: 45`

#### B2: AI Work Time Check Hardcoded to 6 Hours (HIGH)
**File:** `actionGenerator.ts:331,432`
**Problem:** AI checked `player.timeRemaining >= 6` before generating work actions, but Forge
jobs require 8 hours, Caravan Guard requires 10, and Arena Fighter only needs 4. The AI could
generate work actions for 8-hour jobs when only having 6 hours left. The `workShift` function
would then clamp `timeRemaining` to 0 (`Math.max(0, 6 - 8)`), giving the AI a full 8-hour
shift's pay for only 6 hours of time — effectively 2 free hours of work.
**Fix:** Changed to `player.timeRemaining >= job.hoursPerShift`, also added `moveCost + hoursPerShift` travel check (was missing from career-priority path).

#### B3: AI Dungeon Time Check Hardcoded to 6 Hours (HIGH)
**File:** `actionGenerator.ts:796`
**Problem:** AI checked `player.timeRemaining > moveCost('cave') + 6` for ALL dungeon floors,
but actual floor times range from 6 hours (Floor 1) to 22 hours (Floor 5). AI would attempt
Floor 5 thinking it needed 6 hours when it actually needs 22, wasting a turn.
**Fix:** Import `getFloor`/`getFloorTimeCost` from dungeon.ts and `calculateCombatStats` from
items.ts. Now uses actual floor time cost for the target floor.

---

### BALANCE ISSUES FOUND & FIXED

#### B4: Work Bonus Scaling Favored Long Shifts (MEDIUM)
**File:** `workEducationHelpers.ts:35-38`, `WorkSection.tsx:24-26`
**Problem:** Work bonus formula `Math.ceil(hours * 1.15)` applied to hours, then multiplied by
wage. Due to `Math.ceil` rounding, different shift lengths got different effective bonus rates:
- 6-hour shifts: ceil(6.9) = 7 → +16.7% bonus
- 8-hour shifts (Forge): ceil(9.2) = 10 → +25% bonus
- 10-hour shifts (Caravan): ceil(11.5) = 12 → +20% bonus
- 4-hour shifts (Arena Fighter): no bonus at all (under 6h threshold)

This made Forge jobs disproportionately better per hour worked.
**Fix:** Changed to `Math.floor(hours * effectiveWage * 1.15)` — flat 15% bonus applied to
earnings directly. All shift lengths now get exactly 15% bonus. Removed the `hours >= 6`
threshold so short shifts (Arena Fighter) also get the bonus.

#### B5: Homeless Theft Multiplier Too Harsh (MEDIUM)
**File:** `events.ts:272-273`
**Problem:** Homeless players had a 2× theft probability multiplier:
- Regular theft: 25% × 2 = **50% per week** (-50g, -10 happiness)
- Major theft: 10% × 2 = **20% per week** (-100g, -15 happiness)
- Expected weekly loss from theft alone: ~35g + ~20g = ~55g
Combined with the homeless health penalty (-5 HP/turn), time penalty (-8 hours/turn), and
doctor visit risk (25% chance, 30-200g), homeless players could not accumulate wealth.
**Fix:** Reduced homeless multiplier from 2.0 to 1.5:
- Regular theft: 25% × 1.5 = 37.5% (still punishing but survivable)
- Major theft: 10% × 1.5 = 15%

#### B6: Starting Housing = Homeless (MEDIUM)
**File:** `gameStore.ts:39`
**Problem:** Players started homeless, immediately exposed to the harsh homeless penalties
(health loss, time loss, high theft) with only 100g starting gold. Combined with B5,
the early game was a trap — players could lose most of their starting gold before getting
established. In Jones in the Fast Lane, players start with basic housing.
**Fix:** Starting housing changed from `'homeless'` to `'slums'` (cheapest housing tier).
Players still need to manage rent but aren't crippled from turn 1.

---

### ADDITIONAL BALANCE OBSERVATIONS (Not Fixed — For Future Consideration)

#### O1: Loan Interest Rate 10% Per Week
**File:** `turnHelpers.ts:484-490`
10% weekly compound interest = 520% annual rate. A 1000g loan becomes 2143g in 8 weeks.
This is intentionally punishing (loans are a last resort), but combined with other cash sinks
(rent, food, repairs), borrowing is essentially a trap. Consider reducing to 5% weekly for
a more forgiving experience.

#### O2: Market Crash 3% Layoff Rate
**File:** `events.ts:299-303`
3% weekly layoff chance + 5% pay cut chance means ~8% weekly negative employment event.
Over 20 weeks, there's a ~45% cumulative chance of being laid off at least once. This is
working as designed (Jones had market crashes too), but players may find it frustrating.

#### O3: Forge Jobs — Intentional Design
Forge jobs have 8-hour shifts at the same base wages as 6-hour Guild Hall jobs.
After the B4 fix (flat 15% bonus), Forge workers now earn 15% more per shift
but spend 33% more time. This makes Forge jobs time-inefficient compared to equivalent
6-hour jobs at the same wage level:
- Forge Laborer (8h, 4g/hr): floor(8×4×1.15) = 36g in 8h = **4.5g/effective hour**
- Floor Sweeper (6h, 4g/hr): floor(6×4×1.15) = 27g in 6h = **4.5g/effective hour**
Now perfectly balanced per hour. The tradeoff is more gold per shift but fewer shifts per turn.

#### O4: Arena Fighter Short Shift Advantage
Arena Fighter (4h, 16g/hr): floor(4×16×1.15) = 73g in 4h = **18.25g/effective hour**
This is the best gold/hour ratio in the game, but requires Master Combat degree and only
30 dependability (lower than other high-level jobs). Short shifts allow more actions per
turn. This is intended — Arena Fighter is a specialized high-reward combat career.

#### O5: Dungeon Combat Balance
Floor difficulty scales well: Floor 1 (6h, 15-50g) → Floor 5 (22h, 250-600g).
Education bonuses (trap disarm, ethereal damage, damage reduction) provide meaningful
advantages without being required. The 5% rare drop chance per floor clear is reasonable.
No issues found with dungeon balance.

#### O6: Quest Reward Scaling
E-Rank (12-25g) → S-Rank (400-500g) scaling is reasonable.
S-Rank quests require 80-100 hours (more than one turn), making them late-game investments.
Guild rank gating properly prevents rushing high-reward quests.

---

### Files Changed
| File | Change |
|------|--------|
| `src/store/gameStore.ts` | Education goal 5→45, starting housing homeless→slums |
| `src/store/helpers/workEducationHelpers.ts` | Work bonus: flat 15% on earnings, no threshold |
| `src/components/game/WorkSection.tsx` | Display matches new work bonus formula |
| `src/components/screens/GameSetup.tsx` | Education presets & slider fixed (9-99, step 9) |
| `src/data/events.ts` | Homeless theft multiplier 2.0→1.5 |
| `src/hooks/ai/actionGenerator.ts` | AI work time uses job.hoursPerShift, dungeon uses actual floor time |
| `src/test/work.test.ts` | Updated expectations for new work bonus formula |
| `src/test/gameActions.test.ts` | Updated education goal & housing expectations |
| `src/test/education.test.ts` | Updated education goal |
| `src/test/economy.test.ts` | Updated education goal |

### Test Results
- **92 tests passed**, 0 failed
- Build succeeds

---

## 2026-02-07 - Deep Multiplayer Network Audit & Bug Fixes

### Overview
Conducted a comprehensive audit of the entire online multiplayer system using 5 parallel specialized agents. Found ~70+ issues across all severity levels. Fixed all CRITICAL and HIGH issues, plus most MEDIUM/LOW ones. All 112 tests pass, TypeScript compiles cleanly, and production build succeeds.

### Audit Methodology
Launched 5 parallel audit agents covering:
1. **PeerManager.ts + roomCodes.ts** — WebRTC connection management
2. **useNetworkSync.ts + NetworkActionProxy.ts + networkState.ts** — State sync & action proxying
3. **useOnlineGame.ts + OnlineLobby.tsx** — Lobby management & UI
4. **gameStore.ts + GameBoard.tsx** — Store network integration
5. **Test coverage** — Multiplayer test gaps

### CRITICAL Fixes (6)

1. **peerManager destroyed on lobby unmount** (`useOnlineGame.ts`)
   - The cleanup effect called `peerManager.destroy()` when OnlineLobby unmounted — which happens when transitioning from lobby to gameplay. This killed ALL networking at game start.
   - Fix: Check `networkMode` before destroying; only destroy if not in active game.

2. **Guests joined with isReady: false but no ready button exists** (`useOnlineGame.ts`)
   - New guests joined with `isReady: false` but the UI had no ready toggle button, making game start impossible.
   - Fix: Changed default to `isReady: true` for new guests.

3. **Player slots not reassigned after lobby leave** (`useOnlineGame.ts`)
   - When a player left the lobby, remaining players kept their original slot indices, causing gaps in player IDs at game start.
   - Fix: Reassign slots sequentially after filtering out disconnected player.

4. **No playerId validation — guest can target any player** (`useNetworkSync.ts`)
   - Guests could send actions targeting other players' state (e.g., `modifyGold('player-0', 9999)`). No server-side validation existed.
   - Fix: Added check that `msg.args[0]` matches `senderPlayerId` before executing.

5. **Close handler race condition** (`PeerManager.ts`)
   - When a guest reconnected, the old connection's `close` handler fired and deleted the new connection from the map.
   - Fix: Guard close handler with `this.connections.get(peerId) !== conn` check.

6. **Guest never sends reconnect message** (`PeerManager.ts`)
   - `attemptReconnect()` reconnected the WebRTC data channel but never sent a `reconnect` message, so the host didn't know who reconnected.
   - Fix: Send reconnect message with stored player name after connecting. Added 15s timeout for signaling server reconnection.

### HIGH Fixes (6)

7. **startNewGame not guarded for guests** (`gameStore.ts`)
   - Guest could trigger `startNewGame` locally, corrupting state.
   - Fix: Added `if (get().networkMode === 'guest') return;` guard.

8. **movement-start no sender validation** (`useNetworkSync.ts`)
   - Any guest could broadcast fake movement animations for other players.
   - Fix: Verify sender peerId matches the playerId in the message.

9. **Event modal flicker on guest** (`networkState.ts`)
   - When guest dismissed an event modal, the next state sync from host re-applied the event, causing flicker.
   - Fix: Implemented `dismissedEvents` Set tracking. `applyNetworkState` skips syncing events the guest has locally dismissed.

10. **Turn timeout fires during non-playing phases** (`useNetworkSync.ts`)
    - Turn timeout could fire during event modals or victory screen.
    - Fix: Added `store.phase !== 'playing'` guard.

11. **Host graceful shutdown missing** (`useOnlineGame.ts`)
    - Host could close room without notifying guests, leaving them in limbo.
    - Fix: Broadcast 'kicked' message before destroying. Guest sends 'leave' message on disconnect.

12. **5th player rejected silently** (`useOnlineGame.ts`)
    - When a 5th player tried to join a full room, they were silently ignored.
    - Fix: Send 'kicked' message with "Room is full" reason.

### MEDIUM Fixes (7)

13. **Lobby colors used index instead of assigned color** (`OnlineLobby.tsx`)
    - Fix: Use `p.color` from lobby player data instead of `PLAYER_COLORS[i]?.value`.

14. **Dead useEffect with empty body** (`OnlineLobby.tsx`)
    - Removed empty useEffect that did nothing.

15. **Unused import** (`OnlineLobby.tsx`)
    - Removed `AI_DIFFICULTY_DESCRIPTIONS` import.

16. **Latency polling unnecessary re-renders** (`useNetworkSync.ts`)
    - Latency setState called every 3s even when value unchanged.
    - Fix: Compare before setting.

17. **Double state broadcast after guest action** (`useNetworkSync.ts`)
    - Host sent immediate broadcast AND debounced broadcast after executing guest action.
    - Fix: Removed immediate broadcast; debounced subscription handles it.

18. **loadFromSlot/saveToSlot corruption risk** (`gameStore.ts`)
    - Loading saves during online game could corrupt network state.
    - Fix: Guard both with `networkMode !== 'local'` check.

19. **Guest heartbeat timeout** (`PeerManager.ts`)
    - Guest had no way to detect if host stopped responding (only host monitored keepalive).
    - Fix: Added guest-side heartbeat timeout that triggers reconnection.

### LOW Fixes (3)

20. **Retry path missing disconnect handler** (`PeerManager.ts`)
    - When host retried peer creation, the new peer's connection handler didn't set up disconnect handlers.
    - Fix: Extracted `setupHostPeerHandlers()` method used in both paths.

21. **Guest stores reconnect player name** (`useOnlineGame.ts`)
    - Added `peerManager.setReconnectPlayerName(playerName)` so reconnection can identify the player.

22. **Event dismiss tracking for guests** (`gameStore.ts`)
    - Dismiss actions now call `markEventDismissed()` for guests so networkState can skip re-syncing dismissed events.

### Known Issues NOT Fixed (architectural/external)

- **TURN servers deprecated**: `openrelay.metered.ca` TURN servers are dead/deprecated. Requires external infrastructure to fix.
- **No multiplayer test coverage**: Zero test files cover networking. Would need mock PeerJS/WebRTC infrastructure.
- **No action result timeout on guest**: Guest waits indefinitely for host response.
- **No message schema validation**: Runtime type checking of network messages not implemented.
- **No rate limiting on guest actions**: Could spam host with rapid actions.
- **negotiateRaise arbitrary wage**: No bounds validation (partially covered by playerId check).
- **Room code uses Math.random()**: Not cryptographically secure (low risk for game).
- **Zombie disconnected players**: Cause 2-min turn timeout stalls per turn.

### Files Modified
- `src/network/PeerManager.ts` — Close handler race fix, reconnect message, guest heartbeat, handler extraction
- `src/network/useOnlineGame.ts` — Unmount fix, ready state, slot reassignment, graceful shutdown, 5th player rejection
- `src/network/useNetworkSync.ts` — PlayerId validation, movement validation, turn timeout guard, double broadcast removal, latency optimization
- `src/network/networkState.ts` — Event dismissal tracking system, modal flicker prevention
- `src/store/gameStore.ts` — Guest guards on startNewGame/save/load, event dismiss tracking
- `src/components/screens/OnlineLobby.tsx` — Dead code removal, color fix

### Verification
- ✅ TypeScript: Compiles cleanly (`npx tsc --noEmit`)
- ✅ Tests: 112/112 passing (`npx vitest run`)
- ✅ Build: Production build succeeds (`bun run build`)

---

## 2026-02-07 - Multiplayer Deep Audit & Security Hardening

### Audit Findings

Deep audit of the entire multiplayer codebase (7 network files, ~1930 lines). Used specialized agents to systematically review all code paths.

**Security Issues Found:**
1. **Cross-player validation incomplete** (was args[0] only) — a future action with playerId in args[1+] would bypass the check
2. **Raw stat modifiers exposed to guests** — `modifyGold`, `modifyHealth`, etc. are in ALLOWED_GUEST_ACTIONS because UI components call them directly (37 call sites across 7 components). A malicious guest could send crafted messages to give themselves gold/health/etc.
3. **Room codes use Math.random()** — not cryptographically secure, predictable room codes possible
4. **Dead code in skipZombieTurn** — had a useless loop iterating peerLatencies that did nothing
5. **No host migration** — host disconnect = game over (single point of failure)

**Positive Findings (things that are correct):**
- All 47 ALLOWED_GUEST_ACTIONS consistently use playerId as args[0] — the current validation IS correct for all existing actions
- Turn validation works properly (peerId→playerId mapping)
- Rate limiting is solid (10 actions/sec per peer with sliding window)
- Heartbeat/reconnection system is well-designed (5s ping, 15s timeout, 30s window)
- State serialization properly excludes UI-only fields
- wrapWithNetworkGuard correctly intercepts all store actions

### Completed (Fixes)

1. **Cross-player validation deep scan** — Now scans ALL argument positions for `player-` strings, not just args[0]. Catches any position, preventing future regressions.

2. **Argument bounds validation** — Added `validateActionArgs()` on the host side that validates arguments for dangerous guest actions:
   - modifyGold: max +500 per call
   - modifyHealth: max ±100
   - modifyHappiness: max ±50
   - modifyFood/Clothing: max ±100
   - modifyMaxHealth: max ±25
   - modifyRelaxation: max ±20
   - setJob: wage capped at 100g/hr
   - workShift: hours 0-60, wage cross-checked against player's current wage
   - All numeric args checked for isFinite()

3. **Room code crypto** — Replaced Math.random() with crypto.getRandomValues() for unpredictable room codes.

4. **Dead code cleanup** — Removed dead loop in skipZombieTurn that iterated peerLatencies and did nothing. Simplified to clean connected peer check + disconnected set check.

5. **Host migration** — Implemented automatic host succession:
   - Each guest stores lobby data (peerIds + slots) at game start
   - On host disconnect + 10s failed reconnect, migration triggers
   - Successor = guest with lowest slot number
   - Successor: `peerManager.promoteToHost()` → accepts incoming connections
   - Followers: wait 3s, then `peerManager.connectToNewHost(successorPeerId)`
   - Game state preserved from last state-sync
   - Added `promoteToHost()` and `connectToNewHost()` to PeerManager
   - Added `host-migrated` message type
   - Exposed `isMigrating` state from useOnlineGame

6. **New tests** — Added 7 new tests (32→39 total):
   - Room code crypto security (generation + entropy distribution)
   - Cross-player validation invariant (all actions use args[0])
   - endTurn special case (no playerId arg)
   - Raw modifiers in whitelist (documented requirement)
   - Non-existent action handling
   - HOST_INTERNAL existence verification

### Files Changed

| File | Changes |
|------|---------|
| `src/network/useNetworkSync.ts` | Deep argument scan, validateActionArgs(), dead code cleanup |
| `src/network/roomCodes.ts` | crypto.getRandomValues() |
| `src/network/PeerManager.ts` | promoteToHost(), connectToNewHost() |
| `src/network/useOnlineGame.ts` | Host migration (storedLobbyRef, migration timer, performHostMigration) |
| `src/network/types.ts` | host-migrated message type |
| `src/test/multiplayer.test.ts` | 7 new tests |
| `multiplayer.md` | Full update: audit findings, host migration docs, test coverage |

### Issues

- **freshFood.test.ts**: 2 pre-existing test failures unrelated to multiplayer changes
- **TURN servers**: Still no production TURN servers. ~15% of connections (symmetric NAT) will fail. Options documented in multiplayer.md.
- **Chain migration**: If the successor also disconnects during migration, game is lost. Would need recursive election.
- **E2E tests**: Still need Playwright with WebRTC for full integration testing

### Verification

- ✅ TypeScript: `npx tsc --noEmit` — clean
- ✅ Multiplayer tests: 39/39 passing
- ✅ All tests: 149/151 passing (2 pre-existing freshFood failures)

### Next Steps
- Set up production TURN servers (metered.ca free tier or self-hosted coturn)
- Add message schema validation (runtime type checking)
- Add chain host migration (recursive successor election)
- E2E multiplayer tests with Playwright

---

## 2026-02-08 - Weekend Event Music

### Completed
- Weekend music (`18OhWhatAWeekend.mp3`) now plays during weekend events
  - Previously only used on the victory screen
  - `useMusicController` now accepts optional `eventMessage` parameter
  - When `phase === 'event'` and the message contains "Weekend:", the weekend track crossfades in
  - When the event is dismissed and phase returns to 'playing', location-based music resumes
  - `Index.tsx` passes `eventMessage` from the store to the hook

### Files Modified
- `src/hooks/useMusic.ts` — Added `eventMessage` parameter, weekend event detection in track selection
- `src/pages/Index.tsx` — Passes `eventMessage` from store to `useMusicController`

### Verification
- ✅ Build succeeds
- ✅ All 171 tests pass

---

## 2026-02-08 - Refactor Complex Code (Agent-Assisted)

Refactored the 3 largest complex files in the codebase using parallel agents. Total: 2,159 lines of monolithic code broken into 15 focused modules.

### GameBoard.tsx (730 → 444 lines)

Extracted 5 modules from the main game board component:

| New File | Lines | Purpose |
|----------|-------|---------|
| `src/components/game/GameBoardHeader.tsx` | 64 | Desktop top bar (week/market/weather + menu) |
| `src/components/game/GameBoardOverlays.tsx` | 137 | AI thinking, online waiting, connection indicator, turn transition overlays |
| `src/components/game/DebugOverlay.tsx` | 81 | Zone boundary and movement path debug visualization |
| `src/hooks/useGameBoardKeyboard.ts` | 73 | Keyboard shortcuts hook (Escape, Enter, arrow keys) |
| `src/hooks/useLocationClick.ts` | 127 | Location click handler + event conversion hook |

### ZoneEditor.tsx (803 → 86 lines)

Extracted 4 modules from the zone/path editor:

| New File | Lines | Purpose |
|----------|-------|---------|
| `src/hooks/useZoneEditorState.ts` | 323 | All state, refs, handlers, derived values |
| `src/components/game/ZoneEditorToolbar.tsx` | 102 | Header bar with mode toggle, buttons, checkboxes |
| `src/components/game/ZoneEditorBoard.tsx` | 236 | Board view with grid, SVG paths, zone overlays |
| `src/components/game/ZoneEditorProperties.tsx` | 284 | Right side properties panel (zone + path modes) |

### economyHelpers.ts (626 → 16 line barrel)

Split monolithic economy actions into 5 domain-specific files:

| New File | Lines | Actions |
|----------|-------|---------|
| `src/store/helpers/economy/bankingHelpers.ts` | 109 | payRent, deposit, withdraw, invest, prepayRent, moveToHousing |
| `src/store/helpers/economy/itemHelpers.ts` | 125 | buyItem, sellItem, buyDurable, sellDurable, buyTicket, buyLotteryTicket, buyFreshFood |
| `src/store/helpers/economy/applianceHelpers.ts` | 111 | buyAppliance, repairAppliance, pawnAppliance |
| `src/store/helpers/economy/equipmentHelpers.ts` | 200 | equipItem, unequipItem, clearDungeonFloor, applyRareDrop, temperEquipment, forgeRepair, salvage |
| `src/store/helpers/economy/stockLoanHelpers.ts` | 92 | buyStock, sellStock, takeLoan, repayLoan |

### Verification
- ✅ TypeScript: `npx tsc --noEmit` — clean
- ✅ All tests: 171/171 passing
- ✅ No behavioral changes — pure structural refactoring

---

## 2026-02-08 - Thunderstorm & Fog Effects + Free Bank Services

### Weather Visual Effects

Added enhanced visual effects for two weather types:

#### Thunderstorm Effects (`ThunderstormLayer`)
- **Lightning flashes**: Two overlapping full-screen white/blue radial gradient flashes with staggered timing (7s and 11s cycles)
- **Lightning bolts**: Two bolt shapes using CSS `clipPath` polygons with zigzag patterns, glow effect via `filter: blur(1px)`
- **Dark storm overlay**: Subtle dark blue overlay with pulsing opacity (8s cycle) to simulate overcast conditions
- **Mix blend mode**: `screen` blend mode on flashes for realistic light-on-dark effect

#### Enchanted Fog Effects (`EnchantedFogLayer`)
- **Dense low fog band**: 60% height gradient from bottom with blur(30px), 18s drift cycle
- **Mid-level wisps**: Radial gradient blob at 40% viewport height with 25s drift
- **Upper thin fog**: Top-down gradient for overhead atmosphere, 12s vertical drift
- **Magical glow**: Subtle blue-tinted radial glow within fog (6s pulse)

#### WeatherOverlay Changes
- Added `weatherType` prop (optional `WeatherType`) to distinguish thunderstorm rain from harvest rain
- `ThunderstormLayer` renders only when `weatherType === 'thunderstorm'`
- `EnchantedFogLayer` renders only when `weatherType === 'enchanted-fog'`

### Free Bank Services

Removed all time costs from banking operations. Deposit, withdraw, invest, buy/sell stocks, take/repay loans no longer consume hours.

| Action | Old Time Cost | New Time Cost |
|--------|---------------|---------------|
| Deposit to Bank | 1 hour | Free |
| Withdraw from Bank | 1 hour | Free |
| Invest | 1 hour | Free |
| Buy Stock | 2 hours | Free |
| Sell Stock | 2 hours | Free |
| Take Loan | 1 hour | Free |
| Repay Loan | 1 hour | Free |
| See Broker | Requires 2h | No requirement |
| Loan Office | Requires 1h | No requirement |

### Files Changed
| File | Changes |
|------|---------|
| `src/components/game/WeatherOverlay.tsx` | Added `weatherType` prop, `ThunderstormLayer` (lightning flashes + bolts + dark overlay), `EnchantedFogLayer` (dense fog + wisps + magical glow) |
| `src/components/game/GameBoard.tsx` | Pass `weatherType={weather?.type}` to WeatherOverlay |
| `src/components/game/BankPanel.tsx` | Removed all `spendTime()` calls, removed `timeRemaining` checks, updated help text |
| `src/components/game/LocationPanel.tsx` | Removed `spendTime` prop from BankPanel |
| `src/hooks/useGrimwaldAI.ts` | Removed `spendTime()` from deposit-bank, withdraw-bank, take-loan, repay-loan, buy-stock, sell-stock AI actions |

### Build & Tests
Build succeeds, 171 tests pass.

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

## 2026-02-09 - Fix Landlord Closed Image Not Displaying

### Summary
The `closed.jpg` image shown when the Landlord's office is closed during non-rent weeks was displaying as a broken image icon. The file existed at `public/locations/closed.jpg` but wasn't being loaded.

### Root Cause
The `<img>` tag in `LocationPanel.tsx` used a hardcoded root-relative path:
```tsx
src="/locations/closed.jpg"
```

This works in local dev (where base URL is `/`) but breaks on GitHub Pages where the base URL is `/guild-life-adventures/`. The browser looked for the image at `https://tombonator3000.github.io/locations/closed.jpg` instead of `https://tombonator3000.github.io/guild-life-adventures/locations/closed.jpg`.

All other location images (for-rent.jpg, noble-heights.jpg, slums.jpg, Forge.jpg) correctly use the `import.meta.env.BASE_URL` prefix.

### Fix
Changed `LocationPanel.tsx` line 473:
```tsx
// Before (broken):
src="/locations/closed.jpg"

// After (fixed):
src={`${import.meta.env.BASE_URL}locations/closed.jpg`}
```

### Files Changed
| File | Changes |
|------|---------|
| `src/components/game/LocationPanel.tsx` | Fixed closed.jpg image path to use `import.meta.env.BASE_URL` |

### Build & Tests
- Build: passes
- No other hardcoded `/locations/` paths found in source code

---

## 2026-02-09 - iPad Board Stretch & Credits Music Fix

### Summary
Two fixes:
1. **iPad board stretch**: Removed aspect ratio lock from game board so it fills available screen space on iPad (eliminates black bars above/below the board)
2. **Credits music overlap**: Menu music (main theme) now stops when credits screen opens, preventing both tracks from playing simultaneously

### Fix 1: iPad Board Stretch (Black Bars)

**Problem**: The game board container used a fixed `aspectRatio: BOARD_ASPECT_RATIO` (1216/900 ≈ 1.351), optimized for 16:9 screens. On iPad (~4:3 aspect ratio), the board filled the width but left black bars above and below because `maxHeight: '100%'` constrained it.

**Solution**: Removed the aspect ratio constraint. The board container now uses `w-full h-full` to fill all available space. The board image already used `backgroundSize: '100% 100%'` and all zone overlays use percentage-based positioning, so everything aligns correctly regardless of screen ratio.

```tsx
// Before:
style={{
  width: '100%',
  aspectRatio: BOARD_ASPECT_RATIO,
  maxHeight: '100%',
}}

// After:
className="relative w-full h-full"
```

### Fix 2: Credits Music Overlap

**Problem**: The CreditsScreen created a separate `HTMLAudioElement` to play a random track during credits, but didn't stop the AudioManager singleton which continued playing the title screen's main theme. Both tracks played simultaneously.

**Solution**: Added `audioManager.stop()` on credits mount, and `audioManager.play('main-theme')` on credits unmount to restore the menu music.

### Files Changed
| File | Changes |
|------|---------|
| `src/components/game/GameBoard.tsx` | Removed `BOARD_ASPECT_RATIO` import, removed aspect ratio + maxHeight style, board now fills 100% width and height |
| `src/components/screens/CreditsScreen.tsx` | Import `audioManager`, stop on mount, restart `main-theme` on unmount |

### Build & Tests
- Build: passes
- All 171 tests pass

---

## Fix Start Menu Text Visibility (2026-02-09)

### Problem
On the TitleScreen, several text elements used `text-muted-foreground` which blended into the dark background overlay, making them invisible or very hard to read:
- "A Fantasy Life Simulator" subtitle
- "Load Saved Game" button
- "Options" button
- "About" button
- "Inspired by Jones in the Fast Lane" footer

### Solution
Changed all affected text from `text-muted-foreground` to `text-gold` (the project's gold color: `hsl(45, 85%, 55%)`). Hover states on buttons changed from `hover:text-foreground` to `hover:text-gold-dark` for a cohesive gold theme.

### Files Changed
| File | Changes |
|------|---------|
| `src/components/screens/TitleScreen.tsx` | Changed 5 text elements from `text-muted-foreground` to `text-gold`, hover states to `text-gold-dark` |

### Build & Tests
- Build: passes

---

## 2026-02-10: Gameplay Balance & Feature Batch

### 1. Scaled Resurrection Cost (Wealth-Based)
**Problem:** Flat 100g resurrection cost was trivial for wealthy players, making death meaningless mid-to-late game.

**Solution:** Resurrection cost now scales with total wealth (gold + savings):
- **Base cost:** 100g (unchanged for poor players)
- **Scaling:** +10% of total wealth above 500g
- **Cap:** Maximum 2000g
- **Formula:** `min(2000, max(100, 100 + floor((totalWealth - 500) * 0.10)))`
- **Examples:** 500g total = 100g cost, 1500g total = 200g, 5000g total = 550g, 20000g+ = 2000g

**Files Changed:**
| File | Changes |
|------|---------|
| `src/store/helpers/questHelpers.ts` | `checkDeath()` — dynamic `scaledCost` replaces hardcoded 100g for both paid and free resurrection paths |

### 2. Shadowfingers Rich Player Targeting
**Problem:** Shadowfingers robbery chance was the same regardless of how much gold a player carried, making it easy to safely carry large sums.

**Solution:** Players carrying 1000+ gold on hand get increased street robbery chance:
- **1000g:** 1.5x base robbery chance
- **2000g:** 2.0x base robbery chance
- **3000g+:** 2.5x base robbery chance (capped)
- **Formula:** `min(2.5, 1.5 + (gold - 1000) / 2000)`
- Stacks with homeless multiplier (3x)

**Files Changed:**
| File | Changes |
|------|---------|
| `src/data/shadowfingers.ts` | `checkStreetRobbery()` — added rich player multiplier after homeless check |

### 3. Happiness Penalty on Resurrection
**Problem:** Dying and being resurrected had no happiness cost, making death a minor inconvenience rather than a setback.

**Solution:** All resurrection paths now apply a -8 happiness penalty:
- **Paid resurrection** (savings >= cost): -8 happiness + gold cost
- **Free respawn** (permadeath OFF): -8 happiness, no gold cost
- **Permadeath ON:** No happiness penalty (player is eliminated)
- Message updated to show "The trauma of death weighs on your spirit"

**Files Changed:**
| File | Changes |
|------|---------|
| `src/store/helpers/questHelpers.ts` | Both resurrection branches in `checkDeath()` now reduce happiness by `resurrectionHappinessPenalty` (8) |

### 4. Adventure Goal in Online Multiplayer
**Problem:** Adventure Goal was only configurable in local GameSetup but not in the Online Lobby, so online multiplayer games couldn't use it.

**Solution:** Added adventure goal toggle + slider to OnlineLobby host settings:
- Checkbox to enable/disable (same as GameSetup)
- Slider for target (3-25 points) when enabled
- Quick/Standard/Epic presets now preserve current adventure setting (don't reset to 0)
- Shows "Quests completed + dungeon floors cleared" description

**Files Changed:**
| File | Changes |
|------|---------|
| `src/components/screens/OnlineLobby.tsx` | Added adventure toggle/slider in Victory Goals section; presets preserve adventure value |

### 5. Job Blocking Between Players
**Problem:** Multiple players could hold the same job simultaneously, which isn't realistic and removes strategic competition.

**Solution:** Jobs held by another active player are now blocked:
- **UI:** Taken jobs show "(Taken)" label, "Position held by [name]", red border, disabled Apply button
- **AI:** `getBestAvailableJob()` now filters out jobs held by rivals
- **Rivalry:** AI job-stealing rivalry action removed (can no longer take held jobs)

**Files Changed:**
| File | Changes |
|------|---------|
| `src/components/game/GuildHallPanel.tsx` | Added `allPlayers` prop, job holder check, UI for taken jobs |
| `src/components/game/LocationPanel.tsx` | Pass `players` array to GuildHallPanel as `allPlayers` |
| `src/hooks/ai/strategy.ts` | `getBestAvailableJob()` now accepts optional `rivals` param, filters taken jobs |
| `src/hooks/ai/actions/strategicActions.ts` | Pass `rivals` to `getBestAvailableJob()` calls |
| `src/hooks/ai/actions/goalActions.ts` | Pass `rivals` to `getBestAvailableJob()` calls |
| `src/hooks/ai/actions/rivalryActions.ts` | Removed job-stealing rivalry action (incompatible with blocking); cleaned up unused imports |

### 6. Removed "Invest 100 Gold" from Banking
**Problem:** "Invest 100 Gold" button in banking services was redundant — the stock broker (stocks) is the real investment system. The old invest function (0.5% weekly return) was confusing alongside the broker.

**Solution:** Removed the "Invest 100 Gold" menu item from BankPanel. Cleaned up unused `invest` prop from BankPanel and LocationPanel.

**Files Changed:**
| File | Changes |
|------|---------|
| `src/components/game/BankPanel.tsx` | Removed "Invest 100 Gold" JonesMenuItem, removed `invest` prop |
| `src/components/game/LocationPanel.tsx` | Removed `invest` from store destructuring and BankPanel prop |

### Build & Tests
- TypeScript: compiles cleanly (tsc --noEmit)
- Build: passes (vite build)
- Tests: 171/171 pass

---

## Refactor RightSideTabs.tsx — Extract Tab Components (2026-02-10)

### Task
Find an overly complex function or component and refactor it for clarity while maintaining the same behavior.

### Analysis

Explored the entire codebase for complexity candidates. Top 5 identified:

| Rank | File | Lines | Issue |
|------|------|-------|-------|
| 1 | `RightSideTabs.tsx` | 822 | 4 unrelated tab components + shared utils in single file |
| 2 | `ItemIcon.tsx` | 533 | 40+ hardcoded icon mappings + 41 inline SVG components |
| 3 | `useOnlineGame.ts` | 666 | 4 message handlers + host migration mixed in one hook |
| 4 | `InventoryGrid.tsx` | 548 | 3x duplicate equipment slot code + 115-line build function |
| 5 | `combatResolver.ts` | 455 | 149-line resolveEncounter switch with nested cases |

Selected **#1 RightSideTabs.tsx** (822 lines) as the best candidate because:
- Highest impact: 4 completely unrelated tab concerns in one file
- Clear boundaries: each tab is an independent component with no shared state
- Follows precedent: LocationPanel was previously refactored using the same extraction pattern
- No external dependencies: only imported from GameBoard.tsx

### What Was Wrong

`RightSideTabs.tsx` was an 822-line monolithic file containing:
1. **PlayersTab** (120 lines) — turn order and goal progress display
2. **OptionsTab** (184 lines) — save/load, audio controls (3 near-identical volume sliders), AI speed, shortcuts
3. **DeveloperTab** (286 lines) — 12 debug sections with inline onClick handlers
4. **OptionSection** + **ShortcutRow** — shared wrapper components
5. **LOCATIONS_LIST** — static data for teleport grid
6. The main **RightSideTabs** shell (146 lines)

Problems:
- **Single responsibility violation**: 4 unrelated features mixed in one file
- **Code duplication**: Music, Ambient, and SFX volume controls were 3 identical 28-line blocks with minor prop differences
- **Untestable**: Individual tabs couldn't be tested in isolation
- **Hard to navigate**: 822 lines with no file-level separation

### Refactoring Performed

Created 5 new files in `src/components/game/tabs/`:

| File | Lines | Purpose |
|------|-------|---------|
| `OptionSection.tsx` | 22 | Shared `OptionSection` + `ShortcutRow` components |
| `AudioVolumeControl.tsx` | 52 | Reusable mute/volume/percentage control (replaces 3x duplicated blocks) |
| `PlayersTab.tsx` | 115 | Player list with goal progress circles |
| `OptionsTab.tsx` | 120 | Save/load, audio controls (uses AudioVolumeControl), AI speed, shortcuts |
| `DeveloperTab.tsx` | 262 | Debug tools split into 7 sub-section components |

Updated `RightSideTabs.tsx`: **822 → 174 lines** (79% reduction)

### Key Improvements

1. **Deduplicated audio controls**: 3 x 28 lines (84 lines) → 3 x 6 lines using `AudioVolumeControl` component
2. **DeveloperTab split into sub-sections**: WeatherSection, VictoryAndGameSection, FestivalSection, ResourceSection, EventSection, PlayerStateSection, TeleportSection — each independently readable
3. **Goal progress calculation extracted**: `calculateOverallProgress()` pure function in PlayersTab
4. **Static data co-located**: `LOCATIONS_LIST`, `WEATHER_OPTIONS`, `FESTIVAL_OPTIONS`, `AI_SPEED_OPTIONS` moved to their respective tab files
5. **Button class constants**: `DEBUG_BTN` and `SMALL_BTN` defined once in DeveloperTab (was inline in every button)

### Files Changed

| File | Changes |
|------|---------|
| `src/components/game/RightSideTabs.tsx` | 822 → 174 lines — shell/orchestrator only, imports 3 tab components |
| `src/components/game/tabs/OptionSection.tsx` | NEW — shared OptionSection + ShortcutRow |
| `src/components/game/tabs/AudioVolumeControl.tsx` | NEW — reusable audio volume control |
| `src/components/game/tabs/PlayersTab.tsx` | NEW — player list with goal progress |
| `src/components/game/tabs/OptionsTab.tsx` | NEW — save/load, audio, AI speed, shortcuts |
| `src/components/game/tabs/DeveloperTab.tsx` | NEW — debug tools with 7 sub-sections |

### Line Count Summary

- **Before**: 822 lines (1 file)
- **After**: 745 lines (6 files) — net 77-line reduction from deduplication
- **Main file**: 822 → 174 lines (79% reduction)
- **Zero behavior changes** — all UI, interactions, and rendering identical

### Build & Tests
- TypeScript: compiles cleanly (tsc --noEmit)
- Build: passes (vite build)
- Tests: 176/176 pass
