// Guild Life - Dungeon Encounter Data
// All encounter definitions for floors 1-6, including bosses and mini-bosses

import type { DungeonEncounter, MiniBoss } from './types';

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
    flavorText: 'Squeaking fills the tunnel as red eyes glint in the darkness. These rats pay no rent and yet here they are.',
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
    flavorText: 'Leathery wings beat the stale air as the bats descend. They\'re just as surprised to see you as you are to see them. Possibly more annoyed.',
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
    flavorText: 'The chest creaks open, revealing a small cache of forgotten coins. Someone had a very bad day here. Your gain, their loss. Literally.',
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
    flavorText: 'The water shimmers with a faint golden light. You feel restored. It tastes like Tuesday, which is oddly specific.',
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
  flavorText: 'The Rat King screeches, its minions scattering as it charges forward! It has a crown. A CROWN. The rats have more organized governance than most cities.',
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
    flavorText: 'The goblins cackle as they circle, looking for an opening. They share one brain cell between them and it\'s not their turn to use it.',
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
    flavorText: 'Dust clouds rise as stones crumble. Trade Guild training spots the trigger plates. Who builds these things? Is there a trap-building degree?',
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
    flavorText: 'The goblins bang their shields and howl what they believe is an intimidating war cry. It sounds like a cat being given a bath.',
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
    flavorText: 'The goblins\' ill-gotten gains. Finders keepers. It\'s not stealing if you steal from thieves. That\'s just redistribution.',
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
    flavorText: 'The air here is damp and earthy. The mushrooms glow softly, easing your wounds. Don\'t eat the blue ones. Don\'t ask why.',
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
  flavorText: 'The Chieftain roars, slamming his axe against the stone floor, sparks flying! He\'s been practicing that move. You can tell.',
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
    flavorText: 'Hollow eye sockets glow with pale blue fire as the dead march. They\'re dead, but they still have better posture than you.',
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
    flavorText: 'Their touch drains warmth from your body. Arcane knowledge reveals their weakness: they can\'t handle being ignored. Nobody can, really.',
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
    flavorText: 'Hissing sounds from the walls. Quick hands could disable the mechanism. Slow hands will learn an important lesson about poison.',
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
    flavorText: 'Gold coins with unfamiliar faces and jeweled trinkets catch the torchlight. Dead people have the best stuff.',
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
    flavorText: 'Holy light radiates from the water. Its warmth pushes back the chill of the dead. It tastes like forgiveness. And a hint of mint.',
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
  flavorText: 'The Lich speaks in a language dead for centuries, raising its staff high! It\'s monologuing. They always monologue. Use this time wisely.',
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
    flavorText: 'The dragon rears back, smoke curling from its nostrils. It\'s a teenager, technically. All the fire, none of the wisdom.',
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
    flavorText: 'The air shimmers with heat. Natural vents — or deliberate defenses? Either way, your eyebrows are at risk.',
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
    flavorText: 'The drakes circle, snapping their jaws, herding you toward a wall. They work together better than most adventuring parties.',
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
    flavorText: 'Mountains of gold coins, gemstones, and enchanted trinkets glitter in the firelight. You briefly consider a career change to "dragon."',
  },
  // M12 FIX: Add healing encounter to Floor 4 (was missing, creating inverted difficulty curve)
  {
    id: 'f4-dragon-tear-pool',
    name: 'Dragon Tear Pool',
    description: 'A pool of crystallized dragon tears, warm to the touch and faintly glowing.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -14,
    baseGold: 0,
    flavorText: 'The liquid is warm and tastes of copper and sunlight. Dragon tears are renowned for their healing properties. Also their rarity, since dragons rarely cry. Except during tax season.',
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
  flavorText: 'The Elder Dragon unfurls its wings, filling the cavern. Its roar shakes the earth! It has seen empires rise and fall. It is unimpressed by you.',
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
    flavorText: 'The demons speak in a tongue that makes your head throb. You catch the word "overtime." Even demons have work complaints.',
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
    flavorText: 'Space warps and bends. A careful hand can seal the rift. An careless hand will discover what\'s on the other side. Spoiler: nothing good.',
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
    flavorText: 'The darkness itself attacks, tendrils of shadow lashing out. Your nightlight at home is looking increasingly like a sound investment.',
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
    flavorText: 'The runes fade as you approach. Inside: riches beyond imagination. Also beyond common sense, since it was guarded by demons.',
  },
  // M12 FIX: Add healing encounter to Floor 5 (was missing, creating inverted difficulty curve)
  {
    id: 'f5-void-well',
    name: 'Void Well',
    description: 'A rift of inverted darkness that paradoxically radiates warmth and restoration.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -16,
    baseGold: 0,
    flavorText: 'The void whispers comfort as it mends your wounds. Healing from literal nothingness. The universe has a strange sense of humor.',
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
  flavorText: 'Azrathor laughs, his voice echoing from every direction. "You dare enter MY domain?" He\'s been rehearsing that. You can tell by the dramatic echo.',
};

// ============================================================
// Floor 6: The Forgotten Temple
// ============================================================

