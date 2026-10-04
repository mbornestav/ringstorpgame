import { INK, TAU, bake, box, flower, hgrad, line, lumps, mix, outlined, oval, path, put, rgba, rgrad, seeded, stroke, strip, vgrad, type C, type Pt, type Sprite } from './art';
import { CARL_OTTO_HOME, PLACES, ROOM, SOFA_X, TUNING, type ItemId, type PlaceKind, type SurpriseKind } from './games/filmkvall';
import type { Carried, MovieRun, Placed, Spot } from './movie-run';
import { kid } from './kids';
import { paintHungPicture } from './craft-art';

// The living room for Filmkväll, after the family's photo, unrolled into one long back wall: the straw hats and the woven
// pendant lamp, the TV over a low grey bench, the round two-tier table on a cream rug, the grey sofa, the black leather
// chair with its grey throw, the pleated floor lamp, the white bookshelf (globe, basket house, striped toy basket, red
// box) and the doorway to the dining room. Lit softly from the window behind the viewer and the floor lamp. Static things
// are baked once (like the yard); Carl-Otto, the things he finds and the TV picture are drawn live. A hiding place has a
// back and a front sprite, and a hidden thing is drawn between them, so only a corner or an ear shows.

const W = 960;
/** Where Carl-Otto walks: in front of the furniture. */
export const GROUND = 452;
/** The ceiling's edge and the foot of the wall. */
const CEIL = 118, BASE = 404;
/** The left edge of the view while the film is on: the TV and the sofa side by side. */
export const WATCH_CAM = 150;
/** The TV's picture, in room pixels. */
const SCREEN = { x: 238, y: 182, w: 184, h: 104 };
/** The sofa: where its feet stand, how much it is scaled from its drawing (sized to a four-year-old), and the top of the seat. */
const SOFA_Y = 410, SOFA_K = 0.8, SEAT_Y = SOFA_Y - 60 * SOFA_K;
/** A point on the sofa, in the units it is drawn in. */
const onSofa = (dx: number, dy: number): Pt => [SOFA_X + dx * SOFA_K, SOFA_Y + dy * SOFA_K];
const LAMP_X = 1225;

const WALL = '#a6a899', WOOD = '#3f3a36', WHITE = '#f1f0ea', FABRIC = '#b8bab6', LEATHER = '#26262a', STRAW = '#d3b97f';

/** A rounded box with the ink outline every shape in the collection has. */
function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.4): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
/** A contact shadow on the dark wooden floor. */
function floorShadow(c: C, x: number, y: number, rx: number, ry: number, strength = 0.45): void {
  c.save(); c.translate(x, y); c.scale(rx, ry);
  c.fillStyle = rgrad(c, 0, 0, 1, [[0, `rgba(14, 11, 9, ${strength})`], [0.6, `rgba(14, 11, 9, ${strength * 0.5})`], [1, 'rgba(14, 11, 9, 0)']]);
  c.fillRect(-1, -1, 2, 2); c.restore();
}
/** A shadow cast on the wall behind something, offset down and to the left (the light is on the upper right). */
function wallShadow(c: C, x: number, y: number, w: number, h: number, r = 6): void {
  box(c, 'rgba(40, 44, 34, 0.16)', x - 6, y + 6, w, h, r); box(c, 'rgba(40, 44, 34, 0.12)', x - 3, y + 3, w, h, r);
}

// ---------------------------------------------------------------- the room itself

function paintCeiling(c: C): void {
  c.fillStyle = vgrad(c, 0, CEIL, [[0, '#cbc7bc'], [1, '#ebe9e2']]); c.fillRect(0, 0, 480, CEIL);
  // Panelling along the room, the seams closer together further away.
  for (const y of [24, 46, 65, 81, 94, 104]) { box(c, 'rgba(110, 100, 86, 0.25)', 0, y, 480, 1.2); box(c, 'rgba(255, 255, 255, 0.4)', 0, y + 1.2, 480, 0.8); }
  box(c, '#f5f4ef', 0, CEIL - 10, 480, 10); box(c, 'rgba(255, 255, 255, 0.7)', 0, CEIL - 10, 480, 1.4);
  box(c, 'rgba(80, 72, 60, 0.3)', 0, CEIL - 2, 480, 2);
}

function paintWall(c: C): void {
  c.fillStyle = vgrad(c, CEIL - 2, BASE, [[0, '#9a9c8d'], [0.45, WALL], [1, '#9d9f90']]); c.fillRect(0, CEIL - 2, 240, BASE - CEIL + 2);
  // The small floral print, in a half-drop repeat: pale flower heads, each with a pair of leaves.
  for (let row = 0; CEIL + 4 + row * 26 < BASE; row++) for (let col = 0; col < 8; col++) {
    const x = col * 30 + (row % 2) * 15 + 7, y = CEIL + 8 + row * 26;
    oval(c, '#8e917f', x - 4, y + 4, 2.6, 1.2, -0.6); oval(c, '#8e917f', x + 4, y + 4, 2.6, 1.2, 0.6);
    flower(c, x, y, '#c6c8b9', '#b5a983', 1.9);
  }
  // The skirting board.
  box(c, '#e7e5dd', 0, BASE - 16, 240, 16); box(c, 'rgba(255, 255, 255, 0.75)', 0, BASE - 16, 240, 1.6);
  box(c, 'rgba(70, 64, 54, 0.25)', 0, BASE - 3, 240, 3);
}

function paintFloor(c: C): void {
  const rand = seeded(31);
  const rows = [BASE, 411, 419, 428, 439, 452, 467, 485, 507, 540];
  for (let i = 0; i < rows.length - 1; i++) {
    const y0 = rows[i], y1 = rows[i + 1];
    let x = -rand() * 200;
    while (x < 600) {
      const w = 150 + rand() * 190, tone = ['#3d3835', '#45403b', '#38332f', '#4a4540', '#413b37'][Math.floor(rand() * 5)];
      c.fillStyle = vgrad(c, y0, y1, [[0, mix(tone, '#000000', 0.12)], [1, tone]]); c.fillRect(x, y0, w, y1 - y0);
      for (let g = 0; g < 2; g++) { const gy = y0 + (y1 - y0) * (0.35 + g * 0.3); line(c, rgba('#6a6056', 0.3), 0.7, [[x + 6, gy], [x + w * 0.5, gy + rand() * 1.4], [x + w - 6, gy]]); }
      box(c, 'rgba(12, 10, 8, 0.6)', x, y0, 1.3, y1 - y0);
      x += w;
    }
    box(c, 'rgba(12, 10, 8, 0.45)', 0, y0, 600, 1);
  }
  // A sheen from the window behind the viewer, and the dark line along the skirting.
  c.fillStyle = vgrad(c, BASE, 540, [[0, 'rgba(255, 236, 210, 0)'], [0.45, 'rgba(255, 236, 210, 0.07)'], [1, 'rgba(0, 0, 0, 0.12)']]); c.fillRect(0, BASE, 600, 136);
  c.fillStyle = vgrad(c, BASE, BASE + 10, [[0, 'rgba(10, 8, 6, 0.5)'], [1, 'rgba(10, 8, 6, 0)']]); c.fillRect(0, BASE, 600, 10);
}

/** The ends of the room: a shadowed corner on the left, the wall's end on the right with a light switch. */
function paintLeftEnd(c: C): void {
  c.fillStyle = hgrad(c, 0, 46, [[0, 'rgba(40, 42, 34, 0.45)'], [1, 'rgba(40, 42, 34, 0)']]); c.fillRect(0, 0, 46, 540);
}
function paintRightEnd(c: C): void {
  c.fillStyle = hgrad(c, ROOM - 46, ROOM, [[0, 'rgba(40, 42, 34, 0)'], [1, 'rgba(40, 42, 34, 0.45)']]); c.fillRect(ROOM - 46, 0, 46, 540);
  slab(c, '#f3f2ec', ROOM - 72, 296, 18, 26, 2, 1); box(c, '#e1dfd6', ROOM - 67, 302, 8, 14, 1);
}

// ---------------------------------------------------------------- on the walls

function strawHat(c: C, x: number, y: number, r: number, frayed: boolean, band?: string): void {
  // Hung flat on the wall: the brim is a disc, the crown a smaller dome in the middle.
  oval(c, 'rgba(40, 44, 34, 0.18)', x - 5, y + 6, r, r * 0.92);
  if (frayed) {
    const rand = seeded(Math.round(x));
    for (let i = 0; i < 90; i++) {
      const a = i / 90 * TAU + rand() * 0.05, r0 = r * 0.82, r1 = r * (1 + rand() * 0.16);
      line(c, rand() < 0.5 ? '#c4a86c' : '#e2cd98', 1.2, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.92], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.92]]);
    }
  }
  oval(c, INK, x, y, r * 0.86 + 1.2, r * 0.8 + 1.2);
  oval(c, rgrad(c, x + r * 0.2, y - r * 0.2, r, [[0, '#ecd9a6'], [0.7, STRAW], [1, '#b4975c']]), x, y, r * 0.86, r * 0.8);
  // The weave: rings around the brim.
  for (let k = 0.45; k < 0.85; k += 0.08) { c.beginPath(); c.ellipse(x, y, r * k, r * k * 0.93, 0, 0, TAU); stroke(c, rgba('#9b7e46', 0.35), 0.8); }
  oval(c, INK, x + r * 0.04, y - r * 0.04, r * 0.44 + 1.2, r * 0.42 + 1.2);
  oval(c, rgrad(c, x + r * 0.16, y - r * 0.16, r * 0.5, [[0, '#f2e2b4'], [1, '#c3a568']]), x + r * 0.04, y - r * 0.04, r * 0.44, r * 0.42);
  if (band) { c.beginPath(); c.ellipse(x + r * 0.04, y - r * 0.04, r * 0.47, r * 0.45, 0, 0, TAU); stroke(c, band, 3.2); }
}

