// Seeds the retro palettes (src/side/palettes.ts) from real frames: it plays each level (the snap happens in the shader, so
// the world canvas itself holds the raw 480x270 frame), samples it at several places, and median-cuts the colours. The result is a starting point to
// tune by hand, not something to regenerate on every art change.
//
//   npm run dev:test          (in another terminal)
//   node scripts/extract-palette.mjs [dayCount=56] [nightCount=48] [interiorCount=40]
//
// Colours are counted once per distinct 5-bit value and weighted by count^0.35, so small but important colours (faces,
// signs, the red "?") are not drowned out by sky and asphalt.
import { chromium } from '@playwright/test';

const [day = 56, night = 48, interior = 40] = process.argv.slice(2).map(Number);
const base = 'http://127.0.0.1:5173/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function sample(level, positions, setup) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
  await page.addInitScript(() => localStorage.setItem('ringstorp-lang', 'sv'));
  await page.goto(`${base}?game=ringstorp&start=${level}&seed=3`);
  await page.waitForFunction(() => window.__ringstorp, null, { timeout: 30_000 });
  await page.evaluate(() => window.__ringstorp.ready);
  const frames = [];
  for (const at of positions) {
    const data = await page.evaluate(([at, setup]) => {
      const r = window.__ringstorp, g = r.sim;
      if (setup) new Function('g', setup)(g);
      if (at !== null) { g.camera = Math.max(0, Math.min(g.stage.length - 480, at)); g.player.x = g.camera + 200; }
      r.step(1 / 60, 20);
      const canvas = r.game.textures.get('world-canvas').getSourceImage();
      return Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
    }, [at, setup]);
    frames.push(data);
  }
  await page.close();
  return frames;
}

async function palette(frames, count) {
  const page = await browser.newPage();
  await page.goto(base);
  const result = await page.evaluate(async ([frames, count]) => {
    const { medianCut, toHex } = await import('/src/side/retro.ts');
    const hist = new Map();
    for (const f of frames) for (let o = 0; o < f.length; o += 4) {
      const key = (f[o] >> 3) << 10 | (f[o + 1] >> 3) << 5 | (f[o + 2] >> 3);
      const h = hist.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      h.n++; h.r += f[o]; h.g += f[o + 1]; h.b += f[o + 2]; hist.set(key, h);
    }
    const weighted = [];
    for (const h of hist.values()) {
      const c = [h.r / h.n, h.g / h.n, h.b / h.n].map(Math.round);
      for (let k = Math.ceil(Math.pow(h.n, 0.35)); k > 0; k--) weighted.push(c[0], c[1], c[2], 255);
    }
    return medianCut(new Uint8ClampedArray(weighted), count).map(toHex);
  }, [frames, count]);
  await page.close();
  return result;
}

const spots = [0, 700, 1400, 2200, 3000, 3900, 4800, 5600];
const dayFrames = [...await sample(1, spots), ...await sample(2, spots.slice(0, 5))];
const nightFrames = await sample(3, [0, 1500, 3000, 4500, 6000, 7500, 9000, 10500]);
const interiorFrames = [
  ...await sample(2, [null], "g.gods.scene = 'lobby'"),
  ...await sample(2, [null], "g.gods.scene = 'cabin'"),
  ...await sample(2, [null], "g.gods.scene = 'floor'; g.gods.floor = 8"),
];
const out = { DAY: await palette(dayFrames, day), NIGHT: await palette(nightFrames, night), INTERIOR: await palette(interiorFrames, interior) };
for (const [name, list] of Object.entries(out)) console.log(`const ${name}: string[] = [\n  ${list.map(h => `'${h}'`).join(', ')},\n];`);
await browser.close();
