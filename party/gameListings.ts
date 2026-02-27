// PartyKit server for public game room listing.
// Hosts register their room; guests subscribe and see all open rooms in real time.
// One singleton room ('registry') handles all listings.
//
// Deploy:  npx partykit deploy
// Dev:     npx partykit dev   (connects on localhost:1999)

import type * as Party from "partykit/server";

export interface GameListing {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  goals: {
    wealth: number;
    happiness: number;
    education: number;
    career: number;
  };
  hasAI: boolean;
  createdAt: number;
}

type IncomingMsg =
  | { type: "register"; listing: Omit<GameListing, "createdAt"> }
  | { type: "unregister"; roomCode: string }
  | { type: "update"; roomCode: string; playerCount: number };

type OutgoingMsg = { type: "listings"; games: GameListing[] };

const STORAGE_KEY = "listings";
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

async function getListings(room: Party.Room): Promise<GameListing[]> {
  const stored = await room.storage.get<GameListing[]>(STORAGE_KEY);
  if (!stored) return [];
  const now = Date.now();
  return stored.filter((g) => now - g.createdAt < MAX_AGE_MS);
}

async function saveAndBroadcast(
  room: Party.Room,
  listings: GameListing[]
): Promise<void> {
  await room.storage.put(STORAGE_KEY, listings);
  const msg: OutgoingMsg = { type: "listings", games: listings };
  room.broadcast(JSON.stringify(msg));
}

export default {
  async onConnect(ws: Party.Connection, room: Party.Room) {
    // Send current open listings immediately to the new connection
    const listings = await getListings(room);
    const msg: OutgoingMsg = { type: "listings", games: listings };
    ws.send(JSON.stringify(msg));
  },

  async onMessage(message: string, ws: Party.Connection, room: Party.Room) {
    let data: IncomingMsg;
    try {
      data = JSON.parse(message) as IncomingMsg;
    } catch {
      return; // ignore malformed messages
    }

    let listings = await getListings(room);

    if (data.type === "register") {
      // Replace any existing listing from this room code
      listings = listings.filter((g) => g.roomCode !== data.listing.roomCode);
      listings.push({ ...data.listing, createdAt: Date.now() });
    } else if (data.type === "unregister") {
      listings = listings.filter((g) => g.roomCode !== data.roomCode);
    } else if (data.type === "update") {
      listings = listings.map((g) =>
        g.roomCode === data.roomCode
          ? { ...g, playerCount: data.playerCount }
          : g
      );
    }

    await saveAndBroadcast(room, listings);
  },

  async onClose(_ws: Party.Connection, room: Party.Room) {
    // Prune stale listings when a client disconnects (no-op if room still active)
    const listings = await getListings(room);
    await room.storage.put(STORAGE_KEY, listings);
  },
} satisfies Party.PartyKitServer;
