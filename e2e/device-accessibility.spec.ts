import type { Page } from '@playwright/test';
import { expect, test } from './test';

async function startSinglePlayerGame(page: Page, options: { keyboardNav?: boolean } = {}) {
  await page.addInitScript(({ keyboardNav }) => {
    Math.random = () => 0.99;
    if (keyboardNav) {
      localStorage.setItem('guild-life-options', JSON.stringify({ enableKeyboardNav: true }));
    }
  }, options);

  await page.goto('/');
  await page.getByRole('button', { name: /new adventure/i }).click();
  await page.getByPlaceholder('Enter name...').fill('Device Hero');

  const tutorial = page.getByRole('checkbox', { name: /show tutorial/i });
  if (await tutorial.isChecked()) await tutorial.uncheck();

  await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();

  await page.getByRole('button', { name: 'Begin Adventure' }).click();
  await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
}

async function startGuidedMobileGame(page: Page) {
  await page.addInitScript(() => { Math.random = () => 0.99; });
  await page.goto('/');
  await page.getByRole('button', { name: /new adventure/i }).click();
  await page.getByPlaceholder('Enter name...').fill('Guided Hero');
  const tutorial = page.getByRole('checkbox', { name: /show tutorial/i });
  if (!(await tutorial.isChecked())) await tutorial.check();
  await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();
  await page.getByRole('button', { name: 'Begin Adventure' }).click();
}

async function expectNoPageOverflow(page: Page) {
  const measurements = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));

  expect(
    Math.max(measurements.document, measurements.body),
    `Unexpected horizontal overflow: ${JSON.stringify(measurements)}`,
  ).toBeLessThanOrEqual(measurements.viewport + 1);
}

async function leaveBrowserFullscreen(page: Page) {
  const fullscreenActive = await page.evaluate(() => document.fullscreenElement !== null);
  if (!fullscreenActive) return;

  // Mobile layouts do not expose the desktop fullscreen button. Use the
  // game's supported F shortcut, then wait for the asynchronous browser API.
  await page.keyboard.press('f');
  await expect.poll(
    () => page.evaluate(() => document.fullscreenElement === null),
    { message: 'Browser should finish leaving fullscreen before viewport rotation' },
  ).toBe(true);
}

test.describe('narrow mobile touch viewport', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('keeps the live board and mobile controls usable without page overflow', async ({ page }) => {
    await startSinglePlayerGame(page);

    await expect(page.getByRole('button', { name: 'End Turn', exact: true })).toBeVisible();
    await expectNoPageOverflow(page);

    await page.locator('[data-zone-id="bank"]').tap();
    await expect(page.getByRole('button', { name: /deposit 50/i })).toBeVisible({ timeout: 10_000 });

    await page.getByTitle('Stats & Inventory').tap();
    await expect(page.getByRole('region', { name: /Character record/ })).toBeVisible();
    await expectNoPageOverflow(page);
  });

  test('uses the full screen board with guidance in its protected center', async ({ page }) => {
    await startGuidedMobileGame(page);
    const guide = page.getByLabel('Guided first turn');
    const map = page.locator('.mobile-map-region');
    await expect(guide).toBeVisible();
    await expect(page.getByText('Get a Job!', { exact: true })).toHaveCount(0);

    const [guideBox, mapBox] = await Promise.all([guide.boundingBox(), map.boundingBox()]);
    expect(guideBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(mapBox?.width).toBeGreaterThanOrEqual(389);
    expect(mapBox?.height).toBeGreaterThanOrEqual(843);
    expect(guideBox?.x).toBeGreaterThan(mapBox?.x ?? 0);
    expect(guideBox?.y).toBeGreaterThan(mapBox?.y ?? 0);
    expect((guideBox?.x ?? 0) + (guideBox?.width ?? 0)).toBeLessThanOrEqual((mapBox?.x ?? 0) + (mapBox?.width ?? 0));
    expect((guideBox?.y ?? 0) + (guideBox?.height ?? 0)).toBeLessThanOrEqual((mapBox?.y ?? 0) + (mapBox?.height ?? 0));

    await page.getByRole('button', { name: /start guide/i }).tap();
    const guildHall = page.getByRole('button', { name: /Guild Hall, travel time/i });
    const targetBox = await guildHall.boundingBox();
    expect(targetBox?.width).toBeGreaterThanOrEqual(44);
    expect(targetBox?.height).toBeGreaterThanOrEqual(44);
    await guildHall.tap();
    await expect(page.getByText('Guild Hall', { exact: true }).first()).toBeVisible();
  });
});

test.describe('iPad-sized touch viewport', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    screen: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  });

  test('switches cleanly between tablet portrait and desktop-style landscape', async ({ page }) => {
    await startSinglePlayerGame(page);
    await leaveBrowserFullscreen(page);

    await expect(page.getByTitle('Stats & Inventory')).toBeVisible();
    await expect(page.getByRole('button', { name: 'End Turn', exact: true })).toBeVisible();
    await expectNoPageOverflow(page);

    await page.setViewportSize({ width: 1180, height: 820 });
    await expect(page.getByTitle('Stats & Inventory')).toHaveCount(0);
    await page.locator('.immersive-player').tap();
    await page.getByText('Finances & education', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Finances' })).toBeVisible();
    await expectNoPageOverflow(page);
    await page.getByRole('region', { name: /Character record/ }).getByRole('button', { name: 'Back to game', exact: true }).tap();

    await page.locator('[data-zone-id="bank"]').click();
    await expect(page.getByRole('button', { name: /deposit 50/i })).toBeVisible({ timeout: 10_000 });
  });
});

test('keyboard navigation reaches a real location and activates it', async ({ page }) => {
  await startSinglePlayerGame(page, { keyboardNav: true });

  for (let index = 0; index < 4; index += 1) {
    await page.keyboard.press('Tab');
  }

  const bankZone = page.locator('[data-zone-id="bank"]');
  await expect(bankZone.getByText('↵ Travel', { exact: true })).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /deposit 50/i })).toBeVisible({ timeout: 10_000 });
});

test('gameplay shortcuts stay blocked while the game menu modal is open', async ({ page }) => {
  await startSinglePlayerGame(page);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeVisible();

  await page.keyboard.press('e');
  await expect(page.getByText(/Week\s+1/).first()).toBeVisible();
  await expect(page.getByText(/Week\s+2/)).toHaveCount(0);

  await page.keyboard.press('t');
  await expect(page.getByText('Your First Turn — Learn by Doing')).toHaveCount(0);
});
