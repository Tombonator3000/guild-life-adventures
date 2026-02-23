// Guild Life - Quest System Data

import type { QuestRank, GuildRank, EducationPath, LocationId } from '@/types/game.types';
import { GUILD_RANK_ORDER } from '@/types/game.types';

/** A single location stop the player must visit to advance or complete a quest */
export interface LocationObjective {
  /** Unique ID used to track completion in player.questLocationProgress */
  id: string;
  /** Board location the player must travel to */
  locationId: LocationId;
  /** Short verb phrase shown on the action button, e.g. "Gather Herbs" */
  actionText: string;
  /** One-liner shown in LocationPanel to explain what to do here */
  description: string;
  /** Flavour text displayed as a toast when the objective is completed */
  completionText: string;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  /** Variant descriptions — a random one is shown each time the quest appears */
  descriptionVariants?: string[];
  rank: QuestRank;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
  requiredEducation?: {
    path: EducationPath;
    level: number;
  };
  requiredItem?: string;
  /** Requires specific dungeon floor to be cleared */
  requiresDungeonFloor?: number;
  /** Requires ALL dungeon floors to be cleared */
  requiresAllDungeonFloors?: boolean;
  /**
   * Location-based objectives (LOQ). When defined, the player must visit each
   * listed location in order and complete the action there before the quest can
   * be handed in at the Guild Hall. Quests without this field work as before.
   */
  locationObjectives?: LocationObjective[];
}

/** Pick a random quest description variant or fall back to the default */
export function pickQuestDescription(quest: Quest): string {
  if (quest.descriptionVariants && quest.descriptionVariants.length > 0) {
    return quest.descriptionVariants[Math.floor(Math.random() * quest.descriptionVariants.length)];
  }
  return quest.description;
}

// Quest rank to guild rank requirements
export const QUEST_RANK_REQUIREMENTS: Record<QuestRank, GuildRank> = {
  'E': 'novice',
  'D': 'apprentice',
  'C': 'journeyman',
  'B': 'adept',
  'A': 'veteran',
  'S': 'elite',
};

// Quest rank display info
export const QUEST_RANK_INFO: Record<QuestRank, { name: string; color: string }> = {
  'E': { name: 'E-Rank', color: 'text-muted-foreground' },
  'D': { name: 'D-Rank', color: 'text-blue-400' },
  'C': { name: 'C-Rank', color: 'text-green-400' },
  'B': { name: 'B-Rank', color: 'text-yellow-400' },
  'A': { name: 'A-Rank', color: 'text-orange-400' },
  'S': { name: 'S-Rank', color: 'text-red-400' },
};

// Quest balance (2026-02-06 rebalance):
// Gold/hour targets per rank, competitive with equivalent-tier jobs:
//   E-rank: ~4.5-5.0 g/hr  (entry-level work = 4.6 g/hr)
//   D-rank: ~5.0-7.0 g/hr  (single-degree work = 6-10 g/hr)
//   C-rank: ~7.5-8.0 g/hr  (multi-degree work = 10-16 g/hr)
//   B-rank: ~10-11 g/hr    (mid-tier work = 14-16 g/hr)
//   A-rank: ~12-13 g/hr    (high-tier work = 18-20 g/hr)
//   S-rank: ~15-17 g/hr    (top-tier work = 22-25 g/hr)
// Quests are never the best pure-gold option (working is),
// but they provide happiness, guild rank, and variety.

