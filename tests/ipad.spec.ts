import { test, expect, devices, type Page } from '@playwright/test';
import { canvas, watchErrors } from './helpers/play';

// Every game played the way a child plays on an iPad: fingers only, no keyboard and no mouse. Taps are real touch taps,
// and drags (whisking, painting, drawing) are real touch moves sent through the browser's input pipeline.

const { defaultBrowserType: _, ...ipad } = devices['iPad Pro 11 landscape'];
test.use({ ...ipad });

let check: () => void;
test.beforeEach(({ page }) => { check = watchErrors(page); });
test.afterEach(() => check());

async function open(page: Page, game: string): Promise<void> {
  await page.addInitScript(() => { if (!localStorage.getItem('ringstorp-lang')) localStorage.setItem('ringstorp-lang', 'sv'); });
  await page.goto(game ? `/?game=${game}` : '/');
  await page.waitForFunction(() => window.__ringstorp);
  await page.evaluate(() => window.__ringstorp.ready);
}

/** A point of the 960 × 540 world, on the page. */
async function world(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = (await canvas(page).boundingBox())!;
  return { x: box.x + x / 960 * box.width, y: box.y + y / 540 * box.height };
}

/** Taps the middle of a canvas control (or hotspot) with a finger. */
async function tap(page: Page, id: string): Promise<void> {
  await expect.poll(() => page.evaluate(i => window.__ringstorp.bounds(i), id), { message: `no control ${id}` }).not.toBeNull();
  const b = (await page.evaluate(i => window.__ringstorp.bounds(i), id))!;
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
async function tapWorld(page: Page, x: number, y: number): Promise<void> { const p = await world(page, x, y); await page.touchscreen.tap(p.x, p.y); }

/** A finger put down at the first point, drawn through the rest, and lifted: world pixels. */
async function swipe(page: Page, points: Array<[number, number]>): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const at = await Promise.all(points.map(([x, y]) => world(page, x, y)));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [at[0]] });
  for (const p of at.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
const circle = (cx: number, cy: number, r: number, turns: number): Array<[number, number]> =>
  Array.from({ length: Math.round(turns * 24) + 1 }, (_, i) => [cx + Math.cos(i / 24 * Math.PI * 2) * r, cy + Math.sin(i / 24 * Math.PI * 2) * r * 0.5]);

test('Pannkakor by touch: eggs, milk and flour, whisking, five pancakes, toppings', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'pannkakor');
  const g = () => page.evaluate(() => { const r = window.__ringstorp.pancake(); return { phase: r.phase, eggs: r.eggs, smooth: r.smooth, stack: r.stack.length, pan: r.pan.state, toppings: r.toppings.length, plants: r.plants }; });
  // The ingredients go in at a touch, the carton three times.
  for (const id of ['add-egg', 'add-egg', 'add-egg', 'add-milk', 'add-flour']) await tap(page, id);
  expect((await g()).eggs).toBe(3);
  await expect.poll(async () => (await g()).phase).toBe('whisk');
  await canvas(page).screenshot({ path: 'test-results/ipad-pancake-whisk.png' });
  // A finger going round the bowl whisks the batter smooth.
  for (let i = 0; i < 6 && (await g()).phase === 'whisk'; i++) await swipe(page, circle(540, 318, 80, 3));
  await expect.poll(async () => (await g()).phase).toBe('fry');
  // Five pancakes: a tap pours, a tap flips once it bubbles, a tap slides it onto the plate.
  for (let n = 1; n <= 5; n++) {
    await tapWorld(page, 748, 360);
    await expect.poll(async () => (await g()).pan).toBe('pouring');
    await page.evaluate(() => window.__ringstorp.step(1 / 60, 60 * 4));
    if (n === 1) await canvas(page).screenshot({ path: 'test-results/ipad-pancake-bubbles.png' });
    await page.evaluate(() => window.__ringstorp.thaw());
    await tapWorld(page, 748, 360);
    await expect.poll(async () => (await g()).pan).toBe('flying');
    await page.evaluate(() => window.__ringstorp.step(1 / 60, 60 * 3));
    await page.evaluate(() => window.__ringstorp.thaw());
    await tapWorld(page, 748, 360);
    await expect.poll(async () => (await g()).stack).toBe(n);
  }
  await expect.poll(async () => (await g()).phase).toBe('toppings');
  // Jam painted across with a finger, blueberries dotted on, a plant watered.
  await tap(page, 'topping-jam');
  await swipe(page, Array.from({ length: 20 }, (_, i) => [360 + i * 12, 322 + Math.sin(i) * 12] as [number, number]));
  await tap(page, 'topping-blueberry');
  for (const x of [420, 480, 540]) await tapWorld(page, x, 318);
  await tap(page, 'plant-1');
  const now = await g();
  expect(now.toppings).toBeGreaterThanOrEqual(8); expect(now.plants[1]).toBeGreaterThanOrEqual(0);
  await canvas(page).screenshot({ path: 'test-results/ipad-pancake-toppings.png' });
  await tap(page, 'pancake-done');
  await expect(page.locator('#pancake-panel-title')).toHaveText('Pannkakorna är klara!');
  await canvas(page).screenshot({ path: 'test-results/ipad-pancake-done.png' });
  // The sound can be switched off with a finger, and the map is a tap away.
  const muted = await page.evaluate(() => window.__ringstorp.music().muted);
  await tap(page, 'pancake-sound');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.music().muted)).toBe(!muted);
  await tap(page, 'pancake-menu');
  await expect(page.locator('#house-room')).toHaveText('Köket');
});

