import { useGameStore } from '@/store/gameStore';
import { peerManager } from './PeerManager';
import { resetNetworkState } from './networkState';

const SESSION_STORAGE_KEY = 'guild-life-online-session';

/**
 * Leave an active online game from outside the lobby hook.
 *
 * GameBoard cannot reuse useOnlineGame().disconnect() because that hook instance
 * no longer exists once gameplay starts. This utility performs the same essential
 * network cleanup against the singleton PeerManager, then returns this client to
 * a clean title-screen state.
 */
export function leaveActiveOnlineGame(reason = 'Player left the game'): void {
  if (peerManager.isHost) {
    peerManager.broadcast({ type: 'kicked', reason });
  } else {
    peerManager.sendToHost({ type: 'leave' });
  }

  cleanupActiveOnlineGame();
}

/** Return a gameplay client to the title without sending another network message. */
export function cleanupActiveOnlineGame(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // sessionStorage may be unavailable in privacy-restricted browsers.
  }

  resetNetworkState();

  const store = useGameStore.getState();
  store.resetForNewGame();
  useGameStore.setState({
    networkMode: 'local',
    localPlayerId: null,
    roomCode: null,
    deathEvent: null,
  });

  // Allow the final leave/kick message to flush before destroying connections.
  setTimeout(() => peerManager.destroy(), 50);
}
