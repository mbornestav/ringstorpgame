import { INK, TAU, box, line, lumps, oval, path, rgba, rgrad, seeded, stroke, vgrad, outlined, type C, type Pt } from './art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { ANIMALS, BED, FLOOR, KEYS, LAMP, PIANO, SONG, TOYS, TUNING, type AnimalId, type ToyId } from './games/godnatt';
import type { GoodnightRun } from './goodnight-run';
import { kid, paintHead } from './kids';

// Carl-Otto's room for Godnatt, after the family's photos, seen from the doorway: the pale wallpaper of foxes, squirrels,
// hedgehogs, badgers and rabbits among grey-green leaves, the white shelf over the desk, the toy piano on its red stool,
// the paper globe lamp, the grey curtain and the window over the grey-green bed with rails, the pink dollhouse and the
// red fire station, the black rug on the oak floor. When the lamp goes out the room turns blue and the night light throws
// stars on the walls.

const W = 960;
const smooth01 = (k: number) => { const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u); };
const WHITE = '#f3f2ec', BED_GREEN = '#8fa092', BED_DARK = '#6c7d6f';

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
function disc(c: C, fill: string | CanvasGradient, x: number, y: number, rx: number, ry = rx, ink = 1.6): void { oval(c, INK, x, y, rx + ink, ry + ink); oval(c, fill, x, y, rx, ry); }

/** Where the toy piano's big keys are while it is open. */
export const keyBox = (i: number) => ({ x: 150 + i * 84, y: 236, w: 78, h: 230 });

// ---------------------------------------------------------------- the animals (the wallpaper's, and the big ones)

/** An animal from the wallpaper, centred on (x, y), `r` its size; asleep, its eyes close. */
export function paintAnimal(c: C, id: AnimalId, x: number, y: number, r: number, asleep = false): void {
  c.save(); c.translate(x, y); c.scale(r / 30, r / 30);
  const eye = (ex: number, ey: number) => { if (asleep) { c.beginPath(); c.arc(ex, ey - 1, 2.6, 0.2, Math.PI - 0.2); stroke(c, INK, 1.4); } else oval(c, INK, ex, ey, 1.8, 2.2); };
  if (id === 'fox') {
    c.beginPath(); c.moveTo(6, 10); c.quadraticCurveTo(40, 2, 44, -18); c.quadraticCurveTo(30, 18, 6, 18); c.closePath(); c.fillStyle = '#d9733a'; c.fill(); stroke(c, INK, 1.4);
    path(c, [[40, -12], [44, -18], [36, -8]], true); c.fillStyle = '#ffffff'; c.fill();
    disc(c, '#d9733a', -2, 8, 18, 13, 1.4);
    for (const lx of [-12, 6]) line(c, INK, 3, [[lx, 18], [lx, 28]]);
    path(c, [[-28, -12], [-22, -30], [-12, -16], [-4, -30], [2, -12], [-10, 2]], true); c.fillStyle = '#d9733a'; c.fill(); stroke(c, INK, 1.4);
    path(c, [[-24, -6], [-10, 2], [-4, -6], [-14, -2]], true); c.fillStyle = '#ffffff'; c.fill();
    oval(c, INK, -26, -7, 2.4, 2); eye(-15, -12);
  } else if (id === 'squirrel') {
    c.beginPath(); c.moveTo(8, 14); c.bezierCurveTo(40, 14, 38, -36, 12, -30); c.bezierCurveTo(24, -20, 24, 2, 8, 2); c.closePath(); c.fillStyle = '#c0603a'; c.fill(); stroke(c, INK, 1.4);
    disc(c, '#c86c44', -4, 6, 13, 16, 1.4); oval(c, '#f0d8b8', -8, 10, 6, 9);
    disc(c, '#c86c44', -10, -14, 11, 10, 1.4);
    path(c, [[-14, -22], [-12, -32], [-8, -22]], true); c.fillStyle = '#c86c44'; c.fill(); stroke(c, INK, 1.2);
    disc(c, '#8f5a36', -16, 0, 5, 5, 1); eye(-13, -16);
  } else if (id === 'hedgehog') {
    c.beginPath(); for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI, k = i % 2 ? 26 : 32; c.lineTo(4 + Math.cos(a) * k, 10 + Math.sin(a) * k * 0.8); } c.closePath(); c.fillStyle = '#7a6656'; c.fill(); stroke(c, INK, 1.4);
    path(c, [[-24, 10], [-36, 6], [-26, -4], [-14, 0]], true); c.fillStyle = '#e9d6b8'; c.fill(); stroke(c, INK, 1.2);
    oval(c, INK, -36, 6, 2.6, 2.2); eye(-24, 1);
    for (const lx of [-10, 14]) line(c, INK, 3, [[lx, 10], [lx, 16]]);
  } else if (id === 'rabbit') {
    disc(c, '#a8957f', 4, 8, 18, 15, 1.4); disc(c, '#ffffff', 22, 6, 5, 5, 1);
    disc(c, '#a8957f', -12, -8, 11, 10, 1.4);
    for (const [ex, a] of [[-16, -0.3], [-8, 0.15]] as const) { c.save(); c.translate(ex, -16); c.rotate(a); disc(c, '#a8957f', 0, -14, 4.5, 14, 1.2); oval(c, '#e6b8b0', 0, -14, 2, 9); c.restore(); }
    oval(c, '#e6b8b0', -22, -6, 2, 1.6); eye(-14, -10);
  } else {
    disc(c, '#7d8086', 4, 8, 26, 14, 1.4);
    for (const lx of [-14, 18]) line(c, INK, 4, [[lx, 16], [lx, 24]]);
    path(c, [[-22, 4], [-40, 0], [-30, -12], [-14, -10]], true); c.fillStyle = '#f3f2ec'; c.fill(); stroke(c, INK, 1.4);
    path(c, [[-38, 0], [-24, -10], [-20, -6], [-34, 2]], true); c.fillStyle = '#2b2b2e'; c.fill();
    oval(c, INK, -40, 0, 2.4, 2.2); eye(-28, -5);
  }
  c.restore();
}

