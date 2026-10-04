import { INK, TAU, box, line, lumps, oval, path, rgba, rgrad, seeded, stroke, vgrad, outlined, type C, type Pt } from './art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { BED, BOUNCE_X, BULBS, FLOOR, FOOT, LAMP, MAMMA, MAMMA_HEAD, PAPPA, PAPPA_HEAD, STAND, TUNING, WINDOW } from './games/godmorgon';
import { kid, paintHead } from './kids';
import { NOSE, type MorningRun } from './morning-run';

// The big bedroom for God morgon, after the family's photo: the dark floral wallpaper behind the bed and the blue wall
// beside it, the birch bed under its duvet of red and pink flowers, the brass star lamp, the beige curtains (drawn at the
// start, so the room is dim) and the window onto the garden and its little shed, the armchair with a plant, the grey
// runner on the oak floor.

const W = 960;
const smooth01 = (k: number) => { const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u); };
const BIRCH = '#e2cfa4', CURTAIN = '#d8ccb0';

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
function disc(c: C, fill: string | CanvasGradient, x: number, y: number, rx: number, ry = rx, ink = 1.6): void { oval(c, INK, x, y, rx + ink, ry + ink); oval(c, fill, x, y, rx, ry); }

/** Where each of the star lamp's bulbs is. */
export function bulbAt(i: number): Pt {
  const a = -Math.PI / 2 + (i + 0.5) * TAU / BULBS, k = i % 2 ? 0.8 : 1;
  return [LAMP.x + Math.cos(a) * LAMP.arm * k, LAMP.y + Math.sin(a) * LAMP.arm * 0.7 * k];
}

// ---------------------------------------------------------------- the room

function paintWalls(c: C): void {
  // The wallpaper behind the bed: dark blue-grey with pale fronds, and the blue wall from the corner on.
  c.fillStyle = vgrad(c, 0, FLOOR, [[0, '#3a4650'], [1, '#46535e']]); c.fillRect(0, 0, 650, FLOOR);
  const rand = seeded(41);
  for (let i = 0; i < 70; i++) {
    const x = rand() * 650, y = rand() * FLOOR, a = -Math.PI / 2 + (rand() - 0.5) * 1.2, len = 18 + rand() * 20;
    line(c, rgba('#b9b496', 0.55), 1.2, [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]]);
    for (let k = 1; k <= 4; k++) { const px = x + Math.cos(a) * len * k / 5, py = y + Math.sin(a) * len * k / 5; oval(c, rgba('#c9c2a0', 0.5), px - 4, py, 4, 1.6, a - 0.8); oval(c, rgba('#c9c2a0', 0.5), px + 4, py, 4, 1.6, a + 0.8); }
  }
  c.fillStyle = vgrad(c, 0, FLOOR, [[0, '#6f86a0'], [1, '#7d93a8']]); c.fillRect(650, 0, W - 650, FLOOR);
  box(c, 'rgba(0, 0, 0, 0.18)', 648, 0, 4, FLOOR);
  box(c, '#f3f2ec', 0, FLOOR - 10, W, 10); box(c, 'rgba(0, 0, 0, 0.15)', 0, FLOOR - 2, W, 2);
  // The brass reading lamp on the wallpaper over the bed.
  line(c, '#b4975c', 3, [[226, 236], [256, 236]]); path(c, [[256, 226], [278, 222], [276, 244], [256, 246]], true); c.fillStyle = '#c9a85c'; c.fill(); stroke(c, INK, 1.2);
}

function paintFloor(c: C): void {
  c.fillStyle = vgrad(c, FLOOR, 540, [[0, '#c4a873'], [1, '#d6bb86']]); c.fillRect(0, FLOOR, W, 540 - FLOOR);
  for (let y = FLOOR + 16; y < 540; y += 18) line(c, 'rgba(140, 100, 50, 0.3)', 1, [[0, y], [W, y]]);
  slab(c, '#8c8e8a', 150, 470, 500, 62, 4, 1.2);
  for (let x = 156; x < 646; x += 6) line(c, 'rgba(255, 255, 255, 0.1)', 1, [[x, 472], [x, 530]]);
}

