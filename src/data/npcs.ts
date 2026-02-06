// NPC data for each location
// Each location has a shopkeeper/NPC with a portrait, name, title, and greeting
// Used by LocationShell to display Jones-style NPC portraits

import type { LocationId } from '@/types/game.types';

export interface LocationNPC {
  name: string;
  title: string;
  portrait: string; // Emoji character for fallback portrait
  portraitImage?: string; // Path to JPG/PNG portrait image (relative to public/)
  greeting: string;
  bgColor: string; // Background color for portrait frame
  accentColor: string; // Accent/border color
}

export const LOCATION_NPCS: Partial<Record<LocationId, LocationNPC>> = {
  'guild-hall': {
    name: 'Aldric',
    title: 'Guild Master',
    portrait: '🧙‍♂️',
    portraitImage: '/npcs/aldric.jpg',
    greeting: 'Welcome, adventurer.',
    bgColor: '#2a3a2a',
    accentColor: '#c9a227',
  },
  'bank': {
    name: 'Mathilda',
    title: 'Head Banker',
    portrait: '👩‍💼',
    portraitImage: '/npcs/mathilda.jpg',
    greeting: 'Your gold is safe here.',
    bgColor: '#2a2a3a',
    accentColor: '#4a9cff',
  },
  'general-store': {
    name: 'Brynn',
    title: 'Shopkeeper',
    portrait: '👨‍🌾',
    portraitImage: '/npcs/brynn.jpg',
    greeting: 'Fresh goods today!',
    bgColor: '#3a2a1a',
    accentColor: '#8bc34a',
  },
  'armory': {
    name: 'Gunther',
    title: 'Master Armorer',
    portrait: '🦸‍♂️',
    portraitImage: '/npcs/gunther.jpg',
    greeting: 'Steel or leather?',
    bgColor: '#3a2a2a',
    accentColor: '#e57373',
  },
  'enchanter': {
    name: 'Lyra',
    title: 'Enchantress',
    portrait: '🧝‍♀️',
    portraitImage: '/npcs/lyra.jpg',
    greeting: 'Magic flows here.',
    bgColor: '#2a2a3a',
    accentColor: '#ba68c8',
  },
  'shadow-market': {
    name: 'Shade',
    title: 'Black Marketeer',
    portrait: '🦊',
    portraitImage: '/npcs/shade.jpg',
    greeting: 'Psst... good deals.',
    bgColor: '#1a1a2a',
    accentColor: '#78909c',
  },
  'academy': {
    name: 'Elara',
    title: 'Dean of Studies',
    portrait: '👩‍🏫',
    portraitImage: '/npcs/elara.jpg',
    greeting: 'Knowledge awaits.',
    bgColor: '#2a2a3a',
    accentColor: '#64b5f6',
  },
  'rusty-tankard': {
    name: 'Magnus',
    title: 'Barkeep',
    portrait: '🧔',
    portraitImage: '/npcs/magnus.jpg',
    greeting: 'What\'ll it be?',
    bgColor: '#3a2a1a',
    accentColor: '#ffb74d',
  },
  'cave': {
    name: 'The Cave',
    title: 'Dark Entrance',
    portrait: '🗿',
    portraitImage: '/npcs/cave.jpg',
    greeting: 'Danger lurks within...',
    bgColor: '#1a1a1a',
    accentColor: '#616161',
  },
  'forge': {
    name: 'Korr',
    title: 'Smithmaster',
    portrait: '🧑‍🔧',
    portraitImage: '/npcs/korr.jpg',
    greeting: 'Hard work pays off.',
    bgColor: '#3a2010',
    accentColor: '#ff7043',
  },
  'landlord': {
    name: 'Tomas',
    title: 'Landlord',
    portrait: '🤵',
    portraitImage: '/npcs/tomas.jpg',
    greeting: 'Rent is due.',
    bgColor: '#2a2a2a',
    accentColor: '#a1887f',
  },
  'fence': {
    name: 'Whiskers',
    title: 'Fence & Dealer',
    portrait: '🎭',
    portraitImage: '/npcs/whiskers.jpg',
    greeting: 'Buy, sell, or gamble?',
    bgColor: '#1a1a2a',
    accentColor: '#9575cd',
  },
};
