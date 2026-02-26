/**
 * Non-Linear Quest Chains — branching quests with player choices
 * 
 * Design:
 * - Each step can offer 2-3 choices with different outcomes (rewards, next step)
 * - "Multiple paths to completion" — some steps are optional, player picks a route
 * - Choice outcomes affect gold/happiness/health differently
 */

import type { QuestRank, EducationPath, GuildRank, LocationId } from '@/types/game.types';
import type { LocationObjective } from '@/data/quests';
import { GUILD_RANK_ORDER } from '@/types/game.types';

/** A choice the player can make at a quest chain step */
export interface QuestChainChoice {
  id: string;
  label: string;
  description: string;
  /** Which step to go to after this choice (step index or 'complete' for chain end) */
  nextStepIndex: number | 'complete';
  /** Reward/penalty modifiers relative to the step's base values */
  goldModifier: number;        // e.g. 1.5 = 50% more gold, 0.5 = 50% less
  happinessModifier: number;
  healthRiskModifier: number;
  timeModifier: number;
  /** Optional bonus text shown on completion */
  outcomeText?: string;
}

/** A step in a non-linear quest chain */
export interface NonLinearChainStep {
  id: string;
  name: string;
  description: string;
  descriptionVariants?: string[];
  rank: QuestRank;
  baseGoldReward: number;
  baseTimeRequired: number;
  baseHealthRisk: number;
  baseHappinessReward: number;
  requiredEducation?: { path: EducationPath; level: number };
  requiresDungeonFloor?: number;
  /** If true, this step is optional — player can skip it */
  optional?: boolean;
  /** Location objectives the player must complete before this step can be handed in */
  locationObjectives?: LocationObjective[];
  /** Choices offered at completion of this step (if empty, auto-advance to next step) */
  choices?: QuestChainChoice[];
}

/** A non-linear quest chain with branching paths */
export interface NonLinearQuestChain {
  id: string;
  name: string;
  description: string;
  requiredGuildRank: GuildRank;
  steps: NonLinearChainStep[];
  /** Minimum steps that must be completed to finish the chain */
  requiredStepCount: number;
  completionBonusGold: number;
  completionBonusHappiness: number;
  completionSummary?: string[];
}

// ============================================================
// Non-Linear Quest Chain Definitions
// ============================================================

