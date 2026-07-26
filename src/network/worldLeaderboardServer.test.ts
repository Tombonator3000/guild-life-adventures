import { describe, expect, it, vi } from 'vitest';
import server from '../../party/gameListings';
import type {
  WorldLeaderboardOutgoingMessage,
  WorldScoreEntry,
  WorldScoreSubmission,
} from './worldLeaderboardProtocol';

function createRoom() {
  const values = new Map<string, unknown>();
  const broadcasts: string[] = [];
  return {
    values,
    broadcasts,
    storage: {
      get: async <T>(key: string): Promise<T | undefined> => values.get(key) as T | undefined,
      put: async <T>(key: string, value: T): Promise<void> => {
        values.set(key, value);
      },
    },
    broadcast: vi.fn((message: string) => {
      broadcasts.push(message);
    }),
  };
}

function createConnection(rateLimitKey?: string) {
  const messages: string[] = [];
  return {
    messages,
    state: rateLimitKey ? { rateLimitKey } : null,
    setState(state: { rateLimitKey: string }) {
      this.state = state;
      return state;
    },
    send: vi.fn((message: string) => {
      messages.push(message);
    }),
  };
}

function submission(id: string, overrides: Partial<WorldScoreSubmission> = {}): WorldScoreSubmission {
  return {
    submissionId: id,
    displayName: 'Tom',
    characterName: 'Nessa',
    score: 7420,
    week: 19,
    mode: 'online',
    goalProfile: 'Quick',
    wonVictoryRace: false,
    wasOverallMvp: true,
    ...overrides,
  };
}

function worldMessages(messages: string[]): WorldLeaderboardOutgoingMessage[] {
  return messages
    .map(message => JSON.parse(message) as unknown)
    .filter((message): message is WorldLeaderboardOutgoingMessage => (
      !!message
      && typeof message === 'object'
      && (message as { type?: string }).type === 'world-leaderboard'
    ));
}

function lastWorldMessage(messages: string[]): WorldLeaderboardOutgoingMessage | undefined {
  const parsed = worldMessages(messages);
  return parsed[parsed.length - 1];
}

describe('PartyKit world leaderboard server', () => {
  it('stores, broadcasts and acknowledges a valid score', async () => {
    const room = createRoom();
    const connection = createConnection();
    const entry = submission('valid-1');

    await server.onMessage(
      JSON.stringify({ type: 'leaderboard-submit', entry }),
      connection as never,
      room as never,
    );

    const stored = room.values.get('world-high-scores-v1') as WorldScoreEntry[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject(entry);
    expect(room.broadcast).toHaveBeenCalledTimes(1);
    expect(lastWorldMessage(connection.messages)?.acceptedSubmissionId).toBe('valid-1');
  });

  it('treats repeated submission ids as an idempotent retry', async () => {
    const room = createRoom();
    const connection = createConnection();
    const message = JSON.stringify({ type: 'leaderboard-submit', entry: submission('same-id') });

    await server.onMessage(message, connection as never, room as never);
    await server.onMessage(message, connection as never, room as never);

    const stored = room.values.get('world-high-scores-v1') as WorldScoreEntry[];
    expect(stored).toHaveLength(1);
    expect(lastWorldMessage(connection.messages)?.acceptedSubmissionId).toBe('same-id');
  });

  it('rejects an impossible score without storing it', async () => {
    const room = createRoom();
    const connection = createConnection();

    await server.onMessage(
      JSON.stringify({ type: 'leaderboard-submit', entry: submission('invalid', { score: 10001 }) }),
      connection as never,
      room as never,
    );

    expect(room.values.has('world-high-scores-v1')).toBe(false);
    expect(lastWorldMessage(connection.messages)?.error).toBe('invalid-submission');
  });

  it('rate-limits the sixth new score from one connection', async () => {
    const room = createRoom();
    const connection = createConnection();

    for (let index = 0; index < 6; index++) {
      await server.onMessage(
        JSON.stringify({ type: 'leaderboard-submit', entry: submission(`rate-${index}`) }),
        connection as never,
        room as never,
      );
    }

    const stored = room.values.get('world-high-scores-v1') as WorldScoreEntry[];
    expect(stored).toHaveLength(5);
    expect(lastWorldMessage(connection.messages)?.error).toBe('rate-limited');
  });

  it('persists a client rate limit across replacement connections', async () => {
    const room = createRoom();

    for (let index = 0; index < 5; index++) {
      const connection = createConnection('same-client');
      await server.onMessage(
        JSON.stringify({ type: 'leaderboard-submit', entry: submission(`reconnect-${index}`) }),
        connection as never,
        room as never,
      );
    }

    const replacementConnection = createConnection('same-client');
    await server.onMessage(
      JSON.stringify({ type: 'leaderboard-submit', entry: submission('reconnect-blocked') }),
      replacementConnection as never,
      room as never,
    );

    const stored = room.values.get('world-high-scores-v1') as WorldScoreEntry[];
    expect(stored).toHaveLength(5);
    expect(lastWorldMessage(replacementConnection.messages)?.error).toBe('rate-limited');
  });

  it('sends the requested number of stored scores after leaderboard-get', async () => {
    const room = createRoom();
    const connection = createConnection();
    room.values.set('world-high-scores-v1', [
      { ...submission('first', { score: 8000 }), id: 'first-id', submittedAt: 10 },
      { ...submission('second', { score: 7000 }), id: 'second-id', submittedAt: 20 },
    ] satisfies WorldScoreEntry[]);

    await server.onMessage(
      JSON.stringify({ type: 'leaderboard-get', limit: 1 }),
      connection as never,
      room as never,
    );

    const message = lastWorldMessage(connection.messages);
    expect(message?.scores).toHaveLength(1);
    expect(message?.scores[0].submissionId).toBe('first');
  });
});
