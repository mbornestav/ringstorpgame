import { expect, test, type Page } from '@playwright/test';
import { canvas, click, open, watchErrors, world } from './helpers/play';

// A gallery of the game's key scenes, saved to test-results/visual/ for review. Each shot must be a real picture (not a
// blank or nearly blank canvas) and the page must report no errors. There are no stored baselines to compare with: the art is
// still being tuned, so a person looks at the images.

const checks = new WeakMap<Page, () => void>();
test.beforeEach(({ page }) => { checks.set(page, watchErrors(page)); });
test.afterEach(({ page }) => { checks.get(page)?.(); });

const step = (page: Page, n = 30) => page.evaluate(n => window.__ringstorp.step(1 / 60, n), n);

async function shoot(page: Page, name: string): Promise<void> {
  await step(page, 20);
  await page.waitForTimeout(450);
  const image = await canvas(page).screenshot({ path: `test-results/visual/${name}.png` });
  // A flat colour compresses to a few KB; a picture of the game is far larger.
  expect(image.length, `${name} looks blank`).toBeGreaterThan(40_000);
}

test.describe.configure({ mode: 'serial' });

test('title, briefings, pause and results', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await shoot(page, 'title');
  await click(page, 'start-2'); await shoot(page, 'briefing-gods');
  await click(page, 'back'); await click(page, 'start-3'); await shoot(page, 'briefing-heist');
  await click(page, 'answer-3'); await step(page, 10);
  await click(page, 'pause'); await shoot(page, 'pause');
  await click(page, 'resume');
  await world(page, g => { g.mode = 'defeat'; g.heist.failure = 'busted'; g.heist.fine = 500; });
  await shoot(page, 'busted');
  await open(page, '?start=1');
  await world(page, g => { g.mode = 'victory'; g.koCount = 7; g.elapsed = 187; g.score = 1200; });
  await shoot(page, 'victory');
});

test('Level 1: the street, a fight and the phone', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?start=1');
  await shoot(page, 'l1-kiosk');
  await world(page, g => {
    const e = g.stage.encounters.find(x => !x.home)!;
    g.player.x = e.spawns[0].x - 50; g.player.y = e.spawns[0].y; g.camera = e.camera; g.messageTimer = 0;
  });
  await step(page, 50);
  for (let i = 0; i < 4; i++) { await world(page, g => g.queueAttack()); await step(page, 9); }
  await shoot(page, 'l1-fight');
  await world(page, g => { g.metDD = true; g.ammo = 2; g.cash = 250; });
  await click(page, 'phone');
  await shoot(page, 'l1-phone');
});

test('Level 2: street, lobby, lift and the eighth floor', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?start=2');
  await shoot(page, 'l2-street');
  await world(page, g => { g.interact(); });
  await step(page, 80);
  await world(page, g => { g.messageTimer = 0; });
  await shoot(page, 'l2-lobby');
  await world(page, g => { g.player.x = 400; g.player.y = 214; g.interact(); });
  await step(page, 80);
  await shoot(page, 'l2-lift');
  await world(page, g => { g.gods.pressFloor(8); });
  await step(page, 300);
  await world(page, g => { g.interact(); });
  await step(page, 80);
  await world(page, g => { g.messageTimer = 0; });
  await shoot(page, 'l2-floor');
});

test('Level 3: the drive, the yard and the brand signs', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '?start=3');
  await step(page, 400);
  await shoot(page, 'l3-drive');
  await world(page, g => { const d = g.heist.drive!; d.traffic = []; d.car.x = 12345; d.car.speed = 40; });
  await step(page, 300);
  await world(page, g => { g.heist.yard.crew.patrols = []; const t = g.heist.yard.trucks[0]; g.player.x = t.x - 60; g.player.y = 226; g.camera = g.player.x - 190; g.messageTimer = 0; });
  await step(page, 60);
  await shoot(page, 'l3-yard');
});
