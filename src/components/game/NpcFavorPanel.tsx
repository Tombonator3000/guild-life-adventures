import { useState } from 'react';
import { useCurrentPlayer, useGameStore } from '@/store/gameStore';
import { getNpcMemories, npcFavorBlock } from '@/data/npcMemories';
import { cityActivityOutcome } from '@/data/cityActivities';
import type { LocationId } from '@/types/game.types';
export function NpcFavorPanel({location}:{location:LocationId}) {
  const player=useCurrentPlayer(),perform=useGameStore(s=>s.performNpcFavor);
  const [selected,setSelected]=useState(''),[receipt,setReceipt]=useState('');
  if(!player) return null;
  const memories=getNpcMemories(player,location);
  const favor=memories.find(f=>f.id===selected)??memories[0];
  if(!favor) return null;
  const blocked=npcFavorBlock(player,favor), claimed=player.claimedNpcFavors?.includes(favor.id);
  return <section className="city-activity" aria-label="Personal favors">
    {memories.length>1 ? <label>Your contact<select aria-label="Personal favor" value={favor.id} onChange={e=>{setSelected(e.target.value);setReceipt('');}}>{memories.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label> : <h3 className="font-display">{favor.name}</h3>}
    <p>“{favor.greeting}”</p><p>{favor.description}</p>
    {!claimed && <p className="city-terms">{favor.hours}h · {cityActivityOutcome(player,favor)}{favor.infamy ? ` · +${Math.min(100,player.infamy+favor.infamy)-player.infamy} infamy` : ''}</p>}
    <button className="bank-primary" disabled={!!blocked} onClick={()=>{const result=perform(player.id,favor.id);if(result)setReceipt(result.message);}}>Accept favor · {favor.hours}h</button>
    <p role="status">{receipt||blocked||'A one-time offer earned by your earlier quest choice.'}</p>
  </section>;
}
