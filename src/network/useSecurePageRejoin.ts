import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { peerManager } from './PeerManager';
import { applyNetworkState } from './networkState';
import type { HostMessage } from './types';
import {
  getLocalReconnectCredential,
  storeLocalReconnectCredential,
} from './reconnectCredentials';

const REJOIN_RETRY_MS = 2000;
const MAX_REJOIN_ATTEMPTS = 10;

/**
 * Completes a secure page-refresh rejoin while the app is still rendering the lobby.
 * useNetworkSync is not mounted until authoritative state changes the phase to playing.
 */
export function useSecurePageRejoin() {
  const phase = useGameStore(state => state.phase);
  const networkMode = useGameStore(state => state.networkMode);
  const roomCode = useGameStore(state => state.roomCode);
  const localPlayerId = useGameStore(state => state.localPlayerId);
  const completedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      phase !== 'online-lobby'
      || networkMode !== 'guest'
      || !roomCode
      || !localPlayerId
    ) {
      return;
    }

    const credential = getLocalReconnectCredential(roomCode);
    if (!credential || credential.playerId !== localPlayerId) return;

    const rejoinKey = `${roomCode}:${localPlayerId}:${credential.reconnectToken}`;
    if (completedKeyRef.current === rejoinKey) return;

    let attempts = 0;
    let completed = false;

    const sendSecureReconnect = () => {
      if (completed || peerManager.status !== 'connected' || attempts >= MAX_REJOIN_ATTEMPTS) {
        return;
      }
      attempts += 1;
      peerManager.sendToHost({
        type: 'reconnect',
        playerName: credential.playerName,
        playerId: credential.playerId,
        reconnectToken: credential.reconnectToken,
      });
    };

    const unsubStatus = peerManager.onStatusChange(status => {
      if (status === 'connected') sendSecureReconnect();
    });
    const unsubMessage = peerManager.onMessage(message => {
      const hostMessage = message as HostMessage;
      if (hostMessage.type === 'reconnect-credential') {
        storeLocalReconnectCredential(hostMessage);
      } else if (hostMessage.type === 'state-sync') {
        completed = true;
        completedKeyRef.current = rejoinKey;
        applyNetworkState(hostMessage.gameState);
      }
    });

    sendSecureReconnect();
    const retryTimer = setInterval(sendSecureReconnect, REJOIN_RETRY_MS);

    return () => {
      completed = true;
      clearInterval(retryTimer);
      unsubStatus();
      unsubMessage();
    };
  }, [phase, networkMode, roomCode, localPlayerId]);
}
