import { expect, test, type Page } from '@playwright/test';
import { canvas, click, open, press, settledBounds, ui, watchErrors, world } from './helpers/play';

const checks = new WeakMap<Page, () => void>();
test.beforeEach(({ page }) => checks.set(page, watchErrors(page)));
test.afterEach(({ page }) => checks.get(page)?.());

test('four level buttons fit and Karlstad starts with a real click', async ({ page }) => {
  await open(page, '', 'sv');
  const area = await canvas(page).boundingBox();
  for (const id of ['start', 'start-2', 'start-3', 'level-karlstad']) {
    const b = await settledBounds(page, id);
    expect(b.y + b.height).toBeLessThan(area!.y + area!.height);
    expect(b.x + b.width).toBeLessThan(area!.x + area!.width);
  }
  await canvas(page).screenshot({ path: 'test-results/karlstad/menu.png' });
  await press(page, 'level-karlstad');
  expect(await world(page, g => g.custom?.id)).toBe('karlstad');
  expect((await ui(page)).hud.objective.text).toContain('Stora torget');
  const x = await world(page, g => g.player.x);
  await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d');
  expect(await world(page, g => g.player.x)).toBeGreaterThan(x);
});

test('keyboard fika, defeat recovery, yellow bus ride, Liljedal and replay', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?level=karlstad', 'sv');
  await page.evaluate(() => window.__ringstorp.freeze());
  await world(page, g => {
    g.hasPackage = true; g.messageTimer = 0;
    for (const e of g.stage.encounters) if (!e.home) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
    g.player.x = 5600; g.player.y = 188; g.camera = 5408; g.player.hp = 1;
  });
  await page.keyboard.press('e');
  expect(await world(page, g => [g.checkpoint, g.player.hp, g.rested.size])).toEqual([5600, 5, 1]);
  await world(page, g => { g.mode = 'defeat'; });
  await press(page, 'continue');
  expect(await world(page, g => g.player.x)).toBe(5600);
  await world(page, g => {
    g.player.x = g.stage.length - 240; g.camera = g.stage.length - 480;
  });
  await page.evaluate(() => window.__ringstorp.step(1 / 60));
  expect(await world(page, g => g.active?.home)).toBe(true);
  await world(page, g => { for (const e of g.enemies) if (e.encounter === 100) e.hp = 0; });
  await page.evaluate(() => window.__ringstorp.step(1 / 60));
  await world(page, g => { g.player.x = g.stage.homeX; g.player.y = 188; g.messageTimer = 0; });
  await page.evaluate(() => window.__ringstorp.step(0));
  expect((await ui(page)).prompt?.button.enabled).toBe(true);
  await canvas(page).screenshot({ path: 'test-results/karlstad/yellow-bus-stop.png' });
  await page.keyboard.press('e');
  expect(await world(page, g => g.busRide)).toBe(0);
  await page.evaluate(() => window.__ringstorp.step(0.05, 40));
  await canvas(page).screenshot({ path: 'test-results/karlstad/yellow-bus-ride.png' });
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__ringstorp.step(0.05, 20));
  expect(await world(page, g => g.busRide)).toBeCloseTo(2);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__ringstorp.step(0.05, 150));
  await page.waitForTimeout(500);
  expect((await ui(page)).panel?.title).toBe('HEMMA I LILJEDAL');
  await canvas(page).screenshot({ path: 'test-results/karlstad/liljedal.png' });
  await press(page, 'restart');
  expect(await world(page, g => [g.custom?.id, g.busRide, g.checkpoint, g.hasPackage])).toEqual(['karlstad', null, null, false]);
});

for (const look of ['retro', 'smooth']) test(`Karlstad scenery renders in ${look}`, async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, `?level=karlstad&look=${look}`, 'sv');
  await page.evaluate(() => window.__ringstorp.freeze());
  await world(page, g => {
    g.messageTimer = 0;
    for (const e of g.stage.encounters) g.encounters.set(e.id, 'cleared');
    for (const e of g.enemies) { e.hp = 0; e.gone = true; }
  });
  for (const [name, x] of [['torget', 300], ['bron', 9260], ['sandgrund', 16050], ['hamnen', 25300], ['parken', 31950]] as const) {
    await page.evaluate(x => { const g = window.__ringstorp.sim; g.camera = Math.max(0, x - 240); g.player.x = x; window.__ringstorp.step(0); }, x);
    const shot = await canvas(page).screenshot({ path: `test-results/karlstad/${look}-${name}.png` });
    expect(shot.length).toBeGreaterThan(40_000);
  }
});
