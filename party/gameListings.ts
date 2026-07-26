// PartyKit server for public game room listing and the community world leaderboard.
// The leaderboard is intentionally labelled unverified in the client because game state
// is client-authoritative. Server validation here limits malformed/spam submissions only.
//
// Deploy:  npx partykit deploy
// Dev:     npx partykit dev   (connects on localhost:1999)

import type * as Party from "partykit/server";
import {
  sanitizeWorldScoreEntries,
  sanitizeWorldScoreSubmission,
  sortWorldScores,
  type WorldLeaderboardIncomingMessage,
  type WorldLeaderboardOutgoingMessage,
  type WorldScoreEntry,
} from "../src/network/worldLeaderboardProtocol";

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

type ListingIncomingMessage =
  | { type: "register"; listing: Omit<GameListing, "createdAt"> }
  | { type: "unregister"; roomCode: string }
  | { type: "update"; roomCode: string; playerCount: number };

type IncomingMessage = ListingIncomingMessage | WorldLeaderboardIncomingMessage;
type ListingOutgoingMessage = { type: "listings"; games: GameListing[] };

const LISTING_STORAGE_KEY = "listings";
const LISTING_MAX_AGE_MS = 5 * 60 * 1000;
const WORLD_SCORE_STORAGE_KEY = "world-high-scores-v1";
const MAX_WORLD_SCORES = 100;
const DEFAULT_WORLD_SCORE_LIMIT = 25;
const MAX_SUBMISSIONS_PER_HOUR = 5;
const SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const submissionTimes = new WeakMap<object, number[]>();

async function getListings(room: Party.Room): Promise<GameListing[]> {
  const stored = await room.storage.get<GameListing[]>(LISTING_STORAGE_KEY);
  if (!stored) return [];
  const now = Date.now();
  return stored.filter(listing => now - listing.createdAt < LISTING_MAX_AGE_MS);
}

async function saveAndBroadcastListings(
  room: Party.Room,
  listings: GameListing[],
): Promise<void> {
  await room.storage.put(LISTING_STORAGE_KEY, listings);
  const message: ListingOutgoingMessage = { type: "listings", games: listings };
  room.broadcast(JSON.stringify(message));
}

async function getWorldScores(room: Party.Room): Promise<WorldScoreEntry[]> {
  const stored = await room.storage.get<unknown[]>(WORLD_SCORE_STORAGE_KEY);
  return stored
    ? sortWorldScores(sanitizeWorldScoreEntries(stored)).slice(0, MAX_WORLD_SCORES)
    : [];
}

function clampLeaderboardLimit(limit: unknown): number {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed)) return DEFAULT_WORLD_SCORE_LIMIT;
  return Math.min(MAX_WORLD_SCORES, Math.max(1, parsed));
}

function createWorldScoreId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function canSubmitScore(connection: Party.Connection): boolean {
  const now = Date.now();
  const recent = (submissionTimes.get(connection) ?? [])
    .filter(timestamp => now - timestamp < SUBMISSION_WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS_PER_HOUR) {
    submissionTimes.set(connection, recent);
    return false;
  }
  recent.push(now);
  submissionTimes.set(connection, recent);
  return true;
}

function sendWorldScores(
  connection: Party.Connection,
  scores: WorldScoreEntry[],
  options: Pick<WorldLeaderboardOutgoingMessage, "acceptedSubmissionId" | "error"> = {},
): void {
  const message: WorldLeaderboardOutgoingMessage = {
    type: "world-leaderboard",
    scores,
    ...options,
  };
  connection.send(JSON.stringify(message));
}

async function handleLeaderboardMessage(
  data: WorldLeaderboardIncomingMessage,
  connection: Party.Connection,
  room: Party.Room,
): Promise<void> {
  const scores = await getWorldScores(room);

  if (data.type === "leaderboard-get") {
    sendWorldScores(connection, scores.slice(0, clampLeaderboardLimit(data.limit)));
    return;
  }

  const submission = sanitizeWorldScoreSubmission(data.entry);
  if (!submission) {
    sendWorldScores(connection, scores.slice(0, DEFAULT_WORLD_SCORE_LIMIT), {
      error: "invalid-submission",
    });
    return;
  }

  // Retry-safe/idempotent: a repeated submission ID returns success without adding a copy.
  if (scores.some(score => score.submissionId === submission.submissionId)) {
    sendWorldScores(connection, scores.slice(0, DEFAULT_WORLD_SCORE_LIMIT), {
      acceptedSubmissionId: submission.submissionId,
    });
    return;
  }

  if (!canSubmitScore(connection)) {
    sendWorldScores(connection, scores.slice(0, DEFAULT_WORLD_SCORE_LIMIT), {
      error: "rate-limited",
    });
    return;
  }

  const entry: WorldScoreEntry = {
    ...submission,
    id: createWorldScoreId(),
    submittedAt: Date.now(),
  };
  const updated = sortWorldScores([entry, ...scores]).slice(0, MAX_WORLD_SCORES);
  await room.storage.put(WORLD_SCORE_STORAGE_KEY, updated);

  const broadcast: WorldLeaderboardOutgoingMessage = {
    type: "world-leaderboard",
    scores: updated,
  };
  room.broadcast(JSON.stringify(broadcast));
  sendWorldScores(connection, updated, {
    acceptedSubmissionId: submission.submissionId,
  });
}

export default {
  async onConnect(connection: Party.Connection, room: Party.Room) {
    const listings = await getListings(room);
    const listingMessage: ListingOutgoingMessage = { type: "listings", games: listings };
    connection.send(JSON.stringify(listingMessage));

    const scores = await getWorldScores(room);
    sendWorldScores(connection, scores.slice(0, DEFAULT_WORLD_SCORE_LIMIT));
  },

  async onMessage(message: string, connection: Party.Connection, room: Party.Room) {
    let data: IncomingMessage;
    try {
      data = JSON.parse(message) as IncomingMessage;
    } catch {
      return;
    }

    if (data.type === "leaderboard-get" || data.type === "leaderboard-submit") {
      await handleLeaderboardMessage(data, connection, room);
      return;
    }

    let listings = await getListings(room);
    if (data.type === "register") {
      listings = listings.filter(listing => listing.roomCode !== data.listing.roomCode);
      listings.push({ ...data.listing, createdAt: Date.now() });
    } else if (data.type === "unregister") {
      listings = listings.filter(listing => listing.roomCode !== data.roomCode);
    } else if (data.type === "update") {
      listings = listings.map(listing => (
        listing.roomCode === data.roomCode
          ? { ...listing, playerCount: data.playerCount }
          : listing
      ));
    }

    await saveAndBroadcastListings(room, listings);
  },

  async onClose(_connection: Party.Connection, room: Party.Room) {
    const listings = await getListings(room);
    await room.storage.put(LISTING_STORAGE_KEY, listings);
  },
} satisfies Party.PartyKitServer;
