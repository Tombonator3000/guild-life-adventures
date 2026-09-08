import type { ComponentProps, ElementType } from 'react';
import { CurseAppliancePanel } from './CurseAppliancePanel';
import { CursePanelOverlay } from './CursePanelOverlay';
import { CurseToadPanel } from './CurseToadPanel';
import { EventPanel } from './EventPanel';
import { LocationPanel } from './LocationPanel';
import { ResourcePanel } from './ResourcePanel';
import { ShadowfingersModal } from './ShadowfingersModal';
import { SpectatorPanel } from './SpectatorPanel';

type CenterPanel = { top: number; left: number; width: number; height: number };
type OptionalProps<T extends ElementType> = ComponentProps<T> | null;

interface GameBoardCenterPanelProps {
  isMobile: boolean;
  centerPanel: CenterPanel;
  isCursed: boolean;
  toadProps: OptionalProps<typeof CurseToadPanel>;
  applianceProps: OptionalProps<typeof CurseAppliancePanel>;
  shadowfingersProps: OptionalProps<typeof ShadowfingersModal>;
  eventProps: OptionalProps<typeof EventPanel>;
  locationProps: OptionalProps<typeof LocationPanel>;
  spectatorProps: OptionalProps<typeof SpectatorPanel>;
}

export function GameBoardCenterPanel({
  isMobile,
  centerPanel,
  isCursed,
  toadProps,
  applianceProps,
  shadowfingersProps,
  eventProps,
  locationProps,
  spectatorProps,
}: GameBoardCenterPanelProps) {
  return (
    <div
      data-fx-protect={`${centerPanel.top},${centerPanel.left},${centerPanel.width},${centerPanel.height}`}
      className={`overflow-hidden z-10 ${isMobile ? 'relative w-full h-full rounded-xl' : 'absolute'}`}
      style={isMobile ? undefined : {
        top: `${centerPanel.top}%`,
        left: `${centerPanel.left}%`,
        width: `${centerPanel.width}%`,
        height: `${centerPanel.height}%`,
      }}
    >
      <div className={`w-full h-full overflow-hidden flex flex-col bg-card/95 relative ${isMobile ? 'rounded-xl' : 'rounded-t-lg'} animate-scale-in`}>
        {isCursed && !applianceProps && !toadProps && <CursePanelOverlay isMobile={isMobile} />}
        {toadProps ? (
          <CurseToadPanel {...toadProps} />
        ) : applianceProps ? (
          <CurseAppliancePanel {...applianceProps} />
        ) : shadowfingersProps ? (
          <ShadowfingersModal {...shadowfingersProps} />
        ) : eventProps ? (
          <EventPanel {...eventProps} />
        ) : locationProps ? (
          <LocationPanel {...locationProps} />
        ) : spectatorProps ? (
          <SpectatorPanel {...spectatorProps} />
        ) : (
          <ResourcePanel compact={isMobile} />
        )}
      </div>
    </div>
  );
}
