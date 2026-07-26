import PartySocket from 'partysocket';
import {
  isWorldLeaderboardOutgoingMessage,
  sanitizeWorldScoreEntries,
  sanitizeWorldScoreSubmission,
  sortWorldScores,
  type WorldLeaderboardIncomingMessage,
  type WorldScoreEntry,
  type WorldScoreSubmission,
} from './worldLeaderboardProtocol';

const LEADERBOARD_ROOM = 'leaderboard';
const REQUEST_TIMEOUT_MS = 6000;
const DEFAULT_LIMIT = 25;

export function normalizeWorldLeaderboardHost(value: string | undefined): string | null {
  const normalized = value
    ?.trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  if (!normalized || normalized.includes('your-username')) return null;
  return normalized;
}

export function getWorldLeaderboardHost(): string | null {
  return normalizeWorldLeaderboardHost(import.meta.env.VITE_PARTYKIT_HOST);
}

export function isWorldLeaderboardAvailable(): boolean {
  return getWorldLeaderboardHost() !== null;
}

function leaderboardErrorMessage(error: 'invalid-submission' | 'rate-limited'): string {
  return error === 'rate-limited'
    ? 'Too many world-ranking submissions. Try again later.'
    : 'The score was rejected by the world-ranking server.';
}

function requestWorldLeaderboard(
  request: WorldLeaderboardIncomingMessage,
  expectedSubmissionId?: string,
): Promise<WorldScoreEntry[]> {
  const host = getWorldLeaderboardHost();
  if (!host) {
    return Promise.reject(new Error('World ranking is not configured for this deployment.'));
  }

  return new Promise((resolve, reject) => {
    const socket = new PartySocket({ host, room: LEADERBOARD_ROOM });
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error('World ranking did not respond in time.')));
    }, REQUEST_TIMEOUT_MS);

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(request));
    });

    socket.addEventListener('message', event => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!isWorldLeaderboardOutgoingMessage(parsed)) return;

      const scores = sortWorldScores(sanitizeWorldScoreEntries(parsed.scores));
      if (parsed.error) {
        finish(() => reject(new Error(leaderboardErrorMessage(parsed.error))));
        return;
      }

      if (expectedSubmissionId) {
        if (parsed.acceptedSubmissionId !== expectedSubmissionId) return;
        finish(() => resolve(scores));
        return;
      }

      finish(() => resolve(scores));
    });

    socket.addEventListener('error', () => {
      finish(() => reject(new Error('Could not connect to the world-ranking server.')));
    });
  });
}

export async function fetchWorldLeaderboard(limit = DEFAULT_LIMIT): Promise<WorldScoreEntry[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.round(limit)));
  const scores = await requestWorldLeaderboard({ type: 'leaderboard-get', limit: safeLimit });
  return scores.slice(0, safeLimit);
}

export function submitWorldScore(entry: WorldScoreSubmission): Promise<WorldScoreEntry[]> {
  const sanitized = sanitizeWorldScoreSubmission(entry);
  if (!sanitized) {
    return Promise.reject(new Error('The score is not valid for world ranking.'));
  }
  return requestWorldLeaderboard(
    { type: 'leaderboard-submit', entry: sanitized },
    sanitized.submissionId,
  );
}
