# Guild Life Adventures - Event Catalog

Complete list of all 103 events/random occurrences in the game.

---

## A. Weather Events (src/data/weather.ts)

~8% chance per week, duration 1-3 weeks. Guarded by `enableWeatherEvents` option.

| # | Weather Type | Effects | Visual |
|---|-------------|---------|--------|
| 1 | **Snowstorm** | +1 movement cost, +10% prices, -2 happiness/wk, 50% less robbery | Snow particles |
| 2 | **Thunderstorm** | +1 movement cost, +5% prices, -1 happiness/wk, +50% robbery | Rain + lightning |
| 3 | **Drought** | +15% prices, -2 happiness/wk, 25% food spoilage chance | Heat shimmer |
| 4 | **Enchanted Fog** | +1 movement cost, -5% prices, +3 happiness/wk, +20% robbery | Fog layers |
| 5 | **Harvest Rain** | -10% prices, +2 happiness/wk | Light rain |

### Weather-Festival Conflicts

Certain weather types are suppressed when a conflicting festival is active (festival takes priority):

- `drought` cannot co-occur with `harvest-festival`
- `snowstorm` cannot co-occur with `midsummer-fair` or `harvest-festival`

---

## B. Seasonal Festivals (src/data/festivals.ts)

Deterministic every 12 weeks, rotating in order. Guarded by `enableFestivals` option.

| # | Festival | Week | Effects |
|---|---------|------|---------|
| 6 | **Harvest Festival** | 12, 60, 108... | +5 happiness, -15% prices |
| 7 | **Winter Solstice** | 24, 72, 120... | +3 happiness, +2 study sessions, +3 dependability |
| 8 | **Spring Tournament** | 36, 84, 132... | +3 happiness, +50% dungeon gold |
| 9 | **Midsummer Fair** | 48, 96, 144... | +5 happiness, +10g, +15% wages |

---

## C. Shadowfingers Robbery (src/data/shadowfingers.ts)

| # | Event | Trigger | Chance |
|---|-------|---------|--------|
| 10 | **Street Robbery (Bank)** | Leaving bank with gold, week >= 4 | ~3.2% (x3 if homeless, x1.5-2.5 if 1000g+) |
| 11 | **Street Robbery (Shadow Market)** | Leaving shadow market with gold, week >= 4 | ~2% (x3 if homeless) |
| 12 | **Apartment Robbery** | Living in slums with durables, per turn | 1/(relaxation+1), ~2-9% |

---

## D. Weekly Theft (src/data/events.ts - checkWeeklyTheft)

| # | Event | Condition | Chance | Effect |
|---|-------|-----------|--------|--------|
| 13 | **Shadowfingers Theft** | Homeless/slums, 20+ gold | 25% (x1.5 if homeless) | -50g, -3 happiness |
| 14 | **Shadowfingers Major Heist** | Homeless/slums, 100+ gold | 10% (x1.5 if homeless) | -100g, -5 happiness |

---

## E. Random Location Events (src/data/events.ts - checkForEvent)

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

---

## F. Market Crash Events (src/data/events.ts - checkMarketCrash)

Only during recession trend + low economy (priceModifier < 0.9).

| # | Event | Chance | Effect |
|---|-------|--------|--------|
| 26 | **Pay Cut** | 5% per week during recession | -20% wages, -10 happiness |
| 27 | **Layoff** | 3% per week during recession | Lose job, -20 happiness |

---

## G. Travel Events (src/data/travelEvents.ts)

10% chance on trips of 3+ steps. Weighted random selection.

| # | Event | Type | Effect | Weight |
|---|-------|------|--------|--------|
| 28 | **Found Coin Purse** | Positive | +15-34g, +2 happiness | 3 |
| 29 | **Wandering Merchant** | Positive | +3 happiness, +5 HP | 2 |
| 30 | **Hidden Shortcut** | Positive | +2 hours saved, +1 happiness | 2 |
| 31 | **Street Bard** | Positive | +5 happiness, -1 hour | 3 |
| 32 | **Pickpocket** | Negative | -10 to -30g, -3 happiness | 2 |
| 33 | **Muddy Road** | Negative | -5 HP, -2 happiness, -1 hour | 2 |
| 34 | **Took a Wrong Turn** | Negative | -1 happiness, -2 hours | 2 |
| 35 | **Aggressive Stray Dog** | Negative | -3 HP, -2 happiness, -1 hour | 1 |
| 36 | **Injured Traveler** | Mixed | +10g, +4 happiness, -2 hours | 2 |
| 37 | **Old Map Fragment** | Mixed | +25g, +3 happiness, -3 hours | 1 |

