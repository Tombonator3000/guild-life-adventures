// Week-end processing helpers: rent, food depletion, theft, economy, stocks, loans, weekends
// Extracted from turnHelpers.ts — see that file for the orchestrator (createTurnActions)
//
// Structure:
//   1. Global system processors (economy, weather, festivals)
//   2. Per-player processors (employment, needs, housing, finances, health, leisure, aging)
//   3. Death check processing
//   4. Main orchestrator (createProcessWeekEnd)

import type { LocationId, Player } from '@/types/game.types';
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
import type { MarketCrashResult } from '@/data/events';
import { getGameOption } from '@/data/gameOptions';
import { getItem } from '@/data/items';
import { updateStockPrices } from '@/data/stocks';
import { selectWeekendActivity } from '@/data/weekends';
import { advanceWeather, CLEAR_WEATHER, isWeatherFestivalConflict } from '@/data/weather';
import type { WeatherState } from '@/data/weather';
import { getActiveFestival } from '@/data/festivals';
import type { Festival, FestivalId } from '@/data/festivals';
import { updateAchievementStats } from '@/data/achievements';
import type { SetFn, GetFn } from '../storeTypes';
import { getHomeLocation } from './turnHelpers';

// ============================================================
// Types
// ============================================================

interface EconomyUpdate {
  priceModifier: number;
  economyTrend: number;
  economyCycleWeeksLeft: number;
  crashResult: MarketCrashResult;
}

/** Shared context passed to all per-player processors */
interface WeekEndContext {
  newWeek: number;
  isClothingDegradation: boolean;
  economy: EconomyUpdate;
  weather: WeatherState;
  festival: Festival | null;
}

// ============================================================
// 1. Global System Processors
// ============================================================

/** Advance the economic cycle: trend changes, price drift, crash check */
function advanceEconomy(state: {
  priceModifier: number;
  economyTrend: number;
  economyCycleWeeksLeft: number;
}): EconomyUpdate {
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
  const priceModifier = Math.max(0.75, Math.min(1.25, state.priceModifier + drift + noise));

  // H8: Market crash only during recession and low economy
  const crashResult = (economyTrend === -1 && priceModifier < 0.9)
    ? checkMarketCrash(true)
    : { type: 'none' as const };

  return { priceModifier, economyTrend, economyCycleWeeksLeft, crashResult };
}

/** Advance weather system and generate announcement messages */
function advanceWeatherSystem(prevWeather: WeatherState | undefined): {
  weather: WeatherState;
  messages: string[];
} {
  const messages: string[] = [];

  if (!getGameOption('enableWeatherEvents')) {
    return { weather: { ...CLEAR_WEATHER }, messages };
  }

  const prev = prevWeather || { ...CLEAR_WEATHER };
  const weather = advanceWeather(prev);

  // Announce weather changes
  if (weather.type !== prev.type) {
    if (weather.type !== 'clear') {
      messages.push(`Weather: ${weather.name}! ${weather.description}`);
    } else if (prev.type !== 'clear') {
      messages.push('The weather has cleared. Fair skies return to Guildholm.');
    }
  }

  return { weather, messages };
}

/** Check if a seasonal festival is active this week */
function checkFestival(newWeek: number): {
  festival: Festival | null;
  activeFestivalId: FestivalId | null;
  messages: string[];
} {
  const messages: string[] = [];
  const festival = getGameOption('enableFestivals') ? getActiveFestival(newWeek) : null;
  let activeFestivalId: FestivalId | null = null;

  if (festival) {
    activeFestivalId = festival.id;
    messages.push(festival.eventMessage);
    updateAchievementStats({ festivalsAttended: 1 });
  }

  return { festival, activeFestivalId, messages };
}

/** Compute final price modifier from economy + weather + festival multipliers */
function calculateFinalPrice(
  basePriceMod: number,
  weather: WeatherState,
  festival: Festival | null,
): number {
  const weatherAdjusted = basePriceMod * weather.priceMultiplier;
  const festivalMult = festival ? festival.priceMultiplier : 1.0;
  return Math.max(0.70, Math.min(1.35, weatherAdjusted * festivalMult));
}

// ============================================================
// 2. Per-Player Processors
// ============================================================
// Each function modifies the player object in-place and may push event messages.

