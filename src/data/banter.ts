// Banter system - NPCs occasionally say witty comments or gossip
// Triggered randomly when player interacts with location

import type { LocationId } from '@/types/game.types';

export interface BanterLine {
  text: string;
  mood?: 'friendly' | 'grumpy' | 'mysterious' | 'gossip' | 'warning';
}

// Chance (0-1) that banter triggers on any interaction
export const BANTER_CHANCE = 0.25; // 25% chance

// Cooldown in ms before same NPC can banter again
export const BANTER_COOLDOWN = 30000; // 30 seconds

// Banter lines per NPC/location
export const BANTER_LINES: Partial<Record<LocationId, BanterLine[]>> = {
  'guild-hall': [
    { text: "Heard Grimwald's been eyeing the same quest as you...", mood: 'gossip' },
    { text: "Back in my day, we didn't have fancy armor. Just courage!", mood: 'grumpy' },
    { text: "The guild coffers are looking healthy this season.", mood: 'friendly' },
    { text: "Watch yourself in the caves. Lost three adventurers last month.", mood: 'warning' },
    { text: "Some say Shadowfingers has eyes everywhere...", mood: 'mysterious' },
    { text: "Your reputation precedes you, adventurer.", mood: 'friendly' },
    { text: "The higher ranks bring better quests. And better pay.", mood: 'friendly' },
  ],

  'bank': [
    { text: "Gold doesn't grow on trees. Well, except in the Enchanted Forest.", mood: 'friendly' },
    { text: "Interest rates are quite favorable this quarter.", mood: 'friendly' },
    { text: "I've seen adventurers come and go. The smart ones save.", mood: 'grumpy' },
    { text: "Between us, the stock market's been volatile lately...", mood: 'gossip' },
    { text: "Your savings are protected by ancient dwarven vaults.", mood: 'friendly' },
    { text: "Lord Pemberton withdrew his entire fortune yesterday. Curious...", mood: 'gossip' },
  ],

  'general-store': [
    { text: "Fresh bread just came in from the baker!", mood: 'friendly' },
    { text: "Prices aren't what they used to be, I'm afraid.", mood: 'grumpy' },
    { text: "The wife says I give too many discounts. She's probably right.", mood: 'friendly' },
    { text: "Heard the tavern's got a new ale on tap.", mood: 'gossip' },
    { text: "Stock up before winter. Trust me on this one.", mood: 'warning' },
    { text: "Quality goods at fair prices - that's my motto!", mood: 'friendly' },
  ],

  'armory': [
    { text: "Steel or leather? Both'll save your life.", mood: 'grumpy' },
    { text: "This blade? Forged it myself. Thirty years experience.", mood: 'friendly' },
    { text: "The cave monsters are getting tougher. Upgrade while you can.", mood: 'warning' },
    { text: "Seen adventurers rely on cheap gear. Seen 'em not come back too.", mood: 'grumpy' },
    { text: "The enchanter and I have a partnership. Good enchantments on good steel.", mood: 'friendly' },
    { text: "Your armor's looking a bit worn. Just saying.", mood: 'friendly' },
  ],

  'enchanter': [
    { text: "The magical energies are particularly strong today...", mood: 'mysterious' },
    { text: "I sense great potential in you. Or is that just the herbs?", mood: 'friendly' },
    { text: "Every enchantment tells a story. What's yours?", mood: 'mysterious' },
    { text: "The shadow market sells knockoff enchantments. Buyer beware.", mood: 'warning' },
    { text: "My crystals whisper of interesting times ahead...", mood: 'mysterious' },
    { text: "Magic is not about power. It's about understanding.", mood: 'friendly' },
  ],

  'shadow-market': [
    { text: "You didn't see me. I didn't see you. We good?", mood: 'mysterious' },
    { text: "Got some items that... fell off a cart. Interested?", mood: 'gossip' },
    { text: "The guards have been sniffing around. Keep it quiet.", mood: 'warning' },
    { text: "Heard Shadowfingers is planning something big...", mood: 'gossip' },
    { text: "Quality merchandise, no questions asked.", mood: 'friendly' },
    { text: "Everyone's got secrets. I just help trade 'em.", mood: 'mysterious' },
  ],

  'academy': [
    { text: "Knowledge is the greatest treasure of all.", mood: 'friendly' },
    { text: "The library has some fascinating new acquisitions...", mood: 'friendly' },
    { text: "I remember when you couldn't tell a grimoire from a cookbook!", mood: 'friendly' },
    { text: "Education is an investment in yourself.", mood: 'friendly' },
    { text: "Some students think they know everything. They learn.", mood: 'grumpy' },
    { text: "The mage courses are particularly challenging this term.", mood: 'warning' },
  ],

  'rusty-tankard': [
    { text: "What'll it be? We've got ale, mead, and... more ale.", mood: 'friendly' },
    { text: "You look like you need a drink. Or three.", mood: 'friendly' },
    { text: "Heard the funniest rumor about the guild master...", mood: 'gossip' },
    { text: "The bard's playing tonight. Should be a good crowd.", mood: 'friendly' },
    { text: "Between you and me, the stew's better than it looks.", mood: 'gossip' },
    { text: "Adventurers come here to forget their troubles. Works every time.", mood: 'friendly' },
    { text: "Tips aren't mandatory, but they're appreciated!", mood: 'friendly' },
  ],

  'cave': [
    { text: "The darkness whispers of treasure... and danger.", mood: 'mysterious' },
    { text: "Many enter. Fewer leave. Such is the way.", mood: 'warning' },
    { text: "The deeper floors hold greater rewards.", mood: 'mysterious' },
    { text: "Something stirs in the depths...", mood: 'warning' },
  ],

  'forge': [
    { text: "Hard work and hot iron - that's the life.", mood: 'grumpy' },
    { text: "Looking for work? I could use an extra hand.", mood: 'friendly' },
    { text: "The smell of molten metal never gets old.", mood: 'friendly' },
    { text: "Quality craftsmanship takes time. And sweat.", mood: 'grumpy' },
    { text: "The armory buys everything I make. Good partnership.", mood: 'friendly' },
  ],

  'landlord': [
    { text: "Rent's due. You know the drill.", mood: 'grumpy' },
    { text: "Nice place, isn't it? Worth every gold piece.", mood: 'friendly' },
    { text: "The previous tenant left in a hurry. Don't ask why.", mood: 'mysterious' },
    { text: "Upgrade to better lodgings? I've got options.", mood: 'friendly' },
    { text: "Pay on time and we'll get along just fine.", mood: 'grumpy' },
    { text: "Housing market's tight. You're lucky to have a place.", mood: 'warning' },
  ],

  'graveyard': [
    { text: "The dead have much to teach... if you listen.", mood: 'mysterious' },
    { text: "Another one risen. The spirits are generous today.", mood: 'friendly' },
    { text: "Don't disturb the old graves. Those ones don't come back friendly.", mood: 'warning' },
    { text: "I've dug more holes than I can count. Filled a few back in, too.", mood: 'grumpy' },
    { text: "They say the cemetery is haunted. I say it's just... lively.", mood: 'gossip' },
    { text: "The fog rolls in thick some nights. Best not to wander alone.", mood: 'warning' },
  ],

  'fence': [
    { text: "Buy, sell, or take a gamble? I'm your guy.", mood: 'friendly' },
    { text: "Got something valuable? I'll give you a fair price. Mostly.", mood: 'gossip' },
    { text: "The dice are feeling lucky tonight...", mood: 'mysterious' },
    { text: "No refunds. No returns. No exceptions.", mood: 'grumpy' },
    { text: "I've got connections. Just say the word.", mood: 'mysterious' },
    { text: "Some call it gambling. I call it... strategic investment.", mood: 'friendly' },
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
