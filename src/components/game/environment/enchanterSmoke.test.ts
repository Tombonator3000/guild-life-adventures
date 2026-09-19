import { describe, expect, it } from 'vitest';
import { ENCHANTER_CAULDRON } from './effectAnchors';
import { smokeWindOffset } from './drawEnvironment';

describe('Enchanter cauldron smoke', () => {
  it('stays anchored to the cauldron beside the workshop', () => {
    expect(ENCHANTER_CAULDRON).toEqual([0.915, 0.839]);
  });

  it('uses the shared smoke wind drift for both horizontal and vertical movement', () => {
    const wind = { x: 18, y: -4 };
    expect(smokeWindOffset(0.75, 1000, 600, wind)).toEqual({
      x: 18.225,
      y: -2.43,
    });
  });
});