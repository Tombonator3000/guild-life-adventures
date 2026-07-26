# Phase 16Y – Audio Integrity Audit

Date: 26 July 2026

## Scope

This is point 5 of `Phase 16Y – Truth, Onboarding & Release Safety` and implements issue #392.

The goal was not to create a new sound library. It was to determine which existing files were real, stop shipping invalid placeholders, make fallback behavior intentional, and prevent the same problem from returning.

## Measurement method

A repository script now scans every MP3 under:

- `public/music`
- `public/ambient`
- `public/sfx`

For each file it records:

- byte size,
- SHA-256,
- duration from FFprobe,
- mean and maximum volume from FFmpeg `volumedetect`,
- decode validity,
- silence status,
- exact duplicate groups.

A file is classified as silent when its maximum measured volume is at or below `-70 dB`. Invalid decoding, non-positive duration, silence or exact duplication fails the permanent CI audio gate.

## Initial result

The measured pre-cleanup inventory contained 64 MP3 files:

- 12 music tracks,
- 16 ambient tracks,
- 36 SFX files.

Results:

- 12/12 music files were valid and audible.
- 11/16 ambient files were valid and audible.
- 19/36 SFX files were valid and audible.
- 21 files shared the same exact 3,962-byte invalid payload.
- `study.mp3` was an exact copy of the valid `menu-close.mp3` despite representing a different event.
- Configuration referenced 16 nonexistent music variants.
- Configuration referenced nonexistent `curse-cast.mp3`, although a procedural implementation already existed.

## Invalid shared payload removed

### Ambient

- `academy-ambient.mp3`
- `enchanter-ambient.mp3`
- `fence-ambient.mp3`
- `market-ambient.mp3`
- `noble-ambient.mp3`

### SFX

- `button-hover.mp3`
- `coin-gain.mp3`
- `coin-spend.mp3`
- `damage-taken.mp3`
- `defeat.mp3`
- `door-open.mp3`
- `festival.mp3`
- `footstep.mp3`
- `gold-button-click.mp3`
- `heal.mp3`
- `item-equip.mp3`
- `quest-accept.mp3`
- `success.mp3`
- `sword-hit.mp3`
- `turn-start.mp3`
- `work-complete.mp3`

`study.mp3` was also removed as a semantic duplicate of `menu-close.mp3`.

## Runtime changes

### SFX

`SFX_LIBRARY` now declares each effect as either:

- `source: 'file'` for a verified packaged MP3 with synth fallback, or
- `source: 'synth'` for an intentional procedural primary source.

Synth-first effects no longer request a missing or invalid URL before playing. This removes avoidable browser errors and makes the actual player experience explicit.

### Ambient

Only the eleven verified loops remain in `AMBIENT_TRACKS`. Noble Heights, General Store, Academy, Enchanter and Fence intentionally use `street-ambient` until dedicated verified files are provided.

### Music

All twelve primary tracks remain. Nonexistent `_v2` and `_v3` variants were removed from configuration. Variant support remains available for future files that are actually packaged and audited.

## Permanent protection

### CI signal audit

`Agent validation` now installs FFmpeg and runs:

```bash
node scripts/audit-audio.mjs --fail-on-silent --fail-on-duplicates
```

The JSON and Markdown reports are uploaded as an Actions artifact on every validation run.

### Unit policy tests

`src/audio/audioAssets.test.ts` verifies that:

- every file-backed SFX exists,
- every synth-backed SFX has a procedural implementation,
- every configured ambient and music file exists,
- location mappings reference real ambient tracks,
- all measured placeholders remain deleted,
- packaged MP3s have unique hashes,
- the permanent FFmpeg gate remains enabled.

## Provenance finding

The repository does not record source or asset-specific licensing for the remaining packaged MP3 files. The audit therefore marks provenance as unknown rather than inventing attribution. `docs/AUDIO_INVENTORY.md` documents the follow-up information required before separate redistribution or platform submission that requires explicit media provenance.

## Non-goals

- No new third-party sound assets were downloaded.
- No generated replacement MP3s were introduced.
- No music composition, volume rebalance or audio UI redesign.
- No gameplay, save or multiplayer changes.

## Acceptance criteria

- [x] Every packaged MP3 measured.
- [x] Invalid shared placeholders removed.
- [x] Semantic duplicate removed.
- [x] Missing variant references removed.
- [x] Missing-file SFX converted to intentional synth-primary effects.
- [x] Ambient gaps use an explicit verified fallback.
- [x] Inventory and provenance status documented.
- [x] Permanent automated signal and duplicate gate added.
- [x] Final TypeScript, Vitest, build, lint, audio audit and Playwright validation green.
