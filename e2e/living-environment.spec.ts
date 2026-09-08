import type { Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { expect, test } from './test';

async function startEnvironmentGame(page: Page) {
  await page.addInitScript(() => { Math.random = () => .99; localStorage.setItem('guild-life-board-view', 'sidebars'); });
  await page.goto('/');
  // Use the existing session-only developer gesture, not a new production debug route.
  await page.locator('button[aria-hidden="true"]').click({clickCount:5,delay:80,timeout:5000});
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Environment Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('.board-environment')).toBeVisible();
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-assets','ready');
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
}

test('weather stays behind playable controls and preserves visual evidence', async ({page},testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  let heatRenderer: string | null = null;
  page.on('pageerror',error => errors.push(error.message));
  await startEnvironmentGame(page);
  for (const [label,type] of [['Clear','clear'],['Storm','thunderstorm'],['Snow','snowstorm'],['Fog','enchanted-fog'],['Rain','harvest-rain'],['Drought','drought']]) {
    await page.getByRole('button',{name:label,exact:true}).click();
    await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather',type);
    if (type === 'drought') {
      await expect(page.locator('.heat-shimmer')).toHaveAttribute('data-status',/ready|fallback/);
      heatRenderer=await page.locator('.heat-shimmer').getAttribute('data-status');
    }
    // Wait for a rendered frame; screenshots keep the real live animations.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({path:testInfo.outputPath(`desktop-${type}.png`)});
  }
  for (const [label,id] of [['Harvest','harvest-festival'],['Solstice','winter-solstice'],['Tourney','spring-tournament'],['Fair','midsummer-fair']]) {
    await page.getByRole('button',{name:'Clear',exact:true}).click();
    await page.getByRole('button',{name:label,exact:true}).click();
    await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-festival',id);
    await page.screenshot({path:testInfo.outputPath(`desktop-${id}.png`)});
  }
  await page.getByRole('button',{name:'Clear Festival',exact:true}).click();
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  // Actual alpha pixels, not just z-index or pointer-events declarations.
  const protectedPixels = await page.evaluate(() => {
    const screen=document.querySelector<HTMLCanvasElement>('.screen-event-fx')!;
    const world=document.querySelector<HTMLCanvasElement>('.board-atmosphere')!;
    const panel=document.querySelector('[data-fx-protect*=","]')!.getBoundingClientRect();
    return [screen,world].map(canvas => {
      const box=canvas.getBoundingClientRect();
      const x=Math.round((panel.left+panel.width/2-box.left)*canvas.width/box.width);
      const y=Math.round((panel.top+panel.height/2-box.top)*canvas.height/box.height);
      return canvas.getContext('2d')!.getImageData(x,y,1,1).data[3];
    });
  });
  expect(protectedPixels).toEqual([0,0]);
  const timing = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('.board-atmosphere')!;
    const initialPixels = canvas.toDataURL();
    const times: number[] = [];
    let previous = await new Promise<number>(resolve => requestAnimationFrame(resolve));
    for (let i=0;i<180;i++) {
      const now = await new Promise<number>(resolve => requestAnimationFrame(resolve));
      times.push(now-previous); previous=now;
    }
    const sorted = [...times].sort((a,b) => a-b);
    return {ambientMotionChanged:canvas.toDataURL() !== initialPixels,samples:times.length,averageFps:1000/(times.reduce((a,b)=>a+b,0)/times.length),p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],conditions:'CI Chromium, development build, desktop storm. Not a physical-device benchmark.'};
  });
  expect(timing.ambientMotionChanged).toBe(true);
  await page.screenshot({path:testInfo.outputPath('desktop-thunderstorm-later-frame.png')});
  await testInfo.attach('storm-frame-timing',{body:JSON.stringify(timing,null,2),contentType:'application/json'});
  await writeFile(testInfo.outputPath('vfx-frame-timing.json'),JSON.stringify({...timing,heatRenderer,protectedPixels},null,2));
  await page.locator('[data-zone-id="bank"]').click();
  await expect(page.getByRole('button',{name:/deposit 50/i})).toBeVisible({timeout:15_000});
  await page.getByRole('button',{name:/deposit 50/i}).click();
  await expect(page.getByRole('button',{name:/withdraw 50/i})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('desktop-storm-bank.png')});
  await page.getByRole('button',{name:/^options$/i}).click();
  await page.getByLabel('Living environment').selectOption('reduced');
  await expect(page.locator('.weather-particles')).toHaveCount(0);
  await expect(page.locator('.environment-still[data-weather="thunderstorm"]')).toBeVisible();
  const calmTime=await page.locator('.board-atmosphere').getAttribute('data-effect-time');
  await page.waitForTimeout(150);
  expect(await page.locator('.board-atmosphere').getAttribute('data-effect-time')).toBe(calmTime);
  await page.getByLabel('Living environment').selectOption('off');
  await expect(page.locator('.board-environment')).toHaveCount(0);
  await page.getByLabel('Living environment').selectOption('full');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.board-environment')).toHaveAttribute('data-detail','reduced');
  expect(errors).toEqual([]);
});

test('snow and heat retain the original board and clear mobile action regions', async ({page},testInfo) => {
  await startEnvironmentGame(page);
  await page.getByRole('button',{name:'Snow',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:testInfo.outputPath('mobile-snow.png')});
  await page.setViewportSize({width:1280,height:720});
  await page.getByRole('button',{name:/^dev$/i}).click();
  await page.getByRole('button',{name:'Drought',exact:true}).click();
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('.heat-shimmer')).toHaveAttribute('data-status',/ready|fallback/);
  await page.screenshot({path:testInfo.outputPath('mobile-landscape-drought.png')});
  await page.locator('[data-zone-id="bank"]').click();
  await expect(page.getByRole('button',{name:/deposit 50/i})).toBeVisible({timeout:15_000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.heat-shimmer')).toHaveCount(0);
  await expect(page.locator('.board-environment')).toHaveAttribute('data-detail','reduced');
  await page.screenshot({path:testInfo.outputPath('mobile-landscape-calm-bank.png')});
});

test('mobile storm leaves bank actions usable and display settings reachable', async ({page},testInfo) => {
  await startEnvironmentGame(page);
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByTitle('Stats & Inventory')).toBeVisible();
  await expect(page.locator('canvas.weather-particles')).toHaveAttribute('data-particle-budget','120');
  expect(Number(await page.locator('canvas.weather-particles').getAttribute('data-rendered-particles'))).toBeLessThanOrEqual(170);
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
