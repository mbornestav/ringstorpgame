import { INK, TAU, box, line, mix, oval, path, seeded, stroke, vgrad, type C, type Pt } from './art';
import { BIN, Picture, type CraftRun, type Sheet } from './craft-run';
import { heartPath, paintStamp, paintSticker, paintStuck, pictureCanvas, renderPicture, starPath } from './craft-paint';
import {
  BRUSHES, CRAYONS, PAGES, PAPER, PAPERS, PATTERNS, SIZES, STICKERS, STICKER_PAGES, STICKER_SIZES, TRACES,
  type Brush, type Pattern, type StickerId, type StickerPage,
} from './games/pyssel';
import { paintHungPicture } from './wall-picture';
import { WALL_ROOMS, type WallRoom } from './house';

// Pysselhörnan's table, seen from above, after the family's photo of the craft corner: the teak coffee table and the
// sheet of paper, and to its right everything to draw with, all as pictures (Carl-Otto does not read yet): a row of
// brushes, the sizes (or the bucket's patterns) and the mirror butterfly, ten crayons, a sheet of stickers with three
// pages, and a row of things to do (the sponge, undo, a new sheet, the gallery, "Spela", and the pin that puts the
// picture up). Choosing a new sheet and the gallery use the paper's place for their grids.

const W = 960;

// ---------------------------------------------------------------- where things are (world pixels)

export interface Box { x: number; y: number; w: number; h: number }
export const brushBox = (i: number): Box => ({ x: 638 + i * 45, y: 88, w: 43, h: 46 });
export const sizeBox = (i: number): Box => ({ x: 638 + i * 48, y: 140, w: 44, h: 38 });
export const patternBox = (i: number): Box => ({ x: 638 + i * 50, y: 140, w: 46, h: 38 });
export const SYM_BOX: Box = { x: 896, y: 140, w: 56, h: 38 };
export const colourBox = (i: number): Box => ({ x: 638 + (i % 5) * 63, y: 184 + Math.floor(i / 5) * 38, w: 60, h: 34 });
export const tabBox = (i: number): Box => ({ x: 638 + i * 106, y: 264, w: 102, h: 34 });
export const cellBox = (i: number): Box => ({ x: 638 + (i % 4) * 79, y: 302 + Math.floor(i / 4) * 60, w: 76, h: 58 });
export const ACTIONS = ['sponge', 'undo', 'new', 'gallery', 'play', 'hang'] as const;
export type Action = typeof ACTIONS[number];
export const actionBox = (i: number): Box => ({ x: 638 + i * 53, y: 486, w: 50, h: 48 });
/** The grid of sheets (or of pictures, in the gallery): 4 × 3 over the paper's place. */
export const thumbBox = (i: number): Box => ({ x: PAPER.x + 10 + (i % 4) * 143, y: PAPER.y + 8 + Math.floor(i / 4) * 124, w: 130, h: 94 });
export const NEXT_BOX: Box = { x: PAPER.x + PAPER.w - 128, y: PAPER.y + 380, w: 118, h: 36 };
/** In the gallery: the three rooms a picture can hang in, the bin and the way back. */
export const ROOMS = WALL_ROOMS;
export type { WallRoom };
export const roomBox = (i: number): Box => ({ x: 642, y: 96 + i * 108, w: 306, h: 98 });
export const BIN_BOX: Box = { x: 642, y: 428, w: 146, h: 64 };
export const BACK_BOX: Box = { x: 802, y: 428, w: 146, h: 64 };
/** The + and − handles beside the chosen sticker (paper units). */
export function handles(run: Pick<CraftRun, 'selected' | 'picture'>): { plus: Pt; minus: Pt; r: number } | null {
  const s = run.selected !== null ? run.picture.stuck(run.selected) : undefined;
  if (!s) return null;
  const r = STICKER_SIZES[s.size], x = Math.min(PAPER.w - 18, s.x + r + 22);
  return { plus: [x, Math.max(18, s.y - r * 0.55)], minus: [x, Math.min(PAPER.h - 18, s.y + r * 0.55)], r: 17 };
}

