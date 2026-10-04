import { INK, TAU, box, line, lumps, oval, path, rgba, rgrad, seeded, stroke, vgrad, outlined, type C, type Pt } from './art';
import { paintHungPicture } from './craft-art';
import { CARL_OTTO_HOME } from './games/filmkvall';
import { BENCH, BOARD, DOOR, FLOOR, HOOKS, JACKET, PAIRS, SHOE_SCALE, STAND, type ShoeKind, type ThingId } from './games/hemkomst';
import { pairOf, partnerOf, THINGS, type HomecomingRun } from './homecoming-run';
import { kid } from './kids';

// The hall for Hemkomst, after the family's photo, facing the front door: the white panelled door and the tall frosted
// window beside it, the paper globe lamp, the coats on their hooks with a low one for Carl-Otto, the magnet board (with his
// latest picture from the craft corner on it), the shoe bench with its woven seat in front of the window, the white shoe
// cabinet, and the dark floor with its mat, shoes everywhere. Where each thing goes is drawn faintly until it is there.

const W = 960;
const WALL = '#f1efe8', WOOD = '#c9a473';

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}

// ---------------------------------------------------------------- the things

/** A shoe from the side, standing on (x, y), its toe pointing left ('L') or right ('R'). */
export function paintShoe(c: C, kind: ShoeKind, colour: string, size: number, side: 'L' | 'R', x: number, y: number, turn = 0): void {
  c.save(); c.translate(x, y); c.rotate(turn); c.scale(side === 'L' ? -size : size, size);
  const dark = '#3a3230';
  if (kind === 'sneaker') {
    path(c, [[-22, -5], [-21, -20], [-8, -23], [6, -15], [20, -12], [24, -5]], true); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.4);
    slab(c, '#f3f2ec', -23, -6, 48, 6, 3, 1.2);
    for (let i = 0; i < 3; i++) line(c, '#f3f2ec', 1.4, [[-4 + i * 5, -20 + i * 2], [0 + i * 5, -16 + i * 2]]);
    line(c, '#f3f2ec', 2, [[-16, -10], [8, -10]]);
  } else if (kind === 'ankle') {
    path(c, [[-20, -6], [-20, -34], [-6, -34], [-4, -16], [16, -12], [24, -6]], true); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.4);
    slab(c, dark, -21, -6, 46, 6, 2, 1.2); slab(c, dark, -21, -12, 10, 6, 1, 1);
    line(c, 'rgba(255, 255, 255, 0.25)', 1.4, [[-16, -30], [-16, -10]]);
  } else if (kind === 'rainboot') {
    path(c, [[-16, -6], [-16, -44], [-2, -44], [0, -18], [14, -14], [20, -6]], true); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.4);
    slab(c, dark, -17, -6, 38, 6, 2, 1.2);
    box(c, 'rgba(255, 255, 255, 0.3)', -13, -40, 3, 28);
    box(c, '#f3f2ec', -16, -44, 14, 3);
  } else {
    slab(c, '#e8dcc0', -21, -7, 44, 7, 3, 1.2);
    for (const sx of [-10, 6]) { c.beginPath(); c.moveTo(sx - 5, -7); c.quadraticCurveTo(sx, -20, sx + 7, -7); stroke(c, INK, 6); stroke(c, colour, 4); }
    c.beginPath(); c.moveTo(-20, -7); c.quadraticCurveTo(-22, -18, -14, -16); stroke(c, INK, 5); stroke(c, colour, 3);
  }
  c.restore();
}

/** Carl-Otto's yellow raincoat, hanging from its top middle at (x, y); on the floor it lies crumpled. */
export function paintJacket(c: C, x: number, y: number, crumpled: boolean): void {
  c.save(); c.translate(x, y);
  if (crumpled) { c.scale(1, 0.55); c.rotate(-0.3); }
  path(c, [[-14, 6], [14, 6], [26, 70], [-26, 70]], true); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1.6);
  for (const s of [-1, 1]) { path(c, [[s * 14, 8], [s * 30, 40], [s * 24, 46], [s * 12, 22]], true); c.fillStyle = '#e8b420'; c.fill(); stroke(c, INK, 1.4); }
  c.beginPath(); c.arc(0, 6, 14, Math.PI, 0); c.fillStyle = '#e8b420'; c.fill(); stroke(c, INK, 1.4);
  line(c, INK, 1.4, [[0, 8], [0, 68]]); for (let i = 0; i < 4; i++) oval(c, '#3d3a38', 4, 18 + i * 12, 2, 2);
  c.restore();
}

