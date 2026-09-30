import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';
import { activate, approach, canvas, click, open, press, state, ui, watchErrors, world } from './helpers/play';

// Browser tests for the Phaser build served at "/". They drive the game with the real keyboard and mouse, read what the
// interface shows from the hidden DOM mirror (#a11y-*), and use the dev bridge to set up scenes and read state.

const checks = new WeakMap<Page, () => void>();
test.beforeEach(({ page }) => { checks.set(page, watchErrors(page)); });
test.afterEach(({ page }) => { checks.get(page)?.(); });

const panel = (page: Page) => page.locator('#a11y-panel');
const objective = (page: Page) => page.locator('#a11y-objective');
const button = (page: Page, name: string | RegExp, exact = false) => page.getByRole('button', { name, exact });

/** Waits for a control to be showing, then checks that its bounds lie fully inside the viewport (so a person could reach it). */
async function expectReachable(page: Page, id: string, label = id): Promise<void> {
  await expect.poll(() => page.evaluate(i => window.__ringstorp.bounds(i) !== null, id), { message: `${label} is showing` }).toBe(true);
  await expect.poll(async () => {
    const b = await page.evaluate(i => window.__ringstorp.bounds(i), id);
    const v = page.viewportSize()!;
    return !!b && b.x >= 0 && b.y >= 0 && b.x + b.width <= v.width + 0.5 && b.y + b.height <= v.height + 0.5;
  }, { message: `${label} is inside the viewport` }).toBe(true);
}

test('boots into a WebGL canvas at the configured size on the title screen', async ({ page }) => {
  await open(page);
  const size = await canvas(page).evaluate((c: HTMLCanvasElement) => [c.width, c.height]);
  expect(size).toEqual([1440, 810]);
  expect((await state(page)).mode).toBe('title');
  await expect(page).toHaveTitle(/Ringstorp/i);
});

test('title, controls, pause and restart work in Chrome', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Ringstorp Run/i);
  await expect(page.locator('#a11y-panel-title')).toHaveText(/Ringstorp Run/i);
  await canvas(page).screenshot({ path: 'test-results/title.png' });
  await expect(button(page, /via marcus a/i)).toHaveCount(0);
  await press(page, 'start');
  await expect(objective(page)).toHaveText('Pick up the package · Pålsjö kiosk');
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
  expect(await world(page, g => g.route)).toBe('direct');
  await canvas(page).screenshot({ path: 'test-results/playing.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#a11y-panel-title')).toHaveText(/paused/i);
  const pausedAt = (await state(page)).elapsed;
  await page.waitForTimeout(250);
  expect((await state(page)).elapsed).toBe(pausedAt);
  await press(page, 'resume');
  await expect(panel(page)).toBeHidden();
  await expect.poll(() => page.locator('#a11y-time').innerText()).not.toBe('00:00');
});

test('Enter starts the game from the title, Escape pauses once, and losing focus pauses', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).mode).toBe('paused');
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(async () => (await state(page)).mode).toBe('paused');
});

test('Tab and Enter operate the menu, and a focused button fires once', async ({ page }) => {
  await open(page);
  // Count what the command bus is asked to do, then walk to Start with the keyboard alone.
  await page.evaluate(() => {
    const session = (window.__ringstorp as unknown as { session: { dispatch: (a: string, s?: string) => boolean } }).session;
    const original = session.dispatch.bind(session);
    (window as unknown as { __dispatched: string[] }).__dispatched = [];
    session.dispatch = (a, s) => { (window as unknown as { __dispatched: string[] }).__dispatched.push(a); return original(a, s); };
  });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.getAttribute('data-action') === 'start')) break;
  }
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-action'))).toBe('start');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await state(page)).mode).toBe('playing');
  const seen = await page.evaluate(() => (window as unknown as { __dispatched: string[] }).__dispatched);
  expect(seen.filter(a => a === 'start' || a === 'restart')).toHaveLength(1);
});