function paintHats(c: C): void {
  strawHat(c, 98, 214, 58, true);
  strawHat(c, 196, 150, 28, false, '#2e2a26');
}

function paintPendant(c: C): void {
  // The woven pendant lamp, hanging from the ceiling in front of the hats.
  line(c, '#2a2a2a', 1.6, [[262, 0], [262, 26]]);
  const shape = () => { c.beginPath(); c.moveTo(232, 28); c.bezierCurveTo(206, 34, 172, 66, 166, 96); c.quadraticCurveTo(262, 114, 358, 96); c.bezierCurveTo(352, 66, 318, 34, 292, 28); c.closePath(); };
  shape(); c.fillStyle = rgrad(c, 300, 50, 120, [[0, '#e3c48c'], [0.6, '#c39a5e'], [1, '#8f6a3a']]); c.fill();
  c.save(); shape(); c.clip();
  for (let d = -140; d < 220; d += 9) { line(c, 'rgba(110, 76, 36, 0.55)', 1.3, [[166 + d, 28], [166 + d + 90, 118]]); line(c, 'rgba(245, 224, 180, 0.5)', 1.1, [[358 - d, 28], [358 - d - 90, 118]]); }
  c.restore();
  shape(); stroke(c, INK, 1.6);
  c.beginPath(); c.ellipse(262, 98, 94, 9, 0, 0, Math.PI); stroke(c, '#7a5a30', 2.2);
  box(c, '#2f2f2f', 252, 24, 20, 6, 2);
}

function paintTv(c: C): void {
  wallShadow(c, SCREEN.x - 6, SCREEN.y - 6, SCREEN.w + 12, SCREEN.h + 12, 3);
  slab(c, '#1c1e21', SCREEN.x - 6, SCREEN.y - 6, SCREEN.w + 12, SCREEN.h + 12, 3);
  box(c, vgrad(c, SCREEN.y, SCREEN.y + SCREEN.h, [[0, '#2c3236'], [1, '#1d2125']]), SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h);
  // A reflection of the room's window across the dark glass.
  path(c, [[SCREEN.x + 112, SCREEN.y], [SCREEN.x + 150, SCREEN.y], [SCREEN.x + 96, SCREEN.y + SCREEN.h], [SCREEN.x + 58, SCREEN.y + SCREEN.h]], true);
  c.fillStyle = 'rgba(255, 255, 255, 0.05)'; c.fill();
  oval(c, '#3a3f44', SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h + 3, 2.4, 1);
  // The white cable down to the bench.
  c.beginPath(); c.moveTo(404, SCREEN.y + SCREEN.h + 6); c.quadraticCurveTo(410, 316, 404, 342); stroke(c, INK, 3.4); stroke(c, '#ecebe6', 2);
}

function paintRug(c: C): void {
  // The cream woven rug under the table, seen at a slant, with a fringe at each end.
  const shape = () => path(c, [[438, 418], [700, 418], [714, 474], [418, 474]], true);
  shape(); c.fillStyle = vgrad(c, 418, 474, [[0, '#d9d2c2'], [1, '#ebe5d6']]); c.fill();
  c.save(); shape(); c.clip();
  for (let y = 421; y < 474; y += 3.2) line(c, 'rgba(150, 136, 110, 0.22)', 0.9, [[400, y], [720, y]]);
  c.restore();
  shape(); stroke(c, rgba(INK, 0.6), 1.2);
  for (let k = 0; k < 18; k++) {
    const t = k / 17;
    line(c, '#e6dfcf', 1.2, [[438 - 20 * t, 418 + 56 * t], [430 - 20 * t, 418 + 56 * t]]);
    line(c, '#e6dfcf', 1.2, [[700 + 14 * t, 418 + 56 * t], [708 + 14 * t, 418 + 56 * t]]);
  }
}

function paintFloorLamp(c: C): void {
  // A wooden stem on a dark round foot, with a pleated linen shade (lit from inside: it is evening).
  const x = LAMP_X;
  floorShadow(c, x, 410, 30, 5);
  oval(c, INK, x, 406, 22, 6); oval(c, '#2f2e2c', x, 405, 20.5, 4.6);
  line(c, INK, 5, [[x, 404], [x + 2, 240]]);
  path(c, [[x, 404], [x + 2, 240]]); c.strokeStyle = hgrad(c, x - 2, x + 4, [[0, '#6e5236'], [1, '#b08a5e']]); c.lineWidth = 2.6; c.stroke();
  const shade = () => path(c, [[x - 20, 196], [x + 24, 196], [x + 34, 244], [x - 30, 244]], true);
  shade(); c.fillStyle = hgrad(c, x - 30, x + 34, [[0, '#d9c99e'], [0.55, '#f2e6c4'], [1, '#fbf1d6']]); c.fill();
  c.save(); shade(); c.clip();
  for (let k = -1; k <= 1; k += 0.125) line(c, 'rgba(150, 120, 70, 0.35)', 1, [[x + 2 + k * 22, 196], [x + 2 + k * 32, 244]]);
  c.fillStyle = vgrad(c, 230, 244, [[0, 'rgba(255, 220, 140, 0)'], [1, 'rgba(255, 220, 140, 0.45)']]); c.fillRect(x - 32, 196, 70, 48);
  c.restore();
  shade(); stroke(c, INK, 1.5);
}

// ---------------------------------------------------------------- the bookshelf

const SHELF = { x0: 1270, x1: 1910, top: 128 };
const SHELVES = [BASE - 8, 342, 290, 238, 186];
const COLUMNS = [1270, 1430, 1590, 1750, 1910];
const SPINES = ['#a33a2f', '#c94a3a', '#2e4f7a', '#3d6a9e', '#2f5a45', '#5c8a5a', '#e7dfc9', '#d9cfb2', '#2b2b2e', '#8a5a3a', '#c9a24a', '#e6b8b0', '#6b4a6e', '#f2efe6'];

function books(c: C, rand: () => number, x0: number, x1: number, floor: number, room: number): void {
  let x = x0;
  while (x < x1 - 5) {
    const w = 5 + rand() * 7, h = room * (0.62 + rand() * 0.3), col = SPINES[Math.floor(rand() * SPINES.length)];
    if (x + w > x1) break;
    box(c, INK, x, floor - h - 1, w + 0.6, h + 1);
    box(c, hgrad(c, x, x + w, [[0, mix(col, '#000000', 0.25)], [0.4, col], [1, mix(col, '#ffffff', 0.12)]]), x + 0.6, floor - h, w - 0.6, h);
    if (rand() < 0.6) { box(c, rgba('#ffffff', 0.35), x + 1.4, floor - h + h * 0.18, w - 2.2, 1.2); box(c, rgba('#ffffff', 0.25), x + 1.4, floor - h * 0.3, w - 2.2, 1); }
    x += w + 0.6;
    if (rand() < 0.06) x += 6 + rand() * 10;
  }
}

/** A stack of books lying flat. */
function pile(c: C, rand: () => number, x: number, w: number, floor: number, count: number): void {
  let y = floor;
  for (let i = 0; i < count; i++) {
    const h = 4 + rand() * 4, dx = (rand() - 0.5) * 6, ww = w * (0.8 + rand() * 0.2), col = SPINES[Math.floor(rand() * SPINES.length)];
    slab(c, vgrad(c, y - h, y, [[0, mix(col, '#ffffff', 0.15)], [1, col]]), x + dx, y - h, ww, h, 1, 0.9);
    box(c, rgba('#f6f1e2', 0.7), x + dx + ww - 3, y - h + 1, 2, h - 2);
    y -= h + 0.9;
  }
}

function globe(c: C, x: number, floor: number): void {
  box(c, INK, x - 10, floor - 4, 20, 4, 1.5); box(c, '#5a4632', x - 9, floor - 3.4, 18, 2.8, 1);
  line(c, INK, 3, [[x, floor - 4], [x, floor - 10]]);
  c.beginPath(); c.arc(x, floor - 30, 21, Math.PI * 0.55, Math.PI * 1.45); stroke(c, INK, 3.2); stroke(c, '#b08a4a', 1.8);
  oval(c, INK, x, floor - 30, 18.5, 18.5);
  oval(c, rgrad(c, x + 5, floor - 36, 22, [[0, '#4d6e8a'], [1, '#1f3348']]), x, floor - 30, 17, 17);
  for (const [dx, dy, rx, ry] of [[-6, -6, 6, 4], [5, 2, 5, 7], [-4, 8, 4, 3]] as const) oval(c, '#c9b07a', x + dx, floor - 30 + dy, rx, ry, 0.4);
  oval(c, 'rgba(255, 255, 255, 0.25)', x + 6, floor - 38, 5, 3, -0.5);
}

function wickerBasket(c: C, x: number, floor: number, w: number, h: number): void {
  slab(c, hgrad(c, x - w / 2, x + w / 2, [[0, '#a7814e'], [1, '#d6b27a']]), x - w / 2, floor - h, w, h, 3);
  c.save(); c.beginPath(); c.rect(x - w / 2, floor - h, w, h); c.clip();
  for (let yy = floor - h + 3; yy < floor; yy += 4) line(c, 'rgba(110, 76, 36, 0.45)', 1, [[x - w / 2, yy], [x + w / 2, yy]]);
  for (let xx = x - w / 2 + 3; xx < x + w / 2; xx += 5) line(c, 'rgba(245, 220, 170, 0.3)', 0.8, [[xx, floor - h], [xx, floor]]);
  c.restore();
}

