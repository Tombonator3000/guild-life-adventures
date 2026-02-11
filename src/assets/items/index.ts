// Auto-generated item image imports
// All AI-generated 512×512 item icons for the game

// Weapons
import dagger from './dagger.png';
import sword from './sword.png';
import steelSword from './steel-sword.png';
import enchantedBlade from './enchanted-blade.png';

// Armor
import leatherArmor from './leather-armor.png';
import chainmail from './chainmail.png';
import plateArmor from './plate-armor.png';
import enchantedPlate from './enchanted-plate.png';

// Shields
import shield from './shield.png';
import ironShield from './iron-shield.png';
import towerShield from './tower-shield.png';
import dragonScaleShield from './dragon-scale-shield.png';

// Food
import bread from './bread.png';
import cheese from './cheese.png';
import meat from './meat.png';
import provisions from './provisions.png';
import feast from './feast.png';
import freshVegetables from './fresh-vegetables.png';
import freshMeat from './fresh-meat.png';
import freshProvisions from './fresh-provisions.png';
import mysteryMeat from './mystery-meat.png';

// Tavern
import ale from './ale.png';
import stew from './stew.png';
import roast from './roast.png';

// Clothing
import peasantGarb from './peasant-garb.png';
import commonClothes from './common-clothes.png';
import fineClothes from './fine-clothes.png';
import nobleAttire from './noble-attire.png';
import guildUniform from './guild-uniform.png';

// Appliances
import scryingMirror from './scrying-mirror.png';
import simpleScryingGlass from './simple-scrying-glass.png';
import memoryCrystal from './memory-crystal.png';
import musicBox from './music-box.png';
import cookingFire from './cooking-fire.png';
import preservationBox from './preservation-box.png';
import frostChest from './frost-chest.png';
import arcaneTome from './arcane-tome.png';

// Magic Items
import glowOrb from './glow-orb.png';
import warmthStone from './warmth-stone.png';
import healingPotion from './healing-potion.png';

// Durables
import candles from './candles.png';
import blanket from './blanket.png';
import furniture from './furniture.png';

// Shadow Market
import stolenGoods from './stolen-goods.png';
import marketIntel from './market-intel.png';

// Tickets
import lotteryTicket from './lottery-ticket.png';
import joustingTicket from './jousting-ticket.png';
import theatreTicket from './theatre-ticket.png';
import bardConcertTicket from './bard-concert-ticket.png';

// Scholar Items
import encyclopedia from './encyclopedia.png';
import dictionary from './dictionary.png';
import atlas from './atlas.png';

/** Map item IDs to their AI-generated images */
export const ITEM_IMAGES: Record<string, string> = {
  // Weapons
  'dagger': dagger,
  'sword': sword,
  'steel-sword': steelSword,
  'enchanted-blade': enchantedBlade,

  // Armor
  'leather-armor': leatherArmor,
  'chainmail': chainmail,
  'plate-armor': plateArmor,
  'enchanted-plate': enchantedPlate,

  // Shields
  'shield': shield,
  'iron-shield': ironShield,
  'tower-shield': towerShield,
  'dragon-scale-shield': dragonScaleShield,

  // Food
  'bread': bread,
  'cheese': cheese,
  'meat': meat,
  'provisions': provisions,
  'feast': feast,
  'fresh-vegetables': freshVegetables,
  'fresh-meat': freshMeat,
  'fresh-provisions': freshProvisions,
  'mystery-meat': mysteryMeat,

  // Tavern
  'ale': ale,
  'stew': stew,
  'roast': roast,

  // Clothing
  'peasant-garb': peasantGarb,
  'common-clothes': commonClothes,
  'fine-clothes': fineClothes,
  'noble-attire': nobleAttire,
  'guild-uniform': guildUniform,

  // Appliances
  'scrying-mirror': scryingMirror,
  'simple-scrying-glass': simpleScryingGlass,
  'memory-crystal': memoryCrystal,
  'music-box': musicBox,
  'cooking-fire': cookingFire,
  'preservation-box': preservationBox,
  'frost-chest': frostChest,
  'arcane-tome': arcaneTome,

  // Magic Items
  'glow-orb': glowOrb,
  'warmth-stone': warmthStone,
  'healing-potion': healingPotion,

  // Durables
  'candles': candles,
  'blanket': blanket,
  'stereo': musicBox, // Music Box in General Store uses same image
  'furniture': furniture,

  // Shadow Market
  'stolen-goods': stolenGoods,
  'black-market-intel': marketIntel,

  // Tickets
  'lottery-ticket': lotteryTicket,
  'jousting-ticket': joustingTicket,
  'theatre-ticket': theatreTicket,
  'bard-concert-ticket': bardConcertTicket,

  // Scholar Items
  'encyclopedia': encyclopedia,
  'dictionary': dictionary,
  'atlas': atlas,
};

/** Get image URL for an item ID, returns undefined if no image exists */
export function getItemImage(itemId: string): string | undefined {
  return ITEM_IMAGES[itemId];
}