export const QUESTS: Quest[] = [
  // E-Rank Quests (beginner) — modest gold, quick completion
  {
    id: 'rat-extermination',
    name: 'Rat Extermination',
    description: 'Clear the tavern cellar of a rat infestation. The rats have organized. They have a union now.',
    descriptionVariants: [
      'Clear the tavern cellar of a rat infestation. The rats have organized. They have a union now.',
      'The tavern\'s rat problem has become a rat situation. The situation has become a rat crisis. Handle it.',
      'Rats in the cellar again. The tavern keeper says there are "a few." The tavern keeper is a liar.',
      'Exterminate the rat colony beneath the Rusty Tankard. They\'ve elected a leader. His name is Whiskers. He must fall.',
    ],
    rank: 'E',
    goldReward: 25,
    timeRequired: 5,
    healthRisk: 5,
    happinessReward: 2,
    locationObjectives: [
      {
        id: 'rat-ext-tavern',
        locationId: 'rusty-tankard',
        actionText: 'Investigate the Cellar',
        description: 'Descend into the tavern cellar to assess the rat situation.',
        completionText: 'The cellar is worse than expected. The rats have fortified positions. One appears to be wearing a tiny helmet. This is organised resistance.',
      },
      {
        id: 'rat-ext-store',
        locationId: 'general-store',
        actionText: 'Buy Rat Traps',
        description: 'Purchase specialised rat traps from the General Store.',
        completionText: 'You acquire the General Store\'s finest rat traps. The merchant throws in a free cheese sample. "For bait," he says. You eat it anyway.',
      },
    ],
  },
  {
    id: 'package-delivery',
    name: 'Package Delivery',
    description: 'Deliver a mysterious package across the city. Don\'t open it. Don\'t shake it. Don\'t ask questions. Standard delivery.',
    descriptionVariants: [
      'Deliver a mysterious package across the city. Don\'t open it. Don\'t shake it. Don\'t ask questions. Standard delivery.',
      'A package needs delivering. It hums. Faintly. Don\'t think about the humming. Just deliver it.',
      'Take this parcel to the Academy. It\'s wrapped in three layers of cloth. Something inside moved. Probably nothing.',
      'Courier service needed: deliver a box that smells faintly of cinnamon and danger. Standard rates apply.',
    ],
    rank: 'E',
    goldReward: 15,
    timeRequired: 3,
    healthRisk: 0,
    happinessReward: 1,
    locationObjectives: [
      {
        id: 'package-delivery-forge',
        locationId: 'forge',
        actionText: 'Pick Up Package',
        description: 'Collect the package from the Forge before delivering it.',
        completionText: 'You collect a heavy, faintly humming package from the Forge. You consider asking what\'s inside. You decide not to. Wise.',
      },
      {
        id: 'package-delivery-academy',
        locationId: 'academy',
        actionText: 'Deliver Package',
        description: 'Deliver the package to the scholars at the Academy.',
        completionText: 'The Academy scholars receive the package with barely-concealed excitement. One whispers "finally." Another pets it. You don\'t ask.',
      },
    ],
  },
  {
    id: 'herb-gathering',
    name: 'Herb Gathering',
    description: 'Collect healing herbs from the city gardens. The gardener will glare at you. This is normal.',
    descriptionVariants: [
      'Collect healing herbs from the city gardens. The gardener will glare at you. This is normal.',
      'The Enchanter needs herbs. Specific herbs. Don\'t bring the wrong ones. The last person who brought the wrong ones turned blue.',
      'Gather medicinal plants from around Guildholm. They\'re green. Some are poisonous. Learn the difference.',
      'Herb gathering for the Academy\'s alchemy lab. The herbs bite sometimes. This is also normal. Apparently.',
    ],
    rank: 'E',
    goldReward: 18,
    timeRequired: 4,
    healthRisk: 0,
    happinessReward: 2,
    locationObjectives: [
      {
        id: 'herb-gathering-cave',
        locationId: 'cave',
        actionText: 'Gather Wild Herbs',
        description: 'Collect medicinal herbs from the cave entrance and surrounding wilderness.',
        completionText: 'You gather a bundle of wild herbs from the cave mouth. The cave mushrooms smell... interesting. You pocket a few extra.',
      },
      {
        id: 'herb-gathering-enchanter',
        locationId: 'enchanter',
        actionText: 'Analyze the Herbs',
        description: 'Have the Enchanter examine and prepare the herbs for delivery.',
        completionText: 'The Enchanter examines your herbs and pronounces them "mostly not poisonous." She bottles the useful ones. The rest she keeps. For "research."',
      },
    ],
  },
  {
    id: 'lost-cat',
    name: 'Find the Lost Cat',
    description: "A noble's prized cat has gone missing. The cat is not lost. The cat is exactly where it wants to be.",
    descriptionVariants: [
      "A noble's prized cat has gone missing. The cat is not lost. The cat is exactly where it wants to be.",
      "Lady Pemberton's cat has escaped. Again. The cat has a better social life than most adventurers.",
      "Find a noble's missing cat. Reward offered. The cat is described as 'precious.' The cat describes itself as 'independent.'",
      "A pampered feline has vanished from Noble Heights. It was last seen judging passersby from a rooftop. Typical cat behaviour.",
    ],
    rank: 'E',
    goldReward: 30,
    timeRequired: 6,
    healthRisk: 0,
    happinessReward: 3,
    locationObjectives: [
      {
        id: 'lost-cat-tavern',
        locationId: 'rusty-tankard',
        actionText: 'Ask About the Cat',
        description: 'Check if anyone at the tavern has spotted the missing cat.',
        completionText: 'The barkeeper saw a haughty cat leave yesterday. "It paid for its own drink," he says. "Class act." You note the cat\'s direction.',
      },
      {
        id: 'lost-cat-market',
        locationId: 'shadow-market',
        actionText: 'Search the Alleys',
        description: 'Search the back alleys of the Shadow Market for signs of the cat.',
        completionText: 'You find cat fur, a chewed fish bone, and three suspicious merchants who refuse to make eye contact. The cat was definitely here.',
      },
      {
        id: 'lost-cat-home',
        locationId: 'landlord',
        actionText: 'Ask the Landlord',
        description: 'Ask the Landlord if the cat wandered back to Noble Heights on its own.',
        completionText: 'The Landlord sighs. "That cat? It\'s been sitting on a velvet cushion upstairs all day, judging my tenants." It was never lost. It was on holiday.',
      },
    ],
  },

  // D-Rank Quests — solid income, some risk
  {
    id: 'escort-merchant',
    name: 'Escort Merchant',
    description: 'Protect a merchant traveling to the next district. He talks. A lot. Combat is the easy part.',
    descriptionVariants: [
      'Protect a merchant traveling to the next district. He talks. A lot. Combat is the easy part.',
      'Escort a nervous merchant through bandit territory. The bandits are dangerous. The merchant\'s stories are worse.',
      'A merchant needs protection for a trade run. He\'ll pay well. He\'ll also tell you about his childhood. Brace yourself.',
      'Bodyguard duty for a travelling merchant. Risk: moderate. Boredom from his anecdotes: extreme.',
    ],
    rank: 'D',
    goldReward: 50,
    timeRequired: 10,
    healthRisk: 10,
    happinessReward: 3,
    requiredEducation: { path: 'fighter', level: 1 },
    locationObjectives: [
      {
        id: 'escort-merchant-tavern',
        locationId: 'rusty-tankard',
        actionText: 'Meet the Merchant',
        description: 'Rendezvous with the merchant at the Rusty Tankard before setting off.',
        completionText: 'You find Gerald the merchant deep into a story about his cousin\'s turnip farm. You\'ve already heard too much. Escorting begins.',
      },
      {
        id: 'escort-merchant-bank',
        locationId: 'bank',
        actionText: 'Escort to the Bank',
        description: 'Safely escort the merchant and his goods to the Bank.',
        completionText: 'Gerald and his gold arrive at the Bank intact. He\'s still talking about turnips. You\'re paid regardless. Worth it.',
      },
    ],
  },
  {
    id: 'guard-duty',
    name: 'Guard Duty',
    description: 'Stand watch at the city gates overnight. Nothing will happen. You\'ll still be exhausted. Welcome to guard duty.',
    descriptionVariants: [
      'Stand watch at the city gates overnight. Nothing will happen. You\'ll still be exhausted. Welcome to guard duty.',
      'Night watch at the gates. Eight hours of staring into darkness. The darkness stares back. Then it gets bored.',
      'Guard the city gates from dusk to dawn. The exciting part is staying awake. Nobody has managed yet.',
      'Overnight sentry duty. You\'ll see nothing, hear nothing, and be paid for the privilege of boredom.',
    ],
    rank: 'D',
    goldReward: 42,
    timeRequired: 6,
    healthRisk: 5,
    happinessReward: 2,
    locationObjectives: [
      {
        id: 'guard-duty-armory',
        locationId: 'armory',
        actionText: 'Collect Guard Equipment',
        description: 'Pick up your guard-issue lantern and halberd from the Armory.',
        completionText: 'The armourer hands you a dented lantern and a halberd that\'s seen better decades. "Standard issue," he says. Standards are low.',
      },
      {
        id: 'guard-duty-gate',
        locationId: 'landlord',
        actionText: 'Report for Duty',
        description: 'Report to the city gate near the Landlord\'s Office for your night shift.',
        completionText: 'You stand watch for eight hours. A fox passes by. A drunk argues with a wall. The wall wins. Shift complete.',
      },
    ],
  },
  {
    id: 'courier-run',
    name: 'Urgent Courier Run',
    description: 'Deliver time-sensitive documents across the kingdom. "Time-sensitive" means "should have been sent last week."',
    descriptionVariants: [
      'Deliver time-sensitive documents across the kingdom. "Time-sensitive" means "should have been sent last week."',
      'Rush delivery of sealed documents. The seal says "URGENT." The date says "two weeks ago." Priorities.',
      'A diplomatic courier run. The documents are important. How important? Nobody will tell you. That level of important.',
      'Deliver papers to a distant outpost. Fast. The sender stressed "fast" three times. While handing you a map drawn by a child.',
    ],
    rank: 'D',
    goldReward: 40,
    timeRequired: 8,
    healthRisk: 5,
    happinessReward: 2,
    locationObjectives: [
      {
        id: 'courier-run-bank',
        locationId: 'bank',
        actionText: 'Collect the Documents',
        description: 'Pick up the sealed documents from the Bank Clerk before delivery.',
        completionText: 'You collect a sealed bundle stamped "URGENT" three times. The date on the seal says two weeks ago. You don\'t mention this.',
      },
      {
        id: 'courier-run-academy',
        locationId: 'academy',
        actionText: 'Deliver Documents',
        description: 'Deliver the sealed documents to the Academy administrators.',
        completionText: 'The Academy receives the documents with visible relief. "We\'ve been waiting weeks," they say. You nod. You don\'t ask why they didn\'t send for them sooner.',
      },
    ],
  },

  // C-Rank Quests — good rewards for competent adventurers
  {
    id: 'bandit-hunt',
    name: 'Bandit Hunt',
    description: 'Track down and capture highway bandits. They\'re not clever, but there are a lot of them. Quantity has a quality of its own.',
    descriptionVariants: [
      'Track down and capture highway bandits. They\'re not clever, but there are a lot of them. Quantity has a quality of its own.',
      'A bandit gang plagues the trade routes. They wear matching scarves. Organised crime has a dress code, apparently.',
      'Eliminate a bandit camp near the trade road. They\'ve been robbing merchants and writing rude messages. Both are crimes.',
      'Hunt down highway robbers operating near Guildholm. They call themselves the "Free Blades." Free because nobody pays them. Yet.',
    ],
    rank: 'C',
    goldReward: 80,
    timeRequired: 10,
    healthRisk: 20,
    happinessReward: 4,
    requiredEducation: { path: 'fighter', level: 2 },
    locationObjectives: [
      {
        id: 'bandit-hunt-market',
        locationId: 'shadow-market',
        actionText: 'Gather Intelligence',
        description: 'Bribe an informant at the Shadow Market to find the bandits\' hideout.',
        completionText: 'A shady informant confirms the bandits camp near the cave — for a modest fee and a handshake he pretends not to enjoy.',
      },
      {
        id: 'bandit-hunt-cave',
        locationId: 'cave',
        actionText: 'Storm the Lair',
        description: 'Track the bandits to their cave hideout and drive them out.',
        completionText: 'You rout the bandits from their cave. Their leader weeps openly. His name was apparently Whiskers Jr. This explains the matching scarves.',
      },
    ],
  },
  {
    id: 'lost-artifact',
    name: 'Lost Artifact',
    description: 'Recover an ancient relic from abandoned ruins. "Abandoned" is doing a lot of heavy lifting in that sentence.',
    descriptionVariants: [
      'Recover an ancient relic from abandoned ruins. "Abandoned" is doing a lot of heavy lifting in that sentence.',
      'An ancient artifact lies in ruins outside the city. The ruins are full of traps. The artifact is full of archaeological value. And traps.',
      'Retrieve a missing relic from an old temple. The temple has been "uninhabited for centuries." Centuries-old things still live there.',
      'A valuable artifact awaits recovery in the old ruins. Previous recovery teams sent reports. Then they stopped sending reports.',
    ],
    rank: 'C',
    goldReward: 90,
    timeRequired: 12,
    healthRisk: 15,
    happinessReward: 4,
    locationObjectives: [
      {
        id: 'lost-artifact-fence',
        locationId: 'fence',
        actionText: 'Question the Fence',
        description: 'Ask the Fence if he knows who sold the stolen artifact.',
        completionText: 'The Fence nervously admits to "acquiring" something from a hooded figure. For a modest bribe, he reveals exactly where he found it.',
      },
      {
        id: 'lost-artifact-academy',
        locationId: 'academy',
        actionText: 'Authenticate the Artifact',
        description: 'Have Academy scholars verify the artifact is genuine before handing it in.',
        completionText: 'The scholars confirm it\'s genuine. They also confirm it\'s mildly cursed. "Negligibly," they say. "Practically not at all." You hand it in anyway.',
      },
    ],
  },
  {
    id: 'curse-investigation',
    name: 'Curse Investigation',
    description: 'Investigate strange occurrences at the old manor. Spoiler: it\'s always ghosts. It\'s never NOT ghosts.',
    descriptionVariants: [
      'Investigate strange occurrences at the old manor. Spoiler: it\'s always ghosts. It\'s never NOT ghosts.',
      'The old manor is acting up again. Doors slamming, voices at night. The owner says it\'s "the wind." It\'s never the wind.',
      'Strange lights and sounds from the abandoned estate. The Academy wants data. You want gold. The ghosts want attention.',
      'A cursed property needs investigating. The previous investigator left running. He hasn\'t stopped. He\'s still running, actually.',
    ],
    rank: 'C',
    goldReward: 65,
    timeRequired: 8,
    healthRisk: 10,
    happinessReward: 3,
    requiredEducation: { path: 'mage', level: 1 },
    locationObjectives: [
      {
        id: 'curse-investigation-graveyard',
        locationId: 'graveyard',
        actionText: 'Investigate the Graveyard',
        description: 'Search the graveyard for signs of unusual arcane activity.',
        completionText: 'The graveyard is unnervingly active tonight. You discover strange arcane residue and encounter a miffed ghost named Reginald who insists he was here first.',
      },
      {
        id: 'curse-investigation-enchanter',
        locationId: 'enchanter',
        actionText: 'Analyze the Evidence',
        description: 'Bring your findings to the Enchanter for expert analysis.',
        completionText: 'The Enchanter examines your samples with great interest. "Old binding magic," she says. "Very old. And thoroughly annoyed." She charges extra for the diagnosis.',
      },
    ],
  },

  // B-Rank Quests — high rewards for experienced adventurers
  {
    id: 'monster-slaying',
    name: 'Monster Slaying',
    description: 'Hunt the beast terrorizing local farmers. The farmers describe it as "big, scary, and bitey." Helpful.',
    descriptionVariants: [
      'Hunt the beast terrorizing local farmers. The farmers describe it as "big, scary, and bitey." Helpful.',
      'A monster has claimed a farm as its territory. The cows disagree. The cows are losing. Help the cows.',
      'Something large and angry roams the farmlands. Witness accounts vary from "wolf" to "small dragon" to "my mother-in-law."',
      'Slay the creature terrorising the countryside. Survivors describe it as having "too many teeth." An excess of teeth is never good.',
    ],
    rank: 'B',
    goldReward: 140,
    timeRequired: 14,
    healthRisk: 35,
    happinessReward: 6,
    requiredEducation: { path: 'fighter', level: 2 },
    locationObjectives: [
      {
        id: 'monster-slay-tavern',
        locationId: 'rusty-tankard',
        actionText: 'Interview Witnesses',
        description: 'Talk to the frightened farmers at the tavern about the beast\'s habits.',
        completionText: 'Three farmers describe the beast. One says "wolf." Another says "bear." The third says "Steve." His name is Steve, apparently. Now you know.',
      },
      {
        id: 'monster-slay-armory',
        locationId: 'armory',
        actionText: 'Prepare Hunting Gear',
        description: 'Sharpen your weapons and stock up on supplies for the hunt.',
        completionText: 'The armourer sharpens your blade and sells you a "monster-repellent salve." It smells like garlic. It works on monsters and social situations alike.',
      },
      {
        id: 'monster-slay-cave',
        locationId: 'cave',
        actionText: 'Track the Beast',
        description: 'Follow the beast\'s tracks to its lair in the caves.',
        completionText: 'You find the beast\'s lair. Steve is sleeping. Steve is enormous. Steve wakes up grumpy. The fight is brief but educational.',
      },
    ],
  },
  {
    id: 'dungeon-dive',
    name: 'Dungeon Dive',
    description: 'Prove your dungeon prowess. Go back into the dungeon. Voluntarily. We question your judgment but respect your courage.',
    descriptionVariants: [
      'Prove your dungeon prowess. Go back into the dungeon. Voluntarily. We question your judgment but respect your courage.',
      'Return to the dungeon and bring back proof of your exploits. Proof means loot. Not stories. Nobody trusts stories.',
      'The guild wants a dungeon progress report. They want you to write it. In the dungeon. While fighting. Bureaucracy.',
      'Voluntary dungeon expedition required. "Voluntary" is a strong word. "Strongly encouraged with gold incentive" is more accurate.',
    ],
    rank: 'B',
    goldReward: 160,
    timeRequired: 16,
    healthRisk: 30,
    happinessReward: 7,
    requiresDungeonFloor: 1,
    locationObjectives: [
      {
        id: 'dungeon-dive-guild',
        locationId: 'guild-hall',
        actionText: 'Get Expedition Orders',
        description: 'Receive your dungeon expedition briefing from the Guild.',
        completionText: 'The guild master hands you a map. "It\'s outdated," he admits. "But the dungeon doesn\'t move." You hope he\'s right.',
      },
      {
        id: 'dungeon-dive-enchanter',
        locationId: 'enchanter',
        actionText: 'Buy Protection Scrolls',
        description: 'Stock up on protective enchantments before descending.',
        completionText: 'The Enchanter sells you a scroll of protection. "Mostly protection," she corrects. "Some protection. A little. Good luck."',
      },
      {
        id: 'dungeon-dive-cave',
        locationId: 'cave',
        actionText: 'Enter the Dungeon',
        description: 'Descend into the dungeon and prove your prowess.',
        completionText: 'You emerge from the dungeon battered but triumphant. Your "protection" scroll turned out to be a grocery list. Still survived.',
      },
    ],
  },
  {
    id: 'exorcism',
    name: 'Exorcism',
    description: 'Cleanse the haunted chapel of dark spirits. The spirits are dark, the chapel is drafty, and the pay barely covers therapy.',
    descriptionVariants: [
      'Cleanse the haunted chapel of dark spirits. The spirits are dark, the chapel is drafty, and the pay barely covers therapy.',
      'A chapel outside town has been overrun by spectres. The congregation wants them gone. The spectres disagree. Negotiate with force.',
      'Perform an exorcism at the old chapel. Bring candles, holy water, and a strong constitution. The ghosts are... assertive.',
      'Dark spirits haunt a sacred chapel. The priests tried praying. The spirits prayed back. Louder. Professional help needed.',
    ],
    rank: 'B',
    goldReward: 110,
    timeRequired: 10,
    healthRisk: 25,
    happinessReward: 5,
    requiredEducation: { path: 'priest', level: 2 },
    locationObjectives: [
      {
        id: 'exorcism-enchanter',
        locationId: 'enchanter',
        actionText: 'Prepare Holy Wards',
        description: 'Acquire sanctified wards and incense from the Enchanter.',
        completionText: 'The Enchanter prepares your exorcism kit. "I included extra candles," she says. "The spirits hate the lavender ones. Personally, I find that relatable."',
      },
      {
        id: 'exorcism-graveyard',
        locationId: 'graveyard',
        actionText: 'Consecrate the Grounds',
        description: 'Perform a consecration ritual at the graveyard to weaken the spirits.',
        completionText: 'You consecrate the grounds with considerable chanting and incense. The spirits are weakened. The neighbours are annoyed. Spiritual warfare is noisy.',
      },
    ],
  },

  // A-Rank Quests — elite rewards
  {
    id: 'dragon-investigation',
    name: 'Dragon Investigation',
    description: 'Investigate dragon sightings in the mountains. "Investigate" — not "provoke," "annoy," or "poke with a stick."',
    descriptionVariants: [
      'Investigate dragon sightings in the mountains. "Investigate" — not "provoke," "annoy," or "poke with a stick."',
      'Confirm or deny the dragon reports from the mountain villages. Emphasis on "from a safe distance."',
      'Mountain scouts report dragon activity. The guild wants eyes on the ground. Preferably eyes attached to a living person.',
      'Dragon reconnaissance mission. Observe, document, and return. In that order. Especially the "return" part.',
    ],
    rank: 'A',
    goldReward: 220,
    timeRequired: 18,
    healthRisk: 40,
    happinessReward: 9,
    requiredEducation: { path: 'fighter', level: 2 },
    locationObjectives: [
      {
        id: 'dragon-inv-academy',
        locationId: 'academy',
        actionText: 'Research Dragon Lore',
        description: 'Study ancient dragon texts at the Academy before heading into the mountains.',
        completionText: 'The Academy\'s dragon section is surprisingly extensive. You learn that dragons are "large, angry, and fire-adjacent." Groundbreaking scholarship.',
      },
      {
        id: 'dragon-inv-armory',
        locationId: 'armory',
        actionText: 'Acquire Fire-Resistant Gear',
        description: 'Purchase fire-resistant armour modifications at the Armory.',
        completionText: 'The armourer coats your gear in fire-retardant paste. "Tested on actual fire," he says. "Not dragon fire, mind you. Regular fire. Should be fine. Probably."',
      },
      {
        id: 'dragon-inv-cave',
        locationId: 'cave',
        actionText: 'Scout the Dragon\'s Territory',
        description: 'Enter the mountain caves to find evidence of dragon activity.',
        completionText: 'You find enormous claw marks, scorched rock, and a pile of melted armour belonging to previous investigators. The investigation is going well.',
      },
    ],
  },
  {
    id: 'demon-cult',
    name: 'Demon Cult',
    description: 'Infiltrate and dismantle a dangerous cult. Their robes are surprisingly comfortable. Don\'t get attached.',
    descriptionVariants: [
      'Infiltrate and dismantle a dangerous cult. Their robes are surprisingly comfortable. Don\'t get attached.',
      'A demon-worshipping cult threatens the region. Infiltrate, gather intelligence, and shut them down. Yes, you can keep the robe.',
      'Break up a dangerous cult operating beneath the city. They chant at midnight. They summon things. Things with teeth.',
      'A cult is summoning entities from the lower planes. Stop them before something answers. Something always answers.',
    ],
    rank: 'A',
    goldReward: 260,
    timeRequired: 22,
    healthRisk: 50,
    happinessReward: 10,
    locationObjectives: [
      {
        id: 'demon-cult-shadow',
        locationId: 'shadow-market',
        actionText: 'Find a Cult Informant',
        description: 'Bribe someone at the Shadow Market to reveal the cult\'s meeting place.',
        completionText: 'A hooded figure whispers the cult\'s location for an unreasonable sum of gold. "They meet beneath the old chapel," he says. "Wear something dark."',
      },
      {
        id: 'demon-cult-graveyard',
        locationId: 'graveyard',
        actionText: 'Disrupt the Summoning Circle',
        description: 'Find and destroy the summoning circle hidden among the graves.',
        completionText: 'You destroy the outer summoning circle. The cult won\'t be happy. The thing they were summoning is probably relieved.',
      },
      {
        id: 'demon-cult-enchanter',
        locationId: 'enchanter',
        actionText: 'Create Banishment Seals',
        description: 'Have the Enchanter craft banishment seals for the final confrontation.',
        completionText: 'The Enchanter creates three banishment seals. "Use them wisely," she says. "They were expensive to make." She charges you anyway.',
      },
    ],
  },
  {
    id: 'ancient-evil',
    name: 'Ancient Evil Awakens',
    description: 'Seal the tomb before the ancient evil escapes. The ancient evil has been napping for 3,000 years and is NOT a morning person.',
    descriptionVariants: [
      'Seal the tomb before the ancient evil escapes. The ancient evil has been napping for 3,000 years and is NOT a morning person.',
      'An ancient tomb is cracking open. Whatever\'s inside has been sleeping for millennia and wakes up hungry.',
      'Re-seal the awakening tomb of an ancient horror. The previous seal lasted 3,000 years. We\'d like the new one to last longer.',
      'A primordial evil stirs beneath the earth. It must not be allowed to rise. It\'s already pretty annoyed about the 3,000-year nap.',
    ],
    rank: 'A',
    goldReward: 240,
    timeRequired: 18,
    healthRisk: 45,
    happinessReward: 9,
    requiredEducation: { path: 'mage', level: 2 },
    locationObjectives: [
      {
        id: 'ancient-evil-academy',
        locationId: 'academy',
        actionText: 'Study Sealing Rituals',
        description: 'Research ancient sealing magic at the Academy archives.',
        completionText: 'The Academy archives contain three relevant texts. Two are helpful. One tries to bite you. Standard academic experience.',
      },
      {
        id: 'ancient-evil-graveyard',
        locationId: 'graveyard',
        actionText: 'Locate the Tomb',
        description: 'Find the cracking tomb among the oldest graves.',
        completionText: 'The tomb pulses with dark energy. The ground trembles. A nearby headstone falls over apologetically. This is definitely the one.',
      },
      {
        id: 'ancient-evil-enchanter',
        locationId: 'enchanter',
        actionText: 'Forge the Seal',
        description: 'Have the Enchanter forge a new magical seal using the ancient formula.',
        completionText: 'The Enchanter forges the seal with visible concern. "This should hold for another 3,000 years," she says. "Should." You notice the emphasis.',
      },
    ],
  },

  // S-Rank Quests (legendary) — massive rewards for top-tier adventurers
  {
    id: 'deep-dungeon-clear',
    name: 'Deep Dungeon Clear',
    description: 'Conquer all 6 levels of the legendary dungeon. This is either incredibly brave or proof that natural selection still works.',
    descriptionVariants: [
      'Conquer all 6 levels of the legendary dungeon. This is either incredibly brave or proof that natural selection still works.',
      'Complete a full dungeon clear — all six floors, all bosses. The survival rate for this quest is a statistic we don\'t publish.',
      'Descend through all six dungeon floors and emerge victorious. Or don\'t emerge. The guild will send flowers.',
      'The ultimate dungeon challenge: six floors, six bosses, one adventurer. The odds are not in your favour. The gold is.',
    ],
    rank: 'S',
    goldReward: 450,
    timeRequired: 30,
    healthRisk: 60,
    happinessReward: 15,
    requiresAllDungeonFloors: true,
    locationObjectives: [
      {
        id: 'deep-clear-forge',
        locationId: 'forge',
        actionText: 'Commission Expedition Gear',
        description: 'Have the master smith forge specialised deep-dungeon equipment.',
        completionText: 'The smith forges gear designed for extended dungeon survival. "It\'s my finest work," he says. "Try to bring it back in one piece. Or at all."',
      },
      {
        id: 'deep-clear-enchanter',
        locationId: 'enchanter',
        actionText: 'Enchant Your Equipment',
        description: 'Layer protective enchantments onto your gear for the deep floors.',
        completionText: 'Your equipment hums with arcane energy. The Enchanter warns: "The enchantments will fade. The things down there won\'t." Encouraging.',
      },
      {
        id: 'deep-clear-cave',
        locationId: 'cave',
        actionText: 'Begin the Deep Descent',
        description: 'Enter the dungeon for the ultimate challenge — all six floors.',
        completionText: 'Six floors. Six bosses. One you. The legends will speak of this day. Assuming you survive to tell anyone.',
      },
    ],
  },
  {
    id: 'dragon-slayer',
    name: 'Dragon Slayer',
    description: 'Slay the ancient dragon threatening the kingdom. The dragon is ancient, enormous, and breathes fire. You have a sword. Best of luck.',
    descriptionVariants: [
      'Slay the ancient dragon threatening the kingdom. The dragon is ancient, enormous, and breathes fire. You have a sword. Best of luck.',
      'Kill the dragon. The dragon disagrees with this plan. The dragon is very large. Your plan is very ambitious.',
      'Face the ancient wyrm in single combat. The wyrm has centuries of experience, impenetrable scales, and fire breath. You have enthusiasm.',
      'The ultimate quest: dragonslaying. The guild will provide equipment, intelligence, and a pre-written eulogy. Just in case.',
    ],
    rank: 'S',
    goldReward: 600,
    timeRequired: 36,
    healthRisk: 70,
    happinessReward: 20,
    requiredEducation: { path: 'fighter', level: 2 },
    locationObjectives: [
      {
        id: 'dragon-slay-academy',
        locationId: 'academy',
        actionText: 'Study Dragon Weaknesses',
        description: 'Research the ancient wyrm\'s vulnerabilities in the Academy\'s restricted section.',
        completionText: 'The restricted section reveals the dragon\'s weakness: its left knee. Also its ego. The ego is a bigger target.',
      },
      {
        id: 'dragon-slay-forge',
        locationId: 'forge',
        actionText: 'Forge a Dragon-Slaying Blade',
        description: 'Commission the master smith to forge a weapon worthy of dragonslaying.',
        completionText: 'The smith spends three days on the blade. "It\'ll cut through dragon scale," he promises. "I think. I\'ve never actually tried. Nobody has. And returned."',
      },
      {
        id: 'dragon-slay-armory',
        locationId: 'armory',
        actionText: 'Assemble Dragon-Scale Armour',
        description: 'Piece together the best armour the Armory can provide for the fight.',
        completionText: 'You\'re outfitted in the finest armour gold can buy. The armourer salutes you. "If you survive," he says, "I want that armour back." He\'s serious.',
      },
      {
        id: 'dragon-slay-cave',
        locationId: 'cave',
        actionText: 'Face the Dragon',
        description: 'Enter the dragon\'s mountain lair for the final confrontation.',
        completionText: 'You stand before the dragon. It\'s bigger than advertised. It regards you with ancient, intelligent eyes. "Another one," it sighs. The fight begins.',
      },
    ],
  },
];

