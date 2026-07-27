import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { installLocalPeerNetwork } from './local-peer-network';

async function prepareOnlinePage(page: Page, channelName: string) {
  await installLocalPeerNetwork(page, channelName);
  await page.addInitScript(() => {
    Math.random = () => 0.99;
    localStorage.setItem('guild-life-guided-tutorial-completed', 'true');
  });
  await page.goto('/');
}

async function openOnlineLobby(page: Page, playerName: string) {
  await page.getByRole('button', { name: /online multiplayer/i }).click();
  await page.getByPlaceholder('Enter your name...').fill(playerName);
}

async function createHostedRoom(page: Page): Promise<string> {
  await page.getByRole('button', { name: /^Create Room/i }).click();
  await page.getByRole('button', { name: 'Create Room', exact: true }).click();

  const roomPanel = page.getByText('Room Code', { exact: true }).locator('..');
  const roomCode = (await roomPanel.locator('span.font-mono').textContent())?.trim() ?? '';
  expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
  return roomCode;
}

async function joinHostedRoom(page: Page, roomCode: string) {
  await page.getByRole('button', { name: /^Join Room/i }).click();
  await page.getByPlaceholder('Enter code').fill(roomCode);
  await page.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(page.getByText('Waiting for host to start the game...')).toBeVisible();
  await expect(page.getByText('Connected', { exact: true })).toBeVisible();
}

async function connectionCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { connectionCount(): number };
    }).__guildE2EPeerControl;
    return control?.connectionCount() ?? 0;
  });
}

async function peerIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { peerIds(): string[] };
    }).__guildE2EPeerControl;
    return control?.peerIds() ?? [];
  });
}

async function holdGuestAction(page: Page, actionName: string) {
  await page.evaluate((name) => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { holdAction(actionName: string): void };
    }).__guildE2EPeerControl;
    control?.holdAction(name);
  }, actionName);
}

async function releaseGuestAction(page: Page, actionName: string) {
  await page.evaluate((name) => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { releaseHeldActions(actionName?: string): void };
    }).__guildE2EPeerControl;
    control?.releaseHeldActions(name);
  }, actionName);
}

async function heldGuestActionCount(page: Page, actionName: string): Promise<number> {
  return page.evaluate((name) => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { heldActionCount(actionName?: string): number };
    }).__guildE2EPeerControl;
    return control?.heldActionCount(name) ?? 0;
  }, actionName);
}

async function storedReconnectToken(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('guild-life-reconnect-credential');
    if (!raw) return null;
    try {
      const credential = JSON.parse(raw) as { reconnectToken?: unknown };
      return typeof credential.reconnectToken === 'string' ? credential.reconnectToken : null;
    } catch {
      return null;
    }
  });
}

function collectPageErrors(host: Page, guest: Page): string[] {
  const pageErrors: string[] = [];
  host.on('pageerror', error => pageErrors.push(`host: ${error.message}`));
  guest.on('pageerror', error => pageErrors.push(`guest: ${error.message}`));
  return pageErrors;
}

