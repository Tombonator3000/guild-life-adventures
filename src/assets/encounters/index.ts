// Auto-generated dungeon encounter woodcut illustration imports
// All AI-generated 512×512 medieval woodcut-style encounter illustrations

// Floor 1: Entrance Cavern
import f1Rats from './f1-rats.png';
import f1Bats from './f1-bats.png';
import f1Treasure from './f1-treasure.png';
import f1Spring from './f1-spring.png';
import f1Boss from './f1-boss.png';

// Floor 2: Goblin Tunnels
import f2GoblinScouts from './f2-goblin-scouts.png';
import f2PitTrap from './f2-pit-trap.png';
import f2GoblinWarriors from './f2-goblin-warriors.png';
import f2Treasure from './f2-treasure.png';
import f2MushroomGrotto from './f2-mushroom-grotto.png';
import f2Boss from './f2-boss.png';

// Floor 3: Undead Crypt
import f3Skeletons from './f3-skeletons.png';
import f3Ghosts from './f3-ghosts.png';
import f3PoisonTrap from './f3-poison-trap.png';
import f3Artifacts from './f3-artifacts.png';
import f3SanctifiedPool from './f3-sanctified-pool.png';
import f3Boss from './f3-boss.png';

// Floor 4: Dragon's Lair
import f4YoungDragon from './f4-young-dragon.png';
import f4FireTrap from './f4-fire-trap.png';
import f4DrakePack from './f4-drake-pack.png';
import f4DragonHoard from './f4-dragon-hoard.png';
import f4DragonTears from './f4-dragon-tears.png';
import f4Boss from './f4-boss.png';

// Floor 5: The Abyss
import f5DemonSoldiers from './f5-demon-soldiers.png';
import f5VoidTrap from './f5-void-trap.png';
import f5ShadowFiends from './f5-shadow-fiends.png';
import f5AbyssalVault from './f5-abyssal-vault.png';
import f5VoidWell from './f5-void-well.png';
import f5Boss from './f5-boss.png';

// Floor 6: The Forgotten Temple
import f6TempleGuardians from './f6-temple-guardians.png';
import f6DivineWard from './f6-divine-ward.png';
import f6SpectralPriests from './f6-spectral-priests.png';
import f6Reliquary from './f6-reliquary.png';
import f6SanctumFont from './f6-sanctum-font.png';
import f6Boss from './f6-boss.png';

// Mini-Bosses
import mbCaveTroll from './mb-cave-troll.png';
import mbGoblinShaman from './mb-goblin-shaman.png';
import mbDeathKnight from './mb-death-knight.png';
import mbDrakeMatriarch from './mb-drake-matriarch.png';
import mbVoidReaver from './mb-void-reaver.png';
import mbFallenArchon from './mb-fallen-archon.png';

/** Map encounter IDs to their woodcut illustrations */
export const ENCOUNTER_IMAGES: Record<string, string> = {
  // Floor 1
  'f1-rats': f1Rats,
  'f1-bats': f1Bats,
  'f1-treasure': f1Treasure,
  'f1-spring': f1Spring,
  'f1-boss-rat-king': f1Boss,

  // Floor 2
  'f2-goblin-scouts': f2GoblinScouts,
  'f2-pit-trap': f2PitTrap,
  'f2-goblin-warriors': f2GoblinWarriors,
  'f2-treasure-cache': f2Treasure,
  'f2-mushroom-grotto': f2MushroomGrotto,
  'f2-boss-goblin-chief': f2Boss,

  // Floor 3
  'f3-skeletons': f3Skeletons,
  'f3-ghosts': f3Ghosts,
  'f3-poison-trap': f3PoisonTrap,
  'f3-ancient-artifacts': f3Artifacts,
  'f3-sanctified-pool': f3SanctifiedPool,
  'f3-boss-lich': f3Boss,

  // Floor 4
  'f4-young-dragon': f4YoungDragon,
  'f4-fire-trap': f4FireTrap,
  'f4-drake-pack': f4DrakePack,
  'f4-dragon-hoard': f4DragonHoard,
  'f4-dragon-tear-pool': f4DragonTears,
  'f4-boss-elder-dragon': f4Boss,

  // Floor 5
  'f5-demon-soldiers': f5DemonSoldiers,
  'f5-void-trap': f5VoidTrap,
  'f5-shadow-fiends': f5ShadowFiends,
  'f5-abyssal-vault': f5AbyssalVault,
  'f5-void-well': f5VoidWell,
  'f5-boss-demon-lord': f5Boss,

  // Floor 6
  'f6-temple-guardians': f6TempleGuardians,
  'f6-divine-ward': f6DivineWard,
  'f6-spectral-priests': f6SpectralPriests,
  'f6-temple-reliquary': f6Reliquary,
  'f6-sanctum-font': f6SanctumFont,
  'f6-boss-the-archon': f6Boss,

  // Mini-Bosses
  'mb-cave-troll': mbCaveTroll,
  'mb-goblin-shaman': mbGoblinShaman,
  'mb-death-knight': mbDeathKnight,
  'mb-drake-matriarch': mbDrakeMatriarch,
  'mb-void-reaver': mbVoidReaver,
  'mb-fallen-archon': mbFallenArchon,
};

/** Get the woodcut illustration for a dungeon encounter by ID */
export function getEncounterImage(encounterId: string): string | undefined {
  return ENCOUNTER_IMAGES[encounterId];
}
