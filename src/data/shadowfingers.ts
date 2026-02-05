// Guild Life - Shadowfingers Robbery System
// Shadowfingers is a criminal who robs players on the street or at their apartments

import type { Player, LocationId, DurableItems } from '@/types/game.types';
import { getItem, canBeStolen } from './items';

// Street Robbery Constants
export const STREET_ROBBERY_MIN_WEEK = 4; // Robberies only happen on or after Week 4
export const BANK_ROBBERY_CHANCE = 1 / 31; // ~3.2% chance when leaving bank
export const SHADOW_MARKET_ROBBERY_CHANCE = 1 / 51; // ~1.95% chance when leaving shadow market
export const STREET_ROBBERY_HAPPINESS_LOSS = -3;

// Apartment Robbery Constants
export const APARTMENT_ROBBERY_ITEM_CHANCE = 0.25; // 25% chance per item type
export const APARTMENT_ROBBERY_HAPPINESS_LOSS = -4;

// Locations that trigger street robbery when leaving
export const STREET_ROBBERY_LOCATIONS: LocationId[] = ['bank', 'shadow-market'];

// Shadowfingers image path
export const SHADOWFINGERS_IMAGE = '/src/assets/shadowfingers.jpg';

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

// Homeless robbery multiplier - homeless players are easier targets
export const HOMELESS_ROBBERY_MULTIPLIER = 3; // 3x more likely to be robbed on the street

/**
 * Check if a street robbery should occur when player leaves a location
 *
 * Conditions:
 * - Week >= 4
 * - Player is leaving Bank or Shadow Market
 * - Player has cash (gold > 0)
 *
 * Chance depends on location:
 * - Bank: 1/31 (~3.2%)
 * - Shadow Market: 1/51 (~1.95%)
 *
 * Homeless players have 3x higher robbery chance
 */
export function checkStreetRobbery(
  player: Player,
  fromLocation: LocationId,
  currentWeek: number
): StreetRobberyResult | null {
  // Check week requirement
  if (currentWeek < STREET_ROBBERY_MIN_WEEK) {
    return null;
  }

  // Check if leaving a robbery-prone location
  if (!STREET_ROBBERY_LOCATIONS.includes(fromLocation)) {
    return null;
  }

  // Check if player has any cash
  if (player.gold <= 0) {
    return null;
  }

  // Determine robbery chance based on location
  let robberyChance = fromLocation === 'bank'
    ? BANK_ROBBERY_CHANCE
    : SHADOW_MARKET_ROBBERY_CHANCE;

  // Homeless players are easier targets - higher robbery chance
  if (player.housing === 'homeless') {
    robberyChance *= HOMELESS_ROBBERY_MULTIPLIER;
  }

  // Roll for robbery
  if (Math.random() >= robberyChance) {
    return null; // No robbery this time
  }

  // Robbery occurs!
  const goldStolen = player.gold; // Street robbery takes ALL cash
  const locationName = fromLocation === 'bank' ? 'the Bank' : "Black's Market";

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
 * - Relaxation 10: 1/11 = ~9% per turn
 * - Relaxation 50: 1/51 = ~1.95% per turn
 *
 * If robbery triggers:
 * - Each durable TYPE has 25% chance to be stolen (all items of that type)
 * - Encyclopedia, Dictionary, Atlas cannot be stolen
 */
export function checkApartmentRobbery(player: Player): ApartmentRobberyResult | null {
  // Only happens at slums housing
  if (player.housing !== 'slums') {
    return null;
  }

  // Check if player owns any durables
  const durableCount = Object.values(player.durables).reduce((sum, qty) => sum + qty, 0);
  if (durableCount === 0) {
    return null;
  }

  // Calculate robbery chance based on relaxation
  // Relaxation ranges from 10 to 50
  const relaxation = Math.max(10, Math.min(50, player.relaxation));
  const robberyChance = 1 / (relaxation + 1);

  // Roll for robbery
  if (Math.random() >= robberyChance) {
    return null; // No robbery this time
  }

  // Robbery triggered! Check each durable type
  const stolenItems: { itemId: string; itemName: string; quantity: number }[] = [];

  for (const [itemId, quantity] of Object.entries(player.durables)) {
    if (quantity <= 0) continue;

    // Check if this item can be stolen
    if (!canBeStolen(itemId)) {
      continue; // Encyclopedia, Dictionary, Atlas cannot be stolen
    }

    // 25% chance for each item type to be stolen
    if (Math.random() < APARTMENT_ROBBERY_ITEM_CHANCE) {
      const item = getItem(itemId);
      stolenItems.push({
        itemId,
        itemName: item?.name || itemId,
        quantity, // All items of this type are stolen
      });
    }
  }

  // If no items were stolen despite triggering, no robbery message
  if (stolenItems.length === 0) {
    return null;
  }

  // Format stolen items message
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
