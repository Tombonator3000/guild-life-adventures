import { useMemo, useState } from 'react';
import { Crown, Medal, Save, Star, Trash2 } from 'lucide-react';
import {
  clearLocalHighScores,
  loadLocalHighScores,
  saveLocalHighScore,
  type HighScoreEntry,
  type HighScoreMode,
} from '@/data/highScores';
import type { GameState } from '@/types/game.types';
import type { PlayerPostGameResult } from '@/lib/postGameResults';
import { WorldRankingPanel } from './WorldRankingPanel';

interface HighScorePanelProps {
  results: PlayerPostGameResult[];
  winnerId: string | null;
  performanceWinnerId: string | null;
  week: number;
  networkMode: GameState['networkMode'];
  localPlayerId: string | null;
  goalProfile: string;
}

function createScoreId(playerId: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${Date.now()}-${playerId}-${random}`;
}

function getScoreMode(networkMode: GameState['networkMode'], humanCount: number): HighScoreMode {
  if (networkMode !== 'local') return 'online';
  return humanCount > 1 ? 'local-multiplayer' : 'solo';
}

export function HighScorePanel({
  results,
  winnerId,
  performanceWinnerId,
  week,
  networkMode,
  localPlayerId,
  goalProfile,
}: HighScorePanelProps) {
  const humanResults = useMemo(
    () => results.filter(result => !result.player.isAI),
    [results],
  );
  const eligibleResults = useMemo(() => {
    if (networkMode === 'local') return humanResults;
    return localPlayerId
      ? humanResults.filter(result => result.player.id === localPlayerId)
      : [];
  }, [humanResults, localPlayerId, networkMode]);

  const initialResult = eligibleResults.find(result => result.player.id === winnerId)
    ?? eligibleResults[0]
    ?? null;
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialResult?.player.id ?? '');
  const selectedResult = eligibleResults.find(result => result.player.id === selectedPlayerId)
    ?? eligibleResults[0]
    ?? null;
  const [displayName, setDisplayName] = useState(initialResult?.player.name ?? '');
  const [scores, setScores] = useState<HighScoreEntry[]>(() => loadLocalHighScores());
  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<Map<string, HighScoreEntry>>(
    () => new Map(),
  );

  const handlePlayerChange = (playerId: string) => {
    setSelectedPlayerId(playerId);
    const next = eligibleResults.find(result => result.player.id === playerId);
    if (next) setDisplayName(next.player.name);
  };

  const handleSave = () => {
    if (!selectedResult || !displayName.trim() || savedEntriesByPlayer.has(selectedResult.player.id)) return;

    const entry: HighScoreEntry = {
      id: createScoreId(selectedResult.player.id),
      displayName,
      characterName: selectedResult.player.name,
      score: selectedResult.performanceScore,
      week,
      mode: getScoreMode(networkMode, humanResults.length),
      goalProfile,
      wonVictoryRace: selectedResult.player.id === winnerId,
      wasOverallMvp: selectedResult.player.id === performanceWinnerId,
      createdAt: Date.now(),
    };
    setScores(saveLocalHighScore(entry));
    setSavedEntriesByPlayer(previous => {
      const next = new Map(previous);
      next.set(selectedResult.player.id, entry);
      return next;
    });
  };

  const handleClear = () => {
    clearLocalHighScores();
    setScores([]);
    setSavedEntriesByPlayer(new Map());
  };

  const savedEntry = selectedResult
    ? savedEntriesByPlayer.get(selectedResult.player.id) ?? null
    : null;
  const alreadySaved = savedEntry !== null;

  return (
    <div className="parchment-panel p-6 mb-8 max-w-2xl w-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-600" /> Local Hall of Fame
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Performance score is separate from the victory race. Local scores stay on this device.
          </p>
        </div>
        {scores.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded border border-red-300/60 text-red-700 hover:bg-red-100/60"
            title="Clear local high scores"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedResult ? (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50/50 p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
            {eligibleResults.length > 1 && (
              <label className="text-xs text-amber-900">
                Record score for
                <select
                  value={selectedResult.player.id}
                  onChange={event => handlePlayerChange(event.target.value)}
                  className="mt-1 w-full rounded border border-amber-400 bg-[#f0e8d8] px-3 py-2 text-sm text-[#3d2a14]"
                >
                  {eligibleResults.map(result => (
                    <option key={result.player.id} value={result.player.id}>
                      {result.player.name} — {result.performanceScore.toLocaleString()} pts
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-xs text-amber-900">
              Hall of Fame name
              <input
                value={displayName}
                onChange={event => setDisplayName(event.target.value.slice(0, 20))}
                maxLength={20}
                className="mt-1 w-full rounded border border-amber-400 bg-[#f0e8d8] px-3 py-2 text-sm text-[#3d2a14]"
                placeholder="Enter your name"
              />
            </label>

            <button
              type="button"
              onClick={handleSave}
              disabled={!displayName.trim() || alreadySaved}
              className="gold-button px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {alreadySaved ? 'Saved Locally' : 'Save Score'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-amber-800">
            <strong className="text-base text-amber-950">
              {selectedResult.performanceScore.toLocaleString()} pts
            </strong>
            <span>Week {week}</span>
            <span>{goalProfile} goals</span>
            {selectedResult.player.id === winnerId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5">
                <Crown className="w-3 h-3" /> Victory race winner
              </span>
            )}
            {selectedResult.player.id === performanceWinnerId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-200 px-2 py-0.5">
                <Star className="w-3 h-3" /> Overall MVP
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground mb-5">
          Spectators and AI players cannot submit a Hall of Fame name.
        </p>
      )}

      {scores.length > 0 ? (
        <div className="space-y-2">
          {scores.slice(0, 10).map((score, index) => (
            <div
              key={score.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 items-center rounded-lg bg-black/5 px-3 py-2"
            >
              <span className="font-display text-center text-sm text-muted-foreground">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display text-card-foreground truncate">{score.displayName}</span>
                  {score.wonVictoryRace && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                  {score.wasOverallMvp && <Star className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {score.characterName} · {score.goalProfile} · Week {score.week} · {score.mode}
                </p>
              </div>
              <span className="font-display text-sm font-bold tabular-nums text-card-foreground">
                {score.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No local scores yet. Finish a game and claim the first place.
        </p>
      )}

      <WorldRankingPanel savedEntry={savedEntry} goalProfile={goalProfile} />
    </div>
  );
}
