// Human-readable room code generation
// Uses uppercase letters excluding ambiguous chars (O, I, L)
// Uses crypto.getRandomValues() for unpredictable room codes

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a 6-character room code using cryptographically secure randomness.
 * Used as the PeerJS peer ID for the host.
 * Produces ~29^6 ≈ 594M possible codes.
 * Uses rejection sampling to eliminate modulo bias (256 % 29 != 0).
 */
export function generateRoomCode(): string {
  // Largest multiple of CHARS.length (29) that fits in a byte: 29 * 8 = 232
  const limit = CHARS.length * Math.floor(256 / CHARS.length); // 232
  let code = '';
  while (code.length < 6) {
    const bytes = new Uint8Array(8); // Request extra to reduce re-rolls
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length && code.length < 6; i++) {
      if (bytes[i] < limit) {
        code += CHARS[bytes[i] % CHARS.length];
      }
      // Reject bytes >= 232 to avoid modulo bias
    }
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
