// Hexes & Curses store helpers
// All hex-related game actions: casting, defense, expiration, effects

import type { LocationId, Player } from '@/types/game.types';
import type { SetFn, GetFn } from '../storeTypes';
import { getGameOption } from '@/data/gameOptions';
import {
  getHexById,
  getHexPrice,
  isLocationHexed,
  rollGraveyardRitual,
  rollCurseReflection,
  DEFENSE_ITEMS,
  type ActiveLocationHex,
  type ActiveCurse,
  type HexDefinition,
} from '@/data/hexes';

export function createHexActions(set: SetFn, get: GetFn) {
  return {
    // ── Buy a hex scroll from a shop ──────────────────────────────
    buyHexScroll: (playerId: string, hexId: string, cost: number) => {
      if (!getGameOption('enableHexesCurses')) return;
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.gold < cost) return;

      set((s) => ({
        players: s.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: p.gold - cost,
                hexScrolls: addHexScroll(p.hexScrolls, hexId),
              }
            : p
        ),
      }));
    },

    // ── Cast a location hex ───────────────────────────────────────
    castLocationHex: (playerId: string, hexId: string): { success: boolean; message: string } => {
      if (!getGameOption('enableHexesCurses')) return { success: false, message: 'Hexes are disabled.' };
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      const hex = getHexById(hexId);
      if (!player || !hex || hex.category !== 'location' || !hex.targetLocation) {
        return { success: false, message: 'Invalid hex.' };
      }

      // Must have the scroll
      const scrollIdx = player.hexScrolls.findIndex(s => s.hexId === hexId && s.quantity > 0);
      if (scrollIdx === -1) return { success: false, message: 'You do not have this scroll.' };

      // Only one location hex active per caster
      const existingHex = state.locationHexes.find(h => h.casterId === playerId);
      if (existingHex) return { success: false, message: 'You already have an active location hex.' };

      // Must be at a valid casting location (Shadow Market, Enchanter, or Graveyard)
      const castLocations: LocationId[] = ['shadow-market', 'enchanter', 'graveyard'];
      if (!castLocations.includes(player.currentLocation)) {
        return { success: false, message: 'You must be at the Shadow Market, Enchanter, or Graveyard to cast.' };
      }

      // Must have enough time
      if (player.timeRemaining < hex.castTime) {
        return { success: false, message: 'Not enough time to cast this hex.' };
      }

      // Apply the hex
      const newLocationHex: ActiveLocationHex = {
        hexId,
        casterId: playerId,
        casterName: player.name,
        targetLocation: hex.targetLocation,
        weeksRemaining: hex.duration,
      };

      set((s) => ({
        locationHexes: [...s.locationHexes, newLocationHex],
        players: s.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                timeRemaining: Math.max(0, p.timeRemaining - hex.castTime),
                hexScrolls: removeHexScroll(p.hexScrolls, hexId),
                hexCastCooldown: 3, // 3-turn cooldown
              }
            : p
        ),
      }));

      return {
        success: true,
        message: `You cast ${hex.name}! ${hex.targetLocation} is sealed for ${hex.duration} week${hex.duration > 1 ? 's' : ''}.`,
      };
    },

    // ── Cast a personal curse on a target ─────────────────────────
    castPersonalCurse: (playerId: string, hexId: string, targetId: string): { success: boolean; message: string } => {
      if (!getGameOption('enableHexesCurses')) return { success: false, message: 'Hexes are disabled.' };
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      const target = state.players.find(p => p.id === targetId);
      const hex = getHexById(hexId);

      if (!player || !target || !hex || !hex.effect || hex.category === 'location') {
        return { success: false, message: 'Invalid curse.' };
      }
      if (playerId === targetId) {
        return { success: false, message: 'You cannot curse yourself.' };
      }
      if (target.isGameOver) {
        return { success: false, message: 'Target is out of the game.' };
      }

      // Must have the scroll
      const scrollIdx = player.hexScrolls.findIndex(s => s.hexId === hexId && s.quantity > 0);
      if (scrollIdx === -1) return { success: false, message: 'You do not have this scroll.' };

      // Max 1 curse per target (from different casters)
      if (target.activeCurses.length >= 1 && hex.category === 'personal') {
        return { success: false, message: `${target.name} is already cursed.` };
      }

      // Must be at a valid casting location
      const castLocations: LocationId[] = ['shadow-market', 'enchanter', 'graveyard'];
      if (!castLocations.includes(player.currentLocation)) {
        return { success: false, message: 'You must be at the Shadow Market, Enchanter, or Graveyard to cast.' };
      }

      if (player.timeRemaining < hex.castTime) {
        return { success: false, message: 'Not enough time to cast this curse.' };
      }

      // Check target's Protective Amulet (blocks hex, consumed)
      if (target.hasProtectiveAmulet && hex.id !== 'hex-of-ruin') {
        set((s) => ({
          players: s.players.map((p) => {
            if (p.id === playerId) {
              return {
                ...p,
                timeRemaining: Math.max(0, p.timeRemaining - hex.castTime),
                hexScrolls: removeHexScroll(p.hexScrolls, hexId),
                hexCastCooldown: 3,
              };
            }
            if (p.id === targetId) {
              return { ...p, hasProtectiveAmulet: false };
            }
            return p;
          }),
        }));
        return {
          success: true,
          message: `${target.name}'s Protective Amulet absorbed your ${hex.name}! The amulet shatters.`,
        };
      }

      // Apply sabotage hexes (instant effects)
      if (hex.category === 'sabotage') {
        return applySabotageHex(set, get, playerId, targetId, hex);
      }

      // Apply personal curse (duration-based)
      const newCurse: ActiveCurse = {
        hexId,
        casterId: playerId,
        casterName: player.name,
        effectType: hex.effect.type,
        magnitude: hex.effect.magnitude,
        weeksRemaining: hex.duration,
      };

      set((s) => ({
        players: s.players.map((p) => {
          if (p.id === playerId) {
            return {
              ...p,
              timeRemaining: Math.max(0, p.timeRemaining - hex.castTime),
              hexScrolls: removeHexScroll(p.hexScrolls, hexId),
              hexCastCooldown: 3,
            };
          }
          if (p.id === targetId) {
            // Handle legendary ruin's gold penalty
            if (hex.effect!.type === 'legendary-ruin') {
              const goldLoss = Math.floor(p.gold * hex.effect!.magnitude);
              return {
                ...p,
                activeCurses: [...p.activeCurses, newCurse],
                gold: Math.max(0, p.gold - goldLoss),
              };
            }
            return { ...p, activeCurses: [...p.activeCurses, newCurse] };
          }
          return p;
        }),
      }));

      return {
        success: true,
        message: `You cast ${hex.name} on ${target.name}! ${hex.description}`,
      };
    },

    // ── Buy Protective Amulet ─────────────────────────────────────
    buyProtectiveAmulet: (playerId: string, cost: number) => {
      if (!getGameOption('enableHexesCurses')) return;
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.gold < cost || player.hasProtectiveAmulet) return;

      set((s) => ({
        players: s.players.map((p) =>
          p.id === playerId
            ? { ...p, gold: p.gold - cost, hasProtectiveAmulet: true }
            : p
        ),
      }));
    },

    // ── Buy and use Dispel Scroll (remove location hex at current location) ──
    dispelLocationHex: (playerId: string, cost: number): { success: boolean; message: string } => {
      if (!getGameOption('enableHexesCurses')) return { success: false, message: 'Hexes are disabled.' };
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player || player.gold < cost) return { success: false, message: 'Not enough gold.' };

      const hex = isLocationHexed(player.currentLocation, playerId, state.locationHexes);
      if (!hex) return { success: false, message: 'No hex on this location.' };

      set((s) => ({
        locationHexes: s.locationHexes.filter(h => !(h.targetLocation === player.currentLocation && h.casterId !== playerId)),
        players: s.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: p.gold - cost,
                timeRemaining: Math.max(0, p.timeRemaining - 1),
              }
            : p
        ),
      }));

      return { success: true, message: `Hex dispelled! ${player.currentLocation} is open again.` };
    },

    // ── Cleanse personal curse at Healer (Enchanter) ──────────────
    cleanseCurse: (playerId: string, cost: number): { success: boolean; message: string } => {
      if (!getGameOption('enableHexesCurses')) return { success: false, message: 'Hexes are disabled.' };
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return { success: false, message: 'Invalid player.' };
      if (player.gold < cost) return { success: false, message: 'Not enough gold.' };
      if (player.activeCurses.length === 0) return { success: false, message: 'No active curses.' };
      if (player.timeRemaining < 3) return { success: false, message: 'Not enough time.' };

      // Remove the oldest curse
      set((s) => ({
        players: s.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: p.gold - cost,
                timeRemaining: Math.max(0, p.timeRemaining - 3),
                activeCurses: p.activeCurses.slice(1), // remove oldest
              }
            : p
        ),
      }));

      return { success: true, message: 'The curse has been lifted! Dark magic fades from your soul.' };
    },

    // ── Graveyard Dark Ritual (get random hex scroll) ─────────────
    performDarkRitual: (playerId: string, cost: number): { success: boolean; message: string; backfired?: boolean } => {
      if (!getGameOption('enableHexesCurses')) return { success: false, message: 'Hexes are disabled.' };
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return { success: false, message: 'Invalid player.' };
      if (player.gold < cost) return { success: false, message: 'Not enough gold.' };
      if (player.timeRemaining < 4) return { success: false, message: 'Not enough time (4 hours required).' };
      if (player.currentLocation !== 'graveyard') return { success: false, message: 'Must be at the Graveyard.' };

      const { hex, backfired } = rollGraveyardRitual();

      if (backfired && hex && hex.effect) {
        // Ritual backfire: curse yourself!
        const selfCurse: ActiveCurse = {
          hexId: hex.id,
          casterId: playerId,
          casterName: 'Dark Ritual',
          effectType: hex.effect.type,
          magnitude: hex.effect.magnitude,
          weeksRemaining: hex.duration,
        };

        set((s) => ({
          players: s.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  gold: p.gold - cost,
                  timeRemaining: Math.max(0, p.timeRemaining - 4),
                  activeCurses: [...p.activeCurses, selfCurse],
                }
              : p
          ),
        }));

        return {
          success: true,
          backfired: true,
          message: `The ritual backfires! Dark energy rebounds upon you! You are afflicted with ${hex.name}!`,
        };
      }

      // Success: get a hex scroll
      set((s) => ({
        players: s.players.map((p) =>
          p.id === playerId
            ? {
                ...p,
                gold: p.gold - cost,
                timeRemaining: Math.max(0, p.timeRemaining - 4),
                hexScrolls: addHexScroll(p.hexScrolls, hex.id),
              }
            : p
        ),
      }));

      return {
        success: true,
        message: `The dark ritual yields a ${hex.name} scroll! The spirits of the dead grant their dark favor.`,
      };
    },

    // ── Graveyard Curse Reflection ────────────────────────────────
    attemptCurseReflection: (playerId: string, cost: number): { success: boolean; message: string } => {
      if (!getGameOption('enableHexesCurses')) return { success: false, message: 'Hexes are disabled.' };
      const state = get();
      const player = state.players.find(p => p.id === playerId);
      if (!player) return { success: false, message: 'Invalid player.' };
      if (player.gold < cost) return { success: false, message: 'Not enough gold.' };
      if (player.activeCurses.length === 0) return { success: false, message: 'No active curses to reflect.' };
      if (player.timeRemaining < 3) return { success: false, message: 'Not enough time (3 hours required).' };
      if (player.currentLocation !== 'graveyard') return { success: false, message: 'Must be at the Graveyard.' };

      const result = rollCurseReflection();
      const curse = player.activeCurses[0]; // oldest curse
      const curseRemoved = result === 'reflect' || result === 'remove';

      // Single set() call — all outcomes deduct gold+time; reflect/remove also strip the curse
      set((s) => ({
        players: s.players.map((p) => {
          if (p.id === playerId) {
            return {
              ...p,
              gold: p.gold - cost,
              timeRemaining: Math.max(0, p.timeRemaining - 3),
              ...(curseRemoved && { activeCurses: p.activeCurses.slice(1) }),
            };
          }
          // Reflect: transfer curse to original caster
          if (result === 'reflect' && p.id === curse.casterId && !p.isGameOver) {
            return {
              ...p,
              activeCurses: [...p.activeCurses, { ...curse, casterId: playerId, casterName: player.name }],
            };
          }
          return p;
        }),
      }));

      // Outcome messages
      const OUTCOME_MESSAGES: Record<string, { success: boolean; message: string }> = {
        reflect: {
          success: true,
          message: `The curse rebounds! ${state.players.find(p => p.id === curse.casterId)?.name || 'The caster'} is now afflicted with ${getHexById(curse.hexId)?.name || 'the curse'}!`,
        },
        remove: {
          success: true,
          message: 'The dark energy dissipates. The curse has been broken!',
        },
        fail: {
          success: false,
          message: 'The spirits refuse to cooperate. The curse persists, and your gold is lost.',
        },
      };

      return OUTCOME_MESSAGES[result] || OUTCOME_MESSAGES.fail;
    },

    // ── Add hex scroll to inventory (from dungeon drops) ──────────
    addHexScrollToPlayer: (playerId: string, hexId: string) => {
      if (!getGameOption('enableHexesCurses')) return;
      set((s) => ({
        players: s.players.map((p) =>
          p.id === playerId
            ? { ...p, hexScrolls: addHexScroll(p.hexScrolls, hexId) }
            : p
        ),
      }));
    },
  };
}

