import type { BikeRun } from './bike-run';

// Carl-Otto's ride, drawn as a storybook illustration in the 960 × 540 world. The sun sits high on the right, so every
// shape is lit from the upper right and shaded towards the lower left. Everything that does not animate is baked once into
// sprites and tileable strips (at the scene's 1.5× draw scale); a frame is a few dozen image blits plus the cyclist and the
// apples, which are drawn live.

type C = CanvasRenderingContext2D;
type Pt = [number, number];
const W = 960;
const TAU = Math.PI * 2;
const BAKE = 1.5;
const INK = '#2b3936';
const SUN: Pt = [785, 119];

// ---------------------------------------------------------------- helpers

/** A small seeded generator, so every bake draws the same leaves and pebbles. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgb = (hex: string): [number, number, number] => { const n = parseInt(hex.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
function mix(a: string, b: string, t: number): string {
  const p = rgb(a), q = rgb(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const rgba = (hex: string, a: number) => { const [r, g, b] = rgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };

function vgrad(c: C, y0: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = c.createLinearGradient(0, y0, 0, y1); for (const [at, col] of stops) g.addColorStop(at, col); return g;
}
function hgrad(c: C, x0: number, x1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = c.createLinearGradient(x0, 0, x1, 0); for (const [at, col] of stops) g.addColorStop(at, col); return g;
}
function rgrad(c: C, x: number, y: number, r: number, stops: Array<[number, string]>, x0 = x, y0 = y): CanvasGradient {
  const g = c.createRadialGradient(x0, y0, 0, x, y, r); for (const [at, col] of stops) g.addColorStop(at, col); return g;
}

function path(c: C, points: Pt[], close = false): void {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (close) c.closePath();
}
function stroke(c: C, color: string, width: number): void {
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function line(c: C, color: string, width: number, points: Pt[]): void { path(c, points); stroke(c, color, width); }
function oval(c: C, fill: string | CanvasGradient, x: number, y: number, rx: number, ry: number, rotation = 0): void {
  c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, TAU); c.fill();
}
function box(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0): void {
  c.fillStyle = fill; c.beginPath(); if (r) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fill();
}
/** A soft, round contact shadow. */
function softShadow(c: C, x: number, y: number, rx: number, ry: number, strength = 0.32): void {
  c.save(); c.translate(x, y); c.scale(rx, ry);
  c.fillStyle = rgrad(c, 0, 0, 1, [[0, `rgba(48, 58, 34, ${strength})`], [0.6, `rgba(48, 58, 34, ${strength * 0.5})`], [1, 'rgba(48, 58, 34, 0)']]);
  c.fillRect(-1, -1, 2, 2); c.restore();
}
/** A closed, scalloped outline around an ellipse: foliage, bushes and clouds. */
function lumps(c: C, cx: number, cy: number, rx: number, ry: number, count: number, rand: () => number, depth = 0.16): void {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i + rand() * 0.4) / count * TAU, k = 1 - rand() * depth;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < count; i++) {
    const p = pts[i], q = pts[(i + 1) % count];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, bulge = 0.5 + rand() * 0.35;
    const nx = mx - cx, ny = my - cy, len = Math.hypot(nx, ny) || 1;
    const out = Math.hypot(q[0] - p[0], q[1] - p[1]) * bulge * 0.6;
    c.quadraticCurveTo(mx + nx / len * out, my + ny / len * out, q[0], q[1]);
  }
  c.closePath();
}

interface Sprite { canvas: HTMLCanvasElement; ox: number; oy: number; w: number; h: number }
/** Bakes a drawing whose local origin is (ox, oy) inside a w × h box. */
function bake(w: number, h: number, ox: number, oy: number, draw: (c: C) => void): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * BAKE); canvas.height = Math.ceil(h * BAKE);
  const c = canvas.getContext('2d')!;
  c.scale(BAKE, BAKE); c.translate(ox, oy); draw(c);
  return { canvas, ox, oy, w, h };
}
const put = (c: C, s: Sprite, x: number, y: number, scale = 1) =>
  c.drawImage(s.canvas, x - s.ox * scale, y - s.oy * scale, s.w * scale, s.h * scale);

/**
 * A strip that repeats every `period` pixels. `draw` is called at −period, 0 and +period so shapes that cross the seam
 * are whole on both sides, and the bake is 2 px wider than the period so neighbouring copies overlap.
 */
function strip(period: number, top: number, height: number, draw: (c: C) => void): Sprite {
  return bake(period + 2, height, 0, -top, c => {
    c.save(); c.beginPath(); c.rect(0, top, period + 2, height); c.clip();
    for (const dx of [-period, 0, period]) { c.save(); c.translate(dx, 0); draw(c); c.restore(); }
    c.restore();
  });
}
function tile(c: C, s: Sprite, offset: number): void {
  const period = s.w - 2, top = -s.oy;
  for (let x = -(((offset % period) + period) % period); x < W; x += period) c.drawImage(s.canvas, x, top, s.w, s.h);
}

// ---------------------------------------------------------------- sky and landscape

function paintSky(c: C): void {
  c.fillStyle = vgrad(c, 0, 400, [[0, '#6fb4d2'], [0.45, '#a9d6df'], [0.8, '#e3ecd6'], [1, '#f7ecc6']]);
  c.fillRect(0, 0, W, 400);
  c.fillStyle = rgrad(c, SUN[0], SUN[1], 420, [[0, 'rgba(255, 246, 214, 0.75)'], [0.25, 'rgba(255, 238, 196, 0.32)'], [1, 'rgba(255, 238, 196, 0)']]);
  c.fillRect(0, 0, W, 400);
  oval(c, rgrad(c, SUN[0], SUN[1], 46, [[0, '#fffdf2'], [0.7, '#fff5cf'], [1, 'rgba(255, 240, 190, 0)']]), SUN[0], SUN[1], 46, 46);
  oval(c, '#fffbea', SUN[0], SUN[1], 30, 30);
}

function paintCloud(c: C, seed: number, w: number, h: number): void {
  const rand = seeded(seed), puffs: Array<[number, number, number]> = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6, x = (t - 0.5) * w, bump = Math.sin(t * Math.PI);
    puffs.push([x + (rand() - 0.5) * 10, -bump * h * (0.55 + rand() * 0.4), h * (0.35 + bump * 0.45 + rand() * 0.15)]);
  }
  // Shaded underside first, then the sunlit body a little higher, then highlights on the upper right of each puff.
  c.fillStyle = '#d3dde3';
  for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x - 3, y + 4, r, 0, TAU); c.fill(); }
  box(c, '#d3dde3', -w / 2, -2, w, h * 0.35, h * 0.17);
  c.fillStyle = vgrad(c, -h * 1.2, h * 0.3, [[0, '#ffffff'], [0.7, '#f5f7f4'], [1, '#e6ecec']]);
  for (const [x, y, r] of puffs) { c.beginPath(); c.arc(x, y, r * 0.94, 0, TAU); c.fill(); }
  for (const [x, y, r] of puffs) oval(c, 'rgba(255, 253, 240, 0.8)', x + r * 0.25, y - r * 0.3, r * 0.5, r * 0.38);
}

/** A periodic hill line: sums of whole sine waves, so the strip tiles. */
const ridge = (period: number, base: number, waves: Array<[number, number, number]>) => (x: number) =>
  base + waves.reduce((y, [k, amp, phase]) => y + Math.sin(x / period * TAU * k + phase) * amp, 0);

function hillPath(c: C, period: number, f: (x: number) => number, bottom: number): void {
  c.beginPath(); c.moveTo(-4, bottom);
  for (let x = -4; x <= period + 4; x += 6) c.lineTo(x, f(x));
  c.lineTo(period + 4, bottom); c.closePath();
}

const FAR = 1400, MID = 1200, NEAR = 900;

