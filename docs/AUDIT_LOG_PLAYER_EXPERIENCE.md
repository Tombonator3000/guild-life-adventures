# Player experience changes — 2026-09-08

Base: `ad836771b913f7e1915ba550aa44bbdda39dfc7d` (main, PR #412).

Validated runtime: `2d73680bb59f728adc613db7624b3766631b716a`. Its Git tree is identical to locally validated revision `1e57f7a6d4d58ac20cd2ff627a1f2c1b29c31e22`: `8896274fbf8dda2eea54ac282df665e9cbb21b4d`. This documentation checkpoint does not change runtime code.

The request covered ten connected gameplay and presentation problems. The referenced attachments were not available in this conversation. Existing runtime scenes and inventory data supplied the visual and behavioral baseline. “Side børs” was interpreted as sidebars.

| Request | Implementation |
|---|---|
| Rent / moving | Only 1 and 4 weeks, validated in the UI, store and online action protocol. Paying and changing housing use zero hours, including when no hours remain. Existing landlord opening weeks and deposits are retained. |
| Furnished homes | Two new painted rooms and sixteen transparent object assets, tied to fixed room surfaces. Durables and books now appear as well as appliances. Broken objects remain visible and explain repair when selected. |
| End Turn | One permanent action at the upper right of the central panel. It replaces the location heading without reducing usable content height and stays visible during events, with turn ownership, movement and event gating. Retired duplicate overview/mobile/fullboard buttons. |
| Career information | Removed the workplace “View career” block, the legacy Forge job catalogue and its redundant Careers tab. Guild Hall keeps employer job paths, requirements and applications. |
| Armory | One row per item with one purchase/equip control. Purchases equip their matching slot atomically; previous gear stays owned. Wardrobe storage uses a single optional mode. |
| Graduation | Play the existing graduation sound when a new completed degree arrives on the human player's state. Rejected graduation, rerenders, initial load and changing players do not trigger it. |
| Dividends | Verified the existing settlement adds cash and carries fractional credit. Added named payout reporting, earned-gold accounting and a saved reconciliation receipt. Clone stock holdings before settlement to preserve previous immutable state. |
| Herald | Newspaper masthead, woodcuts, readable typography and page controls. Records use actual completed turns, payouts, weather and festivals. Public job notices filter occupied exclusive jobs. Tavern fiction is labeled. Opening/reopening the paper uses a local deterministic seed, not gameplay RNG. |
| Music | A squared gain curve makes low slider settings quiet. Both crossfade decks honor current volume and mute on every tick; stopping/starting cannot leave an old timer clearing a new track. |
| Sidebars | Essential resources stay visible; character and financial detail expand on demand. Each player has a compact progress card and their actual last completed action. Removed the duplicate goals footer and warning pulses. |

## Time rule assessment

Shopping/banking are already zero-hour errands in the primary services. Rent and changing housing now follow that rule. Travel, work, study, rest, training and adventures retain their activity costs: making recovery or study free would allow unlimited same-turn healing/education and alter the game's progression. Pleading with the landlord remains a one-hour activity. At zero hours, living human players keep access to free actions at their current location and finish with End Turn; the previous automatic timer would return them home before they could complete those errands. AI time exhaustion and automatic progression after death are retained. This change does not rebalance activity costs.

## Findings and corrections during review

- The reported missing dividends were not reproduced as an absent cash credit. Net weekend expenses can hide the increase, and the previous message did not identify the recipient. Receipt fields are optional for old saves.
- The original music fade captured volume and could overwrite a later mute/slider change. Low linear gain also made 9% much louder than expected. At 9%, the new music gain is 0.0081.
- The existing graduation effect was configured but not dispatched from successful completion.
- A separate turn toolbar reduced available location height. It now replaces the existing location heading. Guild Hall offer actions also use the existing action dock, so accepting a job remains reachable.
- Browser checks caught rounded page widths accumulating position error across long menus and producing a blank final newspaper page. Pagination preserves fractional CSS widths and tolerates scroll-width rounding.
- The player-progress helper returns percent already; the sidebar uses that unit directly. Object labels use catalogue names, including Tome of All Knowledge and Enchanted Music Box.
- The dividend receipt opens from the company row, leaving trading controls available on short screens.
- The first room atlas extraction included neighboring-row pixels. Crops were corrected to each object's alpha bounds before runtime review.

## Validation

| Check | Result |
|---|---|
| Bun 1.3.14 / frozen dependency install | Passed; no lockfile change |
| Configured TypeScript check | Passed |
| Unit/component/network tests | 764 passed across 101 files |
| Production build | Passed |
| ESLint | 0 errors; 27 inherited warnings |
| Extended app TypeScript comparison | 185 existing errors; no added diagnostics |
| FFmpeg/FFprobe audio audit | 42 files; no silent, invalid or duplicate assets |
| Browser journeys | All 35 scenarios pass: 34 in the full run; one developer-menu activation timeout passed on isolated retry. The final overview adjustment additionally passed all 3 viewport journeys; the Forge/Guild Hall cleanup passed both dedicated journeys. |

Screenshots from the actual application are retained under `docs/qa/player-experience`. The browser matrix includes 390×844, 844×390, 1280×720 and existing tablet/touch tests, plus save/load, online synchronization, purchases, zero-hour errands and complete newspaper pagination. The home assets total 1.34 MB for both rooms and all props; each scene uses at most seventeen static raster images and introduces no animation loop.

Physical device audio output and the missing user attachments cannot be verified by automated viewport or gain tests. No production deployment or merge is included in this branch.


## Runtime screenshots

| Surface | Evidence |
|---|---|
| Slums before and after purchases | [Empty](qa/player-experience/slums-empty-desktop.webp) · [Furnished](qa/player-experience/slums-furnished-desktop.webp) |
| Noble Heights | [Desktop](qa/player-experience/noble-desktop.webp) · [Phone](qa/player-experience/noble-phone.webp) · [Landscape](qa/player-experience/noble-landscape.webp) |
| Forge without a duplicate career catalogue | [Work and wage controls](qa/player-experience/forge-work-desktop.webp) |
| Armory auto-equipment | [Phone](qa/player-experience/armory-phone.webp) |
| Herald | [Desktop](qa/player-experience/herald-desktop.webp) · [Phone](qa/player-experience/herald-phone.webp) · [Landscape](qa/player-experience/herald-landscape.webp) · [Final page](qa/player-experience/herald-last-page.webp) |
| Cash reconciliation | [Dividend receipt](qa/player-experience/dividend-receipt.webp) |
| Overview and sidebars | [All four goals remain visible](qa/player-experience/overview-desktop.webp) |

[Machine-readable validation record](qa/player-experience/validation.json).

## Delivery status

Local implementation and review are complete. Automatic approval review initially rejected the GitHub upload because external publication had not been explicitly authorized. The owner then explicitly approved uploading the tested branch and opening a PR on 2026-09-08.

Delivery uses the connected GitHub account because the local Git transport has no credentials. The uploaded runtime tree was checked against the tested local tree and matches exactly. GitHub Actions results belong to the PR; the validation figures above record the local runs. No merge or deployment was performed.
