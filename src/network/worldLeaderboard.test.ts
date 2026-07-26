import { describe, expect, it } from 'vitest';
import { normalizeWorldLeaderboardHost } from './worldLeaderboard';

describe('world leaderboard client configuration', () => {
  it('normalizes PartyKit hosts', () => {
    expect(normalizeWorldLeaderboardHost('https://guild-life.example.partykit.dev/')).toBe(
      'guild-life.example.partykit.dev',
    );
    expect(normalizeWorldLeaderboardHost('localhost:1999')).toBe('localhost:1999');
  });

  it('disables placeholder and missing hosts', () => {
    expect(normalizeWorldLeaderboardHost(undefined)).toBeNull();
    expect(normalizeWorldLeaderboardHost('')).toBeNull();
    expect(normalizeWorldLeaderboardHost('guild-life-adventures.your-username.partykit.dev')).toBeNull();
  });
});
