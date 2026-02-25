import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getPath } from '@/data/locations';
import { type GameEvent } from '@/components/game/EventModal';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';
import { playSFX } from '@/audio/sfxManager';

/** Calculate weather-adjusted movement cost for a given number of steps */
function calculateWeatherCost(steps: number, weatherExtraCostPerStep: number): number {
  return steps + Math.floor(steps * weatherExtraCostPerStep);
}

/** Attempt partial travel: calculate max steps affordable and return partial path, or null if can't move */
function calculatePartialTravel(
  path: LocationId[],
  timeAvailable: number,
  weatherExtraCostPerStep: number,
): { partialPath: LocationId[]; partialDest: LocationId; partialCost: number } | null {
  const totalSteps = path.length - 1;
  if (totalSteps <= 0 || timeAvailable <= 0) return null;
  const costPerStep = 1 + weatherExtraCostPerStep;
  const stepsCanTake = Math.floor(timeAvailable / costPerStep) || Math.min(timeAvailable, totalSteps);
  if (stepsCanTake <= 0 || path.length <= 1) return null;
  const partialPath = path.slice(0, stepsCanTake + 1);
  return {
    partialPath,
    partialDest: partialPath[partialPath.length - 1],
    partialCost: calculateWeatherCost(stepsCanTake, weatherExtraCostPerStep),
  };
}

/** Data-driven event ID detection from message text */
const WEATHER_EVENT_MAP: [string, string][] = [
  ['snow', 'snowstorm'], ['thunder', 'thunderstorm'], ['drought', 'drought'],
  ['rain', 'harvest-rain'], ['fog', 'enchanted-fog'],
];
const FESTIVAL_EVENT_MAP: [string, string][] = [
  ['Harvest Festival', 'harvest-festival'], ['Winter Solstice', 'winter-solstice'],
  ['Spring Tournament', 'spring-tournament'], ['Midsummer Fair', 'midsummer-fair'],
];
const KEYWORD_EVENT_MAP: [string, string][] = [
  ['Shadowfingers', 'shadowfingers-theft'], ['evicted', 'eviction'],
  ['starving', 'starvation'], ['food poisoning', 'food-poisoning'],
  ['fallen ill', 'illness'], ['food spoiled', 'food-poisoning'],
  ['exhausted', 'illness'], ['slept on the streets', 'homeless'],
  ['fired', 'layoff'], ['Rent is overdue', 'eviction'],
  ['gear stolen', 'apartment-robbery'], ['Arcane Tome', 'lucky-find'],
  ['lottery', 'lottery-win'], ['birthday', 'birthday'],
];
const CLOTHING_KEYWORD: [string, string][] = [['clothing', 'poor condition']];

