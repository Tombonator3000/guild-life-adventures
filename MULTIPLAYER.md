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
| `src/network/gameListing.ts` | MQTT over WebSocket for public game browser (replaced PartyKit 2026-03-04) |
| `src/network/networkState.ts` | Game state serialisation / deserialisation for sync |
| `src/network/roomCodes.ts` | Room code ↔ PeerJS peer ID conversion |
| `src/components/screens/OnlineLobby.tsx` | Full lobby UI (create, join, browse) |
| `src/lib/partykit.ts` | Legacy PartyKit config helpers — no longer used in listing flow |

### Connection flow

```
Host creates lobby
  → PeerManager opens peer with ID `guild-life-<roomCode>`
  → Optional: registers room in MQTT broker (retained message, 5-min TTL)
  → Broadcasts lobby-update to all guests

Guest joins with room code
  → PeerManager connects to host peer ID
  → Receives lobby-update, shows player list
  → On start: receives full game state snapshot, begins game loop
```

### Discovery methods

1. **Room code** — guest types 6-char code directly (always works)
2. **MQTT browser** — host marks room public; `registerGameListing` publishes a retained MQTT message to HiveMQ free broker; guests subscribing to `guild-life-adventures/rooms/+` receive the full list instantly (`subscribeToGameListings`). No env var, no account, no deploy required.

> **Note**: P2P discovery via PeerJS `/peers` endpoint was removed — the free cloud PeerJS server does not expose peer lists cross-network. MQTT fills this role instead.

---

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Host / guest lobby | ✅ Working | Up to 4 players |
| Game state sync (host → guests) | ✅ Working | Full snapshot on start, delta on actions |
| AI opponent (Grimwald) | ✅ Working | Runs on host only |
| Public room listing (MQTT) | ✅ Working | Zero-config — HiveMQ free broker, no env var needed |
| Browse public games | ✅ Working | Live MQTT subscription via `subscribeToGameListings`; retained messages give instant full list |
| Chat (in-game) | ✅ Working | `ChatPanel.tsx` with emotes, floating bubbles, unread badges |
| Chat (lobby) | ✅ Working | `LobbyChat` in `OnlineLobby.tsx` for host and guest lobbies |
| Spectator mode | ✅ Working | Pure spectators + dead player auto-spectate; `SpectatorOverlay.tsx` |
| Reconnect (auto) | ✅ Working | 30s window, auto-reconnect on disconnect, host migration |
| Reconnect (page refresh) | ✅ Working | Session saved to `sessionStorage`; rejoin prompt in Online menu |
| Reconnect UI (in-game) | ✅ Working | Connection-lost banner with retry in `GameBoardOverlays.tsx` |

---

## 2026-03-04 — PartyKit → MQTT Migration (Room Listing)

### Why

PartyKit required a `VITE_PARTYKIT_HOST` env var and `npx partykit deploy` step — adding operational overhead for every dev/prod environment. In addition, the previous P2P discovery fallback (scanning PeerJS `/peers`) never worked cross-network because the free PeerJS cloud server does not expose the peer list publicly.

MQTT over WebSocket via the free HiveMQ public broker solves both problems: zero-config, zero-deploy, zero-account, and works from any browser.

### What Changed

| File | Change |
|------|--------|
| `src/network/gameListing.ts` | **Rewritten** — MQTT via `mqtt@5.15.0`; dropped PartyKit/PartySocket |
| `src/components/screens/OnlineLobby.tsx` | Removed `isPartykitConfigured()` gate; MQTT listing always active; removed PeerJS same-browser fallback UI |
| `vite.config.ts` | Added `global: "globalThis"` define for mqtt.js browser bundle compatibility |
| `package.json` | Added `mqtt@5.15.0` |
| `src/lib/partykit.ts` | **Kept for reference** — `isPartykitConfigured()` no longer called in listing flow |
| `party/gameListings.ts` | **Kept for reference** — no longer deployed or used |

### How It Works

- **Broker**: `wss://broker.hivemq.com:8884/mqtt` (free, no auth, MQTT 5.0 over WSS)
- **Topics**: `guild-life-adventures/rooms/{roomCode}` — one retained message per room
- **Host**: connects, publishes retained JSON listing; on quit, publishes empty payload to immediately remove it
- **Guest**: subscribes to `guild-life-adventures/rooms/+` wildcard — broker delivers all retained messages instantly (full current list in one round-trip)
- **TTL**: MQTT 5.0 `messageExpiryInterval: 300s` auto-expires stale rooms if host crashes; client-side 5-minute filter as fallback for brokers without MQTT 5 support

### Setup

**No setup required.** `registerGameListing` and `subscribeToGameListings` connect directly to HiveMQ's public broker. No env vars, no deploy step, no account.

### API (unchanged)

Callers in `useOnlineGame.ts` use the same three functions — drop-in replacement:

```ts
registerGameListing(listing)       // host: publish retained msg, returns cleanup fn
updateListingPlayerCount(code, n)  // host: update player count in retained msg
subscribeToGameListings(callback)  // guest: live subscription, returns unsubscribe fn
```

### Migration history

| Date | Change |
|------|--------|
| 2026-02-06 | Firebase Realtime Database (original) |
| 2026-02-27 | Firebase → PartyKit (Cloudflare Workers + PartySocket) |
| 2026-03-04 | PartyKit → MQTT / HiveMQ (current) |

---

## 2026-02-21 — Public Lobby Toggle Fix

### Problem

The "List in public lobby browser" toggle in the host lobby was wrapped in
`{firebaseAvailable && (...)}`. If the Firebase env vars weren't set,
the toggle never rendered.

### Fix

**`src/components/screens/OnlineLobby.tsx`**
- Removed the Firebase guard — toggle is now always visible for the host
- As of 2026-03-04 (MQTT migration), listing is truly zero-config and the toggle is always functional

---

## Known Multiplayer Issues

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| M1 | Guests can't recover if host disconnects mid-game | Medium | Mitigated — host migration auto-elects new host |
| M2 | All players must be present at game start (no late join) | Medium | Open |
| M3 | PeerJS free signaling server has rate limits (~50 req/10s) | Low | Acceptable for now |
| M4 | No reconnect token — refreshing page as guest loses session | ~~High~~ | **FIXED** — sessionStorage saves session; rejoin prompt on Online menu |

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

- [x] Reconnect/rejoin support — sessionStorage session + rejoin prompt in Online menu ✅
- [x] Host migration — automatic successor election on disconnect ✅
- [x] In-lobby chat — `LobbyChat` component in `OnlineLobby.tsx` ✅
- [ ] Game invites via shareable URL (`?join=XXXXXX`)
- [ ] Late join support (guests joining after game start)
- [ ] Optional: dedicated TURN/relay server to reduce PeerJS dependency for restrictive NATs
