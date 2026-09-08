import {act,cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {useGameStore} from '@/store/gameStore';
import {playSFX} from '@/audio/sfxManager';
import {MilestoneNotice} from './MilestoneNotice';
vi.mock('@/audio/sfxManager',()=>({playSFX:vi.fn()}));
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();useGameStore.getState().resetForNewGame();useGameStore.getState().startNewGame(['Graduate'],false,{wealth:5000,happiness:100,education:99,career:100,adventure:0});});
afterEach(cleanup);
it('plays the packaged fanfare once after actual graduation and never for a rejected attempt',()=>{
  const id=useGameStore.getState().players[0].id;
  useGameStore.setState(s=>({players:s.players.map(p=>({...p,currentLocation:'academy',degreeProgress:{'trade-guild':10}}))}));
  render(<MilestoneNotice/>);
  expect(playSFX).not.toHaveBeenCalled();
  act(()=>{useGameStore.getState().graduateDegree(id,'junior-academy');});
  expect(playSFX).not.toHaveBeenCalled();
  act(()=>{useGameStore.getState().graduateDegree(id,'trade-guild');});
  expect(playSFX).toHaveBeenCalledExactlyOnceWith('graduation');
  expect(screen.getByRole('status')).toHaveTextContent('Diploma earned');
  act(()=>{useGameStore.getState().graduateDegree(id,'trade-guild');});
  expect(playSFX).toHaveBeenCalledTimes(1);
});
it('does not fanfare when a save or another player is first shown',()=>{
  useGameStore.setState(s=>({players:s.players.map(p=>({...p,completedDegrees:['trade-guild']}))}));
  render(<MilestoneNotice/>);expect(playSFX).not.toHaveBeenCalled();
});
