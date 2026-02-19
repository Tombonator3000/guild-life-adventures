// Start-of-turn helpers: appliance breakage, food spoilage, starvation, robbery, bonuses
// Extracted from turnHelpers.ts — see that file for the orchestrator (createTurnActions)
//
// Structure:
//   1. Shared helpers (updatePlayerById, getPlayer, applyDoctorVisit)
//   2. Phase processors (appliance, food, starvation, relaxation, homeless, robbery, bonuses)
//   3. Main orchestrator (createStartTurn)

import type { LocationId, Player } from '@/types/game.types';
import { SPOILED_FOOD_SICKNESS_CHANCE } from '@/types/game.types';
import { HOUSING_DATA } from '@/data/housing';
import {
  checkApartmentRobbery,
} from '@/data/shadowfingers';
import {
  calculateRepairCost,
  checkApplianceBreakage,
} from '@/data/items';
import type { SetFn, GetFn } from '../storeTypes';
import { getHomeLocation } from './turnHelpers';
import { hasCurseEffect } from './hexHelpers';

// ============================================================
// Shared Helpers
// ============================================================

/** Update a single player's state by ID. Reduces the repeated players.map() boilerplate. */
function updatePlayerById(
  set: SetFn,
  playerId: string,
  updater: Partial<Player> | ((p: Player) => Partial<Player>),
): void {
  set((state) => ({
    players: state.players.map((p) => {
      if (p.id !== playerId) return p;
      const changes = typeof updater === 'function' ? updater(p) : updater;
      return { ...p, ...changes };
    }),
  }));
}

/** Re-read a player's current state from the store. */
function getPlayer(get: GetFn, playerId: string): Player {
  return get().players.find(p => p.id === playerId)!;
}

/**
 * Apply a doctor visit penalty: -10 hours, -4 happiness, -(30-200)g.
 * Used for food spoilage sickness, starvation collapse, and exhaustion.
 * The message template should contain {cost} which will be replaced with the actual cost.
 */
function applyDoctorVisit(
  set: SetFn,
  playerId: string,
  eventMessages: string[],
  messageTemplate: string,
): void {
  const doctorCost = 30 + Math.floor(Math.random() * 171); // 30-200g
  updatePlayerById(set, playerId, (p) => ({
    timeRemaining: Math.max(0, p.timeRemaining - 10),
    happiness: Math.max(0, p.happiness - 4),
    gold: Math.max(0, p.gold - doctorCost),
  }));
  eventMessages.push(messageTemplate.replace('{cost}', String(doctorCost)));
}

// ============================================================
// Phase Processors
// ============================================================

/** Phase 1: Check and apply appliance breakage (runs before food checks) */
function processApplianceBreakage(
  set: SetFn,
  get: GetFn,
  playerId: string,
): void {
  // C2 FIX: Re-read player from state to avoid stale gold values
  const player = getPlayer(get, playerId);
  if (player.gold <= 500) return;

  const currentWeek = get().week;

  for (const applianceId of Object.keys(player.appliances)) {
    const ownedAppliance = player.appliances[applianceId];
    if (ownedAppliance.isBroken) continue;

    // Breakage cooldown: immune for 2 weeks after repair/purchase
    if (ownedAppliance.repairedWeek != null && currentWeek - ownedAppliance.repairedWeek < 2) continue;

    if (!checkApplianceBreakage(ownedAppliance.source, player.gold)) continue;

    const repairCost = calculateRepairCost(ownedAppliance.originalPrice);

    // Mark as broken and lose happiness, but don't charge repair cost
    // Player can choose to repair at Enchanter/Market later
    updatePlayerById(set, playerId, (p) => {
      const newAppliances = { ...p.appliances };
      newAppliances[applianceId] = { ...newAppliances[applianceId], isBroken: true };
      return { appliances: newAppliances, happiness: Math.max(0, p.happiness - 1) };
    });

    // Only show UI notification for non-AI players
    if (!player.isAI) {
      set({ applianceBreakageEvent: { playerId, applianceId, repairCost } });
    }

    // Only trigger one breakage per turn
    break;
  }
}

