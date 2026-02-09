// Week-end processing helpers: rent, food depletion, theft, economy, stocks, loans, weekends
// Extracted from turnHelpers.ts — see that file for the orchestrator (createTurnActions)

import type { LocationId } from '@/types/game.types';
import {
  HOURS_PER_TURN,
  RENT_COSTS,
  AGE_INTERVAL,
  AGE_MILESTONES,
  ELDER_AGE,
  ELDER_HEALTH_DECAY,
  HEALTH_CRISIS_AGE,
  HEALTH_CRISIS_CHANCE,
  HEALTH_CRISIS_DAMAGE,
} from '@/types/game.types';
import { checkWeeklyTheft, checkMarketCrash } from '@/data/events';
import { getGameOption } from '@/data/gameOptions';
import { getItem } from '@/data/items';
import { updateStockPrices } from '@/data/stocks';
import { selectWeekendActivity } from '@/data/weekends';
import { advanceWeather, CLEAR_WEATHER } from '@/data/weather';
import type { WeatherState } from '@/data/weather';
import { getActiveFestival } from '@/data/festivals';
import type { FestivalId } from '@/data/festivals';
import { updateAchievementStats } from '@/data/achievements';
import type { SetFn, GetFn } from '../storeTypes';
import { getHomeLocation } from './turnHelpers';

