import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/test/multiplayer.test.ts';
const source = readFileSync(path, 'utf8');
const search = `    // Equipment migration is a separate phase.\n    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(true);`;
const replacement = `    // Equipment intent is guest-callable; numeric legacy services are host-internal.\n    expect(ALLOWED_GUEST_ACTIONS.has('purchaseEquipmentItem')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('useEquipmentService')).toBe(true);\n    expect(ALLOWED_GUEST_ACTIONS.has('buyDurable')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('sellDurable')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairEquipment')).toBe(false);\n    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(false);`;

if (!source.includes(search)) throw new Error('Legacy equipment expectation block not found');
writeFileSync(path, source.replace(search, replacement));
console.log(`Patched ${path}`);
