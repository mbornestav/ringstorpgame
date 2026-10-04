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
  for (const name of ['Till förskolan', 'Kurragömma', 'Hemma']) await expect(page.getByRole('heading', { name })).toBeAttached();
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


test('music follows the game: chooser, title, each level, pause, and Carl-Otto’s games; M mutes it', async ({ page }) => {
  await hub(page);
  const track = () => page.evaluate(() => window.__ringstorp.music().track);
  await expect.poll(track).toBe('hub');
  await press(page, 'choose-ringstorp');
  await expect.poll(track).toBe('title');
  await press(page, 'start');
  await expect.poll(track).toBe('street');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.sim.mode)).toBe('paused');
  expect(await track()).toBe('street');
  await page.evaluate(() => { window.__ringstorp.click('menu'); window.__ringstorp.click('start-2'); window.__ringstorp.click('answer'); });
  await expect.poll(track).toBe('gods');
  await page.evaluate(() => { window.__ringstorp.click('menu'); window.__ringstorp.click('start-3'); window.__ringstorp.click('answer-3'); });
  await expect.poll(track).toBe('heist');
  await press(page, 'chooser');
  await expect.poll(track).toBe('hub');
  await press(page, 'choose-carl'); await press(page, 'start-bike');
  await expect.poll(track).toBe('bike');
  // The music keeps moving once the page has had a click.
  const at = await page.evaluate(() => window.__ringstorp.music().position);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.music().position), { timeout: 5000 }).not.toBe(at);
  const muted = await page.evaluate(() => window.__ringstorp.music().muted);
  await page.keyboard.press('m');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.music().muted)).toBe(!muted);
  await page.keyboard.press('m');
  await press(page, 'bike-menu'); await press(page, 'choose-carl'); await press(page, 'start-hide');
  await expect.poll(track).toBe('hide');
  await press(page, 'hide-menu'); await press(page, 'choose-carl'); await press(page, 'start-home'); await press(page, 'room-living'); await press(page, 'play-filmkvall');
  await expect.poll(track).toBe('movie');
});

test('Filmkväll: finds things by key and button, carries them to the sofa, and the film starts', async ({ page }) => {
  await hub(page); await press(page, 'choose-carl'); await press(page, 'start-home'); await press(page, 'room-living'); await press(page, 'play-filmkvall');
  await expect(page.locator('#movie-panel-title')).toHaveText('Filmkväll');
  await press(page, 'movie-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().mode)).toBe('gathering');
  // Walk with the real keyboard.
  const startX = await page.evaluate(() => window.__ringstorp.movie().x);
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
  expect(await page.evaluate(() => window.__ringstorp.movie().x)).toBeLessThan(startX - 20);
  // Stand at a hiding place with something in it and look with Space: it goes into his arms.
  await page.evaluate(() => { const g = window.__ringstorp.movie(); const s = g.spots.find(s => s.item)!; g.x = s.x; window.__ringstorp.step(1 / 60, 2); window.__ringstorp.thaw(); });
  await page.keyboard.press('Space');
  await expect(page.locator('#movie-status')).toContainText('hittad!');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().carrying.length)).toBe(1);
  // At an empty place, the big Titta! button opens the surprise.
  await page.evaluate(() => { const g = window.__ringstorp.movie(); const s = g.spots.find(s => !s.item)!; g.x = s.x; window.__ringstorp.step(1 / 60, 60); window.__ringstorp.thaw(); });
  await press(page, 'movie-look');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().spots.filter(s => !s.item && s.opened).length)).toBe(1);
  // Back at the sofa, what he carries goes onto it.
  await page.evaluate(() => { const g = window.__ringstorp.movie(); g.x = 820; window.__ringstorp.step(1 / 60, 2); });
  expect(await page.evaluate(() => window.__ringstorp.movie().placed.length)).toBe(1);
  await expect(page.locator('#movie-status')).toContainText('ligger i soffan');
  await canvas(page).screenshot({ path: 'test-results/carl-movie-sofa.png' });
  // The rest, then the TV comes on and the film starts.
  await page.evaluate(() => {
    const g = window.__ringstorp.movie();
    for (const s of g.spots.filter(s => s.item && !s.opened)) { g.x = s.x; g.look(); window.__ringstorp.step(1 / 60, 60); }
    g.x = 820; window.__ringstorp.step(1 / 60, 120);
  });
  expect(await page.evaluate(() => window.__ringstorp.movie().tvOn)).toBe(true);
  await canvas(page).screenshot({ path: 'test-results/carl-movie-tv.png' });
  await page.evaluate(() => window.__ringstorp.step(1 / 60, 200));
  await expect(page.locator('#movie-panel-title')).toHaveText('Filmen börjar!');
  await canvas(page).screenshot({ path: 'test-results/carl-movie-won.png' });
  await page.evaluate(() => window.__ringstorp.thaw());
  await press(page, 'movie-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().mode)).toBe('gathering');
  expect(await page.evaluate(() => window.__ringstorp.movie().placed.length)).toBe(0);
  // Back on the map, the living room wears its sticker.
  await press(page, 'movie-menu');
  await expect(page.locator('#house-room')).toHaveText('Vardagsrummet');
  expect(await page.evaluate(() => window.__ringstorp.house().done)).toEqual(['filmkvall']);
  await expect(page.getByText('Filmkväll: Hitta det som behövs till filmkvällen och gör soffan mysig. KLAR!')).toBeAttached();
  await canvas(page).screenshot({ path: 'test-results/carl-house-sticker.png' });
});

