import { expect, test, type Page } from '@playwright/test';

async function startSinglePlayerGame(page: Page, options: { tutorial?: boolean } = {}) {
  // The flow validates deterministic UI/state transitions, not random-event odds.
  // Keep all probability checks above their trigger thresholds before the app loads.
  await page.addInitScript(() => {
    Math.random = () => 0.99;
  });

  await page.goto('/');
  await page.getByRole('button', { name: /new adventure/i }).click();
  await page.getByPlaceholder('Enter name...').fill('E2E Hero');

  const tutorial = page.getByRole('checkbox', { name: /show tutorial/i });
  if (options.tutorial) {
    if (!(await tutorial.isChecked())) await tutorial.check();
  } else if (await tutorial.isChecked()) {
    await tutorial.uncheck();
  }

  await page.getByRole('button', { name: 'Begin Adventure' }).click();
  await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
}

test('completes the guided first turn through real game actions', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await startSinglePlayerGame(page, { tutorial: true });

  await expect(page.getByText('Your First Turn — Learn by Doing')).toBeVisible();
  await page.getByRole('button', { name: /start guided turn/i }).click();
  await expect(page.getByText('1. Travel to the Guild Hall')).toBeVisible();

  await page.locator('[data-zone-id="guild-hall"]').click();
  await expect(page.getByText('2. Get an Entry-Level Job')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Guild Hall', exact: true }).click();
  await expect(page.getByText('Floor Sweeper', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply', exact: true }).first().click();
  await expect(page.getByText('HIRED!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accept Job', exact: true }).click();

  await expect(page.getByText('3. Work One Full Shift')).toBeVisible();
  await page.getByRole('button', { name: /work shift/i }).click();
  await expect(page.getByText('4. Buy Food for the Week')).toBeVisible();

  await page.locator('[data-zone-id="general-store"]').click();
  const breadButton = page.getByRole('button', { name: /loaf of bread/i });
  await expect(breadButton).toBeVisible({ timeout: 10_000 });
  await breadButton.click();
  await expect(page.getByText('5. Protect Some Gold at the Bank')).toBeVisible();

  await page.locator('[data-zone-id="bank"]').click();
  const depositButton = page.getByRole('button', { name: /deposit 50/i });
  await expect(depositButton).toBeVisible({ timeout: 10_000 });
  await depositButton.click();
  await expect(page.getByText('6. Review the Turn and End It')).toBeVisible();

  await page.getByRole('button', { name: 'End Turn', exact: true }).click();
  await expect(page.getByText(/Week\s+2/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Guided first turn/i)).toHaveCount(0);

  expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);
});

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

  const financesSection = page.getByRole('heading', { name: 'Finances' }).locator('..');
  await expect(financesSection.getByText('50g', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'End Turn', exact: true }).click();
  await expect(page.getByText(/Week\s+2/).first()).toBeVisible({ timeout: 15_000 });

  expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);
});