export const NON_LINEAR_QUEST_CHAINS: NonLinearQuestChain[] = [
  {
    id: 'thieves-guild',
    name: 'The Thieves\' Guild Affair',
    description: 'A secret guild of thieves operates beneath Guildholm. Your choices determine whether you dismantle them, join them, or play both sides.',
    requiredGuildRank: 'apprentice',
    requiredStepCount: 3,
    completionBonusGold: 180,
    completionBonusHappiness: 12,
    completionSummary: [
      "THE THIEVES' GUILD AFFAIR — COMPLETE\n\nThe underground has been shaken. Whether you brought justice, profited from chaos, or achieved some morally grey middle ground, the city will remember your name. Mostly because the thieves keep saying it. Loudly. In taverns.",
      "THE THIEVES' GUILD AFFAIR — COMPLETE\n\nThe affair is resolved, if 'resolved' means 'complicated in new and interesting ways.' The thieves respect you. The guards suspect you. The merchants don't care as long as their stuff stops disappearing. A qualified success.",
    ],
    steps: [
      {
        id: 'tg-1-investigate',
        name: 'Street Rumours',
        description: 'Investigate rumours of a thieves\' guild operating in the Shadow Market district.',
        descriptionVariants: [
          'Investigate rumours of a thieves\' guild operating in the Shadow Market district.',
          'The city guard wants someone expendable to poke around the Shadow Market. You qualify.',
          'Strange thefts, matching calling cards, and smug grins. Someone is organised. Find out who.',
        ],
        rank: 'D',
        baseGoldReward: 40,
        baseTimeRequired: 6,
        baseHealthRisk: 5,
        baseHappinessReward: 2,
        locationObjectives: [
          {
            id: 'tg1-shadow',
            locationId: 'shadow-market' as LocationId,
            actionText: 'Investigate Shadow Market',
            description: 'Ask around the Shadow Market for information about the thieves\' guild.',
            completionText: 'A nervous merchant whispers a name. You\'re on the right track.',
          },
          {
            id: 'tg1-tavern',
            locationId: 'rusty-tankard' as LocationId,
            actionText: 'Gather Rumours',
            description: 'Gather rumours from the regulars at the Rusty Tankard.',
            completionText: 'A drunk dockworker slurs out a meeting place. Helpful, if you can decipher his accent.',
          },
        ],
        choices: [
          {
            id: 'tg-1-report',
            label: 'Report to the Guard',
            description: 'Turn over your findings to the city guard. Lawful, safe, modest reward.',
            nextStepIndex: 1, // leads to step 2: Raid planning
            goldModifier: 1.0,
            happinessModifier: 1.0,
            healthRiskModifier: 0.5,
            timeModifier: 1.0,
            outcomeText: 'The guard captain nods approvingly. "Good work. We\'ll handle it from here." They won\'t.',
          },
          {
            id: 'tg-1-infiltrate',
            label: 'Infiltrate the Guild',
            description: 'Go undercover and join the thieves. Risky, but potentially very profitable.',
            nextStepIndex: 2, // leads to step 3: Inside Job
            goldModifier: 1.5,
            happinessModifier: 0.8,
            healthRiskModifier: 1.5,
            timeModifier: 1.2,
            outcomeText: 'You make contact with a low-level fence. "Interested in joining? Bring us something valuable and we\'ll talk."',
          },
          {
            id: 'tg-1-blackmail',
            label: 'Sell Info to Both Sides',
            description: 'Play the guard and the thieves against each other. Maximum gold, maximum danger.',
            nextStepIndex: 3, // leads to step 4: Double Agent
            goldModifier: 2.0,
            happinessModifier: 0.5,
            healthRiskModifier: 2.0,
            timeModifier: 1.0,
            outcomeText: 'You sell the guard just enough to look helpful, and warn the thieves just enough to look useful. This can only end well.',
          },
        ],
      },
      {
        id: 'tg-2-raid',
        name: 'The Guard Raid',
        description: 'Help the city guard raid a thieves\' hideout. Combat expected. Bring armour.',
        rank: 'C',
        baseGoldReward: 70,
        baseTimeRequired: 10,
        baseHealthRisk: 20,
        baseHappinessReward: 4,
        requiredEducation: { path: 'fighter', level: 1 },
        locationObjectives: [
          {
            id: 'tg2-armory',
            locationId: 'armory' as LocationId,
            actionText: 'Gear Up at the Armory',
            description: 'Prepare for the raid by picking up equipment from the Armory.',
            completionText: 'The armourer hands you a dented shield. "Bring it back in one piece."',
          },
          {
            id: 'tg2-guild',
            locationId: 'guild-hall' as LocationId,
            actionText: 'Coordinate with Guard Captain',
            description: 'Coordinate the raid plan with the guard captain at the Guild Hall.',
            completionText: 'The captain marks positions on a crude map. "We go at dawn. Don\'t be late."',
          },
        ],
        choices: [
          {
            id: 'tg-2-capture',
            label: 'Capture the Leader',
            description: 'Take the guild leader alive for interrogation. Harder but more rewarding.',
            nextStepIndex: 4, // final step
            goldModifier: 1.3,
            happinessModifier: 1.5,
            healthRiskModifier: 1.5,
            timeModifier: 1.0,
            outcomeText: 'The guild leader surrenders after a fierce fight. She has information. Valuable information.',
          },
          {
            id: 'tg-2-loot',
            label: 'Grab the Loot and Run',
            description: 'Forget the arrest — take the valuables during the chaos.',
            nextStepIndex: 'complete',
            goldModifier: 2.0,
            happinessModifier: 0.5,
            healthRiskModifier: 0.8,
            timeModifier: 0.7,
            outcomeText: 'You pocket a surprising amount of gold during the confusion. The guard captain looks disappointed. Your wallet doesn\'t.',
          },
        ],
      },
      {
        id: 'tg-3-inside',
        name: 'The Inside Job',
        description: 'As a new recruit, prove your worth to the thieves\' guild. They want you to steal something.',
        rank: 'C',
        baseGoldReward: 85,
        baseTimeRequired: 8,
        baseHealthRisk: 15,
        baseHappinessReward: 3,
        locationObjectives: [
          {
            id: 'tg3-fence',
            locationId: 'fence' as LocationId,
            actionText: 'Meet the Fence',
            description: 'Your contact at the Fence will give you the heist target.',
            completionText: 'The fence slides a lockpick across the counter. "Third floor, second window. Don\'t mess it up."',
          },
          {
            id: 'tg3-shadow',
            locationId: 'shadow-market' as LocationId,
            actionText: 'Scout the Location',
            description: 'Scout the heist location at the Shadow Market.',
            completionText: 'You count the guards, note the exits, and memorise the patrol pattern. Professional.',
          },
        ],
        choices: [
          {
            id: 'tg-3-steal',
            label: 'Complete the Heist',
            description: 'Pull off the job and earn their trust. You\'re a thief now. Congratulations?',
            nextStepIndex: 4,
            goldModifier: 1.5,
            happinessModifier: 0.7,
            healthRiskModifier: 1.0,
            timeModifier: 1.0,
            outcomeText: 'The heist goes off without a hitch. The guild leader nods. "You\'ll do. Welcome to the family."',
          },
          {
            id: 'tg-3-betray',
            label: 'Betray Them to the Guard',
            description: 'Use your inside position to bring them down. Risky if they find out.',
            nextStepIndex: 'complete',
            goldModifier: 0.8,
            happinessModifier: 1.5,
            healthRiskModifier: 2.0,
            timeModifier: 1.0,
            outcomeText: 'The guard swoops in at the perfect moment. The thieves curse your name. The guard captain buys you a drink. Fair trade.',
          },
        ],
      },
      {
        id: 'tg-4-double',
        name: 'The Double Agent',
        description: 'Playing both sides is profitable but exhausting. One wrong move and you\'re done.',
        rank: 'B',
        baseGoldReward: 120,
        baseTimeRequired: 12,
        baseHealthRisk: 30,
        baseHappinessReward: 2,
        optional: true,
        locationObjectives: [
          {
            id: 'tg4-tavern',
            locationId: 'rusty-tankard' as LocationId,
            actionText: 'Meet Your Contact',
            description: 'Exchange information with your double-agent contact at the Rusty Tankard.',
            completionText: 'Your contact slides an envelope across the table. "Both sides are getting suspicious. Be careful."',
          },
          {
            id: 'tg4-fence',
            locationId: 'fence' as LocationId,
            actionText: 'Exchange Coded Messages',
            description: 'Exchange coded messages with the thieves\' network through the Fence.',
            completionText: 'The fence decodes the message and burns it. "You\'re in deep. Hope you know what you\'re doing."',
          },
          {
            id: 'tg4-bank',
            locationId: 'bank' as LocationId,
            actionText: 'Stash Earnings',
            description: 'Stash your double-agent earnings at the Bank before anyone notices.',
            completionText: 'The banker doesn\'t ask where the gold came from. Bankers never do.',
          },
        ],
        choices: [
          {
            id: 'tg-4-continue',
            label: 'Keep Playing Both Sides',
            description: 'The money is too good to stop. Push your luck further.',
            nextStepIndex: 4,
            goldModifier: 1.8,
            happinessModifier: 0.3,
            healthRiskModifier: 1.5,
            timeModifier: 1.0,
            outcomeText: 'You survive another week of lies and aliases. Your stress level is through the roof. Your bank account is too.',
          },
          {
            id: 'tg-4-cash-out',
            label: 'Cash Out',
            description: 'Take your earnings and disappear. Sometimes the best move is knowing when to stop.',
            nextStepIndex: 'complete',
            goldModifier: 1.0,
            happinessModifier: 1.5,
            healthRiskModifier: 0.0,
            timeModifier: 0.5,
            outcomeText: 'You quietly sever all ties, change your usual route, and count your gold. Both sides will wonder what happened to you. They\'ll get over it.',
          },
        ],
      },
      {
        id: 'tg-5-finale',
        name: 'The Reckoning',
        description: 'All roads lead here. The thieves\' guild faces its final chapter.',
        rank: 'B',
        baseGoldReward: 150,
        baseTimeRequired: 14,
        baseHealthRisk: 25,
        baseHappinessReward: 8,
        locationObjectives: [
          {
            id: 'tg5-guild',
            locationId: 'guild-hall' as LocationId,
            actionText: 'Rally the Guild',
            description: 'Coordinate the final operation from the Guild Hall.',
            completionText: 'The guild mobilises. Whatever happens next, it ends tonight.',
          },
          {
            id: 'tg5-armory',
            locationId: 'armory' as LocationId,
            actionText: 'Final Gear Check',
            description: 'Final gear check before the showdown at the Armory.',
            completionText: 'Every blade sharpened, every strap tightened. You\'re as ready as you\'ll ever be.',
          },
        ],
      },
    ],
  },
  {
    id: 'cursed-artifact',
    name: 'The Cursed Artifact',
    description: 'A mysterious artifact surfaces at the Shadow Market. It whispers. It glows. Someone should probably deal with that.',
    requiredGuildRank: 'journeyman',
    requiredStepCount: 2,
    completionBonusGold: 250,
    completionBonusHappiness: 15,
    completionSummary: [
      "THE CURSED ARTIFACT — COMPLETE\n\nThe artifact has been dealt with. Whether you destroyed it, purified it, or kept its power for yourself, the whispers have stopped. Mostly. That faint humming is probably just tinnitus. Probably.",
      "THE CURSED ARTIFACT — COMPLETE\n\nThe crisis is over. The artifact's curse has been broken — or contained — or redirected — depending on your choices. The Academy wants to study it. The Enchanter wants to sell it. The artifact wants to consume all mortal souls. Standard disagreement.",
    ],
    steps: [
      {
        id: 'ca-1-acquire',
        name: 'The Whispering Stone',
        description: 'Acquire the artifact from the Shadow Market before someone else does. The price is steep. The alternative is steeper.',
        rank: 'C',
        baseGoldReward: 30,
        baseTimeRequired: 6,
        baseHealthRisk: 10,
        baseHappinessReward: 2,
        locationObjectives: [
          {
            id: 'ca1-shadow',
            locationId: 'shadow-market' as LocationId,
            actionText: 'Find the Artifact',
            description: 'Locate the whispering artifact among the Shadow Market stalls.',
            completionText: 'You find the artifact on a dusty shelf, glowing faintly. The merchant watches you nervously.',
          },
          {
            id: 'ca1-enchanter',
            locationId: 'enchanter' as LocationId,
            actionText: 'Identify the Magic',
            description: 'Have the Enchanter identify the artifact\'s magic before you commit.',
            completionText: 'The enchanter\'s eyes widen. "This is old magic. Very old. And very angry."',
          },
        ],
        choices: [
          {
            id: 'ca-1-buy',
            label: 'Buy It (100g)',
            description: 'Pay the asking price. Clean, simple, expensive.',
            nextStepIndex: 1,
            goldModifier: 0.5, // costs money up front
            happinessModifier: 1.0,
            healthRiskModifier: 0.5,
            timeModifier: 0.8,
            outcomeText: 'The merchant seems relieved to be rid of it. "No refunds," she says, already walking away. Fast.',
          },
          {
            id: 'ca-1-steal',
            label: 'Steal It',
            description: 'Five-finger discount. The artifact calls to you anyway.',
            nextStepIndex: 1,
            goldModifier: 1.5,
            happinessModifier: 0.7,
            healthRiskModifier: 1.5,
            timeModifier: 1.2,
            outcomeText: 'You pocket the artifact while the merchant argues with a customer. It vibrates in your pocket. Disturbingly.',
          },
          {
            id: 'ca-1-negotiate',
            label: 'Negotiate a Deal',
            description: 'Convince the merchant to give it to you in exchange for a future favour. What could go wrong?',
            nextStepIndex: 2, // skip to step 3 (different path)
            goldModifier: 1.0,
            happinessModifier: 1.2,
            healthRiskModifier: 1.0,
            timeModifier: 1.5,
            outcomeText: '"I\'ll remember this favour," the merchant says with a smile that promises future complications.',
          },
        ],
      },
      {
        id: 'ca-2-study',
        name: 'Arcane Analysis',
        description: 'Take the artifact to the Academy for study. The scholars are excited. That\'s usually a bad sign.',
        rank: 'C',
        baseGoldReward: 60,
        baseTimeRequired: 10,
        baseHealthRisk: 15,
        baseHappinessReward: 4,
        requiredEducation: { path: 'mage', level: 1 },
        locationObjectives: [
          {
            id: 'ca2-academy',
            locationId: 'academy' as LocationId,
            actionText: 'Consult the Scholars',
            description: 'Bring the artifact to the Academy for arcane analysis.',
            completionText: 'The head scholar adjusts her spectacles. "Fascinating. Also terrifying. Mostly terrifying."',
          },
          {
            id: 'ca2-enchanter',
            locationId: 'enchanter' as LocationId,
            actionText: 'Borrow Instruments',
            description: 'Borrow arcane instruments from the Enchanter for the analysis.',
            completionText: 'The enchanter reluctantly lends you a set of crystal lenses. "If you break them, you buy them."',
          },
        ],
        choices: [
          {
            id: 'ca-2-destroy',
            label: 'Destroy the Artifact',
            description: 'Shatter it and end the curse. Safe, responsible, boring.',
            nextStepIndex: 'complete',
            goldModifier: 0.5,
            happinessModifier: 1.5,
            healthRiskModifier: 0.3,
            timeModifier: 0.8,
            outcomeText: 'The artifact shatters with a scream. The scholars look disappointed. Everyone else looks relieved.',
          },
          {
            id: 'ca-2-purify',
            label: 'Attempt Purification',
            description: 'Try to cleanse the curse while keeping the artifact\'s power. Risky but rewarding.',
            nextStepIndex: 3,
            goldModifier: 1.0,
            happinessModifier: 1.0,
            healthRiskModifier: 1.5,
            timeModifier: 1.3,
            outcomeText: 'The purification ritual begins. The artifact resists. This will take time and probably some screaming.',
          },
          {
            id: 'ca-2-keep',
            label: 'Keep Its Power',
            description: 'Embrace the artifact\'s dark energy. Power at a price.',
            nextStepIndex: 'complete',
            goldModifier: 2.0,
            happinessModifier: 0.3,
            healthRiskModifier: 2.0,
            timeModifier: 0.5,
            outcomeText: 'The artifact\'s power flows into you. It feels incredible. The whispers are louder now. They say helpful things. Mostly.',
          },
        ],
      },
      {
        id: 'ca-3-favour',
        name: 'The Merchant\'s Favour',
        description: 'The Shadow Market merchant calls in her favour. She wants you to retrieve something from the dungeon. Of course she does.',
        rank: 'B',
        baseGoldReward: 100,
        baseTimeRequired: 14,
        baseHealthRisk: 25,
        baseHappinessReward: 5,
        requiresDungeonFloor: 2,
        locationObjectives: [
          {
            id: 'ca3-store',
            locationId: 'general-store' as LocationId,
            actionText: 'Gather Supplies',
            description: 'Pick up dungeon supplies at the General Store before heading underground.',
            completionText: 'Rope, torches, antidotes. The shopkeeper asks no questions. Smart shopkeeper.',
          },
          {
            id: 'ca3-shadow',
            locationId: 'shadow-market' as LocationId,
            actionText: 'Meet the Merchant',
            description: 'Meet the merchant at the Shadow Market for final instructions.',
            completionText: 'The merchant draws a map on a napkin. "Floor two, third corridor, behind the statue. Don\'t touch anything else."',
          },
        ],
        choices: [
          {
            id: 'ca-3-complete',
            label: 'Honour the Deal',
            description: 'Complete the favour and part ways cleanly.',
            nextStepIndex: 'complete',
            goldModifier: 1.0,
            happinessModifier: 1.2,
            healthRiskModifier: 1.0,
            timeModifier: 1.0,
            outcomeText: 'The merchant accepts the delivery with a nod. "We\'re even." You hope she means it.',
          },
          {
            id: 'ca-3-keep-item',
            label: 'Keep What You Found',
            description: 'Whatever you retrieved from the dungeon, it\'s yours now. The merchant won\'t be happy.',
            nextStepIndex: 'complete',
            goldModifier: 1.8,
            happinessModifier: 0.5,
            healthRiskModifier: 0.5,
            timeModifier: 0.8,
            outcomeText: 'You decide the dungeon loot is worth more than a merchant\'s goodwill. She\'ll remember this. Merchants always remember.',
          },
        ],
      },
      {
        id: 'ca-4-purify-ritual',
        name: 'The Purification Ritual',
        description: 'The final step of the purification. Success means a powerful ally. Failure means... well, best not to think about failure.',
        rank: 'A',
        baseGoldReward: 200,
        baseTimeRequired: 16,
        baseHealthRisk: 35,
        baseHappinessReward: 10,
        requiredEducation: { path: 'mage', level: 2 },
        locationObjectives: [
          {
            id: 'ca4-enchanter',
            locationId: 'enchanter' as LocationId,
            actionText: 'Prepare the Ritual',
            description: 'The Enchanter has the reagents needed for the purification ritual.',
            completionText: 'The enchanter hands you a vial of shimmering liquid. "One drop. No more. Probably."',
          },
          {
            id: 'ca4-academy',
            locationId: 'academy' as LocationId,
            actionText: 'Consult Ritual Texts',
            description: 'Consult the final ritual texts at the Academy.',
            completionText: 'The ancient tome describes the ritual in excruciating detail. Step 47: "Do not sneeze."',
          },
          {
            id: 'ca4-graveyard',
            locationId: 'graveyard' as LocationId,
            actionText: 'Gather Reagents',
            description: 'Gather midnight reagents from the Graveyard.',
            completionText: 'You collect the reagents by moonlight. The spirits watch silently. At least you hope they\'re just watching.',
          },
        ],
      },
    ],
  },

  // ── New branching chains (2026-02-25) ──────────────────────────
  {
    id: 'plague-doctor',
    name: 'The Plague Doctor',
    description: 'A mysterious illness sweeps through the Slums. Is it natural? Magical? Or deliberate? Your choices determine who gets the cure — and who pays.',
    requiredGuildRank: 'journeyman',
    requiredStepCount: 2,
    completionBonusGold: 200,
    completionBonusHappiness: 14,
    completionSummary: [
      "THE PLAGUE DOCTOR — COMPLETE\n\nThe plague is over. The Slums are recovering. Whether you saved everyone, profited from the cure, or exposed the poisoner, the city owes you a debt. They'll pay it in gratitude, which is lovely but doesn't cover rent.",
      "THE PLAGUE DOCTOR — COMPLETE\n\nThe outbreak has ended, the guilty have been dealt with, and the healers are resting. Your reputation as a plague-fighter is assured. The Enchanter wants to name a potion after you. The potion cures nausea. You're not sure how to feel about that.",
    ],
    steps: [
      {
        id: 'pd-1-outbreak',
        name: 'The Outbreak',
        description: 'People in the Slums are falling ill with a mystery disease. Investigate before it spreads to the rest of the city.',
        rank: 'C',
        baseGoldReward: 50,
        baseTimeRequired: 8,
        baseHealthRisk: 15,
        baseHappinessReward: 3,
        locationObjectives: [
          { id: 'pd1-tavern', locationId: 'rusty-tankard' as LocationId, actionText: 'Interview the Sick', description: 'Visit afflicted townsfolk gathering at the Rusty Tankard for news.', completionText: 'The symptoms are consistent: fever, green spots, and an inexplicable craving for cheese. This is no ordinary illness.' },
          { id: 'pd1-enchanter', locationId: 'enchanter' as LocationId, actionText: 'Analyze Symptoms', description: 'Describe the symptoms to the Enchanter for identification.', completionText: 'The Enchanter frowns. "This is alchemical, not natural. Someone brewed this." Someone with a grudge and a chemistry set.' },
        ],
        choices: [
          { id: 'pd-1-cure', label: 'Focus on the Cure', description: 'Prioritize finding a cure. Save lives first, ask questions later.', nextStepIndex: 1, goldModifier: 0.8, happinessModifier: 1.5, healthRiskModifier: 1.0, timeModifier: 1.2, outcomeText: 'You gather samples and head to the Academy. The sick need help now. Justice can wait.' },
          { id: 'pd-1-source', label: 'Hunt the Poisoner', description: 'Track down whoever created this plague. Stop it at the source.', nextStepIndex: 1, goldModifier: 1.3, happinessModifier: 0.8, healthRiskModifier: 1.5, timeModifier: 1.0, outcomeText: 'You follow the trail of alchemical residue through the sewers. Someone is hiding. Someone is about to be found.' },
          { id: 'pd-1-profit', label: 'Sell Cures Privately', description: 'Brew quick remedies and sell them at markup. Capitalism meets compassion.', nextStepIndex: 2, goldModifier: 2.0, happinessModifier: 0.4, healthRiskModifier: 0.5, timeModifier: 0.8, outcomeText: 'You sell watered-down remedies at premium prices. You feel terrible. Your wallet feels great. Moral complexity.' },
        ],
      },
      {
        id: 'pd-2-source',
        name: 'The Source',
        description: 'With clues in hand, trace the plague to its origin. Someone is behind this, and they have a laboratory.',
        rank: 'B',
        baseGoldReward: 90,
        baseTimeRequired: 10,
        baseHealthRisk: 20,
        baseHappinessReward: 5,
        locationObjectives: [
          { id: 'pd2-shadow', locationId: 'shadow-market' as LocationId, actionText: 'Track Ingredients', description: 'Trace the purchase of rare alchemical ingredients through the Shadow Market.', completionText: 'A dealer confirms: someone bought large quantities of wyrm bile and night-bloom. "Weird shopping list," he says. Indeed.' },
          { id: 'pd2-academy', locationId: 'academy' as LocationId, actionText: 'Research the Formula', description: 'Study the plague\'s formula at the Academy to find a permanent cure.', completionText: 'The Academy scholars crack the formula. The cure requires moonflower essence. Expensive but effective. Science wins.' },
        ],
        choices: [
          { id: 'pd-2-expose', label: 'Expose the Alchemist', description: 'Report the culprit to the authorities. Justice served, reputation earned.', nextStepIndex: 'complete', goldModifier: 1.0, happinessModifier: 1.5, healthRiskModifier: 0.5, timeModifier: 1.0, outcomeText: 'The rogue alchemist is arrested. The cure is distributed. The Slums cheer your name. The alchemist does not.' },
          { id: 'pd-2-blackmail', label: 'Blackmail the Alchemist', description: 'They clearly have money. Extract some before handing them over. Or don\'t hand them over.', nextStepIndex: 'complete', goldModifier: 2.0, happinessModifier: 0.5, healthRiskModifier: 1.5, timeModifier: 0.8, outcomeText: 'The alchemist pays handsomely for silence. You provide the cure anyway. Capitalism AND compassion. Sort of.' },
        ],
      },
      {
        id: 'pd-3-cure',
        name: 'The Cure',
        description: 'You have the formula. Now mass-produce the cure and distribute it. Or keep it exclusive. Your call, plague profiteer.',
        rank: 'B',
        baseGoldReward: 120,
        baseTimeRequired: 12,
        baseHealthRisk: 10,
        baseHappinessReward: 8,
        locationObjectives: [
          { id: 'pd3-enchanter', locationId: 'enchanter' as LocationId, actionText: 'Brew the Cure', description: 'Use the Enchanter\'s laboratory to mass-produce the antidote.', completionText: 'Forty vials of antidote bubble on the workbench. The Enchanter is impressed. "You could have been an alchemist," she says. "A legal one."' },
          { id: 'pd3-store', locationId: 'general-store' as LocationId, actionText: 'Distribute the Cure', description: 'Deliver the antidote through the General Store distribution network.', completionText: 'The cure works. The sick recover. Children play again. Someone names their newborn after you. You\'re honoured. And slightly horrified.' },
        ],
      },
    ],
  },
  {
    id: 'merchant-prince',
    name: 'The Merchant Prince',
    description: 'A mysterious trade opportunity promises massive profits. Navigate rival merchants, shady deals, and the eternal question: is this a scam?',
    requiredGuildRank: 'apprentice',
    requiredStepCount: 2,
    completionBonusGold: 160,
    completionBonusHappiness: 10,
    completionSummary: [
      "THE MERCHANT PRINCE — COMPLETE\n\nYour brief foray into commerce is over. Whether you built an empire, burned bridges, or discovered that trade is just fighting with invoices, you've emerged wealthier and wiser. The Merchant Guild has sent a fruit basket. It's not poisoned. Probably.",
      "THE MERCHANT PRINCE — COMPLETE\n\nThe deal is done. The rivals are defeated. The gold is yours. You've learned that the most dangerous weapon in Guildholm isn't a sword — it's a well-worded contract. The lawyers are the real final bosses.",
    ],
    steps: [
      {
        id: 'mp-1-opportunity',
        name: 'The Opportunity',
        description: 'A merchant approaches with a "guaranteed" profit opportunity. The guarantee is verbal. The profit is hypothetical. The opportunity is now.',
        rank: 'D',
        baseGoldReward: 35,
        baseTimeRequired: 6,
        baseHealthRisk: 0,
        baseHappinessReward: 2,
        locationObjectives: [
          { id: 'mp1-store', locationId: 'general-store' as LocationId, actionText: 'Meet the Merchant', description: 'Meet the mysterious merchant at the General Store.', completionText: 'The merchant shows you a ledger of projected profits. The numbers are impressive. The handwriting is suspicious.' },
          { id: 'mp1-bank', locationId: 'bank' as LocationId, actionText: 'Verify the Deal', description: 'Check the merchant\'s credentials at the Bank.', completionText: 'The banker confirms: the merchant is legitimate. Mostly. "Legitimate-adjacent," he says. Close enough.' },
        ],
        choices: [
          { id: 'mp-1-invest', label: 'Invest Heavily', description: 'Go all in. Fortune favours the bold. And occasionally the foolish.', nextStepIndex: 1, goldModifier: 0.5, happinessModifier: 1.0, healthRiskModifier: 0.5, timeModifier: 1.0, outcomeText: 'You invest a significant portion of your savings. The merchant grins. Your stomach churns. One of you is right.' },
          { id: 'mp-1-cautious', label: 'Invest Cautiously', description: 'Small stake, small risk. Smart money. Boring money.', nextStepIndex: 1, goldModifier: 1.0, happinessModifier: 1.0, healthRiskModifier: 0.3, timeModifier: 1.0, outcomeText: 'You invest modestly. The merchant looks slightly disappointed. Your future self will be slightly grateful.' },
          { id: 'mp-1-counter', label: 'Counter-Offer', description: 'You want a bigger cut. Negotiate aggressively. Make them sweat.', nextStepIndex: 1, goldModifier: 1.5, happinessModifier: 0.8, healthRiskModifier: 1.0, timeModifier: 1.3, outcomeText: 'After intense negotiation, you secure better terms. The merchant is furious but agrees. Business is beautiful.' },
        ],
      },
      {
        id: 'mp-2-rivals',
        name: 'The Rivals',
        description: 'Competing merchants want to sabotage your deal. Protect your investment, outmaneuver the competition, or burn it all down.',
        rank: 'C',
        baseGoldReward: 80,
        baseTimeRequired: 10,
        baseHealthRisk: 10,
        baseHappinessReward: 4,
        locationObjectives: [
          { id: 'mp2-shadow', locationId: 'shadow-market' as LocationId, actionText: 'Spy on Rivals', description: 'Gather intelligence on competing merchants at the Shadow Market.', completionText: 'Your rivals are planning a price war. Their strategy involves undercutting you by 40%. Your strategy involves not being undercut.' },
          { id: 'mp2-tavern', locationId: 'rusty-tankard' as LocationId, actionText: 'Recruit Allies', description: 'Find merchants willing to join your side at the Rusty Tankard.', completionText: 'Two merchants agree to an alliance. One wants profit. The other wants revenge. Both are useful.' },
        ],
        choices: [
          { id: 'mp-2-compete', label: 'Outcompete Them', description: 'Play fair and win through superior product. Noble. Expensive.', nextStepIndex: 2, goldModifier: 1.0, happinessModifier: 1.5, healthRiskModifier: 0.5, timeModifier: 1.2, outcomeText: 'You undercut the competition through efficiency and charm. They\'re furious. The customers are delighted. Markets work.' },
          { id: 'mp-2-sabotage', label: 'Sabotage Their Operation', description: 'If you can\'t outprice them, outscheme them. Ethics are flexible.', nextStepIndex: 'complete', goldModifier: 1.8, happinessModifier: 0.5, healthRiskModifier: 1.5, timeModifier: 0.8, outcomeText: 'A small fire in a competitor\'s warehouse (definitely accidental) shifts the market in your favour. Business is war.' },
          { id: 'mp-2-merge', label: 'Propose a Merger', description: 'If you can\'t beat them, acquire them. Corporate strategy in the medieval era.', nextStepIndex: 'complete', goldModifier: 1.3, happinessModifier: 1.2, healthRiskModifier: 0.3, timeModifier: 1.0, outcomeText: 'The rivals agree to merge. You end up controlling 60% of the new entity. The lawyers charge a fortune. Medieval capitalism.' },
        ],
      },
      {
        id: 'mp-3-empire',
        name: 'The Empire',
        description: 'Your trade network is growing. Expand or consolidate. Either way, the Merchant Guild is watching. They\'re either impressed or threatened. Same thing.',
        rank: 'B',
        baseGoldReward: 140,
        baseTimeRequired: 14,
        baseHealthRisk: 15,
        baseHappinessReward: 7,
        locationObjectives: [
          { id: 'mp3-bank', locationId: 'bank' as LocationId, actionText: 'Secure Financing', description: 'Arrange financing for your trade expansion at the Bank.', completionText: 'The banker approves your loan. "You\'re our favourite client this week," he says. "Last week\'s favourite defaulted." Reassuring.' },
          { id: 'mp3-store', locationId: 'general-store' as LocationId, actionText: 'Establish Supply Chain', description: 'Set up a reliable supply chain through the General Store.', completionText: 'Your supply chain is operational. Goods flow in, gold flows out. More gold flows back in. The circle of commerce.' },
          { id: 'mp3-guild', locationId: 'guild-hall' as LocationId, actionText: 'Register Your Empire', description: 'Register your trade empire with the Guild Hall.', completionText: 'The guild clerk stamps your registration with visible envy. "Merchant Prince," the certificate reads. It has a gold border. You earned it.' },
        ],
      },
    ],
  },
];

