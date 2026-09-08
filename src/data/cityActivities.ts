import type { LocationId, Player } from '@/types/game.types';
import type { FestivalId } from './festivals';
import type { WeatherType } from './weather';

export interface CityActivity {
  id: string; name: string; location: LocationId; festival?: FestivalId; weather?: WeatherType;
  hours: number; cost: number; gold: number; happiness?: number; food?: number; health?: number; fame?: number;
  weapon?: boolean; minHealth?: number; description: string;
}
// Fixed, published terms. Callers supply only the ID; the host resolves all effects.
export const CITY_ACTIVITIES: readonly CityActivity[] = [
  { id:'tournament-contest', name:'Enter the practice tournament', location:'guild-hall', festival:'spring-tournament', hours:8, cost:15, gold:45, happiness:6, health:-8, fame:2, weapon:true, minHealth:50, description:'Complete an exhibition bout. The purse and the bruises are guaranteed.' },
  { id:'tournament-steward', name:'Work as a tournament steward', location:'guild-hall', festival:'spring-tournament', hours:8, cost:0, gold:36, description:'Keep the practice arena running for a fixed wage.' },
  { id:'tournament-watch', name:'Watch the tournament', location:'guild-hall', festival:'spring-tournament', hours:4, cost:10, gold:0, happiness:8, description:'Take a seat at the arena and enjoy the spectacle.' },
  { id:'harvest-help', name:'Help distribute the harvest', location:'general-store', festival:'harvest-festival', hours:4, cost:0, gold:20, fame:1, description:'Bring supplies to the neighbourhood tables.' },
  { id:'harvest-feast', name:'Join the harvest table', location:'general-store', festival:'harvest-festival', hours:4, cost:12, gold:0, food:12, happiness:6, description:'Share a meal with the neighbourhood.' },
  { id:'solstice-lecture', name:'Attend the solstice lecture', location:'academy', festival:'winter-solstice', hours:4, cost:8, gold:0, happiness:6, fame:1, description:'An evening of public scholarship. Does not grant degree progress.' },
  { id:'solstice-archive', name:'Help in the winter archive', location:'academy', festival:'winter-solstice', hours:6, cost:0, gold:24, description:'Catalogue the academy’s seasonal donations.' },
  { id:'midsummer-service', name:'Serve at the midsummer fair', location:'rusty-tankard', festival:'midsummer-fair', hours:8, cost:0, gold:45, description:'Staff the fair’s busiest refreshment stand.' },
  { id:'midsummer-concert', name:'Enjoy the midsummer concert', location:'rusty-tankard', festival:'midsummer-fair', hours:4, cost:12, gold:0, happiness:9, description:'Set work aside for music and company.' },
  { id:'drought-water', name:'Deliver water during the drought', location:'general-store', weather:'drought', hours:6, cost:0, gold:28, health:-3, fame:1, description:'Carry water to homes in the heat.' },
  { id:'fog-collect', name:'Collect enchanted dust', location:'enchanter', weather:'enchanted-fog', hours:5, cost:0, gold:24, health:-5, fame:2, description:'Gather volatile dust for the tower. Exposure takes a small health toll.' },
  { id:'fog-ward', name:'Join the ward demonstration', location:'enchanter', weather:'enchanted-fog', hours:3, cost:8, gold:0, happiness:5, description:'Watch the tower illuminate the mist from behind its wards.' },
  { id:'snow-relief', name:'Bring warmth to the neighbourhood', location:'forge', weather:'snowstorm', hours:6, cost:0, gold:24, fame:1, description:'Deliver hearth supplies while the snow lasts.' },
  { id:'storm-repairs', name:'Help repair storm damage', location:'forge', weather:'thunderstorm', hours:6, cost:0, gold:28, health:-3, fame:1, description:'Help the smith secure damaged shutters and gutters.' },
  { id:'rain-harvest', name:'Shelter the wet harvest', location:'general-store', weather:'harvest-rain', hours:4, cost:0, gold:18, fame:1, description:'Move the harvest indoors before the rain ruins it.' },
];
export type CityConditions = { week: number; activeFestival: string | null; weather?: { type: string } | null };
export function getCityActivities(location: LocationId, state: CityConditions): readonly CityActivity[] {
  return CITY_ACTIVITIES.filter(a => a.location === location && (a.festival ? a.festival === state.activeFestival : a.weather === state.weather?.type));
}
export function cityActivityBlock(player: Player, activity: CityActivity, state: CityConditions): string | null {
  if (player.isGameOver) return 'Your adventure has ended.';
  if (!getCityActivities(player.currentLocation, state).some(a => a.id === activity.id)) return 'This activity is not available here now.';
  if (player.cityActivityWeek === state.week) return 'You have already joined a city activity this week.';
  if (activity.weapon && !player.equippedWeapon) return 'Equip a weapon for the exhibition.';
  if (player.health < (activity.minHealth ?? 1) || player.health + (activity.health ?? 0) <= 0) return `Recover health first${activity.minHealth ? ` (at least ${activity.minHealth})` : ''}.`;
  if (player.timeRemaining < activity.hours) return `Needs ${activity.hours} hours.`;
  if (player.gold < activity.cost) return `Needs ${activity.cost}g for entry.`;
  return null;
}
export function cityActivityEffects(player: Player, a: CityActivity) {
  return {
    gold: player.gold - a.cost + a.gold, timeRemaining: player.timeRemaining - a.hours,
    happiness: Math.max(0, Math.min(100, player.happiness + (a.happiness ?? 0))),
    foodLevel: Math.max(0, Math.min(100, player.foodLevel + (a.food ?? 0))),
    health: Math.max(0, Math.min(player.maxHealth, player.health + (a.health ?? 0))),
    fame: Math.min(100, (player.fame ?? 0) + (a.fame ?? 0)),
  };
}
export function cityActivityOutcome(player: Player, a: CityActivity): string {
  const after = cityActivityEffects(player, a);
  return [`${after.gold}g cash after`, ...(['happiness','foodLevel','health','fame'] as const).filter(k => after[k] !== (player[k] ?? 0)).map(k => `${after[k] - (player[k] ?? 0) > 0 ? '+' : ''}${after[k] - (player[k] ?? 0)} ${k === 'foodLevel' ? 'food' : k}`)].join(' · ');
}
