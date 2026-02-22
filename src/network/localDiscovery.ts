// BroadcastChannel + localStorage based room discovery for same-browser/same-device testing.
// Works without any server — enables instant game discovery between browser tabs.

import type { PeerDiscoveredGame } from './peerDiscovery';

const CHANNEL_NAME = 'guild-life-rooms';
const STORAGE_KEY = 'guild-life-open-rooms';
const ANNOUNCE_INTERVAL_MS = 10_000;
const ROOM_MAX_AGE_MS = 30_000; // Rooms older than 30s in localStorage are stale

export interface LocalRoomEntry {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  hasAI: boolean;
  isStarted: boolean;
  timestamp: number;
}

// --- BroadcastChannel host announcer ---

let announcerChannel: BroadcastChannel | null = null;
let announceInterval: ReturnType<typeof setInterval> | null = null;
let currentRoom: LocalRoomEntry | null = null;

/** Start announcing a room via BroadcastChannel + localStorage */
export function announceRoom(entry: Omit<LocalRoomEntry, 'timestamp'>): void {
  unannounceRoom();

  currentRoom = { ...entry, timestamp: Date.now() };

  // Write to localStorage for same-device cross-browser-context fallback
  writeToStorage(currentRoom);

  // BroadcastChannel for same-browser tabs
  try {
    announcerChannel = new BroadcastChannel(CHANNEL_NAME);
    // Respond to search requests immediately
    announcerChannel.onmessage = (e) => {
      if (e.data?.type === 'room-search' && currentRoom) {
        announcerChannel?.postMessage({
          type: 'room-announce',
          room: { ...currentRoom, timestamp: Date.now() },
        });
      }
    };
  } catch {
    // BroadcastChannel not supported — localStorage fallback only
  }

  // Periodic re-announce to keep entry fresh
  announceInterval = setInterval(() => {
    if (!currentRoom) return;
    currentRoom.timestamp = Date.now();
    writeToStorage(currentRoom);
    try {
      announcerChannel?.postMessage({ type: 'room-announce', room: currentRoom });
    } catch { /* channel closed */ }
  }, ANNOUNCE_INTERVAL_MS);

  console.log(`[LocalDiscovery] Announcing room ${entry.roomCode}`);
}

/** Update the announced room's player count or started status */
export function updateAnnouncedRoom(partial: Partial<Pick<LocalRoomEntry, 'playerCount' | 'isStarted'>>): void {
  if (!currentRoom) return;
  Object.assign(currentRoom, partial, { timestamp: Date.now() });
  writeToStorage(currentRoom);
}

/** Stop announcing the current room */
export function unannounceRoom(): void {
  if (currentRoom) {
    removeFromStorage(currentRoom.roomCode);
    console.log(`[LocalDiscovery] Unannounced room ${currentRoom.roomCode}`);
  }
  currentRoom = null;
  if (announceInterval) {
    clearInterval(announceInterval);
    announceInterval = null;
  }
  if (announcerChannel) {
    try { announcerChannel.close(); } catch { /* ignore */ }
    announcerChannel = null;
  }
}

// --- Search for rooms ---

/** Search for rooms via BroadcastChannel (fast, same-browser) + localStorage (same-device) */
export function searchLocalRooms(): Promise<PeerDiscoveredGame[]> {
  return new Promise((resolve) => {
    const found = new Map<string, PeerDiscoveredGame>();

    // 1. Check localStorage first
    const stored = readFromStorage();
    for (const entry of stored) {
      found.set(entry.roomCode, entryToGame(entry));
    }

    // 2. BroadcastChannel search — wait briefly for responses
    let searchChannel: BroadcastChannel | null = null;
    try {
      searchChannel = new BroadcastChannel(CHANNEL_NAME);
      searchChannel.onmessage = (e) => {
        if (e.data?.type === 'room-announce' && e.data.room) {
          const room = e.data.room as LocalRoomEntry;
          found.set(room.roomCode, entryToGame(room));
        }
      };
      searchChannel.postMessage({ type: 'room-search' });
    } catch {
      // BroadcastChannel not supported
    }

    // Wait 500ms for BroadcastChannel responses, then return combined results
    setTimeout(() => {
      try { searchChannel?.close(); } catch { /* ignore */ }
      resolve(Array.from(found.values()));
    }, 500);
  });
}

// --- localStorage helpers ---

function writeToStorage(entry: LocalRoomEntry): void {
  try {
    const rooms = readRawStorage();
    rooms[entry.roomCode] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch { /* storage full or unavailable */ }
}

function removeFromStorage(roomCode: string): void {
  try {
    const rooms = readRawStorage();
    delete rooms[roomCode];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  } catch { /* ignore */ }
}

function readFromStorage(): LocalRoomEntry[] {
  const rooms = readRawStorage();
  const now = Date.now();
  // Filter stale entries and clean up
  const fresh = Object.values(rooms).filter(r => now - r.timestamp < ROOM_MAX_AGE_MS);
  if (fresh.length !== Object.keys(rooms).length) {
    try {
      const cleaned: Record<string, LocalRoomEntry> = {};
      for (const r of fresh) cleaned[r.roomCode] = r;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch { /* ignore */ }
  }
  return fresh;
}

function readRawStorage(): Record<string, LocalRoomEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LocalRoomEntry>;
  } catch {
    return {};
  }
}

function entryToGame(entry: LocalRoomEntry): PeerDiscoveredGame {
  return {
    roomCode: entry.roomCode,
    hostName: entry.hostName,
    playerCount: entry.playerCount,
    maxPlayers: entry.maxPlayers,
    hasAI: entry.hasAI,
    isStarted: entry.isStarted,
  };
}
