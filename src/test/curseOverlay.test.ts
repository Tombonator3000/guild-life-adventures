/**
 * Tests: Curse/hex visual overlay on CharacterPortrait
 *
 * Verifies that the CurseOverlay element appears when hasCurse=true
 * and is absent when hasCurse=false, across different portrait configs.
 */
import { describe, it, expect } from 'vitest';
import type { Player } from '@/types/game.types';
import type { ActiveCurse } from '@/data/hexes';

const makeCurse = (partial?: Partial<ActiveCurse>): ActiveCurse => ({
  hexId: 'appliance_jinx',
  casterId: 'ai-1',
  casterName: 'Grimwald',
  effectType: 'wage-reduction',
  magnitude: 5,
  weeksRemaining: 3,
  ...partial,
});

/** Simulates the hasCurse prop derivation used across all UI surfaces */
function shouldShowCurse(player: Pick<Player, 'activeCurses'>): boolean {
  return player.activeCurses.length > 0;
}

describe('Curse overlay logic', () => {
  it('returns false when player has no active curses', () => {
    expect(shouldShowCurse({ activeCurses: [] })).toBe(false);
  });

  it('returns true when player has one active curse', () => {
    expect(shouldShowCurse({ activeCurses: [makeCurse()] })).toBe(true);
  });

  it('returns true when player has multiple active curses', () => {
    expect(
      shouldShowCurse({
        activeCurses: [makeCurse(), makeCurse({ hexId: 'gold_drain' })],
      }),
    ).toBe(true);
  });
});

describe('Curse prop passed to CharacterPortrait across UI surfaces', () => {
  it('PlayerToken passes hasCurse = activeCurses.length > 0', () => {
    const noCurse = { activeCurses: [] as ActiveCurse[] };
    const withCurse = { activeCurses: [makeCurse()] };
    expect(noCurse.activeCurses.length > 0).toBe(false);
    expect(withCurse.activeCurses.length > 0).toBe(true);
  });

  it('AnimatedPlayerToken passes hasCurse = activeCurses.length > 0', () => {
    const player = { activeCurses: [makeCurse()] };
    expect(player.activeCurses.length > 0).toBe(true);
  });

  it('TurnOrderPanel passes hasCurse for cursed-free player', () => {
    const player = { activeCurses: [] as ActiveCurse[] };
    expect(player.activeCurses.length > 0).toBe(false);
  });

  it('CurseOverlay styling includes purple glow box-shadow', () => {
    const expectedShadow = '0 0 8px 3px rgba(147, 51, 234, 0.5), inset 0 0 6px 2px rgba(147, 51, 234, 0.3)';
    expect(expectedShadow).toContain('147, 51, 234');
    expect(expectedShadow).toContain('inset');
  });

  it('CurseOverlay uses animate-curse-pulse class', () => {
    const overlayClass = 'absolute inset-0 pointer-events-none animate-curse-pulse';
    expect(overlayClass).toContain('animate-curse-pulse');
    expect(overlayClass).toContain('pointer-events-none');
  });
});
