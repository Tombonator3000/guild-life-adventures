import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/test/multiplayer.test.ts';
let source = readFileSync(path, 'utf8');

const search = `  it('ALLOWED_GUEST_ACTIONS includes equipment actions', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairAppliance')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(true);
  });`;

const replacement = `  it('ALLOWED_GUEST_ACTIONS uses semantic appliance actions', () => {
    expect(ALLOWED_GUEST_ACTIONS.has('purchaseAppliance')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('useApplianceService')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('buyAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('repairAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('pawnAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('redeemAppliance')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('forgeRepairAppliance')).toBe(false);
    // Equipment migration is a separate phase.
    expect(ALLOWED_GUEST_ACTIONS.has('temperEquipment')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('salvageEquipment')).toBe(true);
  });`;

const next = source.replace(search, replacement);
if (next === source) throw new Error('Appliance multiplayer test target not found');
writeFileSync(path, next);
console.log(`Patched ${path}`);
