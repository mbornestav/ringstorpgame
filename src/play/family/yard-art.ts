import {
  FAR, INK, MID, TAU, bake, box, flower, hgrad, line, lumps, outlined, oval, paintApple, paintCloud, paintFar, paintFore, paintLight,
  paintMid, paintPreschool, paintSky, paintTree, path, put, rgba, rgrad, seeded, softShadow, strip, stroke, tile, vgrad, type C, type Sprite,
} from './art';
import { COUNT_X, DOOR_X, FRIENDS, YARD, type KidLook, type PlaceKind, type SurpriseKind } from './games/kurragomma';
import type { HideRun, Spot } from './hide-run';
import { CARL_OTTO, TEACHER_LOOK, feet, kid, paintHead, wavingArm } from './kids';

// The preschool yard in Höganäs for Kurragömma: the red preschool on the left, the play things across the yard, the sea
// and Kullaberg beyond the fence. Static things are baked once (like the ride); the children are drawn live. A hiding
// place has a back and a front sprite, and whoever hides there is drawn between them, so only their "tell" shows.

const W = 960;
/** Where everyone stands on the ground. */
export const GROUND = 452;
/** Where the teacher stands, by the preschool, when she is watching or giving a hint. */
export const TEACHER_X = DOOR_X + 330;
/** The preschool is drawn larger than on the ride: here the children stand right in front of it. */
const PRESCHOOL_SCALE = 1.6;
const PRESCHOOL_X = DOOR_X - 189 * PRESCHOOL_SCALE;

interface PlaceArt { back?: Sprite; front?: Sprite }
interface YardArt {
  sky: Sprite; clouds: Sprite[]; far: Sprite; mid: Sprite; fence: Sprite; lawn: Sprite; fore: Sprite; light: Sprite;
  preschool: Sprite; tree: Sprite; foliage: Sprite; places: Record<PlaceKind, PlaceArt>; apple: Sprite;
}
let art: YardArt | null = null;

// ---------------------------------------------------------------- the yard itself

const FENCE = 480, LAWN = 600;
function paintFence(c: C): void {
  // A white picket fence along the back of the yard, lit from the right, with a soft shadow on the grass below.
  c.fillStyle = vgrad(c, 384, 400, [[0, 'rgba(60, 80, 40, 0.3)'], [1, 'rgba(60, 80, 40, 0)']]); c.fillRect(0, 384, FENCE, 16);
  box(c, '#cfd3c7', 0, 352, FENCE, 5); box(c, '#cfd3c7', 0, 372, FENCE, 5);
  for (let x = 6; x < FENCE; x += 16) {
    path(c, [[x, 388], [x, 344], [x + 5, 338], [x + 10, 344], [x + 10, 388]], true);
    c.fillStyle = hgrad(c, x, x + 10, [[0, '#dcdfd4'], [0.6, '#f4f5ee'], [1, '#ffffff']]); c.fill(); stroke(c, rgba(INK, 0.55), 1);
  }
}

function paintLawn(c: C): void {
  c.fillStyle = vgrad(c, 386, 540, [[0, '#98b862'], [0.5, '#8aad55'], [1, '#779a47']]); c.fillRect(0, 386, LAWN, 154);
  const rand = seeded(71);
  // A worn path where everyone runs, and tufts, clover and daisies.
  c.fillStyle = vgrad(c, 432, 478, [[0, 'rgba(214, 196, 150, 0)'], [0.5, 'rgba(214, 196, 150, 0.55)'], [1, 'rgba(214, 196, 150, 0)']]); c.fillRect(0, 432, LAWN, 46);
  for (let i = 0; i < 420; i++) {
    const x = rand() * LAWN, y = 392 + rand() * 140;
    line(c, rand() < 0.5 ? 'rgba(180, 206, 120, 0.6)' : 'rgba(96, 130, 60, 0.5)', 1.1, [[x, y], [x + 1.5, y - 3.5]]);
  }
  for (let i = 0; i < 14; i++) flower(c, rand() * LAWN, 400 + rand() * 120, '#fbf7e8', '#f2c230', 2.6);
}

