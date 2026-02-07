// Start-of-turn helpers: appliance breakage, food spoilage, starvation, robbery, bonuses
// Extracted from turnHelpers.ts — see that file for the orchestrator (createTurnActions)

import type { LocationId } from '@/types/game.types';
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

export function createStartTurn(set: SetFn, get: GetFn) {
  return (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      // C2: AI players no longer skipped - they get all the same penalties
      if (!player) return;

      // C8: Collect event messages instead of overwriting with each set() call
      const eventMessages: string[] = [];

      // C9: Move player to their home location at start of turn (like Jones in the Fast Lane)
      const homeLocation: LocationId = getHomeLocation(player.housing);
      if (player.currentLocation !== homeLocation) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, currentLocation: homeLocation, previousLocation: p.currentLocation }
              : p
          ),
        }));
      }

      // === Appliance breakage check FIRST (before food checks) ===
      // Bug fix: breakage must run before fresh food/spoilage checks so that
      // a broken Preservation Box or Frost Chest immediately affects food this turn.
      // Uses player's gold at start of turn (before any deductions).
      if (player.gold > 500) {
        const applianceIds = Object.keys(player.appliances);
        for (const applianceId of applianceIds) {
          const ownedAppliance = player.appliances[applianceId];
          if (!ownedAppliance.isBroken && checkApplianceBreakage(ownedAppliance.source, player.gold)) {
            const repairCost = calculateRepairCost(ownedAppliance.originalPrice);

            // C13: Mark as broken and lose happiness, but don't charge repair cost
            // Player can choose to repair at Enchanter/Market later
            set((state) => ({
              players: state.players.map((p) => {
                if (p.id !== playerId) return p;
                const newAppliances = { ...p.appliances };
                newAppliances[applianceId] = { ...newAppliances[applianceId], isBroken: true };
                return {
                  ...p,
                  appliances: newAppliances,
                  happiness: Math.max(0, p.happiness - 1),
                };
              }),
            }));

            // C2: Only show UI notification for non-AI players
            if (!player.isAI) {
              set({
                applianceBreakageEvent: {
                  playerId,
                  applianceId,
                  repairCost,
                },
              });
            }

            // Only trigger one breakage per turn
            break;
          }
        }
      }

      // Re-read player after potential appliance breakage (appliance state may have changed)
      let currentPlayer = get().players.find(p => p.id === playerId)!;

      // === Fresh food spoilage check (uses current appliance state after breakage) ===
      const hasPreservationBox = currentPlayer.appliances['preservation-box'] && !currentPlayer.appliances['preservation-box'].isBroken;
      let freshFoodSpoiled = false;

      if (!hasPreservationBox && currentPlayer.freshFood > 0) {
        // All fresh food spoils without a working Preservation Box
        const spoiledAmount = currentPlayer.freshFood;
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, freshFood: 0 } : p
          ),
        }));
        eventMessages.push(`${currentPlayer.name}'s fresh food spoiled! No working Preservation Box to keep it fresh.`);
        freshFoodSpoiled = true;

        // Doctor visit trigger from food spoilage (25% chance, matches Jones)
        if (Math.random() < 0.25) {
          const doctorCost = 30 + Math.floor(Math.random() * 171); // 30-200g
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId
                ? {
                    ...p,
                    timeRemaining: Math.max(0, p.timeRemaining - 10),
                    happiness: Math.max(0, p.happiness - 4),
                    gold: Math.max(0, p.gold - doctorCost),
                  }
                : p
            ),
          }));
          eventMessages.push(`${currentPlayer.name} got sick from spoiled food! Healer charged ${doctorCost}g. -10 Hours, -4 Happiness.`);
        }
      } else if (hasPreservationBox) {
        // Cap fresh food to max storage (Frost Chest broken = excess spoils)
        const hasFrostChest = currentPlayer.appliances['frost-chest'] && !currentPlayer.appliances['frost-chest'].isBroken;
        const maxStorage = hasFrostChest ? 12 : 6;
        if (currentPlayer.freshFood > maxStorage) {
          const spoiledUnits = currentPlayer.freshFood - maxStorage;
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId ? { ...p, freshFood: maxStorage } : p
            ),
          }));
          eventMessages.push(`${spoiledUnits} units of fresh food spoiled (storage full, max ${maxStorage}).`);
        }
      }

      // Re-read player after potential spoilage changes
      currentPlayer = get().players.find(p => p.id === playerId)!;

      // === Jones-style Fresh Food + Starvation Check ===
      // Priority: 1) regular foodLevel, 2) freshFood in Preservation Box, 3) starve
      const hasWorkingBox = currentPlayer.appliances['preservation-box'] && !currentPlayer.appliances['preservation-box'].isBroken;
      const hasRegularFood = currentPlayer.foodLevel > 0;
      const hasFreshFood = hasWorkingBox && currentPlayer.freshFood > 0;

      let isStarving = false;
      if (!hasRegularFood && hasFreshFood) {
        // Consume 1 fresh food unit instead of starving
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, freshFood: Math.max(0, p.freshFood - 1) }
              : p
          ),
        }));
        eventMessages.push(`${currentPlayer.name}'s Preservation Box provided fresh food, preventing starvation.`);
      } else if (!hasRegularFood && !hasFreshFood) {
        // Starving: Lose 20 Hours (1/3 of turn!) - Jones-style penalty
        isStarving = true;
        const STARVATION_TIME_PENALTY = 20;
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, timeRemaining: Math.max(0, p.timeRemaining - STARVATION_TIME_PENALTY) }
              : p
          ),
        }));
        eventMessages.push(`${currentPlayer.name} is starving! Lost ${STARVATION_TIME_PENALTY} Hours searching for food.`);

        // B4: Doctor Visit trigger from starvation (25% chance)
        if (Math.random() < 0.25) {
          const doctorCost = 30 + Math.floor(Math.random() * 171); // 30-200g
          set((state) => ({
            players: state.players.map((p) =>
              p.id === playerId
                ? {
                    ...p,
                    timeRemaining: Math.max(0, p.timeRemaining - 10),
                    happiness: Math.max(0, p.happiness - 4),
                    gold: Math.max(0, p.gold - doctorCost),
                  }
                : p
            ),
          }));
          eventMessages.push(`${currentPlayer.name} collapsed from hunger and was taken to the healer! -10 Hours, -4 Happiness, -${doctorCost}g.`);
        }
      }

      // C10: Re-read player after potential gold changes from starvation doctor visit
      currentPlayer = get().players.find(p => p.id === playerId)!;

      // B4: Doctor Visit trigger from low relaxation (<=15, 20% chance)
      if (!isStarving && !freshFoodSpoiled && currentPlayer.relaxation <= 15 && Math.random() < 0.20) {
        const doctorCost = 30 + Math.floor(Math.random() * 171); // 30-200g
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  timeRemaining: Math.max(0, p.timeRemaining - 10),
                  happiness: Math.max(0, p.happiness - 4),
                  gold: Math.max(0, p.gold - doctorCost),
                }
              : p
          ),
        }));
        eventMessages.push(`${currentPlayer.name} is exhausted and collapsed! The healer charged ${doctorCost}g. -10 Hours, -4 Happiness.`);

        // C10: Re-read player after gold change from relaxation doctor visit
        currentPlayer = get().players.find(p => p.id === playerId)!;
      }

      // Homeless penalty: sleeping on the streets costs health and time
      if (currentPlayer.housing === 'homeless') {
        const HOMELESS_HEALTH_PENALTY = 5;
        const HOMELESS_TIME_PENALTY = 8;
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  health: Math.max(0, p.health - HOMELESS_HEALTH_PENALTY),
                  timeRemaining: Math.max(0, p.timeRemaining - HOMELESS_TIME_PENALTY),
                }
              : p
          ),
        }));
        eventMessages.push(`${currentPlayer.name} slept on the streets. -${HOMELESS_HEALTH_PENALTY} health, -${HOMELESS_TIME_PENALTY} hours.`);
      }

      // Check for apartment robbery at the start of player's turn
      const robberyResult = checkApartmentRobbery(currentPlayer);

      if (robberyResult) {
        // Remove stolen items from player's durables
        const newDurables = { ...currentPlayer.durables };
        const stolenItemIds = new Set<string>();
        for (const stolen of robberyResult.stolenItems) {
          delete newDurables[stolen.itemId];
          stolenItemIds.add(stolen.itemId);
        }

        // Check if any equipped items were stolen — unequip them
        const equipmentUnequip: { equippedWeapon?: null; equippedArmor?: null; equippedShield?: null } = {};
        const lostEquipmentNames: string[] = [];
        if (currentPlayer.equippedWeapon && stolenItemIds.has(currentPlayer.equippedWeapon)) {
          equipmentUnequip.equippedWeapon = null;
          const stolen = robberyResult.stolenItems.find(s => s.itemId === currentPlayer.equippedWeapon);
          lostEquipmentNames.push(stolen?.itemName || currentPlayer.equippedWeapon);
        }
        if (currentPlayer.equippedArmor && stolenItemIds.has(currentPlayer.equippedArmor)) {
          equipmentUnequip.equippedArmor = null;
          const stolen = robberyResult.stolenItems.find(s => s.itemId === currentPlayer.equippedArmor);
          lostEquipmentNames.push(stolen?.itemName || currentPlayer.equippedArmor);
        }
        if (currentPlayer.equippedShield && stolenItemIds.has(currentPlayer.equippedShield)) {
          equipmentUnequip.equippedShield = null;
          const stolen = robberyResult.stolenItems.find(s => s.itemId === currentPlayer.equippedShield);
          lostEquipmentNames.push(stolen?.itemName || currentPlayer.equippedShield);
        }

        // Apply robbery effects (gameplay changes apply to all players)
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  durables: newDurables,
                  ...equipmentUnequip,
                  happiness: Math.max(0, p.happiness + robberyResult.happinessLoss),
                }
              : p
          ),
        }));

        // Add equipment loss notification to event messages
        if (lostEquipmentNames.length > 0 && !currentPlayer.isAI) {
          eventMessages.push(`Equipped gear stolen: ${lostEquipmentNames.join(', ')}! You are now less prepared for combat.`);
        }

        // C2: Only show UI notification for non-AI players
        if (!currentPlayer.isAI) {
          set({
            shadowfingersEvent: {
              type: 'apartment',
              result: robberyResult,
            },
          });
        }
      }

      // Cooking Fire happiness bonus — nerfed: only triggers every other week (even weeks)
      // Re-read for current appliance state
      currentPlayer = get().players.find(p => p.id === playerId)!;
      const hasCookingAppliance = currentPlayer.appliances['cooking-fire'] && !currentPlayer.appliances['cooking-fire'].isBroken;
      const currentWeek = get().week;
      if (hasCookingAppliance && currentWeek % 2 === 0) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, happiness: Math.min(100, p.happiness + 1) }
              : p
          ),
        }));
      }

      // Housing happiness bonus — applied per turn (was defined but never used)
      // Homeless: -3, Slums: 0, Modest: +2, Noble: +3
      const housingBonus = HOUSING_DATA[currentPlayer.housing as keyof typeof HOUSING_DATA]?.happinessBonus ?? 0;
      if (housingBonus !== 0) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, happiness: Math.max(0, Math.min(100, p.happiness + housingBonus)) }
              : p
          ),
        }));
        if (housingBonus < 0) {
          eventMessages.push(`${currentPlayer.name} is miserable without a home. (${housingBonus} Happiness)`);
        }
      }

      // Arcane Tome random income chance
      const hasArcaneTome = currentPlayer.appliances['arcane-tome'] && !currentPlayer.appliances['arcane-tome'].isBroken;
      if (hasArcaneTome && Math.random() < 0.15) { // 15% chance per turn
        const income = Math.floor(Math.random() * 50) + 10; // 10-60 gold
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, gold: p.gold + income }
              : p
          ),
        }));
        eventMessages.push(`Your Arcane Tome generated ${income} gold through mystical knowledge!`);
      }

      // C8: Emit collected event messages at end of startTurn (non-AI only)
      // Append to existing eventMessage (e.g. from processWeekEnd) rather than overwriting
      if (!currentPlayer.isAI && eventMessages.length > 0) {
        const existing = get().eventMessage;
        const combined = existing
          ? existing + '\n' + eventMessages.join('\n')
          : eventMessages.join('\n');
        set({ eventMessage: combined, phase: 'event' });
      }
  };
}