// ---------------------------------------------------------------- the room

function paintWallpaper(c: C): void {
  c.fillStyle = vgrad(c, 0, FLOOR, [[0, '#e6e2d6'], [1, '#efebe0']]); c.fillRect(0, 0, W, FLOOR);
  // Leaves and stems in a loose repeat, and small animals of the pattern among them.
  const rand = seeded(17);
  for (let i = 0; i < 160; i++) {
    const x = rand() * W, y = rand() * FLOOR, a = rand() * TAU, len = 8 + rand() * 12;
    line(c, rgba('#8f9a86', 0.55), 1.2, [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]]);
    oval(c, rgba(rand() < 0.5 ? '#a9b3a0' : '#b9b08f', 0.6), x + Math.cos(a) * len, y + Math.sin(a) * len, 4, 2, a);
  }
  const kinds: AnimalId[] = ['fox', 'squirrel', 'hedgehog', 'rabbit', 'badger'];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 9; col++) {
    const x = col * 112 + (row % 2) * 56 + 30, y = 70 + row * 86;
    c.save(); c.globalAlpha = 0.55; paintAnimal(c, kinds[(row * 3 + col) % kinds.length], x, y, 11, false); c.restore();
  }
  // The skirting.
  box(c, WHITE, 0, FLOOR - 12, W, 12); box(c, 'rgba(0, 0, 0, 0.12)', 0, FLOOR - 2, W, 2);
}

function paintFloor(c: C): void {
  c.fillStyle = vgrad(c, FLOOR, 540, [[0, '#cdb07a'], [1, '#dcc28c']]); c.fillRect(0, FLOOR, W, 540 - FLOOR);
  const rand = seeded(6);
  for (let y = FLOOR + 14; y < 540; y += 16 + (y - FLOOR) * 0.08) {
    line(c, 'rgba(140, 100, 50, 0.35)', 1, [[0, y], [W, y]]);
    for (let x = rand() * 200; x < W; x += 180 + rand() * 160) line(c, 'rgba(140, 100, 50, 0.3)', 1, [[x, y], [x, y + 14]]);
  }
}

