import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceOnce(text, from, to, path) {
  if (!text.includes(from)) throw new Error(`Missing pattern in ${path}: ${from.slice(0, 140)}`);
  return text.replace(from, to);
}

// Add a semantic, timed workplace raise wrapper for the AI.
{
  const path = 'src/store/helpers/employmentEducationServiceHelpers.ts';
  let text = read(path);
  text = replaceOnce(text,
    "    attendDegreeSession: (\n",
    `    attemptWorkplaceRaise: (playerId: string): ActionResult => {\n      const state = get();\n      const player = state.players.find(candidate => candidate.id === playerId);\n      if (!player || !player.currentJob) {\n        return { success: false, message: 'You do not currently have a job.' };\n      }\n\n      const job = getJob(player.currentJob);\n      if (!job) return { success: false, message: 'Current job could not be found.' };\n      if (JOB_LOCATION_NAMES[player.currentLocation] !== job.location) {\n        return { success: false, message: \`Visit \${job.location} before requesting a raise.\` };\n      }\n      if (player.timeRemaining < 1) return { success: false, message: 'Not enough time to request a raise.' };\n\n      // Preserve the existing AI balance: every completed workplace attempt costs one hour,\n      // whether management approves or denies it. Preconditions rejected above cost nothing.\n      const result = get().requestRaise(playerId);\n      get().spendTime(playerId, 1);\n      return result;\n    },\n\n    attendDegreeSession: (\n`,
    path,
  );
  write(path, text);
}

// Expose the semantic raise wrapper through the store type.
{
  const path = 'src/store/storeTypes.ts';
  let text = read(path);
  text = replaceOnce(text,
    "  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => ActionResult | void;\n",
    "  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => ActionResult | void;\n  attemptWorkplaceRaise: (playerId: string) => ActionResult | void;\n",
    path,
  );
  write(path, text);
}

// Replace legacy AI action dependencies and trivial handlers.
{
  const path = 'src/hooks/ai/actionExecutor.ts';
  let text = read(path);
  text = replaceOnce(text,
    `  workShift: (playerId: string, hours: number, wage: number) => boolean;\n  modifyGold: (playerId: string, amount: number) => void;\n`,
    `  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => { success: boolean; message: string } | void;\n  attemptWorkplaceRaise: (playerId: string) => { success: boolean; message: string } | void;\n  performHomeActivity: (playerId: string, activity: 'relax' | 'sleep') => { success: boolean; message: string } | void;\n  useHealerService: (playerId: string, serviceId: 'minor' | 'moderate' | 'full' | 'cure' | 'blessing') => { success: boolean; message: string } | void;\n  attendDegreeSession: (playerId: string, degreeId: import('@/types/game.types').DegreeId, mode: 'standard' | 'cram') => { success: boolean; message: string } | void;\n  graduateDegree: (playerId: string, degreeId: import('@/types/game.types').DegreeId) => { success: boolean; message: string } | void;\n  modifyGold: (playerId: string, amount: number) => void;\n`,
    path,
  );
  text = text.replace("  studyDegree: (playerId: string, degreeId: string, cost: number, hours: number) => void;\n", '');
  text = text.replace("  completeDegree: (playerId: string, degreeId: string) => void;\n", '');
  text = text.replace("  cureSickness: (playerId: string) => void;\n", '');
  text = text.replace("  requestRaise: (playerId: string) => { success: boolean; newWage?: number; message: string };\n", '');

  const oldHandlers = `function handleRest(player: Player, action: AIAction, store: StoreActions): boolean {\n  const hours = (action.details?.hours as number) || 4;\n  const happinessGain = (action.details?.happinessGain as number) || 5;\n  const relaxGain = (action.details?.relaxGain as number) || 3;\n  if (player.timeRemaining < hours) return false;\n  store.spendTime(player.id, hours);\n  store.modifyHappiness(player.id, happinessGain);\n  store.modifyRelaxation(player.id, relaxGain);\n  return true;\n}\n\nfunction handleHeal(player: Player, action: AIAction, store: StoreActions): boolean {\n  const cost = (action.details?.cost as number) || 30;\n  const healAmount = (action.details?.healAmount as number) || 25;\n  if (player.gold < cost) return false;\n  store.modifyGold(player.id, -cost);\n  store.modifyHealth(player.id, healAmount);\n  store.spendTime(player.id, 2);\n  return true;\n}\n\nfunction handleCureSickness(player: Player, action: AIAction, store: StoreActions): boolean {\n  const cost = (action.details?.cost as number) || 75;\n  if (!player.isSick || player.gold < cost || player.timeRemaining < 2) return false;\n  store.modifyGold(player.id, -cost);\n  store.spendTime(player.id, 2);\n  store.cureSickness(player.id);\n  return true;\n}\n`;
  const newHandlers = `function handleRest(player: Player, _action: AIAction, store: StoreActions): boolean {\n  const result = store.performHomeActivity(player.id, 'relax');\n  return result?.success ?? false;\n}\n\nfunction handleHeal(player: Player, _action: AIAction, store: StoreActions): boolean {\n  const result = store.useHealerService(player.id, 'minor');\n  return result?.success ?? false;\n}\n\nfunction handleCureSickness(player: Player, _action: AIAction, store: StoreActions): boolean {\n  const result = store.useHealerService(player.id, 'cure');\n  return result?.success ?? false;\n}\n`;
  text = replaceOnce(text, oldHandlers, newHandlers, path);
  write(path, text);
}

