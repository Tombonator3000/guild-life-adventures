import { isLocationHexed } from '@/data/hexes';
import { CITY_ACTIVITIES, cityActivityBlock, cityActivityEffects } from '@/data/cityActivities';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';

export function createCityActivityActions(set: SetFn, get: GetFn) {
  return {
    performCityActivity(playerId: string, activityId: string): ActionResult {
      const state = get();
      const player = state.players[state.currentPlayerIndex];
      if (state.phase !== 'playing' || !player || player.id !== playerId) return { success:false, message:'Wait for your turn.' };
      if (isLocationHexed(player.currentLocation, player.id, state.locationHexes)) return { success:false, message:'A hex blocks this location.' };
      const activity = CITY_ACTIVITIES.find(a => a.id === activityId);
      if (!activity) return { success:false, message:'Unknown city activity.' };
      const blocked = cityActivityBlock(player, activity, state);
      if (blocked) return { success:false, message:blocked };
      set(current => ({ players: current.players.map(p => p.id === playerId ? {
        ...p, ...cityActivityEffects(p, activity), cityActivityWeek:current.week, cityActivityId:activity.id,
        gameStats: { ...p.gameStats, totalGoldEarned:(p.gameStats.totalGoldEarned ?? 0) + activity.gold, totalGoldSpent:(p.gameStats.totalGoldSpent ?? 0) + activity.cost },
      } : p) }));
      get().checkVictory(playerId);
      return { success:true, message:`Completed: ${activity.name}.` };
    },
  };
}
