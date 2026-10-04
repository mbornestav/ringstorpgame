import { INK, TAU, box, hgrad, line, lumps, mix, oval, path, rgba, rgrad, seeded, stroke, vgrad, outlined, type C, type Pt } from './art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { AT, BOWL, COUNTER, EGGS, ITEM_SCALE, PAN, PANCAKES, PLANTS, TOP, TOPPING_AT, TUNING, type Doneness, type Topping } from './games/pannkakor';
import { kid } from './kids';
import { donenessOf, type HintTarget, type PancakeRun } from './pancake-run';

// The kitchen for Pannkakor, after the family's photo, seen across the worktop: grey-green walls, white tiles behind the
// counter, the window with its blind rolled half down and the pots of herbs on the sill, the round clock, a recipe card
// of pictures (no reading needed), the white pendant lamp, the black worktop on white cabinets. Carl-Otto stands behind
// the worktop at the left end, facing us, like a cook on television. The worktop is low on the screen and the things on
// it are drawn large (ITEM_SCALE), so they are easy to touch. Everything is drawn live: a frame is cheap, and most of it
// moves.

const W = 960;
const WALL = '#a7ae9f', WHITE = '#f3f2ec', TOP_BLACK = '#26282b';
const PANCAKE: Record<Doneness | 'raw', string> = { raw: '#f6e7b4', pale: '#f1d996', golden: '#e0a64c', brown: '#b8763a' };
const smooth01 = (k: number) => { const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u); };
const S = ITEM_SCALE;
/** Draws something `k` times its size, about (x, y). */
function scaled(c: C, x: number, y: number, k: number, draw: () => void): void { c.save(); c.translate(x, y); c.scale(k, k); c.translate(-x, -y); draw(); c.restore(); }

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
function disc(c: C, fill: string | CanvasGradient, x: number, y: number, rx: number, ry = rx, ink = 1.6): void { oval(c, INK, x, y, rx + ink, ry + ink); oval(c, fill, x, y, rx, ry); }

// ---------------------------------------------------------------- the room

function paintWall(c: C, t: number): void {
  c.fillStyle = vgrad(c, 0, COUNTER, [[0, '#9ca393'], [1, WALL]]); c.fillRect(0, 0, W, COUNTER);
  // White tiles behind the counter, the cabinets on the wall above them.
  box(c, '#eeeee8', 0, 170, 320, COUNTER - 170);
  for (let x = 0; x < 320; x += 30) line(c, '#d6d6cc', 1, [[x, 170], [x, COUNTER]]);
  for (let y = 170; y < COUNTER; y += 22) line(c, '#d6d6cc', 1, [[0, y], [320, y]]);
  slab(c, WHITE, -4, 56, 200, 96, 2);
  for (const x of [8, 100]) { box(c, '#dfe6e6', x, 64, 86, 80, 2); box(c, 'rgba(255, 255, 255, 0.5)', x + 6, 68, 18, 72); line(c, '#b8bab6', 2, [[x + 78, 92], [x + 78, 116]]); }
  // The clock: half past five, the second hand going round.
  disc(c, '#ffffff', 262, 118, 30); oval(c, '#f3f2ec', 262, 118, 24, 24);
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; line(c, INK, 2, [[262 + Math.cos(a) * 21, 118 + Math.sin(a) * 21], [262 + Math.cos(a) * 25, 118 + Math.sin(a) * 25]]); }
  line(c, INK, 3, [[262, 118], [262 + Math.cos(Math.PI * 0.5) * 16, 118 + Math.sin(Math.PI * 0.5) * 16]]);
  line(c, INK, 2.5, [[262, 118], [262 + Math.cos(-Math.PI * 0.5 + TAU * 5.5 / 12) * 12, 118 + Math.sin(-Math.PI * 0.5 + TAU * 5.5 / 12) * 12]]);
  const s = t * TAU / 60 - Math.PI / 2; line(c, '#e2432f', 1.2, [[262, 118], [262 + Math.cos(s) * 22, 118 + Math.sin(s) * 22]]);
}