export function getAvailableQuests(guildRank: GuildRank): Quest[] {
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank);

  return QUESTS.filter(quest => {
    const requiredRank = QUEST_RANK_REQUIREMENTS[quest.rank];
    const requiredIndex = GUILD_RANK_ORDER.indexOf(requiredRank);
    return rankIndex >= requiredIndex;
  });
}

export function canTakeQuest(
  quest: Quest,
  guildRank: GuildRank,
  education: Record<EducationPath, number>,
  inventory: string[],
  dungeonFloorsCleared?: number[]
): { canTake: boolean; reason?: string } {
  // Check guild rank
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank);
  const requiredRank = QUEST_RANK_REQUIREMENTS[quest.rank];
  const requiredIndex = GUILD_RANK_ORDER.indexOf(requiredRank);

  if (rankIndex < requiredIndex) {
    return { canTake: false, reason: `Requires ${requiredRank} rank` };
  }

  // Check education requirement
  if (quest.requiredEducation) {
    const playerLevel = education[quest.requiredEducation.path] || 0;
    if (playerLevel < quest.requiredEducation.level) {
      return {
        canTake: false,
        reason: `Requires ${quest.requiredEducation.path} level ${quest.requiredEducation.level}`
      };
    }
  }

  // Check item requirement
  if (quest.requiredItem && !inventory.includes(quest.requiredItem)) {
    return { canTake: false, reason: `Requires ${quest.requiredItem}` };
  }

  // Check dungeon floor requirement
  const cleared = dungeonFloorsCleared || [];
  if (quest.requiresDungeonFloor && !cleared.includes(quest.requiresDungeonFloor)) {
    return { canTake: false, reason: `Requires Dungeon Floor ${quest.requiresDungeonFloor} cleared` };
  }

  // Check all dungeon floors requirement
  if (quest.requiresAllDungeonFloors) {
    // M14 FIX: Check all 6 floors (was missing Floor 6: Forgotten Temple)
    const allCleared = [1, 2, 3, 4, 5, 6].every(f => cleared.includes(f));
    if (!allCleared) {
      return { canTake: false, reason: `Requires all 6 dungeon floors cleared` };
    }
  }

  return { canTake: true };
}

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find(q => q.id === id);
}