function paintFar(c: C): void {
  const f = ridge(FAR, 300, [[1, 12, 0.4], [3, 7, 1.9], [7, 3, 0.2]]);
  hillPath(c, FAR, f, 400);
  c.fillStyle = vgrad(c, 270, 360, [[0, '#a8c6b3'], [1, '#b6ceae']]); c.fill();
  const rand = seeded(11);
  // A distant tree line along the ridge, and far-off red farmhouses with a white church.
  for (let x = 0; x < FAR; x += 9 + rand() * 18) {
    if (rand() < 0.35) continue;
    const r = 5 + rand() * 7;
    oval(c, rand() < 0.5 ? '#98b9a4' : '#8fb29f', x, f(x) - r * 0.4, r, r * 0.8);
  }
  for (const [hx, kind] of [[190, 'farm'], [520, 'church'], [930, 'farm'], [1180, 'farm']] as const) {
    const y = f(hx) + 6;
    if (kind === 'church') {
      box(c, '#e7e6dc', hx - 12, y - 12, 26, 12); box(c, '#e7e6dc', hx + 10, y - 28, 9, 28);
      path(c, [[hx + 9, y - 28], [hx + 14.5, y - 40], [hx + 20, y - 28]], true); c.fillStyle = '#8f9e9a'; c.fill();
      path(c, [[hx - 14, y - 12], [hx - 1, y - 20], [hx + 12, y - 12]], true); c.fillStyle = '#a3a7a0'; c.fill();
    } else {
      box(c, '#c98f7f', hx - 14, y - 9, 28, 9);
      path(c, [[hx - 16, y - 9], [hx, y - 17], [hx + 16, y - 9]], true); c.fillStyle = '#8f8f88'; c.fill();
      box(c, '#e9e3d5', hx - 14, y - 9, 2, 9); box(c, '#e9e3d5', hx + 12, y - 9, 2, 9);
    }
  }
  // Haze lifts the far hills into the sky.
  c.fillStyle = vgrad(c, 260, 400, [[0, 'rgba(236, 240, 222, 0.35)'], [1, 'rgba(236, 240, 222, 0.1)']]);
  hillPath(c, FAR, f, 400); c.fill();
}

function paintMid(c: C): void {
  const f = ridge(MID, 326, [[1, 14, 2.2], [2, 9, 0.7], [5, 4, 1.1]]);
  hillPath(c, MID, f, 400);
  c.fillStyle = vgrad(c, 300, 390, [[0, '#a9c27f'], [1, '#98b46e']]); c.fill();
  c.save(); hillPath(c, MID, f, 400); c.clip();
  // Fields in patches, divided by hedgerows that follow the slope.
  const rand = seeded(23), fields = ['#bcc27c', '#a6bf73', '#b1c178', '#c7c987', '#9fb86d'];
  let x = 0;
  while (x < MID) {
    const w = 110 + rand() * 170, col = fields[Math.floor(rand() * fields.length)];
    path(c, [[x, f(x) + 6], [x + w, f(x + w) + 6], [x + w + 40, 400], [x - 30, 400]], true);
    c.fillStyle = col; c.fill();
    if (col === '#c7c987' || col === '#bcc27c') for (let k = 0; k < 6; k++) {
      const yy = 350 + k * 8;
      line(c, rgba('#a89f5e', 0.25), 1.2, [[x - 20, yy], [x + w + 20, yy - 4]]);
    }
    // Hedgerow on the field's right edge.
    for (let y = f(x + w) + 4; y < 400; y += 5) oval(c, '#7f9e5e', x + w + (y - f(x + w)) * 0.4, y, 5, 4);
    x += w;
  }
  c.restore();
  for (let tx = 20; tx < MID; tx += 60 + rand() * 90) {
    const y = f(tx) + 2, r = 9 + rand() * 6;
    oval(c, '#6f8f55', tx - 2, y - r * 0.6 + 2, r, r * 0.85);
    oval(c, '#86a664', tx + 1, y - r * 0.8, r * 0.75, r * 0.6);
    softShadow(c, tx - 4, y + 1, r, 2.2, 0.2);
  }
  c.fillStyle = 'rgba(232, 238, 214, 0.18)'; hillPath(c, MID, f, 400); c.fill();
}

function paintNear(c: C): void {
  const f = ridge(NEAR, 360, [[1, 5, 0.9], [3, 3, 2.4]]);
  hillPath(c, NEAR, f, 402);
  c.fillStyle = vgrad(c, 350, 400, [[0, '#a2bb70'], [1, '#8eaa5c']]); c.fill();
  const rand = seeded(37);
  for (let x = 30; x < NEAR; x += 90 + rand() * 120) {
    const y = f(x) + 8, r = 14 + rand() * 12;
    lumps(c, x, y - r * 0.5, r * 1.4, r * 0.8, 9, rand, 0.12);
    c.fillStyle = rgrad(c, x, y - r * 0.4, r * 1.6, [[0, '#9dba67'], [1, '#6f9049']], x + r * 0.5, y - r); c.fill();
    stroke(c, rgba('#4f6b37', 0.5), 1.2);
  }
  // Mown grass texture: short soft strokes, lighter toward the sun.
  for (let i = 0; i < 260; i++) {
    const x = rand() * NEAR, y = f(x) + 6 + rand() * (400 - f(x) - 6);
    line(c, rand() < 0.5 ? 'rgba(186, 205, 128, 0.55)' : 'rgba(108, 140, 70, 0.4)', 1, [[x, y], [x + 1.5, y - 3]]);
  }
}

// ---------------------------------------------------------------- trees and apples

function paintApple(c: C): void {
  const body = () => {
    c.beginPath(); c.moveTo(0, -6);
    c.bezierCurveTo(4, -10, 11, -8, 11, 0); c.bezierCurveTo(11, 8, 5, 12, 0, 10);
    c.bezierCurveTo(-5, 12, -11, 8, -11, 0); c.bezierCurveTo(-11, -8, -4, -10, 0, -6); c.closePath();
  };
  body();
  c.fillStyle = rgrad(c, 0, 1, 14, [[0, '#ff8b62'], [0.45, '#e2432f'], [0.85, '#b02a22'], [1, '#8f211c']], 5, -3); c.fill();
  c.save(); body(); c.clip();
  oval(c, 'rgba(240, 180, 70, 0.35)', -7, 5, 6, 5);
  c.restore();
  body(); stroke(c, '#6d1d18', 1.3);
  oval(c, 'rgba(255, 244, 228, 0.85)', 5, -3, 2.4, 3.4, 0.5);
  line(c, '#5b3f28', 2, [[0, -6], [1.5, -13]]);
  c.save(); c.translate(3, -11); c.rotate(-0.5);
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, -4.5, 10, 0); c.quadraticCurveTo(5, 4.5, 0, 0);
  c.fillStyle = hgrad(c, 0, 10, [[0, '#4f7a30'], [1, '#86b04a']]); c.fill(); stroke(c, '#34521f', 0.8);
  line(c, '#a5c96a', 0.6, [[1, 0], [8.5, 0]]);
  c.restore();
}

interface Canopy { x: number; y: number; rx: number; ry: number }