function paintWindow(c: C, plants: number[], t: number): void {
  const x = 330, y = 64, w = 320, h = 196;
  slab(c, '#f7f6f1', x - 10, y - 10, w + 20, h + 20, 2);
  // Outside: a pale evening sky, the grey fence, green bushes.
  c.fillStyle = vgrad(c, y, y + h, [[0, '#cfe4ea'], [0.6, '#e8eedf'], [1, '#d7e3c9']]); c.fillRect(x, y, w, h);
  for (let fx = x; fx < x + w; fx += 14) box(c, fx % 28 ? '#a2a59c' : '#989b92', fx, y + 110, 12, h - 110);
  const rand = seeded(8);
  for (let i = 0; i < 7; i++) { lumps(c, x + 20 + i * 48, y + 108, 26, 12, 8, rand); c.fillStyle = i % 2 ? '#a3c78e' : '#8cb878'; c.fill(); }
  box(c, '#f7f6f1', x + w / 2 - 4, y, 8, h);
  // The blind, rolled half down.
  c.fillStyle = vgrad(c, y, y + 78, [[0, '#f8f5ea'], [1, '#ece6d4']]); c.fillRect(x, y, w, 78);
  for (let by = y + 14; by < y + 78; by += 16) line(c, 'rgba(160, 150, 120, 0.35)', 1, [[x, by], [x + w, by]]);
  box(c, '#e2dccb', x, y + 74, w, 6);
  // The sill, and the pots of herbs: thirsty ones droop until watered.
  slab(c, '#f7f6f1', x - 18, y + h + 4, w + 36, 10, 1, 1.2);
  PLANTS.forEach((px, i) => {
    const since = plants[i], wet = since >= 0, perk = wet ? smooth01(since / 0.8) : 0, droop = (1 - perk) * 0.5;
    const py = y + h + 4, sway = Math.sin(t * 1.5 + i) * 0.04;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k - 2) * (0.35 + droop * 0.5) + sway, len = 40 + (k % 2) * 10 - droop * 8;
      const tip: Pt = [px + Math.cos(a) * len, py - 14 + Math.sin(a) * len + droop * 18];
      line(c, '#3f7f2c', 2, [[px, py - 14], tip]);
      oval(c, k % 2 ? '#62b046' : '#4c8a3a', tip[0], tip[1], 11, 7, a);
    }
    path(c, [[px - 14, py - 18], [px + 14, py - 18], [px + 10, py], [px - 10, py]], true); c.fillStyle = '#b5653d'; c.fill(); stroke(c, INK, 1.4);
    box(c, '#9a5232', px - 15, py - 20, 30, 5, 1);
    if (wet && since < 1.2) for (let d = 0; d < 3; d++) { const dy = (since * 120 + d * 14) % 40; oval(c, '#6fbde8', px - 6 + d * 6, py - 60 + dy, 2, 3); }
  });
}