/** The sheets to choose from, in order: the papers, the colouring pages, the tracing pages. */
export const SHEETS: Sheet[] = [...PAPERS.map(p => ({ paper: p.id })), ...PAGES.map(p => ({ page: p.id })), ...TRACES.map(t => ({ trace: t.id }))];
export const SHEETS_PER_PAGE = 12;
export const sheetPages = (withKeep: boolean) => Math.ceil((SHEETS.length + Number(withKeep)) / SHEETS_PER_PAGE);
/** What is on a page of the choice: "keep drawing" first if there is a picture going. */
export function sheetsOn(page: number, withKeep: boolean): Array<Sheet | 'keep'> {
  const all: Array<Sheet | 'keep'> = withKeep ? ['keep', ...SHEETS] : [...SHEETS];
  return all.slice(page * SHEETS_PER_PAGE, (page + 1) * SHEETS_PER_PAGE);
}
export const stickersOn = (page: StickerPage) => STICKERS.filter(s => s.page === page);

// ---------------------------------------------------------------- small helpers

function slab(c: C, fill: string | CanvasGradient, x: number, y: number, w: number, h: number, r = 0, ink = 1.6): void {
  box(c, INK, x - ink, y - ink, w + ink * 2, h + ink * 2, r ? r + ink : 0); box(c, fill, x, y, w, h, r);
}
/** A button's place on the table: a soft cream tile, golden and lifted when chosen. */
function tile(c: C, b: Box, chosen: boolean, t: number): void {
  const lift = chosen ? 2 + Math.sin(t * 5) * 1 : 0;
  box(c, 'rgba(30, 18, 10, 0.3)', b.x + 2, b.y + 3, b.w, b.h, 9);
  slab(c, chosen ? '#ffe9a0' : '#fff8e5', b.x, b.y - lift, b.w, b.h, 8, chosen ? 2.4 : 1.4);
  if (chosen) box(c, 'rgba(242, 194, 48, 0.55)', b.x + 3, b.y - lift + b.h - 6, b.w - 6, 3, 2);
}
const mid = (b: Box): Pt => [b.x + b.w / 2, b.y + b.h / 2];

// ---------------------------------------------------------------- the icons

/** A brush's picture. */
function brushIcon(c: C, id: Brush | 'bucket', x: number, y: number, colour: string, stamp: CraftRun['stamp'], t: number): void {
  c.save(); c.translate(x, y);
  const handle = (col: string) => { c.save(); c.rotate(-0.7); slab(c, col, -3, -2, 6, 22, 3, 1.2); c.restore(); };
  if (id === 'crayon') {
    c.save(); c.rotate(-0.7);
    path(c, [[-6, -10], [6, -10], [0, -20]], true); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.2);
    slab(c, colour, -6, -10, 12, 26, 2, 1.2); box(c, 'rgba(255, 255, 255, 0.85)', -6, -2, 12, 10);
    c.restore();
  } else if (id === 'rainbow') {
    handle('#c9a473');
    ['#e2432f', '#f2c230', '#62b046', '#3157b8'].forEach((col, i) => { c.beginPath(); c.arc(4, 8, 18 - i * 4, Math.PI * 1.05, Math.PI * 1.75); stroke(c, col, 3.4); });
  } else if (id === 'glitter') {
    line(c, INK, 5, [[-10, 12], [6, -4]]); line(c, '#8a56b8', 3, [[-10, 12], [6, -4]]);
    starPath(c, 8, -8, 9); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1.2);
    for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1, r = 2 + Math.abs(Math.sin(a)) * 2; oval(c, '#ffffff', -4 + i * 9, -14 + (i % 2) * 18, r, r); }
  } else if (id === 'stamp') {
    slab(c, '#c9a473', -10, -16, 20, 12, 4, 1.2); slab(c, '#8f6a3a', -4, -20, 8, 6, 2, 1);
    paintStamp(c, stamp, 0, 8, 9, 0, colour);
  } else if (id === 'neon') {
    c.save(); c.rotate(-0.7); slab(c, '#2b2b2e', -5, -6, 10, 24, 3, 1.2); c.restore();
    line(c, colour, 7, [[-14, 14], [-2, -2]]); line(c, mix(colour, '#ffffff', 0.6), 3, [[-14, 14], [-2, -2]]);
    oval(c, mix(colour, '#ffffff', 0.3), 10, -10, 5, 5);
  } else if (id === 'eraser') {
    c.save(); c.rotate(-0.5); slab(c, '#f07fb0', -12, -7, 24, 14, 3, 1.4); box(c, '#3157b8', 2, -7, 10, 14); c.restore();
  } else {
    path(c, [[-12, -6], [12, -6], [9, 14], [-9, 14]], true); c.fillStyle = '#9aa4a8'; c.fill(); stroke(c, INK, 1.4);
    c.beginPath(); c.ellipse(0, -6, 12, 4, 0, 0, TAU); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.2);
    c.beginPath(); c.arc(0, -6, 12, Math.PI, 0); stroke(c, INK, 1.4);
    oval(c, colour, 12, 4, 3, 4);
  }
  c.restore();
}

