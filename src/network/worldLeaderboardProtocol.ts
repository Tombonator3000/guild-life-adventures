import type { HighScoreMode } from '@/data/highScores';

export interface WorldScoreSubmission {
  submissionId: string;
  displayName: string;
  characterName: string;
  score: number;
  week: number;
  mode: HighScoreMode;
  goalProfile: string;
  wonVictoryRace: boolean;
  wasOverallMvp: boolean;
}

export interface WorldScoreEntry extends WorldScoreSubmission {
  id: string;
  submittedAt: number;
}

export type WorldLeaderboardIncomingMessage =
  | { type: 'leaderboard-get'; limit?: number }
  | { type: 'leaderboard-submit'; entry: WorldScoreSubmission };

export type WorldLeaderboardError = 'invalid-submission' | 'rate-limited';

export type WorldLeaderboardOutgoingMessage = {
  type: 'world-leaderboard';
  scores: WorldScoreEntry[];
  acceptedSubmissionId?: string;
  error?: WorldLeaderboardError;
};

const VALID_MODES = new Set<HighScoreMode>(['solo', 'local-multiplayer', 'online']);

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return [...value]
    .filter(character => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeWorldScoreSubmission(value: unknown): WorldScoreSubmission | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<WorldScoreSubmission>;
  const submissionId = sanitizeText(candidate.submissionId, 80);
  const displayName = sanitizeText(candidate.displayName, 20);
  const characterName = sanitizeText(candidate.characterName, 20);
  const goalProfile = sanitizeText(candidate.goalProfile, 24);
  const score = Number(candidate.score);
  const week = Number(candidate.week);

  if (!submissionId || !displayName || !characterName || !goalProfile) return null;
  if (!Number.isInteger(score) || score < 0 || score > 10000) return null;
  if (!Number.isInteger(week) || week < 1 || week > 1000) return null;
  if (!VALID_MODES.has(candidate.mode as HighScoreMode)) return null;
  if (typeof candidate.wonVictoryRace !== 'boolean' || typeof candidate.wasOverallMvp !== 'boolean') return null;

  return {
    submissionId,
    displayName,
    characterName,
    goalProfile,
    score,
    week,
    mode: candidate.mode as HighScoreMode,
    wonVictoryRace: candidate.wonVictoryRace,
    wasOverallMvp: candidate.wasOverallMvp,
  };
}

export function sortWorldScores(scores: WorldScoreEntry[]): WorldScoreEntry[] {
  return [...scores].sort((a, b) => (
    b.score - a.score
    || a.week - b.week
    || a.submittedAt - b.submittedAt
  ));
}

export function isWorldLeaderboardOutgoingMessage(value: unknown): value is WorldLeaderboardOutgoingMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<WorldLeaderboardOutgoingMessage>;
  return message.type === 'world-leaderboard' && Array.isArray(message.scores);
}
