import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const gameBoardSource = readSource('src/components/game/GameBoard.tsx');
const auxiliarySource = readSource('src/components/game/GameBoardAuxiliaryLayer.tsx');
const canvasSource = readSource('src/components/game/GameBoardCanvas.tsx');
const centerSource = readSource('src/components/game/GameBoardCenterPanel.tsx');
const sidePanelsSource = readSource('src/components/game/GameBoardSidePanels.tsx');
const eventQueueSource = readSource('src/hooks/useGameBoardEventQueue.ts');
const turnTransitionSource = readSource('src/hooks/useGameBoardTurnTransition.ts');
const animationSyncSource = readSource('src/hooks/useGameBoardAnimationSync.ts');
const applianceNotificationSource = readSource('src/hooks/useApplianceBreakageNotification.ts');
const deathSpectatorFlowSource = readSource('src/hooks/useDeathSpectatorFlow.ts');
const uiStateSource = readSource('src/hooks/useGameBoardUiState.ts');
const audienceStateSource = readSource('src/lib/deriveGameBoardAudienceState.ts');

const extractedComponents = [
  'ZoneEditor',
  'GameBoardOverlays',
  'SaveLoadMenu',
  'DeathModal',
  'PlayerInfoModal',
  'UpdateBanner',
  'ChatPanel',
  'ContextualTips',
  'SpectatorOverlay',
  'TopDropdownMenu',
];

const canvasComponents = [
  'LocationZone',
  'PlayerToken',
  'AnimatedPlayerToken',
  'ShadowfingersToken',
  'GraveyardCrows',
  'FestivalOverlay',
  'WeatherOverlay',
  'DebugOverlay',
  'BanterBubble',
];

const centerComponents = [
  'CursePanelOverlay',
  'CurseToadPanel',
  'CurseAppliancePanel',
  'ShadowfingersModal',
  'EventPanel',
  'LocationPanel',
  'SpectatorPanel',
  'ResourcePanel',
];

const sidePanelComponents = [
  'SideInfoTabs',
  'RightSideTabs',
  'MobileHUD',
  'MobileDrawer',
  'StoneBorderFrame',
];

