import { INK, TAU, box, line, oval, path, rgba, rgrad, seeded, stroke, vgrad, outlined, type C, type Pt } from './art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { CANDLES, FLOOR, FOOD_AT, PLACES, SOURCE, TABLE, TROLLEY, TUNING, WARES, type Ware } from './games/duka';
import { MAMMA, PAPPA } from './games/godmorgon';
import { slotAt, type DiningRun } from './dining-run';
import { kid } from './kids';

// The dining room for Duka bordet, after the family's photo: the pink wall with its round mirrors, the crystal chandelier,
// the oval table under its cream cloth with a pattern of circles and a dark border, green placemats, teak chairs with
// striped seats, the seagrass rug on the dark floor, the grey curtain and the red one by the window. A white serving trolley
// stands in front, with the plates, glasses and knives and forks to lay. Where each thing goes is drawn faintly until it is
// there.

const W = 960;
const TEAK = '#a0683a', CLOTH = '#efe8d6';
const smooth01 = (k: number) => { const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u); };

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
function disc(c: C, fill: string | CanvasGradient, x: number, y: number, rx: number, ry = rx, ink = 1.6): void { oval(c, INK, x, y, rx + ink, ry + ink); oval(c, fill, x, y, rx, ry); }

// ---------------------------------------------------------------- the things on the table

/** A ware at (x, y), `s` its size. Held cutlery is drawn crossed. */
export function paintWare(c: C, ware: Ware, x: number, y: number, s: number, held = false): void {
  if (ware === 'plate') { disc(c, '#ffffff', x, y, 30 * s, 12 * s, 1.4); c.beginPath(); c.ellipse(x, y, 20 * s, 8 * s, 0, 0, TAU); stroke(c, '#c9d6e0', 1.4); }
  else if (ware === 'glass') {
    c.save(); c.translate(x, y);
    path(c, [[-7 * s, -24 * s], [7 * s, -24 * s], [6 * s, 0], [-6 * s, 0]], true); c.fillStyle = 'rgba(207, 228, 234, 0.85)'; c.fill(); stroke(c, INK, 1.3);
    oval(c, 'rgba(255, 255, 255, 0.8)', -2 * s, -14 * s, 1.5 * s, 7 * s);
    c.restore();
  } else {
    const fork = (fx: number, a: number) => { c.save(); c.translate(fx, y); c.rotate(a); line(c, INK, 4 * s, [[0, -14 * s], [0, 14 * s]]); line(c, '#d9d7cf', 2.4 * s, [[0, -14 * s], [0, 14 * s]]); for (const tx of [-2.5, 0, 2.5]) line(c, '#d9d7cf', 1.2, [[tx * s, -14 * s], [tx * s, -20 * s]]); c.restore(); };
    const knife = (kx: number, a: number) => { c.save(); c.translate(kx, y); c.rotate(a); line(c, INK, 4 * s, [[0, -18 * s], [0, 14 * s]]); line(c, '#d9d7cf', 2.4 * s, [[0, -18 * s], [0, 14 * s]]); line(c, '#8f6a3a', 3 * s, [[0, 4 * s], [0, 14 * s]]); c.restore(); };
    if (held) { fork(x - 4 * s, -0.35); knife(x + 4 * s, 0.35); } else { fork(x - 42 * s, 0); knife(x + 42 * s, 0); }
  }
}

function paintFood(c: C, food: 'pancakes' | 'meatballs', x: number, y: number, s: number): void {
  if (food === 'pancakes') { for (let i = 0; i < 3; i++) disc(c, '#e0a64c', x, y - i * 3 * s, 20 * s, 7 * s, 1); oval(c, '#c8243a', x - 4 * s, y - 8 * s, 5 * s, 2 * s); oval(c, '#ffffff', x + 6 * s, y - 9 * s, 5 * s, 2.4 * s); }
  else { for (const [dx, dy] of [[-8, 0], [0, -4], [8, 1], [-2, 4]] as Pt[]) disc(c, '#7a4a2a', x + dx * s, y + dy * s, 5 * s, 4 * s, 1); disc(c, '#f2dc9a', x + 14 * s, y + 2 * s, 7 * s, 5 * s, 1); }
}

