import { expect, test } from './test';

test('forge work, tactile menus, weather pixels and storm audio stay inside the classic board', async ({page},testInfo) => {
  test.setTimeout(90_000);
  const errors:string[]=[];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    Math.random=()=>.99;
    const original=HTMLMediaElement.prototype.play;
    const played:string[]=[];
    Object.defineProperty(window,'playedMedia',{value:played});
    HTMLMediaElement.prototype.play=function() { played.push(this.src); return original.call(this); };
  });
  await page.goto('/');
  await page.locator('button[aria-hidden="true"]').click({clickCount:5,delay:80});
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Forge Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('[data-zone-id="forge"]')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
  await page.getByTitle('Guild Hall',{exact:true}).click();
  await page.getByRole('button',{name:'Forge',exact:true}).click();
  await page.getByRole('button',{name:'Apply',exact:true}).first().click();
  await page.getByRole('button',{name:'Accept Job',exact:true}).click();
  await page.getByTitle('The Forge',{exact:true}).click();
  const shell=page.locator('.location-shell[data-location="forge"]');
  await expect(shell.getByRole('button',{name:'Work',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(shell.getByText('Your job:',{exact:false})).toContainText('Forge Laborer');
  await expect(shell.getByRole('button',{name:/Ask for a raise/})).toBeDisabled();
  await expect(shell.getByText(/Work 3 shifts first/)).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('forge-work-desktop.png')});
  for(let i=0;i<3;i++) await shell.locator('.location-work-button').click();
  await expect(shell.getByRole('button',{name:/Ask for a raise/})).toBeEnabled();
  await shell.getByRole('button',{name:/Ask for a raise/}).click();
  await expect(shell.getByRole('button',{name:/Ask for a raise/})).toBeDisabled();
  await shell.getByText('View career path',{exact:true}).click();
  await expect(shell.getByText('Apprentice Smith',{exact:true})).toBeVisible();
  await shell.getByRole('button',{name:'Smithing',exact:true}).click();
  await expect(shell.getByText('Make good steel exceptional')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('forge-smithing-desktop.png')});
  await shell.getByRole('button',{name:'Work',exact:true}).click();
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  const weather=page.locator('.weather-overlay');
  await expect(weather).toHaveAttribute('data-weather','thunderstorm');
  await expect.poll(() => weather.locator('canvas').evaluate((c:HTMLCanvasElement) => {
    const data=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
    return data.some((v,i) => i%4===3 && v>0);
  })).toBe(true);
  await expect(weather.locator('.weather-lightning')).toBeVisible({timeout:7000});
  await page.screenshot({path:testInfo.outputPath('storm-desktop.png')});
  await expect.poll(() => page.evaluate(() => (window as unknown as {playedMedia:string[]}).playedMedia.some(src => src.includes('weather-thunder.mp3'))),{timeout:4000}).toBe(true);
  for (const [label,type] of [['Snow','snowstorm'],['Fog','enchanted-fog'],['Rain','harvest-rain']]) {
    await page.getByRole('button',{name:label,exact:true}).click();
    await expect(weather).toHaveAttribute('data-weather',type);
    await expect(weather.locator('.weather-lightning')).toHaveCount(0);
    if (type==='enchanted-fog') await page.screenshot({path:testInfo.outputPath('fog-desktop.png')});
  }
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  for(const [width,height] of [[844,390],[390,844]]) {
    await page.setViewportSize({width,height});
    await shell.locator('.location-work-button').scrollIntoViewIfNeeded();
    await expect(shell.locator('.location-work-button')).toBeInViewport();
    await shell.locator('.location-work-button').click();
    await page.screenshot({path:testInfo.outputPath(`forge-work-${width}.png`)});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(shell).toHaveAttribute('data-animated','false');
  expect(errors).toEqual([]);
});
