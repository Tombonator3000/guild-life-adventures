/**
 * Keyboard location navigation hook.
 * When enableKeyboardNav option is on:
 *   Tab / Shift+Tab — cycle through board locations
 *   Space / Enter   — trigger click on focused location (travel or open panel)
 *   Escape          — clear keyboard focus (no conflict: Escape is also handled by main keyboard hook
 *                     but we clear our own focus first)
 *
 * Only active when no Radix dialog is open (same guard as useGameBoardKeyboard).
 */

import { useState, useEffect, useCallback } from 'react';
import { BOARD_PATH } from '@/data/locations';
import type { LocationId } from '@/types/game.types';

export function useKeyboardLocationNav({
  enabled,
  onLocationClick,
}: {
  enabled: boolean;
  onLocationClick: (locationId: string) => void;
}) {
  const [focusedLocationIndex, setFocusedLocationIndex] = useState<number | null>(null);

  const focusedLocationId: LocationId | null =
    focusedLocationIndex !== null ? BOARD_PATH[focusedLocationIndex] : null;

  const clearFocus = useCallback(() => setFocusedLocationIndex(null), []);

  useEffect(() => {
    if (!enabled) {
      setFocusedLocationIndex(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere when modifiers are held (Ctrl/Meta shortcuts)
      if (e.ctrlKey || e.metaKey) return;

      // Block when a Radix dialog is open
      const hasOpenDialog = !!document.querySelector('[role="dialog"]');
      if (hasOpenDialog) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        setFocusedLocationIndex(prev => {
          if (prev === null) {
            return e.shiftKey ? BOARD_PATH.length - 1 : 0;
          }
          if (e.shiftKey) {
            return (prev - 1 + BOARD_PATH.length) % BOARD_PATH.length;
          }
          return (prev + 1) % BOARD_PATH.length;
        });
        return;
      }

      if ((e.key === ' ' || e.key === 'Enter') && focusedLocationIndex !== null) {
        e.preventDefault();
        onLocationClick(BOARD_PATH[focusedLocationIndex]);
        return;
      }

      // Arrow keys: same direction as board ring
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedLocationIndex(prev =>
          prev === null ? 0 : (prev + 1) % BOARD_PATH.length
        );
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedLocationIndex(prev =>
          prev === null
            ? BOARD_PATH.length - 1
            : (prev - 1 + BOARD_PATH.length) % BOARD_PATH.length
        );
        return;
      }

      // Escape: clear keyboard focus (main hook handles menu open)
      if (e.key === 'Escape' && focusedLocationIndex !== null) {
        setFocusedLocationIndex(null);
        // Don't prevent default — let the main keyboard hook open/close the menu
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, focusedLocationIndex, onLocationClick]);

  return { focusedLocationId, clearFocus };
}
