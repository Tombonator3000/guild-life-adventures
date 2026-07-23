import { readFileSync, writeFileSync } from 'node:fs';

function replaceOnce(source, search, replacement, label) {
  const next = source.replace(search, replacement);
  if (next === source) throw new Error(`Patch target not found: ${label}`);
  return next;
}

function patchFile(path, transform) {
  const source = readFileSync(path, 'utf8');
  const next = transform(source);
  writeFileSync(path, next);
  console.log(`Patched ${path}`);
}

patchFile('src/hooks/useGrimwaldAI.ts', source => {
  let next = replaceOnce(
    source,
    "import { useCallback, useRef, useMemo } from 'react';\n",
    "import { useCallback, useRef } from 'react';\nimport { useShallow } from 'zustand/react/shallow';\n",
    'Grimwald React imports',
  );

  next = replaceOnce(
    next,
    "import { generateCommitmentPlan, isCommitmentValid } from '@/hooks/ai/commitmentPlan';\n",
    "import { generateCommitmentPlan, isCommitmentValid } from '@/hooks/ai/commitmentPlan';\nimport { getAIFailedActionKey } from '@/hooks/ai/failedActionCache';\n",
    'failed action cache import',
  );

  next = replaceOnce(
    next,
    /  const store = useGameStore\(\);[\s\S]*?  \}\), \[store\]\);/,
`  const goalSettings = useGameStore(state => state.goalSettings);
  const endTurn = useGameStore(state => state.endTurn);

  // Subscribe only to action references. The AI hook no longer rerenders for
  // every gold, time, movement or event mutation in the game store.
  const storeActions = useGameStore(useShallow((state): StoreActions => ({
    movePlayer: state.movePlayer,
    workShift: state.workShift,
    modifyGold: state.modifyGold,
    modifyHealth: state.modifyHealth,
    modifyFood: state.modifyFood,
    modifyHappiness: state.modifyHappiness,
    modifyClothing: state.modifyClothing,
    modifyRelaxation: state.modifyRelaxation,
    spendTime: state.spendTime,
    studyDegree: state.studyDegree,
    completeDegree: state.completeDegree,
    setJob: state.setJob,
    payRent: state.payRent,
    depositToBank: state.depositToBank,
    withdrawFromBank: state.withdrawFromBank,
    buyAppliance: state.buyAppliance,
    moveToHousing: state.moveToHousing,
    buyDurable: state.buyDurable,
    equipItem: state.equipItem,
    buyGuildPass: state.buyGuildPass,
    takeQuest: state.takeQuest,
    takeChainQuest: state.takeChainQuest,
    takeBounty: state.takeBounty,
    completeQuest: state.completeQuest,
    completeLocationObjective: state.completeLocationObjective,
    clearDungeonFloor: state.clearDungeonFloor,
    applyRareDrop: state.applyRareDrop,
    cureSickness: state.cureSickness,
    takeLoan: state.takeLoan,
    repayLoan: state.repayLoan,
    buyStock: state.buyStock,
    sellStock: state.sellStock,
    buyFreshFood: state.buyFreshFood,
    buyFoodWithSpoilage: state.buyFoodWithSpoilage,
    buyTicket: state.buyTicket,
    sellItem: state.sellItem,
    pawnAppliance: state.pawnAppliance,
    buyLotteryTicket: state.buyLotteryTicket,
    temperEquipment: state.temperEquipment,
    forgeRepairEquipment: state.forgeRepairEquipment,
    applyDurabilityLoss: state.applyDurabilityLoss,
    castLocationHex: state.castLocationHex,
    castPersonalCurse: state.castPersonalCurse,
    buyProtectiveAmulet: state.buyProtectiveAmulet,
    addHexScrollToPlayer: state.addHexScrollToPlayer,
    dispelLocationHex: state.dispelLocationHex,
    performDarkRitual: state.performDarkRitual,
    repairAppliance: state.repairAppliance,
    forgeRepairAppliance: state.forgeRepairAppliance,
    requestRaise: state.requestRaise,
    purchaseReputationUnlock: state.purchaseReputationUnlock,
    buyProtection: state.buyProtection,
    buyTipOff: state.buyTipOff,
    sabotagePlayer: state.sabotagePlayer,
    endTurn: state.endTurn,
  })));`,
    'Grimwald whole-store subscription',
  );

  next = replaceOnce(
    next,
    /      \/\/ Filter out actions that already failed this turn \(prevent re-attempting\)[\s\S]*?      const viableActions = actions\.filter\(a => a\.type === 'end-turn' \|\| !failedActionsRef\.current\.has\(actionKey\(a\)\)\);/,
`      // Suppress only the exact action + prerequisite state that failed. If the
      // AI moves, earns money or progresses education, a fresh key permits retry.
      const viableActions = actions.filter(a =>
        a.type === 'end-turn'
        || !failedActionsRef.current.has(getAIFailedActionKey(a, currentPlayer))
      );`,
    'state-aware failed action filter',
  );

  next = replaceOnce(
    next,
    'failedActionsRef.current.add(actionKey(bestAction));',
    'failedActionsRef.current.add(getAIFailedActionKey(bestAction, currentPlayer));',
    'state-aware failed action recording',
  );

  return next;
});

