// Guild Life - Dungeon Encounter Data
// All encounter definitions for floors 1-5, including bosses

import type { DungeonEncounter } from './types';

// ============================================================
// Floor 1: Entrance Cavern
// ============================================================

export const FLOOR_1_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f1-rats',
    name: 'Giant Rats',
    description: 'A swarm of oversized rats blocks the passage.',
    type: 'combat',
    difficulty: 'easy',
    basePower: 10,
    baseDamage: 8,
    baseGold: 8,
    flavorText: 'Squeaking fills the tunnel as red eyes glint in the darkness.',
  },
  {
    id: 'f1-bats',
    name: 'Cave Bats',
    description: 'A cloud of screeching bats swoops down from the ceiling.',
    type: 'combat',
    difficulty: 'easy',
    basePower: 8,
    baseDamage: 7,
    baseGold: 5,
    flavorText: 'Leathery wings beat the stale air as the bats descend.',
  },
  {
    id: 'f1-treasure',
    name: 'Abandoned Chest',
    description: 'An old wooden chest sits in an alcove, covered in cobwebs.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 15,
    flavorText: 'The chest creaks open, revealing a small cache of forgotten coins.',
  },
  {
    id: 'f1-spring',
    name: 'Healing Spring',
    description: 'A glowing pool of crystal-clear water bubbles from the rock.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -10,  // Negative = healing
    baseGold: 0,
    flavorText: 'The water shimmers with a faint golden light. You feel restored.',
  },
];

export const FLOOR_1_BOSS: DungeonEncounter = {
  id: 'f1-boss-rat-king',
  name: 'The Rat King',
  description: 'A massive rodent, twice the size of a man, with a crown of twisted bones.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 18,
  baseDamage: 15,
  baseGold: 25,
  flavorText: 'The Rat King screeches, its minions scattering as it charges forward!',
};

// ============================================================
// Floor 2: Goblin Tunnels
// ============================================================

export const FLOOR_2_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f2-goblin-scouts',
    name: 'Goblin Scouts',
    description: 'A pair of goblins wielding crude daggers leap from the shadows.',
    type: 'combat',
    difficulty: 'medium',
    basePower: 22,
    baseDamage: 15,
    baseGold: 15,
    flavorText: 'The goblins cackle as they circle, looking for an opening.',
  },
  {
    id: 'f2-pit-trap',
    name: 'Pit Trap',
    description: 'The floor gives way beneath you — a spiked pit!',
    type: 'trap',
    difficulty: 'medium',
    basePower: 0,
    baseDamage: 18,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Dust clouds rise as stones crumble. Trade Guild training spots the trigger plates.',
  },
  {
    id: 'f2-goblin-warriors',
    name: 'Goblin Warriors',
    description: 'Three goblins in makeshift armor block a narrow bridge.',
    type: 'combat',
    difficulty: 'medium',
    basePower: 28,
    baseDamage: 18,
    baseGold: 20,
    flavorText: 'The goblins bang their shields and howl a war cry.',
  },
  {
    id: 'f2-treasure-cache',
    name: 'Goblin Treasure Cache',
    description: 'A pile of stolen goods and coins, poorly hidden behind barrels.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 25,
    flavorText: 'The goblins\' ill-gotten gains. Finders keepers.',
  },
  {
    id: 'f2-mushroom-grotto',
    name: 'Mushroom Grotto',
    description: 'A hidden alcove filled with glowing mushrooms and a dripping spring.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -8,
    baseGold: 0,
    flavorText: 'The air here is damp and earthy. The mushrooms glow softly, easing your wounds.',
  },
];

export const FLOOR_2_BOSS: DungeonEncounter = {
  id: 'f2-boss-goblin-chief',
  name: 'Goblin Chieftain',
  description: 'A hulking goblin in stolen chainmail, wielding a notched greataxe.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 35,
  baseDamage: 25,
  baseGold: 45,
  flavorText: 'The Chieftain roars, slamming his axe against the stone floor, sparks flying!',
};

// ============================================================
// Floor 3: Undead Crypt
// ============================================================

