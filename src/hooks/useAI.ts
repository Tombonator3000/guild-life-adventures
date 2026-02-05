// Guild Life - AI Logic for Grimwald

import { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { Player, LocationId } from '@/types/game.types';
import { getAvailableJobs, JOBS } from '@/data/jobs';
import { getAvailableQuests, canTakeQuest } from '@/data/quests';
import { RENT_COSTS, GUILD_PASS_COST } from '@/types/game.types';

type AIAction = {
  type: 'move' | 'work' | 'eat' | 'study' | 'quest' | 'buy-guild-pass' | 'rest' | 'pay-rent' | 'end-turn';
  location?: LocationId;
  details?: any;
};

export function useAI() {
  const {
    movePlayer,
    workShift,
    modifyFood,
    modifyGold,
    modifyHappiness,
    modifyHealth,
    payRent,
    spendTime,
    studySession,
    takeQuest,
    completeQuest,
    buyGuildPass,
    endTurn,
  } = useGameStore();

  const decideAction = useCallback((player: Player): AIAction => {
    // Priority 1: Starvation prevention (food < 20)
    if (player.foodLevel < 20) {
      if (player.gold >= 8 && player.currentLocation !== 'rusty-tankard') {
        return { type: 'move', location: 'rusty-tankard' };
      }
      if (player.gold >= 8 && player.currentLocation === 'rusty-tankard') {
        return { type: 'eat' };
      }
    }

    // Priority 2: Pay rent if overdue
    if (player.weeksSinceRent >= 3 && player.housing !== 'homeless') {
      const rentCost = RENT_COSTS[player.housing];
      if (player.gold >= rentCost) {
        if (player.currentLocation !== 'landlord') {
          return { type: 'move', location: 'landlord' };
        }
        return { type: 'pay-rent' };
      }
    }

    // Priority 3: Work if low on money (< 50 gold) or no job
    if ((player.gold < 50 || !player.currentJob) && player.timeRemaining >= 8) {
      const availableJobs = getAvailableJobs(player.completedDegrees, player.clothingCondition, player.experience, player.dependability);
      if (availableJobs.length > 0) {
        const bestJob = availableJobs.reduce((best, job) => 
          job.baseWage > best.baseWage ? job : best
        );
        
        // If no job, get one first
        if (!player.currentJob) {
          if (player.currentLocation !== 'guild-hall') {
            return { type: 'move', location: 'guild-hall' };
          }
          return { type: 'work', details: { ...bestJob, getJob: true } };
        }
        
        // Go to guild-hall for most jobs
        if (player.currentLocation !== 'guild-hall') {
          return { type: 'move', location: 'guild-hall' };
        }
        return { type: 'work', details: bestJob };
      }
    }

    // Priority 4: Buy Guild Pass if can afford and don't have one yet
    if (!player.hasGuildPass && player.gold >= GUILD_PASS_COST && player.timeRemaining >= 20) {
      if (player.currentLocation !== 'guild-hall') {
        return { type: 'move', location: 'guild-hall' };
      }
      return { type: 'buy-guild-pass' };
    }

    // Priority 5: Take quest if no active quest, have guild pass, and have enough time
    if (player.hasGuildPass && !player.activeQuest && player.timeRemaining >= 20 && player.health >= 60) {
      const availableQuests = getAvailableQuests(player.guildRank);
      const affordableQuest = availableQuests.find(q => {
        const { canTake } = canTakeQuest(q, player.guildRank, player.education, player.inventory);
        return canTake && q.timeRequired <= player.timeRemaining && q.healthRisk < player.health;
      });

      if (affordableQuest) {
        if (player.currentLocation !== 'guild-hall') {
          return { type: 'move', location: 'guild-hall' };
        }
        return { type: 'quest', details: affordableQuest };
      }
    }

    // Priority 5: Complete active quest
    if (player.activeQuest && player.currentLocation === 'guild-hall') {
      return { type: 'quest', details: { complete: true } };
    }

    // Priority 6: Study if can afford and have time
    if (player.gold >= 30 && player.timeRemaining >= 4) {
      if (player.currentLocation !== 'academy') {
        return { type: 'move', location: 'academy' };
      }
      return { type: 'study' };
    }

    // Priority 7: Rest if low happiness
    if (player.happiness < 30 && player.housing !== 'homeless') {
      const homeLocation: LocationId = player.housing === 'slums' ? 'slums' : 
                          player.housing === 'noble' ? 'noble-heights' : 'slums';
      if (player.currentLocation !== homeLocation) {
        return { type: 'move', location: homeLocation };
      }
      return { type: 'rest' };
    }

    // Priority 8: Work more if nothing else to do
    if (player.timeRemaining >= 8) {
      const availableJobs = getAvailableJobs(player.completedDegrees, player.clothingCondition, player.experience, player.dependability);
      if (availableJobs.length > 0) {
        const bestJob = availableJobs.reduce((best, job) => 
          job.baseWage > best.baseWage ? job : best
        );
        
        if (player.currentLocation !== 'guild-hall') {
          return { type: 'move', location: 'guild-hall' };
        }
        return { type: 'work', details: bestJob };
      }
    }

    // Default: End turn
    return { type: 'end-turn' };
  }, []);

  const executeAction = useCallback((player: Player, action: AIAction) => {
    switch (action.type) {
      case 'move':
        if (action.location) {
          movePlayer(player.id, action.location, 4); // Assume 4 hours travel
        }
        break;
      
      case 'work':
        if (action.details) {
          // If AI needs to get a job first
          if (action.details.getJob) {
            const state = useGameStore.getState();
            state.setJob(player.id, action.details.id, action.details.hourlyWage);
          }
          workShift(player.id, action.details.hoursPerShift, action.details.hourlyWage);
        }
        break;
      
      case 'eat':
        modifyGold(player.id, -8);
        modifyFood(player.id, 20);
        spendTime(player.id, 1);
        break;
      
      case 'study':
        studySession(player.id, 'fighter', 25, 4);
        break;
      
      case 'buy-guild-pass':
        buyGuildPass(player.id);
        break;

      case 'quest':
        if (action.details?.complete) {
          completeQuest(player.id);
        } else if (action.details) {
          takeQuest(player.id, action.details.id);
        }
        break;
      
      case 'pay-rent':
        payRent(player.id);
        spendTime(player.id, 1);
        break;
      
      case 'rest':
        spendTime(player.id, 4);
        modifyHappiness(player.id, 10);
        break;
      
      case 'end-turn':
        endTurn();
        break;
    }
  }, [movePlayer, workShift, modifyGold, modifyFood, modifyHappiness, spendTime, studySession, payRent, endTurn, takeQuest, completeQuest, buyGuildPass]);

  const runAITurn = useCallback((player: Player) => {
    // AI takes multiple actions per turn until out of time or decides to end
    let actionsRemaining = 10; // Safety limit
    
    const step = () => {
      if (actionsRemaining <= 0 || player.timeRemaining < 1) {
        endTurn();
        return;
      }
      
      const action = decideAction(player);
      
      if (action.type === 'end-turn') {
        endTurn();
        return;
      }
      
      executeAction(player, action);
      actionsRemaining--;
      
      // Continue with next action after a short delay
      setTimeout(step, 500);
    };
    
    step();
  }, [decideAction, executeAction, endTurn]);

  return { decideAction, executeAction, runAITurn };
}
