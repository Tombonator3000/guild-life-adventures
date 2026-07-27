# Phase 16Y audit — deterministic online browser coverage

Date: 27 July 2026
Issue: #394

## Scope

This tranche adds a real two-page host/guest browser journey for online multiplayer without depending on public PeerJS signalling, STUN/TURN, PartyKit or MQTT services. The production networking implementation and gameplay protocol remain unchanged.

## Added browser journey

The Playwright journey opens separate host and guest pages in the same browser context and validates the visible application flow end to end:

1. The host enters Online Multiplayer, creates a room and exposes the generated six-character room code.
2. The guest enters the same lobby through the visible join form.
3. Both pages report a connected state and the host sees the second player.
4. The guest sends a lobby chat message and the host receives it.
5. The host starts a real two-player game.
6. The host ends the first turn through the supported `E` keyboard shortcut.
7. The guest travels to the Bank and deposits 50g through the normal guest action proxy and authoritative host state synchronization.
8. The guest connection is deliberately dropped.
9. The production reconnect path rebuilds the connection.
10. The guest withdraws the 50g after reconnecting, proving that play continues and synchronized state remains usable.

## Deterministic browser transport

The test intercepts only Vite's optimized `peerjs` module request inside Playwright and supplies a small PeerJS-compatible transport backed by `BroadcastChannel`.

The test double supports the production events used by `PeerManager`:

- peer open,
- incoming connection,
- data connection open,
- message delivery,
- connection close,
- reconnect.

The transport exists only under `e2e/` and is never imported or bundled by the production application.

## Findings during validation

The first browser run failed before room creation because the lobby card's accessible button name includes its descriptive subtitle (`Create Room Host a game`). The test had required the exact shorter label. The final selector follows the accessible name prefix rather than bypassing the UI or forcing the click. The same correction was applied to the Join Room card.

An intermediate attempt also removed `ContextualTips` from the production game to avoid an unrelated onboarding overlay interaction. That was rejected as an unacceptable product regression. The component was restored unchanged, while the online test now marks the guided tutorial as completed through the application's existing local-storage completion key. The final pull request therefore changes only browser-test infrastructure and documentation.

## Final validation

GitHub Actions run `30246669199` passed on commit `c576900d`:

- pinned Bun 1.3.14 and single-lockfile policy,
- frozen dependency install,
- TypeScript,
- full Vitest suite,
- production build,
- ESLint,
- FFmpeg audio integrity,
- existing desktop, mobile, tablet and accessibility Playwright journeys,
- deterministic host/guest lobby and chat,
- authoritative guest Bank action synchronization,
- transient disconnect and reconnect continuation.

## Deliberate boundaries

- No public multiplayer or relay service is contacted by this test.
- No production networking code, gameplay code, save format or protocol fields are modified.
- The reconnect coverage uses the same guest peer identity after a transient connection loss.
- Secure page refresh and rejoin with a new peer identity remains a separate follow-up tranche of #394.