function patternIcon(c: C, p: Pattern, b: Box, colour: string): void {
  const [x, y] = mid(b);
  c.save(); c.beginPath(); c.roundRect(x - 16, y - 12, 32, 24, 4); c.clip();
  c.fillStyle = colour; c.fillRect(x - 16, y - 12, 32, 24);
  const ink = mix(colour, '#000000', 0.25);
  c.fillStyle = ink;
  if (p === 'stripes') for (let d = -24; d < 40; d += 9) { path(c, [[x - 16 + d, y - 12], [x - 12 + d, y - 12], [x - 36 + d, y + 12], [x - 40 + d, y + 12]], true); c.fill(); }
  else if (p === 'dots') for (const [dx, dy] of [[-9, -5], [3, -5], [-3, 5], [9, 5]] as const) oval(c, ink, x + dx, y + dy, 2.6, 2.6);
  else if (p === 'stars') { starPath(c, x - 6, y - 2, 6); c.fill(); starPath(c, x + 8, y + 4, 5); c.fill(); }
  else if (p === 'hearts') { for (const [dx, dy] of [[-6, -1], [8, 3]] as const) { c.save(); c.translate(x + dx, y + dy); heartPath(c, 6); c.fill(); c.restore(); } }
  c.restore();
  c.beginPath(); c.roundRect(x - 16, y - 12, 32, 24, 4); stroke(c, INK, 1.2);
}

/** The mirror butterfly: plain, or with 2, 4 or 8 mirror lines. */
function symIcon(c: C, n: number, b: Box, t: number): void {
  const [x, y] = mid(b);
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 9, y - 4, 9, 8, s * 0.4, 0, TAU); c.fillStyle = n > 1 ? '#8a56b8' : '#c2a0dc'; c.fill(); stroke(c, INK, 1.2); c.beginPath(); c.ellipse(x + s * 7, y + 8, 6, 5, -s * 0.4, 0, TAU); c.fillStyle = n > 1 ? '#f07fb0' : '#f8b6d2'; c.fill(); stroke(c, INK, 1.2); }
  oval(c, INK, x, y + 1, 2, 9);
  if (n > 1) {
    c.save(); c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
    for (let i = 0; i < n / 2; i++) { const a = i * Math.PI / (n / 2) + Math.PI / 2; line(c, '#3157b8', 1.6, [[x - Math.cos(a) * 17, y - Math.sin(a) * 15], [x + Math.cos(a) * 17, y + Math.sin(a) * 15]]); }
    c.restore();
    box(c, '#3157b8', b.x + b.w - 15, b.y + 2, 13, 13, 6);
    c.save(); c.font = 'bold 10px sans-serif'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.fillText(String(n), b.x + b.w - 8.5, b.y + 12); c.restore();
  }
}

function tabIcon(c: C, page: StickerPage, b: Box): void {
  const [x, y] = mid(b), id: StickerId = page === 'family' ? 'carl' : page === 'things' ? 'bike' : 'star';
  paintSticker(c, id, x, y, 13);
}