/**
 * Returns the location objectives for the given active quest ID.
 * Returns [] for chain/bounty/nlchain quests (not location-based).
 */
export function getQuestLocationObjectives(
  activeQuestId: string | null,
  chainProgress?: Record<string, number>,
): LocationObjective[] {
  if (!activeQuestId) return [];
  // Chain quests: look up the current step's objectives
  if (activeQuestId.startsWith('chain:')) {
    const chainId = activeQuestId.replace('chain:', '');
    const chain = getQuestChain(chainId);
    if (!chain) return [];
    const stepIndex = chainProgress?.[chainId] ?? 0;
    const step = chain.steps[stepIndex];
    return step?.locationObjectives ?? [];
  }
  if (activeQuestId.startsWith('bounty:') || activeQuestId.startsWith('nlchain:')) return [];
  const quest = getQuest(activeQuestId);
  return quest?.locationObjectives ?? [];
}

/**
 * Returns true if all location objectives for the active quest are satisfied.
 * Quests without objectives are always "satisfied" (hand in at Guild Hall as before).
 */
export function allLocationObjectivesDone(
  activeQuestId: string | null,
  questLocationProgress: string[],
  chainProgress?: Record<string, number>,
): boolean {
  const objectives = getQuestLocationObjectives(activeQuestId, chainProgress);
  if (objectives.length === 0) return true;
  return objectives.every(obj => questLocationProgress.includes(obj.id));
}

