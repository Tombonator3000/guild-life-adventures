import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, transforms) {
  let source = readFileSync(path, 'utf8');
  for (const [label, search, replacement] of transforms) {
    const next = source.replace(search, replacement);
    if (next === source) throw new Error(`Patch target not found in ${path}: ${label}`);
    source = next;
  }
  writeFileSync(path, source);
  console.log(`Patched ${path}`);
}

patch('src/store/storeTypes.ts', [
  ['service signatures',
`  completeDegree: (playerId: string, degreeId: DegreeId) => void;
  swapOutfits: (playerId: string) => boolean;`,
`  completeDegree: (playerId: string, degreeId: DegreeId) => void;
  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => ActionResult | void;
  attendDegreeSession: (playerId: string, degreeId: DegreeId, mode: 'standard' | 'cram') => ActionResult | void;
  prepayDegree: (playerId: string, degreeId: DegreeId) => ActionResult | void;
  graduateDegree: (playerId: string, degreeId: DegreeId) => ActionResult | void;
  swapOutfits: (playerId: string) => boolean;`],
]);

patch('src/store/gameStore.ts', [
  ['service import',
`import { createWorkEducationActions } from './helpers/workEducationHelpers';`,
`import { createWorkEducationActions } from './helpers/workEducationHelpers';
import { createEmploymentEducationServiceActions } from './helpers/employmentEducationServiceHelpers';`],
  ['service construction',
`  const workEducationActions = createWorkEducationActions(set, get);
  const questActions = createQuestActions(set, get);`,
`  const workEducationActions = createWorkEducationActions(set, get);
  const employmentEducationServiceActions = createEmploymentEducationServiceActions(set, get);
  const questActions = createQuestActions(set, get);`],
  ['service spread',
`    // Work and education actions (network-aware)
    ...wrapWithNetworkGuard(workEducationActions),

    // Economy actions (network-aware)`,
`    // Legacy work and education actions (network-aware for host/internal compatibility)
    ...wrapWithNetworkGuard(workEducationActions),

    // Canonical employment and education intent actions
    ...wrapWithNetworkGuard(employmentEducationServiceActions),

    // Economy actions (network-aware)`],
]);

patch('src/network/types.ts', [
  ['guest employment education allowlist',
`  'setJob',
  'workShift',
  'requestRaise',
  'negotiateRaise',
  'studySession',
  'studyDegree',
  'payFullTuition',`,
`  'setJob',
  'requestRaise',
  'negotiateRaise',

  // Semantic employment/education actions. Host resolves wage, time,
  // price, prerequisites, progress and graduation eligibility.
  'performWorkShift',
  'attendDegreeSession',
  'prepayDegree',
  'graduateDegree',`],
]);

patch('src/components/game/LocationPanel.tsx', [
  ['context service assignments',
`    workShift: store.workShift,
    studyDegree: store.studyDegree,
    payFullTuition: store.payFullTuition,
    completeDegree: store.completeDegree,`,
`    performWorkShift: store.performWorkShift,
    attendDegreeSession: store.attendDegreeSession,
    prepayDegree: store.prepayDegree,
    graduateDegree: store.graduateDegree,`],
]);

patch('src/components/game/locationTabs.tsx', [
  ['context service fields',
`  workShift: GameStore['workShift'];
  studyDegree: GameStore['studyDegree'];
  payFullTuition: GameStore['payFullTuition'];
  completeDegree: GameStore['completeDegree'];`,
`  performWorkShift: GameStore['performWorkShift'];
  attendDegreeSession: GameStore['attendDegreeSession'];
  prepayDegree: GameStore['prepayDegree'];
  graduateDegree: GameStore['graduateDegree'];`],
  ['work info destructure',
`  const { player, workShift } = ctx;`,
`  const { player, performWorkShift } = ctx;`],
  ['work info action',
`    onWork: () => {
      const worked = workShift(player.id, currentJobData.hoursPerShift, player.currentWage);
      if (worked) {
        toast.success(\`Worked a shift at \${currentJobData.name}!\`);
      } else {
        toast.error('Unable to work — not enough time or improper attire.');
      }
    },`,
`    onWork: () => {
      const result = performWorkShift(player.id, 'full');
      if (!result) return;
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    },`],
  ['academy destructure',
`  const { player, priceModifier, studyDegree, payFullTuition, completeDegree, readBook } = ctx;`,
`  const { player, priceModifier, attendDegreeSession, prepayDegree, graduateDegree, readBook } = ctx;`],
  ['academy props',
`          studyDegree={studyDegree}
          payFullTuition={payFullTuition}
          completeDegree={completeDegree}`,
`          attendDegreeSession={attendDegreeSession}
          prepayDegree={prepayDegree}
          graduateDegree={graduateDegree}`],
]);

