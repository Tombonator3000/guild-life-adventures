/**
 * Canonical Sabotage & Protection service data.
 * Used by both the UI and the store (host-authoritative pricing).
 * Do NOT let the client choose price/effect — always look them up here by id.
 */

export type SabotageEffectType = 'time-loss' | 'gold-theft' | 'clothing-damage';

export interface SabotageOption {
  id: string;
  label: string;
  description: string;
  baseCost: number;
  timeCost: number;
  effect: { type: SabotageEffectType; value: number };
}

export const SABOTAGE_OPTIONS: SabotageOption[] = [
  {
    id: 'pickpocket',
    label: 'Hire Shadowfingers: Pickpocket',
    description: 'Shadowfingers lifts some gold from their purse.',
    baseCost: 50,
    timeCost: 1,
    effect: { type: 'gold-theft', value: 30 },
  },
  {
    id: 'distraction',
    label: 'Hire Shadowfingers: Distraction',
    description: 'Shadowfingers waylays them, costing precious hours.',
    baseCost: 80,
    timeCost: 1,
    effect: { type: 'time-loss', value: 6 },
  },
  {
    id: 'mudslinger',
    label: 'Hire Shadowfingers: Mudslinger',
    description: "Shadowfingers 'accidentally' ruins their clothes.",
    baseCost: 60,
    timeCost: 1,
    effect: { type: 'clothing-damage', value: 25 },
  },
];

export function getSabotageOption(id: string): SabotageOption | undefined {
  return SABOTAGE_OPTIONS.find(o => o.id === id);
}

export interface ProtectionOption {
  weeks: number;
  baseCost: number;
  label: string;
}

export const PROTECTION_OPTIONS: ProtectionOption[] = [
  { weeks: 3, baseCost: 75, label: '3 Weeks' },
  { weeks: 6, baseCost: 130, label: '6 Weeks' },
  { weeks: 10, baseCost: 200, label: '10 Weeks' },
];

export const TIP_OFF_BASE_COST = 40;
export const TIP_OFF_TIME_COST = 1;

export function getProtectionOption(weeks: number): ProtectionOption | undefined {
  return PROTECTION_OPTIONS.find(o => o.weeks === weeks);
}

export function computePrice(base: number, priceModifier: number): number {
  return Math.max(1, Math.round(base * priceModifier));
}