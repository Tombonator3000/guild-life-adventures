import { useState, useCallback } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getMovementCost, getPath, getBothPaths, getLocation } from '@/data/locations';
import type { DirectionOption, MovementDirection } from '@/data/locations';
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

  // Direction choice state: when player clicks a location with two different paths
  const [directionChoice, setDirectionChoice] = useState<{
    destination: LocationId;
    options: DirectionOption[];
    weatherExtraCostPerStep: number;
  } | null>(null);

  // Execute movement with a specific direction choice
  const executeMovement = useCallback((
    playerId: string,
    destination: LocationId,
    chosenPath: LocationId[],
    weatherExtraCostPerStep: number,
    isPartial: boolean,
  ) => {
    const baseCost = chosenPath.length - 1; // steps = path length - 1
    const weatherExtraCost = baseCost > 0 ? baseCost * weatherExtraCostPerStep : 0;
    const moveCost = baseCost + weatherExtraCost;

    playSFX('footstep');
    if (isPartial) {
      startAnimation(playerId, destination, moveCost, chosenPath, true);
    } else {
      startAnimation(playerId, destination, moveCost, chosenPath);
    }
    if (isOnline) {
      broadcastMovement(playerId, chosenPath);
    }
    setDirectionChoice(null);
  }, [startAnimation, isOnline, broadcastMovement]);

  // Handle direction choice selection from the popup
  const chooseDirection = useCallback((direction: MovementDirection) => {
    if (!directionChoice || !currentPlayer) return;
    const option = directionChoice.options.find(o => o.direction === direction);
    if (!option) return;

    const weatherExtra = directionChoice.weatherExtraCostPerStep;
    const totalCost = option.distance + (option.distance > 0 ? option.distance * weatherExtra : 0);

    if (currentPlayer.timeRemaining >= totalCost) {
      // Full travel
      executeMovement(currentPlayer.id, directionChoice.destination, option.path, weatherExtra, false);
    } else if (currentPlayer.timeRemaining > 0) {
      // Partial travel
      const stepsCanTake = Math.floor(currentPlayer.timeRemaining / (1 + weatherExtra)) || Math.min(currentPlayer.timeRemaining, option.distance);
      if (stepsCanTake > 0 && option.path.length > 1) {
        const partialPath = option.path.slice(0, stepsCanTake + 1);
        const partialDest = partialPath[partialPath.length - 1];
        executeMovement(currentPlayer.id, partialDest, partialPath, weatherExtra, true);
      }
    } else {
      toast.error('No time remaining!');
      setDirectionChoice(null);
    }
  }, [directionChoice, currentPlayer, executeMovement]);

  // Cancel direction choice
  const cancelDirectionChoice = useCallback(() => {
    setDirectionChoice(null);
  }, []);

  const handleLocationClick = (locationId: string) => {
    if (!currentPlayer) return;

    // Cancel any pending direction choice if clicking elsewhere
    if (directionChoice && directionChoice.destination !== locationId) {
      setDirectionChoice(null);
    }

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
      // Travel to a different location — check for direction choice (Jones-style)
      const dest = locationId as LocationId;
      const from = currentPlayer.currentLocation as LocationId;
      const weatherExtraCostPerStep = (weather?.movementCostExtra) || 0;

      // Get both directional paths
      const options = getBothPaths(from, dest);

      if (options.length === 2 && options[0].distance !== options[1].distance) {
        // Different distances — show direction choice popup
        setDirectionChoice({ destination: dest, options, weatherExtraCostPerStep });
      } else {
        // Equal distance or single option — auto-use shortest (clockwise for ties)
        const travelPath = getPath(from, dest);
        const baseCost = travelPath.length - 1;
        const weatherExtraCost = baseCost > 0 ? baseCost * weatherExtraCostPerStep : 0;
        const moveCost = baseCost + weatherExtraCost;

        if (currentPlayer.timeRemaining >= moveCost) {
          playSFX('footstep');
          startAnimation(currentPlayer.id, dest, moveCost, travelPath);
          if (isOnline) broadcastMovement(currentPlayer.id, travelPath);
        } else if (currentPlayer.timeRemaining > 0) {
          const stepsCanTake = currentPlayer.timeRemaining;
          if (stepsCanTake > 0 && travelPath.length > 1) {
            const partialPath = travelPath.slice(0, stepsCanTake + 1);
            const partialDest = partialPath[partialPath.length - 1];
            startAnimation(currentPlayer.id, partialDest, currentPlayer.timeRemaining, partialPath, true);
            if (isOnline) broadcastMovement(currentPlayer.id, partialPath);
          } else {
            toast.error('No time remaining!');
          }
        } else {
          toast.error('No time remaining!');
        }
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

  return {
    handleLocationClick,
    currentEvent,
    directionChoice,
    chooseDirection,
    cancelDirectionChoice,
  };
}
