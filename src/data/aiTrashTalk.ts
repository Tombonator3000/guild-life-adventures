/**
 * AI Trash Talk System
 * Personality-specific one-liners triggered when AI completes key actions.
 * Uses the existing banterStore for display.
 */

import type { AIPersonalityId } from '@/hooks/ai/types';

export type TrashTalkTrigger =
  | 'work-shift'
  | 'buy-equipment'
  | 'dungeon-clear'
  | 'quest-complete'
  | 'study'
  | 'graduate'
  | 'deposit-bank'
  | 'buy-stock'
  | 'cast-curse'
  | 'take-quest'
  | 'apply-job'
  | 'move-housing'
  | 'sabotage-player'
  | 'buy-tip-off'
  | 'buy-protection';

interface TrashTalkLine {
  text: string;
  mood: 'friendly' | 'grumpy' | 'mysterious' | 'gossip' | 'warning';
}

/** Chance (0-1) that trash talk triggers on any AI action */
export const TRASH_TALK_CHANCE = 0.18;

/** Minimum ms between trash talk from same AI */
export const TRASH_TALK_COOLDOWN = 15000;

const GRIMWALD_LINES: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'work-shift': [
    { text: "Another honest day's work. You should try it sometime.", mood: 'grumpy' },
    { text: "The guild doesn't run itself. Neither does my wallet.", mood: 'friendly' },
  ],
  'dungeon-clear': [
    { text: "The caves hold no surprises for Grimwald.", mood: 'friendly' },
    { text: "Another floor cleared. I barely broke a sweat.", mood: 'grumpy' },
  ],
  'graduate': [
    { text: "Knowledge is power. I now have both.", mood: 'friendly' },
  ],
  'quest-complete': [
    { text: "Quest done. Where's the next challenge?", mood: 'friendly' },
  ],
  'deposit-bank': [
    { text: "A wise adventurer saves for rainy days.", mood: 'friendly' },
  ],
  'apply-job': [
    { text: "I believe this position suits me perfectly.", mood: 'friendly' },
  ],
};

// Sabotage / Fence-service lines per personality
const GRIMWALD_FENCE: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'buy-protection': [
    { text: "A guildsman pays his dues. Even to the shadows.", mood: 'grumpy' },
    { text: "Better safe than robbed blind on the way home.", mood: 'friendly' },
  ],
  'sabotage-player': [
    { text: "Sometimes honor takes a back seat to victory.", mood: 'grumpy' },
    { text: "Shadowfingers owes me a favor. Time to collect.", mood: 'mysterious' },
  ],
  'buy-tip-off': [
    { text: "Knowledge of one's rivals is half the battle.", mood: 'friendly' },
  ],
};

const SERAPHINA_FENCE: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'buy-protection': [
    { text: "A small price to keep my coin purse intact.", mood: 'friendly' },
    { text: "Even scholars need protection from common thugs.", mood: 'mysterious' },
  ],
  'sabotage-player': [
    { text: "Consider this a lesson in humility.", mood: 'mysterious' },
    { text: "I would hex you myself, but Shadowfingers works cheaper.", mood: 'gossip' },
  ],
  'buy-tip-off': [
    { text: "Information is the most valuable currency.", mood: 'mysterious' },
  ],
};

const THORNWICK_FENCE: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'buy-protection': [
    { text: "Insurance is the cornerstone of any sound portfolio.", mood: 'friendly' },
    { text: "Risk management, my friends. Risk management.", mood: 'grumpy' },
  ],
  'sabotage-player': [
    { text: "A modest investment in your misfortune.", mood: 'grumpy' },
    { text: "Shadowfingers is remarkably affordable this season.", mood: 'friendly' },
    { text: "Nothing personal. Just market correction.", mood: 'mysterious' },
  ],
  'buy-tip-off': [
    { text: "Due diligence before any hostile action.", mood: 'friendly' },
    { text: "Intel separates the wealthy from the bankrupt.", mood: 'grumpy' },
  ],
};

const MORGATH_FENCE: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'buy-protection': [
    { text: "Even a warrior watches his back in these streets.", mood: 'warning' },
    { text: "My gold, my rules. Touch it and bleed.", mood: 'warning' },
  ],
  'sabotage-player': [
    { text: "Shadowfingers strikes where my blade cannot reach.", mood: 'warning' },
    { text: "Suffer, rival. Suffer well.", mood: 'warning' },
    { text: "I would gut you myself, but the guild frowns on murder.", mood: 'grumpy' },
  ],
  'buy-tip-off': [
    { text: "Know thy enemy. Then break them.", mood: 'warning' },
  ],
};

