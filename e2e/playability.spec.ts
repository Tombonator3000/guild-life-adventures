import { expect, test } from './test';

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
  test(`plans and banks without paging at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => { Math.random = () => .99; });
    await page.goto('/');
    await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
    await page.getByPlaceholder('Enter name...').fill('Week Planner');
    await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
    await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();
    if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
    await expect(page.getByRole('region', { name: 'This Week' })).toBeVisible();
    await page.screenshot({ path: info.outputPath('this-week.png') });
    if (viewport.width < 1024) {
      await expect.poll(async () => {
        const r = await page.locator('[data-board-art]').boundingBox();
        return r ? r.width / r.height : 0;
      }).toBeCloseTo(5056 / 3392, 2);
    }
    await page.locator('[data-zone-id="bank"]').click();
    const deposit = page.getByRole('button', { name: 'Deposit 50 Gold' });
    await expect(deposit).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Next menu page' })).toHaveCount(0);
    for (const action of [deposit, page.getByRole('button', { name: 'Withdraw 50 Gold' })]) {
      const inside = await action.evaluate(el => {
        const r = el.getBoundingClientRect(), panel = el.closest('.location-content')!.getBoundingClientRect();
        return r.top >= panel.top && r.bottom <= panel.bottom && r.left >= panel.left && r.right <= panel.right;
      });
      expect(inside).toBe(true);
    }
    await deposit.click();
    await page.getByRole('button', { name: 'Withdraw 50 Gold' }).click();
    await page.screenshot({ path: info.outputPath('bank-actions.png') });
    await page.getByRole('button', { name: 'The Broker', exact: true }).click();
    await page.getByLabel('Broker company').selectOption('crown-bonds');
    await page.getByRole('button', { name: /^Buy 1/ }).click();
    await expect(page.getByRole('button', { name: /^Sell 1/ })).toBeEnabled();
    await page.getByRole('button', { name: /^Sell 1/ }).click();
    await page.screenshot({ path: info.outputPath('broker-actions.png') });
    await page.getByRole('button', { name:'Loans', exact:true }).click();
    await expect(page.getByRole('button', { name:'Borrow 100g' })).toBeDisabled();
    await expect(page.getByRole('region', { name:'Bank loans' })).toContainText('shifts first');
    await page.screenshot({ path:info.outputPath('bank-loans.png') });
    await page.getByRole('button', { name:'Overview', exact:true }).click();
    await expect(page.getByRole('region', { name:'Financial overview' })).toContainText('Total wealth');
    await page.screenshot({ path:info.outputPath('bank-overview.png') });
  });
}