function paintShelf(c: C): void {
  const rand = seeded(77);
  // Open backs: the wallpaper shows through, a shade darker, with a shadow under every shelf.
  box(c, 'rgba(40, 44, 34, 0.18)', SHELF.x0, SHELF.top, SHELF.x1 - SHELF.x0, BASE - SHELF.top);
  for (const s of SHELVES.slice(1)) { c.fillStyle = vgrad(c, s, s + 12, [[0, 'rgba(40, 44, 34, 0.35)'], [1, 'rgba(40, 44, 34, 0)']]); c.fillRect(SHELF.x0, s, SHELF.x1 - SHELF.x0, 12); }
  c.fillStyle = vgrad(c, SHELF.top + 6, SHELF.top + 18, [[0, 'rgba(40, 44, 34, 0.35)'], [1, 'rgba(40, 44, 34, 0)']]); c.fillRect(SHELF.x0, SHELF.top + 6, SHELF.x1 - SHELF.x0, 12);
  // What lives on the shelves. Row 0 is the bottom one; some places are kept clear for the hiding places.
  const rows = [SHELVES[0], ...SHELVES.slice(1)];
  for (let col = 0; col < 4; col++) for (let row = 0; row < 5; row++) {
    const x0 = COLUMNS[col] + 6, x1 = COLUMNS[col + 1] - 3, floor = rows[row], room = (row === 4 ? floor - SHELF.top - 6 : floor - rows[row + 1] - 6);
    if (row === 0 && col === 0) { books(c, rand, x0, x0 + 46, floor, room); continue; } // the pile (a hiding place) stands to the right
    if (row === 0 && col === 1) { pile(c, rand, x0 + 4, 60, floor, 5); books(c, rand, x0 + 76, x1, floor, room); continue; }
    if (row === 0 && col === 3) { pile(c, rand, x0 + 2, 58, floor, 6); pile(c, rand, x0 + 70, 66, floor, 4); continue; }
    if (row === 1 && col === 2) { books(c, rand, x0, x0 + 34, floor, room); continue; } // the basket house sits here
    if (row === 2 && col === 0) { globe(c, x0 + 30, floor); books(c, rand, x0 + 62, x1, floor, room); continue; }
    if (row === 4 && col === 1) { wickerBasket(c, x0 + 48, floor, 78, 34); books(c, rand, x0 + 96, x1, floor, room); continue; }
    if (row === 2 && col === 3) {
      // A white book standing face out, with a little pattern on its cover.
      books(c, rand, x0, x0 + 70, floor, room);
      slab(c, '#f4f2ea', x0 + 84, floor - 40, 32, 40, 1, 1);
      for (let k = 0; k < 4; k++) box(c, ['#2e4f7a', '#a33a2f', '#5c8a5a', '#c9a24a'][k], x0 + 88 + k * 6.5, floor - 18, 4.5, 8);
      box(c, '#33414a', x0 + 89, floor - 32, 22, 2); box(c, '#33414a', x0 + 89, floor - 27, 16, 1.6);
      books(c, rand, x0 + 122, x1, floor, room);
      continue;
    }
    books(c, rand, x0, x1, floor, room);
  }
  // The white boards: uprights, shelves, the top and a plinth.
  for (const x of COLUMNS) slab(c, hgrad(c, x - 4, x + 4, [[0, '#d9d7cf'], [1, WHITE]]), x - 4, SHELF.top, 8, BASE - SHELF.top, 0, 1.1);
  for (const s of SHELVES.slice(1)) slab(c, vgrad(c, s, s + 6, [[0, WHITE], [1, '#d8d6cd']]), SHELF.x0 - 4, s, SHELF.x1 - SHELF.x0 + 8, 6, 0, 1.1);
  slab(c, WHITE, SHELF.x0 - 6, SHELF.top - 2, SHELF.x1 - SHELF.x0 + 12, 8, 0, 1.1);
  slab(c, '#e2e0d8', SHELF.x0 - 4, BASE - 10, SHELF.x1 - SHELF.x0 + 8, 10, 0, 1.1);
  // The shelf over the doorway, full of books too.
  box(c, 'rgba(40, 44, 34, 0.18)', SHELF.x1, SHELF.top, 236, 40);
  books(c, rand, SHELF.x1 + 6, SHELF.x1 + 228, SHELF.top + 40, 34);
  slab(c, WHITE, SHELF.x1, SHELF.top + 40, 236, 6, 0, 1.1); slab(c, WHITE, SHELF.x1, SHELF.top - 2, 236, 8, 0, 1.1);
  slab(c, WHITE, SHELF.x1 + 232, SHELF.top - 2, 8, 48, 0, 1.1);
}

// ---------------------------------------------------------------- the sofa, where everything goes

function cushion(c: C, x: number, y: number, w: number, h: number, r: number): void {
  slab(c, rgrad(c, x + w * 0.7, y + h * 0.3, Math.max(w, h), [[0, mix(FABRIC, '#ffffff', 0.18)], [0.7, FABRIC], [1, mix(FABRIC, '#000000', 0.18)]]), x, y, w, h, r, 1.3);
}

