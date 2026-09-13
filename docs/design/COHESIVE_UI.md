# Guild Life - one interface language

## Brief and reference

Tom requested a Gauntlet/brainstorming review of **all menus, UI and UX**. Continue
the approved gold/parchment Guildhall direction from #420. Baseline main is
`6d62e4d7e6b2a590e0d01a1e3544cf1f883905d0`, tree
`34f1ec3a227191d3e57f9e360f840df377b37c1e`. The local source started from the identical
PR tree. Desktop and tablet lead; phones remain supported. Original city, board,
characters, inventories, rules and saves are the canonical game.

The live title and Options were inspected before editing. The title's engraved
brass and city composition are the reference; the Options capture showed a narrow
512 px panel, dark gray controls on parchment, small type and an unnamed close
button. The manual source exposed 16 chapters in a horizontal strip. Source review
also found several bespoke modal wrappers and a required quest choice with a Close
button wired to a no-op.

## Brainstorm and decision

| Approach | Useful quality | Problem | Decision |
| --- | --- | --- | --- |
| Parchment everywhere | Simple consistency | Removes the city's atmosphere and location identity | Keep for readable content only |
| Shared brass, wood and parchment | Recognizable actions and navigation across distinct places | Requires shared components and semantic states | Selected; extends the approved reference |
| A 3D interface throughout | Depth and motion | Adds loading, GPU use and control complexity without solving the found problems | Retain existing optional title compass only |

Native HTML/CSS renders the actual controls; the existing vellum art supplies
material texture. No new art, fonts, runtime dependencies or renderer is needed.
This is an implementation, not a new concept image or a replacement board.

## Design contract

- **Gold**: the main action or selected service. **Parchment**: secondary choices.
  **Burgundy/red**: danger, losses or destructive actions. Dark wood/brass frames
  establish hierarchy; text on parchment is dark ink. Local magical/market accents
  keep their meaning.
- Display face for headings and short actions; body face for explanations and
  costs. System menus inherit the actual saved text-size preference even when
  portaled. Numbers, hours, prices and reasons for unavailable actions remain real.
- System dialogs share a header, named Close control, one reading area and a
  reachable footer. Escape closes the top dialog; Tab stays inside; closing returns
  focus to the opener. In-board location and event content stays in the center.
- Large support actions are 48 px, Close controls 44 px. Existing compact board
  layouts keep their own geometry and usable paging. No hover scale on decorative
  wood frames or transaction rows.
- Long lists retain native vertical touch scrolling and Previous/Next paging in
  the board. Desktop manual chapters are visible in a two-column index; narrower
  layouts use a labelled chapter selector. No horizontal chapter strip.
- All Options is available from quick in-game settings. Quick audio/AI controls
  remain available while playing and operate on the same existing saved state.
- About opens readable credits immediately. Rolling credits are optional and
  stop for reduced motion/hidden tabs. Credits music respects music mute/volume.

## Coverage map

| Area | Canonical components / coverage | Treatment |
| --- | --- | --- |
| Title, continue, setup, portrait picker, presets | TitleScreen, GameSetup, PortraitPicker, GuildSeal | Preserve approved composition; unify Load Game and shared Close |
| Options and quick settings | OptionsMenu, OptionsTab, OptionSection, AudioVolumeControl, EnvironmentControl | Common dialog and material; named switches/sliders, visible selections, reset/update disclosure, All Options entry |
| Save/load and return | SaveLoadMenu, title Load Game | Common slots and frame; Resume primary; explicit overwrite/delete confirmation in game menu |
| Manual, news, credits, rankings | UserManual, ChangelogScreen, CreditsScreen, HighScoreScreen | Shared frame, text scaling, navigation, focus; keep source content and ranking behavior |
| Online menu, creation, join, browse, host/guest/spectator lobbies | OnlineLobby, ChatPanel, EmotePanel | Readable heading, same material/actions, labels; no protocol/routing change |
| HUD, sidebars, character, rivals, awards | TopDropdownMenu, MobileHUD, RightSideTabs, SideInfoTabs, CharacterPanel, MobileDrawer | Consistent brass/action states; preserve center character panel and fullboard/sidebars |
| All 15 city locations and every visible service | LocationShell, LocationPages, locationTabFactories | Shared selected tabs, paging, headings; preserve NPC scenes and wrapped navigation |
| Bank, broker, loans and financial overview | BankPanel | Shared gold transactions and existing authoritative previews/receipts |
| Shops, Academy, Guild Hall, Landlord, tavern, Forge, healer, magic, Fence, graveyard | JonesStylePanel, ActionButton and existing location-specific panels | Shared secondary rows, material and action/cost/time treatment; keep local intent and prices |
| Home, inventory, work, favors, This Week | HomePanel, InventoryGrid, WorkplaceCard, NpcFavorPanel, CityActivityPanel, ThisWeek | Retain painted items and working layouts; shared actions/material where used |
| Cave, combat, records, quests | CavePanel, CombatView, QuestPanel, ChainChoiceModal | Preserve reviewed Cave; required branch choice occupies current quest page without a dead Close button |
| News/events, curses, theft, death, turn privacy, spectator | NewspaperModal, EventPanel, Curse panels, ShadowfingersModal, DeathModal, TurnTransition, SpectatorPanel | Preserve distinctive story/danger views and original routing; shared gold actions; death/privacy remain purposeful overlays |
| Results, statistics, local/world submission | VictoryScreen, PostGameStats, VictoryGoalMatrix, PerformanceStandings, HighScorePanel | Same action hierarchy and parchment; keep voluntary submission and real results |
| Developer tools | ZoneEditor, DeveloperTab, DebugOverlay | Functional tool UI retained; outside player-facing restyling scope |

## Acceptance and verification

1. Title → Options → nested Manual → back returns to the correct control. All
   option categories have names and selected state; text sizing reaches dialogs.
2. Load, news, scores and credits fit desktop 1440×900, tablet 1024×768 / 768×1024
   and phone 390×844, with usable controls, no horizontal clipping and Escape.
3. All 15 locations and their visible service tabs remain inside the existing
   board. Save → change state → load, banking, jobs, Cave and online journeys pass.
4. Inspect actual runtime captures. Correct visual findings rather than treating
   compilation or this inventory as visual proof.
5. Preserve the existing build/type/unit/browser/balance/audio gates. No new
   constant animation or additional 3D workload; physical sustained 60 fps remains
   unverified unless measured on target hardware.

The supplied browser blocked the local URL (`ERR_BLOCKED_BY_CLIENT`). Hosted
baseline inspection worked. New browser journeys run in the existing GitHub
validation workflow; its runtime capture artifact is the visual review source.
See `docs/qa/cohesive-ui/README.md` for findings and revision-specific evidence.
