import { expect, test } from './test';
import { openMenuPage, visitLocation } from './menuPages';

test('wrapped market tabs and paged goods keep every service reachable', async ({page},testInfo)=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{ Math.random=()=>.99; localStorage.setItem('guild-life-board-view', 'sidebars'); });
  await page.goto('/');
  await page.locator('button[aria-hidden="true"]').click({clickCount:5,delay:80});
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Window Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('[data-zone-id="forge"]')).toBeVisible();
  if(await page.evaluate(()=>!!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
  await page.getByTitle('Shadow Market',{exact:true}).click();
  const shell=page.locator('.location-shell[data-location="shadow-market"]');
  for(const [width,height] of [[1280,720],[844,390],[390,844]]) {
    await page.setViewportSize({width,height});
    const picker=shell.locator('.location-service-picker');
    if (await picker.isVisible()) await picker.click();
    const tabs=shell.locator('.location-tabs');
    await expect.poll(()=>tabs.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    for(const button of await tabs.getByRole('button').all()) {
      if (await picker.isVisible() && await picker.getAttribute('aria-expanded') === 'false') await picker.click();
      await expect(button).toBeInViewport();
      await button.click();
      await expect.poll(()=>shell.locator('.location-menu').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
    }
    if (await picker.isVisible() && await picker.getAttribute('aria-expanded') === 'false') await picker.click();
    await tabs.getByRole('button',{name:'Goods',exact:true}).click();
    const nextPage = shell.getByRole('button',{name:'Next menu page',exact:true});
    if (await nextPage.isEnabled()) {
      await nextPage.click();
      await expect(shell.getByRole('status')).toContainText('Page 2');
    } else {
      await expect(shell.locator('.location-page-flow button').last()).toBeInViewport();
    }
    await page.screenshot({path:testInfo.outputPath(`shadow-market-${width}.png`)});
    await openMenuPage(page,shell.locator('.location-page-flow button').last());
  }
});

test('cave load, encounter, result, retreat and settlement remain clear inside the frame',async({page},testInfo)=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{Math.random=()=>.2;});
  await page.goto('/');
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Cave Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('guild-life-autosave'))).toBe(true);
  // A saved, educated adventurer is the fixture; entry/resolution/retreat/settlement use real controls.
  await page.evaluate(()=>{
    const save=JSON.parse(localStorage.getItem('guild-life-autosave')!);
    save.gameState.players[0].completedDegrees=['combat-training'];
    save.gameState.players[0].currentLocation='cave';
    save.gameState.players[0].timeRemaining=60;
    save.gameState.players[0].health=90;
    save.gameState.selectedLocation='cave';
    localStorage.setItem('guild-life-autosave',JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button',{name:/Continue Game/i}).click();
  await visitLocation(page, 'cave');
  const entry=page.getByRole('button',{name:/Enter Floor 1/});
  await openMenuPage(page,entry); await entry.click();
  const intro=page.getByRole('region',{name:'Current encounter'});
  await expect(intro).toBeVisible();
  const action=page.getByRole('group',{name:'Encounter choices'}).getByRole('button').first();
  await expect(action).toBeInViewport();
  await page.screenshot({path:testInfo.outputPath('cave-encounter.png')});
  if(await page.evaluate(()=>!!document.fullscreenElement)) await page.keyboard.press('f');
  for(const [width,height] of [[844,390],[390,844],[1280,720]]) {
    await page.setViewportSize({width,height});
    await expect(action).toBeInViewport();
    await expect(page.getByTitle('Click to dismiss',{exact:true})).not.toBeVisible();
    await expect(intro.getByText('Giant Rats',{exact:true}).filter({visible:true}).first()).toBeInViewport();
    await page.screenshot({path:testInfo.outputPath(`cave-encounter-${width}.png`)});
  }
  await action.click();
  const outcome=page.getByRole('region',{name:'Encounter outcome'});
  await expect(outcome).toContainText('resolved');
  await expect(outcome).toContainText('Run loot:');
  await page.screenshot({path:testInfo.outputPath('cave-outcome.png')});
  const retreat=page.getByRole('button',{name:/Retreat · keep/});
  for (const [width,height] of [[844,390],[390,844],[1280,720]]) {
    await page.setViewportSize({width,height});
    await expect(retreat).toBeInViewport();
    await expect(page.getByRole('button',{name:/Continue Deeper/})).toBeInViewport();
    if(width === 844) await expect(outcome.locator('.cave-compact-outcome')).toBeInViewport();
    await page.screenshot({path:testInfo.outputPath(`cave-outcome-${width}.png`)});
  }
  await retreat.click();
  const finish=page.getByRole('button',{name:'Return to Dungeon',exact:true});
  await openMenuPage(page,finish); await finish.click();
  await expect(page.getByRole('heading',{name:/Retreated/})).toBeVisible();
  const dismiss=page.getByRole('button',{name:'Continue',exact:true});
  await openMenuPage(page,dismiss); await dismiss.click();
  await page.getByRole('button',{name:'Run records',exact:true}).click();
  const records=page.locator('.cave-lobby').getByRole('button',{name:/Dungeon Floors/i});
  await openMenuPage(page,records); await records.click();
  await expect(page.getByTitle('Total runs',{exact:true})).toContainText('1x');
  await page.screenshot({path:testInfo.outputPath('cave-records.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.location-shell')).toHaveAttribute('data-animated','false');
});

test('a deployed update appears on focus, saves the current game and reloads on click',async({page},testInfo)=>{
  let deployed=false;
  await page.route('**/version.json?*',route=>route.fulfill({json:deployed?{buildTime:'2030-01-01T00:00:00.000Z'}:{}}));
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Update Now',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Update Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('[data-zone-id="forge"]')).toBeVisible();
  deployed=true;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  const update=page.getByRole('button',{name:'Update Now',exact:true});
  await expect(update).toBeVisible();
  await expect.poll(()=>update.evaluate(el=>getComputedStyle(el.closest('[role="status"]')!).opacity)).toBe('1');
  await page.screenshot({path:testInfo.outputPath('update-available.png')});
  const navigation=page.waitForURL(url=>url.searchParams.has('_gv'),{waitUntil:'commit'});
  await update.click(); await navigation;
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('guild-life-autosave') || '{}').playerNames)).toEqual(['Update Hero']);
});
