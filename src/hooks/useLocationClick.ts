import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getPath } from '@/data/locations';
import { type GameEvent } from '@/components/game/EventModal';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';
import { playSFX } from '@/audio/sfxManager';

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

    const weatherExtraCostPerStep = (weather?.movementCostExtra) || 0;

    // During animation: allow the animating player to redirect to a new destination
    if (animatingPlayer) {
      if (animatingPlayer === currentPlayer.id && locationId !== currentPlayer.currentLocation) {
        // Get the intermediate location where the player currently is
        const intermediateLocation = getCurrentIntermediateLocation();
        if (!intermediateLocation) return;

        // If clicking the location we're currently at, ignore
        if (locationId === intermediateLocation) return;

        const dest = locationId as LocationId;
        const accumulatedSteps = getAccumulatedSteps();
        const accumulatedTimeCost = accumulatedSteps + Math.floor(accumulatedSteps * weatherExtraCostPerStep);

        // Calculate new path from intermediate location to new destination (shortest)
        const newPath = getPath(intermediateLocation, dest);
        const newSteps = newPath.length - 1;
        const newTimeCost = newSteps + Math.floor(newSteps * weatherExtraCostPerStep);
        const totalTimeCost = accumulatedTimeCost + newTimeCost;

        if (currentPlayer.timeRemaining >= totalTimeCost) {
          // Full redirect travel
          playSFX('footstep');
          redirectAnimation(currentPlayer.id, dest, totalTimeCost, newPath);
          if (isOnline) broadcastMovement(currentPlayer.id, newPath);
        } else if (currentPlayer.timeRemaining > accumulatedTimeCost) {
          // Partial redirect: can take some steps toward new destination
          const remainingTime = currentPlayer.timeRemaining - accumulatedTimeCost;
          const costPerStep = 1 + weatherExtraCostPerStep;
          const stepsCanTake = Math.floor(remainingTime / costPerStep) || Math.min(remainingTime, newSteps);
          if (stepsCanTake > 0 && newPath.length > 1) {
            const partialPath = newPath.slice(0, stepsCanTake + 1);
            const partialDest = partialPath[partialPath.length - 1];
            const partialNewCost = stepsCanTake + Math.floor(stepsCanTake * weatherExtraCostPerStep);
            redirectAnimation(
              currentPlayer.id,
              partialDest,
              accumulatedTimeCost + partialNewCost,
              partialPath,
              true,
            );
            if (isOnline) broadcastMovement(currentPlayer.id, partialPath);
          }
        } else {
          toast.error('No time remaining!');
        }
      }
      return;
    }

    // Online mode: only allow clicks when it's this client's turn
    if (isOnline && !isLocalPlayerTurn) {
      // In spectator mode, allow selecting locations to view info
      if (selectedLocation === locationId) {
        selectLocation(null);
      } else {
        selectLocation(locationId as LocationId);
      }
      return;
    }

    const isCurrentLocation = currentPlayer.currentLocation === locationId;

    if (isCurrentLocation) {
      // If already here, toggle the location panel
      if (selectedLocation === locationId) {
        selectLocation(null);
      } else {
        playSFX('door-open');
        selectLocation(locationId as LocationId);
      }
    } else {
      // Travel to a different location — always use shortest path, no direction popup
      const dest = locationId as LocationId;
      const from = currentPlayer.currentLocation as LocationId;

      const travelPath = getPath(from, dest);
      const baseCost = travelPath.length - 1;
      const weatherExtraCost = baseCost > 0 ? Math.floor(baseCost * weatherExtraCostPerStep) : 0;
      const moveCost = baseCost + weatherExtraCost;

      if (currentPlayer.timeRemaining >= moveCost) {
        playSFX('footstep');
        startAnimation(currentPlayer.id, dest, moveCost, travelPath);
        if (isOnline) broadcastMovement(currentPlayer.id, travelPath);
      } else if (currentPlayer.timeRemaining > 0) {
        const costPerStep = 1 + weatherExtraCostPerStep;
        const stepsCanTake = Math.floor(currentPlayer.timeRemaining / costPerStep) || Math.min(currentPlayer.timeRemaining, baseCost);
        if (stepsCanTake > 0 && travelPath.length > 1) {
          const partialPath = travelPath.slice(0, stepsCanTake + 1);
          const partialDest = partialPath[partialPath.length - 1];
          const partialCost = stepsCanTake + Math.floor(stepsCanTake * weatherExtraCostPerStep);
          startAnimation(currentPlayer.id, partialDest, partialCost, partialPath, true);
          if (isOnline) broadcastMovement(currentPlayer.id, partialPath);
        } else {
          toast.error('No time remaining!');
        }
      } else {
        toast.error('No time remaining!');
      }
    }
  };

  // Extract event ID from message text via embedded tag or keyword matching
  const extractEventId = (msg: string): string => {
    // Check for embedded travel event ID: [event-id] Travel Event: ...
    const idMatch = msg.match(/^\[([a-z0-9-]+)\]/);
    if (idMatch) return idMatch[1];

    // Weather graphics get FIRST priority — display weather woodcut over other events
    if (msg.includes('Weather:') && msg.includes('snow')) return 'snowstorm';
    if (msg.includes('Weather:') && msg.includes('thunder')) return 'thunderstorm';
    if (msg.includes('Weather:') && msg.includes('drought')) return 'drought';
    if (msg.includes('Weather:') && msg.includes('rain')) return 'harvest-rain';
    if (msg.includes('Weather:') && msg.includes('fog')) return 'enchanted-fog';

    // Festival graphics get second priority
    if (msg.includes('Harvest Festival')) return 'harvest-festival';
    if (msg.includes('Winter Solstice')) return 'winter-solstice';
    if (msg.includes('Spring Tournament')) return 'spring-tournament';
    if (msg.includes('Midsummer Fair')) return 'midsummer-fair';

    // Keyword-based detection for weekly/turn events
    if (msg.includes('Shadowfingers')) return 'shadowfingers-theft';
    if (msg.includes('evicted')) return 'eviction';
    if (msg.includes('starving')) return 'starvation';
    if (msg.includes('food poisoning')) return 'food-poisoning';
    if (msg.includes('fallen ill')) return 'illness';
    if (msg.includes('food spoiled')) return 'food-poisoning';
    if (msg.includes('exhausted')) return 'illness';
    if (msg.includes('slept on the streets')) return 'homeless';
    if (msg.includes('clothing') && msg.includes('poor condition')) return 'clothing-torn';
    if (msg.includes('fired')) return 'layoff';
    if (msg.includes('Rent is overdue')) return 'eviction';
    if (msg.includes('gear stolen')) return 'apartment-robbery';
    if (msg.includes('Arcane Tome')) return 'lucky-find';
    if (msg.includes('lottery')) return 'lottery-win';
    if (msg.includes('birthday')) return 'birthday';

    // Weekend activity ID embedded anywhere in multi-line message: [rw-nap], [ticket-jousting], etc.
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
    return 'info';
  };

  // Convert eventMessage to GameEvent format
  // Strip embedded ID tag from display text
  const cleanMessage = eventMessage?.replace(/\[[a-z0-9-]+\]\s*/g, '') ?? null;
  // Title depends on event source: weekend processing vs gameplay events
  const eventTitle = eventSource === 'weekend'
    ? 'WEEKEND EVENTS'
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
