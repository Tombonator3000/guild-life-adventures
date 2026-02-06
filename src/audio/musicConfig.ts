// Music configuration — maps game contexts to MP3 tracks in /public/music/
import type { LocationId } from '@/types/game.types';

export interface MusicTrack {
  id: string;
  file: string;       // Path relative to /music/
  label: string;       // Display name
}

// All available music tracks
export const MUSIC_TRACKS: Record<string, MusicTrack> = {
  'main-theme':       { id: 'main-theme',       file: '01MainTheme.mp3',          label: 'Main Theme' },
  'on-the-street':    { id: 'on-the-street',    file: '02OnTheStreet.mp3',        label: 'On the Street' },
  'guild-hall':       { id: 'guild-hall',       file: '03guildhall.mp3',          label: 'Guild Hall' },
  'bank':             { id: 'bank',             file: '06Bank.mp3',               label: 'The Bank' },
  'the-slums':        { id: 'the-slums',        file: '09TheSlums.mp3',           label: 'The Slums' },
  'enchanter':        { id: 'enchanter',        file: '11EnchantersWorkshop.mp3', label: "Enchanter's Workshop" },
  'rusty-tankard':    { id: 'rusty-tankard',    file: '13rustytankard.mp3',       label: 'The Rusty Tankard' },
  'weekend':          { id: 'weekend',          file: '18OhWhatAWeekend.mp3',     label: 'Oh What a Weekend' },
};

// Screen-level music (menus, setup, victory)
export const SCREEN_MUSIC: Record<string, string> = {
  title:   'main-theme',
  setup:   'main-theme',
  victory: 'weekend',
};

// Location → track mapping.  Locations without a specific track use 'on-the-street'.
export const LOCATION_MUSIC: Partial<Record<LocationId, string>> = {
  'guild-hall':       'guild-hall',
  'bank':             'bank',
  'slums':            'the-slums',
  'enchanter':        'enchanter',
  'rusty-tankard':    'rusty-tankard',
};

// Default track when a player is on the game board but no location-specific track
export const DEFAULT_GAME_TRACK = 'on-the-street';

// Crossfade duration in milliseconds
export const CROSSFADE_MS = 1500;

// Default music volume (0-1). User requested 50% baseline.
export const DEFAULT_MUSIC_VOLUME = 0.5;
