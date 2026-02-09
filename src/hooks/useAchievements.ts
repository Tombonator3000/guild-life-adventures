/**
 * React hook for accessing achievement state.
 * Uses useSyncExternalStore for non-React persistence.
 */

import { useSyncExternalStore } from 'react';
import {
  loadAchievements,
  subscribeAchievements,
  getAllAchievementsWithStatus,
  type AchievementProgress,
} from '@/data/achievements';

export function useAchievements() {
  const progress = useSyncExternalStore(
    subscribeAchievements,
    loadAchievements,
  );

  const achievementsWithStatus = getAllAchievementsWithStatus();
  const unlockedCount = Object.keys(progress.unlocked).length;
  const totalCount = achievementsWithStatus.length;

  return {
    progress,
    achievements: achievementsWithStatus,
    unlockedCount,
    totalCount,
    stats: progress.stats,
  };
}