// ---------------------------------------------------------------- hiding places

function lampPost(c: C): void {
  // Front only: a thin lamp post, far too thin to hide behind.
  softShadow(c, -4, 2, 16, 3, 0.35);
  box(c, INK, -4, -214, 8, 216, 2); box(c, hgrad(c, -3, 3, [[0, '#5b6765'], [1, '#9ba7a4']]), -2.5, -212, 5, 214, 1.5);
  box(c, INK, -18, -226, 36, 14, 5); box(c, '#3f4a48', -16, -224, 32, 10, 4);
  oval(c, 'rgba(255, 246, 200, 0.9)', 0, -212, 12, 3);
}

function sandpit(c: C, part: 'back' | 'front'): void {
  if (part === 'back') {
    softShadow(c, 0, 8, 96, 8, 0.3);
    box(c, '#9a7045', -90, -26, 180, 12, 3);
    c.fillStyle = vgrad(c, -20, 0, [[0, '#f1dca4'], [1, '#d9bf82']]); c.fillRect(-84, -20, 168, 22);
    return;
  }
  // The sand in front, a mound, the wooden edge, a bucket and a spade.
  const rand = seeded(9);
  c.beginPath(); c.moveTo(-84, 2); c.quadraticCurveTo(-40, -22, 0, -16); c.quadraticCurveTo(40, -10, 84, 2); c.closePath();
  c.fillStyle = vgrad(c, -22, 2, [[0, '#f4e2b0'], [1, '#e0c78c']]); c.fill();
  for (let i = 0; i < 60; i++) oval(c, rgba(rand() < 0.5 ? '#b99a60' : '#fff4d4', 0.6), -80 + rand() * 160, -12 + rand() * 12, 0.9, 0.6);
  box(c, INK, -92, 0, 184, 12, 3); box(c, hgrad(c, -90, 90, [[0, '#8a623c'], [1, '#b48a58']]), -90, 1.5, 180, 9, 2.5);
  path(c, [[48, -18], [66, -18], [62, 0], [52, 0]], true); c.fillStyle = '#e8473c'; c.fill(); stroke(c, INK, 1.4);
  line(c, INK, 1.2, [[48, -18], [57, -28], [66, -18]]);
  line(c, INK, 3, [[-60, -2], [-44, -30]]); line(c, '#3aa0d8', 1.6, [[-60, -2], [-44, -30]]);
  path(c, [[-46, -34], [-38, -30], [-44, -24]], true); c.fillStyle = '#3aa0d8'; c.fill(); stroke(c, INK, 1.2);
}

function playhouse(c: C, part: 'back' | 'front'): void {
  const wall = (fill: string | CanvasGradient) => { c.beginPath(); c.rect(-70, -120, 140, 120); c.fillStyle = fill; c.fill(); };
  if (part === 'back') {
    softShadow(c, 0, 2, 84, 8, 0.35);
    // The dark room inside, seen through the window.
    box(c, '#3a2a26', -44, -92, 44, 38);
    return;
  }
  // The walls with the window cut out, so whoever is inside shows through.
  c.save(); c.beginPath(); c.rect(-72, -150, 144, 152); c.rect(-44, -92, 44, 38); c.clip('evenodd');
  wall(hgrad(c, -70, 70, [[0, '#e0b33f'], [0.6, '#f2c94c'], [1, '#f7d56a']]));
  for (let x = -66; x < 70; x += 10) box(c, 'rgba(120, 80, 20, 0.2)', x, -120, 1.2, 120);
  c.restore();
  c.beginPath(); c.rect(-70, -120, 140, 120); c.rect(-44, -92, 44, 38); stroke(c, INK, 1.8);
  // Roof, door, window frame, flower box.
  path(c, [[-84, -118], [0, -172], [84, -118]], true); c.fillStyle = hgrad(c, -84, 84, [[0, '#b03a2f'], [1, '#e0574a']]); c.fill(); stroke(c, INK, 2);
  line(c, 'rgba(255, 220, 200, 0.5)', 2, [[4, -166], [76, -121]]);
  box(c, INK, 18, -76, 36, 76, 3); box(c, '#3d86c2', 20, -74, 32, 74, 2); oval(c, '#f2c94c', 46, -38, 2.4, 2.4);
  c.beginPath(); c.rect(-44, -92, 44, 38); stroke(c, '#ffffff', 3.4); stroke(c, INK, 1);
  line(c, '#ffffff', 2.4, [[-22, -92], [-22, -54]]);
  box(c, '#8b6a48', -48, -54, 52, 7, 2);
  for (let i = 0; i < 5; i++) flower(c, -42 + i * 10, -55, i % 2 ? '#e2544a' : '#f39ab0', '#fff2c6', 2.4);
}

