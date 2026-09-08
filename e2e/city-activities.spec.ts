import { visitLocation } from './menuPages';
import { expect, test } from './test';
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]) {
  test(`seasonal choices use real terms at ${viewport.width}`,async({page},info)=>{
    await page.setViewportSize(viewport);
    await page.addInitScript(()=>{Math.random=()=>.99;});
    await page.goto('/');
    await page.getByRole('button',{name:'New Adventure',exact:true}).click();
    await page.getByPlaceholder('Enter name...').fill('City Visitor');
    await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
    await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('guild-life-autosave'))).toBe(true);
    await page.evaluate(()=>{
      const save=JSON.parse(localStorage.getItem('guild-life-autosave')!);
      Object.assign(save.gameState.players[0],{currentLocation:'general-store',gold:500,timeRemaining:60,foodLevel:99,happiness:99});
      Object.assign(save.gameState,{activeFestival:'harvest-festival',selectedLocation:'general-store',phase:'playing',eventMessage:null});
      localStorage.setItem('guild-life-autosave',JSON.stringify(save));
    });
    await page.reload();
    await page.getByRole('button',{name:/Continue Game/}).click();
    if(await page.evaluate(()=>!!document.fullscreenElement)) await page.keyboard.press('f');
    await visitLocation(page, 'general-store');
    const shell=page.locator('.location-shell[data-location="general-store"]');
    const picker=shell.locator('.location-service-picker');
    if(await picker.isVisible()) await picker.click();
    await shell.getByRole('button',{name:'This Week',exact:true}).click();
    await page.getByLabel('City activity',{exact:true}).selectOption('harvest-feast');
    const join=page.getByRole('button',{name:'Join activity · 4h'});
    await expect(join).toBeInViewport();
    await expect(page.getByRole('region',{name:'City activities'})).toContainText('488g cash after · +1 happiness · +1 food');
    await page.screenshot({path:info.outputPath('city-activity-preview.png')});
    await join.click();
    await expect(join).toBeDisabled();
    await expect(page.getByRole('region',{name:'City activities'})).toContainText('Completed: Join the harvest table');
    await page.screenshot({path:info.outputPath('city-activity-complete.png')});
  });
}
