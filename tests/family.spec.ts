import { test, expect, type Page } from '@playwright/test';
import { canvas, press, watchErrors } from './helpers/play';

let check: () => void;
test.beforeEach(({ page }) => { check = watchErrors(page); });
test.afterEach(() => check());

async function hub(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => window.__ringstorp);
  await page.evaluate(() => window.__ringstorp.ready);
  await expect(page.getByRole('heading', { name: 'Vad vill du spela?' })).toBeAttached();
}

test('the Swedish chooser groups the existing three levels and returns from every section', async ({ page }) => {
  await hub(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'sv');
  await expect(page.getByRole('heading', { name: 'Ringstorp Run' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Carl-Ottos spel' })).toBeAttached();
  await canvas(page).screenshot({ path: 'test-results/family-chooser.png' });
  await press(page, 'choose-ringstorp');
  await expect(page.locator('#a11y-panel-title')).toHaveText('RINGSTORP RUN');
  for (const [action, title] of [['start-2', 'D.D RINGER'], ['start-3', 'KAPELLJOBBET']]) {
    await press(page, action); await expect(page.locator('#a11y-panel-title')).toHaveText(title); await press(page, 'back');
  }
  await press(page, 'start');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.sim.mode)).toBe('playing');
  await press(page, 'chooser');
  await expect(page.getByRole('heading', { name: 'Vad vill du spela?' })).toBeAttached();
  await press(page, 'choose-carl');
  await canvas(page).screenshot({ path: 'test-results/carl-games.png' });
  await press(page, 'all-games'); await press(page, 'choose-ringstorp');
  await expect(page.locator('#a11y-panel-title')).toHaveText('RINGSTORP RUN');
});

test('the bike ride steers, pauses, loses hearts, retries and arrives at the red preschool', async ({ page }) => {
  await hub(page); await press(page, 'choose-carl'); await press(page, 'start-bike');
  await expect(page.locator('#bike-panel-title')).toHaveText('Till förskolan');
  await press(page, 'ride-primary');
  const startX = await page.evaluate(() => window.__ringstorp.bike().x);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(220); await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__ringstorp.bike().x)).toBeGreaterThan(startX + 5);
  await page.keyboard.press('Escape');
  await expect(page.locator('#bike-panel-title')).toHaveText('En liten paus');
  const distance = await page.evaluate(() => window.__ringstorp.bike().distance);
  await page.waitForTimeout(160); expect(await page.evaluate(() => window.__ringstorp.bike().distance)).toBe(distance);
  await press(page, 'ride-primary');
  await page.evaluate(() => {
    const g = window.__ringstorp.bike();
    g.distance = 950;
    g.apples = [{ id: 9, x: 420, y: 448, height: 190, speed: 100, warning: 0, landed: 0, checked: false }];
    window.__ringstorp.step();
  });
  await canvas(page).screenshot({ path: 'test-results/carl-bike-ride.png' });
  await page.evaluate(() => {
    const g = window.__ringstorp.bike();
    g.hearts = 1; g.invulnerable = 0;
    g.apples = [{ id: 10, x: g.x, y: g.y, height: 80, speed: 300, warning: 0, landed: 0, checked: false }];
    window.__ringstorp.step(1 / 60, 3);
  });
  await expect(page.locator('#bike-panel-title')).toHaveText('Hoppsan, ett äpple!');
  await press(page, 'ride-primary');
  expect(await page.evaluate(() => window.__ringstorp.bike().hearts)).toBe(3);
  // The ride's length comes from its ride file, which only the game (through Vite) can load.
  await page.evaluate(() => {
    const g = window.__ringstorp.bike(); g.distance = g.def.length - 3; g.apples = [];
    window.__ringstorp.step(1 / 60, 5);
  });
  await expect(page.locator('#bike-panel-title')).toHaveText('Framme vid förskolan!');
  await canvas(page).screenshot({ path: 'test-results/carl-preschool.png' });
  await press(page, 'bike-menu');
  await expect(page.getByRole('heading', { name: 'Vad vill du spela?' })).toBeAttached();
});

