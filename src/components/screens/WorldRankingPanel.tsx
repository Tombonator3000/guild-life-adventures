import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Globe2, Loader2, RefreshCw, ShieldAlert, Star, UploadCloud } from 'lucide-react';
import type { HighScoreEntry } from '@/data/highScores';
import {
  fetchWorldLeaderboard,
  isWorldLeaderboardAvailable,
  submitWorldScore,
} from '@/network/worldLeaderboard';
import type { WorldScoreEntry, WorldScoreSubmission } from '@/network/worldLeaderboardProtocol';

interface WorldRankingPanelProps {
  savedEntry: HighScoreEntry | null;
  goalProfile: string;
}

type RankingStatus = 'unavailable' | 'loading' | 'ready' | 'error' | 'submitting';

export function WorldRankingPanel({ savedEntry, goalProfile }: WorldRankingPanelProps) {
  const available = isWorldLeaderboardAvailable();
  const [scores, setScores] = useState<WorldScoreEntry[]>([]);
  const [status, setStatus] = useState<RankingStatus>(available ? 'loading' : 'unavailable');
  const [error, setError] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(() => new Set());

  const refresh = useCallback(async () => {
    if (!available) return;
    setStatus('loading');
    setError(null);
    try {
      setScores(await fetchWorldLeaderboard(100));
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the world ranking.');
      setStatus('error');
    }
  }, [available]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const profileScores = useMemo(
    () => scores.filter(score => score.goalProfile === goalProfile).slice(0, 25),
    [goalProfile, scores],
  );

  const handleSubmit = async () => {
    if (!available || !savedEntry || submittedIds.has(savedEntry.id)) return;
    const submission: WorldScoreSubmission = {
      submissionId: savedEntry.id,
      displayName: savedEntry.displayName,
      characterName: savedEntry.characterName,
      score: savedEntry.score,
      week: savedEntry.week,
      mode: savedEntry.mode,
      goalProfile: savedEntry.goalProfile,
      wonVictoryRace: savedEntry.wonVictoryRace,
      wasOverallMvp: savedEntry.wasOverallMvp,
    };

    setStatus('submitting');
    setError(null);
    try {
      setScores(await submitWorldScore(submission));
      setSubmittedIds(previous => new Set(previous).add(savedEntry.id));
      setStatus('ready');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the score.');
      setStatus('error');
    }
  };

  const alreadySubmitted = savedEntry ? submittedIds.has(savedEntry.id) : false;

  return (
    <div className="mt-6 border-t-2 border-amber-300/70 pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-blue-700" /> Community World Ranking
          </h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1.5 max-w-xl">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-700" />
            Unverified community scores. Guild Life calculates games in the browser, so this board is for fun — not a cheat-proof competitive ladder.
          </p>
        </div>
        {available && (
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={status === 'loading' || status === 'submitting'}
            className="p-2 rounded border border-blue-300/70 text-blue-800 hover:bg-blue-100/50 disabled:opacity-50"
            title="Refresh world ranking"
          >
            <RefreshCw className={`w-4 h-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {!available ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-sm text-amber-900">
          World ranking is not configured on this deployment. Local Hall of Fame still works normally.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-blue-300/70 bg-blue-50/50 p-3 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-blue-950">
                {savedEntry ? (
                  <>
                    Submit <strong>{savedEntry.displayName}</strong> · {savedEntry.score.toLocaleString()} pts · {savedEntry.goalProfile}
                  </>
                ) : (
                  'Save a local Hall of Fame score first to enable optional world submission.'
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!savedEntry || alreadySubmitted || status === 'submitting'}
                className="px-4 py-2 rounded bg-blue-700 text-white font-display text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {status === 'submitting'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <UploadCloud className="w-4 h-4" />}
                {alreadySubmitted ? 'Submitted' : 'Submit to World Ranking'}
              </button>
            </div>
            <p className="text-[11px] text-blue-800 mt-2">
              Submission is voluntary. Only the entered display name, character name, score, week, mode and award flags are sent.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50/70 p-3 mb-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 mb-2">
            <h4 className="font-display text-sm text-card-foreground">
              {goalProfile} ranking
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Top 25 of {scores.length} stored scores
            </span>
          </div>

          {status === 'loading' && scores.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading world ranking...
            </div>
          ) : profileScores.length > 0 ? (
            <div className="space-y-2">
              {profileScores.map((score, index) => (
                <div
                  key={score.id}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 items-center rounded-lg px-3 py-2 ${
                    savedEntry?.id === score.submissionId
                      ? 'bg-blue-100/70 border border-blue-400/60'
                      : 'bg-black/5'
                  }`}
                >
                  <span className="font-display text-center text-sm text-muted-foreground">
                    {index === 0 ? '🌍' : `${index + 1}.`}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-display text-card-foreground truncate">{score.displayName}</span>
                      {score.wonVictoryRace && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                      {score.wasOverallMvp && <Star className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {score.characterName} · Week {score.week} · {score.mode}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold tabular-nums text-card-foreground">
                    {score.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No {goalProfile} community scores yet. The first voluntary submission takes the throne.
            </p>
          )}
        </>
      )}
    </div>
  );
}