// ---------------------------------------------------------------- the room

function paintRoom(c: C, lit: number): void {
  c.fillStyle = vgrad(c, 0, FLOOR, [[0, '#d2a99c'], [1, '#dcb8ac']]); c.fillRect(0, 0, W, FLOOR);
  box(c, '#f3f2ec', 0, FLOOR - 10, W, 10);
  // The round mirrors, catching the light.
  for (const [mx, my, r] of [[150, 136, 34], [176, 232, 28], [270, 186, 30], [704, 196, 30], [812, 138, 34], [790, 236, 28]] as const) {
    oval(c, '#9a9c96', mx, my, r + 2, r + 2);
    oval(c, rgrad(c, mx - r * 0.3, my - r * 0.3, r * 1.3, [[0, '#eef3f4'], [0.6, '#b9c6cc'], [1, '#8fa0a8']]), mx, my, r, r);
    line(c, 'rgba(255, 255, 255, 0.6)', 2, [[mx - r * 0.5, my + r * 0.2], [mx + r * 0.1, my - r * 0.5]]);
  }
  // The curtains: grey on the left, red by the window on the right.
  c.fillStyle = vgrad(c, 82, FLOOR, [[0, '#a8b4b8'], [1, '#8f9ca0']]); c.fillRect(0, 82, 70, FLOOR - 82);
  for (let fx = 10; fx < 70; fx += 14) line(c, 'rgba(60, 70, 74, 0.3)', 2, [[fx, 84], [fx + 2, FLOOR]]);
  c.fillStyle = vgrad(c, 82, 380, [[0, '#cfe4ea'], [1, '#e8eedf']]); c.fillRect(916, 82, 44, 300);
  oval(c, '#7aa860', 940, 330, 30, 20);
  c.fillStyle = vgrad(c, 82, FLOOR, [[0, '#8a3a3a'], [1, '#722c2e']]); c.fillRect(862, 82, 56, FLOOR - 82);
  for (let fx = 868; fx < 918; fx += 12) line(c, 'rgba(40, 10, 10, 0.3)', 2, [[fx, 84], [fx + 2, FLOOR]]);
  // The dark floor and the seagrass rug.
  c.fillStyle = vgrad(c, FLOOR, 540, [[0, '#2f2b28'], [1, '#3d3835']]); c.fillRect(0, FLOOR, W, 540 - FLOOR);
  path(c, [[120, 440], [840, 440], [900, 540], [60, 540]], true); c.fillStyle = '#c9a473'; c.fill(); stroke(c, INK, 1.2);
  for (let k = 0; k < 9; k++) line(c, 'rgba(120, 80, 40, 0.25)', 1, [[120 - k * 7, 446 + k * 11], [840 + k * 7, 446 + k * 11]]);
  // The crystal chandelier, warmer once the candles are lit.
  const cx = 480;
  line(c, '#6b7076', 2, [[cx, 0], [cx, 96]]);
  c.beginPath(); c.ellipse(cx, 150, 66, 10, 0, 0, TAU); stroke(c, '#8c8e8a', 3);
  for (let i = 0; i < 7; i++) { const x = cx - 60 + i * 20; line(c, '#d9d7cf', 4, [[x, 112], [x, 150]]); oval(c, `rgba(255, 233, 176, ${0.5 + 0.5 * smooth01(lit / CANDLES.count)})`, x, 108, 3, 5); }
  const rand = seeded(5);
  for (let i = 0; i < 40; i++) { const a = rand() * TAU, r = rand(); oval(c, rgba('#ffffff', 0.7), cx + Math.cos(a) * 60 * r, 150 + 10 + rand() * 46 * (1 - r * 0.5), 2, 3.5); }
  path(c, [[cx - 40, 160], [cx + 40, 160], [cx, 206]], true); c.fillStyle = 'rgba(230, 240, 245, 0.55)'; c.fill();
}