test('Filmkväll: a tap on a hiding place walks there and looks, on a small touch screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto('/?game=filmkvall');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  await press(page, 'movie-primary');
  // The nearest place to the left of the sofa (the coffee table), and where it is on screen (the 960-wide room view fills the canvas).
  const target = await page.evaluate(() => {
    const g = window.__ringstorp.movie(), s = g.spots[1], cam = Math.max(0, Math.min(2200 - 960, g.x - 960 * 0.42));
    return { screen: (s.x - cam) / 960 };
  });
  const box = (await canvas(page).boundingBox())!;
  await page.touchscreen.tap(box.x + target.screen * box.width, box.y + box.height * 0.75);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().spots[1].opened), { timeout: 10_000 }).toBe(true);
  await canvas(page).screenshot({ path: 'test-results/carl-movie-mobile.png' });
  errors(); await context.close();
});

test('Hemma: the map chooses rooms by tap and by key, and goes back to Carl-Otto’s games', async ({ page }) => {
  await hub(page); await press(page, 'choose-carl'); await press(page, 'start-home');
  // Nothing is done yet, so the map opens on the hall: the craft corner is the first thing there is to play.
  await expect(page.locator('#house-room')).toHaveText('Hallen');
  await canvas(page).screenshot({ path: 'test-results/carl-house.png' });
  // A tap on the kitchen chooses it, and its game can be played; the dining room's is still being built.
  await press(page, 'room-kitchen');
  await expect(page.locator('#house-room')).toHaveText('Köket');
  expect(await page.evaluate(() => window.__ringstorp.bounds('play-pannkakor'))).not.toBeNull();
  await press(page, 'room-dining');
  await expect(page.locator('#house-room')).toHaveText('Matsalen');
  await expect(page.getByText('Kommer snart')).toBeAttached();
  expect(await page.evaluate(() => window.__ringstorp.bounds('play-duka'))).toBeNull();
  // The hall has two things to do: coming home is still being built, the craft corner can be played.
  await press(page, 'room-hall');
  for (const name of ['Hemkomst', 'Pysselhörnan']) await expect(page.getByText(new RegExp(`^${name}:`))).toBeAttached();
  expect(await page.evaluate(() => window.__ringstorp.bounds('play-pyssel'))).not.toBeNull();
  await canvas(page).screenshot({ path: 'test-results/carl-house-hall.png' });
  // The arrow keys walk through the rooms, and Carl-Otto's head follows.
  const before = await page.evaluate(() => window.__ringstorp.house());
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.house().selected)).not.toBe(before.selected);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.house().head.join())).not.toBe(before.head.join());
  // A second tap on the living room starts movie night; Escape on the map goes back to Carl-Otto's games.
  await press(page, 'room-living'); await press(page, 'room-living');
  await expect(page.locator('#movie-panel-title')).toHaveText('Filmkväll');
  await press(page, 'movie-menu');
  await expect(page.locator('#house-room')).toHaveText('Vardagsrummet');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Carl-Ottos spel' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Hemma' })).toBeAttached();
});