function actionIcon(c: C, a: Action, b: Box, run: Pick<CraftRun, 'alive' | 'picture'>, t: number): void {
  const [x, y] = mid(b);
  if (a === 'sponge') {
    slab(c, '#f2c230', x - 14, y - 9, 28, 18, 5, 1.4); box(c, '#62b046', x - 14, y + 4, 28, 5, 2);
    for (const [dx, dy] of [[-7, -3], [2, -5], [8, -1], [-2, 1]] as const) oval(c, '#d9a420', x + dx, y + dy, 1.6, 1.6);
    oval(c, '#ffffff', x + 12, y - 13, 4, 4); oval(c, '#ffffff', x + 6, y - 17, 3, 3);
  } else if (a === 'undo') {
    c.beginPath(); c.arc(x + 2, y + 2, 11, Math.PI * 1.1, Math.PI * 0.4); stroke(c, INK, 6); stroke(c, '#3157b8', 3.6);
    path(c, [[x - 16, y - 2], [x - 6, y - 4], [x - 12, y + 6]], true); c.fillStyle = '#3157b8'; c.fill(); stroke(c, INK, 1.2);
  } else if (a === 'new') {
    for (let i = 2; i >= 0; i--) { c.save(); c.translate(x + i * 3, y - i * 3); c.rotate(-0.1 + i * 0.08); slab(c, i ? '#e7e5dd' : '#ffffff', -11, -14, 22, 28, 1, 1.2); c.restore(); }
    c.save(); c.font = 'bold 18px sans-serif'; c.fillStyle = '#62b046'; c.textAlign = 'center'; c.fillText('+', x, y + 7); c.restore();
  } else if (a === 'gallery') {
    for (const [dx, dy, col] of [[-7, -5, '#6fbde8'], [6, 3, '#f2c230']] as const) { slab(c, '#8f6a3a', x + dx - 10, y + dy - 8, 20, 16, 1, 1.2); box(c, col, x + dx - 7, y + dy - 5, 14, 10); }
  } else if (a === 'play') {
    if (run.alive) { box(c, '#e2432f', x - 9, y - 11, 6, 22, 2); box(c, '#e2432f', x + 3, y - 11, 6, 22, 2); }
    else { path(c, [[x - 8, y - 12], [x + 12, y], [x - 8, y + 12]], true); c.fillStyle = '#62b046'; c.fill(); stroke(c, INK, 1.4); }
    for (let i = 0; i < 2; i++) { const a2 = t * 3 + i * Math.PI; oval(c, '#f2c230', x + Math.cos(a2) * 18, y + Math.sin(a2) * 14, 2, 2); }
  } else {
    // The pin: the picture going up on the wall.
    slab(c, run.picture.marks ? '#ffffff' : '#e7e5dd', x - 13, y - 8, 26, 20, 1, 1.2);
    line(c, '#e2432f', 2, [[x - 8, y + 6], [x - 2, y - 2], [x + 6, y + 5]]);
    oval(c, INK, x, y - 10, 6.4, 6.4); oval(c, '#e2432f', x, y - 10, 5, 5); oval(c, 'rgba(255, 255, 255, 0.6)', x - 1.6, y - 11.6, 1.6, 1.6);
  }
}

/** A room's sign in the gallery: the sofa, the front door, the bed. */
function roomIcon(c: C, room: WallRoom, x: number, y: number): void {
  if (room === 'living') { slab(c, '#b8bab6', x - 26, y - 6, 52, 18, 5); slab(c, '#8c8e8a', x - 30, y - 14, 10, 26, 4); slab(c, '#8c8e8a', x + 20, y - 14, 10, 26, 4); slab(c, '#c9ced0', x - 20, y - 16, 40, 12, 4); }
  else if (room === 'hall') { slab(c, '#fbfaf6', x - 14, y - 22, 28, 44, 2); oval(c, '#3a3a3a', x + 8, y, 2.4, 2.4); for (let i = -1; i <= 1; i++) line(c, '#d9d7cf', 1.4, [[x + i * 6, y - 18], [x + i * 6, y + 18]]); }
  else { slab(c, '#8fa092', x - 30, y - 16, 8, 30, 2); slab(c, '#e6aea6', x - 22, y - 2, 52, 14, 3); slab(c, '#ffffff', x - 22, y - 10, 16, 10, 4, 1); }
}

