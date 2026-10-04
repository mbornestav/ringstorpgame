import { INK, TAU, box, line, oval, path, rgba, rgrad, seeded, stroke, vgrad, type C, type Pt } from './art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { FACE, FACES, ITEMS, MIRROR, TRAY, type ItemId } from './games/toa';
import { PAPER } from './games/pyssel';
import { FEATURES, bedtimeLook, paintMirrorFace } from './mirror-face';
import type { SillyRun } from './silly-run';

// The little toilet for Fånig i spegeln, after the family's photo: coral-pink walls, framed pictures up the side, and the
// mirror with its light bar, where Carl-Otto sees himself against the dark plank wall behind him, with its crate shelf, the
// brass lantern and the two paper fans. Along the bottom, on the edge of the basin, a tray of silly things to wear.

const W = 960;
const PINK = '#e8907e';

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}

/** The middle of each thing's place on the tray. */
export const trayAt = (i: number): Pt => [TRAY.x0 + i * TRAY.step, TRAY.y];

// ---------------------------------------------------------------- the things to wear (face units, about their place)

function paintItem(c: C, id: ItemId): void {
  if (id === 'crown') {
    path(c, [[-56, 0], [-56, -40], [-30, -18], [0, -52], [30, -18], [56, -40], [56, 0]], true); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 3);
    for (const [jx, col] of [[-30, '#e2432f'], [0, '#3157b8'], [30, '#62b046']] as const) { oval(c, INK, jx, -10, 8, 8); oval(c, col, jx, -10, 6.5, 6.5); }
    box(c, 'rgba(255, 255, 255, 0.4)', -50, -6, 100, 4);
  } else if (id === 'pirate') {
    c.beginPath(); c.moveTo(-90, 10); c.quadraticCurveTo(-60, -70, 0, -74); c.quadraticCurveTo(60, -70, 90, 10); c.quadraticCurveTo(0, -14, -90, 10); c.closePath(); c.fillStyle = '#2b2b2e'; c.fill(); stroke(c, INK, 3);
    oval(c, '#fbfaf6', 0, -38, 12, 11); for (const s of [-1, 1]) line(c, '#fbfaf6', 4, [[-16 * s, -18], [16 * s, -8]]);
    oval(c, INK, -4, -40, 3, 3); oval(c, INK, 4, -40, 3, 3);
  } else if (id === 'party') {
    path(c, [[-40, 0], [0, -100], [40, 0]], true); c.fillStyle = '#6fbde8'; c.fill(); stroke(c, INK, 3);
    c.save(); path(c, [[-40, 0], [0, -100], [40, 0]], true); c.clip(); for (let i = 0; i < 6; i++) box(c, i % 2 ? '#f07fb0' : '#f2c230', -50, -100 + i * 18, 100, 8); c.restore();
    path(c, [[-40, 0], [0, -100], [40, 0]], true); stroke(c, INK, 3);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; oval(c, ['#e2432f', '#f2c230', '#62b046'][i % 3], Math.cos(a) * 12, -104 + Math.sin(a) * 12, 8, 5, a); }
  } else if (id === 'bow') {
    for (const s of [-1, 1]) { path(c, [[0, 0], [s * 50, -30], [s * 56, 18], [0, 0]], true); c.fillStyle = '#f07fb0'; c.fill(); stroke(c, INK, 3); }
    oval(c, INK, 0, -4, 14, 14); oval(c, '#e05a96', 0, -4, 12, 12);
  } else if (id === 'glasses' || id === 'sunglasses') {
    for (const [ex] of FEATURES.eyes) { c.beginPath(); c.arc(ex, 0, 24, 0, TAU); if (id === 'sunglasses') { c.fillStyle = 'rgba(30, 30, 40, 0.92)'; c.fill(); } stroke(c, id === 'sunglasses' ? INK : '#c8302a', 6); }
    line(c, id === 'sunglasses' ? INK : '#c8302a', 5, [[-10, -4], [10, -4]]);
    if (id === 'sunglasses') for (const [ex] of FEATURES.eyes) line(c, 'rgba(255, 255, 255, 0.6)', 3, [[ex - 10, -10], [ex - 2, -16]]);
  } else if (id === 'stars') {
    for (const [ex] of FEATURES.eyes) {
      c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 14 : 30; c.lineTo(ex + Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
      c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 3); oval(c, 'rgba(110, 190, 232, 0.55)', ex, 2, 11, 10);
    }
    line(c, '#f2c230', 5, [[-14, -2], [14, -2]]);
  } else if (id === 'clown') { oval(c, INK, 0, 0, 20, 20); oval(c, rgrad(c, -6, -6, 22, [[0, '#ff7a6a'], [1, '#d6372c']]), 0, 0, 18, 18); oval(c, 'rgba(255, 255, 255, 0.7)', -6, -7, 5, 4); }
  else {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, -4); c.bezierCurveTo(s * 20, -16, s * 44, -10, s * 54, -24); c.bezierCurveTo(s * 52, 2, s * 22, 8, 0, 4); c.closePath(); c.fillStyle = '#6b4a2e'; c.fill(); stroke(c, INK, 3); }
  }
}

