import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { openMenuPage, visitLocation, selectLocationService } from './menuPages';

async function start(page: Page) {
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.goto('/');
  await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
  await page.getByPlaceholder('Enter name...').fill('Tablet Adventurer');
  await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
  await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();
  // Wait for the board's keyboard handler before leaving the browser fullscreen
  // requested by New Adventure. Otherwise F can be sent during lazy loading.
  await expect(page.locator('.center-turn-toolbar')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) {
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  }
}

// Real browser touch input: exercises pointer capture, touch-action and generated clicks.
async function swipe(page: Page, target: Locator, dx: number, dy: number) {
  // A service switch can create a scroller that was not scrollable previously.
  // Let Chromium commit its new scroll layer before injecting native input.
  await target.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
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
    test(`vertical scrolling and integrated character controls at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await start(page);
      await page.locator('[data-zone-id="armory"]').tap();
      const shell = page.locator('.location-shell[data-location="armory"]');
      if (await shell.locator('.location-service-picker').isVisible()) await shell.locator('.location-service-picker').tap();
      await shell.getByRole('button', { name: 'Weapons', exact: true }).tap();
      const buy = shell.getByRole('button', { name: /^Buy Simple Dagger/ });
      await openMenuPage(page, buy);
      const viewportBox = shell.locator('.location-page-viewport');
      const readScroll = () => viewportBox.evaluate(el => ({ top: el.scrollTop, left: el.scrollLeft, max: el.scrollHeight - el.clientHeight }));
      const before = await readScroll();
      await swipe(page, buy, -95, 0);
      expect((await readScroll()).left).toBe(0);
      await expect(shell.getByRole('button', { name: 'Unequip Simple Dagger', exact: true })).toHaveCount(0);
      await swipe(page, viewportBox, 0, -90);
      if (before.max > 0) await expect.poll(async () => (await readScroll()).top).toBeGreaterThan(before.top);
      expect((await readScroll()).left).toBe(0);
      await expect(shell.getByRole('button', { name: 'Unequip Simple Dagger', exact: true })).toHaveCount(0);
      await openMenuPage(page, buy);
      await buy.tap();
      await expect(shell.getByRole('button', { name: 'Unequip Simple Dagger', exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('tablet-menu.png') });

      const hours = await page.locator('.center-turn-toolbar').textContent();
      await page.locator('[data-board-art]').getByRole('button', { name: "View Tablet Adventurer's character", exact: true }).tap();
      const character = page.getByRole('region', { name: /Character record/ });
      await expect(character.getByRole('heading', { name: 'Resources', exact: true })).toBeVisible();
      await expect(page.getByRole('dialog', { name: /Character record/ })).toHaveCount(0);
      expect(await character.evaluate(el => {
        const panel = el.closest('[data-center-panel]');
        if (!panel) return false;
        const a = el.getBoundingClientRect(), b = panel.getBoundingClientRect();
        return a.left >= b.left && a.right <= b.right + 1 && a.top >= b.top && a.bottom <= b.bottom + 1;
      })).toBe(true);
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

      // The exact reported case: swipe Guild Hall employers vertically, then read jobs.
      await visitLocation(page, 'guild-hall');
      await selectLocationService(page, 'Jobs');
      const guild = page.locator('.location-shell[data-location="guild-hall"]');
      const list = guild.locator('.location-page-viewport');
      const employersOverflow = await list.evaluate(el => el.scrollHeight > el.clientHeight);
      if (viewport.width >= 1024) expect(employersOverflow).toBe(true);
      await swipe(page, list, 0, -110);
      if (employersOverflow) await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(20);
      else expect(await list.evaluate(el => el.scrollTop)).toBe(0);
      expect(await list.evaluate(el => el.scrollLeft)).toBe(0);
      await expect(guild.getByRole('button', { name: /Back to Employers/i })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('guild-employers-scrolled.png') });
      const employer = guild.getByRole('button', { name: 'Guild Hall', exact: true });
      await openMenuPage(page, employer);
      await employer.tap();
      await expect(guild.getByRole('button', { name: /Back to Employers/i })).toBeVisible();
      const jobsOverflow = await list.evaluate(el => el.scrollHeight > el.clientHeight);
      await swipe(page, list, 0, -100);
      if (jobsOverflow) {
        await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(10);
        const scrolled = await list.evaluate(el => el.scrollTop);
        await swipe(page, list, 0, 80);
        await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeLessThan(scrolled);
      }
      await expect(guild.getByRole('button', { name: /Back to Employers/i })).toBeVisible();
      await page.screenshot({ path: info.outputPath('guild-jobs-scrolled.png') });
      // Opening the record and returning preserves the actual menu and scroll offset.
      const savedScroll = await list.evaluate(el => el.scrollTop);
      await page.locator('[data-board-art]').getByRole('button', { name: "View Tablet Adventurer's character", exact: true }).tap();
      await page.getByRole('button', { name: 'Back to game', exact: true }).tap();
      await expect(guild).toBeVisible();
      expect(await list.evaluate(el => el.scrollTop)).toBeCloseTo(savedScroll, 0);

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
  await expect(page.getByRole('region', { name: /Character record/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.immersive-player')).toBeFocused();
  await page.getByRole('button', { name: 'Show sidebars', exact: true }).click();
  await expect(page.locator('.guild-sidebar')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('guild-life-autosave')), { timeout: 15_000 }).toBe(true);
  await page.reload();
  await page.getByRole('button', { name: /Continue Game/ }).click();
  // Wait for the board's keyboard handler before leaving the browser fullscreen
  // requested by New Adventure. Otherwise F can be sent during lazy loading.
  await expect(page.locator('.center-turn-toolbar')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) {
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  }
  await expect(page.locator('.guild-sidebar')).toHaveCount(2);
  await page.keyboard.press('b');
  await expect(page.locator('.immersive-topbar')).toBeVisible();
  await page.getByRole('button', { name: 'Game Menu', exact: true }).click();
  await page.getByRole('button', { name: /Manual/i }).click();
  await page.getByRole('button', { name: 'The Board', exact: true }).click();
  await expect(page.getByText('Display modes & touch controls', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('display-manual.png') });
});
