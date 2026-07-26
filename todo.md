# Guild Life Adventures — Active Work

This file is a compact entry point. **GitHub Issues are the source of truth for unfinished work.**

The previous long-form todo history is preserved in Git history through commit `de99992` and in the dated audit/development logs under `docs/`, `bugs.md`, and `log.md`. Completed implementation notes should stay in those records rather than returning to this file.

## Current phase

### Phase 16Y — Truth, Onboarding & Release Safety

Tracker: #390

| Priority | Work | Status |
|---|---|---|
| P0 | Rules Truth Pass | Completed in PR #377 |
| P0 | Secure release pipeline | Completed in PR #378 |
| P0 | Project-management and backlog cleanup | In progress |
| P0 | BUG-013 AI failed-action invalidation | #391 |
| P0 | Replace/remove placeholder audio | #392 |
| P1 | Interactive first-turn onboarding | #393 |
| P1 | Online, mobile and endgame browser coverage | #394 |
| P2 | Seeded multi-game balance simulator | #395 |

## Working rules

1. New unfinished work belongs in a GitHub Issue with a concrete outcome and acceptance criteria.
2. One implementation topic per branch and pull request whenever practical.
3. Production bugs receive a regression test.
4. Every substantial phase change receives a dated audit/log entry.
5. Pull requests must pass the reusable validation workflow before merge.
6. Do not add new systems until the relevant existing system has been checked for duplication.
7. `todo.md` must remain short; completed details belong in changelog, audit log, bug catalog or Git history.

## Prioritization

- **P0:** correctness, data safety, release safety, blocking bugs and misleading player information.
- **P1:** onboarding, clarity, accessibility and validation of existing gameplay.
- **P2:** measured depth and replayability improvements.
- **P3:** packaging/platform expansion and speculative systems.

## Key records

- Phase tracker: #390
- Bug catalog: [`bugs.md`](./bugs.md)
- Development log: [`log.md`](./log.md)
- Testing and release policy: [`docs/TESTING.md`](./docs/TESTING.md)
- Phase 16Y rules audit: [`docs/AUDIT_LOG_PHASE16Y.md`](./docs/AUDIT_LOG_PHASE16Y.md)
- Phase 16Y release audit: [`docs/AUDIT_LOG_PHASE16Y_RELEASE_SAFETY.md`](./docs/AUDIT_LOG_PHASE16Y_RELEASE_SAFETY.md)
- Architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