patch('src/components/game/WorkSection.tsx', [
  ['work prop type',
`  workShift: (playerId: string, hours: number, wage: number) => boolean;`,
`  performWorkShift: (playerId: string, mode: 'full' | 'remaining') => { success: boolean; message: string } | void;`],
  ['work component signature',
`export function WorkSection({ player, locationName, workShift, variant }: WorkSectionProps) {`,
`export function WorkSection({ player, locationName, performWorkShift, variant }: WorkSectionProps) {`],
  ['add work handler',
`  const partialEarnings = Math.floor(partialHours * player.currentWage * 1.15);

  if (variant === 'jones') {`,
`  const partialEarnings = Math.floor(partialHours * player.currentWage * 1.15);

  const handleWork = (mode: 'full' | 'remaining') => {
    const result = performWorkShift(player.id, mode);
    if (!result) return;
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  if (variant === 'jones') {`],
  ['jones full work click',
`          onClick={() => {
            const worked = workShift(player.id, jobData.hoursPerShift, player.currentWage);
            if (worked) {
              toast.success(\`Worked a shift at \${jobData.name}!\`);
            } else {
              toast.error('Unable to work — not enough time or improper attire.');
            }
          }}`,
`          onClick={() => handleWork('full')}`],
  ['jones partial work click',
`            onClick={() => {
              const worked = workShift(player.id, partialHours, player.currentWage);
              if (worked) {
                toast.success(\`Worked a short \${partialHours}h shift!\`);
              } else {
                toast.error('Unable to work.');
              }
            }}`,
`            onClick={() => handleWork('remaining')}`],
  ['wood full work click',
`        onClick={() => {
          const worked = workShift(player.id, jobData.hoursPerShift, player.currentWage);
          if (worked) {
            toast.success(\`Worked a shift at \${jobData.name}!\`);
          } else {
            toast.error('Unable to work — not enough time or improper attire.');
          }
        }}`,
`        onClick={() => handleWork('full')}`],
  ['wood partial work click',
`          onClick={() => {
            const worked = workShift(player.id, partialHours, player.currentWage);
            if (worked) {
              toast.success(\`Worked a short \${partialHours}h shift!\`);
            } else {
              toast.error('Unable to work.');
            }
          }}`,
`          onClick={() => handleWork('remaining')}`],
]);

patch('src/components/game/AcademyPanel.tsx', [
  ['academy prop types',
`  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
  payFullTuition: (playerId: string, degreeId: DegreeId, totalCost: number, sessions: number) => void;
  completeDegree: (playerId: string, degreeId: DegreeId) => void;`,
`  attendDegreeSession: (playerId: string, degreeId: DegreeId, mode: 'standard' | 'cram') => { success: boolean; message: string } | void;
  prepayDegree: (playerId: string, degreeId: DegreeId) => { success: boolean; message: string } | void;
  graduateDegree: (playerId: string, degreeId: DegreeId) => { success: boolean; message: string } | void;`],
  ['academy destructure props',
`  studyDegree,
  payFullTuition,
  completeDegree,`,
`  attendDegreeSession,
  prepayDegree,
  graduateDegree,`],
  ['graduate click',
`                    onClick={() => completeDegree(player.id, degId)}`,
`                    onClick={() => {
                      const result = graduateDegree(player.id, degId);
                      if (!result) return;
                      if (result.success) toast.success(result.message);
                      else toast.error(result.message);
                    }}`],
  ['standard class click',
`                       onClick={() => {
                         studyDegree(player.id, degId, price, degree.hoursPerSession);
                         toast.success(t('panelAcademy.attendedClass', { name: t(\`degrees.\${degree.id}.name\`) }));
                       }}`,
`                       onClick={() => {
                         const result = attendDegreeSession(player.id, degId, 'standard');
                         if (!result) return;
                         if (result.success) toast.success(result.message);
                         else toast.error(result.message);
                       }}`],
  ['cram class click',
`                         onClick={() => {
                           studyDegree(player.id, degId, price, player.timeRemaining);
                           toast.success(\`Crammed in \${player.timeRemaining}h of studying!\`);
                         }}`,
`                         onClick={() => {
                           const result = attendDegreeSession(player.id, degId, 'cram');
                           if (!result) return;
                           if (result.success) toast.success(result.message);
                           else toast.error(result.message);
                         }}`],
  ['prepay click',
`                         onClick={() => {
                           payFullTuition(player.id, degId, fullCourseCost, sessionsLeft);
                           toast.success(\`Enrolled! Attend the remaining \${sessionsLeft} sessions for free.\`);
                         }}`,
`                         onClick={() => {
                           const result = prepayDegree(player.id, degId);
                           if (!result) return;
                           if (result.success) toast.success(result.message);
                           else toast.error(result.message);
                         }}`],
]);
