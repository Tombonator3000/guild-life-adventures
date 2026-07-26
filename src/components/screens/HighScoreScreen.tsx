import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Crown,
  Globe2,
  Loader2,
  Medal,
  RefreshCw,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  clearLocalHighScores,
  loadLocalHighScores,
  type HighScoreEntry,
} from '@/data/highScores';
import {
  fetchWorldLeaderboard,
  isWorldLeaderboardAvailable,
} from '@/network/worldLeaderboard';
import type { WorldScoreEntry } from '@/network/worldLeaderboardProtocol';

type ScoreSource = 'local' | 'world';
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

interface HighScoreScreenProps {
  onClose: () => void;
}

interface DisplayScore {
  id: string;
  displayName: string;
  characterName: string;
  score: number;
  week: number;
  mode: string;
  goalProfile: string;
  wonVictoryRace: boolean;
  wasOverallMvp: boolean;
}

function ScoreRow({ score, rank, world }: { score: DisplayScore; rank: number; world: boolean }) {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-3 items-center rounded-lg bg-black/5 px-3 py-2.5">
      <span className="font-display text-center text-sm text-muted-foreground">
        {rank === 1 ? (world ? '🌍' : '🥇') : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-display text-card-foreground truncate">{score.displayName}</span>
          {score.wonVictoryRace && (
            <Crown className="w-3.5 h-3.5 text-amber-600" aria-label="Victory race winner" />
          )}
          {score.wasOverallMvp && (
            <Star className="w-3.5 h-3.5 text-purple-600" aria-label="Overall MVP" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {score.characterName} · {score.goalProfile} · Week {score.week} · {score.mode}
        </p>
      </div>
      <span className="font-display text-sm font-bold tabular-nums text-card-foreground">
        {score.score.toLocaleString()}
      </span>
    </div>
  );
}

export function HighScoreScreen({ onClose }: HighScoreScreenProps) {
  const worldAvailable = isWorldLeaderboardAvailable();
  const [source, setSource] = useState<ScoreSource>('local');
  const [localScores, setLocalScores] = useState<HighScoreEntry[]>(() => loadLocalHighScores());
  const [worldScores, setWorldScores] = useState<WorldScoreEntry[]>([]);
  const [worldStatus, setWorldStatus] = useState<LoadStatus>(worldAvailable ? 'idle' : 'unavailable');
  const [worldError, setWorldError] = useState<string | null>(null);
  const [goalProfile, setGoalProfile] = useState('all');

  const refreshWorldScores = useCallback(async () => {
    if (!worldAvailable) return;
    setWorldStatus('loading');
    setWorldError(null);
    try {
      setWorldScores(await fetchWorldLeaderboard(100));
      setWorldStatus('ready');
    } catch (reason) {
      setWorldError(reason instanceof Error ? reason.message : 'Could not load the world ranking.');
      setWorldStatus('error');
    }
  }, [worldAvailable]);

  useEffect(() => {
    if (source === 'world' && worldStatus === 'idle') {
      void refreshWorldScores();
    }
  }, [refreshWorldScores, source, worldStatus]);

  const activeScores: DisplayScore[] = source === 'local' ? localScores : worldScores;
  const profiles = useMemo(
    () => [...new Set(activeScores.map(score => score.goalProfile).filter(Boolean))].sort(),
    [activeScores],
  );
  const visibleScores = useMemo(
    () => activeScores
      .filter(score => goalProfile === 'all' || score.goalProfile === goalProfile)
      .slice(0, 25),
    [activeScores, goalProfile],
  );

  const changeSource = (next: ScoreSource) => {
    setSource(next);
    setGoalProfile('all');
  };

  const clearLocal = () => {
    clearLocalHighScores();
    setLocalScores([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/65" onClick={onClose} />
      <div className="relative parchment-panel p-5 w-full max-w-2xl mx-4" style={{ maxHeight: '88vh' }}>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-card-foreground z-10"
          aria-label="Close Hall of Fame"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <h2 className="font-display text-2xl text-card-foreground flex items-center justify-center gap-2">
            <Medal className="w-6 h-6 text-amber-600" /> Hall of Fame
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Performance rankings are separate from the victory race.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => changeSource('local')}
            className={`rounded-lg border px-4 py-2 font-display text-sm transition-colors ${
              source === 'local'
                ? 'border-amber-500 bg-amber-100/70 text-amber-950'
                : 'border-border/50 bg-black/5 text-muted-foreground hover:bg-black/10'
            }`}
          >
            Local Scores
          </button>
          <button
            type="button"
            onClick={() => changeSource('world')}
            className={`rounded-lg border px-4 py-2 font-display text-sm transition-colors inline-flex items-center justify-center gap-2 ${
              source === 'world'
                ? 'border-blue-500 bg-blue-100/70 text-blue-950'
                : 'border-border/50 bg-black/5 text-muted-foreground hover:bg-black/10'
            }`}
          >
            <Globe2 className="w-4 h-4" /> World Ranking
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <label className="text-xs text-muted-foreground">
            Goal profile
            <select
              value={goalProfile}
              onChange={event => setGoalProfile(event.target.value)}
              className="ml-2 rounded border border-border bg-[#f0e8d8] px-2 py-1 text-xs text-[#3d2a14]"
            >
              <option value="all">All profiles</option>
              {profiles.map(profile => <option key={profile} value={profile}>{profile}</option>)}
            </select>
          </label>

          {source === 'local' && localScores.length > 0 && (
            <button
              type="button"
              onClick={clearLocal}
              className="inline-flex items-center gap-1.5 rounded border border-red-300/70 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-100/60"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear local scores
            </button>
          )}

          {source === 'world' && worldAvailable && (
            <button
              type="button"
              onClick={() => void refreshWorldScores()}
              disabled={worldStatus === 'loading'}
              className="inline-flex items-center gap-1.5 rounded border border-blue-300/70 px-2.5 py-1.5 text-xs text-blue-800 hover:bg-blue-100/50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${worldStatus === 'loading' ? 'animate-spin' : ''}`} /> Refresh
            </button>
          )}
        </div>

        {source === 'world' && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Community scores are unverified. Guild Life runs in the browser, so this is a friendly ranking rather than a cheat-proof ladder.
            </span>
          </div>
        )}

        <ScrollArea className="pr-2" style={{ height: 'min(55vh, 520px)' }}>
          {source === 'world' && !worldAvailable ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-900">
              World ranking is not configured on this deployment. Local Hall of Fame still works normally.
            </div>
          ) : source === 'world' && worldStatus === 'loading' && worldScores.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading world ranking...
            </div>
          ) : source === 'world' && worldError ? (
            <div className="rounded-lg border border-red-300 bg-red-50/70 p-4 text-sm text-red-800">
              {worldError}
            </div>
          ) : visibleScores.length > 0 ? (
            <div className="space-y-2">
              {visibleScores.map((score, index) => (
                <ScoreRow key={score.id} score={score} rank={index + 1} world={source === 'world'} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {source === 'local'
                ? 'No local scores yet. Finish a game and claim the first place.'
                : 'No community scores match this goal profile yet.'}
            </div>
          )}
        </ScrollArea>

        {source === 'world' && worldAvailable && (
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Scores can only be submitted voluntarily from the post-game screen after saving them locally.
          </p>
        )}
      </div>
    </div>
  );
}
