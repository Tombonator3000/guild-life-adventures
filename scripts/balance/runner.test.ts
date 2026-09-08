/** Runs the production React AI turn hook and authoritative store with a seeded clock/RNG.
 * Only presentation (audio, animation listeners, trash talk) is omitted. No economic mocks.
 */
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { useGameStore } from '../../src/store/gameStore';
import { useGrimwaldAI } from '../../src/hooks/useGrimwaldAI';
import * as executor from '../../src/hooks/ai/actionExecutor';
import { calculateGoalProgress } from '../../src/hooks/ai/strategy';
import { AI_OPPONENTS, type AIDifficulty, type GoalSettings } from '../../src/types/game.types';
import { getGameOption } from '../../src/data/gameOptions';
vi.mock('../../src/audio/sfxManager',()=>({playSFX:()=>{}}));
vi.mock('../../src/hooks/useAIAnimationBridge',()=>({triggerAIAnimation:()=>{}}));
vi.mock('../../src/data/aiTrashTalk',()=>({getTrashTalkLine:()=>null,TRASH_TALK_COOLDOWN:10000}));
const presets: Record<string, GoalSettings> = {
  quick:{wealth:2000,happiness:75,education:18,career:50,adventure:0},
  standard:{wealth:5000,happiness:100,education:45,career:75,adventure:0},
  adventure:{wealth:4000,happiness:80,education:27,career:65,adventure:12},
  epic:{wealth:10000,happiness:100,education:90,career:100,adventure:20},
};
function seeded(seed:number) {
  let value=seed >>> 0;
  return () => { value=(value+0x6D2B79F5)|0; let n=Math.imul(value^(value>>>15),1|value); n^=n+Math.imul(n^(n>>>7),61|n); return ((n^(n>>>14))>>>0)/4294967296; };
}
const increment=(counts:Record<string,number>,key:string)=>{counts[key]=(counts[key]??0)+1;};

async function simulate(seed:number, preset:string, difficulty:AIDifficulty) {
  localStorage.clear();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  // Warm React's one-time async scheduler before installing gameplay RNG.
  await act(async()=>{});
  const rng=vi.spyOn(Math,'random').mockImplementation(seeded(seed));
  const actions:Record<string,number>={}, failures:Record<string,number>={}, byPlayer:Record<string,Record<string,number>>={};
  const original=executor.executeAIAction;
  const observed=vi.spyOn(executor,'executeAIAction').mockImplementation((player,action,store)=>{
    const success=original(player,action,store);
    increment(success?actions:failures,action.type);
    if(success) increment(byPlayer[player.id]??=( {} ),action.type);
    return success;
  });
  useGameStore.setState({networkMode:'local'});
  useGameStore.getState().resetForNewGame();
  useGameStore.getState().startNewGame([],false,presets[preset],difficulty,AI_OPPONENTS.map(p=>({name:p.name,difficulty})));
  // Rotate seats, not attributes, so each personality starts equally often.
  useGameStore.setState(s=>({players:[...s.players.slice(seed%4),...s.players.slice(0,seed%4)],aiSpeedMultiplier:1}));
  const unusedHours:Record<string,number>={};
  const canonicalEndTurn=useGameStore.getState().endTurn;
  useGameStore.setState({endTurn:()=>{const s=useGameStore.getState(),p=s.players[s.currentPlayerIndex];if(p)unusedHours[p.id]=(unusedHours[p.id]??0)+p.timeRemaining;canonicalEndTurn();}});
  const hook=renderHook(()=>useGrimwaldAI(difficulty));
  hook.result.current.resetAdaptiveSystems();
  let turns=0, observedWeek=0, staleTurns=0;
  const snapshots:{week:number; progress:Record<string,number>}[]=[];
  const distress:Record<string,{starvingWeeks:number;homelessWeeks:number;overdueLoanWeeks:number;maxDistressStreak:number;streak:number}>={};
  const maxWeeks=Number(process.env.BALANCE_MAX_WEEKS??500);
  while(turns<maxWeeks*4+4) {
    let s=useGameStore.getState();
    if(s.winner || s.players.every(p=>p.isGameOver) || s.week>maxWeeks) break;
    if(s.week!==observedWeek) {
      observedWeek=s.week;
      snapshots.push({week:s.week,progress:Object.fromEntries(s.players.map(p=>[p.id,Number(calculateGoalProgress(p,s.goalSettings,s.stockPrices).overall.toFixed(4))]))});
      for(const p of s.players) {
        const d=distress[p.id]??= {starvingWeeks:0,homelessWeeks:0,overdueLoanWeeks:0,maxDistressStreak:0,streak:0};
        if(p.isGameOver) continue;
        if(p.foodLevel<=0) d.starvingWeeks++;
        if(p.housing==='homeless') d.homelessWeeks++;
        if(p.loanAmount>0&&p.loanWeeksRemaining<=0) d.overdueLoanWeeks++;
        d.streak=(p.foodLevel<=0||p.housing==='homeless')?d.streak+1:0;
        d.maxDistressStreak=Math.max(d.maxDistressStreak,d.streak);
      }
    }
    // Human-facing acknowledgement never changes the resolved economic effects.
    if(s.phase==='event') s.dismissEvent();
    if(s.deathEvent) s.dismissDeathEvent();
    if(s.shadowfingersEvent) s.dismissShadowfingersEvent();
    s=useGameStore.getState();
    const p=s.players[s.currentPlayerIndex], beforeWeek=s.week, beforeIndex=s.currentPlayerIndex;
    if(p.isGameOver){s.endTurn();continue;}
    act(()=>{
      // Production decisions contain no awaited I/O; only their display delay is virtual.
      void hook.result.current.runAITurn(p);
      vi.advanceTimersByTime(30_000);
    });
    const after=useGameStore.getState();
    turns++;
    if(!after.winner && after.week===beforeWeek && after.currentPlayerIndex===beforeIndex) {staleTurns++;break;}
  }
  const end=useGameStore.getState();
  const result={seed,preset,difficulty,status:end.winner?'victory':end.players.every(p=>p.isGameOver)?'all-dead':staleTurns?'stalled':'week-limit',
    winner:end.winner??null,weeks:end.week,turns,staleTurns,actions,failures,byPlayer,distress,unusedHours,snapshots,
    final:end.players.map(p=>({id:p.id,dead:p.isGameOver,job:p.currentJob,shifts:p.totalShiftsWorked,degrees:p.completedDegrees,quests:p.completedQuests,floors:p.dungeonFloorsCleared,wealth:calculateGoalProgress(p,end.goalSettings,end.stockPrices).wealth.current,progress:calculateGoalProgress(p,end.goalSettings,end.stockPrices).overall})),
  };
  hook.unmount();
  useGameStore.setState({endTurn:canonicalEndTurn});
  observed.mockRestore();rng.mockRestore();vi.clearAllTimers();
  return result;
}