/** Phase 2: Process fresh food spoilage based on appliance state. Returns true if spoilage occurred. */
function processFreshFoodSpoilage(
  set: SetFn,
  playerId: string,
  player: Player,
  eventMessages: string[],
): boolean {
  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;

  if (!hasPreservationBox && player.freshFood > 0) {
    // All fresh food spoils without a working Preservation Box
    updatePlayerById(set, playerId, { freshFood: 0 });
    eventMessages.push(`${player.name}'s fresh food spoiled! No working Preservation Box to keep it fresh.`);

    // Doctor visit trigger from eating spoiled food (55% chance, Jones-style)
    if (Math.random() < SPOILED_FOOD_SICKNESS_CHANCE) {
      applyDoctorVisit(set, playerId, eventMessages,
        `${player.name} ate the spoiled food and got sick! Healer charged {cost}g. -10 Hours, -4 Happiness.`
      );
    }
    return true;
  }

  if (hasPreservationBox) {
    // Cap fresh food to max storage (Frost Chest broken = excess spoils)
    const hasFrostChest = player.appliances['frost-chest'] && !player.appliances['frost-chest'].isBroken;
    const maxStorage = hasFrostChest ? 12 : 6;
    if (player.freshFood > maxStorage) {
      const spoiledUnits = player.freshFood - maxStorage;
      updatePlayerById(set, playerId, { freshFood: maxStorage });
      eventMessages.push(`${spoiledUnits} units of fresh food spoiled (storage full, max ${maxStorage}).`);
    }
  }

  return false;
}

/**
 * Phase 2.5: Regular food spoilage check — eating spoiled food without preservation.
 * Jones-style: Without a refrigerator (Preservation Box), stored food goes bad.
 * Player still eats it (prevents starvation) but has a high chance of getting sick.
 * Returns true if a doctor visit was triggered.
 */
function processRegularFoodSpoilage(
  set: SetFn,
  playerId: string,
  player: Player,
  eventMessages: string[],
): boolean {
  const hasPreservationBox = player.appliances['preservation-box']
    && !player.appliances['preservation-box'].isBroken;

  // No spoilage risk with a working Preservation Box
  if (hasPreservationBox) return false;

  // No food to spoil
  if (player.foodLevel <= 0) return false;

  // Only spoil food bought from General Store — Tavern food is cooked/served fresh and doesn't spoil
  if (!player.hasStoreBoughtFood) return false;

  // Food is spoiled but player eats it anyway (foodLevel NOT reduced — it still prevents starvation)
  eventMessages.push(
    `${player.name}'s food has gone bad without a Preservation Box!`
  );

  // 55% chance of getting sick from eating spoiled food (Jones-style)
  if (Math.random() < SPOILED_FOOD_SICKNESS_CHANCE) {
    applyDoctorVisit(set, playerId, eventMessages,
      `${player.name} got sick from eating spoiled food! Healer charged {cost}g. -10 Hours, -4 Happiness.`
    );
    return true;
  }

  return false;
}

/** Phase 3: Starvation check — consume fresh food backup or apply starvation penalty. Returns true if starving. */
function processStarvationCheck(
  set: SetFn,
  playerId: string,
  player: Player,
  eventMessages: string[],
): boolean {
  const hasWorkingBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  const hasRegularFood = player.foodLevel > 0;
  const hasFreshFood = hasWorkingBox && player.freshFood > 0;

  if (hasRegularFood) return false;

  if (hasFreshFood) {
    // Consume 1 fresh food unit instead of starving
    updatePlayerById(set, playerId, (p) => ({ freshFood: Math.max(0, p.freshFood - 1) }));
    // Fresh food consumed silently — no need for verbose message
    return false;
  }

  // Starving: Lose 20 Hours (1/3 of turn!) - Jones-style penalty
  const STARVATION_TIME_PENALTY = 20;
  updatePlayerById(set, playerId, (p) => ({
    timeRemaining: Math.max(0, p.timeRemaining - STARVATION_TIME_PENALTY),
  }));
  eventMessages.push(`${player.name} is starving! Lost ${STARVATION_TIME_PENALTY} Hours searching for food.`);

  // Doctor visit trigger from starvation (25% chance)
  if (Math.random() < 0.25) {
    applyDoctorVisit(set, playerId, eventMessages,
      `${player.name} collapsed from hunger and was taken to the healer! -10 Hours, -4 Happiness, -{cost}g.`
    );
  }

  return true;
}

/** Phase 4: Check exhaustion from low relaxation */
function processRelaxationCheck(
  set: SetFn,
  playerId: string,
  player: Player,
  eventMessages: string[],
): void {
  if (player.relaxation <= 15 && Math.random() < 0.20) {
    applyDoctorVisit(set, playerId, eventMessages,
      `${player.name} is exhausted and collapsed! The healer charged {cost}g. -10 Hours, -4 Happiness.`
    );
  }
}

