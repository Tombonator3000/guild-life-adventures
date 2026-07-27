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

test('host and guest can start, synchronize an action, reconnect, and keep playing', async ({ page, context }) => {
  const channelName = `guild-life-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const guest = await context.newPage();
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(`host: ${error.message}`));
  guest.on('pageerror', error => pageErrors.push(`guest: ${error.message}`));

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