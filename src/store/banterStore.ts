// Tiny zustand store for banter state — shared between LocationShell (trigger) and GameBoard (display)
import { create } from 'zustand';
import type { BanterLine } from '@/data/banter';
import type { LocationId } from '@/types/game.types';

interface BanterStore {
  activeBanter: BanterLine | null;
  locationId: LocationId | null;
  npcName: string | null;
  setBanter: (banter: BanterLine, locationId: LocationId, npcName: string) => void;
  clearBanter: () => void;
}

export const useBanterStore = create<BanterStore>((set) => ({
  activeBanter: null,
  locationId: null,
  npcName: null,
  setBanter: (banter, locationId, npcName) => set({ activeBanter: banter, locationId, npcName }),
  clearBanter: () => set({ activeBanter: null, locationId: null, npcName: null }),
}));