/** Reset weekly flags: newspaper, dungeon fatigue, resurrection, bounties, quest cooldown */
function resetWeeklyFlags(p: Player): void {
  p.hasNewspaper = false;
  p.dungeonAttemptsThisTurn = 0;
  p.wasResurrectedThisWeek = false;
  p.completedBountiesThisWeek = [];
  if (p.questCooldownWeeksLeft > 0) {
    p.questCooldownWeeksLeft -= 1;
  }
}

/** Process employment: dependability decay, job loss, market crash effects */
function processEmployment(p: Player, crashResult: MarketCrashResult, msgs: string[]): void {
  // B5: Dependability decay only if unemployed
  if (!p.currentJob) {
    p.dependability = Math.max(0, p.dependability - 5);
  }

  // Fire player with too-low dependability
  if (p.currentJob && p.dependability < 20) {
    p.currentJob = null;
    p.currentWage = 0;
    p.shiftsWorkedSinceHire = 0;
    if (!p.isAI) {
      msgs.push(`${p.name} was fired due to poor dependability!`);
    }
  }

  // H8: Apply global market crash effects
  if (p.currentJob) {
    if (crashResult.type === 'layoff') {
      p.currentJob = null;
      p.currentWage = 0;
      p.shiftsWorkedSinceHire = 0;
      p.happiness = Math.max(0, p.happiness - 20);
      if (!p.isAI) msgs.push(`${p.name}: ${crashResult.message}`);
    } else if (crashResult.type === 'paycut' && crashResult.wageMultiplier) {
      p.currentWage = Math.floor(p.currentWage * crashResult.wageMultiplier);
      p.happiness = Math.max(0, p.happiness - 10);
      if (!p.isAI) msgs.push(`${p.name}: ${crashResult.message}`);
    }
  }
}

/** Deplete food and degrade clothing */
function processNeeds(p: Player, isClothingDegradation: boolean, msgs: string[]): void {
  // Food depletion
  p.foodLevel = Math.max(0, p.foodLevel - 25);

  // Starvation note: Jones only penalizes -20 hours at turn start (handled in startTurnHelpers).
  // Week-end just depletes food — no additional health/happiness penalty here.

  // Clothing degradation (every 8 weeks)
  if (isClothingDegradation) {
    p.clothingCondition = Math.max(0, p.clothingCondition - 25);
    if (!p.isAI && p.clothingCondition <= 25) {
      msgs.push(`${p.name}'s clothing is in poor condition!`);
    }
  }
}

/** Apply weather effects: happiness changes, food spoilage */
function processWeatherOnPlayer(p: Player, weather: WeatherState, msgs: string[]): void {
  if (weather.type === 'clear') return;

  // Per-week happiness effect
  if (weather.happinessPerWeek !== 0) {
    p.happiness = Math.max(0, Math.min(100, p.happiness + weather.happinessPerWeek));
  }

  // Drought food spoilage: chance to lose 1-2 fresh food units
  if (weather.foodSpoilageChance > 0 && p.freshFood > 0) {
    if (Math.random() < weather.foodSpoilageChance) {
      const lost = Math.min(p.freshFood, 1 + Math.floor(Math.random() * 2));
      p.freshFood -= lost;
      if (!p.isAI) {
        msgs.push(`${p.name}: The ${weather.name.toLowerCase()} spoiled ${lost} unit(s) of fresh food!`);
      }
    }
  }
}

/** Apply festival bonuses: happiness, gold, dependability, education progress */
function processFestivalOnPlayer(p: Player, festival: Festival | null): void {
  if (!festival) return;

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

/** Process rent debt accumulation and eviction */
function processHousing(p: Player, msgs: string[]): void {
  if (p.housing === 'homeless') return;

  // C4: Rent debt accumulation (4+ weeks overdue)
  if (p.weeksSinceRent >= 4) {
    const rentCost = p.lockedRent > 0 ? p.lockedRent : RENT_COSTS[p.housing];
    p.rentDebt += Math.floor(rentCost * 0.25);
  }

  // Eviction check — after 8 weeks without paying rent
  if (p.weeksSinceRent >= 8) {
    // Collect names of lost equipment for notification
    const lostGear: string[] = [];
    for (const slot of [p.equippedWeapon, p.equippedArmor, p.equippedShield]) {
      if (slot) {
        const item = getItem(slot);
        lostGear.push(item?.name || slot);
      }
    }
    const lostApplianceCount = Object.keys(p.appliances).length;
    const lostDurableCount = Object.keys(p.durables).length;

    p.housing = 'homeless';
    p.weeksSinceRent = 0;
    p.rentDebt = 0;
    // M9 FIX: Clear prepaid weeks and locked rent on eviction
    p.rentPrepaidWeeks = 0;
    p.lockedRent = 0;
    p.inventory = [];
    // H1: Clear appliances and equipment on eviction
    p.durables = {};
    p.appliances = {};
    p.freshFood = 0;
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
      msgs.push(evictionMsg);
    }
  } else if (p.weeksSinceRent >= 4 && !p.isAI) {
    msgs.push(`${p.name}: Rent is overdue! Wages will be garnished 50%.`);
  }
}