function paintTree(c: C, seed: number): void {
  const rand = seeded(seed);
  softShadow(c, -8, 2, 78, 11, 0.36);
  // Trunk: a tapered, bark-shaded stem that forks into the crown.
  const trunk = () => {
    c.beginPath(); c.moveTo(-14, 2);
    c.bezierCurveTo(-8, -30, -12, -70, -6, -104); c.lineTo(-34, -150); c.lineTo(-26, -155); c.lineTo(-1, -118);
    c.lineTo(2, -165); c.lineTo(10, -165); c.lineTo(9, -118); c.lineTo(38, -146); c.lineTo(44, -139);
    c.bezierCurveTo(22, -114, 10, -90, 12, -60); c.bezierCurveTo(12, -30, 10, -10, 16, 2); c.closePath();
  };
  trunk(); c.fillStyle = hgrad(c, -16, 18, [[0, '#4e3d2d'], [0.55, '#7a6146'], [1, '#a2835e']]); c.fill();
  c.save(); trunk(); c.clip();
  for (let i = 0; i < 9; i++) {
    const x = -10 + rand() * 20;
    line(c, 'rgba(52, 38, 26, 0.45)', 1, [[x, -4], [x + rand() * 4 - 2, -30 - rand() * 50]]);
  }
  line(c, 'rgba(210, 180, 130, 0.35)', 2, [[11, -6], [9, -80]]);
  c.restore();
  trunk(); stroke(c, '#3a2c20', 1.4);
  // Grass around the root.
  for (let i = 0; i < 18; i++) {
    const x = -26 + i * 3 + rand() * 2, h = 5 + rand() * 7;
    line(c, i % 2 ? '#6d9044' : '#8fb05a', 1.4, [[x, 3], [x + (rand() - 0.4) * 5, 3 - h]]);
  }

  const clusters: Canopy[] = [
    { x: -48, y: -150, rx: 46, ry: 38 }, { x: 44, y: -150, rx: 50, ry: 40 }, { x: -6, y: -185, rx: 58, ry: 44 },
    { x: -28, y: -130, rx: 40, ry: 30 }, { x: 22, y: -128, rx: 44, ry: 30 }, { x: 4, y: -158, rx: 52, ry: 38 },
  ].map(k => ({ x: k.x + (rand() - 0.5) * 8, y: k.y + (rand() - 0.5) * 6, rx: k.rx * (0.92 + rand() * 0.16), ry: k.ry * (0.92 + rand() * 0.16) }));
  clusters.forEach((k, i) => {
    const back = i < 3, base = back ? '#557536' : '#62853d', lit = back ? '#86a650' : '#a3c05f', dark = back ? '#3c5a28' : '#46672d';
    lumps(c, k.x, k.y, k.rx, k.ry, 11, rand, 0.12);
    c.fillStyle = rgrad(c, k.x, k.y, Math.max(k.rx, k.ry) * 1.3, [[0, lit], [0.5, base], [1, dark]], k.x + k.rx * 0.4, k.y - k.ry * 0.5);
    c.fill();
    stroke(c, rgba('#2f4a1f', 0.55), 1.5);
    // Leaf texture: light leaves on the sunlit upper right, dark ones in the shaded lower left.
    for (let n = 0; n < 34; n++) {
      const a = rand() * TAU, d = Math.sqrt(rand()) * 0.85;
      const lx = k.x + Math.cos(a) * k.rx * d, ly = k.y + Math.sin(a) * k.ry * d;
      const light = (Math.cos(a) * d - Math.sin(a) * d) * 0.5 + 0.5 + (rand() - 0.5) * 0.4;
      oval(c, light > 0.62 ? rgba('#c7dc84', 0.7) : light < 0.38 ? rgba('#2f4d22', 0.45) : rgba(base, 0.8), lx, ly, 3.2, 1.8, rand() * Math.PI);
    }
  });
  // Apples hang in the crown, most on the outer, lit side.
  for (let n = 0; n < 9; n++) {
    const k = clusters[3 + (n % 3)] ?? clusters[n % clusters.length], a = -0.4 + rand() * 2.6, d = 0.35 + rand() * 0.5;
    c.save(); c.translate(k.x + Math.cos(a) * k.rx * d, k.y + Math.sin(a) * k.ry * d); c.scale(0.62, 0.62); paintApple(c); c.restore();
  }
  // A couple of windfalls in the grass.
  for (const [ax, ay] of [[-38, 2], [30, 4]] as const) { c.save(); c.translate(ax, ay - 4); c.scale(0.55, 0.55); c.rotate(1.2); paintApple(c); c.restore(); }
}

/** Dappled shade from a tree's crown, cast across the path toward the lower left. */
function paintDapple(c: C, seed: number): void {
  const rand = seeded(seed);
  c.fillStyle = 'rgba(92, 84, 48, 0.14)';
  lumps(c, 0, 0, 92, 18, 14, rand, 0.3); c.fill();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) oval(c, 'rgba(0,0,0,0.7)', (rand() - 0.5) * 150, (rand() - 0.5) * 26, 3 + rand() * 7, 1.5 + rand() * 3);
  c.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- the path and the verges

const ROAD = 480, FORE = 600;

function paintRoad(c: C): void {
  c.fillStyle = vgrad(c, 396, 498, [[0, '#e3cb98'], [0.35, '#dcc08b'], [1, '#c8aa76']]);
  c.fillRect(0, 396, ROAD, 102);
  const rand = seeded(51);
  // Two paler, packed tracks where wheels and feet have worn the gravel smooth.
  for (const [y, h] of [[420, 14], [458, 16]] as const) {
    c.fillStyle = vgrad(c, y - h, y + h, [[0, 'rgba(240, 222, 178, 0)'], [0.5, 'rgba(240, 222, 178, 0.55)'], [1, 'rgba(240, 222, 178, 0)']]);
    c.fillRect(0, y - h, ROAD, h * 2);
  }
  for (let i = 0; i < 900; i++) {
    const x = rand() * ROAD, y = 398 + rand() * 98, r = 0.6 + rand() * rand() * 2.4;
    const tone = rand();
    oval(c, tone < 0.45 ? rgba('#a88d5f', 0.55) : tone < 0.8 ? rgba('#f4e5c1', 0.65) : rgba('#8c7a64', 0.6), x, y, r * 1.3, r * 0.8);
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * ROAD, y = 404 + rand() * 88, r = 1.8 + rand() * 2.2;
    oval(c, 'rgba(90, 72, 44, 0.35)', x - 0.6, y + 0.9, r * 1.2, r * 0.7);
    oval(c, rand() < 0.5 ? '#cdbb9c' : '#b9a58a', x, y, r * 1.2, r * 0.75);
    oval(c, 'rgba(255, 250, 235, 0.7)', x + r * 0.3, y - r * 0.25, r * 0.5, r * 0.3);
  }
  // The near verge casts a soft shadow onto the path; the far verge overhangs it with grass.
  c.fillStyle = vgrad(c, 484, 498, [[0, 'rgba(90, 76, 44, 0)'], [1, 'rgba(90, 76, 44, 0.3)']]); c.fillRect(0, 484, ROAD, 14);
  c.fillStyle = vgrad(c, 396, 410, [[0, 'rgba(96, 110, 52, 0.45)'], [1, 'rgba(96, 110, 52, 0)']]); c.fillRect(0, 396, ROAD, 14);
  for (let x = 0; x < ROAD; x += 2.2) {
    const h = 3 + rand() * 8;
    line(c, rand() < 0.5 ? '#88a755' : '#6f9044', 1.3, [[x, 399], [x + (rand() - 0.3) * 4, 399 - h + 4]]);
  }
}

function flower(c: C, x: number, y: number, petals: string, heart: string, r: number): void {
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; oval(c, petals, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, r * 0.8, r * 0.55, a); }
  oval(c, heart, x, y, r * 0.6, r * 0.55);
}