test('picks up the package on foot and scrolls along the street past the landmarks', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?start=1');
  await canvas(page).screenshot({ path: 'test-results/side-kiosk.png' });
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await expect.poll(async () => (await state(page)).hasPackage, { timeout: 5000 }).toBe(true);
  await page.keyboard.up('w');
  await page.keyboard.up('d');
  await approach(page, 'romares');
  await expect(button(page, 'Turn towards Marcus A')).toBeEnabled();
  await canvas(page).screenshot({ path: 'test-results/side-junction.png' });
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.route)).toBe('marcus');
  await expect.poll(() => world(page, g => g.transition)).toBe(0);
  await expect(objective(page)).toHaveText('Patch up at Marcus A · Långåkersgatan 4');
  for (const spot of ['marcus', 'langakers', 'home'] as const) {
    await approach(page, spot);
    await page.waitForTimeout(400);
    await world(page, g => { g.messageTimer = 0; });
    await canvas(page).screenshot({ path: `test-results/side-${spot}.png` });
  }
  expect((await state(page)).camera).toBeGreaterThan(5000);
});

test('takes both turns during play, refills at Kurir Livs, delivers and replays', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page);
  await page.setViewportSize({ width: 960, height: 600 });
  await expectReachable(page, 'start');
  await page.screenshot({ path: 'test-results/title-compact.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  const box = await canvas(page).boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  await press(page, 'start');
  await expect(objective(page)).toHaveText('Pick up the package · Pålsjö kiosk');
  await approach(page, 'romares');
  await activate(button(page, 'Turn towards Marcus A'));
  await expect.poll(() => world(page, g => g.transition)).toBe(0);
  await approach(page, 'marcus');
  await expect.poll(() => world(page, g => g.healed)).toBe(true);
  await approach(page, 'kurir');
  await expect(button(page, 'Turn towards Kurir Livs')).toBeEnabled();
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.route)).toBe('marcus-kurir');
  await expect.poll(() => world(page, g => g.transition)).toBe(0);
  await approach(page, 'shop');
  await expect(button(page, 'Refill health at Kurir Livs')).toBeDisabled();
  await world(page, g => { g.player.hp = 2; });
  await expect(button(page, 'Refill health at Kurir Livs')).toBeEnabled();
  await canvas(page).screenshot({ path: 'test-results/kurir-livs.png' });
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.shopHealed)).toBe(true);
  await expect.poll(async () => (await ui(page)).hud.life.hearts?.filled).toBe(5);
  await expect(button(page, 'Refill health at Kurir Livs')).toBeDisabled();
  await page.setViewportSize({ width: 960, height: 600 });
  await expectReachable(page, 'interact');
  await page.setViewportSize({ width: 1280, height: 800 });
  await world(page, g => {
    const go = (x: number, y: number) => { g.camera = Math.max(0, Math.min(g.stage.length - 480, x - 192)); g.player.x = x; g.player.y = y; g.update(1 / 60); };
    for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
    go(g.stage.length - 240, 214);
    for (const e of g.enemies) if (e.encounter === 100) e.hp = 0;
    g.update(1 / 60);
    go(g.stage.homeX, 180);
  });
  await expect(page.locator('#a11y-panel-title')).toHaveText(/delivered/i);
  await expect(panel(page)).toContainText(/patch-up at Marcus A/);
  await expect(panel(page)).toContainText(/supplies from Kurir Livs/);
  await canvas(page).screenshot({ path: 'test-results/victory.png' });
  await press(page, 'restart');
  await expect(objective(page)).toHaveText('Pick up the package · Pålsjö kiosk');
  expect((await ui(page)).hud.life.hearts?.filled).toBe(5);
  expect(await world(page, g => g.route)).toBe('direct');
  expect(await world(page, g => g.shopHealed)).toBe(false);
});

