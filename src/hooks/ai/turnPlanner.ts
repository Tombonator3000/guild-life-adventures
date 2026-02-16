/**
 * Grimwald AI - Turn Planner (Hard AI Only)
 *
 * Plans an optimal sequence of location visits and actions for a full turn.
 * Instead of re-evaluating from scratch after every action, hard AI plans
 * a route through the board that minimizes wasted movement and maximizes
 * the value extracted from each hour.
 *
 * Key concepts:
 * - "Visit plan": ordered list of locations to visit with actions at each
 * - "Action value": gold-per-hour equivalent measuring the real value of each action
 * - "Location batching": do ALL viable actions at a location before moving
 * - "Trip cost": travel time to reach a location
 */

import type { Player, LocationId } from '@/types/game.types';
import { calculatePathDistance } from '@/data/locations';
import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import type { AIAction, DifficultySettings, GoalProgress, AIPersonality } from './types';
import { getJobLocation, getNextDegree, getBestAvailableJob } from './strategy';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PlannedVisit {
  location: LocationId;
  actions: string[];          // Description of actions to perform here
  estimatedHours: number;     // Time for actions (excluding travel)
  estimatedValue: number;     // Combined value of all actions
  travelCost: number;         // Hours to reach from previous location
}

export interface TurnPlan {
  visits: PlannedVisit[];
  totalHours: number;         // Total planned time including travel
  expectedValue: number;      // Total expected value
  idleHours: number;          // Unplanned hours remaining
}

// ─── Value Calculation ──────────────────────────────────────────────────

/**
 * Calculate the "value per hour" of working at the current job.
 * This is the baseline against which other actions are compared.
 */
export function getWorkValuePerHour(player: Player): number {
  if (!player.currentJob) return 0;
  const job = getJob(player.currentJob);
  if (!job) return 0;
  return player.currentWage / job.hoursPerShift;
}

/**
 * Calculate a gold-equivalent value for studying.
 * Education value = (future_wage_unlock - current_wage) * estimated_work_hours_remaining
 * This captures the long-term ROI of education investment.
 */
export function getEducationValue(
  player: Player,
  settings: DifficultySettings,
  progress: GoalProgress,
  goals: { education: number },
): number {
  const nextDegree = getNextDegree(player, settings);
  if (!nextDegree) return 0;

  // Education goal contribution: each degree = 9 points
  const educationGap = Math.max(0, goals.education - progress.education.current);
  const degreesNeeded = Math.ceil(educationGap / 9);
  if (degreesNeeded <= 0) return 0;

  // Goal value: how much completing this degree contributes to winning
  const goalContribution = 9 / Math.max(1, goals.education); // fraction of education goal

  // Future wage: degrees unlock better jobs
  const currentWage = player.currentWage || 4;
  const estimatedFutureWage = currentWage * 1.5; // Conservative estimate

  // Long-term value: wage improvement over remaining game
  const sessionsRemaining = nextDegree.sessionsRequired - (player.degreeProgress[nextDegree.id] || 0);
  const totalStudyTime = sessionsRemaining * nextDegree.hoursPerSession;
  const totalStudyCost = sessionsRemaining * nextDegree.costPerSession;

  // ROI: (future_wage_gain * estimated_turns_left * hours_working_per_turn) / total_investment
  const estimatedTurnsLeft = 20; // Rough estimate
  const hoursWorkingPerTurn = 30; // Rough estimate
  const futureGainPerHour = estimatedFutureWage - currentWage;
  const totalFutureGain = futureGainPerHour * estimatedTurnsLeft * hoursWorkingPerTurn;

  // Value = future gain + goal contribution, normalized by investment
  const rawValue = (totalFutureGain + goalContribution * 1000) / Math.max(1, totalStudyTime + totalStudyCost / currentWage);

  return Math.min(rawValue, 50); // Cap at 50 to prevent runaway values
}

// ─── Turn Planning ──────────────────────────────────────────────────────

/**
 * Calculate travel cost from one location to another, including weather.
 */
function travelCost(from: LocationId, to: LocationId, weatherExtra: number): number {
  if (from === to) return 0;
  const base = calculatePathDistance(from, to);
  return base + base * weatherExtra;
}

/**
 * Identify which locations the AI needs to visit this turn and their value.
 * Returns a scored list of potential location visits.
 */