describe('GameBoard component boundaries', () => {
  it('delegates root-level auxiliary UI to GameBoardAuxiliaryLayer', () => {
    expect(gameBoardSource).toContain("import { GameBoardAuxiliaryLayer } from './GameBoardAuxiliaryLayer';");
    expect(gameBoardSource).toContain('<GameBoardAuxiliaryLayer');
    for (const component of extractedComponents) {
      expect(gameBoardSource).not.toMatch(new RegExp(`import \\{?\\s*${component}\\s*\\}? from`));
      expect(auxiliarySource).toContain(component);
    }
  });

  it('uses native component prop types instead of parallel overlay models', () => {
    expect(auxiliarySource).toContain("import type { ComponentProps, ElementType } from 'react';");
    expect(auxiliarySource).toContain('ComponentProps<typeof GameBoardOverlays>');
    expect(centerSource).toContain("import type { ComponentProps, ElementType } from 'react';");
    expect(centerSource).toContain('type OptionalProps<T extends ElementType> = ComponentProps<T> | null;');
    expect(sidePanelsSource).toContain("import type { ComponentProps, ElementType, ReactNode } from 'react';");
    expect(sidePanelsSource).toContain('type OptionalProps<T extends ElementType> = ComponentProps<T> | null;');
    expect(sidePanelsSource).toContain("Pick<ComponentProps<typeof MobileDrawer>, 'isOpen' | 'onClose'>");
    expect(sidePanelsSource).toContain('type RightSideProps = ComponentProps<typeof RightSideTabs>;');
    expect(sidePanelsSource).toContain('type SharedRightSideProps = Pick<');
    expect(sidePanelsSource).toContain('type RightSideActions = Pick<');
  });

  it('delegates board rendering and visual overlays to GameBoardCanvas', () => {
    expect(gameBoardSource).toContain("import { GameBoardCanvas } from './GameBoardCanvas';");
    expect(gameBoardSource).toContain('<GameBoardCanvas');
    expect(gameBoardSource).not.toContain('LOCATIONS.map');
    expect(gameBoardSource).not.toContain('BoardBanterOverlay');
    for (const component of canvasComponents) {
      expect(gameBoardSource).not.toMatch(new RegExp(`import \\{?\\s*${component}\\s*\\}? from`));
      expect(canvasSource).toContain(component);
    }
  });

  it('delegates center presentation while keeping state-derived props in GameBoard', () => {
    expect(gameBoardSource).toContain("import { GameBoardCenterPanel } from './GameBoardCenterPanel';");
    expect(gameBoardSource).toContain('<GameBoardCenterPanel');
    expect(gameBoardSource).toContain("eventProps={phase === 'event' && queuedEvent ? {");
    expect(gameBoardSource).toContain('locationProps={selectedLocation ? { locationId: selectedLocation } : null}');
    for (const component of centerComponents) {
      expect(gameBoardSource).not.toMatch(new RegExp(`import \\{?\\s*${component}\\s*\\}? from`));
      expect(centerSource).toContain(component);
    }
  });

  it('preserves the center panel priority order', () => {
    const order = [
      'toadProps ?',
      'applianceProps ?',
      'shadowfingersProps ?',
      'eventProps ?',
      'locationProps ?',
      'spectatorProps ?',
      '<ResourcePanel />',
    ].map(token => centerSource.indexOf(token));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(centerSource).toContain('isCursed && !applianceProps && !toadProps');
  });

  it('delegates desktop and mobile side panel rendering to GameBoardSidePanels', () => {
    expect(gameBoardSource).toContain("import { GameBoardSidePanels } from './GameBoardSidePanels';");
    expect(gameBoardSource).toContain('<GameBoardSidePanels');
    expect(gameBoardSource).not.toContain('w-screen h-screen-safe');
    expect(sidePanelsSource).toContain('w-screen h-screen-safe');
    for (const component of sidePanelComponents) {
      expect(gameBoardSource).not.toMatch(new RegExp(`import \\{?\\s*${component}\\s*\\}? from`));
      expect(sidePanelsSource).toContain(component);
    }
  });

  it('preserves responsive DOM order and mobile close-before-open flows', () => {
    const order = [
      'isMobile && mobileHUDProps',
      '<StoneBorderFrame side="left">',
      '{children}',
      '<StoneBorderFrame side="right">',
      '{isMobile && (',
      '{auxiliaryContent}',
    ].map(token => sidePanelsSource.indexOf(token));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(sidePanelsSource.match(/!isMobile && !fullboardMode/g)).toHaveLength(2);
    expect(sidePanelsSource).toContain('side="left"');
    expect(sidePanelsSource).toContain('side="right"');
    expect(uiStateSource).toContain('setShowRightDrawer(false);\n    setShowGameMenu(true);');
    expect(uiStateSource).toContain('setShowRightDrawer(false);\n    setShowZoneEditor(true);');
    expect(gameBoardSource).toContain('onToggleFullboard: enterFullboard');
  });

  it('shares stable RightSideTabs data while keeping desktop and mobile actions separate', () => {
    expect(gameBoardSource).toContain('sharedRightSideProps={{');
    expect(gameBoardSource).toContain('desktopRightActions={{');
    expect(gameBoardSource).toContain('mobileRightActions={{');
    expect(gameBoardSource).not.toContain('desktopRightProps={{');
    expect(gameBoardSource).not.toContain('mobileRightProps={{');
    expect(sidePanelsSource).toContain('<RightSideTabs {...sharedRightSideProps} {...desktopRightActions} />');
    expect(sidePanelsSource).toContain('<RightSideTabs {...sharedRightSideProps} {...mobileRightActions} />');
    expect(sidePanelsSource).toContain("type DesktopRightSideActions = RightSideActions & Pick<RightSideProps, 'onToggleFullboard'>;");
  });

  it('delegates transient UI state and named actions to useGameBoardUiState', () => {
    expect(gameBoardSource).toContain("import { useGameBoardUiState } from '@/hooks/useGameBoardUiState';");
    expect(gameBoardSource).toContain('} = useGameBoardUiState();');
    expect(gameBoardSource).not.toContain('useState(');
    expect(gameBoardSource).not.toContain('setShowGameMenu(false)');
    expect(gameBoardSource).not.toContain('setShowRightDrawer(false)');
    expect(gameBoardSource).toContain('onOpenSaveMenu: openMobileGameMenu');
    expect(gameBoardSource).toContain('onToggleZoneEditor: openMobileZoneEditor');
    expect(gameBoardSource).toContain('onCloseSaveMenu={closeGameMenu}');
    expect(gameBoardSource).toContain('onExitFullboard: exitFullboard');
    expect(uiStateSource).toContain("import { useCallback, useState } from 'react';");
    expect(uiStateSource).toContain('const closePlayerInfo = useCallback(() => setViewingPlayer(null), []);');
  });

  it('does not subscribe to dead GameBoard state or keep unused layout aliases', () => {
    expect(gameBoardSource).not.toContain('selectLocation: state.selectLocation');
    expect(gameBoardSource).not.toContain('skipAITurn: state.skipAITurn');
    expect(gameBoardSource).not.toContain('const activeLayout =');
    expect(gameBoardSource).toContain('setSkipAITurn: state.setSkipAITurn');
    expect(gameBoardSource).toContain('initialLayout: layout');
  });

  it('delegates queued event coordination to useGameBoardEventQueue', () => {
    expect(gameBoardSource).toContain("import { useGameBoardEventQueue } from '@/hooks/useGameBoardEventQueue';");
    expect(gameBoardSource).toContain('const { queuedEvent, handleEventDismiss } = useGameBoardEventQueue({');
    expect(gameBoardSource).not.toContain('const [eventQueueIdx');
    expect(gameBoardSource).not.toContain('const eventLines =');
    expect(gameBoardSource).not.toContain('const totalEventCount =');
    expect(eventQueueSource).toContain("const isWeekendEvent = eventSource === 'weekend';");
    expect(eventQueueSource).toContain('setEventQueueIdx(index => index + 1);');
    expect(eventQueueSource).toContain('dismissEvent();');
  });

  it('delegates hotseat transition tracking to useGameBoardTurnTransition', () => {
    expect(gameBoardSource).toContain("import { useGameBoardTurnTransition } from '@/hooks/useGameBoardTurnTransition';");
    expect(gameBoardSource).toContain('const { showTurnTransition, dismissTurnTransition } = useGameBoardTurnTransition({');
    expect(gameBoardSource).toContain('onTurnTransitionReady: dismissTurnTransition');
    expect(gameBoardSource).not.toContain('lastHumanPlayerId');
    expect(gameBoardSource).not.toContain('const humanPlayers =');
    expect(gameBoardSource).not.toContain('const isMultiHuman =');
    expect(turnTransitionSource).toContain('const lastHumanPlayerId = useRef<string | null>(null);');
    expect(turnTransitionSource).toContain('const isMultiHuman = !isOnline && activeHumanPlayers.length >= 2;');
  });

  it('delegates AI and remote animation effects to useGameBoardAnimationSync', () => {
    expect(gameBoardSource).toContain("import { useGameBoardAnimationSync } from '@/hooks/useGameBoardAnimationSync';");
    expect(gameBoardSource).toContain('useGameBoardAnimationSync({');
    expect(gameBoardSource).not.toContain('registerAIAnimateCallback');
    expect(gameBoardSource).not.toContain('if (remoteAnimation && !animatingPlayer)');
    expect(animationSyncSource).toContain('registerAIAnimateCallback(startRemoteAnimation);');
    expect(animationSyncSource).toContain('return () => registerAIAnimateCallback(null);');
    expect(animationSyncSource).toContain('if (!remoteAnimation || animatingPlayer) return;');
    expect(animationSyncSource).toContain('clearRemoteAnimation();');
  });

  it('delegates regular appliance breakage notifications to a focused hook', () => {
    expect(gameBoardSource).toContain("import { useApplianceBreakageNotification } from '@/hooks/useApplianceBreakageNotification';");
    expect(gameBoardSource).toContain('useApplianceBreakageNotification({');
    expect(gameBoardSource).not.toContain("from 'react'");
    expect(gameBoardSource).not.toContain('getAppliance');
    expect(gameBoardSource).not.toContain('toast.warning');
    expect(gameBoardSource).not.toContain('useEffect');
    expect(applianceNotificationSource).toContain('if (!event || event.fromCurse) return;');
    expect(applianceNotificationSource).toContain('const appliance = getAppliance(event.applianceId);');
    expect(applianceNotificationSource).toContain('toast.warning(');
    expect(applianceNotificationSource).toContain('dismissEvent();');
  });

  it('delegates local player and spectator derivation to a pure helper', () => {
    expect(gameBoardSource).toContain("import { deriveGameBoardAudienceState } from '@/lib/deriveGameBoardAudienceState';");
    expect(gameBoardSource).toContain('deriveGameBoardAudienceState({');
    expect(gameBoardSource).not.toContain('const isLocalPlayerTurn =');
    expect(gameBoardSource).not.toContain('const isWaitingForOtherPlayer =');
    expect(gameBoardSource).not.toContain('players.find(player => player.id === localPlayerId)');
    expect(audienceStateSource).toContain("phase: GameState['phase'];");
    expect(audienceStateSource).toContain('const currentPlayerCanAct = !!currentPlayer && !currentPlayer.isGameOver;');
    expect(audienceStateSource).toContain('const isLocalPlayerTurn = currentPlayerCanAct && (');
    expect(audienceStateSource).toContain('const isPureSpectator = isOnline && !localPlayerId;');
    expect(audienceStateSource).toContain("&& phase === 'playing'");
    expect(audienceStateSource).toContain('players.some(player => !player.isGameOver)');
  });

  it('delegates death-screen audience and leave cleanup to a focused hook', () => {
    expect(gameBoardSource).toContain("import { useDeathSpectatorFlow } from '@/hooks/useDeathSpectatorFlow';");
    expect(gameBoardSource).toContain('useDeathSpectatorFlow({');
    expect(gameBoardSource).not.toContain('leaveActiveOnlineGame(');
    expect(deathSpectatorFlowSource).toContain('deathEvent.playerId === localPlayerId');
    expect(deathSpectatorFlowSource).toContain('leaveActiveOnlineGame(');
    expect(deathSpectatorFlowSource).toContain("networkMode === 'host'");
  });

  it('keeps extracted components within focused size limits', () => {
    expect(gameBoardSource.split('\n').length).toBeLessThan(440);
    expect(auxiliarySource.split('\n').length).toBeLessThan(80);
    expect(canvasSource.split('\n').length).toBeLessThan(210);
    expect(centerSource.split('\n').length).toBeLessThan(100);
    expect(sidePanelsSource.split('\n').length).toBeLessThan(125);
    expect(eventQueueSource.split('\n').length).toBeLessThan(60);
    expect(turnTransitionSource.split('\n').length).toBeLessThan(55);
    expect(animationSyncSource.split('\n').length).toBeLessThan(45);
    expect(applianceNotificationSource.split('\n').length).toBeLessThan(40);
    expect(deathSpectatorFlowSource.split('\n').length).toBeLessThan(75);
    expect(uiStateSource.split('\n').length).toBeLessThan(75);
    expect(audienceStateSource.split('\n').length).toBeLessThan(45);
  });
});
