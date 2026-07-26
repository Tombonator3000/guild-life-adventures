import { describe, expect, it } from 'vitest';
import type { Player } from '@/types/game.types';
import { migrateLegacyPlayerFinances } from './financialMigration';

function player(overrides: Partial<Player> = {}): Player {
  return { savings: 100, investments: 0, ...overrides } as Player;
}

describe('migrateLegacyPlayerFinances', () => {
  it('moves the complete legacy investment balance into savings without a fee', () => {
    const migrated = migrateLegacyPlayerFinances(player({ savings: 125, investments: 275 }));
    expect(migrated.savings).toBe(400);
    expect(migrated.investments).toBe(0);
  });

  it('returns the original player when no legacy balance exists', () => {
    const original = player();
    expect(migrateLegacyPlayerFinances(original)).toBe(original);
  });
});