/** A recipe card of pictures, pinned beside the window: each step gets a tick when done. */
function paintRecipe(c: C, g: PancakeRun): void {
  const x = 690, y = 92;
  c.save(); c.translate(x, y); c.rotate(0.03);
  slab(c, '#fffaf0', 0, 0, 130, 176, 3, 1.4);
  disc(c, '#e2432f', 65, 4, 5, 5, 1);
  const done = [g.eggs >= EGGS, g.milk, g.flour, g.phase !== 'batter' && g.phase !== 'whisk', g.phase === 'toppings' || g.phase === 'done'];
  const rows: Array<(cx: number, cy: number) => void> = [
    (cx, cy) => { for (let i = 0; i < 3; i++) disc(c, '#f3e2c4', cx - 14 + i * 14, cy, 6, 8, 1); },
    (cx, cy) => { slab(c, '#ffffff', cx - 8, cy - 11, 16, 22, 1, 1); box(c, '#3d6ab0', cx - 8, cy - 2, 16, 6); },
    (cx, cy) => { slab(c, '#e9dfc8', cx - 9, cy - 11, 18, 22, 2, 1); box(c, '#c8432f', cx - 9, cy - 2, 18, 5); },
    (cx, cy) => { disc(c, PANCAKE.golden, cx, cy, 14, 6, 1); line(c, INK, 2, [[cx + 14, cy], [cx + 26, cy - 4]]); },
    (cx, cy) => { disc(c, '#ffffff', cx, cy + 2, 16, 6, 1); disc(c, PANCAKE.golden, cx, cy - 2, 12, 5, 1); oval(c, '#c8243a', cx - 3, cy - 4, 4, 2); },
  ];
  rows.forEach((draw, i) => {
    const cy = 26 + i * 32;
    draw(46, cy);
    disc(c, done[i] ? '#62b046' : '#ffffff', 102, cy, 9, 9, 1.2);
    if (done[i]) line(c, '#ffffff', 2.5, [[97, cy], [101, cy + 4], [107, cy - 4]]);
  });
  c.restore();
}

function paintLamp(c: C, t: number): void {
  line(c, '#3a3a3a', 1.6, [[880, 0], [880, 112]]);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = rgrad(c, 880, 150, 160, [[0, 'rgba(255, 233, 176, 0.35)'], [1, 'rgba(255, 233, 176, 0)']]); c.fillRect(720, 120, 320, 220);
  c.restore();
  path(c, [[858, 112], [902, 112], [930, 146], [830, 146]], true); c.fillStyle = vgrad(c, 112, 146, [[0, '#ffffff'], [1, '#e4e1d6']]); c.fill(); stroke(c, INK, 1.6);
  oval(c, '#ffe9b0', 880, 147, 28, 4 + Math.sin(t) * 0.2);
}

function paintCounter(c: C): void {
  // The black worktop, then the white cabinets under it, their handles, and the dark floor.
  box(c, INK, 0, COUNTER - 8, W, 26); c.fillStyle = vgrad(c, COUNTER - 6, COUNTER + 16, [[0, '#3a3d41'], [0.3, TOP_BLACK], [1, '#1b1c1e']]); c.fillRect(0, COUNTER - 6, W, 22);
  box(c, 'rgba(255, 255, 255, 0.18)', 0, COUNTER - 6, W, 2);
  c.fillStyle = vgrad(c, COUNTER + 16, 540, [[0, '#e4e2da'], [0.15, WHITE], [1, '#e9e7df']]); c.fillRect(0, COUNTER + 16, W, 540 - COUNTER - 16);
  for (let x = 0; x < W; x += 160) {
    box(c, INK, x, COUNTER + 16, 1.6, 540); box(c, 'rgba(0, 0, 0, 0.08)', x + 2, COUNTER + 16, 4, 540);
    slab(c, '#b8bab6', x + 50, COUNTER + 40, 60, 5, 2, 1);
  }
  // The hob: a black glass panel set into the worktop, its rings glowing while a pancake cooks.
  box(c, '#141517', AT.pan - 100, COUNTER - 6, 200, 6);
}

// ---------------------------------------------------------------- things on the worktop

function eggShape(c: C, x: number, y: number, k = 1, turn = 0): void {
  c.save(); c.translate(x, y); c.rotate(turn);
  c.beginPath(); c.ellipse(0, 0, 11 * k, 14 * k, 0, 0, TAU); c.fillStyle = rgrad(c, 3 * k, -4 * k, 16 * k, [[0, '#fbf0dc'], [1, '#e2c49c']]); c.fill(); stroke(c, INK, 1.5);
  c.restore();
}

