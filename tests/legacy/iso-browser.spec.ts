// Browser tests for the isometric edition, which is kept but inactive. Playwright's testMatch only
// picks up tests/browser.spec.ts. To run these, point index.html back at /src/main.ts and set
// testMatch in playwright.config.ts to 'legacy/iso-browser.spec.ts'.
import { expect, test } from '@playwright/test';
import type { Game } from '../../src/game';
import type { Renderer } from '../../src/render';

declare global { interface Window { __ringstorpGame: Game; __ringstorpRenderer: Renderer } }

test('rotates the world through all views, preserves controls, and shows reference buildings', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /direct route/i }).click();
  await page.evaluate(() => window.__ringstorpGame.enemies.forEach(e => e.state = 'ko'));
  const canvas = page.locator('#game');
  for (let step = 1; step <= 8; step++) {
    await page.keyboard.press('e');
    await expect(page.locator('#view-angle')).toHaveText(`${step % 8 * 45}°`);
    await page.evaluate(async () => {
      const path = '/src/world.ts';
      const world: typeof import('../../src/world') = await import(/* @vite-ignore */ path);
      window.__ringstorpGame.player.pos = { ...world.START };
    });
    const before = await page.evaluate(() => ({ ...window.__ringstorpGame.player.pos }));
    await page.keyboard.down('d');
    await page.waitForTimeout(130);
    await page.keyboard.up('d');
    const delta = await page.evaluate(before => {
      const after = window.__ringstorpGame.player.pos;
      return window.__ringstorpRenderer.view.project(after.x - before.x, after.y - before.y);
    }, before);
    expect(delta.x).toBeGreaterThan(0);
    expect(Math.abs(delta.y)).toBeLessThan(0.01);
  }
  await page.getByRole('button', { name: 'Rotate map left', exact: true }).click();
  await expect(page.locator('#view-angle')).toHaveText('315°');
  await page.getByRole('button', { name: 'Reset map view', exact: true }).click();
  await expect(page.locator('#view-angle')).toHaveText('0°');
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.65);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.43, box.y + box.height * 0.65, { steps: 3 });
  await page.mouse.up();
  await expect(page.locator('#view-angle')).toHaveText('45°');
  await page.keyboard.press('0');
  await expect(page.locator('#view-angle')).toHaveText('0°');
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');
  await expect(page.locator('#view-angle')).toHaveText('315°');
  expect(await page.evaluate(() => window.__ringstorpGame.mode)).toBe('paused');
  await page.keyboard.press('Escape');

  for (const landmark of ['kiosk', 'marcus', 'home']) {
    await page.evaluate(async landmark => {
      const path = '/src/world.ts';
      const world: typeof import('../../src/world') = await import(/* @vite-ignore */ path);
      const game = window.__ringstorpGame;
      game.enemies.forEach(e => e.state = 'ko');
      game.player.pos = { ...(landmark === 'home' ? world.HOME : landmark === 'marcus' ? world.MARCUS_A : world.START) };
      game.messageTimer = 0;
      window.__ringstorpRenderer.resetCamera();
    }, landmark);
    for (const step of [0, 2, 4, 6]) {
      await page.evaluate(step => window.__ringstorpRenderer.setView(step), step);
      await page.waitForTimeout(250);
      await canvas.screenshot({ path: `test-results/${landmark}-${step * 45}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test('title, controls, pause and restart work in Chrome', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ringstorp Run/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/title.png', fullPage: true });
  await page.getByRole('button', { name: /direct route/i }).click();
  await expect(page.getByText('Pick up the package · Pålsjö kiosk')).toBeVisible();
  const before = await page.evaluate(() => ({ ...window.__ringstorpGame.player.pos }));
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  const after = await page.evaluate(() => ({ ...window.__ringstorpGame.player.pos }));
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(0.6);
  await page.keyboard.press('j');
  await page.keyboard.press('k');
  await page.keyboard.press('r');
  expect(await page.evaluate(() => window.__ringstorpGame.route)).toBe('marcus');
  await page.screenshot({ path: 'test-results/playing.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: /paused/i })).toBeVisible();
  const pausedAt = await page.evaluate(() => window.__ringstorpGame.elapsed);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__ringstorpGame.elapsed)).toBe(pausedAt);
  await page.getByRole('button', { name: /resume/i }).click();
  await expect(page.getByRole('heading', { name: /paused/i })).toBeHidden();
  await expect.poll(() => page.locator('#time').innerText()).not.toBe('00:00');
  expect(errors).toEqual([]);
});

test('the Marcus A route reaches home, can replay, and keeps its aspect ratio', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 960, height: 600 });
  await expect(page.getByRole('button', { name: /via marcus a/i })).toBeInViewport();
  await page.screenshot({ path: 'test-results/title-compact.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  const frame = await page.locator('.game-frame').boundingBox();
  expect(frame).not.toBeNull();
  expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 1);
  await page.getByRole('button', { name: /via marcus a/i }).click();
  await expect(page.getByText('Pick up the package · Pålsjö kiosk')).toBeVisible();
  await page.evaluate(async () => {
    const game = window.__ringstorpGame;
    // Served by the Vite dev server, so the test can use the real mission points.
    const path = '/src/world.ts';
    const world: typeof import('../../src/world') = await import(/* @vite-ignore */ path);
    game.enemies.forEach(e => e.state = 'ko');
    for (const spot of [world.PACKAGE, world.MARCUS_A, world.HOME]) {
      game.player.pos = { ...spot };
      game.update(0.016);
    }
    game.enemies.filter(e => e.group === world.HOME_GROUP).forEach(e => e.state = 'ko');
    game.update(0.016);
  });
  await expect(page.getByRole('heading', { name: /delivered/i })).toBeVisible();
  await expect(page.getByText(/patch-up at Marcus A/)).toBeVisible();
  await page.screenshot({ path: 'test-results/victory.png', fullPage: true });
  await page.getByRole('button', { name: /play again/i }).click();
  await expect(page.getByText('Pick up the package · Pålsjö kiosk')).toBeVisible();
  await expect(page.locator('#hearts .heart:not(.empty)')).toHaveCount(5);
  await page.setViewportSize({ width: 960, height: 600 });
  const compactFrame = await page.locator('.game-frame').boundingBox();
  expect(compactFrame).not.toBeNull();
  expect(compactFrame!.width / compactFrame!.height).toBeCloseTo(16 / 9, 1);
  await page.screenshot({ path: 'test-results/compact.png', fullPage: true });
});
