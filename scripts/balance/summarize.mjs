import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const [output, ...directories] = process.argv.slice(2);
if (!output || !directories.length) throw new Error('Usage: node scripts/balance/summarize.mjs OUTPUT_DIR BATCH_DIR...');
const batches = directories.map(dir => JSON.parse(readFileSync(`${dir}/report.json`, 'utf8')));
if (new Set(batches.map(b => b.source)).size !== 1) throw new Error('Batches must use the same source revision');
if (batches.some(b => b.errors.length)) throw new Error('Resolve captured runtime errors before combining batches');
const games = batches.flatMap(b => b.games).sort((a,b) => a.seed - b.seed);
if (new Set(games.map(g => g.seed)).size !== games.length) throw new Error('Overlapping simulation seeds');
const completed = games.filter(g => ['victory','all-dead'].includes(g.status));
const count = (rows, key) => rows.reduce((m,r) => { const k=key(r); m[k]=(m[k]??0)+1; return m; }, {});
const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
const quantile = (values,q) => {const n=[...values].sort((a,b)=>a-b);return n[Math.max(0,Math.ceil(n.length*q)-1)]??null;};
const pct = (a,b) => b ? `${(a/b*100).toFixed(1)}%` : '—';
const decimal = n => n===null?'—':n.toFixed(1);
const modes = Object.entries(batches[0].presets).map(([preset, goals]) => {
  const rows=games.filter(g=>g.preset===preset),done=rows.filter(g=>['victory','all-dead'].includes(g.status));
  const goalWins=rows.filter(g=>g.status==='victory' && g.final.find(p=>p.id===g.winner)?.progress>=1).length;
  return {preset,goals,attempts:rows.length,completed:done.length,goalWins,survivalWins:rows.filter(g=>g.status==='victory').length-goalWins,wins:count(rows.filter(g=>g.winner),g=>g.winner),meanWeeks:mean(done.map(g=>g.weeks)),medianWeeks:quantile(done.map(g=>g.weeks),.5),p90Weeks:quantile(done.map(g=>g.weeks),.9)};
});
const personalities = [...new Set(games.flatMap(g=>g.final.map(p=>p.id)))].map(id=>{
  const rows=games.flatMap(g=>g.final.filter(p=>p.id===id).map(p=>({p,g})));
  return {id,appearances:rows.length,wins:rows.filter(r=>r.g.winner===id).length,deaths:rows.filter(r=>r.p.dead).length,starving:rows.filter(r=>r.g.distress[id]?.starvingWeeks>0).length,homeless:rows.filter(r=>r.g.distress[id]?.homelessWeeks>0).length,overdueLoans:rows.filter(r=>r.g.distress[id]?.overdueLoanWeeks>0).length,maxDistress:Math.max(0,...rows.map(r=>r.g.distress[id]?.maxDistressStreak??0)),unusedHours:rows.reduce((n,r)=>n+(r.g.unusedHours[id]??0),0)};
});
const actionNames=[...new Set(games.flatMap(g=>[...Object.keys(g.actions),...Object.keys(g.failures)]))].sort();
const actions=actionNames.map(action=>({action,games:games.filter(g=>(g.actions[action]??0)>0).length,succeeded:games.reduce((n,g)=>n+(g.actions[action]??0),0),failed:games.reduce((n,g)=>n+(g.failures[action]??0),0)}));
const early=games.filter(g=>g.winner&&g.snapshots.some(s=>s.week===5)).map(g=>{
  const progress=g.snapshots.find(s=>s.week===5).progress,ranked=Object.entries(progress).sort((a,b)=>b[1]-a[1]);
  return {leader:ranked[0][0],clearLead:ranked[0][1]-ranked[1][1]>=.05,winner:g.winner,comeback:ranked[0][1]-(progress[g.winner]??0)>=.20};
});
const clear=early.filter(e=>e.clearLead);
const summary={schema:1,sourceLocal:batches[0].source,sourceCommit:process.env.BALANCE_SOURCE_REMOTE??batches[0].source,sourceTree:execFileSync('git',['rev-parse',`${batches[0].source}^{tree}`],{encoding:'utf8'}).trim(),seedMin:games[0]?.seed,seedMax:games.at(-1)?.seed,attempts:games.length,completed:completed.length,statuses:count(games,g=>g.status),options:batches[0].options,byPreset:modes,byDifficulty:['easy','medium','hard'].map(difficulty=>({difficulty,games:games.filter(g=>g.difficulty===difficulty).length,wins:count(games.filter(g=>g.difficulty===difficulty&&g.winner),g=>g.winner)})),personalities,actions,earlyLead:{eligible:early.length,clear:clear.length,held:clear.filter(e=>e.leader===e.winner).length,comebacks:early.filter(e=>e.comeback).length},finalJobs:count(games.flatMap(g=>g.final),p=>p.job??'unemployed'),finalDegrees:count(games.flatMap(g=>g.final.flatMap(p=>p.degrees)),d=>d)};
mkdirSync(output,{recursive:true});
writeFileSync(`${output}/summary.json`,JSON.stringify(summary,null,2));
writeFileSync(`${output}/games.json.gz`,gzipSync(Buffer.from(JSON.stringify({schema:1,source:summary.sourceCommit,games})),{level:9}));
const totalWins=games.filter(g=>g.winner).length;
const lines=['# Guild Life — balansebaseline','',`Kilde: [${summary.sourceCommit.slice(0,7)}](https://github.com/Tombonator3000/guild-life-adventures/commit/${summary.sourceCommit}). Frø ${summary.seedMin}–${summary.seedMax}; ${games.length} unike spillforsøk, ${completed.length} fullførte spill.`,
  `Utfall: ${Object.entries(summary.statuses).map(([k,n])=>`${k}: ${n}`).join(', ')}. Avbrutte eller fastlåste spill telles ikke som fullført.`,
  '', '## Varighet og seiersvilkår','', '| Målsett | Forsøk / fullført | Median uker | 90-persentil | Målseier | Siste overlevende |','| --- | ---: | ---: | ---: | ---: | ---: |',
  ...modes.map(m=>`| ${m.preset} | ${m.attempts} / ${m.completed} | ${m.medianWeeks??'—'} | ${m.p90Weeks??'—'} | ${m.goalWins} | ${m.survivalWins} |`),
  '', 'Seiertypen klassifiseres fra siste tilstand: full måloppnåelse versus seier uten alle mål oppnådd. Det siste er siste-overlevende-regelen. Det er viktig å skille disse når et krevende målsett ser kort ut.',
  '', '## Personligheter og tapsspiraler','', '| AI | Seire | Død i siste tilstand | Sult observert | Hjemløs observert | Forfalt lån observert |','| --- | ---: | ---: | ---: | ---: | ---: |',
  ...personalities.map(p=>`| ${p.id.replace('ai-','')} | ${p.wins} (${pct(p.wins,totalWins)}) | ${p.deaths} | ${p.starving} | ${p.homeless} | ${p.overdueLoans} |`),
  '', 'Sult, hjemløshet og forfalte lån telles som antall spillerløp der tilstanden ble observert ved minst én ukegrense. Kortvarige problemer midt i uken kan dermed bli oversett. Sammenheng med tap er ikke alene bevis for årsak.',
  '', '## Tidlig ledelse og opphenting','', `${clear.length} spill hadde en klar leder etter uke 5 (minst 5 prosentpoeng foran nummer to). Lederen vant ${clear.filter(e=>e.leader===e.winner).length} av disse (${pct(clear.filter(e=>e.leader===e.winner).length,clear.length)}). I ${early.filter(e=>e.comeback).length} av ${early.length} målbare spill vant en spiller som lå minst 20 prosentpoeng bak lederen i uke 5.`,
  '', 'Dette er observasjoner av samlet, avgrenset målprogresjon. Målet har takeffekter og er ikke en kausal test av en comeback-mekanikk.',
  '', '## Faktisk innholdsbruk','', '| Handling | Spill med vellykket bruk | Vellykkede forsøk | Avviste forsøk |','| --- | ---: | ---: | ---: |',
  ...actions.map(a=>`| ${a.action} | ${a.games} | ${a.succeeded} | ${a.failed} |`),
  '', '## Metode og begrensninger','', 'Måleren monterer produksjonens `useGrimwaldAI` og bruker faktiske store-handlinger og turregler. Fire personligheter roterer startrekkefølge. Målsett og vanskelighetsgrad roterer systematisk; detaljdata inneholder hver kombinasjon. Første frø i hver serie gjentas med identisk resultat. Ingen lønninger, priser, mål eller prioriteringer justeres av måleren.',
  `Spillvalg: ${Object.entries(summary.options).map(([k,v])=>`${k}=${v}`).join(', ')}. Kun lyd, visuell reiseanimasjon og tilfeldig småprat utelates. Reacts engangsinitialisering skjer før den seedede RNG-en installeres.`,
  'Alle spillere er AI. Tilpasning mot menneskelige motspillere og menneskelig opplevelse må fortsatt testes separat. Nye byaktiviteter og NPC-tilbud har foreløpig ingen AI-generator og inngår derfor ikke i bruksfrekvensene. De autoritative handlingene er testet separat.',
  '', 'Reproduser med kommandoene i `scripts/balance/README.md`. `summary.json` inneholder aggregater og kilde-tre; `games.json.gz` inneholder alle frø, handlinger, avvisninger, sluttmål og ukentlige progresjonspunkter.', ''];
writeFileSync(`${output}/report.md`,lines.join('\n'));
console.log(JSON.stringify({attempts:summary.attempts,completed:summary.completed,statuses:summary.statuses,byPreset:summary.byPreset.map(({preset,medianWeeks,p90Weeks,goalWins,survivalWins})=>({preset,medianWeeks,p90Weeks,goalWins,survivalWins}))}));
