import { describe, expect, it } from 'vitest';
import {
  sanitizeWorldScoreSubmission,
  sortWorldScores,
  type WorldScoreEntry,
} from './worldLeaderboardProtocol';

const validSubmission = {
  submissionId: 'score-1',
  displayName: 'Tom',
  characterName: 'Nessa',
  score: 7420,
  week: 19,
  mode: 'online' as const,
  goalProfile: 'Quick',
  wonVictoryRace: false,
  wasOverallMvp: true,
};

describe('world leaderboard protocol', () => {
  it('accepts and sanitizes a valid score submission', () => {
    expect(sanitizeWorldScoreSubmission({
      ...validSubmission,
      displayName: '  Tom\u0000  ',
    })).toEqual({
      ...validSubmission,
      displayName: 'Tom',
    });
  });

  it('rejects impossible scores and weeks', () => {
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, score: 10001 })).toBeNull();
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, score: -1 })).toBeNull();
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, week: 0 })).toBeNull();
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, week: 1001 })).toBeNull();
  });

  it('rejects invalid modes, empty names and malformed booleans', () => {
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, mode: 'ranked' })).toBeNull();
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, displayName: '   ' })).toBeNull();
    expect(sanitizeWorldScoreSubmission({ ...validSubmission, wonVictoryRace: 'yes' })).toBeNull();
  });

  it('limits public text fields', () => {
    const sanitized = sanitizeWorldScoreSubmission({
      ...validSubmission,
      displayName: '1234567890123456789012345',
      goalProfile: 'abcdefghijklmnopqrstuvwxyz',
    });

    expect(sanitized?.displayName).toBe('12345678901234567890');
    expect(sanitized?.goalProfile).toBe('abcdefghijklmnopqrstuvwx');
  });

  it('sorts by score, then fewer weeks, then earlier submission', () => {
    const scores: WorldScoreEntry[] = [
      { ...validSubmission, id: 'slow', score: 8000, week: 20, submittedAt: 10 },
      { ...validSubmission, id: 'lower', score: 7000, week: 10, submittedAt: 5 },
      { ...validSubmission, id: 'fast-late', score: 8000, week: 12, submittedAt: 20 },
      { ...validSubmission, id: 'fast-early', score: 8000, week: 12, submittedAt: 15 },
    ];

    expect(sortWorldScores(scores).map(score => score.id)).toEqual([
      'fast-early',
      'fast-late',
      'slow',
      'lower',
    ]);
  });
});
