// Network types for online multiplayer

import type { GameState, GoalSettings, AIDifficulty, LocationId } from '@/types/game.types';

export interface LobbyPlayer {
  peerId: string;
  name: string;
  color: string;
  isReady: boolean;
  slot: number;
  portraitId?: string | null;
}

export interface LobbyState {
  roomCode: string;
  hostName: string;
  players: LobbyPlayer[];
  settings: OnlineGameSettings;
}

export interface OnlineGameSettings {
  goals: GoalSettings;
  includeAI: boolean;
  aiDifficulty: AIDifficulty;
}

export interface ChatMessage {
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
}

export type HostMessage =
  | { type: 'lobby-update'; lobby: LobbyState }
  | { type: 'game-start'; gameState: SerializedGameState; lobby: LobbyState }
  | { type: 'state-sync'; gameState: SerializedGameState }
  | { type: 'action-result'; requestId: string; success: boolean; error?: string }
  | { type: 'player-disconnected'; playerName: string; temporary?: boolean }
  | { type: 'player-reconnected'; playerName: string }
  | { type: 'kicked'; reason: string }
  | { type: 'pong'; timestamp: number }
  | { type: 'movement-animation'; playerId: string; path: LocationId[] }
  | { type: 'turn-timeout'; playerId: string }
  | { type: 'host-migrated'; newHostPeerId: string; gameState: SerializedGameState }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'discovery-info'; hostName: string; playerCount: number; maxPlayers: number; hasAI: boolean; isStarted: boolean }
  | { type: 'spectator-accepted'; spectatorCount: number };

export type GuestMessage =
  | { type: 'join'; playerName: string }
  | { type: 'reconnect'; playerName: string }
  | { type: 'ready'; isReady: boolean }
  | { type: 'action'; requestId: string; name: string; args: unknown[] }
  | { type: 'ping'; timestamp: number }
  | { type: 'leave' }
  | { type: 'portrait-select'; portraitId: string | null }
  | { type: 'name-change'; newName: string }
  | { type: 'movement-start'; playerId: string; path: LocationId[] }
  | { type: 'chat-message'; message: ChatMessage }
  | { type: 'discovery-probe' }
  | { type: 'spectate'; spectatorName: string };

export type NetworkMessage = HostMessage | GuestMessage;

export interface SerializedGameState extends GameState {
  shadowfingersEvent?: unknown;
  applianceBreakageEvent?: {
    playerId: string;
    applianceId: string;
    repairCost: number;
    originalPrice?: number;
    fromCurse?: boolean;
    curserName?: string;
  } | null;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface PeerConnectionInfo {
  peerId: string;
  playerName: string;
  status: ConnectionStatus;
  latency: number;
}

export interface NetworkState {
  networkMode: 'local' | 'host' | 'guest';
  localPlayerId: string | null;
  roomCode: string | null;
  connectionStatus: ConnectionStatus;
  connectedPeers: PeerConnectionInfo[];
}

export const LOCAL_ONLY_ACTIONS = new Set([
  'selectLocation',
  'dismissEvent',
  'dismissShadowfingersEvent',
  'dismissApplianceBreakageEvent',
  'dismissWeekendEvent',
  'dismissDeathEvent',
  'setEventMessage',
  'setShowTutorial',
  'setTutorialStep',
  'setAISpeedMultiplier',
  'setSkipAITurn',
  'saveToSlot',
  'loadFromSlot',
  'setPhase',
  'setDebugWeather',
  'setDebugFestival',
]);

export const HOST_INTERNAL_ACTIONS = new Set([
  'startTurn',
  'processWeekEnd',
  'checkDeath',
  'checkVictory',
  'evictPlayer',
  'promoteGuildRank',
  'startNewGame',
]);

export const ALLOWED_GUEST_ACTIONS = new Set([
  'travelPlayer',
  'spendTime',
  'endTurn',

  // Legacy raw mutations still used by older UI flows. Keep bounded by
  // STAT_MODIFIER_RULES until each remaining caller is migrated.
  'modifyGold',
  'modifyHealth',
  'modifyHappiness',
  'modifyFood',
  'modifyClothing',
  'modifyMaxHealth',
  'modifyRelaxation',
  'cureSickness',

  // Housing intent only. Host resolves office access, canonical price and time.
  'payHousingRent',
  'moveHousingAtLandlord',
  'requestRentExtensionAtLandlord',

  'requestRaise',
  'acceptJobOffer',
  'acceptMarketRaise',

  // Semantic employment/education actions. Host resolves wage, time,
  // price, prerequisites, progress and graduation eligibility.
  'performWorkShift',
  'attendDegreeSession',
  'prepayDegree',
  'graduateDegree',

  // Finance intent only. Host validates Bank location, balances, products and live prices.
  'transferBankFunds',
  'manageInvestment',
  // Inventory sale intent only. Host resolves ownership, location and price.
  'sellInventoryItem',
  // Equipment intent only. Host resolves catalogue, price, durability and service values.
  'purchaseEquipmentItem',
  'useEquipmentService',
  // Appliance intent only. Host resolves vendor, price, source and service cost.
  'purchaseAppliance',
  'useApplianceService',
  'equipItem',
  'unequipItem',

  'applyDurabilityLoss',

  'tradeStock',
  'manageLoan',

  // Vendor intent only. Host resolves catalogue, price, discount and effect.
  'purchaseVendorItem',

  'buyGuildPass',
  'takeQuest',
  'takeChainQuest',
  'takeNonLinearChain',
  'completeNonLinearChainStep',
  'makeNLChainChoice',
  'takeBounty',
  'completeQuest',
  'completeLocationObjective',
  'completeBounty',
  'completeChainQuest',
  'abandonQuest',
  'incrementDungeonAttempts',

  // Hex intent only. Host resolves stock, price, target location and service effects.
  'purchaseHexScroll',
  'useHexDefense',
  'useGraveyardHexService',
  // Casting already validates scroll ownership, target, location, time and cooldown on the host.
  'castLocationHex',
  'castPersonalCurse',

  'sabotagePlayer',
  'buyProtection',
  'buyTipOff',
  'purchaseReputationUnlock',

  // Canonical, atomic services. The host looks up price, time and effect.
  'useHealerService',
  'useGraveyardService',
  'gambleAtFence',
  'purchaseNewspaper',
]);
