import { FRONTAGE_Y } from './layout';
import { brick, chimney, doorAt, windowAt, type FacadeBox } from './backdrop';
import { mix, poly, rand, rect, shade, text, textWidth } from './pixel';
import type { Facade } from './stage';

// The Gods run's landmarks, drawn from the supplied street views: the tall brick block at
// Kurirgatan 28, the four-storey brick blocks with dark tile roofs, garages and sheds, and the
// low yellow-brick school. Heights are compressed so a seven-storey block still fits the screen.

export const LEVEL2_ROLES = new Set<string>(['gods', 'block', 'garages', 'shed', 'school']);

const FLOOR_H: Record<string, number> = { gods: 19, block: 26, garages: 28, shed: 30, school: 40 };
const ROOF_H: Record<string, number> = { gods: 8, block: 15, garages: 3, shed: 8, school: 13 };

export function level2Box(f: Facade): FacadeBox {
  const role = f.role!, base = FRONTAGE_Y - 2, floor = base - 4;
  const floors = role === 'garages' || role === 'shed' ? 1 : f.appearance.floors;
  const floorH = FLOOR_H[role];
  const wallTop = floor - floors * floorH;
  return { x0: Math.round(f.x0), x1: Math.round(f.x1), base, floor, wallTop, top: wallTop - ROOF_H[role], k: 1, floorH };
}

export function drawLevel2Facade(c: CanvasRenderingContext2D, f: Facade): void {
  const b = level2Box(f);
  switch (f.role) {
    case 'gods': return drawGods(c, f, b);
    case 'block': return drawBlock(c, f, b);
    case 'garages': return drawGarages(c, f, b);
    case 'shed': return drawShed(c, f, b);
    default: return drawSchool(c, f, b);
  }
}

const TRIM = '#efece2';

function shading(c: CanvasRenderingContext2D, b: FacadeBox, from = b.wallTop): void {
  c.fillStyle = 'rgba(30, 24, 34, 0.18)';
  c.fillRect(b.x0, from, b.x1 - b.x0, 2);
  c.fillRect(b.x0, from, 2, b.floor - from);
  c.fillStyle = 'rgba(255, 244, 214, 0.18)';
  c.fillRect(b.x1 - 1, from, 1, b.floor - from);
}

function plinth(c: CanvasRenderingContext2D, b: FacadeBox): void {
  rect(c, b.x0, b.floor, b.x1 - b.x0, b.base - b.floor, '#8a8680');
  rect(c, b.x0, b.floor, b.x1 - b.x0, 1, '#a6a29a');
}

/** Kurirgatan 28: a long brick slab with a stepped roofline, and an entrance to each stairwell. */
function drawGods(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0, wallH = b.floor - b.wallTop;
  brick(c, x0, b.wallTop, w, wallH, '#a64f3b', f.seed);
  // Raised stairwell blocks along the roof.
  for (let x = x0 + 84; x < x1 - 50; x += 176) {
    brick(c, x, b.wallTop - 13, 46, 14, '#a04a39', f.seed + x);
    rect(c, x - 1, b.wallTop - 16, 48, 3, '#5f5a58');
    rect(c, x - 1, b.wallTop - 16, 48, 1, '#8a8784');
    windowAt(c, x + 23, b.wallTop - 10, 6, 7, TRIM, f.seed + x, { plain: true, panes: 1 });
  }
  rect(c, x0 - 1, b.wallTop - 3, w + 2, 3, '#5f5a58');
  rect(c, x0 - 1, b.wallTop - 3, w + 2, 1, '#8a8784');
  // The entrances: 28D at the right-hand end, then C, B and A along the slab.
  const door = f.door ?? x1 - 40;
  const entrances = [0, 1, 2, 3].map(i => ({ x: door - i * 132, letter: 'DCBA'[i] })).filter(e => e.x > x0 + 14 && e.x < x1 - 14);
  // A window in every bay of every floor, apart from over the doors.
  for (let x = x0 + 14; x < x1 - 8; x += 21) {
    if (entrances.some(e => Math.abs(e.x - x) < 15)) continue;
    for (let r = 0; r < f.appearance.floors; r++) {
      const y = b.floor - (r + 1) * b.floorH + 5;
      windowAt(c, x, y, 8, 10, TRIM, f.seed + x * 3 + r, { panes: rand(x, r) > 0.5 ? 2 : 1 });
    }
  }
  for (const e of entrances) {
    // A glazed stairwell column above the door, with a canopy and the number plate.
    for (let r = 1; r < f.appearance.floors; r++) rect(c, e.x - 3, b.floor - (r + 1) * b.floorH + 4, 6, 12, '#6f8ea3');
    doorAt(c, e.x, b.floor, 16, 21, '#2f4a5c', TRIM);
    rect(c, e.x - 12, b.floor - 26, 24, 3, '#5f5a58');
    rect(c, e.x - 12, b.floor - 26, 24, 1, '#8a8784');
    const label = `28${e.letter}`;
    rect(c, e.x - 8, b.floor - 36, textWidth(label) + 4, 8, '#f2ede0');
    text(c, label, e.x - 6, b.floor - 34, e.letter === 'D' ? '#b03a2e' : '#33414a');
  }
  // Drainpipes.
  for (let x = x0 + 70; x < x1; x += 176) { rect(c, x, b.wallTop, 2, wallH, '#6f6c68'); rect(c, x, b.wallTop, 1, wallH, '#9b9893'); }
  shading(c, b);
  plinth(c, b);
}

