import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';
import { cityActivityBlock, cityActivityOutcome, getCityActivities } from '@/data/cityActivities';
import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import type { LocationId } from '@/types/game.types';

export function CityActivityPanel({ location }: { location: LocationId }) {
  const state = useGameStore(useShallow(state => ({
    week: state.week,
    activeFestival: state.activeFestival,
    weather: state.weather,
    performCityActivity: state.performCityActivity,
  })));
  const player = useCurrentPlayer();
  const activities = getCityActivities(location, state);
  const [selected, setSelected] = useState('');
  const [receipt, setReceipt] = useState('');
  if (!player || !activities.length) return null;
  const activity = activities.find(a => a.id === selected) ?? activities[0];
  const blocked = cityActivityBlock(player, activity, state);
  return <section className="city-activity" aria-label="City activities">
    <label>Choose your activity<select aria-label="City activity" value={activity.id} onChange={e => { setSelected(e.target.value); setReceipt(''); }}>{activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <p>{activity.description}</p>
    <p className="city-terms">{activity.hours}h · Entry {activity.cost}g · Reward {activity.gold}g<br />{player.cityActivityWeek === state.week ? `Current: ${player.gold}g · ${player.timeRemaining}h · ${player.health} health` : cityActivityOutcome(player, activity)}</p>
    <button className="bank-primary" disabled={!!blocked} onClick={() => { const result = state.performCityActivity(player.id, activity.id); if (result) setReceipt(result.message); }}>Join activity · {activity.hours}h</button>
    <p role="status">{receipt || blocked || 'Choose one city activity per week, across all locations.'}</p>
  </section>;
}
