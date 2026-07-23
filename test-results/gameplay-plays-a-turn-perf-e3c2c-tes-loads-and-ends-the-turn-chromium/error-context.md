# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: gameplay.spec.ts >> plays a turn, performs a bank action, saves, mutates, loads and ends the turn
- Location: e2e/gameplay.spec.ts:15:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: /deposit 50/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: /deposit 50/i })

```

```yaml
- region "Notifications (F8)":
  - list
- region "Notifications alt+T":
  - list:
    - listitem:
      - img
      - text: Traveled to Guildholm Bank
- img "Brigand"
- heading "E2E Hero" [level=3]
- paragraph: Novice
- button "STATS":
  - img
  - text: STATS
- button "INVENTORY":
  - img
  - text: INVENTORY
- button "GOALS":
  - img
  - text: GOALS
- heading "Resources" [level=3]
- img
- text: Hours 55/60
- img
- text: Gold 0
- img
- text: Health 100/100
- img
- text: Happiness 45%
- img
- text: Food 50%
- img
- text: Clothing 35%
- heading "Character" [level=3]
- img
- text: Depend. 50%
- img
- text: Home The Slums
- img
- text: Exp 0/100
- heading "Employment" [level=3]
- img
- text: Job Unemployed
- heading "Finances" [level=3]
- img
- text: Savings 0g
- img
- text: Investments 0g
- heading "Education" [level=3]
- img
- text: Degrees 0 Guildholm Bank
- img "Brigand"
- img "WEEK 1 EVENT (1/2)"
- heading "WEEK 1 EVENT (1/2)" [level=2]
- paragraph: "Shadowfingers Heist!: The Shadowfingers sent their best. You lost your worst. And also your gold."
- button "Continue"
- text: "Week 1 | Market: 100%↔"
- img
- heading "E2E Hero's Turn" [level=3]
- button "Exit Fullscreen (F)":
  - img
- button "Fullboard mode – hide sidebars (B)":
  - img
- button "Game Menu (Esc)":
  - img
- button "PLAYERS":
  - img
  - text: PLAYERS
- button "ACHIEVE":
  - img
  - text: ACHIEVE
- button "OPTIONS":
  - img
  - text: OPTIONS
- img
- img "Brigand"
- text: E2E Hero 0g 55h
- img
- text: 11%
- paragraph: Click locations to travel directly
- heading "Goals to Win" [level=4]:
  - img
  - text: Goals to Win
- img
- text: 5000g
- img
- text: 100%
- img
- text: Lvl 45
- img
- text: Dep 75
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | async function startSinglePlayerGame(page: Page) {
  4  |   await page.goto('/');
  5  |   await page.getByRole('button', { name: /new adventure/i }).click();
  6  |   await page.getByPlaceholder('Enter name...').fill('E2E Hero');
  7  | 
  8  |   const tutorial = page.getByRole('checkbox', { name: /show tutorial/i });
  9  |   if (await tutorial.isChecked()) await tutorial.uncheck();
  10 | 
  11 |   await page.getByRole('button', { name: 'Begin Adventure' }).click();
  12 |   await expect(page.locator('[data-zone-id="bank"]')).toBeVisible();
  13 | }
  14 | 
  15 | test('plays a turn, performs a bank action, saves, mutates, loads and ends the turn', async ({ page }) => {
  16 |   const pageErrors: string[] = [];
  17 |   page.on('pageerror', error => pageErrors.push(error.message));
  18 | 
  19 |   await startSinglePlayerGame(page);
  20 | 
  21 |   await page.locator('[data-zone-id="bank"]').click();
  22 |   const depositButton = page.getByRole('button', { name: /deposit 50/i });
> 23 |   await expect(depositButton).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  24 | 
  25 |   const withdrawButton = page.getByRole('button', { name: /withdraw 50/i });
  26 |   await expect(withdrawButton).toHaveCount(0);
  27 |   await depositButton.click();
  28 |   await expect(withdrawButton).toBeVisible();
  29 | 
  30 |   await page.keyboard.press('Escape');
  31 |   await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeVisible();
  32 | 
  33 |   const manualSlot = page.getByText('Save Slot 1', { exact: true }).locator('xpath=../..');
  34 |   await manualSlot.getByRole('button', { name: 'Save', exact: true }).click();
  35 |   await expect(manualSlot.getByText(/Week 1 · E2E Hero/)).toBeVisible();
  36 | 
  37 |   await page.keyboard.press('Escape');
  38 |   await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeHidden();
  39 | 
  40 |   await withdrawButton.click();
  41 |   await expect(withdrawButton).toHaveCount(0);
  42 | 
  43 |   await page.keyboard.press('Escape');
  44 |   await page.getByRole('button', { name: 'Load Game' }).click();
  45 |   const savedSlot = page.getByText('Save Slot 1', { exact: true }).locator('xpath=../..');
  46 |   await savedSlot.getByRole('button', { name: 'Load', exact: true }).click();
  47 |   await expect(page.getByRole('heading', { name: 'Game Menu' })).toBeHidden();
  48 | 
  49 |   const financesSection = page.getByRole('heading', { name: 'Finances' }).locator('..');
  50 |   await expect(financesSection.getByText('50g', { exact: true })).toBeVisible();
  51 | 
  52 |   await page.getByRole('button', { name: 'End Turn', exact: true }).click();
  53 |   await expect(page.getByText(/Week\s+2/).first()).toBeVisible({ timeout: 15_000 });
  54 | 
  55 |   expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);
  56 | });
  57 | 
```