/** His blue bike helmet, its bottom middle at (x, y). */
export function paintHelmet(c: C, x: number, y: number, turn = 0): void {
  c.save(); c.translate(x, y); c.rotate(turn);
  c.beginPath(); c.moveTo(-24, 0); c.bezierCurveTo(-24, -30, 24, -30, 24, 0); c.closePath(); c.fillStyle = rgrad(c, 6, -18, 30, [[0, '#4fb0e6'], [1, '#2d7fb8']]); c.fill(); stroke(c, INK, 1.6);
  for (const vx of [-10, 0, 10]) box(c, '#1f5f8c', vx - 2, -18, 4, 9, 2);
  line(c, '#3a3a3a', 2, [[-18, 0], [-8, 10], [8, 10], [18, 0]]);
  c.restore();
}

// ---------------------------------------------------------------- the hall

function paintRoom(c: C, picture: HTMLImageElement | null): void {
  c.fillStyle = vgrad(c, 0, FLOOR, [[0, '#e8e6de'], [1, WALL]]); c.fillRect(0, 0, W, FLOOR);
  // The doorway on the left into the living room: its pink wall and books, the white door standing open.
  box(c, '#d9b8b0', 0, 96, 92, FLOOR - 96);
  for (let i = 0; i < 6; i++) slab(c, ['#a33a2f', '#2e4f7a', '#d9a441', '#5c8a5a', '#6b4a6e', '#c98078'][i], 10 + i * 12, 150, 9, 40, 1, 1);
  slab(c, '#b8bab6', 6, 360, 80, 50, 8);
  slab(c, '#fbfaf6', 86, 90, 18, FLOOR - 90, 1); oval(c, '#b8bab6', 98, 300, 3, 3);
  // The shelf, the coat hooks, and the coats already hanging (Mamma's and Pappa's); a low hook with a fox for Carl-Otto.
  slab(c, '#fbfaf6', HOOKS.x, 140, HOOKS.w, 6, 1, 1.2);
  line(c, INK, 4, [[HOOKS.x, HOOKS.y], [HOOKS.x + HOOKS.w, HOOKS.y]]); line(c, '#e2e0d8', 2, [[HOOKS.x, HOOKS.y], [HOOKS.x + HOOKS.w, HOOKS.y]]);
  for (const [hx, col, len] of [[140, '#2e3a56', 150], [176, '#4d6a5a', 128], [262, '#5b4a6e', 140]] as const) {
    path(c, [[hx - 12, HOOKS.y + 4], [hx + 12, HOOKS.y + 4], [hx + 22, HOOKS.y + len], [hx - 22, HOOKS.y + len]], true); c.fillStyle = col; c.fill(); stroke(c, INK, 1.4);
    line(c, 'rgba(0, 0, 0, 0.25)', 1.4, [[hx, HOOKS.y + 8], [hx, HOOKS.y + len - 4]]);
  }
  line(c, INK, 3, [[JACKET.home[0], JACKET.home[1] - 8], [JACKET.home[0], JACKET.home[1] + 2]]);
  c.save(); c.translate(JACKET.home[0], JACKET.home[1] - 22); c.scale(0.4, 0.4);
  path(c, [[-26, -10], [-14, -32], [-2, -12], [14, -32], [26, -10], [0, 24]], true); c.fillStyle = '#d9733a'; c.fill(); stroke(c, INK, 3); c.restore();
  // The magnet board with the family's photos, and Carl-Otto's latest picture in the middle.
  slab(c, '#fbfaf6', BOARD.x, BOARD.y, BOARD.w, BOARD.h, 3);
  for (const [px, py, col] of [[BOARD.x + 8, BOARD.y + 8, '#c9a07a'], [BOARD.x + 56, BOARD.y + 14, '#9ab0c4'], [BOARD.x + 14, BOARD.y + 82, '#a8b89a']] as const) { slab(c, col, px, py, 30, 24, 0, 1); oval(c, '#e2432f', px + 15, py, 3, 3); }
  if (picture) paintHungPicture(c, picture, BOARD.x + 22, BOARD.y + 40, 54, 0.05);
  // The paper globe lamp.
  line(c, '#3a3a3a', 1.6, [[312, 0], [312, 76]]);
  oval(c, INK, 312, 104, 31.6, 31.6); oval(c, rgrad(c, 304, 96, 36, [[0, '#ffffff'], [1, '#e8e4da']]), 312, 104, 30, 30);
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.ellipse(312, 104, Math.abs(i) / 2 * 30, 30, 0, -Math.PI / 2, Math.PI / 2); stroke(c, 'rgba(160, 150, 130, 0.35)', 1); }
}

