// Auto-generated item image imports
// All AI-generated 512×512 item icons for the game

// Weapons
import dagger from './dagger.jpg';
import sword from './sword.jpg';
import steelSword from './steel-sword.jpg';
import enchantedBlade from './enchanted-blade.jpg';

// Armor
import leatherArmor from './leather-armor.jpg';
import chainmail from './chainmail.jpg';
import plateArmor from './plate-armor.jpg';
import enchantedPlate from './enchanted-plate.jpg';

// Shields
import shield from './shield.jpg';
import ironShield from './iron-shield.jpg';
import towerShield from './tower-shield.jpg';
import dragonScaleShield from './dragon-scale-shield.jpg';

// Food
import bread from './bread.jpg';
import cheese from './cheese.jpg';
import freshVegetables from './fresh-vegetables.jpg';
import freshMeat from './fresh-meat.jpg';
import freshProvisions from './fresh-provisions.jpg';
import mysteryMeat from './mystery-meat.jpg';

// Tavern
import ale from './ale.jpg';
import stew from './stew.jpg';
import roast from './roast.jpg';

// Clothing (6 items: 2 casual, 2 dress, 2 business)
import peasantGarb from './peasant-garb.jpg';
import commonClothes from './common-clothes.jpg'; // Reused for common-tunic
import fineClothes from './fine-clothes.jpg';
import nobleAttire from './noble-attire.jpg';
import guildUniform from './guild-uniform.jpg'; // Reused for guild-vestments

// Appliances
import scryingMirror from './scrying-mirror.jpg';
import simpleScryingGlass from './simple-scrying-glass.jpg';
import memoryCrystal from './memory-crystal.jpg';
import musicBox from './music-box.jpg';
import cookingFire from './cooking-fire.jpg';
import preservationBox from './preservation-box.jpg';
import frostChest from './frost-chest.jpg';
import arcaneTome from './arcane-tome.jpg';

// Magic Items
import glowOrb from './glow-orb.jpg';
import warmthStone from './warmth-stone.jpg';
import healingPotion from './healing-potion.jpg';

// Durables
import candles from './candles.jpg';
import blanket from './blanket.jpg';
import furniture from './furniture.jpg';

// Shadow Market
import stolenGoods from './stolen-goods.jpg';
import marketIntel from './market-intel.jpg';

// Tickets
import lotteryTicket from './lottery-ticket.jpg';
import joustingTicket from './jousting-ticket.jpg';
import theatreTicket from './theatre-ticket.jpg';
import bardConcertTicket from './bard-concert-ticket.jpg';

// Scholar Items
import encyclopedia from './encyclopedia.jpg';
import dictionary from './dictionary.jpg';
import atlas from './atlas.jpg';

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
  'fresh-vegetables': freshVegetables,
  'fresh-meat': freshMeat,
  'fresh-provisions': freshProvisions,
  'mystery-meat': mysteryMeat,

  // Tavern
  'ale': ale,
  'stew': stew,
  'roast': roast,

  // Clothing (Jones-style 3-tier: casual/dress/business)
  'peasant-garb': peasantGarb,
  'common-tunic': commonClothes,
  'fine-clothes': fineClothes,
  'merchants-attire': fineClothes,     // Reuse fine-clothes image for now
  'noble-attire': nobleAttire,
  'guild-vestments': guildUniform,

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