function slide(c: C): void {
  // The slide stands over the hiding child: ladder on the left, platform, and the chute down to the right.
  softShadow(c, 10, 2, 110, 8, 0.3);
  for (const x of [-72, -52]) { box(c, INK, x - 2, -150, 6, 152, 2); box(c, '#9aa4a8', x - 0.5, -148, 3, 150, 1); }
  for (let y = -130; y < 0; y += 22) { box(c, INK, -72, y, 24, 5, 2); box(c, '#c4ccd0', -71, y + 1, 22, 3, 1); }
  box(c, INK, -76, -156, 50, 12, 3); box(c, '#e0574a', -74, -154, 46, 8, 2);
  c.beginPath(); c.moveTo(-30, -156); c.bezierCurveTo(20, -150, 40, -40, 100, -12); c.lineTo(104, -2); c.lineTo(90, -2);
  c.bezierCurveTo(34, -30, 12, -132, -30, -140); c.closePath();
  c.fillStyle = hgrad(c, -30, 104, [[0, '#2f8fd0'], [1, '#6cc0ee']]); c.fill(); stroke(c, INK, 2);
  c.beginPath(); c.moveTo(-26, -150); c.bezierCurveTo(22, -142, 40, -40, 98, -12); stroke(c, 'rgba(255, 255, 255, 0.55)', 2);
  box(c, INK, 76, -40, 6, 42, 2); box(c, '#9aa4a8', 77.5, -38, 3, 40, 1);
}

function bush(c: C): void {
  softShadow(c, 0, 2, 92, 9, 0.35);
  const rand = seeded(55);
  for (const [dx, dy, rx, ry, dark] of [[-38, -40, 46, 38, 1], [34, -42, 50, 40, 1], [0, -64, 56, 44, 0], [-20, -30, 44, 30, 0], [26, -28, 46, 30, 0]] as const) {
    lumps(c, dx, dy, rx, ry, 10, rand, 0.14);
    c.fillStyle = rgrad(c, dx, dy, Math.max(rx, ry) * 1.3, [[0, dark ? '#7fa24a' : '#9ec060'], [0.6, dark ? '#577a36' : '#6b9140'], [1, '#3e5c28']], dx + rx * 0.4, dy - ry * 0.5);
    c.fill(); stroke(c, rgba('#2f4a1f', 0.55), 1.5);
    for (let n = 0; n < 14; n++) oval(c, rgba(rand() < 0.5 ? '#c7dc84' : '#2f4d22', 0.5), dx + (rand() - 0.5) * rx * 1.4, dy + (rand() - 0.5) * ry * 1.2, 3, 1.8, rand() * 3);
  }
}

function cardboardBox(c: C): void {
  softShadow(c, 0, 2, 64, 7, 0.35);
  box(c, INK, -52, -84, 104, 86, 2); box(c, hgrad(c, -50, 50, [[0, '#b88a52'], [0.6, '#d3a86a'], [1, '#e0b77a']]), -50, -82, 100, 82, 1.5);
  box(c, '#c9a06a', -2, -82, 4, 82); box(c, 'rgba(90, 60, 30, 0.25)', -50, -82, 100, 6);
  // Open flaps on top.
  path(c, [[-50, -82], [-66, -104], [-10, -98], [0, -82]], true); c.fillStyle = '#c99a5e'; c.fill(); stroke(c, INK, 1.6);
  path(c, [[50, -82], [62, -106], [14, -100], [0, -82]], true); c.fillStyle = '#dcb074'; c.fill(); stroke(c, INK, 1.6);
  // "FRAGILE" arrows and a smiley someone drew.
  for (const x of [-30, 28]) { line(c, '#7a4c2a', 2, [[x, -30], [x, -52]]); line(c, '#7a4c2a', 2, [[x - 6, -46], [x, -54], [x + 6, -46]]); }
  c.beginPath(); c.arc(0, -38, 11, 0, TAU); stroke(c, '#3a6fb4', 1.8);
  oval(c, '#3a6fb4', -4, -41, 1.4, 1.6); oval(c, '#3a6fb4', 4, -41, 1.4, 1.6);
  c.beginPath(); c.arc(0, -38, 6, 0.3, Math.PI - 0.3); stroke(c, '#3a6fb4', 1.6);
}

