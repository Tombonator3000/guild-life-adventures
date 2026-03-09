/**
 * Character Portrait System
 *
 * Defines available character portraits for players and AI opponents.
 * Each portrait has a unique ID, display name, and image path.
 *
 * To replace placeholder art: drop JPG/PNG files into public/portraits/
 * matching the filename pattern (e.g., warrior.jpg, mage.jpg).
 * The system will use the image file if it exists, otherwise falls back
 * to the generated placeholder.
 */

/** Display group for the portrait picker tabs */
export type PortraitGroup = 'warriors' | 'mystics' | 'rogues' | 'folk';

export interface PortraitDefinition {
  id: string;
  name: string;
  /** Path to portrait image in public/ (relative to base URL) */
  imagePath: string;
  /** Category for filtering in the picker */
  category: 'human' | 'ai';
  /** Display group for picker tabs (human portraits only) */
  group?: PortraitGroup;
  /** Gender for name pool selection (human portraits only) */
  gender?: 'male' | 'female' | 'neutral';
  /** Placeholder colors for generated SVG when no image exists */
  placeholderColors: {
    bg: string;      // Background color
    accent: string;  // Accent/hair color
    skin: string;    // Skin tone
  };
}

export const PORTRAIT_GROUPS: { key: PortraitGroup; label: string }[] = [
  { key: 'warriors', label: '⚔️ Warriors' },
  { key: 'mystics', label: '🔮 Mystics' },
  { key: 'rogues', label: '🗡️ Rogues' },
  { key: 'folk', label: '🏠 Folk' },
];

// Human-selectable portraits (shown in player setup)
export const PLAYER_PORTRAITS: PortraitDefinition[] = [
  // ── Warriors ──
  {
    id: 'warrior',
    name: 'Warrior',
    imagePath: 'portraits/warrior.jpg',
    category: 'human',
    group: 'warriors',
    gender: 'male',
    placeholderColors: { bg: '#8B4513', accent: '#CD853F', skin: '#DEB887' },
  },
  {
    id: 'paladin',
    name: 'Paladin',
    imagePath: 'portraits/paladin.jpg',
    category: 'human',
    group: 'warriors',
    gender: 'male',
    placeholderColors: { bg: '#4169E1', accent: '#C0C0C0', skin: '#FFDAB9' },
  },
  {
    id: 'knight',
    name: 'Knight',
    imagePath: 'portraits/knight.jpg',
    category: 'human',
    group: 'warriors',
    gender: 'male',
    placeholderColors: { bg: '#4A4A4A', accent: '#C0C0C0', skin: '#DEB887' },
  },
  {
    id: 'barbarian',
    name: 'Barbarian',
    imagePath: 'portraits/barbarian.jpg',
    category: 'human',
    group: 'warriors',
    gender: 'male',
    placeholderColors: { bg: '#5C2E0E', accent: '#C0392B', skin: '#D2B48C' },
  },
  {
    id: 'gladiator',
    name: 'Gladiator',
    imagePath: 'portraits/gladiator.jpg',
    category: 'human',
    group: 'warriors',
    gender: 'male',
    placeholderColors: { bg: '#8B6914', accent: '#CD7F32', skin: '#D2B48C' },
  },
  // ── Mystics ──
  {
    id: 'mage',
    name: 'Mage',
    imagePath: 'portraits/mage.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'female',
    placeholderColors: { bg: '#4B0082', accent: '#9370DB', skin: '#F5DEB3' },
  },
  {
    id: 'cleric',
    name: 'Cleric',
    imagePath: 'portraits/cleric.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'female',
    placeholderColors: { bg: '#DAA520', accent: '#FFFACD', skin: '#FFDAB9' },
  },
  {
    id: 'druid',
    name: 'Druid',
    imagePath: 'portraits/druid.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'female',
    placeholderColors: { bg: '#1A5C2A', accent: '#66BB6A', skin: '#C8A882' },
  },
  {
    id: 'necromancer',
    name: 'Necromancer',
    imagePath: 'portraits/necromancer.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'female',
    placeholderColors: { bg: '#1A0A2E', accent: '#7B2FBE', skin: '#C4B5C0' },
  },
  {
    id: 'alchemist',
    name: 'Alchemist',
    imagePath: 'portraits/alchemist.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'male',
    placeholderColors: { bg: '#2E4A1A', accent: '#7CB342', skin: '#F5DEB3' },
  },
  {
    id: 'summoner',
    name: 'Summoner',
    imagePath: 'portraits/summoner.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'neutral',
    placeholderColors: { bg: '#0D1B3E', accent: '#4FC3F7', skin: '#B0C4DE' },
  },
  {
    id: 'warlock',
    name: 'Warlock',
    imagePath: 'portraits/warlock.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'male',
    placeholderColors: { bg: '#1A0000', accent: '#D32F2F', skin: '#C4A882' },
  },
  {
    id: 'astrologer',
    name: 'Astrologer',
    imagePath: 'portraits/astrologer.jpg',
    category: 'human',
    group: 'mystics',
    gender: 'male',
    placeholderColors: { bg: '#1A237E', accent: '#7986CB', skin: '#E8D5C4' },
  },
  // ── Rogues ──
  {
    id: 'rogue',
    name: 'Rogue',
    imagePath: 'portraits/rogue.jpg',
    category: 'human',
    group: 'rogues',
    gender: 'neutral',
    placeholderColors: { bg: '#2F4F4F', accent: '#708090', skin: '#D2B48C' },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    imagePath: 'portraits/ranger.jpg',
    category: 'human',
    group: 'rogues',
    gender: 'male',
    placeholderColors: { bg: '#228B22', accent: '#8FBC8F', skin: '#DEB887' },
  },
  {
    id: 'brigand',
    name: 'Brigand',
    imagePath: 'portraits/brigand.jpg',
    category: 'human',
    group: 'rogues',
    gender: 'male',
    placeholderColors: { bg: '#3E2723', accent: '#795548', skin: '#D2B48C' },
  },
  {
    id: 'assassin',
    name: 'Assassin',
    imagePath: 'portraits/assassin.jpg',
    category: 'human',
    group: 'rogues',
    gender: 'neutral',
    placeholderColors: { bg: '#1A1A2E', accent: '#4A4A6A', skin: '#C4B5A0' },
  },
  // ── Folk ──
  {
    id: 'bard',
    name: 'Bard',
    imagePath: 'portraits/bard.jpg',
    category: 'human',
    group: 'folk',
    gender: 'male',
    placeholderColors: { bg: '#B22222', accent: '#FF6347', skin: '#FFE4C4' },
  },
  {
    id: 'merchant',
    name: 'Merchant',
    imagePath: 'portraits/merchant.jpg',
    category: 'human',
    group: 'folk',
    gender: 'male',
    placeholderColors: { bg: '#8B6914', accent: '#FFD700', skin: '#F5DEB3' },
  },
  {
    id: 'monk',
    name: 'Monk',
    imagePath: 'portraits/monk.jpg',
    category: 'human',
    group: 'folk',
    gender: 'male',
    placeholderColors: { bg: '#8B4500', accent: '#D4A06A', skin: '#E8C49A' },
  },
  {
    id: 'farmer',
    name: 'Farmer',
    imagePath: 'portraits/farmer.jpg',
    category: 'human',
    group: 'folk',
    gender: 'male',
    placeholderColors: { bg: '#8B7D3C', accent: '#DAA520', skin: '#D2B48C' },
  },
  {
    id: 'beggar',
    name: 'Beggar',
    imagePath: 'portraits/beggar.jpg',
    category: 'human',
    group: 'folk',
    gender: 'male',
    placeholderColors: { bg: '#4A4A3A', accent: '#8B8B7A', skin: '#C8B89A' },
  },
  {
    id: 'jester',
    name: 'Jester',
    imagePath: 'portraits/jester.jpg',
    category: 'human',
    group: 'folk',
    gender: 'male',
    placeholderColors: { bg: '#7B1FA2', accent: '#FFD600', skin: '#FFE4C4' },
  },
];

