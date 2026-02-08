import type { SetFn, GetFn } from '../storeTypes';
import { createBankingActions } from './economy/bankingHelpers';
import { createItemActions } from './economy/itemHelpers';
import { createApplianceActions } from './economy/applianceHelpers';
import { createEquipmentActions } from './economy/equipmentHelpers';
import { createStockLoanActions } from './economy/stockLoanHelpers';

export function createEconomyActions(set: SetFn, get: GetFn) {
  return {
    ...createBankingActions(set, get),
    ...createItemActions(set, get),
    ...createApplianceActions(set, get),
    ...createEquipmentActions(set, get),
    ...createStockLoanActions(set, get),
  };
}