function bikeShed(c: C, part: 'back' | 'front'): void {
  if (part === 'back') {
    softShadow(c, 0, 2, 110, 8, 0.3);
    box(c, INK, -96, -142, 192, 144, 2); box(c, hgrad(c, -94, 94, [[0, '#8a5a3a'], [1, '#b0785a']]), -94, -140, 188, 142);
    for (let x = -88; x < 94; x += 12) box(c, 'rgba(60, 30, 20, 0.3)', x, -140, 1.4, 142);
    box(c, 'rgba(20, 10, 10, 0.3)', -94, -140, 188, 18);
    path(c, [[-110, -140], [110, -150], [110, -136], [-110, -126]], true); c.fillStyle = '#4b5a5c'; c.fill(); stroke(c, INK, 2);
    return;
  }
  // Three children's bikes in the rack, in front of whoever crouches behind them.
  for (const [bx, col] of [[-58, '#d63c34'], [0, '#3aa0d8'], [58, '#f2c230']] as const) {
    for (const wx of [bx - 17, bx + 17]) { oval(c, INK, wx, -16, 16, 16); oval(c, '#e8eee8', wx, -16, 12, 12); oval(c, '#7a8784', wx, -16, 2.5, 2.5); }
    line(c, INK, 6, [[bx - 17, -16], [bx - 4, -36], [bx + 10, -36], [bx + 17, -16]]); line(c, col, 3.4, [[bx - 17, -16], [bx - 4, -36], [bx + 10, -36], [bx + 17, -16]]);
    line(c, INK, 5, [[bx - 4, -36], [bx - 8, -44]]); box(c, INK, bx - 14, -48, 12, 5, 2);
    line(c, INK, 4, [[bx + 10, -36], [bx + 12, -48]]); line(c, INK, 4, [[bx + 8, -48], [bx + 18, -50]]);
  }
  box(c, INK, -96, -6, 192, 6, 2); box(c, '#9aa4a8', -94, -5, 188, 3, 1);
}

function leafPile(c: C, breathe: number): void {
  softShadow(c, 0, 2, 70, 7, 0.3);
  c.save(); c.scale(1 + breathe * 0.02, 1 + breathe * 0.06);
  const rand = seeded(81);
  c.beginPath(); c.moveTo(-68, 0); c.quadraticCurveTo(-50, -64, 0, -66); c.quadraticCurveTo(52, -64, 70, 0); c.closePath();
  c.fillStyle = rgrad(c, 10, -40, 70, [[0, '#f0a93a'], [0.6, '#d9782c'], [1, '#a4481f']], 22, -50); c.fill(); stroke(c, rgba('#5a2a14', 0.6), 1.6);
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI, r = Math.sqrt(rand()) * 0.95, x = Math.cos(a) * r * 66, y = -Math.sin(a) * r * 62;
    oval(c, ['#f5c542', '#e0572c', '#b8431f', '#f0913a', '#9a6a2a'][Math.floor(rand() * 5)], x, y, 5, 2.6, rand() * 3);
  }
  c.restore();
}

// ---------------------------------------------------------------- surprises

