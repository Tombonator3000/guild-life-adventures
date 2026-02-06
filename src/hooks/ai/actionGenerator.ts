/**
 * Grimwald AI - Action Generator
 *
 * The main decision engine that generates prioritized lists of possible actions.
 */

import type { Player, LocationId, HousingTier } from '@/types/game.types';
import { RENT_COSTS } from '@/types/game.types';
import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
import { calculatePathDistance } from '@/data/locations';

import type { DifficultySettings, AIAction } from './types';
import {
  calculateGoalProgress,
  calculateResourceUrgency,
  getWeakestGoal,
  getBestAvailableJob,
  getNextDegree,
  shouldUpgradeHousing,
  calculateBankingStrategy,
  getJobLocation,
  getBestDungeonFloor,
  getNextEquipmentUpgrade,
  shouldBuyGuildPass,
  getBestQuest,
} from './strategy';

/**
 * Main AI decision engine - generates prioritized list of possible actions
 */
export function generateActions(
  player: Player,
  goals: { wealth: number; happiness: number; education: number; career: number },
  settings: DifficultySettings,
  week: number,
  priceModifier: number
): AIAction[] {
  const actions: AIAction[] = [];
  const progress = calculateGoalProgress(player, goals);
  const urgency = calculateResourceUrgency(player);
  const weakestGoal = getWeakestGoal(progress);
  const currentLocation = player.currentLocation;

  // Helper to calculate movement cost
  const moveCost = (to: LocationId) => calculatePathDistance(currentLocation, to);

  // ============================================
  // CRITICAL NEEDS (Always check first)
  // ============================================

  // 1. FOOD - Prevent starvation (-20 hours penalty is devastating)
  if (urgency.food > 0.5) {
    const foodCost = 6; // Cheapest food option (Shadow Market mystery meat)
    if (player.gold >= foodCost) {
      if (currentLocation === 'rusty-tankard') {
        actions.push({
          type: 'buy-food',
          priority: 100, // Highest priority
          description: 'Buy food to prevent starvation',
          details: { cost: 12, foodGain: 15 },
        });
      } else if (currentLocation === 'shadow-market') {
        // Shadow Market has cheap food too
        actions.push({
          type: 'buy-food',
          priority: 98,
          description: 'Buy food at Shadow Market',
          details: { cost: 6, foodGain: 10 },
        });
      } else {
        // Go to whichever food source is closer
        const tavernCost = moveCost('rusty-tankard');
        const marketCost = moveCost('shadow-market');
        if (marketCost < tavernCost && player.timeRemaining > marketCost + 2) {
          actions.push({
            type: 'move',
            location: 'shadow-market',
            priority: 93,
            description: 'Travel to Shadow Market for cheap food',
          });
        } else if (player.timeRemaining > tavernCost + 2) {
          actions.push({
            type: 'move',
            location: 'rusty-tankard',
            priority: 95,
            description: 'Travel to tavern for food',
          });
        }
      }
    }
  }

  // 2. RENT - Prevent eviction (huge penalty)
  if (urgency.rent > 0.5 && player.housing !== 'homeless') {
    const rentCost = RENT_COSTS[player.housing];
    if (player.gold >= rentCost) {
      if (currentLocation === 'landlord') {
        actions.push({
          type: 'pay-rent',
          priority: 90,
          description: 'Pay rent to avoid eviction',
          details: { cost: rentCost },
        });
      } else {
        const movementCost = moveCost('landlord');
        if (player.timeRemaining > movementCost + 2) {
          actions.push({
            type: 'move',
            location: 'landlord',
            priority: 85,
            description: 'Travel to landlord to pay rent',
          });
        }
      }
    }
  }

  // 3. CLOTHING - Needed for jobs
  if (urgency.clothing > 0.6 && player.gold >= 30) {
    if (currentLocation === 'armory' || currentLocation === 'general-store') {
      actions.push({
        type: 'buy-clothing',
        priority: 75,
        description: 'Buy clothing for work',
        details: { cost: 30, type: 'casual' },
      });
    } else {
      const movementCost = Math.min(moveCost('armory'), moveCost('general-store'));
      if (player.timeRemaining > movementCost + 2) {
        actions.push({
          type: 'move',
          location: moveCost('armory') < moveCost('general-store') ? 'armory' : 'general-store',
          priority: 70,
          description: 'Travel to buy clothing',
        });
      }
    }
  }

  // 4. HEALTH - Visit healer if health is low
  if (player.health < 50 && player.gold >= 30) {
    if (currentLocation === 'enchanter') {
      actions.push({
        type: 'heal',
        priority: 80,
        description: 'Visit healer to recover health',
        details: { cost: 30, healAmount: 25 },
      });
    } else {
      const moveToHealer = moveCost('enchanter');
      if (player.timeRemaining > moveToHealer + 2) {
        actions.push({
          type: 'move',
          location: 'enchanter',
          priority: 75,
          description: 'Travel to healer for health recovery',
        });
      }
    }
  }

  // ============================================
  // GOAL-ORIENTED ACTIONS
  // ============================================

  // Focus strategy based on weakest goal
  switch (weakestGoal) {
    case 'education':
      // Pursue education
      const nextDegree = getNextDegree(player, settings);
      if (nextDegree) {
        const degreeProgress = player.degreeProgress[nextDegree.id] || 0;
        const sessionsLeft = nextDegree.sessionsRequired - degreeProgress;

        // Can graduate?
        if (sessionsLeft <= 0 && currentLocation === 'academy') {
          actions.push({
            type: 'graduate',
            priority: 85,
            description: `Graduate from ${nextDegree.name}`,
            details: { degreeId: nextDegree.id },
          });
        }
        // Can study?
        else if (player.gold >= nextDegree.costPerSession &&
                 player.timeRemaining >= nextDegree.hoursPerSession) {
          if (currentLocation === 'academy') {
            actions.push({
              type: 'study',
              priority: 70 + (settings.aggressiveness * 20),
              description: `Study ${nextDegree.name}`,
              details: { degreeId: nextDegree.id, cost: nextDegree.costPerSession, hours: nextDegree.hoursPerSession },
            });
          } else {
            const movementCost = moveCost('academy');
            if (player.timeRemaining > movementCost + nextDegree.hoursPerSession) {
              actions.push({
                type: 'move',
                location: 'academy',
                priority: 65,
                description: 'Travel to academy to study',
              });
            }
          }
        }
      }
      break;

    case 'wealth':
      // Focus on earning money
      // Prioritize working if we have a good job
      if (player.currentJob) {
        const job = getJob(player.currentJob);
        if (job && player.timeRemaining >= job.hoursPerShift) {
          const jobLocation = getJobLocation(job);
          if (currentLocation === jobLocation || currentLocation === 'guild-hall') {
            actions.push({
              type: 'work',
              priority: 80,
              description: `Work as ${job.name}`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          } else {
            const movementCost = moveCost(jobLocation);
            if (player.timeRemaining > movementCost + job.hoursPerShift) {
              actions.push({
                type: 'move',
                location: jobLocation,
                priority: 75,
                description: `Travel to ${jobLocation} for work`,
              });
            }
          }
        }
      }

      // Banking strategy - deposit excess to avoid robbery
      const banking = calculateBankingStrategy(player, settings);
      if (banking.deposit > 50) {
        if (currentLocation === 'bank') {
          actions.push({
            type: 'deposit-bank',
            priority: 60,
            description: `Deposit ${banking.deposit}g in bank`,
            details: { amount: banking.deposit },
          });
        } else if (player.timeRemaining > moveCost('bank') + 2) {
          actions.push({
            type: 'move',
            location: 'bank',
            priority: 55,
            description: 'Travel to bank to deposit gold',
          });
        }
      }
      break;

    case 'happiness':
      // Buy things that increase happiness
      // Appliances give one-time happiness bonus
      if (player.gold > 200) {
        // Priority: Cooking Fire (+1 hap/turn), then others
        const wantedAppliances = [
          { id: 'cooking-fire', cost: 276, priority: 68 },
          { id: 'scrying-mirror', cost: 525, priority: 63 },
          { id: 'preservation-box', cost: 876, priority: 60 },
        ];
        for (const wanted of wantedAppliances) {
          if (!player.appliances[wanted.id] && player.gold >= wanted.cost) {
            if (currentLocation === 'enchanter') {
              actions.push({
                type: 'buy-appliance',
                priority: wanted.priority,
                description: `Buy ${wanted.id} for happiness/utility`,
                details: { applianceId: wanted.id, cost: wanted.cost, source: 'enchanter' },
              });
              break; // Only try to buy one at a time
            } else if (player.timeRemaining > moveCost('enchanter') + 2) {
              actions.push({
                type: 'move',
                location: 'enchanter',
                priority: wanted.priority - 5,
                description: 'Travel to buy appliances',
              });
              break;
            }
          }
        }
      }

      // Rest for happiness (minor)
      if (player.happiness < 40 && player.timeRemaining >= 4) {
        const homeLocation = player.housing === 'noble' ? 'noble-heights' : 'slums';
        if (currentLocation === homeLocation) {
          actions.push({
            type: 'rest',
            priority: 45,
            description: 'Rest to recover happiness',
            details: { hours: 4, happinessGain: 5 },
          });
        }
      }
      break;

    case 'career':
      // Focus on getting better jobs and building dependability
      // First, make sure we have a job
      if (!player.currentJob) {
        const bestJob = getBestAvailableJob(player);
        if (bestJob) {
          if (currentLocation === 'guild-hall') {
            actions.push({
              type: 'apply-job',
              priority: 85,
              description: `Apply for ${bestJob.name}`,
              details: { jobId: bestJob.id },
            });
          } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
            actions.push({
              type: 'move',
              location: 'guild-hall',
              priority: 80,
              description: 'Travel to guild hall to find work',
            });
          }
        }
      }

      // Work to build dependability
      if (player.currentJob && player.timeRemaining >= 6) {
        const job = getJob(player.currentJob);
        if (job) {
          const jobLocation = getJobLocation(job);
          if (currentLocation === jobLocation || currentLocation === 'guild-hall') {
            actions.push({
              type: 'work',
              priority: 75,
              description: `Work to build dependability`,
              details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
            });
          } else {
            actions.push({
              type: 'move',
              location: jobLocation,
              priority: 70,
              description: 'Travel to work location',
            });
          }
        }
      }

      // Take and complete quests for guild rank promotion
      if (player.hasGuildPass && !player.activeQuest) {
        if (currentLocation === 'guild-hall') {
          actions.push({
            type: 'take-quest',
            priority: 72,
            description: 'Take quest for guild rank',
            details: { questId: 'patrol-e' }, // Simple quest
          });
        } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
          actions.push({
            type: 'move',
            location: 'guild-hall',
            priority: 68,
            description: 'Travel to guild hall for quests',
          });
        }
      }
      break;
  }

  // Always check for ready graduations (free +5 happiness, +5 dependability)
  if (currentLocation === 'academy') {
    for (const [degreeId, degree] of Object.entries(DEGREES)) {
      const progress = player.degreeProgress[degreeId as keyof typeof player.degreeProgress] || 0;
      if (progress >= degree.sessionsRequired && !player.completedDegrees.includes(degreeId as any)) {
        actions.push({
          type: 'graduate',
          priority: 88, // Very high - free bonuses
          description: `Graduate from ${degree.name}`,
          details: { degreeId },
        });
      }
    }
  }

  // ============================================
  // GENERAL STRATEGIC ACTIONS (Always consider)
  // ============================================

  // Get a job if we don't have one
  if (!player.currentJob && player.timeRemaining > 8) {
    const bestJob = getBestAvailableJob(player);
    if (bestJob) {
      if (currentLocation === 'guild-hall') {
        actions.push({
          type: 'apply-job',
          priority: 70,
          description: `Apply for ${bestJob.name}`,
          details: { jobId: bestJob.id },
        });
      } else {
        actions.push({
          type: 'move',
          location: 'guild-hall',
          priority: 65,
          description: 'Travel to guild hall for employment',
        });
      }
    }
  }

  // Consider upgrading job if better one available
  if (player.currentJob) {
    const currentJob = getJob(player.currentJob);
    const bestJob = getBestAvailableJob(player);
    if (currentJob && bestJob && bestJob.baseWage > currentJob.baseWage * 1.2) {
      if (currentLocation === 'guild-hall') {
        actions.push({
          type: 'apply-job',
          priority: 60,
          description: `Upgrade to ${bestJob.name}`,
          details: { jobId: bestJob.id },
        });
      }
    }
  }

  // Work if we have time and a job
  if (player.currentJob && player.timeRemaining >= 6) {
    const job = getJob(player.currentJob);
    if (job) {
      const jobLocation = getJobLocation(job);
      if (currentLocation === jobLocation || currentLocation === 'guild-hall') {
        actions.push({
          type: 'work',
          priority: 50 + (progress.wealth.progress < 0.5 ? 20 : 0),
          description: `Work shift as ${job.name}`,
          details: { jobId: job.id, hours: job.hoursPerShift, wage: player.currentWage },
        });
      } else if (player.timeRemaining > moveCost(jobLocation) + job.hoursPerShift) {
        actions.push({
          type: 'move',
          location: jobLocation,
          priority: 45,
          description: 'Travel to work',
        });
      }
    }
  }

  // Housing upgrade consideration
  if (shouldUpgradeHousing(player, settings)) {
    if (currentLocation === 'landlord') {
      actions.push({
        type: 'move-housing',
        priority: 55,
        description: 'Upgrade to Noble Heights',
        details: { tier: 'noble' as HousingTier },
      });
    } else if (player.timeRemaining > moveCost('landlord') + 2) {
      actions.push({
        type: 'move',
        location: 'landlord',
        priority: 50,
        description: 'Travel to upgrade housing',
      });
    }
  }

  // Downgrade housing if can't afford rent
  if (player.housing !== 'homeless' && player.gold < RENT_COSTS[player.housing] && player.weeksSinceRent >= 3) {
    if (player.housing === 'noble') {
      if (currentLocation === 'landlord') {
        actions.push({
          type: 'downgrade-housing',
          priority: 80,
          description: 'Downgrade housing to save money',
          details: { tier: 'slums' as HousingTier },
        });
      } else if (player.timeRemaining > moveCost('landlord') + 2) {
        actions.push({
          type: 'move',
          location: 'landlord',
          priority: 75,
          description: 'Travel to landlord to downgrade housing',
        });
      }
    }
  }

  // Withdraw money if needed
  if (player.gold < 30 && player.savings > 50) {
    if (currentLocation === 'bank') {
      actions.push({
        type: 'withdraw-bank',
        priority: 65,
        description: 'Withdraw gold from bank',
        details: { amount: Math.min(100, player.savings) },
      });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({
        type: 'move',
        location: 'bank',
        priority: 60,
        description: 'Travel to bank to withdraw',
      });
    }
  }

  // ============================================
  // AI-2: CURE SICKNESS (high priority when sick)
  // ============================================
  if (player.isSick) {
    if (currentLocation === 'enchanter' && player.gold >= 75) {
      actions.push({
        type: 'cure-sickness',
        priority: 92,
        description: 'Cure sickness at enchanter',
        details: { cost: 75 },
      });
    } else if (player.gold >= 75 && player.timeRemaining > moveCost('enchanter') + 2) {
      actions.push({
        type: 'move',
        location: 'enchanter',
        priority: 88,
        description: 'Travel to enchanter to cure sickness',
      });
    }
  }

  // ============================================
  // AI-3: LOAN SYSTEM
  // ============================================
  // Take loan when critically broke (can't afford food or rent)
  if (player.loanAmount <= 0 && player.gold < 20 && player.savings < 20) {
    if (currentLocation === 'bank') {
      actions.push({
        type: 'take-loan',
        priority: 72,
        description: 'Take emergency loan from bank',
        details: { amount: 200 },
      });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({
        type: 'move',
        location: 'bank',
        priority: 68,
        description: 'Travel to bank for emergency loan',
      });
    }
  }

  // Repay loan when have plenty of gold (avoid interest)
  if (player.loanAmount > 0 && player.gold > player.loanAmount + 100) {
    if (currentLocation === 'bank') {
      actions.push({
        type: 'repay-loan',
        priority: 65,
        description: `Repay loan of ${player.loanAmount}g`,
        details: { amount: player.loanAmount },
      });
    } else if (player.timeRemaining > moveCost('bank') + 2) {
      actions.push({
        type: 'move',
        location: 'bank',
        priority: 60,
        description: 'Travel to bank to repay loan',
      });
    }
  }

  // ============================================
  // AI-5: FRESH FOOD MANAGEMENT
  // ============================================
  const hasPreservationBox = player.appliances['preservation-box'] && !player.appliances['preservation-box'].isBroken;
  if (hasPreservationBox && player.freshFood < 3 && player.gold >= 25) {
    if (currentLocation === 'general-store' || currentLocation === 'shadow-market') {
      actions.push({
        type: 'buy-fresh-food',
        priority: 55,
        description: 'Stock up on fresh food',
        details: { cost: 25, units: 2 },
      });
    }
  }

  // ============================================
  // AI-6: WEEKEND TICKET PURCHASES
  // ============================================
  if (player.tickets.length === 0 && player.gold > 150 && weakestGoal === 'happiness') {
    if (currentLocation === 'shadow-market') {
      const ticketOptions = [
        { type: 'bard-concert', cost: 40 },
        { type: 'theatre', cost: 30 },
        { type: 'jousting', cost: 25 },
      ];
      const affordable = ticketOptions.find(t => player.gold >= t.cost);
      if (affordable) {
        actions.push({
          type: 'buy-ticket',
          priority: 48,
          description: `Buy ${affordable.type} ticket`,
          details: { ticketType: affordable.type, cost: affordable.cost },
        });
      }
    }
  }

  // ============================================
  // AI-7: ITEM SELLING / PAWNING
  // ============================================
  // Pawn appliances when desperately broke
  if (player.gold < 10 && player.loanAmount > 0 && currentLocation === 'fence') {
    const pawnableAppliances = Object.entries(player.appliances)
      .filter(([, v]) => v && !v.isBroken)
      .map(([id]) => id);
    if (pawnableAppliances.length > 0) {
      actions.push({
        type: 'pawn-appliance',
        priority: 70,
        description: `Pawn ${pawnableAppliances[0]} for emergency gold`,
        details: { applianceId: pawnableAppliances[0] },
      });
    }
  }

  // Sell inventory items when broke
  if (player.gold < 20 && player.inventory.length > 0 && currentLocation === 'fence') {
    actions.push({
      type: 'sell-item',
      priority: 65,
      description: `Sell ${player.inventory[0]} at fence`,
      details: { itemId: player.inventory[0], price: 10 },
    });
  }

  // ============================================
  // AI-8: LOTTERY TICKETS
  // ============================================
  if (player.gold > 100 && player.lotteryTickets === 0 && week > 3) {
    if (currentLocation === 'shadow-market' || currentLocation === 'general-store') {
      actions.push({
        type: 'buy-lottery-ticket',
        priority: 25, // Low priority, nice-to-have
        description: 'Buy lottery ticket',
        details: { cost: 5 },
      });
    }
  }

  // ============================================
  // AI-4: STOCK MARKET (only for medium/hard AI)
  // ============================================
  if (settings.planningDepth >= 2 && player.gold > 300 && weakestGoal === 'wealth') {
    if (currentLocation === 'bank') {
      // Buy stocks with excess gold
      const stocksToBuy = player.gold > 500 ? 10 : 5;
      actions.push({
        type: 'buy-stock',
        priority: 40,
        description: 'Invest in stocks',
        details: { stockId: 'guild-shares', shares: stocksToBuy, price: 50 },
      });
    }
  }

  // Sell stocks if need gold or have enough profit
  const ownedStockCount = Object.values(player.stocks).reduce((a, b) => a + b, 0);
  if (ownedStockCount > 0 && (player.gold < 50 || weakestGoal !== 'wealth')) {
    if (currentLocation === 'bank') {
      const firstStock = Object.entries(player.stocks).find(([, v]) => v > 0);
      if (firstStock) {
        actions.push({
          type: 'sell-stock',
          priority: player.gold < 50 ? 70 : 35,
          description: `Sell ${firstStock[0]} stocks`,
          details: { stockId: firstStock[0], shares: firstStock[1] },
        });
      }
    }
  }

  // ============================================
  // AI-12: ROUTE OPTIMIZATION
  // ============================================
  // If multiple needs share a location, prefer that location
  const locationNeeds: Record<string, number> = {};
  for (const action of actions) {
    if (action.type === 'move' && action.location) {
      locationNeeds[action.location] = (locationNeeds[action.location] || 0) + 1;
    }
  }
  // Boost priority for moves to locations with multiple needs
  for (const action of actions) {
    if (action.type === 'move' && action.location && (locationNeeds[action.location] || 0) > 1) {
      action.priority += 5 * (locationNeeds[action.location] - 1);
    }
  }

  // ============================================
  // DUNGEON & QUEST ACTIONS
  // ============================================

  // Buy Guild Pass when affordable (needed for quests)
  if (shouldBuyGuildPass(player, settings)) {
    if (currentLocation === 'guild-hall') {
      actions.push({
        type: 'buy-guild-pass',
        priority: 55,
        description: 'Buy Guild Pass for quests',
      });
    } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 50,
        description: 'Travel to guild hall to buy pass',
      });
    }
  }

  // Buy equipment for dungeon progression
  const equipUpgrade = getNextEquipmentUpgrade(player);
  if (equipUpgrade) {
    if (currentLocation === 'armory') {
      actions.push({
        type: 'buy-equipment',
        priority: 55,
        description: `Buy ${equipUpgrade.itemId} for dungeon`,
        details: { itemId: equipUpgrade.itemId, cost: equipUpgrade.cost, slot: equipUpgrade.slot },
      });
    } else if (player.timeRemaining > moveCost('armory') + 2) {
      actions.push({
        type: 'move',
        location: 'armory',
        priority: 50,
        description: 'Travel to armory to buy equipment',
      });
    }
  }

  // Take quest if at guild hall and have pass
  const bestQuest = getBestQuest(player, settings);
  if (bestQuest) {
    if (currentLocation === 'guild-hall') {
      actions.push({
        type: 'take-quest',
        priority: 60,
        description: `Take quest: ${bestQuest}`,
        details: { questId: bestQuest },
      });
    } else if (player.timeRemaining > moveCost('guild-hall') + 2) {
      actions.push({
        type: 'move',
        location: 'guild-hall',
        priority: 55,
        description: 'Travel to guild hall to take quest',
      });
    }
  }

  // Complete active quest
  if (player.activeQuest && currentLocation === 'guild-hall') {
    actions.push({
      type: 'complete-quest',
      priority: 70,
      description: 'Complete active quest',
    });
  } else if (player.activeQuest && player.timeRemaining > moveCost('guild-hall') + 2) {
    actions.push({
      type: 'move',
      location: 'guild-hall',
      priority: 65,
      description: 'Travel to guild hall to complete quest',
    });
  }

  // Explore dungeon (H9: respect attempts limit and health, cave gating)
  const dungeonAttemptsRemaining = 2 - (player.dungeonAttemptsThisTurn || 0);
  const hasCaveAccess = player.completedDegrees.length > 0;
  const dungeonFloor = hasCaveAccess && dungeonAttemptsRemaining > 0 && player.health > 20
    ? getBestDungeonFloor(player, settings) : null;
  if (dungeonFloor !== null) {
    if (currentLocation === 'cave') {
      actions.push({
        type: 'explore-dungeon',
        priority: 58 + (weakestGoal === 'wealth' ? 10 : 0),
        description: `Explore dungeon floor ${dungeonFloor}`,
        details: { floorId: dungeonFloor },
      });
    } else if (player.timeRemaining > moveCost('cave') + 6) {
      actions.push({
        type: 'move',
        location: 'cave',
        priority: 53,
        description: 'Travel to cave for dungeon',
      });
    }
  }

  // ============================================
  // DEFAULT ACTION - End turn if nothing else
  // ============================================
  actions.push({
    type: 'end-turn',
    priority: 1,
    description: 'End turn',
  });

  // Sort by priority (highest first)
  actions.sort((a, b) => b.priority - a.priority);

  // Apply mistake chance for easier difficulties
  if (settings.mistakeChance > 0 && Math.random() < settings.mistakeChance && actions.length > 2) {
    // Swap top two actions randomly
    const temp = actions[0];
    actions[0] = actions[1];
    actions[1] = temp;
  }

  return actions;
}