/** Phase 5: Apply homeless penalties */
function processHomelessPenalty(
  set: SetFn,
  playerId: string,
  player: Player,
  eventMessages: string[],
): void {
  if (player.housing !== 'homeless') return;

  const HOMELESS_HEALTH_PENALTY = 5;
  const HOMELESS_TIME_PENALTY = 8;
  updatePlayerById(set, playerId, (p) => ({
    health: Math.max(0, p.health - HOMELESS_HEALTH_PENALTY),
    timeRemaining: Math.max(0, p.timeRemaining - HOMELESS_TIME_PENALTY),
  }));
  eventMessages.push(`${player.name} slept on the streets. -${HOMELESS_HEALTH_PENALTY} health, -${HOMELESS_TIME_PENALTY} hours.`);
}

/** Phase 6: Check and process apartment robbery */
function processRobberyCheck(
  set: SetFn,
  playerId: string,
  player: Player,
  eventMessages: string[],
): void {
  const robberyResult = checkApartmentRobbery(player);
  if (!robberyResult) return;

  // Remove stolen items from player's durables
  const newDurables = { ...player.durables };
  const stolenItemIds = new Set<string>();
  for (const stolen of robberyResult.stolenItems) {
    delete newDurables[stolen.itemId];
    stolenItemIds.add(stolen.itemId);
  }

  // Check if any equipped items were stolen — unequip them
  const EQUIPMENT_SLOTS = [
    { field: 'equippedWeapon' as const, value: player.equippedWeapon },
    { field: 'equippedArmor' as const, value: player.equippedArmor },
    { field: 'equippedShield' as const, value: player.equippedShield },
  ] as const;

  const equipmentUnequip: Partial<Record<typeof EQUIPMENT_SLOTS[number]['field'], null>> = {};
  const lostEquipmentNames: string[] = [];
  for (const slot of EQUIPMENT_SLOTS) {
    if (slot.value && stolenItemIds.has(slot.value)) {
      equipmentUnequip[slot.field] = null;
      const stolen = robberyResult.stolenItems.find(s => s.itemId === slot.value);
      lostEquipmentNames.push(stolen?.itemName || slot.value);
    }
  }

  // Apply robbery effects (gameplay changes apply to all players)
  updatePlayerById(set, playerId, (p) => ({
    durables: newDurables,
    ...equipmentUnequip,
    happiness: Math.max(0, p.happiness + robberyResult.happinessLoss),
  }));

  // Add equipment loss notification to event messages
  if (lostEquipmentNames.length > 0 && !player.isAI) {
    eventMessages.push(`Equipped gear stolen: ${lostEquipmentNames.join(', ')}! You are now less prepared for combat.`);
  }

  // Show UI notification for non-AI players
  if (!player.isAI) {
    set({ shadowfingersEvent: { type: 'apartment', result: robberyResult } });
  }
}

/** Phase 7: Apply start-of-turn bonuses — appliance per-turn bonuses, housing happiness, arcane tome income */
function processStartOfTurnBonuses(
  set: SetFn,
  playerId: string,
  player: Player,
  currentWeek: number,
  eventMessages: string[],
): void {
  // --- Per-turn appliance bonuses (Jones-style: Microwave = Cooking Fire) ---
  // Cooking Fire: +3 food per turn (prevents some food depletion, like Jones's microwave)
  const hasCookingFire = player.appliances['cooking-fire'] && !player.appliances['cooking-fire'].isBroken;
  if (hasCookingFire) {
    const COOKING_FIRE_FOOD_BONUS = 3;
    updatePlayerById(set, playerId, (p) => ({
      foodLevel: Math.min(100, p.foodLevel + COOKING_FIRE_FOOD_BONUS),
    }));
  }

  // Housing happiness bonus — Homeless: -3, Slums: 0, Noble: +3 (Jones 2-tier)
  const housingBonus = HOUSING_DATA[player.housing as keyof typeof HOUSING_DATA]?.happinessBonus ?? 0;
  if (housingBonus !== 0) {
    updatePlayerById(set, playerId, (p) => ({
      happiness: Math.max(0, Math.min(100, p.happiness + housingBonus)),
    }));
    if (housingBonus < 0) {
      eventMessages.push(`${player.name} is miserable without a home. (${housingBonus} Happiness)`);
    }
  }

  // --- Arcane Tome random income generation (Jones-style Computer: 15% chance, 10-60g) ---
  const hasArcaneTome = player.appliances['arcane-tome'] && !player.appliances['arcane-tome'].isBroken;
  if (hasArcaneTome && Math.random() < 0.15) {
    const income = Math.floor(Math.random() * 51) + 10; // 10-60 gold
    updatePlayerById(set, playerId, (p) => ({ gold: p.gold + income }));
    eventMessages.push(`Your Arcane Tome generated ${income} gold through mystical knowledge!`);
  }
}

// ============================================================
// Main Orchestrator
// ============================================================