function paintFore(c: C): void {
  const rand = seeded(67);
  c.fillStyle = vgrad(c, 494, 540, [[0, '#8aa957'], [1, '#5f8338']]);
  c.fillRect(0, 494, FORE, 46);
  for (let x = 0; x < FORE; x += 1.8) {
    const h = 10 + rand() * 22, lean = (rand() - 0.35) * 9, base = 510 + rand() * 30;
    c.beginPath(); c.moveTo(x - 1.2, base); c.quadraticCurveTo(x + lean * 0.3, base - h * 0.6, x + lean, base - h);
    c.quadraticCurveTo(x + lean * 0.3 + 1, base - h * 0.5, x + 1.2, base); c.closePath();
    c.fillStyle = rand() < 0.2 ? '#a7c46a' : rand() < 0.5 ? '#77994a' : '#5d8237'; c.fill();
  }
  for (let i = 0; i < 16; i++) {
    const x = rand() * FORE, y = 505 + rand() * 20;
    line(c, '#5d8237', 1.4, [[x, y + 20], [x + 2, y]]);
    if (i % 3) flower(c, x + 2, y, '#fbf7e8', '#f2c230', 3.2);
    else { oval(c, '#f4c93a', x + 2, y, 4.2, 3.6); oval(c, '#fbe27a', x + 3, y - 1, 2, 1.6); }
  }
}

// ---------------------------------------------------------------- buildings

function window4(c: C, x: number, y: number, w: number, h: number, frame: string, trim: string): void {
  box(c, trim, x - 4, y - 4, w + 8, h + 8, 1.5);
  box(c, vgrad(c, y, y + h, [[0, '#cfe7ea'], [0.5, '#9fc6cf'], [1, '#6f97a3']]), x, y, w, h);
  // A sky reflection and a diagonal glint, with the reveal's shadow at the top and left.
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  path(c, [[x + w * 0.15, y + h], [x + w * 0.55, y], [x + w * 0.75, y], [x + w * 0.35, y + h]], true);
  c.fillStyle = 'rgba(255, 255, 255, 0.35)'; c.fill();
  box(c, 'rgba(30, 50, 55, 0.3)', x, y, w, 4); box(c, 'rgba(30, 50, 55, 0.22)', x, y, 3, h);
  c.restore();
  box(c, frame, x + w / 2 - 1.5, y, 3, h); box(c, frame, x, y + h * 0.45 - 1.5, w, 3);
  box(c, rgba('#000000', 0.18), x - 5, y + h + 4, w + 10, 2);
}

function paintHome(c: C): void {
  // Low white garages under flat roofs, a dark timber fence and the family car's space; from the house reference.
  softShadow(c, 170, 110, 220, 14, 0.4);
  const wall = (x: number, w: number) => box(c, hgrad(c, x, x + w, [[0, '#dcdccb'], [0.6, '#eeede0'], [1, '#f8f6ea']]), x, 0, w, 109);
  wall(0, 340);
  // Render texture: very faint horizontal courses.
  for (let y = 8; y < 109; y += 9) box(c, 'rgba(160, 160, 140, 0.12)', 0, y, 340, 1);
  box(c, vgrad(c, 0, 14, [[0, 'rgba(60, 64, 58, 0.4)'], [1, 'rgba(60, 64, 58, 0)']]), 0, 6, 340, 14);
  // Roof fascia with a lit top edge.
  box(c, '#6c756f', -6, -8, 352, 10, 2); box(c, '#9aa39c', -6, -8, 352, 2.5, 1); box(c, '#4e5652', -6, 0, 352, 2);
  window4(c, 14, 20, 82, 38, '#eeeee2', '#c9cfc3');
  // A flower box under the window.
  box(c, '#8b6a48', 10, 64, 90, 7, 2);
  for (let i = 0; i < 9; i++) flower(c, 16 + i * 10, 62, i % 2 ? '#e2544a' : '#f2d060', '#fff2c6', 2.4);
  for (let i = 0; i < 2; i++) {
    const x = 135 + i * 101;
    box(c, '#c6ccc0', x - 3, 17, 90, 92, 1);
    box(c, vgrad(c, 20, 109, [[0, '#c3cbc0'], [1, '#aeb8ac']]), x, 20, 84, 89);
    for (let j = 0; j < 10; j++) {
      box(c, 'rgba(255, 255, 255, 0.55)', x + 2, 22 + j * 8.7, 80, 1.3);
      box(c, 'rgba(70, 80, 72, 0.25)', x + 2, 28 + j * 8.7, 80, 1.3);
    }
    box(c, vgrad(c, 20, 32, [[0, 'rgba(40, 48, 44, 0.35)'], [1, 'rgba(40, 48, 44, 0)']]), x, 20, 84, 12);
    box(c, '#7f8a83', x + 36, 88, 12, 3, 1);
  }
  // Downpipe and a wall lamp.
  box(c, '#8d968f', 330, 0, 4, 109); box(c, '#b8c0b9', 331, 0, 1, 109);
  box(c, '#39413e', 118, 30, 8, 12, 2); oval(c, 'rgba(255, 236, 170, 0.8)', 122, 38, 2.5, 2.5);
  // Shrubs against the wall.
  const rand = seeded(5);
  for (const [bx, r] of [[112, 16], [226, 10], [322, 14]] as const) {
    lumps(c, bx, 104 - r * 0.6, r * 1.2, r * 0.8, 9, rand, 0.14);
    c.fillStyle = rgrad(c, bx, 100, r * 1.5, [[0, '#8fb35c'], [1, '#4f7434']], bx + r * 0.4, 100 - r); c.fill(); stroke(c, rgba('#2f4a1f', 0.5), 1.2);
  }
  // Timber fence: individually shaded boards on two rails, in front of the house.
  const fy = 79;
  box(c, '#6d5d45', -67, fy + 18, 166, 4); box(c, '#6d5d45', -67, fy + 36, 166, 4);
  for (let i = 0; i < 16; i++) {
    const x = -65 + i * 10, top = fy + (i % 3);
    box(c, hgrad(c, x, x + 7, [[0, '#8a7a5d'], [0.6, '#b3a37f'], [1, '#c6b893']]), x, top, 7.5, 46 - (i % 3));
    path(c, [[x, top], [x + 3.75, top - 3], [x + 7.5, top]], true); c.fillStyle = '#c8ba95'; c.fill();
    box(c, 'rgba(60, 48, 30, 0.35)', x + 7.5, top, 1.5, 46);
  }
  softShadow(c, 16, fy + 47, 90, 5, 0.35);
  // Mailbox on its post.
  box(c, '#6d5d45', 108, fy + 12, 4, 36); box(c, '#2f6fa3', 101, fy + 2, 18, 12, 3); box(c, '#5b9ccf', 101, fy + 2, 18, 3, 2);
}

