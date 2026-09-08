import equipment from './painted-equipment.webp';
import provisions from './painted-provisions.webp';
import household from './painted-household.webp';

const equipmentIds = ['dagger', 'sword', 'steel-sword', 'enchanted-blade', 'leather-armor', 'chainmail', 'plate-armor', 'enchanted-plate', 'shield', 'iron-shield', 'tower-shield', 'dragon-scale-shield', 'peasant-garb', 'common-tunic', 'fine-clothes', 'noble-attire'];
const provisionIds = ['bread', 'cheese', 'fresh-vegetables', 'fresh-meat', 'fresh-provisions', 'mystery-meat', 'ale', 'stew', 'roast', 'healing-potion', 'warmth-stone', 'glow-orb', 'candles', 'blanket', 'music-box', 'arcane-tome'];
const householdIds = ['scrying-mirror', 'simple-scrying-glass', 'memory-crystal', 'cooking-fire', 'preservation-box', 'frost-chest', 'furniture', 'guild-vestments', 'encyclopedia', 'dictionary', 'atlas', 'stolen-goods', 'lottery-ticket', 'jousting-ticket', 'theatre-ticket', 'bard-concert-ticket'];
const aliases: Record<string, string> = { 'merchants-attire': 'fine-clothes', stereo: 'music-box', 'tavern-feast': 'roast', feast: 'roast', 'used-sword': 'sword', 'used-shield': 'shield', 'used-clothes': 'common-tunic', 'used-blanket': 'blanket' };
export function getPaintedItem(itemId: string): { atlas: string; cell: number } | undefined {
  const id = aliases[itemId] ?? itemId;
  for (const [atlas, ids] of [[equipment, equipmentIds], [provisions, provisionIds], [household, householdIds]] as const) {
    const cell = ids.indexOf(id);
    if (cell >= 0) return { atlas, cell };
  }
}
