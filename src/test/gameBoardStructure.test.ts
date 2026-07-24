import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const gameBoardSource = readSource('src/components/game/GameBoard.tsx');
const auxiliarySource = readSource('src/components/game/GameBoardAuxiliaryLayer.tsx');

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

  it('keeps the main board component below its previous monolithic size', () => {
    expect(gameBoardSource.split('\n').length).toBeLessThan(700);
    expect(auxiliarySource.split('\n').length).toBeLessThan(80);
  });
});
