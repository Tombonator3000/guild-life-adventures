import type { HostMessage, SerializedGameState } from './types';
import {
  getHostPlayerName,
  resolveHostPlayerId,
  validateAndRebindHostCredential,
} from './reconnectCredentials';

interface GameplayReconnectRegistry {
  getPlayerIdForPeer: (peerId: string) => string | null;
  getPeerName: (peerId: string) => string | null;
  sendTo: (peerId: string, message: HostMessage) => void;
  broadcast: (message: HostMessage) => void;
}

interface HandleGameplayReconnectOptions {
  registry: GameplayReconnectRegistry;
  fromPeerId: string;
  claimedPlayerName: string;
  requestedPlayerId?: string;
  reconnectToken?: string;
  roomCode: string;
  gameState: SerializedGameState;
  disconnectedPeerIds: Set<string>;
}

export interface GameplayReconnectResult {
  accepted: boolean;
  playerId: string | null;
  playerName: string | null;
  oldPeerId: string | null;
}

export function handleGameplayReconnect({
  registry,
  fromPeerId,
  claimedPlayerName,
  requestedPlayerId,
  reconnectToken,
  roomCode,
  gameState,
  disconnectedPeerIds,
}: HandleGameplayReconnectOptions): GameplayReconnectResult {
  let playerId = resolveHostPlayerId(
    fromPeerId,
    () => registry.getPlayerIdForPeer(fromPeerId),
  );
  let oldPeerId: string | null = null;
  let credentialPlayerName: string | null = null;

  if (!playerId && requestedPlayerId && reconnectToken) {
    const rebind = validateAndRebindHostCredential({
      roomCode,
      playerId: requestedPlayerId,
      reconnectToken,
      newPeerId: fromPeerId,
    });
    if (rebind.accepted) {
      playerId = rebind.playerId;
      oldPeerId = rebind.oldPeerId;
      credentialPlayerName = rebind.playerName;
    }
  }

  if (!playerId) {
    return {
      accepted: false,
      playerId: null,
      playerName: null,
      oldPeerId: null,
    };
  }

  const playerName = credentialPlayerName
    ?? getHostPlayerName(playerId)
    ?? registry.getPeerName(fromPeerId)
    ?? claimedPlayerName;
  disconnectedPeerIds.delete(fromPeerId);
  if (oldPeerId) disconnectedPeerIds.delete(oldPeerId);
  registry.sendTo(fromPeerId, { type: 'state-sync', gameState });
  registry.broadcast({ type: 'player-reconnected', playerName });

  return { accepted: true, playerId, playerName, oldPeerId };
}
