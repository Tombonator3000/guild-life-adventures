import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getMovementCost, getPath } from '@/data/locations';
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
}) {
  const {
    selectedLocation,
    selectLocation,
    week,
    eventMessage,
    weather,
  } = useGameStore();
  const currentPlayer = useCurrentPlayer();

  const handleLocationClick = (locationId: string) => {
    if (!currentPlayer) return;

    // During animation: allow the animating player to redirect to a new destination
    if (animatingPlayer) {
      if (animatingPlayer === currentPlayer.id && locationId !== currentPlayer.currentLocation) {
        // Recalculate path from original location (movePlayer hasn't been called yet)
        const baseMoveCost = getMovementCost(currentPlayer.currentLocation, locationId as LocationId);
        const travelPath = getPath(currentPlayer.currentLocation as LocationId, locationId as LocationId);
        const weatherExtraCost = (baseMoveCost > 0 && weather?.movementCostExtra)
          ? travelPath.length * weather.movementCostExtra
          : 0;
        const moveCost = baseMoveCost + weatherExtraCost;

        if (currentPlayer.timeRemaining >= moveCost) {
          playSFX('footstep');
          redirectAnimation(
            currentPlayer.id,
            locationId as LocationId,
            moveCost,
            travelPath,
          );
          if (isOnline) {
            broadcastMovement(currentPlayer.id, travelPath);
          }
        } else if (currentPlayer.timeRemaining > 0) {
          const fullPath = getPath(currentPlayer.currentLocation as LocationId, locationId as LocationId);
          const stepsCanTake = currentPlayer.timeRemaining;
          if (stepsCanTake > 0 && fullPath.length > 1) {
            const partialPath = fullPath.slice(0, stepsCanTake + 1);
            const partialDestination = partialPath[partialPath.length - 1];
            redirectAnimation(
              currentPlayer.id,
              partialDestination,
              currentPlayer.timeRemaining,
              partialPath,
              true,
            );
            if (isOnline) {
              broadcastMovement(currentPlayer.id, partialPath);
            }
          }
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
      // Travel directly to the location with animation
      const baseMoveCost = getMovementCost(currentPlayer.currentLocation, locationId as LocationId);
      const travelPath = getPath(currentPlayer.currentLocation as LocationId, locationId as LocationId);
      const weatherExtraCost = (baseMoveCost > 0 && weather?.movementCostExtra)
        ? travelPath.length * weather.movementCostExtra
        : 0;
      const moveCost = baseMoveCost + weatherExtraCost;

      if (currentPlayer.timeRemaining >= moveCost) {
        // Full travel: enough time to reach destination
        const path = getPath(currentPlayer.currentLocation as LocationId, locationId as LocationId);
        playSFX('footstep');

        startAnimation(
          currentPlayer.id,
          locationId as LocationId,
          moveCost,
          path,
        );
        if (isOnline) {
          broadcastMovement(currentPlayer.id, path);
        }
      } else if (currentPlayer.timeRemaining > 0) {
        // Partial travel: not enough time, but has some hours left
        // Walk as far as possible along the path, then end turn
        const fullPath = getPath(currentPlayer.currentLocation as LocationId, locationId as LocationId);
        const stepsCanTake = currentPlayer.timeRemaining; // Each step costs 1 hour

        if (stepsCanTake > 0 && fullPath.length > 1) {
          // Take only the steps we can afford (path includes starting location at index 0)
          const partialPath = fullPath.slice(0, stepsCanTake + 1);
          const partialDestination = partialPath[partialPath.length - 1];

          startAnimation(
            currentPlayer.id,
            partialDestination,
            currentPlayer.timeRemaining, // Spend all remaining time
            partialPath,
            true, // isPartial
          );
          if (isOnline) {
            broadcastMovement(currentPlayer.id, partialPath);
          }
        } else {
          toast.error('No time remaining!');
        }
      } else {
        // No time at all
        toast.error('No time remaining!');
      }
    }
  };

  // Extract event ID from message text via embedded tag or keyword matching
  const extractEventId = (msg: string): string => {
    // Check for embedded travel event ID: [event-id] Travel Event: ...
    const idMatch = msg.match(/^\[([a-z0-9-]+)\]/);
    if (idMatch) return idMatch[1];

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
    if (msg.includes('Weather:') && msg.includes('snow')) return 'snowstorm';
    if (msg.includes('Weather:') && msg.includes('thunder')) return 'thunderstorm';
    if (msg.includes('Weather:') && msg.includes('drought')) return 'drought';
    if (msg.includes('Weather:') && msg.includes('rain')) return 'harvest-rain';
    if (msg.includes('Weather:') && msg.includes('fog')) return 'enchanted-fog';
    if (msg.includes('lottery')) return 'lottery-win';
    if (msg.includes('birthday')) return 'birthday';
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
  const cleanMessage = eventMessage?.replace(/^\[[a-z0-9-]+\]\s*/, '') ?? null;
  const currentEvent: GameEvent | null = eventMessage ? {
    id: extractEventId(eventMessage),
    title: 'Week ' + week + ' Events',
    description: cleanMessage!,
    type: extractEventType(eventMessage),
  } : null;

  return { handleLocationClick, currentEvent };
}