function binIcon(c: C, x: number, y: number, k: number, open: boolean): void {
  c.save(); c.translate(x, y); c.scale(k, k);
  path(c, [[-14, -10], [14, -10], [11, 18], [-11, 18]], true); c.fillStyle = open ? '#9aa4a8' : '#b8bab6'; c.fill(); stroke(c, INK, 1.6);
  for (const lx of [-6, 0, 6]) line(c, '#6b7076', 1.4, [[lx, -4], [lx * 0.85, 13]]);
  c.save(); if (open) { c.translate(-14, -12); c.rotate(-0.5); c.translate(14, 12); }
  slab(c, '#8c8e8a', -16, -16, 32, 5, 2, 1.2); slab(c, '#8c8e8a', -4, -20, 8, 4, 1, 1);
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- the table and the paper

function paintTable(c: C): void {
  c.fillStyle = vgrad(c, 0, 540, [[0, '#7a5236'], [0.5, '#8a6239'], [1, '#74502f']]); c.fillRect(0, 0, W, 540);
  const rand = seeded(44);
  for (let i = 0; i < 70; i++) {
    const y = rand() * 540, x = rand() * W - 100, len = 200 + rand() * 400, bow = (rand() - 0.5) * 10;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + len / 2, y + bow, x + len, y);
    stroke(c, rand() < 0.5 ? 'rgba(94, 64, 41, 0.45)' : 'rgba(184, 141, 90, 0.35)', 1 + rand() * 1.5);
  }
  c.fillStyle = 'rgba(30, 18, 10, 0.18)'; c.fillRect(0, 520, W, 20);
}

function crayonStub(c: C, b: Box, colour: string, chosen: boolean, t: number): void {
  const dx = chosen ? -4 + Math.sin(t * 4) * 1.5 : 0, x = b.x + 6 + dx, y = b.y + 6, w = b.w - 10, h = b.h - 12;
  box(c, 'rgba(30, 18, 10, 0.3)', x + 3, y + 3, w, h, 5);
  path(c, [[x - 6, y + h / 2], [x + 10, y], [x + 10, y + h]], true); c.fillStyle = colour; c.fill(); stroke(c, INK, 1.4);
  box(c, INK, x + 8.5, y - 1.5, w - 7, h + 3, 4); box(c, colour, x + 10, y, w - 10, h, 3);
  box(c, 'rgba(255, 255, 255, 0.85)', x + 20, y, w - 30, h); box(c, 'rgba(255, 255, 255, 0.3)', x + 12, y + 2, w - 14, 3, 1);
  if (chosen) { c.beginPath(); c.roundRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2, 8); stroke(c, '#f2c230', 3); }
}

/** The paper on the table, with a soft shadow. `lift` raises and tilts it (put up on the wall). */
function paintPaper(c: C, pic: Picture, scale: number, t: number, alive: boolean, lift = 0): void {
  c.save(); c.translate(PAPER.x + PAPER.w / 2, PAPER.y + PAPER.h / 2); c.rotate(-0.03 * lift); c.scale(1 - 0.06 * lift, 1 - 0.06 * lift);
  const x = -PAPER.w / 2, y = -PAPER.h / 2;
  box(c, `rgba(30, 18, 10, ${0.3 + 0.15 * lift})`, x + 5 + 10 * lift, y + 7 + 12 * lift, PAPER.w, PAPER.h, 2);
  box(c, INK, x - 1.5, y - 1.5, PAPER.w + 3, PAPER.h + 3, 2);
  if (alive) { c.save(); c.translate(x, y); c.beginPath(); c.rect(0, 0, PAPER.w, PAPER.h); c.clip(); renderPicture(c, pic, 1, t); c.restore(); }
  else c.drawImage(pictureCanvas(pic, scale), x, y, PAPER.w, PAPER.h);
  if (lift) for (const [tx, ty, a] of [[x + 24, y + 4, -0.6], [x + PAPER.w - 24, y + 4, 0.6]] as const) { c.save(); c.translate(tx, ty); c.rotate(a); box(c, 'rgba(240, 236, 214, 0.85)', -26, -9, 52, 18); c.restore(); }
  c.restore();
}

function confetti(c: C, t: number): void {
  const rand = seeded(7), cols = CRAYONS.map(k => k.colour);
  for (let i = 0; i < 26; i++) {
    const x = PAPER.x + rand() * PAPER.w, speed = 40 + rand() * 50, y = PAPER.y - 30 + ((rand() * 500 + t * speed) % 470), spin = t * (1 + rand() * 2);
    c.save(); c.translate(x + Math.sin(t * 2 + i) * 12, y); c.rotate(spin);
    starPath(c, 0, 0, 7 + rand() * 5); c.fillStyle = cols[i % cols.length]; c.fill(); stroke(c, INK, 1);
    c.restore();
  }
}

