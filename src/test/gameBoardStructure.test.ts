import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const gameBoardSource = readSource('src/components/game/GameBoard.tsx');
const auxiliarySource = readSource('src/components/game/GameBoardAuxiliaryLayer.tsx');
const canvasSource = readSource('src/components/game/GameBoardCanvas.tsx');

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
    expect(auxiliarySource).toContain('OptionalComponentProps<typeof ZoneEditor>');
    expect(auxiliarySource).toContain('OptionalComponentProps<typeof TopDropdownMenu>');
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

  it('keeps event and location panel priority in GameBoard children', () => {
    expect(gameBoardSource).toContain("phase === 'event' && queuedEvent");
    expect(gameBoardSource).toContain('<LocationPanel locationId={selectedLocation} />');
    expect(gameBoardSource).toContain('<ResourcePanel />');
    expect(canvasSource).toContain('{children}');
  });

  it('keeps extracted components within focused size limits', () => {
    expect(gameBoardSource.split('\n').length).toBeLessThan(520);
    expect(auxiliarySource.split('\n').length).toBeLessThan(80);
    expect(canvasSource.split('\n').length).toBeLessThan(210);
  });
});
