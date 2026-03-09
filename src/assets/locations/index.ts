// Location background images — faded sketch-style backgrounds for LocationShell
import type { LocationId } from '@/types/game.types';

import bgGuildHall from './bg-guild-hall.jpg';
import bgBank from './bg-bank.jpg';
import bgGeneralStore from './bg-general-store.jpg';
import bgArmory from './bg-armory.jpg';
import bgEnchanter from './bg-enchanter.jpg';
import bgShadowMarket from './bg-shadow-market.jpg';
import bgAcademy from './bg-academy.jpg';
import bgRustyTankard from './bg-rusty-tankard.jpg';
import bgCave from './bg-cave.jpg';
import bgForge from './bg-forge.jpg';
import bgLandlord from './bg-landlord.jpg';
import bgGraveyard from './bg-graveyard.jpg';
import bgFence from './bg-fence.jpg';
import bgNobleHeights from './bg-noble-heights.jpg';
import bgSlums from './bg-slums.jpg';

export const LOCATION_BACKGROUNDS: Partial<Record<LocationId, string>> = {
  'guild-hall': bgGuildHall,
  'bank': bgBank,
  'general-store': bgGeneralStore,
  'armory': bgArmory,
  'enchanter': bgEnchanter,
  'shadow-market': bgShadowMarket,
  'academy': bgAcademy,
  'rusty-tankard': bgRustyTankard,
  'cave': bgCave,
  'forge': bgForge,
  'landlord': bgLandlord,
  'graveyard': bgGraveyard,
  'fence': bgFence,
  'noble-heights': bgNobleHeights,
  'slums': bgSlums,
};
