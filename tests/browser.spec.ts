import { expect, test, type Page } from '@playwright/test';
import type { SideGame } from '../src/side/game';
import type { SideRenderer } from '../src/side/render';

// The dev build exposes the running game, so tests can check state and set up scenes.
type Exposed = { __ringstorpGame: SideGame; __ringstorpRenderer: SideRenderer };
const state = (page: Page) => page.evaluate(() => {
  const g = (window as unknown as Exposed).__ringstorpGame;
  return { mode: g.mode, route: g.route, x: g.player.x, y: g.player.y, z: g.player.z, elapsed: g.elapsed, hasPackage: g.hasPackage, camera: g.camera, transition: g.transition, hp: g.player.hp, healed: g.healed, shopHealed: g.shopHealed };
});

/** Skip intervening fights to exercise the real keyboard/UI at each landmark. */
async function approach(page: Page, spot: 'romares' | 'kurir' | 'marcus' | 'langakers' | 'shop' | 'home') {
  await page.evaluate(spot => {
    const g = (window as unknown as Exposed).__ringstorpGame;
    for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
    g.hasPackage = true;
    const x = spot === 'marcus' ? g.stage.marcusX! : spot === 'langakers' ? g.stage.marcusX! + 560 : spot === 'shop' ? g.stage.shopX! : spot === 'home' ? g.stage.homeX - 120 : g.stage.junctions.find(j => j.id === spot)!.x;
    g.camera = Math.max(0, Math.min(g.stage.length - 480, x - 192));
    g.player.x = x;
    g.player.y = spot === 'marcus' || spot === 'shop' ? 180 : 214;
    g.messageTimer = 0;
  }, spot);
}

test('title, controls, pause and restart work in Chrome', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ringstorp Run/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/title.png', fullPage: true });
  await expect(page.getByRole('button', { name: /via marcus a/i })).toHaveCount(0);
  await page.getByRole('button', { name: /start run/i }).click();
  await expect(page.getByText('Pick up the package · Pålsjö kiosk')).toBeVisible();
  const before = await state(page);
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  const after = await state(page);
  expect(after.x - before.x).toBeGreaterThan(20);
  await page.keyboard.press(' ');
  await expect.poll(async () => (await state(page)).z).toBeGreaterThan(0);
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  await page.keyboard.press('e');
  expect((await state(page)).route).toBe('direct');
  await page.screenshot({ path: 'test-results/playing.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: /paused/i })).toBeVisible();
  const pausedAt = (await state(page)).elapsed;
  await page.waitForTimeout(250);
  expect((await state(page)).elapsed).toBe(pausedAt);
  await page.getByRole('button', { name: /resume/i }).click();
  await expect(page.getByRole('heading', { name: /paused/i })).toBeHidden();
  await expect.poll(() => page.locator('#time').innerText()).not.toBe('00:00');
  expect(errors).toEqual([]);
});

test('picks up the package on foot and scrolls along the street past the landmarks', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /start run/i }).click();
  const canvas = page.locator('#game');
  await canvas.screenshot({ path: 'test-results/side-kiosk.png' });
  // Up onto the pavement and along to the package in front of the kiosk.
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await expect.poll(async () => (await state(page)).hasPackage, { timeout: 5000 }).toBe(true);
  await page.keyboard.up('w');
  await page.keyboard.up('d');
  await approach(page, 'romares');
  await expect(page.getByRole('button', { name: 'Turn towards Marcus A' })).toBeEnabled();
  await canvas.screenshot({ path: 'test-results/side-junction.png' });
  await page.keyboard.press('e');
  await expect.poll(async () => (await state(page)).route).toBe('marcus');
  await expect.poll(async () => (await state(page)).transition).toBe(0);
  await expect(page.getByText('Patch up at Marcus A · Långåkersgatan 4')).toBeVisible();
  for (const spot of ['marcus', 'langakers', 'home'] as const) {
    await approach(page, spot);
    await page.waitForTimeout(400);
    await page.evaluate(() => { (window as unknown as Exposed).__ringstorpGame.messageTimer = 0; });
    await canvas.screenshot({ path: `test-results/side-${spot}.png` });
  }
  expect((await state(page)).camera).toBeGreaterThan(5000);
  expect(errors).toEqual([]);
});

