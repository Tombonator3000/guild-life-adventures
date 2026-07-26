import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLocalHighScores,
  loadLocalHighScores,
  sanitizeHighScoreName,
  saveLocalHighScore,
  type HighScoreEntry,
} from './highScores';

function entry(overrides: Partial<HighScoreEntry> = {}): HighScoreEntry {
  return {
    id: 'score-1',
    displayName: 'Tom',
    characterName: 'Nessa',
    score: 4200,
    week: 19,
    mode: 'solo',
    goalProfile: 'Quick',
    wonVictoryRace: true,
    wasOverallMvp: true,
    createdAt: 1000,
    ...overrides,
  };
}

describe('local high scores', () => {
  beforeEach(() => {
    clearLocalHighScores();
  });

  it('sanitizes and stores a score', () => {
    const scores = saveLocalHighScore(entry({ displayName: '  Tom\u0000The Great  ' }));

    expect(scores).toHaveLength(1);
    expect(scores[0].displayName).toBe('TomThe Great');
    expect(loadLocalHighScores()).toEqual(scores);
  });

  it('sorts by score, then by fewer weeks', () => {
    saveLocalHighScore(entry({ id: 'slow', score: 5000, week: 20 }));
    saveLocalHighScore(entry({ id: 'lower', score: 4000, week: 10 }));
    const scores = saveLocalHighScore(entry({ id: 'fast', score: 5000, week: 12 }));

    expect(scores.map(score => score.id)).toEqual(['fast', 'slow', 'lower']);
  });

  it('replaces an entry with the same id instead of duplicating it', () => {
    saveLocalHighScore(entry());
    const scores = saveLocalHighScore(entry({ score: 6000 }));

    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(6000);
  });

  it('rejects empty display names', () => {
    const scores = saveLocalHighScore(entry({ displayName: '   ' }));
    expect(scores).toEqual([]);
  });

  it('limits visible names to twenty characters', () => {
    expect(sanitizeHighScoreName('1234567890123456789012345')).toBe('12345678901234567890');
  });
});