// ============================================================
// Internal Helpers
// ============================================================

function addHexScroll(scrolls: Player['hexScrolls'], hexId: string): Player['hexScrolls'] {
  const existing = scrolls.find(s => s.hexId === hexId);
  if (existing) {
    return scrolls.map(s => s.hexId === hexId ? { ...s, quantity: s.quantity + 1 } : s);
  }
  return [...scrolls, { hexId, quantity: 1 }];
}

function removeHexScroll(scrolls: Player['hexScrolls'], hexId: string): Player['hexScrolls'] {
  return scrolls
    .map(s => s.hexId === hexId ? { ...s, quantity: s.quantity - 1 } : s)
    .filter(s => s.quantity > 0);
}

// Sabotage effect handlers — each returns the target player update and a result message
type SabotageHandler = {
  apply: (p: Player) => Partial<Player>;
  message: (target: Player) => string;
};

const SABOTAGE_EFFECTS: Record<string, SabotageHandler> = {
  'destroy-weapon': {
    apply: (p) => ({ equippedWeapon: null, equipmentDurability: removeKey(p.equipmentDurability, p.equippedWeapon) }),
    message: (t) => t.equippedWeapon ? 'Their weapon shatters into pieces!' : 'They had no weapon to destroy.',
  },
  'destroy-armor': {
    apply: (p) => ({ equippedArmor: null, equipmentDurability: removeKey(p.equipmentDurability, p.equippedArmor) }),
    message: (t) => t.equippedArmor ? 'Their armor dissolves into rust!' : 'They had no armor to destroy.',
  },
  'destroy-food': {
    apply: () => ({ foodLevel: 0, freshFood: 0 }),
    message: () => 'All their food has rotted away!',
  },
  'break-appliance': {
    apply: (p) => {
      const working = Object.entries(p.appliances).filter(([_, a]) => !a.isBroken);
      if (working.length === 0) return {};
      const [appId] = working[Math.floor(Math.random() * working.length)];
      return { appliances: { ...p.appliances, [appId]: { ...p.appliances[appId], isBroken: true } } };
    },
    message: () => 'One of their enchanted devices has been jinxed!',
  },
  'destroy-clothing': {
    apply: () => ({ clothingCondition: 0 }),
    message: () => 'Their clothes unravel into rags!',
  },
};