it('runs reproducible complete production games and writes a candid balance report',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date']});
  const output=process.env.BALANCE_OUT??'docs/qa/playability/balance';
  mkdirSync(output,{recursive:true});
  const log=console.log.bind(console);
  vi.spyOn(console,'log').mockImplementation(()=>{});
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  const errors:string[]=[];
  vi.spyOn(console,'error').mockImplementation((...args)=>{if(errors.length<20)errors.push(args.map(String).join(' '));});
  try {
    const count=Number(process.env.BALANCE_GAMES??3), baseSeed=Number(process.env.BALANCE_SEED??20260908);
    const selected=(process.env.BALANCE_PRESETS??'quick,standard,adventure,epic').split(',');
    const offset=Number(process.env.BALANCE_OFFSET??0);
    const games=[];
    writeFileSync(`${output}/games.jsonl`,'');
    for(let i=0;i<count;i++) {
      const game=await simulate(baseSeed+offset+i,selected[(offset+i)%selected.length],(['easy','medium','hard'] as const)[(offset+i)%3]);
      games.push(game);
      appendFileSync(`${output}/games.jsonl`,JSON.stringify(game)+'\n');
      if(i===0){const replay=await simulate(game.seed,game.preset,game.difficulty);expect(replay).toEqual(game);}
      writeFileSync(`${output}/checkpoint.json`,JSON.stringify({requested:count,completed:games.length,latest:game.seed,status:game.status,weeks:game.weeks}));
      if(i%25===0||i===count-1)log(`[balance] ${i+1}/${count}: ${game.status}, ${game.weeks} weeks`);
    }
    const statuses:Record<string,number>={}, wins:Record<string,number>={}, actions:Record<string,number>={};
    for(const g of games){increment(statuses,g.status);if(g.winner)increment(wins,g.winner);for(const [a,n]of Object.entries(g.actions))actions[a]=(actions[a]??0)+n;}
    const completed=games.filter(g=>g.status==='victory'||g.status==='all-dead');
    const report={schema:1,source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed:baseSeed,offset,requested:count,completed:completed.length,statuses,wins,actions,presets,errors,
      options:{weather:getGameOption('enableWeatherEvents'),festivals:getGameOption('enableFestivals'),aging:getGameOption('enableAging'),permadeath:getGameOption('enablePermadeath')},games};
    writeFileSync(`${output}/report.json`,JSON.stringify(report));
    writeFileSync(`${output}/report.md`,['# Guild Life balance baseline','',`Source: ${report.source}. Seed: ${baseSeed}. Actual production AI hook and store; four personalities with rotating seats.`,
      `Requested ${count}; completed ${completed.length}. Statuses: ${JSON.stringify(statuses)}.`,
      `Mean completed duration: ${completed.length?(completed.reduce((n,g)=>n+g.weeks,0)/completed.length).toFixed(1):'n/a'} weeks.`,
      '', '| Personality | Wins |','| --- | ---: |',...Object.entries(wins).map(([p,n])=>`| ${p} | ${n} |`),'',
      'No wage, price, goal or AI priority tuning is performed by the harness. Audio, movement display and random trash talk are suppressed; gameplay randomness is Mulberry32. Replaying the first seed must match every metric. Stops and timeouts are not wins. No human players: adaptive counterplay to humans remains outside this baseline.',
      'Snapshots measure observed goal progress; distress is sampled at week boundaries. These are signals for review, not proof of human frustration or causality. New city activities have no AI generator yet and their absence from action counts is an explicit coverage gap.',
      '',`Captured runtime errors: ${errors.length}. See report.json for actions, failures, final goals, distress streaks and full weekly trajectories.`,''].join('\n'));
    expect(errors.filter(e=>!e.includes('not wrapped in act'))).toEqual([]);
    expect(games.every(g=>g.staleTurns===0)).toBe(true);
  } finally {vi.useRealTimers();vi.restoreAllMocks();}
});