/** Process investments, savings interest, and Shadowfingers theft */
function processFinances(p: Player, msgs: string[]): void {
  // Investment returns (0.5% weekly)
  if (p.investments > 0) {
    const returns = Math.floor(p.investments * 0.005);
    p.investments += returns;
  }

  // Savings interest (0.1% weekly)
  if (p.savings > 0) {
    const interest = Math.floor(p.savings * 0.001);
    p.savings += interest;
  }

  // Shadowfingers theft
  const theftEvent = checkWeeklyTheft(p.housing, p.gold);
  if (theftEvent && theftEvent.effect.gold) {
    p.gold = Math.max(0, p.gold + theftEvent.effect.gold);
    if (theftEvent.effect.happiness) {
      p.happiness = Math.max(0, p.happiness + theftEvent.effect.happiness);
    }
    if (!p.isAI) {
      msgs.push(`Shadowfingers struck! ${p.name} lost ${Math.abs(theftEvent.effect.gold)} gold!`);
    }
  }
}

/** Random sickness check (5% chance) */
function processSickness(p: Player, msgs: string[]): void {
  if (Math.random() < 0.05 && !p.isSick) {
    p.isSick = true;
    p.health = Math.max(0, p.health - 15);
    if (!p.isAI) {
      msgs.push(`${p.name} has fallen ill! Visit a healer to recover.`);
    }
  }
}

/** Process loan interest and forced repayment on default */
function processLoans(p: Player, msgs: string[]): void {
  if (p.loanAmount <= 0) return;

  // 10% weekly interest, capped at 2x max borrow (2000g)
  const interest = Math.ceil(p.loanAmount * 0.10);
  p.loanAmount = Math.min(p.loanAmount + interest, 2000);
  p.loanWeeksRemaining = Math.max(0, p.loanWeeksRemaining - 1);

  // Loan default: forced repayment from savings/gold/investments (H3 FIX)
  if (p.loanWeeksRemaining <= 0 && p.loanAmount > 0) {
    const fromSavings = Math.min(p.savings, p.loanAmount);
    p.savings -= fromSavings;
    let remaining = p.loanAmount - fromSavings;
    const fromGold = Math.min(p.gold, remaining);
    p.gold -= fromGold;
    remaining -= fromGold;
    // H3 FIX: Also liquidate investments to cover loan default
    if (remaining > 0 && p.investments > 0) {
      const fromInvestments = Math.min(p.investments, remaining);
      p.investments -= fromInvestments;
      remaining -= fromInvestments;
    }

    if (remaining > 0) {
      // Can't fully repay: happiness penalty, extension
      p.happiness = Math.max(0, p.happiness - 10);
      p.loanWeeksRemaining = 4;
      if (!p.isAI) {
        msgs.push(`${p.name} defaulted on loan! -10 happiness. ${remaining}g still owed.`);
      }
    } else {
      p.loanAmount = 0;
      if (!p.isAI) {
        msgs.push(`${p.name}'s loan was forcefully repaid from savings!`);
      }
    }
  }
}

/** Process weekend activities, lottery drawing, and relaxation decay */
function processLeisure(p: Player, newWeek: number, msgs: string[]): void {
  // Weekend activities (Jones-style)
  const weekendResult = selectWeekendActivity(p.tickets, p.appliances, newWeek, p.gold);
  if (weekendResult) {
    const { activity, ticketUsed } = weekendResult;
    p.gold = Math.max(0, p.gold - activity.cost);
    p.happiness = Math.min(100, p.happiness + activity.happiness);
    if (ticketUsed) {
      p.tickets = p.tickets.filter(t => t !== ticketUsed);
    }
    if (!p.isAI) {
      msgs.push(`Weekend: ${activity.description} (+${activity.happiness} Happiness${activity.cost > 0 ? `, -${activity.cost}g` : ''})`);
    }
  }

  // Lottery drawing (Fortune's Wheel)
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
        msgs.push(`Fortune's Wheel: ${p.name} won ${lotteryWinnings}g!`);
      }
    } else if (!p.isAI) {
      msgs.push(`Fortune's Wheel: No luck this week.`);
    }
    p.lotteryTickets = 0; // Reset tickets after drawing
  }

  // Relaxation decay (-1 per week, Jones-style)
  p.relaxation = Math.max(10, p.relaxation - 1);
}

