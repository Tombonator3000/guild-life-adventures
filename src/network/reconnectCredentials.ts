const LOCAL_CREDENTIAL_KEY = 'guild-life-reconnect-credential';
const CREDENTIAL_MAX_AGE_MS = 30 * 60 * 1000;

export interface LocalReconnectCredential {
  roomCode: string;
  playerId: string;
  playerName: string;
  reconnectToken: string;
  timestamp: number;
}

interface HostReconnectCredential extends LocalReconnectCredential {
  peerId: string;
}

interface IssueHostCredentialOptions {
  roomCode: string;
  playerId: string;
  playerName: string;
  peerId: string;
}

interface ValidateHostCredentialOptions {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
  newPeerId: string;
}

export interface RebindResult {
  accepted: boolean;
  oldPeerId: string | null;
  playerId: string | null;
  playerName: string | null;
}

const hostCredentials = new Map<string, HostReconnectCredential>();
const peerOverrides = new Map<string, string>();
const revokedPeerIds = new Set<string>();

function createReconnectToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function issueHostReconnectCredential({
  roomCode,
  playerId,
  playerName,
  peerId,
}: IssueHostCredentialOptions): LocalReconnectCredential {
  const existing = hostCredentials.get(playerId);
  const reconnectToken = existing?.roomCode === roomCode
    ? existing.reconnectToken
    : createReconnectToken();
  const timestamp = Date.now();

  if (existing?.peerId && existing.peerId !== peerId) {
    revokedPeerIds.add(existing.peerId);
    peerOverrides.delete(existing.peerId);
  }

  revokedPeerIds.delete(peerId);
  peerOverrides.set(peerId, playerId);
  const credential: HostReconnectCredential = {
    roomCode,
    playerId,
    playerName,
    reconnectToken,
    timestamp,
    peerId,
  };
  hostCredentials.set(playerId, credential);

  return { roomCode, playerId, playerName, reconnectToken, timestamp };
}

export function validateAndRebindHostCredential({
  roomCode,
  playerId,
  reconnectToken,
  newPeerId,
}: ValidateHostCredentialOptions): RebindResult {
  const credential = hostCredentials.get(playerId);
  if (
    !credential
    || credential.roomCode !== roomCode
    || credential.reconnectToken !== reconnectToken
    || Date.now() - credential.timestamp > CREDENTIAL_MAX_AGE_MS
  ) {
    return { accepted: false, oldPeerId: null, playerId: null, playerName: null };
  }

  const oldPeerId = credential.peerId;
  if (oldPeerId !== newPeerId) {
    revokedPeerIds.add(oldPeerId);
    peerOverrides.delete(oldPeerId);
  }
  revokedPeerIds.delete(newPeerId);
  peerOverrides.set(newPeerId, playerId);
  credential.peerId = newPeerId;
  credential.timestamp = Date.now();

  return {
    accepted: true,
    oldPeerId: oldPeerId === newPeerId ? null : oldPeerId,
    playerId,
    playerName: credential.playerName,
  };
}

export function resolveHostPlayerId(
  peerId: string,
  fallback: () => string | null,
): string | null {
  if (revokedPeerIds.has(peerId)) return null;
  return peerOverrides.get(peerId) ?? fallback();
}

export function getHostPlayerName(playerId: string) {
  return hostCredentials.get(playerId)?.playerName ?? null;
}

export function clearHostReconnectCredentials() {
  hostCredentials.clear();
  peerOverrides.clear();
  revokedPeerIds.clear();
}

export function storeLocalReconnectCredential(credential: LocalReconnectCredential) {
  try {
    sessionStorage.setItem(LOCAL_CREDENTIAL_KEY, JSON.stringify(credential));
  } catch {
    // sessionStorage is optional in restricted browser contexts.
  }
}

export function getLocalReconnectCredential(roomCode?: string | null): LocalReconnectCredential | null {
  try {
    const raw = sessionStorage.getItem(LOCAL_CREDENTIAL_KEY);
    if (!raw) return null;
    const credential = JSON.parse(raw) as LocalReconnectCredential;
    if (
      !credential.roomCode
      || !credential.playerId
      || !credential.playerName
      || !credential.reconnectToken
      || Date.now() - credential.timestamp > CREDENTIAL_MAX_AGE_MS
      || (roomCode && credential.roomCode !== roomCode)
    ) {
      sessionStorage.removeItem(LOCAL_CREDENTIAL_KEY);
      return null;
    }
    return credential;
  } catch {
    return null;
  }
}

export function clearLocalReconnectCredential() {
  try {
    sessionStorage.removeItem(LOCAL_CREDENTIAL_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}
