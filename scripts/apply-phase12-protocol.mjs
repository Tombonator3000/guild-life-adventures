import fs from 'node:fs';

function patch(path, replacements) {
  let text = fs.readFileSync(path, 'utf8');
  for (const [before, after] of replacements) {
    if (!text.includes(before)) {
      throw new Error(`Missing expected text in ${path}: ${before.slice(0, 120)}`);
    }
    text = text.replace(before, after);
  }
  fs.writeFileSync(path, text);
}

patch('src/network/actionValidation.ts', [[
  "return validateEnumArg(args, 1, ['homeless', 'slums', 'modest', 'comfortable', 'noble'], 'housing tier');",
  "return validateEnumArg(args, 1, ['homeless', 'slums', 'noble'], 'housing tier');",
]]);

patch('src/network/useNetworkSync.ts', [
  ["import { ALLOWED_GUEST_ACTIONS } from './types';\n", ''],
  ["import { validateGuestActor } from './actionValidation';", "import { processGuestActionRequest } from './actionValidation';"],
  [`          if (!currentPlayer || currentPlayer.id !== senderPlayerId) {
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Not your turn',
            });
            return;
          }

          // Validate action is in the allowed whitelist
          if (!ALLOWED_GUEST_ACTIONS.has(msg.name)) {
            console.warn(\`[NetworkSync] Blocked disallowed guest action: \${msg.name}\`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: 'Action not allowed',
            });
            return;
          }

          // Bind every actor-bearing action to the authenticated peer. This
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

          // Validate action arguments (prevents abuse of raw stat modifiers)
          const argError = validateActionArgs(msg.name, msg.args, store);
          if (argError) {
            console.warn(\`[NetworkSync] Blocked invalid action args: \${msg.name} — \${argError}\`);
            peerManager.sendTo(fromPeerId, {
              type: 'action-result',
              requestId: msg.requestId,
              success: false,
              error: argError,
            });
            return;
          }

          // Reset turn timeout on any valid action (player is not AFK)
          resetTurnTimeout();

          // Execute the validated action
          const success = executeAction(msg.name, msg.args);
          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: msg.requestId,
            success,
            error: success ? undefined : 'Action failed',
          });`,
  `          const result = processGuestActionRequest(
            msg.name,
            msg.args,
            senderPlayerId,
            currentPlayer?.id,
            store,
            executeAction,
          );

          if (!result.validated) {
            console.warn(\`[NetworkSync] Blocked guest action \${msg.name}: \${result.error}\`);
          } else {
            // A fully validated request counts as activity even when the
            // authoritative store action rejects it for gameplay reasons.
            resetTurnTimeout();
          }

          peerManager.sendTo(fromPeerId, {
            type: 'action-result',
            requestId: msg.requestId,
            success: result.success,
            error: result.error,
          });`],
]);

// Remove the old hook-local validators now that the shared protocol validator
// is the single source of truth.
{
  const path = 'src/network/useNetworkSync.ts';
  let text = fs.readFileSync(path, 'utf8');
  const start = text.indexOf('/**\n * Server-side argument validation for dangerous guest actions.');
  const endMarker = '/** Turn timeout: auto-end turn after this many seconds of inactivity (0 = disabled) */';
  const end = text.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) throw new Error('Could not locate old validation block');
  text = text.slice(0, start) + endMarker + text.slice(end + endMarker.length);
  fs.writeFileSync(path, text);
}

patch('src/network/networkState.ts', [[
`  try {
    (action as (...a: unknown[]) => unknown)(...args);
    return true;
  } catch (err) {`,
`  try {
    const result = (action as (...a: unknown[]) => unknown)(...args);
    if (result === false) return false;
    if (result && typeof result === 'object' && 'success' in result) {
      const success = (result as { success?: unknown }).success;
      if (typeof success === 'boolean') return success;
    }
    return true;
  } catch (err) {`],
]);
