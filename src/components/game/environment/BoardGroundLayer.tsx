import gameBoard from '@/assets/game-board.jpeg';
import type { BoardRect } from './effectAnchors';
import { GroundCloudShadows } from './GroundCloudShadows';
import { HeatShimmer } from './HeatShimmer';
import { useEnvironment } from './useEnvironment';

export function BoardGroundLayer({centerPanel}: {centerPanel: BoardRect}) {
  const {policy,weather}=useEnvironment();
  return <div className="board-ground-layer" aria-hidden="true">
    <div className="board-painting" style={{backgroundImage:`url(${gameBoard})`}} />
    {policy.enabled && policy.animated && weather?.type==='drought' && <HeatShimmer centerPanel={centerPanel} />}
    {policy.enabled && <GroundCloudShadows centerPanel={centerPanel} />}
  </div>;
}