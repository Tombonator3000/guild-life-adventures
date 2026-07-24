import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const networkSyncSource = readSource('src/network/useNetworkSync.ts');
const networkTypesSource = readSource('src/network/types.ts');
const indexSource = readSource('src/pages/Index.tsx');

describe('gameplay reconnect integration', () => {
  it('routes reconnect messages through the guarded gameplay resync helper', () => {
    expect(networkSyncSource).toContain("import { handleGameplayReconnect } from './gameplayReconnect';");
    expect(networkSyncSource).toContain("} else if (msg.type === 'reconnect') {");
    expect(networkSyncSource).toContain('const reconnectResult = handleGameplayReconnect({');
    expect(networkSyncSource).toContain('requestedPlayerId: msg.playerId,');
    expect(networkSyncSource).toContain('reconnectToken: msg.reconnectToken,');
    expect(networkSyncSource).toContain("roomCode: store.roomCode ?? '',");
    expect(networkSyncSource).toContain('gameState: serializeGameState(),');
    expect(networkSyncSource).toContain('disconnectedPeerIds: disconnectedPeersRef.current,');
  });

  it('requests, distributes and stores room-bound reconnect credentials', () => {
    expect(networkTypesSource).toContain("type: 'reconnect-credential'");
    expect(networkTypesSource).toContain("type: 'reconnect-credential-request'");
    expect(networkSyncSource).toContain("peerManager.sendToHost({ type: 'reconnect-credential-request', playerId: localPlayerId });");
    expect(networkSyncSource).toContain("if (msg.type === 'reconnect-credential-request') {");
    expect(networkSyncSource).toContain("peerManager.sendTo(peerId, { type: 'reconnect-credential', ...credential });");
    expect(networkSyncSource).toContain("} else if (msg.type === 'reconnect-credential') {");
    expect(networkSyncSource).toContain('storeLocalReconnectCredential(msg);');
  });

  it('registers the gameplay message listener before credential bootstrap is scheduled', () => {
    const listenerIndex = networkSyncSource.indexOf('const unsubMessage = peerManager.onMessage');
    const bootstrapIndex = networkSyncSource.indexOf('queueMicrotask(() => {');

    expect(listenerIndex).toBeGreaterThanOrEqual(0);
    expect(bootstrapIndex).toBeGreaterThan(listenerIndex);
    expect(networkSyncSource).toContain('Bootstrap only after the listener above is registered');
  });

  it('mounts the secure rejoin bridge above the lazy lobby and game screens', () => {
    expect(indexSource).toContain("import { useSecurePageRejoin } from '@/network/useSecurePageRejoin';");
    expect(indexSource).toContain('useSecurePageRejoin();');
    expect(indexSource.indexOf('useSecurePageRejoin();')).toBeLessThan(indexSource.indexOf("if (phase === 'title')"));
  });

  it('uses a stored token automatically after a page-refresh rejoin', () => {
    expect(networkSyncSource).toContain('const credential = getLocalReconnectCredential(roomCode);');
    expect(networkSyncSource).toContain('playerId: credential.playerId,');
    expect(networkSyncSource).toContain('reconnectToken: credential.reconnectToken,');
  });

  it('rejects unknown reconnect identities before normal guest actions are processed', () => {
    const reconnectIndex = networkSyncSource.indexOf("} else if (msg.type === 'reconnect') {");
    const actionIndex = networkSyncSource.indexOf("} else if (msg.type === 'action') {");

    expect(reconnectIndex).toBeGreaterThanOrEqual(0);
    expect(actionIndex).toBeGreaterThan(reconnectIndex);
    expect(networkSyncSource).toContain('if (!reconnectResult.accepted) {');
    expect(networkSyncSource).toContain('Reconnect rejected for unknown peer');
  });

  it('uses the secure resolver for action, movement, zombie and disconnect checks', () => {
    expect(networkSyncSource).toContain('const resolveGameplayPlayerId = useCallback');
    expect(networkSyncSource.match(/resolveGameplayPlayerId\(peerId\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(networkSyncSource).toContain('const senderPlayerId = resolveGameplayPlayerId(fromPeerId);');
    expect(networkSyncSource).toContain('const moveSenderId = resolveGameplayPlayerId(fromPeerId);');
    expect(networkSyncSource).toContain('const disconnectedPlayerId = resolveGameplayPlayerId(peerId);');
  });

  it('clears stale identities and resets host turn activity after accepted reconnect', () => {
    expect(networkSyncSource).toContain('clearRateLimit(fromPeerId);');
    expect(networkSyncSource).toContain('if (reconnectResult.oldPeerId) clearRateLimit(reconnectResult.oldPeerId);');
    expect(networkSyncSource).toContain('sendReconnectCredential(fromPeerId, reconnectResult.playerId ?? undefined);');
    expect(networkSyncSource).toContain('resetTurnTimeout();');
    expect(networkSyncSource).toContain('Gameplay peer reconnected:');
  });
});