function surprise(c: C, kind: SurpriseKind, x: number, t: number): void {
  const pop = Math.min(1, t / 0.35), y = GROUND - Math.sin(Math.min(1, t / 0.5) * Math.PI) * 18;
  c.save(); c.translate(x, y); c.scale(pop, pop);
  if (kind === 'cat') {
    softShadow(c, 0, 0, 24, 4);
    oval(c, INK, 0, -18, 19, 17); oval(c, '#f0a042', 0, -18, 17, 15);
    for (let i = -1; i <= 1; i++) line(c, '#c8762a', 2, [[i * 6 - 3, -28], [i * 6 + 1, -14]]);
    const tail = Math.sin(t * 6) * 6; line(c, INK, 7, [[14, -10], [26, -24 + tail], [22, -38 + tail]]); line(c, '#f0a042', 4.4, [[14, -10], [26, -24 + tail], [22, -38 + tail]]);
    oval(c, INK, -6, -42, 14, 12); oval(c, '#f0a042', -6, -42, 12.4, 10.4);
    for (const s of [-1, 1]) { path(c, [[-6 + s * 4, -50], [-6 + s * 11, -60], [-6 + s * 12, -46]], true); c.fillStyle = '#f0a042'; c.fill(); stroke(c, INK, 1.4); }
    line(c, INK, 1.4, [[-12, -43], [-9, -45], [-6, -43]]); line(c, INK, 1.4, [[-4, -43], [-1, -45], [2, -43]]);
    oval(c, '#e2867a', -5, -39, 1.8, 1.3);
    for (const s of [-1, 1]) line(c, INK, 0.9, [[-5, -38], [-5 + s * 14, -40]]);
  } else if (kind === 'hedgehog') {
    softShadow(c, 0, 0, 24, 4);
    const w = Math.sin(t * 5) * 2;
    c.beginPath(); for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI, r = i % 2 ? 22 : 30; c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8 - 2); } c.closePath();
    c.fillStyle = '#6b4a30'; c.fill(); stroke(c, INK, 1.6);
    oval(c, INK, 24 + w, -8, 11, 8); oval(c, '#d9b58a', 24 + w, -8, 9.6, 6.6); oval(c, INK, 34 + w, -8, 2.4, 2.2); oval(c, INK, 25 + w, -11, 1.4, 1.6);
  } else if (kind === 'cushion') {
    const puff = Math.max(0, 1 - t / 1.2);
    oval(c, INK, 0, -10, 26, 12); oval(c, '#f06d9a', 0, -10, 24, 10.5); oval(c, 'rgba(255, 255, 255, 0.4)', 6, -14, 10, 3);
    box(c, INK, -34, -14, 10, 8, 3); box(c, '#f06d9a', -33, -13, 8, 6, 2.5);
    c.globalAlpha = puff;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-44 - i * 10 - (1 - puff) * 20, -10, 5 + i * 3, 0, TAU); stroke(c, '#c9d6c2', 2); }
    c.globalAlpha = 1;
  } else if (kind === 'glasses') {
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 10, -8, 8, 0, TAU); stroke(c, INK, 3.4); stroke(c, '#6b3b2c', 2); }
    line(c, '#6b3b2c', 2, [[-2, -9], [2, -9]]);
    const tw = Math.abs(Math.sin(t * 5));
    for (const [sx, sy] of [[14, -20], [-12, -22]] as const) { line(c, '#fffbea', 1.6, [[sx - 4 * tw, sy], [sx + 4 * tw, sy]]); line(c, '#fffbea', 1.6, [[sx, sy - 4 * tw], [sx, sy + 4 * tw]]); }
  } else if (kind === 'sock') {
    c.rotate(Math.sin(t * 4) * 0.1);
    path(c, [[-8, -40], [8, -40], [8, -12], [22, -8], [22, 0], [-8, 0]], true); c.fillStyle = '#ffffff'; c.fill(); stroke(c, INK, 1.8);
    c.save(); path(c, [[-8, -40], [8, -40], [8, -12], [22, -8], [22, 0], [-8, 0]], true); c.clip();
    for (let yy = -38; yy < 0; yy += 8) box(c, '#e0503f', -10, yy, 34, 4);
    c.restore();
  } else {
    const k = t * 6;
    softShadow(c, 0, 0, 20, 3);
    c.beginPath(); c.moveTo(-18 - k * 0, 0); c.quadraticCurveTo(-4, -6, 18, 0); stroke(c, INK, 7); stroke(c, '#c9b48a', 4.6);
    oval(c, INK, 2, -12, 12, 12); oval(c, '#b8743a', 2, -12, 10.4, 10.4);
    c.beginPath(); c.arc(2, -12, 6, 0, TAU * 0.8); stroke(c, '#8a4a24', 1.6);
    line(c, INK, 1.4, [[16, -2], [18, -12]]); line(c, INK, 1.4, [[18, -2], [22, -11]]);
    oval(c, INK, 18, -13, 1.6, 1.6); oval(c, INK, 22, -12, 1.6, 1.6);
  }
  c.restore();
}