---

## H. Weekend Events (src/data/weekends.ts)

One activity selected each week-end in processWeekEnd. Priority: tickets > durable > random.

### Ticket Weekends (purchased at Rusty Tankard)

| # | Event | Ticket Cost | Happiness |
|---|-------|-------------|-----------|
| 38 | **Jousting Tournament** | 25g | +8 |
| 39 | **Theatre Performance** | 40g | +10 |
| 40 | **Bard Concert** | 50g | +12 |

### Durable Weekends (20% chance per owned non-broken appliance)

| # | Event | Appliance | Happiness | Cost |
|---|-------|-----------|-----------|------|
| 41 | **Scrying Session** | Scrying Mirror | +3 | 0g |
| 42 | **Memory Crystal Replay** | Memory Crystal | +3 | 0g |
| 43 | **Music Box Concert** | Music Box | +4 | 0g |
| 44 | **Cooking Weekend** | Cooking Fire | +3 | 5g |
| 45 | **Arcane Study** | Arcane Tome | +2 | 0g |

### Random Weekends (fallback, weighted selection: expensive 3x, medium 2x, cheap 1x)

#### Cheap (0-15g, +1 to +3 happiness)

| # | Activity | Cost | Happiness |
|---|---------|------|-----------|
| 46 | Walk in the Park | 5g | +2 |
| 47 | Fishing at the River | 5g | +2 |
| 48 | Market Browsing | 8g | +2 |
| 49 | Street Food Tour | 10g | +3 |
| 50 | Long Nap | 0g | +2 |
| 51 | People Watching | 3g | +1 |
| 52 | Card Game | 10g | +3 |
| 53 | Tended a Garden | 5g | +2 |
| 54 | Ales at the Tavern | 15g | +3 |
| 55 | Campfire Stories | 5g | +2 |

#### Medium (15-55g, +3 to +6 happiness)

| # | Activity | Cost | Happiness |
|---|---------|------|-----------|
| 56 | Weekend Feast | 25g | +5 |
| 57 | Horse Riding | 20g | +4 |
| 58 | Archery Contest | 15g | +4 |
| 59 | Fortune Teller | 30g | +4 |
| 60 | Bathhouse Visit | 20g | +5 |
| 61 | Arena Spectacle | 35g | +6 |
| 62 | River Cruise | 30g | +5 |
| 63 | Town Dance | 15g | +4 |
| 64 | Museum Visit | 20g | +3 |
| 65 | Countryside Picnic | 25g | +5 |

#### Expensive (50-100g, +7 to +12 happiness, available after week 8)

| # | Activity | Cost | Happiness |
|---|---------|------|-----------|
| 66 | Grand Ball | 80g | +10 |
| 67 | Royal Spa Day | 60g | +8 |
| 68 | Noble Hunt | 70g | +8 |
| 69 | Boat Cruise | 50g | +7 |
| 70 | Royal Banquet | 100g | +12 |
| 71 | Grand Magic Show | 55g | +8 |

#### Fallback

| # | Activity | Cost | Happiness |
|---|---------|------|-----------|
| 72 | Stayed Home | 0g | +1 |

---

## I. Dungeon Random Modifiers (src/data/dungeon/floors.ts)

One modifier per dungeon run (random selection).

| # | Modifier | Effect |
|---|---------|--------|
| 73 | **Cursed Halls** | +30% damage taken, +50% gold |
| 74 | **Lucky Day** | +25% rare drop, +25% gold |
| 75 | **Blood Moon** | Enemies +50% power, +100% gold, no healing encounters |
| 76 | **Echoing Darkness** | Traps can't be disarmed, +20% gold |
| 77 | **Blessed Ground** | -20% damage taken, +50% healing |
| 78 | **Fortune's Favor** | Treasure 2x gold, +50% rare drop |
| 79 | **Weakened Wards** | Enemies -30% power, -30% gold |

---

## J. Doctor Visit Events (src/store/helpers/startTurnHelpers.ts)

Triggered at turn start under specific conditions. Cost: 30-200g random.

