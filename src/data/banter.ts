// Banter system - NPCs occasionally say witty comments or gossip
// Triggered randomly when player interacts with location
// Context-aware lines reflect what player and AI have achieved

import type { LocationId } from '@/types/game.types';
import type { Player } from '@/types/game.types';

export interface BanterLine {
  text: string;
  mood?: 'friendly' | 'grumpy' | 'mysterious' | 'gossip' | 'warning';
}

// Chance (0-1) that banter triggers on any interaction
export const BANTER_CHANCE = 0.30; // 30% chance (raised from 25% for more variety)

// Cooldown in ms before same NPC can banter again
export const BANTER_COOLDOWN = 25000; // 25 seconds

// Static banter lines per NPC/location
export const BANTER_LINES: Partial<Record<LocationId, BanterLine[]>> = {
  'guild-hall': [
    { text: "Heard Grimwald's been eyeing the same quest as you...", mood: 'gossip' },
    { text: "Back in my day, we didn't have fancy armor. Just courage!", mood: 'grumpy' },
    { text: "The guild coffers are looking healthy this season.", mood: 'friendly' },
    { text: "Watch yourself in the caves. Lost three adventurers last month.", mood: 'warning' },
    { text: "Some say Shadowfingers has eyes everywhere...", mood: 'mysterious' },
    { text: "Your reputation precedes you, adventurer.", mood: 'friendly' },
    { text: "The higher ranks bring better quests. And better pay.", mood: 'friendly' },
    { text: "Don't let the rankings get to your head. Stay sharp.", mood: 'grumpy' },
    { text: "The notice board's been busy lately. Lots of work for those willing.", mood: 'friendly' },
    { text: "A wise adventurer checks the quest board before heading into the wilds.", mood: 'friendly' },
    { text: "I've seen guild members rise and fall. Consistency is what separates them.", mood: 'grumpy' },
    { text: "Between us, some of these quests aren't worth the parchment they're printed on.", mood: 'gossip' },
    { text: "The guild's seen better days, but we keep the lanterns lit.", mood: 'grumpy' },
    { text: "Every adventurer starts at the bottom. The good ones don't stay there.", mood: 'friendly' },
  ],

  'bank': [
    { text: "Gold doesn't grow on trees. Well, except in the Enchanted Forest.", mood: 'friendly' },
    { text: "Interest rates are quite favorable this quarter.", mood: 'friendly' },
    { text: "I've seen adventurers come and go. The smart ones save.", mood: 'grumpy' },
    { text: "Between us, the stock market's been volatile lately...", mood: 'gossip' },
    { text: "Your savings are protected by ancient dwarven vaults.", mood: 'friendly' },
    { text: "Lord Pemberton withdrew his entire fortune yesterday. Curious...", mood: 'gossip' },
    { text: "A gold piece saved is a gold piece earned, as they say.", mood: 'friendly' },
    { text: "The Crown Bonds are stable. Nothing exciting, but nothing risky.", mood: 'friendly' },
    { text: "Had a fellow try to deposit enchanted fool's gold last week. The vault knew.", mood: 'gossip' },
    { text: "Loans are available, but do read the fine print. Twice.", mood: 'warning' },
    { text: "Keep your gold in the vault. The Slums have sticky fingers.", mood: 'warning' },
    { text: "Our ledgers go back three hundred years. Not a single discrepancy.", mood: 'friendly' },
    { text: "Invest wisely, and your gold works harder than you do.", mood: 'friendly' },
  ],

  'general-store': [
    { text: "Fresh bread just came in from the baker!", mood: 'friendly' },
    { text: "Prices aren't what they used to be, I'm afraid.", mood: 'grumpy' },
    { text: "The wife says I give too many discounts. She's probably right.", mood: 'friendly' },
    { text: "Heard the tavern's got a new ale on tap.", mood: 'gossip' },
    { text: "Stock up before winter. Trust me on this one.", mood: 'warning' },
    { text: "Quality goods at fair prices - that's my motto!", mood: 'friendly' },
    { text: "The lottery tickets are selling fast this week!", mood: 'friendly' },
    { text: "Some folks buy food once and forget. Don't be that adventurer.", mood: 'grumpy' },
    { text: "Had a goblin try to trade mushrooms for bread yesterday. Almost took the deal.", mood: 'gossip' },
    { text: "If you're heading to the caves, grab extra rations. Trust me.", mood: 'warning' },
    { text: "Business has been good since the new adventurers arrived in town.", mood: 'friendly' },
    { text: "My grandfather ran this store. And his grandfather before him.", mood: 'friendly' },
    { text: "The preservation boxes keep food fresh for weeks. Worth every coin.", mood: 'friendly' },
  ],

  'armory': [
    { text: "Steel or leather? Both'll save your life.", mood: 'grumpy' },
    { text: "This blade? Forged it myself. Thirty years experience.", mood: 'friendly' },
    { text: "The cave monsters are getting tougher. Upgrade while you can.", mood: 'warning' },
    { text: "Seen adventurers rely on cheap gear. Seen 'em not come back too.", mood: 'grumpy' },
    { text: "The enchanter and I have a partnership. Good enchantments on good steel.", mood: 'friendly' },
    { text: "Your armor's looking a bit worn. Just saying.", mood: 'friendly' },
    { text: "A dagger won't stop a dragon. Just so you know.", mood: 'warning' },
    { text: "Every scratch on a shield tells a story of survival.", mood: 'friendly' },
    { text: "The enchanted blades practically swing themselves. Well, almost.", mood: 'friendly' },
    { text: "I temper every piece by hand. No shortcuts in this shop.", mood: 'grumpy' },
    { text: "The tower shields are popular with cave divers. Wise choice.", mood: 'friendly' },
    { text: "Chainmail's heavy, but you'll thank me when a goblin swings at you.", mood: 'grumpy' },
    { text: "Some say the best armor is not getting hit. I say that's bad for business.", mood: 'friendly' },
  ],

  'enchanter': [
    { text: "The magical energies are particularly strong today...", mood: 'mysterious' },
    { text: "I sense great potential in you. Or is that just the herbs?", mood: 'friendly' },
    { text: "Every enchantment tells a story. What's yours?", mood: 'mysterious' },
    { text: "The shadow market sells knockoff enchantments. Buyer beware.", mood: 'warning' },
    { text: "My crystals whisper of interesting times ahead...", mood: 'mysterious' },
    { text: "Magic is not about power. It's about understanding.", mood: 'friendly' },
    { text: "The healing waters are drawn from the Moonwell. Ancient magic.", mood: 'mysterious' },
    { text: "That scrying mirror in my shop? It shows more than reflections...", mood: 'mysterious' },
    { text: "Broken appliance? I've mended worse. Once fixed a music box that played backwards.", mood: 'friendly' },
    { text: "The ley lines are shifting. Even my tea leaves taste different.", mood: 'mysterious' },
    { text: "Some ailments need more than herbs. That's where I come in.", mood: 'friendly' },
    { text: "The Arcane Tome chose you, you know. They always choose.", mood: 'mysterious' },
    { text: "Watch the candles. When they flicker without wind, something listens.", mood: 'warning' },
  ],

  'shadow-market': [
    { text: "You didn't see me. I didn't see you. We good?", mood: 'mysterious' },
    { text: "Got some items that... fell off a cart. Interested?", mood: 'gossip' },
    { text: "The guards have been sniffing around. Keep it quiet.", mood: 'warning' },
    { text: "Heard Shadowfingers is planning something big...", mood: 'gossip' },
    { text: "Quality merchandise, no questions asked.", mood: 'friendly' },
    { text: "Everyone's got secrets. I just help trade 'em.", mood: 'mysterious' },
    { text: "Lower your voice. Walls have ears around here.", mood: 'warning' },
    { text: "The intel I sell is worth more than gold. Usually.", mood: 'gossip' },
    { text: "Last customer wanted a cursed ring. Some people, honestly.", mood: 'gossip' },
    { text: "If the enchanter's prices offend you, I have... alternatives.", mood: 'mysterious' },
    { text: "No refunds, no receipts, no problems. That's how we do business.", mood: 'grumpy' },
    { text: "Word on the street is someone's been snooping around the vaults.", mood: 'gossip' },
    { text: "The cheaper the deal, the bigger the catch. Usually.", mood: 'warning' },
  ],

  'academy': [
    { text: "Knowledge is the greatest treasure of all.", mood: 'friendly' },
    { text: "The library has some fascinating new acquisitions...", mood: 'friendly' },
    { text: "I remember when you couldn't tell a grimoire from a cookbook!", mood: 'friendly' },
    { text: "Education is an investment in yourself.", mood: 'friendly' },
    { text: "Some students think they know everything. They learn.", mood: 'grumpy' },
    { text: "The mage courses are particularly challenging this term.", mood: 'warning' },
    { text: "Combat Training isn't just swinging a sword. There's theory too.", mood: 'friendly' },
    { text: "The Junior Academy graduates make the best entry-level workers.", mood: 'friendly' },
    { text: "A degree opens doors that gold alone cannot.", mood: 'friendly' },
    { text: "Don't rush your studies. The knowledge sticks better when you take your time.", mood: 'grumpy' },
    { text: "Had a student accidentally summon a toad in Arcane Studies. Classic.", mood: 'gossip' },
    { text: "The Scholar path leads to the finest minds in the realm.", mood: 'friendly' },
    { text: "Sage Studies is no joke. Only the dedicated make it through.", mood: 'warning' },
  ],

  'rusty-tankard': [
    { text: "What'll it be? We've got ale, mead, and... more ale.", mood: 'friendly' },
    { text: "You look like you need a drink. Or three.", mood: 'friendly' },
    { text: "Heard the funniest rumor about the guild master...", mood: 'gossip' },
    { text: "The bard's playing tonight. Should be a good crowd.", mood: 'friendly' },
    { text: "Between you and me, the stew's better than it looks.", mood: 'gossip' },
    { text: "Adventurers come here to forget their troubles. Works every time.", mood: 'friendly' },
    { text: "Tips aren't mandatory, but they're appreciated!", mood: 'friendly' },
    { text: "Last night someone arm-wrestled a troll. Lost an arm. Won the bet, though.", mood: 'gossip' },
    { text: "If the music's too loud, you're too old. That's my policy.", mood: 'grumpy' },
    { text: "We had a ghost in the cellar once. Served him anyway. Good tipper.", mood: 'gossip' },
    { text: "The mead here is brewed with honey from the Whispering Hills.", mood: 'friendly' },
    { text: "Relax, have a drink, and let the world sort itself out for a while.", mood: 'friendly' },
    { text: "Some adventurers live here. Not the proud ones, mind you.", mood: 'grumpy' },
    { text: "Heard there's a drinking contest next weekend. Fancy your chances?", mood: 'friendly' },
  ],

  'cave': [
    { text: "The darkness whispers of treasure... and danger.", mood: 'mysterious' },
    { text: "Many enter. Fewer leave. Such is the way.", mood: 'warning' },
    { text: "The deeper floors hold greater rewards.", mood: 'mysterious' },
    { text: "Something stirs in the depths...", mood: 'warning' },
    { text: "I've mapped the first three floors. Beyond that... good luck.", mood: 'grumpy' },
    { text: "The goblins on Floor 1 are child's play. Floor 5? Different story.", mood: 'warning' },
    { text: "Bring a shield. The creatures down there hit harder than you'd think.", mood: 'warning' },
    { text: "Legend says the Abyss holds treasures beyond imagination.", mood: 'mysterious' },
    { text: "Rest here if you must. The cave entrance is safe... mostly.", mood: 'friendly' },
    { text: "The Dragon's Lair is no place for the unprepared.", mood: 'warning' },
  ],

  'forge': [
    { text: "Hard work and hot iron - that's the life.", mood: 'grumpy' },
    { text: "Looking for work? I could use an extra hand.", mood: 'friendly' },
    { text: "The smell of molten metal never gets old.", mood: 'friendly' },
    { text: "Quality craftsmanship takes time. And sweat.", mood: 'grumpy' },
    { text: "The armory buys everything I make. Good partnership.", mood: 'friendly' },
    { text: "Tempering makes a good blade great. Don't skip it.", mood: 'grumpy' },
    { text: "My apprentice burned his eyebrows off yesterday. Second time this month.", mood: 'gossip' },
    { text: "The heat in here builds character. Or so I keep telling myself.", mood: 'friendly' },
    { text: "Each weapon I make, I name. Don't ask me why.", mood: 'friendly' },
    { text: "Dragon-forged steel is the dream. Haven't found a dragon willing to help, though.", mood: 'gossip' },
  ],

  'landlord': [
    { text: "Rent's due. You know the drill.", mood: 'grumpy' },
    { text: "Nice place, isn't it? Worth every gold piece.", mood: 'friendly' },
    { text: "The previous tenant left in a hurry. Don't ask why.", mood: 'mysterious' },
    { text: "Upgrade to better lodgings? I've got options.", mood: 'friendly' },
    { text: "Pay on time and we'll get along just fine.", mood: 'grumpy' },
    { text: "Housing market's tight. You're lucky to have a place.", mood: 'warning' },
    { text: "Noble Heights has never had a robbery. Not once.", mood: 'friendly' },
    { text: "The Slums... well, you get what you pay for.", mood: 'grumpy' },
    { text: "Prepay a few weeks and lock in your rate. Smart move.", mood: 'friendly' },
    { text: "I've evicted three tenants this month alone. Don't be the fourth.", mood: 'warning' },
    { text: "The walls in Noble Heights are thick. Privacy guaranteed.", mood: 'friendly' },
    { text: "Had a tenant keep a basilisk as a pet once. Turned my carpet to stone.", mood: 'gossip' },
  ],

  'graveyard': [
    { text: "The dead have much to teach... if you listen.", mood: 'mysterious' },
    { text: "Another one risen. The spirits are generous today.", mood: 'friendly' },
    { text: "Don't disturb the old graves. Those ones don't come back friendly.", mood: 'warning' },
    { text: "I've dug more holes than I can count. Filled a few back in, too.", mood: 'grumpy' },
    { text: "They say the cemetery is haunted. I say it's just... lively.", mood: 'gossip' },
    { text: "The fog rolls in thick some nights. Best not to wander alone.", mood: 'warning' },
    { text: "Some adventurers visit just for the atmosphere. Takes all kinds.", mood: 'grumpy' },
    { text: "A prayer here goes a long way. The spirits appreciate it.", mood: 'friendly' },
    { text: "I've seen things crawl out of these graves that'd turn your hair white.", mood: 'warning' },
    { text: "Meditation among the dead clears the mind. Don't knock it.", mood: 'mysterious' },
  ],

  'fence': [
    { text: "Buy, sell, or take a gamble? I'm your guy.", mood: 'friendly' },
    { text: "Got something valuable? I'll give you a fair price. Mostly.", mood: 'gossip' },
    { text: "The dice are feeling lucky tonight...", mood: 'mysterious' },
    { text: "No refunds. No returns. No exceptions.", mood: 'grumpy' },
    { text: "I've got connections. Just say the word.", mood: 'mysterious' },
    { text: "Some call it gambling. I call it... strategic investment.", mood: 'friendly' },
    { text: "Pawning something? No judgment here. Everyone hits hard times.", mood: 'friendly' },
    { text: "I once bought a 'magic' lamp. It was just a lamp. With a moth inside.", mood: 'gossip' },
    { text: "The wheel of fortune spins for all. Some just spin it better.", mood: 'mysterious' },
    { text: "I appraise by weight, shine, and gut feeling. Mostly gut feeling.", mood: 'grumpy' },
  ],
};

