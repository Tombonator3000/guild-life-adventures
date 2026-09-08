import type { Player } from '@/types/game.types';
import { NON_LINEAR_QUEST_CHAINS } from './questChains';
import type { CityActivity } from './cityActivities';

export interface NpcFavor extends CityActivity { step: string; choice: string; greeting: string; infamy?: number }
export const NPC_FAVORS: readonly NpcFavor[] = [
  {id:'guard-escort',name:'Escort the guard’s courier',location:'guild-hall',step:'tg-1-investigate',choice:'tg-1-report',greeting:'You brought the evidence to the guard. I can trust you with a courier.',hours:4,cost:0,gold:24,fame:1,description:'Your report opened this one-time guard assignment.'},
  {id:'undercover-contact',name:'Meet the undercover contact',location:'shadow-market',step:'tg-1-investigate',choice:'tg-1-infiltrate',greeting:'You chose to go inside the thieves’ guild. Your contact has a message.',hours:3,cost:0,gold:18,infamy:1,description:'Carry a message through the market. The association adds 1 infamy.'},
  {id:'double-agent-ledger',name:'Verify a discreet ledger',location:'fence',step:'tg-1-investigate',choice:'tg-1-blackmail',greeting:'You sold information to both sides. I remember that. Payment on delivery.',hours:3,cost:0,gold:20,infamy:2,description:'A one-time shady contract. Completing it adds 2 infamy.'},
  {id:'artifact-testimony',name:'Give testimony on the destroyed artifact',location:'academy',step:'ca-2-study',choice:'ca-2-destroy',greeting:'You destroyed the artifact. Tell our students why the risk was too great.',hours:3,cost:0,gold:0,happiness:8,fame:2,description:'Share what happened in a public discussion; this is not a degree session.'},
  {id:'purification-notes',name:'Help record the purification wards',location:'enchanter',step:'ca-2-study',choice:'ca-2-purify',greeting:'You chose purification. We can still learn from the wards you helped awaken.',hours:4,cost:0,gold:28,fame:1,description:'Record the ritual’s workings for a one-time research payment.'},
  {id:'dark-resonance',name:'Submit to a resonance study',location:'enchanter',step:'ca-2-study',choice:'ca-2-keep',greeting:'You kept the artifact’s power. I can hear the resonance. So can you.',hours:5,cost:0,gold:40,health:-8,infamy:2,description:'A dangerous one-time study: lose 8 health and gain 2 infamy.'},
];
export function getNpcMemories(player: Player, location: string) {
  return NPC_FAVORS.filter(f => f.location === location && player.questChoices?.[f.step] === f.choice);
}
export function npcFavorBlock(player: Player, favor: NpcFavor): string | null {
  if(player.isGameOver || player.currentLocation !== favor.location || player.questChoices?.[favor.step] !== favor.choice) return 'This contact is not available here.';
  if(player.claimedNpcFavors?.includes(favor.id)) return 'You have already completed this favor.';
  if(player.timeRemaining < favor.hours) return `Needs ${favor.hours} hours.`;
  if(player.gold < favor.cost) return `Needs ${favor.cost}g.`;
  if(player.health + (favor.health??0) <= 0) return 'Recover health before this favor.';
  return null;
}
/** Older saves have no invented choices; keep only known step/choice pairs. */
export function sanitizeQuestChoices(value: unknown): Record<string,string> {
  if(!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries: [string,string][]=[];
  for(const chain of NON_LINEAR_QUEST_CHAINS) for(const step of chain.steps) {
    const choice=(value as Record<string,unknown>)[step.id];
    if(typeof choice === 'string' && step.choices?.some(c=>c.id===choice)) entries.push([step.id,choice]);
  }
  return Object.fromEntries(entries);
}