// ============================================================
// B1: Quest Chains — multi-part quests with sequential steps
// ============================================================

export interface QuestChainStep {
  id: string;
  name: string;
  description: string;
  /** Variant descriptions for quest chain steps */
  descriptionVariants?: string[];
  rank: QuestRank;
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
  requiredEducation?: { path: EducationPath; level: number };
  requiresDungeonFloor?: number;
  /** Location objectives — player must visit locations before completing step */
  locationObjectives?: LocationObjective[];
}
export interface QuestChain {
  id: string;
  name: string;
  description: string;
  steps: QuestChainStep[];
  /** Bonus gold awarded on completing all steps */
  completionBonusGold: number;
  /** Bonus happiness awarded on completing all steps */
  completionBonusHappiness: number;
  /** Minimum guild rank to start the chain */
  requiredGuildRank: GuildRank;
  /** Humorous completion summary shown when the whole chain is finished */
  completionSummary?: string[];
}

export const QUEST_CHAINS: QuestChain[] = [
  {
    id: 'dragon-conspiracy',
    name: 'The Dragon Conspiracy',
    description: 'A shadowy plot involving the dragon clans threatens the kingdom. Dragons and conspiracies — pick a lane, honestly.',
    requiredGuildRank: 'journeyman',
    completionBonusGold: 200,
    completionBonusHappiness: 15,
    completionSummary: [
      "QUEST COMPLETE: The Dragon Conspiracy\n\nAgainst all odds, common sense, and basic self-preservation instincts, you have defeated the dragon conspiracy. The conspirators turned out to be three dragons in a trenchcoat running a pyramid scheme. The kingdom is saved, mostly because the dragons forgot to file their evil permits.\n\nThe Guild Treasurer described your reward as 'distressingly generous.' Your mother would be proud. Assuming she believed any of this, which she wouldn't.",
      "QUEST COMPLETE: The Dragon Conspiracy\n\nYou did it. You actually did it. The dragon conspiracy has been unraveled like a cheap sweater in a cat sanctuary. Turns out the whole plot was run by a dragon who just wanted planning permission for a larger cave. The bureaucracy of evil knows no bounds.\n\nSeveral buildings were only mildly singed. The Mayor has declared a holiday in your honor, mainly because he was looking for an excuse to close the tax office.",
      "QUEST COMPLETE: The Dragon Conspiracy\n\nThe conspiracy is over. The dragons have been firmly asked to leave. One of them cried. You're not sure how you feel about that.\n\nIn the grand tradition of heroes throughout history, you emerged victorious, slightly charred, and deeply confused about what just happened. The important thing is: you got paid. The less important thing is: the kingdom is safe. Priorities.",
    ],
    steps: [
      {
        id: 'dragon-conspiracy-1',
        name: 'Whispers of Fire',
        description: 'Strange burn marks appear across the city. Could be dragons. Could be a cooking accident. Best to check.',
        descriptionVariants: [
          'Strange burn marks appear across the city. Could be dragons. Could be a cooking accident. Best to check.',
          'Scorch marks on buildings, melted cobblestones, and the smell of sulphur. Either dragons or the worst barbecue ever.',
          'Mysterious fire damage across multiple districts. The Fire Brigade says "not our problem." It might be yours.',
        ],
        rank: 'C',
        goldReward: 75,
        timeRequired: 10,
        healthRisk: 10,
        happinessReward: 4,
        locationObjectives: [
          {
            id: 'dc1-tavern',
            locationId: 'rusty-tankard',
            actionText: 'Interview Witnesses',
            description: 'Talk to tavern patrons who saw the mysterious fires.',
            completionText: 'A drunken merchant describes the fire: "It came from above. With wings. And opinions." That narrows it down to dragons or pigeons.',
          },
          {
            id: 'dc1-forge',
            locationId: 'forge',
            actionText: 'Analyze Scorch Marks',
            description: 'Have the blacksmith examine residue from the burn marks.',
            completionText: 'The smith sniffs the residue. "Dragon fire. Definitely. You can tell by the way it melts steel." He seems impressed rather than concerned.',
          },
        ],
      },
      {
        id: 'dragon-conspiracy-2',
        name: 'The Smuggler\'s Trail',
        description: 'Follow the trail of dragon-forged weapons to a smuggling ring. They\'re not subtle. None of them are ever subtle.',
        descriptionVariants: [
          'Follow the trail of dragon-forged weapons to a smuggling ring. They\'re not subtle. None of them are ever subtle.',
          'Dragon-forged weapons are appearing on the black market. Trace them to the source. The source probably has dragons.',
          'Illegal weapon shipments bear dragon marks. Follow the supply chain. It leads somewhere hot. Literally.',
        ],
        rank: 'B',
        goldReward: 130,
        timeRequired: 14,
        healthRisk: 25,
        happinessReward: 6,
        requiredEducation: { path: 'fighter', level: 1 },
        locationObjectives: [
          {
            id: 'dc2-shadow',
            locationId: 'shadow-market',
            actionText: 'Track the Smugglers',
            description: 'Follow leads at the Shadow Market to find the weapon smuggling ring.',
            completionText: 'A nervous fence confirms: dragon-forged blades are being sold through the docks. "Don\'t tell them I told you," he whispers. "They breathe fire."',
          },
          {
            id: 'dc2-armory',
            locationId: 'armory',
            actionText: 'Examine Confiscated Weapons',
            description: 'Inspect the seized dragon-forged weapons at the Armory.',
            completionText: 'The weapons bear a maker\'s mark — a dragon claw. The armourer admits they\'re magnificent. "Beautiful craftsmanship. Terrible implications."',
          },
        ],
      },
      {
        id: 'dragon-conspiracy-3',
        name: 'Lair of the Conspirators',
        description: 'Confront the conspirators in their hidden lair beneath the mountains. Hidden lairs: where evil goes when it can\'t afford office space.',
        descriptionVariants: [
          'Confront the conspirators in their hidden lair beneath the mountains. Hidden lairs: where evil goes when it can\'t afford office space.',
          'Storm the conspiracy\'s mountain base. They\'ve been planning this for years. You\'ve been planning for about ten minutes.',
          'The final showdown with the dragon conspirators. Deep in the mountains. Bring fire resistance. And courage. Mostly fire resistance.',
        ],
        rank: 'A',
        goldReward: 250,
        timeRequired: 20,
        healthRisk: 45,
        happinessReward: 10,
        requiresDungeonFloor: 3,
        locationObjectives: [
          {
            id: 'dc3-enchanter',
            locationId: 'enchanter',
            actionText: 'Acquire Fire Wards',
            description: 'Purchase powerful fire protection from the Enchanter before storming the lair.',
            completionText: 'The Enchanter layers three fire wards onto your gear. "This should handle dragon breath," she says. "Regular dragon breath. Not angry dragon breath. Good luck."',
          },
          {
            id: 'dc3-cave',
            locationId: 'cave',
            actionText: 'Infiltrate the Mountain Lair',
            description: 'Enter the mountain caves to reach the conspirators\' hidden base.',
            completionText: 'Deep in the mountains, you find the lair. Three dragons sit around a table covered in plans. One wears reading glasses. The conspiracy is real. And oddly bureaucratic.',
          },
        ],
      },
    ],
  },
  {
    id: 'scholars-secret',
    name: 'The Scholar\'s Secret',
    description: 'A dying scholar entrusts you with clues to forbidden knowledge. Dying people love giving cryptic errands. It\'s a whole thing.',
    requiredGuildRank: 'apprentice',
    completionBonusGold: 150,
    completionBonusHappiness: 12,
    completionSummary: [
      "QUEST COMPLETE: The Scholar's Secret\n\nYou sealed the ancient breach, saved forbidden knowledge from being lost forever, and only slightly destabilized the fabric of reality. The Academy Dean has publicly denied the hidden library exists while privately asking if you could return the books you borrowed.\n\nThe dying scholar, it turns out, wasn't actually dying — he just had really bad allergies. He sends his thanks and a fruit basket. The fruit basket was hexed. Classic scholar humor.",
      "QUEST COMPLETE: The Scholar's Secret\n\nThe breach is sealed. The forbidden knowledge is safe. The librarian has forgiven you for the overdue books, mostly because you saved reality. There's still a fine, though. There's always a fine.\n\nYou've learned things that would make most people's heads spin. Your head did, in fact, spin. Twice. The healers say it should stop doing that within the week. Probably.",
      "QUEST COMPLETE: The Scholar's Secret\n\nCongratulations! You have successfully performed forbidden magic, survived a basement full of angry books, and closed a hole in reality using nothing but arcane knowledge and a startling lack of concern for your own safety.\n\nThe Academy has awarded you an honorary degree in 'Applied Recklessness.' The ceremony is next Thursday. Refreshments will be provided. The refreshments may also be forbidden. You'll fit right in.",
    ],
    steps: [
      {
        id: 'scholars-secret-1',
        name: 'The Coded Journal',
        description: 'Decipher the late scholar\'s encrypted journal. His handwriting was terrible even before the dying part.',
        descriptionVariants: [
          'Decipher the late scholar\'s encrypted journal. His handwriting was terrible even before the dying part.',
          'Crack the dead scholar\'s cipher. He used a complex code. And also terrible handwriting. A double challenge.',
          'A dying scholar\'s journal holds secrets. Decode it. The code is arcane. The penmanship is criminal.',
        ],
        rank: 'D',
        goldReward: 45,
        timeRequired: 8,
        healthRisk: 0,
        happinessReward: 3,
        requiredEducation: { path: 'mage', level: 1 },
        locationObjectives: [
          {
            id: 'ss1-fence',
            locationId: 'fence',
            actionText: 'Buy the Journal',
            description: 'The scholar\'s journal surfaced at the Fence. Acquire it before someone else does.',
            completionText: 'The Fence sells you a battered journal for an outrageous price. "Academic memorabilia," he calls it. "Rare. Possibly cursed. No refunds."',
          },
          {
            id: 'ss1-academy',
            locationId: 'academy',
            actionText: 'Decode the Cipher',
            description: 'Use the Academy\'s cipher reference books to crack the journal\'s code.',
            completionText: 'After hours of cross-referencing, the cipher breaks. The journal describes a hidden library and a "breach that must not open." Uplifting stuff.',
          },
        ],
      },
      {
        id: 'scholars-secret-2',
        name: 'The Hidden Library',
        description: 'Locate the secret library beneath the Academy. It\'s "secret" in the way everyone knows about it but pretends they don\'t.',
        descriptionVariants: [
          'Locate the secret library beneath the Academy. It\'s "secret" in the way everyone knows about it but pretends they don\'t.',
          'Find the Academy\'s hidden archive. The Dean says it doesn\'t exist. The Dean was seen entering it last Tuesday.',
          'Beneath the Academy lies a library of forbidden knowledge. Finding it is step one. Surviving the librarian is step two.',
        ],
        rank: 'C',
        goldReward: 85,
        timeRequired: 12,
        healthRisk: 15,
        happinessReward: 5,
        locationObjectives: [
          {
            id: 'ss2-shadow',
            locationId: 'shadow-market',
            actionText: 'Find the Key',
            description: 'A black market dealer has the key to the hidden library. Find her.',
            completionText: 'A cloaked woman hands you an ornate key. "The library remembers its visitors," she warns. "Don\'t touch the blue books. Or the red ones. Or... just don\'t touch anything."',
          },
          {
            id: 'ss2-academy',
            locationId: 'academy',
            actionText: 'Enter the Hidden Library',
            description: 'Use the key to access the forbidden archive beneath the Academy.',
            completionText: 'The hidden library is vast, dusty, and judgmental. A book falls from a shelf and lands open at your feet. "READ ME," it says, in handwritten ink. Libraries are pushy.',
          },
        ],
      },
      {
        id: 'scholars-secret-3',
        name: 'The Forbidden Ritual',
        description: 'Use the forbidden knowledge to seal an ancient breach. It\'s forbidden for a reason. Several reasons, actually. All of them alarming.',
        descriptionVariants: [
          'Use the forbidden knowledge to seal an ancient breach. It\'s forbidden for a reason. Several reasons, actually. All of them alarming.',
          'Perform the sealing ritual before the breach widens further. The ritual is dangerous. The breach is worse. Pick your danger.',
          'Close the ancient breach using forbidden magic. "Forbidden" doesn\'t mean "impossible." It means "really bad idea that works."',
        ],
        rank: 'B',
        goldReward: 150,
        timeRequired: 16,
        healthRisk: 30,
        happinessReward: 8,
        requiredEducation: { path: 'mage', level: 2 },
        locationObjectives: [
          {
            id: 'ss3-enchanter',
            locationId: 'enchanter',
            actionText: 'Gather Ritual Components',
            description: 'The Enchanter has the rare components needed for the sealing ritual.',
            completionText: 'The Enchanter assembles the ritual components with visible unease. "These ingredients are forbidden for a reason," she says. "Several reasons. All of them on fire."',
          },
          {
            id: 'ss3-graveyard',
            locationId: 'graveyard',
            actionText: 'Perform the Sealing',
            description: 'The breach is in the oldest part of the graveyard. Seal it before it widens.',
            completionText: 'The ritual is intense, loud, and slightly terrifying. The breach seals with a sound like reality hiccupping. The dead return to being dead. Normal service resumes.',
          },
        ],
      },
    ],
  },
];