function paintPreschool(c: C): void {
  // One low, flat-roofed building. All facade and trim surfaces stay solid red.
  softShadow(c, 196, 114, 232, 14, 0.4);
  const facade = () => { c.beginPath(); c.rect(0, 7, 388, 107); };
  facade(); c.fillStyle = hgrad(c, 0, 388, [[0, '#ad3a30'], [0.55, '#c04439'], [1, '#cc4f42']]); c.fill();
  // Vertical board-and-batten panelling, each batten lit on its right.
  c.save(); facade(); c.clip();
  for (let x = 4; x < 388; x += 9) { box(c, 'rgba(90, 22, 18, 0.28)', x, 7, 1.4, 107); box(c, 'rgba(255, 170, 150, 0.16)', x + 1.4, 7, 1, 107); }
  box(c, vgrad(c, 7, 30, [[0, 'rgba(60, 12, 10, 0.5)'], [1, 'rgba(60, 12, 10, 0)']]), 0, 7, 388, 23);
  box(c, vgrad(c, 95, 114, [[0, 'rgba(60, 12, 10, 0)'], [1, 'rgba(60, 12, 10, 0.3)']]), 0, 95, 388, 19);
  c.restore();
  // Gable end in shade.
  box(c, hgrad(c, 388, 408, [[0, '#8a2e27'], [1, '#9b352e']]), 388, 11, 20, 103);
  for (let x = 391; x < 408; x += 6) box(c, 'rgba(60, 14, 12, 0.3)', x, 11, 1.2, 103);
  // Roof fascia.
  box(c, '#7f2c26', -7, 0, 420, 10, 2); box(c, '#b04a3f', -7, 0, 420, 2.5, 1); box(c, '#5e1f1b', -7, 9, 420, 2);
  for (const wx of [20, 88, 236, 304]) {
    window4(c, wx, 35, 49, 45, '#a63b32', '#92362d');
    // Children's paper cut-outs on the glass.
    const rand = seeded(wx);
    const cols = ['#f4c84a', '#7cc0e8', '#f08aa0', '#9fd070'];
    for (let k = 0; k < 2; k++) {
      const px = wx + 6 + rand() * 30, py = 40 + rand() * 30, col = cols[Math.floor(rand() * 4)];
      if (k === 0) flower(c, px + 4, py + 4, col, '#fff4cc', 2.6); else oval(c, col, px + 4, py + 4, 4.5, 4.5);
    }
  }
  // Door with a glazed panel, handle and a lamp.
  box(c, '#7e2a25', 160, 27, 58, 87, 2);
  box(c, vgrad(c, 31, 114, [[0, '#9a332d'], [1, '#86302a']]), 164, 31, 50, 83);
  box(c, vgrad(c, 39, 79, [[0, '#cfe6e4'], [1, '#86b1b1']]), 172, 39, 33, 40, 1.5);
  path(c, [[176, 79], [190, 39], [197, 39], [183, 79]], true); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fill();
  oval(c, '#f3cf7c', 204, 92, 2.8, 2.8); oval(c, '#b8923f', 204.6, 92.6, 1.2, 1.2);
  box(c, '#3a2522', 224, 36, 8, 12, 2); oval(c, 'rgba(255, 234, 170, 0.85)', 228, 44, 2.6, 2.6);
  c.fillStyle = '#fff0cf'; c.font = 'bold 13px "Barlow Condensed", "IBM Plex Sans", sans-serif'; c.textAlign = 'center';
  c.fillStyle = 'rgba(70, 14, 12, 0.35)'; c.fillText('FÖRSKOLAN', 190, 24); c.fillStyle = '#fff0cf'; c.fillText('FÖRSKOLAN', 189, 23);
  c.textAlign = 'left';
  // Tulips, a sandpit with a bucket and a parked kick-scooter make the destination welcoming.
  for (let i = 0; i < 6; i++) {
    const x = 18 + i * 12;
    line(c, '#4f8540', 2, [[x, 114], [x, 97]]);
    oval(c, '#4f8540', x + 3, 108, 4, 1.6, -0.6);
    c.beginPath(); c.moveTo(x - 4, 94); c.lineTo(x - 4, 89); c.lineTo(x - 1.5, 92); c.lineTo(x, 88); c.lineTo(x + 1.5, 92); c.lineTo(x + 4, 89); c.lineTo(x + 4, 94);
    c.quadraticCurveTo(x, 100, x - 4, 94); c.fillStyle = ['#f2c14c', '#e8574a', '#f39ab0'][i % 3]; c.fill(); stroke(c, rgba('#5b2a1a', 0.4), 0.8);
  }
  box(c, '#b58d5e', 254, 104, 56, 12, 3); box(c, '#ead3a0', 257, 104, 50, 5, 2);
  path(c, [[270, 104], [273, 95], [282, 95], [285, 104]], true); c.fillStyle = '#48a0d8'; c.fill(); stroke(c, '#2c6d98', 0.8);
  line(c, '#2c6d98', 1, [[272, 96], [277, 90], [284, 96]]);
  line(c, '#e0a840', 4, [[328, 108], [351, 108], [353, 86], [346, 86]]);
  line(c, '#9a9fa0', 2.5, [[343, 86], [357, 86]]);
  for (const x of [328, 352]) { oval(c, '#2f3a3a', x, 112, 4.6, 4.6); oval(c, '#a6b2b0', x, 112, 1.8, 1.8); }
}

// ---------------------------------------------------------------- Carl-Otto

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Two-bone IK: the knee (or elbow) between `root` and `end`, bent toward +x. */
function joint(root: Pt, end: Pt, upper: number, lower: number): Pt {
  const dx = end[0] - root[0], dy = end[1] - root[1], d = Math.min(Math.hypot(dx, dy), upper + lower - 0.01);
  const base = Math.atan2(dy, dx), a = Math.acos(Math.max(-1, Math.min(1, (upper * upper + d * d - lower * lower) / (2 * upper * d))));
  return [root[0] + Math.cos(base - a) * upper, root[1] + Math.sin(base - a) * upper];
}
/** A limb as an outlined, round-capped tube. */
function limb(c: C, points: Pt[], width: number, fill: string, outline = INK): void {
  line(c, outline, width + 3.2, points); line(c, fill, width, points);
}

function wheel(c: C, x: number, y: number, spin: number): void {
  oval(c, INK, x, y, 23, 23);
  oval(c, '#343d3b', x, y, 21.4, 21.4);
  oval(c, 'rgba(236, 240, 226, 0.92)', x, y, 16.6, 16.6);
  c.beginPath(); c.arc(x, y, 17.3, 0, TAU); stroke(c, '#c8d1cd', 2.4);
  c.beginPath(); c.arc(x, y, 17.3, -1.4, -0.2); stroke(c, '#f4f8f5', 1.2);
  c.beginPath(); c.arc(x, y, 20.6, -1.3, -0.1); stroke(c, '#56615e', 1.3);
  for (let i = 0; i < 12; i++) {
    const a = spin + i * Math.PI / 6;
    line(c, 'rgba(128, 142, 138, 0.8)', 0.8, [[x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5], [x + Math.cos(a + 0.35) * 16.4, y + Math.sin(a + 0.35) * 16.4]]);
  }
  oval(c, '#6f7b78', x, y, 3.6, 3.6); oval(c, '#b9c4c0', x + 0.8, y - 0.8, 1.4, 1.4);
}

