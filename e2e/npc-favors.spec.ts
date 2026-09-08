import { visitLocation } from './menuPages';
import { expect,test } from './test';
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]) {
 test(`a remembered branch unlocks one favor at ${viewport.width}`,async({page},info)=>{
  await page.setViewportSize(viewport);
  await page.addInitScript(()=>{Math.random=()=>.99;});
  await page.goto('/');
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Remembered Hero');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!!localStorage.getItem('guild-life-autosave'))).toBe(true);
  await page.evaluate(()=>{
   const save=JSON.parse(localStorage.getItem('guild-life-autosave')!);
   Object.assign(save.gameState.players[0],{currentLocation:'guild-hall',questChoices:{'tg-1-investigate':'tg-1-report'}});
   Object.assign(save.gameState,{selectedLocation:'guild-hall',phase:'playing',eventMessage:null});
   localStorage.setItem('guild-life-autosave',JSON.stringify(save));
  });
  await page.reload();await page.getByRole('button',{name:/Continue Game/}).click();
  if(await page.evaluate(()=>!!document.fullscreenElement))await page.keyboard.press('f');
  await visitLocation(page, 'guild-hall');
  const shell=page.locator('.location-shell[data-location="guild-hall"]'),picker=shell.locator('.location-service-picker');
  if(await picker.isVisible())await picker.click();
  await shell.getByRole('button',{name:'Your contact',exact:true}).click();
  const panel=page.getByRole('region',{name:'Personal favors'}),accept=panel.getByRole('button',{name:'Accept favor · 4h'});
  await expect(panel).toContainText('You brought the evidence to the guard');
  await expect(accept).toBeInViewport();
  await page.screenshot({path:info.outputPath('npc-memory-offer.png')});
  await accept.click();await expect(accept).toBeDisabled();
  await expect(panel).toContainText('Completed: Escort the guard’s courier');
  await page.screenshot({path:info.outputPath('npc-memory-complete.png')});
 });
}
