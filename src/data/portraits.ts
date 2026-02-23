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

export interface PortraitDefinition {
  id: string;
  name: string;
  /** Path to portrait image in public/ (relative to base URL) */
  imagePath: string;
  /** Category for filtering in the picker */
  category: 'human' | 'ai';
  /** Placeholder colors for generated SVG when no image exists */
  placeholderColors: {
    bg: string;      // Background color
    accent: string;  // Accent/hair color
    skin: string;    // Skin tone
  };
}

// Human-selectable portraits (shown in player setup)
export const PLAYER_PORTRAITS: PortraitDefinition[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    imagePath: 'portraits/warrior.jpg',
    category: 'human',
    placeholderColors: { bg: '#8B4513', accent: '#CD853F', skin: '#DEB887' },
  },
  {
    id: 'mage',
    name: 'Mage',
    imagePath: 'portraits/mage.jpg',
    category: 'human',
    placeholderColors: { bg: '#4B0082', accent: '#9370DB', skin: '#F5DEB3' },
  },
  {
    id: 'rogue',
    name: 'Rogue',
    imagePath: 'portraits/rogue.jpg',
    category: 'human',
    placeholderColors: { bg: '#2F4F4F', accent: '#708090', skin: '#D2B48C' },
  },
  {
    id: 'cleric',
    name: 'Cleric',
    imagePath: 'portraits/cleric.jpg',
    category: 'human',
    placeholderColors: { bg: '#DAA520', accent: '#FFFACD', skin: '#FFDAB9' },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    imagePath: 'portraits/ranger.jpg',
    category: 'human',
    placeholderColors: { bg: '#228B22', accent: '#8FBC8F', skin: '#DEB887' },
  },
  {
    id: 'bard',
    name: 'Bard',
    imagePath: 'portraits/bard.jpg',
    category: 'human',
    placeholderColors: { bg: '#B22222', accent: '#FF6347', skin: '#FFE4C4' },
  },
  {
    id: 'paladin',
    name: 'Paladin',
    imagePath: 'portraits/paladin.jpg',
    category: 'human',
    placeholderColors: { bg: '#4169E1', accent: '#C0C0C0', skin: '#FFDAB9' },
  },
  {
    id: 'merchant',
    name: 'Merchant',
    imagePath: 'portraits/merchant.jpg',
    category: 'human',
    placeholderColors: { bg: '#8B6914', accent: '#FFD700', skin: '#F5DEB3' },
  },
  {
    id: 'druid',
    name: 'Druid',
    imagePath: 'portraits/druid.jpg',
    category: 'human',
    placeholderColors: { bg: '#1A5C2A', accent: '#66BB6A', skin: '#C8A882' },
  },
  {
    id: 'necromancer',
    name: 'Necromancer',
    imagePath: 'portraits/necromancer.jpg',
    category: 'human',
    placeholderColors: { bg: '#1A0A2E', accent: '#7B2FBE', skin: '#C4B5C0' },
  },
  {
    id: 'monk',
    name: 'Monk',
    imagePath: 'portraits/monk.jpg',
    category: 'human',
    placeholderColors: { bg: '#8B4500', accent: '#D4A06A', skin: '#E8C49A' },
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
