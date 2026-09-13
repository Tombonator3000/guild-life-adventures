import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { enableDeveloperMode } from './developerMode';

async function checkDialog(dialog: Locator) {
  // Measure the settled dialog, after its normal opening animation and fonts.
  await dialog.evaluate(async root => {
    await document.fonts.ready;
    await Promise.all(root.getAnimations().filter(animation =>
      Number.isFinite(animation.effect?.getComputedTiming().endTime as number),
    ).map(animation => animation.finished.catch(() => {})));
  });
  const issues = await dialog.evaluate(root => {
    const box = root.getBoundingClientRect();
    const problems: string[] = [];
    if (box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1) problems.push('dialog leaves viewport');
    for (const element of root.querySelectorAll<HTMLElement>('button, select, input')) {
      if (!element.getClientRects().length) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < box.left - 1 || rect.right > box.right + 1) problems.push(`horizontal clipping: ${element.textContent?.trim()}`);
    }
    for (const button of root.querySelectorAll<HTMLElement>('.guild-tabs button, .guild-dialog-close, .guild-dialog-footer > button, .guild-dialog-footer .guild-button')) {
      if (button.getClientRects().length && button.getBoundingClientRect().height < 43.9) problems.push(`small target: ${button.textContent?.trim()} (${button.getBoundingClientRect().height}px)`);
    }
    return problems;
  });
  expect.soft(issues).toEqual([]);
}

