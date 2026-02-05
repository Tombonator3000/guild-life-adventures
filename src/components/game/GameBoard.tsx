import { useState, useEffect, useCallback } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { LOCATIONS, getMovementCost, ZONE_CONFIGS } from '@/data/locations';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { EventModal, type GameEvent } from './EventModal';
import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';
import { ZoneEditor, type CenterPanelConfig } from './ZoneEditor';
import { PlayerInfoPanel } from './PlayerInfoPanel';
import { TurnOrderPanel } from './TurnOrderPanel';
import gameBoard from '@/assets/game-board.jpeg';
import type { ZoneConfig, LocationId } from '@/types/game.types';
import { toast } from 'sonner';

const DEFAULT_CENTER_PANEL: CenterPanelConfig = {
  top: 23.4,
  left: 26.7,
  width: 46.5,
  height: 53.4,
};

export function GameBoard() {
  const {
    players,
    selectedLocation,
    selectLocation,
    week,
    priceModifier,
    eventMessage,
    dismissEvent,
    phase,
    currentPlayerIndex,
    goalSettings,
    movePlayer,
    endTurn,
    checkDeath,
    setEventMessage,
    setPhase,
  } = useGameStore();
  const { event: shadowfingersEvent, dismiss: dismissShadowfingers } = useShadowfingersModal();
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [customZones, setCustomZones] = useState<ZoneConfig[]>(ZONE_CONFIGS);
  const [centerPanel, setCenterPanel] = useState<CenterPanelConfig>(DEFAULT_CENTER_PANEL);

  // Keyboard shortcut: Ctrl+Shift+Z to toggle zone editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        setShowZoneEditor(prev => !prev);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugOverlay(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveZones = (zones: ZoneConfig[], newCenterPanel: CenterPanelConfig) => {
    setCustomZones(zones);
    setCenterPanel(newCenterPanel);
    setShowZoneEditor(false);
    console.log('Zones updated. Copy this config to locations.ts:', zones);
    console.log('Center panel updated:', newCenterPanel);
  };

  // Get location with custom zones applied
  const getLocationWithCustomPosition = (locationId: string) => {
    const location = LOCATIONS.find(l => l.id === locationId);
    const customZone = customZones.find(z => z.id === locationId);
    if (location && customZone) {
      return {
        ...location,
        position: {
          top: `${customZone.y}%`,
          left: `${customZone.x}%`,
          width: `${customZone.width}%`,
          height: `${customZone.height}%`,
        },
      };
    }
    return location;
  };
  const currentPlayer = useCurrentPlayer();

  // Check if player should auto-return to housing when time runs out
  const checkAutoReturn = useCallback(() => {
    if (!currentPlayer) return;

    // Check for death first
    if (currentPlayer.health <= 0) {
      const isDead = checkDeath(currentPlayer.id);
      if (isDead) {
        setEventMessage(`${currentPlayer.name} has died! Game over for this player.`);
        setPhase('event');
        // Move to next player's turn after death
        setTimeout(() => {
          endTurn();
        }, 100);
        return true;
      }
    }

    // Check if time has run out
    if (currentPlayer.timeRemaining <= 0) {
      // Get player's home location based on housing
      const homeLocation: LocationId = currentPlayer.housing === 'noble' ? 'noble-heights' : 'slums';

      // Only move if not already at home
      if (currentPlayer.currentLocation !== homeLocation) {
        toast.info(`${currentPlayer.name}'s time is up! Returning home...`);
      }

      // End turn automatically
      setTimeout(() => {
        endTurn();
      }, 500);
      return true;
    }

    return false;
  }, [currentPlayer, checkDeath, setEventMessage, setPhase, endTurn]);

  // Monitor time and health changes
  useEffect(() => {
    if (currentPlayer && phase === 'playing') {
      checkAutoReturn();
    }
  }, [currentPlayer?.timeRemaining, currentPlayer?.health, phase, checkAutoReturn]);

  // Direct travel on location click (instead of showing travel button)
  const handleLocationClick = (locationId: string) => {
    if (!currentPlayer) return;

    const isCurrentLocation = currentPlayer.currentLocation === locationId;

    if (isCurrentLocation) {
      // If already here, toggle the location panel
      if (selectedLocation === locationId) {
        selectLocation(null);
      } else {
        selectLocation(locationId as LocationId);
      }
    } else {
      // Travel directly to the location
      const moveCost = getMovementCost(currentPlayer.currentLocation, locationId as LocationId);

      if (currentPlayer.timeRemaining >= moveCost) {
        // Move player directly
        movePlayer(currentPlayer.id, locationId as LocationId, moveCost);
        selectLocation(locationId as LocationId);
        toast.success(`Traveled to ${LOCATIONS.find(l => l.id === locationId)?.name}`);
      } else {
        // Not enough time
        toast.error('Not enough time to travel there!');
        selectLocation(locationId as LocationId); // Still show the location panel
      }
    }
  };

  // Convert eventMessage to GameEvent format
  const currentEvent: GameEvent | null = eventMessage ? {
    id: 'weekly-event',
    title: 'Week ' + week + ' Events',
    description: eventMessage,
    type: eventMessage.includes('evicted') ? 'eviction' :
          eventMessage.includes('Shadowfingers') ? 'theft' :
          eventMessage.includes('starving') ? 'starvation' :
          eventMessage.includes('ill') ? 'sickness' :
          'info',
  } : null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-background flex items-center justify-center">
      {/* Left Side Panel - Player Info */}
      <div className="absolute left-0 top-0 bottom-0 w-[180px] z-30 p-2 flex flex-col">
        {currentPlayer && (
          <PlayerInfoPanel
            player={currentPlayer}
            isCurrentPlayer={true}
          />
        )}
      </div>

      {/* Right Side Panel - Turn Order */}
      <div className="absolute right-0 top-0 bottom-0 w-[180px] z-30 p-2 flex flex-col">
        <TurnOrderPanel
          players={players}
          currentPlayerIndex={currentPlayerIndex}
          week={week}
          priceModifier={priceModifier}
          goalSettings={goalSettings}
        />
      </div>

      {/* Game board container - maintains aspect ratio, with padding for side panels */}
      <div className="relative w-full h-full max-w-[177.78vh] max-h-[56.25vw] mx-[180px]">
        {/* Game board background */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${gameBoard})` }}
        />

        {/* Location zones overlay */}
        <div className="absolute inset-0">
          {LOCATIONS.map((baseLocation) => {
            const location = getLocationWithCustomPosition(baseLocation.id) || baseLocation;
            const playersHere = players.filter(p => p.currentLocation === location.id);
            const moveCost = currentPlayer
              ? getMovementCost(currentPlayer.currentLocation, location.id)
              : 0;
            const isCurrentLocation = currentPlayer?.currentLocation === location.id;

            return (
              <LocationZone
                key={location.id}
                location={location}
                isSelected={selectedLocation === location.id}
                isCurrentLocation={isCurrentLocation}
                moveCost={moveCost}
                onClick={() => handleLocationClick(location.id)}
              >
                {playersHere.map((player, index) => (
                  <PlayerToken
                    key={player.id}
                    player={player}
                    index={index}
                    isCurrent={player.id === currentPlayer?.id}
                  />
                ))}
              </LocationZone>
            );
          })}
        </div>

        {/* Debug overlay - shows zone boundaries */}
        {showDebugOverlay && (
          <div className="absolute inset-0 pointer-events-none z-5">
            {customZones.map(zone => (
              <div
                key={zone.id}
                className="absolute border-2 border-red-500/70 bg-red-500/10"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                }}
              >
                <span className="text-xs text-red-400 bg-black/70 px-1">
                  {zone.id}
                </span>
              </div>
            ))}
            {/* Center panel outline */}
            <div
              className="absolute border-2 border-yellow-400 bg-yellow-400/10"
              style={{
                top: `${centerPanel.top}%`,
                left: `${centerPanel.left}%`,
                width: `${centerPanel.width}%`,
                height: `${centerPanel.height}%`,
              }}
            >
              <span className="text-xs text-yellow-400 bg-black/70 px-1">
                CENTER INFO PANEL
              </span>
            </div>
          </div>
        )}

        {/* Center UI panel - positioned exactly within the white frame */}
        {/* ALL info text displays ONLY here */}
        <div
          className="absolute overflow-hidden z-10"
          style={{
            top: `${centerPanel.top}%`,
            left: `${centerPanel.left}%`,
            width: `${centerPanel.width}%`,
            height: `${centerPanel.height}%`,
          }}
        >
          <div className="w-full h-full overflow-auto bg-card/95">
            {selectedLocation ? (
              <LocationPanel locationId={selectedLocation} />
            ) : (
              <ResourcePanel />
            )}
          </div>
        </div>

        {/* Week and price indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="parchment-panel px-6 py-2 flex items-center gap-6">
            <span className="font-display text-lg">
              Week <span className="text-primary font-bold">{week}</span>
            </span>
            <span className="text-muted-foreground">|</span>
            <span className="font-display text-lg">
              Market: <span className={priceModifier > 1 ? 'text-destructive' : 'text-secondary'}>
                {(priceModifier * 100).toFixed(0)}%
              </span>
            </span>
          </div>
        </div>

        {/* Zone Editor button (bottom right) */}
        <div className="absolute bottom-4 right-4 z-20 flex gap-2">
          <button
            onClick={() => setShowDebugOverlay(prev => !prev)}
            className={`px-3 py-1 text-xs rounded ${
              showDebugOverlay
                ? 'bg-red-600 text-white'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
            }`}
            title="Toggle debug overlay (Ctrl+Shift+D)"
          >
            Debug
          </button>
          <button
            onClick={() => setShowZoneEditor(true)}
            className="px-3 py-1 text-xs bg-blue-600/80 text-white rounded hover:bg-blue-500"
            title="Open zone editor (Ctrl+Shift+Z)"
          >
            Edit Zones
          </button>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        event={phase === 'event' ? currentEvent : null}
        onDismiss={dismissEvent}
      />

      {/* Shadowfingers Robbery Modal */}
      <ShadowfingersModal
        event={shadowfingersEvent}
        onDismiss={dismissShadowfingers}
      />

      {/* Zone Editor Modal */}
      {showZoneEditor && (
        <ZoneEditor
          onClose={() => setShowZoneEditor(false)}
          onSave={handleSaveZones}
          initialCenterPanel={centerPanel}
        />
      )}
    </div>
  );
}
