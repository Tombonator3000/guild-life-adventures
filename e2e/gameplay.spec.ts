import { expect, test, type Page } from '@playwright/test';

async function startSinglePlayerGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start Local Game' }).click();
  await page.getByRole('button', { name: '1' }).click();
  await page.getByPlaceholder('Enter player name').fill('E2E Hero');

  const tutorial = page.getByLabel('Show tutorial on first game');
  if (await tutorial.isChecked()) await tutorial.uncheck();

  await page.getByRole('button', { name: 'Begin Adventure' }).click();
  await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
}

test('plays a turn, performs a bank action, saves, mutates, loads and ends the turn', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await startSinglePlayerGame(page);

  await page.locator('[data-zone-id="bank"]').click();
  await page.getByRole('button', { name: 'Travel to Bank' }).click();

  await expect(page.getByText('Savings: 0g')).toBeVisible();
  await page.getByRole('button', { name: 'Deposit 50 gold' }).click();
  await expect(page.getByText('Savings: 50g')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText(/Week 1 · E2E Hero/)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeHidden();

  await page.getByRole('button', { name: 'Withdraw 50 gold' }).click();
  await expect(page.getByText('Savings: 0g')).toBeVisible();

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Load Game' }).click();
  await page.getByRole('button', { name: 'Load', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeHidden();
  await expect(page.getByText('Savings: 50g')).toBeVisible();

  await page.keyboard.press('KeyE');
  await expect(page.getByText(/Week\s+2/).first()).toBeVisible({ timeout: 15_000 });

  expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);
});