// ---------------------------------------------------------------- baking

function getArt(): YardArt {
  if (art) return art;
  const places: Record<PlaceKind, PlaceArt> = {
    lamp: { front: bake(60, 240, 30, 230, lampPost) },
    sandpit: { back: bake(210, 60, 105, 40, c => sandpit(c, 'back')), front: bake(210, 70, 105, 50, c => sandpit(c, 'front')) },
    playhouse: { back: bake(190, 190, 95, 180, c => playhouse(c, 'back')), front: bake(190, 190, 95, 180, c => playhouse(c, 'front')) },
    slide: { front: bake(250, 180, 100, 170, slide) },
    tree: {},
    bush: { front: bake(220, 130, 110, 118, bush) },
    box: { front: bake(150, 130, 75, 118, cardboardBox) },
    shed: { back: bake(240, 170, 120, 158, c => bikeShed(c, 'back')), front: bake(240, 80, 120, 70, c => bikeShed(c, 'front')) },
    leaves: {},
  };
  art = {
    sky: bake(W, 400, 0, 0, paintSky),
    clouds: [[3, 150, 44], [8, 110, 32], [13, 190, 50]].map(([seed, w, h]) => bake(w + 60, h * 2 + 20, w / 2 + 30, h * 1.6 + 10, c => paintCloud(c, seed, w, h))),
    far: strip(FAR, 250, 150, paintFar), mid: strip(MID, 290, 110, paintMid),
    fence: strip(FENCE, 330, 72, paintFence), lawn: strip(LAWN, 384, 156, paintLawn), fore: strip(600, 470, 70, paintFore),
    light: bake(W, 540, 0, 0, paintLight),
    preschool: bake(470, 150, 30, 12, paintPreschool),
    tree: bake(270, 270, 130, 250, c => paintTree(c, 404)),
    foliage: bake(120, 90, 60, 45, c => { const rand = seeded(12); lumps(c, 0, 0, 48, 34, 10, rand, 0.14); c.fillStyle = rgrad(c, 0, 0, 60, [[0, '#a3c05f'], [0.5, '#62853d'], [1, '#46672d']], 18, -16); c.fill(); stroke(c, rgba('#2f4a1f', 0.55), 1.5); }),
    places, apple: bake(34, 34, 16, 18, paintApple),
  };
  return art;
}

// ---------------------------------------------------------------- a frame

/** The left edge of the view in world pixels, keeping Carl-Otto a little left of centre. */
export const cameraFor = (x: number): number => Math.max(0, Math.min(YARD - W, x - W * 0.42));

