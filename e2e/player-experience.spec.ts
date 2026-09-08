import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { openMenuPage } from './menuPages';

// Mature saved games provide fixtures; purchases, reading and paging use real UI controls.
async function loadFixture(page: Page, location: string, housing = 'slums', furnished = true, hours = 20) {
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('guild-life-autosave'))).toBe(true);
  await page.evaluate(({ location, housing, furnished, hours }) => {
    const save = JSON.parse(localStorage.getItem('guild-life-autosave')!);
    const state = save.gameState;
    Object.assign(state, { week: 3, phase: 'playing', selectedLocation: location, priceModifier: 1 });
    Object.assign(state.players[0], {
      currentLocation: location, housing, gold: 3500, timeRemaining: hours,
      rentPrepaidWeeks: 0, weeksSinceRent: 0, hasNewspaper: true,
      equippedWeapon: null, equippedArmor: null, equippedShield: null,
      weeklySnapshots: [{ week: 3, openingGold: 200, dividendsPaid: 10, otherGoldChange: -18, gold: 192, health: 100, happiness: 50, education: 0, dependability: 50, totalWealth: 192 }],
      lastTurnSummary: { week: 2, entries: ['Graduated: Commerce Degree', 'Worked 6h at the Forge'] },
      durables: furnished ? Object.fromEntries(['candles', 'blanket', 'furniture', 'glow-orb', 'warmth-stone', 'encyclopedia', 'dictionary', 'atlas'].map(id => [id, 1])) : {},
      appliances: furnished ? Object.fromEntries(['scrying-mirror', 'simple-scrying-glass', 'memory-crystal', 'music-box', 'cooking-fire', 'preservation-box', 'arcane-tome', 'frost-chest'].map(id => [id, { isBroken: id === 'music-box', itemId: id, originalPrice: 100, purchasedFirstTime: true, source: 'enchanter' }])) : {},
    });
    localStorage.setItem('guild-life-autosave', JSON.stringify(save));
  }, { location, housing, furnished, hours });
  await page.reload();
  await page.getByRole('button', { name: /Continue Game/i }).click();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await page.locator(`[data-zone-id="${location}"]`).click();
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
  test(`homes, free errands and the Herald remain usable at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    await page.addInitScript(() => { Math.random = () => .99; });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'New Adventure', exact: true }).click();
    await page.getByPlaceholder('Enter name...').fill('City Reader');
    await page.getByRole('checkbox', { name: /Show Tutorial/ }).uncheck();
    await page.getByRole('button', { name: 'Begin Adventure', exact: true }).click();

    for (const [location, housing, furnished] of [['slums', 'slums', false], ['slums', 'slums', true], ['noble-heights', 'noble', true]] as const) {
      await loadFixture(page, location, housing, furnished);
      const room = page.locator('.home-room');
      await expect(room).toBeVisible();
      await expect(room.locator('[data-item]')).toHaveCount(furnished ? 16 : 0);
      await expect(page.getByRole('button', { name: 'End Turn', exact: true })).toHaveCount(1);
      await expect(page.getByRole('button', { name: 'End Turn', exact: true })).toBeInViewport();
      await expect(page.getByRole('button', { name: /Sleep \(8h\)/ })).toBeInViewport();
      // Wait for raster content before capturing the rendered scene.
      await room.locator('image').evaluateAll(async elements => {
        await Promise.all(elements.map(element => new Promise<void>((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(new Error('Room asset failed'));
          image.src = element.getAttribute('href')!;
        })));
      });
      await page.screenshot({ path: info.outputPath(`${housing}-${furnished ? 'furnished' : 'empty'}.png`) });
      if (furnished) {
        await room.getByRole('button', { name: 'Tome of All Knowledge', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(room.getByRole('status')).toContainText('Tome of All Knowledge');
        await room.getByRole('button', { name: 'Enchanted Music Box — broken', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(room.getByRole('status')).toContainText('Repair at the Enchanter');
      }
    }

    await loadFixture(page, 'landlord', 'slums', true, 0);
    const rent = page.getByRole('button', { name: /Pay Rent · 1 week/ });
    await openMenuPage(page, rent);
    await expect(rent).toBeEnabled();
    await expect(page.getByRole('button', { name: /Pay Rent.*8 week/ })).toHaveCount(0);
    await rent.click();
    await expect(page.locator('.center-turn-toolbar')).toContainText('0h left');
    const move = page.getByRole('button', { name: /^Move In/ });
    await openMenuPage(page, move);
    await expect(move).toBeEnabled();
    await move.click();
    await expect(page.locator('.center-turn-toolbar')).toContainText('0h left');

    await loadFixture(page, 'armory');
    const shell = page.locator('.location-shell[data-location="armory"]');
    const picker = shell.locator('.location-service-picker');
    if (await picker.isVisible()) await picker.click();
    await shell.getByRole('button', { name: 'Weapons', exact: true }).click();
    const buy = shell.getByRole('button', { name: /^Buy Simple Dagger/ });
    await openMenuPage(page, buy);
    await buy.click();
    await expect(shell.getByRole('button', { name: 'Unequip Simple Dagger', exact: true })).toBeInViewport();
    await expect(page.locator('.center-turn-toolbar')).toContainText('20h left');
    await page.screenshot({ path: info.outputPath('armory-equipped.png') });

    await loadFixture(page, 'bank');
    await page.getByRole('button', { name: 'The Broker', exact: true }).click();
    const statement = page.getByRole('button', { name: 'View last dividend settlement' });
    await expect(statement).toBeInViewport();
    await expect(page.getByRole('button', { name: /^Sell All/ })).toBeInViewport();
    await statement.click();
    const receipt = page.getByRole('dialog', { name: 'Week 3 dividend settlement' });
    await expect(receipt).toContainText('192g');
    await expect.poll(() => receipt.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await expect(receipt.getByRole('button', { name: 'Close', exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath('dividend-receipt.png') });
    await receipt.getByRole('button', { name: 'Close', exact: true }).click();

    await loadFixture(page, 'general-store');
    const read = page.getByRole('button', { name: /Read The Guildholm Herald/ });
    await openMenuPage(page, read); await read.click();
    const paper = page.getByRole('dialog', { name: 'The Guildholm Herald' });
    await expect(paper).toContainText('Graduated: Commerce Degree');
    await expect(paper.getByRole('button', { name: 'Close newspaper' })).toBeInViewport();
    await page.screenshot({ path: info.outputPath('herald-front.png') });
    const next = paper.getByRole('button', { name: 'Next menu page' });
    for (let i = 0; i < 30 && await next.isEnabled(); i++) {
      await expect(next).toBeInViewport();
      await next.click();
    }
    await expect(next).toBeDisabled();
    await expect(paper.locator('.herald-story').last()).toBeInViewport();
    await page.screenshot({ path: info.outputPath('herald-last.png') });
    await paper.getByRole('button', { name: 'Close newspaper' }).click();
    await expect(paper).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
