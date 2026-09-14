import {expect,test} from './test';
import {enableDeveloperMode} from './developerMode';

test('Three weather preserves the board, panel controls and Canvas fallback',async({page},testInfo)=>{
  test.setTimeout(120_000);
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error' && /THREE|shader|WebGL/i.test(m.text())) errors.push(m.text());});
  await page.addInitScript(()=>{Math.random=()=>.99;localStorage.setItem('guild-life-board-view','sidebars');});
  await page.setViewportSize({width:1440,height:960});
  await page.goto('/');
  await enableDeveloperMode(page);
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Weather Tester');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Choose Game Goals',exact:true}).click();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('[data-zone-id="forge"]')).toBeVisible();
  if(await page.evaluate(()=>!!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
  const canvas=page.locator('.three-weather');
  await expect(canvas).toHaveAttribute('data-renderer','three');
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather-renderer','three');
  // Retain a reference: changing weather must reuse this renderer and its context.
  await canvas.evaluate(c=>{Object.defineProperty(window,'weatherCanvas',{value:c,configurable:true});});
  await page.screenshot({path:testInfo.outputPath('clear-desktop.png')});
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-weather','thunderstorm');
  await expect(canvas).toHaveAttribute('data-strike',/\d+/,{timeout:8000});
  await page.screenshot({path:testInfo.outputPath('lightning-desktop.png')});
  await expect(canvas).toHaveAttribute('data-strike','none');
  await page.screenshot({path:testInfo.outputPath('rain-desktop.png')});
  await page.waitForTimeout(600);
  await page.screenshot({path:testInfo.outputPath('rain-motion-desktop.png')});
  expect(await canvas.evaluate(c=>c===(window as unknown as {weatherCanvas:HTMLCanvasElement}).weatherCanvas)).toBe(true);
  // Read in the same RAF as a paint; production does not preserve/read back the GPU buffer.
  const pixels=await canvas.evaluate(async (c:HTMLCanvasElement)=>{
    let previous=c.dataset.effectTime;
    return await new Promise<{painted:number;panelAlpha:number;calls:number}>(resolve=>{
      const sample=()=>{
        if(c.dataset.effectTime===previous) {requestAnimationFrame(sample);return;}
        previous=c.dataset.effectTime;
        const gl=c.getContext('webgl2')!;
        const data=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
        let painted=0;for(let i=3;i<data.length;i+=4) if(data[i]>0) painted++;
        const root=c.getBoundingClientRect(), panel=document.querySelector('.game-board-center-panel, [data-fx-protect*="23"]')?.getBoundingClientRect();
        const protectedPanel=panel??Array.from(document.querySelectorAll('[data-fx-protect]')).map(e=>e.getBoundingClientRect()).sort((a,b)=>b.width*b.height-a.width*a.height)[0];
        const x=Math.floor((protectedPanel.left+protectedPanel.width/2-root.left)/root.width*c.width);
        const y=c.height-1-Math.floor((protectedPanel.top+protectedPanel.height/2-root.top)/root.height*c.height);
        resolve({painted,panelAlpha:data[(y*c.width+x)*4+3],calls:Number(c.dataset.drawCalls)});
      };requestAnimationFrame(sample);
    });
  });
  expect(pixels.painted).toBeGreaterThan(1000);expect(pixels.panelAlpha).toBe(0);expect(pixels.calls).toBeLessThanOrEqual(5);
  await testInfo.attach('gpu-pixels',{body:JSON.stringify(pixels),contentType:'application/json'});
  const timing=await page.evaluate(()=>new Promise(resolve=>{
    const frames:number[]=[];let start=0,last=0;
    const frame=(now:number)=>{if(!start) start=now;if(last) frames.push(now-last);last=now;
      if(now-start<8000) {requestAnimationFrame(frame);return;}
      frames.sort((a,b)=>a-b);resolve({renderer:'headless Chromium / SwiftShader',viewport:[innerWidth,innerHeight],samples:frames.length,
        averageFps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)]});
    };requestAnimationFrame(frame);
  }));
  await testInfo.attach('cloud-runtime-timing',{body:JSON.stringify(timing),contentType:'application/json'});
  await page.keyboard.press('b');
  await page.screenshot({path:testInfo.outputPath('storm-immersive.png')});
  await page.keyboard.press('b');
  await page.getByRole('button',{name:/^dev$/i}).click();
  await page.getByRole('button',{name:'Rain',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-strike','none');
  for(const [width,height] of [[1180,820],[820,1180]]) {
    await page.setViewportSize({width,height});
    await expect(canvas).toHaveAttribute('data-renderer','three');
    if(width<1024) await expect(page.locator('.mobile-board-layout')).toBeVisible();
    await expect.poll(()=>canvas.evaluate((c:HTMLCanvasElement)=>c.getContext('webgl2')!.isContextLost())).toBe(false);
    await page.waitForTimeout(500);
    await page.screenshot({path:testInfo.outputPath(`rain-tablet-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:/^dev$/i}).click();
  await expect(page.locator('.mobile-board-layout')).toHaveCount(0);
  await page.getByRole('button',{name:'Snow',exact:true}).click();
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather','snowstorm');
  await expect(page.locator('.screen-event-fx')).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(canvas).toHaveCount(0);
  await expect(page.locator('.environment-still')).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(canvas).toHaveAttribute('data-renderer','three');
  await page.getByRole('button',{name:'Storm',exact:true}).click();
  await canvas.evaluate((c:HTMLCanvasElement)=>c.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext());
  await expect(canvas).toHaveAttribute('data-renderer','fallback');
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather-renderer','canvas');
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather','thunderstorm');
  await page.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(page.locator('.board-atmosphere')).toHaveAttribute('data-weather','clear');
  expect(errors).toEqual([]);
});
