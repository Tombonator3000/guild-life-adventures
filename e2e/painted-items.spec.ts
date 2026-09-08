import { expect,test } from './test';
import { openMenuPage } from './menuPages';
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:720}]) {
 test(`painted equipment keeps its identity from shop to inventory at ${viewport.width}`,async({page},info)=>{
  await page.setViewportSize(viewport);
  await page.addInitScript(()=>{Math.random=()=>.99;});
  await page.goto('/');
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Equipment Buyer');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  if(await page.evaluate(()=>!!document.fullscreenElement))await page.keyboard.press('f');
  await page.locator('[data-zone-id="armory"]').click();
  const shell=page.locator('.location-shell[data-location="armory"]'),picker=shell.locator('.location-service-picker');
  await expect(shell).toBeVisible();
  if(await picker.isVisible())await picker.click();
  await shell.getByRole('button',{name:'Weapons',exact:true}).click();
  const dagger=shell.getByRole('button',{name:/^Buy Simple Dagger/});
  await openMenuPage(page,dagger);
  await expect(dagger).toBeEnabled();
  await expect(shell).toContainText('Purchases equip immediately.');
  const art=dagger.locator('..').locator('[data-item-art="dagger"]');
  const original=await art.evaluate(e=>getComputedStyle(e).backgroundImage);
  await expect(art).toBeInViewport();
  await page.screenshot({path:info.outputPath('painted-shop.png')});
  await dagger.click();
  if(viewport.width<1024)await page.getByTitle('Stats & Inventory').click();
  await page.locator('.guild-sidebar').getByRole('button',{name:/^inventory$/i}).click();
  const owned=page.locator('.guild-sidebar [data-item-art="dagger"]').first();
  await expect(owned).toBeInViewport({ratio:1});
  expect(await owned.evaluate(e=>getComputedStyle(e).backgroundImage)).toBe(original);
  await page.screenshot({path:info.outputPath('painted-inventory.png')});
 });
}
