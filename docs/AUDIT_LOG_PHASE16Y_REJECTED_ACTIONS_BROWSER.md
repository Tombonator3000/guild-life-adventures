# Phase 16Y audit — rejected online action recovery

Date: 27 July 2026
Issue: #394

## Scope

This tranche proves that guest-facing Sabotage and Fence controls recover immediately when the authoritative host rejects a request. It covers the regression where the UI previously remained locked on `Waiting for host…` for the full 10-second fallback even though the rejection toast had already appeared.

## Existing production behavior verified

The production network action proxy stores each guest request with its action name and arguments. When the host returns an `action-result`, the proxy emits the result to local subscribers. The Sabotage and Fence panels match that result to their own pending request and clear their local lock immediately on rejection.

The 10-second timeout remains as a fallback only for requests that receive no host response.

## Deterministic browser transport extension

The Playwright-only PeerJS-compatible transport can now hold one named guest action while all other traffic continues normally:

- lobby and gameplay state synchronization,
- heartbeat messages,
- chat,
- unrelated guest actions,
- host responses.

When the held request is released, the test may override its actor ID before delivery. This keeps the guest's original pending-request metadata intact while forcing the real host authorization layer to reject the delivered request as an attempt to act for another player.

This control exists only under `e2e/` and is never imported by the production application.

## Added browser journey

The Playwright test performs the following through visible controls and the normal online action pipeline:

1. Opens separate host and guest pages.
2. Creates and joins a room through the Online Multiplayer UI.
3. Starts a real two-player game.
4. Ends the host turn so the guest becomes the active player.
5. Travels to the Shadow Market and opens the `Sabotage` tab.
6. Submits `Hire Shadowfingers: Pickpocket` while the test transport holds the request.
7. Verifies the panel displays `Waiting for host…` and the request is actually queued.
8. Releases the request with an unauthorized actor ID.
9. Verifies the host rejects it and the Pickpocket control is usable again within two seconds.
10. Travels to the Fence and opens the `Protection` tab.
11. Repeats the authoritative rejection and immediate-unlock proof for `Protection — 3 Weeks`.
12. Repeats it again for `Buy Tip-off`.

No direct game-state mutation, forced click, production protocol change or public multiplayer service is used.

## Findings during validation

The first browser run showed that arriving at the Shadow Market opens its default `Goods` tab. The test was corrected to use the visible `Sabotage` tab before selecting a service.

The second run proved that Sabotage already unlocked immediately, but the test then attempted to cycle back to another guest turn. The host had already spent its turn and had zero hours, so that extra turn-cycle assumption was invalid. The final journey performs all three rejection checks during the same valid guest turn.

No production defect remained after these test-flow corrections. The component-level fix already present on `main` works through the full browser, network proxy, host validation and action-result path.

## Validation

GitHub Actions run `30251443279` passed on commit `1e901c49`:

- pinned Bun and single-lockfile policy,
- frozen dependency install,
- TypeScript,
- full Vitest suite,
- production build,
- ESLint,
- FFmpeg audio integrity,
- existing desktop, mobile, tablet and accessibility Playwright journeys,
- transient reconnect journey,
- secure page-refresh rejoin journey,
- rejected Sabotage, Protection and Tip-off recovery journey.

## Deliberate boundaries

- Production gameplay, UI, store, networking and protocol code are unchanged.
- The browser journey proves immediate recovery after an explicit host response; the existing 10-second fallback still covers a host that never responds.
- Host room closure, host migration, spectator/elimination and remaining gameplay browser journeys stay as separate focused tranches of #394.
