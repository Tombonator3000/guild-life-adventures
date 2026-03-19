// Guild Life - Shadowfingers Robbery System
// Shadowfingers is a criminal who robs players on the street or at their apartments

import type { Player, LocationId, DurableItems } from '@/types/game.types';
import { getItem, canBeStolen } from './items';

// Street Robbery Constants
export const STREET_ROBBERY_MIN_WEEK = 4; // Robberies only happen on or after Week 4
export const STREET_ROBBERY_HAPPINESS_LOSS = -3;

// Location-specific robbery chances (per departure)
export const ROBBERY_CHANCES: Record<LocationId, number> = {
  'bank': 1 / 31,            // ~3.2% — highest risk
  'shadow-market': 1 / 51,   // ~1.95%
  'fence': 1 / 41,           // ~2.4%
  'slums': 1 / 61,           // ~1.6%
  'rusty-tankard': 1 / 71,   // ~1.4%
  'forge': 1 / 81,           // ~1.2%
  // All other locations: 0 (safe)
  'noble-heights': 0,
  'landlord': 0,
  'general-store': 0,
  'guild-hall': 0,
  'cave': 0,
  'academy': 0,
  'enchanter': 0,
  'armory': 0,
  'graveyard': 0,
};

// Locations that trigger street robbery when leaving
export const STREET_ROBBERY_LOCATIONS: LocationId[] = Object.entries(ROBBERY_CHANCES)
  .filter(([, chance]) => chance > 0)
  .map(([id]) => id as LocationId);

// Apartment Robbery Constants
export const APARTMENT_ROBBERY_ITEM_CHANCE = 0.25; // 25% chance per item type
export const APARTMENT_ROBBERY_HAPPINESS_LOSS = -4;

// Homeless robbery multiplier - homeless players are easier targets
export const HOMELESS_ROBBERY_MULTIPLIER = 3; // 3x more likely to be robbed on the street


export interface StreetRobberyResult {
  occurred: boolean;
  goldStolen: number;
  happinessLoss: number;
  fromLocation: LocationId;
  headline: string;
  message: string;
}

export interface ApartmentRobberyResult {
  occurred: boolean;
  stolenItems: { itemId: string; itemName: string; quantity: number }[];
  happinessLoss: number;
  headline: string;
  message: string;
}

/** Human-readable location name for robbery messages */
function getLocationDisplayName(loc: LocationId): string {
  const names: Partial<Record<LocationId, string>> = {
    'bank': 'the Bank',
    'shadow-market': "Black's Market",
    'fence': 'the Fence',
    'slums': 'the Slums',
    'rusty-tankard': 'the Rusty Tankard',
    'forge': 'the Forge',
  };
  return names[loc] ?? loc;
}

/**
 * Check if a street robbery should occur when player leaves a location
 *
 * Conditions:
 * - Week >= 4
 * - Player is leaving a risk-zone location
 * - Player has cash (gold > 0)
 *
 * Chance depends on location (bank highest, forge lowest).
 * Protection money reduces chance by 80%.
 * Homeless players have 3x higher robbery chance.
 * Rich players (1000+ gold) attract more attention.
 */
export function checkStreetRobbery(
  player: Player,
  fromLocation: LocationId,
  currentWeek: number
): StreetRobberyResult | null {
  if (currentWeek < STREET_ROBBERY_MIN_WEEK) return null;

  // Get base robbery chance for this location
  const baseChance = ROBBERY_CHANCES[fromLocation] ?? 0;
  if (baseChance <= 0) return null;

  if (player.gold <= 0) return null;

  let robberyChance = baseChance;

  // Protection money reduces chance by 80%
  if ((player.protectionWeeksLeft ?? 0) > 0) {
    robberyChance *= 0.2;
  }

  // Homeless players are easier targets
  if (player.housing === 'homeless') {
    robberyChance *= HOMELESS_ROBBERY_MULTIPLIER;
  }

  // Rich players carrying 1000+ gold attract more attention
  if (player.gold >= 1000) {
    const richMultiplier = Math.min(2.5, 1.5 + (player.gold - 1000) / 2000);
    robberyChance *= richMultiplier;
  }

  if (Math.random() >= robberyChance) return null;

  // Robbery occurs!
  const goldStolen = player.gold;
  const locationName = getLocationDisplayName(fromLocation);

  return {
    occurred: true,
    goldStolen,
    happinessLoss: STREET_ROBBERY_HAPPINESS_LOSS,
    fromLocation,
    headline: `STREET ROBBERY! ${player.name} Robbed Outside ${locationName}!`,
    message: `Shadowfingers appeared from the shadows as ${player.name} left ${locationName}. ` +
      `With dagger drawn, he demanded all their gold. ${goldStolen} gold stolen!`,
  };
}

