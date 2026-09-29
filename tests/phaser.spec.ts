import { test, expect, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import reference from './fixtures/corridor/reference.json' with { type: 'json' };

async function open(page: Page): Promise<void> {
  await page.goto(`/phaser.html?seed=${reference.seed}`);
  await page.waitForFunction(() => {
    const api = (window as any).__phaserPilot;
    return api && api.game.scene.isActive('Adventure') && api.scene().transition === 0;
  });
}

test('native Arcade bodies match all four captured movement traces', async ({ page }) => {
  await open(page);
  const results = await page.evaluate(({ trace, arrival, visualTime }) => {
    const api = (window as any).__phaserPilot, failures: string[] = [];
    for (const run of trace) {
      api.fixture(arrival, visualTime);
      run.frames.forEach((frame, i) => {
        const dt = run.dt;
        const action = i === Math.round(.3 / dt) ? 'jump' : i === Math.round(1.2 / dt) ? 'dodge' : undefined;
        const actual = api.step(dt, { x: i < 1 / dt ? 1 : -1, y: i < .5 / dt ? 1 : -1, sneak: i >= 1.5 / dt }, action).player;
        for (const [key, value] of Object.entries(actual)) {
          const expected = (frame.player as any)[key];
          if (typeof value === 'number' ? Math.abs(value - expected) > 1e-8 : value !== expected) failures.push(`${dt}/${i}/${key}: ${value} != ${expected}`);
        }
      });
    }
    return { failures: failures.slice(0, 20), bodyType: api.scene().body.constructor.name, bodies: api.snapshot().bodies, legacy: '__ringstorpGame' in window };
  }, { trace: reference.trace, arrival: reference.shots[0], visualTime: reference.visualTime });
  expect(results.failures).toEqual([]); expect(results.bodies).toBe(1); expect(results.legacy).toBe(false);
});

test('native-resolution presentation matches the original corridor', async ({ page }, testInfo) => {
  await open(page);
  const metrics = [];
  for (const shot of reference.shots) {
    const result = await page.evaluate(async ({ shot, visualTime }) => {
      const api = (window as any).__phaserPilot;
      api.fixture(shot, visualTime); const actual = api.render();
      const decode = async (src: string) => {
        const img = new Image(); img.src = src; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 270;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, 480, 270).data;
      };
      const [a, b] = await Promise.all([decode(actual), decode(`/tests/fixtures/corridor/${shot.name}.png`)]);
      let different = 0, outsideText = 0, max = 0, total = 0;
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        if (d > 8) {
          different++;
          const y = Math.floor(i / 4 / 480);
          // Opaque legacy Canvas uses LCD text AA; transparent CanvasTexture uses grayscale.
          const textRow = shot.state.messageTimer > 0 && ((y >= 44 && y <= 55) || (y >= 56 && y <= 67));
          if (!textRow) outsideText++;
        }
        max = Math.max(max, d); total += d;
      }
      return { actual, different, outsideText, fraction: different / (480 * 270), max, mean: total / (480 * 270) };
    }, { shot, visualTime: reference.visualTime });
    writeFileSync(testInfo.outputPath(`${shot.name}.png`), Buffer.from(result.actual.split(',')[1], 'base64'));
    metrics.push({ name: shot.name, ...result, actual: undefined });
  }
  writeFileSync(testInfo.outputPath('comparison.json'), JSON.stringify(metrics, null, 2));
  // Geometry/art/portraits must match throughout; only dialogue glyph AA has a separate allowance.
  for (const result of metrics) {
    expect(result.outsideText, result.name).toBe(0);
    expect(result.fraction, `${result.name}: ${JSON.stringify(result)}`).toBeLessThan(0.012);
  }
});

