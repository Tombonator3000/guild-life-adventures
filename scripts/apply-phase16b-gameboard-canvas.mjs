import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/game/GameBoard.tsx';
let source = readFileSync(path, 'utf8');

const removals = [
  "import { LOCATIONS, getMovementCost, getPath } from '@/data/locations';\n",
  "import { LocationZone } from './LocationZone';\n",
  "import { PlayerToken } from './PlayerToken';\n",
  "import { AnimatedPlayerToken } from './AnimatedPlayerToken';\n",
  "import { WeatherOverlay } from './WeatherOverlay';\n",
  "import { FestivalOverlay } from './FestivalOverlay';\n",
  "import { BanterBubble } from './BanterBubble';\n",
  "import { useBanterStore } from '@/store/banterStore';\n",
  "import { DebugOverlay } from './DebugOverlay';\n",
  "import { GraveyardCrows } from './GraveyardCrows';\n",
  "import gameBoard from '@/assets/game-board.jpeg';\n",
  "import { ShadowfingersToken } from './ShadowfingersToken';\n",
  "import { getQuestLocationObjectives } from '@/data/quests';\n",
];
for (const removal of removals) source = source.replace(removal, '');
source = source.replace(
  "import type { LocationId, Player } from '@/types/game.types';",
  "import type { Player } from '@/types/game.types';",
);
source = source.replace(
  "import { GameBoardAuxiliaryLayer } from './GameBoardAuxiliaryLayer';",
  "import { GameBoardAuxiliaryLayer } from './GameBoardAuxiliaryLayer';\nimport { GameBoardCanvas } from './GameBoardCanvas';",
);

const returnMarker = '  const sidePanelWidthPercent = 12;\n\n  return (';
if (!source.includes(returnMarker)) throw new Error('Return marker not found');
source = source.replace(
  returnMarker,
  `  const sidePanelWidthPercent = 12;\n  const shadowfingersTargetLocation = shadowfingersEvent && currentPlayer\n    ? shadowfingersEvent.type === 'street' && 'fromLocation' in shadowfingersEvent.result\n      ? shadowfingersEvent.result.fromLocation\n      : currentPlayer.currentLocation\n    : null;\n\n  return (`,
);

const canvasStart = `        <div className="relative w-full h-full">\n          <div\n            className="absolute inset-0 bg-no-repeat"`;
const centerStart = `          {(!isMobile\n            || selectedLocation`;
const startIndex = source.indexOf(canvasStart);
const centerIndex = source.indexOf(centerStart, startIndex);
if (startIndex === -1 || centerIndex === -1) throw new Error('Canvas block markers not found');

const canvasOpening = `        <GameBoardCanvas\n          players={players}\n          currentPlayer={currentPlayer}\n          selectedLocation={selectedLocation}\n          locationHexes={locationHexes}\n          weather={weather}\n          isMobile={isMobile}\n          centerPanel={activeCenterPanel}\n          customZones={customZones}\n          debugCenterPanel={centerPanel}\n          showDebugOverlay={showDebugOverlay}\n          focusedLocationId={focusedLocationId}\n          animatingPlayer={animatingPlayer}\n          animationPath={animationPath}\n          pathVersion={pathVersion}\n          shadowfingersTargetLocation={shadowfingersTargetLocation}\n          getLocationWithCustomPosition={getLocationWithCustomPosition}\n          onLocationClick={handleLocationClick}\n          onViewPlayer={setViewingPlayer}\n          onAnimationComplete={handleAnimationComplete}\n          onLocationReached={handleLocationReached}\n        >\n`;
source = source.slice(0, startIndex) + canvasOpening + source.slice(centerIndex);

const headerEnd = `          {!isMobile && !fullboardMode && (\n            <GameBoardHeader\n              week={week}\n              priceModifier={priceModifier}\n              economyTrend={economyTrend}\n              weather={weather}\n            />\n          )}\n        </div>\n      </div>`;
const replacementEnd = `          {!isMobile && !fullboardMode && (\n            <GameBoardHeader\n              week={week}\n              priceModifier={priceModifier}\n              economyTrend={economyTrend}\n              weather={weather}\n            />\n          )}\n        </GameBoardCanvas>\n      </div>`;
if (!source.includes(headerEnd)) throw new Error('Canvas closing marker not found');
source = source.replace(headerEnd, replacementEnd);

const helperStart = '\nfunction BoardBanterOverlay({';
const helperIndex = source.indexOf(helperStart);
if (helperIndex === -1) throw new Error('Legacy banter helper not found');
source = source.slice(0, helperIndex).trimEnd() + '\n';

writeFileSync(path, source);
