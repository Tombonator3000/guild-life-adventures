// Ambient sound configuration — maps locations to environmental audio loops.
// Ambient sounds play underneath music at lower volume for atmosphere.
import type { LocationId } from '@/types/game.types';

export interface AmbientTrack {
  id: string;
  file: string;        // Path relative to /ambient/
  label: string;
  baseVolume: number;  // 0-1, relative volume for this track (before user volume)
}

// All available ambient tracks
export const AMBIENT_TRACKS: Record<string, AmbientTrack> = {
  'noble-ambient':     { id: 'noble-ambient',     file: 'noble-ambient.mp3',     label: 'Noble Gardens',       baseVolume: 0.3 },
  'market-ambient':    { id: 'market-ambient',    file: 'market-ambient.mp3',    label: 'Market Bustle',       baseVolume: 0.25 },
  'bank-ambient':      { id: 'bank-ambient',      file: 'bank-ambient.mp3',      label: 'Bank Interior',       baseVolume: 0.2 },
  'forge-ambient':     { id: 'forge-ambient',     file: 'forge-ambient.mp3',     label: 'Forge Workshop',      baseVolume: 0.3 },
  'guild-ambient':     { id: 'guild-ambient',     file: 'guild-ambient.mp3',     label: 'Adventurer Crowd',    baseVolume: 0.25 },
  'cave-ambient':      { id: 'cave-ambient',      file: 'cave-ambient.mp3',      label: 'Cave Depths',         baseVolume: 0.35 },
  'academy-ambient':   { id: 'academy-ambient',   file: 'academy-ambient.mp3',   label: 'Quiet Study',         baseVolume: 0.2 },
  'enchanter-ambient': { id: 'enchanter-ambient', file: 'enchanter-ambient.mp3', label: 'Arcane Workshop',     baseVolume: 0.25 },
  'armory-ambient':    { id: 'armory-ambient',    file: 'armory-ambient.mp3',    label: 'Armory Clatter',      baseVolume: 0.25 },
  'tavern-ambient':    { id: 'tavern-ambient',    file: 'tavern-ambient.mp3',    label: 'Tavern Crowd',        baseVolume: 0.3 },
  'shadow-ambient':    { id: 'shadow-ambient',    file: 'shadow-ambient.mp3',    label: 'Dark Alley',          baseVolume: 0.2 },
  'fence-ambient':     { id: 'fence-ambient',     file: 'fence-ambient.mp3',     label: 'Pawn Shop',           baseVolume: 0.2 },
  'slums-ambient':     { id: 'slums-ambient',     file: 'slums-ambient.mp3',     label: 'Slum Streets',        baseVolume: 0.25 },
  'landlord-ambient':  { id: 'landlord-ambient',  file: 'landlord-ambient.mp3',  label: 'Rent Office',         baseVolume: 0.2 },
  'street-ambient':    { id: 'street-ambient',    file: 'street-ambient.mp3',    label: 'Town Streets',        baseVolume: 0.2 },
  'graveyard-ambient': { id: 'graveyard-ambient', file: 'graveyard-ambient.mp3', label: 'Graveyard',           baseVolume: 0.2 },
};

// Location → ambient track mapping
export const LOCATION_AMBIENT: Partial<Record<LocationId, string>> = {
  'noble-heights':    'noble-ambient',
  'general-store':    'market-ambient',
  'bank':             'bank-ambient',
  'forge':            'forge-ambient',
  'guild-hall':       'guild-ambient',
  'cave':             'cave-ambient',
  'academy':          'academy-ambient',
  'enchanter':        'enchanter-ambient',
  'armory':           'armory-ambient',
  'rusty-tankard':    'tavern-ambient',
  'shadow-market':    'shadow-ambient',
  'fence':            'fence-ambient',
  'slums':            'slums-ambient',
  'landlord':         'landlord-ambient',
  'graveyard':        'graveyard-ambient',
};

// Default ambient when walking between locations (no specific location selected)
export const DEFAULT_AMBIENT = 'street-ambient';

// Crossfade duration for ambient transitions (faster than music)
export const AMBIENT_CROSSFADE_MS = 800;

// Default ambient volume
export const DEFAULT_AMBIENT_VOLUME = 0.4;