// ============================================================
// Helper Functions
// ============================================================

export function getNonLinearChain(chainId: string): NonLinearQuestChain | undefined {
  return NON_LINEAR_QUEST_CHAINS.find(c => c.id === chainId);
}

/** Get the current step for a player in a non-linear chain */
export function getCurrentNonLinearStep(
  chainId: string,
  currentStepIndex: number,
): NonLinearChainStep | null {
  const chain = getNonLinearChain(chainId);
  if (!chain) return null;
  if (currentStepIndex >= chain.steps.length) return null;
  return chain.steps[currentStepIndex];
}

/** Check if a player can start/continue a non-linear chain */
export function canTakeNonLinearChainStep(
  chain: NonLinearQuestChain,
  step: NonLinearChainStep,
  guildRank: string,
  education: Record<string, number>,
  dungeonFloorsCleared?: number[]
): { canTake: boolean; reason?: string } {
  const rankIndex = GUILD_RANK_ORDER.indexOf(guildRank as any);
  const requiredIndex = GUILD_RANK_ORDER.indexOf(chain.requiredGuildRank);
  if (rankIndex < requiredIndex) {
    return { canTake: false, reason: `Requires ${chain.requiredGuildRank} rank` };
  }

  if (step.requiredEducation) {
    const playerLevel = education[step.requiredEducation.path] || 0;
    if (playerLevel < step.requiredEducation.level) {
      return { canTake: false, reason: `Requires ${step.requiredEducation.path} level ${step.requiredEducation.level}` };
    }
  }

  const cleared = dungeonFloorsCleared || [];
  if (step.requiresDungeonFloor && !cleared.includes(step.requiresDungeonFloor)) {
    return { canTake: false, reason: `Requires Dungeon Floor ${step.requiresDungeonFloor} cleared` };
  }

  return { canTake: true };
}

/** Calculate actual rewards for a step + choice combination */
export function calculateChoiceRewards(
  step: NonLinearChainStep,
  choice?: QuestChainChoice,
): { gold: number; happiness: number; healthRisk: number; time: number } {
  if (!choice) {
    return {
      gold: step.baseGoldReward,
      happiness: step.baseHappinessReward,
      healthRisk: step.baseHealthRisk,
      time: step.baseTimeRequired,
    };
  }
  return {
    gold: Math.round(step.baseGoldReward * choice.goldModifier),
    happiness: Math.round(step.baseHappinessReward * choice.happinessModifier),
    healthRisk: Math.round(step.baseHealthRisk * choice.healthRiskModifier),
    time: Math.round(step.baseTimeRequired * choice.timeModifier),
  };
}
