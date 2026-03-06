// Music configuration — maps game contexts to MP3 tracks in /public/music/
import type { LocationId } from '@/types/game.types';

export interface MusicTrack {
  id: string;
  file: string;       // Default/primary file (relative to /music/)
  variants?: string[]; // Additional variant files (same folder). When present, the
                       // player randomly picks from [file, ...variants] on each play.
                       // Use placeholder names until real audio is available.
  label: string;       // Display name
}

// All available music tracks
// Variants use placeholder filenames — drop real files in /public/music/ with matching names.
export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  'main-theme':       { id: 'main-theme',       file: '01MainTheme.mp3',          label: 'Main Theme' },
  'on-the-street':    { id: 'on-the-street',    file: '02OnTheStreet.mp3',
                        variants: ['02OnTheStreet_v2.mp3', '02OnTheStreet_v3.mp3'],
                        label: 'On the Street' },
  'guild-hall':       { id: 'guild-hall',       file: '03guildhall.mp3',
                        variants: ['03guildhall_v2.mp3', '03guildhall_v3.mp3'],
                        label: 'Guild Hall' },
  'bank':             { id: 'bank',             file: '06Bank.mp3',
                        variants: ['06Bank_v2.mp3'],
                        label: 'The Bank' },
  'the-slums':        { id: 'the-slums',        file: '09TheSlums.mp3',
                        variants: ['09TheSlums_v2.mp3', '09TheSlums_v3.mp3'],
                        label: 'The Slums' },
  'enchanter':        { id: 'enchanter',        file: '11EnchantersWorkshop.mp3',
                        variants: ['11EnchantersWorkshop_v2.mp3'],
                        label: "Enchanter's Workshop" },
  'rusty-tankard':    { id: 'rusty-tankard',    file: '13rustytankard.mp3',
                        variants: ['13rustytankard_v2.mp3', '13rustytankard_v3.mp3'],
                        label: 'The Rusty Tankard' },
  'weekend':          { id: 'weekend',          file: '18OhWhatAWeekend.mp3',     label: 'Oh What a Weekend' },
  'noble-heights':    { id: 'noble-heights',    file: '10Noble-Heights.mp3',
                        variants: ['10Noble-Heights_v2.mp3'],
                        label: 'Noble Heights' },
  'cave':             { id: 'cave',             file: '20Cave.mp3',
                        variants: ['20Cave_v2.mp3', '20Cave_v3.mp3'],
                        label: 'The Cave' },
  'winner':           { id: 'winner',           file: '19Winner.mp3',             label: 'Victory' },
  'dragons-lair':     { id: 'dragons-lair',     file: 'Dragons_Lair.mp3',
                        variants: ['Dragons_Lair_v2.mp3'],
                        label: "Dragon's Lair" },
};

/**
 * Pick a random file from a track's pool (default + variants).
 * Only selects a variant if the file exists — since variants are placeholders,
 * the AudioManager tries the picked file and falls back to the default on error.
 */
export function pickTrackFile(track: MusicTrack): string {
  if (!track.variants || track.variants.length === 0) return track.file;
  const pool = [track.file, ...track.variants];
  return pool[Math.floor(Math.random() * pool.length)];
}

// Screen-level music (menus, setup, victory)
export const SCREEN_MUSIC: Record<string, string> = {
  title:   'main-theme',
  setup:   'main-theme',
  victory: 'winner',
};

// Location → track mapping.  Locations without a specific track use 'on-the-street'.
export const LOCATION_MUSIC: Partial<Record<LocationId, string>> = {
  'guild-hall':       'guild-hall',
  'bank':             'bank',
  'slums':            'the-slums',
  'enchanter':        'enchanter',
  'rusty-tankard':    'rusty-tankard',
  'noble-heights':    'noble-heights',
  'cave':             'cave',
};

// Default track when a player is on the game board but no location-specific track
export const DEFAULT_GAME_TRACK = 'on-the-street';

// Crossfade duration in milliseconds
export const CROSSFADE_MS = 1500;

// Default music volume (0-1). Music tracks are loud, so 10% keeps it as subtle background.
export const DEFAULT_MUSIC_VOLUME = 0.1;
