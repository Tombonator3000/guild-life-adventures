import { expect, test } from './test';
import { openMenuPage } from './menuPages';

test('classic board visits retain original NPCs and usable work and bank actions', async ({page}, testInfo) => {
  test.setTimeout(90_000);
  const errors:string[]=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Math.random = () => .99; localStorage.setItem('guild-life-board-view', 'sidebars'); });
  await page.goto('/');
  // Finish the title's reveal before sending the five-click gesture.
  await page.locator('button[aria-hidden="true"]').evaluate(async button => {
    await Promise.all(button.parentElement!.parentElement!.getAnimations({subtree:true}).filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime as number)).map(animation => animation.finished.catch(() => {})));
  });
  for(let i=0;i<5;i++) await page.locator('button[aria-hidden="true"]').click();
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Classic Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('[data-zone-id="forge"]')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
  const visits = [
    ['Guild Hall','guild-hall','Aldric'],['Guildholm Bank','bank',''],['General Store','general-store',''],
    ['The Forge','forge','Korr'],['The Academy','academy',''],["Enchanter's Workshop",'enchanter',''],
    ['The Armory','armory',''],['The Rusty Tankard','rusty-tankard',''],['Shadow Market','shadow-market',''],['The Fence','fence',''],
  ];
  for (const [title,id,npc] of visits) {
    await page.getByTitle(title,{exact:true}).click();
    const shell=page.locator(`.location-shell[data-location="${id}"]`);
    await expect(shell).toBeVisible();
    const portrait=shell.locator('.location-scene-portrait img, .location-scene-portrait video');
    await expect(portrait).toBeVisible();
    await expect.poll(() => portrait.evaluate((media:HTMLImageElement | HTMLVideoElement) => media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth)).toBeGreaterThan(0);
    if (npc) await expect(portrait).toHaveAttribute('alt',npc);
    if (['forge','guild-hall','bank','enchanter'].includes(id)) await page.screenshot({path:testInfo.outputPath(`desktop-${id}.png`)});
  }
  await page.getByTitle('Guild Hall',{exact:true}).click();
  await page.getByRole('button',{name:'Guild Hall',exact:true}).click();
  await page.getByRole('button',{name:'Apply',exact:true}).first().click();
  await page.getByRole('button',{name:'Accept Job',exact:true}).click();
  const shift=page.locator('.location-work-button');
  await expect(shift).toBeEnabled();
  const before=await page.locator('.location-work-outcome').innerText();
  await openMenuPage(page,shift);
  await shift.click();
  await expect(page.locator('.location-work-outcome')).not.toHaveText(before);
  await page.screenshot({path:testInfo.outputPath('desktop-employed.png')});
  for (const [width,height] of [[844,390],[390,844]]) {
    await page.setViewportSize({width,height});
    await expect(shift).toBeVisible();
    await expect(page.locator('.location-scene-portrait img')).toBeVisible();
    const box=await shift.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
    await openMenuPage(page,shift);
    await shift.click();
    await page.screenshot({path:testInfo.outputPath(`mobile-employed-${width}.png`)});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.location-shell')).toHaveAttribute('data-animated','false');
  await expect(page.locator('.location-motes')).toHaveCount(0);
  await page.locator('[data-zone-id="bank"]').click();
  await openMenuPage(page,page.getByRole('button',{name:/deposit 50/i}));
  await page.getByRole('button',{name:/deposit 50/i}).click();
  await expect(page.getByRole('button',{name:/withdraw 50/i})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('mobile-bank.png')});
  expect(errors).toEqual([]);
});
