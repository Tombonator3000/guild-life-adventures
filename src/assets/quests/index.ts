// Quest & Bounty woodcut illustration imports
// All AI-generated 512×512 medieval woodcut-style quest illustrations

// Regular Quests (18 original)
import ratExtermination from './rat-extermination.jpg';
import packageDelivery from './package-delivery.jpg';
import herbGathering from './herb-gathering.jpg';
import lostCat from './lost-cat.jpg';
import escortMerchant from './escort-merchant.jpg';
import guardDuty from './guard-duty.jpg';
import courierRun from './courier-run.jpg';
import banditHunt from './bandit-hunt.jpg';
import lostArtifact from './lost-artifact.jpg';
import curseInvestigation from './curse-investigation.jpg';
import monsterSlaying from './monster-slaying.jpg';
import dungeonDive from './dungeon-dive.jpg';
import exorcism from './exorcism.jpg';
import dragonInvestigation from './dragon-investigation.jpg';
import demonCult from './demon-cult.jpg';
import ancientEvil from './ancient-evil.jpg';
import deepDungeonClear from './deep-dungeon-clear.jpg';
import dragonSlayer from './dragon-slayer.jpg';

// Regular Quests (10 new — 2026-02-25)
import wellRepair from './well-repair.jpg';
import noticeBoard from './notice-board.jpg';
import missingShipment from './missing-shipment.jpg';
import tavernBrawl from './tavern-brawl.jpg';
import poisonedWell from './poisoned-well.jpg';
import hauntedLibrary from './haunted-library.jpg';
import arenaChampion from './arena-champion.jpg';
import spyNetwork from './spy-network.jpg';
import lichPhylactery from './lich-phylactery.jpg';
import warCouncil from './war-council.jpg';

// Linear Quest Chains — Dragon Conspiracy (3 steps)
import dragonConspiracy1 from './dragon-conspiracy-1.jpg';
import dragonConspiracy2 from './dragon-conspiracy-2.jpg';
import dragonConspiracy3 from './dragon-conspiracy-3.jpg';

// Linear Quest Chains — Scholar's Secret (3 steps)
import scholarsSecret1 from './scholars-secret-1.jpg';
import scholarsSecret2 from './scholars-secret-2.jpg';
import scholarsSecret3 from './scholars-secret-3.jpg';

// Non-Linear Chains — Thieves' Guild (5 steps)
import tg1Investigate from './tg-1-investigate.jpg';
import tg2Raid from './tg-2-raid.jpg';
import tg3Inside from './tg-3-inside.jpg';
import tg4Double from './tg-4-double.jpg';
import tg5Finale from './tg-5-finale.jpg';

// Non-Linear Chains — Cursed Artifact (4 steps)
import ca1Acquire from './ca-1-acquire.jpg';
import ca2Study from './ca-2-study.jpg';
import ca3Favour from './ca-3-favour.jpg';
import ca4PurifyRitual from './ca-4-purify-ritual.jpg';

// Non-Linear Chains — Plague Doctor (3 steps, new 2026-02-25)
import pd1Outbreak from './pd-1-outbreak.jpg';
import pd2Source from './pd-2-source.jpg';
import pd3Cure from './pd-3-cure.jpg';

// Non-Linear Chains — Merchant Prince (3 steps, new 2026-02-25)
import mp1Opportunity from './mp-1-opportunity.jpg';
import mp2Rivals from './mp-2-rivals.jpg';
import mp3Empire from './mp-3-empire.jpg';

// Bounties (18)
import bountyRats from './bounty-rats.jpg';
import bountyPatrol from './bounty-patrol.jpg';
import bountyHerbs from './bounty-herbs.jpg';
import bountyDelivery from './bounty-delivery.jpg';
import bountyEscort from './bounty-escort.jpg';
import bountyCleanup from './bounty-cleanup.jpg';
import bountyGather from './bounty-gather.jpg';
import bountyLostItem from './bounty-lost-item.jpg';
import bountySparring from './bounty-sparring.jpg';
import bountyTownCrier from './bounty-town-crier.jpg';
import bountyCartRepair from './bounty-cart-repair.jpg';
import bountyGoblinThief from './bounty-goblin-thief.jpg';
import bountyWellTesting from './bounty-well-testing.jpg';
import bountyScribeWork from './bounty-scribe-work.jpg';
import bountyGraveyardWatch from './bounty-graveyard-watch.jpg';
import bountyStrayHound from './bounty-stray-hound.jpg';
import bountyFakeCoins from './bounty-fake-coins.jpg';
import bountyBarrelChase from './bounty-barrel-chase.jpg';

