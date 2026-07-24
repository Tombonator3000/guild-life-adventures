import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { getAppliance } from '@/data/items';
import { MOVEMENT_PATHS } from '@/data/locations';
import { GameBoardHeader } from './GameBoardHeader';
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
import { useGameBoardEventQueue } from '@/hooks/useGameBoardEventQueue';
import { useGameBoardTurnTransition } from '@/hooks/useGameBoardTurnTransition';
import { useKeyboardLocationNav } from '@/hooks/useKeyboardLocationNav';
import { useGameOptions } from '@/hooks/useGameOptions';
import { registerAIAnimateCallback } from '@/hooks/useAIAnimationBridge';
import { GameBoardAuxiliaryLayer } from './GameBoardAuxiliaryLayer';
import { GameBoardCanvas } from './GameBoardCanvas';
import { GameBoardCenterPanel } from './GameBoardCenterPanel';
import { GameBoardSidePanels } from './GameBoardSidePanels';
import { useShadowfingersModal } from './ShadowfingersModal';

export function GameBoard() {
  const {
    players,
    selectedLocation,
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
  const { showTurnTransition, dismissTurnTransition } = useGameBoardTurnTransition({
    players,
    currentPlayer,
    phase,
    isOnline,
  });

  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [fullboardMode, setFullboardMode] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const isMobile = useIsMobile();

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
  const { queuedEvent, handleEventDismiss } = useGameBoardEventQueue({
    currentEvent,
    eventSource,
    dismissEvent,
  });

  const { options: gameOptions } = useGameOptions();
  const { focusedLocationId } = useKeyboardLocationNav({
    enabled: gameOptions.enableKeyboardNav && !aiIsThinking && phase === 'playing' && isLocalPlayerTurn,
    onLocationClick: handleLocationClick,
  });

  const shadowfingersTargetLocation = shadowfingersEvent && currentPlayer
    ? shadowfingersEvent.type === 'street' && 'fromLocation' in shadowfingersEvent.result
      ? shadowfingersEvent.result.fromLocation
      : currentPlayer.currentLocation
    : null;

  return (
    <GameBoardSidePanels
      isMobile={isMobile}
      fullboardMode={fullboardMode}
      mobileHUDProps={currentPlayer ? {
        player: currentPlayer,
        week,
        priceModifier,
        economyTrend,
        onEndTurn: endTurn,
        onOpenLeftDrawer: () => setShowLeftDrawer(true),
        onOpenRightDrawer: () => setShowRightDrawer(true),
        onOpenMenu: () => setShowGameMenu(true),
        disabled: !isLocalPlayerTurn || aiIsThinking || currentPlayer.isAI,
      } : null}
      sideInfoProps={currentPlayer ? {
        player: currentPlayer,
        goals: goalSettings,
        isCurrentPlayer: true,
      } : null}
      desktopRightProps={{
        players,
        currentPlayerIndex,
        goalSettings,
        onOpenSaveMenu: () => setShowGameMenu(true),
        onToggleDebugOverlay: () => setShowDebugOverlay(previous => !previous),
        onToggleZoneEditor: () => setShowZoneEditor(true),
        showDebugOverlay,
        aiIsThinking,
        aiSpeedMultiplier,
        onSetAISpeed: setAISpeedMultiplier,
        onSkipAITurn: () => setSkipAITurn(true),
        onToggleFullboard: () => setFullboardMode(true),
      }}
      mobileRightProps={{
        players,
        currentPlayerIndex,
        goalSettings,
        onOpenSaveMenu: () => {
          setShowRightDrawer(false);
          setShowGameMenu(true);
        },
        onToggleDebugOverlay: () => setShowDebugOverlay(previous => !previous),
        onToggleZoneEditor: () => {
          setShowRightDrawer(false);
          setShowZoneEditor(true);
        },
        showDebugOverlay,
        aiIsThinking,
        aiSpeedMultiplier,
        onSetAISpeed: setAISpeedMultiplier,
        onSkipAITurn: () => setSkipAITurn(true),
      }}
      leftDrawerProps={{
        isOpen: showLeftDrawer,
        onClose: () => setShowLeftDrawer(false),
      }}
      rightDrawerProps={{
        isOpen: showRightDrawer,
        onClose: () => setShowRightDrawer(false),
      }}
      auxiliaryContent={(
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
            onTurnTransitionReady: dismissTurnTransition,
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
      )}
    >
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
        <GameBoardCenterPanel
          isMobile={isMobile}
          centerPanel={activeCenterPanel}
          isCursed={isCursed}
          toadProps={toadCurseEvent ? {
            hoursLost: toadCurseEvent.hoursLost,
            curserName: toadCurseEvent.curserName,
            onDismiss: dismissToadCurseEvent,
          } : null}
          applianceProps={applianceBreakageEvent?.fromCurse ? {
            applianceId: applianceBreakageEvent.applianceId,
            originalPrice: applianceBreakageEvent.originalPrice ?? applianceBreakageEvent.repairCost * 2,
            curserName: applianceBreakageEvent.curserName,
            onDismiss: dismissApplianceBreakageEvent,
          } : null}
          shadowfingersProps={shadowfingersEvent ? {
            event: shadowfingersEvent,
            onDismiss: dismissShadowfingers,
          } : null}
          eventProps={phase === 'event' && queuedEvent ? {
            event: queuedEvent,
            onDismiss: handleEventDismiss,
          } : null}
          locationProps={selectedLocation ? { locationId: selectedLocation } : null}
          spectatorProps={isSpectating ? {
            players,
            goalSettings,
            week,
            stockPrices,
            isPureSpectator,
          } : null}
        />

        {!isMobile && !fullboardMode && (
          <GameBoardHeader
            week={week}
            priceModifier={priceModifier}
            economyTrend={economyTrend}
            weather={weather}
          />
        )}
      </GameBoardCanvas>
    </GameBoardSidePanels>
  );
}
