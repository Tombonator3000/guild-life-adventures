// Public game listing using MQTT over WebSocket (HiveMQ free public broker).
// No configuration or deployment required — works out of the box in any browser.
//
// Broker:  wss://broker.hivemq.com:8884/mqtt  (free, no account needed)
// Topics:  guild-life-adventures/rooms/{roomCode}
// Strategy: retained messages with 5-minute MQTT 5.0 auto-expiry.
//   - Hosts publish their room info on connect; empty retained msg on disconnect.
//   - Guests subscribe to the wildcard topic and get the full list immediately.

import mqtt from "mqtt";
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

const BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_PREFIX = "guild-life-adventures/rooms";
const TTL_SECS = 300; // 5-minute auto-expiry via MQTT 5.0 messageExpiryInterval

function makeClientId(): string {
  return `gl-${Math.random().toString(36).slice(2, 10)}`;
}

// Module-level host client kept alive while room is public
let _hostClient: mqtt.MqttClient | null = null;
let _cachedListing: GameListing | null = null;

function publishListing(client: mqtt.MqttClient, listing: GameListing): Promise<void> {
  return new Promise((resolve, reject) => {
    client.publish(
      `${TOPIC_PREFIX}/${listing.roomCode}`,
      JSON.stringify(listing),
      { retain: true, qos: 1, properties: { messageExpiryInterval: TTL_SECS } },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

/**
 * Register a public game listing.
 * Returns a cleanup function that removes it from the broker.
 */
export async function registerGameListing(
  listing: Omit<GameListing, "createdAt">
): Promise<() => Promise<void>> {
  // Close any previous host client
  _hostClient?.end(true);
  _hostClient = null;
  _cachedListing = null;

  const full: GameListing = { ...listing, createdAt: Date.now() };
  const client = mqtt.connect(BROKER_URL, {
    protocolVersion: 5,
    clientId: makeClientId(),
    clean: true,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("MQTT connection timeout")), 8000);
      client.once("connect", () => {
        clearTimeout(timer);
        publishListing(client, full).then(resolve).catch(reject);
      });
      client.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    _hostClient = client;
    _cachedListing = full;
  } catch (err) {
    console.warn("[GameListing] MQTT registration failed:", err);
    client.end(true);
    return async () => {};
  }

  const captured = client;
  return async () => {
    if (_hostClient !== captured) return;
    // Clear the retained message by publishing an empty payload
    try {
      await new Promise<void>((resolve) => {
        captured.publish(
          `${TOPIC_PREFIX}/${listing.roomCode}`,
          "",
          { retain: true, qos: 1 },
          () => resolve()
        );
      });
    } catch {
      // ignore — broker will auto-expire after TTL anyway
    }
    captured.end(true);
    _hostClient = null;
    _cachedListing = null;
  };
}

/**
 * Update player count in an existing listing (called when guests join).
 */
export async function updateListingPlayerCount(
  roomCode: string,
  playerCount: number
): Promise<void> {
  if (!_hostClient || !_cachedListing || _cachedListing.roomCode !== roomCode) return;
  _cachedListing = { ..._cachedListing, playerCount, createdAt: Date.now() };
  try {
    await publishListing(_hostClient, _cachedListing);
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
  const map = new Map<string, GameListing>();
  let closed = false;

  const client = mqtt.connect(BROKER_URL, {
    protocolVersion: 5,
    clientId: makeClientId(),
    clean: true,
  });

  client.on("connect", () => {
    if (!closed) client.subscribe(`${TOPIC_PREFIX}/+`, { qos: 1 });
  });

  client.on("message", (topic, payload) => {
    if (closed) return;
    const code = topic.split("/").pop() ?? "";
    const raw = payload.toString();

    if (!raw) {
      // Empty payload = host explicitly removed the listing
      map.delete(code);
    } else {
      try {
        const data = JSON.parse(raw) as GameListing;
        // Also filter client-side in case broker doesn't support MQTT 5 expiry
        if (Date.now() - data.createdAt < TTL_SECS * 1000) {
          map.set(code, data);
        }
      } catch {
        // Malformed — ignore
      }
    }

    callback([...map.values()].sort((a, b) => a.createdAt - b.createdAt));
  });

  client.on("error", () => {
    if (!closed) callback([]);
  });

  // After 3 seconds, emit whatever we have (could be empty — no rooms open)
  // so the UI doesn't stay in a "loading" state indefinitely.
  const emptyTimer = setTimeout(() => {
    if (!closed) callback([...map.values()].sort((a, b) => a.createdAt - b.createdAt));
  }, 3000);

  return () => {
    closed = true;
    clearTimeout(emptyTimer);
    client.end(true);
  };
}