test('host and guest can start, synchronize an action, reconnect, and keep playing', async ({ page, context }) => {
  const channelName = `guild-life-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const guest = await context.newPage();
  const pageErrors = collectPageErrors(page, guest);

  try {
    await Promise.all([
      prepareOnlinePage(page, channelName),
      prepareOnlinePage(guest, channelName),
    ]);

    await openOnlineLobby(page, 'Host Hero');
    const roomCode = await createHostedRoom(page);

    await openOnlineLobby(guest, 'Guest Hero');
    await joinHostedRoom(guest, roomCode);

    await expect(page.getByText('Guest Hero', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Game \(2 players\)/ })).toBeEnabled();

    await guest.getByPlaceholder('Say something...').fill('Ready from the guest');
    await guest.getByPlaceholder('Say something...').press('Enter');
    await expect(page.getByText('Ready from the guest', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: /Start Game \(2 players\)/ }).click();
    await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
    await expect(guest.locator('[data-zone-id="bank"]')).toBeVisible();

    await page.keyboard.press('e');
    await expect(guest.getByText("Guest Hero's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });

    await guest.locator('[data-zone-id="bank"]').click();
    const deposit = guest.getByRole('button', { name: /deposit 50/i });
    await expect(deposit).toBeVisible({ timeout: 10_000 });
    await deposit.click();

    const guestFinances = guest.getByRole('heading', { name: 'Finances' }).locator('..');
    await expect(guestFinances.getByText('50g', { exact: true })).toBeVisible({ timeout: 15_000 });

    await expect.poll(() => connectionCount(guest)).toBe(1);
    await guest.evaluate(() => {
      const control = (globalThis as typeof globalThis & {
        __guildE2EPeerControl?: { dropConnections(): void };
      }).__guildE2EPeerControl;
      control?.dropConnections();
    });
    await expect.poll(() => connectionCount(guest), { timeout: 15_000 }).toBe(1);

    const withdraw = guest.getByRole('button', { name: /withdraw 50/i });
    await expect(withdraw).toBeVisible();
    await withdraw.click();
    await expect(guestFinances.getByText('0g', { exact: true })).toBeVisible({ timeout: 15_000 });

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  } finally {
    await guest.close();
  }
});

test('guest securely rejoins the same player after a page refresh with a new peer identity', async ({ page, context }) => {
  const channelName = `guild-life-refresh-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const guest = await context.newPage();
  const pageErrors = collectPageErrors(page, guest);

  try {
    await Promise.all([
      prepareOnlinePage(page, channelName),
      prepareOnlinePage(guest, channelName),
    ]);

    await openOnlineLobby(page, 'Refresh Host');
    const roomCode = await createHostedRoom(page);

    await openOnlineLobby(guest, 'Refresh Guest');
    await joinHostedRoom(guest, roomCode);

    await expect(page.getByText('Refresh Guest', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Start Game \(2 players\)/ }).click();
    await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
    await expect(guest.locator('[data-zone-id="bank"]')).toBeVisible();

    await expect.poll(() => storedReconnectToken(guest), { timeout: 15_000 }).toMatch(/^[a-f0-9]{48}$/);
    const [oldPeerId] = await peerIds(guest);
    expect(oldPeerId).toMatch(/^e2e-guest-/);

    await guest.reload();
    await expect(guest.getByRole('button', { name: /online multiplayer/i })).toBeVisible();
    await guest.getByRole('button', { name: /online multiplayer/i }).click();

    await expect(guest.getByText('Rejoin Game?', { exact: true })).toBeVisible();
    await expect(guest.getByText(new RegExp(roomCode))).toBeVisible();
    await expect(guest.getByText('Refresh Guest', { exact: true })).toBeVisible();
    await guest.getByRole('button', { name: 'Rejoin', exact: true }).click();

    await expect(guest.locator('[data-zone-id="bank"]')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => peerIds(guest), { timeout: 15_000 }).toHaveLength(1);
    const [newPeerId] = await peerIds(guest);
    expect(newPeerId).toMatch(/^e2e-guest-/);
    expect(newPeerId).not.toBe(oldPeerId);

    await page.keyboard.press('e');
    await expect(guest.getByText("Refresh Guest's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });

    await guest.locator('[data-zone-id="bank"]').click();
    const deposit = guest.getByRole('button', { name: /deposit 50/i });
    await expect(deposit).toBeVisible({ timeout: 10_000 });
    await deposit.click();

    const guestFinances = guest.getByRole('heading', { name: 'Finances' }).locator('..');
    await expect(guestFinances.getByText('50g', { exact: true })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  } finally {
    await guest.close();
  }
});

test('rejected sabotage and Fence actions unlock immediately instead of waiting ten seconds', async ({ page, context }) => {
  const channelName = `guild-life-rejection-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const guest = await context.newPage();
  const pageErrors = collectPageErrors(page, guest);

  try {
    await Promise.all([
      prepareOnlinePage(page, channelName),
      prepareOnlinePage(guest, channelName),
    ]);

    await openOnlineLobby(page, 'Reject Host');
    const roomCode = await createHostedRoom(page);
    await openOnlineLobby(guest, 'Reject Guest');
    await joinHostedRoom(guest, roomCode);

    await expect(page.getByText('Reject Guest', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Start Game \(2 players\)/ }).click();
    await expect(guest.locator('[data-zone-id="shadow-market"]')).toBeVisible();

    await page.keyboard.press('e');
    await expect(guest.getByText("Reject Guest's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });

    await guest.locator('[data-zone-id="shadow-market"]').click();
    await guest.getByRole('button', { name: 'Sabotage', exact: true }).click();
    const sabotage = guest.getByRole('button', { name: /Hire Shadowfingers: Pickpocket/i });
    await expect(sabotage).toBeVisible({ timeout: 10_000 });
    await expect(sabotage).toBeEnabled();

    await holdGuestAction(guest, 'sabotagePlayer');
    await sabotage.click();
    const sabotageWaiting = guest.getByText('Waiting for host…', { exact: true });
    await expect(sabotageWaiting).toBeVisible();
    await expect.poll(() => heldGuestActionCount(guest, 'sabotagePlayer')).toBe(1);

    await guest.keyboard.press('e');
    await expect(guest.getByText("Reject Host's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });
    await releaseGuestAction(guest, 'sabotagePlayer');
    await expect(sabotageWaiting).toBeHidden({ timeout: 2_000 });

    await page.keyboard.press('e');
    await expect(guest.getByText("Reject Guest's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByRole('button', { name: /Hire Shadowfingers: Pickpocket/i })).toBeEnabled();

    await guest.locator('[data-zone-id="fence"]').click();
    await guest.getByRole('button', { name: 'Protection', exact: true }).click();
    const protection = guest.getByRole('button', { name: /Protection — 3 Weeks/i });
    await expect(protection).toBeVisible({ timeout: 10_000 });
    await expect(protection).toBeEnabled();

    await holdGuestAction(guest, 'buyProtection');
    await protection.click();
    const protectionWaiting = guest.getByText('Waiting for host…', { exact: true });
    await expect(protectionWaiting).toBeVisible();
    await expect.poll(() => heldGuestActionCount(guest, 'buyProtection')).toBe(1);

    await guest.keyboard.press('e');
    await expect(guest.getByText("Reject Host's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });
    await releaseGuestAction(guest, 'buyProtection');
    await expect(protectionWaiting).toBeHidden({ timeout: 2_000 });

    await page.keyboard.press('e');
    await expect(guest.getByText("Reject Guest's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByRole('button', { name: /Protection — 3 Weeks/i })).toBeEnabled();

    const tipOff = guest.getByRole('button', { name: /Buy Tip-off/i });
    await expect(tipOff).toBeEnabled();
    await holdGuestAction(guest, 'buyTipOff');
    await tipOff.click();
    const tipOffWaiting = guest.getByText('Waiting for host…', { exact: true });
    await expect(tipOffWaiting).toBeVisible();
    await expect.poll(() => heldGuestActionCount(guest, 'buyTipOff')).toBe(1);

    await guest.keyboard.press('e');
    await expect(guest.getByText("Reject Host's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });
    await releaseGuestAction(guest, 'buyTipOff');
    await expect(tipOffWaiting).toBeHidden({ timeout: 2_000 });

    await page.keyboard.press('e');
    await expect(guest.getByText("Reject Guest's Turn", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByRole('button', { name: /Buy Tip-off/i })).toBeEnabled();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  } finally {
    await guest.close();
  }
});
