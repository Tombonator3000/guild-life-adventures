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
  // Frame colors for standardized location design (header/footer bars)
  frameColor: string; // Primary frame gradient start
  frameDark: string; // Frame gradient end (darker)
  frameBorder: string; // Border between frame and content
  subtitle: string; // Location subtitle shown in header bar
}

export const LOCATION_NPCS: Partial<Record<LocationId, LocationNPC>> = {
  'guild-hall': {
    name: 'Aldric',
    title: 'Guild Master',
    portrait: '🧙‍♂️',
    portraitImage: 'npcs/aldric.jpg',
    greeting: 'Welcome, adventurer.',
    bgColor: '#2a3a2a',
    accentColor: '#c9a227',
    frameColor: '#2a5c3a',
    frameDark: '#1e4a2e',
    frameBorder: '#4a8a5a',
    subtitle: "Adventurer's Guild",
  },
  'bank': {
    name: 'Mathilda',
    title: 'Head Banker',
    portrait: '👩‍💼',
    portraitImage: 'npcs/mathilda.jpg',
    greeting: 'Your gold is safe here.',
    bgColor: '#2a2a3a',
    accentColor: '#4a9cff',
    frameColor: '#2a3a5c',
    frameDark: '#1e2e4a',
    frameBorder: '#4a6a9a',
    subtitle: 'Financial Services',
  },
  'general-store': {
    name: 'Brynn',
    title: 'Shopkeeper',
    portrait: '👨‍🌾',
    portraitImage: 'npcs/brynn.jpg',
    greeting: 'Fresh goods today!',
    bgColor: '#3a2a1a',
    accentColor: '#8bc34a',
    frameColor: '#3a4a2a',
    frameDark: '#2e3e1e',
    frameBorder: '#5a7a3a',
    subtitle: 'Provisions & Sundries',
  },
  'armory': {
    name: 'Gunther',
    title: 'Master Armorer',
    portrait: '🦸‍♂️',
    portraitImage: 'npcs/gunther.jpg',
    greeting: 'Steel or leather?',
    bgColor: '#3a2a2a',
    accentColor: '#e57373',
    frameColor: '#5c2a2a',
    frameDark: '#4a1e1e',
    frameBorder: '#8a4a4a',
    subtitle: 'Arms & Armor',
  },
  'enchanter': {
    name: 'Lyra',
    title: 'Enchantress',
    portrait: '🧝‍♀️',
    portraitImage: 'npcs/lyra.jpg',
    greeting: 'Magic flows here.',
    bgColor: '#2a2a3a',
    accentColor: '#ba68c8',
    frameColor: '#4a2a5c',
    frameDark: '#3a1e4a',
    frameBorder: '#7a4a8a',
    subtitle: "Enchanter's Workshop",
  },
  'shadow-market': {
    name: 'Shade',
    title: 'Black Marketeer',
    portrait: '🦊',
    portraitImage: 'npcs/shade.jpg',
    greeting: 'Psst... good deals.',
    bgColor: '#1a1a2a',
    accentColor: '#78909c',
    frameColor: '#3a3a42',
    frameDark: '#2a2a32',
    frameBorder: '#5a5a6a',
    subtitle: 'Black Market Goods',
  },
  'academy': {
    name: 'Elara',
    title: 'Dean of Studies',
    portrait: '👩‍🏫',
    portraitImage: 'npcs/elara.jpg',
    greeting: 'Knowledge awaits.',
    bgColor: '#2a2a3a',
    accentColor: '#64b5f6',
    frameColor: '#2a3a5c',
    frameDark: '#1e2e4a',
    frameBorder: '#4a6a9a',
    subtitle: 'Higher Education',
  },
  'rusty-tankard': {
    name: 'Magnus',
    title: 'Barkeep',
    portrait: '🧔',
    portraitImage: 'npcs/magnus.jpg',
    greeting: 'What\'ll it be?',
    bgColor: '#3a2a1a',
    accentColor: '#ffb74d',
    frameColor: '#5c3a1a',
    frameDark: '#4a2e12',
    frameBorder: '#8a6a3a',
    subtitle: 'Tavern & Eatery',
  },
  'cave': {
    name: 'The Cave',
    title: 'Dark Entrance',
    portrait: '🗿',
    portraitImage: 'npcs/cave.jpg',
    greeting: 'Danger lurks within...',
    bgColor: '#1a1a1a',
    accentColor: '#616161',
    frameColor: '#2a2a2a',
    frameDark: '#1a1a1a',
    frameBorder: '#4a4a4a',
    subtitle: 'Dark Caverns',
  },
  'forge': {
    name: 'Korr',
    title: 'Smithmaster',
    portrait: '🧑‍🔧',
    portraitImage: 'npcs/korr.jpg',
    greeting: 'Hard work pays off.',
    bgColor: '#3a2010',
    accentColor: '#ff7043',
    frameColor: '#5c3010',
    frameDark: '#4a2408',
    frameBorder: '#8a5020',
    subtitle: 'Smithy & Repairs',
  },
  'landlord': {
    name: 'Tomas',
    title: 'Landlord',
    portrait: '🤵',
    portraitImage: 'npcs/tomas.jpg',
    greeting: 'Rent is due.',
    bgColor: '#2a2a2a',
    accentColor: '#a1887f',
    frameColor: '#3a3532',
    frameDark: '#2e2a28',
    frameBorder: '#5a5550',
    subtitle: 'Housing Office',
  },
  'fence': {
    name: 'Whiskers',
    title: 'Fence & Dealer',
    portrait: '🎭',
    portraitImage: 'npcs/whiskers.jpg',
    greeting: 'Buy, sell, or gamble?',
    bgColor: '#1a1a2a',
    accentColor: '#9575cd',
    frameColor: '#3a2a42',
    frameDark: '#2e1e36',
    frameBorder: '#5a4a6a',
    subtitle: 'Pawn Shop & Dealer',
  },
};
