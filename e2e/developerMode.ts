import type { Page } from '@playwright/test';

/** Use the normal five-click gesture after the small title target stops moving. */
export async function enableDeveloperMode(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const trigger = page.locator('button[aria-hidden="true"]');
  await trigger.evaluate(async button => {
    const animations = button.parentElement!.parentElement!.getAnimations({ subtree: true });
    await Promise.all(animations
      .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime as number))
      .map(animation => animation.finished.catch(() => {})));
  });
  for (let i = 0; i < 5; i++) await trigger.click();
}
