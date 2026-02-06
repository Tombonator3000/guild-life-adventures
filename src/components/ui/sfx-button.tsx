// SFXButton — A button wrapper that plays sound effects on click.
// Wraps any button-like element and adds SFX.

import * as React from 'react';
import { playSFX, type SFXId } from '@/audio/sfxManager';
import { Button, type ButtonProps } from '@/components/ui/button';

interface SFXButtonProps extends ButtonProps {
  sfx?: SFXId;
  hoverSfx?: SFXId;
}

/**
 * Button with sound effects.
 * Default click sound is 'button-click'.
 */
export const SFXButton = React.forwardRef<HTMLButtonElement, SFXButtonProps>(
  ({ sfx = 'button-click', hoverSfx, onClick, onMouseEnter, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!props.disabled) {
        playSFX(sfx);
      }
      onClick?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hoverSfx && !props.disabled) {
        playSFX(hoverSfx);
      }
      onMouseEnter?.(e);
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
SFXButton.displayName = 'SFXButton';

/**
 * Hook to add SFX to any click handler.
 * Usage: onClick={withSFX(() => doSomething(), 'coin-gain')}
 */
export function withSFX<T extends (...args: any[]) => any>(
  handler: T,
  sfxId: SFXId = 'button-click'
): T {
  return ((...args: Parameters<T>) => {
    playSFX(sfxId);
    return handler(...args);
  }) as T;
}

/**
 * Simple click handler that just plays SFX.
 * Usage: <button onClick={useSFXClick('gold-button-click', handleAction)}>
 */
export function useSFXClick(sfxId: SFXId, handler?: () => void) {
  return () => {
    playSFX(sfxId);
    handler?.();
  };
}
