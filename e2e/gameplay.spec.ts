import { expect, test, type Page } from '@playwright/test';

async function startSinglePlayerGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /new adventure/i }).click();
  await page.getByPlaceholder('Enter name...').fill('E2E Hero');

  const tutorial = page.getByRole('checkbox', { name: /show tutorial/i });
  if (await tutorial.isChecked()) await tutorial.uncheck();

  await page.getByRole('button', { name: 'Begin Adventure' }).click();
  await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
}

test('plays a turn, performs a bank action, saves, mutates, loads and ends the turn', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await startSinglePlayerGame(page);

  await page.locator('[data-zone-id="bank"]').click();
  const depositButton = page.getByRole('button', { name: /deposit 50/i });
  await expect(depositButton).toBeVisible();

  const withdrawButton = page.getByRole('button', { name: /withdraw 50/i });
  await expect(withdrawButton).toHaveCount(0);
  await depositButton.click();
  await expect(withdrawButton).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeVisible();

  const manualSlot = page.getByText('Save Slot 1', { exact: true }).locator('xpath=../..');
  await manualSlot.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(manualSlot.getByText(/Week 1 · E2E Hero/)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeHidden();

  await withdrawButton.click();
  await expect(withdrawButton).toHaveCount(0);

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Load Game' }).click();
  const savedSlot = page.getByText('Save Slot 1', { exact: true }).locator('xpath=../..');
  await savedSlot.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeHidden();
  await expect(page.getByRole('button', { name: /withdraw 50/i })).toBeVisible();

  await page.keyboard.press('e');
  await expect(page.getByText(/Week\s+2/).first()).toBeVisible({ timeout: 15_000 });

  expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);
});
