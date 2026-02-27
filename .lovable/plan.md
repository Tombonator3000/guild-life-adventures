

## Assessment: Current Multiplayer Feature Status

All three features are **already substantially implemented** in the codebase. The MULTIPLAYER.md tracker says "🚧 Not started" but the code tells a different story:

### Chat — ✅ Already Working
- `ChatPanel.tsx` with full message list, emote bar, unread badges, floating emote bubbles
- `EmotePanel.tsx` with 8 predefined emotes + cooldown
- Messages routed through host via WebRTC DataChannel
- Integrated in `GameBoard.tsx` (only during gameplay, not lobby)

### Spectator Mode — ✅ Already Working
- `SpectatorOverlay.tsx` with "Spectating" banner, vignette overlay, current turn indicator
- `spectateRoom()` flow in `useOnlineGame.ts`
- Host tracks spectators separately, sends state-sync updates
- Dead players auto-enter spectator mode
- Spectate button in lobby join screen and browse view

### Reconnect — ✅ Already Working (basic)
- `PeerManager.attemptReconnect()` with signaling server reconnection
- Host has 30-second reconnect window per peer
- Auto-reconnect on disconnect (2s delay)
- Host migration if host disappears (10s timeout, successor election)
- `reconnect` message type re-syncs full game state

---

## Remaining Gaps to Fill

### 1. Reconnect: Page Refresh Recovery
**Problem**: If a guest refreshes their browser tab, their PeerJS session is destroyed. There's no way to rejoin the same game. (Issue M4 in MULTIPLAYER.md)

**Plan**:
- Save `{ roomCode, playerName, slot }` to `sessionStorage` on game start (guests)
- On app mount, check for stored session — show "Rejoin game?" prompt
- Use the existing `attemptReconnect` → `reconnect` message flow
- Clear stored session on intentional disconnect or game end

### 2. Reconnect: In-Game UI Indicator
**Problem**: When connection drops during gameplay, there's no visible reconnect button or status for the guest.

**Plan**:
- Add a connection-lost banner in `GameBoardOverlays.tsx` with "Reconnecting..." status and manual "Retry" button
- Show disconnected player names on the host's board (already tracked in `disconnectedPlayers`)

### 3. Chat in Lobby
**Problem**: Chat only renders during gameplay (`GameBoard.tsx`). No chat in the lobby screen.

**Plan**:
- Add chat message state + send function to `useOnlineGame` (lobby-phase messages)
- Handle `chat-message` in the lobby message handler (currently only handled in `useNetworkSync`)
- Add a simple chat box to `OnlineLobby.tsx` host-lobby and guest-lobby views

### 4. Spectator Chat Fix
**Problem**: ChatPanel uses `currentPlayer.name/color` for sender info — but pure spectators have no player slot, so `currentPlayer` refers to whoever's turn it is (wrong sender identity).

**Plan**:
- Pass `localPlayerName` and `localPlayer?.color` (or a default spectator color) for spectators
- Guard: if `isPureSpectator`, use stored `localPlayerName` from network state instead of `currentPlayer`

### 5. Update Documentation
- Update MULTIPLAYER.md feature status table (chat/spectator/reconnect → ✅ Working)
- Add log2.md entry with timestamp
- Update CLAUDE.md with any new conventions

---

## Implementation Steps

1. **Add page-refresh reconnect** — Save session to `sessionStorage` in `useOnlineGame`, check on mount, show rejoin prompt in `OnlineLobby`
2. **Add reconnect UI overlay** — Connection-lost banner with retry button in `GameBoardOverlays.tsx`
3. **Add lobby chat** — Wire chat messages through lobby message handler in `useOnlineGame`, add chat UI to `OnlineLobby.tsx`
4. **Fix spectator chat sender** — Use `localPlayerName` for spectators in `GameBoard.tsx` ChatPanel props
5. **Update docs** — MULTIPLAYER.md, log2.md, CLAUDE.md

### Files to Change
| File | Change |
|------|--------|
| `src/network/useOnlineGame.ts` | sessionStorage save/restore, lobby chat messages, rejoin prompt state |
| `src/components/screens/OnlineLobby.tsx` | Rejoin prompt UI, lobby chat box |
| `src/components/game/GameBoardOverlays.tsx` | Connection-lost banner with retry button |
| `src/components/game/GameBoard.tsx` | Fix spectator ChatPanel props |
| `MULTIPLAYER.md` | Update feature status |
| `log2.md` | Add timestamped entry |
| `CLAUDE.md` | Add reconnect/spectator conventions |