function paintCarton(c: C, left: number, hint: boolean, t: number): void {
  const x = AT.egg, y = COUNTER - 6;
  slab(c, '#cfc8b8', x - 46, y - 22, 92, 22, 3);
  for (let i = 0; i < 3; i++) { box(c, '#bdb5a3', x - 40 + i * 28, y - 20, 24, 18, 6); if (i < left) eggShape(c, x - 28 + i * 28, y - 30 + (hint ? Math.sin(t * 8 + i) * 2 : 0)); }
  box(c, '#bdb5a3', x - 46, y - 8, 92, 8);
}

function paintMilk(c: C, x: number, y: number, tilt: number): void {
  c.save(); c.translate(x, y); c.rotate(tilt);
  slab(c, '#ffffff', -20, -76, 40, 76, 2);
  path(c, [[-20, -76], [0, -92], [20, -76]], true); c.fillStyle = '#eef2f6'; c.fill(); stroke(c, INK, 1.6);
  box(c, '#3d6ab0', -20, -48, 40, 26);
  oval(c, '#ffffff', 0, -35, 9, 7); oval(c, INK, -3, -36, 2, 2); oval(c, INK, 4, -33, 2.4, 1.6);
  c.restore();
}

function paintFlour(c: C, x: number, y: number, tilt: number): void {
  c.save(); c.translate(x, y); c.rotate(tilt);
  path(c, [[-26, 0], [-28, -70], [-22, -80], [22, -80], [28, -70], [26, 0]], true); c.fillStyle = vgrad(c, -80, 0, [[0, '#f2ead6'], [1, '#ded2b6']]); c.fill(); stroke(c, INK, 1.6);
  box(c, '#c8432f', -26, -50, 52, 20);
  for (let i = -1; i <= 1; i++) { line(c, '#d9a441', 2, [[i * 8, -26], [i * 8 + 2, -12]]); oval(c, '#d9a441', i * 8 + 1, -28, 2.5, 4); }
  c.restore();
}

function paintBowl(c: C, g: PancakeRun, stirAngle: number): void {
  const { x, y, rx, ry } = BOWL;
  // The body, then whatever is in it, then the rim in front.
  c.beginPath(); c.moveTo(x - rx, y); c.bezierCurveTo(x - rx, y + rx * 0.7, x + rx, y + rx * 0.7, x + rx, y);
  c.closePath(); c.fillStyle = hgrad(c, x - rx, x + rx, [[0, '#d7dde6'], [0.6, '#ffffff'], [1, '#e8ecf2']]); c.fill(); stroke(c, INK, 1.8);
  c.beginPath(); c.moveTo(x - rx * 0.86, y + rx * 0.28); c.bezierCurveTo(x - rx * 0.6, y + rx * 0.46, x + rx * 0.6, y + rx * 0.46, x + rx * 0.86, y + rx * 0.28); stroke(c, '#3d6ab0', 6);
  disc(c, '#e8ecf2', x, y, rx, ry, 1.8);
  // Inside: a pale batter once it is mixed, lumps of flour and yolks while it is not; it goes down as pancakes are made.
  const any = g.eggs || g.milk || g.flour;
  if (any) {
    const level = g.phase === 'fry' || g.phase === 'toppings' || g.phase === 'done' ? g.batterLeft / PANCAKES : 1;
    if (level > 0) {
      const k = 0.55 + 0.4 * level;
      const mixed = g.phase === 'batter' ? 0 : g.smooth;
      oval(c, mixed > 0 || g.milk ? (mixed > 0 ? mix('#f4f1e6', '#f3dc8e', mixed) : '#f4f1e6') : '#f6e1a0', x, y + 4 * (1 - k), rx * k, ry * k);
      const rand = seeded(3), lumpsLeft = g.phase === 'batter' ? 1 : 1 - g.smooth;
      if (g.flour) for (let i = 0; i < 9 * lumpsLeft; i++) oval(c, '#fbf8ee', x + (rand() - 0.5) * rx * 1.1 * k, y + (rand() - 0.5) * ry * k, 8 + rand() * 6, 4 + rand() * 2);
      for (let i = 0; i < g.eggs && lumpsLeft > 0.3; i++) disc(c, '#f2b81e', x - 36 + i * 34 + Math.sin(stirAngle + i) * 6 * (1 - lumpsLeft), y - 2, 11, 6, 0.8);
      if (mixed > 0) for (let i = 0; i < 4; i++) { const a = stirAngle * 0.6 + i * TAU / 4; c.beginPath(); c.ellipse(x, y, rx * k * (0.3 + i * 0.15), ry * k * (0.3 + i * 0.15), 0, a, a + 1.2); stroke(c, 'rgba(200, 160, 60, 0.35)', 1.6); }
    }
  }
  // The whisk, once it is time to whisk: it goes round as the batter is stirred.
  if (g.phase === 'whisk') {
    const wx = x + Math.cos(stirAngle) * 44, wy = y + Math.sin(stirAngle) * 10;
    line(c, INK, 8, [[wx, wy], [wx + 36, wy - 112]]); line(c, '#8f6a3a', 6, [[wx + 12, wy - 36], [wx + 36, wy - 112]]);
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(wx + 5, wy - 16, 7 + Math.abs(i) * 2.5, 24, 0.3 + i * 0.25, 0, TAU); stroke(c, '#9aa0a6', 1.8); }
  }
}

