import { CharacterPortrait } from '../CharacterPortrait';
import { GoalProgress } from '../GoalProgress';
import { useGameStore } from '@/store/gameStore';
import { calculateGoalProgress } from '@/lib/calculateGoalProgress';
import type { Player, GoalSettings } from '@/types/game.types';
import '../player-experience.css';

interface PlayersTabProps { players:Player[]; currentPlayerIndex:number; goalSettings:GoalSettings }
/** One readable race card each. Detailed numbers stay behind an explicit choice. */
export function PlayersTab({players,currentPlayerIndex,goalSettings}:PlayersTabProps) {
  const prices=useGameStore(s=>s.stockPrices);
  return <div className="rival-list" aria-label="Players in turn order">
    {players.map((player,index)=>{
      const progress=Math.round(calculateGoalProgress(player,goalSettings,prices).overall);
      const active=index===currentPlayerIndex;
      const last=player.lastTurnSummary;
      const entries=last?.entries??[];
      return <article key={player.id} className="rival-card" data-active={active}>
        <div className="rival-identity"><CharacterPortrait portraitId={player.portraitId} playerColor={player.color} playerName={player.name} size={36} isAI={player.isAI} hasCurse={(player.activeCurses?.length??0)>0} curses={player.activeCurses}/><div><strong>{player.name}</strong><span>{player.isGameOver?'Out of the game':active?'Taking their turn':`Turn ${index+1}`}</span></div></div>
        <div className="rival-progress" aria-label={`${player.name}: ${progress}% of victory goals`}><span style={{width:`${progress}%`}} /></div>
        <p className="rival-progress-label">{progress}% toward victory</p>
        {entries.length>0 && <p className="rival-last-action"><small>Week {last!.week}</small>{entries.at(-1)}</p>}
        <details className="sidebar-details"><summary>Goals & last turn</summary><GoalProgress player={player} goals={goalSettings} compact />{entries.length>0&&<ul>{entries.map((entry,i)=><li key={i}>{entry}</li>)}</ul>}</details>
      </article>;
    })}
  </div>;
}