/** A finger put down on a point and held while `during` runs, then lifted: page pixels. */
async function hold(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, during: () => Promise<void>): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 5, y: from.y + (to.y - from.y) * i / 5 }] });
  await during();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('Ringstorp Run by touch: the stick walks, the buttons jump and punch, and the game pauses', async ({ page }) => {
  await open(page, 'ringstorp');
  await tap(page, 'start');
  const sim = () => page.evaluate(() => { const g = window.__ringstorp.sim; return { mode: g.mode, x: g.player.x, y: g.player.y, z: g.player.z, attack: g.player.attackTimer }; });
  await expect.poll(async () => (await sim()).mode).toBe('playing');
  await canvas(page).screenshot({ path: 'test-results/ipad-run-touch.png' });
  // The thumb on the stick, pushed right: the courier walks right; pushed down: he steps towards us.
  const stick = (await page.evaluate(() => window.__ringstorp.bounds('touch-stick')))!;
  const centre = { x: stick.x + stick.width / 2, y: stick.y + stick.height / 2 };
  const start = await sim();
  await hold(page, centre, { x: centre.x + stick.width * 0.45, y: centre.y }, async () => {
    await expect.poll(async () => (await sim()).x).toBeGreaterThan(start.x + 8);
  });
  const after = (await sim()).x;
  await page.waitForTimeout(300);
  expect((await sim()).x).toBeLessThan(after + 4); // stopped when the thumb lifted
  await hold(page, centre, { x: centre.x, y: centre.y + stick.height * 0.45 }, async () => {
    await expect.poll(async () => (await sim()).y).toBeGreaterThan(start.y);
  });
  // Jump and punch.
  await tap(page, 'touch-jump');
  await expect.poll(async () => (await sim()).z, { intervals: [30] }).toBeGreaterThan(0);
  // Back on the ground, a punch (in the air it would be a kick).
  await expect.poll(async () => (await sim()).z).toBe(0);
  await tap(page, 'touch-j');
  await expect.poll(async () => (await sim()).attack, { intervals: [30] }).toBeGreaterThan(0);
  // Pause and carry on, by touch.
  await tap(page, 'touch-pause');
  await expect.poll(async () => (await sim()).mode).toBe('paused');
  expect(await page.evaluate(() => window.__ringstorp.bounds('touch-jump'))).toBeNull();
  await tap(page, 'resume');
  await expect.poll(async () => (await sim()).mode).toBe('playing');
});

/** A point of the 1440 × 810 interface, on the page. */
async function ui(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  const box = (await canvas(page).boundingBox())!;
  return { x: box.x + x / 1440 * box.width, y: box.y + y / 810 * box.height };
}

