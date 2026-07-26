# Phase 16Y audit — device and accessibility browser coverage

Date: 26 July 2026
Issue: #394

## Scope

This tranche expands browser-integrated validation without using public multiplayer or media services. It covers the highest-risk responsive and input paths while keeping the existing desktop suite serial and fast.

## Added browser journeys

1. Narrow 390 × 844 mobile viewport with touch input.
   - starts a real game,
   - verifies the mobile End Turn control,
   - travels to the Bank through a real board-zone tap,
   - opens the Stats & Inventory drawer,
   - checks that the document does not create horizontal page overflow.
2. 820 × 1180 iPad-sized touch viewport.
   - verifies the tablet/mobile HUD,
   - leaves browser fullscreen through the supported `F` shortcut when necessary,
   - rotates to 1180 × 820 only after the Fullscreen API confirms normal window state,
   - verifies the desktop side-panel layout replaces the mobile drawer controls,
   - performs a real Bank interaction after the responsive transition,
   - checks both orientations for page overflow.
3. Keyboard board navigation.
   - enables the real accessibility option through persisted game settings,
   - cycles through the canonical board path with Tab,
   - confirms the Bank focus indicator,
   - activates the location with Enter and reaches the real Bank action panel.
4. Modal shortcut blocking.
   - opens the real Game Menu,
   - confirms End Turn and tutorial shortcuts cannot mutate gameplay while the modal is open.

## Browser findings during validation

The first tablet run exposed that beginning a game may enter real browser fullscreen. Playwright cannot rotate a fullscreen browser window.

The next run established that the desktop `Exit Fullscreen` button is not mounted in the mobile HUD. The correct mobile path is the game's existing `F` shortcut. The final test therefore uses that supported control and waits for `document.fullscreenElement` to clear before changing the viewport. No forced click or direct state mutation is used.

## Diagnostics and failure evidence

All Playwright specs now use a shared automatic fixture that attaches:

- browser console messages,
- uncaught page errors,
- failed browser requests.

Playwright retains screenshot, trace and video when a test fails. GitHub Actions uploads the complete `test-results` directory on browser-test failure. The fullscreen failures were diagnosed from those retained artifacts before the final fix.

## Final validation

GitHub Actions run `30218931154` passed on commit `6b3b36ea`:

- pinned Bun 1.3.14 and single-lockfile policy,
- frozen dependency install,
- TypeScript,
- full Vitest suite,
- production build,
- ESLint,
- FFmpeg audio integrity,
- existing desktop Playwright journeys,
- narrow mobile touch journey,
- iPad portrait-to-landscape journey,
- keyboard navigation and modal shortcut coverage.

## Deliberate boundaries

- No public PeerJS or PartyKit service is used.
- Host/guest, refresh-rejoin and disconnect browser journeys remain the next tranche of #394 and require the repository-supported local transport or deterministic browser test double.
- Gameplay balance, save data and multiplayer protocol fields are unchanged.
- The desktop suite remains a single Chromium project; device dimensions are applied only to their focused tests so the entire suite is not repeated for every device.