/** The window onto the garden: the sky going from dawn to morning as the curtains open, the shed, the fence. */
function paintWindow(c: C, open: number): void {
  const { x, y, w, h } = WINDOW;
  slab(c, '#f3f2ec', x - 8, y - 8, w + 16, h + 16, 2);
  c.fillStyle = vgrad(c, y, y + h, [[0, '#b8d4ea'], [0.7, '#f4e3c0'], [1, '#e8eedf']]); c.fillRect(x, y, w, h);
  oval(c, rgba('#fff3c4', 0.9), x + w - 40, y + 50, 22, 22);
  lumps(c, x + 40, y + h - 40, 80, 50, 9, seeded(5)); c.fillStyle = '#6f9a54'; c.fill();
  // The little garden shed with its red-brown boards and dark roof.
  slab(c, '#8a5a3a', x + 70, y + 110, 90, 70, 0, 1.2);
  for (let bx = x + 76; bx < x + 160; bx += 10) line(c, 'rgba(0, 0, 0, 0.2)', 1, [[bx, y + 112], [bx, y + 178]]);
  path(c, [[x + 62, y + 112], [x + 115, y + 80], [x + 168, y + 112]], true); c.fillStyle = '#3d3a38'; c.fill(); stroke(c, INK, 1.2);
  box(c, '#cfe0ea', x + 98, y + 126, 22, 18);
  for (let fx = x; fx < x + w; fx += 12) box(c, '#9a8a70', fx, y + h - 34, 9, 34);
  box(c, '#f3f2ec', x + w / 2 - 3, y, 6, h); box(c, '#f3f2ec', x, y + h / 2 - 3, w, 6);
  // The sill: little pots and a candlestick.
  slab(c, '#f3f2ec', x - 14, y + h + 4, w + 28, 8, 1, 1.2);
  for (const [px, col] of [[x + 20, '#62903c'], [x + 150, '#4c7a2e']] as const) { slab(c, '#b5653d', px - 9, y + h - 12, 18, 16, 3, 1); lumps(c, px, y + h - 22, 14, 12, 7, seeded(px)); c.fillStyle = col; c.fill(); }
  line(c, '#b4975c', 2, [[x + 96, y + h + 4], [x + 96, y + h - 18]]); box(c, '#f3f2ec', x + 93, y + h - 30, 6, 12);
  // The curtains: drawn across at first, slid to the sides as they open.
  const k = smooth01(open);
  for (const side of [-1, 1]) {
    const shut = side < 0 ? x - 30 : x + w / 2 - 10, aside = side < 0 ? x - 54 : x + w + 6, cx = shut + (aside - shut) * k, cw = 126 - 70 * k;
    c.fillStyle = vgrad(c, y - 20, y + h + 30, [[0, '#e2d8c0'], [1, '#c9bc9c']]);
    c.beginPath(); c.moveTo(cx, y - 24); c.lineTo(cx + cw, y - 24); c.quadraticCurveTo(cx + cw - 4, y + h / 2, cx + cw + 4, y + h + 36); c.lineTo(cx - 4, y + h + 36); c.quadraticCurveTo(cx + 4, y + h / 2, cx, y - 24); c.closePath(); c.fill(); stroke(c, INK, 1.4);
    for (let f = 1; f < 5; f++) line(c, 'rgba(120, 100, 70, 0.3)', 2, [[cx + cw * f / 5, y - 20], [cx + cw * f / 5 + 2, y + h + 32]]);
  }
  line(c, '#9a9c96', 3, [[x - 60, y - 24], [x + w + 66, y - 24]]);
}

function paintArmchair(c: C): void {
  // The armchair by the window, a plant beside it.
  slab(c, CURTAIN, 860, 360, 94, 60, 12); slab(c, '#e2d6bc', 870, 400, 80, 30, 8); slab(c, CURTAIN, 852, 386, 18, 50, 6);
  line(c, INK, 4, [[872, 432], [870, FLOOR]]); line(c, INK, 4, [[942, 432], [944, FLOOR]]);
  slab(c, '#3f3a36', 806, 404, 32, 48, 4, 1.2);
  lumps(c, 822, 380, 30, 34, 9, seeded(13)); c.fillStyle = '#4c7a2e'; c.fill(); stroke(c, INK, 1.2);
}

