import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const networkSyncSource = readFileSync(
  resolve(process.cwd(), 'src/network/useNetworkSync.ts'),
  'utf8',
);

describe('gameplay reconnect integration', () => {
  it('routes reconnect messages through the guarded gameplay resync helper', () => {
    expect(networkSyncSource).toContain("import { handleGameplayReconnect } from './gameplayReconnect';");
    expect(networkSyncSource).toContain("if (msg.type === 'reconnect') {");
    expect(networkSyncSource).toContain('const reconnectResult = handleGameplayReconnect({');
    expect(networkSyncSource).toContain('gameState: serializeGameState(),');
    expect(networkSyncSource).toContain('disconnectedPeerIds: disconnectedPeersRef.current,');
  });

  it('rejects unknown reconnect identities before normal guest actions are processed', () => {
    const reconnectIndex = networkSyncSource.indexOf("if (msg.type === 'reconnect') {");
    const actionIndex = networkSyncSource.indexOf("} else if (msg.type === 'action') {");

    expect(reconnectIndex).toBeGreaterThanOrEqual(0);
    expect(actionIndex).toBeGreaterThan(reconnectIndex);
    expect(networkSyncSource).toContain('if (!reconnectResult.accepted) {');
    expect(networkSyncSource).toContain('Reconnect rejected for unknown peer');
  });

  it('clears stale rate limiting and resets host turn activity after accepted reconnect', () => {
    expect(networkSyncSource).toContain('clearRateLimit(fromPeerId);');
    expect(networkSyncSource).toContain('resetTurnTimeout();');
    expect(networkSyncSource).toContain('Gameplay peer reconnected:');
  });
});
