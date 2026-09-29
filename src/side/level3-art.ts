import { FRONTAGE_Y } from './layout';
import type { FacadeBox } from './backdrop';
import { drawLogo } from './logos';
import { disc, mix, poly, rand, rect, shade, text, textWidth } from './pixel';
import type { Facade } from './stage';

// Level 3 landmarks, seen at night: the Statoil station, the Bildeve Volvo dealership, warehouses,
// stacked containers and the gate of the truck yard. Drawn from the supplied photographs.

export const LEVEL3_ROLES = new Set<string>(['statoil', 'bildeve', 'warehouse', 'containers', 'yardgate']);

const HEIGHTS: Record<string, { wall: number; roof: number }> = {
  statoil: { wall: 104, roof: 10 }, bildeve: { wall: 112, roof: 7 }, warehouse: { wall: 76, roof: 6 }, containers: { wall: 66, roof: 0 }, yardgate: { wall: 46, roof: 4 },
};

export function level3Box(f: Facade): FacadeBox {
  const base = FRONTAGE_Y - 2, floor = base - 4, h = HEIGHTS[f.role!];
  const wallTop = floor - h.wall;
  return { x0: Math.round(f.x0), x1: Math.round(f.x1), base, floor, wallTop, top: wallTop - h.roof, k: 1, floorH: 26 };
}

export function drawLevel3Facade(c: CanvasRenderingContext2D, f: Facade): void {
  const b = level3Box(f);
  switch (f.role) {
    case 'statoil': return drawStatoil(c, f, b);
    case 'bildeve': return drawBildeve(c, f, b);
    case 'warehouse': return drawWarehouse(c, f, b);
    case 'containers': return drawContainers(c, f, b);
    default: return drawGate(c, f, b);
  }
}

const YELLOW = '#f6c31c', NAVY = '#14213d', BLUE = '#1f45a8';

function ground(c: CanvasRenderingContext2D, b: FacadeBox): void {
  rect(c, b.x0, b.floor, b.x1 - b.x0, b.base - b.floor, '#7d7f80');
  rect(c, b.x0, b.floor, b.x1 - b.x0, 1, '#a3a5a4');
}

/** The Statoil drop: the real orange mark when the artwork is loaded, otherwise a yellow teardrop. */
function drop(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  if (drawLogo(c, 'statoil-drop', x - r * 1.25, y - r * 1.75, r * 2.5)) return;
  disc(c, x, y + r * 0.5, r, YELLOW);
  poly(c, [[x, y - r * 1.5], [x - r * 0.75, y - r * 0.1], [x + r * 0.75, y - r * 0.1]], YELLOW);
  disc(c, x, y + r * 0.6, r * 0.45, NAVY);
}

