import { describe, expect, it } from 'vitest';
import { BOARD_3D_BY_ID, BOARD_3D_LOCATIONS } from './board3d';
import { BOARD_PATH, getPath } from './locations';

describe('3D board presentation data', () => {
  it('covers the complete canonical location ring in the same order', () => {
    expect(BOARD_3D_LOCATIONS).toHaveLength(BOARD_PATH.length);
    expect(BOARD_3D_LOCATIONS.map((location) => location.id)).toEqual(BOARD_PATH);
    expect(Object.keys(BOARD_3D_BY_ID)).toHaveLength(BOARD_PATH.length);
  });

  it('keeps travel costs delegated to the canonical movement topology', () => {
    const path = getPath('slums', 'enchanter');
    expect(path).toEqual(['slums', 'fence', 'shadow-market', 'rusty-tankard', 'armory', 'enchanter']);
    expect(path.length - 1).toBe(5);
  });
});
