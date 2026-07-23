import fs from 'node:fs';

const path = 'src/test/multiplayer.test.ts';
let text = fs.readFileSync(path, 'utf8');

const movementExpectation = "    expect(ALLOWED_GUEST_ACTIONS.has('movePlayer')).toBe(true);";
if (!text.includes(movementExpectation)) throw new Error('Movement expectation not found');
text = text.replace(
  movementExpectation,
  "    expect(ALLOWED_GUEST_ACTIONS.has('travelPlayer')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('movePlayer')).toBe(false);",
);

const movementList = "      'movePlayer', 'spendTime', 'modifyGold', 'modifyHealth',";
if (!text.includes(movementList)) throw new Error('Cross-player movement list not found');
text = text.replace(
  movementList,
  "      'travelPlayer', 'spendTime', 'modifyGold', 'modifyHealth',",
);

fs.writeFileSync(path, text);
