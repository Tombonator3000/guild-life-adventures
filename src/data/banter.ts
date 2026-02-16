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
    { text: "An adventurer asked what the dental plan covers. I said 'getting punched in the mouth.' That IS the dental plan.", mood: 'gossip' },
    { text: "Guild motto: 'Fortune favours the bold.' Guild reality: Fortune favours the well-insured.", mood: 'friendly' },
    { text: "We had a motivation poster: 'Hang in there!' It was next to the execution notice board. Bad placement.", mood: 'gossip' },
    { text: "The guild treasurer counted the budget three times. Cried twice. We're fine. Probably.", mood: 'gossip' },
    { text: "Someone submitted a quest to find their missing quest submission. Meta, but we allowed it.", mood: 'gossip' },
    { text: "The orientation for new members includes a waiver, a map, and a next-of-kin form. In that order.", mood: 'grumpy' },
    { text: "Last week's team-building exercise was cancelled when the team got eaten. Scheduling conflict.", mood: 'gossip' },
    { text: "The guild charter says 'all members are equal.' The charter was written by someone in charge. Irony noted.", mood: 'grumpy' },
    { text: "We've started rating quests: one skull for easy, five skulls for... well, we haven't needed six yet.", mood: 'friendly' },
    { text: "The suggestion box is now fireproof. We learned that lesson the hard way.", mood: 'grumpy' },
    { text: "A party of five went into the dungeon. A party of two came out. They said the dungeon was 'fine.'", mood: 'warning' },
    { text: "The annual guild dinner is coming up. Last year someone tried to poison the soup. Best dinner we ever had.", mood: 'gossip' },
    { text: "Our 'Employee of the Month' board has been empty for three months. Nobody qualifies. Or survives.", mood: 'grumpy' },
    { text: "The Guild Master's door is always open. This is because the hinges were stolen. By Shadowfingers, we assume.", mood: 'gossip' },
    { text: "We offered hazard pay once. Nobody collected. Draw your own conclusions.", mood: 'grumpy' },
    { text: "Someone tried to form an adventurer's union. The meeting was attacked by goblins. Irony is not dead. Unlike the secretary.", mood: 'gossip' },
    { text: "The quest 'Retrieve the Sacred Amulet' has been posted 47 times. We suspect the amulet enjoys the attention.", mood: 'mysterious' },
    { text: "A wizard applied for membership. On his application under 'special skills' he wrote 'alive.' Low bar, but he met it.", mood: 'gossip' },
    { text: "Health and safety inspection is next month. We need to hide the cursed artifacts. And the stairs. Definitely the stairs.", mood: 'warning' },
    { text: "The guild motto used to be 'No Fear.' We changed it to 'Some Fear.' More accurate.", mood: 'friendly' },
    { text: "An intern asked where the emergency exits are. I pointed at every wall. In this line of work, you make your own.", mood: 'grumpy' },
    { text: "The retirement age for adventurers is theoretical. Much like the concept of retirement itself.", mood: 'grumpy' },
    { text: "We had a 'Bring Your Child to Work' day once. Once.", mood: 'warning' },
    { text: "Three applicants showed up today. By tomorrow we'll have one. It's called natural selection. We call it Tuesday.", mood: 'grumpy' },
    { text: "The bounty board is colour-coded. Green for safe, red for deadly, black for 'we'll need your measurements for the memorial.'", mood: 'friendly' },
    { text: "If the quest says 'certain death,' that's marketing. If it says 'probable death,' that's honesty. Know the difference.", mood: 'warning' },
    { text: "The guild archivist keeps records of every quest ever posted. He also keeps records of every excuse ever given for failing one.", mood: 'gossip' },
    { text: "New quest posted: 'Find the guild's lost shipment.' It's been missing since last year. We suspect the shipment is now someone's shed.", mood: 'gossip' },
    { text: "The guild master once did quests too, you know. He was rubbish. That's why he became management.", mood: 'gossip' },
    { text: "An adventurer petitioned for 'casual Fridays.' We said every day is casual when you fight goblins for a living.", mood: 'grumpy' },
    { text: "The refreshments table has ale, bread, and a suspicious cheese. The cheese has been here longer than the guild itself.", mood: 'warning' },
    { text: "We had a performance review last month. Everyone performed. Not well. But they performed.", mood: 'grumpy' },
    { text: "The adventurer ranking system: Novice, Apprentice, Journeyman, Adept, Veteran, Elite, and 'Still Alive.' That last one's unofficial.", mood: 'friendly' },
    { text: "Someone asked for a quest without danger, without travel, and without effort. I pointed them to the bank.", mood: 'grumpy' },
    { text: "The trophy cabinet is impressive. Mostly because the trophies are the parts of monsters that didn't fit through the door.", mood: 'gossip' },
    { text: "We received a thank-you letter from a village we saved. It was addressed to 'those people who broke everything but fixed the monster thing.'", mood: 'gossip' },
    { text: "The guild records show 10,000 quests completed this century. And 12,000 'incident reports.' Maths doesn't lie.", mood: 'grumpy' },
    { text: "A merchant donated a portrait for the hall. It's of himself. He commissioned a quest to hang it. We accepted. Business is business.", mood: 'gossip' },
    { text: "The guild's annual report lists 'member retention' as a priority. Alive retention, specifically.", mood: 'grumpy' },
    { text: "If you need work, check the board. If you need advice, ask anyone. If you need wisdom, you're in the wrong building.", mood: 'friendly' },
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
    { text: "A dragon came in to open an account. We asked for two forms of ID. He provided fire. Twice.", mood: 'gossip' },
    { text: "The vault is protected by three locks, two spells, and one very cross dwarf named Björn.", mood: 'friendly' },
    { text: "We had a run on the bank last Tuesday. Turned out someone yelled 'free samples.' There were no samples.", mood: 'gossip' },
    { text: "The savings account minimum is one gold piece. The dignity minimum is considerably higher.", mood: 'grumpy' },
    { text: "An adventurer deposited a bag of teeth as currency. We declined. He argued they were 'dragon teeth.' They were his.", mood: 'gossip' },
    { text: "The stock market crashed last month. Then it crashed again. Now it's just lying there. Twitching.", mood: 'gossip' },
    { text: "We've introduced a new service: financial counseling. Step one: stop spending. There is no step two.", mood: 'friendly' },
    { text: "The vault door weighs three tons. We know this because someone tried to steal it. They got twelve inches.", mood: 'gossip' },
    { text: "Our investment advisor is a dwarf with a crystal ball. The ball doesn't work. The dwarf does. Somehow.", mood: 'mysterious' },
    { text: "A customer wanted to withdraw 'all their gold' and swim in it. We said no. Then we said 'how much gold?' Professional curiosity.", mood: 'gossip' },
    { text: "The quill I'm using is enchanted to detect lies. It just crossed out your loan application. Twice.", mood: 'warning' },
    { text: "We close at six. The vault closes whenever it feels like it. We don't argue with enchanted doors.", mood: 'friendly' },
    { text: "A goblin tried to rob us last week. Björn threw him back. The goblin landed in the Slums. He lives there now.", mood: 'gossip' },
    { text: "Credit scores don't exist here. We judge you by your boots. Nice boots? Good credit. Holes in your boots? Bad credit.", mood: 'grumpy' },
    { text: "The foreign exchange rate for elven currency is terrible. Mostly because we made it up.", mood: 'gossip' },
    { text: "Someone asked about offshore accounts. This is a landlocked city. The confusion was significant.", mood: 'gossip' },
    { text: "We have a 'no weapons' policy. Björn is the weapon. The policy is recursive.", mood: 'friendly' },
    { text: "The last bank robber got trapped in the vault. We found him two weeks later. He'd read all the deposit slips.", mood: 'gossip' },
    { text: "Our highest-interest savings account pays 4%. Our loan interest is 10%. This is how banking works. You're welcome.", mood: 'grumpy' },
    { text: "The economy is based on gold, trust, and the collective agreement not to think too hard about either.", mood: 'mysterious' },
    { text: "We offer life insurance. The premiums for adventurers are... substantial. The payouts, mathematically unlikely.", mood: 'friendly' },
    { text: "A customer asked if we guarantee returns on stock investments. I laughed. He laughed. His portfolio didn't.", mood: 'gossip' },
    { text: "Björn once arm-wrestled a troll for a customer's stolen deposit. Björn won. The troll opened a savings account.", mood: 'gossip' },
    { text: "The loan repayment schedule is flexible. Flexible meaning we'll find you wherever you go.", mood: 'warning' },
    { text: "Someone asked about ethical investing. I said 'this is banking.' They left confused. So did I.", mood: 'gossip' },
    { text: "We opened a children's savings scheme. It teaches them about money. The first lesson is 'you don't have enough.'", mood: 'friendly' },
    { text: "The auditor comes once a year. We hide the creative accounting. He hides his disappointment. Everyone's hiding something.", mood: 'gossip' },
    { text: "A customer brought in a treasure map as collateral. The treasure was in the vault. The map led here. He'd robbed himself.", mood: 'gossip' },
    { text: "Our retirement fund has excellent returns. Mainly because nobody retires. They just... stop coming in. We keep the money.", mood: 'grumpy' },
    { text: "The exchange rate between gold and silver fluctuates daily. Between gold and friendship? Constant. Gold wins.", mood: 'grumpy' },
    { text: "A customer wanted to open a joint account with his horse. We said no. The horse had better credit.", mood: 'gossip' },
    { text: "The bank vault has never been successfully robbed. Three attempts. Zero successes. Björn's record is also three and zero.", mood: 'friendly' },
    { text: "We offer financial planning. Step one: earn gold. Step two: give it to us. Step three: trust us. It's a simple plan.", mood: 'friendly' },
    { text: "Bankruptcy is just a word. An expensive, soul-crushing word. But still just a word. We accept words.", mood: 'grumpy' },
    { text: "The suggestion box asked for longer hours. The staff suggested shorter hours. The compromise: same hours, more sighing.", mood: 'gossip' },
    { text: "Every transaction is recorded in the ledger. Every regret is recorded in the customer's face. We file both.", mood: 'grumpy' },
    { text: "A customer asked for a 'money tree loan.' We said money doesn't grow on trees. He showed us the Enchanted Forest brochure. Touché.", mood: 'gossip' },
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
    { text: "Food doesn't last without a Preservation Box. Invest in one, or eat at the tavern. Your choice, your funeral.", mood: 'warning' },
    { text: "A wizard asked for gluten-free bread. Sir, this is the Middle Ages. Everything is gluten. WE are gluten.", mood: 'grumpy' },
    { text: "The turnips are fresh. The cheese is aged. The sausages are... best not investigated.", mood: 'friendly' },
    { text: "The apples are local. The exotic spices are exotic. The mystery meat is committed to the bit.", mood: 'friendly' },
    { text: "I once sold a hero his last meal. He came back for seconds. I was relieved, and slightly disappointed.", mood: 'gossip' },
    { text: "Stock's a bit low on account of the rats. Don't tell anyone. The rats, I mean. Don't tell the rats.", mood: 'warning' },
    { text: "Every week someone asks if I sell potions. I sell food. You eat it. It keeps you alive. That's the potion.", mood: 'grumpy' },
    { text: "I weigh everything twice and round up once. Traditional retail, that.", mood: 'grumpy' },
    { text: "The flour is ground fresh. The pepper is imported. The jerky has been here since my father's time. It's... fine.", mood: 'friendly' },
    { text: "A customer complained the eggs were too small. I said 'take it up with the chicken.' He did. Chicken won.", mood: 'gossip' },
    { text: "Supply chains these days. One dragon on the trade road and suddenly nobody can get flour for a fortnight.", mood: 'grumpy' },
    { text: "I tried selling salads. Nobody bought them. This is a medieval fantasy world. People want meat and bread. Fair enough.", mood: 'grumpy' },
    { text: "The Frost Chest is the best investment you'll ever make. Food stays fresh for weeks. I shouldn't be telling you this. Bad for repeat business.", mood: 'friendly' },
    { text: "A knight came in fully armoured and knocked over the pickle display. Bought them all out of guilt. Best Tuesday ever.", mood: 'gossip' },
    { text: "We accept gold, silver, and bartering. No, I will not accept 'a favour.' I've been burned before. Literally.", mood: 'grumpy' },
    { text: "The bread is baked at dawn. The cheese is aged at dusk. The schedule sounds poetic but it's just logistics.", mood: 'friendly' },
    { text: "Feast supplies are for feasting. Not for hoarding. I see you eyeing the shelf. I have eyes, you know.", mood: 'grumpy' },
    { text: "Had a customer eat an entire wheel of cheese in the store and then ask for the price. The price was one wheel of cheese.", mood: 'gossip' },
    { text: "The tavern keeper says my food is overpriced. His ale costs three times as much. But sure, I'm the expensive one.", mood: 'grumpy' },
    { text: "I sell happiness in edible form. Philosophers call it 'food.' I call it 'three gold per portion, no discounts.'", mood: 'friendly' },
    { text: "Someone asked if the ale was cold. I said 'it's room temperature.' They said the room was cold. Fair point.", mood: 'gossip' },
    { text: "My competitor went out of business. Not because I was better. Because he was eaten by a bear. Free market.", mood: 'gossip' },
    { text: "The lottery odds are terrible. That's why they call it a lottery and not a 'certainty.' Buy two.", mood: 'friendly' },
    { text: "A customer haggled for twenty minutes over the price of bread. Saved two copper. Spent three hours. Economics.", mood: 'grumpy' },
    { text: "The 'buy one get one free' promotion was a mistake. People bought one. Expected two. Nobody read 'on selected items.'", mood: 'grumpy' },
    { text: "My delivery boy quit. Said the roads were too dangerous. Now I deliver myself. The roads ARE too dangerous.", mood: 'warning' },
    { text: "Someone asked for a receipt. A receipt! In a medieval market! I carved it into a piece of wood. Customer satisfaction.", mood: 'grumpy' },
    { text: "The drought drove food prices through the roof. Then the rain came. Now the roof leaks. But the prices dropped. Balance.", mood: 'gossip' },
    { text: "Opening hours are dawn to dusk. Unless it's raining. Then it's dawn to 'when I feel like closing.'", mood: 'friendly' },
    { text: "I tried expanding into the armour business. Sold a steel helmet. It was a cooking pot. Nobody noticed. I stopped.", mood: 'gossip' },
    { text: "My son wants to be an adventurer, not a shopkeeper. I told him adventurers need food. From shops. He's thinking about it.", mood: 'friendly' },
    { text: "The scales are accurate to within a gram. Which gram, I can't say. But they're consistent. That's what matters.", mood: 'friendly' },
    { text: "I've been price-matching the Shadow Market. My wife says that's the path to ruin. She's not wrong. But pride is a thing.", mood: 'grumpy' },
    { text: "Fresh fish on Thursdays. It's fresh because I say it's fresh. The fish has no comment.", mood: 'friendly' },
    { text: "A customer returned an empty jar and asked for a refund on 'the air inside.' I've never been more impressed. Or more annoyed.", mood: 'gossip' },
    { text: "The secret ingredient in my sausages is ambiguity. Nobody asks. Everybody eats. The system works.", mood: 'friendly' },
    { text: "Business tip: never eat your own inventory. I learned this the hard way. Twice.", mood: 'grumpy' },
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
    { text: "Every weapon I sell comes with a free lecture on how to hold it. Most people need it.", mood: 'grumpy' },
    { text: "Someone asked if the armor comes in 'slimming black.' This is a forge, not a tailor.", mood: 'gossip' },
    { text: "This sword was forged in dragonfire. Well, near dragonfire. In the same postcode as dragonfire.", mood: 'friendly' },
    { text: "The difference between a 50-gold sword and a 200-gold sword? About 150 gold. And your life.", mood: 'grumpy' },
    { text: "I sharpen blades to within an inch of being illegal. The last inch is where I make my living.", mood: 'friendly' },
    { text: "An adventurer returned a shield with a bite taken out of it. A literal bite. I didn't ask. He didn't explain.", mood: 'gossip' },
    { text: "Durability matters. You can't temper something that's already in two pieces. Well, I can. But it costs extra.", mood: 'grumpy' },
    { text: "Had a pacifist come in. Asked for 'a weapon that doesn't hurt.' I sold him a very heavy book.", mood: 'gossip' },
    { text: "The leather armor smells like a cow. That's because it was a cow. Circle of leather.", mood: 'grumpy' },
    { text: "A customer wanted a sword 'with a personality.' All my swords have personality. They're sharp and unforgiving.", mood: 'grumpy' },
    { text: "I've been in this business forty years. Every scar on my hands is a lesson. I have a lot of lessons.", mood: 'friendly' },
    { text: "The broadsword is for those who like subtlety. The war hammer is for those who don't.", mood: 'friendly' },
    { text: "Bring me your broken equipment. I'll fix it. Bring me your broken spirit. That's the tavern's department.", mood: 'grumpy' },
    { text: "A wizard bought a sword once. He tried to cast spells through it. It didn't work. But the goblin was still impressed.", mood: 'gossip' },
    { text: "Steel doesn't lie. It doesn't flatter. It just cuts, or it doesn't. I respect that about steel.", mood: 'friendly' },
    { text: "The Dragon Scale Shield is my finest work. I've made one. Finding a second dragon scale has proved... challenging.", mood: 'friendly' },
    { text: "I test every blade myself. If it can't cut through a practice dummy, it can't cut through a goblin.", mood: 'grumpy' },
    { text: "Shields are underrated. Swords get all the glory, but shields keep you alive long enough to swing them.", mood: 'friendly' },
    { text: "If your armor has more holes than protection, it's no longer armor. It's a suggestion.", mood: 'warning' },
    { text: "A troll walked in once. Wanted armor. We don't make troll sizes. We don't make troll anything. He left disappointed.", mood: 'gossip' },
    { text: "My apprentice made his first dagger yesterday. It's a bit wobbly. I'd still use it. Against the apprentice, mainly.", mood: 'grumpy' },
    { text: "The finest blade in the shop was made on a Tuesday. I don't know why Tuesdays work. They just do.", mood: 'mysterious' },
    { text: "Maintenance, maintenance, maintenance. The three rules of weapon ownership. Also the three things nobody does.", mood: 'grumpy' },
    { text: "A customer wanted matching sword and shield. I said 'they all match in combat.' He wanted matching COLOURS. Adventurers.", mood: 'grumpy' },
    { text: "The enchanted blade hums when danger is near. It's been humming since you walked in. Make of that what you will.", mood: 'warning' },
    { text: "I sharpened three hundred swords last month. Two hundred came back dull. One came back sticky. I didn't ask.", mood: 'grumpy' },
    { text: "The best sword in the shop doesn't have a name. Names are for heroes. The sword is for whoever pays.", mood: 'grumpy' },
    { text: "Plate armour is heavy. But you know what's heavier? Regret. And also plate armour. It's genuinely heavy.", mood: 'friendly' },
    { text: "Someone brought in a sword made of cheese. As a joke. I tempered it anyway. On principle.", mood: 'gossip' },
    { text: "The scabbard is as important as the sword. One holds the blade. The other holds your dignity. When you trip.", mood: 'friendly' },
    { text: "A returning customer means I made a good weapon. No returning customer means I made a great weapon. Or a terrible one.", mood: 'grumpy' },
    { text: "I can tell a lot about a person by their weapon choice. Dagger: sneaky. Sword: classic. War hammer: angry. Spoon: lost.", mood: 'friendly' },
    { text: "The tower shield is three feet wide and five feet tall. It protects everything. Except your dignity when you try to carry it.", mood: 'friendly' },
    { text: "A bard asked for a weapon that 'sings.' I gave him a reed instrument. He was confused. I was amused. We're even.", mood: 'gossip' },
    { text: "Every weapon has a breaking point. Good weapons have a high one. My patience has a low one. Don't test either.", mood: 'grumpy' },
    { text: "I forge with passion. And frustration. And occasionally rage. The best blades come from rage, if I'm honest.", mood: 'grumpy' },
    { text: "If you treat your weapon well, it'll treat you well. If you neglect it, it'll neglect you. In combat. Fatally.", mood: 'warning' },
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
    { text: "The crystal ball shows the future. Unfortunately, the future is mostly paperwork.", mood: 'mysterious' },
    { text: "I enchanted a broom to sweep by itself. It swept the cat. Then the furniture. Then my dignity.", mood: 'gossip' },
    { text: "The stars are aligned tonight. They're aligned most nights. Stars are very agreeable.", mood: 'mysterious' },
    { text: "A customer asked me to un-enchant something. It's called 'breaking it.' I can do that for free.", mood: 'grumpy' },
    { text: "My predecessor blew himself up. I found the job listing on his ceiling.", mood: 'gossip' },
    { text: "The Memory Crystal records everything. Everything. I've seen things that can't be unseen. Literally.", mood: 'warning' },
    { text: "I tried to enchant a sword to always find its target. It found my foot. Twice.", mood: 'gossip' },
    { text: "The difference between a spell and a catastrophe is about three syllables and one mispronunciation.", mood: 'warning' },
    { text: "I sell potions, enchantments, and regret. The third one comes free with the first two.", mood: 'friendly' },
    { text: "A warrior asked me to enchant his muscles. I enchanted his brain instead. He didn't notice the difference.", mood: 'gossip' },
    { text: "The cauldron is boiling. That's either a potion or my lunch. I genuinely don't remember which.", mood: 'friendly' },
    { text: "Magic has rules. I've broken most of them. The ones that remain are more like... suggestions.", mood: 'mysterious' },
    { text: "My familiar is a toad named Gerald. He judges everyone. Silently. With his eyes.", mood: 'friendly' },
    { text: "Someone brought in a 'cursed' sword. It wasn't cursed. It was just blunt. I didn't tell them. I charged for a curse removal.", mood: 'gossip' },
    { text: "The enchanting table has scorch marks from last week. And the week before. And every week since I opened.", mood: 'grumpy' },
    { text: "I can read auras. Yours says 'confused but optimistic.' That's most adventurers, honestly.", mood: 'mysterious' },
    { text: "The runes on the wall are purely decorative. Except the one above the door. That one is structural. Don't lean on it.", mood: 'warning' },
    { text: "An alchemist told me my potions were unscientific. I turned his hat into a pigeon. Scientifically.", mood: 'gossip' },
    { text: "Some say magic is dying. Magic says otherwise. Loudly. Through the walls. At three in the morning.", mood: 'mysterious' },
    { text: "I once enchanted a pair of boots to walk by themselves. They walked out. I haven't seen them since. I miss them.", mood: 'gossip' },
    { text: "The arcane arts require patience, discipline, and a very good fire extinguisher.", mood: 'friendly' },
    { text: "Do not drink the blue potion. The blue potion is not a potion. The blue potion is paint. I should label things.", mood: 'warning' },
    { text: "I've been told my workshop smells like 'burnt lavender and existential dread.' I consider that a compliment.", mood: 'mysterious' },
    { text: "A customer wanted a love potion. I gave him cologne. Same chemical principle. Less ethical grey area.", mood: 'gossip' },
    { text: "The apprentice enchanted a chair to levitate. It won't come down. He won't ask for help. Pride is a powerful spell.", mood: 'gossip' },
    { text: "Ley lines are like roads for magical energy. This area has a roundabout. Nobody understands it, including the magic.", mood: 'mysterious' },
    { text: "I sell moonlight in bottles. It's just water. But it SOUNDS magical, and that's half the battle.", mood: 'gossip' },
    { text: "A gnome wanted me to make him taller. I made him confident instead. He reported me to the guild.", mood: 'gossip' },
    { text: "The potion of invisibility works perfectly. Finding it in my shop, however, is another matter entirely.", mood: 'friendly' },
    { text: "I've summoned things from fourteen different dimensions. Most were disappointing. One was a tax collector. Worst day ever.", mood: 'gossip' },
    { text: "The wand chooses the wizard. My wands choose the highest bidder. Capitalism is the truest magic.", mood: 'friendly' },
    { text: "Magical theory says you can't create something from nothing. Magical practice says hold my potion and watch this.", mood: 'mysterious' },
    { text: "A warrior asked if I could enchant his fist. I could. But I'd need his fist. He reconsidered.", mood: 'gossip' },
    { text: "The crystal ball predicted rain today. It's a crystal ball, not a weather ball. But it was right. Suspicious.", mood: 'mysterious' },
    { text: "Every enchantment has a shelf life. Most last years. The ones from the Shadow Market last until Tuesday.", mood: 'warning' },
    { text: "I graduated top of my class in Transmutation. Second in Conjuration. Last in 'Not Accidentally Setting Things on Fire.'", mood: 'gossip' },
    { text: "If you hear whispers in the shop, that's the books. They discuss things. Mostly each other. Very gossipy, books.", mood: 'mysterious' },
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
    { text: "I don't ask where things come from. In return, nobody asks where I came from. It's a system.", mood: 'mysterious' },
    { text: "Fell off a cart, fell out of a window, fell out of someone's pocket... everything here is a victim of gravity.", mood: 'gossip' },
    { text: "I have contacts in places you've never heard of. I've never heard of them either. That's the point.", mood: 'mysterious' },
    { text: "The guards raided us last month. Found nothing. We hid the merchandise in the guard barracks. They never check their own.", mood: 'gossip' },
    { text: "Trust is the foundation of our business. Well, distrust. Same currency, different denomination.", mood: 'friendly' },
    { text: "A customer tried to haggle. I respect that. I also raised the price. I respect myself more.", mood: 'grumpy' },
    { text: "The password changes every week. Last week it was 'swordfish.' This week it's also 'swordfish.' Nobody's creative.", mood: 'gossip' },
    { text: "Discretion is our motto. Also our biggest challenge. Half the vendors here can't shut up.", mood: 'grumpy' },
    { text: "Someone reported us to the authorities. The authorities came, bought three daggers, and left. Good customers.", mood: 'gossip' },
    { text: "We operate in a grey area. Legally grey. Morally grey. Also physically grey. Could use better lighting down here.", mood: 'friendly' },
    { text: "I've got connections with the Fence. Good prices on... redistributed property.", mood: 'mysterious' },
    { text: "The City Watch knows about us. We know about the City Watch. Nobody does anything about it. Society.", mood: 'gossip' },
    { text: "A priest wandered in by accident. Bought two potions and a hex. Nobody's judging. Except me. I'm absolutely judging.", mood: 'gossip' },
    { text: "If you want it cheap, it might explode. If you want it safe, it's not cheap. Pick your explosion.", mood: 'warning' },
    { text: "My supplier is anonymous. My customers are anonymous. I'm anonymous. This is a very lonely business.", mood: 'mysterious' },
    { text: "The market intel is accurate. Mostly. The 'mostly' is where it gets interesting.", mood: 'gossip' },
    { text: "We had a sale last week. 'Everything must go.' It was a raid. Everything did go. Quickly.", mood: 'gossip' },
    { text: "Don't make eye contact with the vendor on the left. He sells things that aren't technically legal. Or edible.", mood: 'warning' },
    { text: "Three rules of the Shadow Market: don't snitch, don't complain, and don't eat the mystery meat on Tuesdays.", mood: 'warning' },
    { text: "I used to be legitimate. Then I discovered the profit margins down here. Morality is expensive.", mood: 'gossip' },
    { text: "A guard's informant shops here regularly. We give him a discount. He gives us advance warning. Everyone wins.", mood: 'gossip' },
    { text: "Some call this the black market. I prefer 'differently regulated marketplace.' Sounds more professional.", mood: 'friendly' },
    { text: "My guarantee: if it breaks, you'll never find me to complain. That's not a guarantee. That's a promise.", mood: 'grumpy' },
    { text: "The informant network costs extra. But the intelligence is invaluable. Mostly. Sometimes it's just gossip. Still worth it.", mood: 'gossip' },
    { text: "A customer left a negative review. Anonymously. In a market where everyone's anonymous. Bold move.", mood: 'gossip' },
    { text: "We had a health inspector visit. He inspected. Then he needed a health inspector himself. Circle of life.", mood: 'gossip' },
    { text: "I know things about people in this city. Important people. I don't sell that information. I rent it.", mood: 'mysterious' },
    { text: "The Shadow Market operates on trust. And threats. Mostly threats dressed up as trust. Very fashionable down here.", mood: 'mysterious' },
    { text: "Someone tried to report us to the authorities using our own messenger service. We delivered the report. Then burned it.", mood: 'gossip' },
    { text: "The hexes for sale are genuine. The hex removals are also genuine. Buy both. It's called a subscription model.", mood: 'friendly' },
    { text: "Customer loyalty here is earned through fear, respect, and a 10% returning customer discount. Mostly the discount.", mood: 'friendly' },
    { text: "I've been underground so long I've forgotten what sunlight looks like. It's overrated. Like honesty.", mood: 'grumpy' },
    { text: "A paladin walked in by accident. Bought nothing. Left a pamphlet about 'making better choices.' We framed it.", mood: 'gossip' },
    { text: "The exit is behind you. Unless you owe me money. Then there is no exit.", mood: 'warning' },
    { text: "We accept gold, silver, secrets, and favours. In descending order of reliability. In ascending order of interest.", mood: 'mysterious' },
    { text: "If the enchanter is closed, I'm open. If the enchanter is open, I'm cheaper. It's called market dynamics.", mood: 'friendly' },
    { text: "The hex bags are buy-one-get-one. The first hex is for your enemy. The second is insurance. Think about it.", mood: 'mysterious' },
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
    { text: "The dormitory has a strict 'no summoning after midnight' policy. It is widely ignored.", mood: 'warning' },
    { text: "Graduation ceremony is lovely. Assuming you survive the final exam. Literally. We lose a few every year.", mood: 'gossip' },
    { text: "The faculty meeting lasted six hours. Nothing was decided. This is how institutions work.", mood: 'grumpy' },
    { text: "A student plagiarized his thesis. From himself. From the future. Temporal Ethics Board is reviewing it.", mood: 'gossip' },
    { text: "The Dean's office is on the top floor. There are no stairs. This is the first test.", mood: 'mysterious' },
    { text: "We accept students of all backgrounds. Some leave with their backgrounds intact.", mood: 'friendly' },
    { text: "The campus has twelve buildings. Three are visible. The rest require a minimum of Advanced Studies to perceive.", mood: 'mysterious' },
    { text: "A student set fire to the library. The books were unhurt. The student was expelled. The fire apologized.", mood: 'gossip' },
    { text: "Office hours are whenever I'm in my office. I'm never in my office. This is a metaphor for higher education.", mood: 'grumpy' },
    { text: "The sword in the lobby is decorative. Unless it's Thursday. On Thursdays it's Combat Training 101.", mood: 'warning' },
    { text: "Every semester I ask students what they want to learn. Every semester they say 'fireball.' Every semester I say no.", mood: 'grumpy' },
    { text: "The trade certificate is practical. The arcane studies are theoretical. Both are equally likely to get you blown up.", mood: 'friendly' },
    { text: "A student asked if attendance was mandatory. I said 'knowledge is its own reward.' He left. Knowledge was offended.", mood: 'grumpy' },
    { text: "The cafeteria serves lunch at noon. It served lunch yesterday at noon. It will serve lunch tomorrow at noon. Consistency is our strength.", mood: 'friendly' },
    { text: "Research funding is tight. We had to cancel the 'Summon Something Enormous' experiment. Budget issues. Also property damage.", mood: 'gossip' },
    { text: "The Loremaster degree takes dedication. And time. And slightly more dedication. It's mostly dedication.", mood: 'friendly' },
    { text: "Someone carved 'Wizards Rule' on the statue out front. The statue carved 'No We Don't' in response.", mood: 'gossip' },
    { text: "Our alumni include three kings, twelve sages, and one person who went on to open a very successful bakery.", mood: 'friendly' },
    { text: "The combat training dummies are enchanted to fight back. This was an accident. A helpful accident, but still.", mood: 'warning' },
    { text: "I've been teaching for thirty years. My first class had forty students. Three survived the curriculum. All three teach here now.", mood: 'grumpy' },
    { text: "The scholarship criteria: academic excellence, moral character, and the ability to dodge the library ghost.", mood: 'friendly' },
    { text: "Study groups form naturally. Survivor groups form faster.", mood: 'gossip' },
    { text: "The Commerce Degree is surprisingly popular. People like money. Who knew? Everyone. Everyone knew.", mood: 'friendly' },
    { text: "The grading system is A through F. Nobody gets F. F stands for 'Fled.' And they have.", mood: 'grumpy' },
    { text: "Academic debate is encouraged. Last week's debate was settled with a fireball. The motion carried. Unanimously.", mood: 'gossip' },
    { text: "The professor of History is 400 years old. He doesn't teach history. He remembers it. Different approach.", mood: 'mysterious' },
    { text: "Student loans are available. Repayment begins after graduation. If you survive graduation. Big 'if.'", mood: 'warning' },
    { text: "The philosophy class asks 'What is truth?' The Combat class asks 'What is pain?' Both are educational.", mood: 'friendly' },
    { text: "Extra credit is available for anyone who returns a library book that's been missing since the Third Age. It's been five millennia. We live in hope.", mood: 'gossip' },
    { text: "The gym equipment is enchanted to resist. Not magically. It's just heavy. Very, very heavy.", mood: 'grumpy' },
    { text: "A student proved the existence of parallel universes. In the parallel universe, he failed. We gave him average marks.", mood: 'gossip' },
    { text: "Tenure is available after twenty years of service. And survival. Mostly survival. The service is secondary.", mood: 'grumpy' },
    { text: "The university motto is 'Knowledge Is Power.' The utility bill suggests power is also power. Specifically, expensive power.", mood: 'gossip' },
    { text: "Field trips are mandatory. Last year's was to the dungeon. Not everyone came back. We adjusted the curriculum.", mood: 'warning' },
    { text: "The student bar is open until midnight. After midnight it becomes a philosophy seminar. The quality of arguments decreases. The volume increases.", mood: 'gossip' },
    { text: "We've produced more scholars per capita than any other institution. Also more explosions. Correlation is not causation. Usually.", mood: 'friendly' },
    { text: "The reading list has 47 books. Five are required. Twelve are recommended. Thirty are 'please return these, they were due six years ago.'", mood: 'grumpy' },
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
    { text: "We had a bard play last night who was so bad, the ale curdled. The ale! It was already terrible!", mood: 'gossip' },
    { text: "A regular once drank so much he proposed to the hat stand. They're still together, actually.", mood: 'gossip' },
    { text: "The ale is strong tonight. So is the smell. One is deliberate.", mood: 'friendly' },
    { text: "Happy hour is every hour if you're sad enough. That's not a policy, it's an observation.", mood: 'friendly' },
    { text: "The bard last night played a song about a hero. The hero was in the audience. He cried. Then tipped.", mood: 'gossip' },
    { text: "We don't water down the drinks. The well is too far away. Laziness has its benefits.", mood: 'grumpy' },
    { text: "The dart board hasn't been used since the incident. Nobody talks about the incident. Especially not Dave.", mood: 'warning' },
    { text: "I've been behind this bar so long, I've started ageing like the barrels. Woody, with notes of regret.", mood: 'grumpy' },
    { text: "A customer asked for a cocktail. I mixed two ales together. Innovation.", mood: 'friendly' },
    { text: "The mice in the cellar have organised. They have a foreman. His name is Steve. He's very efficient.", mood: 'gossip' },
    { text: "Last call is at midnight. After midnight, the regulars become furniture. Literally. The enchanter apologised.", mood: 'gossip' },
    { text: "A dwarf once out-drank everyone in the tavern. Then the tavern next door. Then the brewery. We made him mayor.", mood: 'gossip' },
    { text: "The piano plays itself after midnight. Not magically — the pianist is just invisible. And drunk. And invisible.", mood: 'mysterious' },
    { text: "Someone started a fight over the last sausage. The sausage was inedible. The fight was magnificent.", mood: 'gossip' },
    { text: "My therapist says I should stop talking to customers about my problems. My customers ARE my problem.", mood: 'grumpy' },
    { text: "The 'Tankard Special' is two ales and a prayer. The prayer is for your stomach. It's included.", mood: 'friendly' },
    { text: "Trivia night was cancelled. The trivia master was eaten by a quiz. I don't know how. Nobody does.", mood: 'gossip' },
    { text: "A tourist asked for wine. I laughed. Then I cried. Then I poured him an ale. This is a tavern.", mood: 'grumpy' },
    { text: "The fireplace keeps the place warm. The arguments keep the place warmer. The ale keeps everyone from caring.", mood: 'friendly' },
    { text: "The Rusty Tankard: where dreams go for a drink, and occasionally come true. Usually the small dreams.", mood: 'friendly' },
    { text: "An elf walked in and asked for something 'refined.' I pointed at the door. This is a tavern, not a vineyard.", mood: 'grumpy' },
    { text: "Bar fights are free of charge. Damages, however, are not. We keep a running tab. Literally running. You won't escape it.", mood: 'warning' },
    { text: "The menu hasn't changed in twenty years. Neither have the customers. We've achieved a kind of terrible harmony.", mood: 'friendly' },
    { text: "A food critic visited. Gave us one star. Out of five? Out of ten? He didn't say. We're claiming ten.", mood: 'gossip' },
    { text: "The house special is whatever we made too much of. Today it's stew. Yesterday it was stew. Tomorrow it's also stew.", mood: 'friendly' },
    { text: "A fight broke out over the last bread roll. Three adventurers, two black eyes, one roll. The roll was stale. Worth it, apparently.", mood: 'gossip' },
    { text: "The regulars have their own mugs. Named mugs. Engraved mugs. They love those mugs more than their families.", mood: 'friendly' },
    { text: "Someone asked for water. Water! In a tavern! I gave them a look. Then I gave them water. I'm not a monster.", mood: 'grumpy' },
    { text: "The bard plays requests. For a price. The price to stop playing is higher. Smart lad.", mood: 'gossip' },
    { text: "I've poured ale for three generations of adventurers. The first generation is still here. Still drinking. Still complaining.", mood: 'grumpy' },
    { text: "Lost property includes: four swords, two shields, one dignity, and seventeen left boots. Why always left boots?", mood: 'gossip' },
    { text: "The tavern cat judges everyone. Silently. From the shelf. He has seen things. He will never forgive.", mood: 'mysterious' },
    { text: "We tried table service once. The tables fought back. Not literally. Mostly literally. The enchanter apologised.", mood: 'gossip' },
    { text: "The secret to running a tavern: water down nothing, judge nobody, and sweep the floor before the rats unionise.", mood: 'friendly' },
    { text: "A philosopher and a fighter walked into the bar. The philosopher asked 'why?' The fighter asked 'why not?' I asked 'what are you drinking?'", mood: 'friendly' },
    { text: "The cellar is haunted. The ghost drinks free. We've tried negotiating. He's a terrible tipper. But the conversation is good.", mood: 'gossip' },
    { text: "Closing time is midnight. Unless it's a holiday. Or a Tuesday. Or I forgot to lock the door. Which is always.", mood: 'friendly' },
  ],

  'cave': [
    // Ominous / atmospheric
    { text: "The darkness breathes. Can you hear it? In... out... in... out...", mood: 'mysterious' },
    { text: "Something below knows your name. It has known it for a very long time.", mood: 'mysterious' },
    { text: "The walls are wet. Not with water. Best not to think about it.", mood: 'warning' },
    { text: "There are footprints going in. None coming out. Curious, that.", mood: 'mysterious' },
    { text: "The cave does not hunger. The cave does not thirst. The cave simply... consumes.", mood: 'mysterious' },
    { text: "Somewhere deep below, something just stopped moving. It heard you.", mood: 'warning' },
    { text: "The torches flicker, though there is no wind. There has never been wind down here.", mood: 'mysterious' },
    { text: "The stones whisper warnings in languages that died before the world had a name.", mood: 'mysterious' },
    // Darkly humorous
    { text: "A sign at the entrance says 'Abandon Hope.' Someone crossed it out and wrote 'Free Loot.' They didn't come back either.", mood: 'gossip' },
    { text: "Last words of the previous adventurer: 'How bad can it be?' His epitaph reads the same.", mood: 'gossip' },
    { text: "The cave doesn't care about your armor. Or your sword. Or your feelings. Or your plans for Tuesday.", mood: 'grumpy' },
    { text: "The echoes down there sometimes echo things that haven't been said yet. Very poor customer experience.", mood: 'mysterious' },
    { text: "Someone left a one-star review scratched into the wall: 'Too many goblins. Not enough loot. Got eaten.'", mood: 'gossip' },
    { text: "The smell improves on Floor 3. It becomes a different, worse smell. But it's different. That's something.", mood: 'grumpy' },
    { text: "The goblins on Floor 1 are child's play. The children on Floor 3 are goblin's play. It's all very confusing.", mood: 'gossip' },
    { text: "Fun fact: the cave is older than the mountain above it. Don't ask how. Nobody likes that conversation.", mood: 'mysterious' },
    // Practical warnings (with dark humor)
    { text: "Bring a shield. The creatures hit harder than your landlord's rent notices. And that's saying something.", mood: 'warning' },
    { text: "Floor 5 is where hope goes to file its resignation. Bring potions. Bring prayers. Bring a will.", mood: 'warning' },
    { text: "The Dragon's Lair is no place for the unprepared. It is, however, an excellent place for the prepared to discover they were wrong.", mood: 'warning' },
    { text: "Rest here if you must. The entrance is safe. Mostly. The definition of 'mostly' is doing a lot of work in that sentence.", mood: 'friendly' },
    { text: "The deeper floors hold greater rewards. Also greater everything else. Mostly teeth.", mood: 'warning' },
    // Additional atmospheric
    { text: "The shadows down there have weight. You can feel them press against your skin like cold silk.", mood: 'mysterious' },
    { text: "Something scraped against stone three floors below. It wasn't a goblin. Goblins aren't that big.", mood: 'warning' },
    { text: "The cave remembers everyone who enters. It has a very good memory. And no forgiveness.", mood: 'mysterious' },
    { text: "There's a warm draft from below. Caves shouldn't have warm drafts. Unless something is breathing.", mood: 'warning' },
    { text: "The crystals on the third floor glow when danger is near. They haven't stopped glowing since spring.", mood: 'mysterious' },
    // Additional dark humor
    { text: "The lost-and-found box at the entrance contains: three swords, five shields, and forty-seven resignation letters.", mood: 'gossip' },
    { text: "A motivational poster near Floor 2 reads: 'You're halfway there!' Halfway to what, it doesn't say.", mood: 'gossip' },
    { text: "The cave troll on Floor 2 has a name. It's Gerald. He doesn't answer to it. He doesn't answer to anything. He just hits.", mood: 'gossip' },
    { text: "Someone installed a suggestion box on Floor 1. All the suggestions say 'more exits.'", mood: 'gossip' },
    { text: "The treasure on Floor 4 is real. Getting to Floor 4 is the imaginary part.", mood: 'warning' },
    { text: "A cartographer tried to map the cave. The cave rearranged itself. The cartographer rearranged his career.", mood: 'gossip' },
    { text: "I've counted the adventurers who went in this month. I've counted the ones who came out. The maths is upsetting.", mood: 'grumpy' },
    { text: "The boss on Floor 3 is called the Bone Collector. Three guesses why. You won't need three.", mood: 'warning' },
    { text: "An optimist went in with a torch and a smile. He came out with neither. But he came out, which is the main thing.", mood: 'gossip' },
    { text: "The floor is slippery. The walls are sharp. The ceiling is low. The architect was clearly a sadist.", mood: 'grumpy' },
    // Additional practical
    { text: "Healing potions are recommended. Not just recommended — they're the difference between 'heroic adventure' and 'cautionary tale.'", mood: 'warning' },
    { text: "The Forgotten Temple on Floor 6 has been there longer than Guildholm itself. It doesn't like visitors. Or anyone.", mood: 'mysterious' },
    { text: "Your equipment's durability matters down there. A broken sword in a goblin nest is just a very expensive stick.", mood: 'warning' },
    { text: "Every floor is harder than the last. This is not a metaphor. This is a threat. From the cave. Personally.", mood: 'warning' },
    { text: "If you hear singing on Floor 4, do not follow it. If you hear your own name on Floor 5, run.", mood: 'warning' },
    { text: "An adventurer installed torches on every floor. The cave ate them. Not metaphorically. The walls absorbed them.", mood: 'mysterious' },
    { text: "The gift shop at the entrance sells 'I Survived the Dungeon' shirts. Sales are modest. Returns are nonexistent.", mood: 'gossip' },
    { text: "Someone calculated the survival odds per floor. Floor 1: 90%. Floor 5: 30%. Floor 6: they stopped calculating.", mood: 'warning' },
    { text: "The stalactites drip. The stalagmites grow. The adventurers scream. The ecosystem is balanced.", mood: 'mysterious' },
    { text: "I once heard laughter from Floor 5. Not human laughter. Not any kind of laughter you want to investigate.", mood: 'warning' },
    { text: "The treasure chests on Floor 2 are real. The treasure chests that bite on Floor 3 are also real. Learn to tell the difference.", mood: 'warning' },
    { text: "A retired adventurer visits the entrance every week. Stares into the darkness. Says 'not today.' Leaves. I understand him.", mood: 'mysterious' },
    { text: "The guild sells maps of the dungeon. Every map is different. The dungeon changes. Or the cartographers are drunk. Or both.", mood: 'gossip' },
    { text: "Floor 4 smells like copper and ambition. The copper is blood. The ambition is yours. Keep both.", mood: 'warning' },
    { text: "A group went in singing. A smaller group came out humming. An even smaller group came out not making any sound at all.", mood: 'mysterious' },
    { text: "My advice: run in, grab gold, run out. Don't be a hero. Heroes have tombstones. Cowards have savings accounts.", mood: 'friendly' },
    { text: "The ancient writings on the cave walls translate to 'GO BACK.' In fourteen languages. Thorough, these ancients.", mood: 'warning' },
    { text: "They say the dungeon rewards the brave. They also say it punishes the foolish. The overlap is concerning.", mood: 'mysterious' },
    { text: "A skeleton on Floor 1 holds a sign: 'The treasure is worth it.' The skeleton's presence undermines the message.", mood: 'gossip' },
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
    { text: "A customer asked if I could make a sword that 'speaks.' I can barely make one that cuts.", mood: 'grumpy' },
    { text: "The forge runs on three things: coal, sweat, and a deep-seated fear of the wife's cooking.", mood: 'gossip' },
    { text: "Tempering improves a blade. Just like life improves a person. Mostly through hitting.", mood: 'grumpy' },
    { text: "The bellows are operated by hand. My hand. These arms didn't get this way from philosophy.", mood: 'friendly' },
    { text: "A knight asked for a sword that could cut through anything. I said 'even your ego?' He didn't laugh.", mood: 'gossip' },
    { text: "I forge weapons for a living. Some people forge friendships. Mine are sharper.", mood: 'grumpy' },
    { text: "The hottest part of the forge is 1,200 degrees. The hottest part of the day is when my wife visits.", mood: 'gossip' },
    { text: "Metal doesn't complain. Metal doesn't argue. Metal just does what you tell it. I prefer metal to people.", mood: 'grumpy' },
    { text: "Salvaging a broken weapon gives you half the materials back. Salvaging a broken relationship gives you nothing. Stick to metalwork.", mood: 'grumpy' },
    { text: "I don't make mistakes. I make prototypes. Failed prototypes. That I sell at a discount.", mood: 'friendly' },
    { text: "The coal delivery was late again. The coal merchant blames the roads. I blame the coal merchant. Balance.", mood: 'grumpy' },
    { text: "An elf said my forge was 'inelegant.' I said his face was about to be. He bought a sword. We're friends now.", mood: 'gossip' },
    { text: "My grandfather could forge a blade blindfolded. I can't. I've tried. The scars are a reminder.", mood: 'grumpy' },
    { text: "Every morning I light the forge. Every evening I close it. In between is what I was born to do. And also lunch.", mood: 'friendly' },
    { text: "The enchanter wants me to make 'magical weapons.' I make sharp ones. The magic is that they cut things.", mood: 'grumpy' },
    { text: "Repair jobs keep the lights on. New commissions keep the fires burning. Metaphorically. The fires are always burning.", mood: 'friendly' },
    { text: "A customer wanted a weapon 'with a dark past.' I said all iron has a dark past. It was a mountain. Now it's a sword.", mood: 'mysterious' },
    { text: "My apprentice finally made a decent nail yesterday. A nail. It took him three weeks. Progress.", mood: 'grumpy' },
    { text: "The sparks are beautiful, aren't they? Each one is a tiny piece of metal being violently separated from its family.", mood: 'friendly' },
    { text: "I've been offered jobs at three other forges. I turned them all down. This forge is mine. These burns are mine.", mood: 'friendly' },
    { text: "The hammer I use weighs twelve pounds. My resolve weighs more. My back, unfortunately, disagrees.", mood: 'grumpy' },
    { text: "Some smiths sing while they work. I don't. The metal doesn't care for music. Neither do my customers.", mood: 'grumpy' },
    { text: "The coal merchant raised prices again. I raised my fist. We negotiated. Violently. Prices are stable now.", mood: 'grumpy' },
    { text: "An apprentice asked when he'd be 'ready.' Ready for what? Ready to burn yourself for the rest of your life? Tomorrow.", mood: 'grumpy' },
    { text: "I repaired a sword that had killed a dragon. I didn't charge extra. I should have. Dragon blood rusted the tongs.", mood: 'gossip' },
    { text: "The forge has two temperatures: too hot and not hot enough. There is no 'just right.' This isn't a fairy tale.", mood: 'grumpy' },
    { text: "Craftsmanship is a dying art. Fortunately, so is adventuring. Business stays steady.", mood: 'grumpy' },
    { text: "Someone wanted a custom helmet shaped like a rooster. I made it. He died in battle. The rooster survived.", mood: 'gossip' },
    { text: "My father said 'the forge chooses the smith.' My mother said 'the forge chose wrong.' Both were right.", mood: 'friendly' },
    { text: "I made a sword for the king once. He never paid. Royal privilege, they said. Royal cheap, I said. Quietly.", mood: 'gossip' },
    { text: "Steel, iron, bronze. Three metals, three prices, three ways to not die. Choose wisely. Or expensively.", mood: 'friendly' },
    { text: "The bellows need replacing. The tongs need sharpening. The apprentice needs replacing AND sharpening.", mood: 'grumpy' },
    { text: "I forged my own wedding ring. My wife asked why it was so heavy. I said it's sturdy. She said it's ugly. She's not wrong.", mood: 'gossip' },
    { text: "Every blade that leaves this forge carries a piece of me. Sweat, mostly. And occasionally blood. Occupational hazard.", mood: 'friendly' },
    { text: "The difference between a blacksmith and an artist? Artists starve. Blacksmiths make things that prevent starving.", mood: 'grumpy' },
    { text: "A customer wanted a discount for buying in bulk. He wanted one sword. In 'emotional bulk.' I said no.", mood: 'grumpy' },
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
    { text: "Had someone grovel for an extension once. Cried real tears. I was moved. I still said no.", mood: 'grumpy' },
    { text: "Begging for more time? I've a ledger of broken promises thicker than the city wall.", mood: 'warning' },
    { text: "The eviction dwarf doesn't do refunds. Or apologies. Or mercy.", mood: 'grumpy' },
    { text: "Property values in Noble Heights are rising. Property values in the Slums are whatever someone will pay. Which is anything.", mood: 'friendly' },
    { text: "A tenant left a bad review. On the door. In paint. I charged them for the paint.", mood: 'grumpy' },
    { text: "The Slums roof leaks. It's a feature. Provides natural cooling. And natural drowning. Seasonally.", mood: 'grumpy' },
    { text: "I love my tenants. The paying ones. The non-paying ones I love less. The evicted ones I love from a distance.", mood: 'grumpy' },
    { text: "Someone asked about tenant's rights. I laughed. Then I showed them the door. It was a very nice door. Noble Heights.", mood: 'grumpy' },
    { text: "The heating in the Slums is your own body heat. Bring a blanket. Or a friend. Or both.", mood: 'friendly' },
    { text: "Noble Heights has a garden. The Slums have a puddle. Both are green. One intentionally.", mood: 'grumpy' },
    { text: "I treat all tenants equally. Equally subject to the lease. Equally subject to the eviction dwarf.", mood: 'grumpy' },
    { text: "Maintenance requests go in the box. The box goes in the fire. The cycle continues.", mood: 'gossip' },
    { text: "Had a wizard try to enlarge his room with a spell. Made it smaller. Then charged him for renovation.", mood: 'gossip' },
    { text: "The security deposit is non-refundable. As are my decisions. And my love. And the security deposit. Mentioned that.", mood: 'grumpy' },
    { text: "Neighbours in the Slums include: a pickpocket, two fences, and one surprisingly polite assassin.", mood: 'gossip' },
    { text: "Noble Heights: no rats, no leaks, no robberies. The Slums: all of the above. Your choice, your budget.", mood: 'friendly' },
    { text: "A tenant asked to decorate. I said 'within reason.' They installed a moat. We disagree on what 'reason' means.", mood: 'gossip' },
    { text: "The lease has 52 clauses. Clause 1: pay rent. Clause 2 through 52: see clause 1.", mood: 'grumpy' },
    { text: "Homelessness is an option. Not one I recommend. The streets are cold, the Shadowfingers are warm. Towards your pockets.", mood: 'warning' },
    { text: "I've been a landlord for twenty years. My hair was brown then. Now it's grey. Tenants did this. Specific tenants.", mood: 'grumpy' },
    { text: "The plumbing in the Slums is medieval. Because we ARE medieval. This is not an excuse. It's an explanation.", mood: 'grumpy' },
    { text: "Every tenant who leaves owes me something. Money, mostly. But also an apology. They never apologise.", mood: 'grumpy' },
    { text: "Location, location, location. The three most important things in housing. Also: rent, rent, rent.", mood: 'friendly' },
    { text: "A tenant asked for lower rent. I asked for higher standards. Neither of us got what we wanted.", mood: 'grumpy' },
    { text: "The Slums are affordable. Noble Heights is premium. The street is free. You get what you pay for at every price point.", mood: 'friendly' },
    { text: "I've had tenants who were knights, wizards, merchants, and one who was technically a ghost. The ghost paid on time. Best tenant.", mood: 'gossip' },
    { text: "Property law in Guildholm is simple: I own it, you rent it, the eviction dwarf enforces it.", mood: 'grumpy' },
    { text: "Noise complaints from Noble Heights: 'too quiet.' Noise complaints from the Slums: 'everything.'", mood: 'gossip' },
    { text: "I offered a tenant a longer lease for a better rate. They asked how long. I said 'eternity.' They declined. Weak commitment.", mood: 'grumpy' },
    { text: "The Slums have been 'up and coming' for forty years. They're still 'up and coming.' The 'coming' part is very slow.", mood: 'grumpy' },
    { text: "An adventurer asked if rent includes food. I laughed so hard I nearly waived the late fee. Nearly.", mood: 'grumpy' },
    { text: "The walls of the Slums are thin. So thin you can hear your neighbour's financial decisions. And regrets.", mood: 'gossip' },
    { text: "I've never raised rent unfairly. I've raised it fairly. Every quarter. Like clockwork. Fair, expensive clockwork.", mood: 'grumpy' },
    { text: "A tenant left a five-star review. In chalk. On the wall. I charged them for property damage and framed the review.", mood: 'gossip' },
    { text: "The welcome mat says 'Welcome.' The fine print says 'Rent due immediately.' Nobody reads the fine print.", mood: 'grumpy' },
    { text: "Noble Heights has a view of the city. The Slums have a view of the dumpster. Both have character.", mood: 'friendly' },
    { text: "Rent day is my favourite day. Well, my second favourite. My favourite is the day after rent day. When I count it.", mood: 'grumpy' },
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
    { text: "The afterlife has a queue. Apparently the paperwork there is worse than the guild's. Says it all.", mood: 'gossip' },
    { text: "A ghost asked me if I could dig him up. I said that's not how any of this works. He tipped well, though.", mood: 'gossip' },
    { text: "The newest tombstone reads: 'I told you I was sick.' They weren't wrong.", mood: 'gossip' },
    { text: "The graveyard has a 'no running' policy. Not for safety. The dead find it disrespectful.", mood: 'grumpy' },
    { text: "Resurrection costs vary. The basic package includes coming back. The premium package includes coming back correctly.", mood: 'friendly' },
    { text: "A zombie applied for a job here. Gravedigging. I admired the initiative. Couldn't fault the qualifications.", mood: 'gossip' },
    { text: "The oldest grave is four hundred years old. The occupant still complains about the rent. Force of habit.", mood: 'gossip' },
    { text: "Flowers left on graves disappear by morning. The ghosts appreciate them. Or the groundskeeper sells them. Either way.", mood: 'mysterious' },
    { text: "The priest here has performed three hundred resurrections. His success rate is 'encouraging.' He won't give numbers.", mood: 'gossip' },
    { text: "A vampire visited last week. Asked about plots with southern exposure. I said those are premium. He paid in advance.", mood: 'gossip' },
    { text: "The gravedigger's motto: 'Everybody needs me eventually.' It's not cheerful. It IS accurate.", mood: 'grumpy' },
    { text: "We had a seance last Friday. Contacted a spirit. It said 'stop calling.' We called again Saturday.", mood: 'gossip' },
    { text: "The memorial garden is peaceful. The crypt below it is not. Different management.", mood: 'warning' },
    { text: "An adventurer asked to be buried with his gold. I said we could arrange that. Shadowfingers unarranged it.", mood: 'gossip' },
    { text: "The gate creaks at night. Not because it's old. Because it has opinions.", mood: 'mysterious' },
    { text: "Death is temporary in Guildholm. The bill, however, is permanent.", mood: 'grumpy' },
    { text: "Some people visit to mourn. Some visit to meditate. Some visit because they're lost. All are welcome. Even the lost ones.", mood: 'friendly' },
    { text: "The soil here is unusually fertile. We don't ask why. The tomatoes are excellent. We don't ask about those either.", mood: 'mysterious' },
    { text: "I've been the caretaker for thirty years. The previous caretaker is still here. Row 7, plot 14.", mood: 'grumpy' },
    { text: "A bard wrote a song about the graveyard. It was hauntingly beautiful. Emphasis on the haunting. The ghosts did backing vocals.", mood: 'gossip' },
    { text: "The chapel bell rings at midnight. Nobody rings it. Nobody has rung it in years. It rings anyway. Best not to dwell on it.", mood: 'mysterious' },
    { text: "Visiting hours are sunrise to sunset. After sunset, the residents visit you. Different vibe entirely.", mood: 'warning' },
    { text: "The groundskeeper waters the roses. The roses haven't grown in years. He waters them anyway. Optimism, or madness.", mood: 'mysterious' },
    { text: "An adventurer asked to reserve a plot. 'Just in case,' they said. They were back within the week.", mood: 'gossip' },
    { text: "The graveyard expansion was approved by the council. Business is, unfortunately, booming.", mood: 'grumpy' },
    { text: "A skeleton waved at me last night. I waved back. We have an understanding. I don't ask questions. He doesn't chase me.", mood: 'friendly' },
    { text: "The tombstone carver charges by the letter. 'He lived' costs three gold. 'He lived well' costs five. 'He tried' costs one.", mood: 'gossip' },
    { text: "The crypt has excellent acoustics. We held a concert once. The audience was dead. The reviews were surprisingly positive.", mood: 'gossip' },
    { text: "A cat lives in the graveyard. Black cat. Very traditional. He's been here thirty years. Cats don't live thirty years. We don't discuss it.", mood: 'mysterious' },
    { text: "The resurrection fee is non-negotiable. Coming back from the dead is a luxury. We price it accordingly.", mood: 'grumpy' },
    { text: "Peace and quiet. That's what the graveyard offers. Well, quiet. Peace is contextual.", mood: 'friendly' },
    { text: "A ghost left a one-star review of the afterlife. Said the management was poor and the decor was 'very grey.'", mood: 'gossip' },
    { text: "The memorial bench says 'Rest in Peace.' The bench itself has never known peace. Two hundred mourners a day.", mood: 'friendly' },
    { text: "Full moon nights are busy. Not with visitors. With... other activity. I lock the gate. It doesn't help, but it's the principle.", mood: 'warning' },
    { text: "They buried a bard here last year. At night, you can hear music from his plot. He's still performing. Never could take a hint.", mood: 'gossip' },
    { text: "The oldest tree in the graveyard predates the city. It has seen every burial. It has opinions. It expresses them through creaking.", mood: 'mysterious' },
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
    { text: "The odds are always in my favour. That's not a slogan, it's mathematics. I checked.", mood: 'friendly' },
    { text: "Someone pawned their sense of shame last week. Couldn't give it away. Market's flooded.", mood: 'gossip' },
    { text: "I once won a tavern in a card game. Lost it the next hand. Easy come, easy go. Mostly easy go.", mood: 'gossip' },
    { text: "The secret to gambling is knowing when to stop. The secret to my business is that nobody does.", mood: 'friendly' },
    { text: "A customer asked me to appraise his sword. I said 'pointy end goes forward.' He didn't want that kind of appraisal.", mood: 'gossip' },
    { text: "I've fenced goods from every district in Guildholm. Professional coverage. No area left behind.", mood: 'friendly' },
    { text: "The back room has games with higher stakes. Higher stakes, higher thrills, higher chance of crying.", mood: 'warning' },
    { text: "A woman pawned her wedding ring. I gave her a fair price. She used it to gamble. Won three times the value. Love is strange.", mood: 'gossip' },
    { text: "My appraisal is final. Unless you cry. Then it's still final, but I feel briefly uncomfortable.", mood: 'grumpy' },
    { text: "The trick to haggling is knowing the item's worth. The trick to fencing is knowing nobody else does.", mood: 'mysterious' },
    { text: "Lucky charms don't work. I sell them anyway. Hope is a product. I'm in the hope business.", mood: 'friendly' },
    { text: "A regular lost everything last week. Came back the next day. With more money. I don't ask where. That's the arrangement.", mood: 'gossip' },
    { text: "I tried going legitimate once. Lasted a week. Too boring. Also too legal. Same thing.", mood: 'gossip' },
    { text: "The games are fair. The odds are not. There's a difference. A profitable difference.", mood: 'friendly' },
    { text: "Someone brought in a 'priceless' vase. I gave them five gold. Priceless is not a number. Five is.", mood: 'grumpy' },
    { text: "I know a guy who knows a guy who knows a thing. That's three degrees of separation from useful.", mood: 'mysterious' },
    { text: "Fortune favours the brave. Misfortune favours my customers. Business favours me.", mood: 'friendly' },
    { text: "I'm not a thief. I'm a secondary market specialist. Much more syllables. Much more respectable.", mood: 'friendly' },
    { text: "The roulette wheel hasn't been 'fixed' since last Tuesday. And it's only Thursday. Almost a record.", mood: 'gossip' },
    { text: "A customer once bet his house. He lost. I don't even want a house. But I have one now. Irony.", mood: 'gossip' },
    { text: "Risk is the spice of life. And I'm the spice merchant. Metaphorically. Also literally. I sell stolen spices.", mood: 'friendly' },
    { text: "Come back when you've got more gold. Or less sense. Ideally both.", mood: 'grumpy' },
    { text: "A customer asked for a 'sure thing.' I said 'death and taxes.' He bet on taxes. Lost. Even I was surprised.", mood: 'gossip' },
    { text: "I sell certainty in an uncertain world. Well, I sell the illusion of it. Same thing. Costs less.", mood: 'friendly' },
    { text: "My most expensive item is hope. My cheapest is reality. Most people buy the expensive one.", mood: 'mysterious' },
    { text: "The back alley has better odds. Also better chances of getting stabbed. Risk-reward, as they say.", mood: 'warning' },
    { text: "A paladin tried to convert me. I tried to sell him a hex. We agreed to disagree. He bought the hex.", mood: 'gossip' },
    { text: "I've appraised things worth more than houses. I've appraised things worth less than the spit on my boot. All in a day's work.", mood: 'grumpy' },
    { text: "The sign says 'caveat emptor.' Most customers can't read it. That's sort of the point.", mood: 'friendly' },
    { text: "A repeat customer is either loyal or desperate. I accept both. With open arms and closed returns.", mood: 'grumpy' },
    { text: "Every gambler has a system. Every system has a flaw. Every flaw makes me money. It's a beautiful ecosystem.", mood: 'friendly' },
    { text: "I've been called a cheat, a swindler, and a scoundrel. Nobody's called me unsuccessful.", mood: 'friendly' },
    { text: "The pawn shop keeps items for 30 days. After 30 days, the item is mine. After 31 days, I sell it. Efficiency.", mood: 'grumpy' },
    { text: "A customer once won ten times in a row. I closed early. Recalibrated the dice. Reopened. Business recovered.", mood: 'gossip' },
    { text: "I've been doing this for twenty years. My motto: 'Take the money and don't look back.' It's served me well.", mood: 'friendly' },
    { text: "The most valuable thing in this shop isn't for sale. It's my experience. And my complete lack of scruples.", mood: 'mysterious' },
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

  // Player has many quests completed
  if (player.completedQuests >= 15) {
    candidates.push({ text: `${player.completedQuests} quests! They'll be naming a wing of the guild after you at this rate.`, mood: 'friendly' });
    candidates.push({ text: `Quest veteran with ${player.completedQuests} completions. The monsters have started sending you fan mail.`, mood: 'gossip' });
  } else if (player.completedQuests >= 8) {
    candidates.push({ text: `Eight quests under your belt? You're getting a reputation, and for once it's a good one.`, mood: 'friendly' });
  }

  // Player has high happiness
  if (player.happiness >= 60) {
    candidates.push({ text: `You look suspiciously happy. In Guildholm, that's either admirable or a sign of madness.`, mood: 'gossip' });
    candidates.push({ text: `That much happiness is almost offensive. Share the secret, or keep it to yourself and be judged.`, mood: 'friendly' });
  }

  // Player has a loan
  if (player.loanAmount && player.loanAmount > 0) {
    candidates.push({ text: `Word at the bank is you've got a loan hanging over you. The interest is... unkind.`, mood: 'warning' });
    candidates.push({ text: `Debt is a shadow that follows you everywhere. Especially past the bank. They watch.`, mood: 'gossip' });
  }

  // Player has stocks
  if (player.stocks && Object.values(player.stocks).some(v => v > 0)) {
    candidates.push({ text: `Playing the stock market, are we? Bold strategy. The market has opinions about bold strategies.`, mood: 'gossip' });
    candidates.push({ text: `Heard you're investing in stocks. The merchants respect that. The market respects nothing.`, mood: 'warning' });
  }

  // Player is old
  if (player.age >= 50) {
    candidates.push({ text: `Still adventuring at your age? That's either brave or a failure to plan for retirement.`, mood: 'friendly' });
    candidates.push({ text: `The years add wisdom... and a disconcerting number of mysterious creaking sounds.`, mood: 'grumpy' });
  } else if (player.age >= 40) {
    candidates.push({ text: `Forty and still going strong. Your knees disagree, but your spirit is willing.`, mood: 'friendly' });
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
