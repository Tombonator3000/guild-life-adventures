# Phase 16Y audit — active online room closure

Date: 27 July 2026
Issue: #394

## Scope

This tranche fixes and proves the flow used when a host closes an active online game from the Game Menu. The previous menu action only auto-saved and changed the local phase to the title screen. It did not use the active multiplayer cleanup path, so the host could disappear without sending a room-closure message and reconnect credentials could remain in browser storage.

## Production correction

`SaveLoadMenu` now distinguishes local and online games:

- local games retain the existing auto-save and return-to-title behavior,
- an online host sees `Close Online Room`,
- an online guest sees `Leave Online Game`,
- both online actions use `leaveActiveOnlineGame` instead of only changing the local phase.

When the host closes the room, the active PeerManager broadcasts a `kicked` message with the reason `Host closed the room` before local cleanup begins. Guests already handle that authoritative message through `useNetworkSync` and return to a clean title state without sending a second network message.

## Cleanup hardening

Active online cleanup now clears all browser- and process-local recovery state before destroying the PeerManager:

- the legacy `guild-life-online-session` entry,
- the secure `guild-life-reconnect-credential` entry,
- host-side reconnect credential bindings,
- network state tracking,
- local player and room identity in the game store.

The final network message receives a 50 ms flush window before peer destruction.

## Added browser journey

The Playwright journey performs the following through visible application controls and normal network synchronization:

1. Opens separate host and guest pages.
2. Creates and joins a room through the Online Multiplayer lobby.
3. Starts a real two-player game.
4. Waits until the guest has received the secure reconnect credential.
5. Opens the host Game Menu with the supported Escape shortcut.
6. Selects the visible `Close Online Room` control.
7. Verifies the host returns to the title screen.
8. Verifies the guest receives the closure message and returns to the title screen.
9. Verifies both test transports contain zero peers and zero active connections.
10. Verifies both the online-session and reconnect-credential entries are absent on both clients.
11. Verifies neither page produced an uncaught browser error.

No direct game-state mutation, forced click or public multiplayer service is used.

## Validation

GitHub Actions run `30252551776` passed on commit `cbcab119`:

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
- rejected Sabotage and Fence recovery journey,
- active host room-closure journey.

## Deliberate boundaries

- Local games still auto-save before returning to the title screen.
- This change closes a room intentionally through the Game Menu; unexpected host loss and host migration remain separate scenarios.
- Spectator and eliminated-player exit behavior remains a separate focused tranche of #394.
