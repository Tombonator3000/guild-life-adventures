import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';
import { useGameStore } from '@/store/gameStore';
import { EffectManager } from './EffectManager';
import { effectPolicy } from './effectPolicy';
import { loadEffectAssets, type EffectAssets } from './effectAssets';
import { useStorm } from './useStorm';
import { EnvironmentContext } from './useEnvironment';
import { TownAtmosphere, completedForgeShifts } from './TownAtmosphere';

function useEnvironmentState(isMobile: boolean) {
  const [threeReady,setThreeReady] = useState(false);
  const [manager] = useState(() => new EffectManager());
  const [town] = useState(() => new TownAtmosphere());
  const [assets,setAssets] = useState<EffectAssets | null>(null);
  const {options} = useGameOptions();
  const {visible,reducedMotion} = useEnvironmentActivity();
  const weather = useGameStore(s => s.weather);
  const festival = useGameStore(s => s.activeFestival);
  const policy = useMemo(() => effectPolicy(options.environmentDetail,reducedMotion,visible,isMobile),[options.environmentDetail,reducedMotion,visible,isMobile]);
  const strike = useStorm(policy.running && weather?.type === 'thunderstorm');
  useEffect(() => { if (!policy.animated) town.bursts=[]; }, [policy.animated,town]);
  useEffect(() => useGameStore.subscribe((next, previous) => {
    if (!policy.running || next.players === previous.players || next.phase !== 'playing' || previous.phase !== 'playing') return;
    // Local save loading replaces goals as well as players. Do not replay saved work.
    if (next.networkMode === 'local' && next.goalSettings !== previous.goalSettings) return;
    const count = completedForgeShifts(previous.players, next.players);
    for (let i=0;i<count;i++) town.forgeBurst(manager.elapsed);
    if (count) manager.invalidate();
  }), [manager, town, policy.running]);
  useEffect(() => { manager.setRunning(policy.running); return () => manager.setRunning(false); },[manager,policy.running]);
  useEffect(() => {
    if (!policy.enabled) return;
    let current = true;
    void loadEffectAssets().then(value => { if (current) setAssets(value); });
    return () => { current = false; };
  },[policy.enabled]);
  useEffect(() => () => manager.dispose(),[manager]);
  return {manager,town,assets,policy,weather,festival,strike,threeReady:policy.animated && threeReady,setThreeReady};
}
export function EnvironmentProvider({isMobile,children}: {isMobile: boolean; children: ReactNode}) {
  const value = useEnvironmentState(isMobile);
  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