/** Stars flying out from a letter just traced (paper units; `since` is seconds since each letter was traced, or −1). */
function letterStars(c: C, pic: Picture, t: number, since: number[]): void {
  pic.trace?.letters.forEach((l, i) => {
    const s = since[i];
    if (s === undefined || s < 0 || s > 1.2) return;
    const [bx, by, bw, bh] = l.box;
    for (let k = 0; k < 6; k++) {
      const a = k * TAU / 6 + t, r = 20 + s * 90;
      c.save(); c.globalAlpha = 1 - s / 1.2; starPath(c, bx + bw / 2 + Math.cos(a) * r, by + bh / 2 + Math.sin(a) * r * 0.7, 8); c.fillStyle = '#f2c230'; c.fill(); stroke(c, INK, 1); c.restore();
    }
  });
}

// ---------------------------------------------------------------- the right side

function paintTools(c: C, run: CraftRun, t: number): void {
  BRUSHES.forEach((b, i) => { const bx = brushBox(i); tile(c, bx, run.tool === b.id, t); brushIcon(c, b.id, bx.x + bx.w / 2, bx.y + bx.h / 2, run.colour, run.stamp, t); });
  if (run.tool === 'bucket') PATTERNS.forEach((p, i) => { const b = patternBox(i); tile(c, b, run.pattern === p.id, t); patternIcon(c, p.id, b, run.colour); });
  else {
    SIZES.forEach((s, i) => { const b = sizeBox(i), [x, y] = mid(b); tile(c, b, run.size === i && !!run.brush, t); oval(c, run.tool === 'eraser' ? '#f07fb0' : run.colour, x, y, s / 2 + 1, s / 2 + 1); });
    tile(c, SYM_BOX, run.sym > 1, t); symIcon(c, run.sym, SYM_BOX, t);
  }
  CRAYONS.forEach((k, i) => crayonStub(c, colourBox(i), k.colour, run.colour === k.colour && run.tool !== 'eraser' && run.tool !== 'sticker' && run.tool !== 'sponge', t));
  // The sticker sheet: three page tabs, and the stickers of the open page.
  STICKER_PAGES.forEach((p, i) => { const b = tabBox(i); tile(c, b, run.stickerPage === p, t); tabIcon(c, p, b); });
  box(c, 'rgba(30, 18, 10, 0.3)', 640, 304, 316, 180, 8);
  slab(c, '#cdeefb', 636, 300, 316, 180, 8);
  stickersOn(run.stickerPage).forEach((s, i) => {
    const b = cellBox(i), [x, y] = mid(b), chosen = run.tool === 'sticker' && run.sticker === s.id;
    if (chosen) { box(c, '#f2c230', b.x, b.y, b.w, b.h, 10); box(c, '#fff3b0', b.x + 3, b.y + 3, b.w - 6, b.h - 6, 8); }
    paintSticker(c, s.id, x, y, chosen ? 23 + Math.sin(t * 5) * 1.5 : 21);
  });
  ACTIONS.forEach((a, i) => { const b = actionBox(i); tile(c, b, (a === 'sponge' && run.tool === 'sponge') || (a === 'play' && run.alive), t); actionIcon(c, a, b, run, t); });
}

// ---------------------------------------------------------------- the choice of sheets, and the gallery

const blanks = new Map<string, Picture>();
function blankOf(sheet: Sheet): Picture {
  const key = JSON.stringify(sheet);
  let p = blanks.get(key);
  if (!p) {
    p = 'page' in sheet ? new Picture(PAGES.find(x => x.id === sheet.page)!) : 'trace' in sheet ? new Picture(null, 'white', TRACES.find(x => x.id === sheet.trace)!) : new Picture(null, sheet.paper);
    // Scratch paper and black paper show what they do: a scratched line, a neon line.
    if ('paper' in sheet && (sheet.paper === 'scratch' || sheet.paper === 'black')) {
      p.startStroke(sheet.paper === 'black' ? 'neon' : 'crayon', '#f07fb0', sheet.paper === 'black' ? 11 : 16, 1, [70, 320], 3);
      for (const q of [[160, 190], [260, 290], [360, 150], [480, 250]] as Pt[]) p.extend(q);
    }
    blanks.set(key, p);
  }
  return p;
}

