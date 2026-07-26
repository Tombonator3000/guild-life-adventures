import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HighScoreEntry } from '@/data/highScores';
import type { WorldScoreEntry } from '@/network/worldLeaderboardProtocol';

const leaderboardMocks = vi.hoisted(() => ({
  fetchWorldLeaderboard: vi.fn(),
  isWorldLeaderboardAvailable: vi.fn(),
  submitWorldScore: vi.fn(),
}));

vi.mock('@/network/worldLeaderboard', () => leaderboardMocks);

import { WorldRankingPanel } from './WorldRankingPanel';

const localEntry: HighScoreEntry = {
  id: 'local-score-1',
  displayName: 'Tom',
  characterName: 'Nessa',
  score: 7420,
  week: 19,
  mode: 'online',
  goalProfile: 'Quick',
  wonVictoryRace: false,
  wasOverallMvp: true,
  createdAt: 100,
};

const worldEntry: WorldScoreEntry = {
  submissionId: 'other-score',
  id: 'server-entry',
  displayName: 'Rival',
  characterName: 'Grimwald',
  score: 7000,
  week: 20,
  mode: 'online',
  goalProfile: 'Quick',
  wonVictoryRace: true,
  wasOverallMvp: false,
  submittedAt: 200,
};

describe('WorldRankingPanel', () => {
  beforeEach(() => {
    leaderboardMocks.fetchWorldLeaderboard.mockReset();
    leaderboardMocks.isWorldLeaderboardAvailable.mockReset();
    leaderboardMocks.submitWorldScore.mockReset();
    leaderboardMocks.isWorldLeaderboardAvailable.mockReturnValue(true);
    leaderboardMocks.fetchWorldLeaderboard.mockResolvedValue([worldEntry]);
    leaderboardMocks.submitWorldScore.mockResolvedValue([
      { ...worldEntry },
      {
        ...worldEntry,
        id: 'submitted-entry',
        submissionId: localEntry.id,
        displayName: localEntry.displayName,
        characterName: localEntry.characterName,
        score: localEntry.score,
      },
    ]);
  });

  it('loads rankings without uploading the local score automatically', async () => {
    render(<WorldRankingPanel savedEntry={localEntry} goalProfile="Quick" />);

    expect(await screen.findByText('Rival')).toBeInTheDocument();
    expect(leaderboardMocks.fetchWorldLeaderboard).toHaveBeenCalledWith(100);
    expect(leaderboardMocks.submitWorldScore).not.toHaveBeenCalled();
  });

  it('submits only after the player presses the world-ranking button', async () => {
    render(<WorldRankingPanel savedEntry={localEntry} goalProfile="Quick" />);
    await screen.findByText('Rival');

    fireEvent.click(screen.getByRole('button', { name: 'Submit to World Ranking' }));

    await waitFor(() => {
      expect(leaderboardMocks.submitWorldScore).toHaveBeenCalledWith(expect.objectContaining({
        submissionId: localEntry.id,
        displayName: 'Tom',
        score: 7420,
      }));
    });
    expect(await screen.findByRole('button', { name: 'Submitted' })).toBeDisabled();
  });

  it('falls back to local-only mode when PartyKit is not configured', () => {
    leaderboardMocks.isWorldLeaderboardAvailable.mockReturnValue(false);

    render(<WorldRankingPanel savedEntry={localEntry} goalProfile="Quick" />);

    expect(screen.getByText(/World ranking is not configured/)).toBeInTheDocument();
    expect(leaderboardMocks.fetchWorldLeaderboard).not.toHaveBeenCalled();
    expect(leaderboardMocks.submitWorldScore).not.toHaveBeenCalled();
  });
});