/** The Statoil station: canopy over the pumps, and the shop with its blue shutters. */
function drawStatoil(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0;
  // Shop, set behind the pumps at the right-hand end.
  const sx0 = x1 - 132, sTop = b.floor - 62;
  rect(c, sx0, sTop, 132, 62, '#c9ccc9');
  rect(c, sx0 - 2, sTop - 4, 136, 5, '#8e9296');
  rect(c, sx0, sTop, 132, 14, '#1c2f6b');
  drop(c, sx0 + 18, sTop + 6, 3);
  text(c, 'STATOIL', sx0 + 28, sTop + 4, '#f4f4f0', 1);
  rect(c, sx0 + 6, sTop + 20, 62, 38, '#2c4fa6');
  for (let y = sTop + 21; y < sTop + 57; y += 3) rect(c, sx0 + 6, y, 62, 1, '#1b3479');
  rect(c, sx0 + 76, sTop + 18, 46, 40, '#f0d98a');
  rect(c, sx0 + 78, sTop + 20, 42, 36, '#fff0b0');
  for (const sy of [24, 36, 48]) rect(c, sx0 + 82, sTop + sy, 34, 2, '#b98a3a');
  rect(c, sx0 + 76, sTop + 18, 46, 1, '#5b5f63');
  rect(c, sx0 + 98, sTop + 18, 1, 40, '#5b5f63');
  // The canopy: a dark band with the name, a white soffit and the yellow trim line.
  const cTop = b.wallTop, cBottom = cTop + 22;
  rect(c, x0, cTop, w, 12, NAVY);
  rect(c, x0, cTop + 12, w, 10, '#e6e8e6');
  rect(c, x0, cTop + 20, w, 3, YELLOW);
  rect(c, x0, cTop, w, 1, '#3a4a78');
  drop(c, x0 + Math.round(w * 0.36) - 22, cTop + 7, 4);
  text(c, 'STATOIL', x0 + Math.round(w * 0.36), cTop + 3, '#f6f7f4', 2);
  for (let x = x0 + 12; x < x1 - 8; x += 30) rect(c, x, cBottom - 8, 10, 2, '#fff7d0');
  // Pillars, and pump islands with yellow price signs.
  for (const px of [x0 + 34, x0 + Math.round(w * 0.5) - 40, x1 - 150]) {
    rect(c, px, cBottom, 10, b.floor - cBottom, '#b9bcbd');
    rect(c, px, cBottom, 2, b.floor - cBottom, '#dcdedd');
    rect(c, px + 8, cBottom, 2, b.floor - cBottom, '#8c9091');
    rect(c, px, b.floor - 5, 10, 5, '#3a4a78');
  }
  for (const ix of [x0 + 70, x0 + Math.round(w * 0.5) + 10]) {
    rect(c, ix - 4, b.floor - 3, 62, 3, '#9a9c9c');
    for (const k of [0, 36]) {
      const px = ix + k;
      rect(c, px, b.floor - 34, 14, 32, '#e8eaea');
      rect(c, px, b.floor - 34, 14, 6, '#1c2f6b');
      rect(c, px + 2, b.floor - 26, 10, 8, '#26a05a');
      rect(c, px + 3, b.floor - 25, 8, 3, '#bff0c8');
      rect(c, px + 2, b.floor - 14, 10, 4, '#2c4fa6');
      rect(c, px + 14, b.floor - 30, 2, 22, '#2a2f33');
    }
    rect(c, ix - 6, b.floor - 46, 66, 9, '#f2a417');
    rect(c, ix - 6, b.floor - 46, 66, 2, '#f8cf5a');
    text(c, 'MILES', ix + 18, b.floor - 43, '#3a2a10');
  }
  ground(c, b);
  // The price pylon at the forecourt entrance, in front of the canopy, when the sign artwork is loaded.
  const px = x0 + 8, top = b.floor - 96;
  if (drawLogo(c, 'statoil-sign', px, top, 30)) {
    rect(c, px + 13, top + 32, 4, b.floor - top - 32, '#8f9598');
    rect(c, px + 13, top + 32, 1, b.floor - top - 32, '#c9cdcf');
    rect(c, px - 1, top - 1, 32, 1, '#0b1f52');
  }
  void f;
}