/** A pancake seen a little from above. `face` 0..1 is how round it looks (0 = edge on, while it spins in the air). */
function pancake(c: C, x: number, y: number, r: number, colour: string, face = 1, spots = 0, seed = 1): void {
  const ry = r * 0.32 * Math.max(0.08, Math.abs(face));
  disc(c, mix(colour, '#000000', 0.18), x, y + 3, r, ry, 1.4);
  disc(c, colour, x, y, r, ry, 1.4);
  if (spots && Math.abs(face) > 0.5) {
    const rand = seeded(seed);
    for (let i = 0; i < spots; i++) { const a = rand() * TAU, d = rand() * 0.7; oval(c, rgba('#8a5220', 0.45), x + Math.cos(a) * r * d, y + Math.sin(a) * ry * d, 4 + rand() * 5, 2 + rand() * 2); }
  }
}

function paintPan(c: C, g: PancakeRun, t: number): void {
  const p = g.pan, { x, y, rx } = PAN, cooking = p.state !== 'empty';
  // The hob ring glows under the pan.
  if (g.phase === 'fry') oval(c, `rgba(226, 67, 47, ${cooking ? 0.55 : 0.3})`, x, COUNTER - 4, rx + 6, 6);
  line(c, INK, 12, [[x + rx - 6, y - 6], [x + rx + 52, y - 62]]); line(c, '#5e4029', 8, [[x + rx + 14, y - 24], [x + rx + 52, y - 62]]);
  disc(c, '#2c2e31', x, y, rx, rx * 0.3, 1.8); oval(c, '#3d4044', x, y - 3, rx * 0.88, rx * 0.24);
  const r = rx * 0.78;
  if (p.state === 'pouring') {
    const k = smooth01(p.t / TUNING.pour);
    pancake(c, x, y - 4, r * (0.2 + 0.8 * k), PANCAKE.raw);
    // The batter running down from the jug.
    line(c, '#f3dc8e', 8 * (1 - k * 0.6), [[x - 20, y - 150], [x - 10, y - 8]]);
    c.save(); c.translate(x - 30, y - 160); c.rotate(-0.9 + k * 0.1);
    slab(c, '#ffffff', -24, -20, 48, 36, 6); box(c, '#3d6ab0', -24, -2, 48, 6); c.restore();
  } else if (p.state === 'side1') {
    const k = Math.min(1, p.t / TUNING.brown);
    pancake(c, x, y - 4, r, mix(PANCAKE.raw, '#f0d48a', k));
    // Bubbles rise and pop once the first side is ready to flip.
    if (p.t >= TUNING.bubbles * 0.6) {
      const rand = seeded(11), n = Math.min(14, Math.floor((p.t - TUNING.bubbles * 0.6) * 6) + 2);
      for (let i = 0; i < n; i++) { const a = rand() * TAU, d = Math.sqrt(rand()) * 0.75, ph = (t * 1.6 + rand()) % 1; c.beginPath(); c.ellipse(x + Math.cos(a) * r * d, y - 4 + Math.sin(a) * r * 0.3 * d, 2 + ph * 3, 1 + ph * 1.4, 0, 0, TAU); stroke(c, rgba('#c99a40', 0.8 - ph * 0.6), 1.2); }
    }
  } else if (p.state === 'flying') {
    const u = p.t / TUNING.flight, lift = Math.sin(u * Math.PI) * 140, face = Math.cos(u * TAU);
    const d = donenessOf(p.side1);
    pancake(c, x, y - 4 - lift, r, face < 0 ? PANCAKE[d] : mix(PANCAKE.raw, '#f0d48a', 0.5), face, face < 0 ? 8 : 0, 4);
  } else if (p.state === 'side2' || p.state === 'sliding') {
    const d = donenessOf(p.side1), slide = p.state === 'sliding' ? smooth01(p.t / TUNING.slide) : 0;
    const sx = x + (AT.plate - x) * slide, sy = y - 4 - Math.sin(slide * Math.PI) * 50 + (plateTop(g.stack.length) - (y - 4)) * slide;
    pancake(c, sx, sy, r + (PLATE_R - r) * slide, PANCAKE[d], 1, 8, g.stack.length + 3);
  }
  // Steam while something cooks.
  if (cooking) for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1; c.beginPath(); c.moveTo(x - 30 + i * 30, y - 20 - ph * 60); c.quadraticCurveTo(x - 20 + i * 30, y - 40 - ph * 60, x - 30 + i * 30, y - 60 - ph * 60); stroke(c, `rgba(255, 255, 255, ${0.5 * (1 - ph)})`, 3); }
}

