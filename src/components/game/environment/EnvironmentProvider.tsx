import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';
import { useGameStore } from '@/store/gameStore';
import { EffectManager } from './EffectManager';
import { effectPolicy } from './effectPolicy';
import { loadEffectAssets, type EffectAssets } from './effectAssets';
import { useStorm } from './useStorm';
import { EnvironmentContext } from './useEnvironment';

function useEnvironmentState(isMobile: boolean) {
  const [manager] = useState(() => new EffectManager());
  const [assets,setAssets] = useState<EffectAssets | null>(null);
  const {options} = useGameOptions();
  const {visible,reducedMotion} = useEnvironmentActivity();
  const weather = useGameStore(s => s.weather);
  const festival = useGameStore(s => s.activeFestival);
  const policy = useMemo(() => effectPolicy(options.environmentDetail,reducedMotion,visible,isMobile),[options.environmentDetail,reducedMotion,visible,isMobile]);
  const strike = useStorm(policy.running && weather?.type === 'thunderstorm');
  useEffect(() => { manager.setRunning(policy.running); return () => manager.setRunning(false); },[manager,policy.running]);
  useEffect(() => {
    if (!policy.enabled) return;
    let current = true;
    void loadEffectAssets().then(value => { if (current) setAssets(value); });
    return () => { current = false; };
  },[policy.enabled]);
  useEffect(() => () => manager.dispose(),[manager]);
  return {manager,assets,policy,weather,festival,strike};
}
export function EnvironmentProvider({isMobile,children}: {isMobile: boolean; children: ReactNode}) {
  const value = useEnvironmentState(isMobile);
  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}
