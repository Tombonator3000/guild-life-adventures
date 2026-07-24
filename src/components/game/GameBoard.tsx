import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getAppliance } from '@/data/items';
import { ResourcePanel } from './ResourcePanel';
import { LocationPanel } from './LocationPanel';
import { EventPanel } from './EventPanel';
import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';
import { MOVEMENT_PATHS } from '@/data/locations';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import { MobileHUD } from './MobileHUD';
import { MobileDrawer } from './MobileDrawer';
import { GameBoardHeader } from './GameBoardHeader';
import { CursePanelOverlay } from './CursePanelOverlay';
import type { Player } from '@/types/game.types';
import { toast } from 'sonner';
import { useNetworkSync } from '@/network/useNetworkSync';
import { useZoneConfiguration } from '@/hooks/useZoneConfiguration';
import { useAITurnHandler } from '@/hooks/useAITurnHandler';
import { useAutoEndTurn } from '@/hooks/useAutoEndTurn';
import { usePlayerAnimation } from '@/hooks/usePlayerAnimation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGameBoardKeyboard } from '@/hooks/useGameBoardKeyboard';
import { useLocationClick } from '@/hooks/useLocationClick';
import { useKeyboardLocationNav } from '@/hooks/useKeyboardLocationNav';
import { useGameOptions } from '@/hooks/useGameOptions';
import { StoneBorderFrame } from './StoneBorderFrame';
import { CurseAppliancePanel } from './CurseAppliancePanel';
import { CurseToadPanel } from './CurseToadPanel';
import { registerAIAnimateCallback } from '@/hooks/useAIAnimationBridge';
import { SpectatorPanel } from './SpectatorPanel';
import { GameBoardAuxiliaryLayer } from './GameBoardAuxiliaryLayer';
import { GameBoardCanvas } from './GameBoardCanvas';

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
    eventSource,
  } = useGameStore(useShallow(state => ({
    players: state.players,
    selectedLocation: state.selectedLocation,
    selectLocation: state.selectLocation,
    week: state.week,
    priceModifier: state.priceModifier,
    economyTrend: state.economyTrend,
    dismissEvent: state.dismissEvent,
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    goalSettings: state.goalSettings,
    endTurn: state.endTurn,
    aiDifficulty: state.aiDifficulty,
    aiSpeedMultiplier: state.aiSpeedMultiplier,
    setAISpeedMultiplier: state.setAISpeedMultiplier,
    skipAITurn: state.skipAITurn,
    setSkipAITurn: state.setSkipAITurn,
    showTutorial: state.showTutorial,
    setShowTutorial: state.setShowTutorial,
    applianceBreakageEvent: state.applianceBreakageEvent,
    dismissApplianceBreakageEvent: state.dismissApplianceBreakageEvent,
    toadCurseEvent: state.toadCurseEvent,
    dismissToadCurseEvent: state.dismissToadCurseEvent,
    deathEvent: state.deathEvent,
    dismissDeathEvent: state.dismissDeathEvent,
    weather: state.weather,
    eventSource: state.eventSource,
  })));
  const locationHexes = useGameStore(state => state.locationHexes);
  const stockPrices = useGameStore(state => state.stockPrices);
  const { event: shadowfingersEvent, dismiss: dismissShadowfingers } = useShadowfingersModal();
  const {
    isOnline,
    isGuest,
    networkMode,
    broadcastMovement,
    remoteAnimation,
    clearRemoteAnimation,
    latency,
    chatMessages,
    sendChatMessage,
    connectionStatus,
    attemptReconnect,
  } = useNetworkSync();
  const localPlayerId = useGameStore(state => state.localPlayerId);
  const roomCodeDisplay = useGameStore(state => state.roomCode);
  const currentPlayer = useCurrentPlayer();

  const isLocalPlayerTurn = !isOnline || currentPlayer?.id === localPlayerId;
  const isWaitingForOtherPlayer = isOnline && !isLocalPlayerTurn && !currentPlayer?.isAI;
  const isCursed = (currentPlayer?.activeCurses?.length ?? 0) > 0;
  const localPlayer = isOnline ? players.find(player => player.id === localPlayerId) : currentPlayer;
  const isPureSpectator = isOnline && !localPlayerId;
  const isSpectating = isPureSpectator
    || !!(localPlayer?.isGameOver && phase === 'playing' && players.some(player => !player.isGameOver));

  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [lastHumanPlayerId, setLastHumanPlayerId] = useState<string | null>(null);
  const [fullboardMode, setFullboardMode] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const isMobile = useIsMobile();

  const humanPlayers = players.filter(player => !player.isAI && !player.isGameOver);
  const isMultiHuman = !isOnline && humanPlayers.length >= 2;

  useEffect(() => {
    if (!currentPlayer || !isMultiHuman || currentPlayer.isAI) return;
    if (lastHumanPlayerId && lastHumanPlayerId !== currentPlayer.id && phase === 'playing') {
      setShowTurnTransition(true);
    }
    setLastHumanPlayerId(currentPlayer.id);
  }, [currentPlayer?.id, phase]);

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

  const activeCenterPanel = isMobile ? mobileOverrides.centerPanel : centerPanel;
  const activeLayout = isMobile ? mobileOverrides.layout : layout;

  const { aiIsThinking, currentAIAction } = useAITurnHandler({
    currentPlayer: networkMode !== 'guest' ? currentPlayer : undefined,
    phase: networkMode !== 'guest' ? phase : 'title',
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
    setFullboardMode,
  });

  useEffect(() => {
    if (applianceBreakageEvent && !applianceBreakageEvent.fromCurse) {
      const appliance = getAppliance(applianceBreakageEvent.applianceId);
      const name = appliance?.name || applianceBreakageEvent.applianceId;
      toast.warning(
        `Your ${name} broke! Repair cost: ~${applianceBreakageEvent.repairCost}g (Forge is cheaper).`,
        { duration: 6000 },
      );
      dismissApplianceBreakageEvent();
    }
  }, [applianceBreakageEvent, dismissApplianceBreakageEvent]);

  useEffect(() => {
    registerAIAnimateCallback(startRemoteAnimation);
    return () => registerAIAnimateCallback(null);
  }, [startRemoteAnimation]);

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

  const { options: gameOptions } = useGameOptions();
  const { focusedLocationId } = useKeyboardLocationNav({
    enabled: gameOptions.enableKeyboardNav && !aiIsThinking && phase === 'playing' && isLocalPlayerTurn,
    onLocationClick: handleLocationClick,
  });

  const [eventQueueIdx, setEventQueueIdx] = useState(0);

  useEffect(() => {
    setEventQueueIdx(0);
  }, [currentEvent?.id]);

  const isWeekendEvent = eventSource === 'weekend';
  const eventLines = (!isWeekendEvent && currentEvent?.description.split('\n').filter(Boolean)) || [];
  const totalEventCount = isWeekendEvent ? 1 : eventLines.length;
  const currentEventLine = isWeekendEvent
    ? (currentEvent?.description ?? '')
    : (eventLines[eventQueueIdx] ?? eventLines[0] ?? '');
  const queuedEvent: typeof currentEvent = currentEvent
    ? {
        ...currentEvent,
        title: totalEventCount > 1
          ? `${currentEvent.title} (${eventQueueIdx + 1}/${totalEventCount})`
          : currentEvent.title,
        description: currentEventLine,
      }
    : null;

  const handleEventDismiss = () => {
    if (!isWeekendEvent && eventQueueIdx < totalEventCount - 1) {
      setEventQueueIdx(index => index + 1);
    } else {
      setEventQueueIdx(0);
      dismissEvent();
    }
  };

  const sidePanelWidthPercent = 12;
  const shadowfingersTargetLocation = shadowfingersEvent && currentPlayer
    ? shadowfingersEvent.type === 'street' && 'fromLocation' in shadowfingersEvent.result
      ? shadowfingersEvent.result.fromLocation
      : currentPlayer.currentLocation
    : null;

  return (
    <div
      className={`w-screen h-screen-safe overflow-hidden bg-background flex safe-area-all ${isMobile ? 'flex-col' : 'flex-row'}`}
      style={!isMobile && fullboardMode ? { paddingTop: '2rem' } : undefined}
    >
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

      {!isMobile && !fullboardMode && (
        <div
          className="relative z-30 flex flex-col flex-shrink-0 h-full"
          style={{ width: `${sidePanelWidthPercent}%` }}
        >
          <StoneBorderFrame side="left">
            {currentPlayer && (
              <SideInfoTabs player={currentPlayer} goals={goalSettings} isCurrentPlayer />
            )}
          </StoneBorderFrame>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center min-w-0 min-h-0">
        <GameBoardCanvas
          players={players}
          currentPlayer={currentPlayer}
          selectedLocation={selectedLocation}
          locationHexes={locationHexes}
          weather={weather}
          isMobile={isMobile}
          centerPanel={activeCenterPanel}
          customZones={customZones}
          debugCenterPanel={centerPanel}
          showDebugOverlay={showDebugOverlay}
          focusedLocationId={focusedLocationId}
          animatingPlayer={animatingPlayer}
          animationPath={animationPath}
          pathVersion={pathVersion}
          shadowfingersTargetLocation={shadowfingersTargetLocation}
          getLocationWithCustomPosition={getLocationWithCustomPosition}
          onLocationClick={handleLocationClick}
          onViewPlayer={setViewingPlayer}
          onAnimationComplete={handleAnimationComplete}
          onLocationReached={handleLocationReached}
        >
          {(!isMobile
            || selectedLocation
            || (phase === 'event' && queuedEvent)
            || applianceBreakageEvent?.fromCurse
            || toadCurseEvent
            || shadowfingersEvent) && (
            <div
              className={`absolute overflow-hidden z-10 ${isMobile ? 'rounded-xl' : ''}`}
              style={{
                top: `${activeCenterPanel.top}%`,
                left: `${activeCenterPanel.left}%`,
                width: `${activeCenterPanel.width}%`,
                height: `${activeCenterPanel.height}%`,
              }}
            >
              <div className={`w-full h-full overflow-hidden flex flex-col bg-card/95 relative ${isMobile ? 'rounded-xl' : 'rounded-t-lg'} animate-scale-in`}>
                {isCursed && !applianceBreakageEvent?.fromCurse && !toadCurseEvent && (
                  <CursePanelOverlay isMobile={isMobile} />
                )}
                {toadCurseEvent ? (
                  <CurseToadPanel
                    hoursLost={toadCurseEvent.hoursLost}
                    curserName={toadCurseEvent.curserName}
                    onDismiss={dismissToadCurseEvent}
                  />
                ) : applianceBreakageEvent?.fromCurse ? (
                  <CurseAppliancePanel
                    applianceId={applianceBreakageEvent.applianceId}
                    originalPrice={applianceBreakageEvent.originalPrice ?? applianceBreakageEvent.repairCost * 2}
                    curserName={applianceBreakageEvent.curserName}
                    onDismiss={dismissApplianceBreakageEvent}
                  />
                ) : shadowfingersEvent ? (
                  <ShadowfingersModal event={shadowfingersEvent} onDismiss={dismissShadowfingers} />
                ) : phase === 'event' && queuedEvent ? (
                  <EventPanel event={queuedEvent} onDismiss={handleEventDismiss} />
                ) : selectedLocation ? (
                  <LocationPanel locationId={selectedLocation} />
                ) : isSpectating ? (
                  <SpectatorPanel
                    players={players}
                    goalSettings={goalSettings}
                    week={week}
                    stockPrices={stockPrices}
                    isPureSpectator={isPureSpectator}
                  />
                ) : (
                  <ResourcePanel />
                )}
              </div>
            </div>
          )}

          {!isMobile && !fullboardMode && (
            <GameBoardHeader
              week={week}
              priceModifier={priceModifier}
              economyTrend={economyTrend}
              weather={weather}
            />
          )}
        </GameBoardCanvas>
      </div>

      {!isMobile && !fullboardMode && (
        <div
          className="relative z-30 flex flex-col flex-shrink-0 h-full"
          style={{ width: `${sidePanelWidthPercent}%` }}
        >
          <StoneBorderFrame side="right">
            <RightSideTabs
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              goalSettings={goalSettings}
              onOpenSaveMenu={() => setShowGameMenu(true)}
              onToggleDebugOverlay={() => setShowDebugOverlay(previous => !previous)}
              onToggleZoneEditor={() => setShowZoneEditor(true)}
              showDebugOverlay={showDebugOverlay}
              aiIsThinking={aiIsThinking}
              aiSpeedMultiplier={aiSpeedMultiplier}
              onSetAISpeed={setAISpeedMultiplier}
              onSkipAITurn={() => setSkipAITurn(true)}
              onToggleFullboard={() => setFullboardMode(true)}
            />
          </StoneBorderFrame>
        </div>
      )}

      {isMobile && (
        <>
          <MobileDrawer
            isOpen={showLeftDrawer}
            onClose={() => setShowLeftDrawer(false)}
            side="left"
            title="Stats & Inventory"
          >
            {currentPlayer && (
              <SideInfoTabs player={currentPlayer} goals={goalSettings} isCurrentPlayer />
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
              onOpenSaveMenu={() => {
                setShowRightDrawer(false);
                setShowGameMenu(true);
              }}
              onToggleDebugOverlay={() => setShowDebugOverlay(previous => !previous)}
              onToggleZoneEditor={() => {
                setShowRightDrawer(false);
                setShowZoneEditor(true);
              }}
              showDebugOverlay={showDebugOverlay}
              aiIsThinking={aiIsThinking}
              aiSpeedMultiplier={aiSpeedMultiplier}
              onSetAISpeed={setAISpeedMultiplier}
              onSkipAITurn={() => setSkipAITurn(true)}
            />
          </MobileDrawer>
        </>
      )}

      <GameBoardAuxiliaryLayer
        zoneEditorProps={showZoneEditor ? {
          onClose: () => setShowZoneEditor(false),
          onSave: handleSaveZones,
          onReset: handleResetZones,
          initialCenterPanel: centerPanel,
          initialZones: customZones,
          initialPaths: { ...MOVEMENT_PATHS },
          initialLayout: layout,
          initialAnimationLayers: animationLayers,
          initialMobileOverrides: mobileOverrides,
          initialHomeItemPositions: savedHomeItemPositions,
        } : null}
        overlayProps={{
          isMobile,
          isWaitingForOtherPlayer,
          phase,
          currentPlayer,
          isOnline,
          latency,
          roomCodeDisplay,
          isGuest,
          showTurnTransition,
          onTurnTransitionReady: () => setShowTurnTransition(false),
          aiIsThinking,
          currentAIAction,
          aiDifficulty,
          aiSpeedMultiplier,
          setAISpeedMultiplier,
          setSkipAITurn,
          connectionStatus,
          attemptReconnect,
        }}
        saveMenuOpen={showGameMenu}
        onCloseSaveMenu={() => setShowGameMenu(false)}
        deathModalProps={deathEvent ? {
          event: deathEvent,
          onDismiss: dismissDeathEvent,
        } : null}
        playerInfoProps={viewingPlayer ? {
          player: viewingPlayer,
          onClose: () => setViewingPlayer(null),
        } : null}
        chatProps={isOnline ? {
          messages: chatMessages,
          onSend: sendChatMessage,
          playerName: isPureSpectator ? 'Spectator' : (localPlayer?.name || 'Player'),
          playerColor: isPureSpectator ? '#9CA3AF' : (localPlayer?.color || '#888888'),
        } : null}
        showContextualTips={phase === 'playing'}
        spectatorOverlayProps={isSpectating ? {
          player: localPlayer,
          currentTurnPlayer: currentPlayer,
          isPureSpectator,
        } : null}
        topDropdownProps={!isMobile && fullboardMode && currentPlayer ? {
          player: currentPlayer,
          goals: goalSettings,
          players,
          currentPlayerIndex,
          onOpenSaveMenu: () => setShowGameMenu(true),
          onToggleDebugOverlay: () => setShowDebugOverlay(previous => !previous),
          onToggleZoneEditor: () => setShowZoneEditor(true),
          showDebugOverlay,
          aiIsThinking,
          aiSpeedMultiplier,
          onSetAISpeed: setAISpeedMultiplier,
          onSkipAITurn: () => setSkipAITurn(true),
          week,
          priceModifier,
          economyTrend,
          weather,
          onEndTurn: endTurn,
          endTurnDisabled: !isLocalPlayerTurn || aiIsThinking || !!currentPlayer.isAI,
          onExitFullboard: () => setFullboardMode(false),
        } : null}
      />
    </div>
  );
}