function paintWindow(c: C, night: number): void {
  const x = 566, y = 96, w = 224, h = 190;
  slab(c, WHITE, x - 8, y - 8, w + 16, h + 16, 2);
  c.fillStyle = vgrad(c, y, y + h, [[0, mixc('#f2c9a0', '#141a33', night)], [1, mixc('#c8d8e8', '#262b48', night)]]); c.fillRect(x, y, w, h);
  // The brick houses across the way, a bush, their windows lit at night.
  slab(c, mixc('#a05a46', '#3a2a30', night), x + 20, y + 70, 120, h - 70, 0, 0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) box(c, night > 0.3 ? '#ffd98a' : '#cfe0ea', x + 34 + i * 36, y + 88 + j * 40, 16, 20);
  lumps(c, x + 170, y + h - 10, 70, 46, 9, seeded(3)); c.fillStyle = mixc('#5c8a4a', '#1f3328', night); c.fill();
  if (night > 0.2) { oval(c, rgba('#fff3c4', night), x + 180, y + 34, 16, 16); oval(c, mixc('#c8d8e8', '#262b48', night), x + 188, y + 30, 14, 14); }
  box(c, WHITE, x + w / 2 - 3, y, 6, h);
  // The sill: a snake plant, a small lamp and a pot.
  slab(c, WHITE, x - 16, y + h + 6, w + 32, 8, 1, 1.2);
  const sill = y + h + 6;
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.18; path(c, [[x + 180 + Math.cos(a + 0.1) * 4, sill - 14], [x + 180 + Math.cos(a) * 60, sill - 14 + Math.sin(a) * 60], [x + 180 - Math.cos(a + 0.1) * 4, sill - 14]], true); c.fillStyle = i % 2 ? '#4c7a2e' : '#62903c'; c.fill(); }
  slab(c, '#b5653d', x + 166, sill - 20, 28, 20, 4, 1.2);
  line(c, INK, 2, [[x + 60, sill], [x + 60, sill - 26]]); path(c, [[x + 48, sill - 26], [x + 72, sill - 26], [x + 66, sill - 40], [x + 54, sill - 40]], true); c.fillStyle = '#3a4a3a'; c.fill(); stroke(c, INK, 1.2);
  slab(c, '#6b7076', x + 100, sill - 14, 22, 14, 3, 1.2);
}
function mixc(a: string, b: string, k: number): string {
  const n = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), p = n(a), q = n(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, '0')).join('');
}

function paintCurtain(c: C): void {
  c.fillStyle = vgrad(c, 86, 330, [[0, '#7a7f86'], [1, '#61666d']]);
  c.beginPath(); c.moveTo(522, 82); c.lineTo(566, 82); c.quadraticCurveTo(560, 210, 572, 330); c.lineTo(516, 330); c.quadraticCurveTo(528, 210, 522, 82); c.closePath(); c.fill(); stroke(c, INK, 1.4);
  for (const fx of [532, 544, 556]) line(c, 'rgba(30, 30, 40, 0.3)', 2, [[fx, 86], [fx + 2, 326]]);
  line(c, '#9a9c96', 3, [[510, 82], [800, 82]]);
}

function paintShelf(c: C, run: GoodnightRun): void {
  // White ladders and three shelves: games and the abacus up top, books and the piggy bank in the middle.
  for (const sx of [22, 236]) { line(c, INK, 4, [[sx, 104], [sx, 318]]); line(c, WHITE, 2, [[sx, 104], [sx, 318]]); }
  for (const sy of [148, 214, 270]) slab(c, WHITE, 22, sy, 214, 6, 1, 1.2);
  [['#d6372c', 26, 30], ['#3157b8', 58, 22], ['#62b046', 84, 26], ['#f2c230', 114, 18]].forEach(([col, x, h]) => slab(c, col as string, x as number, 148 - (h as number), 28, h as number, 1, 1.2));
  for (let r = 0; r < 4; r++) { line(c, INK, 1.2, [[160, 112 + r * 9], [226, 112 + r * 9]]); for (let b = 0; b < 6; b++) disc(c, ['#e2432f', '#f2c230', '#3d8fc0', '#62b046'][r], 166 + b * 10 + (r % 2) * 4, 112 + r * 9, 3.4, 3.4, 0.6); }
  line(c, '#b4975c', 3, [[156, 104], [156, 148]]); line(c, '#b4975c', 3, [[230, 104], [230, 148]]);
  // The books (with a gap where the stray one goes), the pink piggy bank.
  const book = run.toys.find(t => t.id === 'book')!;
  ['#a33a2f', '#2e4f7a', '#d9a441', '#5c8a5a', '#6b4a6e', '#c98078'].forEach((col, i) => { const bx = 30 + i * 12 + (i >= 6 ? 20 : 0); slab(c, col, bx, 214 - 34 - (i % 3) * 4, 10, 34 + (i % 3) * 4, 1, 1); });
  if (!book.placed) box(c, 'rgba(0, 0, 0, 0.06)', 104, 178, 28, 36);
  disc(c, '#e6a0a8', 190, 198, 20, 15); oval(c, '#d98890', 172, 198, 5, 6); oval(c, INK, 183, 193, 1.6, 1.6);
  for (const [lx, ly] of [[180, 210], [198, 210]] as Pt[]) line(c, INK, 3, [[lx, ly], [lx, ly + 4]]);
  // Boxes on the bottom shelf.
  slab(c, '#e9e5d8', 30, 236, 54, 34, 2, 1.2); slab(c, '#e9e5d8', 92, 236, 54, 34, 2, 1.2); slab(c, '#cbb79a', 154, 240, 70, 30, 2, 1.2);
}