// AI opponent portraits (assigned automatically)
export const AI_PORTRAITS: PortraitDefinition[] = [
  {
    id: 'ai-grimwald',
    name: 'Grimwald',
    imagePath: 'portraits/grimwald.jpg',
    category: 'ai',
    placeholderColors: { bg: '#3C3C3C', accent: '#E5E5E5', skin: '#B0B0B0' },
  },
  {
    id: 'ai-seraphina',
    name: 'Seraphina',
    imagePath: 'portraits/seraphina.jpg',
    category: 'ai',
    placeholderColors: { bg: '#5B21B6', accent: '#A78BFA', skin: '#E8D5F5' },
  },
  {
    id: 'ai-thornwick',
    name: 'Thornwick',
    imagePath: 'portraits/thornwick.jpg',
    category: 'ai',
    placeholderColors: { bg: '#0D6B5E', accent: '#14B8A6', skin: '#A7D8D0' },
  },
  {
    id: 'ai-morgath',
    name: 'Morgath',
    imagePath: 'portraits/morgath.jpg',
    category: 'ai',
    placeholderColors: { bg: '#9F1239', accent: '#F43F5E', skin: '#FECDD3' },
  },
];

/** All portraits combined */
export const ALL_PORTRAITS = [...PLAYER_PORTRAITS, ...AI_PORTRAITS];

/** Get portrait definition by ID */
export function getPortrait(portraitId: string | null): PortraitDefinition | null {
  if (!portraitId) return null;
  return ALL_PORTRAITS.find(p => p.id === portraitId) || null;
}

/** Get default AI portrait by AI opponent index */
export function getDefaultAIPortrait(aiIndex: number): string {
  return AI_PORTRAITS[aiIndex]?.id || AI_PORTRAITS[0].id;
}
