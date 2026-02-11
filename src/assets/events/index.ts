// Auto-generated event woodcut illustration imports
// All AI-generated 512×512 medieval woodcut-style event illustrations

// Crime & Theft
import shadowfingersTheft from './shadowfingers-theft.png';
import bankRobbery from './bank-robbery.png';
import shadowAmbush from './shadow-ambush.png';
import pickpocket from './pickpocket.png';
import apartmentRobbery from './apartment-robbery.png';

// Positive Events
import luckyFind from './lucky-find.png';
import guildBonus from './guild-bonus.png';
import generousTip from './generous-tip.png';

// Economic Events
import economicBoom from './economic-boom.png';
import marketCrash from './market-crash.png';
import layoff from './layoff.png';
import payCut from './pay-cut.png';

// Health Events
import illness from './illness.png';
import foodPoisoning from './food-poisoning.png';
import doctorVisit from './doctor-visit.png';

// Life Events
import death from './death.png';
import resurrection from './resurrection.png';
import starvation from './starvation.png';
import eviction from './eviction.png';
import clothingTorn from './clothing-torn.png';
import homeless from './homeless.png';
import birthday from './birthday.png';
import applianceBreak from './appliance-break.png';
import lotteryWin from './lottery-win.png';

// Weather Events
import snowstorm from './snowstorm.png';
import thunderstorm from './thunderstorm.png';
import drought from './drought.png';
import harvestRain from './harvest-rain.png';
import enchantedFog from './enchanted-fog.png';

// Travel Events
import wanderingMerchant from './wandering-merchant.png';
import streetBard from './street-bard.png';
import muddyRoad from './muddy-road.png';
import wrongTurn from './wrong-turn.png';
import injuredTraveler from './injured-traveler.png';
import oldMap from './old-map.png';

/** Map event IDs and keywords to their woodcut illustrations */
export const EVENT_IMAGES: Record<string, string> = {
  // Crime & Theft - matched by event ID or keyword
  'shadowfingers-theft': shadowfingersTheft,
  'shadowfingers-major-theft': shadowfingersTheft,
  'shadowfingers': shadowfingersTheft,
  'bank-robbery': bankRobbery,
  'shadow-market-ambush': shadowAmbush,
  'pickpocket-market': pickpocket,
  'pickpocket': pickpocket,
  'apartment-robbery': apartmentRobbery,

  // Positive Events
  'lucky-find': luckyFind,
  'guild-bonus': guildBonus,
  'generous-tip': generousTip,

  // Economic Events
  'economic-boom': economicBoom,
  'economic-crash': marketCrash,
  'market-crash': marketCrash,
  'market-crash-paycut': payCut,
  'market-crash-layoff': layoff,
  'pay-cut': payCut,
  'layoff': layoff,

  // Health Events
  'illness': illness,
  'sickness': illness,
  'food-poisoning': foodPoisoning,
  'doctor-visit': doctorVisit,

  // Life Events
  'death': death,
  'resurrection': resurrection,
  'starvation': starvation,
  'eviction': eviction,
  'clothing-torn': clothingTorn,
  'homeless': homeless,
  'birthday': birthday,
  'appliance-break': applianceBreak,
  'appliance-breakage': applianceBreak,
  'lottery-win': lotteryWin,
  'lottery': lotteryWin,

  // Weather Events
  'snowstorm': snowstorm,
  'thunderstorm': thunderstorm,
  'drought': drought,
  'harvest-rain': harvestRain,
  'enchanted-fog': enchantedFog,

  // Travel Events (IDs match travelEvents.ts)
  'found-coin-purse': luckyFind,
  'wandering-merchant': wanderingMerchant,
  'shortcut-found': wrongTurn,
  'hidden-shortcut': wrongTurn,
  'bard-performance': streetBard,
  'street-bard': streetBard,
  'muddy-road': muddyRoad,
  'lost-way': wrongTurn,
  'took-a-wrong-turn': wrongTurn,
  'wrong-turn': wrongTurn,
  'stray-dog': muddyRoad,
  'aggressive-stray-dog': muddyRoad,
  'injured-traveler': injuredTraveler,
  'old-map': oldMap,
  'old-map-fragment': oldMap,
};

/** Fallback images by event type */
const TYPE_FALLBACKS: Record<string, string> = {
  'theft': shadowfingersTheft,
  'sickness': illness,
  'eviction': eviction,
  'death': death,
  'starvation': starvation,
  'bonus': luckyFind,
  'info': economicBoom,
};

/**
 * Get the woodcut illustration for an event.
 * Tries exact ID match first, then falls back to event type.
 */
export function getEventImage(eventId?: string, eventType?: string): string | undefined {
  if (eventId && EVENT_IMAGES[eventId]) {
    return EVENT_IMAGES[eventId];
  }
  // Try matching by keywords in the event ID
  if (eventId) {
    for (const [key, img] of Object.entries(EVENT_IMAGES)) {
      if (eventId.includes(key) || key.includes(eventId)) {
        return img;
      }
    }
  }
  // Fall back to type
  if (eventType && TYPE_FALLBACKS[eventType]) {
    return TYPE_FALLBACKS[eventType];
  }
  return undefined;
}