function paintSofa(c: C): void {
  // Local: the middle of the sofa's front edge on the floor. 276 wide, the seat 60 up, the back 124 up.
  floorShadow(c, 0, 2, 160, 10, 0.55);
  for (const x of [-124, -4, 116]) { box(c, INK, x - 1, -12, 10, 13, 2); box(c, '#5a4232', x, -11, 8, 11, 1.5); }
  // The back and the frame.
  slab(c, vgrad(c, -124, -40, [[0, mix(FABRIC, '#000000', 0.12)], [1, mix(FABRIC, '#000000', 0.22)]]), -128, -124, 256, 90, 14);
  for (const bx of [-104, -34, 36]) cushion(c, bx, -118, 68, 64, 14);
  // The seat: a front rail and three cushions.
  slab(c, vgrad(c, -40, -10, [[0, FABRIC], [1, mix(FABRIC, '#000000', 0.2)]]), -110, -40, 220, 30, 5);
  for (const bx of [-108, -36, 36]) {
    cushion(c, bx, -66, 72, 30, 8);
    box(c, rgba('#ffffff', 0.18), bx + 6, -63, 60, 3, 1.5);
  }
  // The arms.
  for (const s of [-1, 1]) {
    const x = s < 0 ? -140 : 108;
    slab(c, hgrad(c, x, x + 32, s < 0 ? [[0, mix(FABRIC, '#000000', 0.2)], [1, FABRIC]] : [[0, FABRIC], [1, mix(FABRIC, '#ffffff', 0.14)]]), x, -82, 32, 72, 12);
    box(c, rgba('#ffffff', 0.2), x + 4, -79, 24, 3, 1.5);
  }
  // A woven texture over everything.
  const rand = seeded(5);
  for (let i = 0; i < 700; i++) {
    const x = -138 + rand() * 276, y = -122 + rand() * 112;
    oval(c, rand() < 0.5 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(30, 32, 30, 0.07)', x, y, 0.8, 0.8);
  }
}

// ---------------------------------------------------------------- hiding places

interface PlaceArt {
  /** Where the place stands, in room pixels. */
  y: number;
  /** Where a hidden thing peeks out, relative to (x, y), and which way is "out". */
  tell: [number, number, number];
  back?: Sprite;
  front?: Sprite;
}

function consoleBack(c: C): void {
  floorShadow(c, 0, 2, 110, 6, 0.4);
  wallShadow(c, -96, -68, 192, 66, 3);
  slab(c, vgrad(c, -68, 0, [[0, '#5b6066'], [1, '#43474c']]), -96, -68, 192, 62, 3);
  box(c, '#6b7076', -96, -68, 192, 4, 2);
  for (const x of [-86, 6]) {
    box(c, '#24272a', x, -56, 80, 44, 2);
    c.fillStyle = vgrad(c, -56, -40, [[0, 'rgba(0, 0, 0, 0.5)'], [1, 'rgba(0, 0, 0, 0)']]); c.fillRect(x, -56, 80, 16);
  }
}

function consoleFront(c: C): void {
  // The lip along the bottom of the cubbies, the feet, and the geranium in its glass vase on top.
  slab(c, '#4a4e53', -96, -16, 192, 12, 1, 1.1);
  for (const x of [-90, 82]) { box(c, INK, x - 1, -5, 10, 6, 1); box(c, '#2f3236', x, -4, 8, 4, 1); }
  const vx = -56;
  box(c, 'rgba(200, 225, 230, 0.45)', vx - 9, -96, 18, 28, 3); box(c, 'rgba(160, 200, 210, 0.35)', vx - 8, -84, 16, 15, 2);
  c.beginPath(); c.roundRect(vx - 9, -96, 18, 28, 3); stroke(c, rgba(INK, 0.7), 1.1);
  const rand = seeded(19);
  for (let i = 0; i < 9; i++) {
    const a = -1.2 + i * 0.3 + (rand() - 0.5) * 0.2, len = 26 + rand() * 30, tip: Pt = [vx + Math.sin(a) * len, -92 - Math.cos(a) * len * 0.9];
    line(c, '#4f7a34', 1.4, [[vx + (rand() - 0.5) * 4, -80], [vx + Math.sin(a) * len * 0.5, -94 - len * 0.3], tip]);
    oval(c, INK, tip[0], tip[1], 7.6, 6.6); oval(c, rgrad(c, tip[0] + 2, tip[1] - 2, 8, [[0, '#7fae4e'], [1, '#4c7a2e']]), tip[0], tip[1], 6.4, 5.4);
    c.beginPath(); c.ellipse(tip[0], tip[1], 3.6, 3, 0, 0, TAU); stroke(c, 'rgba(70, 60, 30, 0.4)', 1);
  }
}

function tableBack(c: C): void {
  // The back legs and the lower tier, where things can sit.
  floorShadow(c, 0, 2, 100, 8, 0.45);
  for (const x of [-44, 40]) { line(c, INK, 3.4, [[x - 3, -52], [x, -2]]); line(c, INK, 3.4, [[x + 3, -52], [x, -2]]); line(c, '#e9e8e1', 1.6, [[x - 3, -52], [x, -2]]); line(c, '#e9e8e1', 1.6, [[x + 3, -52], [x, -2]]); }
  oval(c, INK, 0, -20, 84, 12.5); oval(c, '#cfcdc4', 0, -18, 82.5, 11); oval(c, vgrad(c, -32, -10, [[0, '#e4e2da'], [1, WHITE]]), 0, -21, 82.5, 10.5);
}

function tableFront(c: C): void {
  // The front edge of the lower tier, the front hairpin legs, then the top with the glass of water and the bird.
  c.save(); c.beginPath(); c.rect(-90, -21, 180, 20); c.clip();
  oval(c, INK, 0, -20, 84, 12.5); oval(c, '#cfcdc4', 0, -18, 82.5, 11); oval(c, WHITE, 0, -21, 82.5, 10.5);
  c.restore();
  for (const x of [-64, 60]) { line(c, INK, 3.6, [[x - 3.5, -50], [x, 0]]); line(c, INK, 3.6, [[x + 3.5, -50], [x, 0]]); line(c, '#f6f5f0', 1.8, [[x - 3.5, -50], [x, 0]]); line(c, '#f6f5f0', 1.8, [[x + 3.5, -50], [x, 0]]); }
  oval(c, INK, 0, -52, 98, 16); oval(c, '#cfcdc4', 0, -49, 96.5, 14); oval(c, vgrad(c, -66, -40, [[0, '#e8e7e1'], [1, '#fbfaf6']]), 0, -54, 96.5, 13.5);
  const rand = seeded(42);
  for (let i = 0; i < 9; i++) { const a = rand() * Math.PI; oval(c, 'rgba(120, 112, 100, 0.45)', Math.cos(a) * 92, -50 + Math.sin(a) * 12, 1.4, 0.7); }
  // A ribbed glass of water, blue-grey.
  const gx = -50;
  box(c, INK, gx - 9, -88, 18, 34, 3); box(c, 'rgba(150, 178, 186, 0.9)', gx - 7.6, -86.6, 15.2, 31.2, 2);
  box(c, 'rgba(110, 146, 158, 0.9)', gx - 7.6, -74, 15.2, 18.6, 2);
  for (let k = -5; k <= 5; k += 2.5) box(c, 'rgba(255, 255, 255, 0.35)', gx + k, -85, 0.9, 29);
  // A cork coaster with a little bird figurine.
  oval(c, INK, 34, -55, 18, 4.6); oval(c, '#c79a6a', 34, -55.6, 16.6, 3.6);
  box(c, INK, 32, -64, 4, 9); oval(c, INK, 34, -71, 7.6, 5.6); oval(c, '#f2f0e8', 34, -70.6, 6.2, 4.4);
  oval(c, INK, 39, -76, 4.4, 4); oval(c, '#2a2a2e', 39, -76, 3.2, 2.8); path(c, [[42, -77], [47, -76], [42, -75]], true); c.fillStyle = INK; c.fill();
  path(c, [[29, -71], [21, -74], [28, -67]], true); c.fillStyle = '#2a2a2e'; c.fill();
}

function chairBack(c: C): void {
  // The Barcelona chair, three-quarters on: the backrest and the far half of the chrome frame.
  floorShadow(c, 0, 2, 76, 7, 0.5);
  line(c, INK, 6, [[48, 0], [40, -50], [30, -104]]); line(c, '#c9ced0', 3.4, [[48, 0], [40, -50], [30, -104]]);
  path(c, [[-46, -50], [-40, -118], [40, -118], [44, -50]], true); c.fillStyle = INK; c.fill();
  path(c, [[-44, -52], [-38.6, -116], [38.6, -116], [42, -52]], true); c.fillStyle = hgrad(c, -44, 44, [[0, '#1d1d20'], [0.6, LEATHER], [1, '#3a3a40']]); c.fill();
  tufts(c, -38, -112, 78, 58, 4, 4);
  // The grey knit throw over the left of the backrest.
  const throwShape = () => {
    c.beginPath(); c.moveTo(-46, -112); c.quadraticCurveTo(-30, -126, -4, -121); c.quadraticCurveTo(4, -104, -6, -92);
    c.quadraticCurveTo(-14, -80, -12, -64); c.quadraticCurveTo(-30, -58, -50, -60); c.quadraticCurveTo(-56, -86, -46, -112); c.closePath();
  };
  throwShape(); c.fillStyle = hgrad(c, -56, -2, [[0, '#8b8d8b'], [1, '#b4b6b2']]); c.fill();
  c.save(); throwShape(); c.clip();
  for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(-50 + k * 7, -124); c.quadraticCurveTo(-46 + k * 6, -92, -50 + k * 6, -58); stroke(c, k % 2 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(60, 62, 58, 0.2)', 1.6); }
  c.restore();
  throwShape(); stroke(c, INK, 1.4);
  for (let k = 0; k < 6; k++) line(c, '#9a9c98', 1.2, [[-48 + k * 6.6, -60 + k * 0.4], [-49 + k * 6.6, -52 + k * 0.4]]);
}

function chairFront(c: C): void {
  // The seat cushion over the crease, and the near half of the frame: the X legs.
  path(c, [[-56, -54], [52, -54], [58, -36], [-58, -36]], true); c.fillStyle = INK; c.fill();
  path(c, [[-54.4, -52.6], [50.6, -52.6], [56, -37.6], [-56, -37.6]], true); c.fillStyle = vgrad(c, -54, -36, [[0, '#3a3a40'], [1, '#18181b']]); c.fill();
  tufts(c, -50, -50, 100, 12, 1, 5);
  for (const [a, b] of [[[-56, 0], [-30, -38]], [[-18, 0], [-50, -40]], [[54, 0], [30, -38]], [[18, 0], [50, -40]]] as Array<[Pt, Pt]>) {
    c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2 + (a[0] < b[0] ? -8 : 8), (a[1] + b[1]) / 2, b[0], b[1]);
    stroke(c, INK, 5.6); stroke(c, '#c9ced0', 3);
    c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2 + (a[0] < b[0] ? -8 : 8), (a[1] + b[1]) / 2, b[0], b[1]); stroke(c, 'rgba(255, 255, 255, 0.6)', 1);
  }
}

/** Buttoned leather: a grid of buttons with soft creases between them. */
function tufts(c: C, x: number, y: number, w: number, h: number, rows: number, cols: number): void {
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const bx = x + (k + 0.5) * w / cols, by = y + (r + 0.5) * h / rows;
    line(c, 'rgba(255, 255, 255, 0.12)', 1, [[bx - w / cols * 0.4, by - 1], [bx + w / cols * 0.4, by - 1]]);
    oval(c, '#0e0e10', bx, by, 1.4, 1.4); oval(c, 'rgba(255, 255, 255, 0.25)', bx + 0.5, by - 0.5, 0.6, 0.6);
  }
}

function booksFront(c: C): void {
  // A low pile of books and magazines, lying flat; things hide behind it.
  pile(c, seeded(9), -16, 74, 0, 6);
}

function basketBack(c: C): void {
  floorShadow(c, 0, 2, 54, 6, 0.45);
  oval(c, INK, 0, -52, 47, 9); oval(c, '#5a4a32', 0, -52, 45.5, 7.6);
  // Toys sticking out: a wooden block and a little red-and-blue pull-along toy.
  slab(c, '#e2b04a', -30, -66, 14, 14, 1, 1.1); box(c, '#c48c2a', -27, -63, 8, 8, 1);
  slab(c, '#d63c34', -10, -64, 20, 10, 2, 1.1); oval(c, INK, -6, -54, 4, 4); oval(c, '#3d6a9e', -6, -54, 3, 3); oval(c, INK, 6, -54, 4, 4); oval(c, '#3d6a9e', 6, -54, 3, 3);
}

function basketFront(c: C): void {
  // The striped seagrass toy basket.
  const shape = () => { c.beginPath(); c.moveTo(-46, -52); c.quadraticCurveTo(-44, -6, -38, 0); c.lineTo(38, 0); c.quadraticCurveTo(44, -6, 46, -52); c.ellipse(0, -52, 46, 7.6, 0, 0, Math.PI); c.closePath(); };
  shape(); c.fillStyle = hgrad(c, -46, 46, [[0, '#bfae84'], [0.6, '#e2d4ad'], [1, '#efe3c2']]); c.fill();
  c.save(); shape(); c.clip();
  for (let y = -52; y < 0; y += 3.4) line(c, 'rgba(140, 118, 70, 0.4)', 0.9, [[-50, y], [50, y + 1]]);
  for (const [y, h] of [[-36, 6], [-20, 6]] as const) box(c, '#1f1f22', -50, y, 100, h);
  c.restore();
  shape(); stroke(c, INK, 1.5);
  c.beginPath(); c.ellipse(0, -52, 46, 7.6, 0, 0, Math.PI); stroke(c, '#a8966a', 2.4);
}

