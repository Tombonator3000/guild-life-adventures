import type { LocationId, Player } from '@/types/game.types';
import type { GameStore } from '@/store/storeTypes';
import type { LocationTab } from './LocationShell';
import type { generateNewspaper } from '@/data/newspaper';

/**
 * Reactive state and semantic services actually read by location tab factories.
 * Keep this interface narrow: adding a field also expands LocationPanel's
 * Zustand selector and should be justified by a real tab implementation.
 */
export interface LocationTabContext {
  player: Player;
  players: Player[];
  priceModifier: number;
  economyTrend: number;
  week: number;
  weeklyNewsEvents: GameStore['weeklyNewsEvents'];
  stockPrices: GameStore['stockPrices'];
  stockPriceHistory: GameStore['stockPriceHistory'];
  performWorkShift: GameStore['performWorkShift'];
  attendDegreeSession: GameStore['attendDegreeSession'];
  prepayDegree: GameStore['prepayDegree'];
  graduateDegree: GameStore['graduateDegree'];
  takeQuest: GameStore['takeQuest'];
  completeQuest: GameStore['completeQuest'];
  abandonQuest: GameStore['abandonQuest'];
  takeChainQuest: GameStore['takeChainQuest'];
  takeNonLinearChain: GameStore['takeNonLinearChain'];
  makeNLChainChoice: GameStore['makeNLChainChoice'];
  takeBounty: GameStore['takeBounty'];
  buyGuildPass: GameStore['buyGuildPass'];
  acceptJobOffer: GameStore['acceptJobOffer'];
  acceptMarketRaise: GameStore['acceptMarketRaise'];
  requestRaise: GameStore['requestRaise'];
  equipItem: GameStore['equipItem'];
  unequipItem: GameStore['unequipItem'];
  equipmentServiceAction: GameStore['useEquipmentService'];
  applianceServiceAction: GameStore['useApplianceService'];
  readBook: GameStore['readBook'];
  locationHexes: GameStore['locationHexes'];
  onShowNewspaper: (newspaper: ReturnType<typeof generateNewspaper>) => void;
}

export type TabFactory = (ctx: LocationTabContext) => LocationTab[];
export type LocationTabFactoryMap = Partial<Record<LocationId, TabFactory>>;
