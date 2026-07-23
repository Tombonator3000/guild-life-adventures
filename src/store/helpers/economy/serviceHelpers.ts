import type { GetFn, SetFn, ActionResult } from '../../storeTypes';
import { NEWSPAPER_COST } from '@/data/newspaper';

export type HealerServiceId = 'minor' | 'moderate' | 'full' | 'cure' | 'blessing';
export type GraveyardServiceId = 'pray' | 'mourn' | 'blessing';
export type NewspaperVendor = 'general-store' | 'shadow-market';

const HEALER_SERVICES: Record<HealerServiceId, {
  baseCost: number;
  time: number;
  health?: number;
  maxHealth?: number;
  cure?: boolean;
}> = {
  minor: { baseCost: 25, time: 1, health: 25 },
  moderate: { baseCost: 50, time: 2, health: 50 },
  full: { baseCost: 100, time: 4, health: 100 },
  cure: { baseCost: 75, time: 2, cure: true },
  blessing: { baseCost: 150, time: 4, maxHealth: 10 },
};

const GRAVEYARD_SERVICES: Record<GraveyardServiceId, {
  baseCost: number;
  time: number;
  happiness?: number;
  relaxation?: number;
  maxHealth?: number;
}> = {
  pray: { baseCost: 10, time: 2, happiness: 5 },
  mourn: { baseCost: 15, time: 3, relaxation: 5 },
  blessing: { baseCost: 200, time: 4, maxHealth: 5 },
};

const GAMBLE_TABLE: Record<number, {
  chance: number;
  payout: number;
  winHappiness: number;
  loseHappiness: number;
  time: number;
}> = {
  10: { chance: 0.4, payout: 25, winHappiness: 5, loseHappiness: -3, time: 2 },
  50: { chance: 0.3, payout: 150, winHappiness: 15, loseHappiness: -10, time: 2 },
  100: { chance: 0.2, payout: 400, winHappiness: 25, loseHappiness: -20, time: 3 },
};

const adjustedPrice = (baseCost: number, modifier: number) =>
  Math.max(1, Math.round(baseCost * modifier));

export function createServiceActions(set: SetFn, get: GetFn) {
  return {
    useHealerService: (playerId: string, serviceId: HealerServiceId): ActionResult | void => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      const service = HEALER_SERVICES[serviceId];
      if (!player || !service) return { success: false, message: 'Invalid healing service' };
      if (player.currentLocation !== 'enchanter') return { success: false, message: 'Visit the Enchanter first' };

      const cost = serviceId === 'cure' || serviceId === 'blessing'
        ? service.baseCost
        : adjustedPrice(service.baseCost, state.priceModifier);
      if (player.gold < cost) return { success: false, message: 'Not enough gold' };
      if (player.timeRemaining < service.time) return { success: false, message: 'Not enough time' };
      if (service.health && player.health >= player.maxHealth) return { success: false, message: 'Health is already full' };
      if (service.cure && !player.isSick) return { success: false, message: 'No ailments to cure' };

      set(s => ({
        players: s.players.map(p => {
          if (p.id !== playerId) return p;
          const maxHealth = Math.max(10, p.maxHealth + (service.maxHealth ?? 0));
          const healthGain = service.health ?? 0;
          return {
            ...p,
            gold: Math.max(0, p.gold - cost),
            timeRemaining: Math.max(0, p.timeRemaining - service.time),
            maxHealth,
            health: Math.min(maxHealth, p.health + healthGain),
            isSick: service.cure ? false : p.isSick,
            gameStats: {
              ...p.gameStats,
              totalGoldSpent: (p.gameStats?.totalGoldSpent ?? 0) + cost,
              totalHealingReceived: (p.gameStats?.totalHealingReceived ?? 0) + healthGain,
            },
          };
        }),
      }));
      return { success: true, message: 'Healing service completed' };
    },

    useGraveyardService: (playerId: string, serviceId: GraveyardServiceId): ActionResult | void => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      const service = GRAVEYARD_SERVICES[serviceId];
      if (!player || !service) return { success: false, message: 'Invalid graveyard service' };
      if (player.currentLocation !== 'graveyard') return { success: false, message: 'Visit the Graveyard first' };
      const cost = adjustedPrice(service.baseCost, state.priceModifier);
      if (player.gold < cost) return { success: false, message: 'Not enough gold' };
      if (player.timeRemaining < service.time) return { success: false, message: 'Not enough time' };

      set(s => ({
        players: s.players.map(p => {
          if (p.id !== playerId) return p;
          const maxHealth = Math.max(10, p.maxHealth + (service.maxHealth ?? 0));
          return {
            ...p,
            gold: Math.max(0, p.gold - cost),
            timeRemaining: Math.max(0, p.timeRemaining - service.time),
            happiness: Math.max(0, Math.min(100, p.happiness + (service.happiness ?? 0))),
            relaxation: Math.max(10, Math.min(50, p.relaxation + (service.relaxation ?? 0))),
            maxHealth,
            health: Math.min(p.health, maxHealth),
            gameStats: {
              ...p.gameStats,
              totalGoldSpent: (p.gameStats?.totalGoldSpent ?? 0) + cost,
            },
          };
        }),
      }));
      return { success: true, message: 'Graveyard service completed' };
    },

    gambleAtFence: (playerId: string, stake: number): ActionResult | void => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      const odds = GAMBLE_TABLE[stake];
      if (!player || !odds) return { success: false, message: 'Invalid wager' };
      if (player.currentLocation !== 'fence') return { success: false, message: 'Visit the Fence first' };
      if (player.gold < stake) return { success: false, message: 'Not enough gold' };
      if (player.timeRemaining < odds.time) return { success: false, message: 'Not enough time' };

      const won = Math.random() < odds.chance;
      const message = won ? `You won ${odds.payout}g at the Fence!` : `You lost ${stake}g at the Fence.`;
      set(s => ({
        players: s.players.map(p => p.id !== playerId ? p : {
          ...p,
          gold: Math.max(0, p.gold - stake + (won ? odds.payout : 0)),
          timeRemaining: Math.max(0, p.timeRemaining - odds.time),
          happiness: Math.max(0, Math.min(100, p.happiness + (won ? odds.winHappiness : odds.loseHappiness))),
          gameStats: {
            ...p.gameStats,
            totalGoldSpent: (p.gameStats?.totalGoldSpent ?? 0) + stake,
            totalGoldEarned: (p.gameStats?.totalGoldEarned ?? 0) + (won ? odds.payout : 0),
          },
        }),
        ...(player.isAI ? {} : {
          eventMessage: message,
          eventSource: 'weekly' as const,
          phase: 'event' as const,
        }),
      }));
      return { success: true, message };
    },

    purchaseNewspaper: (playerId: string, vendor: NewspaperVendor): ActionResult | void => {
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return { success: false, message: 'Player not found' };
      if (player.currentLocation !== vendor) return { success: false, message: 'Visit the newspaper vendor first' };
      const multiplier = vendor === 'shadow-market' ? 0.5 : 1;
      const cost = adjustedPrice(NEWSPAPER_COST * multiplier, state.priceModifier);
      if (player.gold < cost) return { success: false, message: 'Not enough gold' };

      set(s => ({
        players: s.players.map(p => p.id !== playerId ? p : {
          ...p,
          gold: Math.max(0, p.gold - cost),
          hasNewspaper: true,
          gameStats: {
            ...p.gameStats,
            totalGoldSpent: (p.gameStats?.totalGoldSpent ?? 0) + cost,
          },
        }),
      }));
      return { success: true, message: 'Newspaper purchased' };
    },
  };
}
