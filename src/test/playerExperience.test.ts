import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useGameStore} from '@/store/gameStore';
import {getStoredDividendCredit} from '@/data/stocks';
import {generateNewspaper} from '@/data/newspaper';
import {CLEAR_WEATHER} from '@/data/weather';
import {ALL_JOBS} from '@/data/jobs';
import {normalizeSaveInPlace} from '@/data/saveLoad';
const succeeded = (result: void | {success:boolean}) => !!result && result.success;
const goals={wealth:50000,happiness:100,education:99,career:100,adventure:0};
beforeEach(()=>{localStorage.clear();useGameStore.getState().resetForNewGame();useGameStore.getState().startNewGame(['Alice','Bert'],false,goals);});
afterEach(()=>vi.restoreAllMocks());
describe('player experience rules',()=>{
  it('allows both housing transactions without hours and rejects the retired eight-week offer',()=>{
    useGameStore.setState(s=>({week:3,players:s.players.map(p=>({...p,currentLocation:'landlord',timeRemaining:0,gold:5000}))}));
    const id=useGameStore.getState().players[0].id;
    expect(succeeded(useGameStore.getState().payHousingRent(id,4))).toBe(true);
    // @ts-expect-error A stale or malicious caller must also be rejected at runtime.
    expect(succeeded(useGameStore.getState().payHousingRent(id,8))).toBe(false);
    expect(succeeded(useGameStore.getState().moveHousingAtLandlord(id,'noble'))).toBe(true);
    expect(useGameStore.getState().players[0].timeRemaining).toBe(0);
  });
  it.each([['sword','equippedWeapon'],['leather-armor','equippedArmor'],['shield','equippedShield']] as const)('buys and equips %s in one state change', (item,slot)=>{
    useGameStore.setState(s=>({players:s.players.map(p=>({...p,currentLocation:'armory',gold:5000,equippedWeapon:'dagger',durables:{dagger:1}}))}));
    const id=useGameStore.getState().players[0].id;
    expect(succeeded(useGameStore.getState().purchaseEquipmentItem(id,'armory',item))).toBe(true);
    const p=useGameStore.getState().players[0];expect(p[slot]).toBe(item);expect(p.durables.dagger).toBe(1);
    expect(succeeded(useGameStore.getState().purchaseEquipmentItem(id,'armory',item))).toBe(false);
    expect(useGameStore.getState().players[0].gold).toBe(p.gold);
  });
  it('credits each portfolio once, reconciles cash and preserves fractional credit through saves',()=>{
    vi.spyOn(Math,'random').mockReturnValue(.99);
    useGameStore.setState(s=>({week:2,stockPrices:{'crown-bonds':100,'crystal-mine':100},players:s.players.map((p,i)=>({...p,gold:200,housing:'noble',weeksSinceRent:0,foodLevel:100,hasStoreBoughtFood:false,health:100,isSick:false,stocks:{'crown-bonds':i?20:10,'crystal-mine':1}}))}));
    const before=useGameStore.getState().players[0];
    useGameStore.getState().processWeekEnd();
    const state=useGameStore.getState();
    for (const [i,p] of state.players.entries()) {
      const snap=p.weeklySnapshots.at(-1)!;
      expect(snap.dividendsPaid).toBe(i?20:10);
      expect(snap.gold).toBe(snap.openingGold!+snap.dividendsPaid!+snap.otherGoldChange!);
      expect(p.gold).toBe(snap.gold);
      expect(getStoredDividendCredit(p.stocks)).toBeCloseTo(.2);
    }
    expect(getStoredDividendCredit(before.stocks)).toBe(0);
    const saved=JSON.parse(JSON.stringify(state));normalizeSaveInPlace(saved);
    expect(saved.players[0].weeklySnapshots.at(-1).dividendsPaid).toBe(10);
    expect(getStoredDividendCredit(saved.players[0].stocks)).toBeCloseTo(.2);
  });
  it('prints actual weather, actions and unoccupied jobs without changing gameplay randomness',()=>{
    const random=vi.spyOn(Math,'random');
    const state=useGameStore.getState();
    const exclusive=ALL_JOBS.find(j=>j.careerLevel>2)!;
    state.players[0]={...state.players[0],currentJob:exclusive.id,lastTurnSummary:{week:3,entries:['Graduated: Commerce Degree']}};
    const context={players:state.players,weather:{...CLEAR_WEATHER,type:'drought' as const,name:'Drought',description:'Dry conditions',movementCostExtra:1},activeFestival:null};
    const first=generateNewspaper(4,1.2,1,[],context),second=generateNewspaper(4,1.2,1,[],context);
    expect(first).toEqual(second);expect(random).not.toHaveBeenCalled();
    expect(first.articles.some(a=>a.headline==='Drought')).toBe(true);
    expect(first.articles.some(a=>a.content.includes('Commerce Degree'))).toBe(true);
    expect(first.featuredJobs).not.toContain(exclusive.id);
    expect(first.articles.filter(a=>a.category==='gossip').every(a=>a.evidence==='satire')).toBe(true);
    expect(first.articles.some(a=>/inspection scheduled|rent due this week/i.test(a.headline))).toBe(false);
  });
});
