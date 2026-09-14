import { expect, test } from './test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 1194, height: 834 }]) {
  for (const skip of [false, true]) {
    test(`AI opponents return home after ${skip ? 'skipped' : 'animated'} turns at ${viewport.width}`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.setViewportSize(viewport);
      await page.addInitScript(() => { Math.random = () => .99; });
      const errors: string[] = [];
      const decisions: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.text().includes('[Grimwald AI]')) decisions.push(m.text()); });
      await page.goto('/');
      await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
      await page.getByPlaceholder('Enter name...').fill('Tactics Test');
      await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
      await page.getByRole('button', { name: 'Add AI opponent' }).click();
      await page.getByRole('button', { name: 'Add AI opponent' }).click();
      for (const radio of await page.getByRole('radio', { name: 'Master', exact: true }).all()) await radio.check();
      await page.getByRole('button', { name: 'Choose Game Goals', exact: true }).click();
      await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();
      if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
      await page.getByRole('button', { name: 'End Turn', exact: true }).click();
      for (const name of ['Grimwald', 'Seraphina']) {
        await expect(page.getByRole('heading', { name: `${name} is Scheming...`, exact: true })).toBeVisible({ timeout: 40_000 });
        if (skip) await page.getByTitle('Skip turn (Space)', { exact: true }).click();
        await expect(page.getByRole('heading', { name: `${name} is Scheming...`, exact: true })).toBeHidden({ timeout: 40_000 });
      }
      await expect(page.getByText(/Week\s+2/).first()).toBeVisible();
      await expect(page.locator('.animated-player-token')).toHaveCount(0);
      for (const name of ['Grimwald', 'Seraphina']) {
        await expect(page.locator('[data-zone-id="slums"]').getByRole('button', {
          name: `View ${name}'s character`, exact: true,
        })).toBeVisible();
      }
      expect(errors).toEqual([]);
      await info.attach('ai-decisions', { body: decisions.join('\n'), contentType: 'text/plain' });
      await page.screenshot({ path: info.outputPath('opponents-home.png'), timeout: 30_000 });
    });
  }
}