function paintDoor(c: C): void {
  const { x, y, w, h } = DOOR;
  slab(c, '#f7f6f1', x - 10, y - 10, w + 20, h + 10, 2);
  box(c, '#fbfaf6', x, y, w, h);
  for (let gx = x + 12; gx < x + w - 6; gx += 12) line(c, 'rgba(150, 145, 130, 0.35)', 1.6, [[gx, y + 30], [gx, y + h - 30]]);
  slab(c, '#3a3a3a', x + w - 22, y + 196, 14, 5, 2, 1); oval(c, '#3a3a3a', x + w - 16, y + 160, 3.5, 3.5); oval(c, '#3a3a3a', x + w - 16, y + 176, 3.5, 3.5);
  // The tall frosted window beside the door.
  const fx = x + w + 14, fw = 112;
  slab(c, '#f7f6f1', fx - 6, y + 4, fw + 12, h - 14, 1);
  c.fillStyle = vgrad(c, y + 10, y + h - 20, [[0, '#dbe7ec'], [1, '#c4d6de']]); c.fillRect(fx, y + 10, fw, h - 26);
  for (let vx = fx + 14; vx < fx + fw; vx += 18) box(c, 'rgba(255, 255, 255, 0.45)', vx, y + 10, 5, h - 26);
}

function paintCabinet(c: C): void {
  // The white shoe cabinet with its three flaps, and the shelf over it with a dried bunch and a frame.
  slab(c, '#fbfaf6', 864, 214, 92, FLOOR - 214, 2);
  for (const fy of [218, 302, 386]) { slab(c, '#f1f0ea', 868, fy, 84, 76, 2, 1); line(c, '#cfcdc4', 3, [[886, fy + 8], [934, fy + 8]]); }
  slab(c, '#fbfaf6', 858, 196, 102, 6, 1, 1.2);
  slab(c, '#e2d6bc', 912, 150, 40, 46, 1, 1.2); box(c, '#f3f2ec', 917, 155, 30, 36);
  for (let i = 0; i < 5; i++) line(c, '#b4975c', 1.4, [[880, 196], [870 + i * 6, 160 - i * 3]]);
  slab(c, '#e8e4da', 874, 184, 14, 12, 2, 1);
}

function paintBench(c: C): void {
  const { x, w, seat, shelf } = BENCH;
  for (const lx of [x + 4, x + w - 12]) slab(c, WOOD, lx, seat, 8, FLOOR - seat, 1, 1.2);
  slab(c, WOOD, x, seat, w, 10, 2);
  for (let k = x + 4; k < x + w - 4; k += 8) line(c, 'rgba(255, 255, 255, 0.5)', 2, [[k, seat + 1], [k + 4, seat + 9]]);
  box(c, '#e8dcc0', x + 2, seat + 2, w - 4, 4);
  slab(c, WOOD, x + 4, shelf, w - 8, 6, 1, 1.2);
}

function paintFloor(c: C): void {
  c.fillStyle = vgrad(c, FLOOR, 540, [[0, '#2f2b28'], [1, '#45403b']]); c.fillRect(0, FLOOR, W, 540 - FLOOR);
  for (let y = FLOOR + 14; y < 540; y += 16) line(c, 'rgba(0, 0, 0, 0.35)', 1, [[0, y], [W, y]]);
  slab(c, '#3d3835', 40, 484, 560, 56, 3, 1.2);
  for (let gx = 52; gx < 600; gx += 110) line(c, 'rgba(0, 0, 0, 0.4)', 2, [[gx, 486], [gx, 538]]);
}

// ---------------------------------------------------------------- a frame

