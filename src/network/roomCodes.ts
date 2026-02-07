// Human-readable room code generation
// Uses uppercase letters excluding ambiguous chars (O, I, L)
// Uses crypto.getRandomValues() for unpredictable room codes

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a 6-character room code using cryptographically secure randomness.
 * Used as the PeerJS peer ID for the host.
 * Produces ~29^6 ≈ 594M possible codes.
 */
export function generateRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}

/**
 * Convert a room code to a PeerJS peer ID.
 * Adds a prefix to avoid collisions with other PeerJS users.
 */
export function roomCodeToPeerId(roomCode: string): string {
  return `guild-life-${roomCode.toUpperCase()}`;
}

/**
 * Extract room code from a PeerJS peer ID.
 */
export function peerIdToRoomCode(peerId: string): string {
  return peerId.replace('guild-life-', '');
}

/**
 * Validate a room code format.
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code.toUpperCase());
}
