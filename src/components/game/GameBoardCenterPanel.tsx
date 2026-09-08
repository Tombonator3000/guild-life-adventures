import type { ComponentProps, ElementType } from 'react';
import { getLocation } from '@/data/locations';
import { CurseAppliancePanel } from './CurseAppliancePanel';
import { CursePanelOverlay } from './CursePanelOverlay';
import { CurseToadPanel } from './CurseToadPanel';
import { EventPanel } from './EventPanel';
import { LocationPanel } from './LocationPanel';
import { ResourcePanel } from './ResourcePanel';
import { CharacterPanel } from './CharacterPanel';
import { ShadowfingersModal } from './ShadowfingersModal';
import { SpectatorPanel } from './SpectatorPanel';

type CenterPanel = { top: number; left: number; width: number; height: number };
type OptionalProps<T extends ElementType> = ComponentProps<T> | null;

interface GameBoardCenterPanelProps {
  isMobile: boolean;
  centerPanel: CenterPanel;
  isCursed: boolean;
  onEndTurn?: () => void;
  endTurnDisabled?: boolean;
  hoursRemaining?: number;
  playerInfoProps?: OptionalProps<typeof CharacterPanel>;
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
  onEndTurn,
  endTurnDisabled,
  hoursRemaining,
  playerInfoProps,
  toadProps,
  applianceProps,
  shadowfingersProps,
  eventProps,
  locationProps,
  spectatorProps,
}: GameBoardCenterPanelProps) {
  const showCharacter = !!playerInfoProps && !toadProps && !applianceProps && !shadowfingersProps && !eventProps;
  const locationName = locationProps && !eventProps && !shadowfingersProps && !toadProps && !applianceProps
    ? getLocation(locationProps.locationId)?.name : undefined;
  return (
    <div
      data-center-panel
      data-fx-protect={`${centerPanel.top},${centerPanel.left},${centerPanel.width},${centerPanel.height}`}
      className={`overflow-hidden z-10 ${isMobile ? 'relative w-full h-full rounded-xl' : 'absolute'}`}
      style={isMobile ? undefined : {
        top: `${centerPanel.top}%`,
        left: `${centerPanel.left}%`,
        width: `${centerPanel.width}%`,
        height: `${centerPanel.height}%`,
      }}
    >
      <div className={`w-full h-full overflow-hidden flex flex-col bg-card/95 relative ${isMobile ? 'rounded-xl' : 'rounded-t-lg'}`}>
        {onEndTurn && <div className="center-turn-toolbar" data-fx-protect>
          <span>{locationName && <strong>{locationName}</strong>}<small>{hoursRemaining ?? 0}h left this week</small></span>
          <button className="gold-button" title="End your turn (E)" onClick={onEndTurn} disabled={endTurnDisabled}>End Turn</button>
        </div>}
        <div className="center-panel-content flex-1 min-h-0 overflow-hidden relative flex flex-col">
        {isCursed && !applianceProps && !toadProps && <CursePanelOverlay isMobile={isMobile} />}
        {showCharacter && <CharacterPanel {...playerInfoProps} />}
        <div className={showCharacter ? 'hidden' : 'flex flex-col flex-1 min-h-0 overflow-hidden'}>
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
          <ResourcePanel />
        )}
        </div>
        </div>
      </div>
    </div>
  );
}