/** The star lamp: brass arms from a ball, a round bulb on each, lit one by one. */
function paintLamp(c: C, lit: number, t: number): void {
  const { x, y } = LAMP;
  line(c, '#3a3a3a', 1.6, [[x, 0], [x, y - 10]]);
  for (let i = 0; i < BULBS; i++) {
    const [bx, by] = bulbAt(i), on = i < lit;
    line(c, INK, 4, [[x, y], [bx, by]]); line(c, '#c9a85c', 2.4, [[x, y], [bx, by]]);
    if (on) { c.fillStyle = rgrad(c, bx, by, 40, [[0, 'rgba(255, 233, 176, 0.55)'], [1, 'rgba(255, 233, 176, 0)']]); c.fillRect(bx - 40, by - 40, 80, 80); }
    disc(c, on ? '#fff2c0' : '#e8e2d0', bx, by, 13, 13, 1.4);
    oval(c, on ? '#ffffff' : 'rgba(255, 255, 255, 0.6)', bx + 4, by - 4, 3.5, 3);
    if (on && i === lit - 1) for (let k = 0; k < 4; k++) { const a = t * 3 + k * TAU / 4, r = 22; line(c, '#fff3b0', 2, [[bx + Math.cos(a) * r - 4, by + Math.sin(a) * r], [bx + Math.cos(a) * r + 4, by + Math.sin(a) * r]]); }
  }
  disc(c, '#c9a85c', x, y, 11, 11, 1.4); oval(c, '#f2dc9a', x + 3, y - 3, 3.5, 3);
}

// ---------------------------------------------------------------- the bed, and who is in it

function floralDuvet(c: C, shape: () => void): void {
  shape(); c.fillStyle = vgrad(c, BED.top - 50, BED.top + 40, [[0, '#f3e8cc'], [1, '#e2d2ae']]); c.fill();
  c.save(); shape(); c.clip();
  const rand = seeded(19);
  for (let i = 0; i < 70; i++) {
    const x = 200 + rand() * 450, y = BED.top - 60 + rand() * 110, r = 4 + rand() * 6, col = rand() < 0.55 ? '#d6372c' : '#e6a0a8';
    for (let p = 0; p < 5; p++) { const a = p * TAU / 5; oval(c, col, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.55); }
    oval(c, '#f2c230', x, y, r * 0.3, r * 0.3);
    oval(c, '#5c8a5a', x + r, y + r * 0.6, r * 0.6, r * 0.25, 0.6);
  }
  c.restore();
  shape(); stroke(c, INK, 1.6);
}