export const FLOOR_3_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f3-skeletons',
    name: 'Skeletal Warriors',
    description: 'Bones rattle as ancient warriors rise from their stone tombs.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 40,
    baseDamage: 25,
    baseGold: 30,
    flavorText: 'Hollow eye sockets glow with pale blue fire as the dead march.',
  },
  {
    id: 'f3-ghosts',
    name: 'Restless Ghosts',
    description: 'Translucent figures drift through the walls, wailing in anguish.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 35,
    baseDamage: 28,
    baseGold: 35,
    requiresArcane: true,
    flavorText: 'Their touch drains warmth from your body. Arcane knowledge reveals their weakness.',
  },
  {
    id: 'f3-poison-trap',
    name: 'Poison Gas Trap',
    description: 'Ancient mechanisms release a cloud of noxious green gas.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 22,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Hissing sounds from the walls. Quick hands could disable the mechanism.',
  },
  {
    id: 'f3-ancient-artifacts',
    name: 'Ancient Artifact Cache',
    description: 'A sealed chamber filled with relics from a forgotten age.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 50,
    flavorText: 'Gold coins with unfamiliar faces and jeweled trinkets catch the torchlight.',
  },
  {
    id: 'f3-sanctified-pool',
    name: 'Sanctified Pool',
    description: 'A stone basin of blessed water, untouched by the crypt\'s corruption.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -12,
    baseGold: 0,
    flavorText: 'Holy light radiates from the water. Its warmth pushes back the chill of the dead.',
  },
];

export const FLOOR_3_BOSS: DungeonEncounter = {
  id: 'f3-boss-lich',
  name: 'The Crypt Lich',
  description: 'A skeletal mage in tattered robes, dark energy crackling between its fingers.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 55,
  baseDamage: 38,
  baseGold: 80,
  requiresArcane: true,
  flavorText: 'The Lich speaks in a language dead for centuries, raising its staff high!',
};

// ============================================================
// Floor 4: Dragon's Lair
// ============================================================

export const FLOOR_4_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f4-young-dragon',
    name: 'Young Dragon',
    description: 'A juvenile dragon, scales gleaming like polished copper.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 60,
    baseDamage: 40,
    baseGold: 60,
    flavorText: 'The dragon rears back, smoke curling from its nostrils.',
  },
  {
    id: 'f4-fire-trap',
    name: 'Dragon Fire Vent',
    description: 'Jets of flame erupt from cracks in the volcanic rock.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 35,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'The air shimmers with heat. Natural vents — or deliberate defenses?',
  },
  {
    id: 'f4-drake-pack',
    name: 'Drake Pack',
    description: 'A group of smaller drakes, coordinating their attacks.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 55,
    baseDamage: 35,
    baseGold: 50,
    flavorText: 'The drakes circle, snapping their jaws, herding you toward a wall.',
  },
  {
    id: 'f4-dragon-hoard',
    name: 'Dragon Hoard',
    description: 'A massive pile of gold and gems, left behind by a departed wyrm.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 100,
    flavorText: 'Mountains of gold coins, gemstones, and enchanted trinkets glitter in the firelight.',
  },
];

export const FLOOR_4_BOSS: DungeonEncounter = {
  id: 'f4-boss-elder-dragon',
  name: 'Elder Dragon',
  description: 'An ancient dragon, its scales scarred from centuries of battle.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 80,
  baseDamage: 55,
  baseGold: 150,
  flavorText: 'The Elder Dragon unfurls its wings, filling the cavern. Its roar shakes the earth!',
};

// ============================================================
// Floor 5: The Abyss
// ============================================================

export const FLOOR_5_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f5-demon-soldiers',
    name: 'Demon Soldiers',
    description: 'Twisted fiends in black iron armor, wreathed in dark flame.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 80,
    baseDamage: 55,
    baseGold: 100,
    flavorText: 'The demons speak in a tongue that makes your head throb.',
  },
  {
    id: 'f5-void-trap',
    name: 'Void Rift',
    description: 'A tear in reality threatens to pull you into the void.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 50,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Space warps and bends. A careful hand can seal the rift.',
  },
  {
    id: 'f5-shadow-fiends',
    name: 'Shadow Fiends',
    description: 'Living shadows that coalesce into nightmarish forms.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 75,
    baseDamage: 50,
    baseGold: 80,
    requiresArcane: true,
    flavorText: 'The darkness itself attacks, tendrils of shadow lashing out.',
  },
  {
    id: 'f5-abyssal-vault',
    name: 'Abyssal Vault',
    description: 'A vault sealed by demonic runes, overflowing with cursed treasure.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 200,
    flavorText: 'The runes fade as you approach. Inside: riches beyond imagination.',
  },
];

export const FLOOR_5_BOSS: DungeonEncounter = {
  id: 'f5-boss-demon-lord',
  name: 'Azrathor the Demon Lord',
  description: 'A towering demon prince, reality distorting around his presence.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 110,
  baseDamage: 75,
  baseGold: 300,
  requiresArcane: true,
  flavorText: 'Azrathor laughs, his voice echoing from every direction. "You dare enter MY domain?"',
};
