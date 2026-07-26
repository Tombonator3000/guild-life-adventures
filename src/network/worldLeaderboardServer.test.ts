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

function createConnection() {
  const messages: string[] = [];
  return {
    messages,
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
    expect(worldMessages(connection.messages).at(-1)?.acceptedSubmissionId).toBe('valid-1');
  });

  it('treats repeated submission ids as an idempotent retry', async () => {
    const room = createRoom();
    const connection = createConnection();
    const message = JSON.stringify({ type: 'leaderboard-submit', entry: submission('same-id') });

    await server.onMessage(message, connection as never, room as never);
    await server.onMessage(message, connection as never, room as never);

    const stored = room.values.get('world-high-scores-v1') as WorldScoreEntry[];
    expect(stored).toHaveLength(1);
    expect(worldMessages(connection.messages).at(-1)?.acceptedSubmissionId).toBe('same-id');
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
    expect(worldMessages(connection.messages).at(-1)?.error).toBe('invalid-submission');
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
    expect(worldMessages(connection.messages).at(-1)?.error).toBe('rate-limited');
  });

  it('sends the stored board when a leaderboard client connects', async () => {
    const room = createRoom();
    const connection = createConnection();
    room.values.set('world-high-scores-v1', [
      { ...submission('stored'), id: 'server-id', submittedAt: 10 },
    ] satisfies WorldScoreEntry[]);

    await server.onConnect(connection as never, room as never);

    const message = worldMessages(connection.messages).at(-1);
    expect(message?.scores).toHaveLength(1);
    expect(message?.scores[0].submissionId).toBe('stored');
  });
});