for (const viewport of [{width:1440,height:900},{width:1024,height:768},{width:768,height:1024},{width:390,height:844}]) {
  test.describe(`cohesive menus ${viewport.width}`, () => {
    test.use({viewport, hasTouch:true, ...(viewport.width === 768 ? {
      userAgent:'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
    } : {})});
    test('settings, manual, saves, credits, news, scores and online entry remain readable and navigable', async ({page}, info) => {
      test.setTimeout(120_000);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/');
      if (viewport.width === 768) {
        const install = page.getByRole('button',{name:'Install Guild Life',exact:true});
        await install.click();
        const guide = page.getByRole('dialog',{name:'Install on iPad / iPhone',exact:true});
        await expect(guide).toBeVisible();
        await checkDialog(guide);
        await page.screenshot({path:info.outputPath('ipad-install-guide.png')});
        await page.keyboard.press('Escape');
        await expect(install).toBeFocused();
      }
      const optionsButton = page.getByRole('button', {name:'Options',exact:true});
      await optionsButton.click();
      let dialog = page.getByRole('dialog', {name:'Options',exact:true});
      await expect(dialog).toBeVisible();
      await checkDialog(dialog);
      await expect(dialog.getByRole('switch', {name:'Weather Events',exact:true})).toBeVisible();
      await page.screenshot({path:info.outputPath('options-gameplay.png')});
      for (const tab of ['Audio','Display','Speed']) {
        await dialog.getByRole('button', {name:tab,exact:true}).click();
        await expect(dialog.getByRole('button', {name:tab,exact:true})).toHaveAttribute('aria-pressed','true');
        await checkDialog(dialog);
        await page.screenshot({path:info.outputPath(`options-${tab.toLowerCase()}.png`)});
      }
      await dialog.getByRole('button', {name:'Audio',exact:true}).click();
      await dialog.getByRole('switch',{name:'Music',exact:true}).check();
      await expect(dialog.getByRole('slider',{name:'Music volume',exact:true})).toBeVisible();
      await dialog.getByRole('button', {name:'Display',exact:true}).click();
      await dialog.getByRole('combobox', {name:'Text Size',exact:true}).selectOption('large');
      await expect(dialog).toHaveAttribute('data-text-size','large');
      await checkDialog(dialog);
      await page.screenshot({path:info.outputPath('options-display-large.png')});
      await dialog.getByRole('button', {name:"Adventurer's Manual",exact:true}).click();
      const manual = page.getByRole('dialog', {name:"Adventurer's Manual",exact:true});
      await expect(manual).toBeVisible();
      await checkDialog(manual);
      if (viewport.width >= 900) {
        await expect(manual.getByRole('navigation', {name:'Manual chapters'}).getByRole('button')).toHaveCount(16);
        await manual.getByRole('navigation', {name:'Manual chapters'}).getByRole('button', {name:'Jobs & Career',exact:true}).click();
      } else {
        await manual.getByRole('combobox',{name:'Chapter',exact:true}).selectOption('jobs');
      }
      await expect(manual.locator('article')).toContainText('work');
      await page.screenshot({path:info.outputPath('manual-jobs.png')});
      await page.keyboard.press('Escape');
      await expect(manual).toHaveCount(0);
      await expect(dialog.getByRole('button', {name:"Adventurer's Manual",exact:true})).toBeFocused();
      // Tab stays in the current menu, including after closing a nested manual.
      for (let i=0;i<18;i++) await page.keyboard.press('Tab');
      expect(await dialog.evaluate(root => root.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(optionsButton).toBeFocused();

      for (const [trigger,title,shot] of [
        ['Load Saved','Load Game','load'],["What's New","What's New",'changelog'],
        ['Hall of Fame','Hall of Fame','scores'],['About','About Guild Life','credits'],
      ]) {
        const opener = page.getByRole('button',{name:trigger,exact:true});
        await opener.click();
        dialog = page.getByRole('dialog',{name:title,exact:true});
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute('data-text-size','large');
        await checkDialog(dialog);
        await page.screenshot({path:info.outputPath(`${shot}.png`)});
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
      }
      await page.getByRole('button',{name:'Online Multiplayer',exact:true}).click();
      await page.getByRole('textbox',{name:'Your Name',exact:true}).fill('Menu Explorer');
      await page.screenshot({path:info.outputPath('online-entry.png')});
      await page.getByRole('button',{name:/^Join Room/}).click();
      await expect(page.getByRole('textbox',{name:'Room Code',exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Back',exact:true}).click();
      await expect(page.getByRole('textbox',{name:'Your Name',exact:true})).toHaveValue('Menu Explorer');
      await page.getByRole('button',{name:'Back',exact:true}).click();
      await expect(page.getByRole('button',{name:'New Adventure',exact:true})).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

async function startReviewGame(page: Page) {
  await page.addInitScript(() => {
    Math.random = () => .99;
    localStorage.setItem('guild-life-board-view','sidebars');
  });
  await page.goto('/');
  await enableDeveloperMode(page);
  await page.getByRole('button',{name:'New Adventure',exact:true}).click();
  await page.getByPlaceholder('Enter name...').fill('Menu Explorer');
  await page.getByRole('checkbox',{name:/Show Tutorial/}).uncheck();
  await page.getByRole('button',{name:'Choose Game Goals',exact:true}).click();
  await page.getByRole('button',{name:'Begin Adventure',exact:true}).click();
  await expect(page.locator('[data-zone-id="forge"]')).toBeVisible();
  if (await page.evaluate(() => !!document.fullscreenElement)) await page.keyboard.press('f');
  await page.getByRole('button',{name:/^dev$/i}).click();
}

test('all fifteen locations keep their service menus inside the original board', async ({page}, info) => {
  test.setTimeout(240_000);
  await page.setViewportSize({width:1440,height:900});
  await startReviewGame(page);
  const visits = [
    ['Noble Heights','noble-heights'],["Landlord's Office",'landlord'],['The Slums','slums'],
    ['The Fence','fence'],['General Store','general-store'],['The Graveyard','graveyard'],
    ['Shadow Market','shadow-market'],['The Rusty Tankard','rusty-tankard'],['The Armory','armory'],
    ['The Forge','forge'],['Guild Hall','guild-hall'],['The Cave','cave'],
    ['The Academy','academy'],["Enchanter's Workshop",'enchanter'],['Guildholm Bank','bank'],
  ];
  for (const [title,id] of visits) {
    await page.getByTitle(title,{exact:true}).click();
    const home = id === 'noble-heights' || id === 'slums';
    const shell = home
      ? page.getByRole('region', {name:`${title} home`,exact:true})
      : page.locator(`.location-shell[data-location="${id}"]`);
    await expect(shell).toBeVisible();
    const services = shell.locator('.location-tabs button');
    const picker = shell.locator('.location-service-picker');
    const openServices = async () => {
      if (await picker.isVisible() && await picker.getAttribute('aria-expanded') === 'false') await picker.click();
    };
    for (let i=0;i<await services.count();i++) {
      await openServices();
      await services.nth(i).click();
      await expect(services.nth(i)).toHaveAttribute('aria-pressed','true');
    }
    const bounds = await shell.evaluate(root => {
      const center = root.closest('[data-center-panel]')!.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      return {inside:box.left >= center.left-1 && box.right <= center.right+1 && box.top >= center.top-1 && box.bottom <= center.bottom+1, dialogs:root.querySelectorAll('[role="dialog"]').length};
    });
    expect(bounds.inside).toBe(true);
    expect(bounds.dialogs).toBe(0);
    if (await services.count()) {
      await openServices();
      await services.first().click();
    }
    await page.screenshot({path:info.outputPath(`location-${id}.png`)});
  }
  await page.keyboard.press('Escape');
  const menu = page.getByRole('dialog',{name:'Game Menu',exact:true});
  await expect(menu).toBeVisible();
  await checkDialog(menu);
  await page.screenshot({path:info.outputPath('game-menu.png')});
  await menu.getByRole('button',{name:'Options',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Options',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu.getByRole('button',{name:'Options',exact:true})).toBeFocused();
  await menu.getByRole('button',{name:'Resume Adventure',exact:true}).click();
  await expect(menu).toHaveCount(0);
});