function paintThing(c: C, id: ThingId, at: Pt, placed: boolean, wiggle = 0, k = 1): void {
  if (id === 'jacket') { paintJacket(c, at[0], at[1] - (placed ? 0 : 10), !placed); return; }
  if (id === 'helmet') { paintHelmet(c, at[0], at[1], placed ? 0 : 0.25 + wiggle); return; }
  const pair = PAIRS.find(p => p.id === pairOf(id))!, side = id.endsWith('L') ? 'L' : 'R';
  // On the floor the shoes lie every which way; in their place they stand straight.
  const i = THINGS.findIndex(t => t.id === id), turn = placed ? 0 : [0.2, -0.35, 0.1, 0.45, -0.2, 0.3, -0.4, 0.15][i % 8];
  paintShoe(c, pair.kind, pair.colour, pair.size * SHOE_SCALE * k, side, at[0], at[1], turn + wiggle);
}

function sparkles(c: C, x: number, y: number, t: number, r = 26): void {
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + i * TAU / 4, k = Math.abs(Math.sin(t * 5 + i)) * 5 + 2, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * 0.7;
    line(c, '#fff3b0', 2, [[sx - k, sy], [sx + k, sy]]); line(c, '#fff3b0', 2, [[sx, sy - k], [sx, sy + k]]);
  }
}

/** One frame of the hall, in world units. `picture` is Carl-Otto's latest picture for the magnet board. */
export function drawHall(c: C, run: HomecomingRun, t: number, cheerUntil: number, picture: HTMLImageElement | null): void {
  paintRoom(c, picture); paintDoor(c); paintCabinet(c); paintBench(c); paintFloor(c);
  // Where each thing goes, faintly, until it is there; the place of the one in hand (or let go wrongly) glows.
  const glowing = run.held ?? run.glow?.id ?? null;
  for (const th of run.things) {
    if (th.placed) continue;
    const home = THINGS.find(x => x.id === th.id)!.home;
    c.save(); c.globalAlpha = 0.22; paintThing(c, th.id, home, true); c.restore();
    if (th.id === glowing) { oval(c, `rgba(242, 194, 48, ${0.35 + 0.2 * Math.sin(t * 8)})`, home[0], home[1] - 16, 40, 28); sparkles(c, home[0], home[1] - 16, t, 34); }
  }
  // The things: those in place first, then the rest, the one in hand on top. A held shoe's partner wiggles.
  const partner = run.held ? partnerOf(run.held) : null;
  const order = [...run.things].sort((a, b) => Number(!a.placed) - Number(!b.placed) || Number(a.id === run.held) - Number(b.id === run.held));
  for (const th of order) {
    const wig = th.id === partner && !th.placed ? Math.sin(t * 18) * 0.25 : 0;
    if (th.id === run.held) oval(c, 'rgba(10, 10, 10, 0.25)', th.at[0], th.at[1] + 10, 24, 6);
    paintThing(c, th.id, th.at, th.placed, wig, th.id === run.held ? 1.15 : 1);
    if (th.id === partner && !th.placed) sparkles(c, th.at[0], th.at[1] - 16, t, 26);
  }
  // Carl-Otto, just in, in his socks.
  const cheer = t < cheerUntil || run.home >= 0;
  outlined(c, o => kid(o, STAND[0], STAND[1], { ...CARL_OTTO_HOME, barefoot: false, shoes: '#e8e6de' }, cheer ? { kind: 'cheer', t } : run.held ? { kind: 'point', t } : { kind: 'stand' }, -1, { mouth: cheer ? 'grin' : 'smile' }, 1.2));
  // The hint: a bouncing arrow over the next thing to put away.
  if (run.hint) {
    const th = run.things.find(x => x.id === run.hint)!, hx = th.at[0], top = th.at[1] - 110 + Math.sin(t * 6) * 8;
    path(c, [[hx - 14, top], [hx + 14, top], [hx + 14, top + 18], [hx + 26, top + 18], [hx, top + 44], [hx - 26, top + 18], [hx - 14, top + 18]], true);
    c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 2.4);
  }
  // Welcome home: the lamp glows warm.
  if (run.home >= 0) { c.fillStyle = rgrad(c, 312, 104, 220, [[0, rgba('#ffe9b0', 0.3)], [1, 'rgba(255, 233, 176, 0)']]); c.fillRect(90, 0, 450, 330); }
}


