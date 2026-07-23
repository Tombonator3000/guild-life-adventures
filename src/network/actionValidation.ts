const ACTIONS_WITHOUT_ACTOR_ID = new Set([
  'endTurn',
]);

/**
 * Every guest action except explicitly actor-less actions must carry the
 * authenticated player's ID as its first argument. This avoids relying on ID
 * naming conventions such as `player-*`, which can be bypassed by crafted IDs.
 */
export function validateGuestActor(
  actionName: string,
  args: unknown[],
  senderPlayerId: string,
): string | null {
  if (ACTIONS_WITHOUT_ACTOR_ID.has(actionName)) return null;
  if (!Array.isArray(args) || args.length === 0) return 'Missing player identity';
  if (args[0] !== senderPlayerId) return 'Cannot act as another player';
  return null;
}
