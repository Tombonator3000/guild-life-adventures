import type { ComponentProps } from 'react';
import { ZoneEditor } from './ZoneEditor';
import { GameBoardOverlays } from './GameBoardOverlays';
import { SaveLoadMenu } from './SaveLoadMenu';
import { DeathModal } from './DeathModal';
import { PlayerInfoModal } from './PlayerInfoModal';
import { UpdateBanner } from './UpdateBanner';
import { ChatPanel } from './ChatPanel';
import { ContextualTips } from './ContextualTips';
import { SpectatorOverlay } from './SpectatorOverlay';
import { TopDropdownMenu } from './TopDropdownMenu';

type OptionalComponentProps<T> = ComponentProps<T> | null;

interface GameBoardAuxiliaryLayerProps {
  zoneEditorProps: OptionalComponentProps<typeof ZoneEditor>;
  overlayProps: ComponentProps<typeof GameBoardOverlays>;
  saveMenuOpen: boolean;
  onCloseSaveMenu: () => void;
  deathModalProps: OptionalComponentProps<typeof DeathModal>;
  playerInfoProps: OptionalComponentProps<typeof PlayerInfoModal>;
  chatProps: OptionalComponentProps<typeof ChatPanel>;
  showContextualTips: boolean;
  spectatorOverlayProps: OptionalComponentProps<typeof SpectatorOverlay>;
  topDropdownProps: OptionalComponentProps<typeof TopDropdownMenu>;
}

/**
 * Root-level overlays and auxiliary UI that do not participate in board-map
 * rendering. Grouping their native component props keeps GameBoard focused on
 * state orchestration and the board itself without inventing parallel types.
 */
export function GameBoardAuxiliaryLayer({
  zoneEditorProps,
  overlayProps,
  saveMenuOpen,
  onCloseSaveMenu,
  deathModalProps,
  playerInfoProps,
  chatProps,
  showContextualTips,
  spectatorOverlayProps,
  topDropdownProps,
}: GameBoardAuxiliaryLayerProps) {
  return (
    <>
      {zoneEditorProps && <ZoneEditor {...zoneEditorProps} />}
      <GameBoardOverlays {...overlayProps} />
      {saveMenuOpen && <SaveLoadMenu onClose={onCloseSaveMenu} />}
      {deathModalProps && <DeathModal {...deathModalProps} />}
      {playerInfoProps && <PlayerInfoModal {...playerInfoProps} />}
      <UpdateBanner />
      {chatProps && <ChatPanel {...chatProps} />}
      {showContextualTips && <ContextualTips />}
      {spectatorOverlayProps && <SpectatorOverlay {...spectatorOverlayProps} />}
      {topDropdownProps && <TopDropdownMenu {...topDropdownProps} />}
    </>
  );
}
