import type { SetFn, GetFn } from '../storeTypes';
import { createBankingActions } from './economy/bankingHelpers';
import { createItemActions } from './economy/itemHelpers';
import { createApplianceActions } from './economy/applianceHelpers';
import { createApplianceServiceActions } from './economy/applianceServiceHelpers';
import { createEquipmentActions } from './economy/equipmentHelpers';
import { createStockLoanActions } from './economy/stockLoanHelpers';
import { createServiceActions } from './economy/serviceHelpers';
import { createVendorActions } from './economy/vendorHelpers';

export function createEconomyActions(set: SetFn, get: GetFn) {
  return {
    ...createBankingActions(set, get),
    ...createItemActions(set, get),
    ...createApplianceActions(set, get),
    ...createApplianceServiceActions(set, get),
    ...createEquipmentActions(set, get),
    ...createStockLoanActions(set, get),
    ...createServiceActions(set, get),
    ...createVendorActions(set, get),
  };
}
