import type { Player } from '@/types/game.types';

export function migrateLegacyPlayerFinances(player: Player): Player {
  const legacyInvestments = Number.isFinite(player.investments)
    ? Math.max(0, Math.floor(player.investments))
    : 0;
  if (legacyInvestments <= 0) return player;

  return {
    ...player,
    savings: Math.max(0, Math.floor(player.savings || 0)) + legacyInvestments,
    investments: 0,
  };
}
