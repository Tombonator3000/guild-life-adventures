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
   - rotates to 1180 × 820,
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

## Diagnostics and failure evidence

All Playwright specs now use a shared automatic fixture that attaches:

- browser console messages,
- uncaught page errors,
- failed browser requests.

Playwright retains screenshot, trace and video when a test fails. GitHub Actions already uploads the complete `test-results` directory on browser-test failure.

## Deliberate boundaries

- No public PeerJS or PartyKit service is used.
- Host/guest, refresh-rejoin and disconnect browser journeys remain the next tranche of #394 and require the repository-supported local transport or deterministic browser test double.
- Gameplay balance, save data and multiplayer protocol fields are unchanged.
- The desktop suite remains a single Chromium project; device dimensions are applied only to their focused tests so the entire suite is not repeated for every device.
