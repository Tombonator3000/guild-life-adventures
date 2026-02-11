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
    { text: "We've got a complaints box. It's that bin over there. Next to the fire.", mood: 'grumpy' },
    { text: "Rule one: Don't die. Rule two: If you do die, please file the paperwork first.", mood: 'friendly' },
    { text: "Someone left a severed troll hand on the quest board again. This is why we can't have nice things.", mood: 'grumpy' },
    { text: "The pension plan is excellent. Mostly because very few adventurers survive to collect it.", mood: 'gossip' },
    { text: "I'm not saying the quests are getting worse, but yesterday someone posted one for 'finding a lost sock.'", mood: 'gossip' },
    { text: "We had an adventurer once who tried to negotiate with a dragon. There was a brief exchange of views. And fire.", mood: 'mysterious' },
    { text: "The bureaucracy here would make a dwarven tax office weep with pride.", mood: 'grumpy' },
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
    { text: "We offer a premium vault service. It's the same vault, but the door has a fancier handle.", mood: 'friendly' },
    { text: "The interest rate is 3.7%. I don't know what that means either, but it sounds impressive.", mood: 'gossip' },
    { text: "A wizard tried to conjure gold once. Counterfeit, obviously. The vault set fire to it.", mood: 'gossip' },
    { text: "Our motto: 'Your gold is safe with us.' Our unofficial motto: 'Probably.'", mood: 'friendly' },
    { text: "Someone asked for a loan to pay off another loan. I admired the audacity, if nothing else.", mood: 'gossip' },
    { text: "The thing about compound interest is that nobody understands it. Including us.", mood: 'mysterious' },
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
    { text: "Had a customer ask if the bread was organic. Everything's organic, mate, it's medieval times.", mood: 'grumpy' },
    { text: "My 'Best Before' dates are more of a philosophical suggestion, really.", mood: 'friendly' },
    { text: "We don't do loyalty cards. We do loyalty. Which is to say, you have no choice, I'm the only store.", mood: 'friendly' },
    { text: "A customer returned cheese saying it had gone off. It was supposed to smell like that. I think.", mood: 'gossip' },
    { text: "The salted meat will keep forever. Whether you'd want to eat it forever is another question.", mood: 'grumpy' },
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
    { text: "Customer wanted armor 'that looks cool but is also practical.' I told him to pick one.", mood: 'grumpy' },
    { text: "The enchanted plate is so heavy that wearing it counts as both armor AND exercise.", mood: 'friendly' },
    { text: "Had someone ask for a refund because his sword 'didn't slay the dragon.' What did he expect, a dagger?", mood: 'gossip' },
    { text: "I guarantee all my weapons for life. The weapon's life, not yours.", mood: 'grumpy' },
    { text: "A knight came in asking for 'something lighter.' I gave him a torch.", mood: 'gossip' },
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
    { text: "Magic is perfectly safe. The explosions are entirely a feature, not a bug.", mood: 'friendly' },
    { text: "I once accidentally turned a cat into a slightly different cat. Nobody noticed.", mood: 'gossip' },
    { text: "The universe is held together by magic, willpower, and an alarming amount of string.", mood: 'mysterious' },
    { text: "Please don't touch the glowing thing. I'm not entirely sure what it does, and I made it.", mood: 'warning' },
    { text: "I turned invisible once. It was nice for about five minutes, then people started sitting on me.", mood: 'gossip' },
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
    { text: "Everything here was legally acquired. Well, acquired. Let's leave it at 'acquired.'", mood: 'mysterious' },
    { text: "I'm not a criminal. I'm an unlicensed entrepreneur with flexible ethics.", mood: 'friendly' },
    { text: "The stolen goods aren't stolen. They've been liberated from people who didn't appreciate them.", mood: 'gossip' },
    { text: "This mystery meat is a mystery even to me. And I sold it to myself.", mood: 'gossip' },
    { text: "My prices are so low, even I don't know how I stay in business. Tax evasion, probably.", mood: 'friendly' },
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
    { text: "The exam pass rate is 42%. The survival rate is slightly higher, which is encouraging.", mood: 'gossip' },
    { text: "A student asked if there'd be a test. There's always a test. Life is a test. Welcome.", mood: 'grumpy' },
    { text: "The Alchemy lab was evacuated twice this week. Both times were 'controlled explosions.' Allegedly.", mood: 'gossip' },
    { text: "We teach critical thinking here. The first lesson is questioning why you enrolled.", mood: 'friendly' },
    { text: "The library's restricted section is restricted for a reason. The books bite.", mood: 'warning' },
    { text: "Last week's thesis topic was 'Why Dragons Exist: A Critical Inquiry.' The dragon reviewer was not pleased.", mood: 'gossip' },
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
    { text: "A philosopher walked in and asked for the meaning of life. I gave him an ale. Same thing.", mood: 'gossip' },
    { text: "The stew ingredients are listed on the menu. Well, the ones I can identify are.", mood: 'friendly' },
    { text: "We don't serve spirits here. Actually, we do — one's been haunting the cellar since Tuesday.", mood: 'gossip' },
    { text: "The food here has never killed anyone. That we know of. That complained.", mood: 'friendly' },
    { text: "Every adventurer who comes in here has a story. Most of them aren't true, but the ale doesn't mind.", mood: 'friendly' },
    { text: "Someone tried to pay with 'exposure' last week. I gave them exposure. To the door.", mood: 'grumpy' },
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
    { text: "The cave doesn't care about your feelings. Or your armor. Or your continued existence.", mood: 'grumpy' },
    { text: "Last words of the previous adventurer: 'How bad can it be?' Quite bad, as it turned out.", mood: 'gossip' },
    { text: "The echoes down there sometimes echo things that haven't been said yet. Very unsettling.", mood: 'mysterious' },
    { text: "A sign at the entrance says 'Abandon Hope.' Someone crossed it out and wrote 'Free Loot.'", mood: 'gossip' },
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
    { text: "My apprentice asked if there's a 'cool' way to do smithing. I handed him the tongs. There isn't.", mood: 'grumpy' },
    { text: "I once forged a sword so sharp it cut through the concept of Tuesday. Lost a whole day.", mood: 'gossip' },
    { text: "Health and safety? In a forge? You're standing next to molten metal, what more safety do you want?", mood: 'grumpy' },
    { text: "The anvil's been in the family for seven generations. So has the bruise on my thumb.", mood: 'friendly' },
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
    { text: "Read the lease carefully. Especially clause 47b about 'summoning entities from other planes.'", mood: 'warning' },
    { text: "The Slums have character. Mostly the character of things that skitter in the dark.", mood: 'grumpy' },
    { text: "Noble Heights residents complain about everything. The silence, the comfort, the lack of adventure. Ungrateful lot.", mood: 'gossip' },
    { text: "Eviction is painless. For me. For you it involves a surprisingly strong dwarf.", mood: 'grumpy' },
    { text: "Late fees start after one week. After two weeks, the fee becomes... creative.", mood: 'warning' },
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
    { text: "Death is just nature's way of telling you to stop adventuring. Most people don't listen.", mood: 'friendly' },
    { text: "We offer a resurrection service. The fine print says 'results may vary.' They do.", mood: 'gossip' },
    { text: "A skeleton tried to file a noise complaint last week. Against itself. Philosophical, in a way.", mood: 'gossip' },
    { text: "The tombstones here are very informative. 'Here lies Dave. He didn't listen.' Classic Dave.", mood: 'friendly' },
    { text: "I've buried adventurers who came back, complained about the afterlife, and went back to work.", mood: 'grumpy' },
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
    { text: "The house always wins. Unless the house is on fire. Which has happened.", mood: 'gossip' },
    { text: "A man once pawned his dignity. I couldn't find a buyer. Not much market for that.", mood: 'friendly' },
    { text: "Every item here has a story. Most of them are 'I needed the money.' Sad, but profitable.", mood: 'grumpy' },
    { text: "Gambling is a tax on people who are bad at math. Please, continue.", mood: 'friendly' },
    { text: "I accept all currencies. Gold, silver, tears, broken dreams — it all spends the same.", mood: 'mysterious' },
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
  if (player.dungeonFloorsCleared.length >= 6) {
    candidates.push({ text: `All six dungeon floors cleared? Including the Forgotten Temple? You're a legend!`, mood: 'friendly' });
    candidates.push({ text: `They're calling you the Dungeon Conqueror. The Temple bows to no one — except you.`, mood: 'gossip' });
  } else if (player.dungeonFloorsCleared.length >= 5) {
    candidates.push({ text: `Five dungeon floors? Only the Forgotten Temple remains. Do you dare?`, mood: 'friendly' });
  } else if (player.dungeonFloorsCleared.length >= 3) {
    candidates.push({ text: `Three floors of the dungeon? Most adventurers stop at one.`, mood: 'friendly' });
  }

  // Player has many degrees
  if (player.completedDegrees.length >= 5) {
    candidates.push({ text: `With that many degrees, you could wallpaper your dwelling with diplomas. Very tasteful.`, mood: 'friendly' });
    candidates.push({ text: `The most educated adventurer in Guildholm. Still can't open a jar, though, I bet.`, mood: 'gossip' });
  } else if (player.completedDegrees.length >= 3) {
    candidates.push({ text: `Three degrees already? Someone's been hitting the books.`, mood: 'friendly' });
  }

  // Player is rich
  const totalWealth = player.gold + player.savings;
  if (totalWealth > 2000) {
    candidates.push({ text: `Word is you've got more gold than the bank itself! Sleep with one eye open.`, mood: 'gossip' });
    candidates.push({ text: `That much gold changes people. You haven't started monologuing yet, have you?`, mood: 'warning' });
  } else if (totalWealth > 1000) {
    candidates.push({ text: `Your purse sounds heavy. Business must be good.`, mood: 'friendly' });
  }

  // Player is broke
  if (player.gold < 10 && player.savings < 10) {
    candidates.push({ text: `Times are tough, eh? At this point even your shadow is looking for loose change.`, mood: 'friendly' });
    candidates.push({ text: `You know you're broke when the Fence won't even take your stuff. Just saying.`, mood: 'gossip' });
    candidates.push({ text: `Empty pockets are a lifestyle choice. An involuntary one, but still.`, mood: 'grumpy' });
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
    candidates.push({ text: `You don't look so good. In fact, you look like something the cat dragged in, partially digested, and rejected.`, mood: 'warning' });
    candidates.push({ text: `That cough sounds nasty. Please don't do it near the merchandise. Or me.`, mood: 'warning' });
  }

  // Player health is low
  if (player.health < 30) {
    candidates.push({ text: `You look like you've been through a war. And lost. Comprehensively.`, mood: 'warning' });
    candidates.push({ text: `One more hit and the graveyard gains a new resident. Just a friendly observation.`, mood: 'warning' });
  }

  // Player lives in Noble Heights
  if (player.housing === 'noble') {
    candidates.push({ text: `Living in Noble Heights, eh? Fancy! No robberies up there.`, mood: 'gossip' });
  }

  // Player is homeless
  if (player.housing === 'homeless') {
    candidates.push({ text: `Sleeping on the streets? Bold strategy. Let me know how that works out for you.`, mood: 'warning' });
    candidates.push({ text: `No roof over your head? On the bright side, you save a fortune on rent.`, mood: 'friendly' });
  }

  // Player has the guild pass
  if (player.hasGuildPass && player.completedQuests >= 10) {
    candidates.push({ text: `${player.completedQuests} quests completed! You're practically a legend.`, mood: 'friendly' });
  }

  // Player is old
  if (player.age >= 50) {
    candidates.push({ text: `Still adventuring at your age? That's either brave or a failure to plan for retirement.`, mood: 'friendly' });
    candidates.push({ text: `The years add wisdom... and a disconcerting number of mysterious creaking sounds.`, mood: 'grumpy' });
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
      candidates.push({ text: `Poor ${ai.name}. They died as they lived — making questionable decisions.`, mood: 'friendly' });
      candidates.push({ text: `${ai.name}'s shuffled off this mortal coil. Thoughts and prayers. Mostly thoughts.`, mood: 'gossip' });
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