/** The Bildeve Volvo dealership: white panels, glazed showroom, big blue lettering and Volvo banners. */
function drawBildeve(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0, h = b.floor - b.wallTop;
  // The white panel wall, seamed into large sheets, under a silver fascia.
  rect(c, x0, b.wallTop, w, h, '#dfe3e6');
  for (let x = x0 + 34; x < x1; x += 34) rect(c, x, b.wallTop, 1, h, '#b7bec4');
  for (let y = b.wallTop + 13; y < b.floor; y += 13) rect(c, x0, y, w, 1, '#c6ccd1');
  rect(c, x0 - 2, b.top, w + 4, b.wallTop - b.top + 4, '#b9c2c9');
  rect(c, x0 - 2, b.top, w + 4, 1, '#eef2f5');
  // Second-floor ribbon window and the showroom below.
  const ribbonY = b.wallTop + 50;
  rect(c, x0 + 50, ribbonY, w - 130, 24, '#404a52');
  rect(c, x0 + 51, ribbonY + 1, w - 132, 22, '#f0e2a8');
  for (let x = x0 + 50; x < x1 - 80; x += 46) rect(c, x, ribbonY, 2, 24, '#404a52');
  const shY = b.floor - 40;
  rect(c, x0 + 30, shY, w - 60, 40, '#2b333a');
  rect(c, x0 + 32, shY + 2, w - 64, 38, '#fbeeb6');
  rect(c, x0 + 32, shY + 26, w - 64, 14, '#c9b47a');
  // Cars on the showroom floor.
  for (let x = x0 + 60; x < x1 - 100; x += 92) {
    const body = ['#e8ebef', '#20242a', '#8a1c2c', '#2b4f8a'][Math.floor(rand(x, f.seed) * 4)];
    rect(c, x, shY + 20, 60, 12, body);
    poly(c, [[x + 10, shY + 20], [x + 20, shY + 10], [x + 44, shY + 10], [x + 52, shY + 20]], body);
    rect(c, x + 14, shY + 12, 32, 7, '#3a4652');
    disc(c, x + 12, shY + 32, 5, '#111'); disc(c, x + 48, shY + 32, 5, '#111');
  }
  for (let x = x0 + 30; x < x1 - 30; x += 30) rect(c, x, shY, 2, 40, '#2b333a');
  rect(c, x0 + 30, shY + 38, w - 60, 3, '#7f8990');
  // BILDEVE, big and blue, with a dark edge.
  if (!drawLogo(c, 'bildeve', x0 + 76, b.wallTop + 8, 108)) {
    text(c, 'BILDEVE', x0 + 82, b.wallTop + 16, '#0b1a4a', 4);
    text(c, 'BILDEVE', x0 + 80, b.wallTop + 14, '#2447c2', 4);
  }
  // Two tall blue Volvo banners.
  for (const bx of [x0 + 38, x1 - 84]) {
    rect(c, bx, b.wallTop + 6, 30, 72, '#173a96');
    rect(c, bx + 1, b.wallTop + 7, 28, 70, BLUE);
    rect(c, bx + 1, b.wallTop + 7, 6, 70, '#3a62c8');
    for (let y = b.wallTop + 26; y < b.wallTop + 76; y += 15) rect(c, bx + 1, y, 28, 1, '#173a96');
    text(c, 'VOLVO', bx + 3, b.wallTop + 36, '#eef2ff', 1);
  }
  ground(c, b);
  // Parked Volvos out front, on the forecourt.
  for (let x = x0 + 110; x < x1 - 130; x += 84) {
    const body = ['#c9ced3', '#1d2127', '#5a7d99', '#e6e8ea', '#8f1f2a'][Math.floor(rand(x, f.seed + 7) * 5)];
    rect(c, x, b.floor + 2, 50, 10, shade(body, 0.85));
    poly(c, [[x + 4, b.floor + 2], [x + 12, b.floor - 5], [x + 40, b.floor - 5], [x + 46, b.floor + 2]], body);
    rect(c, x + 12, b.floor - 4, 26, 5, '#2a3540');
    disc(c, x + 10, b.floor + 12, 4, '#0d0f11'); disc(c, x + 40, b.floor + 12, 4, '#0d0f11');
  }
}

/** A corrugated warehouse with roller doors and a loading bay. */
function drawWarehouse(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, w = x1 - x0, h = b.floor - b.wallTop;
  const wall = ['#b4b7ae', '#9ea7ad', '#c0b898', '#8f9a94'][Math.floor(rand(f.seed, 3) * 4)];
  rect(c, x0, b.wallTop, w, h, wall);
  for (let x = x0; x < x1; x += 3) rect(c, x, b.wallTop, 1, h, x % 6 ? shade(wall, 0.9) : mix(wall, '#ffffff', 0.12));
  rect(c, x0 - 2, b.top, w + 4, b.wallTop - b.top + 3, shade(wall, 0.72));
  rect(c, x0 - 2, b.top, w + 4, 1, mix(wall, '#ffffff', 0.4));
  // A band of high windows.
  for (let x = x0 + 14; x < x1 - 30; x += 40) { rect(c, x, b.wallTop + 8, 26, 8, '#2b333a'); rect(c, x + 1, b.wallTop + 9, 24, 6, '#5a6d7c'); }
  // Roller doors with yellow bumpers.
  const doors = Math.max(1, Math.floor((w - 60) / 90));
  for (let i = 0; i < doors; i++) {
    const dx = x0 + 34 + i * 90;
    rect(c, dx - 2, b.floor - 42, 54, 42, '#3d4247');
    rect(c, dx, b.floor - 40, 50, 40, '#7d8388');
    for (let y = b.floor - 38; y < b.floor; y += 4) rect(c, dx, y, 50, 1, '#666c71');
    rect(c, dx - 2, b.floor - 10, 2, 10, YELLOW); rect(c, dx + 50, b.floor - 10, 2, 10, YELLOW);
    rect(c, dx + 14, b.floor - 47, 22, 4, '#f4e9b0');
  }
  const names = ['SYDGODS', 'NORDTRANS', 'HELSINGBORGS LOGISTIK', 'ÖRESUND FRAKT', 'LAGER & FRAKT'];
  const name = names[Math.floor(rand(f.seed, 9) * names.length)];
  if (textWidth(name) + 10 < w) { rect(c, x0 + 12, b.wallTop + 22, textWidth(name) + 8, 11, '#f2efe4'); text(c, name, x0 + 16, b.wallTop + 25, '#1f2f5a'); }
  rect(c, x0, b.floor, w, b.base - b.floor, '#6f7274');
}

