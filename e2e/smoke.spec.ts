import { expect, test } from '@playwright/test';

test('title screen loads without runtime errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Guild Life' })).toBeVisible();
  await expect(page.getByText('Welcome to Guildholm')).toBeVisible();
  await expect(page.getByRole('button', { name: /new adventure/i })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('a new adventure opens the game setup screen', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: /new adventure/i }).click();

  await expect(page.getByRole('heading', { name: 'Prepare Your Adventure' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Victory Goals' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin Adventure' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
