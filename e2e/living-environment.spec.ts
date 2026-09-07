import type { Page } from '@playwright/test';
import { expect, test } from './test';

async function startEnvironmentGame(page: Page) {
  await page.addInitScript(() => { Math.random = () => .99; });
  await page.goto('/');
  // Use the existing session-only developer gesture, not a new production debug route.
  await page.locator('button[aria-hidden="true"]').click({clickCount:5,delay:80});
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Environment Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('.board-environment')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
}

test('weather stays behind playable controls and preserves visual evidence', async ({page},testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror',error => errors.push(error.message));
  await startEnvironmentGame(page);
  for (const [label,type] of [['Clear','clear'],['Storm','thunderstorm'],['Snow','snowstorm'],['Fog','enchanted-fog'],['Rain','harvest-rain'],['Drought','drought']]) {
    await page.getByRole('button',{name:label,exact:true}).click();
    await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather',type);
    // Wait for a rendered frame; screenshots keep the real live animations.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({path:testInfo.outputPath(`desktop-${type}.png`)});
  }
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  const timing = await page.evaluate(async () => {
    const times: number[] = [];
    let previous = await new Promise<number>(resolve => requestAnimationFrame(resolve));
    for (let i=0;i<180;i++) {
      const now = await new Promise<number>(resolve => requestAnimationFrame(resolve));
      times.push(now-previous); previous=now;
    }
    const sorted = [...times].sort((a,b) => a-b);
    return {samples:times.length,averageFps:1000/(times.reduce((a,b)=>a+b,0)/times.length),p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],conditions:'CI Chromium, development build, desktop storm. Not a physical-device benchmark.'};
  });
  await testInfo.attach('storm-frame-timing',{body:JSON.stringify(timing,null,2),contentType:'application/json'});
  await page.locator('[data-zone-id="bank"]').click();
  await expect(page.getByRole('button',{name:/deposit 50/i})).toBeVisible({timeout:15_000});
  await page.getByRole('button',{name:/deposit 50/i}).click();
  await expect(page.getByRole('button',{name:/withdraw 50/i})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('desktop-storm-bank.png')});
  await page.getByRole('button',{name:/^options$/i}).click();
  await page.getByLabel('Living environment').selectOption('reduced');
  await expect(page.locator('.weather-particles')).toHaveCount(0);
  await expect(page.locator('.weather-tint-rain')).toBeVisible();
  await page.getByLabel('Living environment').selectOption('off');
  await expect(page.locator('.board-environment')).toHaveCount(0);
  await page.getByLabel('Living environment').selectOption('full');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.board-environment')).toHaveAttribute('data-detail','reduced');
  expect(errors).toEqual([]);
});

test('mobile storm leaves bank actions usable and display settings reachable', async ({page},testInfo) => {
  await startEnvironmentGame(page);
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByTitle('Stats & Inventory')).toBeVisible();
  await expect(page.locator('.weather-rain')).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('mobile-storm.png')});
  await page.locator('[data-zone-id="bank"]').click();
  await expect(page.getByRole('button',{name:/deposit 50/i})).toBeVisible({timeout:15_000});
  await page.getByRole('button',{name:/deposit 50/i}).click();
  await expect(page.getByRole('button',{name:/withdraw 50/i})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('mobile-storm-bank.png')});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:/^options$/i}).click();
  await page.getByRole('button',{name:'Display',exact:true}).click();
  await page.getByLabel('Living environment').selectOption('reduced');
  await expect(page.locator('.board-environment')).toHaveAttribute('data-detail','reduced');
  await page.screenshot({path:testInfo.outputPath('mobile-display-options.png')});
});
