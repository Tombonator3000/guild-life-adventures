import { useState, useEffect } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { LOCATIONS, getMovementCost, getPath, BOARD_ASPECT_RATIO } from '@/data/locations';
import { getAppliance } from '@/data/items';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { AnimatedPlayerToken } from './AnimatedPlayerToken';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { type GameEvent } from './EventModal';
import { EventPanel } from './EventPanel';
import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';
import { ZoneEditor } from './ZoneEditor';
import { MOVEMENT_PATHS, BOARD_PATH } from '@/data/locations';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import { SaveLoadMenu } from './SaveLoadMenu';
import { TutorialOverlay } from './TutorialOverlay';
import { DarkModeToggle } from './DarkModeToggle';
import { MobileHUD } from './MobileHUD';
import { MobileDrawer } from './MobileDrawer';
import { TurnTransition } from './TurnTransition';
import { WeatherOverlay } from './WeatherOverlay';
import { UpdateBanner } from './UpdateBanner';
import gameBoard from '@/assets/game-board.jpeg';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';
import { Bot, Brain, Menu, SkipForward, FastForward, Play, Globe, Wifi } from 'lucide-react';
import { audioManager } from '@/audio/audioManager';
import { useNetworkSync } from '@/network/useNetworkSync';
import { useZoneConfiguration } from '@/hooks/useZoneConfiguration';
import { useAITurnHandler } from '@/hooks/useAITurnHandler';
import { useAutoEndTurn } from '@/hooks/useAutoEndTurn';
import { usePlayerAnimation } from '@/hooks/usePlayerAnimation';
import { useIsMobile } from '@/hooks/useIsMobile';

function getWeatherIcon(type: string): string {
  switch (type) {
    case 'snowstorm': return '\u2744\uFE0F'; // snowflake
    case 'thunderstorm': return '\u26C8\uFE0F'; // cloud with lightning and rain
    case 'drought': return '\u2600\uFE0F'; // sun
    case 'enchanted-fog': return '\uD83C\uDF2B\uFE0F'; // fog
    case 'harvest-rain': return '\uD83C\uDF27\uFE0F'; // cloud with rain
    default: return '';
  }
}