/** The pancakes' size on the small plate by the hob, and where the next one lands. */
const PLATE_R = 50;
const plateTop = (n: number) => COUNTER - 16 - n * 8;

function paintPlate(c: C, g: PancakeRun): void {
  const x = AT.plate, y = COUNTER - 10;
  disc(c, '#ffffff', x, y, 64, 17, 1.6); oval(c, '#e8ecf2', x, y - 2, 48, 11); c.beginPath(); c.ellipse(x, y, 57, 14, 0, 0, TAU); stroke(c, '#3d6ab0', 2);
  g.stack.forEach((d, i) => pancake(c, x, plateTop(i), PLATE_R, PANCAKE[d], 1, 6, i + 3));
}

// ---------------------------------------------------------------- toppings

function paintTopping(c: C, kind: Topping, x: number, y: number, turn: number, k = 1): void {
  c.save(); c.translate(x, y); c.rotate(turn); c.scale(k, k);
  if (kind === 'jam') { c.beginPath(); for (let i = 0; i < 7; i++) { const a = i * TAU / 7, r = 13 + (i % 2) * 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.5); } c.closePath(); c.fillStyle = '#c8243a'; c.fill(); stroke(c, '#7a1424', 1.2); oval(c, 'rgba(255, 200, 200, 0.6)', -4, -2, 4, 1.6); }
  else if (kind === 'cream') { for (const [dx, dy, r] of [[0, 0, 13], [-7, -5, 9], [6, -6, 8], [0, -11, 6]] as const) { disc(c, '#ffffff', dx, dy, r, r * 0.7, 1); } oval(c, '#f0ecd6', 2, 2, 8, 3); }
  else if (kind === 'blueberry') { for (const [dx, dy] of [[0, 0], [-9, 3], [8, 4]] as const) { disc(c, '#3a4a8f', dx, dy, 6, 5.5, 1); oval(c, '#7a8ccf', dx - 2, dy - 2, 1.8, 1.4); } }
  else if (kind === 'strawberry') {
    path(c, [[-10, -6], [10, -6], [0, 12]], true); c.fillStyle = '#e2432f'; c.fill(); stroke(c, INK, 1.2);
    for (const [dx, dy] of [[-4, -1], [3, 0], [0, 5]] as const) oval(c, '#f8de80', dx, dy, 1, 1.4);
    path(c, [[-8, -7], [0, -11], [8, -7], [0, -5]], true); c.fillStyle = '#62b046'; c.fill();
  } else { const rand = seeded(Math.round(turn * 1000) + 5); for (let i = 0; i < 12; i++) oval(c, '#ffffff', (rand() - 0.5) * 30, (rand() - 0.5) * 12, 1.6, 1.6); }
  c.restore();
}

