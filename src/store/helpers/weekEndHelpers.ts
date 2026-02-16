// Week-end processing helpers: rent, food depletion, theft, economy, stocks, loans, weekends
// Extracted from turnHelpers.ts — see that file for the orchestrator (createTurnActions)
//
// Structure:
//   1. Global system processors (economy, weather, festivals)
//   2. Per-player processors (employment, needs, housing, finances, health, leisure, aging)
//   3. Death check processing
//   4. Main orchestrator (createProcessWeekEnd)

import type { LocationId, Player, PlayerNewsEventData } from '@/types/game.types';
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
import { checkWeeklyTheft, checkMarketCrash, pickEventMessage } from '@/data/events';
import type { MarketCrashResult } from '@/data/events';
import { getGameOption } from '@/data/gameOptions';
import { getItem, CLOTHING_DEGRADATION_PER_WEEK, getClothingTier, CLOTHING_TIER_LABELS, CLOTHING_THRESHOLDS } from '@/data/items';
import { getJob } from '@/data/jobs';
import { updateStockPrices } from '@/data/stocks';
import { selectWeekendActivity } from '@/data/weekends';
import { advanceWeather, CLEAR_WEATHER, isWeatherFestivalConflict } from '@/data/weather';
import type { WeatherState } from '@/data/weather';
import { getActiveFestival } from '@/data/festivals';
import type { Festival, FestivalId } from '@/data/festivals';
import { updateAchievementStats } from '@/data/achievements';
import { processHexExpiration, hasCurseEffect } from './hexHelpers';
import { deleteSave } from '@/data/saveLoad';
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
  stockPrices: Record<string, number>;
}

// ============================================================
// 1. Global System Processors
// ============================================================

/** Advance the economic cycle: trend changes, price drift, crash check.
 *  BUG FIX: Uses basePriceModifier (without weather/festival) to prevent permanent compounding. */