export function GameBoard() {
  const {
    players,
    selectedLocation,
    selectLocation,
    week,
    priceModifier,
    economyTrend,
    eventMessage,
    dismissEvent,
    phase,
    currentPlayerIndex,
    goalSettings,
    endTurn,
    aiDifficulty,
    aiSpeedMultiplier,
    setAISpeedMultiplier,
    skipAITurn,
    setSkipAITurn,
    showTutorial,
    setShowTutorial,
    applianceBreakageEvent,
    dismissApplianceBreakageEvent,
    weather,
  } = useGameStore();
  const { event: shadowfingersEvent, dismiss: dismissShadowfingers } = useShadowfingersModal();
  const { isOnline, isGuest, networkMode, broadcastMovement, remoteAnimation, clearRemoteAnimation, latency } = useNetworkSync();
  const localPlayerId = useGameStore(s => s.localPlayerId);
  const roomCodeDisplay = useGameStore(s => s.roomCode);

  // Get current player
  const currentPlayer = useCurrentPlayer();

  // Online mode: is it this client's turn?
  const isLocalPlayerTurn = !isOnline || (currentPlayer?.id === localPlayerId);
  const isWaitingForOtherPlayer = isOnline && !isLocalPlayerTurn && !currentPlayer?.isAI;

  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [lastHumanPlayerId, setLastHumanPlayerId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Privacy screen between turns in local multiplayer (2+ human players)
  const humanPlayers = players.filter(p => !p.isAI && !p.isGameOver);
  const isMultiHuman = !isOnline && humanPlayers.length >= 2;

  useEffect(() => {
    if (!currentPlayer || !isMultiHuman || currentPlayer.isAI) return;

    // Show transition when switching from one human player to another
    if (lastHumanPlayerId && lastHumanPlayerId !== currentPlayer.id && phase === 'playing') {
      setShowTurnTransition(true);
    }
    setLastHumanPlayerId(currentPlayer.id);
  }, [currentPlayer?.id, phase]);

  // Extracted hooks
  const {
    customZones,
    centerPanel,
    handleSaveZones,
    handleResetZones,
    getLocationWithCustomPosition,
  } = useZoneConfiguration();

  // AI turns only run on host/local — guests receive AI state via sync
  const { aiIsThinking } = useAITurnHandler({
    currentPlayer: networkMode !== 'guest' ? currentPlayer : undefined,
    phase: networkMode !== 'guest' ? phase : 'title', // prevent AI trigger on guest
    aiDifficulty,
  });

  useAutoEndTurn();

  const {
    animatingPlayer,
    animationPath,
    handleAnimationComplete,
    startAnimation,
    startRemoteAnimation,
  } = usePlayerAnimation();

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
      // E = End Turn (when not in modal/menu and not AI turn, and it's local player's turn)
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !aiIsThinking && !showGameMenu) {
        e.preventDefault();
        if (currentPlayer && !currentPlayer.isAI && phase === 'playing' && isLocalPlayerTurn) {
          endTurn();
        }
      }
      // T = Toggle tutorial
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !showGameMenu) {
        e.preventDefault();
        setShowTutorial(!showTutorial);
      }
      // M = Toggle music mute
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !showGameMenu) {
        e.preventDefault();
        audioManager.toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiIsThinking, setSkipAITurn, showGameMenu, currentPlayer, phase, endTurn, showTutorial, setShowTutorial, isLocalPlayerTurn]);

  // Show appliance/equipment breakage notification
  useEffect(() => {
    if (applianceBreakageEvent) {
      const appliance = getAppliance(applianceBreakageEvent.applianceId);
      const name = appliance?.name || applianceBreakageEvent.applianceId;
      toast.warning(
        `Your ${name} broke! Repair cost: ${applianceBreakageEvent.repairCost}g at the Enchanter or Market.`,
        { duration: 6000 }
      );
      dismissApplianceBreakageEvent();
    }
  }, [applianceBreakageEvent, dismissApplianceBreakageEvent]);

  // Remote movement animation: when another player moves in online mode, animate their token
  useEffect(() => {
    if (remoteAnimation && !animatingPlayer) {
      startRemoteAnimation(remoteAnimation.playerId, remoteAnimation.path);
      clearRemoteAnimation();
    }
  }, [remoteAnimation, animatingPlayer, startRemoteAnimation, clearRemoteAnimation]);

  // Direct travel on location click (instead of showing travel button)
  const handleLocationClick = (locationId: string) => {
    if (!currentPlayer) return;

    // Don't allow clicks during animation
    if (animatingPlayer) return;

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
        const stepsCanTake = currentPlayer.timeRemaining; // Each step costs 1 hour (no entry cost for partial)

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

  // Layout: Side panels fill full viewport height, board maintains aspect ratio
  // This ensures panels use all screen space on non-16:9 displays (e.g. 1920x1200)
  // BOARD_ASPECT_RATIO imported from locations.ts (shared with ZoneEditor)
  const SIDE_PANEL_WIDTH_PERCENT = 12;

  return (
    <div className={`w-screen h-screen overflow-hidden bg-background flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
      {/* Mobile HUD - compact top bar (mobile only) */}
      {isMobile && currentPlayer && (
        <MobileHUD
          player={currentPlayer}
          week={week}
          priceModifier={priceModifier}
          economyTrend={economyTrend}
          onEndTurn={endTurn}
          onOpenLeftDrawer={() => setShowLeftDrawer(true)}
          onOpenRightDrawer={() => setShowRightDrawer(true)}
          onOpenMenu={() => setShowGameMenu(true)}
          disabled={!isLocalPlayerTurn || aiIsThinking || currentPlayer.isAI}
        />
      )}

      {/* Left Side Panel - desktop only */}
      {!isMobile && (
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
      )}

      {/* Board area - centers the aspect-ratio-locked board within remaining space */}
      <div className="flex-1 flex items-center justify-center min-w-0 min-h-0">
        <div
          className="relative"
          style={{
            width: '100%',
            aspectRatio: BOARD_ASPECT_RATIO,
            maxHeight: '100%',
          }}
        >
          {/* Game board background - 100% 100% ensures image fills container exactly */}
          {/* so percentage-based overlays (zones, center panel) align with the image */}
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{ backgroundImage: `url(${gameBoard})`, backgroundSize: '100% 100%' }}
          />

          {/* Location zones overlay */}
          <div className="absolute inset-0">
            {LOCATIONS.map((baseLocation) => {
              const location = getLocationWithCustomPosition(baseLocation.id) || baseLocation;
              const playersHere = players.filter(
                p => p.currentLocation === location.id && p.id !== animatingPlayer
              );
              const baseMoveCost = currentPlayer
                ? getMovementCost(currentPlayer.currentLocation, location.id)
                : 0;
              // Weather adds extra hours per step of movement (not entry cost)
              const weatherExtra = (baseMoveCost > 0 && weather?.movementCostExtra)
                ? getPath(currentPlayer!.currentLocation as LocationId, location.id as LocationId).length * weather.movementCostExtra
                : 0;
              const moveCost = baseMoveCost + weatherExtra;
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

          {/* Weather particle overlay */}
          <WeatherOverlay particle={weather?.particle ?? null} />

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

          {/* Center UI panel */}
          {/* Mobile: full-width bottom sheet when location selected or event, hidden otherwise */}
          {/* Desktop: always visible, positioned within the board frame */}
          {(!isMobile || selectedLocation || (phase === 'event' && currentEvent)) && (
            <div
              className="absolute overflow-hidden z-10"
              style={isMobile ? {
                bottom: '0%',
                left: '1%',
                width: '98%',
                height: '65%',
              } : {
                top: `${centerPanel.top}%`,
                left: `${centerPanel.left}%`,
                width: `${centerPanel.width}%`,
                height: `${centerPanel.height}%`,
              }}
            >
              <div className="w-full h-full overflow-hidden flex flex-col bg-card/95 rounded-t-lg">
                {phase === 'event' && currentEvent ? (
                  <EventPanel event={currentEvent} onDismiss={dismissEvent} />
                ) : selectedLocation ? (
                  <LocationPanel locationId={selectedLocation} />
                ) : (
                  <ResourcePanel />
                )}
              </div>
            </div>
          )}

          {/* Week and price indicator + menu button (desktop only) */}
          {!isMobile && (
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
                  <span className="text-sm ml-1" title={economyTrend === 1 ? 'Economy rising' : economyTrend === -1 ? 'Economy declining' : 'Economy stable'}>
                    {economyTrend === 1 ? '\u2191' : economyTrend === -1 ? '\u2193' : '\u2194'}
                  </span>
                </span>
                {weather && weather.type !== 'clear' && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <span className="font-display text-sm" title={weather.description}>
                      {getWeatherIcon(weather.type)} {weather.name}
                      <span className="text-xs text-muted-foreground ml-1">({weather.weeksRemaining}w)</span>
                    </span>
                  </>
                )}
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
          )}

        </div>
      </div>

      {/* Right Side Panel - desktop only */}
      {!isMobile && (
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
      )}

      {/* Mobile Drawers */}
      {isMobile && (
        <>
          <MobileDrawer
            isOpen={showLeftDrawer}
            onClose={() => setShowLeftDrawer(false)}
            side="left"
            title="Stats & Inventory"
          >
            {currentPlayer && (
              <SideInfoTabs
                player={currentPlayer}
                goals={goalSettings}
                isCurrentPlayer={true}
              />
            )}
          </MobileDrawer>
          <MobileDrawer
            isOpen={showRightDrawer}
            onClose={() => setShowRightDrawer(false)}
            side="right"
            title="Players & Options"
          >
            <RightSideTabs
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              week={week}
              goalSettings={goalSettings}
              onOpenSaveMenu={() => { setShowRightDrawer(false); setShowGameMenu(true); }}
              onToggleDebugOverlay={() => setShowDebugOverlay(prev => !prev)}
              onToggleZoneEditor={() => { setShowRightDrawer(false); setShowZoneEditor(true); }}
              showDebugOverlay={showDebugOverlay}
              aiIsThinking={aiIsThinking}
              aiSpeedMultiplier={aiSpeedMultiplier}
              onSetAISpeed={setAISpeedMultiplier}
              onSkipAITurn={() => setSkipAITurn(true)}
            />
          </MobileDrawer>
        </>
      )}

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
          onReset={handleResetZones}
          initialCenterPanel={centerPanel}
          initialZones={customZones}
          initialPaths={{ ...MOVEMENT_PATHS }}
        />
      )}

      {/* Online: Waiting for other player overlay */}
      {isWaitingForOtherPlayer && phase === 'playing' && (
        <div className={`fixed ${isMobile ? 'bottom-2' : 'bottom-4'} left-1/2 -translate-x-1/2 z-40`}>
          <div className={`parchment-panel ${isMobile ? 'px-3 py-2' : 'px-6 py-3'} flex items-center gap-3 shadow-lg`}>
            <Globe className="w-5 h-5 text-primary animate-pulse" />
            <span className={`font-display text-card-foreground ${isMobile ? 'text-sm' : ''}`}>
              Waiting for <strong>{currentPlayer?.name}</strong>...
            </span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Online: Connection indicator with latency */}
      {isOnline && (
        <div className={`fixed ${isMobile ? 'bottom-1 right-1' : 'bottom-4 right-4'} z-40`}>
          <div className={`parchment-panel ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} flex items-center gap-2 text-xs`}>
            <Wifi className={`w-3 h-3 ${latency > 200 ? 'text-red-500' : latency > 100 ? 'text-yellow-500' : 'text-green-600'}`} />
            <span className="text-amber-800 font-display">
              Online {roomCodeDisplay ? `(${roomCodeDisplay})` : ''}
              {isGuest && latency > 0 && (
                <span className={`ml-1 ${latency > 200 ? 'text-red-600' : latency > 100 ? 'text-yellow-600' : 'text-green-700'}`}>
                  {latency}ms
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Turn Transition Privacy Screen (local multiplayer) */}
      {showTurnTransition && currentPlayer && !currentPlayer.isAI && (
        <TurnTransition
          player={currentPlayer}
          onReady={() => setShowTurnTransition(false)}
        />
      )}

      {/* AI Thinking Overlay with speed controls */}
      {aiIsThinking && currentPlayer?.isAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          <div className={`relative parchment-panel ${isMobile ? 'p-4' : 'p-6'} flex flex-col items-center gap-3`}>
            <div className="flex items-center gap-3">
              <Bot className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-primary animate-bounce`} />
              <Brain className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-secondary animate-spin`} style={{ animationDuration: '3s' }} />
            </div>
            <h3 className={`font-display ${isMobile ? 'text-base' : 'text-xl'} text-card-foreground`}>
              {currentPlayer?.name || 'AI'} is Scheming...
            </h3>
            {!isMobile && (
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'easy' && 'Hmm, let me think about this...'}
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'medium' && 'Calculating optimal strategy...'}
                {(currentPlayer?.aiDifficulty || aiDifficulty) === 'hard' && 'Analyzing all possibilities with precision!'}
              </p>
            )}
            <div className="flex gap-1 mb-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-2">
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
            <p className="text-[10px] text-muted-foreground">Press Space to skip</p>
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

      {/* PWA Update Notification */}
      <UpdateBanner />
    </div>
  );
}