test('Carl-Otto’s bike ride and hide-and-seek by touch', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, '');
  await tap(page, 'choose-carl'); await tap(page, 'start-bike'); await tap(page, 'ride-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.bike().mode)).toBe('riding');
  await canvas(page).screenshot({ path: 'test-results/ipad-bike.png' });
  // A thumb held on the up arrow steers up the path.
  const y0 = await page.evaluate(() => window.__ringstorp.bike().y);
  const up = await ui(page, 1157 + 38, 631 + 34);
  await hold(page, up, up, async () => { await expect.poll(() => page.evaluate(() => window.__ringstorp.bike().y)).toBeLessThan(y0 - 5); });
  // Sound off and on, and back to the games.
  const muted = await page.evaluate(() => window.__ringstorp.music().muted);
  await tap(page, 'bike-sound');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.music().muted)).toBe(!muted);
  await tap(page, 'bike-sound');
  await tap(page, 'bike-menu');
  // Kurragömma: count, stop counting, walk with the arrow pad, and tap a hiding place to look in it.
  await tap(page, 'choose-carl'); await tap(page, 'start-hide');
  await tap(page, 'hide-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().mode)).toBe('counting');
  await tap(page, 'hide-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().mode)).toBe('seeking');
  const x0 = await page.evaluate(() => window.__ringstorp.hide().x);
  const right = await ui(page, 1320 + 40, 660 + 36);
  await hold(page, right, right, async () => { await expect.poll(() => page.evaluate(() => window.__ringstorp.hide().x)).toBeGreaterThan(x0 + 20); });
  const target = await page.evaluate(() => {
    const g = window.__ringstorp.hide(), cam = Math.max(0, Math.min(2560 - 960, g.x - 960 * 0.42));
    const i = g.spots.findIndex(s => !s.opened && s.x > cam + 60 && s.x < cam + 900);
    return { i, x: g.spots[i].x - cam };
  });
  await tapWorld(page, target.x, 405);
  await expect.poll(() => page.evaluate(i => window.__ringstorp.hide().spots[i].opened, target.i), { timeout: 10_000 }).toBe(true);
  await canvas(page).screenshot({ path: 'test-results/ipad-hide.png' });
  await tap(page, 'hide-sound');
  await tap(page, 'hide-menu');
  await expect(page.getByRole('heading', { name: 'Vad vill du spela?' })).toBeAttached();
});

test('Hemma by touch: the map, movie night and drawing with a finger', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'hemma');
  await tap(page, 'house-sound'); await tap(page, 'house-sound');
  await tap(page, 'room-living'); await tap(page, 'room-living');
  await tap(page, 'movie-primary');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().mode)).toBe('gathering');
  // A tap on the coffee table walks there and looks.
  const at = await page.evaluate(() => { const g = window.__ringstorp.movie(), cam = Math.max(0, Math.min(2200 - 960, g.x - 960 * 0.42)); return g.spots[1].x - cam; });
  await tapWorld(page, at, 400);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.movie().spots[1].opened), { timeout: 10_000 }).toBe(true);
  await canvas(page).screenshot({ path: 'test-results/ipad-movie.png' });
  await tap(page, 'movie-menu');
  await tap(page, 'room-hall'); await tap(page, 'play-pyssel');
  // A finger draws a wavy line, a sticker goes on, and the picture goes up.
  await swipe(page, Array.from({ length: 24 }, (_, i) => [120 + i * 18, 260 + Math.sin(i / 3) * 50] as [number, number]));
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().picture.strokes.length)).toBe(1);
  expect(await page.evaluate(() => window.__ringstorp.craft().picture.strokes[0].points.length)).toBeGreaterThan(10);
  await tap(page, 'sticker-fox'); await tapWorld(page, 500, 420);
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().picture.stickers.length)).toBe(1);
  await canvas(page).screenshot({ path: 'test-results/ipad-craft.png' });
  await tap(page, 'craft-hang');
  await expect(page.locator('#craft-panel-title')).toHaveText('Uppsatt!');
});

