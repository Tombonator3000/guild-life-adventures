import { TAVERN_ITEMS, getItemPrice } from '@/data/items';
import type { ActionResult, GetFn, SetFn } from '../../storeTypes';

const BRAWL_MESSAGES = [
  (damage: number) =>
    `Tavern Brawl!\n\nAle number seven loosened your tongue — specifically, the part that called a dwarf's beard "second-rate shrubbery." The whole tavern disagreed. Loudly.\n\nChairs flew. Magnus ducked behind the bar. You did not.\n\n-${damage} health. The barkeep found two of your teeth near the fireplace.`,
  (damage: number) =>
    `Tavern Brawl!\n\nYou challenged the largest man in the room to an arm-wrestling contest. He accepted. Then his brothers joined in. Then his cousins.\n\nMagnus threw you out personally, which, honestly, was the kindest thing anyone did to you all evening.\n\n-${damage} health. Several teeth are now optional.`,
  (damage: number) =>
    `Tavern Brawl!\n\nYou stood on a table and declared yourself "the greatest warrior in the realm." The regulars took this as a personal affront. Empirical testing followed.\n\nThe results were not in your favour.\n\n-${damage} health. Your pride, also critically injured.`,
  (damage: number) =>
    `Tavern Brawl!\n\nSomebody's ale got knocked over. Somebody pointed at you. Somebody threw a punch. You threw one back — at the wrong person.\n\nIt escalated from there.\n\n-${damage} health. You'll remember this more clearly tomorrow when the swelling goes down.`,
  (damage: number) =>
    `Tavern Brawl!\n\nYou tried to start a sing-along. The song was offensive to at least three separate professions, one religion, and all dwarves present.\n\nThe response was immediate and physical.\n\n-${damage} health. Magnus has banned the song. And possibly you.`,
];

function pickBrawlMessage(damage: number): string {
  const index = Math.floor(Math.random() * BRAWL_MESSAGES.length);
  return BRAWL_MESSAGES[index](damage);
}

/**
 * Host-authoritative Tavern purchase.
 * The caller sends only an item ID. The host resolves catalogue membership,
 * economy price, effect caps, per-turn ale count and any brawl consequence.
 */
export function createTavernServiceActions(set: SetFn, get: GetFn) {
  return {
    purchaseTavernItem: (playerId: string, itemId: string): ActionResult => {
      const state = get();
      const player = state.players.find(candidate => candidate.id === playerId);
      if (!player) return { success: false, message: 'Player not found.' };
      if (player.currentLocation !== 'rusty-tankard') {
        return { success: false, message: 'Visit the Rusty Tankard before ordering.' };
      }

      const item = TAVERN_ITEMS.find(candidate => candidate.id === itemId);
      if (!item) return { success: false, message: 'Tavern item not found.' };

      const price = getItemPrice(item, state.priceModifier);
      if (player.gold < price) return { success: false, message: 'Not enough gold.' };

      const currentAleCount = player.tavernAlesDrunkThisTurn ?? 0;
      const nextAleCount = item.id === 'ale' ? currentAleCount + 1 : currentAleCount;
      let brawlDamage = 0;
      let brawlMessage: string | null = null;

      if (item.id === 'ale' && nextAleCount > 6 && Math.random() < 0.35) {
        brawlDamage = 5 + Math.floor(Math.random() * 11);
        brawlMessage = pickBrawlMessage(brawlDamage);
      }

      set(current => ({
        players: current.players.map(candidate => {
          if (candidate.id !== playerId) return candidate;

          const next = {
            ...candidate,
            gold: candidate.gold - price,
            tavernAlesDrunkThisTurn: nextAleCount,
            gameStats: {
              ...candidate.gameStats,
              totalGoldSpent: (candidate.gameStats?.totalGoldSpent ?? 0) + price,
            },
          };

          const withEffect = item.effect?.type === 'food'
            ? { ...next, foodLevel: Math.min(100, candidate.foodLevel + item.effect.value) }
            : item.effect?.type === 'happiness'
              ? { ...next, happiness: Math.min(100, candidate.happiness + item.effect.value) }
              : next;

          return brawlDamage > 0
            ? { ...withEffect, health: Math.max(0, candidate.health - brawlDamage) }
            : withEffect;
        }),
        ...(brawlMessage ? { eventMessage: brawlMessage } : {}),
      }));

      return {
        success: true,
        message: brawlDamage > 0
          ? `Purchased ${item.name}. A tavern brawl caused ${brawlDamage} damage.`
          : `Purchased ${item.name}.`,
      };
    },
  };
}