test('GH337 auto-dials D.D, summons him and confirms paid refills', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?start=1');
  // No phone until D.D has been met.
  await page.keyboard.press('f');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button(page, 'Open Ericsson GH337 phone')).toBeHidden();
  await world(page, g => { g.metDD = true; });
  await page.keyboard.press('f');
  const phone = page.getByRole('dialog');
  await expect(phone).toBeVisible();
  await expect(phone.locator('.lcd-contact')).toHaveText('D.D');
  await expect(phone.locator('.lcd-number')).toHaveText('042218626');
  await expect(phone.getByRole('button', { name: 'Call D.D', exact: true }).first()).toBeFocused();
  await canvas(page).screenshot({ path: 'test-results/gh337-phone.png' });
  const before = await state(page);
  await page.keyboard.press('d'); await page.keyboard.press('i'); await page.keyboard.press('j');
  expect((await state(page)).x).toBe(before.x);
  expect((await state(page)).elapsed).toBe(before.elapsed);
  // YES starts the automatic call, with no need to enter digits.
  await activate(phone.locator('.phone-yes'));
  await expect(phone.locator('.lcd-status')).toHaveText('DIALING...');
  await expect(phone.locator('.lcd-number')).toHaveText('042218626');
  await expect(phone.locator('.phone-action')).toBeDisabled();
  await expect(phone.locator('.lcd-status')).toHaveText('RINGING...');
  await expect(phone.locator('.phone-action')).toHaveText('BUY REFILL · 100 KR', { timeout: 10_000 });
  await expect(phone.locator('.phone-wallet')).toHaveText('YOUR CASH  200 KR');
  await page.setViewportSize({ width: 960, height: 600 });
  await expectReachable(page, 'phone-call');
  await expectReachable(page, 'phone-away');
  await canvas(page).screenshot({ path: 'test-results/gh337-compact.png' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await activate(phone.locator('.phone-action'));
  await expect(phone.locator('.phone-wallet')).toHaveText('YOUR CASH  100 KR');
  await expect(phone.locator('.lcd-status')).toHaveText('REFILLED');
  const inventory = () => world(page, g => ({ ammo: g.ammo, cash: g.cash }));
  expect(await inventory()).toEqual({ ammo: 8, cash: 100 });
  await page.keyboard.press('Escape');
  await expect(phone).not.toBeVisible();
  expect((await state(page)).mode).toBe('playing');
  await expect(page.locator('#a11y-ammo')).toContainText('8 rounds remaining');
  await page.keyboard.press('i');
  await expect.poll(inventory).toEqual({ ammo: 7, cash: 100 });
  await page.keyboard.press('Escape');
  expect((await state(page)).mode).toBe('paused');
  await page.keyboard.press('Escape');
  await activate(button(page, 'Open Ericsson GH337 phone'));
  await expect(phone).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await phone.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('f');
  await expect(phone).not.toBeVisible();
});

test('GH337 shows insufficient funds and full ammo without charging', async ({ page }) => {
  await open(page, '?start=1');
  await world(page, g => { g.metDD = true; });
  await page.keyboard.press('f');
  const phone = page.getByRole('dialog');
  await activate(phone.locator('.phone-yes'));
  await expect(phone.locator('.phone-action')).toHaveText('BUY REFILL · 100 KR', { timeout: 10_000 });
  await world(page, g => { g.cash = 50; });
  await expect(phone.locator('.phone-action')).toBeDisabled();
  await expect(phone.locator('.phone-hint')).toContainText('50 more kr');
  await world(page, g => { g.cash = 200; g.ammo = 8; });
  await expect(phone.locator('.phone-action')).toBeDisabled();
  await expect(phone.locator('.phone-hint')).toContainText('Already fully loaded');
  await activate(phone.getByRole('button', { name: /No thanks/ }));
  await expect(phone.locator('.phone-wallet')).toHaveText('YOUR CASH  200 KR');
  await activate(phone.getByRole('button', { name: 'Put phone away', exact: true }));
  await expect(phone).not.toBeVisible();
});

test('D.D pulls over for a wave, and firing his gun brings the police', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?start=1');
  await world(page, g => {
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
  await expect(page.locator('#a11y-prompt')).toContainText('Is that D.D?');
  await page.waitForFunction(() => !!window.__ringstorp.sim.bmwInReach);
  await page.keyboard.press('e');
  const ammo = () => world(page, g => g.ammo);
  await expect.poll(ammo).toBe(8);
  await expect(page.locator('#a11y-ammo')).toContainText('8 rounds');
  await canvas(page).screenshot({ path: 'test-results/side-dd.png' });
  await page.keyboard.press('i');
  await expect.poll(ammo).toBe(7);
  await expect.poll(() => world(page, g => g.police.length), { timeout: 10_000 }).toBeGreaterThan(0);
  await canvas(page).screenshot({ path: 'test-results/side-police.png' });
});

test('the language button switches the whole interface to Swedish and remembers it', async ({ page }) => {
  await open(page);
  await expect(button(page, /start run/i)).toBeVisible();
  await activate(button(page, 'Byt till svenska'));
  await expect(button(page, /starta/i)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sv');
  await click(page, 'start');
  await expect.poll(async () => (await ui(page)).hud.life.label).toBe('KURIR / HÄLSA');
  await page.reload();
  await page.waitForFunction(() => window.__ringstorp);
  await expect(button(page, /starta/i)).toBeVisible();
  await activate(button(page, 'Switch to English'));
  await expect(button(page, /start run/i)).toBeVisible();
});

test('sound can be muted with M or the button, and the choice is remembered', async ({ page }) => {
  await open(page, '?start=1');
  await page.keyboard.press('m');
  await expect.poll(async () => (await page.evaluate(() => window.__ringstorp.audio())).muted).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('ringstorp-muted'))).toBe('yes');
  await expect.poll(async () => (await page.evaluate(() => window.__ringstorp.audio())).mute).toBe(true);
  await page.reload();
  await page.waitForFunction(() => window.__ringstorp);
  await page.evaluate(() => window.__ringstorp.ready);
  expect((await page.evaluate(() => window.__ringstorp.audio())).muted).toBe(true);
  await activate(button(page, 'Unmute sound'));
  await expect.poll(async () => (await page.evaluate(() => window.__ringstorp.audio())).muted).toBe(false);
});

