// Ambient sound configuration — maps locations to verified environmental loops.
// Locations without a verified dedicated loop deliberately use the town-street
// fallback instead of requesting a missing or invalid placeholder MP3.
import type { LocationId } from '@/types/game.types';

export interface AmbientTrack {
  id: string;
  file: string;        // Path relative to /ambient/
  label: string;
  baseVolume: number;  // 0-1, relative volume for this track (before user volume)
}

/** Packaged ambient tracks that passed the measurable FFmpeg audit. */
export const AMBIENT_TRACKS: Record<string, AmbientTrack> = {
  'bank-ambient':      { id: 'bank-ambient',      file: 'bank-ambient.mp3',      label: 'Bank Interior',    baseVolume: 0.3 },
  'forge-ambient':     { id: 'forge-ambient',     file: 'forge-ambient.mp3',     label: 'Forge Workshop',   baseVolume: 0.3 },
  'guild-ambient':     { id: 'guild-ambient',     file: 'guild-ambient.mp3',     label: 'Adventurer Crowd', baseVolume: 0.25 },
  'cave-ambient':      { id: 'cave-ambient',      file: 'cave-ambient.mp3',      label: 'Cave Depths',      baseVolume: 0.35 },
  'armory-ambient':    { id: 'armory-ambient',    file: 'armory-ambient.mp3',    label: 'Armory Clatter',   baseVolume: 0.25 },
  'tavern-ambient':    { id: 'tavern-ambient',    file: 'tavern-ambient.mp3',    label: 'Tavern Crowd',     baseVolume: 0.3 },
  'shadow-ambient':    { id: 'shadow-ambient',    file: 'shadow-ambient.mp3',    label: 'Dark Alley',       baseVolume: 0.3 },
  'slums-ambient':     { id: 'slums-ambient',     file: 'slums-ambient.mp3',     label: 'Slum Streets',     baseVolume: 0.25 },
  'landlord-ambient':  { id: 'landlord-ambient',  file: 'landlord-ambient.mp3',  label: 'Rent Office',      baseVolume: 0.3 },
  'street-ambient':    { id: 'street-ambient',    file: 'street-ambient.mp3',    label: 'Town Streets',     baseVolume: 0.3 },
  'graveyard-ambient': { id: 'graveyard-ambient', file: 'graveyard-ambient.mp3', label: 'Graveyard',        baseVolume: 0.3 },
};

/**
 * Location → dedicated ambient track. Unlisted locations intentionally fall
 * back to DEFAULT_AMBIENT in the ambient controller.
 */
export const LOCATION_AMBIENT: Partial<Record<LocationId, string>> = {
  'bank':          'bank-ambient',
  'forge':         'forge-ambient',
  'guild-hall':    'guild-ambient',
  'cave':          'cave-ambient',
  'armory':        'armory-ambient',
  'rusty-tankard': 'tavern-ambient',
  'shadow-market': 'shadow-ambient',
  'slums':         'slums-ambient',
  'landlord':      'landlord-ambient',
  'graveyard':     'graveyard-ambient',
};

/** Locations currently using the verified town-street fallback. */
export const AMBIENT_FALLBACK_LOCATIONS: LocationId[] = [
  'noble-heights',
  'general-store',
  'academy',
  'enchanter',
  'fence',
];

export const DEFAULT_AMBIENT = 'street-ambient';
export const AMBIENT_CROSSFADE_MS = 800;
export const DEFAULT_AMBIENT_VOLUME = 0.6;