/** Map quest/bounty/chain step IDs to their woodcut illustrations */
export const QUEST_IMAGES: Record<string, string> = {
  // Regular Quests (original)
  'rat-extermination': ratExtermination,
  'package-delivery': packageDelivery,
  'herb-gathering': herbGathering,
  'lost-cat': lostCat,
  'escort-merchant': escortMerchant,
  'guard-duty': guardDuty,
  'courier-run': courierRun,
  'bandit-hunt': banditHunt,
  'lost-artifact': lostArtifact,
  'curse-investigation': curseInvestigation,
  'monster-slaying': monsterSlaying,
  'dungeon-dive': dungeonDive,
  'exorcism': exorcism,
  'dragon-investigation': dragonInvestigation,
  'demon-cult': demonCult,
  'ancient-evil': ancientEvil,
  'deep-dungeon-clear': deepDungeonClear,
  'dragon-slayer': dragonSlayer,

  // Regular Quests (new)
  'well-repair': wellRepair,
  'notice-board': noticeBoard,
  'missing-shipment': missingShipment,
  'tavern-brawl': tavernBrawl,
  'poisoned-well': poisonedWell,
  'haunted-library': hauntedLibrary,
  'arena-champion': arenaChampion,
  'spy-network': spyNetwork,
  'lich-phylactery': lichPhylactery,
  'war-council': warCouncil,

  // Linear Chain Steps
  'dragon-conspiracy-1': dragonConspiracy1,
  'dragon-conspiracy-2': dragonConspiracy2,
  'dragon-conspiracy-3': dragonConspiracy3,
  'scholars-secret-1': scholarsSecret1,
  'scholars-secret-2': scholarsSecret2,
  'scholars-secret-3': scholarsSecret3,

  // Non-Linear Chain Steps (original)
  'tg-1-investigate': tg1Investigate,
  'tg-2-raid': tg2Raid,
  'tg-3-inside': tg3Inside,
  'tg-4-double': tg4Double,
  'tg-5-finale': tg5Finale,
  'ca-1-acquire': ca1Acquire,
  'ca-2-study': ca2Study,
  'ca-3-favour': ca3Favour,
  'ca-4-purify-ritual': ca4PurifyRitual,

  // Non-Linear Chain Steps (new)
  'pd-1-outbreak': pd1Outbreak,
  'pd-2-source': pd2Source,
  'pd-3-cure': pd3Cure,
  'mp-1-opportunity': mp1Opportunity,
  'mp-2-rivals': mp2Rivals,
  'mp-3-empire': mp3Empire,

  // Chain IDs (parent) — use first step image
  'dragon-conspiracy': dragonConspiracy1,
  'scholars-secret': scholarsSecret1,
  'thieves-guild': tg1Investigate,
  'cursed-artifact': ca1Acquire,
  'plague-doctor': pd1Outbreak,
  'merchant-prince': mp1Opportunity,

  // Bounties
  'bounty-rats': bountyRats,
  'bounty-patrol': bountyPatrol,
  'bounty-herbs': bountyHerbs,
  'bounty-delivery': bountyDelivery,
  'bounty-escort': bountyEscort,
  'bounty-cleanup': bountyCleanup,
  'bounty-gather': bountyGather,
  'bounty-lost-item': bountyLostItem,
  'bounty-sparring': bountySparring,
  'bounty-town-crier': bountyTownCrier,
  'bounty-cart-repair': bountyCartRepair,
  'bounty-goblin-thief': bountyGoblinThief,
  'bounty-well-testing': bountyWellTesting,
  'bounty-scribe-work': bountyScribeWork,
  'bounty-graveyard-watch': bountyGraveyardWatch,
  'bounty-stray-hound': bountyStrayHound,
  'bounty-fake-coins': bountyFakeCoins,
  'bounty-barrel-chase': bountyBarrelChase,
};

/**
 * Get the woodcut illustration for a quest, bounty, or chain step.
 */
export function getQuestImage(questId?: string | null): string | undefined {
  if (!questId) return undefined;

  // Direct match
  if (QUEST_IMAGES[questId]) return QUEST_IMAGES[questId];

  // Strip prefixes (chain:, bounty:, nlchain:)
  const stripped = questId.replace(/^(chain|bounty|nlchain):/, '');
  if (QUEST_IMAGES[stripped]) return QUEST_IMAGES[stripped];

  // Partial match
  for (const [key, img] of Object.entries(QUEST_IMAGES)) {
    if (questId.includes(key) || key.includes(stripped)) {
      return img;
    }
  }

  return undefined;
}
