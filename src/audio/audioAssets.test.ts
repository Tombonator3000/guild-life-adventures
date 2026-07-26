import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AMBIENT_FALLBACK_LOCATIONS, AMBIENT_TRACKS, LOCATION_AMBIENT } from './ambientConfig';
import { MUSIC_TRACKS } from './musicConfig';
import { SFX_LIBRARY } from './sfxManager';
import { SYNTH_SOUNDS } from './synthSFX';

const root = process.cwd();

function mp3Files(directory: string): string[] {
  const absolute = resolve(root, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) return mp3Files(path);
    return extname(entry.name).toLowerCase() === '.mp3' ? [path] : [];
  });
}

const removedPlaceholders = [
  'public/ambient/academy-ambient.mp3',
  'public/ambient/enchanter-ambient.mp3',
  'public/ambient/fence-ambient.mp3',
  'public/ambient/market-ambient.mp3',
  'public/ambient/noble-ambient.mp3',
  'public/sfx/button-hover.mp3',
  'public/sfx/coin-gain.mp3',
  'public/sfx/coin-spend.mp3',
  'public/sfx/damage-taken.mp3',
  'public/sfx/defeat.mp3',
  'public/sfx/door-open.mp3',
  'public/sfx/festival.mp3',
  'public/sfx/footstep.mp3',
  'public/sfx/gold-button-click.mp3',
  'public/sfx/heal.mp3',
  'public/sfx/item-equip.mp3',
  'public/sfx/quest-accept.mp3',
  'public/sfx/success.mp3',
  'public/sfx/sword-hit.mp3',
  'public/sfx/turn-start.mp3',
  'public/sfx/work-complete.mp3',
  'public/sfx/study.mp3',
];

describe('Phase 16Y audio asset integrity', () => {
  it('uses packaged files only when they exist and intentional synth otherwise', () => {
    for (const [id, definition] of Object.entries(SFX_LIBRARY)) {
      if (definition.source === 'file') {
        expect(existsSync(resolve(root, 'public/sfx', definition.file)), `${id} file`).toBe(true);
        expect(statSync(resolve(root, 'public/sfx', definition.file)).size).toBeGreaterThan(4_000);
      } else {
        expect(SYNTH_SOUNDS[id], `${id} synth`).toBeTypeOf('function');
      }
    }
  });

  it('references only packaged ambient and music files', () => {
    for (const track of Object.values(AMBIENT_TRACKS)) {
      expect(existsSync(resolve(root, 'public/ambient', track.file)), track.id).toBe(true);
    }
    for (const [location, trackId] of Object.entries(LOCATION_AMBIENT)) {
      expect(AMBIENT_TRACKS[trackId], location).toBeDefined();
    }
    expect(AMBIENT_FALLBACK_LOCATIONS).toEqual(expect.arrayContaining([
      'noble-heights', 'general-store', 'academy', 'enchanter', 'fence',
    ]));

    for (const track of Object.values(MUSIC_TRACKS)) {
      expect(existsSync(resolve(root, 'public/music', track.file)), track.id).toBe(true);
      for (const variant of track.variants ?? []) {
        expect(existsSync(resolve(root, 'public/music', variant)), `${track.id} variant`).toBe(true);
      }
    }
  });

  it('does not retain measured invalid or duplicate placeholder files', () => {
    for (const path of removedPlaceholders) {
      expect(existsSync(resolve(root, path)), path).toBe(false);
    }
  });

  it('contains no exact duplicate packaged MP3 files', () => {
    const files = ['public/sfx', 'public/ambient', 'public/music'].flatMap(mp3Files);
    const hashes = files.map(file => createHash('sha256').update(readFileSync(file)).digest('hex'));
    expect(new Set(hashes).size).toBe(files.length);
  });

  it('keeps the permanent FFmpeg integrity gate enabled', () => {
    const workflow = readFileSync(resolve(root, '.github/workflows/agent-validate.yml'), 'utf8');
    expect(workflow).toContain('Audio asset integrity');
    expect(workflow).toContain('--fail-on-silent --fail-on-duplicates');
    expect(workflow).toContain('sudo apt-get install --yes ffmpeg');
  });
});
