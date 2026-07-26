import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { migrateLegacyPlayerFinances } from '@/lib/financialMigration';

/** Migrate retired generic Investments balances as soon as gameplay state appears. */
export function useLegacyFinanceMigration() {
  const migrationKey = useGameStore(state => state.players
    .map(player => `${player.id}:${player.investments}`)
    .join('|'));

  useEffect(() => {
    const state = useGameStore.getState();
    if (!state.players.some(player => Number.isFinite(player.investments) && player.investments > 0)) return;

    useGameStore.setState(current => ({
      players: current.players.map(migrateLegacyPlayerFinances),
    }));
  }, [migrationKey]);
}