test('takes both turns during play, refills at Kurir Livs, delivers and replays', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.setViewportSize({ width: 960, height: 600 });
  await expect(page.getByRole('button', { name: /start run/i })).toBeInViewport();
  await page.screenshot({ path: 'test-results/title-compact.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  const frame = await page.locator('.game-frame').boundingBox();
  expect(frame).not.toBeNull();
  expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 1);
  await page.getByRole('button', { name: /start run/i }).click();
  await expect(page.getByText('Pick up the package · Pålsjö kiosk')).toBeVisible();
  await approach(page, 'romares');
  await page.getByRole('button', { name: 'Turn towards Marcus A' }).click();
  await expect.poll(async () => (await state(page)).transition).toBe(0);
  await approach(page, 'marcus');
  await expect.poll(async () => (await state(page)).healed).toBe(true);
  await approach(page, 'kurir');
  await expect(page.getByRole('button', { name: 'Turn towards Kurir Livs' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/kurir-junction.png', fullPage: true });
  await page.keyboard.press('e');
  await expect.poll(async () => (await state(page)).route).toBe('marcus-kurir');
  await expect.poll(async () => (await state(page)).transition).toBe(0);
  await approach(page, 'shop');
  await expect(page.getByRole('button', { name: 'Refill health at Kurir Livs' })).toBeDisabled();
  await page.evaluate(() => { (window as unknown as Exposed).__ringstorpGame.player.hp = 2; });
  await expect(page.getByRole('button', { name: 'Refill health at Kurir Livs' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/kurir-livs.png', fullPage: true });
  await page.locator('#game').screenshot({ path: 'test-results/kurir-livs-canvas.png' });
  await page.keyboard.press('e');
  await expect.poll(async () => (await state(page)).shopHealed).toBe(true);
  await expect(page.locator('#hearts .heart:not(.empty)')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Refill health at Kurir Livs' })).toBeDisabled();
  await page.setViewportSize({ width: 960, height: 600 });
  await expect(page.getByRole('button', { name: 'Refill health at Kurir Livs' })).toBeInViewport();
  await page.screenshot({ path: 'test-results/kurir-compact.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const g = (window as unknown as Exposed).__ringstorpGame;
    const go = (x: number, y: number) => { g.camera = Math.max(0, Math.min(g.stage.length - 480, x - 192)); g.player.x = x; g.player.y = y; g.update(1 / 60); };
    for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
    go(g.stage.length - 240, 214);
    for (const e of g.enemies) if (e.encounter === 100) e.hp = 0;
    g.update(1 / 60);
    go(g.stage.homeX, 180);
  });
  await expect(page.getByRole('heading', { name: /delivered/i })).toBeVisible();
  await expect(page.getByText(/patch-up at Marcus A/)).toBeVisible();
  await expect(page.getByText(/supplies from Kurir Livs/)).toBeVisible();
  await page.screenshot({ path: 'test-results/victory.png', fullPage: true });
  await page.getByRole('button', { name: /play again/i }).click();
  await expect(page.getByText('Pick up the package · Pålsjö kiosk')).toBeVisible();
  await expect(page.locator('#hearts .heart:not(.empty)')).toHaveCount(5);
  expect((await state(page)).route).toBe('direct');
  expect((await state(page)).shopHealed).toBe(false);
  await page.setViewportSize({ width: 960, height: 600 });
  const compactFrame = await page.locator('.game-frame').boundingBox();
  expect(compactFrame).not.toBeNull();
  expect(compactFrame!.width / compactFrame!.height).toBeCloseTo(16 / 9, 1);
  await page.screenshot({ path: 'test-results/compact.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('GH337 auto-dials D.D, summons him and confirms paid refills', async ({ page }) => {
  test.setTimeout(45000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /start run/i }).click();
  // No phone until D.D has been met.
  await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Ericsson GH337 phone' })).toBeHidden();
  await page.evaluate(() => { (window as unknown as Exposed).__ringstorpGame.metDD = true; });
  await page.keyboard.press('f');
  const phone = page.getByRole('dialog');
  await expect(phone).toBeVisible();
  await expect(phone.locator('.lcd-contact')).toHaveText('D.D');
  await expect(phone.locator('.lcd-number')).toHaveText('042218626');
  await expect(phone.getByRole('button', { name: 'Call D.D', exact: true }).first()).toBeFocused();
  await page.screenshot({ path: 'test-results/gh337-phone.png', fullPage: true });
  const before = await state(page);
  await page.keyboard.press('d'); await page.keyboard.press('i'); await page.keyboard.press('j');
  expect((await state(page)).x).toBe(before.x);
  expect((await state(page)).elapsed).toBe(before.elapsed);
  // YES starts the automatic call, with no need to enter digits.
  await phone.locator('.phone-yes').click();
  await expect(phone.locator('.lcd-status')).toHaveText('DIALING...');
  await expect(phone.locator('.lcd-number')).toHaveText('042218626');
  await expect(phone.locator('.phone-action')).toBeDisabled();
  await expect(phone.locator('.lcd-status')).toHaveText('RINGING...');
  await expect(phone.locator('.phone-action')).toHaveText('BUY REFILL · 100 KR', { timeout: 10000 });
  await expect(phone.locator('.phone-wallet')).toHaveText('YOUR CASH  200 KR');
  await page.setViewportSize({ width: 960, height: 600 });
  await expect(phone.locator('.phone-yes')).toBeInViewport();
  await expect(phone.locator('.phone-pocket')).toBeInViewport();
  const fits = await phone.evaluate(el => el.scrollHeight <= el.clientHeight + 1);
  expect(fits).toBe(true);
  await page.screenshot({ path: 'test-results/gh337-compact.png', fullPage: true });
  await phone.locator('.phone-action').click();
  await expect(phone.locator('.phone-wallet')).toHaveText('YOUR CASH  100 KR');
  await expect(phone.locator('.lcd-status')).toHaveText('REFILLED');
  const inventory = () => page.evaluate(() => {
    const g = (window as unknown as Exposed).__ringstorpGame;
    return { ammo: g.ammo, cash: g.cash };
  });
  expect(await inventory()).toEqual({ ammo: 8, cash: 100 });
  await page.keyboard.press('Escape');
  await expect(phone).not.toBeVisible();
  expect((await state(page)).mode).toBe('playing');
  await expect(page.locator('#ammo')).toHaveAttribute('aria-label', '8 rounds remaining');
  await page.keyboard.press('i');
  await expect.poll(inventory).toEqual({ ammo: 7, cash: 100 });
  await page.keyboard.press('Escape');
  expect((await state(page)).mode).toBe('paused');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open Ericsson GH337 phone' }).click();
  await expect(phone).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await phone.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('f');
  await expect(phone).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('GH337 shows insufficient funds and full ammo without charging', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => { (window as unknown as Exposed).__ringstorpGame.metDD = true; });
  await page.keyboard.press('f');
  const phone = page.getByRole('dialog');
  await phone.locator('.phone-yes').click();
  await expect(phone.locator('.phone-action')).toHaveText('BUY REFILL · 100 KR', { timeout: 10000 });
  await page.evaluate(() => { (window as unknown as Exposed).__ringstorpGame.cash = 50; });
  await expect(phone.locator('.phone-action')).toBeDisabled();
  await expect(phone.locator('.phone-hint')).toContainText('50 more kr');
  await page.evaluate(() => { const g = (window as unknown as Exposed).__ringstorpGame; g.cash = 200; g.ammo = 8; });
  await expect(phone.locator('.phone-action')).toBeDisabled();
  await expect(phone.locator('.phone-hint')).toContainText('Already fully loaded');
  await phone.getByRole('button', { name: /No thanks/ }).click();
  await expect(phone.locator('.phone-wallet')).toHaveText('YOUR CASH  200 KR');
  await phone.getByRole('button', { name: 'Put phone away', exact: true }).click();
  await expect(phone).not.toBeVisible();
});

test('D.D pulls over for a wave, and firing his gun brings the police', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /start run/i }).click();
  await page.evaluate(() => {
    const g = (window as unknown as Exposed).__ringstorpGame;
    for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
    g.hasPackage = true;
    // The middle of a long stretch of road, with D.D due and heading towards the courier.
    const road = g.stage.surfaces.find(r => (r.value === 'major' || r.value === 'road') && r.x1 - r.x0 > 1400)!;
    const x = Math.round((road.x0 + road.x1) / 2);
    g.camera = x - 192; g.player.x = x; g.player.y = 214; g.messageTimer = 0;
    g.random = () => 0.9;
    g.bmwTimer = 0;
  });
  await expect(page.getByText('Is that D.D?')).toBeVisible();
  await page.waitForFunction(() => !!(window as unknown as Exposed).__ringstorpGame.bmwInReach);
  await page.keyboard.press('e');
  const ammo = () => page.evaluate(() => (window as unknown as Exposed).__ringstorpGame.ammo);
  await expect.poll(ammo).toBe(8);
  await expect(page.locator('#ammo')).toBeVisible();
  await page.locator('#game').screenshot({ path: 'test-results/side-dd.png' });
  await page.keyboard.press('i');
  await expect.poll(ammo).toBe(7);
  await expect.poll(() => page.evaluate(() => (window as unknown as Exposed).__ringstorpGame.police.length), { timeout: 10000 }).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: 'test-results/side-police.png' });
  expect(errors).toEqual([]);
});
