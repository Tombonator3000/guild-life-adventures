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
const WORLD_SCORE_RATE_LIMIT_STORAGE_KEY = "world-score-rate-limits-v1";
const MAX_WORLD_SCORES = 100;
const DEFAULT_WORLD_SCORE_LIMIT = 25;
const MAX_SUBMISSIONS_PER_HOUR = 5;
const SUBMISSION_WINDOW_MS = 60 * 60 * 1000;
const UNKNOWN_CLIENT_RATE_LIMIT_KEY = "unknown-client";

type LeaderboardConnectionState = { rateLimitKey: string };
type SubmissionTimesByClient = Record<string, number[]>;

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

async function createRateLimitKey(request: Party.Request): Promise<string> {
  const forwardedFor = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!forwardedFor) return UNKNOWN_CLIENT_RATE_LIMIT_KEY;

  const bytes = new TextEncoder().encode(forwardedFor);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function canSubmitScore(
  connection: Party.Connection<LeaderboardConnectionState>,
  room: Party.Room,
): Promise<boolean> {
  const now = Date.now();
  const rateLimitKey = connection.state?.rateLimitKey ?? UNKNOWN_CLIENT_RATE_LIMIT_KEY;
  const submissionTimes = await room.storage.get<SubmissionTimesByClient>(
    WORLD_SCORE_RATE_LIMIT_STORAGE_KEY,
  ) ?? {};
  for (const [clientKey, timestamps] of Object.entries(submissionTimes)) {
    const activeTimestamps = timestamps.filter(
      timestamp => now - timestamp < SUBMISSION_WINDOW_MS,
    );
    if (activeTimestamps.length > 0) submissionTimes[clientKey] = activeTimestamps;
    else delete submissionTimes[clientKey];
  }
  const recent = submissionTimes[rateLimitKey] ?? [];
  if (recent.length >= MAX_SUBMISSIONS_PER_HOUR) {
    submissionTimes[rateLimitKey] = recent;
    await room.storage.put(WORLD_SCORE_RATE_LIMIT_STORAGE_KEY, submissionTimes);
    return false;
  }
  recent.push(now);
  submissionTimes[rateLimitKey] = recent;
  await room.storage.put(WORLD_SCORE_RATE_LIMIT_STORAGE_KEY, submissionTimes);
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

  if (!await canSubmitScore(connection, room)) {
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
  async onConnect(
    connection: Party.Connection<LeaderboardConnectionState>,
    room: Party.Room,
    context: Party.ConnectionContext,
  ) {
    connection.setState({ rateLimitKey: await createRateLimitKey(context.request) });
    // Public room-browser clients expect the current listings immediately.
    // Leaderboard clients ignore this message and issue an explicit leaderboard-get,
    // which guarantees that their requested result limit is respected.
    const listings = await getListings(room);
    const listingMessage: ListingOutgoingMessage = { type: "listings", games: listings };
    connection.send(JSON.stringify(listingMessage));
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