test('keyboard, button, live localization, one-time handoff and exit contract', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('ringstorp-wallet', '{"cash":123,"earned":456}');
    localStorage.setItem('ringstorp-side-best', '901'); localStorage.setItem('ringstorp-best', '902');
    localStorage.setItem('ringstorp-muted', 'yes');
  });
  await open(page);
  await expect(page.locator('#sound')).toHaveText('♪ OFF');
  // Suspended WebAudio contexts need not reflect scheduled gain changes until audio runs.
  // Check the native manager's mute event instead of its live AudioParam getter.
  await page.evaluate(() => {
    const api = (window as any).__phaserPilot; api.muteEvents = [];
    api.game.sound.on('mute', (_manager: unknown, value: boolean) => api.muteEvents.push(value));
  });
  await page.locator('#sound').click();
  expect(await page.evaluate(() => localStorage.getItem('ringstorp-muted'))).toBe('no');
  expect(await page.evaluate(() => (window as any).__phaserPilot.muteEvents)).toContain(false);
  await page.locator('#sound').click();
  expect(await page.evaluate(() => (window as any).__phaserPilot.muteEvents)).toContain(true);
  expect(await page.evaluate(() => localStorage.getItem('ringstorp-muted'))).toBe('yes');
  await page.keyboard.down('d');
  await expect.poll(() => page.evaluate(() => (window as any).__phaserPilot.snapshot().player.x)).toBeGreaterThan(125);
  await page.keyboard.up('d');
  await page.evaluate(() => (window as any).__phaserPilot.place(320, 214));
  await page.keyboard.press('e');
  await expect(page.locator('#cargo')).toHaveText('GODS ON YOUR BACK');
  expect(await page.evaluate(() => (window as any).__phaserPilot.snapshot().message.key)).toBe('msg.dd2Gods');
  await page.locator('#language').click();
  await expect(page.locator('#dialogue-accessible')).toContainText('D.D:');
  await expect(page.locator('html')).toHaveAttribute('lang', 'sv');
  await expect(page.locator('#interact')).toContainText('Prata med D.D');
  await page.locator('#interact').click();
  expect(await page.evaluate(() => (window as any).__phaserPilot.snapshot().message.key)).toBe('msg.dd2Go');
  await page.evaluate(() => (window as any).__phaserPilot.place(70, 214));
  await page.keyboard.press('e');
  const exit = await page.evaluate(() => (window as any).__phaserPilot.snapshot().exit);
  expect(exit).toMatchObject({ destination: 'kurirgatan-28d-lift', spawn: 'floor-8', state: { cargo: 'carried', flags: { received: true } } });
  await expect(page.locator('#exit-details')).toBeVisible();
  await page.locator('#reenter').click();
  await expect.poll(() => page.evaluate(() => {
    const s = (window as any).__phaserPilot.snapshot(); return [s.player.x, s.transition, s.exit];
  })).toEqual([94, 0, null]);
  const state = await page.evaluate(() => (window as any).__phaserPilot.snapshot());
  expect(state.player.x).toBe(94); expect(state.player.y).toBe(214); expect(state.run.cargo).toBe('carried');
  expect(state.run.elapsed).toBeGreaterThanOrEqual(exit.state.elapsed);
  expect(state.actors.every((a: any) => a.talked === 0)).toBe(true);
  const stored = await page.evaluate(() => [localStorage.getItem('ringstorp-wallet'), localStorage.getItem('ringstorp-side-best'), localStorage.getItem('ringstorp-best')]);
  expect(stored).toEqual(['{"cash":123,"earned":456}', '901', '902']); expect(errors).toEqual([]);
});

test('pause, blur, input edges, boundaries and repeated visits release resources', async ({ page }) => {
  await open(page);
  await page.keyboard.down('d'); await page.keyboard.press('Escape');
  const paused = await page.evaluate(() => (window as any).__phaserPilot.snapshot().player);
  await page.waitForTimeout(150); expect(await page.evaluate(() => (window as any).__phaserPilot.snapshot().player)).toEqual(paused);
  await page.keyboard.up('d'); await page.locator('#resume').click();
  await page.keyboard.down('a');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#pause')).toBeVisible(); await page.keyboard.up('a'); await page.locator('#resume').click();
  const cleared = await page.evaluate(() => (window as any).__phaserPilot.snapshot().player.x);
  await page.waitForTimeout(100); expect(await page.evaluate(() => (window as any).__phaserPilot.snapshot().player.x)).toBe(cleared);
  const resources = await page.evaluate(() => { const s = (window as any).__phaserPilot.snapshot(); return [s.bodies, s.textures, s.sounds, s.listeners]; });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => (window as any).__phaserPilot.place(100, 214));
    await page.locator(i % 2 ? '#restart' : '#reenter').click();
    await expect.poll(() => page.evaluate(() => {
      const s = (window as any).__phaserPilot.snapshot(); return [s.player.x, s.transition];
    })).toEqual([94, 0]);
    const current = await page.evaluate(() => { const s = (window as any).__phaserPilot.snapshot(); return [s.bodies, s.textures, s.sounds, s.listeners]; });
    expect(current).toEqual(resources);
  }
  // Exercise a held action, a buffered action, jump interaction restriction and world edges.
  await page.evaluate(() => (window as any).__phaserPilot.place(340, 214));
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__phaserPilot.snapshot().player.z)).toBeGreaterThan(0);
  await page.keyboard.press('e');
  expect(await page.evaluate(() => (window as any).__phaserPilot.snapshot().run.cargo)).toBe('none');
  await page.waitForTimeout(650);
  expect(await page.evaluate(() => (window as any).__phaserPilot.snapshot().player.z)).toBe(0); await page.keyboard.up('Space');
  const edges = await page.evaluate(() => {
    const api = (window as any).__phaserPilot; api.freeze(); api.place(461, 247);
    const high = api.step(5, { x: 1, y: 1, sneak: false }).player;
    api.place(19, 177); const low = api.step(.05, { x: -1, y: -1, sneak: false }).player;
    return { high, low };
  });
  expect([edges.high.x, edges.high.y, edges.low.x, edges.low.y]).toEqual([462, 248, 18, 176]);
});

test('failed loading is visible and cannot start a partial room', async ({ page }) => {
  await page.route('**/dd-portrait-small.png*', route => route.request().resourceType() === 'script' ? route.continue() : route.abort());
  await page.goto('/phaser.html');
  await expect(page.locator('#error')).toContainText('Could not load dd-portrait');
  await expect(page.locator('#restart')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__phaserPilot.game.scene.isActive('Adventure'))).toBe(false);
});
