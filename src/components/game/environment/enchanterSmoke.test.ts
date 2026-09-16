import { describe, expect, it } from 'vitest';
import { ENCHANTER_CAULDRON } from './effectAnchors';

describe('Enchanter cauldron smoke', () => {
  it('stays anchored to the cauldron beside the workshop', () => {
    expect(ENCHANTER_CAULDRON).toEqual([0.915, 0.839]);
  });
});