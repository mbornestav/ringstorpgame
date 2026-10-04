import { INK, TAU, bake, box, line, lumps, oval, path, put, rgba, seeded, stroke, outlined, type C, type Pt, type Sprite } from './art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { BIG_SOFA, DOORS, FRONT_DOOR, MAP, ROOMS, roomOf, type Floor, type Rect, type RoomId } from './games/hemma';
import { paintHead } from './kids';

// The map of the house for Hemma, after the robot vacuum's map: a storybook floor plan seen from above on the lawn, the
// rooms with a few things in them from the family's photos (the kitchen's black worktop and plants on the sill, the grey
// sofa, Carl-Otto's bed with rails and his black rug, the big bed's floral duvet, the craft table in the hall), and the
// garden with the pergola, the tree and the yellow bike. The plan is baked once; the chosen room's outline, the stickers and
// Carl-Otto's head are drawn live. Furniture is drawn in map units; the head and the stickers in world units.

const W = 960;
/** Map units to world pixels, and where the map's corner lands. */
export const K = 0.64;
const LEFT = 28, TOP = 100;
export const toWorld = ([x, y]: Pt): Pt => [LEFT + (x - MAP.x0) * K, TOP + (y - MAP.y0) * K];
/** The room's first floor rectangle (where a tap selects it), in world pixels. */
export function roomBox(id: RoomId): { x: number; y: number; w: number; h: number } {
  const [x, y, w, h] = roomOf(id).floor[0], [wx, wy] = toWorld([x, y]);
  return { x: wx, y: wy, w: w * K, h: h * K };
}

const WALL = '#e7e5dd', LAWN = '#93c25c', PAVING = '#d9d7cf', WHITE = '#fbfaf6', DARK_WOOD = '#5c544c';
const FLOOR: Record<Floor, [string, string]> = { dark: [DARK_WOOD, '#45403b'], oak: ['#d9be86', '#b4975c'], tiles: [PAVING, '#b8bab6'], grass: [LAWN, LAWN] };

