import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/game/GameBoard.tsx';
let source = readFileSync(path, 'utf8');

for (const removal of [
  "import { ResourcePanel } from './ResourcePanel';\n",
  "import { LocationPanel } from './LocationPanel';\n",
  "import { EventPanel } from './EventPanel';\n",
  "import { ShadowfingersModal, useShadowfingersModal } from './ShadowfingersModal';\n",
  "import { CursePanelOverlay } from './CursePanelOverlay';\n",
  "import { CurseAppliancePanel } from './CurseAppliancePanel';\n",
  "import { CurseToadPanel } from './CurseToadPanel';\n",
  "import { SpectatorPanel } from './SpectatorPanel';\n",
]) source = source.replace(removal, '');
source = source.replace(
  "import { GameBoardCanvas } from './GameBoardCanvas';",
  "import { GameBoardCanvas } from './GameBoardCanvas';\nimport { GameBoardCenterPanel } from './GameBoardCenterPanel';\nimport { useShadowfingersModal } from './ShadowfingersModal';",
);

const startMarker = `          {(!isMobile\n            || selectedLocation`;
const endMarker = `          {!isMobile && !fullboardMode && (`;
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start === -1 || end === -1) throw new Error('Center panel block markers not found');

const replacement = `          <GameBoardCenterPanel\n            isMobile={isMobile}\n            centerPanel={activeCenterPanel}\n            isCursed={isCursed}\n            toadProps={toadCurseEvent ? {\n              hoursLost: toadCurseEvent.hoursLost,\n              curserName: toadCurseEvent.curserName,\n              onDismiss: dismissToadCurseEvent,\n            } : null}\n            applianceProps={applianceBreakageEvent?.fromCurse ? {\n              applianceId: applianceBreakageEvent.applianceId,\n              originalPrice: applianceBreakageEvent.originalPrice ?? applianceBreakageEvent.repairCost * 2,\n              curserName: applianceBreakageEvent.curserName,\n              onDismiss: dismissApplianceBreakageEvent,\n            } : null}\n            shadowfingersProps={shadowfingersEvent ? {\n              event: shadowfingersEvent,\n              onDismiss: dismissShadowfingers,\n            } : null}\n            eventProps={phase === 'event' && queuedEvent ? {\n              event: queuedEvent,\n              onDismiss: handleEventDismiss,\n            } : null}\n            locationProps={selectedLocation ? { locationId: selectedLocation } : null}\n            spectatorProps={isSpectating ? {\n              players,\n              goalSettings,\n              week,\n              stockPrices,\n              isPureSpectator,\n            } : null}\n          />\n\n`;
source = source.slice(0, start) + replacement + source.slice(end);
writeFileSync(path, source);
