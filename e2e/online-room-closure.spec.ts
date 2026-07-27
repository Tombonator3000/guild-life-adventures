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

async function peerIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { peerIds(): string[] };
    }).__guildE2EPeerControl;
    return control?.peerIds() ?? [];
  });
}

async function connectionCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const control = (globalThis as typeof globalThis & {
      __guildE2EPeerControl?: { connectionCount(): number };
    }).__guildE2EPeerControl;
    return control?.connectionCount() ?? 0;
  });
}

async function reconnectStorage(page: Page) {
  return page.evaluate(() => ({
    session: sessionStorage.getItem('guild-life-online-session'),
    credential: sessionStorage.getItem('guild-life-reconnect-credential'),
  }));
}

function collectPageErrors(host: Page, guest: Page): string[] {
  const pageErrors: string[] = [];
  host.on('pageerror', error => pageErrors.push(`host: ${error.message}`));
  guest.on('pageerror', error => pageErrors.push(`guest: ${error.message}`));
  return pageErrors;
}

test('host closes an active room and both clients return to a clean title screen', async ({ page, context }) => {
  const channelName = `guild-life-close-room-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const guest = await context.newPage();
  const pageErrors = collectPageErrors(page, guest);

  try {
    await Promise.all([
      prepareOnlinePage(page, channelName),
      prepareOnlinePage(guest, channelName),
    ]);

    await openOnlineLobby(page, 'Closure Host');
    const roomCode = await createHostedRoom(page);
    await openOnlineLobby(guest, 'Closure Guest');
    await joinHostedRoom(guest, roomCode);

    await expect(page.getByText('Closure Guest', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Start Game \(2 players\)/ }).click();
    await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
    await expect(guest.locator('[data-zone-id="bank"]')).toBeVisible();

    await expect.poll(
      async () => (await reconnectStorage(guest)).credential,
      { timeout: 15_000, message: 'Guest should receive a reconnect credential before room closure' },
    ).toMatch(/"reconnectToken":"[a-f0-9]{48}"/);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeVisible();
    const closeRoom = page.getByRole('button', { name: 'Close Online Room', exact: true });
    await expect(closeRoom).toBeVisible();
    await closeRoom.click();

    await expect(page.getByRole('button', { name: /online multiplayer/i })).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByRole('button', { name: /online multiplayer/i })).toBeVisible({ timeout: 15_000 });

    await expect.poll(() => connectionCount(page), { timeout: 15_000 }).toBe(0);
    await expect.poll(() => connectionCount(guest), { timeout: 15_000 }).toBe(0);
    await expect.poll(() => peerIds(page), { timeout: 15_000 }).toEqual([]);
    await expect.poll(() => peerIds(guest), { timeout: 15_000 }).toEqual([]);

    expect(await reconnectStorage(page)).toEqual({ session: null, credential: null });
    expect(await reconnectStorage(guest)).toEqual({ session: null, credential: null });
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
  } finally {
    await guest.close();
  }
});