export function getQuestChain(chainId: string): QuestChain | undefined {
  return QUEST_CHAINS.find(c => c.id === chainId);
}

/** Get a random humorous completion summary for a quest chain */
export function getChainCompletionSummary(chain: QuestChain): string {
  if (!chain.completionSummary || chain.completionSummary.length === 0) {
    return `QUEST COMPLETE: ${chain.name}\n\nYou have completed the entire quest chain. The guild is impressed. You are slightly less impressed, having done all the actual work. But gold is gold, and glory is... well, it's nice, but it doesn't pay rent.`;
  }
  return chain.completionSummary[Math.floor(Math.random() * chain.completionSummary.length)];
}

/** Get the next step for a player in a chain, or null if chain is complete */
export function getNextChainStep(
  chainId: string,
  chainProgress: Record<string, number>
): QuestChainStep | null {
  const chain = getQuestChain(chainId);
  if (!chain) return null;
  const stepsCompleted = chainProgress[chainId] || 0;
  if (stepsCompleted >= chain.steps.length) return null;
  return chain.steps[stepsCompleted];
}

/** Check if a player can start or continue a chain */
export function canTakeChainStep(
  chain: QuestChain,
  step: QuestChainStep,
  guildRank: GuildRank,
  education: Record<EducationPath, number>,
  dungeonFloorsCleared?: number[]
): { canTake: boolean; reason?: string } {
  // Check guild rank for chain
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank);
  const requiredIndex = GUILD_RANK_ORDER.indexOf(chain.requiredGuildRank);
  if (rankIndex < requiredIndex) {
    return { canTake: false, reason: `Requires ${chain.requiredGuildRank} rank` };
  }

  // Check step education requirement
  if (step.requiredEducation) {
    const playerLevel = education[step.requiredEducation.path] || 0;
    if (playerLevel < step.requiredEducation.level) {
      return {
        canTake: false,
        reason: `Requires ${step.requiredEducation.path} level ${step.requiredEducation.level}`,
      };
    }
  }

  // Check dungeon floor requirement
  const cleared = dungeonFloorsCleared || [];
  if (step.requiresDungeonFloor && !cleared.includes(step.requiresDungeonFloor)) {
    return { canTake: false, reason: `Requires Dungeon Floor ${step.requiresDungeonFloor} cleared` };
  }

  return { canTake: true };
}

