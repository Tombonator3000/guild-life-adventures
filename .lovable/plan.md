

## P2P Game Discovery Fix

### Problem
The "Search for public games via PeerJS" feature does not work because it depends on `https://0.peerjs.com/peerjs/peers` — a peer listing API that is **disabled on the free PeerJS cloud server**. This endpoint returns "Not found", so `fetchGuildPeerRoomCodes()` always gets an empty list, and "No public games found" is shown every time.

### Root Cause
PeerJS servers have an optional `allow_discovery` flag. The free public server (`0.peerjs.com`) has this disabled for security/scalability reasons. The `/peerjs/peers` endpoint simply does not exist there.

### Solution: Lightweight Firebase-free Room Registry via BroadcastChannel + localStorage fallback, plus a self-hosted PeerJS server option

Since the free PeerJS server won't list peers, we need an alternative discovery mechanism. The plan has two parts:

---

### Part 1: Fix the PeerJS peers API URL (quick win)

The free PeerJS cloud server does NOT expose `/peers`. But if users self-host a PeerJS server (via `npx peerjs --port 9000 --allow_discovery`), it works. Update `peerDiscovery.ts` to:

1. Try the API call and gracefully handle failure (already does this)
2. Add a console log explaining why discovery failed, so developers know
3. Add an optional env var `VITE_PEERJS_HOST` for self-hosted servers where `/peers` works

### Part 2: Room sharing via known-room-code broadcast (primary fix)

Since we can't list peers on the free server, make public rooms discoverable through a **shared room code registry** using the existing Firebase Realtime Database (when available) combined with a new **in-memory room announcement** system for non-Firebase setups:

**`src/network/peerDiscovery.ts` changes:**
- When a host marks their room as public, store the room code in `localStorage` under a shared key (for same-device testing) AND attempt a lightweight fetch to a simple JSON endpoint
- `searchPeerGames()` will:
  1. First check localStorage for recently announced room codes (same-device/tab testing)
  2. Then try the PeerJS `/peers` endpoint (works with self-hosted servers)
  3. Then probe any discovered room codes as before
- Add `announceRoom(roomCode)` and `unannounceRoom(roomCode)` functions

**`src/network/useOnlineGame.ts` changes:**
- When host sets `isPublic = true`, call `announceRoom()` in addition to Firebase registration
- On cleanup, call `unannounceRoom()`

**`src/components/screens/OnlineLobby.tsx` changes:**
- Update the P2P search status text to be clearer: explain that same-network discovery works, cross-network requires Firebase or room code
- Add a "Copy Room Code" button more prominently when public room is enabled without Firebase

### Part 3: BroadcastChannel for same-browser discovery

For local testing and demos, use the `BroadcastChannel` API so multiple tabs on the same browser can discover each other's games instantly:

**New: `src/network/localDiscovery.ts`**
- Uses `BroadcastChannel('guild-life-rooms')` 
- Host broadcasts `{type: 'room-announce', roomCode, hostName, playerCount, ...}` every 10 seconds
- Searcher sends `{type: 'room-search'}`, hosts respond immediately
- This enables instant "Search for public games" when testing with multiple tabs

### Technical Details

**Files to create:**
- `src/network/localDiscovery.ts` — BroadcastChannel-based same-browser room discovery

**Files to modify:**
- `src/network/peerDiscovery.ts` — integrate localDiscovery, improve error logging, add env var support for custom PeerJS server
- `src/network/useOnlineGame.ts` — call announceRoom/unannounceRoom when public toggle changes
- `src/components/screens/OnlineLobby.tsx` — better UX text explaining discovery limitations, prominent room code sharing
- `log2.md` — timestamp entry for this fix

**No new dependencies needed.** BroadcastChannel is supported in all modern browsers.

### Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Two tabs same browser, one hosts public | "No public games found" | Game appears instantly via BroadcastChannel |
| Self-hosted PeerJS server with `--allow_discovery` | "No public games found" (wrong URL) | Works via `/peers` endpoint with env var |
| Free PeerJS server, no Firebase | "No public games found" | Clear message explaining limitation + prominent room code copy |
| Firebase configured | Works (unchanged) | Works (unchanged) |

