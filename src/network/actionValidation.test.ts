import { describe, expect, it } from 'vitest';
import { validateGuestActor } from './actionValidation';

describe('validateGuestActor', () => {
  it('accepts the authenticated player as the actor', () => {
    expect(validateGuestActor('movePlayer', ['human-a', 'bank'], 'human-a')).toBeNull();
  });

  it('rejects impersonation regardless of player ID format', () => {
    expect(validateGuestActor('modifyGold', ['human-b', 100], 'human-a'))
      .toBe('Cannot act as another player');
    expect(validateGuestActor('modifyGold', ['custom-id', 100], 'human-a'))
      .toBe('Cannot act as another player');
  });

  it('rejects missing or non-string actor arguments', () => {
    expect(validateGuestActor('tradeStock', [], 'human-a')).toBe('Missing player identity');
    expect(validateGuestActor('tradeStock', [42, 'buy', 'ore', 1], 'human-a'))
      .toBe('Cannot act as another player');
  });

  it('allows the actor-less end turn action', () => {
    expect(validateGuestActor('endTurn', [], 'human-a')).toBeNull();
  });
});