export function identifyNeededVisits(
  player: Player,
  settings: DifficultySettings,
  progress: GoalProgress,
  goals: { wealth: number; happiness: number; education: number; career: number },
  weatherMoveExtra: number,
  priceModifier: number,
  rivals: Player[],
): { location: LocationId; value: number; hours: number; reason: string }[] {
  const visits: { location: LocationId; value: number; hours: number; reason: string }[] = [];
  const pm = priceModifier;

  // WORK — if we have a job
  if (player.currentJob) {
    const job = getJob(player.currentJob);
    if (job) {
      const jobLoc = getJobLocation(job);
      // Multiple shifts possible
      const shiftsAvailable = Math.floor(player.timeRemaining / (job.hoursPerShift + 2));
      const maxShifts = Math.min(shiftsAvailable, 4); // Reasonable cap
      for (let i = 0; i < maxShifts; i++) {
        visits.push({
          location: jobLoc,
          value: player.currentWage * (1 + i * 0.1), // Diminishing priority for later shifts
          hours: job.hoursPerShift,
          reason: `Work shift ${i + 1}`,
        });
      }
    }
  }

  // FOOD — if needed
  if (player.foodLevel < 50) {
    const cheapFoodCost = Math.round(12 * pm);
    if (player.gold >= cheapFoodCost) {
      visits.push({
        location: 'rusty-tankard',
        value: 80, // Very high value — starvation penalty is -20 hours
        hours: 1,
        reason: 'Buy food',
      });
    }
  }

  // STUDY — if education goal not met
  if (progress.education.progress < 1.0) {
    const nextDegree = getNextDegree(player, settings);
    if (nextDegree && player.gold >= nextDegree.costPerSession) {
      const sessionsLeft = nextDegree.sessionsRequired - (player.degreeProgress[nextDegree.id] || 0);
      if (sessionsLeft > 0) {
        visits.push({
          location: 'academy',
          value: 40 + (progress.education.progress < 0.5 ? 20 : 0),
          hours: nextDegree.hoursPerSession,
          reason: `Study ${nextDegree.name}`,
        });
      } else {
        // Can graduate! Very high value (free)
        visits.push({
          location: 'academy',
          value: 100,
          hours: 1,
          reason: `Graduate ${nextDegree.name}`,
        });
      }
    }
  }

  // JOB UPGRADE — if better job available
  if (player.currentJob) {
    const bestJob = getBestAvailableJob(player, rivals);
    const currentJob = getJob(player.currentJob);
    if (bestJob && currentJob && bestJob.baseWage > currentJob.baseWage * 1.15) {
      visits.push({
        location: 'guild-hall',
        value: (bestJob.baseWage - currentJob.baseWage) * 10, // Value = wage difference
        hours: 1,
        reason: `Upgrade to ${bestJob.name}`,
      });
    }
  } else {
    // No job — critical
    visits.push({
      location: 'guild-hall',
      value: 100,
      hours: 1,
      reason: 'Get a job',
    });
  }

  // BANKING — deposit if lots of gold (robbery protection + wealth goal)
  if (player.gold > 200 && player.housing === 'slums') {
    visits.push({
      location: 'bank',
      value: 25,
      hours: 1,
      reason: 'Deposit gold',
    });
  }

  // CLOTHING — if needed for job
  if (player.clothingCondition < 40 && player.gold >= Math.round(25 * pm)) {
    visits.push({
      location: 'general-store',
      value: player.clothingCondition <= 0 ? 90 : 50,
      hours: 1,
      reason: 'Buy clothing',
    });
  }

  // RENT — if due
  if (player.weeksSinceRent >= 2 && player.housing !== 'homeless') {
    visits.push({
      location: 'landlord',
      value: 70,
      hours: 1,
      reason: 'Pay rent',
    });
  }

  return visits;
}

/**
 * Plan the optimal route through locations for a turn.
 *
 * Uses a greedy nearest-neighbor heuristic with value weighting:
 * For each unvisited location, calculate:
 *   score = value / (travelCost + actionHours)
 * Pick the highest-scoring next visit.
 */
export function planTurnRoute(
  startLocation: LocationId,
  visits: { location: LocationId; value: number; hours: number; reason: string }[],
  totalTime: number,
  weatherMoveExtra: number,
): TurnPlan {
  const plan: PlannedVisit[] = [];
  let currentLoc = startLocation;
  let timeRemaining = totalTime;
  const remaining = [...visits];

  // Group visits by location — batch them
  const locationGroups = new Map<LocationId, typeof visits>();
  for (const visit of remaining) {
    const group = locationGroups.get(visit.location) || [];
    group.push(visit);
    locationGroups.set(visit.location, group);
  }

  const visitedLocations = new Set<LocationId>();

  while (locationGroups.size > 0 && timeRemaining > 2) {
    let bestLocation: LocationId | null = null;
    let bestScore = -1;
    let bestTravel = 0;

    // Find the best next location to visit
    for (const [location, group] of locationGroups) {
      if (visitedLocations.has(location)) continue;

      const travel = travelCost(currentLoc, location, weatherMoveExtra);
      const totalActionHours = group.reduce((sum, v) => sum + v.hours, 0);
      const totalValue = group.reduce((sum, v) => sum + v.value, 0);

      // Can we fit this visit?
      if (travel + totalActionHours > timeRemaining) continue;

      // Score: value per total time invested (including travel)
      const score = totalValue / Math.max(1, travel + totalActionHours);

      if (score > bestScore) {
        bestScore = score;
        bestLocation = location;
        bestTravel = travel;
      }
    }

    if (!bestLocation) break;

    const group = locationGroups.get(bestLocation)!;
    const totalActionHours = group.reduce((sum, v) => sum + v.hours, 0);
    const totalValue = group.reduce((sum, v) => sum + v.value, 0);

    plan.push({
      location: bestLocation,
      actions: group.map(v => v.reason),
      estimatedHours: totalActionHours,
      estimatedValue: totalValue,
      travelCost: bestTravel,
    });

    timeRemaining -= bestTravel + totalActionHours;
    currentLoc = bestLocation;
    visitedLocations.add(bestLocation);
    locationGroups.delete(bestLocation);
  }

  const totalPlannedHours = plan.reduce((sum, v) => v.travelCost + v.estimatedHours + sum, 0);
  const totalExpectedValue = plan.reduce((sum, v) => v.estimatedValue + sum, 0);

  return {
    visits: plan,
    totalHours: totalPlannedHours,
    expectedValue: totalExpectedValue,
    idleHours: totalTime - totalPlannedHours,
  };
}