function paintBed(c: C, run: MorningRun, t: number): void {
  const { x, top, foot } = BED, awake = run.awakeSince >= 0, up = awake ? smooth01((run.awakeSince - 0.3) / TUNING.sitUp) : 0;
  // The headboard: birch posts and a padded panel; the mattress's side and the legs.
  for (const px of [x, x + 120]) slab(c, BIRCH, px, 240, 14, FLOOR - 240, 6);
  slab(c, '#d8d2c4', x + 14, 262, 106, 70, 10, 1.4);
  slab(c, '#f3f2ec', x + 10, top - 4, foot - x - 10, 28, 3, 1.4);
  slab(c, BIRCH, x + 6, top + 22, foot - x, 14, 2, 1.4);
  for (const lx of [x + 10, foot - 6]) slab(c, BIRCH, lx, top + 34, 10, FLOOR - top - 34, 2, 1.2);
  // The pillows.
  slab(c, '#cfc8b8', x + 20, 292, 104, 34, 14, 1.4); slab(c, '#ddd6c6', x + 30, 318, 104, 32, 14, 1.4);
  // Mamma and Pappa: sitting up once awake (the duvet covers their legs), or heads on the pillows, eyes shut.
  const people: Array<[typeof PAPPA, Pt, number]> = [[PAPPA, PAPPA_HEAD, 264], [MAMMA, MAMMA_HEAD, 316]];
  for (const [look, head, sitX] of people) {
    if (up > 0) {
      const cheer = run.phase === 'bounce' || run.phase === 'hug' || run.phase === 'ready';
      c.save(); c.globalAlpha = up;
      kid(c, sitX, top + 52 - 10 * up, look, cheer ? { kind: 'cheer', t: t + sitX } : { kind: 'stand' }, 1, { mouth: 'grin', eyes: 'open' }, 1.45);
      c.restore();
    }
    if (up < 1) {
      c.save(); c.globalAlpha = 1 - up; c.translate(head[0], head[1]); c.rotate(-1.25); c.scale(1.3, 1.3);
      paintHead(c, 0, 0, look, awake ? { eyes: 'open', mouth: 'open' } : { eyes: 'shut', mouth: 'smile' });
      c.restore();
    }
  }
  // The duvet: two humps while they sleep, flatter once they sit up.
  const hump = 1 - up;
  floralDuvet(c, () => {
    c.beginPath(); c.moveTo(x + 116, top + 22);
    c.quadraticCurveTo(x + 120, top - 30 - 8 * hump, x + 200, top - 26 - 14 * hump);
    c.quadraticCurveTo(x + 280, top - 30 - 22 * hump, x + 360, top - 22 - 10 * hump);
    c.quadraticCurveTo(x + 440, top - 18, foot + 6, top - 10);
    c.lineTo(foot + 10, top + 30); c.lineTo(x + 116, top + 30); c.closePath();
  });
  // Pappa's foot, sticking out at the end of the bed: it wiggles when tickled, and goes under once he is awake.
  if (!run.woke.includes('tickle')) {
    const wig = run.tickleSince < 0.5 ? Math.sin(run.tickleSince * 40) * 0.3 : Math.sin(t * 1.5) * 0.03;
    c.save(); c.translate(FOOT[0] - 10, FOOT[1]); c.rotate(wig);
    c.beginPath(); c.moveTo(0, -8); c.quadraticCurveTo(24, -14, 30, -2); c.quadraticCurveTo(32, 10, 20, 10); c.lineTo(0, 8); c.closePath();
    c.fillStyle = '#f0c197'; c.fill(); stroke(c, INK, 1.4);
    for (let k = 0; k < 4; k++) oval(c, '#f0c197', 30 - k * 1.5, -6 + k * 4, 3, 2.4);
    c.restore();
  }
  // The footboard.
  slab(c, BIRCH, foot, 296, 14, FLOOR - 296, 6);
  // Snores while they sleep.
  if (!awake) for (const [i, head] of [PAPPA_HEAD, MAMMA_HEAD].entries()) {
    const ph = (t * 0.45 + i * 0.5) % 1;
    c.save(); c.globalAlpha = 1 - ph; c.font = `${14 + ph * 10}px sans-serif`; c.fillStyle = '#fff3b0'; c.fillText('Z', head[0] + 10 + ph * 30, head[1] - 34 - ph * 50); c.restore();
  }
}

function paintTeddy(c: C, at: Pt, k = 1): void {
  c.save(); c.translate(at[0], at[1]); c.scale(k, k);
  disc(c, '#b07a4a', 0, 8, 14, 14, 1.4); disc(c, '#e2b98a', 0, 11, 7, 7, 0.8);
  disc(c, '#b07a4a', 0, -12, 12, 11, 1.4);
  disc(c, '#b07a4a', -10, -21, 5, 5, 1.2); disc(c, '#b07a4a', 10, -21, 5, 5, 1.2);
  oval(c, '#e2b98a', 0, -8, 5.5, 4); oval(c, INK, 0, -10, 2, 1.5); oval(c, INK, -4, -14, 1.4, 1.6); oval(c, INK, 4, -14, 1.4, 1.6);
  for (const [lx, ly] of [[-12, 4], [12, 4], [-7, 20], [7, 20]] as Pt[]) disc(c, '#b07a4a', lx, ly, 5, 5, 1);
  c.restore();
}

// ---------------------------------------------------------------- a frame

function arrow(c: C, x: number, y: number, t: number): void {
  const top = y + Math.sin(t * 6) * 8;
  path(c, [[x - 14, top], [x + 14, top], [x + 14, top + 18], [x + 26, top + 18], [x, top + 44], [x - 26, top + 18], [x - 14, top + 18]], true);
  c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
  for (let i = 0; i < 4; i++) { const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 5 + 2, sx = x + Math.cos(a) * 28, sy = top + 74 + Math.sin(a) * 20; line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]); }
}

