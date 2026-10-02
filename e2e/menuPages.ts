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
      if (hit === el || (hit && el.contains(hit) && !hit.closest('[role="button"], button'))) return { x, y };
      }
    }
    return null;
  });
  expect(point, `Building ${location} needs a tap target beside its token`).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
}

// A location is a button; its player tokens sit beside it in the same wrapper (no nested buttons).
export function locationArea(page: Page, location: string) {
  return page.locator('.location-zone-wrap').filter({ has: page.locator(`[data-zone-id="${location}"]`) });
}

// Phones play sideways: a portrait phone shows the rotate notice instead of the board.
export const isPortraitPhone = (size: { width: number; height: number }) => size.width <= 600 && size.height > size.width;

export async function expectRotateNotice(page: Page) {
  await expect(page.getByText('Rotate your phone', { exact: true })).toBeVisible();
  await expect(page.locator('.mobile-map-region')).toBeHidden();
}

// Turn a portrait phone sideways mid-game, as a player would. No-op for other sizes.
export async function rotatePhoneToLandscape(page: Page) {
  const size = page.viewportSize();
  if (!size || !isPortraitPhone(size)) return;
  await expectRotateNotice(page);
  // The browser cannot resize a fullscreen window.
  await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.setViewportSize({ width: size.height, height: size.width });
  await expect(page.getByText('Rotate your phone', { exact: true })).toBeHidden();
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