function houseFront(c: C): void {
  // The little woven basket house on the shelf.
  const body = () => { c.beginPath(); c.rect(-28, -34, 56, 34); };
  body(); c.fillStyle = hgrad(c, -28, 28, [[0, '#a8854e'], [1, '#d8b47a']]); c.fill();
  c.save(); body(); c.clip();
  for (let y = -32; y < 0; y += 3.6) line(c, 'rgba(110, 76, 36, 0.45)', 0.9, [[-30, y], [30, y]]);
  c.restore();
  body(); stroke(c, INK, 1.4);
  box(c, INK, -8, -24, 14, 14, 1); box(c, '#3a2a1a', -6.6, -22.6, 11.2, 11.2); line(c, '#d8b47a', 1.4, [[-1, -23], [-1, -11]]); line(c, '#d8b47a', 1.4, [[-7, -17], [5, -17]]);
  path(c, [[-34, -32], [0, -58], [34, -32]], true); c.fillStyle = hgrad(c, -34, 34, [[0, '#8f6a3a'], [1, '#c39a5e']]); c.fill(); stroke(c, INK, 1.6);
  c.save(); path(c, [[-34, -32], [0, -58], [34, -32]], true); c.clip();
  for (let k = -40; k < 40; k += 5) line(c, 'rgba(240, 210, 160, 0.4)', 0.9, [[k, -32], [k + 26, -60]]);
  c.restore();
}

function redboxBack(c: C): void {
  floorShadow(c, 0, 2, 50, 6, 0.45);
  box(c, INK, -42, -40, 84, 12, 1); box(c, '#2a1414', -40.6, -38.6, 81.2, 10);
}

function redboxFront(c: C): void {
  // A red tin box with its lid a little ajar.
  slab(c, hgrad(c, -42, 42, [[0, '#a8261f'], [0.6, '#d6372c'], [1, '#e8584a']]), -42, -30, 84, 30, 2);
  box(c, 'rgba(255, 255, 255, 0.25)', -38, -27, 76, 2);
  slab(c, '#efd36a', -6, -24, 12, 6, 1, 1);
  c.save(); c.translate(-44, -32); c.rotate(-0.12);
  slab(c, hgrad(c, 0, 88, [[0, '#b52b22'], [1, '#e84f40']]), 0, -8, 88, 9, 2);
  box(c, 'rgba(255, 255, 255, 0.3)', 4, -6, 80, 1.6);
  c.restore();
}

function doorwayBack(c: C): void {
  // The dining room beyond: mauve walls in a dimmer light, round mirrors, a pendant lamp and a dark wooden chair.
  c.fillStyle = vgrad(c, -238, -40, [[0, '#7e6f78'], [1, '#93858c']]); c.fillRect(-60, -238, 120, 200);
  c.fillStyle = vgrad(c, -40, 0, [[0, '#2e2a29'], [1, '#3a3532']]); c.fillRect(-60, -40, 120, 40);
  for (const [mx, my, r] of [[-34, -148, 14], [-10, -128, 10], [22, -150, 17]] as const) {
    oval(c, INK, mx, my, r + 1.6, r + 1.6); oval(c, '#9aa0a4', mx, my, r, r); oval(c, rgrad(c, mx + r * 0.3, my - r * 0.3, r, [[0, '#d9dde0'], [1, '#8a9095']]), mx, my, r - 1.6, r - 1.6);
  }
  line(c, '#2a2a2a', 1.2, [[30, -238], [30, -192]]); oval(c, INK, 30, -186, 9, 7); oval(c, '#3a3a3c', 30, -186, 7.6, 5.6);
  // The chair, from the side: spindle back, seat, legs.
  line(c, INK, 4, [[-16, -2], [-14, -40], [-12, -96]]); line(c, '#2c211a', 2.2, [[-16, -2], [-14, -40], [-12, -96]]);
  line(c, INK, 4, [[14, -2], [14, -40]]); line(c, '#2c211a', 2.2, [[14, -2], [14, -40]]);
  slab(c, '#3a2b20', -18, -44, 36, 6, 1, 1);
  for (let k = 0; k < 4; k++) { line(c, INK, 2.6, [[-13, -50 - k * 12], [-9, -50 - k * 12]]); }
  box(c, 'rgba(255, 220, 190, 0.12)', -60, -238, 120, 238);
  // The doorway's shade on the near side.
  c.fillStyle = hgrad(c, -60, -40, [[0, 'rgba(20, 16, 20, 0.45)'], [1, 'rgba(20, 16, 20, 0)']]); c.fillRect(-60, -238, 20, 238);
}

function doorwayFront(c: C): void {
  // The white architrave around the opening, and the threshold.
  for (const x of [-70, 60]) slab(c, hgrad(c, x, x + 10, [[0, '#dcdad2'], [1, WHITE]]), x, -246, 10, 246, 0, 1.1);
  slab(c, WHITE, -70, -248, 140, 10, 0, 1.1);
  slab(c, '#b8a98e', -60, -4, 120, 4, 0, 0.9);
}

/** Every hiding place: where it stands, where its secret peeks out, and its sprites. */
let places: Record<PlaceKind, PlaceArt> | null = null;
function placeArt(): Record<PlaceKind, PlaceArt> {
  if (places) return places;
  places = {
    console: { y: 408, tell: [56, -16, 0], back: bake(220, 140, 110, 128, consoleBack), front: bake(220, 150, 110, 140, consoleFront) },
    table: { y: 446, tell: [52, -24, 0], back: bake(220, 80, 110, 70, tableBack), front: bake(220, 110, 110, 100, tableFront) },
    chair: { y: 424, tell: [28, -52, 0], back: bake(140, 140, 70, 130, chairBack), front: bake(140, 70, 70, 62, chairFront) },
    books: { y: SHELVES[0], tell: [44, -30, 0], front: bake(110, 50, 30, 46, booksFront) },
    toybasket: { y: 414, tell: [30, -54, 0], back: bake(120, 90, 60, 80, basketBack), front: bake(120, 80, 60, 70, basketFront) },
    baskethouse: { y: SHELVES[1], tell: [18, -40, 0], front: bake(90, 70, 45, 64, houseFront) },
    redbox: { y: 414, tell: [30, -34, 0], back: bake(110, 60, 55, 50, redboxBack), front: bake(110, 60, 55, 50, redboxFront) },
    doorway: { y: BASE, tell: [60, -18, -Math.PI / 2], back: bake(140, 250, 70, 242, doorwayBack), front: bake(160, 260, 80, 252, doorwayFront) },
  };
  return places;
}

// ---------------------------------------------------------------- the things

/** How tall each thing is, sitting on its bottom edge, for stacking them in his arms. */
const HEIGHT: Record<ItemId, number> = { blanket: 18, cushion: 30, teddy: 38, popcorn: 28, remote: 9 };

function paintItem(c: C, id: ItemId): void {
  // Each thing sits on (0, 0), about 40 pixels across.
  if (id === 'blanket') {
    // The grey knit throw, folded, with tassels at one end.
    slab(c, vgrad(c, -18, 0, [[0, '#b4b6b2'], [1, '#8c8e8a']]), -24, -18, 48, 18, 5, 1.4);
    for (let k = 0; k < 7; k++) line(c, 'rgba(255, 255, 255, 0.28)', 1.4, [[-20 + k * 6.6, -16], [-22 + k * 6.6, -2]]);
    line(c, 'rgba(60, 62, 58, 0.4)', 1.2, [[-22, -9], [22, -9]]);
    for (let k = 0; k < 5; k++) line(c, '#9a9c98', 1.3, [[24, -15 + k * 3.4], [29, -14 + k * 3.4]]);
  } else if (id === 'cushion') {
    // A mustard cushion with piping and a button.
    c.save(); c.translate(0, -15); c.rotate(-0.08);
    c.beginPath(); c.moveTo(-16, -15); c.quadraticCurveTo(0, -11, 16, -15); c.quadraticCurveTo(12, 0, 16, 15); c.quadraticCurveTo(0, 11, -16, 15); c.quadraticCurveTo(-12, 0, -16, -15); c.closePath();
    c.fillStyle = rgrad(c, 5, -5, 24, [[0, '#f0c062'], [0.7, '#d9a441'], [1, '#a8792a']]); c.fill(); stroke(c, INK, 1.6);
    oval(c, '#9a6d24', 0, 0, 2.4, 2.4); line(c, 'rgba(120, 80, 20, 0.4)', 1, [[-8, -6], [0, 0], [8, 7]]);
    c.restore();
  } else if (id === 'teddy') {
    // A sitting teddy bear.
    const fur = '#b07a4a', light = '#e2b98a';
    for (const s of [-1, 1]) { oval(c, INK, s * 9, -4, 7.4, 5.6); oval(c, fur, s * 9, -4, 6, 4.4); oval(c, light, s * 10, -3, 3, 2.4); }
    oval(c, INK, 0, -14, 12.4, 12.6); oval(c, rgrad(c, 4, -18, 14, [[0, '#c9925e'], [1, fur]]), 0, -14, 11, 11.2); oval(c, light, 0, -11, 6.4, 6.6);
    for (const s of [-1, 1]) { oval(c, INK, s * 11, -16, 4.2, 6.4, s * 0.4); oval(c, fur, s * 11, -16, 3, 5.2, s * 0.4); }
    for (const s of [-1, 1]) { oval(c, INK, s * 9, -36, 5.4, 5.4); oval(c, fur, s * 9, -36, 4.2, 4.2); oval(c, light, s * 9, -36, 2.2, 2.2); }
    oval(c, INK, 0, -28, 10.6, 9.6); oval(c, rgrad(c, 4, -32, 12, [[0, '#c9925e'], [1, fur]]), 0, -28, 9.4, 8.4);
    oval(c, light, 0, -25, 4.6, 3.6); oval(c, INK, 0, -26.6, 1.8, 1.3);
    oval(c, INK, -3.8, -30, 1.3, 1.5); oval(c, INK, 3.8, -30, 1.3, 1.5);
    c.beginPath(); c.arc(0, -24.6, 2, 0.4, Math.PI - 0.4); stroke(c, INK, 0.9);
  } else if (id === 'popcorn') {
    // A striped popcorn bucket, piled high.
    const rand = seeded(3);
    for (let i = 0; i < 16; i++) { const px = -12 + rand() * 24, py = -22 - rand() * 8; oval(c, INK, px, py, 4.6, 4); oval(c, rand() < 0.3 ? '#f3d98a' : '#fbf3dc', px, py, 3.6, 3); }
    const bucket = () => path(c, [[-14, -22], [14, -22], [10, 0], [-10, 0]], true);
    bucket(); c.fillStyle = '#ffffff'; c.fill();
    c.save(); bucket(); c.clip(); for (let x = -14; x < 14; x += 7) box(c, '#d6372c', x, -22, 3.5, 22); c.restore();
    bucket(); stroke(c, INK, 1.5);
  } else {
    // The remote: a black bar with a red button.
    slab(c, hgrad(c, -22, 22, [[0, '#18191c'], [1, '#33353a']]), -22, -9, 44, 9, 3, 1.2);
    oval(c, '#e2433a', -15, -4.5, 2.2, 2.2);
    for (let k = 0; k < 4; k++) oval(c, '#6a6e74', -6 + k * 5, -4.5, 1.4, 1.4);
    box(c, 'rgba(255, 255, 255, 0.18)', -19, -8, 38, 1.2);
  }
}

