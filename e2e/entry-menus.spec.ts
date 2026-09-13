import type { Page } from '@playwright/test';
import { expect, test } from './test';

async function assertEntryLayout(page: Page) {
  const failures = await page.locator('.entry-screen').evaluate((root) => {
    const width = window.innerWidth;
    const issues: string[] = [];
    if (document.documentElement.scrollWidth > width + 1) issues.push('horizontal page overflow');
    for (const button of root.querySelectorAll<HTMLElement>(
      '.entry-button, .entry-portrait, .entry-name-input, .entry-difficulty',
    )) {
      if (!button.getClientRects().length) continue;
      const bounds = button.getBoundingClientRect();
      if (bounds.height < 44) issues.push(`${button.textContent?.trim()}: target under 44px`);
      if (bounds.left < -1 || bounds.right > width + 1)
        issues.push(`${button.textContent?.trim()}: clipped horizontally`);
    }
    for (const element of root.querySelectorAll<HTMLElement>('*')) {
      if (
        /auto|scroll/.test(getComputedStyle(element).overflowY) &&
        element.scrollHeight > element.clientHeight + 1
      )
        issues.push(`${element.className}: nested scrolling`);
    }
    return issues;
  });
  expect(failures).toEqual([]);
}

for (const viewport of [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1280, height: 720 },
]) {
  test(`gold menus preserve a full roster and custom goals at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Continue Game', exact: true })).toHaveCount(0);
    await assertEntryLayout(page);
    await page.screenshot({ path: info.outputPath('title.png'), fullPage: true });
    await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
    await page.getByPlaceholder('Enter name...').fill('Menu Hero');
    await page.getByRole('button', { name: 'Choose portrait for Menu Hero' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose Your Portrait' });
    await picker.getByRole('button', { name: /Mystics/ }).click();
    await page.screenshot({ path: info.outputPath('portraits.png') });
    await picker.getByRole('button', { name: 'Mage', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Choose portrait for Menu Hero' })).toBeFocused();
    await expect(
      page.getByRole('button', { name: 'Choose portrait for Menu Hero' }).getByRole('img', { name: 'Mage' }),
    ).toBeVisible();
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Add AI opponent' }).click();
    await expect(page.getByRole('button', { name: 'Add AI opponent' })).toBeDisabled();
    await page.getByRole('button', { name: 'Add human player' }).click();
    await expect(page.getByRole('button', { name: 'Add human player' })).toBeDisabled();
    await page.getByRole('button', { name: 'Next players' }).click();
    await page.getByRole('button', { name: 'Next players' }).click();
    await page.getByRole('combobox').last().selectOption('hard');
    await assertEntryLayout(page);
    await page.screenshot({ path: info.outputPath('players.png'), fullPage: true });
    await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();
    await page.getByRole('button', { name: 'Adventure', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Adventure', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(
      page.getByText('First to reach all five goals wins. Career counts while employed.'),
    ).toBeVisible();
    await assertEntryLayout(page);
    await page.screenshot({ path: info.outputPath('goals.png'), fullPage: true });
    await page.getByText('Customize targets', { exact: true }).click();
    const wealth = page.getByRole('slider', { name: /Wealth Target/ });
    await wealth.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('heading', { name: 'Your Custom game' })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('combobox').last()).toHaveValue('hard');
    await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();
    await expect(page.getByText('4,500 gold', { exact: true })).toBeVisible();
    await assertEntryLayout(page);
    await page.getByRole('button', { name: 'Begin Adventure', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Begin Adventure', exact: true })).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test('Continue displays and restores a real saved game', async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.99;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
  await page.getByPlaceholder('Enter name...').fill('Saved Hero');
  await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
  await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();
  await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();
  await expect(page.locator('[data-zone-id="bank"]')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('guild-life-autosave'))).toBeTruthy();
  await page.reload();
  const resume = page.getByRole('button', { name: 'Continue Game', exact: true });
  await expect(resume).toContainText('Week 1 · Saved Hero');
  await resume.click();
  await expect(page.locator('[data-zone-id="bank"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'End Turn', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Load Saved', exact: true }).click();
  const saves = page.getByRole('dialog', { name: 'Load Game' });
  await saves.getByRole('button', { name: /Delete Auto/ }).click();
  await page.keyboard.press('Escape');
  await expect(saves).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Load Saved', exact: true })).toBeFocused();
  await expect(resume).toHaveCount(0);
});

test('large text and reduced motion retain readable, reachable menu actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() =>
    localStorage.setItem(
      'guild-life-options',
      JSON.stringify({ textSize: 'x-large', environmentDetail: 'off' }),
    ),
  );
  await page.goto('/');
  await assertEntryLayout(page);
  await expect(page.locator('.entry-particles')).toBeHidden();
  const animations = await page
    .locator('.entry-screen')
    .evaluate((root) => root.getAnimations({ subtree: true }).length);
  expect(animations).toBe(0);
  await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
  await assertEntryLayout(page);
  await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();
  await assertEntryLayout(page);
});
