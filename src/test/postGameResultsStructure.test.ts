import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const victorySource = readSource('src/components/screens/VictoryScreen.tsx');
const goalMatrixSource = readSource('src/components/screens/VictoryGoalMatrix.tsx');
const standingsSource = readSource('src/components/screens/PerformanceStandings.tsx');
const statsSource = readSource('src/components/screens/PostGameStats.tsx');
const highScoreSource = readSource('src/components/screens/HighScorePanel.tsx');

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
});
