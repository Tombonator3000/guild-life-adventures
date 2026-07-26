# Project management

## Source of truth

Guild Life Adventures uses the following hierarchy:

1. **GitHub Issue tracker** — unfinished work, priority, acceptance criteria and discussion.
2. **Pull request** — implementation scope, validation and merge decision.
3. **Dated audit/development logs** — completed technical history and lessons learned.
4. **`bugs.md`** — long-term bug catalog and root-cause reference.
5. **`todo.md`** — short navigation page only.

The active phase tracker is issue #390.

## Issue scope

An issue should describe one result that can be validated. Large themes should use a tracker issue with smaller linked implementation issues.

Every implementation issue should contain:

- the observable problem,
- the existing system that was inspected,
- required outcome,
- acceptance criteria,
- relevant non-goals,
- tests or evidence needed for completion.

Production bugs should include reproduction steps and a regression test expectation.

## Priority model

| Priority | Meaning |
|---|---|
| P0 | Correctness, data safety, release safety, blocking defect or misleading player information |
| P1 | Onboarding, clarity, accessibility and validation of existing gameplay |
| P2 | Measured depth, replayability and balance improvements |
| P3 | Packaging, platform expansion or speculative new systems |

Priority does not replace dependency order. A P1 prerequisite may be completed before a P0 task when required to make the P0 change safe.

## Branch and pull-request workflow

- Use `agent/<short-topic>` for agent work.
- Keep one implementation topic per branch whenever practical.
- Open a draft PR early for multi-file work.
- Record discoveries in the PR body or dated audit log.
- Do not merge until the reusable validation workflow is green.
- Use squash merge for a clean `main` history unless preserving individual commits is important.
- Close the linked issue and update its tracker only after the change is on `main`.

## Definition of done

A task is complete when:

1. the required behavior exists,
2. old or duplicate behavior is removed or clearly retained for compatibility,
3. regression coverage exists where practical,
4. TypeScript, tests, build and lint pass,
5. browser validation is included for integrated UI behavior,
6. documentation and audit/log records are current,
7. the PR is merged to `main`,
8. production deployment is checked when the task affects releases or runtime behavior.

## Logging policy

Do not grow `todo.md` into another historical dump. Use:

- `docs/AUDIT_LOG_<PHASE>.md` for a phase or major review,
- `bugs.md` for root causes and recurring defect patterns,
- `log.md` for chronological development history,
- PR descriptions for exact implementation and validation evidence,
- GitHub Issues for remaining work.

Git history preserves previous versions of replaced planning documents. Important conclusions should still be summarized in a dated audit log so they remain easy to find.

## Current Phase 16Y issues

- #390 — phase tracker
- #391 — BUG-013 failed-action invalidation
- #392 — placeholder/silent audio
- #393 — interactive first-turn onboarding
- #394 — online/mobile/endgame browser coverage
- #395 — seeded balance simulator
