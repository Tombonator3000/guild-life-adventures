import {
  AGE_INTERVAL,
  APPLIANCE_BREAK_CHANCE,
  FOOD_DEPLETION_PER_WEEK,
  GUILD_PASS_COST,
  HOURS_PER_TURN,
  LOAN_MIN_SHIFTS_REQUIRED,
  RENT_COSTS,
  RENT_INTERVAL,
  SPOILED_FOOD_SICKNESS_CHANCE,
  STARTING_AGE,
} from '@/types/game.types';
import { GRADUATION_BONUSES } from '@/data/education';
import { NEWSPAPER_COST } from '@/data/newspaper';

const asPercent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Player-facing rule values that are not otherwise exposed as reusable data.
 * Their matching engine literals are guarded by rulesTruth.test.ts so a future
 * gameplay change cannot silently leave the tutorial and manual behind.
 */
export const PLAYER_RULE_VALUES = {
  turnHours: HOURS_PER_TURN,
  movementHoursPerStep: 1,
  foodDepletionPerWeek: FOOD_DEPLETION_PER_WEEK,
  starvationTimeLoss: 20,
  starvationDoctorChance: 0.25,
  doctorTimeLoss: 10,
  doctorHappinessLoss: 4,
  doctorGoldMin: 30,
  doctorGoldMax: 200,
  spoiledFoodSicknessChance: SPOILED_FOOD_SICKNESS_CHANCE,
  freshFoodCapacity: 6,
  frostChestCapacity: 12,
  cookingFireFoodBonus: 3,
  clothingDegradationPerWeek: 3,
  rentInterval: RENT_INTERVAL,
  slumsRent: RENT_COSTS.slums,
  nobleRent: RENT_COSTS.noble,
  rentDebtStartsAfterWeeks: 4,
  evictionAfterWeeks: 8,
  guildPassCost: GUILD_PASS_COST,
  loanMinimumShifts: LOAN_MIN_SHIFTS_REQUIRED,
  loanTermWeeks: 8,
  baseLoanInterestRate: 0.1,
  baseSavingsInterestRate: 0.001,
  newspaperBaseCost: NEWSPAPER_COST,
  lotteryGrandPrize: 500,
  lotterySmallPrize: 20,
  lotteryGrandPrizeChancePerTicket: 0.001,
  lotterySmallPrizeChancePerTicket: 0.06,
  startingAge: STARTING_AGE,
  ageIntervalWeeks: AGE_INTERVAL,
  educationPointsPerDegree: 9,
  baseStudySessions: 10,
  minimumStudySessionsWithAllExtraCredit: 8,
  studyHoursPerSession: 6,
  graduationHappiness: GRADUATION_BONUSES.happiness,
  graduationDependability: GRADUATION_BONUSES.dependability,
  graduationMaxDependability: GRADUATION_BONUSES.maxDependability,
  graduationMaxExperience: GRADUATION_BONUSES.maxExperience,
  applianceBreakChanceEnchanter: APPLIANCE_BREAK_CHANCE.enchanter,
  applianceBreakChanceUsed: APPLIANCE_BREAK_CHANCE.market,
} as const;