function paintChoice(c: C, run: CraftRun, scale: number, t: number): void {
  const keep = run.picture.marks > 0, items = sheetsOn(run.choosePage, keep);
  items.forEach((it, i) => {
    const b = thumbBox(i);
    box(c, 'rgba(30, 18, 10, 0.3)', b.x + 4, b.y + 5, b.w, b.h, 2);
    box(c, INK, b.x - 1.5, b.y - 1.5, b.w + 3, b.h + 3, 2);
    const pic = it === 'keep' ? run.picture : blankOf(it);
    c.drawImage(pictureCanvas(pic, scale * b.w / PAPER.w), b.x, b.y, b.w, b.h);
    if (it === 'keep') { oval(c, '#62b046', b.x + b.w - 14, b.y + 14, 13, 13); path(c, [[b.x + b.w - 20, b.y + 14], [b.x + b.w - 15, b.y + 19], [b.x + b.w - 7, b.y + 9]]); stroke(c, '#ffffff', 3); }
  });
  if (sheetPages(keep) > 1) {
    tile(c, NEXT_BOX, false, t);
    const [x, y] = mid(NEXT_BOX);
    for (let p = 0; p < sheetPages(keep); p++) oval(c, p === run.choosePage ? '#3157b8' : '#b8bab6', x - 30 + p * 14, y, 5, 5);
    path(c, [[x + 18, y - 10], [x + 36, y], [x + 18, y + 10]], true); c.fillStyle = '#3157b8'; c.fill(); stroke(c, INK, 1.4);
  }
}

export interface GalleryView { pictures: Array<HTMLImageElement | null>; hung: Record<WallRoom, number> }

function paintGallery(c: C, run: CraftRun, g: GalleryView, t: number): void {
  box(c, 'rgba(30, 18, 10, 0.3)', PAPER.x + 5, PAPER.y + 7, PAPER.w, PAPER.h, 4);
  slab(c, '#e9e1cf', PAPER.x, PAPER.y, PAPER.w, PAPER.h, 4);
  g.pictures.forEach((img, i) => {
    const b = thumbBox(i);
    if (run.chosen === i) box(c, '#f2c230', b.x - 7, b.y - 7, b.w + 14, b.h + 14, 8);
    if (img) paintHungPicture(c, img, b.x + 4, b.y + 4, b.w - 8, 0);
    // Little room signs on the pictures that hang somewhere.
    ROOMS.forEach((room, k) => { if (g.hung[room] === i) { const x = b.x + 18 + k * 34, y = b.y + b.h - 4; oval(c, '#fff8e5', x, y, 15, 12); c.save(); c.translate(x, y); c.scale(0.45, 0.45); roomIcon(c, room, 0, 0); c.restore(); } });
  });
  // The rooms (each with the picture hanging there now), the bin and the way back.
  ROOMS.forEach((room, i) => {
    const b = roomBox(i);
    tile(c, b, false, t);
    roomIcon(c, room, b.x + 50, b.y + b.h / 2);
    const img = g.pictures[g.hung[room]];
    if (img) paintHungPicture(c, img, b.x + 120, b.y + 14, 100, 0.03);
    if (run.chosen !== null) { path(c, [[b.x + b.w - 50, b.y + b.h / 2 - 14], [b.x + b.w - 24, b.y + b.h / 2], [b.x + b.w - 50, b.y + b.h / 2 + 14]], true); c.fillStyle = '#62b046'; c.fill(); stroke(c, INK, 1.4); }
  });
  tile(c, BIN_BOX, false, t); binIcon(c, BIN_BOX.x + BIN_BOX.w / 2, BIN_BOX.y + BIN_BOX.h / 2, 1, run.chosen !== null);
  tile(c, BACK_BOX, false, t);
  const [bx, by] = mid(BACK_BOX);
  path(c, [[bx + 22, by - 12], [bx - 6, by - 12], [bx - 6, by - 20], [bx - 26, by], [bx - 6, by + 20], [bx - 6, by + 12], [bx + 22, by + 12]], true); c.fillStyle = '#3157b8'; c.fill(); stroke(c, INK, 1.4);
}

// ---------------------------------------------------------------- a frame

/**
 * One frame of the craft table, in world units. `scale` is canvas pixels per world unit (sharp paper at any size);
 * `gallery` the saved pictures; `letterSince` seconds since each letter of a tracing page was traced (−1: not yet).
 */