export function createStartTurn(set: SetFn, get: GetFn) {
  return (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      // C2: AI players no longer skipped - they get all the same penalties
      // Skip dead players — they shouldn't receive starvation, breakage, or any turn-start effects
      if (!player || player.isGameOver) return;

      // C8: Collect event messages instead of overwriting with each set() call
      const eventMessages: string[] = [];

      // C9: Move player to their home location at start of turn (like Jones in the Fast Lane)
      const homeLocation: LocationId = getHomeLocation(player.housing);
      if (player.currentLocation !== homeLocation) {
        updatePlayerById(set, playerId, (p) => ({
          currentLocation: homeLocation,
          previousLocation: p.currentLocation,
        }));
      }

      // --- Phase 1: Appliance breakage (before food checks) ---
      // Breakage must run first so that a broken Preservation Box / Frost Chest
      // immediately affects food this turn.
      // C2 FIX: Pass get so breakage reads fresh player state (gold may have changed)
      processApplianceBreakage(set, get, playerId);

      // Re-read player after potential appliance breakage
      let currentPlayer = getPlayer(get, playerId);

      // --- Phase 2: Fresh food spoilage ---
      const freshFoodSpoiled = processFreshFoodSpoilage(set, playerId, currentPlayer, eventMessages);

      // Re-read player after potential spoilage changes
      currentPlayer = getPlayer(get, playerId);

      // --- Phase 2.5: Regular food spoilage (eating rancid food, Jones-style) ---
      // Don't double-penalize if fresh food already caused a doctor visit
      let regularFoodSpoiled = false;
      if (!freshFoodSpoiled) {
        regularFoodSpoiled = processRegularFoodSpoilage(set, playerId, currentPlayer, eventMessages);
        currentPlayer = getPlayer(get, playerId);
      }

      // --- Phase 3: Starvation check ---
      const isStarving = processStarvationCheck(set, playerId, currentPlayer, eventMessages);

      // Re-read player after potential starvation/doctor changes
      currentPlayer = getPlayer(get, playerId);

      // --- Phase 4: Relaxation exhaustion check ---
      // B4: Only triggers if player didn't already get a doctor visit from starvation/spoilage
      if (!isStarving && !freshFoodSpoiled && !regularFoodSpoiled) {
        processRelaxationCheck(set, playerId, currentPlayer, eventMessages);
        currentPlayer = getPlayer(get, playerId);
      }

      // --- Phase 5: Homeless penalty ---
      processHomelessPenalty(set, playerId, currentPlayer, eventMessages);

      // --- Phase 6: Apartment robbery ---
      processRobberyCheck(set, playerId, currentPlayer, eventMessages);

      // Re-read player for bonus calculations (robbery may change appliance state)
      currentPlayer = getPlayer(get, playerId);

      // --- Phase 6b: Curse of Lethargy (time loss) ---
      const lethargyCurse = hasCurseEffect(currentPlayer, 'time-loss');
      if (lethargyCurse) {
        const timeLoss = lethargyCurse.magnitude;
        updatePlayerById(set, playerId, (p) => ({
          timeRemaining: Math.max(0, p.timeRemaining - timeLoss),
        }));
        if (!currentPlayer.isAI) {
          eventMessages.push(`${currentPlayer.name} is afflicted by the Curse of Lethargy! -${timeLoss} hours this turn.`);
        }
        currentPlayer = getPlayer(get, playerId);
      }

      // --- Phase 6c: Curse of the Toad (40h time loss + transformation) ---
      const toadCurse = hasCurseEffect(currentPlayer, 'toad-transformation');
      if (toadCurse) {
        updatePlayerById(set, playerId, (p) => ({
          timeRemaining: Math.max(0, p.timeRemaining - toadCurse.magnitude),
        }));
        if (!currentPlayer.isAI) {
          eventMessages.push(`🐸 ${currentPlayer.name} is still a frog! Ribbiting around wastes ${toadCurse.magnitude} hours.`);
        }
        currentPlayer = getPlayer(get, playerId);
      }

      // --- Phase 7: Start-of-turn bonuses ---
      processStartOfTurnBonuses(set, playerId, currentPlayer, get().week, eventMessages);

      // C8: Emit collected event messages at end of startTurn (non-AI only)
      // Append to existing eventMessage (e.g. from processWeekEnd) rather than overwriting
      // startTurn events are part of the weekend processing (they fire between turns)
      if (!currentPlayer.isAI && eventMessages.length > 0) {
        const existing = get().eventMessage;
        const combined = existing
          ? existing + '\n' + eventMessages.join('\n')
          : eventMessages.join('\n');
        set({ eventMessage: combined, eventSource: 'weekend' as const, phase: 'event' });
      }
  };
}