patchFile('src/hooks/useZoneEditorState.ts', source => replaceOnce(
  source,
  '  }, [isDragging, selectedZone, dragMode, getPercentPosition, centerPanel, editorMode, draggingWaypoint, selectedEdge]);',
`  }, [
    centerPanel,
    dragMode,
    draggingWaypoint,
    editorMode,
    getBoardToCenterPanelPercent,
    getBoardToMobileCenterPanelPercent,
    getPercentPosition,
    isDragging,
    mobileCenterPanel,
    selectedAnimationLayer,
    selectedEdge,
    selectedHomeItem,
    selectedLayoutElement,
    selectedMobileLayoutElement,
    selectedMobileZone,
    selectedZone,
  ]);`,
  'Zone editor mouse move dependencies',
));

patchFile('src/components/game/GameBoard.tsx', source => {
  let next = replaceOnce(
    source,
    "import { useState, useEffect } from 'react';\n",
    "import { useState, useEffect } from 'react';\nimport { useShallow } from 'zustand/react/shallow';\n",
    'GameBoard useShallow import',
  );

  next = replaceOnce(
    next,
    /  const \{\n    players,[\s\S]*?    eventSource,\n  \} = useGameStore\(\);/,
`  const {
    players,
    selectedLocation,
    selectLocation,
    week,
    priceModifier,
    economyTrend,
    dismissEvent,
    phase,
    currentPlayerIndex,
    goalSettings,
    endTurn,
    aiDifficulty,
    aiSpeedMultiplier,
    setAISpeedMultiplier,
    skipAITurn,
    setSkipAITurn,
    showTutorial,
    setShowTutorial,
    applianceBreakageEvent,
    dismissApplianceBreakageEvent,
    toadCurseEvent,
    dismissToadCurseEvent,
    deathEvent,
    dismissDeathEvent,
    weather,
    eventSource,
  } = useGameStore(useShallow(state => ({
    players: state.players,
    selectedLocation: state.selectedLocation,
    selectLocation: state.selectLocation,
    week: state.week,
    priceModifier: state.priceModifier,
    economyTrend: state.economyTrend,
    dismissEvent: state.dismissEvent,
    phase: state.phase,
    currentPlayerIndex: state.currentPlayerIndex,
    goalSettings: state.goalSettings,
    endTurn: state.endTurn,
    aiDifficulty: state.aiDifficulty,
    aiSpeedMultiplier: state.aiSpeedMultiplier,
    setAISpeedMultiplier: state.setAISpeedMultiplier,
    skipAITurn: state.skipAITurn,
    setSkipAITurn: state.setSkipAITurn,
    showTutorial: state.showTutorial,
    setShowTutorial: state.setShowTutorial,
    applianceBreakageEvent: state.applianceBreakageEvent,
    dismissApplianceBreakageEvent: state.dismissApplianceBreakageEvent,
    toadCurseEvent: state.toadCurseEvent,
    dismissToadCurseEvent: state.dismissToadCurseEvent,
    deathEvent: state.deathEvent,
    dismissDeathEvent: state.dismissDeathEvent,
    weather: state.weather,
    eventSource: state.eventSource,
  })));`,
    'GameBoard whole-store subscription',
  );
  return next;
});

patchFile('src/network/useNetworkSync.ts', source => {
  let next = replaceOnce(
    source,
    "import type { LocationId } from '@/types/game.types';\n",
    "import type { LocationId } from '@/types/game.types';\nimport { validateGuestActor } from './actionValidation';\n",
    'guest actor validator import',
  );

  next = replaceOnce(
    next,
    /          \/\/ Validate that the FIRST player-id argument[\s\S]*?          \}\n\n          \/\/ Validate action arguments/,
`          // Bind every actor-bearing action to the authenticated peer. This
          // does not depend on a particular player-ID prefix.
          const actorError = validateGuestActor(msg.name, msg.args, senderPlayerId);
          if (actorError) {
            console.warn(\`[NetworkSync] Blocked actor mismatch: \${msg.name} from \${senderPlayerId}\`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: actorError,
            });
            return;
          }

          // Validate action arguments`,
    'host guest actor validation block',
  );
  return next;
});
