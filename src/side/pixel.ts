// Drawing helpers for the side view. By default ('pixel' mode) everything snaps to whole pixels, crisp pixel art.
// The Phaser build switches to 'smooth' mode: the same calls in the same 480x270 logical coordinates, but drawn as
// anti-aliased vector shapes onto a context that `beginArt` has scaled up (3x by default).

export type RGB = [number, number, number];

// 'retro' is the smooth art drawn at one device pixel per logical pixel, then snapped to a palette (see retro.ts): the
// detailed shading and lighting of the smooth build, shown as chunky pixel art. It takes every smooth-only branch.
export type ArtMode = 'pixel' | 'smooth' | 'retro';
let smooth = false;
let retro = false;
/** A page runs in one mode. The legacy game and the pilot never call this and stay pixel-exact. */
export function setArtMode(mode: ArtMode): void { smooth = mode !== 'pixel'; retro = mode === 'retro'; }
export const isSmooth = (): boolean => smooth;
export const isRetro = (): boolean => retro;
/** A stroke width for smooth-only art: in retro mode never thinner than one pixel, so hairlines stay solid lines. */
export const px = (w: number): number => retro ? Math.max(1, w) : w;

const scales = new WeakMap<CanvasRenderingContext2D, number>();
/** Prepares `c` to be drawn on in logical coordinates at `scale` device pixels per logical pixel. */
export function beginArt(c: CanvasRenderingContext2D, scale: number): void {
  c.setTransform(scale, 0, 0, scale, 0, 0);
  scales.set(c, scale);
}
const scaleOf = (c: CanvasRenderingContext2D): number => scales.get(c) ?? 1;
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
  if (smooth) {
    // Snap each edge to the device grid so neighbouring rects abut without seams.
    const S = scaleOf(c);
    const x0 = Math.round(x * S) / S, y0 = Math.round(y * S) / S;
    c.fillRect(x0, y0, Math.round((x + w) * S) / S - x0, Math.round((y + h) * S) / S - y0);
    return;
  }
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** A filled disc: drawn row by row without anti-aliasing in pixel mode, a true circle in smooth mode. */
export function disc(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  c.fillStyle = color;
  if (smooth) {
    // The pixel version is centred on a pixel and reaches about 0.4 beyond r.
    c.beginPath();
    c.arc(Math.round(cx) + 0.5, Math.round(cy) + 0.5, Math.max(0.5, r) + 0.4, 0, Math.PI * 2);
    c.fill();
    return;
  }
  const x = Math.round(cx), y = Math.round(cy), R = Math.max(0.5, r);
  for (let dy = -Math.ceil(R); dy <= Math.ceil(R); dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.35);
    if (w > 0 || Math.abs(dy) < R) c.fillRect(x - w, y + dy, w * 2 + 1, 1);
  }
}
export function ellipse(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string): void {
  c.fillStyle = color;
  if (smooth) {
    c.beginPath();
    c.ellipse(Math.round(cx) + 0.5, Math.round(cy) + 0.5, rx + 0.5, ry + 0.5, 0, 0, Math.PI * 2);
    c.fill();
    return;
  }
  const x = Math.round(cx), y = Math.round(cy);
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t <= 0) continue;
    const w = Math.round(rx * Math.sqrt(t));
    c.fillRect(x - w, y + dy, w * 2 + 1, 1);
  }
}

/** A thick line, for limbs and poles: stamped with square pixels in pixel mode, stroked in smooth mode. */
export function seg(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  if (smooth) {
    // Stamped squares centre on the pixel grid when the width is odd; match that so silhouettes agree.
    const o = Math.round(w) % 2 === 1 ? 0.5 : 0;
    c.strokeStyle = color;
    c.lineWidth = w;
    c.lineCap = x0 === x1 || y0 === y1 ? 'square' : 'round';
    c.beginPath();
    c.moveTo(x0 + o, y0 + o);
    c.lineTo(x1 + o, y1 + o);
    c.stroke();
    return;
  }
  c.fillStyle = color;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const half = w / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    c.fillRect(Math.round(x0 + (x1 - x0) * t - half), Math.round(y0 + (y1 - y0) * t - half), Math.round(w), Math.round(w));
  }
}

/** A filled polygon; edges are soft only where they are not axis-aligned. */
export function poly(c: CanvasRenderingContext2D, points: Array<[number, number]>, color: string | CanvasGradient | CanvasPattern): void {
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
  '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'], '*': ['#.#', '.#.', '###', '.#.', '#.#'], '#': ['#.#', '###', '#.#', '###', '#.#'],
  ',': ['...', '...', '...', '.#.', '#..'], ';': ['...', '.#.', '...', '.#.', '#..'], '(': ['.#.', '#..', '#..', '#..', '.#.'], ')': ['.#.', '..#', '..#', '..#', '.#.'],
  "'": ['.#.', '.#.', '...', '...', '...'], '"': ['#.#', '#.#', '...', '...', '...'], '%': ['#.#', '..#', '.#.', '#..', '#.#'], '=': ['...', '###', '...', '###', '...'],
  ' ': ['...', '...', '...', '...', '...'],
};
const ACCENTS: Record<string, [string, string]> = { Å: ['A', '.#.'], Ä: ['A', '#.#'], Ö: ['O', '#.#'], É: ['E', '..#'] };