export function createProcessWeekEnd(set: SetFn, get: GetFn) {
  return () => {
      const state = get();
      const newWeek = state.week + 1;
      // C6: Track weeks played for achievements
      updateAchievementStats({ totalWeeksPlayed: 1 });
      const isRentDue = newWeek % 4 === 0;
      const isClothingDegradation = newWeek % 8 === 0;
      let eventMessages: string[] = [];

      // === Economy Cycle: advance trend, compute new priceModifier ===
      let economyTrend = state.economyTrend;
      let economyCycleWeeksLeft = state.economyCycleWeeksLeft - 1;

      // Time to change trend?
      if (economyCycleWeeksLeft <= 0) {
        const roll = Math.random();
        if (roll < 0.35) economyTrend = 1;       // boom
        else if (roll < 0.70) economyTrend = 0;   // stable
        else economyTrend = -1;                    // recession
        economyCycleWeeksLeft = 3 + Math.floor(Math.random() * 5); // 3-7 weeks
      }

      // Drift priceModifier gradually toward trend direction
      const drift = economyTrend * (0.02 + Math.random() * 0.04); // ±0.02-0.06
      const noise = (Math.random() - 0.5) * 0.03; // tiny random noise ±0.015
      const newPriceModifier = Math.max(0.75, Math.min(1.25, state.priceModifier + drift + noise));

      // H8: Market crash only during recession (trend = -1) and low economy
      const crashResult = (economyTrend === -1 && newPriceModifier < 0.9)
        ? checkMarketCrash(true)
        : { type: 'none' as const };

      // === Weather System: advance weather, announce changes ===
      let newWeather: WeatherState;
      if (getGameOption('enableWeatherEvents')) {
        const prevWeather = state.weather || { ...CLEAR_WEATHER };
        newWeather = advanceWeather(prevWeather);

        // Announce weather changes
        if (newWeather.type !== prevWeather.type) {
          if (newWeather.type !== 'clear') {
            eventMessages.push(`Weather: ${newWeather.name}! ${newWeather.description}`);
          } else if (prevWeather.type !== 'clear') {
            eventMessages.push('The weather has cleared. Fair skies return to Guildholm.');
          }
        }
      } else {
        newWeather = { ...CLEAR_WEATHER };
      }

      // Apply weather price multiplier on top of economy drift
      const weatherAdjustedPrice = newPriceModifier * newWeather.priceMultiplier;

      // === Seasonal Festival check ===
      let activeFestivalId: FestivalId | null = null;
      const festival = getGameOption('enableFestivals') ? getActiveFestival(newWeek) : null;
      if (festival) {
        activeFestivalId = festival.id;
        eventMessages.push(festival.eventMessage);
        // C6: Track festival attendance for achievements
        updateAchievementStats({ festivalsAttended: 1 });
      }

      // Apply festival price multiplier on top of weather+economy
      const festivalPriceMult = festival ? festival.priceMultiplier : 1.0;
      const finalPriceModifier = Math.max(0.70, Math.min(1.35, weatherAdjustedPrice * festivalPriceMult));

      // Process all players for week-end effects
      const updatedPlayers = state.players.map((player) => {
        let p = { ...player };

        // Skip dead players
        if (p.isGameOver) {
          return p;
        }

        // Reset newspaper, dungeon fatigue, resurrection flag, and bounties for new week
        p.hasNewspaper = false;
        p.dungeonAttemptsThisTurn = 0;
        p.wasResurrectedThisWeek = false;
        // B2: Reset weekly bounty completions
        p.completedBountiesThisWeek = [];
        // B4: Decrement quest cooldown
        if (p.questCooldownWeeksLeft > 0) {
          p.questCooldownWeeksLeft -= 1;
        }

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

        // Starvation note: Jones only penalizes -20 hours at turn start (handled in startTurnHelpers).
        // Week-end just depletes food — no additional health/happiness penalty here.
        // The turn-start -20 hours + potential doctor visit is already severe enough.

        // === Weather effects on players ===
        if (newWeather.type !== 'clear') {
          // Per-week happiness effect
          if (newWeather.happinessPerWeek !== 0) {
            p.happiness = Math.max(0, Math.min(100, p.happiness + newWeather.happinessPerWeek));
          }
          // Drought food spoilage: chance to lose 1 fresh food unit
          if (newWeather.foodSpoilageChance > 0 && p.freshFood > 0) {
            if (Math.random() < newWeather.foodSpoilageChance) {
              const lost = Math.min(p.freshFood, 1 + Math.floor(Math.random() * 2)); // lose 1-2 units
              p.freshFood -= lost;
              if (!p.isAI) {
                eventMessages.push(`${p.name}: The ${newWeather.name.toLowerCase()} spoiled ${lost} unit(s) of fresh food!`);
              }
            }
          }
        }

        // === Festival effects on players ===
        if (festival) {
          if (festival.happinessBonus !== 0) {
            p.happiness = Math.max(0, Math.min(100, p.happiness + festival.happinessBonus));
          }
          if (festival.goldEffect !== 0) {
            p.gold = Math.max(0, p.gold + festival.goldEffect);
          }
          if (festival.dependabilityBonus !== 0 && p.currentJob) {
            p.dependability = Math.min(p.maxDependability, p.dependability + festival.dependabilityBonus);
          }
          // Education bonus: add progress to all in-progress degrees
          if (festival.educationBonus > 0) {
            const newDegreeProgress = { ...p.degreeProgress };
            for (const degreeId of Object.keys(newDegreeProgress)) {
              const current = newDegreeProgress[degreeId as keyof typeof newDegreeProgress] || 0;
              if (current > 0) {
                newDegreeProgress[degreeId as keyof typeof newDegreeProgress] = current + festival.educationBonus;
              }
            }
            p.degreeProgress = newDegreeProgress;
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
          // Collect names of lost equipment for notification
          const lostGear: string[] = [];
          if (p.equippedWeapon) {
            const item = getItem(p.equippedWeapon);
            lostGear.push(item?.name || p.equippedWeapon);
          }
          if (p.equippedArmor) {
            const item = getItem(p.equippedArmor);
            lostGear.push(item?.name || p.equippedArmor);
          }
          if (p.equippedShield) {
            const item = getItem(p.equippedShield);
            lostGear.push(item?.name || p.equippedShield);
          }
          const lostApplianceCount = Object.keys(p.appliances).length;
          const lostDurableCount = Object.keys(p.durables).length;

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
            let evictionMsg = `${p.name} has been evicted! All possessions lost.`;
            if (lostGear.length > 0) {
              evictionMsg += ` Equipment destroyed: ${lostGear.join(', ')}.`;
            }
            if (lostApplianceCount > 0) {
              evictionMsg += ` ${lostApplianceCount} appliance(s) lost.`;
            }
            if (lostDurableCount > 0 && lostGear.length === 0) {
              evictionMsg += ` ${lostDurableCount} item(s) lost.`;
            }
            eventMessages.push(evictionMsg);
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

        // === Age System (opt-in via Options): age 1 year every AGE_INTERVAL weeks ===
        if (getGameOption('enableAging')) {
          const isBirthday = newWeek % AGE_INTERVAL === 0;
          if (isBirthday) {
            p.age = (p.age ?? 18) + 1;
            const newAge = p.age;

            // Apply elder health decay FIRST (age 60+), then milestone bonuses on top
            // This ensures milestones at 60+ don't silently suppress elder decay
            if (newAge >= ELDER_AGE) {
              p.maxHealth = Math.max(10, p.maxHealth - ELDER_HEALTH_DECAY);
              p.health = Math.min(p.health, p.maxHealth);
            }

            // Check for milestone birthday effects
            const milestone = AGE_MILESTONES[newAge];
            if (milestone) {
              if (milestone.happiness !== undefined && milestone.happiness !== 0) {
                p.happiness = Math.max(0, Math.min(100, p.happiness + milestone.happiness));
              }
              if (milestone.maxHealth !== undefined && milestone.maxHealth !== 0) {
                p.maxHealth = Math.max(10, p.maxHealth + milestone.maxHealth);
                p.health = Math.min(p.health, p.maxHealth);
              }
              if (milestone.dependability !== undefined && milestone.dependability !== 0) {
                p.dependability = Math.min(p.maxDependability, p.dependability + milestone.dependability);
              }
              if (!p.isAI) {
                eventMessages.push(`🎂 ${p.name} turns ${newAge}! ${milestone.message}`);
              }
            } else if (newAge >= ELDER_AGE) {
              // Elder without a milestone — just show the age message
              if (!p.isAI) {
                eventMessages.push(`🎂 ${p.name} turns ${newAge}. The years weigh heavier... (-${ELDER_HEALTH_DECAY} max health)`);
              }
            } else if (!p.isAI) {
              eventMessages.push(`🎂 Happy birthday! ${p.name} turns ${newAge}.`);
            }
          }

          // Age-related weekly health crisis (age 50+, 3% chance)
          if ((p.age ?? 18) >= HEALTH_CRISIS_AGE && Math.random() < HEALTH_CRISIS_CHANCE) {
            p.health = Math.max(0, p.health - HEALTH_CRISIS_DAMAGE);
            if (!p.isAI) {
              eventMessages.push(`${p.name} suffers an age-related health crisis! -${HEALTH_CRISIS_DAMAGE} health.`);
            }
          }
        }

        // C3: Rent tracking - consume prepaid weeks first
        if (p.rentPrepaidWeeks > 0) {
          p.rentPrepaidWeeks -= 1;
        } else {
          p.weeksSinceRent += 1;
        }

        return p;
      });

      // C5: Check for deaths after week-end processing
      // Only resurrect if player wasn't already resurrected during their turn (checkDeath)
      for (const p of updatedPlayers) {
        if (!p.isGameOver && p.health <= 0) {
          // Skip resurrection if already resurrected this week (prevents double resurrection exploit)
          if (p.wasResurrectedThisWeek) {
            p.isGameOver = true;
            eventMessages.push(`${p.name} could not be saved a second time and has perished!`);
          } else if (p.savings >= 100) {
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
      // Stock crashes only during recession trend, not every week
      const isStockCrash = economyTrend === -1 && Math.random() < 0.10; // 10% per recession week
      const newStockPrices = updateStockPrices(state.stockPrices, isStockCrash);
      if (isStockCrash) {
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
          priceModifier: finalPriceModifier,
          economyTrend,
          economyCycleWeeksLeft,
          weather: newWeather,
          activeFestival: activeFestivalId,
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
          priceModifier: finalPriceModifier,
          economyTrend,
          economyCycleWeeksLeft,
          weather: newWeather,
          activeFestival: activeFestivalId,
        });
        return;
      }

      // C9: Move first player to their home location
      const firstPlayer = updatedPlayers[firstAliveIndex];
      const firstPlayerHome: LocationId = getHomeLocation(firstPlayer.housing);

      set({
        week: newWeek,
        currentPlayerIndex: firstAliveIndex,
        priceModifier: finalPriceModifier,
        economyTrend,
        economyCycleWeeksLeft,
        weather: newWeather,
        activeFestival: activeFestivalId,
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
  };
}
