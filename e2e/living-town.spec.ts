import {expect,test} from './test';
import {enableDeveloperMode} from './developerMode';
import {openMenuPage} from './menuPages';

// This long animation journey keeps explicit screenshots and console diagnostics.
// Continuous video/trace capture can starve software rendering and stall its clock.
test.use({video:'off',trace:'off'});

test('living town: mesh birds, shared wind, successful forge work and gradual roof snow',async({page},testInfo)=>{
  test.setTimeout(300_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{Math.random=()=>.99;localStorage.setItem('guild-life-board-view','sidebars');});
  await page.setViewportSize({width:1440,height:960});
  await page.goto('/');await enableDeveloperMode(page);
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Town Smith');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Choose Game Goals',exact:true}).click();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  const gpu=page.locator('.three-weather'),world=page.locator('.board-atmosphere');
  await expect(gpu).toHaveAttribute('data-renderer','three');
  if(await page.evaluate(()=>!!document.fullscreenElement))await page.keyboard.press('f');
  await expect.poll(()=>gpu.getAttribute('data-bird-vertices')).toMatch(/\d{3}/);
  await expect.poll(async()=>Number(await gpu.getAttribute('data-effect-time')),{timeout:40000}).toBeGreaterThan(8);
  await expect(gpu).toHaveAttribute('data-birds','5');
  await page.screenshot({path:testInfo.outputPath('mesh-birds-desktop.png')});
  await page.waitForTimeout(450);
  await page.screenshot({path:testInfo.outputPath('mesh-birds-flight.png')});
  const wind=await page.evaluate(()=>({world:document.querySelector('.board-atmosphere')?.getAttribute('data-wind-x'),gpu:document.querySelector('.three-weather')?.getAttribute('data-wind-x')}));
  expect(Number(wind.world)).toBeGreaterThan(0);expect(Number(wind.gpu)).toBeCloseTo(Number(wind.world),1);
  await page.getByRole('button',{name:/^dev$/i}).click();
  await page.getByTitle('Guild Hall',{exact:true}).click();
  await openMenuPage(page,page.locator('.location-shell').getByRole('button',{name:'Forge',exact:true}));
  await page.locator('.location-shell').getByRole('button',{name:'Forge',exact:true}).click();
  await openMenuPage(page,page.getByRole('button',{name:'Apply',exact:true}).first());
  await page.getByRole('button',{name:'Apply',exact:true}).first().click();
  await page.getByRole('button',{name:'Accept Job',exact:true}).click();
  await page.getByTitle('The Forge',{exact:true}).click();
  const work=page.locator('.location-shell[data-location="forge"] .location-work-button');
  await expect(world).toHaveAttribute('data-forge-bursts','0');
  const actionTime=Number(await world.getAttribute('data-effect-time'));
  await openMenuPage(page,work);await work.click();
  await expect(world).toHaveAttribute('data-forge-bursts','1');
  await expect(world).toHaveAttribute('data-active-bursts','1');
  await expect.poll(async()=>Number(await world.getAttribute('data-effect-time'))).toBeGreaterThan(actionTime+.75);
  await page.screenshot({path:testInfo.outputPath('forge-action-sparks.png')});
  await expect(world).toHaveAttribute('data-active-bursts','0',{timeout:10000});
  await expect(world).toHaveAttribute('data-forge-bursts','1');
  await page.getByRole('button',{name:'Rain',exact:true}).click();
  await expect(world).toHaveAttribute('data-weather','harvest-rain');
  await page.screenshot({path:testInfo.outputPath('puddle-reflections.png')});
  await page.getByRole('button',{name:'Snow',exact:true}).click();
  await expect(gpu).toHaveAttribute('data-birds','0');
  await expect.poll(async()=>Number(await world.getAttribute('data-snow-cover'))).toBeLessThan(.1);
  const snowStart=await world.evaluate(c=>({time:Number(c.dataset.effectTime),cover:Number(c.dataset.snowCover)}));
  await page.screenshot({path:testInfo.outputPath('snow-start.png')});
  // The shared clock deliberately caps long frames. Verify the rate against that
  // clock, with a bounded wall-time allowance for loaded software-rendered CI hosts.
  await expect.poll(async()=>Number(await world.getAttribute('data-effect-time')),{timeout:180000}).toBeGreaterThan(snowStart.time+26);
  const snowGrown=await world.evaluate(c=>({time:Number(c.dataset.effectTime),cover:Number(c.dataset.snowCover)}));
  expect(snowGrown.cover).toBeCloseTo(Math.min(1,snowStart.cover+(snowGrown.time-snowStart.time)/42),2);
  const grown=snowGrown.cover;
  expect(grown).toBeGreaterThan(.6);
  await page.screenshot({path:testInfo.outputPath('snow-roofs-desktop.png')});
  await page.setViewportSize({width:1180,height:820});
  await expect(gpu).toHaveAttribute('data-renderer','three');
  await page.screenshot({path:testInfo.outputPath('snow-roofs-tablet.png')});
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  expect(Number(await world.getAttribute('data-snow-cover'))).toBeGreaterThan(.5);
  await expect.poll(async()=>Number(await world.getAttribute('data-snow-cover')),{timeout:45000}).toBeLessThan(grown-.08);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(gpu).toHaveCount(0);await expect(page.locator('.environment-still')).toBeVisible();
  await expect(world).toHaveAttribute('data-active-bursts','0');
  await testInfo.attach('town-checks',{body:JSON.stringify({wind,snowStart,snowGrown,snowCoverBeforeMelt:grown,forgeBursts:1,birdGeometry:'articulated XYZ mesh',viewport:[1440,960],physicalIPad:'unverified'}),contentType:'application/json'});
  expect(errors).toEqual([]);
});