function chairBack(c: C, x: number, y: number): void {
  for (const px of [x - 26, x + 26]) slab(c, TEAK, px - 3, y, 6, 70, 2, 1.2);
  c.beginPath(); c.moveTo(x - 30, y + 4); c.quadraticCurveTo(x, y - 8, x + 30, y + 4); stroke(c, INK, 9); stroke(c, TEAK, 6);
  line(c, TEAK, 5, [[x - 26, y + 30], [x + 26, y + 30]]);
}
function sideChair(c: C, x: number, facing: 1 | -1): void {
  // A teak chair from the side, its back away from the table.
  const back = x - facing * 30;
  slab(c, TEAK, back - 3, 300, 6, FLOOR - 300, 2, 1.2);
  slab(c, '#c8b48c', Math.min(back, x + facing * 30), 382, 60, 12, 3, 1.2);
  for (let k = 0; k < 5; k++) line(c, '#8f7a5a', 1.4, [[Math.min(back, x + facing * 30) + 4 + k * 12, 384], [Math.min(back, x + facing * 30) + 4 + k * 12, 392]]);
  slab(c, TEAK, x + facing * 30 - 3, 394, 6, FLOOR - 394, 2, 1.2);
}

function paintTable(c: C): void {
  const { x, y, rx, ry } = TABLE;
  // The cloth hanging down in front, with its dark patterned border, then the top.
  path(c, [[x - rx, y], [x + rx, y], [x + rx - 6, 428], [x - rx + 6, 428]], true); c.fillStyle = CLOTH; c.fill(); stroke(c, INK, 1.6);
  box(c, '#5a4636', x - rx + 6, 410, rx * 2 - 12, 18);
  for (let bx = x - rx + 14; bx < x + rx - 10; bx += 18) { oval(c, '#e8dcc0', bx, 419, 5, 4); oval(c, '#5a4636', bx, 419, 2, 1.6); }
  oval(c, INK, x, y, rx + 1.6, ry + 1.6); oval(c, CLOTH, x, y, rx, ry);
  c.save(); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.clip();
  for (let gy = y - ry; gy < y + ry; gy += 22) for (let gx = x - rx; gx < x + rx; gx += 26) { c.beginPath(); c.ellipse(gx + ((gy / 22) % 2) * 13, gy, 7, 4, 0, 0, TAU); stroke(c, 'rgba(180, 160, 120, 0.45)', 1.2); }
  c.restore();
  // The green placemats.
  for (const p of PLACES) {
    const s = p.scale; c.save(); c.translate(p.at[0], p.at[1]);
    slab(c, '#a9c47a', -62 * s, -24 * s, 124 * s, 48 * s, 4, 1.2);
    const rand = seeded(p.at[0]);
    for (let i = 0; i < 14; i++) oval(c, rgba('#6f8a4a', 0.5), (rand() - 0.5) * 112 * s, (rand() - 0.5) * 40 * s, 4 * s, 2 * s, rand() * 3);
    c.restore();
  }
}

function paintCandles(c: C, lit: number, t: number): void {
  const { x, y } = CANDLES;
  disc(c, '#c9ced0', x, y + 12, 44, 13, 1.4); oval(c, '#e8eef0', x - 8, y + 9, 18, 4);
  for (let i = 0; i < CANDLES.count; i++) {
    const cx = x - 28 + i * 14, top = y - 22 - (i === 2 ? 8 : i % 2 ? 4 : 0);
    slab(c, '#c9ced0', cx - 5, y + 2, 10, 6, 2, 1);
    slab(c, '#fbfaf6', cx - 3.5, top, 7, y + 4 - top, 1, 1.2);
    if (i < lit) {
      c.fillStyle = rgrad(c, cx, top - 8, 26, [[0, 'rgba(255, 220, 140, 0.5)'], [1, 'rgba(255, 220, 140, 0)']]); c.fillRect(cx - 26, top - 34, 52, 52);
      const f = Math.sin(t * 12 + i) * 1.2;
      path(c, [[cx - 3, top - 2], [cx + f, top - 14], [cx + 3, top - 2]], true); c.fillStyle = '#f2c230'; c.fill(); oval(c, '#fff3b0', cx, top - 5, 1.6, 3);
    } else line(c, INK, 1.4, [[cx, top], [cx, top - 4]]);
  }
}

