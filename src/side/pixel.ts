// Crisp pixel-art drawing helpers for the side view. Everything snaps to whole pixels.

export type RGB = [number, number, number];
const clamp255 = (v: number) => v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
export function rgb(color: string): RGB { const n = parseInt(color.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function hex(c: RGB): string { return '#' + ((1 << 24) | (clamp255(c[0]) << 16) | (clamp255(c[1]) << 8) | clamp255(c[2])).toString(16).slice(1); }
export function shade(color: string, k: number): string { const c = rgb(color); return hex([c[0] * k, c[1] * k, c[2] * k]); }
export function mix(a: string, b: string, t: number): string {
  const p = rgb(a), q = rgb(b);
  return hex([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]);
}

/** A stable hash of two numbers into [0, 1). */
export function rand(x: number, y: number): number {
  let h = (Math.imul(Math.round(x) | 0, 374761393) + Math.imul(Math.round(y) | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Smooth value noise in [0, 1). */
export function noise(x: number, y = 0): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = rand(ix, iy), b = rand(ix + 1, iy), c = rand(ix, iy + 1), d = rand(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export const pick = <T,>(list: readonly T[], r: number): T => list[Math.min(list.length - 1, Math.floor(r * list.length))];

export function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** A filled disc drawn row by row, without anti-aliasing. */
export function disc(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  c.fillStyle = color;
  const x = Math.round(cx), y = Math.round(cy), R = Math.max(0.5, r);
  for (let dy = -Math.ceil(R); dy <= Math.ceil(R); dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.35);
    if (w > 0 || Math.abs(dy) < R) c.fillRect(x - w, y + dy, w * 2 + 1, 1);
  }
}
export function ellipse(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  c.fillStyle = color;
  const x = Math.round(cx), y = Math.round(cy);
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t <= 0) continue;
    const w = Math.round(rx * Math.sqrt(t));
    c.fillRect(x - w, y + dy, w * 2 + 1, 1);
  }
}

/** A thick line stamped with square pixels, for limbs and poles. */
export function seg(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  c.fillStyle = color;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const half = w / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    c.fillRect(Math.round(x0 + (x1 - x0) * t - half), Math.round(y0 + (y1 - y0) * t - half), Math.round(w), Math.round(w));
  }
}

/** A filled polygon; edges are soft only where they are not axis-aligned. */
export function poly(c: CanvasRenderingContext2D, points: Array<[number, number]>, color: string): void {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
  c.fill();
}

// ---------------------------------------------------------------- 3x5 pixel font

const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'], '-': ['...', '...', '###', '...', '...'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'], '·': ['...', '...', '.#.', '...', '...'], '.': ['...', '...', '...', '...', '.#.'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'], ':': ['...', '.#.', '...', '.#.', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'], '+': ['...', '.#.', '###', '.#.', '...'], '’': ['.#.', '#..', '...', '...', '...'],
  ' ': ['...', '...', '...', '...', '...'],
};
const ACCENTS: Record<string, [string, string]> = { Å: ['A', '.#.'], Ä: ['A', '#.#'], Ö: ['O', '#.#'], É: ['E', '..#'] };

export const textWidth = (text: string, scale = 1) => (text.length * 4 - 1) * scale;

/** Pixel text with its top-left at (x, y); diacritics sit on an extra row above. */
export function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, scale = 1): void {
  c.fillStyle = color;
  const x0 = Math.round(x), y0 = Math.round(y);
  [...value.toUpperCase()].forEach((ch, i) => {
    const accent = ACCENTS[ch];
    const rows = GLYPHS[accent ? accent[0] : ch] ?? GLYPHS[' '];
    const gx = x0 + i * 4 * scale;
    rows.forEach((row, r) => { for (let k = 0; k < 3; k++) if (row[k] === '#') c.fillRect(gx + k * scale, y0 + r * scale, scale, scale); });
    if (accent) for (let k = 0; k < 3; k++) if (accent[1][k] === '#') c.fillRect(gx + k * scale, y0 - 2 * scale, scale, scale);
  });
}