/** A four-storey brick block: dark tiled roof, paired windows and a lighter brick stairwell bay. */
function drawBlock(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0, wallH = b.floor - b.wallTop;
  const wall = f.seed % 2 ? '#a24a39' : '#9c4a3c', roofC = '#4b3c37';
  // Long low hipped roof with overhanging eaves.
  const inset = 22;
  poly(c, [[x0 - 4, b.wallTop + 2], [x1 + 4, b.wallTop + 2], [x1 - inset, b.top], [x0 + inset, b.top]], roofC);
  for (let y = b.top + 3; y < b.wallTop; y += 3) rect(c, x0 + Math.round(inset * (1 - (y - b.top) / (b.wallTop - b.top))) - 2, y, w - Math.round(2 * inset * (1 - (y - b.top) / (b.wallTop - b.top))) + 4, 1, shade(roofC, 0.82));
  rect(c, x0 + inset, b.top, w - 2 * inset, 1, mix(roofC, '#fff4dc', 0.2));
  rect(c, x0 - 4, b.wallTop + 1, w + 8, 2, shade(roofC, 0.6));
  chimney(c, Math.round(x0 + w * (0.55 + rand(f.seed, 3) * 0.3)), b.top + 6, 22, '#8f4636');
  brick(c, x0, b.wallTop + 2, w, wallH - 2, wall, f.seed);
  // Stairwell bays: a lighter, narrower strip of brick with a column of small windows.
  const bays: number[] = [];
  for (let x = x0 + 60; x < x1 - 40; x += 148) bays.push(x);
  for (const x of bays) {
    brick(c, x - 9, b.wallTop + 2, 18, wallH - 2, '#b8634c', f.seed + x);
    for (let r = 0; r < 4; r++) windowAt(c, x, b.floor - (r + 1) * b.floorH + 8, 5, 9, TRIM, f.seed + x + r, { plain: true, panes: 1 });
  }
  // Paired windows between the bays.
  for (let x = x0 + 16; x < x1 - 10; x += 19) {
    if (bays.some(bx => Math.abs(bx - x) < 17)) continue;
    for (let r = 0; r < f.appearance.floors; r++) {
      windowAt(c, x, b.floor - (r + 1) * b.floorH + 8, 8, 12, TRIM, f.seed + x * 5 + r, { panes: 2 });
    }
  }
  // Every other block ends in a honeycomb of lighter brick.
  if (f.seed % 3 === 0) {
    const hx = x1 - 38;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) {
      const cx = hx + k * 16, cy = b.wallTop + 30 + r * 24;
      poly(c, [[cx, cy - 10], [cx + 8, cy], [cx, cy + 10], [cx - 8, cy]], mix(wall, '#e8c8a8', 0.35));
      poly(c, [[cx, cy - 7], [cx + 5, cy], [cx, cy + 7], [cx - 5, cy]], wall);
    }
  }
  for (const x of bays) {
    doorAt(c, x, b.floor, 13, 19, '#3a4d58', TRIM);
    rect(c, x - 9, b.floor - 23, 18, 2, '#5f5a58');
  }
  shading(c, b);
  plinth(c, b);
}