// ============================================================
// B2: Repeatable Bounties — 3 rotating weekly bounties
// ============================================================

export interface Bounty {
  id: string;
  name: string;
  description: string;
  /** Variant descriptions for bounties */
  descriptionVariants?: string[];
  goldReward: number;
  timeRequired: number;
  healthRisk: number;
  happinessReward: number;
}

const BOUNTY_POOL: Bounty[] = [
  { id: 'bounty-rats', name: 'Cellar Rats', description: 'Clear rats from a merchant\'s cellar. Again. They always come back. It\'s basically a subscription service.', descriptionVariants: ['Clear rats from a merchant\'s cellar. Again. They always come back. It\'s basically a subscription service.', 'Rat extermination in the warehouse district. The rats have gotten organised. They have shifts.', 'Another cellar, another infestation. The rats outnumber the residents. Restore the balance.'], goldReward: 12, timeRequired: 3, healthRisk: 3, happinessReward: 1 },
  { id: 'bounty-patrol', name: 'Night Patrol', description: 'Patrol the streets after dark. Mostly involves being cold, bored, and suspicious of shadows.', descriptionVariants: ['Patrol the streets after dark. Mostly involves being cold, bored, and suspicious of shadows.', 'Evening guard patrol needed. The job is 10% vigilance and 90% trying to stay awake.', 'Walk the streets. Look intimidating. Report anything unusual. Define "unusual" yourself.'], goldReward: 18, timeRequired: 4, healthRisk: 5, happinessReward: 1 },
  { id: 'bounty-herbs', name: 'Herb Collection', description: 'Gather herbs for the healers. They want the green ones. Not the other green ones. The OTHER other green ones.', descriptionVariants: ['Gather herbs for the healers. They want the green ones. Not the other green ones. The OTHER other green ones.', 'The Enchanter needs specific plants. A diagram is provided. The diagram was drawn by someone who can\'t draw.', 'Collect healing herbs from the gardens. Don\'t eat them. The last person who ate them saw colours for a week.'], goldReward: 10, timeRequired: 3, healthRisk: 0, happinessReward: 2 },
  { id: 'bounty-delivery', name: 'Urgent Parcel', description: 'Deliver a time-sensitive parcel. It was "urgent" three days ago. Now it\'s "extremely urgent." Same parcel.', descriptionVariants: ['Deliver a time-sensitive parcel. It was "urgent" three days ago. Now it\'s "extremely urgent." Same parcel.', 'Rush delivery across the city. The package rattles. Don\'t shake it. Don\'t ask. Just deliver.', 'A merchant needs something delivered. "Quickly," they say. "Yesterday," they mean. Time travel not included.'], goldReward: 14, timeRequired: 3, healthRisk: 0, happinessReward: 1 },
  { id: 'bounty-escort', name: 'Traveler Escort', description: 'Escort a traveler to the gate. They walk slowly. They stop to look at things. Your patience will be tested.', descriptionVariants: ['Escort a traveler to the gate. They walk slowly. They stop to look at things. Your patience will be tested.', 'Accompany a nervous visitor through the city. They jump at shadows. There are many shadows. It\'s a long walk.', 'Bodyguard work for a traveler. The danger is mild. The small talk is brutal. Bring patience.'], goldReward: 20, timeRequired: 5, healthRisk: 8, happinessReward: 2 },
  { id: 'bounty-cleanup', name: 'Rubble Clearing', description: 'Clear debris from a collapsed stall. The owner insists it "collapsed on its own." The insurance adjuster disagrees.', descriptionVariants: ['Clear debris from a collapsed stall. The owner insists it "collapsed on its own." The insurance adjuster disagrees.', 'Manual labour: clear rubble from a building site. It\'s honest work. Your back will file a complaint.', 'Clean-up duty after a structural failure in the market. Heavy lifting required. Pride optional.'], goldReward: 15, timeRequired: 4, healthRisk: 3, happinessReward: 1 },
  { id: 'bounty-gather', name: 'Mushroom Foraging', description: 'Forage rare mushrooms from the cave mouth. "Rare" because smart people don\'t go near the cave mouth.', descriptionVariants: ['Forage rare mushrooms from the cave mouth. "Rare" because smart people don\'t go near the cave mouth.', 'Collect fungi from the cave entrance. The mushrooms glow. That\'s either valuable or radioactive. Probably valuable.', 'The Academy needs cave mushrooms. They grow where sensible people don\'t. Bring a basket. And courage.'], goldReward: 16, timeRequired: 4, healthRisk: 5, happinessReward: 2 },
  { id: 'bounty-lost-item', name: 'Lost Heirloom', description: 'Find a lost ring in the slums. It\'s always a ring. Never a lost spoon. Nobody cries over spoons.', descriptionVariants: ['Find a lost ring in the slums. It\'s always a ring. Never a lost spoon. Nobody cries over spoons.', 'A family heirloom went missing. Search the Slums. Ask questions. Accept vague answers. Find the thing.', 'Locate a missing ring. The owner swears it has "sentimental value." The Fence swears it has "market value."'], goldReward: 22, timeRequired: 5, healthRisk: 0, happinessReward: 2 },
  { id: 'bounty-sparring', name: 'Sparring Partner', description: 'Spar with a guard recruit at the Armory. He\'s new. Go easy on him. Or don\'t. Your call.', descriptionVariants: ['Spar with a guard recruit at the Armory. He\'s new. Go easy on him. Or don\'t. Your call.', 'The City Watch needs a sparring partner. The recruit is nervous. Your job is to be less nervous. And hit things.', 'Help train a new guard through practice combat. Try not to break him. They\'re short-staffed as it is.'], goldReward: 18, timeRequired: 4, healthRisk: 10, happinessReward: 1 },
];

