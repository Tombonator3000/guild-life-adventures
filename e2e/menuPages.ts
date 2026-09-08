import { expect, type Locator, type Page } from '@playwright/test';

// Tap the building itself. Its player token is a separate character control.
export async function visitLocation(page: Page, location: string) {
  const zone = page.locator(`[data-zone-id="${location}"]`);
  await expect(zone).toBeVisible();
  const point = await zone.evaluate(el => {
    const r = el.getBoundingClientRect();
    for (const fy of [.95, .05, .5, .25, .75]) {
      for (const fx of [.05, .95, .5, .25, .75]) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        const hit = document.elementFromPoint(x, y);
        if (hit && el.contains(hit) && !hit.closest('[role="button"], button')) return { x, y };
      }
    }
    return null;
  });
  expect(point, `Building ${location} needs a tap target beside its token`).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

// Short boards collapse service tabs behind this picker in either display mode.
export async function selectLocationService(page: Page, name: string) {
  const shell = page.locator('.location-shell');
  const service = shell.getByRole('button', { name, exact: true, includeHidden: true });
  // Travel may still be animating; wait for the destination's actual service.
  await expect(service).toBeAttached();
  const picker = shell.locator('.location-service-picker');
  if (await picker.isVisible() && await picker.getAttribute('aria-expanded') === 'false') await picker.click();
  await service.click();
}

async function settlePages(page: Page) {
  await page.locator('.location-page-flow').evaluateAll(async elements => {
    await Promise.allSettled(elements.flatMap(el => el.getAnimations().map(animation => animation.finished)));
  });
}

export async function openMenuPage(page: Page, control: Locator) {
  const previous=page.getByRole('button',{name:'Previous menu page',exact:true});
  if (!(await previous.count())) return;
  while (await previous.isEnabled()) { await previous.click(); await settlePages(page); }
  await settlePages(page);
  for (let i=0;i<40;i++) {
    const fits=await control.evaluate(el=>{
      const box=el.closest('.location-pages')?.querySelector('.location-page-viewport');
      if (!box) return true;
      const r=el.getBoundingClientRect(),b=box.getBoundingClientRect();
      return r.left>=b.left-1 && r.right<=b.right+1 && r.top>=b.top-1 && r.bottom<=b.bottom+1;
    });
    if (fits) return;
    const next=page.getByRole('button',{name:'Next menu page',exact:true});
    await expect(next).toBeEnabled();
    await next.click();
    await settlePages(page);
  }
  throw new Error('Control did not fit any menu page');
}