// Get a random banter line for a location
export function getRandomBanter(locationId: LocationId): BanterLine | null {
  const lines = BANTER_LINES[locationId];
  if (!lines || lines.length === 0) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}

// Check if banter should trigger (based on chance)
export function shouldTriggerBanter(): boolean {
  return Math.random() < BANTER_CHANCE;
}

// --- Context-aware banter ---
// Generates banter that reflects what the player and AI opponents have been doing

export function getContextBanter(
  locationId: LocationId,
  player: Player,
  allPlayers: Player[],
): BanterLine | null {
  const candidates: BanterLine[] = [];
  const aiPlayers = allPlayers.filter(p => p.isAI && !p.isGameOver);
  const humanPlayers = allPlayers.filter(p => !p.isAI && !p.isGameOver);

  // --- Player achievement banter ---

  // Player cleared dungeon floors
  if (player.dungeonFloorsCleared.length >= 5) {
    candidates.push({ text: `All five dungeon floors cleared? You're braver than you look!`, mood: 'friendly' });
    candidates.push({ text: `They're calling you the Dungeon Conqueror. Not bad, not bad at all.`, mood: 'gossip' });
  } else if (player.dungeonFloorsCleared.length >= 3) {
    candidates.push({ text: `Three floors of the dungeon? Most adventurers stop at one.`, mood: 'friendly' });
  }

  // Player has many degrees
  if (player.completedDegrees.length >= 5) {
    candidates.push({ text: `With that many degrees, you could teach at the Academy yourself!`, mood: 'friendly' });
    candidates.push({ text: `The most educated adventurer in Guildholm. The scholars are jealous.`, mood: 'gossip' });
  } else if (player.completedDegrees.length >= 3) {
    candidates.push({ text: `Three degrees already? Someone's been hitting the books.`, mood: 'friendly' });
  }

  // Player is rich
  const totalWealth = player.gold + player.savings;
  if (totalWealth > 2000) {
    candidates.push({ text: `Word is you've got more gold than the bank itself!`, mood: 'gossip' });
    candidates.push({ text: `The wealthy ones always attract attention. And not always the good kind.`, mood: 'warning' });
  } else if (totalWealth > 1000) {
    candidates.push({ text: `Your purse sounds heavy. Business must be good.`, mood: 'friendly' });
  }

  // Player is broke
  if (player.gold < 10 && player.savings < 10) {
    candidates.push({ text: `Times are tough, eh? We've all been there.`, mood: 'friendly' });
    candidates.push({ text: `Maybe the Fence can help you turn something into coin.`, mood: 'gossip' });
    candidates.push({ text: `Can't buy anything with empty pockets. Just saying.`, mood: 'grumpy' });
  }

  // Player has high dependability (career goal)
  if (player.dependability >= 80) {
    candidates.push({ text: `Most reliable adventurer in town, I hear. Employers love you.`, mood: 'friendly' });
    candidates.push({ text: `Your dependability is legendary. The guild takes notice.`, mood: 'friendly' });
  }

  // Player has a good job
  if (player.currentWage >= 20) {
    candidates.push({ text: `That's a fine job you've got. Not many earn that kind of wage.`, mood: 'friendly' });
    candidates.push({ text: `Top earner in the guild, aren't you? Don't let it go to your head.`, mood: 'grumpy' });
  } else if (!player.currentJob) {
    candidates.push({ text: `Between jobs? The Guild Hall has postings, if you're interested.`, mood: 'friendly' });
  }

  // Player is sick
  if (player.isSick) {
    candidates.push({ text: `You don't look so good. The enchanter might be able to help.`, mood: 'warning' });
    candidates.push({ text: `That cough sounds nasty. See a healer before it gets worse.`, mood: 'warning' });
  }

  // Player health is low
  if (player.health < 30) {
    candidates.push({ text: `You look like you've been through a war. Rest up!`, mood: 'warning' });
    candidates.push({ text: `One more hit and you're done for. Be careful out there.`, mood: 'warning' });
  }

  // Player lives in Noble Heights
  if (player.housing === 'noble') {
    candidates.push({ text: `Living in Noble Heights, eh? Fancy! No robberies up there.`, mood: 'gossip' });
  }

  // Player is homeless
  if (player.housing === 'homeless') {
    candidates.push({ text: `Sleeping on the streets? The Landlord has rooms, you know.`, mood: 'warning' });
    candidates.push({ text: `No roof over your head? That's a hard life, friend.`, mood: 'friendly' });
  }

  // Player has the guild pass
  if (player.hasGuildPass && player.completedQuests >= 10) {
    candidates.push({ text: `${player.completedQuests} quests completed! You're practically a legend.`, mood: 'friendly' });
  }

  // Player is old
  if (player.age >= 50) {
    candidates.push({ text: `Still adventuring at your age? Respect. Most retire by 40.`, mood: 'friendly' });
    candidates.push({ text: `The years add wisdom... and creaky joints.`, mood: 'grumpy' });
  }

  // --- AI opponent banter ---

  for (const ai of aiPlayers) {
    // AI cleared more dungeon floors than player
    if (ai.dungeonFloorsCleared.length > player.dungeonFloorsCleared.length && ai.dungeonFloorsCleared.length >= 3) {
      candidates.push({ text: `${ai.name} has cleared ${ai.dungeonFloorsCleared.length} dungeon floors. You'd better catch up!`, mood: 'gossip' });
    }

    // AI has more degrees
    if (ai.completedDegrees.length > player.completedDegrees.length && ai.completedDegrees.length >= 3) {
      candidates.push({ text: `${ai.name} has been studying hard. ${ai.completedDegrees.length} degrees already!`, mood: 'gossip' });
    }

    // AI is richer
    const aiWealth = ai.gold + ai.savings;
    if (aiWealth > totalWealth + 500 && aiWealth > 500) {
      candidates.push({ text: `${ai.name}'s coffers are overflowing. Competition's heating up!`, mood: 'gossip' });
    }

    // AI has a better job
    if (ai.currentWage > player.currentWage + 5 && ai.currentWage >= 15) {
      candidates.push({ text: `${ai.name} landed a ${ai.currentWage}g/hr job. Quite the earner.`, mood: 'gossip' });
    }

    // AI has high happiness
    if (ai.happiness > player.happiness + 20 && ai.happiness > 50) {
      candidates.push({ text: `${ai.name} seems awfully cheerful lately. What's their secret?`, mood: 'gossip' });
    }

    // AI died recently
    if (ai.isGameOver) {
      candidates.push({ text: `Poor ${ai.name}. The dungeon took another one.`, mood: 'friendly' });
      candidates.push({ text: `${ai.name}'s out of the game. One less competitor, I suppose.`, mood: 'gossip' });
    }

    // AI has guild pass but player doesn't
    if (ai.hasGuildPass && !player.hasGuildPass) {
      candidates.push({ text: `${ai.name} already bought a Guild Pass. Have you considered getting one?`, mood: 'gossip' });
    }

    // AI lives in Noble Heights, player in Slums
    if (ai.housing === 'noble' && player.housing === 'slums') {
      candidates.push({ text: `${ai.name} moved to Noble Heights. Living the high life!`, mood: 'gossip' });
    }

    // AI dependability is high
    if (ai.dependability > player.dependability + 20 && ai.dependability >= 60) {
      candidates.push({ text: `${ai.name}'s reputation at work is stellar. Employers adore them.`, mood: 'gossip' });
    }
  }

  // --- Competitive banter (human vs AI) ---
  if (aiPlayers.length > 0 && humanPlayers.length > 0) {
    const leadingAI = aiPlayers.reduce((best, p) =>
      (p.gold + p.savings) > (best.gold + best.savings) ? p : best, aiPlayers[0]);

    if ((leadingAI.gold + leadingAI.savings) > totalWealth + 300) {
      candidates.push({ text: `${leadingAI.name} is pulling ahead in the wealth race. Better step it up!`, mood: 'warning' });
    }

    // Player is ahead of all AI
    const playerAheadOfAll = aiPlayers.every(ai => totalWealth > (ai.gold + ai.savings) + 200);
    if (playerAheadOfAll && totalWealth > 500) {
      candidates.push({ text: `You're outpacing everyone in gold. They're starting to notice.`, mood: 'gossip' });
    }
  }

  // If no context-specific lines, return null (caller falls back to static)
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