/** Process aging system: birthdays, milestones, elder decay, health crises */
function processAging(p: Player, newWeek: number, msgs: string[]): void {
  if (!getGameOption('enableAging')) return;

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
        msgs.push(`🎂 ${p.name} turns ${newAge}! ${milestone.message}`);
      }
    } else if (newAge >= ELDER_AGE) {
      if (!p.isAI) {
        msgs.push(`🎂 ${p.name} turns ${newAge}. The years weigh heavier... (-${ELDER_HEALTH_DECAY} max health)`);
      }
    } else if (!p.isAI) {
      msgs.push(`🎂 Happy birthday! ${p.name} turns ${newAge}.`);
    }
  }

  // Age-related weekly health crisis (age 50+, 3% chance)
  if ((p.age ?? 18) >= HEALTH_CRISIS_AGE && Math.random() < HEALTH_CRISIS_CHANCE) {
    p.health = Math.max(0, p.health - HEALTH_CRISIS_DAMAGE);
    if (!p.isAI) {
      msgs.push(`${p.name} suffers an age-related health crisis! -${HEALTH_CRISIS_DAMAGE} health.`);
    }
  }
}

/** Update rent tracking: consume prepaid weeks or increment overdue counter */
function updateRentTracking(p: Player): void {
  if (p.rentPrepaidWeeks > 0) {
    p.rentPrepaidWeeks -= 1;
  } else {
    p.weeksSinceRent += 1;
  }
}

// ============================================================
// Per-player pipeline: calls all processors in order
// ============================================================

function processPlayerWeekEnd(p: Player, ctx: WeekEndContext, msgs: string[]): void {
  resetWeeklyFlags(p);
  processEmployment(p, ctx.economy.crashResult, msgs);
  processNeeds(p, ctx.isClothingDegradation, msgs);
  processWeatherOnPlayer(p, ctx.weather, msgs);
  processFestivalOnPlayer(p, ctx.festival);
  processHousing(p, msgs);
  processFinances(p, msgs);
  processSickness(p, msgs);
  processLoans(p, msgs);
  processLeisure(p, ctx.newWeek, msgs);
  processAging(p, ctx.newWeek, msgs);
  updateRentTracking(p);
}

// ============================================================
// 3. Death Check Processing
// ============================================================

// H4 FIX: Unified death logic matching checkDeath in questHelpers.ts
// Uses scaled resurrection cost, happiness penalty, and permadeath support
function processDeathChecks(players: Player[], msgs: string[]): void {
  const enablePermadeath = getGameOption('enablePermadeath');

  for (const p of players) {
    if (p.isGameOver || p.health > 0) continue;

    // Skip resurrection if already resurrected this week (prevents double resurrection exploit)
    if (p.wasResurrectedThisWeek) {
      if (enablePermadeath) {
        p.isGameOver = true;
        msgs.push(`${p.name} could not be saved a second time and has perished!`);
      } else {
        // Non-permadeath: respawn with minimal HP
        p.health = 20;
        p.happiness = Math.max(0, p.happiness - 8);
        msgs.push(`${p.name} barely survived! -8 happiness.`);
      }
      continue;
    }

    // Scaled resurrection cost (same formula as checkDeath)
    const totalWealth = p.gold + p.savings;
    const scaledCost = Math.min(2000, Math.max(100, 100 + Math.floor((Math.max(0, totalWealth - 500)) * 0.10)));
    const resurrectionHappinessPenalty = 8;

    if (p.savings >= scaledCost) {
      p.health = 50;
      p.savings -= scaledCost;
      p.happiness = Math.max(0, p.happiness - resurrectionHappinessPenalty);
      p.wasResurrectedThisWeek = true;
      msgs.push(`${p.name} was revived by healers! ${scaledCost}g from savings, -${resurrectionHappinessPenalty} happiness.`);
    } else if (!enablePermadeath) {
      // Non-permadeath: respawn with minimal HP
      p.health = 20;
      p.happiness = Math.max(0, p.happiness - 8);
      msgs.push(`${p.name} barely survived the week! -8 happiness.`);
    } else {
      p.isGameOver = true;
      msgs.push(`${p.name} has perished!`);
    }
  }
}