/** Where each thing sits on the face (face units). */
function placeOf(id: ItemId): Pt {
  const slot = ITEMS.find(i => i.id === id)!.slot;
  return slot === 'head' ? (id === 'bow' ? [-58, -94] : id === 'pirate' ? [0, -96] : [0, -106]) : slot === 'eyes' ? [0, FEATURES.eyes[0][1]] : slot === 'nose' ? FEATURES.nose : [0, FEATURES.mouth[1] - 20];
}

/** Carl-Otto in the mirror, with what he is wearing and the face he is pulling. */
export function paintSillyFace(c: C, run: Pick<SillyRun, 'worn' | 'face' | 'wearing'>, x: number, y: number, k: number, t: number): void {
  const f = FACES[run.face];
  paintMirrorFace(c, x, y, k, bedtimeLook(CARL_OTTO_HOME), { eyes: run.worn.eyes ? 'open' : f.eyes, mouth: f.mouth }, t);
  // Things on the face go on top, in order: moustache, nose, glasses, then the hat.
  for (const slot of ['lip', 'nose', 'eyes', 'head'] as const) {
    const id = run.worn[slot];
    if (!id) continue;
    const [px, py] = placeOf(id);
    c.save(); c.translate(x + px * k, y + py * k); c.scale(k, k); if (id === 'bow') c.rotate(-0.3); paintItem(c, id); c.restore();
  }
}

// ---------------------------------------------------------------- the room

function paintRoom(c: C): void {
  c.fillStyle = vgrad(c, 0, 540, [[0, '#e99a88'], [1, PINK]]); c.fillRect(0, 0, W, 540);
  // Pictures up the side walls, as in the photo: a gallery of frames.
  for (const [fx, fy, fw, fh, col] of [[20, 90, 120, 160, '#f3f2ec'], [36, 280, 90, 110, '#6b8aa0'], [770, 80, 60, 80, '#f3f2ec'], [846, 70, 90, 130, '#c8b48c'], [776, 186, 70, 90, '#8a6a9a'], [856, 222, 80, 100, '#f3f2ec'], [790, 300, 120, 90, '#a8c0a0']] as const) {
    slab(c, '#2b2b2e', fx, fy, fw, fh, 1); box(c, col, fx + 6, fy + 6, fw - 12, fh - 12);
    oval(c, rgba('#2b3936', 0.25), fx + fw / 2, fy + fh / 2, fw * 0.25, fh * 0.2);
  }
}

