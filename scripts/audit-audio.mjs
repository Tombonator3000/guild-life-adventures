import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const AUDIO_ROOTS = ['public/sfx', 'public/ambient', 'public/music'];
const SILENCE_THRESHOLD_DB = -70;

function walk(directory) {
  const absolute = resolve(ROOT, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) return walk(relative(ROOT, path));
    return extname(entry.name).toLowerCase() === '.mp3' ? [path] : [];
  });
}

function command(name, args) {
  const result = spawnSync(name, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

function parseVolume(value) {
  if (!value || value === '-inf') return Number.NEGATIVE_INFINITY;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NEGATIVE_INFINITY;
}

function inspect(file) {
  const relativePath = relative(ROOT, file).replaceAll('\\', '/');
  const bytes = statSync(file).size;
  const sha256 = createHash('sha256').update(readFileSync(file)).digest('hex');

  const probe = command('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const durationSeconds = Number.parseFloat(probe.stdout.trim());

  const volume = command('ffmpeg', [
    '-nostdin', '-hide_banner', '-i', file,
    '-af', 'volumedetect', '-f', 'null', '-',
  ]);
  const output = `${volume.stdout}\n${volume.stderr}`;
  const meanVolumeDb = parseVolume(output.match(/mean_volume:\s*(-?\d+(?:\.\d+)?|-inf)\s*dB/)?.[1]);
  const maxVolumeDb = parseVolume(output.match(/max_volume:\s*(-?\d+(?:\.\d+)?|-inf)\s*dB/)?.[1]);

  const invalid = probe.status !== 0 || volume.status !== 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0;
  const silent = !invalid && (!Number.isFinite(maxVolumeDb) || maxVolumeDb <= SILENCE_THRESHOLD_DB);

  return {
    path: relativePath,
    category: relativePath.split('/')[1],
    bytes,
    sha256,
    durationSeconds: Number.isFinite(durationSeconds) ? Number(durationSeconds.toFixed(3)) : null,
    meanVolumeDb: Number.isFinite(meanVolumeDb) ? meanVolumeDb : null,
    maxVolumeDb: Number.isFinite(maxVolumeDb) ? maxVolumeDb : null,
    invalid,
    silent,
  };
}

function findDuplicates(files) {
  const groups = new Map();
  for (const file of files) {
    const paths = groups.get(file.sha256) ?? [];
    paths.push(file.path);
    groups.set(file.sha256, paths);
  }
  return [...groups.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths }));
}

function markdown(report) {
  const lines = [
    '# Audio Asset Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `- Files: ${report.summary.files}`,
    `- Silent: ${report.summary.silent}`,
    `- Invalid: ${report.summary.invalid}`,
    `- Duplicate groups: ${report.summary.duplicateGroups}`,
    `- Silence threshold: ${report.silenceThresholdDb} dB max volume`,
    '',
    '| File | Duration | Mean dB | Max dB | Status |',
    '|---|---:|---:|---:|---|',
  ];

  for (const file of report.files) {
    const status = file.invalid ? 'INVALID' : file.silent ? 'SILENT' : 'audible';
    lines.push(`| \`${file.path}\` | ${file.durationSeconds ?? 'n/a'}s | ${file.meanVolumeDb ?? '-inf'} | ${file.maxVolumeDb ?? '-inf'} | ${status} |`);
  }

  lines.push('', '## Exact duplicate groups', '');
  if (report.duplicates.length === 0) lines.push('None.');
  for (const duplicate of report.duplicates) {
    lines.push(`- ${duplicate.paths.map(path => `\`${path}\``).join(', ')}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const files = AUDIO_ROOTS.flatMap(walk).sort().map(inspect);
const duplicates = findDuplicates(files);
const report = {
  generatedAt: new Date().toISOString(),
  silenceThresholdDb: SILENCE_THRESHOLD_DB,
  summary: {
    files: files.length,
    silent: files.filter(file => file.silent).length,
    invalid: files.filter(file => file.invalid).length,
    duplicateGroups: duplicates.length,
  },
  duplicates,
  files,
};

const jsonPath = args.get('--json') ?? 'audio-audit.json';
const markdownPath = args.get('--markdown') ?? 'audio-audit.md';
for (const path of [jsonPath, markdownPath]) mkdirSync(dirname(resolve(ROOT, path)), { recursive: true });
writeFileSync(resolve(ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(resolve(ROOT, markdownPath), markdown(report));

console.log(markdown(report));

if (process.argv.includes('--fail-on-silent') && (report.summary.silent > 0 || report.summary.invalid > 0)) {
  process.exitCode = 1;
}