test('Godnatt by touch: toys dragged and tapped home, the piano, goodnight to the animals, lamp out', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'godnatt');
  const g = () => page.evaluate(() => { const r = window.__ringstorp.goodnight(); return { phase: r.phase, placed: r.toys.filter(t => t.placed).map(t => t.id), asleep: r.asleep.length, piano: r.piano, won: r.won, glow: r.glow?.id ?? null }; });
  const toys = await page.evaluate(() => window.__ringstorp.goodnight().toys.map(t => ({ id: t.id, at: t.at })));
  const homes: Record<string, [number, number]> = { engine: [886, 518], doll: [890, 440], lego: [150, 318], ball: [286, 418], book: [118, 190], dino: [612, 404] };
  await canvas(page).screenshot({ path: 'test-results/ipad-goodnight-mess.png' });
  // The Lego dragged up to its plate on the desk.
  const lego = toys.find(t => t.id === 'lego')!;
  await swipe(page, Array.from({ length: 12 }, (_, i) => [lego.at[0] + (homes.lego[0] - lego.at[0]) * i / 11, lego.at[1] + (homes.lego[1] - lego.at[1]) * i / 11] as [number, number]));
  await expect.poll(async () => (await g()).placed).toContain('lego');
  // The dinosaur dragged onto the shelf: it goes back to the rug, and its home lights up.
  const dino = toys.find(t => t.id === 'dino')!;
  await swipe(page, Array.from({ length: 12 }, (_, i) => [dino.at[0] + (homes.book[0] - dino.at[0]) * i / 11, dino.at[1] + (homes.book[1] - dino.at[1]) * i / 11] as [number, number]));
  expect((await g()).glow).toBe('dino');
  await canvas(page).screenshot({ path: 'test-results/ipad-goodnight-wrong.png' });
  // The rest only tapped: each hops home.
  for (const t of toys.filter(t => t.id !== 'lego')) { await page.waitForTimeout(150); const now = await page.evaluate(id => window.__ringstorp.goodnight().toys.find(x => x.id === id)!.at, t.id); await tapWorld(page, now[0], now[1] - 12); }
  await expect.poll(async () => (await g()).phase).toBe('bed');
  // The piano: a few keys, then playing along.
  await tap(page, 'goodnight-piano');
  await expect.poll(async () => (await g()).piano.open).toBe(true);
  for (const k of [0, 2, 4, 7]) await tap(page, `piano-key-${k}`);
  await tap(page, 'piano-along');
  for (const k of [0, 0, 4, 4, 5]) await tap(page, `piano-key-${k}`);
  expect((await g()).piano.next).toBe(5);
  await canvas(page).screenshot({ path: 'test-results/ipad-goodnight-piano.png' });
  await tap(page, 'piano-close');
  // Into bed, goodnight to each animal, and the lamp out.
  await tap(page, 'goodnight-bed');
  await expect.poll(async () => (await g()).phase).toBe('goodnight');
  for (const a of ['squirrel', 'hedgehog', 'fox', 'rabbit', 'badger']) await tap(page, `animal-${a}`);
  await expect.poll(async () => (await g()).phase, { message: await page.evaluate(() => window.__ringstorp.goodnight().asleep.map(a => a.id).join()) }).toBe('lamp');
  await canvas(page).screenshot({ path: 'test-results/ipad-goodnight-animals.png' });
  await tap(page, 'goodnight-lamp');
  await expect.poll(async () => (await g()).won, { timeout: 8000 }).toBe(true);
  await expect(page.locator('#goodnight-panel-title')).toHaveText('Sov gott, Carl-Otto!');
  await canvas(page).screenshot({ path: 'test-results/ipad-goodnight-night.png' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('carl-otto-hemma')!).done)).toEqual(['godnatt']);
});

test('God morgon by touch: curtains, tickles, Nallen on Mamma’s nose, eight bounces, then the bike to preschool', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'godmorgon');
  const g = () => page.evaluate(() => { const r = window.__ringstorp.morning(); return { phase: r.phase, woke: [...r.woke], bulbs: r.bulbs }; });
  await canvas(page).screenshot({ path: 'test-results/ipad-morning-asleep.png' });
  await tap(page, 'morning-curtains');
  for (let i = 0; i < 3; i++) await tap(page, 'morning-foot');
  await expect.poll(async () => (await g()).woke).toEqual(['curtains', 'tickle']);
  // Nallen dragged from the armchair onto Mamma's nose.
  await swipe(page, Array.from({ length: 14 }, (_, i) => [904 + (210 - 904) * i / 13, 384 + (318 - 384) * i / 13] as [number, number]));
  await expect.poll(async () => (await g()).phase).toBe('awake');
  await canvas(page).screenshot({ path: 'test-results/ipad-morning-awake.png' });
  await expect.poll(async () => (await g()).phase, { timeout: 6000 }).toBe('bounce');
  // Taps on the bed: a bounce each, a bulb lit each.
  for (let i = 0; i < 30 && (await g()).bulbs < 8; i++) { await tapWorld(page, 430, 260); await page.waitForTimeout(250); if (i === 6) await canvas(page).screenshot({ path: 'test-results/ipad-morning-bounce.png' }); }
  expect((await g()).bulbs).toBe(8);
  await expect.poll(async () => (await g()).phase, { timeout: 8000 }).toBe('ready');
  await expect(page.locator('#morning-panel-title')).toHaveText('God morgon, Carl-Otto!');
  await canvas(page).screenshot({ path: 'test-results/ipad-morning-ready.png' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('carl-otto-hemma')!).done)).toEqual(['godmorgon']);
  // Off to preschool: the bike ride begins.
  await tap(page, 'morning-bike');
  await expect(page.locator('#bike-panel-title')).toHaveText('Till förskolan');
});

