import type { HostMessage, SerializedGameState } from './types';

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
  gameState: SerializedGameState;
  disconnectedPeerIds: Set<string>;
}

export interface GameplayReconnectResult {
  accepted: boolean;
  playerId: string | null;
  playerName: string | null;
}

export function handleGameplayReconnect({
  registry,
  fromPeerId,
  claimedPlayerName,
  gameState,
  disconnectedPeerIds,
}: HandleGameplayReconnectOptions): GameplayReconnectResult {
  const playerId = registry.getPlayerIdForPeer(fromPeerId);
  if (!playerId) {
    return { accepted: false, playerId: null, playerName: null };
  }

  const playerName = registry.getPeerName(fromPeerId) ?? claimedPlayerName;
  disconnectedPeerIds.delete(fromPeerId);
  registry.sendTo(fromPeerId, { type: 'state-sync', gameState });
  registry.broadcast({ type: 'player-reconnected', playerName });

  return { accepted: true, playerId, playerName };
}
