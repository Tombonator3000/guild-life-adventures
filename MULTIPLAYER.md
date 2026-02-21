# Multiplayer — Work Tracker

Living document tracking all multiplayer development work on Guild Life Adventures.
For full technical reference see [`multiplayer.md`](./multiplayer.md).

---

## System Overview

Guild Life Adventures uses **peer-to-peer WebRTC** via [PeerJS](https://peerjs.com/) for multiplayer.
There is no dedicated game server — the host's browser acts as the authority.

| Component | Role |
|-----------|------|
| `src/network/PeerManager.ts` | Core P2P connection manager, message bus |
| `src/network/useOnlineGame.ts` | React hook — lobby state, host/guest logic |
| `src/network/gameListing.ts` | Firebase Realtime Database for public game browser |
| `src/network/peerDiscovery.ts` | PeerJS signaling server fallback for finding public games |
| `src/network/networkState.ts` | Game state serialisation / deserialisation for sync |
| `src/network/roomCodes.ts` | Room code ↔ PeerJS peer ID conversion |
| `src/components/screens/OnlineLobby.tsx` | Full lobby UI (create, join, browse) |

### Connection flow

```
Host creates lobby
  → PeerManager opens peer with ID `guild-life-<roomCode>`
  → Optional: registers in Firebase public listing
  → Broadcasts lobby-update to all guests

Guest joins with room code
  → PeerManager connects to host peer ID
  → Receives lobby-update, shows player list
  → On start: receives full game state snapshot, begins game loop
```

### Discovery methods

1. **Room code** — guest types 6-char code directly (always works)
2. **Firebase browser** — host marks room public; Firebase stores listing; guests browse (`subscribeToGameListings`)
3. **P2P discovery** — scans PeerJS signaling server for `guild-life-*` peers; probes each with `discovery-probe` handshake; no Firebase needed (`searchPeerGames` in `peerDiscovery.ts`)

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Host / guest lobby | ✅ Working | Up to 4 players |
| Game state sync (host → guests) | ✅ Working | Full snapshot on start, delta on actions |
| AI opponent (Grimwald) | ✅ Working | Runs on host only |
| Public room via Firebase | ✅ Working | Requires Firebase env vars |
| **Public room without Firebase** | ✅ Fixed (2026-02-21) | Toggle always visible; P2P discovery automatic |
| Browse public games (Firebase) | ✅ Working | Live subscription |
| Browse public games (P2P) | ✅ Working | Manual scan via `searchPeerGames` |
| Chat / emotes | 🚧 Not started | |
| Reconnect / rejoin | 🚧 Not started | Guests who disconnect lose their session |
| Spectator mode | 🚧 Not started | |

---

## 2026-02-21 — Public Lobby Toggle Fix

### Problem

The "List in public lobby browser" toggle in the host lobby was wrapped in
`{firebaseAvailable && (...)}`. If the Firebase env vars aren't set,
`isFirebaseConfigured()` returns `false` and the toggle never renders — even
though PeerJS-based game discovery works automatically without Firebase.

### Fix

**`src/components/screens/OnlineLobby.tsx`**
- Removed `{firebaseAvailable && ...}` guard around the toggle div
- Toggle is now always visible for the host
- Label text adapts: "List in public lobby browser" (Firebase) vs "Make room discoverable" (no Firebase)
- Status text adapts: "Others can find and join this room without a code" vs "Others can find your room via P2P discovery"

**No changes needed to `useOnlineGame.ts`** — `setPublicRoom` calls
`registerGameListing`, which already returns a no-op when Firebase isn't
configured (`gameListing.ts:33`). Setting `isPublic = true` still works,
giving the host visual confirmation that discovery is active.

### Why P2P discovery is "always on"

Any host running PeerJS connects with a `guild-life-<roomCode>` peer ID.
The PeerJS signaling server lists all connected peers publicly. `searchPeerGames`
fetches that list, filters for `guild-life-` prefix, and probes each for
game metadata — no explicit "register" step required.

---

## Known Multiplayer Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| M1 | Guests can't recover if host disconnects mid-game | High | Open |
| M2 | All players must be present at game start (no late join) | Medium | Open |
| M3 | PeerJS free signaling server has rate limits (~50 req/10s) | Low | Acceptable for now |
| M4 | No reconnect token — refreshing page as guest loses session | High | Open |

*(See `bugs.md` for the full bug list)*

---

## Architecture Notes

### Host authority model

The host's game store is the source of truth. Guests run a local copy but
all actions are sent to the host, applied there, and the resulting state is
broadcast back. This avoids conflict resolution at the cost of slight latency
for guests.

### State serialisation

`networkState.ts` handles stripping React-incompatible values and
deep-cloning state for wire transfer. `applyNetworkState` merges incoming
state, being careful not to override local UI state (selected location, etc.).

### Peer ID format

```
guild-life-XXXXXX   (where XXXXXX is the 6-char room code, uppercase alpha)
```

Conversion utilities live in `src/network/roomCodes.ts`.

---

## Future Work

- [ ] Reconnect/rejoin support (store session token in localStorage)
- [ ] Host migration (promote a guest to host if host disconnects)
- [ ] In-lobby chat
- [ ] Game invites via shareable URL (`?join=XXXXXX`)
- [ ] Optional: dedicated relay server to reduce PeerJS dependency
