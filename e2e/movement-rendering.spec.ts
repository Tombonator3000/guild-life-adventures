import { writeFileSync } from 'node:fs';
import { expect, test } from './test';
import { visitLocation } from './menuPages';

test('movement arrives on the canonical route with bounded rendering work', async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.goto('/');
  await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
  await page.getByPlaceholder('Enter name...').fill('Movement Test');
  await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
  await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-assets', 'ready');
  const session = await page.context().newCDPSession(page);
  await session.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const samples: unknown[] = [];
  for (const destination of ['guild-hall', 'bank', 'armory']) {
    const before = await metrics();
    await visitLocation(page, destination);
    const moving = page.locator('.animated-player-token');
    await expect(moving).toBeVisible();
    if (!process.env.MOVEMENT_BASELINE) {
      const style = await moving.evaluate(el => ({ transform: (el as HTMLElement).style.transform, left: (el as HTMLElement).style.left, top: (el as HTMLElement).style.top }));
      expect(style.transform).toContain('translate3d');
      expect(style.left).toBe(''); expect(style.top).toBe('');
    }
    await expect(moving).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator(`[data-zone-id="${destination}"]`).getByRole('button', { name: "View Movement Test's character", exact: true })).toBeVisible();
    await expect(page.locator(`.location-shell[data-location="${destination}"]`)).toBeVisible();
    const after = await metrics();
    samples.push({ destination, layoutCount: after.LayoutCount - before.LayoutCount, recalcStyleCount: after.RecalcStyleCount - before.RecalcStyleCount,
      layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000, scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000, taskMs: (after.TaskDuration - before.TaskDuration) * 1000 });
  }
  writeFileSync(info.outputPath('movement-metrics.json'), JSON.stringify({ viewport: '1194x834', samples }, null, 2));
  await page.screenshot({ path: info.outputPath('movement-arrival.png') });
  await session.detach();
});
