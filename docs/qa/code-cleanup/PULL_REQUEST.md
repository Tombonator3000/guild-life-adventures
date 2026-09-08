The app retained unused UI scaffolding and a React Query provider with no consumers. Its TypeScript command checked a root config with no source files, hiding 185 diagnostics, while several UI components subscribed to every game-state change.

This cleanup removes 50 unused source files and 33 direct dependencies, checks both real TypeScript projects, and narrows 15 store subscriptions. AI handlers derive their action signatures from one canonical selector. Guest action results remain explicitly optional; prices, rules, saves and network authority are unchanged. The tutorial now uses the board's spectator detection instead of a nonexistent store field.

Validation:

- Real app and build-config TypeScript checks pass.
- 770 unit tests pass. Both new regressions fail on the base revision and pass on the candidate.
- All 39 existing browser scenarios pass without retries, including touch, saves, guided play, multiplayer rejoin, rejected actions, cave flow and deployed-update recovery.
- Three complete seeded AI games match the base gameplay reports exactly.
- Production build and audio integrity pass; ESLint has zero errors and 19 existing warnings.
- Generated CSS decreases from 178,050 to 149,418 bytes; the App chunk decreases from 277,883 to 270,291 bytes gzipped. Physical iPad/Safari frame rate is unverified.

The open-PR review identifies #384, #385 and #389 as superseded direct-dependency updates. The other eight Dependabot PRs still cover used packages/workflows. #383 needs refreshing to cover all current artifact-upload steps; the Vite major upgrade needs its own migration checks.

Full removal inventory, measurements, screenshots and remaining limitations: `docs/AUDIT_LOG_CODE_CLEANUP.md` and `docs/qa/code-cleanup/evidence.json`.
