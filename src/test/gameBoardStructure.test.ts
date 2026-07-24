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
    expect(gameBoardSource).toContain('setShowRightDrawer(false);\n          setShowGameMenu(true);');
    expect(gameBoardSource).toContain('setShowRightDrawer(false);\n          setShowZoneEditor(true);');
    expect(gameBoardSource).toContain('onToggleFullboard: () => setFullboardMode(true)');
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

  it('keeps extracted components within focused size limits', () => {
    expect(gameBoardSource.split('\n').length).toBeLessThan(450);
    expect(auxiliarySource.split('\n').length).toBeLessThan(80);
    expect(canvasSource.split('\n').length).toBeLessThan(210);
    expect(centerSource.split('\n').length).toBeLessThan(100);
    expect(sidePanelsSource.split('\n').length).toBeLessThan(100);
    expect(eventQueueSource.split('\n').length).toBeLessThan(60);
  });
});