const SERAPHINA_LINES: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'study': [
    { text: "The arcane texts reveal their secrets to me alone.", mood: 'mysterious' },
    { text: "While you swing swords, I sharpen my mind.", mood: 'friendly' },
  ],
  'graduate': [
    { text: "Another degree! The Academy practically reserves my seat.", mood: 'friendly' },
    { text: "Education is the one investment that never depreciates.", mood: 'mysterious' },
  ],
  'dungeon-clear': [
    { text: "Brains over brawn. The monsters never stood a chance.", mood: 'friendly' },
  ],
  'quest-complete': [
    { text: "A scholarly approach yields scholarly results.", mood: 'friendly' },
  ],
  'work-shift': [
    { text: "Even scholars must eat. For now.", mood: 'grumpy' },
  ],
};

const THORNWICK_LINES: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'deposit-bank': [
    { text: "My gold breeds more gold. Compound interest is beautiful.", mood: 'friendly' },
    { text: "The vault grows heavier by the day. Splendid.", mood: 'friendly' },
  ],
  'buy-stock': [
    { text: "I see an opportunity. You probably don't.", mood: 'grumpy' },
    { text: "The market whispers to those who listen. It screams at those who don't.", mood: 'mysterious' },
  ],
  'work-shift': [
    { text: "Every coin earned is a coin my competitors don't have.", mood: 'grumpy' },
  ],
  'apply-job': [
    { text: "They offered me the position immediately. Of course they did.", mood: 'friendly' },
  ],
  'move-housing': [
    { text: "One must live in a manner befitting one's... net worth.", mood: 'friendly' },
  ],
  'graduate': [
    { text: "A degree is an investment. This one will pay for itself tenfold.", mood: 'friendly' },
  ],
};

const MORGATH_LINES: Partial<Record<TrashTalkTrigger, TrashTalkLine[]>> = {
  'dungeon-clear': [
    { text: "The beast fell before my blade. As they all do.", mood: 'warning' },
    { text: "Blood and steel. That's all the dungeon understands.", mood: 'grumpy' },
    { text: "Another trophy for my collection.", mood: 'friendly' },
  ],
  'buy-equipment': [
    { text: "A warrior is only as strong as their steel.", mood: 'grumpy' },
    { text: "This blade hungers. Soon it will feast.", mood: 'warning' },
  ],
  'cast-curse': [
    { text: "Consider that a warning shot.", mood: 'warning' },
    { text: "Hex first, ask questions never.", mood: 'grumpy' },
  ],
  'quest-complete': [
    { text: "Another quest crushed beneath my boot.", mood: 'grumpy' },
  ],
  'work-shift': [
    { text: "Even Morgath must earn gold between battles.", mood: 'grumpy' },
  ],
  'take-quest': [
    { text: "This quest was meant for a warrior. Me.", mood: 'warning' },
  ],
};

const PERSONALITY_LINES: Record<AIPersonalityId, Partial<Record<TrashTalkTrigger, TrashTalkLine[]>>> = {
  grimwald: GRIMWALD_LINES,
  seraphina: SERAPHINA_LINES,
  thornwick: THORNWICK_LINES,
  morgath: MORGATH_LINES,
};

// Merge Fence-service lines after all *_LINES are declared
Object.assign(GRIMWALD_LINES, GRIMWALD_FENCE);
Object.assign(SERAPHINA_LINES, SERAPHINA_FENCE);
Object.assign(THORNWICK_LINES, THORNWICK_FENCE);
Object.assign(MORGATH_LINES, MORGATH_FENCE);

/**
 * Get a random trash talk line for an AI personality and trigger.
 * Returns null if no line exists for this combo or if RNG says no.
 */
export function getTrashTalkLine(
  personalityId: AIPersonalityId,
  trigger: TrashTalkTrigger,
): TrashTalkLine | null {
  if (Math.random() > TRASH_TALK_CHANCE) return null;

  const lines = PERSONALITY_LINES[personalityId]?.[trigger];
  if (!lines || lines.length === 0) return null;

  return lines[Math.floor(Math.random() * lines.length)];
}