/** Apply instant sabotage effects */
function applySabotageHex(
  set: SetFn, get: GetFn,
  playerId: string, targetId: string, hex: HexDefinition
): { success: boolean; message: string } {
  if (!hex.effect) {
    return { success: false, message: 'Invalid sabotage hex — no effect defined.' };
  }
  const state = get();
  const target = state.players.find(p => p.id === targetId)!;
  const handler = SABOTAGE_EFFECTS[hex.effect.type];

  set((s) => ({
    players: s.players.map((p) => {
      if (p.id === playerId) {
        return { ...p, timeRemaining: Math.max(0, p.timeRemaining - hex.castTime), hexScrolls: removeHexScroll(p.hexScrolls, hex.id), hexCastCooldown: 3 };
      }
      if (p.id === targetId && handler) {
        return { ...p, ...handler.apply(p) };
      }
      return p;
    }),
  }));

  const effectMsg = handler?.message(target) ?? 'Dark magic takes its toll.';
  return { success: true, message: `You cast ${hex.name} on ${target.name}! ${effectMsg}` };
}

function removeKey(obj: Record<string, number>, key: string | null): Record<string, number> {
  if (!key) return obj;
  const { [key]: _, ...rest } = obj;
  return rest;
}

// ============================================================
// Week-End Processing (called from weekEndHelpers.ts)
// ============================================================