export function cyclist(c: C, x: number, y: number, time: number, scale = 1): void {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  softShadow(c, -2, 2, 60, 8, 0.42);
  const spin = time * 8, bob = Math.sin(spin * 2) * 0.7;
  const rear: Pt = [-32, -21], front: Pt = [34, -21], crank: Pt = [1, -22], seat: Pt = [-13, -51], head: Pt = [21, -50];
  const pedal = (k: number): Pt => [crank[0] + Math.cos(spin + k) * 9, crank[1] + Math.sin(spin + k) * 9];
  const hip: Pt = [-11, -58 + bob], shoulder: Pt = [3, -91 + bob], grip: Pt = [28, -65];

  const leg = (foot: Pt, trousers: string, shoe: string) => {
    const knee = joint(hip, foot, 23.5, 23.5);
    limb(c, [hip, knee, foot], 10, trousers);
    line(c, rgba('#ffffff', 0.12), 2, [lerp(hip, knee, 0.2), lerp(hip, knee, 0.85)]);
    c.save(); c.translate(foot[0], foot[1]);
    c.beginPath(); c.moveTo(-5, -3.5); c.quadraticCurveTo(0, -6, 5, -3); c.quadraticCurveTo(10, -2, 10, 1.5); c.lineTo(-6, 1.5); c.closePath();
    c.fillStyle = shoe; c.fill(); stroke(c, INK, 1.6);
    line(c, '#3f86c4', 1.4, [[-1, -3.8], [5, -1.6]]); box(c, '#5d6765', -6, 1.2, 16, 1.8, 0.8);
    c.restore();
  };
  const crankArm = (foot: Pt) => {
    line(c, INK, 5, [crank, foot]); line(c, '#8f9a97', 2.6, [crank, foot]);
    box(c, '#39413f', foot[0] - 5, foot[1] - 1.5, 10, 3, 1);
  };

  // The far leg and crank, in shade behind the bike.
  const far = pedal(Math.PI), near = pedal(0);
  crankArm(far); leg(far, '#46534d', '#c9c5b3');
  wheel(c, rear[0], rear[1], spin); wheel(c, front[0], front[1], spin);

  // Frame: every tube outlined first, then painted, so the joints read as one piece.
  const tubes: Pt[][] = [[rear, seat], [seat, head], [rear, crank], [crank, seat], [crank, [20, -45]], [head, front], [head, [19, -61]], [[17, -62], grip]];
  for (const t of tubes) line(c, INK, 7.5, t);
  line(c, '#3f4a47', 4, [[17, -62], grip]);
  for (const t of tubes.slice(0, 6)) line(c, '#2f8b77', 4.6, t);
  line(c, '#5c6663', 3.6, [head, [19, -61]]);
  for (const t of tubes.slice(0, 6)) line(c, rgba('#8fe0c8', 0.55), 1.2, [[t[0][0] + 0.6, t[0][1] - 1.2], [t[1][0] + 0.6, t[1][1] - 1.2]]);
  // Mudguard, chainring, chain and a rear reflector.
  c.beginPath(); c.arc(rear[0], rear[1], 25, Math.PI * 1.05, Math.PI * 1.62); stroke(c, INK, 4.4);
  c.beginPath(); c.arc(rear[0], rear[1], 25, Math.PI * 1.05, Math.PI * 1.62); stroke(c, '#d9ddd6', 2.4);
  oval(c, INK, crank[0], crank[1], 7.2, 7.2); oval(c, '#9aa4a1', crank[0], crank[1], 5.8, 5.8); oval(c, '#5b6462', crank[0], crank[1], 2.4, 2.4);
  c.setLineDash([1.6, 1.2]); line(c, '#4c5553', 1.4, [[crank[0], crank[1] - 5.8], [rear[0], rear[1] - 3]]); line(c, '#4c5553', 1.4, [[crank[0], crank[1] + 5.8], [rear[0], rear[1] + 3]]); c.setLineDash([]);
  box(c, '#e0512f', -45, -45, 5, 7, 1.5); box(c, 'rgba(255, 220, 190, 0.8)', -44, -44, 1.5, 3);
  // Saddle.
  c.beginPath(); c.moveTo(-23, -54); c.quadraticCurveTo(-15, -58, -3, -55); c.quadraticCurveTo(-4, -51, -12, -51); c.quadraticCurveTo(-22, -50, -23, -54);
  c.fillStyle = '#3c3431'; c.fill(); stroke(c, INK, 1.4);
  line(c, 'rgba(255,255,255,0.25)', 1, [[-19, -55.5], [-8, -56]]);

  // The near leg and crank.
  crankArm(near); leg(near, '#6b7a72', '#efebdc');

  // Dark outdoor jacket with subtle camouflage patches, as in the reference.
  const torso = () => {
    c.beginPath(); c.moveTo(hip[0] - 8, hip[1] + 2);
    c.bezierCurveTo(hip[0] - 13, hip[1] - 14, shoulder[0] - 16, shoulder[1] + 10, shoulder[0] - 8, shoulder[1] - 3);
    c.quadraticCurveTo(shoulder[0] + 2, shoulder[1] - 7, shoulder[0] + 10, shoulder[1] + 1);
    c.bezierCurveTo(shoulder[0] + 15, shoulder[1] + 12, hip[0] + 13, hip[1] - 12, hip[0] + 7, hip[1] + 3);
    c.closePath();
  };
  torso(); c.fillStyle = hgrad(c, hip[0] - 14, shoulder[0] + 14, [[0, '#2c3530'], [0.55, '#3d4940'], [1, '#56634f']]); c.fill();
  c.save(); torso(); c.clip();
  for (const [px, py, rx, ry, col] of [[-14, -80, 6, 4, '#58644d'], [-2, -70, 7, 3.5, '#27302b'], [6, -84, 5, 3, '#65705a'], [-10, -64, 5, 3, '#4c5745'], [8, -66, 4, 3, '#2b342f']] as const)
    oval(c, rgba(col, 0.75), px, py + bob, rx, ry, 0.5);
  line(c, rgba('#1c2320', 0.6), 1.4, [[shoulder[0] + 7, shoulder[1] + 4], [hip[0] + 9, hip[1] - 2]]);
  box(c, rgba('#1c2320', 0.4), hip[0] - 14, hip[1] - 5, 30, 5);
  c.restore();
  torso(); stroke(c, INK, 2);
  // Collar.
  c.beginPath(); c.moveTo(shoulder[0] - 7, shoulder[1] - 2); c.quadraticCurveTo(shoulder[0] + 1, shoulder[1] + 4, shoulder[0] + 9, shoulder[1]);
  c.lineTo(shoulder[0] + 7, shoulder[1] - 5); c.quadraticCurveTo(shoulder[0], shoulder[1] - 2, shoulder[0] - 6, shoulder[1] - 6); c.closePath();
  c.fillStyle = '#4a5647'; c.fill(); stroke(c, INK, 1.4);

  // Head: a round child's face turned to the right, under the helmet.
  const hx = 7, hy = -108 + bob;
  c.save(); c.translate(hx, hy);
  const face = () => {
    c.beginPath(); c.moveTo(-14, -2); c.bezierCurveTo(-15, -14, -2, -19, 8, -16);
    c.bezierCurveTo(14, -13, 16, -8, 15.5, -4); c.quadraticCurveTo(19.5, -1, 16, 2.5);
    c.bezierCurveTo(16, 10, 9, 15, 1, 14.5); c.bezierCurveTo(-8, 14, -14, 8, -14, -2); c.closePath();
  };
  face(); c.fillStyle = rgrad(c, 2, 0, 20, [[0, '#f8d4ae'], [0.6, '#f0c197'], [1, '#d99c73']], 9, -4); c.fill();
  face(); stroke(c, INK, 1.8);
  // Blond hair peeking out behind the ear and over the brow.
  c.beginPath(); c.moveTo(-14, -6); c.quadraticCurveTo(-17, 3, -12, 8); c.quadraticCurveTo(-10, 2, -7, 1); c.quadraticCurveTo(-9, -4, -7, -8); c.closePath();
  c.fillStyle = '#e1b95c'; c.fill(); stroke(c, '#8f6a2b', 1);
  c.beginPath(); c.moveTo(6, -11); c.quadraticCurveTo(12, -9, 15, -5); c.quadraticCurveTo(10, -6, 8, -4); c.closePath(); c.fillStyle = '#e8c56c'; c.fill();
  oval(c, '#e6ab83', -4, 1, 3.6, 4.6); line(c, '#b77e5a', 1, [[-5, -1], [-3, 1], [-4.6, 3]]);
  oval(c, INK, 9.5, -2, 1.7, 2.2); oval(c, '#ffffff', 10.1, -2.9, 0.65, 0.65);
  line(c, '#9b6f3a', 1.2, [[7.5, -6.5], [11.5, -6.8]]);
  oval(c, 'rgba(236, 120, 110, 0.35)', 9, 4.5, 3.6, 2.4);
  line(c, '#a05a48', 1.3, [[9, 8], [11.5, 9], [14, 7.6]]);
  c.restore();
  // The distinctive bright blue bicycle helmet, with vents and a strap to the chin.
  c.save(); c.translate(hx, hy);
  const helmet = () => {
    c.beginPath(); c.moveTo(-17, -3); c.bezierCurveTo(-19, -18, -6, -27, 6, -26);
    c.bezierCurveTo(18, -25, 24, -16, 23, -8); c.lineTo(20, -6.5); c.quadraticCurveTo(4, -11, -17, -3); c.closePath();
  };
  helmet(); c.fillStyle = rgrad(c, 2, -12, 26, [[0, '#6cc8f0'], [0.55, '#2d97d0'], [1, '#1b6a9c']], 10, -22); c.fill();
  c.save(); helmet(); c.clip();
  for (const [vx, vy, rot] of [[-6, -18, -0.5], [3, -21, -0.1], [12, -19, 0.35]] as const) {
    c.save(); c.translate(vx, vy); c.rotate(rot); box(c, '#174e72', -2, -6, 4, 11, 2); box(c, 'rgba(255,255,255,0.2)', 0.8, -5, 1, 9, 0.5); c.restore();
  }
  box(c, 'rgba(10, 40, 60, 0.35)', -20, -7, 45, 6);
  c.restore();
  helmet(); stroke(c, INK, 1.8);
  c.beginPath(); c.moveTo(-12, -16); c.quadraticCurveTo(-4, -24, 8, -24); stroke(c, 'rgba(255, 255, 255, 0.6)', 2);
  line(c, 'rgba(37, 51, 49, 0.8)', 1.1, [[2, -9], [-3, 11], [-10, -5]]);
  oval(c, '#aeb9b7', -3, 11, 1.6, 1.2);
  c.restore();

  // The near arm, reaching forward to the grip.
  const elbow = joint(shoulder, grip, 17, 17);
  limb(c, [[shoulder[0] + 1, shoulder[1] + 3], elbow, grip], 8.6, '#4c5949');
  line(c, rgba('#8a977f', 0.45), 1.6, [lerp(shoulder, elbow, 0.3), lerp(elbow, grip, 0.6)]);
  oval(c, INK, grip[0] + 1, grip[1], 5.2, 4.8); oval(c, '#f0c197', grip[0] + 1, grip[1], 3.8, 3.4);
  line(c, INK, 4.6, [[grip[0] + 3, grip[1] - 2], [grip[0] + 6, grip[1] + 1]]); line(c, '#e0e3dc', 2.4, [[grip[0] + 3, grip[1] - 2], [grip[0] + 6, grip[1] + 1]]);
  c.restore();
}

