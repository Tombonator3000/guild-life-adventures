import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const indexSource = readSource('src/pages/Index.tsx');
const launcherSource = readSource('src/components/screens/TitleHighScoreLauncher.tsx');
const scoreScreenSource = readSource('src/components/screens/HighScoreScreen.tsx');
const changelogSource = readSource('src/components/screens/ChangelogScreen.tsx');

describe('title Hall of Fame and current changelog', () => {
  it('exposes Hall of Fame directly from the title screen', () => {
    expect(indexSource).toContain("import { TitleHighScoreLauncher }");
    expect(indexSource).toContain('<TitleHighScoreLauncher />');
    expect(launcherSource).toContain('Hall of Fame');
    expect(launcherSource).toContain('Open Hall of Fame and world ranking');
  });

  it('shows both local scores and the optional world ranking', () => {
    expect(scoreScreenSource).toContain('Local Scores');
    expect(scoreScreenSource).toContain('World Ranking');
    expect(scoreScreenSource).toContain('All profiles');
    expect(scoreScreenSource).toContain('loadLocalHighScores()');
    expect(scoreScreenSource).toContain('fetchWorldLeaderboard(100)');
    expect(scoreScreenSource).toContain('Scores can only be submitted voluntarily from the post-game screen');
  });

  it('keeps unverified world scores and unavailable deployments clearly labelled', () => {
    expect(scoreScreenSource).toContain('Community scores are unverified');
    expect(scoreScreenSource).toContain('World ranking is not configured on this deployment');
    expect(scoreScreenSource).toContain('Local Hall of Fame still works normally');
  });

  it('lists the July 2026 result, ranking and permadeath work in What’s New', () => {
    expect(changelogSource).toContain("version: 'v0.10.0'");
    expect(changelogSource).toContain("date: 'July 26, 2026'");
    expect(changelogSource).toContain('Final Results, Hall of Fame & Permadeath Recovery');
    expect(changelogSource).toContain('Hall of Fame button added directly to the title screen');
    expect(changelogSource).toContain('Permadeath no longer leaves the eliminated player holding the active turn');
    expect(changelogSource).toContain('Dead online players now choose between Spectate Game and leaving');
  });
});
