// Turn management helpers
// endTurn, startTurn, processWeekEnd - the biggest functions in the store

import type { LocationId, HousingTier, WeekendEventResult } from '@/types/game.types';
import { HOURS_PER_TURN, RENT_COSTS } from '@/types/game.types';
import { checkWeeklyTheft, checkMarketCrash } from '@/data/events';
import { HOUSING_DATA } from '@/data/housing';
import {
  checkApartmentRobbery,
} from '@/data/shadowfingers';
import {
  getAppliance,
  calculateRepairCost,
  checkApplianceBreakage,
} from '@/data/items';
import { updateStockPrices } from '@/data/stocks';
import { selectWeekendActivity } from '@/data/weekends';
import type { SetFn, GetFn } from '../storeTypes';

// Players always start their turn at home: Noble Heights or The Slums
function getHomeLocation(housing: string): LocationId {
  if (housing === 'noble') return 'noble-heights';
  return 'slums';
}

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
        // C9: Move player to their home location at start of turn
        const homeLocation: LocationId = getHomeLocation(nextPlayer.housing);
        set({
          currentPlayerIndex: nextIndex,
          players: state.players.map((p, index) =>
            index === nextIndex
              ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: homeLocation, dungeonAttemptsThisTurn: 0 }
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
        for (const stolen of robberyResult.stolenItems) {
          delete newDurables[stolen.itemId];
        }

        // Apply robbery effects (gameplay changes apply to all players)
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
        }));

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
      if (!currentPlayer.isAI && eventMessages.length > 0) {
        set({ eventMessage: eventMessages.join('\n') });
      }
    },

    processWeekEnd: () => {
      const state = get();
      const newWeek = state.week + 1;
      const isRentDue = newWeek % 4 === 0;
      const isClothingDegradation = newWeek % 8 === 0;
      let eventMessages: string[] = [];

      // H8: Check market crash ONCE as a global event (outside player loop)
      const crashResult = checkMarketCrash(true);

      // Process all players for week-end effects
      const updatedPlayers = state.players.map((player) => {
        let p = { ...player };

        // Skip dead players
        if (p.isGameOver) {
          return p;
        }

        // Reset newspaper and dungeon fatigue for new week
        p.hasNewspaper = false;
        p.dungeonAttemptsThisTurn = 0;

        // B5: Dependability decay only if player doesn't have a job
        if (!p.currentJob) {
          p.dependability = Math.max(0, p.dependability - 5);
        }

        // If dependability too low, may lose job
        if (p.currentJob && p.dependability < 20) {
          p.currentJob = null;
          p.currentWage = 0;
          p.shiftsWorkedSinceHire = 0;
          if (!p.isAI) {
            eventMessages.push(`${p.name} was fired due to poor dependability!`);
          }
        }

        // H8: Apply global market crash result to employed players
        if (p.currentJob) {
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

        // Starvation effects (reduced happiness penalty — Jones uses time penalty, not happiness)
        if (p.foodLevel === 0) {
          p.health = Math.max(0, p.health - 10);
          p.happiness = Math.max(0, p.happiness - 8);
          if (!p.isAI) {
            eventMessages.push(`${p.name} is starving! -10 health, -8 happiness.`);
          }
        }

        // Clothing degradation
        if (isClothingDegradation) {
          p.clothingCondition = Math.max(0, p.clothingCondition - 25);
          if (!p.isAI && p.clothingCondition <= 25) {
            eventMessages.push(`${p.name}'s clothing is in poor condition!`);
          }
        }

        // C4: Rent debt accumulation for garnishment - use lockedRent if available
        if (p.housing !== 'homeless' && p.weeksSinceRent >= 4) {
          const rentCost = p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing];
          p.rentDebt += Math.floor(rentCost * 0.25); // Add 25% of rent as debt each week
        }

        // Eviction check - after 8 weeks without paying rent
        if (p.housing !== 'homeless' && p.weeksSinceRent >= 8) {
          p.housing = 'homeless';
          p.weeksSinceRent = 0;
          p.rentDebt = 0; // Clear debt on eviction
          p.inventory = []; // Lose all items
          // H1: Clear appliances and equipment on eviction
          p.durables = {};
          p.appliances = {};
          p.freshFood = 0; // Fresh food lost with appliances
          p.equippedWeapon = null;
          p.equippedArmor = null;
          p.equippedShield = null;
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

        // === Loan Interest (10% per week on outstanding balance) ===
        if (p.loanAmount > 0) {
          const interest = Math.ceil(p.loanAmount * 0.10);
          p.loanAmount += interest;
          // B1: Cap loan at 2x max borrow amount (max borrow is 1000)
          p.loanAmount = Math.min(p.loanAmount, 2000);
          p.loanWeeksRemaining = Math.max(0, p.loanWeeksRemaining - 1);

          // Loan default: if weeks run out, forced repayment from savings/gold
          if (p.loanWeeksRemaining <= 0 && p.loanAmount > 0) {
            // Take from savings first, then gold
            const fromSavings = Math.min(p.savings, p.loanAmount);
            p.savings -= fromSavings;
            const remaining = p.loanAmount - fromSavings;
            const fromGold = Math.min(p.gold, remaining);
            p.gold -= fromGold;
            const stillOwed = remaining - fromGold;

            if (stillOwed > 0) {
              // Can't fully repay: happiness penalty, wage garnishment continues
              p.happiness = Math.max(0, p.happiness - 10);
              p.loanWeeksRemaining = 4; // Extension with more penalties
              if (!p.isAI) {
                eventMessages.push(`${p.name} defaulted on loan! -10 happiness. ${stillOwed}g still owed.`);
              }
            } else {
              p.loanAmount = 0;
              if (!p.isAI) {
                eventMessages.push(`${p.name}'s loan was forcefully repaid from savings!`);
              }
            }
          }
        }

        // === Weekend System (Jones-style) ===
        const weekendResult = selectWeekendActivity(
          p.tickets,
          p.appliances,
          newWeek,
          p.gold,
        );
        if (weekendResult) {
          const { activity, ticketUsed } = weekendResult;
          // Deduct cost
          p.gold = Math.max(0, p.gold - activity.cost);
          // Add happiness
          p.happiness = Math.min(100, p.happiness + activity.happiness);
          // Consume ticket if used
          if (ticketUsed) {
            p.tickets = p.tickets.filter(t => t !== ticketUsed);
          }
          if (!p.isAI) {
            eventMessages.push(`Weekend: ${activity.description} (+${activity.happiness} Happiness${activity.cost > 0 ? `, -${activity.cost}g` : ''})`);
          }
        }

        // === Lottery Drawing (Fortune's Wheel) ===
        // C11: Fixed lottery EV - negative EV as intended
        // EV per ticket: 0.001*500 + 0.059*20 = 0.5 + 1.18 = 1.68g per 10g ticket
        if (p.lotteryTickets > 0) {
          let lotteryWinnings = 0;
          for (let i = 0; i < p.lotteryTickets; i++) {
            const roll = Math.random();
            if (roll < 0.001) { // 0.1% grand prize per ticket
              lotteryWinnings += 500;
            } else if (roll < 0.06) { // 5.9% small prize per ticket
              lotteryWinnings += 20;
            }
          }
          if (lotteryWinnings > 0) {
            p.gold += lotteryWinnings;
            p.happiness = Math.min(100, p.happiness + (lotteryWinnings >= 500 ? 25 : 5));
            if (!p.isAI) {
              eventMessages.push(`Fortune's Wheel: ${p.name} won ${lotteryWinnings}g!`);
            }
          } else if (!p.isAI) {
            eventMessages.push(`Fortune's Wheel: No luck this week.`);
          }
          p.lotteryTickets = 0; // Reset tickets after drawing
        }

        // Relaxation decay (-1 per week, Jones-style)
        p.relaxation = Math.max(10, p.relaxation - 1);

        // C3: Rent tracking - consume prepaid weeks first
        if (p.rentPrepaidWeeks > 0) {
          p.rentPrepaidWeeks -= 1;
        } else {
          p.weeksSinceRent += 1;
        }

        return p;
      });

      // C5: Check for deaths after week-end processing
      for (const p of updatedPlayers) {
        if (!p.isGameOver && p.health <= 0) {
          // Inline death check for processWeekEnd
          if (p.savings >= 100) {
            p.health = 50;
            p.savings -= 100;
            eventMessages.push(`${p.name} was revived by healers! 100g taken from savings.`);
          } else {
            p.isGameOver = true;
            eventMessages.push(`${p.name} has perished!`);
          }
        }
      }

      // === Update Stock Prices (Jones-style) ===
      const isMarketCrash = Math.random() < 0.05; // 5% chance of market crash
      const newStockPrices = updateStockPrices(state.stockPrices, isMarketCrash);
      if (isMarketCrash) {
        eventMessages.push('MARKET CRASH! Stock prices have plummeted!');
      }

      // Find first alive player for the new week
      const firstAliveIndex = updatedPlayers.findIndex(p => !p.isGameOver);

      // Check if all players are dead
      if (firstAliveIndex === -1) {
        set({
          week: newWeek,
          phase: 'victory',
          eventMessage: 'All players have perished. Game Over!',
          stockPrices: newStockPrices,
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
          stockPrices: newStockPrices,
        });
        return;
      }

      // C9: Move first player to their home location
      const firstPlayer = updatedPlayers[firstAliveIndex];
      const firstPlayerHome: LocationId = getHomeLocation(firstPlayer.housing);

      set({
        week: newWeek,
        currentPlayerIndex: firstAliveIndex,
        priceModifier: 0.7 + Math.random() * 0.6, // Random price between 0.7 and 1.3
        players: updatedPlayers.map((p, index) =>
          index === firstAliveIndex
            ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: firstPlayerHome, dungeonAttemptsThisTurn: 0 }
            : p
        ),
        rentDueWeek: isRentDue ? newWeek : state.rentDueWeek,
        selectedLocation: null,
        eventMessage: eventMessages.length > 0 ? eventMessages.join('\n') : null,
        phase: eventMessages.length > 0 ? 'event' : 'playing',
        stockPrices: newStockPrices,
      });

      // Check for apartment robbery at start of first alive player's turn
      if (firstPlayer && !firstPlayer.isGameOver) {
        get().startTurn(firstPlayer.id);
      }
    },
  };
}