// Smooth mode sets text in a real font. The pixel font is 5 rows tall, so a caller's `scale` fixes the cap height at
// 5*scale logical pixels and the font size follows from the font's own cap-height ratio.
let artFont = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
const capRatios = new Map<string, number>();
let scratch: CanvasRenderingContext2D | null = null;
const scratchContext = (): CanvasRenderingContext2D => scratch ??= document.createElement('canvas').getContext('2d')!;

/** Chooses the font stack for smooth-mode text. Call after the fonts have loaded, and before anything is baked. */
export function setArtFont(stack: string): void { artFont = stack; capRatios.clear(); }

function capRatio(): number {
  let ratio = capRatios.get(artFont);
  if (ratio === undefined) {
    const s = scratchContext();
    s.font = `700 100px ${artFont}`;
    ratio = s.measureText('H').actualBoundingBoxAscent / 100 || 0.7;
    capRatios.set(artFont, ratio);
  }
  return ratio;
}
const fontFor = (scale: number): string => `700 ${(5 * scale) / capRatio()}px ${artFont}`;

export const textWidth = (text: string, scale = 1): number => {
  if (!smooth || retro) return (text.length * 4 - 1) * scale;
  const s = scratchContext();
  s.font = fontFor(scale);
  return s.measureText(text.toUpperCase()).width;
};

/** Text with its top-left at (x, y): 3x5 pixel glyphs in pixel mode (diacritics on an extra row above), a real font in smooth mode. */
export function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, color: string, scale = 1, maxWidth?: number): void {
  c.fillStyle = color;
  if (smooth && !retro) {
    c.font = fontFor(scale);
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    c.fillText(value.toUpperCase(), x, y + 5 * scale, maxWidth);
    return;
  }
  const x0 = Math.round(x), y0 = Math.round(y);
  [...value.toUpperCase()].forEach((ch, i) => {
    const accent = ACCENTS[ch];
    const rows = GLYPHS[accent ? accent[0] : ch] ?? GLYPHS[' '];
    const gx = x0 + i * 4 * scale;
    rows.forEach((row, r) => { for (let k = 0; k < 3; k++) if (row[k] === '#') c.fillRect(gx + k * scale, y0 + r * scale, scale, scale); });
    if (accent) for (let k = 0; k < 3; k++) if (accent[1][k] === '#') c.fillRect(gx + k * scale, y0 - 2 * scale, scale, scale);
  });
}

// ---------------------------------------------------------------- smooth-mode helpers

export type Stops = ReadonlyArray<readonly [number, string]>;
function withStops(g: CanvasGradient, stops: Stops): CanvasGradient {
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}
/** Gradients for smooth mode; positions are in the context's logical coordinates. */
export const vgrad = (c: CanvasRenderingContext2D, y0: number, y1: number, stops: Stops): CanvasGradient => withStops(c.createLinearGradient(0, y0, 0, y1), stops);
export const hgrad = (c: CanvasRenderingContext2D, x0: number, x1: number, stops: Stops): CanvasGradient => withStops(c.createLinearGradient(x0, 0, x1, 0), stops);
export const rgrad = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: Stops): CanvasGradient => withStops(c.createRadialGradient(cx, cy, 0, cx, cy, r), stops);

/** A rect in any fill style, without rounding to the pixel grid. */
export function fill(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: string | CanvasGradient | CanvasPattern): void {
  c.fillStyle = style;
  c.fillRect(x, y, w, h);
}

let grainTile: HTMLCanvasElement | null = null;
function makeGrainTile(): HTMLCanvasElement {
  const size = 128, tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const t = tile.getContext('2d')!;
  const image = t.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const r = rand(i % size, Math.floor(i / size)), v = r > 0.5 ? 255 : 0;
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = Math.abs(r - 0.5) * 2 * 255;
  }
  t.putImageData(image, 0, 0);
  return tile;
}

/**
 * Fine surface grain over a rect: light and dark specks one device pixel across, so plaster, asphalt and paving read as
 * material without the blocky dots that 1x1 logical pixels become at 3x. The pattern is anchored in world space, so
 * neighbouring chunks agree where they overlap. Does nothing in pixel mode.
 */
export function grain(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number): void {
  if (!smooth || retro) return;
  const pattern = c.createPattern(grainTile ??= makeGrainTile(), 'repeat');
  if (!pattern) return;
  pattern.setTransform(new DOMMatrix().scale(1 / scaleOf(c)));
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = pattern;
  c.fillRect(x, y, w, h);
  c.restore();
}

/** `#rrggbb` with an opacity, as an rgba() string. */
export function alpha(color: string, a: number): string {
  const [r, g, b] = rgb(color);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
