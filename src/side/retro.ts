// The retro finish: a frame drawn at one pixel per logical pixel is snapped to a limited palette through a 4×4 ordered
// (Bayer) dither. Flat areas stay flat; gradients, glows and soft shadows become the banded, dithered steps of console
// pixel art. The snap itself runs on the GPU (src/play/world/retro-shader.ts); this module holds the palette maths, which is
// pure and unit-tested, and the median-cut used to seed palettes from real frames.

export type Colour = [number, number, number];

/** How the shader and `Palette.nearest` measure colour distance: the "redmean" weighting, close to perception. */
export function distance(a: Colour, b: Colour): number {
  const rm = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

/** The 4×4 Bayer threshold for a pixel, in [-0.5, 0.5): the same formula the shader uses. */
export function bayer(x: number, y: number): number {
  const b2 = (ax: number, ay: number) => { ax = Math.floor(ax); ay = Math.floor(ay); const v = ax * 0.5 + ay * ay * 0.75; return v - Math.floor(v); };
  return b2(x * 0.5, y * 0.5) * 0.25 + b2(x, y) + 1 / 32 - 0.5;
}

export const MAX_COLOURS = 64;

export class Palette {
  readonly colours: readonly Colour[];

  constructor(hexes: readonly string[]) {
    if (hexes.length === 0 || hexes.length > MAX_COLOURS) throw new Error(`A palette needs 1 to ${MAX_COLOURS} colours`);
    this.colours = hexes.map(parse);
  }

  /** The index of the palette colour nearest to (r, g, b). */
  nearest(r: number, g: number, b: number): number {
    let best = 0, bestD = Infinity;
    this.colours.forEach((p, i) => { const d = distance([r, g, b], p); if (d < bestD) { bestD = d; best = i; } });
    return best;
  }

  /** What one pixel becomes: its colour pushed by the dither threshold at (x, y), then snapped. */
  snap(r: number, g: number, b: number, x: number, y: number, spread: number): Colour {
    const d = bayer(x, y) * spread;
    return this.colours[this.nearest(r + d, g + d, b + d)];
  }

  /** The colours as a flat 0–1 RGB array, padded to MAX_COLOURS, for the shader's uniform. */
  uniform(): Float32Array {
    const out = new Float32Array(MAX_COLOURS * 3);
    this.colours.forEach(([r, g, b], i) => out.set([r / 255, g / 255, b / 255], i * 3));
    return out;
  }
}

function parse(hex: string): Colour {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
export const toHex = ([r, g, b]: Colour): string => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);

/**
 * Median-cut: `count` representative colours of a set of RGBA pixels (transparent ones ignored). Used by
 * scripts/extract-palette.mjs to seed the hand-tuned palettes in palettes.ts from real frames.
 */
export function medianCut(data: Uint8ClampedArray, count: number): Colour[] {
  const pixels: Colour[] = [];
  for (let o = 0; o < data.length; o += 4) if (data[o + 3] > 200) pixels.push([data[o], data[o + 1], data[o + 2]]);
  let boxes: Colour[][] = [pixels];
  while (boxes.length < count) {
    // Split the box with the widest channel range, weighted by how many pixels it holds.
    let pick = -1, score = -1, channel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255, hi = 0;
        for (const p of box) { if (p[ch] < lo) lo = p[ch]; if (p[ch] > hi) hi = p[ch]; }
        const s = (hi - lo) * Math.sqrt(box.length);
        if (s > score) { score = s; pick = i; channel = ch; }
      }
    });
    if (pick < 0 || score <= 0) break;
    const box = boxes[pick].sort((a, b) => a[channel] - b[channel]), mid = box.length >> 1;
    boxes = [...boxes.slice(0, pick), box.slice(0, mid), box.slice(mid), ...boxes.slice(pick + 1)];
  }
  return boxes.filter(b => b.length).map(box => {
    const sum = box.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]);
    return sum.map(v => Math.round(v / box.length)) as Colour;
  });
}
