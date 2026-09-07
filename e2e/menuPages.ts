import { expect, type Locator, type Page } from '@playwright/test';

export async function openMenuPage(page: Page, control: Locator) {
  const previous=page.getByRole('button',{name:'Previous menu page',exact:true});
  if (!(await previous.count())) return;
  while (await previous.isEnabled()) await previous.click();
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
  }
  throw new Error('Control did not fit any menu page');
}