test('every panel keeps its buttons on screen in English and Swedish', async ({ page }) => {
  test.setTimeout(60_000);
  for (const lang of ['en', 'sv'] as const) {
    await open(page, '', lang);
    const shown = async (label: string) => {
      const model = (await ui(page)).panel;
      expect(model, label).not.toBeNull();
      for (const a of model!.actions) await expectReachable(page, a.id, `${lang} ${label}: ${a.id}`);
    };
    await shown('title');
    await click(page, 'start-2'); await shown('gods briefing');
    await click(page, 'back'); await click(page, 'start-3'); await shown('heist briefing');
    await click(page, 'answer-3'); await click(page, 'pause'); await shown('pause');
    await click(page, 'resume');
    await world(page, g => { g.mode = 'defeat'; g.heist.failure = 'busted'; g.heist.fine = 500; });
    await shown('busted');
    await world(page, g => { g.mode = 'victory'; });
    await shown('delivered');
    await world(page, g => { g.toTitle(); });
  }
});

test('renders a non-blank frame in every level', async ({ page }) => {
  for (const start of ['1', '2', '3']) {
    await open(page, `?start=${start}`);
    await page.evaluate(() => window.__ringstorp.step(1 / 60, 30));
    const shot = await canvas(page).screenshot();
    expect(shot.length, `level ${start}`).toBeGreaterThan(40_000);
  }
});

test('every title-screen and top-bar button answers across its whole face, not its neighbour', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(800); // the title panel slides in
  const misses = await page.evaluate(() => {
    const r = window.__ringstorp, game = r.game as unknown as Phaser.Game, scene = game.scene.getScene('UI'), cam = scene.cameras.main;
    const canvas = game.canvas.getBoundingClientRect(), k = game.scale.gameSize.width / canvas.width;
    const all = (o: { list?: unknown[] }): Phaser.GameObjects.GameObject[] => [o as Phaser.GameObjects.GameObject, ...((o.list ?? []) as { list?: unknown[] }[]).flatMap(all)];
    const interactive = scene.children.list.flatMap((o: Phaser.GameObjects.GameObject) => all(o as { list?: unknown[] })).filter(o => o.input);
    const out: string[] = [];
    for (const id of ['start', 'start-2', 'start-3', 'level-karlstad', 'lang', 'sound', 'chooser']) {
      const b = r.bounds(id)!;
      for (const fy of [0.08, 0.5, 0.92]) for (const fx of [0.05, 0.5, 0.95]) {
        const p = game.input.activePointer;
        p.x = (b.x + b.width * fx - canvas.left) * k; p.y = (b.y + b.height * fy - canvas.top) * k;
        const hit = game.input.hitTest(p, interactive, cam)[0] as { id?: string } | undefined;
        if (hit?.id !== id) out.push(`${id} at ${fx},${fy} → ${hit?.id ?? 'nothing'}`);
      }
    }
    return out;
  });
  expect(misses).toEqual([]);
});

test('a level file plays from its URL with its own street and texts', async ({ page }) => {
  await open(page, '?level=sample');
  await page.evaluate(() => window.__ringstorp.step(1 / 60, 30));
  expect(await page.evaluate(() => window.__ringstorp.sim.custom?.id)).toBe('sample');
  expect((await ui(page)).hud.objective.text).toBe('Pick up the parcel · the kiosk');
  const shot = await canvas(page).screenshot();
  expect(shot.length).toBeGreaterThan(40_000);
});

