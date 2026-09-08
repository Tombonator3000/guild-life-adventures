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

// Native lists can bring a control into view without changing its service state.
export async function openMenuPage(page: Page, control: Locator) {
  await expect(control).toBeAttached();
  await control.scrollIntoViewIfNeeded();
}
