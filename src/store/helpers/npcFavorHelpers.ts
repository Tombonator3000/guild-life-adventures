import { isLocationHexed } from '@/data/hexes';
import { NPC_FAVORS, npcFavorBlock } from '@/data/npcMemories';
import { cityActivityEffects } from '@/data/cityActivities';
import type { ActionResult, GetFn, SetFn } from '../storeTypes';
export function createNpcFavorActions(set:SetFn,get:GetFn) {
  return { performNpcFavor(playerId:string,favorId:string):ActionResult {
    const state=get(), player=state.players[state.currentPlayerIndex];
    if(state.phase !== 'playing' || !player || player.id !== playerId) return {success:false,message:'Wait for your turn.'};
    if(isLocationHexed(player.currentLocation,player.id,state.locationHexes)) return {success:false,message:'A hex blocks this location.'};
    const favor=NPC_FAVORS.find(f=>f.id===favorId);
    if(!favor) return {success:false,message:'Unknown favor.'};
    const blocked=npcFavorBlock(player,favor);
    if(blocked) return {success:false,message:blocked};
    set(s=>({players:s.players.map(p=>p.id===playerId ? {...p,...cityActivityEffects(p,favor),infamy:Math.min(100,(p.infamy??0)+(favor.infamy??0)),claimedNpcFavors:[...(p.claimedNpcFavors??[]),favor.id],gameStats:{...p.gameStats,totalGoldEarned:(p.gameStats.totalGoldEarned??0)+favor.gold,totalGoldSpent:(p.gameStats.totalGoldSpent??0)+favor.cost}}:p)}));
    get().checkVictory(playerId);
    return {success:true,message:`Completed: ${favor.name}.`};
  }};
}
