import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { LOCATIONS, getMovementCost, ZONE_CONFIGS, getPath } from '@/data/locations';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { AnimatedPlayerToken } from './AnimatedPlayerToken';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { EventModal, type GameEvent } from './EventModal';
import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';
import { ZoneEditor, type CenterPanelConfig } from './ZoneEditor';
import { MOVEMENT_PATHS, BOARD_PATH, type MovementWaypoint } from '@/data/locations';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import { SaveLoadMenu } from './SaveLoadMenu';
import { TutorialOverlay } from './TutorialOverlay';
import { DarkModeToggle } from './DarkModeToggle';
import { useGrimwaldAI } from '@/hooks/useGrimwaldAI';
import gameBoard from '@/assets/game-board.jpeg';
import type { ZoneConfig, LocationId, AIDifficulty } from '@/types/game.types';
import { toast } from 'sonner';
import { Bot, Brain, Menu, SkipForward, FastForward, Play } from 'lucide-react';

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
    aiDifficulty,
    aiSpeedMultiplier,
    setAISpeedMultiplier,
    skipAITurn,
    setSkipAITurn,
    showTutorial,
    setShowTutorial,
  } = useGameStore();
  const { event: shadowfingersEvent, dismiss: dismissShadowfingers } = useShadowfingersModal();
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [customZones, setCustomZones] = useState<ZoneConfig[]>(ZONE_CONFIGS);
  const [centerPanel, setCenterPanel] = useState<CenterPanelConfig>(DEFAULT_CENTER_PANEL);

  // AI State
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const aiTurnStartedRef = useRef(false);
  const { runAITurn, analyzeGameState, settings: aiSettings } = useGrimwaldAI(aiDifficulty);

  // Animation state for player movement
  const [animatingPlayer, setAnimatingPlayer] = useState<string | null>(null);
  const [animationPath, setAnimationPath] = useState<LocationId[] | null>(null);
  const pendingMoveRef = useRef<{ playerId: string; destination: LocationId; timeCost: number } | null>(null);

  // Get current player BEFORE useEffects that depend on it
  const currentPlayer = useCurrentPlayer();

  // Keyboard shortcuts
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
      // Escape opens/closes game menu
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowGameMenu(prev => !prev);
      }
      // Space skips AI turn
      if (e.key === ' ' && aiIsThinking) {
        e.preventDefault();
        setSkipAITurn(true);
      }
      // E = End Turn (when not in modal/menu and not AI turn)
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !aiIsThinking && !showGameMenu) {
        e.preventDefault();
        if (currentPlayer && !currentPlayer.isAI && phase === 'playing') {
          endTurn();
        }
      }
      // T = Toggle tutorial
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !showGameMenu) {
        e.preventDefault();
        setShowTutorial(!showTutorial);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiIsThinking, setSkipAITurn, showGameMenu, currentPlayer, phase, endTurn, showTutorial, setShowTutorial]);

  // AI Turn Handler - triggers when it's Grimwald's turn
  useEffect(() => {
    if (!currentPlayer || phase !== 'playing') {
      aiTurnStartedRef.current = false;
      return;
    }

    // Check if it's an AI player's turn and we haven't started their turn yet
    if (currentPlayer.isAI && !aiTurnStartedRef.current && !aiIsThinking) {
      aiTurnStartedRef.current = true;
      setAiIsThinking(true);

      // Show toast notification that Grimwald is thinking
      toast.info(`Grimwald is planning...`, {
        duration: 2000,
        icon: <Bot className="w-4 h-4" />,
      });

      // Small delay before AI starts to let the UI settle
      setTimeout(() => {
        runAITurn(currentPlayer);
      }, 1000);
    }

    // Reset when it's no longer AI's turn
    if (!currentPlayer.isAI) {
      aiTurnStartedRef.current = false;
      setAiIsThinking(false);
    }
  }, [currentPlayer, phase, aiIsThinking, runAITurn]);

  // Listen for player changes to detect when AI turn ends
  useEffect(() => {
    if (currentPlayer && !currentPlayer.isAI) {
      setAiIsThinking(false);
    }
  }, [currentPlayer?.id]);

  const handleSaveZones = (zones: ZoneConfig[], newCenterPanel: CenterPanelConfig, paths?: Record<string, MovementWaypoint[]>) => {
    setCustomZones(zones);
    setCenterPanel(newCenterPanel);
    setShowZoneEditor(false);
    // Apply movement paths to the global MOVEMENT_PATHS object
    if (paths) {
      Object.keys(MOVEMENT_PATHS).forEach(k => delete MOVEMENT_PATHS[k]);
      Object.entries(paths).forEach(([k, v]) => { MOVEMENT_PATHS[k] = v; });
      console.log('Movement paths updated:', paths);
    }
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

  // Handle animation completion
  const handleAnimationComplete = useCallback(() => {
    const pending = pendingMoveRef.current;
    if (pending) {
      // Execute the actual move
      movePlayer(pending.playerId, pending.destination, pending.timeCost);
      selectLocation(pending.destination);
      toast.success(`Traveled to ${LOCATIONS.find(l => l.id === pending.destination)?.name}`);
      pendingMoveRef.current = null;
    }
    setAnimatingPlayer(null);
    setAnimationPath(null);
  }, [movePlayer, selectLocation]);

  // Direct travel on location click (instead of showing travel button)
  const handleLocationClick = (locationId: string) => {
    if (!currentPlayer) return;

    // Don't allow clicks during animation
    if (animatingPlayer) return;

    const isCurrentLocation = currentPlayer.currentLocation === locationId;

    if (isCurrentLocation) {
      // If already here, toggle the location panel
      if (selectedLocation === locationId) {
        selectLocation(null);
      } else {
        selectLocation(locationId as LocationId);
      }
    } else {
      // Travel directly to the location with animation
      const moveCost = getMovementCost(currentPlayer.currentLocation, locationId as LocationId);

      if (currentPlayer.timeRemaining >= moveCost) {
        // Calculate path and start animation
        const path = getPath(currentPlayer.currentLocation as LocationId, locationId as LocationId);

        // Store pending move for after animation
        pendingMoveRef.current = {
          playerId: currentPlayer.id,
          destination: locationId as LocationId,
          timeCost: moveCost,
        };

        // Start animation
        setAnimatingPlayer(currentPlayer.id);
        setAnimationPath(path);
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

  // The game layout uses a fixed aspect ratio container that scales uniformly
  // Total layout: [Left Panel 12%] [Game Board 76%] [Right Panel 12%]
  // This ensures consistent sizing regardless of screen size
  const SIDE_PANEL_WIDTH_PERCENT = 12;
  const GAME_BOARD_WIDTH_PERCENT = 76;

  return (
    <div className="w-screen h-screen overflow-hidden bg-background flex items-center justify-center">
      {/* Main container - uses viewport units to maintain consistent aspect ratio */}
      {/* The container scales based on the smaller dimension (width or height) */}
      <div
        className="relative flex items-stretch"
        style={{
          // Use the minimum of 100vw or 177.78vh (16:9 width for a given height)
          // and 100vh or 56.25vw (16:9 height for a given width)
          // This ensures the layout fits in any screen while maintaining proportions
          width: 'min(100vw, 177.78vh)',
          height: 'min(100vh, 56.25vw)',
        }}
      >
        {/* Left Side Panel - Player Info Tabs (12% of container width) */}
        <div
          className="relative z-30 p-[0.5%] flex flex-col flex-shrink-0 h-full"
          style={{ width: `${SIDE_PANEL_WIDTH_PERCENT}%` }}
        >
          {currentPlayer && (
            <SideInfoTabs
              player={currentPlayer}
              goals={goalSettings}
              isCurrentPlayer={true}
            />
          )}
        </div>

        {/* Game board container - maintains aspect ratio (76% of container width) */}
        <div
          className="relative flex-shrink-0 h-full"
          style={{ width: `${GAME_BOARD_WIDTH_PERCENT}%` }}
        >
          {/* Game board background */}
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${gameBoard})` }}
        />

        {/* Location zones overlay */}
        <div className="absolute inset-0">
          {LOCATIONS.map((baseLocation) => {
            const location = getLocationWithCustomPosition(baseLocation.id) || baseLocation;
            // Don't show animating player in the location zones
            const playersHere = players.filter(
              p => p.currentLocation === location.id && p.id !== animatingPlayer
            );
            const moveCost = currentPlayer
              ? getMovementCost(currentPlayer.currentLocation, location.id)
              : 0;
            const isCurrentLocation = currentPlayer?.currentLocation === location.id;

            return (
              <LocationZone
                key={location.id}
                location={location}
                isSelected={selectedLocation === location.id}
                isCurrentLocation={isCurrentLocation && !animatingPlayer}
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

        {/* Animated player token layer (above location zones) */}
        {animatingPlayer && animationPath && (
          <div className="absolute inset-0 pointer-events-none z-40">
            {players.filter(p => p.id === animatingPlayer).map((player) => (
              <AnimatedPlayerToken
                key={player.id}
                player={player}
                isCurrent={true}
                animationPath={animationPath}
                onAnimationComplete={handleAnimationComplete}
              />
            ))}
          </div>
        )}

        {/* Debug overlay - shows zone boundaries and movement paths */}
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
            {/* Movement paths overlay */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {BOARD_PATH.map((loc, i) => {
                const next = BOARD_PATH[(i + 1) % BOARD_PATH.length];
                const key = `${loc}_${next}`;
                const waypoints = MOVEMENT_PATHS[key] || [];
                const fromZone = customZones.find(z => z.id === loc);
                const toZone = customZones.find(z => z.id === next);
                if (!fromZone || !toZone) return null;
                const fromCenter: [number, number] = [fromZone.x + fromZone.width / 2, fromZone.y + fromZone.height - 5];
                const toCenter: [number, number] = [toZone.x + toZone.width / 2, toZone.y + toZone.height - 5];
                const allPoints = [fromCenter, ...waypoints, toCenter];
                return (
                  <g key={key}>
                    <polyline
                      points={allPoints.map(([x, y]) => `${x},${y}`).join(' ')}
                      fill="none"
                      stroke={waypoints.length > 0 ? '#4ade80' : '#6b7280'}
                      strokeWidth={0.25}
                      strokeDasharray={waypoints.length > 0 ? 'none' : '1 0.5'}
                      opacity={0.6}
                    />
                    {waypoints.map(([x, y], idx) => (
                      <circle key={idx} cx={x} cy={y} r={0.4} fill="#4ade80" opacity={0.7} />
                    ))}
                  </g>
                );
              })}
            </svg>
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
          <div className="w-full h-full overflow-hidden flex flex-col bg-card/95">
            {selectedLocation ? (
              <LocationPanel locationId={selectedLocation} />
            ) : (
              <ResourcePanel />
            )}
          </div>
        </div>

        {/* Week and price indicator + menu button */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
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
          <button
            onClick={() => setShowGameMenu(true)}
            className="parchment-panel p-2 hover:brightness-110"
            title="Game Menu (Esc)"
          >
            <Menu className="w-5 h-5 text-card-foreground" />
          </button>
          <DarkModeToggle className="parchment-panel" />
        </div>

        </div>

        {/* Right Side Panel - Players, Options, Developer Tabs (12% of container width) */}
        <div
          className="relative z-30 p-[0.5%] flex flex-col flex-shrink-0 h-full"
          style={{ width: `${SIDE_PANEL_WIDTH_PERCENT}%` }}
        >
          <RightSideTabs
            players={players}
            currentPlayerIndex={currentPlayerIndex}
            week={week}
            goalSettings={goalSettings}
            onOpenSaveMenu={() => setShowGameMenu(true)}
            onToggleDebugOverlay={() => setShowDebugOverlay(prev => !prev)}
            onToggleZoneEditor={() => setShowZoneEditor(true)}
            showDebugOverlay={showDebugOverlay}
            aiIsThinking={aiIsThinking}
            aiSpeedMultiplier={aiSpeedMultiplier}
            onSetAISpeed={setAISpeedMultiplier}
            onSkipAITurn={() => setSkipAITurn(true)}
          />
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

      {/* AI Thinking Overlay with speed controls */}
      {aiIsThinking && currentPlayer?.isAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          <div className="relative parchment-panel p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary animate-bounce" />
              <Brain className="w-6 h-6 text-secondary animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h3 className="font-display text-xl text-card-foreground">
              Grimwald is Scheming...
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {aiDifficulty === 'easy' && 'Hmm, let me think about this...'}
              {aiDifficulty === 'medium' && 'Calculating optimal strategy...'}
              {aiDifficulty === 'hard' && 'Analyzing all possibilities with precision!'}
            </p>
            <div className="flex gap-1 mb-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {/* Speed controls */}
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <span className="text-xs text-muted-foreground font-display">Speed:</span>
              <button
                onClick={() => setAISpeedMultiplier(1)}
                className={`p-1.5 rounded text-xs ${aiSpeedMultiplier === 1 ? 'bg-primary/30 text-primary' : 'bg-background/50 text-muted-foreground hover:text-foreground'}`}
                title="Normal speed"
              >
                <Play className="w-3 h-3" />
              </button>
              <button
                onClick={() => setAISpeedMultiplier(3)}
                className={`p-1.5 rounded text-xs ${aiSpeedMultiplier === 3 ? 'bg-primary/30 text-primary' : 'bg-background/50 text-muted-foreground hover:text-foreground'}`}
                title="Fast (3x)"
              >
                <FastForward className="w-3 h-3" />
              </button>
              <button
                onClick={() => setSkipAITurn(true)}
                className="p-1.5 rounded text-xs bg-background/50 text-muted-foreground hover:text-foreground"
                title="Skip turn (Space)"
              >
                <SkipForward className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Press Space to skip</p>
          </div>
        </div>
      )}

      {/* Save/Load Menu */}
      {showGameMenu && (
        <SaveLoadMenu onClose={() => setShowGameMenu(false)} />
      )}

      {/* Tutorial Overlay */}
      {showTutorial && currentPlayer && !currentPlayer.isAI && (
        <TutorialOverlay onClose={() => setShowTutorial(false)} />
      )}
    </div>
  );
}