test('Hemkomst by touch: shoes dragged and tapped onto the bench in pairs, the raincoat on its hook, then the craft corner', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'hemkomst');
  const g = () => page.evaluate(() => { const r = window.__ringstorp.homecoming(); return { left: r.left.map(t => t.id), pairs: r.pairs, glow: r.glow?.id ?? null, won: r.won }; });
  const where = (id: string) => page.evaluate(i => window.__ringstorp.homecoming().things.find(t => t.id === i)!.at, id);
  const line = (from: number[], to: number[]) => Array.from({ length: 12 }, (_, i) => [from[0] + (to[0] - from[0]) * i / 11, from[1] - 10 + (to[1] - from[1]) * i / 11] as [number, number]);
  await canvas(page).screenshot({ path: 'test-results/ipad-hall-mess.png' });
  // Pappa's left trainer dragged up onto the seat; then his right one dragged onto the sandals' place: back it goes.
  await swipe(page, line(await where('pappa-L'), [628, 372]));
  await expect.poll(async () => (await g()).left).not.toContain('pappa-L');
  await swipe(page, line(await where('pappa-R'), [818, 446]));
  expect((await g()).glow).toBe('pappa-R');
  await canvas(page).screenshot({ path: 'test-results/ipad-hall-wrong.png' });
  await page.waitForTimeout(700);
  // The raincoat dragged to the low hook.
  await swipe(page, line(await where('jacket'), [216, 258]));
  await expect.poll(async () => (await g()).left).not.toContain('jacket');
  // Everything else just tapped.
  for (let i = 0; i < 12 && (await g()).left.length; i++) { const id = (await g()).left[0], at = await where(id); await tapWorld(page, at[0], at[1] - 10); await page.waitForTimeout(250); }
  await expect.poll(async () => (await g()).pairs.length).toBe(4);
  await expect.poll(async () => (await g()).won, { timeout: 6000 }).toBe(true);
  await expect(page.locator('#homecoming-panel-title')).toHaveText('Välkommen hem!');
  await canvas(page).screenshot({ path: 'test-results/ipad-hall-done.png' });
  await tap(page, 'homecoming-craft');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.craft().mode)).toBe('drawing');
});

test('Duka bordet by touch: plates dragged to places, stacks tapped, candles lit, food served, then movie night', async ({ page }) => {
  test.setTimeout(60_000);
  await open(page, 'duka');
  const g = () => page.evaluate(() => { const r = window.__ringstorp.dining(); return { phase: r.phase, laid: r.laid.length, lit: r.lit, glow: r.glow?.ware ?? null }; });
  const line = (from: number[], to: number[]) => Array.from({ length: 12 }, (_, i) => [from[0] + (to[0] - from[0]) * i / 11, from[1] + (to[1] - from[1]) * i / 11] as [number, number]);
  await canvas(page).screenshot({ path: 'test-results/ipad-dining-empty.png' });
  // A plate dragged to Nallen's place at the end of the table; a glass dragged off to the window goes back.
  await swipe(page, line([372, 462], [734, 334]));
  await expect.poll(async () => (await g()).laid).toBe(1);
  await swipe(page, line([480, 462], [930, 200]));
  expect((await g()).glow).toBe('glass');
  await page.waitForTimeout(600);
  // The rest by tapping the stacks.
  for (let i = 0; i < 14 && (await g()).phase === 'set'; i++) { for (const x of [372, 480, 588]) { await tapWorld(page, x, 460); await page.waitForTimeout(120); } }
  await expect.poll(async () => (await g()).phase).toBe('candles');
  await canvas(page).screenshot({ path: 'test-results/ipad-dining-set.png' });
  for (let i = 0; i < 5; i++) await tap(page, 'dining-candles');
  await expect.poll(async () => (await g()).phase).toBe('serve');
  await tap(page, 'dining-food');
  await expect.poll(async () => (await g()).phase).toBe('eat');
  await page.waitForTimeout(900);
  await canvas(page).screenshot({ path: 'test-results/ipad-dining-eat.png' });
  await expect.poll(async () => (await g()).phase, { timeout: 8000 }).toBe('done');
  await expect(page.locator('#dining-panel-title')).toHaveText('Tack för maten!');
  await tap(page, 'dining-movie');
  await expect(page.locator('#movie-panel-title')).toHaveText('Filmkväll');
});