export function drawCraft(c: C, run: CraftRun, t: number, scale: number, gallery: GalleryView, letterSince: number[]): void {
  paintTable(c);
  if (run.mode === 'choosing') paintChoice(c, run, scale, t);
  else if (run.mode === 'gallery') { paintGallery(c, run, gallery, t); return; }
  else paintPaper(c, run.picture, scale, t, run.alive && run.mode === 'drawing', run.mode === 'hung' ? 1 : 0);
  if (run.mode === 'hung') { confetti(c, t); return; }
  paintTools(c, run, t);
  if (run.mode !== 'drawing') return;
  c.save(); c.translate(PAPER.x, PAPER.y);
  // Mirror lines, faintly, while a brush draws with mirrors.
  if (run.sym > 1 && run.brush) {
    c.save(); c.setLineDash([6, 8]); c.globalAlpha = 0.45;
    const cx = PAPER.w / 2, cy = PAPER.h / 2;
    line(c, '#8a56b8', 2, [[cx, 0], [cx, PAPER.h]]);
    if (run.sym >= 4) line(c, '#8a56b8', 2, [[0, cy], [PAPER.w, cy]]);
    if (run.sym === 8) { line(c, '#8a56b8', 2, [[cx - cy, 0], [cx + cy, PAPER.h]]); line(c, '#8a56b8', 2, [[cx + cy, 0], [cx - cy, PAPER.h]]); }
    c.restore();
  }
  letterStars(c, run.picture, t, letterSince);
  // The chosen sticker: a dashed ring, and its + and − handles.
  const h = handles(run), sel = run.selected !== null ? run.picture.stuck(run.selected) : undefined;
  if (sel && h && !run.dragging) {
    c.save(); c.setLineDash([5, 5]); c.lineDashOffset = -t * 20; c.beginPath(); c.arc(sel.x, sel.y, STICKER_SIZES[sel.size] + 8, 0, TAU); stroke(c, '#3157b8', 2.4); c.restore();
    for (const [p, plus] of [[h.plus, true], [h.minus, false]] as const) {
      oval(c, INK, p[0], p[1], h.r + 1.6, h.r + 1.6); oval(c, plus ? '#62b046' : '#f08a2c', p[0], p[1], h.r, h.r);
      line(c, '#ffffff', 4, [[p[0] - 8, p[1]], [p[0] + 8, p[1]]]); if (plus) line(c, '#ffffff', 4, [[p[0], p[1] - 8], [p[0], p[1] + 8]]);
    }
  }
  // The bin, while a sticker is held.
  if (run.dragging || run.carry) {
    oval(c, run.overBin ? 'rgba(226, 67, 47, 0.35)' : 'rgba(255, 255, 255, 0.55)', BIN.x, BIN.y, BIN.r, BIN.r);
    binIcon(c, BIN.x, BIN.y + 2, 1.2, run.overBin);
  }
  // A sticker held: lifted with a shadow.
  if (run.dragging) { const s = run.picture.stuck(run.dragging.id); if (s) paintStuck(c, s, null, 6); }
  if (run.carry) paintSticker(c, run.carry.sticker, run.carry.at[0], run.carry.at[1] - 6, STICKER_SIZES[1] * 1.1, 0);
  // The sponge, wiping, with soap behind it.
  if (run.spongeAt) {
    const [sx, sy] = run.spongeAt;
    for (let i = 0; i < 6; i++) oval(c, 'rgba(255, 255, 255, 0.7)', sx - 20 + Math.sin(t * 9 + i) * 22, sy + 14 + Math.cos(t * 7 + i) * 8, 6, 5);
    c.save(); c.translate(sx, sy); c.rotate(Math.sin(t * 12) * 0.2); slab(c, '#f2c230', -26, -16, 52, 32, 8, 1.6); box(c, '#62b046', -26, 8, 52, 8, 3); c.restore();
  }
  // The keyboard's pen.
  if (run.cursorShown) {
    const [x, y] = run.cursor, ink = run.tool === 'eraser' ? '#ffffff' : run.colour;
    oval(c, INK, x, y, run.pen ? 9 : 7, run.pen ? 9 : 7); oval(c, ink, x, y, run.pen ? 7 : 5, run.pen ? 7 : 5);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Pt[]) line(c, INK, 2, [[x + dx * 11, y + dy * 11], [x + dx * 18, y + dy * 18]]);
  }
  c.restore();
}
