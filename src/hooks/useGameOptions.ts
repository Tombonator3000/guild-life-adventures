/**
 * React hook for game options.
 * Subscribes to changes and provides getters/setters.
 */

import { useSyncExternalStore, useCallback } from 'react';
import {
  loadGameOptions,
  saveGameOptions,
  setGameOption,
  resetGameOptions,
  subscribeGameOptions,
  type GameOptions,
} from '@/data/gameOptions';

const getSnapshot = () => loadGameOptions();

export function useGameOptions() {
  const options = useSyncExternalStore(subscribeGameOptions, getSnapshot);

  return {
    options,
    setOption: useCallback(<K extends keyof GameOptions>(key: K, value: GameOptions[K]) => {
      setGameOption(key, value);
    }, []),
    setOptions: useCallback((opts: GameOptions) => {
      saveGameOptions(opts);
    }, []),
    resetOptions: useCallback(() => {
      resetGameOptions();
    }, []),
  };
}