// ---------------------------------------------------------------- the frame

interface Art {
  sky: Sprite; clouds: Sprite[]; far: Sprite; mid: Sprite; near: Sprite; road: Sprite; fore: Sprite;
  trees: Sprite[]; dapple: Sprite[]; home: Sprite; preschool: Sprite; apple: Sprite; light: Sprite;
}
let art: Art | null = null;

function paintLight(c: C): void {
  // Soft rays from the sun, then a gentle vignette that keeps the eye on the path.
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [a, w] of [[2.05, 0.07], [2.3, 0.05], [2.6, 0.08], [2.9, 0.04]] as const) {
    const L = 900;
    path(c, [SUN, [SUN[0] + Math.cos(a - w) * L, SUN[1] + Math.sin(a - w) * L], [SUN[0] + Math.cos(a + w) * L, SUN[1] + Math.sin(a + w) * L]], true);
    c.fillStyle = rgrad(c, SUN[0], SUN[1], L, [[0, 'rgba(255, 240, 200, 0.08)'], [1, 'rgba(255, 240, 200, 0)']]); c.fill();
  }
  c.restore();
  c.fillStyle = rgrad(c, 480, 300, 640, [[0, 'rgba(30, 48, 30, 0)'], [0.62, 'rgba(30, 48, 30, 0)'], [1, 'rgba(30, 48, 30, 0.3)']]);
  c.fillRect(0, 0, W, 540);
}

function getArt(): Art {
  if (art) return art;
  art = {
    sky: bake(W, 400, 0, 0, paintSky),
    clouds: [[3, 150, 44], [8, 110, 32], [13, 190, 50]].map(([seed, w, h]) => bake(w + 60, h * 2 + 20, w / 2 + 30, h * 1.6 + 10, c => paintCloud(c, seed, w, h))),
    far: strip(FAR, 250, 150, paintFar),
    mid: strip(MID, 290, 110, paintMid),
    near: strip(NEAR, 340, 62, paintNear),
    road: strip(ROAD, 390, 108, paintRoad),
    fore: strip(FORE, 470, 70, paintFore),
    trees: [101, 202, 303].map(seed => bake(270, 270, 130, 250, c => paintTree(c, seed))),
    dapple: [7, 9, 12].map(seed => bake(220, 60, 110, 30, c => paintDapple(c, seed))),
    home: bake(470, 150, 90, 20, paintHome),
    preschool: bake(470, 150, 30, 12, paintPreschool),
    apple: bake(34, 34, 16, 18, paintApple),
    light: bake(W, 540, 0, 0, paintLight),
  };
  return art;
}

/** A falling apple's target on the path: a pulsing, dashed ring over a soft glow. */
function target(c: C, x: number, y: number, t: number, warning: boolean, fade: number): void {
  const pulse = Math.sin(t * 9) * 3;
  c.save(); c.globalAlpha = fade;
  c.save(); c.translate(x, y); c.scale(30 + pulse, 11 + pulse * 0.35);
  c.fillStyle = rgrad(c, 0, 0, 1, [[0, 'rgba(240, 120, 60, 0.28)'], [0.7, 'rgba(240, 120, 60, 0.14)'], [1, 'rgba(240, 120, 60, 0)']]);
  c.fillRect(-1, -1, 2, 2); c.restore();
  c.beginPath(); c.ellipse(x, y, 24 + pulse, 9 + pulse * 0.35, 0, 0, TAU);
  c.setLineDash([6, 4]); c.lineDashOffset = -t * 20;
  stroke(c, 'rgba(120, 50, 20, 0.35)', 4.2); stroke(c, warning ? '#f07a3c' : '#e3683a', 2.2);
  c.setLineDash([]); c.restore();
}

export function apple(c: C, x: number, y: number, size = 1): void { put(c, getArt().apple, x, y, size); }

export function drawRide(c: C, ride: Pick<BikeRun, 'distance' | 'x' | 'y' | 'apples' | 'invulnerable' | 'elapsed'>): void {
  const a = getArt(), d = ride.distance;
  c.drawImage(a.sky.canvas, 0, 0, W, 400);
  for (let i = 0; i < 5; i++) {
    const x = ((i * 267 + 100 - d * 0.06) % 1300 + 1300) % 1300 - 130;
    put(c, a.clouds[i % 3], x, 118 + (i % 2) * 44 - (i % 3) * 10);
  }
  tile(c, a.far, d * 0.08); tile(c, a.mid, d * 0.22); tile(c, a.near, d * 0.55);
  put(c, a.home, 16 - d * 0.85, 272);
  const trees: number[] = [];
  for (let i = 0; i < 20; i++) {
    const x = 475 + i * 222 - d;
    if (x < -160 || x > 1120 || i * 222 > 3080) continue;
    trees.push(x); put(c, a.trees[i % 3], x, 388, 0.9 + (i % 3) * 0.13);
  }
  put(c, a.preschool, 3600 - d + 280, 274);
  tile(c, a.road, d);
  for (const [i, x] of trees.entries()) put(c, a.dapple[i % 3], x - 40, 418);
  for (const p of ride.apples) {
    const fade = p.landed > 0 ? Math.max(0, 1 - p.landed / 0.6) : 1;
    target(c, p.x, p.y, ride.elapsed, p.warning > 0, fade);
    // The apple's shadow tightens and darkens as it drops.
    const k = 1 - Math.min(p.height, 285) / 285;
    c.save(); c.globalAlpha = fade; softShadow(c, p.x, p.y, 6 + k * 8, 2.4 + k * 2.4, 0.2 + k * 0.35); c.restore();
  }
  if (!ride.invulnerable || Math.floor(ride.elapsed * 12) % 2 === 0) cyclist(c, ride.x, ride.y, ride.elapsed);
  for (const p of ride.apples) {
    c.save();
    c.globalAlpha = p.warning > 0 ? 0.9 : p.landed > 0 ? Math.max(0, 1 - p.landed / 0.6) : 1;
    // A warned apple wobbles on its branch before it lets go; a landed one squashes a little.
    const wobble = p.warning > 0 ? Math.sin(ride.elapsed * 30) * 0.18 : 0;
    const ay = p.y - Math.max(8, p.height);
    c.translate(p.x, ay); c.rotate(wobble);
    if (p.landed > 0) c.scale(1.12, 0.88);
    put(c, a.apple, 0, 0, 1.05);
    c.restore();
  }
  tile(c, a.fore, d * 1.2);
  c.drawImage(a.light.canvas, 0, 0, W, 540);
}