/** A row of garages with dark navy doors under a flat pale roof. */
function drawGarages(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0;
  rect(c, x0, b.wallTop, w, b.floor - b.wallTop, '#d6d1c4');
  rect(c, x0 - 2, b.top, w + 4, 4, '#5b6062');
  rect(c, x0 - 2, b.top, w + 4, 1, '#a9adab');
  for (let x = x0 + 2; x + 24 <= x1; x += 26) {
    rect(c, x, b.wallTop + 5, 24, b.floor - b.wallTop - 5, '#2a2e47');
    for (let y = b.wallTop + 9; y < b.floor; y += 4) rect(c, x, y, 24, 1, '#3c4160');
    rect(c, x + 10, b.floor - 9, 4, 1, '#c8c4b4');
    rect(c, x - 1, b.wallTop + 4, 26, 1, '#eeeadc');
  }
  shading(c, b);
  plinth(c, b);
}

/** A red timber shed, as behind the PRIVAT car park. */
function drawShed(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0;
  rect(c, x0, b.wallTop, w, b.floor - b.wallTop, '#a3372f');
  for (let x = x0 + 3; x < x1; x += 4) rect(c, x, b.wallTop, 1, b.floor - b.wallTop, '#86291f');
  poly(c, [[x0 - 4, b.wallTop + 1], [x1 + 4, b.wallTop + 1], [x1, b.top], [x0, b.top]], '#d9d5c8');
  rect(c, x0 - 4, b.wallTop, w + 8, 2, '#f2efe6');
  rect(c, x1 - 8, b.wallTop, 3, b.floor - b.wallTop, '#efece2');
  rect(c, x0 + 10, b.floor - 16, 2, 8, '#efece2');
  shading(c, b);
  plinth(c, b);
}

/** The school: low yellow brick, a tiled hip roof, long windows and an arched passage into the yard. */
function drawSchool(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0, wallH = b.floor - b.wallTop;
  const door = f.door ?? Math.round((x0 + x1) / 2);
  const roofC = '#54463f';
  poly(c, [[x0 - 5, b.wallTop + 2], [x1 + 5, b.wallTop + 2], [x1 - 30, b.top], [x0 + 30, b.top]], roofC);
  for (let y = b.top + 3; y < b.wallTop; y += 3) rect(c, x0 - 2, y, w + 4, 1, shade(roofC, 0.84));
  rect(c, x0 + 30, b.top, w - 60, 1, mix(roofC, '#fff4dc', 0.2));
  rect(c, x0 - 5, b.wallTop + 1, w + 10, 2, shade(roofC, 0.6));
  brick(c, x0, b.wallTop + 2, w, wallH - 2, '#c9a45c', f.seed);
  // Long window bands, broken by the passage.
  for (let x = x0 + 10; x < x1 - 20; x += 46) {
    if (Math.abs(x + 15 - door) < 46) continue;
    rect(c, x, b.wallTop + 14, 32, 14, '#2f3b46');
    rect(c, x + 1, b.wallTop + 15, 30, 12, '#4c6270');
    for (let k = 8; k < 32; k += 8) rect(c, x + k, b.wallTop + 14, 1, 14, '#2f3b46');
    rect(c, x - 1, b.wallTop + 28, 34, 1, '#efece2');
  }
  // The arch through to the yard, with the far side in daylight.
  const aw = 34;
  rect(c, door - aw / 2 - 3, b.wallTop + 6, aw + 6, b.floor - b.wallTop - 6, '#8d7442');
  rect(c, door - aw / 2, b.wallTop + 10, aw, b.floor - b.wallTop - 10, '#2c2f33');
  rect(c, door - aw / 2 + 4, b.wallTop + 14, aw - 8, b.floor - b.wallTop - 14, '#a9b7a2');
  rect(c, door - 2, b.floor - 12, 1, 8, '#33404a');
  rect(c, door + 3, b.floor - 11, 1, 7, '#8a3c3a');
  shading(c, b);
  plinth(c, b);
  // The red-and-yellow barrier hoops across the approach, and the dog ban on the fence beside them.
  for (const side of [-1, 1]) {
    const gx = door + side * 58;
    for (let i = 0; i < 8; i++) {
      const y = b.base + 6 + i * 2 - (i > 5 ? (i - 5) * 3 : 0);
      rect(c, gx + side * i * 2, y, 2, 2, i % 2 ? '#e8b923' : '#c0392b');
    }
    rect(c, gx - 1, b.base + 4, 2, 16, '#9aa1a3');
  }
  const sign = 'HUNDFÖRBUD';
  const sx = door + 118;
  rect(c, sx - 2, b.base + 2, textWidth(sign) + 6, 14, '#2f6db3');
  rect(c, sx, b.base + 4, textWidth(sign) + 2, 10, '#f4f4ee');
  text(c, sign, sx + 1, b.base + 7, '#25313a');
}
