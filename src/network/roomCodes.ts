// Human-readable room code generation
// Uses uppercase letters excluding ambiguous chars (O, I, L)

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a 6-character room code.
 * Used as the PeerJS peer ID for the host.
 * Format: "GUILD-XXXXXX" (e.g., "GUILD-K7M2NP")
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
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