/** A bowl of a topping on the worktop. */
function paintToppingBowl(c: C, kind: Topping, chosen: boolean, t: number): void {
  const x = TOPPING_AT[kind], y = COUNTER - 8, lift = chosen ? 6 + Math.sin(t * 5) * 2 : 0;
  if (chosen) oval(c, 'rgba(242, 194, 48, 0.5)', x, y - 20, 50, 30);
  c.save(); c.translate(0, -lift);
  c.beginPath(); c.moveTo(x - 38, y - 26); c.bezierCurveTo(x - 38, y + 6, x + 38, y + 6, x + 38, y - 26); c.closePath(); c.fillStyle = '#ffffff'; c.fill(); stroke(c, INK, 1.6);
  disc(c, '#e8ecf2', x, y - 26, 38, 10, 1.6);
  for (const [dx, dy] of [[-14, -27], [12, -28], [0, -32], [-2, -24]] as const) paintTopping(c, kind, x + dx, y + dy, dx * 0.05, 0.8);
  c.restore();
}

/** The plate in the middle, five pancakes high, with everything put on top. */
function paintBigPlate(c: C, g: PancakeRun): void {
  const { x, y, rx } = TOP, n = g.stack.length;
  disc(c, '#ffffff', x, COUNTER - 14, rx + 40, 30, 1.8); c.beginPath(); c.ellipse(x, COUNTER - 14, rx + 30, 25, 0, 0, TAU); stroke(c, '#3d6ab0', 2.4);
  for (let i = 0; i < n; i++) pancake(c, x, COUNTER - 22 - i * ((COUNTER - 22 - y) / Math.max(1, n - 1)), rx, PANCAKE[g.stack[i]], 1, 10, i + 3);
  for (const p of g.toppings) paintTopping(c, p.kind, x + p.x, y + p.y, p.turn, 1.25);
}

// ---------------------------------------------------------------- a frame

export interface PancakeView {
  run: PancakeRun;
  /** The whisk's angle, from the stirring. */
  stirAngle: number;
  /** Carl-Otto cheers until the clock reaches this. */
  cheerUntil: number;
}

/** Where the bouncing arrow goes for a hint. */
function hintAt(h: HintTarget): Pt {
  if (h === 'egg' || h === 'milk' || h === 'flour') return [AT[h], COUNTER - (h === 'egg' ? 120 : 180)];
  if (h === 'bowl') return [BOWL.x, BOWL.y - 140];
  if (h === 'pan') return [PAN.x, PAN.y - 130];
  if (h === 'plate') return [TOP.x, TOP.y - 120];
  return [TOP.x, 130];
}

function sparkles(c: C, x: number, y: number, t: number, r = 26): void {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 5 + 2, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.7;
    line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]);
  }
}

