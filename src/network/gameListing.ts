// Public game listing service using Firebase Realtime Database.
// Hosts can register their room so anyone can browse and join without a code.
// Listings are cleaned up automatically when hosts leave or start the game.

import { ref, set, remove, onValue, off, serverTimestamp } from 'firebase/database';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import type { GoalSettings } from '@/types/game.types';

/** A public game listing entry stored in Firebase */
export interface GameListing {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  goals: Pick<GoalSettings, 'wealth' | 'happiness' | 'education' | 'career'>;
  hasAI: boolean;
  createdAt: number;
}

const LISTINGS_PATH = 'guild-life/openGames';
/** Listings older than this are considered stale and hidden from the browser */
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function listingPath(roomCode: string) {
  return `${LISTINGS_PATH}/${roomCode}`;
}

/**
 * Register a public game listing. Returns a cleanup function that removes it.
 * Safe to call even if Firebase is not configured (returns no-op).
 */
export async function registerGameListing(listing: GameListing): Promise<() => Promise<void>> {
  if (!isFirebaseConfigured()) return async () => {};

  try {
    const db = getFirebaseDb();
    const path = listingPath(listing.roomCode);
    await set(ref(db, path), {
      ...listing,
      createdAt: serverTimestamp(),
    });

    const cleanup = async () => {
      try {
        await remove(ref(db, path));
      } catch {
        // Ignore cleanup errors (e.g. already removed)
      }
    };
    return cleanup;
  } catch (err) {
    console.warn('[GameListing] Failed to register:', err);
    return async () => {};
  }
}

/**
 * Update player count in an existing listing (called when players join).
 */
export async function updateListingPlayerCount(roomCode: string, playerCount: number): Promise<void> {
  if (!isFirebaseConfigured()) return;
  try {
    const db = getFirebaseDb();
    await set(ref(db, `${listingPath(roomCode)}/playerCount`), playerCount);
  } catch {
    // Non-critical update
  }
}

/**
 * Subscribe to the live list of open games.
 * Filters out stale listings (> 5 minutes old).
 * Returns an unsubscribe function.
 */
export function subscribeToGameListings(
  callback: (games: GameListing[]) => void
): () => void {
  if (!isFirebaseConfigured()) {
    callback([]);
    return () => {};
  }

  try {
    const db = getFirebaseDb();
    const listingsRef = ref(db, LISTINGS_PATH);

    const handler = (snapshot: import('firebase/database').DataSnapshot) => {
      const raw = snapshot.val() as Record<string, GameListing & { createdAt: number }> | null;
      if (!raw) {
        callback([]);
        return;
      }
      const now = Date.now();
      const games = Object.values(raw).filter(g =>
        g && g.roomCode && (now - g.createdAt < MAX_AGE_MS || g.createdAt > now - 1000)
      );
      callback(games);
    };

    onValue(listingsRef, handler);
    return () => off(listingsRef, 'value', handler);
  } catch (err) {
    console.warn('[GameListing] Failed to subscribe:', err);
    callback([]);
    return () => {};
  }
}