// Replace employment/education handlers with semantic dispatch only.
{
  const path = 'src/hooks/ai/handlers/employmentEducationHandlers.ts';
  const text = `/**\n * AI Action Handlers — Employment & Education\n *\n * Decision generators choose what to do. These handlers now send only semantic\n * intent; the store resolves canonical location, wage, price, time and progress.\n */\n\nimport type { Player, DegreeId } from '@/types/game.types';\nimport { getJob, canWorkJob } from '@/data/jobs';\nimport { DEGREES } from '@/data/education';\n\nimport type { AIAction } from '../types';\nimport type { StoreActions } from '../actionExecutor';\n\nexport function handleWork(player: Player, _action: AIAction, store: StoreActions): boolean {\n  const result = store.performWorkShift(player.id, 'full');\n  return result?.success ?? false;\n}\n\nexport function handleApplyJob(player: Player, action: AIAction, store: StoreActions): boolean {\n  const jobId = action.details?.jobId as string;\n  if (!jobId) return false;\n  const job = getJob(jobId);\n  if (!job) return false;\n  if (!canWorkJob(job, player.completedDegrees, player.clothingCondition, player.experience, player.dependability)) {\n    return false;\n  }\n  const result = store.acceptJobOffer(player.id, jobId);\n  return result?.success ?? false;\n}\n\nexport function handleRequestRaise(player: Player, _action: AIAction, store: StoreActions): boolean {\n  const result = store.attemptWorkplaceRaise(player.id);\n  return result?.success ?? false;\n}\n\nexport function handleStudy(player: Player, action: AIAction, store: StoreActions): boolean {\n  const degreeId = action.details?.degreeId as DegreeId;\n  if (!degreeId) return false;\n  const result = store.attendDegreeSession(player.id, degreeId, 'standard');\n  return result?.success ?? false;\n}\n\nexport function handleGraduate(player: Player, action: AIAction, store: StoreActions): boolean {\n  const degreeId = action.details?.degreeId as DegreeId;\n  if (!degreeId || !DEGREES[degreeId]) return false;\n  const result = store.graduateDegree(player.id, degreeId);\n  return result?.success ?? false;\n}\n`;
  write(path, text);
}

// Subscribe to semantic actions instead of the migrated legacy functions.
{
  const path = 'src/hooks/useGrimwaldAI.ts';
  let text = read(path);
  text = replaceOnce(text,
    `    workShift: state.workShift,\n    modifyGold: state.modifyGold,\n`,
    `    performWorkShift: state.performWorkShift,\n    attemptWorkplaceRaise: state.attemptWorkplaceRaise,\n    performHomeActivity: state.performHomeActivity,\n    useHealerService: state.useHealerService,\n    attendDegreeSession: state.attendDegreeSession,\n    graduateDegree: state.graduateDegree,\n    modifyGold: state.modifyGold,\n`,
    path,
  );
  text = text.replace("    studyDegree: state.studyDegree,\n", '');
  text = text.replace("    completeDegree: state.completeDegree,\n", '');
  text = text.replace("    cureSickness: state.cureSickness,\n", '');
  text = text.replace("    requestRaise: state.requestRaise,\n", '');
  write(path, text);
}

// Align the AI health precheck with the canonical Minor Healing catalogue price.
{
  const path = 'src/hooks/ai/actions/criticalNeeds.ts';
  let text = read(path);
  text = replaceOnce(text,
    `  if (player.health < ageHealthThreshold && player.gold >= 30) {\n    if (currentLocation === 'enchanter') {\n      actions.push({\n        type: 'heal',\n        priority: 80,\n        description: 'Visit healer to recover health',\n        details: { cost: 30, healAmount: 25 },\n      });\n`,
    `  const minorHealingCost = Math.max(1, Math.round(25 * ctx.priceModifier));\n  if (player.health < ageHealthThreshold && player.gold >= minorHealingCost) {\n    if (currentLocation === 'enchanter') {\n      actions.push({\n        type: 'heal',\n        priority: 80,\n        description: 'Visit healer to recover health',\n        details: { serviceId: 'minor', canonicalCost: minorHealingCost },\n      });\n`,
    path,
  );
  write(path, text);
}

console.log('Phase 14A AI semantic services applied.');
