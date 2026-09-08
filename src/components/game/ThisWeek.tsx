import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { getThisWeekAdvice } from '@/data/thisWeek';
import { FESTIVALS } from '@/data/festivals';
import './playability.css';

export const ThisWeek = memo(function ThisWeek() {
  const player = useCurrentPlayer();
  const { goalSettings, stockPrices, activeFestival, weather } = useGameStore(useShallow(state => ({
    goalSettings: state.goalSettings,
    stockPrices: state.stockPrices,
    activeFestival: state.activeFestival,
    weather: state.weather,
  })));
  if (!player || player.isAI) return null;
  const advice = getThisWeekAdvice(player, goalSettings, stockPrices, FESTIVALS.find(festival => festival.id === activeFestival), weather);
  if (!advice.length) return null;
  return <section className="this-week" aria-label="This Week"><h3>This Week</h3><ul>
    {advice.map(item => <li key={item.id} data-urgent={item.urgent || undefined}><strong>{item.title}</strong>{item.detail}</li>)}
  </ul></section>;
});
