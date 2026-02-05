// Turn management helpers
// endTurn, startTurn, processWeekEnd - the biggest functions in the store

import type { LocationId, HousingTier } from '@/types/game.types';
import { HOURS_PER_TURN, RENT_COSTS } from '@/types/game.types';
import { checkWeeklyTheft, checkMarketCrash } from '@/data/events';
import {
  checkApartmentRobbery,
} from '@/data/shadowfingers';
import {
  getAppliance,
  calculateRepairCost,
  checkApplianceBreakage,
} from '@/data/items';
import type { SetFn, GetFn } from '../storeTypes';

export function createTurnActions(set: SetFn, get: GetFn) {
  return {
    endTurn: () => {
      const state = get();

      // Check if current player has achieved victory goals before switching turns
      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer && !currentPlayer.isGameOver) {
        if (get().checkVictory(currentPlayer.id)) {
          return; // Victory achieved, don't continue with turn switching
        }
      }

      // Find next alive player
      const findNextAlivePlayer = (startIndex: number): { index: number; isNewWeek: boolean } => {
        let index = startIndex;
        let loopCount = 0;
        const totalPlayers = state.players.length;

        while (loopCount < totalPlayers) {
          index = (index + 1) % totalPlayers;
          const isNewWeek = index === 0;

          // Check if this player is alive
          if (!state.players[index].isGameOver) {
            return { index, isNewWeek };
          }

          // If we've checked a full loop and all players are dead, game over
          loopCount++;
          if (loopCount >= totalPlayers) {
            // All players are game over - this shouldn't normally happen
            return { index: 0, isNewWeek: true };
          }
        }

        return { index: (startIndex + 1) % totalPlayers, isNewWeek: (startIndex + 1) % totalPlayers === 0 };
      };

      // Check if only one player remains alive - they win (multiplayer only)
      // In single-player, the player must achieve all goals to win
      const alivePlayers = state.players.filter(p => !p.isGameOver);
      if (alivePlayers.length === 1 && state.players.length > 1) {
        set({
          winner: alivePlayers[0].id,
          phase: 'victory',
          eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
        });
        return;
      }

      if (alivePlayers.length === 0) {
        set({
          phase: 'victory',
          eventMessage: 'All players have perished. Game Over!',
        });
        return;
      }

      const { index: nextIndex, isNewWeek } = findNextAlivePlayer(state.currentPlayerIndex);

      if (isNewWeek) {
        get().processWeekEnd();
      } else {
        // Start next player's turn (includes apartment robbery check)
        const nextPlayer = state.players[nextIndex];
        // Move player to their home location at start of turn
        const homeLocation: LocationId = nextPlayer.housing === 'noble' ? 'noble-heights' : 'slums';
        set({
          currentPlayerIndex: nextIndex,
          players: state.players.map((p, index) =>
            index === nextIndex
              ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation }
              : p
          ),
          selectedLocation: null,
        });
        // Check for apartment robbery at start of turn
        get().startTurn(nextPlayer.id);
      }
    },

    startTurn: (playerId: string) => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.isAI) return;

      // Move player to their home location at start of turn (like Jones in the Fast Lane)
      const homeLocation: LocationId = player.housing === 'noble' ? 'noble-heights' : 'slums';
      if (player.currentLocation !== homeLocation) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, currentLocation: homeLocation, previousLocation: p.currentLocation }
              : p
          ),
        }));
      }

      // Jones-style Starvation Check at start of turn
      // If player has no food and no Preservation Box with food, they starve and lose 20 Hours
      const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
      const hasFood = player.foodLevel > 0;

      if (!hasFood && !hasPreservationBox) {
        // Starving: Lose 20 Hours (1/3 of turn!) - Jones-style penalty
        const STARVATION_TIME_PENALTY = 20;
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, timeRemaining: Math.max(0, p.timeRemaining - STARVATION_TIME_PENALTY) }
              : p
          ),
          eventMessage: `${player.name} is starving! Lost ${STARVATION_TIME_PENALTY} Hours searching for food.`,
        }));
      }

      // Homeless penalty: sleeping on the streets costs health and time
      if (player.housing === 'homeless') {
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
          eventMessage: `${player.name} slept on the streets. -${HOMELESS_HEALTH_PENALTY} health, -${HOMELESS_TIME_PENALTY} hours.`,
        }));
      }

      // Check for apartment robbery at the start of player's turn
      const robberyResult = checkApartmentRobbery(player);

      if (robberyResult) {
        // Remove stolen items from player's durables
        const newDurables = { ...player.durables };
        for (const stolen of robberyResult.stolenItems) {
          delete newDurables[stolen.itemId];
        }

        // Apply robbery effects
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  durables: newDurables,
                  happiness: Math.max(0, p.happiness + robberyResult.happinessLoss),
                }
              : p
          ),
          shadowfingersEvent: {
            type: 'apartment',
            result: robberyResult,
          },
        }));
      }

      // Jones-style appliance breakage check (only if player has >500 gold)
      if (player.gold > 500) {
        const applianceIds = Object.keys(player.appliances);
        for (const applianceId of applianceIds) {
          const ownedAppliance = player.appliances[applianceId];
          if (!ownedAppliance.isBroken && checkApplianceBreakage(ownedAppliance.source, player.gold)) {
            const repairCost = calculateRepairCost(ownedAppliance.originalPrice);
            const appliance = getAppliance(applianceId);

            // Mark as broken and charge repair cost, lose happiness
            set((state) => ({
              players: state.players.map((p) => {
                if (p.id !== playerId) return p;
                const newAppliances = { ...p.appliances };
                newAppliances[applianceId] = { ...newAppliances[applianceId], isBroken: true };
                return {
                  ...p,
                  appliances: newAppliances,
                  gold: Math.max(0, p.gold - repairCost),
                  happiness: Math.max(0, p.happiness - 1),
                };
              }),
              applianceBreakageEvent: {
                playerId,
                applianceId,
                repairCost,
              },
            }));

            // Only trigger one breakage per turn
            break;
          }
        }
      }

      // Cooking Fire / Preservation Box per-turn happiness bonus
      const hasCookingAppliance = player.appliances['cooking-fire'] && !player.appliances['cooking-fire'].isBroken;
      if (hasCookingAppliance) {
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, happiness: Math.min(100, p.happiness + 1) }
              : p
          ),
        }));
      }

      // Arcane Tome random income chance
      const hasArcaneTome = player.appliances['arcane-tome'] && !player.appliances['arcane-tome'].isBroken;
      if (hasArcaneTome && Math.random() < 0.15) { // 15% chance per turn
        const income = Math.floor(Math.random() * 50) + 10; // 10-60 gold
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId
              ? { ...p, gold: p.gold + income }
              : p
          ),
          eventMessage: `Your Arcane Tome generated ${income} gold through mystical knowledge!`,
        }));
      }
    },

    processWeekEnd: () => {
      const state = get();
      const newWeek = state.week + 1;
      const isRentDue = newWeek % 4 === 0;
      const isClothingDegradation = newWeek % 8 === 0;
      let eventMessages: string[] = [];

      // Process all players for week-end effects
      const updatedPlayers = state.players.map((player) => {
        let p = { ...player };

        // Skip dead players
        if (p.isGameOver) {
          return p;
        }

        // Reset newspaper for new week
        p.hasNewspaper = false;

        // Dependability decay (decreases 5% each week if not working)
        p.dependability = Math.max(0, p.dependability - 5);

        // If dependability too low, may lose job
        if (p.currentJob && p.dependability < 20) {
          p.currentJob = null;
          p.currentWage = 0;
          p.shiftsWorkedSinceHire = 0;
          if (!p.isAI) {
            eventMessages.push(`${p.name} was fired due to poor dependability!`);
          }
        }

        // Jones-style Market Crash events (affects employed players)
        if (p.currentJob) {
          const crashResult = checkMarketCrash(true);
          if (crashResult.type === 'layoff') {
            p.currentJob = null;
            p.currentWage = 0;
            p.shiftsWorkedSinceHire = 0;
            p.happiness = Math.max(0, p.happiness - 20);
            if (!p.isAI) {
              eventMessages.push(`${p.name}: ${crashResult.message}`);
            }
          } else if (crashResult.type === 'paycut' && crashResult.wageMultiplier) {
            p.currentWage = Math.floor(p.currentWage * crashResult.wageMultiplier);
            p.happiness = Math.max(0, p.happiness - 10);
            if (!p.isAI) {
              eventMessages.push(`${p.name}: ${crashResult.message}`);
            }
          }
        }

        // Food depletion
        p.foodLevel = Math.max(0, p.foodLevel - 25);

        // Starvation effects
        if (p.foodLevel === 0) {
          p.health = Math.max(0, p.health - 10);
          p.happiness = Math.max(0, p.happiness - 15);
          if (!p.isAI) {
            eventMessages.push(`${p.name} is starving! -10 health, -15 happiness.`);
          }
        }

        // Clothing degradation
        if (isClothingDegradation) {
          p.clothingCondition = Math.max(0, p.clothingCondition - 25);
          if (!p.isAI && p.clothingCondition <= 25) {
            eventMessages.push(`${p.name}'s clothing is in poor condition!`);
          }
        }

        // Rent debt accumulation for garnishment
        if (p.housing !== 'homeless' && p.weeksSinceRent >= 4) {
          const rentCost = RENT_COSTS[p.housing];
          p.rentDebt += Math.floor(rentCost * 0.25); // Add 25% of rent as debt each week
        }

        // Eviction check - after 8 weeks without paying rent
        if (p.housing !== 'homeless' && p.weeksSinceRent >= 8) {
          p.housing = 'homeless';
          p.weeksSinceRent = 0;
          p.rentDebt = 0; // Clear debt on eviction
          p.inventory = []; // Lose all items
          p.happiness = Math.max(0, p.happiness - 30);
          if (!p.isAI) {
            eventMessages.push(`${p.name} has been evicted! All possessions lost.`);
          }
        } else if (p.housing !== 'homeless' && p.weeksSinceRent >= 4 && !p.isAI) {
          eventMessages.push(`${p.name}: Rent is overdue! Wages will be garnished 50%.`);
        }

        // Investment returns (modest weekly interest - reduced for balance)
        if (p.investments > 0) {
          const returns = Math.floor(p.investments * 0.005); // 0.5% weekly (was 2%)
          p.investments += returns;
        }

        // Savings interest (minimal - banks are safe storage, not income)
        if (p.savings > 0) {
          const interest = Math.floor(p.savings * 0.001); // 0.1% weekly (was 0.5%)
          p.savings += interest;
        }

        // Check for Shadowfingers theft
        const theftEvent = checkWeeklyTheft(p.housing, p.gold);
        if (theftEvent && theftEvent.effect.gold) {
          p.gold = Math.max(0, p.gold + theftEvent.effect.gold);
          if (theftEvent.effect.happiness) {
            p.happiness = Math.max(0, p.happiness + theftEvent.effect.happiness);
          }
          if (!p.isAI) {
            eventMessages.push(`Shadowfingers struck! ${p.name} lost ${Math.abs(theftEvent.effect.gold)} gold!`);
          }
        }

        // Random sickness chance (5%)
        if (Math.random() < 0.05 && !p.isSick) {
          p.isSick = true;
          p.health = Math.max(0, p.health - 15);
          if (!p.isAI) {
            eventMessages.push(`${p.name} has fallen ill! Visit a healer to recover.`);
          }
        }

        // Rent tracking
        p.weeksSinceRent += 1;

        return p;
      });

      // Find first alive player for the new week
      const firstAliveIndex = updatedPlayers.findIndex(p => !p.isGameOver);

      // Check if all players are dead
      if (firstAliveIndex === -1) {
        set({
          week: newWeek,
          phase: 'victory',
          eventMessage: 'All players have perished. Game Over!',
        });
        return;
      }

      // Check if only one player remains (multiplayer only)
      // In single-player, the player must achieve all goals to win
      const alivePlayers = updatedPlayers.filter(p => !p.isGameOver);
      if (alivePlayers.length === 1 && updatedPlayers.length > 1) {
        set({
          week: newWeek,
          winner: alivePlayers[0].id,
          phase: 'victory',
          eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
        });
        return;
      }

      // Move first player to their home location
      const firstPlayer = updatedPlayers[firstAliveIndex];
      const firstPlayerHome: LocationId = firstPlayer.housing === 'noble' ? 'noble-heights' : 'slums';

      set({
        week: newWeek,
        currentPlayerIndex: firstAliveIndex,
        priceModifier: 0.7 + Math.random() * 0.6, // Random price between 0.7 and 1.3
        players: updatedPlayers.map((p, index) =>
          index === firstAliveIndex
            ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: firstPlayerHome }
            : p
        ),
        rentDueWeek: isRentDue ? newWeek : state.rentDueWeek,
        selectedLocation: null,
        eventMessage: eventMessages.length > 0 ? eventMessages.join('\n') : null,
        phase: eventMessages.length > 0 ? 'event' : 'playing',
      });

      // Check for apartment robbery at start of first alive player's turn
      if (firstPlayer && !firstPlayer.isGameOver) {
        get().startTurn(firstPlayer.id);
      }
    },
  };
}