/** Tick down hex/curse durations, remove expired ones, apply per-week curse effects */
export function processHexExpiration(
  players: Player[],
  locationHexes: ActiveLocationHex[]
): { players: Player[]; locationHexes: ActiveLocationHex[]; messages: string[] } {
  if (!getGameOption('enableHexesCurses')) return { players, locationHexes, messages: [] };

  const messages: string[] = [];

  // Tick down location hexes
  const updatedLocationHexes = locationHexes
    .map(h => ({ ...h, weeksRemaining: h.weeksRemaining - 1 }))
    .filter(h => {
      if (h.weeksRemaining <= 0) {
        messages.push(`The ${getHexById(h.hexId)?.name || 'hex'} on ${h.targetLocation} has expired.`);
        return false;
      }
      return true;
    });

  // Tick down player curses and cooldowns
  const updatedPlayers = players.map(p => {
    if (p.isGameOver) return p;

    const updatedCurses = p.activeCurses
      .map(c => ({ ...c, weeksRemaining: c.weeksRemaining - 1 }))
      .filter(c => {
        if (c.weeksRemaining <= 0) {
          messages.push(`${p.name}'s ${getHexById(c.hexId)?.name || 'curse'} has expired.`);
          return false;
        }
        return true;
      });

    return {
      ...p,
      activeCurses: updatedCurses,
      hexCastCooldown: Math.max(0, p.hexCastCooldown - 1),
    };
  });

  return { players: updatedPlayers, locationHexes: updatedLocationHexes, messages };
}

/** Check if a player has a specific curse effect active */
export function hasCurseEffect(player: Player, effectType: ActiveCurse['effectType']): ActiveCurse | null {
  return player.activeCurses.find(c => c.effectType === effectType) || null;
}

/** Check if a player is affected by the legendary Hex of Ruin (all locations blocked) */
export function isPlayerRuined(player: Player): boolean {
  return player.activeCurses.some(c => c.effectType === 'legendary-ruin');
}
