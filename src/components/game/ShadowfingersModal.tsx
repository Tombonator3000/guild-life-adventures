// Guild Life - Shadowfingers Robbery Modal Component
// Displays when Shadowfingers robs the player with the character image
//
// NOTE: To display the Shadowfingers image, save the provided image to:
// src/assets/shadowfingers.jpg

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGameStore, type ShadowfingersEvent } from '@/store/gameStore';
import type { StreetRobberyResult, ApartmentRobberyResult } from '@/data/shadowfingers';
import { Skull } from 'lucide-react';

// Import the Shadowfingers image
import shadowfingersImage from '@/assets/shadowfingers.jpg';
const SHADOWFINGERS_IMAGE_PATH = shadowfingersImage;

interface ShadowfingersModalProps {
  event: ShadowfingersEvent | null;
  onDismiss: () => void;
}

export function ShadowfingersModal({ event, onDismiss }: ShadowfingersModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!event) return null;

  const isStreetRobbery = event.type === 'street';
  const result = event.result;

  // Get the headline and message based on robbery type
  const headline = result.headline;
  const message = result.message;

  // Calculate effects text
  let effectsText = '';
  if (isStreetRobbery) {
    const streetResult = result as StreetRobberyResult;
    effectsText = `Lost ${streetResult.goldStolen} gold, ${Math.abs(streetResult.happinessLoss)} happiness`;
  } else {
    const apartmentResult = result as ApartmentRobberyResult;
    const itemCount = apartmentResult.stolenItems.reduce((sum, item) => sum + item.quantity, 0);
    effectsText = `Lost ${itemCount} item${itemCount !== 1 ? 's' : ''}, ${Math.abs(apartmentResult.happinessLoss)} happiness`;
  }

  return (
    <Dialog open={!!event} onOpenChange={() => onDismiss()}>
      <DialogContent className="parchment-panel border-0 max-w-lg">
        <DialogHeader className="text-center">
          {/* Shadowfingers Image or Fallback */}
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-64 overflow-hidden rounded-lg border-4 border-amber-900 shadow-xl bg-gradient-to-b from-slate-700 to-slate-900">
              {!imageError ? (
                <img
                  src={SHADOWFINGERS_IMAGE_PATH}
                  alt="Shadowfingers - The Notorious Thief"
                  className="w-full h-full object-cover object-top"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Skull className="w-20 h-20 text-amber-200 mb-2" />
                  <span className="text-amber-200/70 text-xs text-center px-2">
                    Shadowfingers
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="font-display text-amber-200 text-sm font-bold drop-shadow-lg">
                  Shadowfingers
                </span>
              </div>
            </div>
          </div>

          {/* Newspaper-style headline */}
          <div className="bg-amber-100 border-2 border-amber-900 p-3 mb-2 shadow-inner">
            <div className="text-xs text-amber-800 uppercase tracking-wider mb-1">
              The Guildholm Herald - SPECIAL EDITION
            </div>
            <DialogTitle className="font-display text-xl text-amber-950 leading-tight">
              {headline}
            </DialogTitle>
          </div>

          <DialogDescription className="text-muted-foreground text-base italic">
            {message}
          </DialogDescription>
        </DialogHeader>

        {/* Effects display */}
        <div className="wood-frame p-3 text-card text-center my-4">
          <span className="font-display font-semibold text-destructive">{effectsText}</span>
        </div>

        {/* Stolen items list for apartment robbery */}
        {!isStreetRobbery && (event.result as ApartmentRobberyResult).stolenItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded p-3 mb-4">
            <div className="text-sm font-semibold text-amber-900 mb-2">Stolen Items:</div>
            <ul className="text-sm text-amber-800">
              {(event.result as ApartmentRobberyResult).stolenItems.map((item, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>{item.itemName}</span>
                  <span className="text-amber-600">x{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={onDismiss}
            className="w-full gold-button"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use Shadowfingers modal state
export function useShadowfingersModal() {
  const shadowfingersEvent = useGameStore((state) => state.shadowfingersEvent);
  const dismissShadowfingersEvent = useGameStore((state) => state.dismissShadowfingersEvent);

  return {
    event: shadowfingersEvent,
    dismiss: dismissShadowfingersEvent,
  };
}
