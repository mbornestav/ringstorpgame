import { expect, test } from '@playwright/test';
import type { Game } from '../src/game';

declare global { interface Window { __ringstorpGame: Game } }

test('title, controls, pause and restart work in Chrome', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Ringstorp Run/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/title.png', fullPage: true });
  await page.getByRole('button', { name: /start mission/i }).click();
  await expect(page.getByText('Clear the crew · Ringstorpsvägen')).toBeVisible();
  const before = await page.evaluate(() => ({ ...window.__ringstorpGame.player.pos }));
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  const after = await page.evaluate(() => ({ ...window.__ringstorpGame.player.pos }));
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(0.6);
  await page.keyboard.press('j');
  await page.keyboard.press('k');
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

test('the full mission reaches victory, can replay, and keeps its aspect ratio', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 960, height: 600 });
  await expect(page.getByRole('button', { name: /start mission/i })).toBeInViewport();
  await page.screenshot({ path: 'test-results/title-compact.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  const frame = await page.locator('.game-frame').boundingBox();
  expect(frame).not.toBeNull();
  expect(frame!.width / frame!.height).toBeCloseTo(16 / 9, 1);
  await page.getByRole('button', { name: /start mission/i }).click();
  await page.evaluate(() => {
    const game = window.__ringstorpGame;
    game.enemies.forEach(e => e.state = 'ko');
    for (const parcel of game.parcels) {
      game.player.pos = { x: parcel.x, y: parcel.y };
      game.update(0.016);
    }
    game.enemies.filter(e => e.group === 3).forEach(e => e.state = 'ko');
    game.player.pos = { x: 112, y: 12 };
    game.update(0.016);
  });
  await expect(page.getByRole('heading', { name: /delivered/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/victory.png', fullPage: true });
  await page.getByRole('button', { name: /play again/i }).click();
  await expect(page.getByText('Clear the crew · Ringstorpsvägen')).toBeVisible();
  await expect(page.locator('#hearts .heart:not(.empty)')).toHaveCount(5);
  await page.setViewportSize({ width: 960, height: 600 });
  const compactFrame = await page.locator('.game-frame').boundingBox();
  expect(compactFrame).not.toBeNull();
  expect(compactFrame!.width / compactFrame!.height).toBeCloseTo(16 / 9, 1);
  await page.screenshot({ path: 'test-results/compact.png', fullPage: true });
});