test('Pysselhörnan: draws, colours in, puts on stickers, undoes, and the picture hangs in the living room', async ({ page }) => {
  await hub(page); await press(page, 'choose-carl'); await press(page, 'start-home');
  // The map opens on the hall, the first room of the evening.
  await expect(page.locator('#house-room')).toHaveText('Hallen'); await press(page, 'play-pyssel');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().mode)).toBe('drawing');
  const box = (await canvas(page).boundingBox())!;
  /** A point on the paper (paper units, 580 × 420 from its top left at world 40, 96) on the page. */
  const on = (x: number, y: number) => ({ x: box.x + (40 + x) / 960 * box.width, y: box.y + (96 + y) / 540 * box.height });
  // Nothing to put up yet.
  await press(page, 'craft-hang');
  await expect(page.locator('#craft-status')).toHaveText('Rita något först!');
  // A line with the mouse, in blue.
  await press(page, 'crayon-5');
  await expect(page.locator('#craft-status')).toHaveText('Blå krita');
  let p = on(100, 120); await page.mouse.move(p.x, p.y); await page.mouse.down();
  for (const [x, y] of [[160, 160], [240, 140], [320, 220]]) { p = on(x, y); await page.mouse.move(p.x, p.y, { steps: 4 }); }
  await page.mouse.up();
  const line = await page.evaluate(() => { const s = window.__ringstorp.craft().picture.strokes[0]; return { colour: s.colour, points: s.points.length }; });
  expect(line.colour).toBe('#3157b8'); expect(line.points).toBeGreaterThan(4);
  // A heart sticker, then undo takes it off again.
  await press(page, 'sticker-heart');
  p = on(450, 300); await page.mouse.click(p.x, p.y);
  expect(await page.evaluate(() => window.__ringstorp.craft().picture.stickers.length)).toBe(1);
  await press(page, 'craft-undo');
  expect(await page.evaluate(() => window.__ringstorp.craft().picture.stickers.length)).toBe(0);
  // The keyboard pen: the arrows move it, Space puts it down and lifts it.
  await press(page, 'tool-crayon');
  await page.keyboard.press('Space'); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(250); await page.keyboard.up('ArrowDown'); await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.__ringstorp.craft().picture.strokes.length)).toBe(2);
  await canvas(page).screenshot({ path: 'test-results/carl-craft-drawing.png' });
  // A colouring page: the bucket fills the house's wall green.
  await press(page, 'craft-new');
  await canvas(page).screenshot({ path: 'test-results/carl-craft-choose.png' });
  await press(page, 'paper-house');
  expect(await page.evaluate(() => window.__ringstorp.craft().tool)).toBe('bucket');
  await page.keyboard.press('4');
  p = on(210, 300); await page.mouse.click(p.x, p.y);
  expect(await page.evaluate(() => window.__ringstorp.craft().picture.fills.filter(Boolean))).toEqual(['#62b046']);
  for (const [k, x, y] of [['3', 500, 70], ['1', 280, 150], ['5', 30, 30], ['9', 290, 290]] as const) { await page.keyboard.press(k); p = on(x, y); await page.mouse.click(p.x, p.y); }
  await canvas(page).screenshot({ path: 'test-results/carl-craft-house.png' });
  // Up on the wall: remembered, and the craft corner is done.
  await press(page, 'craft-hang');
  await expect(page.locator('#craft-panel-title')).toHaveText('Uppsatt!');
  await canvas(page).screenshot({ path: 'test-results/carl-craft-hung.png' });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('carl-otto-hemma')!));
  expect(saved.done).toEqual(['pyssel']); expect(saved.drawings).toHaveLength(1); expect(saved.drawings[0]).toMatch(/^data:image\/png;base64,/);
  // In the living room, it hangs over the sofa.
  await press(page, 'craft-menu');
  await expect(page.locator('#house-room')).toHaveText('Hallen');
  await press(page, 'room-living'); await press(page, 'play-filmkvall'); await press(page, 'movie-primary');
  await page.waitForTimeout(300);
  await canvas(page).screenshot({ path: 'test-results/carl-movie-picture.png' });
});

test('Pysselhörnan: crayons, stickers and the paper work by touch on a small screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
  const page = await context.newPage();
  const errors = watchErrors(page);
  await page.goto('/?game=pyssel');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  const box = (await canvas(page).boundingBox())!;
  const tap = (x: number, y: number) => page.touchscreen.tap(box.x + (40 + x) / 960 * box.width, box.y + (96 + y) / 540 * box.height);
  const centre = async (id: string) => { const b = (await page.evaluate(i => window.__ringstorp.bounds(i), id))!; await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
  await centre('crayon-3');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().colour)).toBe('#62b046');
  await tap(200, 200);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().picture.strokes.length)).toBe(1);
  await centre('sticker-star'); await tap(300, 150);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().picture.stickers.length)).toBe(1);
  await canvas(page).screenshot({ path: 'test-results/carl-craft-mobile.png' });
  errors(); await context.close();
});