function paintTrolley(c: C, run: DiningRun): void {
  const { x, y, w } = TROLLEY;
  for (const lx of [x + 10, x + w - 18]) slab(c, '#e2e0d8', lx, y + 10, 8, 540 - y, 1, 1.2);
  slab(c, '#fbfaf6', x, y, w, 12, 3);
  // What is left to lay: a stack of plates, a row of glasses, a jar of knives and forks.
  for (let i = 0; i < run.left('plate'); i++) paintWare(c, 'plate', SOURCE.plate[0], SOURCE.plate[1] - 4 - i * 5, 1);
  for (let i = 0; i < run.left('glass'); i++) paintWare(c, 'glass', SOURCE.glass[0] - 24 + i * 16, SOURCE.glass[1] - 1, 1);
  const jar = SOURCE.cutlery;
  for (let i = 0; i < run.left('cutlery'); i++) { const a = -0.4 + i * 0.27; line(c, INK, 4, [[jar[0], jar[1] - 16], [jar[0] + Math.sin(a) * 30, jar[1] - 16 - Math.cos(a) * 30]]); line(c, '#d9d7cf', 2.4, [[jar[0], jar[1] - 16], [jar[0] + Math.sin(a) * 30, jar[1] - 16 - Math.cos(a) * 30]]); }
  slab(c, '#b9c6cc', jar[0] - 14, jar[1] - 26, 28, 26, 4, 1.2);
}

// ---------------------------------------------------------------- a frame

function arrow(c: C, x: number, y: number, t: number): void {
  const top = y + Math.sin(t * 6) * 8;
  path(c, [[x - 14, top], [x + 14, top], [x + 14, top + 18], [x + 26, top + 18], [x, top + 44], [x - 26, top + 18], [x - 14, top + 18]], true);
  c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
}
function sparkles(c: C, x: number, y: number, t: number, r = 26): void {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 5 + 2, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.7;
    line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]);
  }
}

/** Where the food stands once it is on the table. */
export const SERVED_AT: Pt = [480, 368];