test('Level 2: fetch the Gods from floor 8, carry them home past the police and get paid', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await click(page, 'start-2');
  // D.D's call opens first, with his portrait.
  await expect(page.getByRole('img', { name: 'D.D' })).toBeVisible();
  await expect(page.locator('#a11y-panel-title')).toHaveText(/D\.D calling|D\.D is calling|D\.D RINGER|D\.D/i);
  await press(page, 'back');
  await expect(button(page, /start run/i)).toBeVisible();
  await press(page, 'start-2');
  await press(page, 'answer');
  await expect(objective(page)).toHaveText('Go up to D.D · Kurirgatan 28D, floor 8');
  await expect(page.locator('#a11y-level')).toHaveText('LEVEL 2 · GODS RUN');
  await expect(page.locator('#a11y-controls')).toContainText('SNEAK');
  const settled = () => expect.poll(() => world(page, g => g.transition)).toBe(0);
  // In through the door, then up in Superhissen.
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.gods.scene)).toBe('lobby');
  await settled();
  await world(page, g => { g.player.x = 400; g.player.y = 214; });
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.gods.scene)).toBe('cabin');
  await settled();
  await page.keyboard.press('8');
  await expect.poll(() => world(page, g => g.gods.floor), { timeout: 10_000 }).toBe(8);
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.gods.scene)).toBe('floor');
  await settled();
  await world(page, g => {
    const dd = g.gods.npcs.find(n => n.id === 'dd')!;
    g.player.x = dd.x - 20; g.player.y = dd.y;
  });
  await page.keyboard.press('e');
  await expect(page.locator('#a11y-life')).toHaveText('GODS ON YOUR BACK');
  await expect(objective(page)).toHaveText('Out with the Gods · ground floor');
  // Down again and out into the street, then straight to the door of 55B.
  await world(page, g => { g.player.x = 60; g.player.y = 214; g.messageTimer = 0; });
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.gods.scene)).toBe('cabin');
  await settled();
  await page.keyboard.press('0');
  await expect.poll(() => world(page, g => g.gods.floor), { timeout: 10_000 }).toBe(0);
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.gods.scene)).toBe('lobby');
  await settled();
  await world(page, g => { g.player.x = 60; g.player.y = 214; });
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.gods.scene)).toBe('street');
  await settled();
  await expect(objective(page)).toHaveText('Carry the Gods home · Ringstorpsvägen 55B');
  await world(page, g => {
    g.gods.patrols.length = 0;
    g.player.x = g.stage.homeX; g.player.y = 180; g.camera = g.player.x - 190;
  });
  await page.keyboard.press('e');
  await expect(page.locator('#a11y-panel-title')).toHaveText(/delivered/i);
  await expect(page.locator('.outcome-panel')).toContainText('D.D pays 300 kr');
  await press(page, 'restart');
  await expect(objective(page)).toHaveText('Go up to D.D · Kurirgatan 28D, floor 8');
  expect(await world(page, g => g.gods.assignment)).toBe(2);
});

test('the lift buttons can be pressed with the mouse', async ({ page }) => {
  await open(page, '?start=2');
  await world(page, g => { g.gods.scene = 'cabin'; g.transition = 0; g.player.x = 200; g.player.y = 214; });
  await page.evaluate(() => window.__ringstorp.step(1 / 60, 10));
  // Floor 8 is the top button on the panel at logical (388, 92); find it on the page and click there.
  const at = await page.evaluate(() => {
    const canvas = window.__ringstorp.game.canvas.getBoundingClientRect();
    const k = canvas.width / 480;
    return { x: canvas.left + 388 * k, y: canvas.top + 92 * k };
  });
  await page.mouse.click(at.x, at.y);
  await expect.poll(() => world(page, g => g.gods.ride?.to)).toBe(8);
});