function paintDesk(c: C): void {
  slab(c, WHITE, 18, 318, 236, 10, 1);
  line(c, INK, 4, [[30, 328], [30, FLOOR]]); line(c, INK, 4, [[244, 328], [244, FLOOR]]);
  line(c, '#d9d7cf', 2, [[30, 328], [30, FLOOR]]); line(c, '#d9d7cf', 2, [[244, 328], [244, FLOOR]]);
  // The green Lego plate, and the cloud lamp at the back.
  slab(c, '#3f9a3a', 112, 312, 78, 6, 1, 1);
  path(c, [[200, 318], [204, 300], [218, 296], [228, 302], [240, 300], [246, 318]], true); c.fillStyle = '#d9c6b8'; c.fill(); stroke(c, INK, 1.2);
}

function paintPiano(c: C): void {
  // The red stool, and the little keyboard on it.
  const { x, y, w, h } = PIANO;
  slab(c, '#c8302a', x + 14, y + h, w - 28, 10, 2); line(c, INK, 6, [[x + 22, y + h + 10], [x + 22, FLOOR]]); line(c, INK, 6, [[x + w - 22, y + h + 10], [x + w - 22, FLOOR]]);
  line(c, '#c8302a', 4, [[x + 22, y + h + 10], [x + 22, FLOOR]]); line(c, '#c8302a', 4, [[x + w - 22, y + h + 10], [x + w - 22, FLOOR]]);
  slab(c, '#1c1e21', x, y, w, h, 4);
  for (let i = 0; i < 12; i++) box(c, '#fbfaf6', x + 6 + i * 10, y + 10, 9, h - 14);
  for (const i of [0, 1, 3, 4, 5, 7, 8, 10]) box(c, '#1c1e21', x + 12 + i * 10, y + 10, 6, (h - 14) * 0.55);
}

function paintBasket(c: C): void {
  path(c, [[252, 400], [322, 400], [314, FLOOR], [260, FLOOR]], true); c.fillStyle = '#c9a473'; c.fill(); stroke(c, INK, 1.6);
  for (let y = 408; y < FLOOR; y += 8) line(c, 'rgba(120, 80, 40, 0.5)', 1, [[256, y], [318, y]]);
}

function paintLamp(c: C, on: number): void {
  const { x, y, r } = LAMP;
  line(c, '#3a3a3a', 1.6, [[x, 0], [x, y - r]]);
  // A warm tint round the lamp (a soft wash, not added light, which would bleach the wallpaper in the retro palette).
  if (on > 0) { c.fillStyle = rgrad(c, x, y, 200, [[0, rgba('#ffe9b0', 0.22 * on)], [1, 'rgba(255, 233, 176, 0)']]); c.fillRect(x - 200, 0, 400, 360); }
  oval(c, INK, x, y, r + 1.6, r + 1.6);
  oval(c, rgrad(c, x - r * 0.2, y - r * 0.2, r * 1.2, on > 0 ? [[0, '#fff2d0'], [0.6, '#f6d8a8'], [1, '#e8b47a']] : [[0, '#c9c0b0'], [1, '#9a907e']]), x, y, r, r);
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.ellipse(x, y, Math.abs(i) / 3 * r, r, 0, -Math.PI / 2, Math.PI / 2); stroke(c, on > 0 ? 'rgba(200, 140, 80, 0.35)' : 'rgba(100, 90, 70, 0.3)', 1); }
  for (const ky of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.ellipse(x, y + ky * r, r * Math.sqrt(1 - ky * ky), r * 0.1, 0, 0, TAU); stroke(c, on > 0 ? 'rgba(200, 140, 80, 0.3)' : 'rgba(100, 90, 70, 0.25)', 1); }
}

