// PeerJS-based game discovery — fallback when Firebase is not configured.
// Uses the PeerJS signaling server's peer list API to find active game hosts,
// then briefly probes each host for game metadata via a discovery-probe handshake.
//
// How it works:
// 1. GET https://0.peerjs.com/peerjs/peers → list of all connected peer IDs
// 2. Filter for "guild-life-" prefix → these are active game rooms
// 3. For each room code, create a temporary Peer and connect briefly
// 4. Send {type: 'discovery-probe'} → host responds with {type: 'discovery-info'}
// 5. Collect responses within timeout, return game list

import Peer from 'peerjs';
import { peerIdToRoomCode, roomCodeToPeerId, isValidRoomCode } from './roomCodes';

export interface PeerDiscoveredGame {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  hasAI: boolean;
  isStarted: boolean;
}

const PEERJS_PEERS_API = 'https://0.peerjs.com/peerjs/peers';
const GUILD_PEER_PREFIX = 'guild-life-';
const PROBE_TIMEOUT_MS = 4000;
const MAX_ROOMS_TO_PROBE = 20;

/**
 * Search for active Guild Life Adventures games via the PeerJS signaling server.
 * Returns an empty array (not an error) if the server is unreachable.
 */
export async function searchPeerGames(): Promise<PeerDiscoveredGame[]> {
  const roomCodes = await fetchGuildPeerRoomCodes();
  if (roomCodes.length === 0) return [];

  const results = await Promise.allSettled(
    roomCodes.slice(0, MAX_ROOMS_TO_PROBE).map(probeRoom)
  );

  return results
    .filter((r): r is PromiseFulfilledResult<PeerDiscoveredGame> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value);
}

/** Fetch peer IDs from PeerJS signaling server and filter for guild-life- rooms */
async function fetchGuildPeerRoomCodes(): Promise<string[]> {
  try {
    const res = await fetch(PEERJS_PEERS_API, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const peerIds: unknown = await res.json();
    if (!Array.isArray(peerIds)) return [];
    return (peerIds as unknown[])
      .filter((id): id is string => typeof id === 'string' && id.startsWith(GUILD_PEER_PREFIX))
      .map(id => peerIdToRoomCode(id))
      .filter(isValidRoomCode);
  } catch {
    return [];
  }
}

/** Connect briefly to a room's host and request game metadata */
function probeRoom(roomCode: string): Promise<PeerDiscoveredGame | null> {
  return new Promise(resolve => {
    let tempPeer: Peer | null = new Peer({
      debug: 0,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });

    const cleanup = () => {
      clearTimeout(timer);
      try { tempPeer?.destroy(); } catch { /* ignore */ }
      tempPeer = null;
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, PROBE_TIMEOUT_MS);

    tempPeer.on('error', () => {
      cleanup();
      resolve(null);
    });

    tempPeer.on('open', () => {
      if (!tempPeer) return;
      const hostPeerId = roomCodeToPeerId(roomCode);
      const conn = tempPeer.connect(hostPeerId, { reliable: true, serialization: 'json' });

      conn.on('error', () => {
        cleanup();
        resolve(null);
      });

      conn.on('open', () => {
        conn.send({ type: 'discovery-probe' });
      });

      conn.on('data', (data) => {
        const msg = data as {
          type?: string;
          hostName?: string;
          playerCount?: number;
          maxPlayers?: number;
          hasAI?: boolean;
          isStarted?: boolean;
        };
        if (msg?.type === 'discovery-info') {
          cleanup();
          resolve({
            roomCode,
            hostName: msg.hostName ?? 'Unknown',
            playerCount: msg.playerCount ?? 1,
            maxPlayers: msg.maxPlayers ?? 4,
            hasAI: msg.hasAI ?? false,
            isStarted: msg.isStarted ?? false,
          });
        }
      });
    });
  });
}
