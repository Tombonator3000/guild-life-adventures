import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const victorySource = readSource('src/components/screens/VictoryScreen.tsx');
const goalMatrixSource = readSource('src/components/screens/VictoryGoalMatrix.tsx');
const standingsSource = readSource('src/components/screens/PerformanceStandings.tsx');
const statsSource = readSource('src/components/screens/PostGameStats.tsx');
const highScoreSource = readSource('src/components/screens/HighScorePanel.tsx');
const worldRankingSource = readSource('src/components/screens/WorldRankingPanel.tsx');
const worldClientSource = readSource('src/network/worldLeaderboard.ts');
const partyServerSource = readSource('party/gameListings.ts');

describe('post-game result boundaries', () => {
  it('shows explicit live victory goals for every player', () => {
    expect(victorySource).toContain('<VictoryGoalMatrix results={results} winnerId={winner} />');
    expect(goalMatrixSource).toContain('Live values from the exact moment the game ended');
    expect(goalMatrixSource).toContain('formatGoalTarget(goal)');
    expect(goalMatrixSource).toContain('formatGoalValue(playerGoal)');
    expect(goalMatrixSource).toContain('playerGoal.met');
    expect(goalMatrixSource).toContain('result.missingSummary');
  });

  it('keeps the victory race separate from the performance ranking', () => {
    expect(victorySource).toContain('<PerformanceStandings');
    expect(standingsSource).toContain('Victory Race Winner');
    expect(standingsSource).toContain('Overall MVP');
    expect(standingsSource).toContain('This score does not decide who won the game.');
    expect(standingsSource).toContain('result.performanceScore.toLocaleString()');
  });

  it('uses live final state instead of the last weekly snapshot', () => {
    expect(statsSource).not.toContain('lastSnap');
    expect(statsSource).toContain('getLiveMetric(player, selectedMetric, stockPrices)');
    expect(statsSource).toContain('player.completedDegrees.length * 9');
    expect(statsSource).toContain('player.currentJob ? player.dependability : 0');
    expect(victorySource).toContain('stockPrices={stockPrices}');
    expect(victorySource).toContain('week={week}');
  });

  it('provides a name-based local Hall of Fame without submitting AI opponents', () => {
    expect(victorySource).toContain('<HighScorePanel');
    expect(highScoreSource).toContain('results.filter(result => !result.player.isAI)');
    expect(highScoreSource).toContain('Hall of Fame name');
    expect(highScoreSource).toContain('saveLocalHighScore(entry)');
    expect(highScoreSource).toContain('Spectators and AI players cannot submit');
  });

  it('keeps world submission voluntary and visibly unverified', () => {
    expect(highScoreSource).toContain('<WorldRankingPanel savedEntry={savedEntry} goalProfile={goalProfile} />');
    expect(worldRankingSource).toContain('Community World Ranking');
    expect(worldRankingSource).toContain('Unverified community scores');
    expect(worldRankingSource).toContain('Submission is voluntary.');
    expect(worldRankingSource).toContain('Save a local Hall of Fame score first');
    expect(worldRankingSource).toContain('submitWorldScore(submission)');
    expect(worldRankingSource).not.toContain('useEffect(() => {\n    void handleSubmit');
  });

  it('disables world ranking gracefully when PartyKit is not configured', () => {
    expect(worldClientSource).toContain("normalized.includes('your-username')");
    expect(worldClientSource).toContain('World ranking is not configured for this deployment.');
    expect(worldRankingSource).toContain('Local Hall of Fame still works normally.');
  });

  it('bounds and validates PartyKit leaderboard storage', () => {
    expect(partyServerSource).toContain('const MAX_WORLD_SCORES = 100;');
    expect(partyServerSource).toContain('const MAX_SUBMISSIONS_PER_HOUR = 5;');
    expect(partyServerSource).toContain('sanitizeWorldScoreSubmission(data.entry)');
    expect(partyServerSource).toContain('score.submissionId === submission.submissionId');
    expect(partyServerSource).toContain('sortWorldScores([entry, ...scores]).slice(0, MAX_WORLD_SCORES)');
    expect(partyServerSource).toContain('error: "rate-limited"');
  });
});
