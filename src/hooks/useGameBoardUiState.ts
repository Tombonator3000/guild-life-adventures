import { useCallback, useState } from 'react';
import type { Player } from '@/types/game.types';

export function useGameBoardUiState() {
  const [showZoneEditor, setShowZoneEditor] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [fullboardMode, setFullboardMode] = useState(false);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);

  const openZoneEditor = useCallback(() => setShowZoneEditor(true), []);
  const closeZoneEditor = useCallback(() => setShowZoneEditor(false), []);
  const openMobileZoneEditor = useCallback(() => {
    setShowRightDrawer(false);
    setShowZoneEditor(true);
  }, []);
  const toggleDebugOverlay = useCallback(() => {
    setShowDebugOverlay(previous => !previous);
  }, []);
  const openGameMenu = useCallback(() => setShowGameMenu(true), []);
  const closeGameMenu = useCallback(() => setShowGameMenu(false), []);
  const openMobileGameMenu = useCallback(() => {
    setShowRightDrawer(false);
    setShowGameMenu(true);
  }, []);
  const openLeftDrawer = useCallback(() => setShowLeftDrawer(true), []);
  const closeLeftDrawer = useCallback(() => setShowLeftDrawer(false), []);
  const openRightDrawer = useCallback(() => setShowRightDrawer(true), []);
  const closeRightDrawer = useCallback(() => setShowRightDrawer(false), []);
  const enterFullboard = useCallback(() => setFullboardMode(true), []);
  const exitFullboard = useCallback(() => setFullboardMode(false), []);
  const closePlayerInfo = useCallback(() => setViewingPlayer(null), []);

  return {
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
  };
}
