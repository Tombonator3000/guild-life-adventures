import { useState, useEffect } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { LOCATIONS, getMovementCost, getPath, BOARD_ASPECT_RATIO } from '@/data/locations';
import { getAppliance } from '@/data/items';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { AnimatedPlayerToken } from './AnimatedPlayerToken';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { EventPanel } from './EventPanel';
import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';
import { ZoneEditor } from './ZoneEditor';
import { MOVEMENT_PATHS } from '@/data/locations';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import { SaveLoadMenu } from './SaveLoadMenu';
import { TutorialOverlay } from './TutorialOverlay';
import { MobileHUD } from './MobileHUD';
import { MobileDrawer } from './MobileDrawer';
import { WeatherOverlay } from './WeatherOverlay';
import { BanterBubble } from './BanterBubble';
import { useBanterStore } from '@/store/banterStore';
import { UpdateBanner } from './UpdateBanner';
import { GameBoardHeader } from './GameBoardHeader';
import { GameBoardOverlays } from './GameBoardOverlays';
import { DebugOverlay } from './DebugOverlay';
import gameBoard from '@/assets/game-board.jpeg';
import type { LocationId } from '@/types/game.types';
import { toast } from 'sonner';
import { useNetworkSync } from '@/network/useNetworkSync';
import { useZoneConfiguration } from '@/hooks/useZoneConfiguration';
import { useAITurnHandler } from '@/hooks/useAITurnHandler';
import { useAutoEndTurn } from '@/hooks/useAutoEndTurn';
import { usePlayerAnimation } from '@/hooks/usePlayerAnimation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGameBoardKeyboard } from '@/hooks/useGameBoardKeyboard';
import { useLocationClick } from '@/hooks/useLocationClick';

export function GameBoard() {
  const {
    players,
    selectedLocation,
    selectLocation,
    week,
    priceModifier,
    economyTrend,
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
  useGameBoardKeyboard({
    setShowZoneEditor,
    setShowDebugOverlay,
    setShowGameMenu,
    aiIsThinking,
    setSkipAITurn,
    showGameMenu,
    currentPlayer,
    phase,
    endTurn,
    showTutorial,
    setShowTutorial,
    isLocalPlayerTurn,
  });

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

  const { handleLocationClick, currentEvent } = useLocationClick({
    animatingPlayer,
    isOnline,
    isLocalPlayerTurn,
    startAnimation,
    broadcastMovement,
  });

  // Layout: Side panels fill full viewport height, board maintains aspect ratio
  // This ensures panels use all screen space on non-16:9 displays (e.g. 1920x1200)
  // BOARD_ASPECT_RATIO imported from locations.ts (shared with ZoneEditor)
  const SIDE_PANEL_WIDTH_PERCENT = 12;

  return (
    <div className={`w-screen h-screen-safe overflow-hidden bg-background flex safe-area-all ${isMobile ? 'flex-col' : 'flex-row'}`}>
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
          <WeatherOverlay particle={weather?.particle ?? null} weatherType={weather?.type} />

          {/* Debug overlay - shows zone boundaries and movement paths */}
          <DebugOverlay
            customZones={customZones}
            centerPanel={centerPanel}
            visible={showDebugOverlay}
          />

          {/* Banter speech bubble - large overlay above center panel */}
          <BoardBanterOverlay centerPanel={centerPanel} isMobile={isMobile} />

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
            <GameBoardHeader
              week={week}
              priceModifier={priceModifier}
              economyTrend={economyTrend}
              weather={weather}
              onOpenMenu={() => setShowGameMenu(true)}
            />
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

      <GameBoardOverlays
        isMobile={isMobile}
        isWaitingForOtherPlayer={isWaitingForOtherPlayer}
        phase={phase}
        currentPlayer={currentPlayer}
        isOnline={isOnline}
        latency={latency}
        roomCodeDisplay={roomCodeDisplay}
        isGuest={isGuest}
        showTurnTransition={showTurnTransition}
        onTurnTransitionReady={() => setShowTurnTransition(false)}
        aiIsThinking={aiIsThinking}
        aiDifficulty={aiDifficulty}
        aiSpeedMultiplier={aiSpeedMultiplier}
        setAISpeedMultiplier={setAISpeedMultiplier}
        setSkipAITurn={setSkipAITurn}
      />

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

// Banter overlay — positioned above the center panel on the board
function BoardBanterOverlay({ centerPanel, isMobile }: {
  centerPanel: { top: number; left: number; width: number; height: number };
  isMobile: boolean;
}) {
  const { activeBanter, npcName, clearBanter } = useBanterStore();

  if (!activeBanter || !npcName) return null;

  return (
    <div
      className="absolute z-20 pointer-events-none flex items-end justify-start"
      style={isMobile ? {
        bottom: '66%',
        left: '5%',
        width: '90%',
        height: 'auto',
        paddingBottom: '8px',
      } : {
        top: `${Math.max(centerPanel.top - 18, 1)}%`,
        left: `${centerPanel.left}%`,
        width: `${centerPanel.width}%`,
        height: `${Math.min(18, centerPanel.top)}%`,
        paddingLeft: '2%',
      }}
    >
      <BanterBubble
        banter={activeBanter}
        npcName={npcName}
        onDismiss={clearBanter}
      />
    </div>
  );
}