/** One frame of the kitchen, in world units. */
export function drawKitchen(c: C, v: PancakeView, t: number): void {
  const g = v.run;
  paintWall(c, t); paintWindow(c, g.plants, t); paintRecipe(c, g); paintLamp(c, t);
  // Carl-Otto behind the worktop at its left end, facing us: the worktop hides his legs.
  const cheer = t < v.cheerUntil || g.phase === 'done';
  outlined(c, o => kid(o, 66, COUNTER + 30, CARL_OTTO_HOME, cheer ? { kind: 'cheer', t } : { kind: 'point', t }, 1, { mouth: cheer ? 'grin' : 'smile' }, 1.4));
  paintCounter(c);
  const topping = g.phase === 'toppings' || g.phase === 'done';
  if (topping) {
    (Object.keys(TOPPING_AT) as Topping[]).forEach(k => scaled(c, TOPPING_AT[k], COUNTER, 1.15, () => paintToppingBowl(c, k, g.phase === 'toppings' && g.topping === k, t)));
    paintBigPlate(c, g);
  } else {
    // The ingredients wait at the left, unless on their way into the bowl.
    scaled(c, AT.egg, COUNTER, S, () => paintCarton(c, EGGS - g.eggs, g.hint === 'egg', t));
    for (const what of ['milk', 'flour'] as const) {
      // The carton and the bag go over the bowl, tip, and come back.
      const p = g.pours.find(q => q.what === what), home: Pt = [AT[what], COUNTER - 6];
      const u = p ? p.since / (TUNING.into + 0.6) : 0, k = smooth01(u * 2.2) * (1 - smooth01((u - 0.6) * 2.5));
      const at: Pt = [home[0] + (BOWL.x - 80 - home[0]) * k, home[1] - 110 * k], tilt = k * (what === 'milk' ? 1.9 : 2.2);
      if (p && k > 0.6) {
        if (what === 'milk') line(c, '#ffffff', 7, [[at[0] + 66, at[1] - 52], [BOWL.x - 10, BOWL.y]]);
        else for (let i = 0; i < 10; i++) oval(c, 'rgba(255, 255, 255, 0.8)', BOWL.x - 30 + Math.sin(i * 7 + t * 9) * 40, BOWL.y - 20 - (i * 9 + t * 60) % 80, 6, 5);
      }
      scaled(c, at[0], at[1], S, () => { if (what === 'milk') paintMilk(c, at[0], at[1], tilt); else paintFlour(c, at[0], at[1], tilt); });
      if (g.hint === what) sparkles(c, home[0], home[1] - 66, t, 40);
    }
    paintBowl(c, g, v.stirAngle);
    // Eggs on their way: an arc from the carton, cracking at the rim.
    for (const p of g.pours.filter(q => q.what === 'egg')) {
      const u = Math.min(1, p.since / TUNING.into), ex = AT.egg + (BOWL.x - AT.egg) * u, ey = COUNTER - 50 - Math.sin(u * Math.PI) * 120 + (BOWL.y - 30 - (COUNTER - 40)) * u;
      if (!p.landed) eggShape(c, ex, ey, S, u * 5);
      else { const s = p.since - TUNING.into; eggShape(c, BOWL.x - 16 - s * 30, BOWL.y - 34 + s * 80, 0.9, -1); eggShape(c, BOWL.x + 16 + s * 30, BOWL.y - 34 + s * 80, 0.9, 1); }
    }
    paintPan(c, g, t); paintPlate(c, g);
  }
  // The hint: a bouncing arrow and sparkles over the next thing to do.
  if (g.hint) {
    const [hx, hy] = hintAt(g.hint), top = hy + Math.sin(t * 6) * 8;
    path(c, [[hx - 14, top], [hx + 14, top], [hx + 14, top + 18], [hx + 26, top + 18], [hx, top + 44], [hx - 26, top + 18], [hx - 14, top + 18]], true);
    c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
    sparkles(c, hx, top + 70, t);
  }
}