function paintBed(c: C, run: GoodnightRun, t: number): void {
  const { x, y, w, h } = BED, top = y + 22;
  // Headboard and footboard with their rails, the mattress, the drawer under it.
  for (const bx of [x, x + w - 16]) slab(c, BED_GREEN, bx, y - 14, 16, h + 14, 3);
  slab(c, '#ffffff', x + 16, top, w - 32, 18, 2, 1.2);
  slab(c, BED_DARK, x + 16, top + 18, w - 32, 12, 1, 1.2);
  slab(c, '#e7e5dd', 560, top + 34, 120, 40, 2, 1.2); slab(c, '#cfcdc4', 606, top + 46, 28, 5, 2, 1);
  const dino = run.toys.find(d => d.id === 'dino')!;
  if (!dino.placed) box(c, 'rgba(0, 0, 0, 0.08)', 562, top + 36, 116, 36);
  // The pillow and the pink duvet: rumpled until Carl-Otto is in bed, then smooth over him.
  slab(c, '#f3e6dc', x + 22, top - 14, 70, 22, 8, 1.2);
  for (let k = 0; k < 4; k++) line(c, 'rgba(200, 140, 120, 0.5)', 1.4, [[x + 28 + k * 16, top - 12], [x + 28 + k * 16, top + 6]]);
  const inBed = run.inBed >= 0;
  c.beginPath();
  if (inBed) { c.moveTo(x + 70, top + 2); c.quadraticCurveTo(x + 140, top - 26, x + 220, top - 8); c.quadraticCurveTo(x + 300, top - 2, x + w - 20, top + 4); c.lineTo(x + w - 20, top + 26); c.lineTo(x + 70, top + 26); }
  else { c.moveTo(x + 110, top + 2); c.quadraticCurveTo(x + 160, top - 20, x + 210, top - 4); c.quadraticCurveTo(x + 260, top - 22, x + 330, top - 2); c.lineTo(x + w - 20, top + 6); c.lineTo(x + w - 20, top + 26); c.lineTo(x + 110, top + 26); }
  c.closePath(); c.fillStyle = vgrad(c, top - 26, top + 26, [[0, '#e6aea6'], [1, '#c98078']]); c.fill(); stroke(c, INK, 1.4);
  if (inBed) {
    // Carl-Otto's head on the pillow, Nallen beside him; asleep once the lamp is out.
    const [px, py] = BED.pillow, asleep = run.dark > TUNING.dark * 0.6;
    c.save(); c.translate(px + 6, py - 4); c.rotate(-0.2); paintHead(c, 0, 0, CARL_OTTO_HOME, asleep ? { eyes: 'shut', mouth: 'smile' } : { mouth: 'grin' }); c.restore();
    disc(c, '#b07a4a', px + 52, py + 2, 12, 11, 1.2); disc(c, '#b07a4a', px + 44, py - 8, 4.5, 4.5, 1); disc(c, '#b07a4a', px + 60, py - 8, 4.5, 4.5, 1); oval(c, '#e2b98a', px + 52, py + 6, 5, 4); oval(c, INK, px + 52, py + 4, 1.6, 1.2);
    if (asleep) for (let i = 0; i < 3; i++) { const ph = (t * 0.4 + i / 3) % 1; c.save(); c.globalAlpha = 1 - ph; c.font = `${12 + ph * 8}px sans-serif`; c.fillStyle = '#fff3b0'; c.fillText('z', px + 20 + ph * 30, py - 30 - ph * 50); c.restore(); }
  }
  // The rails along the front of the bed, over the duvet.
  line(c, BED_DARK, 4, [[x + 16, top - 6], [x + w - 16, top - 6]]);
  for (let rx = x + 30; rx < x + w - 20; rx += 22) line(c, BED_GREEN, 3, [[rx, top - 6], [rx, top + 18]]);
}

function paintDollhouse(c: C, run: GoodnightRun): void {
  const x = 830, base = FLOOR;
  slab(c, '#efe5dc', x, 318, 120, base - 318, 1);
  path(c, [[x - 8, 320], [x + 60, 272], [x + 128, 320]], true); c.fillStyle = '#8c949c'; c.fill(); stroke(c, INK, 1.6);
  for (let i = 0; i < 5; i++) line(c, '#a8b0b8', 1, [[x + 4 + i * 14, 316 - i * 9], [x + 116 - i * 14, 316 - i * 9]]);
  slab(c, '#e6c8c0', x + 8, 330, 104, 50, 2, 1); box(c, '#cfe0ea', x + 20, 338, 22, 18); box(c, '#cfe0ea', x + 78, 338, 22, 18);
  slab(c, '#e6c8c0', x + 8, 386, 104, base - 392, 2, 1);
  c.beginPath(); c.moveTo(x + 44, base - 6); c.lineTo(x + 44, 400); c.arc(x + 60, 400, 16, Math.PI, 0); c.lineTo(x + 76, base - 6); c.closePath();
  const doll = run.toys.find(d => d.id === 'doll')!;
  c.fillStyle = doll.placed ? '#ffe9b0' : '#b98f84'; c.fill(); stroke(c, INK, 1.4);
  line(c, WHITE, 3, [[x + 8, 384], [x + 112, 384]]);
}