/**
 * Check if an apartment robbery should occur at the start of player's turn
 *
 * Conditions:
 * - Player lives in slums (Low-Cost Housing)
 * - Player owns any durables
 *
 * Chance = 1 / (relaxation + 1)
 * Protection money reduces chance by 80%.
 */
export function checkApartmentRobbery(player: Player): ApartmentRobberyResult | null {
  if (player.housing !== 'slums') return null;

  const durableCount = Object.values(player.durables).reduce((sum, qty) => sum + qty, 0);
  if (durableCount === 0) return null;

  const relaxation = Math.max(10, Math.min(50, player.relaxation));
  let robberyChance = 1 / (relaxation + 1);

  // Protection money reduces chance by 80%
  if ((player.protectionWeeksLeft ?? 0) > 0) {
    robberyChance *= 0.2;
  }

  if (Math.random() >= robberyChance) return null;

  const stolenItems: { itemId: string; itemName: string; quantity: number }[] = [];

  for (const [itemId, quantity] of Object.entries(player.durables)) {
    if (quantity <= 0) continue;
    if (!canBeStolen(itemId)) continue;
    if (Math.random() < APARTMENT_ROBBERY_ITEM_CHANCE) {
      const item = getItem(itemId);
      stolenItems.push({
        itemId,
        itemName: item?.name || itemId,
        quantity,
      });
    }
  }

  if (stolenItems.length === 0) return null;

  const itemsList = stolenItems.map(i =>
    i.quantity > 1 ? `${i.quantity}x ${i.itemName}` : i.itemName
  ).join(', ');

  return {
    occurred: true,
    stolenItems,
    happinessLoss: APARTMENT_ROBBERY_HAPPINESS_LOSS,
    headline: `APARTMENT ROBBERY! ${player.name}'s Home Burglarized!`,
    message: `Shadowfingers broke into ${player.name}'s apartment in the slums while they were away. ` +
      `Stolen items: ${itemsList}. Perhaps better housing would be safer...`,
  };
}

/**
 * Get newspaper headlines for Shadowfingers activity
 */
export function getShadowfingersHeadlines(): string[] {
  return [
    "Shadowfingers Strikes Again! Citizens Warned to Be Vigilant",
    "Bank Patrons Targeted by Notorious Thief",
    "Slum Residents Report Increased Burglaries",
    "Guard Captain: 'We Are Closing In On Shadowfingers'",
    "Black's Market Area Becomes Hotspot for Robberies",
    "Shadowfingers: Myth or Menace? Investigation Continues",
  ];
}

/**
 * Get a random newspaper headline about Shadowfingers
 */
export function getRandomShadowfingersHeadline(): string {
  const headlines = getShadowfingersHeadlines();
  return headlines[Math.floor(Math.random() * headlines.length)];
}

/**
 * Get robbery vulnerability info for a player (used by Fence tip-off service)
 */
export function getRobberyVulnerability(player: Player): {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  factors: string[];
} {
  const factors: string[] = [];
  let risk = 0;

  if (player.housing === 'homeless') { factors.push('Homeless (3× street risk)'); risk += 3; }
  if (player.housing === 'slums') { factors.push('Lives in Slums (apartment robbery risk)'); risk += 2; }
  if (player.gold >= 1000) { factors.push(`Carrying ${player.gold}g (attracts Shadowfingers)`); risk += 2; }
  else if (player.gold >= 500) { factors.push(`Carrying ${player.gold}g`); risk += 1; }
  if ((player.protectionWeeksLeft ?? 0) > 0) { factors.push('Has protection (-80% risk)'); risk -= 3; }

  const durableCount = Object.values(player.durables).reduce((sum, qty) => sum + qty, 0);
  if (durableCount > 3) { factors.push(`${durableCount} items at home (burglary target)`); risk += 1; }

  if (risk <= 0) return { riskLevel: 'low', factors };
  if (risk <= 2) return { riskLevel: 'medium', factors };
  if (risk <= 4) return { riskLevel: 'high', factors };
  return { riskLevel: 'extreme', factors };
}
