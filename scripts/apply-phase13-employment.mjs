import fs from 'node:fs';

function replace(path, before, after) {
  let text = fs.readFileSync(path, 'utf8');
  if (!text.includes(before)) throw new Error(`Missing expected text in ${path}: ${before.slice(0, 100)}`);
  text = text.replace(before, after);
  fs.writeFileSync(path, text);
}

replace(
  'src/store/gameStore.ts',
  "import { createEmploymentEducationServiceActions } from './helpers/employmentEducationServiceHelpers';",
  "import { createEmploymentEducationServiceActions } from './helpers/employmentEducationServiceHelpers';\nimport { createEmploymentOfferActions } from './helpers/employmentOfferHelpers';",
);
replace(
  'src/store/gameStore.ts',
  '  const employmentEducationServiceActions = createEmploymentEducationServiceActions(set, get);',
  '  const employmentEducationServiceActions = createEmploymentEducationServiceActions(set, get);\n  const employmentOfferActions = createEmploymentOfferActions(set, get);',
);
replace(
  'src/store/gameStore.ts',
  `    // Canonical employment and education intent actions
    ...wrapWithNetworkGuard(employmentEducationServiceActions),`,
  `    // Canonical employment, wage and education intent actions
    ...wrapWithNetworkGuard(employmentEducationServiceActions),
    ...wrapWithNetworkGuard(employmentOfferActions),`,
);

replace(
  'src/store/storeTypes.ts',
  `  graduateDegree: (playerId: string, degreeId: DegreeId) => ActionResult | void;`,
  `  graduateDegree: (playerId: string, degreeId: DegreeId) => ActionResult | void;
  acceptJobOffer: (playerId: string, jobId: string) => ActionResult | void;
  acceptMarketRaise: (playerId: string) => ActionResult | void;`,
);

replace(
  'src/network/types.ts',
  `  'setJob',
  'requestRaise',
  'negotiateRaise',`,
  `  'requestRaise',
  'acceptJobOffer',
  'acceptMarketRaise',`,
);

replace(
  'src/network/actionValidation.ts',
  `    case 'setJob': {`,
  `    case 'acceptJobOffer':
      return validateStringArg(args, 1, 'job');

    case 'acceptMarketRaise':
      return null;

    case 'setJob': {`,
);

replace(
  'src/components/game/GuildHallPanel.tsx',
  `  onHireJob: (jobId: string, wage: number) => void;
  onNegotiateRaise: (newWage: number) => void;
  onSpendTime: (hours: number) => void;`,
  `  onHireJob: (jobId: string) => void;
  onAcceptMarketRaise: () => void;`,
);
replace(
  'src/components/game/GuildHallPanel.tsx',
  `  onHireJob,
  onNegotiateRaise,
  onSpendTime,`,
  `  onHireJob,
  onAcceptMarketRaise,`,
);
replace(
  'src/components/game/GuildHallPanel.tsx',
  `        onNegotiateRaise(applicationResult.offeredWage);
      } else {
        onHireJob(applicationResult.job.id, applicationResult.offeredWage);`,
  `        onAcceptMarketRaise();
      } else {
        onHireJob(applicationResult.job.id);`,
);

replace(
  'src/components/game/locationTabs.tsx',
  `  setJob: GameStore['setJob'];
  requestRaise: GameStore['requestRaise'];
  negotiateRaise: GameStore['negotiateRaise'];`,
  `  acceptJobOffer: GameStore['acceptJobOffer'];
  acceptMarketRaise: GameStore['acceptMarketRaise'];
  requestRaise: GameStore['requestRaise'];`,
);
replace(
  'src/components/game/locationTabs.tsx',
  `  const { player, players, priceModifier, week, setJob, negotiateRaise, spendTime,
    takeQuest, completeQuest, abandonQuest, takeChainQuest, takeNonLinearChain, makeNLChainChoice, takeBounty, buyGuildPass, requestRaise } = ctx;`,
  `  const { player, players, priceModifier, week, acceptJobOffer, acceptMarketRaise,
    takeQuest, completeQuest, abandonQuest, takeChainQuest, takeNonLinearChain, makeNLChainChoice, takeBounty, buyGuildPass, requestRaise } = ctx;`,
);
replace(
  'src/components/game/locationTabs.tsx',
  `          onHireJob={(jobId, wage) => {
            setJob(player.id, jobId, wage);
            const job = getJob(jobId);
            toast.success(\`You are now employed as \${job?.name}!\`);
          }}
          onNegotiateRaise={(newWage) => {
            negotiateRaise(player.id, newWage);
            toast.success(\`Salary increased to \${newWage}g/hour!\`);
          }}
          onSpendTime={(hours) => spendTime(player.id, hours)}`,
  `          onHireJob={(jobId) => {
            const result = acceptJobOffer(player.id, jobId);
            if (!result) return;
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
          }}
          onAcceptMarketRaise={() => {
            const result = acceptMarketRaise(player.id);
            if (!result) return;
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
          }}`,
);

replace(
  'src/components/game/LocationPanel.tsx',
  `    setJob: store.setJob,
    requestRaise: store.requestRaise,
    negotiateRaise: store.negotiateRaise,`,
  `    acceptJobOffer: store.acceptJobOffer,
    acceptMarketRaise: store.acceptMarketRaise,
    requestRaise: store.requestRaise,`,
);

replace(
  'src/hooks/ai/actionExecutor.ts',
  `  setJob: (playerId: string, jobId: string, wage: number) => void;`,
  `  acceptJobOffer: (playerId: string, jobId: string) => { success: boolean; message: string } | void;`,
);

replace(
  'src/hooks/useGrimwaldAI.ts',
  `    setJob: state.setJob,`,
  `    acceptJobOffer: state.acceptJobOffer,`,
);

replace(
  'src/hooks/ai/handlers/employmentEducationHandlers.ts',
  `import { getJob, canWorkJob, calculateOfferedWage } from '@/data/jobs';`,
  `import { getJob, canWorkJob } from '@/data/jobs';`,
);
replace(
  'src/hooks/ai/handlers/employmentEducationHandlers.ts',
  `import { useGameStore } from '@/store/gameStore';\n`,
  ``,
);
replace(
  'src/hooks/ai/handlers/employmentEducationHandlers.ts',
  `  const { priceModifier, week } = useGameStore.getState();
  const offer = calculateOfferedWage(job, priceModifier, week);
  store.setJob(player.id, jobId, offer.offeredWage);
  store.spendTime(player.id, 1);
  return true;`,
  `  const result = store.acceptJobOffer(player.id, jobId);
  return result?.success ?? false;`,
);

replace(
  'src/test/multiplayer.test.ts',
  `    expect(ALLOWED_GUEST_ACTIONS.has('setHousing')).toBe(false);`,
  `    expect(ALLOWED_GUEST_ACTIONS.has('acceptJobOffer')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('acceptMarketRaise')).toBe(true);
    expect(ALLOWED_GUEST_ACTIONS.has('setJob')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('negotiateRaise')).toBe(false);
    expect(ALLOWED_GUEST_ACTIONS.has('setHousing')).toBe(false);`,
);
replace(
  'src/test/multiplayer.test.ts',
  `      'moveHousingAtLandlord', 'requestRentExtensionAtLandlord', 'setJob', 'requestRaise',
      'negotiateRaise', 'performWorkShift', 'attendDegreeSession',`,
  `      'moveHousingAtLandlord', 'requestRentExtensionAtLandlord', 'requestRaise',
      'acceptJobOffer', 'acceptMarketRaise', 'performWorkShift', 'attendDegreeSession',`,
);