export const FLOOR_6_ENCOUNTERS: DungeonEncounter[] = [
  {
    id: 'f6-temple-guardians',
    name: 'Temple Guardians',
    description: 'Animated stone statues, eyes blazing with divine fire, stand eternal watch.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 100,
    baseDamage: 70,
    baseGold: 120,
    flavorText: 'The statues grind to life, their stone swords humming with ancient power. They\'ve been standing there for millennia. They\'re extremely grumpy about being woken up.',
  },
  {
    id: 'f6-divine-ward',
    name: 'Divine Ward',
    description: 'A barrier of pure light sears all who pass without knowledge of the old ways.',
    type: 'trap',
    difficulty: 'hard',
    basePower: 0,
    baseDamage: 60,
    baseGold: 0,
    isDisarmable: true,
    flavorText: 'Runes flare across the corridor. Only those trained in ancient lore can deactivate them. Everyone else gets a very enlightening experience. Literally.',
  },
  {
    id: 'f6-spectral-priests',
    name: 'Spectral High Priests',
    description: 'The ghosts of the temple\'s clergy, still performing their rituals in death.',
    type: 'combat',
    difficulty: 'hard',
    basePower: 95,
    baseDamage: 65,
    baseGold: 100,
    requiresArcane: true,
    flavorText: 'They chant in unison, each syllable a wave of spectral force. Thousands of years dead and they\'re still doing their job. Now THAT\'S dependability.',
  },
  {
    id: 'f6-temple-reliquary',
    name: 'Temple Reliquary',
    description: 'A sealed chamber of sacred artifacts, untouched for millennia.',
    type: 'treasure',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: 0,
    baseGold: 250,
    flavorText: 'Gold chalices, gem-encrusted icons, and sacred texts fill every shelf. A museum would weep. You weep too, but for different reasons.',
  },
  {
    id: 'f6-sanctum-font',
    name: 'Sanctum Font',
    description: 'A font of sacred water, still blessed after centuries of neglect.',
    type: 'healing',
    difficulty: 'easy',
    basePower: 0,
    baseDamage: -18,
    baseGold: 0,
    flavorText: 'The water glows with warm golden light. Your wounds close as you drink. This is the good stuff. Premium divine tap water.',
  },
];

export const FLOOR_6_BOSS: DungeonEncounter = {
  id: 'f6-boss-the-archon',
  name: 'The Archon',
  description: 'An immortal being of divine wrath, the last guardian of the Forgotten Temple. Wings of light and a crown of stars.',
  type: 'boss',
  difficulty: 'boss',
  basePower: 140,
  baseDamage: 95,
  baseGold: 500,
  requiresArcane: true,
  flavorText: '"You have read the ancient texts. You know what I am. KNEEL, or be unmade." It pauses for dramatic effect. Full marks for presentation.',
};

// ============================================================
// Mini-Bosses (wandering bosses, 15% chance on re-runs)
// Each floor has its own mini-boss themed to that floor
// ============================================================

export const MINI_BOSSES: Record<number, MiniBoss> = {
  1: {
    id: 'mb-cave-troll',
    name: 'Cave Troll',
    description: 'A lumbering troll that has wandered into the upper caverns.',
    flavorText: 'The ground shakes with each step. It smells you before it sees you. In fairness, you haven\'t bathed since floor one.',
    basePower: 14,
    baseDamage: 12,
    baseGold: 20,
  },
  2: {
    id: 'mb-goblin-shaman',
    name: 'Goblin Shaman',
    description: 'A goblin witch doctor, crackling with stolen magic.',
    flavorText: 'Bones rattle on its staff as it speaks words of power. For a goblin, it has surprisingly good diction.',
    basePower: 28,
    baseDamage: 20,
    baseGold: 35,
    requiresArcane: true,
  },
  3: {
    id: 'mb-death-knight',
    name: 'Death Knight',
    description: 'A fallen paladin, armored in black plate and wielding a cursed blade.',
    flavorText: 'Its hollow laugh echoes through the crypt as it draws its sword. Former paladin. Fell from grace. Still has great dental, though.',
    basePower: 45,
    baseDamage: 32,
    baseGold: 65,
  },
  4: {
    id: 'mb-drake-matriarch',
    name: 'Drake Matriarch',
    description: 'The mother of the drake pack, larger and fiercer than any other.',
    flavorText: 'She spreads her wings wide, shielding her brood. You must go through her. She has the look of a mother who hasn\'t slept in weeks. Terrifying.',
    basePower: 65,
    baseDamage: 45,
    baseGold: 120,
  },
  5: {
    id: 'mb-void-reaver',
    name: 'Void Reaver',
    description: 'A creature born from the gaps between planes, all teeth and claws.',
    flavorText: 'Reality tears open and something wrong crawls through. It exists in ways that geometry objects to.',
    basePower: 90,
    baseDamage: 60,
    baseGold: 200,
    requiresArcane: true,
  },
  6: {
    id: 'mb-fallen-archon',
    name: 'Fallen Archon',
    description: 'A lesser archon, corrupted by centuries of isolation in the temple.',
    flavorText: 'Its wings are tattered, its halo cracked. But its fury is undiminished. Millennia of isolation does things to a divine being\'s temperament.',
    basePower: 115,
    baseDamage: 75,
    baseGold: 350,
    requiresArcane: true,
  },
};