test('Pannkakor with only the keyboard: Space does the next thing, 1–5 pick a topping', async ({ page }) => {
  await page.goto('/?game=pannkakor');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  const phase = () => page.evaluate(() => window.__ringstorp.pancake().phase);
  for (let i = 0; i < 5; i++) await page.keyboard.press('Space');
  await expect.poll(phase).toBe('whisk');
  for (let i = 0; i < 20 && await phase() === 'whisk'; i++) await page.keyboard.press('Space');
  await expect.poll(phase).toBe('fry');
  // The game advances only by hand from here, so each key lands at a known moment.
  const pan = () => page.evaluate(() => window.__ringstorp.pancake().pan.state);
  await page.evaluate(() => window.__ringstorp.freeze());
  for (let n = 1; n <= 5; n++) {
    await page.keyboard.press('Space'); // pour
    await expect.poll(pan).toBe('pouring');
    await page.evaluate(() => window.__ringstorp.step(1 / 60, 60 * 4));
    await page.keyboard.press('Space'); // flip
    await expect.poll(pan).toBe('flying');
    await page.evaluate(() => window.__ringstorp.step(1 / 60, 60 * 3));
    await page.keyboard.press('Space'); // onto the plate
    await expect.poll(pan).toBe('sliding');
    await page.evaluate(() => window.__ringstorp.step(1 / 60, 60));
    await expect.poll(() => page.evaluate(() => window.__ringstorp.pancake().stack.length)).toBe(n);
  }
  await page.evaluate(() => window.__ringstorp.thaw());
  await expect.poll(phase).toBe('toppings');
  await page.keyboard.press('2'); await page.keyboard.press('Space'); await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.__ringstorp.pancake().toppings.map(t => t.kind))).toEqual(['cream', 'cream']);
  await page.keyboard.press('z');
  expect(await page.evaluate(() => window.__ringstorp.pancake().toppings.length)).toBe(1);
  await press(page, 'pancake-done');
  await expect(page.locator('#pancake-panel-title')).toHaveText('Pannkakorna är klara!');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('carl-otto-hemma')!).done)).toEqual(['pannkakor']);
  await canvas(page).screenshot({ path: 'test-results/carl-pancake-done.png' });
});

test('Godnatt with only the keyboard: Space tidies, goes to bed, says goodnight, turns off the lamp; P plays the piano', async ({ page }) => {
  await page.goto('/?game=godnatt');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  const g = () => page.evaluate(() => { const r = window.__ringstorp.goodnight(); return { phase: r.phase, piano: r.piano.open, won: r.won }; });
  await page.keyboard.press('p');
  await expect.poll(async () => (await g()).piano).toBe(true);
  for (const k of ['1', '5', '8']) await page.keyboard.press(k);
  expect(await page.evaluate(() => window.__ringstorp.goodnight().piano.pressed.length)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await g()).piano).toBe(false);
  // Still in the room: Escape closed the piano, not the room.
  await expect(page.locator('#goodnight-status')).toBeAttached();
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(700); }
  await expect.poll(async () => (await g()).phase).toBe('bed');
  for (let i = 0; i < 7; i++) await page.keyboard.press('Space');
  await expect.poll(async () => (await g()).won, { timeout: 8000 }).toBe(true);
  await expect(page.locator('#goodnight-panel-title')).toHaveText('Sov gott, Carl-Otto!');
  await press(page, 'goodnight-menu');
  await expect(page.locator('#house-room')).toHaveText('Carl-Ottos rum');
});

test('God morgon with only the keyboard: Space wakes them, bounces and lights the bulbs; then the bike', async ({ page }) => {
  await page.goto('/?game=godmorgon');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  const g = () => page.evaluate(() => { const r = window.__ringstorp.morning(); return { phase: r.phase, bulbs: r.bulbs }; });
  for (let i = 0; i < 6 && (await g()).phase === 'wake'; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(700); }
  await expect.poll(async () => (await g()).phase, { timeout: 6000 }).toBe('bounce');
  for (let i = 0; i < 30 && (await g()).bulbs < 8; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
  await expect.poll(async () => (await g()).phase, { timeout: 8000 }).toBe('ready');
  await press(page, 'morning-bike');
  await expect(page.locator('#bike-panel-title')).toHaveText('Till förskolan');
});

test('Hemkomst with only the keyboard: Space puts each thing away, then on to the craft corner', async ({ page }) => {
  await page.goto('/?game=hemkomst');
  await page.waitForFunction(() => window.__ringstorp); await page.evaluate(() => window.__ringstorp.ready);
  for (let i = 0; i < 10; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(200); }
  await expect.poll(() => page.evaluate(() => window.__ringstorp.homecoming().won), { timeout: 8000 }).toBe(true);
  await expect(page.locator('#homecoming-panel-title')).toHaveText('Välkommen hem!');
  await press(page, 'homecoming-craft');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().mode)).toBe('drawing');
});
