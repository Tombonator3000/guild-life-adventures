## Read-Only Diagnostic Report
Timestamp: 2026-07-22

### 1. Test suite
- `bunx vitest run` — **358/358 passed** across 18 files, ~12.6s.

### 2. TypeScript / build
- `bunx tsgo --noEmit` — **0 errors**.

### 3. ESLint
- **0 errors, 31 warnings** (all `react-refresh/only-export-components` on shadcn/ui files + one unused-disable). None are new; all are cosmetic. Two `react-hooks/exhaustive-deps` warnings worth noting but pre-existing:
  - `src/hooks/useAITurnHandler.ts:94` — missing `currentPlayer` dep.
  - `src/hooks/useAutoEndTurn.ts:128` — missing `currentPlayer` dep.
  - `src/hooks/useGameBoardKeyboard.ts:93` — missing `setShowDebugOverlay/setShowGameMenu/setShowZoneEditor`.
  - `src/hooks/useZoneEditorState.ts:499` — long list of missing deps.

### 4. Save/load migration audit (SAVE_VERSION = 9)
Migrations exist for all fields explicitly called out in `CLAUDE.md` — `age` (v2), quest-chain/bounty/cooldown/guildReputation (v3), hex system + `locationHexes` (v4), `pawnedAppliances` (v5), `prepaidDegrees` (v6), `fame`/`infamy`/`purchasedReputationUnlocks` (v7), `protectionWeeksLeft` (v8), `nlChainProgress`/`nlChainCompleted`/`pendingNLChainChoice`/`backupOutfit` (v9). No CLAUDE-listed field is missing a migration.

Latent risk (not verified): fields on `Player` that pre-date v2 but were added silently between v2 and v9 will not surface here without a git-blame per field. The v8→v9 backfill note in CLAUDE explicitly warns this has happened before. A dedicated audit sweep is a good follow-up but out of scope for this read-only pass.

### 5. Multiplayer support & validation for the three actions

| Action | In `ALLOWED_GUEST_ACTIONS`? | Store-side gold guard? | Notes |
|---|---|---|---|
| `sabotagePlayer` | **No** | Yes (`saboteur.gold < cost` → early return) | Guests cannot invoke — action is silently blocked host-side. Host/AI-only in current build. |
| `buyProtection` | **No** | Yes (`player.gold < cost`) | Same: guest cannot invoke. |
| `purchaseReputationUnlock` | **No** | **No gold guard, no duplicate-unlock guard** | `p.gold - cost` can go negative, and `purchasedReputationUnlocks` is appended without checking `.includes(unlockId)` → guest can't call it, but host/AI can double-purchase or overspend. Violates the CLAUDE gold-validation rule.

### Runtime risks worth flagging
- R1 (multiplayer feature gap): Sabotage, protection, and reputation-unlock purchases silently do nothing when a guest clicks them — the guest's `NetworkActionProxy` will drop them because the action name is not on the allowlist. UI does not surface this. Either whitelist the three actions (with the existing host-side gold guards as the authority) or disable the buttons for non-host clients.
- R2 (economy exploit, host/local): `purchaseReputationUnlock` lacks the `gold >= cost` check and lacks the "already purchased" check. This is the pattern CLAUDE flags as mandatory.
- R3 (potential stale-closure): the four `exhaustive-deps` warnings above touch AI turn handling and end-turn timing — historically the source of BUG-014-D-class races. No test failure today, but they are the highest-risk lint warnings in the tree.

### No code changes made
Diagnostic only — no files edited, no commits made.