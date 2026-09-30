import { describe, expect, it } from 'vitest';
import { MAX_COLOURS, Palette, bayer, distance, medianCut, toHex } from '../src/side/retro';
import { paletteFor } from '../src/side/palettes';

describe('retro palette maths', () => {
  it('the 4×4 Bayer matrix holds 16 distinct, evenly spaced thresholds centred on zero', () => {
    const values = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) values.push(bayer(x, y));
    const sorted = [...values].sort((a, b) => a - b);
    expect(new Set(values).size).toBe(16);
    sorted.forEach((v, i) => expect(v).toBeCloseTo((i + 0.5) / 16 - 0.5, 10));
    expect(bayer(5, 6)).toBe(bayer(1, 2));
  });

  it('snaps to the nearest colour, weighting green most as the eye does', () => {
    const p = new Palette(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']);
    expect(p.nearest(250, 245, 240)).toBe(1);
    expect(p.nearest(200, 30, 20)).toBe(2);
    expect(distance([0, 40, 0], [0, 0, 0])).toBeGreaterThan(distance([40, 0, 0], [0, 0, 0]));
  });

  it('a flat colour on a palette entry stays flat, while a colour between two entries dithers between them', () => {
    const p = new Palette(['#404040', '#808080']);
    const flat = new Set<string>(), mid = new Set<string>();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      flat.add(toHex(p.snap(0x40, 0x40, 0x40, x, y, 10)));
      mid.add(toHex(p.snap(0x60, 0x60, 0x60, x, y, 80)));
    }
    expect([...flat]).toEqual(['#404040']);
    expect([...mid].sort()).toEqual(['#404040', '#808080']);
  });

  it('packs colours for the shader and refuses palettes it cannot hold', () => {
    const u = new Palette(['#ff8000']).uniform();
    expect(u.length).toBe(MAX_COLOURS * 3);
    expect([...u.slice(0, 3)].map(v => Math.round(v * 255))).toEqual([255, 128, 0]);
    expect(() => new Palette([])).toThrow();
    expect(() => new Palette(Array(MAX_COLOURS + 1).fill('#000000'))).toThrow();
  });

  it('median-cut finds the separate colour groups in a set of pixels', () => {
    const px: number[] = [];
    for (let i = 0; i < 50; i++) px.push(250, 10 + (i % 3), 10, 255, 10, 10, 240 + (i % 5), 255);
    const colours = medianCut(new Uint8ClampedArray(px), 2).map(([r, , b]) => r > b ? 'red' : 'blue').sort();
    expect(colours).toEqual(['blue', 'red']);
  });

  it('every game palette fits the shader', () => {
    for (const lighting of ['day', 'night', 'interior', 'bike', 'yard'] as const) {
      const { palette, spread } = paletteFor(lighting);
      expect(palette.colours.length).toBeLessThanOrEqual(MAX_COLOURS);
      expect(spread).toBeGreaterThan(0);
    }
  });
});