function paintFireStation(c: C, run: GoodnightRun): void {
  const x = 836, y = 456;
  slab(c, '#d6372c', x, y, 100, 74, 2);
  path(c, [[x - 4, y], [x + 50, y - 18], [x + 104, y]], true); c.fillStyle = '#a8301f'; c.fill(); stroke(c, INK, 1.4);
  const engine = run.toys.find(d => d.id === 'engine')!;
  slab(c, engine.placed ? '#2b2b2e' : '#3a3a3a', x + 22, y + 20, 56, 50, 3, 1.2);
  for (let i = 0; i < 4; i++) line(c, '#f2c230', 2, [[x + 6, y + 12 + i * 14], [x + 16, y + 12 + i * 14]]);
  line(c, '#f2c230', 2, [[x + 6, y + 8], [x + 6, y + 64]]); line(c, '#f2c230', 2, [[x + 16, y + 8], [x + 16, y + 64]]);
}

function paintRug(c: C): void {
  slab(c, '#2c3236', 400, 458, 400, 82, 2, 1.2);
  const rand = seeded(2);
  for (let i = 0; i < 260; i++) oval(c, 'rgba(255, 255, 255, 0.12)', 404 + rand() * 392, 462 + rand() * 76, 1.4, 1);
}

// ---------------------------------------------------------------- the toys

export function paintToy(c: C, id: ToyId, x: number, y: number, k = 1): void {
  c.save(); c.translate(x, y); c.scale(k, k);
  if (id === 'engine') {
    slab(c, '#d6372c', -26, -18, 52, 18, 3); slab(c, '#d6372c', 6, -30, 18, 14, 2); box(c, '#cfe0ea', 10, -27, 10, 8);
    line(c, '#d9d7cf', 3, [[-24, -24], [6, -24]]); for (let i = -22; i < 6; i += 6) line(c, '#d9d7cf', 1.6, [[i, -28], [i, -20]]);
    for (const wx of [-16, 16]) { disc(c, '#2b2b2e', wx, 0, 7, 7, 1); oval(c, '#b8bab6', wx, 0, 2.6, 2.6); }
  } else if (id === 'doll') {
    path(c, [[-12, 0], [12, 0], [6, -26], [-6, -26]], true); c.fillStyle = '#f07fb0'; c.fill(); stroke(c, INK, 1.4);
    disc(c, '#f0c197', 0, -34, 9, 9, 1.4); c.beginPath(); c.arc(0, -36, 10, Math.PI, 0); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1.2);
    oval(c, INK, -3, -33, 1.2, 1.4); oval(c, INK, 3, -33, 1.2, 1.4);
  } else if (id === 'lego') {
    [['#3157b8', -14, -12], ['#e2432f', -6, -24], ['#f2c230', 6, -12]].forEach(([col, bx, by]) => { slab(c, col as string, bx as number, by as number, 22, 12, 1, 1.2); for (let s = 0; s < 3; s++) slab(c, col as string, (bx as number) + 2 + s * 7, (by as number) - 4, 5, 4, 1, 0.8); });
  } else if (id === 'ball') {
    disc(c, '#f08a2c', 0, -16, 16, 16, 1.6);
    c.save(); c.beginPath(); c.arc(0, -16, 16, 0, TAU); c.clip(); for (const sx of [-10, 2]) box(c, '#e2432f', sx, -34, 6, 36); c.restore();
    oval(c, 'rgba(255, 255, 255, 0.5)', 5, -22, 4, 3);
  } else if (id === 'book') {
    slab(c, '#3157b8', -14, -36, 26, 36, 2); box(c, '#f3f2ec', 10, -34, 2, 32); box(c, '#f2c230', -10, -28, 16, 6);
  } else {
    c.beginPath(); c.moveTo(-28, -2); c.quadraticCurveTo(-30, -18, -10, -20); c.quadraticCurveTo(4, -22, 10, -30); c.quadraticCurveTo(20, -38, 28, -30); c.quadraticCurveTo(24, -24, 14, -22); c.quadraticCurveTo(20, -8, 14, 0); c.closePath();
    c.fillStyle = '#62b046'; c.fill(); stroke(c, INK, 1.4);
    for (let i = 0; i < 4; i++) { path(c, [[-20 + i * 8, -19], [-16 + i * 8, -27], [-12 + i * 8, -20]], true); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1); }
    for (const lx of [-14, 6]) line(c, INK, 4, [[lx, -2], [lx, 2]]);
    oval(c, INK, 22, -31, 1.6, 1.6);
  }
  c.restore();
}

