import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { openMenuPage } from './menuPages';

async function start(page: Page) {
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.goto('/');
  await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
  await page.getByPlaceholder('Enter name...').fill('Tablet Adventurer');
  await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
  await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
}

// Real browser touch input: exercises pointer capture, touch-action and generated clicks.
async function swipe(page: Page, target: Locator, dx: number, dy: number) {
  const box = await target.boundingBox();
  if (!box) throw new Error('Swipe target is missing');
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const session = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => ({ x, y, id: 0, radiusX: 5, radiusY: 5, force: 1 });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(x, y)] });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(x + dx * step / 8, y + dy * step / 8)] });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

test.describe('native tablet touch', () => {
  test.use({ hasTouch: true });
  for (const viewport of [{ width: 1194, height: 834 }, { width: 820, height: 1180 }]) {
    test(`finger paging and character controls at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await start(page);
      await page.locator('[data-zone-id="armory"]').tap();
      const shell = page.locator('.location-shell[data-location="armory"]');
      if (await shell.locator('.location-service-picker').isVisible()) await shell.locator('.location-service-picker').tap();
      await shell.getByRole('button', { name: 'Weapons', exact: true }).tap();
      const buy = shell.getByRole('button', { name: /^Buy Simple Dagger/ });
      await openMenuPage(page, buy);
      const status = shell.locator('.location-page-controls [role="status"]');
      const multiplePages = await shell.getByRole('button', { name: 'Next menu page' }).isEnabled();
      if (viewport.width >= 1024) expect(multiplePages).toBe(true);
      const first = await status.textContent();
      await swipe(page, buy, -95, 0);
      if (multiplePages) await expect(status).not.toHaveText(first!);
      else await expect(status).toHaveText(first!);
      await expect(shell.getByRole('button', { name: 'Unequip Simple Dagger', exact: true })).toHaveCount(0);
      await swipe(page, shell.locator('.location-page-viewport'), 95, 0);
      await expect(status).toHaveText(first!);
      await swipe(page, shell.locator('.location-page-viewport'), 0, -90);
      if (multiplePages) await expect(status).not.toHaveText(first!);
      else await expect(status).toHaveText(first!);
      await swipe(page, shell.locator('.location-page-viewport'), 0, 90);
      await expect(status).toHaveText(first!);
      await buy.tap();
      await expect(shell.getByRole('button', { name: 'Unequip Simple Dagger', exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('tablet-menu.png') });

      const hours = await page.locator('.center-turn-toolbar').textContent();
      await page.locator('[data-board-art]').getByRole('button', { name: "View Tablet Adventurer's character", exact: true }).tap();
      const character = page.getByRole('dialog', { name: /Character record/ });
      await expect(character.getByRole('heading', { name: 'Resources', exact: true })).toBeVisible();
      await character.getByRole('button', { name: /^inventory$/i }).tap();
      await expect(character.locator('[data-item-art="dagger"]').first()).toBeVisible();
      await character.getByRole('button', { name: /^goals$/i }).tap();
      await expect(character.getByRole('heading', { name: 'Victory Goals', exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('tablet-character.png') });
      await page.keyboard.press('e');
      await expect(page.locator('.center-turn-toolbar')).toHaveText(hours!);
      await page.keyboard.press('Escape');
      await expect(character).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Game Menu', exact: true })).toHaveCount(0);

      if (viewport.width >= 1024) {
        await page.getByRole('button', { name: 'Options', exact: true }).tap();
        const ledger = page.getByRole('dialog', { name: /Guild ledger/ });
        const slider = ledger.getByRole('slider').first();
        const value = await slider.inputValue();
        await swipe(page, slider, 55, 0);
        await expect(slider).not.toHaveValue(value);
        await page.screenshot({ path: info.outputPath('tablet-options.png') });
        await ledger.getByRole('button', { name: 'Close', exact: true }).tap();
        await page.getByRole('button', { name: 'Players and awards' }).tap();
        await expect(page.getByRole('dialog', { name: /Guild ledger/ })).toContainText('Tablet Adventurer');
        await page.screenshot({ path: info.outputPath('tablet-players.png') });
      }
    });
  }
});

test('immersive defaults, explicit display choice and manual survive a reload', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await start(page);
  await expect(page.locator('.immersive-topbar')).toBeVisible();
  await expect(page.locator('.guild-sidebar')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('immersive-desktop.png') });
  await page.locator('.immersive-player').click();
  await expect(page.getByRole('dialog', { name: /Character record/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.immersive-player')).toBeFocused();
  await page.getByRole('button', { name: 'Show sidebars', exact: true }).click();
  await expect(page.locator('.guild-sidebar')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('guild-life-autosave')), { timeout: 15_000 }).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: /Continue Game/ }).click();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await expect(page.locator('.guild-sidebar')).toHaveCount(2);
  await page.keyboard.press('b');
  await expect(page.locator('.immersive-topbar')).toBeVisible();
  await page.getByRole('button', { name: 'Game Menu', exact: true }).click();
  await page.getByRole('button', { name: /Manual/i }).click();
  await page.getByRole('button', { name: 'The Board', exact: true }).click();
  await expect(page.getByText('Display modes & touch controls', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('display-manual.png') });
});