/** A hidden friend's give-away, drawn between the place's back and front. */
function tell(c: C, s: Spot, t: number, look: KidLook, near: boolean): void {
  const wig = near ? Math.sin(t * 20) * 2 : 0;
  switch (s.kind) {
    case 'lamp': kid(c, s.x + 2 + wig, GROUND, look, { kind: 'eyes' }, -1); break;
    case 'sandpit': paintHead(c, s.x - 10 + wig, GROUND - 26, look, { eyes: Math.sin(t * 2) > 0.9 ? 'shut' : 'open' }); hat(c, s.x - 10 + wig, GROUND - 44); break;
    case 'playhouse': {
      c.save(); c.beginPath(); c.rect(s.x - 44, GROUND - 92, 44, 38); c.clip();
      kid(c, s.x - 22, GROUND - 30, look, { kind: 'stand' }, 1, { eyes: Math.sin(t * 1.3) > 0.95 ? 'shut' : 'wide', mouth: 'smile' });
      c.restore(); break;
    }
    case 'slide': kid(c, s.x + 26 + wig, GROUND, look, { kind: 'crouch' }, -1, { mouth: 'grin' }); break;
    case 'tree': kid(c, s.x + 30 + wig, GROUND - 150, look, { kind: 'sit', t }, 1); break;
    case 'bush': feet(c, s.x + 70, GROUND - 12 + wig * 0.5, look, t, 1); break;
    case 'box': wavingArm(c, s.x + 10, GROUND - 84 + wig, look, t); break;
    case 'shed': paintHead(c, s.x + 4 + wig, GROUND - 58 + Math.sin(t * 2) * 3, look, { eyes: 'wide', mouth: 'smile' }); break;
    case 'leaves': {
      const blink = Math.sin(t * 1.7) > 0.93;
      for (const ex of [-8, 8]) { oval(c, '#ffffff', s.x + ex, GROUND - 30, 4.4, blink ? 0.8 : 4.4); if (!blink) oval(c, INK, s.x + ex + 1, GROUND - 30, 2, 2.2); }
      break;
    }
  }
}

function hat(c: C, x: number, y: number): void {
  c.beginPath(); c.moveTo(x - 22, y + 6); c.quadraticCurveTo(x, y - 4, x + 24, y + 6); c.quadraticCurveTo(x + 18, y - 16, x, y - 18); c.quadraticCurveTo(x - 18, y - 16, x - 22, y + 6); c.closePath();
  c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1.8);
  line(c, '#d9a620', 2, [[x - 16, y - 2], [x + 18, y - 2]]);
}

