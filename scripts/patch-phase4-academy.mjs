import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/game/AcademyPanel.tsx';
let source = readFileSync(path, 'utf8');

function replaceOnce(label, search, replacement) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Academy fallback target not found: ${label}`);
  source = next;
}

replaceOnce(
  'prop types',
  `  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
  payFullTuition: (playerId: string, degreeId: DegreeId, totalCost: number, sessions: number) => void;
  completeDegree: (playerId: string, degreeId: DegreeId) => void;`,
  `  attendDegreeSession: (playerId: string, degreeId: DegreeId, mode: 'standard' | 'cram') => { success: boolean; message: string } | void;
  prepayDegree: (playerId: string, degreeId: DegreeId) => { success: boolean; message: string } | void;
  graduateDegree: (playerId: string, degreeId: DegreeId) => { success: boolean; message: string } | void;`,
);

replaceOnce(
  'destructured props',
  `  studyDegree,
  payFullTuition,
  completeDegree,`,
  `  attendDegreeSession,
  prepayDegree,
  graduateDegree,`,
);

replaceOnce(
  'graduate action',
  `onClick={() => completeDegree(player.id, degId)}`,
  `onClick={() => {
                      const result = graduateDegree(player.id, degId);
                      if (!result) return;
                      if (result.success) toast.success(result.message);
                      else toast.error(result.message);
                    }}`,
);

replaceOnce(
  'standard class action',
  `studyDegree(player.id, degId, price, degree.hoursPerSession);
                         toast.success(t('panelAcademy.attendedClass', { name: t(\`degrees.\${degree.id}.name\`) }));`,
  `const result = attendDegreeSession(player.id, degId, 'standard');
                         if (!result) return;
                         if (result.success) toast.success(result.message);
                         else toast.error(result.message);`,
);

replaceOnce(
  'cram class action',
  `studyDegree(player.id, degId, price, player.timeRemaining);
                           toast.success(\`Crammed in \${player.timeRemaining}h of studying!\`);`,
  `const result = attendDegreeSession(player.id, degId, 'cram');
                           if (!result) return;
                           if (result.success) toast.success(result.message);
                           else toast.error(result.message);`,
);

replaceOnce(
  'prepay action',
  `payFullTuition(player.id, degId, fullCourseCost, sessionsLeft);
                           toast.success(\`Enrolled! Attend the remaining \${sessionsLeft} sessions for free.\`);`,
  `const result = prepayDegree(player.id, degId);
                           if (!result) return;
                           if (result.success) toast.success(result.message);
                           else toast.error(result.message);`,
);

writeFileSync(path, source);
console.log(`Patched ${path} with Academy fallback`);
