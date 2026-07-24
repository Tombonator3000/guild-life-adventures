import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const gameBoardSource = readSource('src/components/game/GameBoard.tsx');
const auxiliarySource = readSource('src/components/game/GameBoardAuxiliaryLayer.tsx');
const canvasSource = readSource('src/components/game/GameBoardCanvas.tsx');
const centerSource = readSource('src/components/game/GameBoardCenterPanel.tsx');

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

  it('keeps extracted components within focused size limits', () => {
    expect(gameBoardSource.split('\n').length).toBeLessThan(520);
    expect(auxiliarySource.split('\n').length).toBeLessThan(80);
    expect(canvasSource.split('\n').length).toBeLessThan(210);
    expect(centerSource.split('\n').length).toBeLessThan(100);
  });
});
