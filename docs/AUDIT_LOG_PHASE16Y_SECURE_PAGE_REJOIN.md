# Phase 16Y audit — secure page refresh and rejoin

Date: 27 July 2026
Issue: #394

## Scope

This tranche proves the existing page-refresh recovery path for an active online guest. The browser journey uses the deterministic local PeerJS-compatible transport introduced in PR #401 and does not contact public signalling, relay, discovery or listing services.

## Security model verified

The host issues a room-bound reconnect credential after the game starts. The credential contains:

- the room code,
- the authoritative player ID,
- the player name,
- a cryptographically random 48-character reconnect token,
- an issuance timestamp.

The credential is retained only in the guest tab's session storage and expires after 30 minutes. A refreshed guest receives a new PeerJS identity and must present the matching room, player ID and token before the host rebinds that identity to the existing player. The previous peer binding is revoked after a successful rebind.

Existing Vitest coverage verifies that reconnect attempts are rejected for:

- the wrong room,
- the wrong player ID,
- the wrong token,
- an expired local credential.

It also verifies that a valid rebind revokes the old peer ID and authorizes only the new one.

## Added browser journey

The Playwright journey performs the following through visible application controls and normal network synchronization:

1. Opens separate host and guest pages.
2. Creates and joins a room through the Online Multiplayer lobby.
3. Starts a real two-player game.
4. Waits until the guest has received the host-issued reconnect credential.
5. Records the guest's original browser peer ID.
6. Reloads the guest page, which destroys the original peer and creates a fresh application instance.
7. Opens Online Multiplayer and verifies the visible `Rejoin Game?` prompt contains the correct room and player name.
8. Selects `Rejoin` through the normal UI.
9. Waits for the host's authoritative state sync to restore the game board.
10. Confirms the refreshed guest has a different peer ID.
11. Lets the host end the turn.
12. Confirms the same guest player receives the turn.
13. Deposits 50g at the Bank through the normal guest action proxy and host validation.

No direct game-state mutation, forced click or production-network bypass is used.

## Final validation

GitHub Actions run `30247896830` passed on commit `8dda1959`:

- pinned Bun and single-lockfile policy,
- frozen dependency install,
- TypeScript,
- full Vitest suite,
- production build,
- ESLint,
- FFmpeg audio integrity,
- existing desktop, mobile, tablet and accessibility browser journeys,
- transient online reconnect journey,
- secure page-refresh and new-peer rejoin journey.

## Deliberate boundaries

- Production gameplay, networking, reconnect protocol and save formats are unchanged.
- Session recovery is intentionally tab-scoped through `sessionStorage`; copying a room code or player name to another browser does not copy the reconnect token.
- Host closure, host migration, spectator/elimination and the remaining gameplay browser journeys stay as separate focused tranches of #394.