// ---------------------------------------------------------------- a frame

function sparkles(c: C, x: number, y: number, t: number, r = 28): void {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 5 + 2, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.7;
    line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]);
  }
}
function arrow(c: C, x: number, y: number, t: number): void {
  const top = y + Math.sin(t * 6) * 8;
  path(c, [[x - 14, top], [x + 14, top], [x + 14, top + 18], [x + 26, top + 18], [x, top + 44], [x - 26, top + 18], [x - 14, top + 18]], true);
  c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
}

/** Where a hint points, and where a toy's home glows. */
function hintAt(run: GoodnightRun, h: NonNullable<GoodnightRun['hint']>): Pt {
  const toy = run.toys.find(t => t.id === h);
  if (toy) return [toy.at[0], toy.at[1] - 90];
  const animal = ANIMALS.find(a => a.id === h);
  if (animal) return [animal.at[0], animal.at[1] - animal.r - 50];
  if (h === 'bed') return [BED.x + BED.w / 2, BED.y - 60];
  return [LAMP.x, LAMP.y + LAMP.r + 6];
}

/** One frame of Carl-Otto's room, in world units. `cheer` makes him cheer (until the clock reaches it). */
export function drawRoom(c: C, run: GoodnightRun, t: number, cheerUntil: number): void {
  const night = run.dark >= 0 ? smooth01(run.dark / TUNING.dark) : 0;
  paintWallpaper(c); paintFloor(c);
  // The animals that get a goodnight, a little bigger than the pattern, on a soft light patch.
  for (const a of ANIMALS) {
    oval(c, 'rgba(255, 252, 240, 0.85)', a.at[0], a.at[1], a.r * 1.5, a.r * 1.25);
    const asleep = run.asleep.find(s => s.id === a.id);
    paintAnimal(c, a.id, a.at[0], a.at[1], a.r, !!asleep);
    if (asleep && asleep.since < 1.2) { const u = asleep.since / 1.2; c.save(); c.globalAlpha = 1 - u; c.font = '16px sans-serif'; c.fillStyle = '#6b7076'; c.fillText('z z', a.at[0] + 10 + u * 20, a.at[1] - a.r - u * 30); c.restore(); }
  }
  paintWindow(c, night); paintCurtain(c); paintShelf(c, run); paintDesk(c); paintPiano(c); paintBasket(c);
  paintBed(c, run, t); paintDollhouse(c, run); paintFireStation(c, run); paintRug(c);
  // The toys at home, then the ones still out (and the one in a hand, on top).
  const order = [...run.toys].sort((a, b) => Number(a.id === run.held) - Number(b.id === run.held) || Number(!a.placed) - Number(!b.placed));
  for (const toy of order) {
    if (toy.placed && toy.id === 'doll') { paintToy(c, 'doll', 890, FLOOR - 6, 0.9); continue; }
    if (toy.placed && toy.id === 'engine') { paintToy(c, 'engine', 886, 520, 0.85); continue; }
    if (toy.placed && toy.id === 'dino') { paintToy(c, 'dino', 612, 404, 0.8); continue; }
    if (toy.placed && toy.id === 'book') { paintToy(c, 'book', 118, 214, 0.95); continue; }
    if (toy.placed && toy.id === 'lego') { paintToy(c, 'lego', 150, 312, 0.9); continue; }
    if (toy.placed && toy.id === 'ball') { paintToy(c, 'ball', 286, 414, 0.9); continue; }
    const lifted = toy.id === run.held;
    if (lifted) oval(c, 'rgba(20, 20, 30, 0.25)', toy.at[0], toy.at[1] + 16, 26, 7);
    paintToy(c, toy.id, toy.at[0], toy.at[1], lifted ? 1.25 : 1.1);
  }
  // A toy in hand (or one that went to the wrong place) shows where it lives.
  const glowing = run.held ?? run.glow?.id ?? null;
  if (glowing) { const home = TOYS.find(x => x.id === glowing)!.home; oval(c, `rgba(242, 194, 48, ${0.3 + 0.2 * Math.sin(t * 8)})`, home[0], home[1] - 14, 46, 34); sparkles(c, home[0], home[1] - 14, t, 40); }
  // Carl-Otto stands in the middle of the room until he goes to bed.
  if (run.inBed < 0) {
    const cheer = t < cheerUntil;
    outlined(c, o => kid(o, 360, 534, CARL_OTTO_HOME, cheer ? { kind: 'cheer', t } : run.held ? { kind: 'point', t } : { kind: 'stand' }, 1, { mouth: cheer ? 'grin' : 'smile' }, 1.2));
  }
  paintLamp(c, 1 - night);
  if (run.hint) { const [hx, hy] = hintAt(run, run.hint); arrow(c, hx, hy, t); sparkles(c, hx, hy + 70, t); }
  // Night: the room turns blue and the night light throws stars on the walls and the ceiling.
  if (night > 0) {
    c.fillStyle = `rgba(14, 18, 44, ${0.62 * night})`; c.fillRect(0, 0, W, 540);
    const rand = seeded(29);
    for (let i = 0; i < 46; i++) {
      const x = rand() * W, y = rand() * 400, tw = 0.6 + 0.4 * Math.sin(t * 2 + i), r = (3 + rand() * 4) * tw;
      c.save(); c.globalAlpha = night * tw; c.translate(x, y); c.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, d = k % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
      c.closePath(); c.fillStyle = '#fff3b0'; c.fill(); c.restore();
    }
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rgrad(c, 300, 430, 120, [[0, `rgba(255, 220, 140, ${0.35 * night})`], [1, 'rgba(255, 220, 140, 0)']]); c.fillRect(160, 300, 280, 240); c.restore();
  }
  if (run.piano.open) paintBigPiano(c, run, t);
}