const rect = (c: C, fill: string, [x, y, w, h]: Rect, grow = 0, r = 0) => box(c, fill, x - grow, y - grow, w + grow * 2, h + grow * 2, r);
function slab(c: C, fill: string, x: number, y: number, w: number, h: number, r = 2, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
function disc(c: C, fill: string, x: number, y: number, r: number, ink = 1.6): void { oval(c, INK, x, y, r + ink, r + ink); oval(c, fill, x, y, r, r); }

// ---------------------------------------------------------------- the plan

function paintLawn(c: C): void {
  c.fillStyle = LAWN; c.fillRect(0, 0, W, 540);
  const rand = seeded(12);
  for (let i = 0; i < 900; i++) {
    const x = rand() * W, y = rand() * 540;
    line(c, rand() < 0.5 ? 'rgba(76, 122, 46, 0.35)' : 'rgba(200, 230, 140, 0.35)', 1, [[x, y], [x + rand() * 2 - 1, y - 3]]);
  }
}

function paintFloor(c: C, kind: Floor, [x, y, w, h]: Rect): void {
  const [fill, seam] = FLOOR[kind];
  box(c, fill, x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  if (kind === 'tiles') {
    for (let gx = x; gx < x + w; gx += 12) line(c, seam, 0.8, [[gx, y], [gx, y + h]]);
    for (let gy = y; gy < y + h; gy += 12) line(c, seam, 0.8, [[x, gy], [x + w, gy]]);
  } else if (kind !== 'grass') {
    const rand = seeded(Math.round(x * 7 + y));
    for (let gy = y; gy < y + h; gy += 9) {
      line(c, seam, 1, [[x, gy], [x + w, gy]]);
      for (let gx = x + rand() * 60; gx < x + w; gx += 50 + rand() * 40) line(c, seam, 1, [[gx, gy], [gx, gy + 9]]);
    }
  }
  c.restore();
}

/** The hall is one room in two parts: its outline goes round both. */
const HALL_OUTLINE: Pt[] = [[50, 455], [265, 455], [265, 335], [318, 335], [318, 620], [50, 620]];

function paintHouse(c: C): void {
  const house = ROOMS.filter(r => r.kind !== 'grass').flatMap(r => r.floor);
  // The outer walls: everything a little larger, in ink and then in plaster, so the gaps between rooms read as walls.
  for (const r of house) rect(c, INK, r, 9);
  for (const r of house) rect(c, WALL, r, 7);
  for (const room of ROOMS) if (room.kind !== 'grass') for (const r of room.floor) paintFloor(c, room.kind, r);
  // The inner walls.
  for (const room of ROOMS) if (room.kind !== 'grass' && room.id !== 'hall') { const [x, y, w, h] = room.floor[0]; c.beginPath(); c.rect(x, y, w, h); stroke(c, INK, 2.6); }
  path(c, HALL_OUTLINE, true); stroke(c, INK, 2.6);
  // Doorways: gaps in the walls.
  for (const d of DOORS) rect(c, '#cbc7bc', d);
  rect(c, '#cbc7bc', FRONT_DOOR);
  // Windows: pale glass set into the outer walls.
  for (const [x, y, w, h] of [[180, 223, 100, 5], [600, 256, 70, 5], [23, 650, 5, 50], [36, 800, 5, 50], [205, 888, 50, 5]] as Rect[]) box(c, '#cdeefb', x, y, w, h);
}

// ---------------------------------------------------------------- the rooms' things

function paintKitchen(c: C): void {
  // The L-shaped counter: black worktop on white cabinets, a sink, the hob, and the plants on the sill by the window.
  slab(c, '#2c3236', 92, 236, 210, 18, 1); slab(c, '#2c3236', 92, 236, 18, 92, 1);
  box(c, WHITE, 92, 252, 210, 2.5); box(c, WHITE, 108, 252, 2.5, 76);
  slab(c, '#b8bab6', 138, 239, 24, 12, 3); oval(c, '#8c8e8a', 150, 245, 8, 4);
  for (const [x, y] of [[96, 268], [104, 268], [96, 280], [104, 280]] as Pt[]) disc(c, '#4d5257', x, y, 3, 0.8);
  const rand = seeded(5);
  for (let i = 0; i < 6; i++) { const x = 190 + i * 15; disc(c, '#b07a4a', x, 244, 4, 1); c.save(); lumps(c, x, 242, 7, 6, 7, rand); c.fillStyle = i % 2 ? '#62b046' : '#4c7a2e'; c.fill(); stroke(c, INK, 1); c.restore(); }
  // The round white table and its black chairs.
  for (const a of [0.4, 2.2, 3.9]) slab(c, '#1c1e21', 268 + Math.cos(a) * 24 - 6, 298 + Math.sin(a) * 24 - 6, 12, 12, 3);
  disc(c, WHITE, 268, 298, 18);
  disc(c, '#f2c230', 262, 294, 3, 0.8);
}

function paintLiving(c: C): void {
  // The TV on its low bench against the top wall, the cream rug and the round table, and the big grey corner sofa facing
  // them (the robot cannot get under it: it is the blank in the middle of its map), with a cushion and a throw.
  slab(c, '#4d5257', 360, 229, 104, 8, 1); box(c, '#1c1e21', 376, 228, 72, 3);
  box(c, '#e2d4ad', 352, 246, 128, 50, 4);
  disc(c, WHITE, 416, 270, 12); disc(c, '#d9d7cf', 416, 270, 6, 0.8);
  const [sx, sy, sw, sh] = BIG_SOFA;
  slab(c, '#8c8e8a', sx, sy, sw, sh, 8, 2);
  // The back runs along the left and the bottom; the seat opens towards the TV.
  slab(c, '#b8bab6', sx + 22, sy + 4, sw - 26, sh - 26, 6, 1.2);
  for (let i = 0; i < 3; i++) slab(c, '#c9ced0', sx + 26 + i * ((sw - 34) / 3), sy + 8, (sw - 34) / 3 - 4, 38, 5, 1);
  for (let i = 0; i < 2; i++) slab(c, '#c9ced0', sx + 26, sy + 52 + i * 26, 46, 22, 5, 1);
  box(c, 'rgba(255, 255, 255, 0.3)', sx + 30, sy + 12, sw - 44, 6, 3);
  slab(c, '#8c8e8a', sx + sw - 14, sy + 4, 10, 52, 4, 1);
  slab(c, '#e6b8b0', sx + 30, sy + 92, 18, 14, 4, 1);
  slab(c, '#6b7076', sx + 80, sy + 50, 50, 30, 6, 1); line(c, '#4d5257', 1, [[sx + 86, sy + 56], [sx + 124, sy + 74]]);
  // The black leather chair with its grey throw, the pleated floor lamp, the white bookshelf and the striped basket.
  slab(c, '#26262a', 512, 312, 26, 24, 5); box(c, '#b8bab6', 516, 316, 14, 16, 3);
  disc(c, '#ecd9a6', 544, 304, 7);
  slab(c, WHITE, 546, 344, 8, 78, 1);
  ['#a33a2f', '#2e4f7a', '#d9a441', '#2f5a45', '#6b4a6e', '#d6372c'].forEach((col, i) => box(c, col, 547, 347 + i * 12, 6, 9));
  disc(c, '#e2d4ad', 524, 430, 8); for (let k = -6; k <= 6; k += 4) line(c, '#2e4f7a', 1.2, [[524 + k, 424], [524 + k, 436]]);
}

function paintDining(c: C): void {
  // A long wooden table with chairs down both sides, and a white sideboard.
  slab(c, WHITE, 580, 270, 80, 10, 1);
  for (let i = 0; i < 3; i++) for (const x of [606, 676]) slab(c, '#3f3a36', x - 6, 330 + i * 32, 12, 12, 3);
  slab(c, '#b07a4a', 614, 318, 56, 100, 4);
  line(c, 'rgba(255, 230, 190, 0.35)', 1.2, [[620, 324], [620, 412]]);
  disc(c, WHITE, 642, 352, 6, 1); disc(c, WHITE, 642, 386, 6, 1);
}

/** The little toilet beside the bedrooms: a toilet and a small basin. */
function paintToilet(c: C): void {
  slab(c, WHITE, 296, 632, 16, 22, 3); oval(c, '#b8bab6', 304, 643, 5, 7);
  slab(c, WHITE, 300, 712, 12, 24, 2); oval(c, INK, 288, 724, 12.5, 10.5); oval(c, WHITE, 288, 724, 11, 9); oval(c, '#cdeefb', 287, 724, 5.5, 4.5);
}

function paintWc(c: C): void {
  slab(c, WHITE, 60, 380, 9, 24, 2); oval(c, INK, 80, 392, 13.5, 10.5); oval(c, WHITE, 80, 392, 12, 9); oval(c, '#cdeefb', 81, 392, 6, 4.5);
  slab(c, WHITE, 140, 373, 28, 14, 3); oval(c, '#b8bab6', 154, 380, 9, 4.5);
  box(c, '#cdeefb', 142, 371, 24, 2);
}

function paintHall(c: C): void {
  // By the front door: the mat, the shoe bench with shoes under it, and the coats on their hooks.
  box(c, '#4d5257', 56, 478, 22, 46, 2);
  slab(c, '#d3b97f', 56, 530, 12, 40, 1);
  ['#d6372c', '#2e4f7a', '#62b046', '#e6b8b0', '#3f3a36'].forEach((col, i) => { oval(c, col, 74, 534 + i * 8, 4, 2.5); });
  ['#2c3236', '#2e4f7a', '#5c8a5a'].forEach((col, i) => { slab(c, col, 92 + i * 14, 459, 10, 7, 3, 1); });
  disc(c, WHITE, 150, 508, 9);
  // The sofa corner: the seagrass rug, the floral sofa with its red cushion, the old wooden cabinet, and the craft table
  // covered in drawings and star stickers.
  box(c, '#d3b97f', 140, 556, 116, 44, 3);
  slab(c, '#e2d4ad', 146, 596, 96, 18, 4); slab(c, '#cbbfa6', 146, 606, 96, 8, 3); disc(c, '#a33a2f', 162, 598, 5, 1);
  slab(c, '#b07a4a', 112, 588, 24, 26, 2); line(c, '#8f6a3a', 1, [[124, 590], [124, 612]]);
  oval(c, INK, 196, 574, 29, 13); oval(c, '#8f6a3a', 196, 574, 27, 11);
  c.save(); c.translate(186, 571); c.rotate(-0.2); box(c, WHITE, -9, -6, 18, 12); line(c, '#d6372c', 1.2, [[-6, 2], [-2, -3], [3, 2]]); c.restore();
  c.save(); c.translate(207, 576); c.rotate(0.3); box(c, WHITE, -7, -5, 14, 10); c.restore();
  for (const [x, y, col] of [[204, 572, '#f2c230'], [209, 578, '#e6b8b0'], [211, 573, '#6fbde8']] as const) disc(c, col, x, y, 1.6, 0.5);
}

function paintBedroom(c: C): void {
  // The grey-green bed with rails, the pink duvet; the black rug; the desk with its green Lego plate and the shelf of games;
  // the pink dollhouse, the red fire station and the little piano.
  slab(c, '#7f9a84', 38, 628, 56, 96, 2);
  box(c, WHITE, 42, 632, 48, 88, 2); slab(c, WHITE, 46, 634, 40, 14, 4, 1);
  slab(c, '#e6b8b0', 42, 662, 48, 56, 3, 1); line(c, '#c98f6a', 1, [[46, 676], [86, 690]]);
  for (let y = 636; y < 720; y += 8) line(c, '#5c6e60', 1, [[92, y], [92, y + 4]]);
  box(c, '#2c3236', 118, 648, 34, 76, 2);
  for (let y = 652; y < 720; y += 6) for (let x = 121; x < 150; x += 6) box(c, 'rgba(255, 255, 255, 0.12)', x, y, 2, 2);
  slab(c, WHITE, 196, 626, 38, 18, 1); box(c, '#62b046', 202, 629, 14, 11);
  slab(c, WHITE, 238, 626, 24, 50, 1);
  ['#d9a441', '#2e4f7a', '#d6372c', '#5c8a5a', '#e6b8b0'].forEach((col, i) => box(c, col, 241, 629 + i * 9, 18, 6));
  slab(c, '#e6b8b0', 162, 700, 34, 22, 1); path(c, [[160, 700], [179, 688], [198, 700]], true); c.fillStyle = '#b8bab6'; c.fill(); stroke(c, INK, 1.4);
  slab(c, '#d6372c', 206, 704, 26, 20, 1); box(c, WHITE, 212, 710, 6, 8);
  slab(c, '#1c1e21', 160, 664, 24, 9, 1); for (let x = 162; x < 183; x += 3) box(c, WHITE, x, 666, 2, 5);
}

function paintBig(c: C): void {
  // The double bed under its floral duvet, the bedside tables, the grey runner, the armchair by the window and the brass
  // star lamp over the bed.
  slab(c, '#3f3a36', 54, 758, 112, 112, 2);
  slab(c, WHITE, 60, 766, 22, 44, 4, 1); slab(c, WHITE, 60, 814, 22, 44, 4, 1);
  slab(c, '#efe2c4', 84, 762, 80, 104, 6, 1);
  const rand = seeded(9);
  for (let i = 0; i < 40; i++) { const x = 90 + rand() * 70, y = 768 + rand() * 92; disc(c, rand() < 0.6 ? '#d6372c' : '#e6b8b0', x, y, 2.2 + rand() * 1.5, 0); oval(c, '#5c8a5a', x + 3, y + 2, 2, 1.2); }
  slab(c, '#8f6a3a', 50, 742, 14, 12, 1); slab(c, '#8f6a3a', 50, 872, 14, 10, 1);
  box(c, '#8c8e8a', 180, 770, 30, 92, 2);
  slab(c, '#e2d4ad', 226, 744, 32, 28, 6);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(c, '#b4975c', 1.2, [[124, 814], [124 + Math.cos(a) * 12, 814 + Math.sin(a) * 12]]); disc(c, '#ffe9b0', 124 + Math.cos(a) * 12, 814 + Math.sin(a) * 12, 2.6, 0.8); }
}

function paintGarden(c: C): void {
  // The paved path along the house, the gravel edge, the pergola with its vine, the big bushy tree, the tall grass, the
  // yellow bike and a table of potted heather.
  box(c, '#e7e5dd', 333, 480, 8, 400); box(c, PAVING, 341, 480, 30, 400);
  for (let y = 490; y < 880; y += 22) line(c, '#b8bab6', 1, [[341, y], [371, y]]);
  line(c, '#b8bab6', 1, [[356, 480], [356, 880]]);
  // A path from the street to the front door.
  box(c, PAVING, -40, 486, 80, 28); for (let x = -30; x < 40; x += 18) line(c, '#b8bab6', 1, [[x, 486], [x, 514]]);
  const rand = seeded(23);
  // The tree.
  oval(c, 'rgba(30, 50, 20, 0.3)', 486, 712, 52, 44);
  lumps(c, 480, 700, 50, 44, 11, rand); c.fillStyle = '#4c7a2e'; c.fill(); stroke(c, INK, 1.6);
  lumps(c, 490, 690, 30, 26, 9, rand); c.fillStyle = '#62b046'; c.fill();
  // The ornamental grass.
  for (let i = 0; i < 26; i++) { const a = -Math.PI + i / 25 * Math.PI; line(c, i % 2 ? '#a9d36a' : '#62b046', 2, [[420, 780], [420 + Math.cos(a) * 26, 780 + Math.sin(a) * 18]]); }
  // The pergola: white posts and beams, the vine along them.
  for (const [x, y] of [[392, 548], [480, 548], [392, 640], [480, 640]] as Pt[]) slab(c, WHITE, x - 4, y - 4, 8, 8, 1, 1.2);
  for (const y of [548, 640]) { slab(c, WHITE, 386, y - 2, 102, 4, 1, 1); }
  for (let x = 400; x < 480; x += 16) line(c, WHITE, 2.5, [[x, 548], [x, 640]]);
  for (let i = 0; i < 9; i++) { lumps(c, 392 + i * 11, 548 + Math.sin(i) * 3, 8, 6, 6, rand); c.fillStyle = i % 2 ? '#4c7a2e' : '#62b046'; c.fill(); }
  // The yellow bike.
  for (const x of [522, 552]) { c.beginPath(); c.arc(x, 600, 9, 0, TAU); stroke(c, INK, 2.4); }
  line(c, '#d9a441', 3, [[522, 600], [536, 588], [552, 600], [540, 600], [536, 588]]);
  line(c, INK, 2, [[550, 584], [556, 584]]);
  // Potted heather on a little table.
  slab(c, WHITE, 520, 500, 40, 22, 1);
  for (const [x, col] of [[530, '#a33a2f'], [550, '#e6b8b0']] as const) { disc(c, '#b07a4a', x, 511, 5, 1); disc(c, col, x, 509, 3.5, 0); }
}

function paintPlan(c: C): void {
  paintLawn(c);
  c.save(); c.translate(LEFT - MAP.x0 * K, TOP - MAP.y0 * K); c.scale(K, K);
  paintGarden(c);
  paintHouse(c);
  paintKitchen(c); paintLiving(c); paintDining(c); paintWc(c); paintToilet(c); paintHall(c); paintBedroom(c); paintBig(c);
  c.restore();
}

let plan: Sprite | null = null;
const getPlan = () => plan ??= bake(W, 540, 0, 0, paintPlan);

// ---------------------------------------------------------------- live

export interface HouseView {
  selected: RoomId;
  /** Carl-Otto's head, in world pixels: it walks to the chosen room. */
  head: Pt;
  /** Rooms with something finished in them: a gold star sticker each. */
  stickers: RoomId[];
  /** The room the evening suggests next: it sparkles. */
  suggest: RoomId | null;
}

function star(c: C, x: number, y: number, r: number, fill: string, spin = 0): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + spin + i * Math.PI / 5, k = i % 2 ? r * 0.48 : r; pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]); }
  path(c, pts, true); c.fillStyle = fill; c.fill(); stroke(c, INK, 1.6);
}

