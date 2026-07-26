import { useShallow } from 'zustand/react/shallow';
import { useGameStore, useCurrentPlayer } from '@/store/gameStore';
import { MOVEMENT_PATHS } from '@/data/locations';
import { deriveGameBoardAudienceState } from '@/lib/deriveGameBoardAudienceState';
import { GameBoardHeader } from './GameBoardHeader';
import { useNetworkSync } from '@/network/useNetworkSync';
import { useZoneConfiguration } from '@/hooks/useZoneConfiguration';
import { useAITurnHandler } from '@/hooks/useAITurnHandler';
import { useAutoEndTurn } from '@/hooks/useAutoEndTurn';
import { useDeathSpectatorFlow } from '@/hooks/useDeathSpectatorFlow';
import { usePlayerAnimation } from '@/hooks/usePlayerAnimation';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGameBoardKeyboard } from '@/hooks/useGameBoardKeyboard';
import { useLocationClick } from '@/hooks/useLocationClick';
import { useGameBoardEventQueue } from '@/hooks/useGameBoardEventQueue';
import { useGameBoardTurnTransition } from '@/hooks/useGameBoardTurnTransition';
import { useGameBoardAnimationSync } from '@/hooks/useGameBoardAnimationSync';
import { useApplianceBreakageNotification } from '@/hooks/useApplianceBreakageNotification';
import { useGameBoardUiState } from '@/hooks/useGameBoardUiState';
import { useKeyboardLocationNav } from '@/hooks/useKeyboardLocationNav';
import { useGameOptions } from '@/hooks/useGameOptions';
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
    resetForNewGame,
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
    resetForNewGame: state.resetForNewGame,
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

  const { isLocalPlayerTurn, isWaitingForOtherPlayer, localPlayer, isPureSpectator, isSpectating } =
    deriveGameBoardAudienceState({ players, currentPlayer, localPlayerId, isOnline, phase });
  const { visibleDeathEvent, canSpectateAfterDeath, deathLeaveLabel, onSpectate, onLeave } =
    useDeathSpectatorFlow({ deathEvent, players, isOnline, networkMode, localPlayerId, dismissDeathEvent, resetForNewGame });
  const isCursed = (currentPlayer?.activeCurses?.length ?? 0) > 0;
  const { showTurnTransition, dismissTurnTransition } = useGameBoardTurnTransition({
    players,
    currentPlayer,
    phase,
    isOnline,
  });
  useApplianceBreakageNotification({
    event: applianceBreakageEvent,
    dismissEvent: dismissApplianceBreakageEvent,
  });

  const {
    showZoneEditor,
    setShowZoneEditor,
    openZoneEditor,
    closeZoneEditor,
    openMobileZoneEditor,
    showDebugOverlay,
    setShowDebugOverlay,
    toggleDebugOverlay,
    showGameMenu,
    setShowGameMenu,
    openGameMenu,
    closeGameMenu,
    openMobileGameMenu,
    showLeftDrawer,
    openLeftDrawer,
    closeLeftDrawer,
    showRightDrawer,
    openRightDrawer,
    closeRightDrawer,
    fullboardMode,
    setFullboardMode,
    enterFullboard,
    exitFullboard,
    viewingPlayer,
    setViewingPlayer,
    closePlayerInfo,
  } = useGameBoardUiState();
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
  useGameBoardAnimationSync({
    animatingPlayer,
    remoteAnimation,
    startRemoteAnimation,
    clearRemoteAnimation,
  });

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
        onOpenLeftDrawer: openLeftDrawer,
        onOpenRightDrawer: openRightDrawer,
        onOpenMenu: openGameMenu,
        disabled: !isLocalPlayerTurn || aiIsThinking || currentPlayer.isAI,
      } : null}
      sideInfoProps={currentPlayer ? {
        player: currentPlayer,
        goals: goalSettings,
        isCurrentPlayer: true,
      } : null}
      sharedRightSideProps={{
        players,
        currentPlayerIndex,
        goalSettings,
        showDebugOverlay,
        aiIsThinking,
        aiSpeedMultiplier,
        onSetAISpeed: setAISpeedMultiplier,
        onSkipAITurn: () => setSkipAITurn(true),
      }}
      desktopRightActions={{
        onOpenSaveMenu: openGameMenu,
        onToggleDebugOverlay: toggleDebugOverlay,
        onToggleZoneEditor: openZoneEditor,
        onToggleFullboard: enterFullboard,
      }}
      mobileRightActions={{
        onOpenSaveMenu: openMobileGameMenu,
        onToggleDebugOverlay: toggleDebugOverlay,
        onToggleZoneEditor: openMobileZoneEditor,
      }}
      leftDrawerProps={{
        isOpen: showLeftDrawer,
        onClose: closeLeftDrawer,
      }}
      rightDrawerProps={{
        isOpen: showRightDrawer,
        onClose: closeRightDrawer,
      }}
      auxiliaryContent={(
        <GameBoardAuxiliaryLayer
          zoneEditorProps={showZoneEditor ? {
            onClose: closeZoneEditor,
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
          onCloseSaveMenu={closeGameMenu}
          deathModalProps={visibleDeathEvent ? {
            event: visibleDeathEvent,
            onDismiss: dismissDeathEvent,
            onSpectate,
            onLeave,
            canSpectate: canSpectateAfterDeath,
            leaveLabel: deathLeaveLabel,
          } : null}
          playerInfoProps={viewingPlayer ? {
            player: viewingPlayer,
            onClose: closePlayerInfo,
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
            onOpenSaveMenu: openGameMenu,
            onToggleDebugOverlay: toggleDebugOverlay,
            onToggleZoneEditor: openZoneEditor,
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
            onExitFullboard: exitFullboard,
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
