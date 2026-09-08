import { beforeEach, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { getNpcMemories, sanitizeQuestChoices } from '@/data/npcMemories';
import { validateGuestActionArgs } from '@/network/actionValidation';
beforeEach(()=>{
  useGameStore.setState({networkMode:'local'});
  useGameStore.getState().startNewGame(['Story Hero','Rival'],false,{wealth:5000,happiness:100,education:45,career:75,adventure:0});
});
it('remembers only the validated actual branch choice and exposes its matching contact',()=>{
  const s=useGameStore.getState(),id=s.players[0].id;
  useGameStore.setState(s=>({players:s.players.map((p,i)=>i===0?{...p,pendingNLChainChoice:{chainId:'thieves-guild',stepIndex:0}}:p)}));
  s.makeNLChainChoice(id,'invented-free-choice');
  expect(useGameStore.getState().players[0].questChoices).toBeUndefined();
  s.makeNLChainChoice(id,'tg-1-report');
  const p=useGameStore.getState().players[0];
  expect(p.questChoices).toEqual({'tg-1-investigate':'tg-1-report'});
  expect(useGameStore.getState().eventMessage).toContain('Escort the guard’s courier');
  expect(useGameStore.getState().eventMessage).toContain('Open Your contact');
  expect(getNpcMemories(p,'guild-hall').map(f=>f.id)).toEqual(['guard-escort']);
  expect(getNpcMemories(p,'shadow-market')).toEqual([]);
});
it('requires the remembered choice and current turn, then persists one-time fulfillment',()=>{
  const s=useGameStore.getState(),id=s.players[0].id;
  expect(s.performNpcFavor(id,'guard-escort')).toMatchObject({success:false});
  useGameStore.setState(s=>({players:s.players.map((p,i)=>i===0?{...p,currentLocation:'guild-hall',questChoices:{'tg-1-investigate':'tg-1-report'}}:p)}));
  const before=useGameStore.getState().players[0];
  expect(s.performNpcFavor(id,'guard-escort')).toMatchObject({success:true});
  const after=useGameStore.getState().players;
  expect(after[0]).toMatchObject({gold:before.gold+24,timeRemaining:before.timeRemaining-4,claimedNpcFavors:['guard-escort']});
  expect(s.performNpcFavor(id,'guard-escort')).toMatchObject({success:false});
  expect(useGameStore.getState().players).toBe(after);
  expect(s.saveToSlot(1)).toBe(true);
  useGameStore.setState({players:[]});
  expect(s.loadFromSlot(1)).toBe(true);
  expect(useGameStore.getState().players[0].claimedNpcFavors).toEqual(['guard-escort']);
  expect(s.performNpcFavor(id,'guard-escort')).toMatchObject({success:false});
});
it('keeps old saves memory-free and rejects mismatched choices and forged wire rewards',()=>{
  expect(sanitizeQuestChoices(undefined)).toEqual({});
  expect(sanitizeQuestChoices({'tg-1-investigate':'ca-2-destroy',unknown:'tg-1-report'})).toEqual({});
  const s=useGameStore.getState(),id=s.players[0].id;
  expect(validateGuestActionArgs('performNpcFavor',[id,'guard-escort',9999],s)).not.toBeNull();
  expect(validateGuestActionArgs('performNpcFavor',[id,'guard-escort'],s)).toBeNull();
});
it('records rival work from completed state and never presents a financial move as intent',()=>{
  const s=useGameStore.getState(),id=s.players[0].id;
  useGameStore.setState(s=>({players:s.players.map((p,i)=>i===0?{...p,currentLocation:'guild-hall',currentJob:'floor-sweeper',currentWage:4}:p)}));
  expect(s.performWorkShift(id,'full')).toMatchObject({success:true});
  expect(useGameStore.getState().players[0].lastTurnSummary).toBeUndefined();
  s.endTurn();
  const worked=useGameStore.getState().players[0].totalShiftsWorked;
  const summary=useGameStore.getState().players[0].lastTurnSummary;
  expect(summary?.entries).toContain(`Worked ${worked} ${worked===1?'shift':'shifts'}`);
  expect(summary?.entries).toContain('Started as Floor Sweeper');
  expect(summary?.entries.join(' ')).not.toMatch(/gold|saving|plans|wants|strategy/i);
  expect(useGameStore.getState().players[1].lastTurnSummary).toBeUndefined();
});