/** The toy piano, close up: eight big keys in rainbow colours, each with its note's name and number. */
function paintBigPiano(c: C, run: GoodnightRun, t: number): void {
  c.fillStyle = 'rgba(20, 24, 30, 0.55)'; c.fillRect(0, 0, W, 540);
  slab(c, '#1c1e21', 128, 198, 704, 290, 18, 2.4);
  box(c, '#c8302a', 140, 206, 680, 22, 8);
  const colours = ['#e2432f', '#f08a2c', '#f2c230', '#62b046', '#3fa4c0', '#3157b8', '#8a56b8', '#e2432f'];
  const next = run.piano.along ? SONG[run.piano.next] : -1;
  for (let i = 0; i < 8; i++) {
    const b = keyBox(i), down = run.piano.pressed.some(p => p.key === i), dy = down ? 6 : 0;
    slab(c, '#fbfaf6', b.x, b.y + dy, b.w, b.h - dy, 6, 1.6);
    box(c, colours[i], b.x + 6, b.y + b.h - 54 + dy, b.w - 12, 44, 8);
    c.save(); c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(KEYS[i], b.x + b.w / 2, b.y + b.h - 22 + dy); c.restore();
    c.save(); c.font = '15px sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8a8f80'; c.fillText(String(i + 1), b.x + b.w / 2, b.y + 24 + dy); c.restore();
    if (i === next) { const sy = b.y - 26 + Math.sin(t * 7) * 6; c.save(); c.translate(b.x + b.w / 2, sy); c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, d = k % 2 ? 7 : 16; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); } c.closePath(); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1.6); c.restore(); }
  }
  for (let i = 0; i < 7; i++) if (i !== 2 && i !== 6) { const b = keyBox(i); slab(c, '#1c1e21', b.x + b.w - 14, b.y, 28, 120, 4, 1); }
  // Notes floating up from the keys just played.
  for (const p of run.piano.pressed) { const b = keyBox(p.key), u = p.since / 0.4; c.save(); c.globalAlpha = 1 - u; oval(c, colours[p.key], b.x + b.w / 2 + 6, b.y - 10 - u * 50, 7, 5.5, -0.4); line(c, colours[p.key], 2.4, [[b.x + b.w / 2 + 12, b.y - 12 - u * 50], [b.x + b.w / 2 + 12, b.y - 34 - u * 50]]); c.restore(); }
}