| # | Event | Trigger | Chance | Effect |
|---|-------|---------|--------|--------|
| 80 | **Starvation Doctor Visit** | Food = 0, no fresh food | 25% | -30 to -200g, -10 hours, -4 happiness |
| 81 | **Spoiled Food Doctor Visit** | Fresh food spoils (drought) | 25% | -30 to -200g, -10 hours, -4 happiness |
| 82 | **Exhaustion Doctor Visit** | Relaxation <= 15 | 20% | -30 to -200g, -10 hours, -4 happiness |

---

## K. Weekly Passive Events (src/store/helpers/weekEndHelpers.ts)

| # | Event | Trigger | Chance | Effect |
|---|-------|---------|--------|--------|
| 83 | **Random Sickness** | Any player | 5%/week | Sick status, -15 HP |
| 84 | **Clothing Degradation** | Every 8 weeks | 100% | -25 clothing condition |
| 85 | **Lottery Win (Grand)** | Has lottery tickets | 0.1%/ticket | +500g, +25 happiness |
| 86 | **Lottery Win (Small)** | Has lottery tickets | 5.9%/ticket | +20g, +5 happiness |
| 87 | **Appliance Breakage** | Own appliances | 1/51 (enchanter), 1/36 (market) | Appliance becomes broken |
| 88 | **Eviction** | 8 weeks unpaid rent | 100% | Lose all possessions, -30 happiness |
| 89 | **Job Firing** | Dependability < 20 | 100% | Lose job |
| 90 | **Stock Market Crash** | Recession trend | 10%/week | All stock prices plummet |

---

## L. Age Events (src/store/helpers/weekEndHelpers.ts)

Guarded by `enableAging` option. Birthdays every 4 weeks.

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 91 | **Birthday Milestone (21)** | Age 21 | +5 happiness |
| 92 | **Birthday Milestone (25)** | Age 25 | +2 max HP |
| 93 | **Birthday Milestone (30)** | Age 30 | +5 happiness, +5 dependability |
| 94 | **Birthday Milestone (40)** | Age 40 | -2 max HP, +3 happiness |
| 95 | **Birthday Milestone (50)** | Age 50 | -5 max HP, +5 happiness |
| 96 | **Elder Decay** | Age 60+ birthday | -3 max HP per birthday (floor at 10) |
| 97 | **Health Crisis** | Age 50+, weekly | 3% chance, -15 HP |

---

## M. Death & Resurrection Events

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 98 | **Death** | HP reaches 0 | Game over or resurrection |
| 99 | **Paid Resurrection** | Dead + 100g+ savings | -100g base (scales with wealth, max 2000g), +50 HP, -8 happiness |
| 100 | **Free Respawn** | Dead, no savings, permadeath OFF | 20 HP at graveyard, -8 happiness |
| 101 | **Permanent Death** | Dead, no savings, permadeath ON | Game over |

---

## N. Starvation & Homeless Penalties (Turn Start)

| # | Event | Trigger | Effect |
|---|-------|---------|--------|
| 102 | **Starvation** | Food = 0 at turn start | -20 hours |
| 103 | **Homeless Penalties** | No housing | -5 HP, -8 hours, 3x robbery chance |

---

## Summary

| Category | Count | Source File(s) |
|----------|-------|----------------|
| A. Weather Events | 5 | `src/data/weather.ts` |
| B. Seasonal Festivals | 4 | `src/data/festivals.ts` |
| C. Shadowfingers Robbery | 3 | `src/data/shadowfingers.ts` |
| D. Weekly Theft | 2 | `src/data/events.ts` |
| E. Random Location Events | 11 | `src/data/events.ts` |
| F. Market Crash Events | 2 | `src/data/events.ts` |
| G. Travel Events | 10 | `src/data/travelEvents.ts` |
| H. Weekend Events | 35 | `src/data/weekends.ts` |
| I. Dungeon Modifiers | 7 | `src/data/dungeon/floors.ts` |
| J. Doctor Visit Events | 3 | `src/store/helpers/startTurnHelpers.ts` |
| K. Weekly Passive Events | 8 | `src/store/helpers/weekEndHelpers.ts` |
| L. Age Events | 7 | `src/store/helpers/weekEndHelpers.ts` |
| M. Death & Resurrection | 4 | Various |
| N. Starvation & Homeless | 2 | `src/store/helpers/startTurnHelpers.ts` |
| **Total** | **103** | |

---

*Last updated: 2026-02-10*