function sparkles(c: C, x: number, y: number, t: number, r = 22): void {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 4 + 2, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.7;
    line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]);
  }
}

/** One frame of the map, on a context scaled to the 960 × 540 world. */
export function drawHouse(c: C, v: HouseView, t: number): void {
  put(c, getPlan(), 0, 0);
  // The chosen room, outlined in gold.
  c.save(); c.translate(LEFT - MAP.x0 * K, TOP - MAP.y0 * K); c.scale(K, K);
  const room = roomOf(v.selected), pulse = 0.65 + Math.sin(t * 4) * 0.25;
  for (const [x, y, w, h] of room.id === 'hall' ? [] : room.floor) { c.beginPath(); c.roundRect(x - 2, y - 2, w + 4, h + 4, 4); stroke(c, rgba('#f2c230', pulse), 6); }
  if (room.id === 'hall') { path(c, HALL_OUTLINE, true); stroke(c, rgba('#f2c230', pulse), 6); }
  c.restore();
  for (const id of v.stickers) {
    const b = roomBox(id);
    oval(c, 'rgba(20, 30, 20, 0.3)', b.x + b.w - 12, b.y + 16, 11, 10);
    star(c, b.x + b.w - 14, b.y + 13, 11, '#f2c230', Math.sin(t * 1.5 + b.x) * 0.08);
  }
  if (v.suggest && v.suggest !== v.selected) { const [x, y] = toWorld(roomOf(v.suggest).at); sparkles(c, x, y, t); }
  // Carl-Otto's head, bobbing a little, where he is in the house.
  const [hx, hy] = v.head, bob = Math.sin(t * 3) * 1.5;
  oval(c, 'rgba(20, 30, 20, 0.3)', hx, hy + 18, 14, 4);
  outlined(c, o => { o.save(); o.translate(hx, hy - 4 + bob); o.scale(0.85, 0.85); paintHead(o, 0, 0, CARL_OTTO_HOME, { mouth: 'grin' }); o.restore(); });
}

/** Where Carl-Otto's head stands in a room, in world pixels. */
export const headAt = (id: RoomId): Pt => toWorld(roomOf(id).at);