test('Tänder och tvål by touch: stool, soap, rubbing, bubbles, rinse, towel, then brushing the sugar bugs away', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'tander');
  const g = () => page.evaluate(() => { const r = window.__ringstorp.bath(); return { phase: r.phase, lather: r.lather, bubbles: r.bubbles.map(b => [b.x, b.y]), left: r.left.length }; });
  await canvas(page).screenshot({ path: 'test-results/ipad-bath-start.png' });
  await tap(page, 'bath-stool');
  await tap(page, 'bath-pump'); await tap(page, 'bath-pump');
  await expect.poll(async () => (await g()).phase).toBe('rub');
  // Rubbing back and forth over the hands.
  for (let i = 0; i < 6 && (await g()).phase === 'rub'; i++) await swipe(page, Array.from({ length: 24 }, (_, k) => [420 + (k % 2) * 120, 430 + (k % 3) * 8] as [number, number]));
  await expect.poll(async () => (await g()).phase).toBe('rinse');
  await canvas(page).screenshot({ path: 'test-results/ipad-bath-bubbles.png' });
  const bubble = (await g()).bubbles[0];
  if (bubble) await tapWorld(page, bubble[0], bubble[1] - 4);
  await tap(page, 'bath-tap');
  await expect.poll(async () => (await g()).phase, { timeout: 5000 }).toBe('dry');
  await tap(page, 'bath-towel'); await tap(page, 'bath-tube');
  await expect.poll(async () => (await g()).phase).toBe('brush');
  // A finger brushes over each bug in turn.
  const bugs = await page.evaluate(() => window.__ringstorp.bath().bugs.map(b => b.at));
  await swipe(page, [[bugs[0][0] - 14, bugs[0][1]], [bugs[0][0] - 6, bugs[0][1]]]);
  await canvas(page).screenshot({ path: 'test-results/ipad-bath-bugs.png' });
  for (const [bx, by] of bugs) await swipe(page, Array.from({ length: 16 }, (_, k) => [bx + (k % 2 ? 14 : -14), by + (k % 3) - 1] as [number, number]));
  await canvas(page).screenshot({ path: 'test-results/ipad-bath-brush.png' });
  for (let i = 0; i < 4 && (await g()).left > 0; i++) { const rest = await page.evaluate(() => window.__ringstorp.bath().left.map(b => b.at)); for (const [bx, by] of rest) await swipe(page, Array.from({ length: 16 }, (_, k) => [bx + (k % 2 ? 14 : -14), by] as [number, number])); }
  await expect.poll(async () => (await g()).phase).toBe('spit');
  await tap(page, 'bath-cup');
  await expect(page.locator('#bath-panel-title')).toHaveText('Rena tänder!');
  await canvas(page).screenshot({ path: 'test-results/ipad-bath-done.png' });
  await tap(page, 'bath-bed');
  await expect.poll(() => page.evaluate(() => window.__ringstorp.goodnight().phase)).toBe('tidy');
});

test('Fånig i spegeln by touch: a crown, star glasses and a moustache, a silly face, and a photo on the wall', async ({ page }) => {
  await open(page, 'spegel');
  for (const id of ['crown', 'stars', 'moustache', 'clown']) await tap(page, `wear-${id}`);
  await tap(page, 'silly-face');
  const worn = await page.evaluate(() => window.__ringstorp.silly().wearing);
  expect(worn.sort()).toEqual(['clown', 'crown', 'moustache', 'stars']);
  await canvas(page).screenshot({ path: 'test-results/ipad-silly.png' });
  await tap(page, 'silly-photo');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('carl-otto-hemma') ?? '{"done":[]}').done)).toEqual(['spegel']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('carl-otto-hemma')!).drawings.length)).toBe(1);
  await tap(page, 'silly-face'); await tap(page, 'wear-pirate');
  await canvas(page).screenshot({ path: 'test-results/ipad-silly-pirate.png' });
});
