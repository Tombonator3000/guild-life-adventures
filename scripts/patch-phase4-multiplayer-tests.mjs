import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/test/multiplayer.test.ts';
let source = readFileSync(path, 'utf8');

function replaceOnce(label, search, replacement) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Multiplayer test patch target not found: ${label}`);
  source = next;
}

replaceOnce(
  'expected work and education actions',
  `    // Work
    expect(ALLOWED_GUEST_ACTIONS.has('workShift')).toBe(true);
    // Education
    expect(ALLOWED_GUEST_ACTIONS.has('studyDegree')).toBe(true);`,
  `    // Host-authoritative work and education intent actions
    expect(ALLOWED_GUEST_ACTIONS.has('performWorkShift')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('attendDegreeSession')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('prepayDegree')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('graduateDegree')).toBe(true);
    // Numeric legacy actions remain internal and must not be guest-callable
    expect(ALLOWED_GUEST_ACTIONS.has('workShift')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('studySession')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('studyDegree')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('payFullTuition')).toBe(false);`,
);

replaceOnce(
  'cross-player action list',
  `      'prepayRent', 'moveToHousing', 'setJob', 'workShift', 'requestRaise',
      'negotiateRaise', 'studySession',
      'studyDegree', 'payFullTuition', 'depositToBank', 'withdrawFromBank',`,
  `      'prepayRent', 'moveToHousing', 'setJob', 'requestRaise',
      'negotiateRaise', 'performWorkShift', 'attendDegreeSession',
      'prepayDegree', 'graduateDegree', 'depositToBank', 'withdrawFromBank',`,
);

writeFileSync(path, source);
console.log(`Patched ${path}`);
