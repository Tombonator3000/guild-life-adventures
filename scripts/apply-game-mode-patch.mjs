import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/screens/GameSetup.tsx';
let source = readFileSync(path, 'utf8');

function replaceOnce(search, replacement, label) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Patch target not found: ${label}`);
  source = next;
}

replaceOnce(
`  const presets = {
    quick: { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 },     // 2 degrees
    standard: { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 }, // 5 degrees
    epic: { wealth: 10000, happiness: 100, education: 90, career: 100, adventure: 0 },   // 10 degrees
  };`,
`  const presets = {
    quick: { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: 0 },
    standard: { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: 0 },
    adventure: { wealth: 4000, happiness: 80, education: 27, career: 65, adventure: 12 },
    epic: { wealth: 10000, happiness: 100, education: 90, career: 100, adventure: 20 },
  };`,
  'game mode presets',
);

replaceOnce(
  '<div className="flex gap-2 mb-3">',
  '<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">',
  'preset button layout',
);

replaceOnce(
  'onClick={() => setGoals({ ...presets.quick, adventure: goals.adventure })}',
  'onClick={() => setGoals(presets.quick)}',
  'quick mode action',
);
replaceOnce(
  'onClick={() => setGoals({ ...presets.standard, adventure: goals.adventure })}',
  'onClick={() => setGoals(presets.standard)}',
  'standard mode action',
);
replaceOnce(
  'onClick={() => setGoals({ ...presets.epic, adventure: goals.adventure })}',
  'onClick={() => setGoals(presets.epic)}',
  'epic mode action',
);

replaceOnce(
`              <button
                onClick={() => setGoals(presets.epic)}
                className="flex-1 p-2 wood-frame text-parchment text-sm font-display hover:brightness-110"
              >
                Epic Quest
              </button>`,
`              <button
                onClick={() => setGoals(presets.adventure)}
                className="p-2 wood-frame text-parchment text-sm font-display hover:brightness-110"
                title="Quest-focused mode with an Adventure victory target"
              >
                Adventure
              </button>
              <button
                onClick={() => setGoals(presets.epic)}
                className="p-2 wood-frame text-parchment text-sm font-display hover:brightness-110"
              >
                Epic Quest
              </button>`,
  'adventure mode button',
);

writeFileSync(path, source);
console.log(`Patched ${path}`);