export function useLocationClick({
  animatingPlayer,
  isOnline,
  isLocalPlayerTurn,
  startAnimation,
  redirectAnimation,
  broadcastMovement,
  getCurrentIntermediateLocation,
  getAccumulatedSteps,
}: {
  animatingPlayer: string | null;
  isOnline: boolean;
  isLocalPlayerTurn: boolean;
  startAnimation: (
    playerId: string,
    destination: LocationId,
    moveCost: number,
    path: LocationId[],
    isPartial?: boolean,
  ) => void;
  redirectAnimation: (
    playerId: string,
    destination: LocationId,
    moveCost: number,
    path: LocationId[],
    isPartial?: boolean,
  ) => void;
  broadcastMovement: (playerId: string, path: LocationId[]) => void;
  getCurrentIntermediateLocation: () => LocationId | null;
  getAccumulatedSteps: () => number;
}) {
  const {
    selectedLocation,
    selectLocation,
    week,
    eventMessage,
    eventSource,
    phase,
    dismissEvent,
    weather,
  } = useGameStore();
  const currentPlayer = useCurrentPlayer();

  const handleLocationClick = (locationId: string) => {
    if (!currentPlayer) return;

    // Auto-dismiss event notifications when clicking any location
    if (phase === 'event' && eventMessage) {
      dismissEvent();
      return;
    }

    const weatherExtra = (weather?.movementCostExtra) || 0;

    // During animation: allow the animating player to redirect to a new destination
    if (animatingPlayer) {
      if (animatingPlayer === currentPlayer.id && locationId !== currentPlayer.currentLocation) {
        const intermediateLocation = getCurrentIntermediateLocation();
        if (!intermediateLocation || locationId === intermediateLocation) return;

        const dest = locationId as LocationId;
        const accumulatedTimeCost = calculateWeatherCost(getAccumulatedSteps(), weatherExtra);
        const newPath = getPath(intermediateLocation, dest);
        const totalTimeCost = accumulatedTimeCost + calculateWeatherCost(newPath.length - 1, weatherExtra);

        if (currentPlayer.timeRemaining >= totalTimeCost) {
          playSFX('footstep');
          redirectAnimation(currentPlayer.id, dest, totalTimeCost, newPath);
          if (isOnline) broadcastMovement(currentPlayer.id, newPath);
        } else if (currentPlayer.timeRemaining > accumulatedTimeCost) {
          const partial = calculatePartialTravel(newPath, currentPlayer.timeRemaining - accumulatedTimeCost, weatherExtra);
          if (partial) {
            redirectAnimation(currentPlayer.id, partial.partialDest, accumulatedTimeCost + partial.partialCost, partial.partialPath, true);
            if (isOnline) broadcastMovement(currentPlayer.id, partial.partialPath);
          }
        } else {
          toast.error('No time remaining!');
        }
      }
      return;
    }

    // Online mode: spectators can select locations to view info
    if (isOnline && !isLocalPlayerTurn) {
      selectLocation(selectedLocation === locationId ? null : locationId as LocationId);
      return;
    }

    // At current location: toggle panel
    if (currentPlayer.currentLocation === locationId) {
      if (selectedLocation === locationId) {
        selectLocation(null);
      } else {
        playSFX('door-open');
        selectLocation(locationId as LocationId);
      }
      return;
    }

    // Travel to a different location
    const dest = locationId as LocationId;
    const travelPath = getPath(currentPlayer.currentLocation as LocationId, dest);
    const moveCost = calculateWeatherCost(travelPath.length - 1, weatherExtra);

    if (currentPlayer.timeRemaining >= moveCost) {
      playSFX('footstep');
      startAnimation(currentPlayer.id, dest, moveCost, travelPath);
      if (isOnline) broadcastMovement(currentPlayer.id, travelPath);
    } else if (currentPlayer.timeRemaining > 0) {
      const partial = calculatePartialTravel(travelPath, currentPlayer.timeRemaining, weatherExtra);
      if (partial) {
        startAnimation(currentPlayer.id, partial.partialDest, partial.partialCost, partial.partialPath, true);
        if (isOnline) broadcastMovement(currentPlayer.id, partial.partialPath);
      } else {
        toast.error('No time remaining!');
      }
    } else {
      toast.error('No time remaining!');
    }
  };

  // Extract event ID from message text via embedded tag or data-driven keyword matching
  const extractEventId = (msg: string): string => {
    // Embedded ID tag takes highest priority: [event-id] Travel Event: ...
    const questObjMatch = msg.match(/^\[quest-objective:([a-z0-9:-]+)\]/);
    if (questObjMatch) return questObjMatch[1];
    const idMatch = msg.match(/^\[([a-z0-9-]+)\]/);
    if (idMatch) return idMatch[1];

    // Weather graphics (require "Weather:" prefix + keyword)
    if (msg.includes('Weather:')) {
      for (const [keyword, eventId] of WEATHER_EVENT_MAP) {
        if (msg.includes(keyword)) return eventId;
      }
    }

    // Festival graphics
    for (const [keyword, eventId] of FESTIVAL_EVENT_MAP) {
      if (msg.includes(keyword)) return eventId;
    }

    // Clothing has a two-keyword check
    if (CLOTHING_KEYWORD.every(([a, b]) => msg.includes(a) && msg.includes(b))) return 'clothing-torn';

    // Single-keyword events
    for (const [keyword, eventId] of KEYWORD_EVENT_MAP) {
      if (msg.includes(keyword)) return eventId;
    }

    // Weekend activity ID embedded in multi-line messages
    const weekendMatch = msg.match(/\[(rw-[a-z-]+|ticket-[a-z-]+|scrying-weekend|memory-weekend|music-weekend|cooking-weekend|study-weekend)\]/);
    if (weekendMatch) return weekendMatch[1];

    return 'weekly-event';
  };

  const extractEventType = (msg: string): GameEvent['type'] => {
    if (msg.includes('evicted') || msg.includes('Rent is overdue')) return 'eviction';
    if (msg.includes('Shadowfingers') || msg.includes('gear stolen')) return 'theft';
    if (msg.includes('starving') || msg.includes('food spoiled')) return 'starvation';
    if (msg.includes('ill') || msg.includes('food poisoning') || msg.includes('exhausted')) return 'sickness';
    if (msg.includes('lottery') || msg.includes('Arcane Tome') || msg.includes('birthday')) return 'bonus';
    if (msg.includes('quest-chain-complete')) return 'bonus';
    if (msg.includes('quest-objective')) return 'bonus';
    return 'info';
  };

  // Convert eventMessage to GameEvent format
  // Strip embedded ID tag from display text
  const cleanMessage = eventMessage?.replace(/\[[a-z0-9:-]+\]\s*/g, '') ?? null;
  // Title depends on event source: weekend processing vs gameplay events
  const eventTitle = eventSource === 'weekend'
    ? 'WEEKEND EVENTS'
    : eventMessage?.includes('[quest-chain-complete]')
      ? 'QUEST CHAIN COMPLETE!'
      : eventMessage?.includes('[quest-objective]')
        ? 'QUEST EVENT'
        : `WEEK ${week} EVENT`;
  const currentEvent: GameEvent | null = eventMessage ? {
    id: extractEventId(eventMessage),
    title: eventTitle,
    description: cleanMessage!,
    type: extractEventType(eventMessage),
  } : null;

  return {
    handleLocationClick,
    currentEvent,
  };
}
