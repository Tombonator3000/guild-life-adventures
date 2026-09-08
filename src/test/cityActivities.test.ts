import { beforeEach, expect, it } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { CITY_ACTIVITIES, cityActivityEffects } from '@/data/cityActivities';
import { validateGuestActor, validateGuestActionArgs } from '@/network/actionValidation';

beforeEach(() => {
  useGameStore.setState({ networkMode:'local' });
  useGameStore.getState().startNewGame(['Participant','Rival'],false,{wealth:5000,happiness:100,education:45,career:75,adventure:0});
  useGameStore.setState(s => ({ phase:'playing', activeFestival:'spring-tournament', players:s.players.map(p => ({...p,currentLocation:'guild-hall',equippedWeapon:'dagger',health:70})) }));
});
it('uses catalogue terms, matches preview and prevents replay across city activities', () => {
  const s = useGameStore.getState(), p=s.players[0];
  const expected = cityActivityEffects(p,CITY_ACTIVITIES[0]);
  expect(s.performCityActivity(p.id,'tournament-contest')).toMatchObject({success:true});
  expect(useGameStore.getState().players[0]).toMatchObject({...expected,cityActivityWeek:1,cityActivityId:'tournament-contest'});
  const after = useGameStore.getState().players;
  expect(s.performCityActivity(p.id,'tournament-steward')).toMatchObject({success:false});
  expect(useGameStore.getState().players).toBe(after);
  useGameStore.setState({week:2});
  expect(s.performCityActivity(p.id,'tournament-steward')).toMatchObject({success:true});
});
it('rejects missing equipment, wrong location, expired events, insufficient time and wrong actor without charging', () => {
  const id = useGameStore.getState().players[0].id;
  for (const patch of [{equippedWeapon:null},{currentLocation:'bank' as const},{timeRemaining:1},{gold:0},{health:8}]) {
    const original = useGameStore.getState().players;
    useGameStore.setState({players:original.map((p,i)=>i===0 ? {...p,...patch}:p)});
    const before = useGameStore.getState().players;
    expect(useGameStore.getState().performCityActivity(id,'tournament-contest')).toMatchObject({success:false});
    expect(useGameStore.getState().players).toBe(before);
    useGameStore.setState({players:original});
  }
  const s=useGameStore.getState();
  expect(s.performCityActivity(s.players[1].id,'tournament-steward')).toMatchObject({success:false});
  useGameStore.setState({activeFestival:null});
  expect(s.performCityActivity(id,'tournament-steward')).toMatchObject({success:false});
});
it('rejects forged wire terms and actors before dispatch', () => {
  const s=useGameStore.getState(),id=s.players[0].id;
  expect(validateGuestActionArgs('performCityActivity',[id,'tournament-steward'],s)).toBeNull();
  expect(validateGuestActionArgs('performCityActivity',[id,'tournament-steward',10000],s)).not.toBeNull();
  expect(validateGuestActionArgs('performCityActivity',[id,'free-gold'],s)).not.toBeNull();
  expect(validateGuestActor('performCityActivity',['rival','tournament-steward'],id)).not.toBeNull();
});
it('clamps visible recovery gains and persists a bounded weekly receipt', () => {
  useGameStore.setState(s=>({activeFestival:'harvest-festival',players:s.players.map(p=>({...p,currentLocation:'general-store',foodLevel:99,happiness:99}))}));
  const s=useGameStore.getState(),p=s.players[0];
  expect(s.performCityActivity(p.id,'harvest-feast')).toMatchObject({success:true});
  expect(useGameStore.getState().players[0]).toMatchObject({foodLevel:100,happiness:100,cityActivityId:'harvest-feast'});
  expect(s.saveToSlot(1)).toBe(true);
  useGameStore.setState({players:[]});
  expect(s.loadFromSlot(1)).toBe(true);
  expect(useGameStore.getState().players[0].cityActivityWeek).toBe(1);
});

it('does not let a wire call bypass another player’s location hex',()=>{
  const s=useGameStore.getState(),id=s.players[0].id;
  useGameStore.setState({locationHexes:[{hexId:'test-hex',casterId:s.players[1].id,casterName:'Rival',targetLocation:'guild-hall',weeksRemaining:1}]});
  expect(s.performCityActivity(id,'tournament-steward')).toMatchObject({success:false,message:'A hex blocks this location.'});
});