/** Shipping containers, stacked up to three high. */
function drawContainers(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b;
  const cols = ['#a83a2e', '#2b5da8', '#3a7d55', '#c47a24', '#8a8f92', '#6b3f7a'];
  const cw = 62, ch = 21;
  for (let x = x0, i = 0; x + cw <= x1; x += cw + 2, i++) {
    const rows = 1 + Math.floor(rand(f.seed, i + 30) * 3);
    for (let r = 0; r < rows; r++) {
      const y = b.floor - (r + 1) * ch, col = cols[Math.floor(rand(f.seed + r * 7, i + 11) * cols.length)];
      rect(c, x, y, cw, ch, shade(col, 0.72));
      rect(c, x + 1, y + 1, cw - 2, ch - 2, col);
      for (let k = x + 4; k < x + cw - 3; k += 4) rect(c, k, y + 2, 1, ch - 4, shade(col, 0.86));
      rect(c, x, y, cw, 2, mix(col, '#ffffff', 0.25));
      rect(c, x + cw - 6, y + 1, 5, ch - 2, shade(col, 0.6));
      rect(c, x + 3, y + 8, 12, 4, mix(col, '#ffffff', 0.55));
    }
  }
  rect(c, x0, b.floor, x1 - x0, b.base - b.floor, '#6f7274');
}

/** The gate of the truck park: posts, a folded-back mesh gate and a sign. */
function drawGate(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  const { x0, x1 } = b, mid = Math.round((x0 + x1) / 2);
  for (const px of [x0 + 6, x1 - 16]) {
    rect(c, px, b.floor - 40, 10, 40, '#8c9092'); rect(c, px, b.floor - 40, 2, 40, '#c0c3c4'); rect(c, px, b.floor - 42, 10, 3, '#5a5e60');
  }
  // Mesh gate leaf, slid aside.
  rect(c, x0 + 16, b.floor - 32, 46, 30, '#2a2f33');
  for (let x = x0 + 18; x < x0 + 62; x += 4) rect(c, x, b.floor - 30, 1, 27, '#7f878c');
  for (let y = b.floor - 30; y < b.floor - 3; y += 4) rect(c, x0 + 16, y, 46, 1, '#7f878c');
  // The sign board over the entrance.
  const label = 'LASTBILSPARKERING', sub = 'ENDAST BEHÖRIGA';
  const sw = Math.max(textWidth(label), textWidth(sub)) + 12;
  rect(c, mid - sw / 2, b.wallTop, sw, 26, '#1c2a44');
  rect(c, mid - sw / 2 + 1, b.wallTop + 1, sw - 2, 24, '#2f5fa8');
  text(c, label, mid - Math.floor(textWidth(label) / 2), b.wallTop + 5, '#f4f4f0');
  text(c, sub, mid - Math.floor(textWidth(sub) / 2), b.wallTop + 15, '#f6c31c');
  rect(c, mid - 2, b.wallTop + 26, 4, 20, '#5a5e60');
  rect(c, x0, b.floor, x1 - x0, b.base - b.floor, '#6f7274');
  void f;
}
