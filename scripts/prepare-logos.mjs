// Turns the supplied brand images into the small transparent PNGs the smooth art uses (src/play/assets/logos/).
//
//   node scripts/prepare-logos.mjs <folder holding ica.png, bildeve.png>
//
// ica.png       red ICA wordmark on white          -> ica.png (background removed, trimmed, 256 px wide)
// bildeve.png   blue italic wordmark with alpha    -> bildeve.png (trimmed, 320 px wide)
//
// It runs the image work in Chrome (through Playwright), so it needs no image library. Re-run it only if the sources change.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const from = resolve(process.argv[2] ?? '.');
const out = resolve(import.meta.dirname, '..', 'src', 'play', 'assets', 'logos');
mkdirSync(out, { recursive: true });
const dataUrl = name => `data:image/png;base64,${readFileSync(join(from, name)).toString('base64')}`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
const results = await page.evaluate(async sources => {
  const load = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  const pixels = image => {
    const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(image, 0, 0);
    return { c, x, data: x.getImageData(0, 0, c.width, c.height) };
  };
  const bounds = (data, w, h, keep) => {
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (keep(data.data, (y * w + x) * 4)) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  /** Trim to `box` and scale to `width`, smoothing with the browser's best filter in two halving steps. */
  const scaled = (canvas, box, width) => {
    let cur = document.createElement('canvas'); cur.width = box.w; cur.height = box.h;
    cur.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    const height = Math.round(box.h * width / box.w);
    while (cur.width / 2 > width) {
      const half = document.createElement('canvas'); half.width = Math.round(cur.width / 2); half.height = Math.round(cur.height / 2);
      const hx = half.getContext('2d'); hx.imageSmoothingQuality = 'high'; hx.drawImage(cur, 0, 0, half.width, half.height); cur = half;
    }
    const end = document.createElement('canvas'); end.width = width; end.height = height;
    const ex = end.getContext('2d'); ex.imageSmoothingQuality = 'high'; ex.drawImage(cur, 0, 0, width, height);
    return end;
  };
  const png = canvas => canvas.toDataURL('image/png');
  const done = {};

  // ICA: red on white. Alpha is how far the green channel is from white; the colour is the logo's own red.
  {
    const { c, x, data } = pixels(await load(sources.ica));
    let red = [234, 29, 7], lowest = 255;
    for (let i = 0; i < data.data.length; i += 4) if (data.data[i + 1] < lowest) { lowest = data.data[i + 1]; red = [data.data[i], data.data[i + 1], data.data[i + 2]]; }
    for (let i = 0; i < data.data.length; i += 4) {
      const a = Math.max(0, Math.min(1, (255 - data.data[i + 1]) / (255 - red[1])));
      data.data[i] = red[0]; data.data[i + 1] = red[1]; data.data[i + 2] = red[2]; data.data[i + 3] = Math.round(a * 255);
    }
    x.putImageData(data, 0, 0);
    done['ica.png'] = png(scaled(c, bounds(data, c.width, c.height, (d, i) => d[i + 3] > 20), 256));
  }

  // Bildeve: blue on an opaque white ground despite the alpha channel. Key the white out by how far red is from white.
  {
    const { c, x, data } = pixels(await load(sources.bildeve));
    let blue = [43, 68, 148], lowest = 255;
    for (let i = 0; i < data.data.length; i += 4) if (data.data[i + 3] > 250 && data.data[i] < lowest) { lowest = data.data[i]; blue = [data.data[i], data.data[i + 1], data.data[i + 2]]; }
    for (let i = 0; i < data.data.length; i += 4) {
      const a = Math.max(0, Math.min(1, (255 - data.data[i]) / (255 - blue[0]))) * (data.data[i + 3] / 255);
      data.data[i] = blue[0]; data.data[i + 1] = blue[1]; data.data[i + 2] = blue[2]; data.data[i + 3] = Math.round(a * 255);
    }
    x.putImageData(data, 0, 0);
    done['bildeve.png'] = png(scaled(c, bounds(data, c.width, c.height, (d, i) => d[i + 3] > 20), 320));
  }

  return done;
}, { ica: dataUrl('ica.png'), bildeve: dataUrl('bildeve.png') });
await browser.close();

for (const [name, url] of Object.entries(results)) {
  const file = join(out, name);
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', file);
}
