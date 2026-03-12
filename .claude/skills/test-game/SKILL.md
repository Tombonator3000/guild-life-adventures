---
name: test-game
description: Run game tests and report failures with context. Use when the user wants to run tests, verify changes, or check for regressions.
user-invocable: true
argument-hint: [filter]
allowed-tools: Bash, Read, Grep, Glob
model: sonnet
context: fork
agent: general-purpose
---

# Test Game Skill

Run the Guild Life Adventures test suite and provide actionable feedback.

## Steps

1. Run `bun run test` (or `bun run test -- $ARGUMENTS` if a filter was provided)
2. If ALL tests pass: report the count and exit
3. If tests FAIL:
   - List each failing test name and file
   - Read the failing test file(s) to understand what's being tested
   - Read the source file(s) being tested to find the likely root cause
   - For each failure, provide:
     - **Test**: name and location
     - **Expected vs Actual**: what the test expected and what it got
     - **Likely Cause**: your analysis of why it failed
     - **Suggested Fix**: concrete code change to fix it
4. Check if any test files reference stale values (compare against CLAUDE.md conventions)
5. Report summary: X passed, Y failed, Z skipped

## Important Context

- Tests are in `src/test/` directory
- Test framework: Vitest + Testing Library
- Package manager: Bun
- Key conventions from CLAUDE.md:
  - Career goal = 0 when unemployed (check player.currentJob)
  - Regular food is shelf-stable (no spoilage flags)
  - AI social weight floors matter for balance
  - ESLint test override must be AFTER main config block
