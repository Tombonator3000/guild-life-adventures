import { createContext, useContext } from 'react';
import type { useGameStore } from '@/store/gameStore';
import type { EffectManager } from './EffectManager';
import type { EffectAssets } from './effectAssets';
import type { EffectPolicy } from './effectPolicy';

type GameState = ReturnType<typeof useGameStore.getState>;
interface EnvironmentState {
  manager: EffectManager;
  assets: EffectAssets | null;
  policy: EffectPolicy;
  weather: GameState['weather'];
  festival: GameState['activeFestival'];
  strike: number | null;
}
export const EnvironmentContext = createContext<EnvironmentState | null>(null);
export function useEnvironment() {
  const value = useContext(EnvironmentContext);
  if (!value) throw new Error('Environment layers require EnvironmentProvider');
  return value;
}