/** What peeks out of a hiding place: drawn pointing up from (0, 0), the rim it hides behind. */
function paintTell(c: C, id: ItemId, t: number): void {
  if (id === 'blanket') {
    // A grey knit corner with tassels.
    path(c, [[-12, 4], [-2, -16], [12, 4]], true); c.fillStyle = hgrad(c, -12, 12, [[0, '#8f918d'], [1, '#b6b8b4']]); c.fill(); stroke(c, INK, 1.4);
    for (let k = 0; k < 3; k++) line(c, 'rgba(255, 255, 255, 0.3)', 1.2, [[-6 + k * 5, 2], [-2 + k * 1.4, -12]]);
    for (const a of [-0.5, 0, 0.5]) line(c, '#9a9c98', 1.2, [[-2, -16], [-2 + Math.sin(a + Math.sin(t * 6) * 0.2) * 6, -16 - Math.cos(a) * 6]]);
  } else if (id === 'cushion') {
    path(c, [[-12, 4], [-8, -12], [10, -8], [12, 4]], true); c.fillStyle = hgrad(c, -12, 12, [[0, '#b88a34'], [1, '#e8b450']]); c.fill(); stroke(c, INK, 1.5);
    line(c, '#9a6d24', 2, [[-8, -12], [-12, -18]]); oval(c, '#e8b450', -12.6, -19, 2.2, 2.2);
  } else if (id === 'teddy') {
    // Two round ears and the top of a furry head.
    oval(c, INK, 0, 2, 14, 10); oval(c, '#b07a4a', 0, 2, 12.6, 8.6);
    for (const s of [-1, 1]) { oval(c, INK, s * 10, -6, 5.6, 5.6); oval(c, '#b07a4a', s * 10, -6, 4.4, 4.4); oval(c, '#e2b98a', s * 10, -6, 2.2, 2.2); }
  } else if (id === 'popcorn') {
    const rand = seeded(8);
    for (let i = 0; i < 7; i++) { const px = -9 + rand() * 18, py = -2 - rand() * 7; oval(c, INK, px, py, 4.2, 3.6); oval(c, '#fbf3dc', px, py, 3.2, 2.6); }
    path(c, [[-12, 4], [12, 4], [11, -2], [-11, -2]], true); c.fillStyle = '#ffffff'; c.fill();
    box(c, '#d6372c', -9, -2, 3.5, 6); box(c, '#d6372c', -2, -2, 3.5, 6); box(c, '#d6372c', 5, -2, 3.5, 6);
    path(c, [[-12, 4], [12, 4], [11, -2], [-11, -2]], true); stroke(c, INK, 1.3);
  } else {
    c.save(); c.rotate(0.25);
    slab(c, '#1d1e21', -4.5, -18, 9, 24, 3, 1.2);
    oval(c, '#e2433a', 0, -13, 2.2, 2.2); oval(c, '#6a6e74', 0, -7, 1.3, 1.3);
    c.restore();
  }
}

// ---------------------------------------------------------------- surprises

function surprise(c: C, kind: SurpriseKind, x: number, y: number, t: number): void {
  if (kind === 'dining') return;
  const pop = Math.min(1, t / 0.35), lift = Math.sin(Math.min(1, t / 0.5) * Math.PI) * 18;
  c.save(); c.translate(x, y - lift); c.scale(pop, pop);
  if (kind === 'dustbunny') {
    // A grey fluffball with eyes, and the puff it makes.
    const rand = seeded(4);
    lumps(c, 0, -12, 14, 12, 14, rand, 0.3); c.fillStyle = '#a7a59e'; c.fill(); stroke(c, '#6f6d66', 1.2);
    for (let i = 0; i < 12; i++) { const a = rand() * TAU; line(c, '#c9c7c0', 1, [[Math.cos(a) * 10, -12 + Math.sin(a) * 9], [Math.cos(a) * 16, -12 + Math.sin(a) * 14]]); }
    for (const ex of [-4, 4]) { oval(c, '#ffffff', ex, -14, 3, 3.2); oval(c, INK, ex + 0.6, -13.6, 1.4, 1.6); }
    const puff = Math.max(0, 1 - t / 1.4);
    c.globalAlpha = puff;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-22 - i * 9 - (1 - puff) * 18, -14 - i * 3, 4 + i * 2.4, 0, TAU); stroke(c, '#d9d6cc', 2); }
    c.globalAlpha = 1;
  } else if (kind === 'sock') {
    c.rotate(Math.sin(t * 4) * 0.1);
    const s = () => path(c, [[-7, -34], [7, -34], [7, -10], [20, -7], [20, 0], [-7, 0]], true);
    s(); c.fillStyle = '#f2efe6'; c.fill();
    c.save(); s(); c.clip(); for (let yy = -32; yy < 0; yy += 7) box(c, '#3d6a9e', -9, yy, 32, 3); c.restore();
    s(); stroke(c, INK, 1.6);
  } else if (kind === 'puzzle') {
    c.rotate(-0.2 + Math.sin(t * 3) * 0.08);
    c.beginPath(); c.moveTo(-12, -24); c.lineTo(-3, -24); c.arc(0, -26, 4, Math.PI * 0.8, Math.PI * 0.2, false); c.lineTo(12, -24); c.lineTo(12, -15);
    c.arc(15, -12, 4, -Math.PI * 0.7, Math.PI * 0.7, false); c.lineTo(12, 0); c.lineTo(-12, 0); c.closePath();
    c.fillStyle = hgrad(c, -12, 16, [[0, '#2f6db0'], [1, '#5d93d6']]); c.fill(); stroke(c, INK, 1.5);
    oval(c, '#f2c94c', -4, -11, 3, 3);
  } else if (kind === 'dino') {
    // A green toy dinosaur, roaring.
    const roar = Math.sin(t * 10) * 0.08;
    path(c, [[-20, -6], [-8, -18], [6, -18], [14, -28], [24, -30], [26, -22], [16, -18], [14, -6], [8, 0], [-10, 0]], true);
    c.fillStyle = hgrad(c, -20, 26, [[0, '#4f9a3e'], [1, '#78c25a']]); c.fill(); stroke(c, INK, 1.5);
    for (let k = 0; k < 4; k++) { path(c, [[-8 + k * 6, -18], [-5 + k * 6, -24], [-2 + k * 6, -18]], true); c.fillStyle = '#f2c94c'; c.fill(); stroke(c, INK, 1); }
    oval(c, INK, 20, -26, 1.4, 1.4);
    c.save(); c.translate(26, -24); c.rotate(roar); line(c, INK, 1.4, [[0, 0], [-6, 2]]); c.restore();
    for (const lx of [-4, 8]) { box(c, INK, lx - 1, -2, 6, 6, 1); box(c, '#4f9a3e', lx, -1, 4, 4, 1); }
  } else {
    // A red crayon in its paper wrapper.
    c.rotate(-0.5 + Math.sin(t * 3) * 0.05);
    slab(c, '#d6372c', -16, -6, 26, 8, 1, 1.2); box(c, '#f2efe6', -12, -6, 16, 8); box(c, '#d6372c', -8, -4, 8, 4);
    path(c, [[10, -6], [18, -2], [10, 2]], true); c.fillStyle = '#d6372c'; c.fill(); stroke(c, INK, 1.2);
  }
  c.restore();
}

// ---------------------------------------------------------------- baking

interface HomeArt {
  ceiling: Sprite; wall: Sprite; floor: Sprite; ends: [Sprite, Sprite]; hats: Sprite; pendant: Sprite; tv: Sprite; rug: Sprite;
  lamp: Sprite; shelf: Sprite; sofa: Sprite; items: Record<ItemId, Sprite>; light: Sprite; glow: Sprite; ambi: Sprite;
}
let art: HomeArt | null = null;

/** A sprite drawn in room coordinates, covering x0…x0+w and y0…y0+h; `put` it at (0, 0). */
const inRoom = (x0: number, y0: number, w: number, h: number, draw: (c: C) => void): Sprite => bake(w, h, -x0, -y0, draw);

function paintLight(c: C): void {
  // A warm evening wash and a gentle vignette.
  c.fillStyle = 'rgba(255, 196, 120, 0.06)'; c.fillRect(0, 0, W, 540);
  c.fillStyle = rgrad(c, 480, 300, 640, [[0, 'rgba(40, 30, 24, 0)'], [0.6, 'rgba(40, 30, 24, 0)'], [1, 'rgba(40, 30, 24, 0.32)']]);
  c.fillRect(0, 0, W, 540);
}