export const PLAYER_RULE_TEXT = {
  movement: `Travel follows the shortest route around Guildholm. Each normal step costs ${PLAYER_RULE_VALUES.movementHoursPerStep} hour before weather effects. If you cannot reach the destination, you travel as far as your remaining time allows.`,
  starvation: `If a turn begins with no regular or preserved food, you lose ${PLAYER_RULE_VALUES.starvationTimeLoss} hours searching for food. There is also a ${asPercent(PLAYER_RULE_VALUES.starvationDoctorChance)} chance of collapsing and visiting a healer, which costs another ${PLAYER_RULE_VALUES.doctorTimeLoss} hours, ${PLAYER_RULE_VALUES.doctorHappinessLoss} Happiness and ${PLAYER_RULE_VALUES.doctorGoldMin}-${PLAYER_RULE_VALUES.doctorGoldMax}g. Starvation does not apply a guaranteed direct Health penalty.`,
  food: `Regular food drops by ${PLAYER_RULE_VALUES.foodDepletionPerWeek} each week. Store-bought food can make you sick without a working Preservation Box. A Preservation Box stores ${PLAYER_RULE_VALUES.freshFoodCapacity} fresh-food units; a working Frost Chest raises this to ${PLAYER_RULE_VALUES.frostChestCapacity}.`,
  wealthFormula: 'Wealth = cash + Savings + current Broker portfolio value - outstanding loan debt. Old generic Investments balances are compatibility data and are migrated into Savings.',
  wealthProgress: 'Wealth progress measures gains beyond the 100g starting position rather than treating the starting purse as completed progress.',
  career: 'Career equals Dependability while employed. If you have no job, Career counts as 0 until you are hired again.',
  education: `Each completed degree is worth ${PLAYER_RULE_VALUES.educationPointsPerDegree} Education points. Courses normally require ${PLAYER_RULE_VALUES.baseStudySessions} sessions of ${PLAYER_RULE_VALUES.studyHoursPerSession} hours, reduced to as few as ${PLAYER_RULE_VALUES.minimumStudySessionsWithAllExtraCredit} with all extra-credit items.`,
  adventure: 'Adventure equals completed regular quests plus the number of different dungeon floors cleared. Bounties and quest-chain progress build reputation but do not directly add to this victory value.',
  newspaper: `Buy The Guildholm Herald at the General Store for a base price of ${PLAYER_RULE_VALUES.newspaperBaseCost}g, adjusted by the market. It opens on purchase and can be reread for free for the rest of that week.`,
  broker: 'The Broker is the active investment system. Buy and sell individual shares or Crown Bonds, receive weekly dividends, and keep fractional dividend credit until it reaches whole gold. Crown Bonds keep a fixed price and charge a 3% selling fee.',
  savings: 'Savings protect money from street theft and can earn weekly market-adjusted interest. Interest is paid in whole gold, so small balances may produce 0g in a week.',
  loans: `The Bank requires ${PLAYER_RULE_VALUES.loanMinimumShifts} lifetime work shifts before approving a loan. Only one loan can be active, it starts with ${PLAYER_RULE_VALUES.loanTermWeeks} weeks remaining, and its roughly ${asPercent(PLAYER_RULE_VALUES.baseLoanInterestRate)} base weekly interest changes with the market. Default triggers asset seizure and may leave wage garnishment.`,
  rent: `Rent is tracked in ${PLAYER_RULE_VALUES.rentInterval}-week cycles. The Slums cost ${PLAYER_RULE_VALUES.slumsRent}g per week and Noble Heights ${PLAYER_RULE_VALUES.nobleRent}g before a newly locked market rate. Long arrears add debt; eviction after ${PLAYER_RULE_VALUES.evictionAfterWeeks} overdue weeks destroys stored possessions and makes the player homeless.`,
  lottery: `Fortune's Wheel tickets are drawn at week end. Each ticket can win ${PLAYER_RULE_VALUES.lotterySmallPrize}g or the ${PLAYER_RULE_VALUES.lotteryGrandPrize}g grand prize; buying more tickets gives more independent chances, not a guaranteed payout.`,
  appliances: `Working appliances can break once you carry more than 500g. Enchanter goods break about 1 in 51 checks; used Market or Fence goods about 1 in 36. Repairs are chosen and paid later rather than charged automatically.`,
  aging: `With aging enabled, adventurers start at age ${PLAYER_RULE_VALUES.startingAge} and age one year every ${PLAYER_RULE_VALUES.ageIntervalWeeks} weeks.`,
} as const;

export function containsRetiredInvestmentAccountCopy(text: string): boolean {
  return /generic Investments|Investments account|Gold \+ Savings \+ Investments/i.test(text);
}