/** One frame of the dining room, in world units. */
export function drawDining(c: C, run: DiningRun, t: number): void {
  const eating = run.phase === 'eat' || run.phase === 'done';
  paintRoom(c, run.lit);
  // Chairs on the far side, and Mamma and Pappa in them once dinner begins.
  chairBack(c, PLACES[0].at[0], 196); chairBack(c, PLACES[1].at[0], 196);
  // Mamma and Pappa at the far side once dinner begins: in front of their chairs, the table hiding them below the chest.
  if (eating) {
    const up = smooth01(run.eating / 0.6);
    for (const [look, x] of [[MAMMA, PLACES[0].at[0]], [PAPPA, PLACES[1].at[0]]] as const) {
      c.save(); c.globalAlpha = up; kid(c, x, 300 + (1 - up) * 30, look, run.phase === 'done' ? { kind: 'cheer', t: t + x } : { kind: 'stand' }, 1, { mouth: 'grin' }, 1.4); c.restore();
    }
  }
  sideChair(c, 150, 1); sideChair(c, 810, -1);
  paintTable(c);
  // Where each ware goes, faintly; the empty places for the ware in hand (or let go wrongly) glow.
  const glowing = run.held?.ware ?? run.glow?.ware ?? null;
  for (const ware of WARES) for (const place of run.free(ware)) {
    const s = PLACES.find(p => p.id === place)!.scale, [sx, sy] = slotAt(place, ware);
    c.save(); c.globalAlpha = 0.22; paintWare(c, ware, sx, sy, s); c.restore();
    if (ware === glowing) { oval(c, `rgba(242, 194, 48, ${0.3 + 0.2 * Math.sin(t * 8)})`, sx, sy - (ware === 'glass' ? 12 : 0), 30 * s, 16 * s); }
  }
  for (const l of run.laid) { const p = PLACES.find(x => x.id === l.place)!, [sx, sy] = slotAt(l.place, l.ware); paintWare(c, l.ware, sx, sy, p.scale); }
  // Food on every plate once dinner begins.
  if (eating) for (const p of PLACES) paintFood(c, run.food, p.at[0], p.at[1] - 3, p.scale * 0.9);
  paintCandles(c, run.lit, t);
  // The food: on the trolley, then carried to the middle of the table.
  if (run.phase === 'serve' || eating) {
    const u = run.served < 0 ? 0 : smooth01(run.served / TUNING.serve), x = FOOD_AT[0] + (SERVED_AT[0] - FOOD_AT[0]) * u, y = FOOD_AT[1] + (SERVED_AT[1] - FOOD_AT[1]) * u - Math.sin(u * Math.PI) * 60;
    disc(c, '#ffffff', x, y - 4, 40, 14, 1.4); paintFood(c, run.food, x, y - 8, 1.5);
  }
  paintTrolley(c, run);
  // Nallen in his chair at the end, waiting for his plate; Carl-Otto laying the table, then in his chair.
  const teddy = (x: number, y: number) => { disc(c, '#b07a4a', x, y, 22, 20, 1.6); disc(c, '#b07a4a', x, y - 34, 18, 16, 1.6); disc(c, '#b07a4a', x - 14, y - 48, 7, 7, 1.2); disc(c, '#b07a4a', x + 14, y - 48, 7, 7, 1.2); oval(c, '#e2b98a', x, y - 28, 8, 6); oval(c, INK, x, y - 31, 2.6, 2); oval(c, INK, x - 6, y - 38, 1.8, 2.2); oval(c, INK, x + 6, y - 38, 1.8, 2.2); };
  teddy(812, 366);
  outlined(c, o => {
    if (eating) kid(o, 150, 446, CARL_OTTO_HOME, { kind: 'sit', t }, 1, { mouth: 'grin' }, 1.15);
    else kid(o, 116, 534, CARL_OTTO_HOME, run.held ? { kind: 'point', t } : { kind: 'stand' }, 1, { mouth: 'smile' }, 1.2);
  });
  // A ware in a hand.
  if (run.held) { oval(c, 'rgba(10, 10, 10, 0.2)', run.held.at[0], run.held.at[1] + 14, 26, 6); paintWare(c, run.held.ware, run.held.at[0], run.held.at[1], 1.1, true); }
  for (const m of run.moving) {
    const u = Math.min(1, m.since / TUNING.hop), x = m.from[0] + (m.to[0] - m.from[0]) * u, y = m.from[1] + (m.to[1] - m.from[1]) * u - Math.sin(u * Math.PI) * 60;
    const s = m.place ? 1 + (PLACES.find(p => p.id === m.place)!.scale - 1) * u : 1;
    paintWare(c, m.ware, x, y, s, u < 0.9);
  }
  // Warm candlelight once they are lit.
  if (run.lit > 0) { c.fillStyle = rgrad(c, CANDLES.x, CANDLES.y, 380, [[0, `rgba(255, 210, 140, ${0.06 * run.lit})`], [1, 'rgba(255, 210, 140, 0)']]); c.fillRect(0, 0, W, 540); }
  // The hint: an arrow and sparkles over the next thing to do.
  const h = run.hint;
  if (h) { const at: Pt = h === 'candles' ? [CANDLES.x, CANDLES.y - 110] : h === 'food' ? [FOOD_AT[0], FOOD_AT[1] - 110] : [SOURCE[h][0], SOURCE[h][1] - 110]; arrow(c, at[0], at[1], t); sparkles(c, at[0], at[1] + 76, t); }
}