function advanceEconomy(state: {
  basePriceModifier: number;
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
  // BUG FIX: Use basePriceModifier (raw economy) to prevent weather/festival compounding
  const basePrice = state.basePriceModifier ?? state.priceModifier; // fallback for old saves
  const drift = economyTrend * (0.02 + Math.random() * 0.04); // ±0.02-0.06
  const noise = (Math.random() - 0.5) * 0.03; // tiny random noise ±0.015
  const priceModifier = Math.max(0.75, Math.min(1.25, basePrice + drift + noise));

  // H8: Market crash only during recession and low economy
  const crashResult = (economyTrend === -1 && priceModifier < 0.9)
    ? checkMarketCrash(true)
    : { type: 'none' as const, severity: 'none' as const };

  // Apply crash price drop bonus (minor/moderate/major crashes push prices down further)
  const finalPriceModifier = crashResult.priceDropBonus
    ? Math.max(0.75, priceModifier + crashResult.priceDropBonus)
    : priceModifier;

  return { priceModifier: finalPriceModifier, economyTrend, economyCycleWeeksLeft, crashResult };
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

/** Process employment: dependability decay, job loss, market crash effects (Jones-style 3-tier) */
function processEmployment(p: Player, crashResult: MarketCrashResult, msgs: string[], newsEvents: PlayerNewsEventData[]): void {
  // B5: Dependability decay only if unemployed
  if (!p.currentJob) {
    p.dependability = Math.max(0, p.dependability - 5);
  }

  // Jones-style 3-tier market crash effects (process BEFORE low-dep firing so crash penalty applies)
  if (crashResult.severity === 'major' && p.currentJob) {
    // Major crash: fired (Jones-style layoff)
    const jobName = p.currentJob;
    p.currentJob = null;
    p.currentWage = 0;
    p.shiftsWorkedSinceHire = 0;
    p.happiness = Math.max(0, p.happiness - 20);
    if (!p.isAI) msgs.push(`${p.name}: ${crashResult.message}`);
    newsEvents.push({ type: 'fired', playerName: p.name, jobName });
  } else if (crashResult.severity === 'moderate' && p.currentJob && crashResult.wageMultiplier) {
    // Moderate crash: 80% wage (Jones-style pay cut)
    p.currentWage = Math.floor(p.currentWage * crashResult.wageMultiplier);
    p.happiness = Math.max(0, p.happiness - 10);
    if (!p.isAI) msgs.push(`${p.name}: ${crashResult.message}`);
    newsEvents.push({ type: 'paycut', playerName: p.name, percentage: 20 });
  } else if (crashResult.severity === 'minor') {
    // Minor crash: just prices drop (already applied in advanceEconomy), small happiness hit
    p.happiness = Math.max(0, p.happiness - 3);
    if (!p.isAI) msgs.push(crashResult.message || 'Minor market dip — prices have dropped.');
  }

  // Fire player with too-low dependability (after crash so crash penalties still apply)
  if (p.currentJob && p.dependability < 20) {
    p.currentJob = null;
    p.currentWage = 0;
    p.shiftsWorkedSinceHire = 0;
    if (!p.isAI) {
      msgs.push(`${p.name} was fired due to poor dependability!`);
    }
  }
}

/** Deplete food and degrade clothing */
function processNeeds(p: Player, _isClothingDegradation: boolean, msgs: string[]): void {
  // Check for Curse of Decay — doubles food/clothing degradation
  const decayCurse = hasCurseEffect(p, 'food-clothing-decay');
  const decayMultiplier = decayCurse ? decayCurse.magnitude : 1;

  // Food depletion — 35/week so players must buy food almost every round
  // (unless they have a Preservation Box with stored fresh food as backup)
  const foodDrain = Math.round(35 * decayMultiplier);
  p.foodLevel = Math.max(0, p.foodLevel - foodDrain);

  // Clear store-bought food flag when all food is consumed (Tavern food doesn't set this flag)
  if (p.foodLevel <= 0) {
    p.hasStoreBoughtFood = false;
  }

  // Starvation note: Jones only penalizes -20 hours at turn start (handled in startTurnHelpers).
  // Week-end just depletes food — no additional health/happiness penalty here.

  // Clothing degradation (weekly — Jones-style gradual wear)
  // -3 condition per week. Clothes degrade through tiers: business → dress → casual → none
  const prevTier = getClothingTier(p.clothingCondition);
  const clothingDrain = Math.round(CLOTHING_DEGRADATION_PER_WEEK * decayMultiplier);
  p.clothingCondition = Math.max(0, p.clothingCondition - clothingDrain);
  const newTier = getClothingTier(p.clothingCondition);

  if (!p.isAI) {
    if (p.clothingCondition <= 0) {
      msgs.push(`${p.name}'s clothing has been destroyed! Cannot work until you buy new clothes.`);
    } else if (newTier !== prevTier) {
      // Warn when dropping to a lower tier
      const tierLabel = CLOTHING_TIER_LABELS[newTier];
      msgs.push(`${p.name}'s clothing has worn down to ${tierLabel} quality. Better jobs may require an upgrade.`);
    } else if (p.clothingCondition > 0 && p.clothingCondition <= CLOTHING_THRESHOLDS.casual) {
      msgs.push(`${p.name}'s clothing is nearly worn out!`);
    }

    // Warn if clothing has dropped below current job's requirement
    if (p.currentJob && p.clothingCondition > 0) {
      const job = getJob(p.currentJob);
      if (job) {
        const jobThreshold = CLOTHING_THRESHOLDS[job.requiredClothing as keyof typeof CLOTHING_THRESHOLDS] ?? 0;
        if (p.clothingCondition < jobThreshold) {
          const requiredLabel = CLOTHING_TIER_LABELS[job.requiredClothing as keyof typeof CLOTHING_TIER_LABELS] ?? job.requiredClothing;
          msgs.push(`${p.name}'s clothing is too worn for ${job.name}! Requires ${requiredLabel} quality. You cannot work until you upgrade your clothes.`);
        }
      }
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
function processHousing(p: Player, msgs: string[], newsEvents: PlayerNewsEventData[]): void {
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
    newsEvents.push({ type: 'eviction', playerName: p.name });
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
      msgs.push(pickEventMessage(theftEvent));
    }
  }
}

/** Random sickness check (5% chance) + ongoing sickness health drain */
function processSickness(p: Player, msgs: string[]): void {
  // Ongoing sickness: gradual health drain each week if player doesn't cure it
  // Gets progressively worse: -5 HP per week while sick
  if (p.isSick) {
    const SICKNESS_WEEKLY_DRAIN = 5;
    p.health = Math.max(0, p.health - SICKNESS_WEEKLY_DRAIN);
    p.happiness = Math.max(0, p.happiness - 2);
    if (!p.isAI) {
      msgs.push(`${p.name}'s sickness worsens! -${SICKNESS_WEEKLY_DRAIN} health, -2 happiness. Visit a healer soon!`);
    }
    return; // Already sick — skip new sickness roll
  }

  // New sickness: 5% weekly chance
  if (Math.random() < 0.05) {
    p.isSick = true;
    p.health = Math.max(0, p.health - 15);
    if (!p.isAI) {
      msgs.push(`${p.name} has fallen ill! Visit a healer to recover.`);
    }
  }
}

/** Seize gold from a currency source (savings, gold, investments). Returns amount recovered. */
function seizeCurrency(
  p: Player,
  field: 'savings' | 'gold' | 'investments',
  remaining: number,
  label: string,
  details: string[],
): number {
  const available = p[field];
  if (remaining <= 0 || available <= 0) return 0;
  const seized = Math.min(available, remaining);
  p[field] -= seized;
  details.push(`${seized}g from ${label}`);
  return seized;
}

/** Forced-sell stocks at 80% of current market value. Returns total gold recovered.
 *  BUG FIX: Only sell enough shares to cover remaining debt, not all shares. */
function seizeStocks(p: Player, remaining: number, details: string[], stockPrices: Record<string, number>): number {
  if (remaining <= 0 || Object.keys(p.stocks).length === 0) return 0;
  let recovered = 0;
  // Deep copy stocks to avoid mutating Zustand state via shared reference
  p.stocks = { ...p.stocks };
  for (const stockId of Object.keys(p.stocks)) {
    if (remaining - recovered <= 0) break;
    const shares = p.stocks[stockId];
    if (shares > 0) {
      const price = stockPrices[stockId] || 50; // fallback to 50 if price unknown
      const pricePerShare = Math.floor(price * 0.8);
      const neededValue = remaining - recovered;
      const sharesToSell = pricePerShare > 0 ? Math.min(shares, Math.ceil(neededValue / pricePerShare)) : shares;
      const value = Math.min(Math.floor(sharesToSell * price * 0.8), neededValue);
      if (sharesToSell >= shares) {
        delete p.stocks[stockId];
      } else {
        p.stocks[stockId] = shares - sharesToSell;
      }
      recovered += value;
      details.push(`stocks (${sharesToSell} shares of ${stockId})`);
    }
  }
  return recovered;
}

/** Liquidate appliances at 30% of original price. Returns total gold recovered.
 *  BUG FIX: Deep copy appliances to avoid mutating Zustand state via shared reference. */
function seizeAppliances(p: Player, remaining: number, details: string[]): number {
  if (remaining <= 0 || Object.keys(p.appliances).length === 0) return 0;
  // Deep copy to avoid mutating Zustand state
  p.appliances = { ...p.appliances };
  let recovered = 0;
  let count = 0;
  for (const appId of Object.keys(p.appliances)) {
    if (remaining - recovered <= 0) break;
    const value = Math.min(Math.floor(p.appliances[appId].originalPrice * 0.3), remaining - recovered);
    recovered += value;
    delete p.appliances[appId];
    count++;
  }
  if (count > 0) details.push(`${count} appliance(s) seized`);
  return recovered;
}

/** Liquidate durable items at 30% of base price, unequipping as needed. Returns total gold recovered.
 *  BUG FIX: Deep copy durables to avoid mutating Zustand state via shared reference. */
function seizeDurables(p: Player, remaining: number, details: string[]): number {
  if (remaining <= 0 || Object.keys(p.durables).length === 0) return 0;
  // Deep copy to avoid mutating Zustand state
  p.durables = { ...p.durables };
  let recovered = 0;
  let count = 0;
  for (const durId of Object.keys(p.durables)) {
    if (remaining - recovered <= 0) break;
    const item = getItem(durId);
    if (item) {
      const value = Math.min(Math.floor(item.basePrice * 0.3), remaining - recovered);
      recovered += value;
      if (p.equippedWeapon === durId) p.equippedWeapon = null;
      if (p.equippedArmor === durId) p.equippedArmor = null;
      if (p.equippedShield === durId) p.equippedShield = null;
    }
    delete p.durables[durId];
    count++;
  }
  if (count > 0) details.push(`${count} item(s) repossessed`);
  return recovered;
}

/** Process loan interest and forced repayment on default (Jones-style) */
function processLoans(p: Player, msgs: string[], newsEvents: PlayerNewsEventData[], stockPrices: Record<string, number>): void {
  if (p.loanAmount <= 0) return;

  // 10% weekly interest, capped at 2x max borrow (2000g)
  const interest = Math.ceil(p.loanAmount * 0.10);
  p.loanAmount = Math.min(p.loanAmount + interest, 2000);
  p.loanWeeksRemaining = Math.max(0, p.loanWeeksRemaining - 1);

  if (p.loanWeeksRemaining > 0 || p.loanAmount <= 0) return;

  // Loan default: seize assets in priority order (Jones-style cascade)
  const details: string[] = [];
  let remaining = p.loanAmount;
  remaining -= seizeCurrency(p, 'savings', remaining, 'savings', details);
  remaining -= seizeCurrency(p, 'gold', remaining, 'purse', details);
  remaining -= seizeCurrency(p, 'investments', remaining, 'investments', details);
  remaining -= seizeStocks(p, remaining, details, stockPrices);
  remaining -= seizeAppliances(p, remaining, details);
  remaining -= seizeDurables(p, remaining, details);
  remaining = Math.max(0, remaining);

  const seized = details.length > 0 ? ` Bank seized: ${details.join(', ')}.` : '';
  if (remaining > 0) {
    p.happiness = Math.max(0, p.happiness - 10);
    p.loanAmount = remaining;
    p.loanWeeksRemaining = 0;
    if (!p.isAI) {
      msgs.push(`${p.name} defaulted on loan!${seized} Still owe ${remaining}g. 25% of wages garnished until repaid. -10 Happiness.`);
    }
    newsEvents.push({ type: 'loan-default', playerName: p.name, amountOwed: remaining });
  } else {
    p.loanAmount = 0;
    p.loanWeeksRemaining = 0;
    if (!p.isAI) {
      msgs.push(`${p.name}'s loan was forcefully repaid!${seized}`);
    }
    newsEvents.push({ type: 'loan-repaid', playerName: p.name });
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
      msgs.push(`[${activity.id}] Weekend: ${activity.description} (+${activity.happiness} Happiness${activity.cost > 0 ? `, -${activity.cost}g` : ''})`);
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

function processPlayerWeekEnd(p: Player, ctx: WeekEndContext, msgs: string[], newsEvents: PlayerNewsEventData[]): void {
  resetWeeklyFlags(p);
  processEmployment(p, ctx.economy.crashResult, msgs, newsEvents);
  processNeeds(p, ctx.isClothingDegradation, msgs);
  processWeatherOnPlayer(p, ctx.weather, msgs);
  processFestivalOnPlayer(p, ctx.festival);
  processHousing(p, msgs, newsEvents);
  processFinances(p, msgs);
  processSickness(p, msgs);
  processLoans(p, msgs, newsEvents, ctx.stockPrices);
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
        isClothingDegradation: true, // Now weekly (was newWeek % 8 === 0)
        economy,
        weather,
        festival,
        stockPrices: state.stockPrices,
      };

      // --- Step 2: Process all players ---
      const newsEvents: PlayerNewsEventData[] = [];
      // Add crash severity as a news event if any crash happened
      if (economy.crashResult.severity !== 'none') {
        newsEvents.push({ type: `crash-${economy.crashResult.severity}` });
      }
      const updatedPlayers = state.players.map((player) => {
        const p = { ...player };
        if (p.isGameOver) return p;
        processPlayerWeekEnd(p, ctx, eventMessages, newsEvents);
        return p;
      });

      // --- Step 2b: Process hex/curse expiration ---
      const hexResult = processHexExpiration(updatedPlayers, state.locationHexes);
      const hexPlayers = hexResult.players;
      const hexLocationHexes = hexResult.locationHexes;
      eventMessages.push(...hexResult.messages);

      // --- Step 3: Death checks ---
      processDeathChecks(hexPlayers, eventMessages);

      // --- Step 4: Update stock prices ---
      const isStockCrash = economy.economyTrend === -1 && Math.random() < 0.10;
      const newStockPrices = updateStockPrices(state.stockPrices, isStockCrash);
      if (isStockCrash) {
        eventMessages.push('MARKET CRASH! Stock prices have plummeted!');
      }

      // --- Step 5: Check game-over conditions and set up new week ---
      const firstAliveIndex = hexPlayers.findIndex(p => !p.isGameOver);
      const isRentDue = newWeek % 4 === 0;

      // Shared state fields updated every week-end
      const weekEndState = {
        week: newWeek,
        stockPrices: newStockPrices,
        priceModifier: finalPriceModifier,
        basePriceModifier: economy.priceModifier, // Store raw economy modifier (before weather/festival)
        economyTrend: economy.economyTrend,
        economyCycleWeeksLeft: economy.economyCycleWeeksLeft,
        weather,
        activeFestival: activeFestivalId,
        weeklyNewsEvents: newsEvents,
        locationHexes: hexLocationHexes,
      };

      // All players dead
      if (firstAliveIndex === -1) {
        try { deleteSave(0); } catch { /* ignore */ }
        set({ ...weekEndState, phase: 'victory', eventMessage: 'All players have perished. Game Over!' });
        return;
      }

      // Last player standing wins
      const alivePlayers = hexPlayers.filter(p => !p.isGameOver);
      if (alivePlayers.length === 1 && updatedPlayers.length > 1) {
        try { deleteSave(0); } catch { /* ignore */ }
        set({
          ...weekEndState,
          winner: alivePlayers[0].id,
          phase: 'victory',
          eventMessage: `${alivePlayers[0].name} is the last one standing and wins the game!`,
        });
        return;
      }

      // Normal week transition
      const firstPlayer = hexPlayers[firstAliveIndex];
      const firstPlayerHome: LocationId = getHomeLocation(firstPlayer.housing);

      set({
        ...weekEndState,
        currentPlayerIndex: firstAliveIndex,
        players: hexPlayers.map((p, index) =>
          index === firstAliveIndex
            ? { ...p, timeRemaining: HOURS_PER_TURN, currentLocation: firstPlayerHome, dungeonAttemptsThisTurn: 0 }
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
  };
}
