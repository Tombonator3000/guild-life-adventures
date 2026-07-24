import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameBoardOverlays } from './GameBoardOverlays';

vi.mock('@/hooks/useGameOptions', () => ({
  useGameOptions: () => ({ options: { showOpponentActions: false } }),
}));

const renderOverlays = (
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error',
  latency = 42,
) => render(
  <GameBoardOverlays
    isMobile={false}
    isWaitingForOtherPlayer={false}
    phase="playing"
    currentPlayer={undefined}
    isOnline
    latency={latency}
    roomCodeDisplay="ROOM"
    isGuest
    showTurnTransition={false}
    onTurnTransitionReady={vi.fn()}
    aiIsThinking={false}
    currentAIAction=""
    aiDifficulty="medium"
    aiSpeedMultiplier={1}
    setAISpeedMultiplier={vi.fn()}
    setSkipAITurn={vi.fn()}
    connectionStatus={connectionStatus}
    attemptReconnect={vi.fn()}
  />,
);

describe('GameBoardOverlays connection status', () => {
  it('shows online state and guest latency only while connected', () => {
    renderOverlays('connected', 42);

    expect(screen.getByRole('status')).toHaveTextContent('Online (ROOM) 42ms');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows connecting without a contradictory connection-lost banner', () => {
    renderOverlays('connecting');

    expect(screen.getByRole('status')).toHaveTextContent('Connecting (ROOM)');
    expect(screen.getByRole('status')).not.toHaveTextContent('42ms');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows reconnecting in the indicator and the active warning banner', () => {
    renderOverlays('reconnecting');

    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting (ROOM)');
    expect(screen.getByRole('alert')).toHaveTextContent('Reconnecting...');
    expect(screen.queryByText(/Online/)).not.toBeInTheDocument();
  });

  it('shows offline or error state instead of claiming the session is online', () => {
    const { rerender } = renderOverlays('disconnected');

    expect(screen.getByRole('status')).toHaveTextContent('Offline (ROOM)');
    expect(screen.getByRole('alert')).toHaveTextContent('Connection Lost');
    expect(screen.queryByText(/Online/)).not.toBeInTheDocument();

    rerender(
      <GameBoardOverlays
        isMobile={false}
        isWaitingForOtherPlayer={false}
        phase="playing"
        currentPlayer={undefined}
        isOnline
        latency={42}
        roomCodeDisplay="ROOM"
        isGuest
        showTurnTransition={false}
        onTurnTransitionReady={vi.fn()}
        aiIsThinking={false}
        currentAIAction=""
        aiDifficulty="medium"
        aiSpeedMultiplier={1}
        setAISpeedMultiplier={vi.fn()}
        setSkipAITurn={vi.fn()}
        connectionStatus="error"
        attemptReconnect={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Connection Error (ROOM)');
    expect(screen.getByRole('alert')).toHaveTextContent('Retry');
  });
});
