// Network types for online multiplayer

import type { GameState, GoalSettings, AIDifficulty, LocationId } from '@/types/game.types';

// --- Lobby Types ---

export interface LobbyPlayer {
  peerId: string;
  name: string;
  color: string;
  isReady: boolean;
  slot: number; // Player slot index (0-3)
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

// --- Network Messages ---

// Host → Guest messages
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
  | { type: 'turn-timeout'; playerId: string };

// Guest → Host messages
export type GuestMessage =
  | { type: 'join'; playerName: string }
  | { type: 'reconnect'; playerName: string }
  | { type: 'ready'; isReady: boolean }
  | { type: 'action'; requestId: string; name: string; args: unknown[] }
  | { type: 'ping'; timestamp: number }
  | { type: 'leave' }
  | { type: 'movement-start'; playerId: string; path: LocationId[] };

export type NetworkMessage = HostMessage | GuestMessage;

// --- Serialized State ---

// GameState without functions — only data fields, plus extra sync fields
export interface SerializedGameState extends GameState {
  shadowfingersEvent?: unknown;
  applianceBreakageEvent?: unknown;
}

// --- Connection Status ---

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
  latency: number; // ms
}

// --- Network Store State ---

export interface NetworkState {
  networkMode: 'local' | 'host' | 'guest';
  localPlayerId: string | null;
  roomCode: string | null;
  connectionStatus: ConnectionStatus;
  connectedPeers: PeerConnectionInfo[];
}

// Actions that should NOT be forwarded to host (local UI only)
export const LOCAL_ONLY_ACTIONS = new Set([
  'selectLocation',
  'dismissEvent',
  'dismissShadowfingersEvent',
  'dismissApplianceBreakageEvent',
  'dismissWeekendEvent',
  'setEventMessage',
  'setShowTutorial',
  'setTutorialStep',
  'setAISpeedMultiplier',
  'setSkipAITurn',
  'saveToSlot',
  'loadFromSlot',
  'setPhase',
]);

// Actions that are host-internal (triggered by game logic, not by player UI).
// These are BLOCKED on guests — not forwarded, not executed locally.
export const HOST_INTERNAL_ACTIONS = new Set([
  'startTurn',
  'processWeekEnd',
  'checkDeath',
  'checkVictory',
  'evictPlayer',
  'promoteGuildRank',
  'startNewGame',
]);

// Explicit whitelist of actions a guest may send to the host.
// Any action NOT in this set will be rejected by the host's action handler.
// This prevents guests from calling internal/dangerous actions by name.
export const ALLOWED_GUEST_ACTIONS = new Set([
  // Movement & turn flow
  'movePlayer',
  'spendTime',
  'endTurn',

  // Player state changes
  'modifyGold',
  'modifyHealth',
  'modifyHappiness',
  'modifyFood',
  'modifyClothing',
  'modifyMaxHealth',
  'modifyRelaxation',
  'cureSickness',

  // Housing
  'setHousing',
  'payRent',
  'prepayRent',
  'moveToHousing',

  // Work & Education
  'setJob',
  'workShift',
  'requestRaise',
  'negotiateRaise',
  'studySession',
  'completeEducationLevel',
  'studyDegree',
  'completeDegree',

  // Economy & Shopping
  'depositToBank',
  'withdrawFromBank',
  'invest',
  'withdrawInvestment',
  'buyItem',
  'sellItem',
  'buyDurable',
  'sellDurable',
  'buyAppliance',
  'repairAppliance',
  'pawnAppliance',
  'equipItem',
  'unequipItem',

  // Stocks & Loans
  'buyStock',
  'sellStock',
  'takeLoan',
  'repayLoan',

  // Food & Items
  'buyFreshFood',
  'buyLotteryTicket',
  'buyTicket',

  // Quests & Dungeon
  'buyGuildPass',
  'takeQuest',
  'completeQuest',
  'abandonQuest',
  'clearDungeonFloor',
  'applyRareDrop',
]);
