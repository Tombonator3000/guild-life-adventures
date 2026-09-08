import { useState } from 'react';
import { getAppliance, getItem } from '@/data/items';
import { ROOM_ITEMS } from './roomLayout';
import './room.css';

// Kept for the editor/legacy appliance legend; gameplay uses scene coordinates.
export const APPLIANCE_POSITIONS = Object.fromEntries(Object.entries(ROOM_ITEMS).map(([id,p]) => [id, {left:`${p.x/15.36}%`,bottom:`${100-(p.y+p.height)/10.24}%`,icon:'',label:p.label}]));
interface RoomSceneProps {
  isNoble: boolean;
  ownedAppliances: string[]; brokenAppliances: string[]; ownedDurables: string[];
  relaxation: number;
}
export function RoomScene({isNoble,ownedAppliances,brokenAppliances,ownedDurables,relaxation}:RoomSceneProps) {
  const [selected,setSelected] = useState<string|null>(null);
  const ids = [...new Set([...ownedAppliances,...brokenAppliances,...ownedDurables])].filter(id => ROOM_ITEMS[id]);
  const selectedId = selected && ids.includes(selected) ? selected : null;
  const item = selectedId ? getAppliance(selectedId) ?? getItem(selectedId) : null;
  const base = `${import.meta.env.BASE_URL}home/`;
  return <div className="home-room" aria-label={isNoble?'Noble Heights home':'Slums home'}>
    <div className="home-room-view">
      <svg viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid meet" aria-label="Your furnished room">
        <image href={`${base}${isNoble?'noble':'slums'}-room.webp`} width="1536" height="1024" />
        {ids.sort((a,b)=>ROOM_ITEMS[a].y-ROOM_ITEMS[b].y).map(id=>{
          const pos=ROOM_ITEMS[id], broken=brokenAppliances.includes(id);
          const label = (getAppliance(id) ?? getItem(id))?.name ?? pos.label;
          return <g key={id} role="button" tabIndex={0} aria-label={`${label}${broken?' — broken':''}`} aria-pressed={selectedId===id} className="home-room-item" data-item={id} data-broken={broken} onClick={()=>setSelected(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(id);}}}>
            <title>{label}{broken?' — needs repair':''}</title>
            <image href={`${base}${id}.webp`} x={pos.x} y={pos.y} width={pos.width} height={pos.height} preserveAspectRatio="none" />
            <rect className="home-room-hit" x={pos.x-8} y={pos.y-8} width={pos.width+16} height={pos.height+16} rx="8" />
          </g>;
        })}
      </svg>
      <span className="home-comfort">Comfort {relaxation}/50</span>
    </div>
    <div className="home-room-caption" role="status">
      {item ? <><strong>{item.name}{brokenAppliances.includes(selectedId!)?' · Broken':''}</strong><span>{brokenAppliances.includes(selectedId!)?'Repair at the Enchanter or Shadow Market to restore its benefits.':item.description}</span></>
        : <span>{ids.length ? `${ids.length} furnishings · select an object to inspect it.` : 'A place of your own. Books, furnishings and magical purchases will make it yours.'}</span>}
    </div>
  </div>;
}