/** One frame of the yard, in world units on a context scaled to the 960 × 540 world. */
export function drawYard(c: C, g: Pick<HideRun, 'x' | 'facing' | 'walking' | 'mode' | 'count' | 'spots' | 'runners' | 'near' | 'hint'>, t: number): number {
  // At the end everyone is at the preschool door, Carl-Otto too: the view goes back there for the cheering.
  const won = g.mode === 'won', a = getArt(), cam = won ? 0 : cameraFor(g.x);
  c.drawImage(a.sky.canvas, 0, 0, W, 400);
  for (let i = 0; i < 4; i++) put(c, a.clouds[i % 3], ((i * 300 + 120 - cam * 0.05 + t * 4) % 1200 + 1200) % 1200 - 120, 110 + (i % 2) * 40);
  tile(c, a.far, cam * 0.1); tile(c, a.mid, cam * 0.25);
  c.save(); c.translate(-cam, 0);
  // The fence and lawn tile across the whole yard; the preschool stands at the left end.
  for (let x = Math.floor(cam / FENCE) * FENCE; x < cam + W; x += FENCE) c.drawImage(a.fence.canvas, x, 330, a.fence.w, a.fence.h);
  for (let x = Math.floor(cam / LAWN) * LAWN; x < cam + W; x += LAWN) c.drawImage(a.lawn.canvas, x, 384, a.lawn.w, a.lawn.h);
  put(c, a.preschool, PRESCHOOL_X, GROUND - 6 - 114 * PRESCHOOL_SCALE, PRESCHOOL_SCALE);
  const hidden = new Map(g.spots.filter(s => s.friend && !s.opened).map(s => [s, s.friend!]));
  for (const s of g.spots) {
    if (s.x < cam - 200 || s.x > cam + W + 200) continue;
    const p = a.places[s.kind], near = g.near === s && hidden.has(s);
    if (s.kind === 'tree') put(c, a.tree, s.x, GROUND);
    if (p.back) put(c, p.back, s.x, GROUND);
    // While the count has only just begun, the friends are still running off to hide.
    const friend = g.mode === 'counting' && g.count < 4 ? undefined : hidden.get(s);
    if (friend) tell(c, s, t + s.x, friend.look, near);
    if (s.kind === 'tree') { put(c, a.foliage, s.x + 30, GROUND - 190); }
    if (s.kind === 'leaves') leafPile(c, friend ? Math.sin(t * 2.4) : 0);
    if (p.front) put(c, p.front, s.x, GROUND);
    if (s.kind === 'leaves' && friend) tell(c, s, t, friend.look, near);
    if (s.opened && s.surprise) surprise(c, s.surprise, s.x + (s.kind === 'tree' ? 0 : 40), s.since);
  }
  // Everyone out in the open, drawn as outlined sprites: found friends, the teacher when she has a hint, Carl-Otto.
  outlined(c, o => {
    const hint = g.hint;
    if (g.mode === 'counting' || hint) kid(o, TEACHER_X, GROUND - 4, TEACHER_LOOK, hint ? { kind: 'point', t } : { kind: 'stand' }, 1, {}, 1.45);
    for (const r of g.runners) {
      if (r.t < 0) kid(o, r.from + 40, GROUND, r.friend.look, { kind: 'pop', t: r.t + 2.2 }, -1, { eyes: 'wide', mouth: 'open' });
      else if (!r.home) kid(o, r.x, GROUND, r.friend.look, { kind: 'run', phase: t * 14 }, -1, { mouth: 'grin' });
      else kid(o, r.x, GROUND - 2, r.friend.look, g.mode === 'won' || Math.sin(t * 3 + r.slot) > 0.6 ? { kind: 'cheer', t: t + r.slot } : { kind: 'stand' }, 1, { mouth: 'grin' });
    }
    if (g.mode === 'counting' || g.mode === 'ready') kid(o, COUNT_X, GROUND, CARL_OTTO, { kind: 'eyes' }, -1);
    else if (won) kid(o, DOOR_X - 10, GROUND, CARL_OTTO, { kind: 'cheer', t: t + 0.5 }, 1, { mouth: 'grin' });
    else kid(o, g.x, GROUND, CARL_OTTO, g.walking ? { kind: 'walk', phase: t * 11 } : { kind: 'stand' }, g.facing);
  });
  // Friends running off to hide while he counts.
  if (g.mode === 'counting' && g.count < 4) FRIENDS.forEach((f, i) => kid(c, COUNT_X + 120 + (t * 260 + i * 80) % 1400, GROUND + 4, f.look, { kind: 'run', phase: t * 14 + i }, 1, { mouth: 'grin' }));
  // A bouncing arrow over the friend the teacher points at.
  if (g.hint) {
    const hx = g.hint.x, hy = GROUND - 250 + Math.sin(t * 6) * 8;
    path(c, [[hx - 14, hy], [hx + 14, hy], [hx + 14, hy + 18], [hx + 26, hy + 18], [hx, hy + 44], [hx - 26, hy + 18], [hx - 14, hy + 18]], true);
    c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
  }
  c.restore();
  tile(c, a.fore, cam * 1.15);
  c.drawImage(a.light.canvas, 0, 0, W, 540);
  return cam;
}

/** The chooser's preview: the yard mid-game, three friends hidden and one found. */
export function drawYardPreview(c: C): void {
  const g = {
    x: 1180, facing: 1 as const, walking: true, mode: 'seeking' as const, count: 10, near: null, hint: null, runners: [],
    spots: [
      { kind: 'playhouse' as const, x: 1030, friend: FRIENDS[2], surprise: null, opened: false, since: 0, giggleIn: 0, giggling: 0 },
      { kind: 'slide' as const, x: 1290, friend: FRIENDS[3], surprise: null, opened: false, since: 0, giggleIn: 0, giggling: 0 },
      { kind: 'tree' as const, x: 1520, friend: FRIENDS[4], surprise: null, opened: false, since: 0, giggleIn: 0, giggling: 0 },
      { kind: 'sandpit' as const, x: 780, friend: FRIENDS[1], surprise: null, opened: false, since: 0, giggleIn: 0, giggling: 0 },
      { kind: 'bush' as const, x: 1740, friend: FRIENDS[0], surprise: null, opened: false, since: 0, giggleIn: 0, giggling: 0 },
    ],
  };
  drawYard(c, g, 1.3);
}