/** Get 3 bounties for a given week (deterministic rotation based on week number) */
export function getWeeklyBounties(week: number): Bounty[] {
  // Use week to deterministically pick 3 bounties
  const offset = ((week - 1) * 3) % BOUNTY_POOL.length;
  const result: Bounty[] = [];
  for (let i = 0; i < 3; i++) {
    result.push(BOUNTY_POOL[(offset + i) % BOUNTY_POOL.length]);
  }
  return result;
}

export function getBounty(id: string): Bounty | undefined {
  return BOUNTY_POOL.find(b => b.id === id);
}

// ============================================================
// B3: Quest Difficulty Scaling — rewards scale with dungeon progress
// ============================================================

/** Calculate scaled gold reward based on player's dungeon progression */
export function getScaledQuestGold(baseGold: number, floorsCleared: number[]): number {
  // +10% gold per dungeon floor cleared, max +60%
  const bonus = Math.min(floorsCleared.length * 0.10, 0.60);
  return Math.round(baseGold * (1 + bonus));
}

/** Calculate scaled happiness reward based on dungeon progression */
export function getScaledQuestHappiness(baseHappiness: number, floorsCleared: number[]): number {
  // +1 happiness per 2 floors cleared
  const bonus = Math.floor(floorsCleared.length / 2);
  return baseHappiness + bonus;
}

// ============================================================
// B5: Guild Reputation — milestone bonuses
// ============================================================

export interface ReputationMilestone {
  threshold: number;
  title: string;
  goldBonusPct: number; // % bonus to quest gold
  description: string;
}

export const REPUTATION_MILESTONES: ReputationMilestone[] = [
  { threshold: 5,  title: 'Known Adventurer',    goldBonusPct: 5,  description: '+5% quest gold' },
  { threshold: 10, title: 'Trusted Agent',        goldBonusPct: 10, description: '+10% quest gold' },
  { threshold: 20, title: 'Renowned Hero',        goldBonusPct: 15, description: '+15% quest gold' },
  { threshold: 50, title: 'Legendary Champion',   goldBonusPct: 20, description: '+20% quest gold' },
];

/** Get the current reputation milestone for a given reputation score */
export function getReputationMilestone(reputation: number): ReputationMilestone | null {
  let best: ReputationMilestone | null = null;
  for (const m of REPUTATION_MILESTONES) {
    if (reputation >= m.threshold) best = m;
  }
  return best;
}

/** Get the gold bonus multiplier from reputation (e.g., 1.10 for +10%) */
export function getReputationGoldMultiplier(reputation: number): number {
  const milestone = getReputationMilestone(reputation);
  if (!milestone) return 1.0;
  return 1 + milestone.goldBonusPct / 100;
}

/** Get the next milestone the player hasn't reached yet */
export function getNextReputationMilestone(reputation: number): ReputationMilestone | null {
  for (const m of REPUTATION_MILESTONES) {
    if (reputation < m.threshold) return m;
  }
  return null;
}