test('the chooser supports keyboard activation and remembers a language change', async ({ page }) => {
  await hub(page);
  await page.locator('[data-family="choose-carl"]').focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Till förskolan' })).toBeAttached();
  await page.keyboard.press('Escape');
  await press(page, 'family-lang');
  await expect(page.getByRole('heading', { name: 'What shall we play?' })).toBeAttached();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'What shall we play?' })).toBeAttached();
});

test('bike controls work by touch at a small landscape viewport', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  await hub(page); await press(page, 'choose-carl'); await press(page, 'start-bike'); await press(page, 'ride-primary');
  const box = (await canvas(page).boundingBox())!;
  const before = await page.evaluate(() => window.__ringstorp.bike().x);
  // Tap the right arrow in the lower-right on-screen steering pad.
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 1282 / 1440 * box.width, y: box.y + 752 / 810 * box.height }] });
  await page.waitForTimeout(250);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await canvas(page).screenshot({ path: 'test-results/carl-mobile.png' });
  expect(await page.evaluate(() => window.__ringstorp.bike().x)).toBeGreaterThan(before + 5);
  errors(); await context.close();
});

test('Kurragömma: counts to ten, finds friends by key and button, opens a surprise, and ends at the door', async ({ page }) => {
  await hub(page); await press(page, 'choose-carl');
  await expect(page.getByRole('heading', { name: 'Kurragömma' })).toBeAttached();
  await press(page, 'start-hide');
  await expect(page.locator('#hide-panel-title')).toHaveText('Kurragömma');
  await press(page, 'hide-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().mode)).toBe('counting');
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().mode)).toBe('seeking');
  // Walk with the real keyboard.
  const startX = await page.evaluate(() => window.__ringstorp.hide().x);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__ringstorp.hide().x)).toBeGreaterThan(startX + 20);
  // Stand at a friend's place and look with Space.
  const name = await page.evaluate(() => { const g = window.__ringstorp.hide(); const s = g.spots.find(s => s.friend)!; g.x = s.x; window.__ringstorp.step(1 / 60, 2); window.__ringstorp.thaw(); return s.friend!.name; });
  await page.keyboard.press('Space');
  await expect(page.locator('#hide-status')).toContainText(`${name} hittad!`);
  // At an empty place, the big Titta! button opens the surprise.
  await page.evaluate(() => { const g = window.__ringstorp.hide(); const s = g.spots.find(s => s.surprise)!; g.x = s.x; window.__ringstorp.step(1 / 60, 2); window.__ringstorp.thaw(); });
  await press(page, 'hide-look');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().spots.filter(s => s.surprise && s.opened).length)).toBe(1);
  // Find the rest; they all run to the door.
  await page.evaluate(() => { const g = window.__ringstorp.hide(); for (const s of g.spots.filter(s => s.friend && !s.opened)) { g.x = s.x; g.look(); } window.__ringstorp.step(1 / 60, 900); });
  await expect(page.locator('#hide-panel-title')).toHaveText('Du hittade alla!');
  await canvas(page).screenshot({ path: 'test-results/carl-hide-won.png' });
  await press(page, 'hide-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().mode)).toBe('counting');
  await press(page, 'hide-menu');
  await expect(page.getByRole('heading', { name: 'Vad vill du spela?' })).toBeAttached();
});

test('Kurragömma: a tap on a hiding place walks there and looks, on a small touch screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto('/?game=kurragomma');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  await press(page, 'hide-primary');
  await page.evaluate(() => { window.__ringstorp.hide().skipCount(); });
  // The nearest place to the right of the start, and where it is on screen (world 960 wide fills the canvas).
  const target = await page.evaluate(() => {
    const g = window.__ringstorp.hide(), s = g.spots[0], cam = Math.max(0, Math.min(2560 - 960, g.x - 960 * 0.42));
    return { x: s.x, screen: (s.x - cam) / 960 };
  });
  const box = (await canvas(page).boundingBox())!;
  await page.touchscreen.tap(box.x + target.screen * box.width, box.y + box.height * 0.75);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().spots[0].opened), { timeout: 10_000 }).toBe(true);
  await canvas(page).screenshot({ path: 'test-results/carl-hide-mobile.png' });
  errors(); await context.close();
});