function getArt(): HomeArt {
  if (art) return art;
  const items = {} as Record<ItemId, Sprite>;
  for (const id of ['blanket', 'cushion', 'teddy', 'popcorn', 'remote'] as const) items[id] = bake(70, 60, 35, 50, c => paintItem(c, id));
  art = {
    ceiling: strip(480, 0, CEIL + 2, paintCeiling),
    wall: strip(240, CEIL - 2, BASE - CEIL + 4, paintWall),
    floor: strip(600, BASE, 540 - BASE, paintFloor),
    ends: [inRoom(0, 0, 46, 540, paintLeftEnd), inRoom(ROOM - 80, 0, 80, 540, paintRightEnd)],
    hats: inRoom(20, 118, 250, 170, paintHats),
    pendant: inRoom(160, 0, 210, 122, paintPendant),
    tv: inRoom(220, 168, 220, 180, paintTv),
    rug: inRoom(400, 412, 330, 70, paintRug),
    lamp: inRoom(LAMP_X - 40, 190, 80, 222, paintFloorLamp),
    shelf: inRoom(SHELF.x0 - 10, SHELF.top - 6, SHELF.x1 - SHELF.x0 + 260, BASE - SHELF.top + 8, paintShelf),
    sofa: bake(300, 140, 150, 130, paintSofa),
    items,
    light: bake(W, 540, 0, 0, paintLight),
    glow: bake(200, 200, 100, 100, c => { c.fillStyle = rgrad(c, 0, 0, 100, [[0, 'rgba(255, 214, 140, 0.5)'], [0.4, 'rgba(255, 200, 120, 0.18)'], [1, 'rgba(255, 200, 120, 0)']]); c.fillRect(-100, -100, 200, 200); }),
    ambi: bake(320, 220, 160, 110, c => {
      c.save(); c.scale(1.45, 1); c.fillStyle = rgrad(c, 0, 0, 108, [[0, 'rgba(214, 240, 90, 0.75)'], [0.55, 'rgba(190, 226, 80, 0.32)'], [1, 'rgba(190, 226, 80, 0)']]); c.fillRect(-110, -110, 220, 220); c.restore();
    }),
  };
  return art;
}

// ---------------------------------------------------------------- the TV picture

/** The cartoon on the TV: a blue car bouncing along a road lined with palm trees (after the picture in the photo). */
function cartoon(c: C, t: number): void {
  const { x, y, w, h } = SCREEN;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = vgrad(c, y, y + h * 0.6, [[0, '#6fbde8'], [1, '#cdeefb']]); c.fillRect(x, y, w, h);
  oval(c, '#fff3b0', x + w - 30, y + 18, 10, 10);
  // Hills, then palm trees and the grass verge, scrolling past.
  c.fillStyle = '#a9d36a'; c.beginPath(); c.moveTo(x, y + 62);
  for (let k = 0; k <= w; k += 8) c.lineTo(x + k, y + 56 + Math.sin((k + t * 20) * 0.04) * 6);
  c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); c.fill();
  for (let i = 0; i < 5; i++) {
    const px = x + ((i * 60 - t * 70) % 300 + 300) % 300 - 40, py = y + 64;
    line(c, '#7a5230', 3, [[px, py], [px + 4, py - 34]]);
    for (const a of [-2.5, -1.9, -1.2, -0.6, 0]) line(c, '#2f8a3a', 3, [[px + 4, py - 34], [px + 4 + Math.cos(a) * 14, py - 34 + Math.sin(a) * 8 + 4]]);
  }
  box(c, '#62b046', x, y + 62, w, 6);
  box(c, '#cfd3d4', x, y + 68, w, h - 68);
  for (let k = 0; k < 6; k++) box(c, '#ffffff', x + ((k * 40 - t * 140) % 240 + 240) % 240 - 30, y + 84, 18, 2.4);
  // The car: a big blue convertible with round headlights, bouncing.
  const cx = x + 74, cy = y + 82 - Math.abs(Math.sin(t * 7)) * 4;
  oval(c, 'rgba(0, 0, 0, 0.2)', cx + 4, y + 92, 34, 4);
  slab(c, hgrad(c, cx - 34, cx + 36, [[0, '#2350b8'], [1, '#4f82e6']]), cx - 34, cy - 14, 70, 14, 4, 1.2);
  path(c, [[cx - 16, cy - 14], [cx - 8, cy - 24], [cx + 14, cy - 24], [cx + 20, cy - 14]], true); c.fillStyle = 'rgba(200, 236, 250, 0.8)'; c.fill(); stroke(c, INK, 1);
  box(c, '#e8ecef', cx + 30, cy - 9, 8, 3, 1);
  oval(c, '#fff6c8', cx + 33, cy - 12, 2.6, 2.6);
  for (const wx of [cx - 20, cx + 20]) { oval(c, INK, wx, cy + 1, 7, 7); oval(c, '#f2f2f2', wx, cy + 1, 3.6, 3.6); }
  for (let k = 0; k < 3; k++) line(c, 'rgba(255, 255, 255, 0.7)', 1.4, [[cx - 44 - k * 4, cy - 10 + k * 4], [cx - 54 - k * 6, cy - 10 + k * 4]]);
  c.restore();
}

// ---------------------------------------------------------------- a frame

type View = Pick<MovieRun, 'x' | 'facing' | 'walking' | 'mode' | 'spots' | 'carrying' | 'placed' | 'watch' | 'hint' | 'near' | 'tvOn' | 'arms'>;

/** The left edge of the view in room pixels, keeping Carl-Otto a little left of centre. */
export const cameraFor = (x: number): number => Math.max(0, Math.min(ROOM - W, x - W * 0.42));
const smooth = (k: number) => { const u = Math.max(0, Math.min(1, k)); return u * u * (3 - 2 * u); };

/** Where the arrow and the "look" bubble go over a place: above whatever stands there. */
export function topOf(kind: PlaceKind | 'sofa'): number {
  return kind === 'sofa' ? SOFA_Y - 150 : kind === 'baskethouse' ? SHELVES[1] - 110 : kind === 'books' ? SHELVES[0] - 100 : kind === 'doorway' ? 220 : 270;
}

/** The things in his arms, stacked, in the child's own units (feet at the origin, facing right). */
function stack(carried: Carried[]): (c: C) => void {
  return c => {
    const a = getArt();
    let y = -64;
    for (const k of carried) { put(c, a.items[k.item.id], 30, y, 0.66); y -= HEIGHT[k.item.id] * 0.66 + 1; }
  };
}

/** The things on the sofa, each where it belongs, settling in with a little bounce. While the film is on, the blanket is on his lap instead. */
function sofaThings(c: C, placed: Placed[], watching: boolean): void {
  const a = getArt(), at = (id: ItemId) => placed.find(p => p.item.id === id);
  const bounce = (p: Placed) => Math.max(0, Math.sin(Math.min(1, p.since / 0.4) * Math.PI)) * 10;
  const blanket = at('blanket');
  if (blanket && !watching) {
    // Draped over the back and down onto the seat on the right.
    const b = bounce(blanket), [l, top] = onSofa(36, -126), [r] = onSofa(106, 0);
    c.beginPath(); c.moveTo(l, top - b); c.quadraticCurveTo((l + r) / 2, top - 8 - b, r, top + 4 - b);
    c.quadraticCurveTo(r + 6, SEAT_Y - 20, r - 2, SEAT_Y + 8); c.lineTo(l + 6, SEAT_Y + 10); c.quadraticCurveTo(l - 4, SEAT_Y - 30, l, top - b); c.closePath();
    c.fillStyle = hgrad(c, l, r, [[0, '#8c8e8a'], [1, '#b6b8b4']]); c.fill(); stroke(c, INK, 1.4);
    for (let k = 1; k < 6; k++) { const x = l + (r - l) * k / 6; line(c, 'rgba(255, 255, 255, 0.25)', 1.4, [[x, top + 2 - b], [x + 2, SEAT_Y + 6]]); }
    for (let k = 0; k < 6; k++) { const x = l + 8 + (r - l - 12) * k / 5; line(c, '#9a9c98', 1.3, [[x, SEAT_Y + 9], [x, SEAT_Y + 15]]); }
  }
  const cushion = at('cushion');
  if (cushion) { c.save(); c.translate(onSofa(-82, 0)[0], SEAT_Y - 2 - bounce(cushion)); c.rotate(-0.25); put(c, a.items.cushion, 0, 0, 1.05); c.restore(); }
  const remote = at('remote'), armTop = onSofa(0, -82)[1];
  if (remote) put(c, a.items.remote, onSofa(-124, 0)[0], armTop - bounce(remote), 0.5);
  const popcorn = at('popcorn');
  if (popcorn) put(c, a.items.popcorn, onSofa(124, 0)[0], armTop - bounce(popcorn), 0.75);
  const teddy = at('teddy');
  if (teddy) put(c, a.items.teddy, SOFA_X + (watching ? 40 : 52), SEAT_Y + 2 - bounce(teddy), 0.95);
}

/** Sparkles round a found thing, or round the next place to look. */
function sparkles(c: C, x: number, y: number, t: number, r = 26): void {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 5 + 2, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.7;
    line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]);
  }
}

/**
 * One frame of the living room, in room units on a context scaled to the 960 × 540 world. Returns the camera. `picture` is
 * Carl-Otto's latest picture from the craft corner, hung on the wall over the sofa.
 */
