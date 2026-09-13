import type { GoalSettings } from '@/types/game.types';

export const SETUP_PRESETS = [
  {
    id: 'quick',
    name: 'Quick Game',
    description: 'Lower victory targets',
    goals: { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 },
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'The classic Guild Life',
    goals: { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 },
  },
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'An extra goal for explorers',
    goals: { wealth: 4000, happiness: 80, education: 27, career: 65, adventure: 12 },
  },
  {
    id: 'epic',
    name: 'Epic Quest',
    description: 'The highest preset targets',
    goals: { wealth: 10000, happiness: 100, education: 90, career: 100, adventure: 20 },
  },
] as const;

export function getSetupPreset(goals: GoalSettings) {
  return SETUP_PRESETS.find((preset) =>
    (Object.keys(preset.goals) as (keyof GoalSettings)[]).every(
      (key) => preset.goals[key] === (goals[key] ?? 0),
    ),
  );
}
