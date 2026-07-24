import type { ComponentProps, ElementType, ReactNode } from 'react';
import { SideInfoTabs } from './SideInfoTabs';
import { RightSideTabs } from './RightSideTabs';
import { MobileHUD } from './MobileHUD';
import { MobileDrawer } from './MobileDrawer';
import { StoneBorderFrame } from './StoneBorderFrame';

type OptionalProps<T extends ElementType> = ComponentProps<T> | null;
type DrawerStateProps = Pick<ComponentProps<typeof MobileDrawer>, 'isOpen' | 'onClose'>;
type RightSideProps = ComponentProps<typeof RightSideTabs>;
type SharedRightSideProps = Pick<
  RightSideProps,
  | 'players'
  | 'currentPlayerIndex'
  | 'goalSettings'
  | 'showDebugOverlay'
  | 'aiIsThinking'
  | 'aiSpeedMultiplier'
  | 'onSetAISpeed'
  | 'onSkipAITurn'
>;
type RightSideActions = Pick<
  RightSideProps,
  'onOpenSaveMenu' | 'onToggleDebugOverlay' | 'onToggleZoneEditor'
>;
type DesktopRightSideActions = RightSideActions & Pick<RightSideProps, 'onToggleFullboard'>;

interface GameBoardSidePanelsProps {
  isMobile: boolean;
  fullboardMode: boolean;
  mobileHUDProps: OptionalProps<typeof MobileHUD>;
  sideInfoProps: OptionalProps<typeof SideInfoTabs>;
  sharedRightSideProps: SharedRightSideProps;
  desktopRightActions: DesktopRightSideActions;
  mobileRightActions: RightSideActions;
  leftDrawerProps: DrawerStateProps;
  rightDrawerProps: DrawerStateProps;
  children: ReactNode;
  auxiliaryContent: ReactNode;
}

const SIDE_PANEL_WIDTH_PERCENT = 12;

export function GameBoardSidePanels({
  isMobile,
  fullboardMode,
  mobileHUDProps,
  sideInfoProps,
  sharedRightSideProps,
  desktopRightActions,
  mobileRightActions,
  leftDrawerProps,
  rightDrawerProps,
  children,
  auxiliaryContent,
}: GameBoardSidePanelsProps) {
  return (
    <div
      className={`w-screen h-screen-safe overflow-hidden bg-background flex safe-area-all ${isMobile ? 'flex-col' : 'flex-row'}`}
      style={!isMobile && fullboardMode ? { paddingTop: '2rem' } : undefined}
    >
      {isMobile && mobileHUDProps && <MobileHUD {...mobileHUDProps} />}

      {!isMobile && !fullboardMode && (
        <div
          className="relative z-30 flex flex-col flex-shrink-0 h-full"
          style={{ width: `${SIDE_PANEL_WIDTH_PERCENT}%` }}
        >
          <StoneBorderFrame side="left">
            {sideInfoProps && <SideInfoTabs {...sideInfoProps} />}
          </StoneBorderFrame>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center min-w-0 min-h-0">
        {children}
      </div>

      {!isMobile && !fullboardMode && (
        <div
          className="relative z-30 flex flex-col flex-shrink-0 h-full"
          style={{ width: `${SIDE_PANEL_WIDTH_PERCENT}%` }}
        >
          <StoneBorderFrame side="right">
            <RightSideTabs {...sharedRightSideProps} {...desktopRightActions} />
          </StoneBorderFrame>
        </div>
      )}

      {isMobile && (
        <>
          <MobileDrawer
            {...leftDrawerProps}
            side="left"
            title="Stats & Inventory"
          >
            {sideInfoProps && <SideInfoTabs {...sideInfoProps} />}
          </MobileDrawer>
          <MobileDrawer
            {...rightDrawerProps}
            side="right"
            title="Players & Options"
          >
            <RightSideTabs {...sharedRightSideProps} {...mobileRightActions} />
          </MobileDrawer>
        </>
      )}

      {auxiliaryContent}
    </div>
  );
}