// ============================================================
// 4. Main Orchestrator
// ============================================================

export function createProcessWeekEnd(set: SetFn, get: GetFn) {
  return () => {
      const state = get();
      const newWeek = state.week + 1;
      // C6: Track weeks played for achievements
      updateAchievementStats({ totalWeeksPlayed: 1 });
      const eventMessages: string[] = [];

      // --- Step 1: Advance global systems ---
      const economy = advanceEconomy(state);
      // Check festival first (deterministic schedule) so we can resolve weather conflicts
      const { festival, activeFestivalId, messages: festivalMsgs } = checkFestival(newWeek);
      const { weather: rawWeather, messages: weatherMsgs } = advanceWeatherSystem(state.weather);

      // Resolve weather-festival conflicts: festival takes priority over contradictory weather
      // e.g., Drought ("food prices soar") can't co-occur with Harvest Festival ("prices reduced 15%")
      let weather = rawWeather;
      let finalWeatherMsgs = weatherMsgs;
      if (festival && rawWeather.type !== 'clear' && isWeatherFestivalConflict(rawWeather.type, festival.id)) {
        weather = { ...CLEAR_WEATHER };
        // If weather was previously active and just got cleared by festival, announce it
        const prevType = state.weather?.type ?? 'clear';
        if (prevType !== 'clear') {
          finalWeatherMsgs = [`The ${festival.name} celebrations dispel the ${rawWeather.name.toLowerCase()}. Fair skies return!`];
        } else {
          // New weather was rolled but immediately suppressed — no announcement needed
          finalWeatherMsgs = [];
        }
      }

      const finalPriceModifier = calculateFinalPrice(economy.priceModifier, weather, festival);
      eventMessages.push(...finalWeatherMsgs, ...festivalMsgs);

      const ctx: WeekEndContext = {
        newWeek,
        isClothingDegradation: newWeek % 8 === 0,
        economy,
        weather,
        festival,
      };

      // --- Step 2: Process all players ---
      const updatedPlayers = state.players.map((player) => {
        const p = { ...player };
        if (p.isGameOver) return p;
        processPlayerWeekEnd(p, ctx, eventMessages);
        return p;
      });

      // --- Step 3: Death checks ---
      processDeathChecks(updatedPlayers, eventMessages);

      // --- Step 4: Update stock prices ---
      const isStockCrash = economy.economyTrend === -1 && Math.random() < 0.10;
      const newStockPrices = updateStockPrices(state.stockPrices, isStockCrash);
      if (isStockCrash) {
        eventMessages.push('MARKET CRASH! Stock prices have plummeted!');
      }

      // --- Step 5: Check game-over conditions ---
      const firstAliveIndex = updatedPlayers.findIndex(p => !p.isGameOver);
      const isRentDue = newWeek % 4 === 0;

      if (firstAliveIndex === -1) {
        set({
          week: newWeek,
          phase: 'victory',
          eventMessage: 'All players have perished. Game Over!',
          stockPrices: newStockPrices,
          priceModifier: finalPriceModifier,
          economyTrend: economy.economyTrend,
          economyCycleWeeksLeft: economy.economyCycleWeeksLeft,
          weather,
          activeFestival: activeFestivalId,
        });
        return;
      }

      const alivePlayers = updatedPlayers.filter(p => !p.isGameOver);
      if (alivePlayers.length === 1 && updatedPlayers.length > 1) {
        set({
          week: newWeek,
          winner: alivePlayers[0].id,
          phase: 'victory',
          eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
          stockPrices: newStockPrices,
          priceModifier: finalPriceModifier,
          economyTrend: economy.economyTrend,
          economyCycleWeeksLeft: economy.economyCycleWeeksLeft,
          weather,
          activeFestival: activeFestivalId,
        });
        return;
      }

      // --- Step 6: Set up the new week ---
      const firstPlayer = updatedPlayers[firstAliveIndex];
      const firstPlayerHome: LocationId = getHomeLocation(firstPlayer.housing);

      set({
        week: newWeek,
        currentPlayerIndex: firstAliveIndex,
        priceModifier: finalPriceModifier,
        economyTrend: economy.economyTrend,
        economyCycleWeeksLeft: economy.economyCycleWeeksLeft,
        weather,
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
