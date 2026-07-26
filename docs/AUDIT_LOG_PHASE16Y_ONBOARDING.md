# Phase 16Y — Interactive First-Turn Onboarding

Date: 2026-07-26

## Purpose

Replace the passive first-run card sequence with an optional guided turn that teaches the real game through real actions.

## Guided flow

1. Travel to the Guild Hall.
2. Apply for and accept an entry-level job.
3. Work one full shift at the actual workplace.
4. Buy food at the General Store.
5. Deposit gold at the Bank.
6. Review the resulting state and end the turn.

The guide observes the active player's stored state and advances only after the corresponding gameplay mutation succeeds. It does not grant gold, food, employment, time or any other resources.

## Safety and audience behavior

- The guide is optional and can be skipped at any time.
- The corrected nine-page rules reference remains available from the guide.
- The guide only displays for the local human whose turn established the tutorial baseline.
- It pauses for AI turns, remote turns and spectators.
- Board, keyboard and touch interactions remain live.
- The guide panel is kept at the top of the viewport and only its own buttons accept pointer events, preventing it from blocking live location and action controls.

## Integration findings

The first browser run exposed that the new tutorial component was not mounted in the live GameBoard auxiliary layer. After mounting it, the second browser run exposed that the bottom-positioned guide card could intercept clicks on Work Shift. Both defects were fixed in production code rather than hidden with forced Playwright clicks.

## Tests

- Component tests cover state-driven progression, skipping, reference pages and audience pausing.
- Playwright covers the complete real first-turn journey.
- Existing save/load and normal gameplay browser coverage remains in the same suite.

## Non-goals

- No gameplay balance changes.
- No free tutorial resources or simulated actions.
- No save-format or network-protocol changes.
- No replacement of the full Adventurer's Manual.
