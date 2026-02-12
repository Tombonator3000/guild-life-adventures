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
import strayDog from './stray-dog.png';

// Festival Events
import harvestFestival from './harvest-festival.png';
import winterSolstice from './winter-solstice.png';
import springTournament from './spring-tournament.png';
import midsummerFair from './midsummer-fair.png';

// Weekend Activity Events
import weekendJousting from './weekend-jousting.png';
import weekendTheatre from './weekend-theatre.png';
import weekendBardConcert from './weekend-bard-concert.png';
import weekendBall from './weekend-ball.png';
import weekendArena from './weekend-arena.png';
import weekendBathhouse from './weekend-bathhouse.png';
import weekendHorseRide from './weekend-horse-ride.png';
import weekendArchery from './weekend-archery.png';
import weekendFortuneTeller from './weekend-fortune-teller.png';
import weekendFishing from './weekend-fishing.png';
import weekendBanquet from './weekend-banquet.png';
import weekendMagicShow from './weekend-magic-show.png';
import weekendSpa from './weekend-spa.png';
import weekendHunting from './weekend-hunting.png';
import weekendBoat from './weekend-boat.png';
import weekendDance from './weekend-dance.png';
import weekendCardGame from './weekend-card-game.png';
import weekendCampfire from './weekend-campfire.png';
import weekendPicnic from './weekend-picnic.png';
import weekendMarket from './weekend-market.png';
import weekendScrying from './weekend-scrying.png';
import weekendCooking from './weekend-cooking.png';
import weekendStudy from './weekend-study.png';
import weekendWalk from './weekend-walk.png';
import weekendNap from './weekend-nap.png';
import weekendFeast from './weekend-feast.png';
import weekendStreetFood from './weekend-street-food.png';
import weekendRiverCruise from './weekend-river-cruise.png';
import weekendGardening from './weekend-gardening.png';
import weekendTavern from './weekend-tavern.png';
import weekendMuseum from './weekend-museum.png';

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
  'stray-dog': strayDog,
  'aggressive-stray-dog': strayDog,
  'injured-traveler': injuredTraveler,
  'old-map': oldMap,
  'old-map-fragment': oldMap,

  // Festival Events
  'harvest-festival': harvestFestival,
  'winter-solstice': winterSolstice,
  'spring-tournament': springTournament,
  'midsummer-fair': midsummerFair,

  // Weekend Activity Events — ticket weekends
  'ticket-jousting': weekendJousting,
  'ticket-theatre': weekendTheatre,
  'ticket-bard-concert': weekendBardConcert,

  // Weekend Activity Events — durable weekends
  'scrying-weekend': weekendScrying,
  'memory-weekend': weekendScrying,
  'music-weekend': weekendBardConcert,
  'cooking-weekend': weekendCooking,
  'study-weekend': weekendStudy,

  // Weekend Activity Events — random weekends
  'rw-walk': weekendWalk,
  'rw-fishing': weekendFishing,
  'rw-market-browse': weekendMarket,
  'rw-street-food': weekendStreetFood,
  'rw-nap': weekendNap,
  'rw-people-watch': weekendWalk,
  'rw-card-game': weekendCardGame,
  'rw-gardening': weekendGardening,
  'rw-tavern-ale': weekendTavern,
  'rw-campfire': weekendCampfire,
  'rw-feast': weekendFeast,
  'rw-horse-ride': weekendHorseRide,
  'rw-archery': weekendArchery,
  'rw-fortune-teller': weekendFortuneTeller,
  'rw-bathhouse': weekendBathhouse,
  'rw-arena': weekendArena,
  'rw-river-cruise': weekendRiverCruise,
  'rw-dance': weekendDance,
  'rw-museum': weekendMuseum,
  'rw-picnic': weekendPicnic,
  'rw-ball': weekendBall,
  'rw-spa': weekendSpa,
  'rw-hunting': weekendHunting,
  'rw-yacht': weekendBoat,
  'rw-banquet': weekendBanquet,
  'rw-magic-show': weekendMagicShow,
  'rw-stayed-home': weekendNap,
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
  'weekend': weekendFeast,
  'festival': harvestFestival,
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