function paintMirror(c: C, run: SillyRun, t: number): void {
  const { x, y, w, h } = MIRROR;
  // The light bar over the mirror.
  slab(c, '#e8e6de', x + 40, y - 30, w - 80, 14, 7); box(c, '#fffbe8', x + 46, y - 20, w - 92, 4);
  c.fillStyle = rgrad(c, x + w / 2, y, 300, [[0, 'rgba(255, 245, 220, 0.25)'], [1, 'rgba(255, 245, 220, 0)']]); c.fillRect(x - 100, y - 40, w + 200, 300);
  slab(c, '#2b2b2e', x - 6, y - 6, w + 12, h + 12, 2);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  // Behind him in the glass: the dark planks, the crate shelf with towels, the lantern and a fan.
  const rand = seeded(8);
  for (let py = y; py < y + h; py += 26) { box(c, ['#4a3a2c', '#56443a', '#3e3128', '#5a4838'][Math.floor(rand() * 4)], x, py, w, 25); line(c, 'rgba(0, 0, 0, 0.35)', 1, [[x, py + 25], [x + w, py + 25]]); for (let k = 0; k < 4; k++) line(c, 'rgba(255, 255, 255, 0.06)', 1, [[x + rand() * w, py + 8], [x + rand() * w, py + 16]]); }
  box(c, 'rgba(232, 144, 126, 0.85)', x, y, 50, h); box(c, 'rgba(232, 144, 126, 0.85)', x + w - 50, y, 50, h);
  slab(c, '#8a6a4a', x + 300, y + 210, 120, 60, 2, 1.2); for (let i = 0; i < 4; i++) box(c, '#9aa4a8', x + 310, y + 220 + i * 8, 60, 6);
  line(c, '#b4975c', 1.6, [[x + 140, y], [x + 140, y + 40]]);
  c.beginPath(); c.ellipse(x + 140, y + 70, 22, 32, 0, 0, TAU); c.fillStyle = '#c9a85c'; c.fill(); stroke(c, INK, 1.4);
  for (let i = 0; i < 12; i++) oval(c, '#fff3c4', x + 130 + (i % 3) * 10, y + 50 + Math.floor(i / 3) * 12, 2, 2);
  c.save(); c.translate(x + 380, y + 150); for (let i = 0; i < 9; i++) { c.save(); c.rotate(-Math.PI + i * Math.PI / 8); path(c, [[0, 0], [52, -6], [52, 6]], true); c.fillStyle = i % 2 ? '#5aa89a' : '#e8dcc0'; c.fill(); c.restore(); } c.restore();
  paintSillyFace(c, run, FACE.x, FACE.y, FACE.k, t);
  path(c, [[x + 40, y], [x + 90, y], [x + 30, y + h], [x - 20, y + h]], true); c.fillStyle = 'rgba(255, 255, 255, 0.14)'; c.fill();
  c.restore();
}

function paintTray(c: C, run: SillyRun, t: number): void {
  // The basin's edge, and a wooden tray of things along it.
  slab(c, '#fbfaf6', 30, 420, 900, 26, 8);
  slab(c, '#a07a4a', 24, 436, 912, 98, 10);
  ITEMS.forEach((it, i) => {
    const [x, y] = trayAt(i), on = run.wearing.includes(it.id);
    if (on) { oval(c, `rgba(242, 194, 48, ${0.5 + 0.2 * Math.sin(t * 6)})`, x, y + 16, 46, 38); }
    c.save(); c.translate(x, y + (it.slot === 'head' ? 40 : 20)); c.scale(0.55, 0.55);
    if (it.slot === 'eyes') c.translate(0, -10);
    paintItem(c, it.id); c.restore();
  });
}

/** One frame of the little toilet, in world units. */
export function drawToilet(c: C, run: SillyRun, t: number): void {
  paintRoom(c); paintMirror(c, run, t); paintTray(c, run, t);
  // The flash: a quick white blink (a fade would pass through odd colours in the retro palette).
  if (run.flash >= 0 && run.flash < 0.15) { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, 540); }
}

/** The photo, as a small picture for the walls of the house (the shape of a sheet from the craft corner). */
export function photoDataUrl(run: SillyRun, width = 232): string {
  const canvas = document.createElement('canvas'), h = Math.round(width * PAPER.h / PAPER.w);
  canvas.width = width; canvas.height = h;
  const c = canvas.getContext('2d')!;
  c.fillStyle = vgrad(c, 0, h, [[0, '#56443a'], [1, '#3e3128']]); c.fillRect(0, 0, width, h);
  paintSillyFace(c, run, width / 2, h * 0.52, h / 290, 0);
  return canvas.toDataURL('image/png');
}