export function drawHome(c: C, g: View, t: number, picture: HTMLImageElement | null = null): number {
  const a = getArt(), P = placeArt();
  const film = g.mode === 'watching' || g.mode === 'won';
  const cam = film ? cameraFor(g.x) + (WATCH_CAM - cameraFor(g.x)) * smooth(g.watch / 1.2) : cameraFor(g.x);
  const tv = film ? Math.max(0, Math.min(1, (g.watch - TUNING.tvOn) / 0.3)) : 0;
  c.save(); c.translate(-cam, 0);
  for (let x = Math.floor(cam / 480) * 480; x < cam + W; x += 480) c.drawImage(a.ceiling.canvas, x, 0, a.ceiling.w, a.ceiling.h);
  for (let x = Math.floor(cam / 240) * 240; x < cam + W; x += 240) c.drawImage(a.wall.canvas, x, CEIL - 2, a.wall.w, a.wall.h);
  for (let x = Math.floor(cam / 600) * 600; x < cam + W; x += 600) c.drawImage(a.floor.canvas, x, BASE, a.floor.w, a.floor.h);
  for (const end of a.ends) put(c, end, 0, 0);
  // On the walls and the floor: the TV's backlight glows on the wall once it is on.
  put(c, a.hats, 0, 0);
  if (picture) paintHungPicture(c, picture, SOFA_X - 58, 176, 116, -0.03);
  put(c, a.tv, 0, 0); put(c, a.rug, 0, 0); put(c, a.shelf, 0, 0); put(c, a.lamp, 0, 0);
  // The hiding places, each with whatever is hidden there peeking out between its back and its front.
  for (const s of g.spots) {
    const p = P[s.kind];
    if (p.back) put(c, p.back, s.x, p.y);
    if (s.item && !s.opened) {
      const near = g.near === s, wig = near ? Math.sin(t * 18) * 0.16 : Math.sin(t * 1.6 + s.x) * 0.04;
      c.save(); c.translate(s.x + p.tell[0], p.y + p.tell[1]); c.rotate(p.tell[2] + wig); c.scale(1.45, 1.45); paintTell(c, s.item.id, t); c.restore();
    }
    if (p.front) put(c, p.front, s.x, p.y);
    if (s.opened && s.surprise) surprise(c, s.surprise, s.x + p.tell[0] + (s.kind === 'doorway' ? -50 : 0), p.y + p.tell[1] + (s.kind === 'doorway' ? 18 : 0), s.since);
  }
  put(c, a.sofa, SOFA_X, SOFA_Y, SOFA_K);
  sofaThings(c, g.placed, film);
  // Carl-Otto, and the things popping up where he found them, as outlined sprites.
  outlined(c, o => {
    for (const k of g.carrying) {
      if (k.since >= TUNING.popOut) continue;
      const spot = g.spots.find(s => s.item === k.item), p = spot ? P[spot.kind] : null;
      if (!spot || !p) continue;
      const u = k.since / TUNING.popOut, y = p.y + p.tell[1] - 16 - Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * 46;
      put(o, a.items[k.item.id], spot.x + p.tell[0], y, 0.7 + 0.3 * smooth(u * 2));
    }
    if (film) {
      // Up onto the sofa, then sitting with his legs swinging, wrapped in the blanket, watching the TV on the left.
      const climb = smooth(g.watch / 0.7), sx = SOFA_X - 8, sy = SEAT_Y + 40;
      if (climb < 1) kid(o, g.x + (sx - g.x) * climb, GROUND + (sy - GROUND) * climb - Math.sin(climb * Math.PI) * 30, CARL_OTTO_HOME, { kind: 'pop', t: climb * 0.5 }, -1, { mouth: 'grin' });
      else {
        kid(o, sx, sy, CARL_OTTO_HOME, { kind: 'sit', t: t * 0.6 }, -1, { eyes: tv > 0 ? 'wide' : 'open', mouth: tv > 0 ? 'open' : 'grin' });
        const wrap = () => {
          o.beginPath(); o.moveTo(sx + 8, sy - 78); o.quadraticCurveTo(sx - 14, sy - 74, sx - 16, sy - 60);
          o.quadraticCurveTo(sx - 30, sy - 56, sx - 34, sy - 44); o.quadraticCurveTo(sx - 38, sy - 30, sx - 36, sy - 14);
          o.quadraticCurveTo(sx - 10, sy - 6, sx + 16, sy - 22); o.quadraticCurveTo(sx + 24, sy - 52, sx + 8, sy - 78); o.closePath();
        };
        wrap(); o.fillStyle = hgrad(o, sx - 38, sx + 24, [[0, '#8c8e8a'], [1, '#b8bab6']]); o.fill();
        o.save(); wrap(); o.clip();
        for (let k = 0; k < 7; k++) { o.beginPath(); o.moveTo(sx - 36 + k * 9, sy - 80); o.quadraticCurveTo(sx - 40 + k * 9, sy - 40, sx - 36 + k * 8, sy - 8); stroke(o, k % 2 ? 'rgba(255, 255, 255, 0.24)' : 'rgba(60, 62, 58, 0.18)', 1.6); }
        o.restore();
        wrap(); stroke(o, INK, 1.4);
        for (let k = 0; k < 6; k++) line(o, '#9a9c98', 1.3, [[sx - 32 + k * 8, sy - 12 + k * 0.6], [sx - 33 + k * 8, sy - 5 + k * 0.6]]);
      }
    } else {
      const arms = g.arms, pose = arms.length ? { kind: 'carry' as const, phase: g.walking ? t * 11 : 0 } : g.walking ? { kind: 'walk' as const, phase: t * 11 } : { kind: 'stand' as const };
      kid(o, g.x, GROUND, CARL_OTTO_HOME, pose, g.facing, arms.length > 2 ? { mouth: 'grin' } : {}, 1, arms.length ? stack(arms) : undefined);
    }
  });
  for (const k of g.carrying) if (k.since < TUNING.popOut) {
    const spot = g.spots.find(s => s.item === k.item);
    if (spot) sparkles(c, spot.x + P[spot.kind].tell[0], P[spot.kind].y + P[spot.kind].tell[1] - 40, t, 30);
  }
  // A bouncing arrow and sparkles over the next place to look (or the sofa); off screen, an arrow at the edge points the way.
  if (g.hint !== null) {
    const spot = g.spots.find(s => s.x === g.hint), hx = spot ? spot.x + P[spot.kind].tell[0] : g.hint, top = topOf(spot ? spot.kind : 'sofa') + Math.sin(t * 6) * 8;
    if (hx < cam + 20 || hx > cam + W - 20) {
      const s = hx < cam ? -1 : 1, ex = (s < 0 ? cam + 34 : cam + W - 34) + Math.sin(t * 6) * 6 * s, ey = 300;
      path(c, [[ex - 18 * s, ey - 12], [ex, ey - 12], [ex, ey - 24], [ex + 26 * s, ey], [ex, ey + 24], [ex, ey + 12], [ex - 18 * s, ey + 12]], true);
    } else path(c, [[hx - 14, top], [hx + 14, top], [hx + 14, top + 18], [hx + 26, top + 18], [hx, top + 44], [hx - 26, top + 18], [hx - 14, top + 18]], true);
    c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
    if (spot) sparkles(c, hx, P[spot.kind].y + P[spot.kind].tell[1] - 8, t, 22);
  }
  put(c, a.pendant, 0, 0);
  c.restore();
  // The film: the room dims, the floor lamp and the TV light it, and the picture plays.
  const dim = film ? smooth((g.watch - 0.6) / 0.8) : 0;
  if (dim > 0) { c.fillStyle = `rgba(16, 18, 34, ${0.5 * dim})`; c.fillRect(0, 0, W, 540); }
  c.save(); c.translate(-cam, 0);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.globalAlpha = 0.35 + 0.45 * dim; put(c, a.glow, LAMP_X + 2, 228, 1.3);
  if (tv > 0) {
    // The TV's green backlight on the wall around it, and its light out into the room.
    c.globalAlpha = 0.8 * tv; put(c, a.ambi, SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2);
    c.globalAlpha = 0.5 * tv * dim; put(c, a.glow, SCREEN.x + SCREEN.w / 2, SCREEN.y + SCREEN.h / 2 + 30, 2.2);
  }
  c.restore();
  if (tv > 0) {
    cartoon(c, t);
    if (tv < 1) { c.fillStyle = `rgba(255, 255, 255, ${(1 - tv) * 0.9})`; c.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h); }
  }
  c.restore();
  c.drawImage(a.light.canvas, 0, 0, W, 540);
  return cam;
}

/** The chooser's preview: mid-round, popcorn in his arms, the cushion and the teddy already on the sofa. */
export function drawHomePreview(c: C): void {
  const item = (id: ItemId) => ({ id, name: { sv: '', en: '' }, short: { sv: '', en: '' }, found: { sv: '', en: '' }, fits: [] });
  const spot = (kind: PlaceKind, id: ItemId | null, opened = false): Spot => ({ kind, x: PLACES.find(p => p.kind === kind)!.x, item: id ? item(id) : null, surprise: id ? null : 'dustbunny', opened, since: 3 });
  const spots = [spot('console', 'remote'), spot('table', null, true), spot('chair', 'blanket'), spot('books', 'popcorn', true), spot('toybasket', 'teddy', true), spot('baskethouse', null), spot('redbox', null), spot('doorway', 'cushion', true)];
  const popcorn: Carried = { item: spots[3].item!, from: spots[3].x, since: 5 };
  const g: View = {
    x: 940, facing: -1, walking: true, mode: 'gathering', spots, carrying: [popcorn], arms: [popcorn],
    placed: [{ item: spots[7].item!, since: 3 }, { item: spots[4].item!, since: 3 }], watch: 0, hint: null, near: null, tvOn: false,
  };
  drawHome(c, g, 1.3);
}

/** A thing's picture for the top bar: centred in a 64 × 64 box. */
export function paintIcon(c: C, id: ItemId): void {
  c.save(); c.translate(32, id === 'teddy' ? 54 : id === 'remote' ? 40 : 48); c.scale(1.1, 1.1);
  if (id === 'remote') c.rotate(-0.5);
  paintItem(c, id);
  c.restore();
}
