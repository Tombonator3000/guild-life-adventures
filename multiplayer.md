# Guild Life Adventures - Online Multiplayer System

Complete reference for the WebRTC P2P multiplayer system. This document covers architecture, implementation details, configuration, known issues, and future work to help developers work efficiently with the multiplayer codebase.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Map](#file-map)
3. [Connection Flow](#connection-flow)
4. [Message Protocol](#message-protocol)
5. [State Synchronization](#state-synchronization)
6. [Security & Validation](#security--validation)
7. [Turn Management](#turn-management)
8. [Reconnection System](#reconnection-system)
9. [ICE/TURN Server Configuration](#iceturn-server-configuration)
10. [Rate Limiting](#rate-limiting)
11. [Test Coverage](#test-coverage)
12. [Configuration Constants](#configuration-constants)
13. [Known Issues & Limitations](#known-issues--limitations)
14. [Future Work](#future-work)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Model: Host-Authoritative P2P

The multiplayer system uses **WebRTC peer-to-peer** connections via the **PeerJS** library. One player acts as the **host** (authoritative game state owner), and all other players are **guests** who send action requests and receive state updates.

```
     PeerJS Cloud Signaling Server
              |
    +---------+---------+
    |                   |
  HOST                GUEST(s)
  (Game State)        (UI + Action Forwarding)
    |                   |
    +---WebRTC P2P------+
        DataChannel
        (JSON messages)
```

### Key Design Decisions

- **Host-authoritative**: Only the host runs game logic (startTurn, processWeekEnd, checkDeath, etc.). Guests forward actions to the host, which validates and executes them.
- **Full state sync**: Host broadcasts the entire serialized game state to all guests on every change (50ms debounced). This is simple and eliminates delta-sync bugs at the cost of bandwidth.
- **Turn locking**: Guests can only act during their own turn. The host validates turn ownership via a `peerId -> playerId` mapping.
- **Action whitelist**: Only 45+ explicitly whitelisted actions can be sent by guests. Internal game logic actions are blocked.

---

## File Map

All multiplayer code lives in `src/network/`:

| File | Lines | Purpose |
|------|-------|---------|
| `types.ts` | ~190 | Network message types, action whitelists (LOCAL_ONLY, HOST_INTERNAL, ALLOWED_GUEST) |
| `PeerManager.ts` | ~620 | WebRTC connection management singleton. Heartbeat, reconnection, ICE config |
| `NetworkActionProxy.ts` | ~100 | Guest action interception. Forwards to host, blocks internal actions, tracks pending |
| `networkState.ts` | ~160 | State serialization/deserialization, dismissed event tracking, action execution |
| `useNetworkSync.ts` | ~330 | React hook: state sync during gameplay, turn timeout, rate limiting, zombie detection |
| `useOnlineGame.ts` | ~490 | React hook: lobby management, room create/join, game start, disconnect |
| `roomCodes.ts` | ~40 | Room code generation (6-char alphanumeric) and validation |

### Related Files

| File | Network Integration |
|------|---------------------|
| `src/store/gameStore.ts` | `wrapWithNetworkGuard()` wraps all store actions. Guest guard on startNewGame, save/load |
| `src/components/screens/OnlineLobby.tsx` | Lobby UI: create/join room, player list, settings |
| `src/components/game/GameBoard.tsx` | Uses `useNetworkSync()` for movement broadcasting and remote animations |

---

## Connection Flow

### 1. Room Creation (Host)

```
Host clicks "Create Room"
  -> useOnlineGame.createRoom(playerName)
    -> peerManager.createRoom()
      -> new Peer(roomCodeToPeerId(code), iceConfig)
      -> Peer.on('open') -> room ready
      -> Returns 6-char room code
    -> Host added as lobbyPlayers[0] (slot 0, peerId='host')
```

### 2. Room Join (Guest)

```
Guest enters room code, clicks "Join"
  -> useOnlineGame.joinRoom(code, playerName)
    -> peerManager.joinRoom(code)
      -> new Peer(random ID, iceConfig)
      -> peer.connect(hostPeerId, { reliable: true, json })
      -> 10s timeout for connection
    -> sendToHost({ type: 'join', playerName })
    -> Host receives join -> adds to lobbyPlayers, broadcasts lobby-update
```

### 3. Game Start

```
Host clicks "Start Game"
  -> useOnlineGame.startOnlineGame()
    -> store.startNewGame(playerNames, ...)
    -> setState({ networkMode: 'host', localPlayerId: 'player-0' })
    -> peerManager.setPeerPlayerMap(peerId -> playerId)
    -> broadcast({ type: 'game-start', gameState, lobby })
    -> Guests receive game-start:
      -> Find own slot by peerId match
      -> setState({ networkMode: 'guest', localPlayerId: 'player-N' })
      -> applyNetworkState(gameState)
```

### 4. Gameplay Loop

```
Guest's Turn:
  Guest calls store.movePlayer(playerId, location, cost)
    -> wrapWithNetworkGuard intercepts
    -> forwardIfGuest() returns true
    -> NetworkActionProxy sends { type: 'action', name: 'movePlayer', args: [...] }
    -> Host receives:
      1. Validate sender's peerId maps to current player
      2. Check rate limit
      3. Verify action is in ALLOWED_GUEST_ACTIONS
      4. Verify playerId in args[0] matches sender
      5. Execute action on store
      6. Send action-result back
      7. Store subscription triggers debounced state broadcast

Host's Turn:
  Actions execute locally (no network involvement)
  Store subscription broadcasts state changes to all guests
```

---

## Message Protocol

### Host -> Guest Messages

| Type | Fields | Purpose |
|------|--------|---------|
| `lobby-update` | `lobby: LobbyState` | Player list/settings changed |
| `game-start` | `gameState, lobby` | Game begins, includes initial state + slot assignments |
| `state-sync` | `gameState` | Full game state broadcast (50ms debounced) |
| `action-result` | `requestId, success, error?` | Response to guest action |
| `player-disconnected` | `playerName, temporary?` | Peer dropped (may reconnect) |
| `player-reconnected` | `playerName` | Peer returned |
| `kicked` | `reason` | Guest removed from room |
| `pong` | `timestamp` | Heartbeat response (latency calc) |
| `movement-animation` | `playerId, path` | Visual movement for remote players |
| `turn-timeout` | `playerId` | Player's turn was auto-ended |

### Guest -> Host Messages

| Type | Fields | Purpose |
|------|--------|---------|
| `join` | `playerName` | Join lobby |
| `reconnect` | `playerName` | Rejoin after disconnect |
| `ready` | `isReady` | Toggle ready state |
| `action` | `requestId, name, args` | Game action request |
| `ping` | `timestamp` | Heartbeat (every 5s) |
| `leave` | _(none)_ | Graceful disconnect |
| `movement-start` | `playerId, path` | Request movement animation broadcast |

---

## State Synchronization

### Serialization (`serializeGameState`)

Extracts gameplay-relevant fields from Zustand store:
- `phase, currentPlayerIndex, players, week`
- `priceModifier, economyTrend, economyCycleWeeksLeft`
- `goalSettings, winner, eventMessage, rentDueWeek`
- `aiDifficulty, stockPrices, weekendEvent`
- `shadowfingersEvent, applianceBreakageEvent`

**Excluded** (local UI only): `selectedLocation, showTutorial, tutorialStep, aiSpeedMultiplier, skipAITurn`

### Deserialization (`applyNetworkState`)

Updates guest's store from host state, with special handling:
1. **Dismissed event tracking**: Events the guest has locally dismissed are NOT re-applied (prevents modal flicker)
2. **Auto-clear on turn/week change**: Dismissed events are cleared when `currentPlayerIndex` or `week` changes
3. **Phase preservation**: If guest dismissed an event, their phase stays local until host moves to a non-event phase

### Broadcast Trigger

Host subscribes to Zustand store changes. On any change during `playing`, `event`, or `victory` phases, a **debounced broadcast** fires after 50ms. Multiple rapid changes collapse into a single broadcast.

---

## Security & Validation

### Action Whitelist (`ALLOWED_GUEST_ACTIONS`)

45+ actions explicitly allowed for guests. Any action not in this set is rejected with "Action not allowed".

### Categories

| Category | Behavior | Examples |
|----------|----------|---------|
| `ALLOWED_GUEST_ACTIONS` | Forwarded to host, validated, executed | movePlayer, buyItem, workShift |
| `LOCAL_ONLY_ACTIONS` | Execute locally on guest (UI state) | selectLocation, dismissEvent |
| `HOST_INTERNAL_ACTIONS` | Blocked entirely on guest | startTurn, processWeekEnd, checkDeath |

### Cross-Player Validation

When a guest sends an action, the host checks:
1. `args[0]` (if it's a string starting with `player-`) must match the sender's playerId
2. This prevents guests from modifying other players' state

### Turn Validation

Actions are only accepted from the guest whose `peerId` maps to the current player via `peerPlayerMap`.

---

## Turn Management

### Turn Timeout (Host)

- **120 seconds** per remote player turn (configurable via `TURN_TIMEOUT_SECONDS`)
- Timer resets on any valid action or movement from the current player
- Does NOT apply to: host's own turn, AI turns, non-playing phases
- On timeout: broadcasts `turn-timeout` message and calls `endTurn()`

### Zombie Player Detection

When a player disconnects during an active game:
1. **5-second grace period**: If still disconnected after 5s and it's their turn, auto-skip
2. **Turn change check**: When turn switches to a disconnected player, auto-skip after 100ms
3. Prevents indefinite stalls when a player drops mid-game

---

## Reconnection System

### Guest Reconnection

1. Guest detects host loss (heartbeat timeout: 15s without pong)
2. Guest sets status to `reconnecting`
3. `attemptReconnect()` closes old connection, opens new one to same host PeerJS ID
4. Sends `{ type: 'reconnect', playerName }` so host can identify them
5. Host re-sends full game state via `state-sync`

### Host Reconnection Window

When a guest disconnects:
1. Host starts 30-second reconnection timer
2. If guest reconnects within window: timer cleared, state re-synced
3. If window expires: guest marked as permanently disconnected
4. During window: game continues (other players can still act)

### Close Handler Race Condition Fix

Old connection's `close` event only triggers cleanup if `this.connections.get(peerId) === conn` (prevents a late close handler from deleting a new reconnected connection).

---

## ICE/TURN Server Configuration

### Current Setup

**STUN servers** (free, public, sufficient for ~85% of connections):
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`
- `stun:stun3.l.google.com:19302`

**TURN servers**: Currently NONE. The previous `openrelay.metered.ca` servers are deprecated.

### Adding TURN Servers

Three options:

1. **Edit `CUSTOM_TURN_SERVERS` in `PeerManager.ts`**:
```typescript
const CUSTOM_TURN_SERVERS: RTCIceServer[] = [
  { urls: 'turn:a.relay.metered.ca:80', username: 'KEY', credential: 'SECRET' },
  { urls: 'turns:a.relay.metered.ca:443', username: 'KEY', credential: 'SECRET' },
];
```

2. **Runtime injection** (for self-hosted deployments):
```html
<script>
  window.GUILD_TURN_SERVERS = [
    { urls: 'turn:your-server:3478', username: 'user', credential: 'pass' }
  ];
</script>
```

3. **Deploy your own coturn server** (recommended for production):
```bash
docker run -d --network=host coturn/coturn \
  -n --realm=guild-life --fingerprint \
  --user=guild:password --lt-cred-mech
```

### Impact Without TURN

~15% of connections (symmetric NAT, corporate firewalls) will fail with a connection timeout error. The game shows an error message in these cases.

---

## Rate Limiting

### Implementation

Sliding window rate limiter on the host side:
- **10 actions per second** per peer (configurable via `GUEST_ACTION_RATE_LIMIT`)
- **1000ms window** (configurable via `RATE_LIMIT_WINDOW`)
- Blocked actions receive `{ success: false, error: 'Rate limited' }`
- Rate limits are cleared on peer disconnect

### Action Timeout (Guest)

Guest tracks pending actions via `trackPendingAction(requestId)`:
- **10-second timeout** for host responses
- Timed-out actions are logged and removed
- Prevents indefinite waits if host crashes mid-action

---

## Test Coverage

### Test File: `src/test/multiplayer.test.ts` (32 tests)

| Category | Tests | What's Tested |
|----------|-------|--------------|
| Room Codes | 6 | Generation, charset validation, PeerJS ID conversion, validation |
| Action Categories | 5 | Whitelist/blacklist disjointness, expected actions in each category |
| Action Proxy | 4 | Local/host/guest mode behavior, LOCAL_ONLY, HOST_INTERNAL blocking |
| State Serialization | 7 | Field presence, player data, apply/dismiss/clear/reset |
| executeAction | 3 | Valid/invalid/non-function actions |
| Pending Actions | 2 | Track/resolve lifecycle, cleanup |
| Network Guards | 3 | Guest startNewGame block, save/load block, dismiss tracking |

### What's NOT Tested (requires browser/WebRTC)

- PeerJS connection establishment
- WebRTC DataChannel messaging
- Heartbeat/keepalive system
- Reconnection flow
- Full host-guest action roundtrip
- Movement animation broadcasting
- Turn timeout behavior
- Rate limiting under load

---

## Configuration Constants

| Constant | Value | File | Purpose |
|----------|-------|------|---------|
| `HEARTBEAT_INTERVAL` | 5000ms | PeerManager.ts | Ping frequency |
| `HEARTBEAT_TIMEOUT` | 15000ms | PeerManager.ts | Dead peer detection |
| `RECONNECT_WINDOW` | 30000ms | PeerManager.ts | Grace period before permanent disconnect |
| `TURN_TIMEOUT_SECONDS` | 120s | useNetworkSync.ts | AFK turn auto-end |
| `GUEST_ACTION_RATE_LIMIT` | 10/sec | useNetworkSync.ts | Max actions per peer |
| `RATE_LIMIT_WINDOW` | 1000ms | useNetworkSync.ts | Rate limit sliding window |
| `ACTION_RESPONSE_TIMEOUT` | 10000ms | NetworkActionProxy.ts | Guest action timeout |
| Connection timeout | 10000ms | PeerManager.ts | WebRTC connection establishment |
| Signaling reconnect timeout | 15000ms | PeerManager.ts | PeerJS server reconnection |
| State sync debounce | 50ms | useNetworkSync.ts | Broadcast coalescing |
| Zombie skip grace period | 5000ms | useNetworkSync.ts | Wait before auto-skipping disconnected player |

---

## Known Issues & Limitations

### Architecture Limitations

1. **Full state broadcast**: Every state change sends the entire game state (~5-10KB). Efficient for small player counts but doesn't scale to spectators or large games.
2. **No message ordering**: WebRTC DataChannel is reliable but actions could theoretically arrive out of order in edge cases.
3. **No action rollback**: If a guest action fails on the host, the guest relies on the next state sync to correct their local view.
4. **Single point of failure**: If the host crashes, the game is lost. No host migration.

### Known Bugs

1. **Cross-player validation is incomplete**: Only checks `args[0]` for playerId format. Actions with playerId in other argument positions could bypass the check.
2. **Room code uses Math.random()**: Not cryptographically secure. Low risk for a game but predictable room codes are theoretically possible.
3. **Event modal timing**: Race condition between guest dismissing an event and host state sync can cause brief flicker in edge cases.

### Missing Features

1. **Spectator mode**: No way to watch without playing.
2. **Host migration**: If host disconnects, game ends.
3. **Chat/emotes**: No in-game communication.
4. **Matchmaking**: No automatic room finding.
5. **Game resume**: Online games can't be saved/loaded.

---

## Future Work

### Priority 1: Infrastructure
- [ ] Set up production TURN servers (metered.ca free tier or self-hosted coturn)
- [ ] Add message schema validation (runtime type checking of network messages)
- [ ] Implement action sequence numbers for ordering guarantees

### Priority 2: Reliability
- [ ] Host migration (elect new host on disconnect)
- [ ] Save/load for online games (host saves, guests can rejoin)
- [ ] Action rollback on failure (optimistic updates with correction)

### Priority 3: Features
- [ ] Spectator mode
- [ ] In-game chat/emotes
- [ ] Lobby browser/matchmaking
- [ ] Multiple AI opponents in online games (currently limited to 1)

### Priority 4: Testing
- [ ] E2E multiplayer tests with Playwright (two browser instances)
- [ ] Mock PeerJS for integration tests
- [ ] Network condition simulation (latency, packet loss)

---

## Troubleshooting

### "Connection timeout - room not found"
- Host's room might not exist yet (timing issue)
- Firewall blocking WebRTC
- No TURN server and symmetric NAT (see ICE/TURN section)

### Guest actions not working
- Check browser console for "Not your turn" or "Rate limited" errors
- Verify the guest's peerId is in the host's peerPlayerMap
- Check that the action is in ALLOWED_GUEST_ACTIONS

### State desync between host and guest
- Guest's store is updated via state-sync (50ms debounce)
- If guest dismissed an event, it won't re-appear until next turn
- Check for "Unknown action" errors in host console

### Player stuck on "Waiting for [player]..."
- The player might be disconnected (zombie)
- Host auto-skips after 5s grace period + 100ms turn change check
- If still stuck, host can manually end turn

---

*Last updated: 2026-02-07*
*Total multiplayer code: ~1,930 lines across 7 files + 32 tests*