/** One frame of the big bedroom, in world units. */
export function drawBedroom(c: C, run: MorningRun, t: number): void {
  const open = run.curtains >= 0 ? Math.min(1, run.curtains / TUNING.curtains) : 0;
  paintWalls(c); paintFloor(c); paintWindow(c, open); paintArmchair(c);
  paintLamp(c, run.bulbs, t);
  paintBed(c, run, t);
  // Nallen: on the armchair, in a hand, hopping, or on Mamma's nose (until she sits up and holds him).
  const t2 = run.teddy, sitting = run.awakeSince > 0.3;
  if (!(t2.onNose && sitting)) paintTeddy(c, t2.onNose ? NOSE : t2.at, t2.onNose ? 0.8 : run.held ? 1.25 : 1);
  if (run.held || (!t2.onNose && run.phase === 'wake' && run.woke.length >= 2 && !run.woke.includes('teddy'))) {
    oval(c, `rgba(242, 194, 48, ${0.25 + 0.15 * Math.sin(t * 8)})`, NOSE[0], NOSE[1], 40, 30);
  }
  // Carl-Otto: beside the bed while waking them, then bouncing on it, then cheering with them.
  outlined(c, o => {
    if (run.phase === 'wake' || run.phase === 'awake') kid(o, STAND[0], STAND[1], CARL_OTTO_HOME, run.phase === 'awake' ? { kind: 'cheer', t } : { kind: 'point', t }, -1, { mouth: 'grin' }, 1.2);
    else {
      const air = run.z > 8, y = BED.top + 6 - run.z;
      kid(o, BOUNCE_X, y, CARL_OTTO_HOME, run.phase === 'bounce' ? (air ? { kind: 'pop', t: 0.25 } : { kind: 'stand' }) : { kind: 'cheer', t }, -1, { mouth: air ? 'open' : 'grin', eyes: air ? 'wide' : 'open' }, 1.2);
    }
  });
  // Hearts round the hug.
  if (run.phase === 'hug' || run.phase === 'ready') for (let i = 0; i < 6; i++) {
    const ph = (t * 0.5 + i / 6) % 1, hx = 250 + i * 40 + Math.sin(t * 2 + i) * 10, hy = 280 - ph * 160;
    c.save(); c.globalAlpha = 1 - ph; c.translate(hx, hy); c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-12, -2, -6, -12, 0, -5); c.bezierCurveTo(6, -12, 12, -2, 0, 6); c.fillStyle = '#e2432f'; c.fill(); c.restore();
  }
  for (const f of run.feathers) { c.save(); c.globalAlpha = Math.min(1, f.life); c.translate(f.x, f.y); c.rotate(f.spin + f.x * 0.02); oval(c, '#ffffff', 0, 0, 9, 3); line(c, '#d9d7cf', 1, [[-8, 0], [8, 0]]); c.restore(); }
  // The room is dim until the curtains open; then morning sun falls in from the window.
  if (open < 1) { c.fillStyle = `rgba(16, 22, 44, ${0.45 * (1 - open)})`; c.fillRect(0, 0, W, 540); }
  if (open > 0) {
    c.save(); c.globalAlpha = 0.18 * open;
    path(c, [[WINDOW.x, WINDOW.y], [WINDOW.x + WINDOW.w, WINDOW.y], [WINDOW.x + 80, 540], [WINDOW.x - 380, 540]], true);
    c.fillStyle = vgrad(c, WINDOW.y, 540, [[0, '#fff3c4'], [1, 'rgba(255, 243, 196, 0)']]); c.fill(); c.restore();
  }
  if (run.hint) {
    const at: Pt = run.hint === 'curtains' ? [WINDOW.x + WINDOW.w / 2, WINDOW.y + 40] : run.hint === 'foot' ? [FOOT[0] + 6, FOOT[1] - 110] : run.hint === 'teddy' ? [run.teddy.at[0], run.teddy.at[1] - 100] : [BOUNCE_X, BED.top - 260];
    arrow(c, at[0], at[1], t);
  }
}

