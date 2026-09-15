import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.GUILD_3D_BASE_URL || 'http://127.0.0.1:4173/board-3d';
const evidenceDir = new URL('../evidence/blender-mcp-3d-board/', import.meta.url).pathname;
await mkdir(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.locator('.board3d-page').waitFor({ state: 'visible', timeout: 15000 });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${evidenceDir}runtime-initial.png` });

const canvasCount = await page.locator('canvas').count();
const initialStatus = await page.locator('.board3d-status').first().innerText();
const backgroundIds = [
  'noble-heights', 'graveyard', 'general-store', 'bank', 'forge', 'guild-hall', 'cave', 'academy',
  'enchanter', 'armory', 'rusty-tankard', 'shadow-market', 'fence', 'slums', 'landlord',
];
const backgroundAssets = await Promise.all(backgroundIds.map(async (id) => {
  const response = await page.request.get(new URL(`/board3d/backgrounds/${id}.jpg`, baseUrl).href);
  return { id, status: response.status(), contentType: response.headers()['content-type'] || '' };
}));

// The Enchanter tower is a stable, visible landmark in the gameplay camera.
// This is a real pointer click against the rendered canvas, not DOM state setup.
await page.mouse.click(710, 535);
const selectionToast = await page.locator('.board3d-toast').innerText();
const selectionInspector = await page.locator('.board3d-inspector').innerText();

await page.getByRole('button', { name: /Reis til Enchanter/ }).click();
await page.waitForTimeout(1900);
const arrivalInspector = await page.locator('.board3d-inspector').innerText();
const arrivalStatus = await page.locator('.board3d-status').first().innerText();
await page.getByRole('button', { name: /Lad magien/ }).click();
await page.waitForTimeout(100);
const actionToast = await page.locator('.board3d-toast').innerText();
await page.screenshot({ path: `${evidenceDir}runtime-playtest-enchanter.png` });

await page.getByRole('button', { name: /Avslutt tur/ }).click();
await page.waitForTimeout(100);
const nextWeekStatus = await page.locator('.board3d-status').first().innerText();

await page.setViewportSize({ width: 844, height: 390 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const mobileLayout = await page.evaluate(() => ({
  width: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  canvasWidth: document.querySelector('canvas')?.clientWidth ?? 0,
}));
await page.screenshot({ path: `${evidenceDir}runtime-mobile.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const portraitLayout = await page.evaluate(() => ({
  width: window.innerWidth,
  height: window.innerHeight,
  scrollWidth: document.documentElement.scrollWidth,
  hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  canvasWidth: document.querySelector('canvas')?.clientWidth ?? 0,
}));
await page.screenshot({ path: `${evidenceDir}runtime-portrait.png` });

const result = {
  baseUrl,
  initialStatus,
  canvasCount,
  backgroundAssets,
  selectionToast,
  selectionInspector,
  arrivalInspector,
  arrivalStatus,
  actionToast,
  nextWeekStatus,
  mobileLayout,
  portraitLayout,
  consoleErrors,
  pageErrors,
};
await writeFile(`${evidenceDir}browser-results.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await browser.close();
