import type { Player } from '@/types/game.types';
import { getJob } from '@/data/jobs';
import { DEGREES } from '@/data/education';
export interface PublicTurnStart { shifts:number; job:string|null; degrees:string[]; quests:number; floors:number[]; housing:string }
export interface TurnSummary { week:number; entries:string[] }
export function captureTurnStart(player:Player):PublicTurnStart {
  return {shifts:player.totalShiftsWorked,job:player.currentJob,degrees:[...player.completedDegrees],quests:player.completedQuests,floors:[...player.dungeonFloorsCleared],housing:player.housing};
}
/** Only public, completed state changes. No balances, intent or hidden targets. */
export function summarizeTurn(player:Player,week:number):TurnSummary {
  const before=player.publicTurnStart,entries:string[]=[];
  if(!before) return {week,entries};
  const shifts=player.totalShiftsWorked-before.shifts;
  if(shifts>0) entries.push(`Worked ${shifts} ${shifts===1?'shift':'shifts'}`);
  if(player.currentJob && player.currentJob!==before.job) entries.push(`Started as ${getJob(player.currentJob)?.name??player.currentJob}`);
  const degrees=player.completedDegrees.filter(d=>!before.degrees.includes(d));
  if(degrees.length) entries.push(`Graduated: ${degrees.map(d=>DEGREES[d]?.name??d).join(', ')}`);
  const quests=player.completedQuests-before.quests;
  if(quests>0) entries.push(`Completed ${quests} ${quests===1?'quest':'quests'}`);
  const floors=player.dungeonFloorsCleared.filter(f=>!before.floors.includes(f));
  if(floors.length) entries.push(`Cleared dungeon ${floors.length===1?'floor':'floors'} ${floors.join(', ')}`);
  if(player.housing!==before.housing) entries.push(`Housing changed to ${player.housing==='noble'?'Noble Heights':player.housing==='slums'?'the Slums':'homeless'}`);
  return {week,entries:entries.slice(0,6)};
}
