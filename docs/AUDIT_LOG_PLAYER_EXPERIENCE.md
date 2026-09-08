# Player experience changes — 2026-09-08

Base: `ad836771b913f7e1915ba550aa44bbdda39dfc7d` (main, PR #412).

The request covered ten connected gameplay and presentation problems. The referenced attachments were not available in this conversation. Existing runtime scenes and inventory data supplied the visual and behavioral baseline. “Side børs” was interpreted as sidebars.

| Request | Implementation |
|---|---|
| Rent / moving | Only 1 and 4 weeks, validated in the UI, store and online action protocol. Paying and changing housing use zero hours, including when no hours remain. Existing landlord opening weeks and deposits are retained. |
| Furnished homes | Two new painted rooms and sixteen transparent object assets, tied to fixed room surfaces. Durables and books now appear as well as appliances. Broken objects remain visible and explain repair when selected. |
| End Turn | One permanent action at the upper right of the central panel. It stays visible at locations and during events, with turn ownership, movement and event gating. Retired duplicate overview/mobile/fullboard buttons. |
| Career information | Removed the workplace “View career” block. Guild Hall keeps employer job paths, requirements and applications. |
| Armory | One row per item with one purchase/equip control. Purchases equip their matching slot atomically; previous gear stays owned. Wardrobe storage uses a single optional mode. |
| Graduation | Play the existing graduation sound when a new completed degree arrives on the human player's state. Rejected graduation, rerenders, initial load and changing players do not trigger it. |
| Dividends | Verified the existing settlement adds cash and carries fractional credit. Added named payout reporting, earned-gold accounting and a saved reconciliation receipt. Clone stock holdings before settlement to preserve previous immutable state. |
| Herald | Newspaper masthead, woodcuts, readable typography and page controls. Records use actual completed turns, payouts, weather and festivals. Public job notices filter occupied exclusive jobs. Tavern fiction is labeled. Opening/reopening the paper uses a local deterministic seed, not gameplay RNG. |
| Music | A squared gain curve makes low slider settings quiet. Both crossfade decks honor current volume and mute on every tick; stopping/starting cannot leave an old timer clearing a new track. |
| Sidebars | Essential resources stay visible; character and financial detail expand on demand. Each player has a compact progress card and their actual last completed action. Removed the duplicate goals footer and warning pulses. |

## Time rule assessment

Shopping/banking are already zero-hour errands in the primary services. Rent and changing housing now follow that rule. Travel, work, study, rest, training and adventures retain their activity costs: making recovery or study free would allow unlimited same-turn healing/education and alter the game's progression. Pleading with the landlord remains a one-hour activity. This change does not rebalance those systems.

## Findings and corrections during review

- The reported missing dividends were not reproduced as an absent cash credit. Net weekend expenses can hide the increase, and the previous message did not identify the recipient. Receipt fields are optional for old saves.
- The original music fade captured volume and could overwrite a later mute/slider change. Low linear gain also made 9% much louder than expected. At 9%, the new music gain is 0.0081.
- The existing graduation effect was configured but not dispatched from successful completion.
- A fixed turn toolbar reduced available location height. Guild Hall offer actions now use the existing action dock so accepting a job remains reachable.
- The first room atlas extraction included neighboring-row pixels. Crops were corrected to each object's alpha bounds before runtime review.

## Validation

Final validation and screenshot evidence are recorded below before delivery. The extended app TypeScript check has 185 existing errors on the base revision; the changed application introduces no additional diagnostics. The repository's configured `check:types` is also run as its required gate.

Physical device audio output and the missing user attachments cannot be verified by automated viewport or gain tests. No production deployment or merge is included in this branch.
