import type { LocationId } from '@/types/game.types';

/**
 * 3D presentation data for the canonical Guildholm ring.
 *
 * The 2D board remains the rules authority. These positions are presentation
 * coordinates only; movement cost is still derived from BOARD_PATH/getPath.
 */
export interface Board3DLocation {
  id: LocationId;
  name: string;
  shortName: string;
  x: number;
  z: number;
  color: string;
  accent: string;
  action: string;
  actionCost: number;
  actionResult: string;
}

export const BOARD_3D_LOCATIONS: Board3DLocation[] = [
  { id: 'noble-heights', name: 'Noble Heights', shortName: 'Noble Heights', x: -10.5, z: -6.8, color: '#b9c5d1', accent: '#b45f3c', action: 'Slapp av', actionCost: 1, actionResult: '+1 lykke' },
  { id: 'graveyard', name: 'The Graveyard', shortName: 'Graveyard', x: -11.4, z: -2.2, color: '#657180', accent: '#9aa5b5', action: 'Be ved kapellet', actionCost: 1, actionResult: '+1 ro' },
  { id: 'general-store', name: 'General Store', shortName: 'General Store', x: -10.2, z: 2.5, color: '#c48a55', accent: '#70462d', action: 'Kjøp forsyninger', actionCost: 1, actionResult: 'Forsyninger klare' },
  { id: 'bank', name: 'Guildholm Bank', shortName: 'Bank', x: -10.5, z: 7.2, color: '#9da8af', accent: '#d2a946', action: 'Sjekk saldo', actionCost: 1, actionResult: 'Sikkerhet +1' },
  { id: 'forge', name: 'The Forge', shortName: 'Forge', x: -7.0, z: 9.8, color: '#a85e3d', accent: '#f0a33d', action: 'Arbeid skift', actionCost: 2, actionResult: '+35 gull' },
  { id: 'guild-hall', name: 'Guild Hall', shortName: 'Guild Hall', x: -2.6, z: 10.1, color: '#7d6a55', accent: '#d4a537', action: 'Ta arbeid', actionCost: 2, actionResult: '+45 gull' },
  { id: 'cave', name: 'The Cave', shortName: 'Cave', x: 1.4, z: 10.1, color: '#59616e', accent: '#72b3bd', action: 'Utforsk grotten', actionCost: 3, actionResult: '+30 gull · -8 helse' },
  { id: 'academy', name: 'The Academy', shortName: 'Academy', x: 5.6, z: 9.7, color: '#8797ae', accent: '#4d76ae', action: 'Studer', actionCost: 3, actionResult: '+1 utdanning' },
  { id: 'enchanter', name: "Enchanter's Workshop", shortName: 'Enchanter', x: 9.3, z: 7.3, color: '#665d91', accent: '#b16bff', action: 'Lad magien', actionCost: 2, actionResult: '+1 glød' },
  { id: 'armory', name: 'The Armory', shortName: 'Armory', x: 10.8, z: 3.6, color: '#6d757b', accent: '#d3a34a', action: 'Prøv utstyr', actionCost: 1, actionResult: 'Kampklar' },
  { id: 'rusty-tankard', name: 'The Rusty Tankard', shortName: 'Tankard', x: 10.6, z: -0.9, color: '#9a5b38', accent: '#e2a351', action: 'Skål med byen', actionCost: 1, actionResult: '+2 lykke' },
  { id: 'shadow-market', name: 'Shadow Market', shortName: 'Shadow Market', x: 9.0, z: -5.4, color: '#343f4d', accent: '#9d67b8', action: 'Se på varene', actionCost: 1, actionResult: 'Et mistenkelig tilbud' },
  { id: 'fence', name: 'The Fence', shortName: 'Fence', x: 5.0, z: -7.0, color: '#8a6a54', accent: '#c48d4b', action: 'Vurder et funn', actionCost: 1, actionResult: '+1 rykte' },
  { id: 'slums', name: 'The Slums', shortName: 'Slums', x: 0.0, z: -7.2, color: '#756150', accent: '#b47b4c', action: 'Hvil hjemme', actionCost: 1, actionResult: '+3 helse' },
  { id: 'landlord', name: "Landlord's Office", shortName: 'Landlord', x: -5.2, z: -7.0, color: '#96765a', accent: '#d4a537', action: 'Betal husleie', actionCost: 1, actionResult: 'Husly sikret' },
];

export const BOARD_3D_BY_ID = Object.fromEntries(
  BOARD_3D_LOCATIONS.map((location) => [location.id, location]),
) as Record<LocationId, Board3DLocation>;

export const BOARD_3D_PATH_IDS = BOARD_3D_LOCATIONS.map((location) => location.id);
