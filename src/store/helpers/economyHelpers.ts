import type { SetFn, GetFn } from '../storeTypes';
import { createBankingActions } from './economy/bankingHelpers';
import { createItemActions } from './economy/itemHelpers';
import { createInventoryTradeActions } from './economy/inventoryTradeHelpers';
import { createHousingServiceActions } from './economy/housingServiceHelpers';
import { createFinanceServiceActions } from './economy/financeServiceHelpers';
import { createApplianceActions } from './economy/applianceHelpers';
import { createApplianceServiceActions } from './economy/applianceServiceHelpers';
import { createEquipmentActions } from './economy/equipmentHelpers';
import { createEquipmentServiceActions } from './economy/equipmentServiceHelpers';
import { createStockLoanActions } from './economy/stockLoanHelpers';
import { createServiceActions } from './economy/serviceHelpers';
import { createVendorActions } from './economy/vendorHelpers';

export function createEconomyActions(set: SetFn, get: GetFn) {
  return {
    ...createBankingActions(set, get),
    ...createItemActions(set, get),
    ...createInventoryTradeActions(set, get),
    ...createHousingServiceActions(set, get),
    ...createFinanceServiceActions(set, get),
    ...createApplianceActions(set, get),
    ...createApplianceServiceActions(set, get),
    ...createEquipmentActions(set, get),
    ...createEquipmentServiceActions(set, get),
    ...createStockLoanActions(set, get),
    ...createServiceActions(set, get),
    ...createVendorActions(set, get),
  };
}
