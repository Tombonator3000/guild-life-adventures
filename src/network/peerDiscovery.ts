// PeerJS-based game discovery + local (BroadcastChannel/localStorage) discovery.
//
// Discovery layers (checked in order):
// 1. BroadcastChannel + localStorage — instant, same-browser/same-device
// 2. PeerJS /peers endpoint — works with self-hosted PeerJS servers (--allow_discovery)
// 3. Direct room probe — connects to each discovered peer for metadata
//
// The free PeerJS cloud server (0.peerjs.com) does NOT expose /peers.
// Set VITE_PEERJS_HOST to use a self-hosted server where it works.

import Peer from 'peerjs';
import { peerIdToRoomCode, roomCodeToPeerId, isValidRoomCode } from './roomCodes';
import { searchLocalRooms } from './localDiscovery';

export interface PeerDiscoveredGame {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  hasAI: boolean;
  isStarted: boolean;
}

// Use custom PeerJS server if configured, otherwise default cloud
const CUSTOM_HOST = import.meta.env.VITE_PEERJS_HOST as string | undefined;
const PEERJS_PEERS_API = CUSTOM_HOST
  ? `${CUSTOM_HOST.replace(/\/$/, '')}/peerjs/peers`
  : 'https://0.peerjs.com/peerjs/peers';

const GUILD_PEER_PREFIX = 'guild-life-';
const PROBE_TIMEOUT_MS = 4000;
const MAX_ROOMS_TO_PROBE = 20;

/**
 * Search for active Guild Life Adventures games.
 * Combines local discovery (BroadcastChannel/localStorage) with PeerJS peer listing.
 */
export async function searchPeerGames(): Promise<PeerDiscoveredGame[]> {
  // Run local and PeerJS searches in parallel
  const [localGames, peerRoomCodes] = await Promise.all([
    searchLocalRooms(),
    fetchGuildPeerRoomCodes(),
  ]);

  // Merge: local games are already complete, peer room codes need probing
  const found = new Map<string, PeerDiscoveredGame>();
  for (const g of localGames) {
    found.set(g.roomCode, g);
  }

  // Probe PeerJS-discovered rooms (skip ones already found locally)
  const codesToProbe = peerRoomCodes.filter(c => !found.has(c));
  if (codesToProbe.length > 0) {
    const results = await Promise.allSettled(
      codesToProbe.slice(0, MAX_ROOMS_TO_PROBE).map(probeRoom)
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        found.set(r.value.roomCode, r.value);
      }
    }
  }

  return Array.from(found.values());
}

/** Fetch peer IDs from PeerJS signaling server and filter for guild-life- rooms */
async function fetchGuildPeerRoomCodes(): Promise<string[]> {
  try {
    const res = await fetch(PEERJS_PEERS_API, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      if (!CUSTOM_HOST) {
        console.info(
          '[PeerDiscovery] Free PeerJS cloud does not expose /peers. ' +
          'Set VITE_PEERJS_HOST to a self-hosted server with --allow_discovery, ' +
          'or use BroadcastChannel discovery (same browser) / Firebase for cross-network.'
        );
      }
      return [];
    }
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
