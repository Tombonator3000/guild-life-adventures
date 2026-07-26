import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const autoEndSource = readSource('src/hooks/useAutoEndTurn.ts');
const audienceSource = readSource('src/lib/deriveGameBoardAudienceState.ts');
const boardSource = readSource('src/components/game/GameBoard.tsx');
const deathModalSource = readSource('src/components/game/DeathModal.tsx');
const turnSource = readSource('src/store/helpers/turnHelpers.ts');
const leaveSource = readSource('src/network/leaveActiveOnlineGame.ts');
const syncSource = readSource('src/network/useNetworkSync.ts');

describe('permadeath spectator flow boundaries', () => {
  it('treats an already eliminated current player as an automatic turn recovery case', () => {
    expect(autoEndSource).toContain('if (currentPlayer.isGameOver)');
    expect(autoEndSource).toContain("if (networkMode !== 'guest')");
    expect(autoEndSource).toContain('scheduleEndTurn(currentPlayerIndex, 100)');
    expect(autoEndSource).toContain("phase: 'playing'");
    expect(autoEndSource).toContain('store.endTurn()');
  });

  it('does not permit eliminated players to act or move', () => {
    expect(audienceSource).toContain('const currentPlayerCanAct = !!currentPlayer && !currentPlayer.isGameOver');
    expect(audienceSource).toContain('const isLocalPlayerTurn = currentPlayerCanAct');
    expect(boardSource).toContain('isLocalPlayerTurn');
    expect(boardSource).toContain('onLocationClick={handleLocationClick}');
  });

  it('shows the death decision only to the affected online client', () => {
    expect(boardSource).toContain('deathEvent.playerId === localPlayerId');
    expect(boardSource).toContain('const visibleDeathEvent');
    expect(boardSource).toContain('deathModalProps={visibleDeathEvent ?');
  });

  it('offers explicit spectate and leave choices when survivors remain', () => {
    expect(deathModalSource).toContain('Spectate Game');
    expect(deathModalSource).toContain('remaining players will continue automatically');
    expect(deathModalSource).toContain('onSpectate ?? onDismiss');
    expect(deathModalSource).toContain('onLeave ?? onDismiss');
  });

  it('ends zero-survivor games and starts living or AI turns in playing phase', () => {
    expect(turnSource).toContain('if (alivePlayers.length === 0 || (isMultiplayer && alivePlayers.length === 1))');
    expect(turnSource).toContain("eventMessage: 'All players have perished. Game Over!'");
    expect(turnSource).toContain("phase: 'playing'");
    expect(turnSource).toContain('currentPlayerIndex: nextIndex');
  });

  it('performs real online cleanup when the eliminated player leaves', () => {
    expect(boardSource).toContain('leaveActiveOnlineGame(');
    expect(leaveSource).toContain("peerManager.sendToHost({ type: 'leave' })");
    expect(leaveSource).toContain('peerManager.broadcast');
    expect(leaveSource).toContain('resetNetworkState()');
    expect(leaveSource).toContain('peerManager.destroy()');
    expect(leaveSource).toContain("networkMode: 'local'");
  });

  it('returns guests to the title when the host closes during gameplay', () => {
    expect(syncSource).toContain("msg.type === 'kicked'");
    expect(syncSource).toContain('cleanupActiveOnlineGame()');
    expect(leaveSource).toContain('export function cleanupActiveOnlineGame');
  });
});
