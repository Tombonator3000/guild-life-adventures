import { useState, useEffect } from 'react';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { LOCATIONS, getMovementCost, getPath } from '@/data/locations';
import { getAppliance } from '@/data/items';
import { LocationZone } from './LocationZone';
import { PlayerToken } from './PlayerToken';
import { AnimatedPlayerToken } from './AnimatedPlayerToken';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { EventPanel } from './EventPanel';
import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';
import { DeathModal } from './DeathModal';
import { ZoneEditor } from './ZoneEditor';
import { MOVEMENT_PATHS } from '@/data/locations';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import { SaveLoadMenu } from './SaveLoadMenu';
import { TutorialOverlay } from './TutorialOverlay';
import { MobileHUD } from './MobileHUD';
import { MobileDrawer } from './MobileDrawer';
import { WeatherOverlay } from './WeatherOverlay';
import { FestivalOverlay } from './FestivalOverlay';
import { BanterBubble } from './BanterBubble';
import { useBanterStore } from '@/store/banterStore';
import { UpdateBanner } from './UpdateBanner';
import { GameBoardHeader } from './GameBoardHeader';
import { GameBoardOverlays } from './GameBoardOverlays';
import { DebugOverlay } from './DebugOverlay';
import { GraveyardCrows } from './GraveyardCrows';
import gameBoard from '@/assets/game-board.jpeg';
import { CursePanelOverlay } from './CursePanelOverlay';
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
import { StoneBorderFrame } from './StoneBorderFrame';
import { CurseAppliancePanel } from './CurseAppliancePanel';
import { CurseToadPanel } from './CurseToadPanel';
import { registerAIAnimateCallback } from '@/hooks/useAIAnimationBridge';
import { ChatPanel } from './ChatPanel';
import { ContextualTips } from './ContextualTips';

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
    toadCurseEvent,
    dismissToadCurseEvent,
    deathEvent,
    dismissDeathEvent,
    weather,
  } = useGameStore();
  const locationHexes = useGameStore(s => s.locationHexes);
  const { event: shadowfingersEvent, dismiss: dismissShadowfingers } = useShadowfingersModal();
  const { isOnline, isGuest, networkMode, broadcastMovement, remoteAnimation, clearRemoteAnimation, latency, chatMessages, sendChatMessage } = useNetworkSync();
  const localPlayerId = useGameStore(s => s.localPlayerId);
  const roomCodeDisplay = useGameStore(s => s.roomCode);

  // Get current player
  const currentPlayer = useCurrentPlayer();

  // Online mode: is it this client's turn?
  const isLocalPlayerTurn = !isOnline || (currentPlayer?.id === localPlayerId);
  const isWaitingForOtherPlayer = isOnline && !isLocalPlayerTurn && !currentPlayer?.isAI;
  const isCursed = (currentPlayer?.activeCurses?.length ?? 0) > 0;

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
    layout,
    animationLayers,
    mobileOverrides,
    savedHomeItemPositions,
    handleSaveZones,
    handleResetZones,
    getLocationWithCustomPosition,
  } = useZoneConfiguration();

  // Pick the right center panel and layout based on mobile vs desktop
  const activeCenterPanel = isMobile ? mobileOverrides.centerPanel : centerPanel;
  const activeLayout = isMobile ? mobileOverrides.layout : layout;

  // AI turns only run on host/local — guests receive AI state via sync
  const { aiIsThinking, currentAIAction } = useAITurnHandler({
    currentPlayer: networkMode !== 'guest' ? currentPlayer : undefined,
    phase: networkMode !== 'guest' ? phase : 'title', // prevent AI trigger on guest
    aiDifficulty,
  });

  useAutoEndTurn();

  const {
    animatingPlayer,
    animationPath,
    pathVersion,
    handleAnimationComplete,
    handleLocationReached,
    getCurrentIntermediateLocation,
    getAccumulatedSteps,
    startAnimation,
    redirectAnimation,
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
  // Curse breakage: shown as center panel (CurseAppliancePanel) — NOT auto-dismissed here
  // Regular breakage: toast warning, auto-dismissed
  useEffect(() => {
    if (applianceBreakageEvent && !applianceBreakageEvent.fromCurse) {
      const appliance = getAppliance(applianceBreakageEvent.applianceId);
      const name = appliance?.name || applianceBreakageEvent.applianceId;
      toast.warning(
        `Your ${name} broke! Repair cost: ${applianceBreakageEvent.repairCost}g at the Enchanter or Market.`,
        { duration: 6000 }
      );
      dismissApplianceBreakageEvent();
    }
  }, [applianceBreakageEvent, dismissApplianceBreakageEvent]);

  // Register AI animation callback so actionExecutor can trigger board path animations
  useEffect(() => {
    registerAIAnimateCallback(startRemoteAnimation);
    return () => registerAIAnimateCallback(null);
  }, [startRemoteAnimation]);

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
    redirectAnimation,
    broadcastMovement,
    getCurrentIntermediateLocation,
    getAccumulatedSteps,
  });

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
          className="relative z-30 flex flex-col flex-shrink-0 h-full"
          style={{ width: `${SIDE_PANEL_WIDTH_PERCENT}%` }}
        >
          <StoneBorderFrame side="left">
            {currentPlayer && (
              <SideInfoTabs
                player={currentPlayer}
                goals={goalSettings}
                isCurrentPlayer={true}
              />
            )}
          </StoneBorderFrame>
        </div>
      )}

      {/* Board area - fills all available space (no aspect ratio lock) */}
      {/* Image stretches via backgroundSize 100% 100%, zones use percentage positioning */}
      <div className="flex-1 flex items-center justify-center min-w-0 min-h-0">
        <div
          className="relative w-full h-full"
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
              const location = getLocationWithCustomPosition(baseLocation.id, isMobile) || baseLocation;
              const playersHere = players.filter(
                p => p.currentLocation === location.id && p.id !== animatingPlayer
              );
              const baseMoveCost = currentPlayer
                ? getMovementCost(currentPlayer.currentLocation, location.id)
                : 0;
              // Weather adds extra hours per step of movement
              const weatherExtra = (baseMoveCost > 0 && weather?.movementCostExtra && currentPlayer)
                ? getPath(currentPlayer.currentLocation as LocationId, location.id as LocationId).length * weather.movementCostExtra
                : 0;
              const moveCost = baseMoveCost + weatherExtra;
              const isCurrentLocation = currentPlayer?.currentLocation === location.id;

              const activeHex = locationHexes?.find(
                h => h.targetLocation === location.id && h.weeksRemaining > 0
              );

              return (
                <LocationZone
                  key={location.id}
                  location={location}
                  isSelected={selectedLocation === location.id}
                  isCurrentLocation={isCurrentLocation && !animatingPlayer}
                  moveCost={moveCost}
                  onClick={() => handleLocationClick(location.id)}
                  isHexed={!!activeHex}
                  hexCasterName={activeHex?.casterName}
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
                  key={`${player.id}-${pathVersion}`}
                  player={player}
                  isCurrent={true}
                  animationPath={animationPath}
                  onAnimationComplete={handleAnimationComplete}
                  onLocationReached={handleLocationReached}
                />
              ))}
            </div>
          )}

          {/* Graveyard crows animation */}
          <GraveyardCrows />

          {/* Festival visual overlay (z-34, below weather) */}
          <FestivalOverlay activeFestival={useGameStore(s => s.activeFestival)} />

          {/* Weather particle overlay */}
          <WeatherOverlay particle={weather?.particle ?? null} weatherType={weather?.type} />

          {/* Debug overlay - shows zone boundaries and movement paths */}
          <DebugOverlay
            customZones={customZones}
            centerPanel={centerPanel}
            visible={showDebugOverlay}
          />

          {/* Banter speech bubble - large overlay above center panel */}
          <BoardBanterOverlay centerPanel={activeCenterPanel} isMobile={isMobile} />

          {/* Center UI panel */}
          {/* Mobile: positioned via mobileOverrides when location selected or event, hidden otherwise */}
          {/* Desktop: always visible, positioned within the board frame */}
          {(!isMobile || selectedLocation || (phase === 'event' && currentEvent) || (applianceBreakageEvent?.fromCurse) || toadCurseEvent) && (
            <div
              className={`absolute overflow-hidden z-10 ${isMobile ? 'rounded-xl' : ''}`}
              style={{
                top: `${activeCenterPanel.top}%`,
                left: `${activeCenterPanel.left}%`,
                width: `${activeCenterPanel.width}%`,
                height: `${activeCenterPanel.height}%`,
              }}
            >
              <div className={`w-full h-full overflow-hidden flex flex-col bg-card/95 relative ${isMobile ? 'rounded-xl' : 'rounded-t-lg'}`}>
                {isCursed && !applianceBreakageEvent?.fromCurse && !toadCurseEvent && <CursePanelOverlay isMobile={isMobile} />}
                {toadCurseEvent ? (
                  <CurseToadPanel
                    hoursLost={toadCurseEvent.hoursLost}
                    curserName={toadCurseEvent.curserName}
                    onDismiss={dismissToadCurseEvent}
                  />
                ) : applianceBreakageEvent?.fromCurse ? (
                  <CurseAppliancePanel
                    applianceId={applianceBreakageEvent.applianceId}
                    repairCost={applianceBreakageEvent.repairCost}
                    curserName={applianceBreakageEvent.curserName}
                    onDismiss={dismissApplianceBreakageEvent}
                  />
                ) : phase === 'event' && currentEvent ? (
                  <EventPanel event={currentEvent} onDismiss={dismissEvent} />
                ) : selectedLocation ? (
                  <LocationPanel locationId={selectedLocation} />
                ) : (
                  <ResourcePanel />
                )}
              </div>
            </div>
          )}

          {/* Week and price indicator (desktop only) */}
          {!isMobile && (
            <GameBoardHeader
              week={week}
              priceModifier={priceModifier}
              economyTrend={economyTrend}
              weather={weather}
            />
          )}

        </div>
      </div>

      {/* Right Side Panel - desktop only */}
      {!isMobile && (
        <div
          className="relative z-30 flex flex-col flex-shrink-0 h-full"
          style={{ width: `${SIDE_PANEL_WIDTH_PERCENT}%` }}
        >
          <StoneBorderFrame side="right">
            <RightSideTabs
              players={players}
              currentPlayerIndex={currentPlayerIndex}
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
          </StoneBorderFrame>
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
          initialLayout={layout}
          initialAnimationLayers={animationLayers}
          initialMobileOverrides={mobileOverrides}
          initialHomeItemPositions={savedHomeItemPositions}
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
        currentAIAction={currentAIAction}
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

      {/* Death Modal */}
      {deathEvent && (
        <DeathModal
          event={deathEvent}
          onDismiss={dismissDeathEvent}
        />
      )}

      {/* PWA Update Notification */}
      <UpdateBanner />

      {/* In-game chat (online multiplayer only) */}
      {isOnline && currentPlayer && (
        <ChatPanel
          messages={chatMessages}
          onSend={sendChatMessage}
          playerName={currentPlayer.name}
          playerColor={currentPlayer.color}
        />
      )}

      {/* Contextual tips for new players */}
      {phase === 'playing' && <ContextualTips />}
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
        bottom: '33%',
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
