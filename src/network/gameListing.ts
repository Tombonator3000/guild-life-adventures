// Public game listing service using PartyKit (replaces Firebase Realtime Database).
// Hosts can register their room so anyone can browse and join without a code.
// Requires VITE_PARTYKIT_HOST env var; falls back gracefully to no-op if not set.
//
// Server: party/gameListings.ts
// Dev:    npx partykit dev  (sets host to localhost:1999)
// Prod:   npx partykit deploy → set VITE_PARTYKIT_HOST=guild-life-adventures.<user>.partykit.dev

import PartySocket from "partysocket";
import { isPartykitConfigured, getPartykitHost } from "@/lib/partykit";
import type { GoalSettings } from "@/types/game.types";

/** A public game listing entry */
export interface GameListing {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  goals: Pick<GoalSettings, "wealth" | "happiness" | "education" | "career">;
  hasAI: boolean;
  createdAt: number;
}

// Single global registry room — all hosts/guests connect to the same PartyKit room
const REGISTRY_ROOM = "registry";

// Module-level host socket (one active host at a time)
let _hostSocket: PartySocket | null = null;

function makeSocket(): PartySocket {
  return new PartySocket({
    host: getPartykitHost(),
    room: REGISTRY_ROOM,
  });
}

/**
 * Register a public game listing. Returns a cleanup function that removes it.
 * Safe to call when PartyKit is not configured (returns no-op).
 */
export async function registerGameListing(
  listing: Omit<GameListing, "createdAt">
): Promise<() => Promise<void>> {
  if (!isPartykitConfigured()) return async () => {};

  // Close any previous host socket
  if (_hostSocket) {
    _hostSocket.close();
    _hostSocket = null;
  }

  const socket = makeSocket();
  _hostSocket = socket;

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("PartyKit connection timeout")),
        8000
      );
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        socket.send(
          JSON.stringify({ type: "register", listing })
        );
        resolve();
      });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("PartyKit connection error"));
      });
    });
  } catch (err) {
    console.warn("[GameListing] Failed to register:", err);
    socket.close();
    _hostSocket = null;
    return async () => {};
  }

  return async () => {
    if (_hostSocket === socket) {
      try {
        socket.send(
          JSON.stringify({ type: "unregister", roomCode: listing.roomCode })
        );
        // Brief delay to let the message flush before closing
        await new Promise((r) => setTimeout(r, 150));
      } catch {
        // ignore
      }
      socket.close();
      _hostSocket = null;
    }
  };
}

/**
 * Update player count in an existing listing (called when guests join).
 */
export async function updateListingPlayerCount(
  roomCode: string,
  playerCount: number
): Promise<void> {
  if (!_hostSocket) return;
  try {
    _hostSocket.send(
      JSON.stringify({ type: "update", roomCode, playerCount })
    );
  } catch {
    // Non-critical
  }
}

/**
 * Subscribe to the live list of open games.
 * Calls callback immediately with current list, then on every update.
 * Returns an unsubscribe function.
 */
export function subscribeToGameListings(
  callback: (games: GameListing[]) => void
): () => void {
  if (!isPartykitConfigured()) {
    callback([]);
    return () => {};
  }

  let closed = false;
  const socket = makeSocket();

  socket.addEventListener("message", (evt) => {
    if (closed) return;
    try {
      const msg = JSON.parse(evt.data as string) as {
        type: string;
        games: GameListing[];
      };
      if (msg.type === "listings") {
        callback(msg.games);
      }
    } catch {
      // ignore malformed
    }
  });

  socket.addEventListener("error", () => {
    if (!closed) callback([]);
  });

  return () => {
    closed = true;
    socket.close();
  };
}
