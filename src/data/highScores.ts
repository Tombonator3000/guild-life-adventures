export type HighScoreMode = 'solo' | 'local-multiplayer' | 'online';

export interface HighScoreEntry {
  id: string;
  displayName: string;
  characterName: string;
  score: number;
  week: number;
  mode: HighScoreMode;
  goalProfile: string;
  wonVictoryRace: boolean;
  wasOverallMvp: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'guild-life-high-scores-v1';
const MAX_STORED_SCORES = 50;

export function sanitizeHighScoreName(name: string): string {
  return [...name]
    .filter(character => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, 20);
}

function isHighScoreEntry(value: unknown): value is HighScoreEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<HighScoreEntry>;
  return typeof entry.id === 'string'
    && typeof entry.displayName === 'string'
    && typeof entry.characterName === 'string'
    && typeof entry.score === 'number'
    && Number.isFinite(entry.score)
    && typeof entry.week === 'number'
    && Number.isFinite(entry.week)
    && (entry.mode === 'solo' || entry.mode === 'local-multiplayer' || entry.mode === 'online')
    && typeof entry.goalProfile === 'string'
    && typeof entry.wonVictoryRace === 'boolean'
    && typeof entry.wasOverallMvp === 'boolean'
    && typeof entry.createdAt === 'number';
}

export function sortHighScores(entries: HighScoreEntry[]): HighScoreEntry[] {
  return [...entries].sort((a, b) => (
    b.score - a.score
    || a.week - b.week
    || a.createdAt - b.createdAt
  ));
}

export function loadLocalHighScores(): HighScoreEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortHighScores(parsed.filter(isHighScoreEntry)).slice(0, MAX_STORED_SCORES);
  } catch {
    return [];
  }
}

export function saveLocalHighScore(entry: HighScoreEntry): HighScoreEntry[] {
  const sanitized: HighScoreEntry = {
    ...entry,
    displayName: sanitizeHighScoreName(entry.displayName),
    characterName: sanitizeHighScoreName(entry.characterName),
    score: Math.max(0, Math.round(entry.score)),
    week: Math.max(1, Math.round(entry.week)),
  };
  if (!sanitized.displayName) return loadLocalHighScores();

  const scores = sortHighScores([
    sanitized,
    ...loadLocalHighScores().filter(existing => existing.id !== sanitized.id),
  ]).slice(0, MAX_STORED_SCORES);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // Local scores are optional; the victory screen still works when storage is unavailable.
    }
  }
  return scores;
}

export function clearLocalHighScores(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}