// ---------------------------------------------------------------- the Ringstorp Run card

export function drawRunPreview(c: C): void {
  // Dusk on a Ringstorp street: brick blocks with lit windows, a streetlamp and the courier with his parcel.
  c.fillStyle = vgrad(c, 125, 420, [[0, '#1c3140'], [0.55, '#35505a'], [0.85, '#a1735a'], [1, '#d59a67']]);
  c.fillRect(0, 0, W, 540);
  oval(c, rgrad(c, 778, 160, 90, [[0, 'rgba(255, 236, 190, 0.45)'], [1, 'rgba(255, 236, 190, 0)']]), 778, 160, 90, 90);
  oval(c, '#f6e2ae', 778, 160, 26, 26); oval(c, 'rgba(210, 190, 140, 0.5)', 770, 154, 6, 5); oval(c, 'rgba(210, 190, 140, 0.4)', 786, 168, 4, 3);
  const rand = seeded(91);
  for (let i = 0; i < 40; i++) oval(c, `rgba(255, 250, 230, ${0.3 + rand() * 0.5})`, rand() * W, 130 + rand() * 120, 0.9, 0.9);
  // Distant rooftops in silhouette.
  c.fillStyle = '#2d4049';
  path(c, [[0, 330], ...Array.from({ length: 17 }, (_, i): Pt => [i * 60, 300 - (i % 3) * 14]), [960, 330]], true); c.fill();
  for (let i = 0; i < 6; i++) {
    const x = i * 170 - 40, y = 222 + (i % 3) * 14, w = 150, h = 200;
    box(c, hgrad(c, x, x + w, [[0, '#6e3a2e'], [0.6, '#8b4a39'], [1, '#9b5642']]), x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    for (let r = 0; r < h; r += 5) for (let k = (r / 5) % 2 ? -6 : 0; k < w; k += 12) box(c, 'rgba(40, 16, 12, 0.25)', x + k, y + r, 11, 0.8);
    c.restore();
    box(c, '#3c2c28', x - 4, y - 8, w + 8, 10, 2);
    for (const dx of [16, 62, 108]) for (const dy of [22, 82, 142]) {
      const lit = rand() < 0.6;
      if (lit) { c.fillStyle = rgrad(c, x + dx + 13, y + dy + 17, 34, [[0, 'rgba(255, 200, 110, 0.3)'], [1, 'rgba(255, 200, 110, 0)']]); c.fillRect(x + dx - 21, y + dy - 17, 68, 68); }
      box(c, '#4f3129', x + dx - 3, y + dy - 3, 32, 40);
      box(c, lit ? vgrad(c, y + dy, y + dy + 34, [[0, '#ffe3a0'], [1, '#e2a557']]) : vgrad(c, y + dy, y + dy + 34, [[0, '#46606b'], [1, '#2a3c45']]), x + dx, y + dy, 26, 34);
      box(c, '#5a3a31', x + dx + 11.5, y + dy, 3, 34); box(c, '#5a3a31', x + dx, y + dy + 14, 26, 3);
    }
  }
  // Pavement and the street, wet enough to catch the lamp.
  box(c, vgrad(c, 400, 424, [[0, '#8c8c80'], [1, '#6d6e66']]), 0, 400, W, 24);
  box(c, 'rgba(255,255,255,0.18)', 0, 400, W, 2);
  box(c, vgrad(c, 424, 540, [[0, '#2f3d40'], [1, '#1d282b']]), 0, 424, W, 116);
  for (let i = 0; i < 7; i++) box(c, 'rgba(230, 220, 180, 0.7)', i * 156 - 20, 489, 70, 4, 2);
  c.save(); c.translate(735, 468); c.scale(110, 26);
  c.fillStyle = rgrad(c, 0, 0, 1, [[0, 'rgba(255, 214, 140, 0.3)'], [1, 'rgba(255, 214, 140, 0)']]); c.fillRect(-1, -1, 2, 2); c.restore();
  // Streetlamp and its cone of light.
  path(c, [[735, 232], [650, 424], [820, 424]], true);
  c.fillStyle = vgrad(c, 232, 424, [[0, 'rgba(255, 226, 150, 0.35)'], [1, 'rgba(255, 226, 150, 0.04)']]); c.fill();
  line(c, '#1a2627', 8, [[705, 424], [705, 220], [734, 219]]); line(c, '#3c4f50', 2, [[707, 424], [707, 222]]);
  box(c, '#1a2627', 722, 214, 26, 9, 3); oval(c, '#fff0bf', 735, 225, 11, 4.5);
  oval(c, rgrad(c, 735, 226, 40, [[0, 'rgba(255, 236, 170, 0.7)'], [1, 'rgba(255, 236, 170, 0)']]), 735, 226, 40, 40);
  // The courier, lit from the lamp behind: a warm rim on his back.
  c.save(); c.translate(460, 464);
  softShadow(c, 0, 0, 44, 8, 0.55);
  limb(c, [[-4, -56], [-12, -30], [-22, -3]], 13, '#27333a', '#10181c'); limb(c, [[4, -56], [12, -30], [24, -3]], 13, '#34454c', '#10181c');
  box(c, '#e8e3d4', -30, -6, 16, 6, 3); box(c, '#e8e3d4', 18, -6, 16, 6, 3);
  limb(c, [[-12, -96], [-26, -80], [-32, -66]], 10, '#3f6f99', '#10181c');
  c.beginPath(); c.moveTo(-16, -56); c.bezierCurveTo(-20, -80, -14, -104, 0, -106); c.bezierCurveTo(14, -104, 20, -80, 16, -56); c.closePath();
  c.fillStyle = hgrad(c, -18, 18, [[0, '#f0b877'], [0.18, '#3c6f9f'], [1, '#2b527a']]); c.fill(); stroke(c, '#10181c', 2.2);
  box(c, hgrad(c, 20, 56, [[0, '#9a7243'], [1, '#c99a5e']]), 18, -88, 36, 32, 3); c.strokeStyle = '#3b2b1b'; c.lineWidth = 1.8; c.strokeRect(18, -88, 36, 32);
  box(c, '#ead29a', 32, -88, 8, 32);
  limb(c, [[10, -96], [26, -80], [30, -74]], 10, '#4a7fad', '#10181c');
  oval(c, '#10181c', 0, -126, 16, 19); oval(c, rgrad(c, 2, -126, 18, [[0, '#e7c09a'], [1, '#b88a66']], 6, -130), 0, -126, 14.5, 17.5);
  c.beginPath(); c.moveTo(-15, -128); c.bezierCurveTo(-16, -146, 10, -150, 15, -134); c.quadraticCurveTo(4, -140, -8, -132); c.closePath();
  c.fillStyle = '#e2c27a'; c.fill(); stroke(c, '#10181c', 1.6);
  c.restore();
  c.fillStyle = rgrad(c, 480, 330, 560, [[0, 'rgba(10, 20, 26, 0)'], [0.6, 'rgba(10, 20, 26, 0)'], [1, 'rgba(10, 20, 26, 0.45)']]);
  c.fillRect(0, 0, W, 540);
}