test('Level 3: pick up Goran, drive out, cut a kapell, load the Taunus and drive back to Kurirgatan', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  await click(page, 'start-3');
  await expect(page.locator('#a11y-panel-title')).toHaveText(/kapell/i);
  await expect(page.getByRole('img', { name: 'D.D' })).toBeVisible();
  await press(page, 'back');
  await expect(button(page, /start run/i)).toBeVisible();
  await press(page, 'start-3');
  await press(page, 'answer-3');
  await expect(objective(page)).toHaveText('Pick up Goran · Kurirgatan');
  await expect(page.locator('#a11y-level')).toHaveText('LEVEL 3 · THE KAPELL JOB');
  await expect.poll(() => world(page, g => g.heist.phase), { timeout: 10_000 }).toBe('out');
  await expect(objective(page)).toHaveText('Drive to the industrial estate · past Statoil');
  // Gas, then a lane change.
  const x0 = await world(page, g => g.heist.drive!.car.x);
  await page.keyboard.down('d');
  await page.waitForTimeout(900);
  await page.keyboard.down('w');
  await page.waitForTimeout(500);
  await page.keyboard.up('w'); await page.keyboard.up('d');
  expect(await world(page, g => g.heist.drive!.car.x)).toBeGreaterThan(x0 + 100);
  expect(await world(page, g => g.heist.drive!.laneOfCar)).toBe(0);
  // Straight to the gate.
  await world(page, g => { const d = g.heist.drive!; d.traffic = []; d.car.x = 12345; d.car.speed = 40; });
  await expect.poll(() => world(page, g => g.heist.phase), { timeout: 10_000 }).toBe('yard');
  await expect(objective(page)).toHaveText('Cut a kapell · take the Gods');
  await world(page, g => {
    g.heist.yard.crew.patrols = [];
    const tr = g.heist.yard.trucks[0];
    g.player.x = tr.x - 24; g.player.y = 226; g.camera = g.player.x - 190; g.messageTimer = 0;
  });
  await expect.poll(() => world(page, g => g.transition)).toBe(0);
  await expect(page.locator('#a11y-prompt')).toContainText('cut the kapell');
  // Hold E: the kapell opens, then crates come out.
  await page.keyboard.down('e');
  await expect.poll(() => world(page, g => g.heist.yard.trucks[0].state), { timeout: 8000 }).toBe('cut');
  await expect.poll(() => world(page, g => g.heist.yard.carry), { timeout: 8000 }).toBe(2);
  await page.keyboard.up('e');
  await world(page, g => { g.player.x = 330; g.player.y = 226; g.camera = 100; });
  await expect(page.locator('#a11y-prompt')).toContainText('Load 2 into the Taunus');
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.heist.yard.trunk)).toBe(2);
  await expect(page.locator('#a11y-life')).toContainText('CRATES 2/8');
  await page.keyboard.press('e');
  await expect.poll(() => world(page, g => g.heist.phase), { timeout: 15_000 }).toBe('back');
  // Back on Kurirgatan, with nobody after us.
  await world(page, g => { const d = g.heist.drive!; d.traffic = []; d.police = []; d.car.x = 11446; d.car.speed = 40; });
  await expect(page.locator('#a11y-panel-title')).toHaveText(/delivered/i, { timeout: 10_000 });
  await expect(page.locator('.outcome-panel')).toContainText('2 crates');
});

test('Level 3: an arrest in the yard ends the whole job, and you can try again', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await click(page, 'start-3');
  await press(page, 'answer-3');
  await expect.poll(() => world(page, g => g.heist.phase), { timeout: 10_000 }).toBe('out');
  await world(page, g => { const d = g.heist.drive!; d.traffic = []; d.car.x = 12345; d.car.speed = 40; });
  await expect.poll(() => world(page, g => g.heist.phase), { timeout: 10_000 }).toBe('yard');
  await expect.poll(() => world(page, g => g.transition)).toBe(0);
  await world(page, g => {
    Object.assign(g.player, { x: 1200, y: 230 }); g.camera = 1000;
    g.heist.yard.crew.patrols = [{ id: 1, x: 1240, y: 230, z: 0, facing: -1, walk: 0, x0: 1238, x1: 1242, state: 'wait', timer: 99, suspicion: 0, flash: 0, lostFor: 0, cooldown: 0 }];
  });
  await expect(page.locator('#a11y-panel-title')).toHaveText(/busted/i, { timeout: 15_000 });
  await expect(page.locator('.outcome-panel')).toContainText('The police caught D.D in the yard');
  await press(page, 'restart');
  await expect(objective(page)).toHaveText('Pick up Goran · Kurirgatan');
});
