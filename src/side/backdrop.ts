import { FACADE_PX_PER_M, FRONTAGE_Y, HEIGHT, KERB_Y, NEAR_KERB_Y, WIDTH } from './layout';
import { disc, ellipse, mix, noise, pick, poly, rand, rect, rgb, seg, shade, text, textWidth } from './pixel';
import type { Facade, FrontKind, Furniture, Run, SideStreet, Stage, Surface, Tree } from './stage';
import { drawThaeo } from './graffiti';
import { LEVEL2_ROLES, drawLevel2Facade, level2Box } from './level2-art';
import { LEVEL3_ROLES, drawLevel3Facade, level3Box } from './level3-art';

// The static scenery, baked into chunks as the camera approaches. The sky rows stay transparent
// so the distant ridge and the clouds show through.

export const CHUNK = 256;
export const HORIZON = 146;
/** The ridge beyond the street scrolls slower than the street itself. */
export const DISTANT_PARALLAX = 0.35;
const BACK_BASE = 153;
const BACK_SCALE = 0.7;
/** The colour distant things fade towards on a hazy afternoon. */
const HAZE = '#c7d6cc';

// ---------------------------------------------------------------- facades

export interface FacadeBox { x0: number; x1: number; base: number; floor: number; wallTop: number; top: number; k: number; floorH: number }

/** Where a facade sits on screen: its ground line, eaves and the top of its roof. */
export function facadeBox(f: Facade): FacadeBox {
  if (f.role && LEVEL2_ROLES.has(f.role)) return level2Box(f);
  if (f.role && LEVEL3_ROLES.has(f.role)) return level3Box(f);
  const k = f.row === 0 ? 1 : BACK_SCALE;
  const cx = (f.x0 + f.x1) / 2, w = (f.x1 - f.x0) * k;
  const a = f.appearance;
  const base = f.row === 1 ? BACK_BASE
    : a.model === 'terrace' ? FRONTAGE_Y - 4 - f.lift
    : f.role ? FRONTAGE_Y - 2 : FRONTAGE_Y - 2 - Math.round(Math.min(8, f.dist * 0.4));
  const m = FACADE_PX_PER_M * k;
  if (f.role === 'kurir') {
    const floor = base - 3, wallTop = floor - Math.round(6.8 * m);
    return { x0: Math.round(cx - w / 2), x1: Math.round(cx + w / 2), base, floor, wallTop, top: wallTop - 5, k, floorH: Math.round(3.4 * m) };
  }
  if (f.reference) {
    const r = f.reference, floor = base - Math.round(r.basement * m);
    const wallTop = floor - Math.round(r.wallHeight * m);
    return { x0: Math.round(cx - w / 2), x1: Math.round(cx + w / 2), base, floor, wallTop,
      top: wallTop - Math.round(r.roofHeight * m), k, floorH: Math.round(2.9 * m) };
  }
  const plinth = Math.round((a.model === 'marcus' ? 1.1 : 0.45) * m);
  const floorH = Math.round((a.model === 'kiosk' ? 3.1 : 2.9) * m);
  const floors = a.model === 'kiosk' ? 1 : Math.max(1, a.floors);
  const floor = base - plinth;
  const wallTop = floor - floors * floorH;
  const roof = a.roofShape === 'flat' || a.rise === 0 ? 0.35 * m : Math.max(1.4, Math.min(5.2, a.rise * 0.26)) * m;
  return { x0: Math.round(cx - w / 2), x1: Math.round(cx + w / 2), base, floor, wallTop, top: Math.round(wallTop - roof), k, floorH };
}

interface Palette { wall: string; roof: string; material: 'brick' | 'plaster' | 'wood'; trim: string; door: string }
function paletteOf(f: Facade): Palette {
  const a = f.appearance;
  const door = pick(['#3f5d4c', '#2e4a63', '#7a3b2e', '#e9e4d6', '#5a4a3a', '#2d3a40'], rand(f.seed, 53));
  if (f.style === 'garage') return { wall: a.wall, roof: a.roof, material: a.material, trim: '#deded6', door };
  if (a.model !== 'generic') return { wall: a.wall, roof: a.roof, material: a.material, trim: '#efe9dc', door: a.model === 'terrace' ? '#d7dcd6' : '#4a3a30' };
  const r = rand(f.seed, 17), r2 = rand(f.seed, 29);
  const roof = a.roofShape === 'flat' ? '#6a6a68' : pick(['#a25f43', '#8e4a36', '#5f5b56', '#474b50', '#9c6a4c'], rand(f.seed, 41));
  if (a.material === 'brick' || f.style === 'apartment') {
    return { wall: pick(['#c9a96c', '#b8674a', '#d2b981', '#9a5a45'], r), roof, material: 'brick', trim: '#efe9dc', door };
  }
  if (r < 0.55) return { wall: pick(['#e9e1cf', '#efe5c3', '#dcd9d0', '#ead2b6', '#f2eee4', '#d9e0dc'], r2), roof, material: 'plaster', trim: pick(['#f4f1e6', '#3c4a4f', '#f4f1e6'], rand(f.seed, 61)), door };
  const wall = pick(['#8f3d2e', '#e6e3d9', '#e2cd8c', '#8ea2ac', '#c9b79a'], r2);
  return { wall, roof, material: 'wood', trim: '#f4f1e6', door };
}

export function brick(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, color: string, seed: number): void {
  rect(c, x0, y0, w, h, color);
  const mortar = mix(color, '#e8e0d0', 0.35), dark = shade(color, 0.86), light = mix(color, '#fff0d8', 0.12);
  for (let y = y0, row = 0; y < y0 + h; y += 3, row++) {
    rect(c, x0, y + 2, w, 1, mortar);
    for (let x = x0 - (row % 2) * 3; x < x0 + w; x += 6) {
      if (x + 5 > x0 && x + 5 < x0 + w) rect(c, x + 5, y, 1, 2, mortar);
      const r = rand(x * 3 + seed, y);
      if (r > 0.62) { const bx = Math.max(x, x0); rect(c, bx, y, Math.min(x + 5, x0 + w) - bx, 2, r > 0.84 ? dark : light); }
    }
  }
}

export function plaster(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, color: string, seed: number): void {
  rect(c, x0, y0, w, h, color);
  const dark = shade(color, 0.94), light = mix(color, '#ffffff', 0.25);
  for (let i = 0, n = Math.floor(w * h / 14); i < n; i++) {
    rect(c, x0 + Math.floor(rand(seed + i, 3) * w), y0 + Math.floor(rand(seed + i, 7) * h), 1, 1, rand(seed + i, 11) > 0.5 ? dark : light);
  }
}

function boards(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, color: string, vertical: boolean): void {
  rect(c, x0, y0, w, h, color);
  const line = shade(color, 0.8), light = mix(color, '#ffffff', 0.12);
  if (vertical) for (let x = x0 + 3; x < x0 + w; x += 4) { rect(c, x, y0, 1, h, line); rect(c, x - 1, y0, 1, h, light); }
  else for (let y = y0 + 3; y < y0 + h; y += 3) { rect(c, x0, y, w, 1, line); rect(c, x0, y - 1, w, 1, light); }
}

export function windowAt(c: CanvasRenderingContext2D, cx: number, top: number, ww: number, wh: number, frame: string, seed: number, opts: { shutters?: string; cross?: boolean; plain?: boolean; panes?: number } = {}): void {
  const x0 = Math.round(cx - ww / 2), y0 = Math.round(top);
  if (opts.shutters) { rect(c, x0 - 5, y0 - 1, 4, wh + 2, opts.shutters); rect(c, x0 + ww + 1, y0 - 1, 4, wh + 2, opts.shutters); }
  rect(c, x0 - 1, y0 - 1, ww + 2, wh + 2, frame);
  const glass = rand(seed, 5) > 0.85 && !opts.plain ? '#e2a560' : '#3d5263';
  rect(c, x0, y0, ww, wh, glass);
  rect(c, x0, y0 + Math.round(wh * 0.55), ww, wh - Math.round(wh * 0.55), shade(glass, 0.82));
  // Sky reflected in the upper panes.
  for (let i = 0; i < Math.min(ww, wh) - 2; i++) rect(c, x0 + 1 + i, y0 + wh - 3 - i, 1, 1, '#8fb0c4');
  if (!opts.plain && rand(seed, 9) > 0.45) { rect(c, x0, y0, 2, wh, '#e7dcc4'); rect(c, x0 + ww - 2, y0, 2, wh, '#e7dcc4'); }
  const panes = opts.panes ?? 2;
  for (let i = 1; i < panes; i++) rect(c, x0 + Math.round(ww * i / panes), y0, 1, wh, frame);
  if (opts.cross) rect(c, x0, y0 + Math.round(wh * 0.42), ww, 1, frame);
  rect(c, x0 - 2, y0 + wh + 1, ww + 4, 1, shade(frame, 0.7));
}

export function doorAt(c: CanvasRenderingContext2D, cx: number, floor: number, dw: number, dh: number, color: string, frame: string): void {
  const x0 = Math.round(cx - dw / 2);
  rect(c, x0 - 1, floor - dh - 1, dw + 2, dh + 1, frame);
  rect(c, x0, floor - dh, dw, dh, color);
  rect(c, x0 + 2, floor - dh + 3, dw - 4, Math.round(dh * 0.25), '#6f8ea3');
  rect(c, x0 + dw - 3, floor - Math.round(dh * 0.5), 1, 1, '#e8d9a0');
  rect(c, x0 - 3, floor, dw + 6, 2, '#a19d94');
  rect(c, x0 + dw + 2, floor - dh + 2, 2, 2, '#f3e2a2');
}

export function chimney(c: CanvasRenderingContext2D, x: number, roofY: number, h: number, color = '#8e4a3a'): void {
  rect(c, x - 1, roofY - h - 1, 8, 2, '#6b6b6b');
  rect(c, x, roofY - h + 1, 6, h, color);
  rect(c, x, roofY - h + 1, 1, h, shade(color, 0.8));
  for (let y = roofY - h + 3; y < roofY; y += 3) rect(c, x, y, 6, 1, shade(color, 0.85));
}

/** A front elevation: the wall, its roof, windows and door. */
export function drawFacade(c: CanvasRenderingContext2D, f: Facade): void {
  if (f.role && LEVEL2_ROLES.has(f.role)) { drawLevel2Facade(c, f); return; }
  if (f.role && LEVEL3_ROLES.has(f.role)) { drawLevel3Facade(c, f); return; }
  if (f.role === 'kurir') { drawKurirLivs(c, f); return; }
  if (f.reference) { drawReferenceFacade(c, f); return; }
  const b = facadeBox(f), pal = paletteOf(f), a = f.appearance;
  const x0 = b.x0, x1 = b.x1, w = x1 - x0, cx = (x0 + x1) / 2;
  const k = b.k;
  const roofH = b.wallTop - b.top;
  const haze = f.row === 1 ? 0.3 : 0;
  const hz = (color: string) => haze ? mix(color, HAZE, haze) : color;
  const wall = hz(pal.wall), roof = hz(pal.roof), trim = hz(pal.trim);
  const gable = a.roofShape !== 'flat' && a.rise > 0 && !f.eavesFront && a.roofShape !== 'hipped';

  // Roof first, so the wall's top edge sits over the eaves.
  if (a.roofShape === 'flat' || a.rise === 0) {
    rect(c, x0 - 1, b.top, w + 2, roofH + 1, roof);
    rect(c, x0 - 1, b.top, w + 2, 1, mix(roof, '#ffffff', 0.25));
  } else if (!gable) {
    const inset = a.roofShape === 'hipped' ? roofH * 0.9 : Math.max(2, roofH * 0.16);
    poly(c, [[x0 - 3, b.wallTop + 2], [x1 + 3, b.wallTop + 2], [x1 - inset, b.top], [x0 + inset, b.top]], roof);
    for (let y = b.top + 3; y < b.wallTop; y += 3) {
      const t = (y - b.top) / roofH;
      rect(c, Math.round(x0 + inset * (1 - t) - 2 * t), y, Math.round(w - 2 * inset * (1 - t) + 4 * t), 1, shade(roof, 0.84));
    }
    rect(c, Math.round(x0 + inset), b.top, Math.round(w - 2 * inset), 1, mix(roof, '#fff4dc', 0.2));
    rect(c, x0 - 3, b.wallTop + 1, w + 6, 2, shade(roof, 0.62));
  }
  // Walls.
  const wallY = gable ? b.wallTop : b.wallTop + 2;
  const wallH = b.floor - wallY;
  const seed = f.seed;
  if (a.model === 'terrace') {
    const split = b.floor - b.floorH;
    brick(c, x0, wallY, w, split - wallY, wall, seed);
    boards(c, x0, split, w, b.floor - split, hz('#e2e5df'), false);
  } else if (pal.material === 'brick') brick(c, x0, wallY, w, wallH, wall, seed);
  else if (pal.material === 'wood') boards(c, x0, wallY, w, wallH, wall, a.model === 'kiosk' || rand(seed, 71) > 0.5);
  else plaster(c, x0, wallY, w, wallH, wall, seed);
  if (pal.material === 'wood' && a.model === 'generic') { rect(c, x0, wallY, 2, wallH, trim); rect(c, x1 - 2, wallY, 2, wallH, trim); }
  // Gable end, clad in the wall material or dark timber at Marcus A's.
  if (gable) {
    const peak: Array<[number, number]> = [[x0, b.wallTop + 1], [x1, b.wallTop + 1], [cx, b.top + 1]];
    const cladding = a.model === 'marcus' ? hz('#3b4246') : wall;
    poly(c, peak, cladding);
    if (a.model === 'marcus') for (let x = x0 + 3; x < x1; x += 3) {
      const t = Math.abs(x - cx) / (w / 2);
      rect(c, x, Math.round(b.top + 1 + roofH * t), 1, Math.round(roofH * (1 - t)), shade(cladding, 0.75));
    }
    else if (pal.material === 'brick') for (let y = b.top + 4; y < b.wallTop; y += 3) {
      const t = (y - b.top) / roofH;
      rect(c, Math.round(cx - w / 2 * t), y, Math.round(w * t), 1, mix(wall, '#e8e0d0', 0.3));
    }
    seg(c, x0 - 4, b.wallTop + 3, cx, b.top - 1, 3, roof);
    seg(c, cx, b.top - 1, x1 + 4, b.wallTop + 3, 3, roof);
    seg(c, x0 - 4, b.wallTop + 5, cx, b.top + 1, 1, a.model === 'kiosk' ? '#e4e4d5' : shade(roof, 0.6));
    seg(c, cx, b.top + 1, x1 + 4, b.wallTop + 5, 1, a.model === 'kiosk' ? '#e4e4d5' : shade(roof, 0.6));
    const gw = Math.round(5 * k), gh = Math.round(7 * k);
    if (roofH > 16) windowAt(c, cx, b.wallTop - roofH * 0.55, gw, gh, trim, seed + 3, { plain: true });
  }
  // Shade under the eaves and at the left corner; the sun is to the right.
  c.fillStyle = 'rgba(30, 24, 34, 0.18)';
  c.fillRect(x0, wallY, w, 2);
  c.fillRect(x0, wallY, 2, wallH);
  c.fillStyle = 'rgba(255, 244, 214, 0.18)';
  c.fillRect(x1 - 1, wallY, 1, wallH);
  // Plinth.
  const plinthColor = hz(a.model === 'marcus' ? '#7f8588' : '#8f8b83');
  rect(c, x0, b.floor, w, b.base - b.floor, plinthColor);
  rect(c, x0, b.floor, w, 1, shade(plinthColor, 1.12));

  if (a.model === 'kiosk') kioskDetails(c, f, b);
  else if (a.model === 'marcus') marcusDetails(c, f, b);
  else if (a.model === 'terrace') terraceDetails(c, f, b);
  else genericDetails(c, f, b, pal, hz);

  const ww = w;
  if (!gable && a.roofShape !== 'flat' && ww > 60 && (rand(seed, 83) > 0.4 || a.model !== 'generic')) {
    const x = Math.round(x0 + ww * (a.model === 'terrace' ? 0.7 : 0.2 + rand(seed, 89) * 0.55));
    chimney(c, x, Math.round(b.top + roofH * 0.35), Math.round(roofH * 0.45 + 5 * k), hz(a.model === 'terrace' ? '#8c6f4d' : '#8e4a3a'));
  } else if (a.model === 'marcus') {
    chimney(c, Math.round(cx + w * 0.2), Math.round(b.top + roofH * 0.45), Math.round(roofH * 0.5 + 8), '#7a6a52');
  }
}

/** The long gold shopping block: ribbon windows, green fascia and ICA at the marked entrance. */
function drawKurirLivs(c: CanvasRenderingContext2D, f: Facade): void {
  const b = facadeBox(f), x0 = b.x0, x1 = b.x1, w = x1 - x0, door = f.door!;
  const fascia = b.floor - 31, upperTop = b.wallTop + 12, upperH = 19;
  rect(c, x0, b.wallTop, w, b.floor - b.wallTop, '#b9a071');
  for (let x = x0; x < x1; x += 9) {
    rect(c, x, b.wallTop, 1, fascia - b.wallTop, '#8f805e');
    rect(c, x + 1, b.wallTop, 1, fascia - b.wallTop, '#cbbb8b');
  }
  rect(c, x0 - 3, b.top, w + 6, 5, '#59626b');
  rect(c, x0 - 3, b.top, w + 6, 1, '#a3a6a0');
  rect(c, x0 - 2, b.wallTop, w + 4, 2, '#d4c9ab');
  for (let x = x0 + 60; x < x1 - 30; x += 125) {
    rect(c, x, b.top - 8, 7, 8, '#a8aaa3');
    rect(c, x - 2, b.top - 9, 11, 2, '#d1d1c3');
    rect(c, x + 20, b.top - 3, 15, 2, '#98a7ad');
  }
  rect(c, x0, upperTop - 2, w, upperH + 4, '#646563');
  for (let x = x0 + 2, i = 0; x < x1 - 5; x += 11, i++) {
    rect(c, x, upperTop, Math.min(8, x1 - x), upperH, i % 4 === 0 ? '#728d9c' : '#9eb3b7');
    rect(c, x + 1, upperTop + 1, 2, upperH - 2, '#b7c7c5');
    rect(c, x + 7, upperTop, 1, upperH, '#42525d');
  }
  rect(c, x0, fascia, w, 10, '#536f60');
  for (let x = x0; x < x1; x += 13) rect(c, x, fascia, 1, 10, '#344d47');
  rect(c, x0 - 1, fascia + 9, w + 2, 2, '#bdbbad');
  rect(c, x0, fascia + 11, w, b.floor - fascia - 11, '#687774');
  for (let x = x0 + 4; x < x1 - 14; x += 29) {
    rect(c, x, fascia + 12, 25, 17, '#40545a');
    rect(c, x + 1, fascia + 13, 9, 15, '#6e8d97');
    rect(c, x + 12, fascia + 12, 1, 17, '#a8b2ad');
    rect(c, x + 24, fascia + 11, 2, 20, '#bdbdac');
  }
  // ICA's light shutter, red-and-white sign and glazed entrance are kept at the user's arrow.
  rect(c, door - 58, fascia - 1, 113, 9, '#edeade');
  rect(c, door - 8, fascia - 1, 45, 9, '#af3739');
  text(c, 'KURIR LIVS', door - 5, fascia + 2, '#fff1df');
  rect(c, door - 35, fascia - 16, 27, 23, '#e8e7dc');
  text(c, 'ICA', door - 32, fascia - 12, '#bb303f', 2);
  text(c, 'NÄRA', door - 30, fascia + 1, '#aa303d');
  rect(c, door - 56, fascia + 12, 39, 20, '#b6bfba');
  for (let y = fascia + 13; y < b.floor; y += 3) rect(c, door - 56, y, 39, 1, '#939f9b');
  drawThaeo(c, door - 54, fascia + 13, 0.75, '#746c9a');
  rect(c, door - 9, fascia + 11, 18, 23, '#c5c8bd');
  rect(c, door - 7, fascia + 13, 6, 18, '#334b51');
  rect(c, door + 1, fascia + 13, 6, 18, '#425e66');
  rect(c, door - 3, fascia + 23, 1, 4, '#e7e4cb');
  rect(c, door + 2, fascia + 23, 1, 4, '#e7e4cb');
  rect(c, door - 11, b.floor, 22, 2, '#d4d0c0');
  // Flowers and the blue post-service sign beside the entrance.
  rect(c, door + 22, fascia + 16, 27, 17, '#2d4943');
  for (let y = fascia + 20; y < b.floor; y += 5) for (let x = door + 24; x < door + 47; x += 6) {
    rect(c, x, y, 4, 3, '#9d6950'); disc(c, x + 2, y - 1, 3, '#5a8452'); rect(c, x + 1, y - 3, 2, 2, x % 3 ? '#d89ba7' : '#e8d39b');
  }
  rect(c, door + 61, fascia + 1, 16, 6, '#438eaa');
  for (const [at, label] of [[0.61, 'DIREKTEN'], [0.82, 'RINGSTORP PIZZERIA']] as const) {
    const x = x0 + w * at, tw = textWidth(label);
    rect(c, x - tw / 2 - 5, fascia + 1, tw + 10, 7, '#e1dcc9');
    text(c, label, x - tw / 2, fascia + 2, '#344b43');
  }
  rect(c, x0, b.floor + 2, w, b.base - b.floor - 2, '#858a82');
}

type Outline = Array<[number, number]>;
function clipOutline(c: CanvasRenderingContext2D, pts: Outline): void {
  c.beginPath();
  pts.forEach(([x, y], i) => i ? c.lineTo(Math.round(x), Math.round(y)) : c.moveTo(Math.round(x), Math.round(y)));
  c.closePath(); c.clip();
}

/** Individual elevations from the user's aerial views, with no randomized architecture. */
function drawReferenceFacade(c: CanvasRenderingContext2D, f: Facade): void {
  const r = f.reference!, b = facadeBox(f), m = FACADE_PX_PER_M * b.k;
  const hz = (color: string) => f.row ? mix(color, HAZE, 0.3) : color;
  const wall = hz(r.wall), roof = hz(r.roof), trim = hz(r.trim), plinth = hz(r.plinth);
  let left = b.x0, right = b.x1;
  const fullW = right - left, rh = b.wallTop - b.top;
  if (r.wing) {
    const wing = r.wing, w = Math.round(fullW * wing.fraction);
    const x = wing.side === 'left' ? left : right - w;
    const y = b.floor - Math.round(2.4 * m);
    plaster(c, x, y, w, b.floor - y, hz(wing.color), f.seed);
    rect(c, x, b.floor, w, b.base - b.floor, plinth);
    poly(c, [[x - 2, y], [x + w + 2, y], [x + w - 2, y - 5], [x + 2, y - 5]], hz(wing.glazed ? '#c4cbc8' : '#54585b'));
    if (wing.glazed) {
      for (let wx = x + 5; wx < x + w - 5; wx += 10) windowAt(c, wx, y + 4, 6, 15 * b.k, trim, f.seed, { panes: 1, plain: true });
    } else windowAt(c, x + w / 2, y + 9, Math.min(w - 8, 16 * b.k), 9 * b.k, trim, f.seed, { plain: true });
    if (wing.side === 'left') left += w; else right -= w;
  }
  const side = r.roofSide ? Math.round((right - left) * (r.roofSideFraction ?? 0.16)) : 0;
  const sideLeft = left;
  left += side;
  const w = right - left, cx = (left + right) / 2;
  const gable = r.silhouette === 'gable' || r.silhouette === 'mansard-gable';
  const mansard = r.silhouette.startsWith('mansard');
  const shoulder = b.wallTop - rh * 0.64;
  const crown: Outline = mansard
    ? [[left, b.wallTop], [left + w * 0.16, shoulder], [cx, b.top], [right - w * 0.16, shoulder], [right, b.wallTop]]
    : [[left, b.wallTop], [cx, b.top], [right, b.wallTop]];

  const tiled = (outline: Outline, solar = false) => {
    c.save(); clipOutline(c, outline);
    rect(c, sideLeft - 4, b.top - 6, fullW + 8, rh + 10, solar ? hz('#343f50') : roof);
    for (let y = b.top - 4, row = 0; y <= b.wallTop + 3; y += 4, row++) {
      rect(c, sideLeft - 4, y, fullW + 8, 1, solar ? hz('#7e8996') : shade(roof, 0.78));
      for (let x = sideLeft - 4 + (row % 2) * 3; x < right + 4; x += solar ? 9 : 5) {
        rect(c, x, y + 1, 1, 3, solar ? hz('#68778a') : mix(roof, '#f1bd8c', 0.24));
      }
    }
    c.restore();
  };

  if (side) {
    // The narrow side face makes solar panels and side dormers visible without changing house order.
    rect(c, sideLeft, b.wallTop, side, b.floor - b.wallTop, shade(wall, 0.79));
    rect(c, sideLeft, b.floor, side, b.base - b.floor, shade(plinth, 0.85));
    const ridge: Outline = mansard ? crown.slice(0, 3) : crown.slice(0, 2);
    const back: Outline = ridge.map(([x, y]) => [x - side, y - 3]);
    const pitch: Outline = [...back, ...[...ridge].reverse()];
    tiled(pitch);
    if (r.roofSide === 'solar') {
      c.save(); clipOutline(c, pitch);
      tiled([[sideLeft + 3, b.wallTop - 8], [cx - side - 2, b.top + 7], [cx - 5, b.top + 9], [left - 3, b.wallTop - 7]], true);
      c.restore();
    }
    if (r.roofSide === 'dark-dormer') {
      const dx = left + w * 0.12, dy = b.wallTop - rh * 0.47;
      rect(c, dx - 10, dy - 12, 16, 16, hz('#45464a'));
      rect(c, dx - 12, dy - 14, 20, 3, hz('#353a42'));
      windowAt(c, dx - 2, dy - 9, 7, 10, trim, f.seed, { plain: true });
    }
    seg(c, sideLeft - 2, b.wallTop + 1, left, b.wallTop + 3, 2, shade(roof, 0.6));
  }

  if (!gable) {
    const inset = r.silhouette === 'hip' ? w * 0.4 : 4;
    const outline: Outline = mansard
      ? [[left - 3, b.wallTop + 2], [left + 3, shoulder], [left + 10, b.top], [right - 10, b.top], [right - 3, shoulder], [right + 3, b.wallTop + 2]]
      : [[left - 3, b.wallTop + 2], [left + inset, b.top], [right - inset, b.top], [right + 3, b.wallTop + 2]];
    tiled(outline);
    if (r.silhouette === 'hip') {
      seg(c, left + inset, b.top, left + w * 0.16, b.wallTop, 1, mix(roof, '#f7c595', 0.3));
      seg(c, right - inset, b.top, right - w * 0.16, b.wallTop, 1, shade(roof, 0.76));
    }
    if (mansard) seg(c, left + 3, shoulder, right - 3, shoulder, 1, shade(roof, 0.72));
    const ridgeInset = mansard ? 10 : inset;
    seg(c, left + ridgeInset, b.top, right - ridgeInset, b.top, 2, mix(roof, '#f5c598', 0.25));
  }

  const outline: Outline = gable ? [...crown, [right, b.floor], [left, b.floor]]
    : [[left, b.wallTop], [right, b.wallTop], [right, b.floor], [left, b.floor]];
  c.save(); clipOutline(c, outline);
  if (r.material === 'brick') brick(c, left, b.top, w, b.floor - b.top, wall, f.seed);
  else plaster(c, left, b.top, w, b.floor - b.top, wall, f.seed);
  c.restore();
  rect(c, left, b.floor, w, b.base - b.floor, plinth);
  rect(c, left, b.floor, w, 1, mix(plinth, '#ffffff', 0.3));
  if (r.basement > 0.55) for (const x of [0.2, 0.8]) {
    const wx = left + w * x;
    rect(c, wx - 5, b.floor + 3, 10, 5, trim);
    rect(c, wx - 4, b.floor + 4, 8, 3, hz('#4c575a'));
  }
  if (r.quoins) for (let y = b.wallTop + 1, row = 0; y < b.floor - 1; y += 5, row++) {
    const qw = row % 2 ? 3 : 5;
    rect(c, left, y, qw, 4, trim); rect(c, right - qw, y, qw, 4, trim);
  }
  if (r.cornice) rect(c, left, b.wallTop + 2, w, 2, trim);
  if (gable) for (let i = 1; i < crown.length; i++) {
    seg(c, ...crown[i - 1], ...crown[i], 3, roof);
    seg(c, crown[i - 1][0], crown[i - 1][1] + 2, crown[i][0], crown[i][1] + 2, 1, r.cornice || r.quoins ? trim : shade(roof, 0.65));
  }
  else rect(c, left - 3, b.wallTop, w + 6, 3, shade(roof, 0.57));

  for (const [i, win] of r.windows.entries()) {
    const wx = left + w * win.x, ww = Math.round(win.w * m), wh = Math.round(win.h * m);
    const y = Math.round(b.floor - (win.bottom + win.h) * m);
    if (win.bay) {
      rect(c, wx - ww / 2 - 5, y - 4, ww + 10, wh + 10, shade(wall, 0.72));
      rect(c, wx - ww / 2 - 4, y - 3, ww + 8, wh + 9, r.material === 'plaster' ? trim : mix(wall, '#ddaa7a', 0.2));
      rect(c, wx - ww / 2 - 6, y - 5, ww + 12, 2, shade(trim, 0.72));
    }
    windowAt(c, wx, y, ww, wh, trim, f.seed + i, { plain: true, panes: win.panes, cross: win.cross, shutters: win.shutters ? hz(win.shutters) : undefined });
    if (win.balcony) {
      const by = y + wh + 2, bw = ww + 10;
      const railing = hz(win.balcony === 'white' ? '#deddd1' : win.balcony === 'timber' ? '#777364' : '#42494b');
      rect(c, wx - bw / 2, by, bw, 3, hz('#99958a'));
      rect(c, wx - bw / 2, by - 10, bw, 2, railing);
      for (let x = wx - bw / 2; x <= wx + bw / 2; x += 3) rect(c, x, by - 9, 1, 9, railing);
      if (win.balcony === 'timber') for (let y = by - 7; y < by; y += 3) rect(c, wx - bw / 2, y, bw, 1, railing);
    }
  }
  for (const dormer of r.dormers ?? []) {
    const x = left + w * dormer.x, dw = Math.round(dormer.w * m), dh = Math.round(dormer.h * m);
    const y = Math.round(b.wallTop - rh * 0.38 - dh * 0.4);
    rect(c, x - dw / 2 - 3, y - 2, dw + 6, dh + 5, hz(dormer.color));
    if (dormer.arched) {
      poly(c, [[x - dw / 2 - 3, y], [x - dw * 0.35, y - 5], [x, y - 7], [x + dw * 0.35, y - 5], [x + dw / 2 + 3, y]], hz(dormer.color));
    } else poly(c, [[x - dw / 2 - 5, y - 2], [x + dw / 2 + 5, y - 2], [x + dw / 2 + 2, y - 6], [x - dw / 2, y - 6]], shade(roof, 0.67));
    windowAt(c, x, y, dw, dh, trim, f.seed, { plain: true, panes: dw > 23 ? 3 : 2 });
  }
  for (const skylight of r.skylights ?? []) {
    const x = left + w * skylight.x, sw = Math.round(skylight.w * m), sh = Math.round(skylight.h * m);
    const y = Math.round(b.wallTop - rh * 0.42);
    rect(c, x - sw / 2 - 2, y - 2, sw + 4, sh + 4, hz('#9ca6aa'));
    rect(c, x - sw / 2, y, sw, sh, hz('#566d81'));
    seg(c, x - sw / 2 + 1, y + sh - 2, x + sw / 2 - 1, y + 1, 1, hz('#849ca8'));
  }
  if (r.door) {
    const x = left + w * r.door.x;
    doorAt(c, x, b.floor, Math.round(1.05 * m), Math.round(2.1 * m), hz(r.door.color), trim);
    if (r.door.canopy) {
      rect(c, x - 10 * b.k, b.floor - 2.4 * m, 20 * b.k, 2, hz('#6c706d'));
      rect(c, x - 10 * b.k, b.floor - 2.4 * m + 2, 20 * b.k, 1, trim);
    }
    for (let y = b.floor + 2, step = 0; y < b.base; y += 3, step++) rect(c, x - 8 - step, y, 16 + step * 2, 2, hz('#b2b0a4'));
  }
  if (r.chimney) {
    const offset = Math.abs(r.chimney.x - 0.5);
    const slope = r.silhouette === 'hip' ? Math.max(0.12, (offset - 0.1) / 0.4) : gable ? offset * 2 + 0.1 : 0.15;
    chimney(c, Math.round(left + w * r.chimney.x), Math.round(b.top + rh * slope), Math.round(1.3 * m), hz(r.chimney.color));
  }
  // Drainpipes and roof gutters anchor the facade to the ground.
  rect(c, right - 2, b.wallTop + 3, 1, b.base - b.wallTop - 3, hz('#6f7472'));
}

function genericDetails(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox, pal: Palette, hz: (s: string) => string): void {
  const a = f.appearance, k = b.k;
  const x0 = b.x0, w = b.x1 - b.x0;
  const frame = hz(pal.trim === '#3c4a4f' ? '#3c4a4f' : '#efeae0');
  const ww = Math.round(1.2 * FACADE_PX_PER_M * k), wh = Math.round(1.35 * FACADE_PX_PER_M * k);
  if (f.style === 'garage') {
    const gw = Math.min(w - 6, Math.round(2.6 * FACADE_PX_PER_M * k)), gh = Math.round(2.1 * FACADE_PX_PER_M * k);
    const gx = Math.round(x0 + (w - gw) / 2);
    rect(c, gx - 1, b.floor - gh - 1, gw + 2, gh + 1, frame);
    rect(c, gx, b.floor - gh, gw, gh, hz('#c9ccc8'));
    for (let y = b.floor - gh + 2; y < b.floor; y += 3) rect(c, gx, y, gw, 1, hz('#9ea39f'));
    return;
  }
  const floors = Math.max(1, a.floors);
  const cols = Math.max(1, Math.round((w / (FACADE_PX_PER_M * k)) / 3.4));
  const door = f.door !== null && f.row === 0 ? f.door : null;
  const apartment = f.style === 'apartment' || f.style === 'block' || f.style === 'tower';
  for (let floor = 0; floor < floors; floor++) {
    const sill = b.floor - floor * b.floorH - Math.round(0.95 * FACADE_PX_PER_M * k);
    for (let i = 0; i < cols; i++) {
      const cx = x0 + w * (i + 0.5) / cols;
      if (floor === 0 && door !== null && Math.abs(cx - door) < ww) continue;
      windowAt(c, cx, sill - wh, ww, wh, frame, f.seed + floor * 13 + i, { cross: apartment });
      if (apartment && floor > 0 && (i + floor) % 2 === 0) {
        // Balcony: a slab and railing in front of the lower half of the window.
        const bx = Math.round(cx - ww / 2 - 4), by = sill - Math.round(wh * 0.1);
        rect(c, bx, by, ww + 8, 2, hz('#9d9a93'));
        rect(c, bx, by - 8, ww + 8, 1, hz('#4a4f52'));
        for (let x = bx; x <= bx + ww + 8; x += 2) rect(c, x, by - 8, 1, 8, hz('#4a4f52'));
      }
    }
  }
  if (door !== null) doorAt(c, door, b.floor, Math.round(1.0 * FACADE_PX_PER_M), Math.round(2.1 * FACADE_PX_PER_M), pal.door, frame);
}

function kioskDetails(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  // Pale walls, a broad closed shutter under a blue fascia with red lettering, and side glazing.
  const x0 = b.x0, x1 = b.x1, w = x1 - x0;
  const top = b.wallTop + 2;
  rect(c, x0, top, w, 7, '#6f929e');
  rect(c, x0, top + 7, w, 1, '#4f6d78');
  const label = 'SANNAS KIOSK';
  text(c, label, Math.round((x0 + x1) / 2 - textWidth(label) / 2), top + 1, '#c8584a');
  const sx0 = x0 + 7, sx1 = x1 - 7, sy0 = top + 10, sy1 = b.floor - 7;
  rect(c, sx0 - 1, sy0 - 1, sx1 - sx0 + 2, sy1 - sy0 + 2, '#5f6d70');
  rect(c, sx0, sy0, sx1 - sx0, sy1 - sy0, '#b3bdb9');
  for (let y = sy0 + 1; y < sy1; y += 2) rect(c, sx0, y, sx1 - sx0, 1, '#dfe3da');
  const tagScale = Math.min(0.85, (sy1 - sy0 - 1) / 18, (sx1 - sx0 - 6) / 46);
  drawThaeo(c, (sx0 + sx1) / 2 - 23 * tagScale, sy0, tagScale, '#699faa');
  rect(c, sx0 - 2, sy1 + 1, sx1 - sx0 + 4, 2, '#e4e4d5');
  for (const gx of [x0 + 2, x1 - 6]) { rect(c, gx, sy0, 4, sy1 - sy0, '#51646a'); rect(c, gx, sy0, 1, sy1 - sy0, '#8fb0c0'); }
  // A dropped ice-cream sign by the door.
  rect(c, x1 + 3, b.floor - 12, 7, 11, '#f3efe2');
  rect(c, x1 + 4, b.floor - 11, 5, 5, '#e2574c');
  rect(c, x1 + 5, b.floor - 6, 3, 3, '#e8c276');
}

function marcusDetails(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  // Yellow brick over a grey basement, dark shutters, and steps up to the door.
  const x0 = b.x0, w = b.x1 - b.x0;
  const door = f.door ?? (x0 + w * 0.5);
  const ww = 12, wh = 15, sill = b.floor - 9;
  const slots = [0.2, 0.5, 0.8].map(t => x0 + w * t).filter(x => Math.abs(x - door) > 16);
  for (const [i, x] of slots.entries()) windowAt(c, x, sill - wh, ww, wh, '#d8d8c4', f.seed + i, { shutters: '#353b40', cross: true });
  for (const t of [0.27, 0.76]) rect(c, Math.round(x0 + w * t) - 3, b.floor + 3, 6, 5, '#414d50');
  doorAt(c, door, b.floor, 11, 23, '#4a3a30', '#d8d8c4');
  for (let i = 0; i < 3; i++) rect(c, Math.round(door) - 8 + i, b.floor + 1 + i * 3, 16 - i * 2, 3, i % 2 ? '#8d8f8c' : '#a3a5a1');
}

function terraceDetails(c: CanvasRenderingContext2D, f: Facade, b: FacadeBox): void {
  // White cladding below, yellow brick above, white frames and a bin shed in front.
  const x0 = b.x0, w = b.x1 - b.x0;
  const door = f.door ?? (x0 + w * 0.18);
  const upper = b.floor - b.floorH;
  doorAt(c, door, b.floor, 10, 23, '#d7dcd6', '#f1f0e5');
  const other = door < x0 + w / 2 ? x0 + w * 0.68 : x0 + w * 0.3;
  windowAt(c, other, b.floor - 26, Math.min(16, w * 0.3), 14, '#f1f0e5', f.seed + 4, { plain: true });
  for (const t of [0.26, 0.74]) windowAt(c, x0 + w * t, upper - 23, 11, 16, '#f1eee8', f.seed + Math.round(t * 9), { plain: true });
  const shedX = Math.round(door < x0 + w / 2 ? x0 + w * 0.5 : x0 + w * 0.08), shedW = Math.round(w * 0.38);
  rect(c, shedX, b.floor - 10, shedW, 10, '#747b7b');
  for (let y = b.floor - 8; y < b.floor; y += 3) rect(c, shedX, y, shedW, 1, '#a1a8a3');
  if (f.role === 'home') {
    rect(c, Math.round(door) + 7, b.floor - 21, 11, 7, '#f2c14e');
    text(c, '55B', Math.round(door) + 8, b.floor - 20, '#1d2a33');
  }
}

// ---------------------------------------------------------------- trees

const TREE_PALETTES = [
  ['#2f5a37', '#4a7d3f', '#7aa451', '#b3cf6e', '#6d6a62'],
  ['#4a2430', '#6e3440', '#94505a', '#c98a78', '#5f5850'],
  ['#3f6b33', '#5f8f3d', '#8fb553', '#c4dc7c', '#5b4a3c'],
  ['#4d7a38', '#76a24a', '#a4c865', '#d6e690', '#e8e4da'],
  ['#3a6431', '#588a3c', '#86ae50', '#b0cc72', '#5b4636'],
];

function drawTree(c: CanvasRenderingContext2D, t: Tree): void {
  const k = t.row === 0 ? 1 : BACK_SCALE;
  const haze = t.row === 1 ? 0.3 : 0;
  const pal = TREE_PALETTES[t.variant % TREE_PALETTES.length].map(col => haze ? mix(col, HAZE, haze) : col);
  const base = t.row === 0 ? FRONTAGE_Y - 2 - Math.round(Math.min(6, t.dist * 0.25)) : BACK_BASE + 1;
  const x = Math.round(t.x), seed = Math.round(t.x * 7 + t.dist * 13);
  if (t.bush) {
    const r = 4 + rand(seed, 1) * 3;
    disc(c, x, base - r + 1, r, pal[0]);
    disc(c, x + 1, base - r, r * 0.75, pal[1]);
    disc(c, x + 2, base - r - 1, r * 0.4, pal[2]);
    if (t.variant >= 2) for (let i = 0; i < 5; i++) rect(c, x - 3 + Math.round(rand(seed, i) * 6), base - r * 2 + Math.round(rand(i, seed) * r), 1, 1, t.variant === 2 ? '#d77aa0' : '#f0e6c8');
    return;
  }
  const H = Math.max(28, t.height * 0.3 * FACADE_PX_PER_M * k);
  const birch = t.variant === 3;
  const R = Math.max(7, Math.min(30, H * (birch ? 0.24 : 0.32)));
  const cy = base - H + R * 0.95;
  const trunkTop = cy + R * 0.3;
  const tw = Math.max(2, Math.round(3 * k));
  rect(c, x - 1, trunkTop, tw + 1, base - trunkTop + 1, shade(pal[4], 0.7));
  rect(c, x, trunkTop, tw - 1, base - trunkTop + 1, pal[4]);
  if (birch) for (let y = trunkTop + 3; y < base; y += 4 + Math.round(rand(seed, y) * 3)) rect(c, x - 1 + Math.round(rand(y, seed) * 2), y, 2, 1, '#2d2a28');
  seg(c, x, trunkTop + R * 0.4, x + R * 0.5, trunkTop - R * 0.1, 1, pal[4]);
  const blobs: Array<[number, number, number]> = [[0, 0, R * 0.78]];
  for (let i = 0; i < 7; i++) {
    const a = rand(seed, i) * Math.PI * 2, d = rand(seed, i + 20) * R * 0.55;
    blobs.push([Math.cos(a) * d, Math.sin(a) * d * (birch ? 1.3 : 0.8), R * (0.45 + rand(seed, i + 40) * 0.25)]);
  }
  for (const [bx, by, r] of blobs) disc(c, x + bx, cy + by, r, pal[0]);
  for (const [bx, by, r] of blobs) disc(c, x + bx + 1.5, cy + by - 1.5, r * 0.8, pal[1]);
  for (const [bx, by, r] of blobs) if (bx > -R * 0.2 && by < R * 0.2) disc(c, x + bx + 3, cy + by - 3, r * 0.42, pal[2]);
  for (let i = 0; i < 40 * k; i++) {
    const [bx, by, r] = blobs[i % blobs.length];
    const a = rand(seed + i, 3) * Math.PI * 2, d = rand(seed + i, 4) * r * 0.95;
    const px = Math.round(x + bx + Math.cos(a) * d), py = Math.round(cy + by + Math.sin(a) * d);
    rect(c, px, py, 2, 1, Math.cos(a) - Math.sin(a) > 0.3 ? pal[3] : shade(pal[0], 0.82));
  }
  if (t.variant === 4) for (let i = 0; i < 8; i++) rect(c, Math.round(x - R * 0.6 + rand(seed, i + 70) * R * 1.2), Math.round(cy - R * 0.5 + rand(seed, i + 80) * R), 1, 1, '#c8402e');
}

// ---------------------------------------------------------------- garden fronts

function referenceDrive(f: Facade): [number, number] | null {
  if (!f.reference?.drive || f.row !== 0) return null;
  return f.reference.drive === 'left' ? [f.x0 - 27, f.x0 - 3] : [f.x1 + 3, f.x1 + 27];
}

function drawReferenceGarden(c: CanvasRenderingContext2D, f: Facade): void {
  const r = f.reference!, b = facadeBox(f), gate = f.x0 + (f.x1 - f.x0) * r.gate;
  const path = (x0: number, x1: number, y: number) => {
    rect(c, x0, y, x1 - x0, FRONTAGE_Y - y, '#bbb9ac');
    for (let py = y + 3; py < FRONTAGE_Y; py += 5) rect(c, x0, py, x1 - x0, 1, '#a3a59d');
  };
  if (r.front === 'open') path(f.x0 - 12, f.x1 + 12, b.base);
  else path(gate - 6, gate + 6, b.base);
  const drive = referenceDrive(f);
  if (drive) path(drive[0], drive[1], b.base - 8);
}

function drawFront(c: CanvasRenderingContext2D, run: Run<FrontKind>, gaps: Array<[number, number]>, from: number, to: number): void {
  const y = FRONTAGE_Y;
  const x0 = Math.max(Math.floor(run.x0), from), x1 = Math.min(Math.ceil(run.x1), to);
  const open = (x: number) => gaps.some(([a, b]) => x >= a && x < b);
  for (let x = x0; x < x1; x++) {
    if (open(x)) continue;
    switch (run.value) {
      case 'hedge': {
        const h = 12 + Math.round(noise(x * 0.13, 3) * 3 + noise(x * 0.5, 9) * 1.6);
        rect(c, x, y - h, 1, h + 1, '#3f6d39');
        rect(c, x, y - h, 1, 2, rand(x, 5) > 0.5 ? '#7ea85a' : '#5f8f45');
        if (rand(x, 7) > 0.55) rect(c, x, y - h + 3 + Math.floor(rand(x, 8) * (h - 4)), 1, 1, '#2b4d2c');
        if (rand(x, 17) > 0.7) rect(c, x, y - h + 2 + Math.floor(rand(x, 18) * 5), 1, 1, '#8fb866');
        rect(c, x, y - 1, 1, 2, '#2f5530');
        break;
      }
      case 'picket':
        if (x % 4 < 2) { rect(c, x, y - 10, 1, 11, '#efeee6'); rect(c, x, y - 11 + (x % 4), 1, 1, '#efeee6'); }
        if (x % 4 === 1) rect(c, x, y - 10, 1, 11, '#c9c8bf');
        rect(c, x, y - 8, 1, 1, '#d8d6cc'); rect(c, x, y - 3, 1, 1, '#d8d6cc');
        break;
      case 'plank':
        rect(c, x, y - 12, 1, 13, x % 4 === 3 ? '#4a3a2c' : x % 4 === 0 ? '#86684e' : '#6f5440');
        break;
      case 'wall':
        rect(c, x, y - 7, 1, 8, (x + Math.floor((y - 7) / 3)) % 6 === 0 ? '#b6a48c' : '#a0654c');
        rect(c, x, y - 4, 1, 1, '#c6b39a');
        rect(c, x, y - 9, 1, 2, '#c9c6bd');
        break;
      case 'chainlink':
        // Posts every 24 px, with a diamond mesh between them.
        if (x % 24 === 0) rect(c, x, y - 18, 2, 19, '#7a8084');
        if ((x + Math.floor((y - 18) / 3)) % 5 === 0) rect(c, x, y - 17, 1, 1, '#9aa1a5');
        rect(c, x, y - 17 + (x % 6), 1, 1, '#8b9296'); rect(c, x, y - 11 + ((x + 3) % 6), 1, 1, '#8b9296'); rect(c, x, y - 5 + (x % 6), 1, 1, '#8b9296');
        rect(c, x, y - 18, 1, 1, '#6a7074');
        break;
      case 'rendered-wall':
        rect(c, x, y - 9, 1, 10, x % 17 === 0 ? '#c2c3b8' : '#deded2');
        rect(c, x, y - 10, 1, 2, '#a7aaa4');
        break;
      default: break;
    }
  }
  // Occasional tags on solid garden boundaries. Anchor them to the whole run so
  // they join cleanly across cached chunks and stay put when returning to a street.
  const height = run.value === 'plank' ? 12 : run.value === 'rendered-wall' ? 9 : run.value === 'wall' ? 7 : 0;
  if (!height || run.x1 - run.x0 < 62 || rand(run.x0, 137) > (run.value === 'plank' ? 0.78 : 0.42)) return;
  const scale = height / 18, width = scale < 0.6 ? 22 : 46 * scale;
  const tx = [0.28, 0.62, 0.82].map(t => Math.round(run.x0 + (run.x1 - run.x0 - width) * t))
    .find(x => x >= run.x0 + 5 && x + width < run.x1 - 5 && !gaps.some(([a, b]) => x < b + 4 && x + width > a - 4));
  if (tx === undefined || tx + width < from || tx > to) return;
  const paint = run.value === 'plank' ? '#d1c4b7' : pick(['#629398', '#a96b83', '#71698c'], rand(run.x0, 149));
  drawThaeo(c, tx, y - height + 1, scale, paint);
}

function drawGate(c: CanvasRenderingContext2D, x: number, seed: number): void {
  const y = FRONTAGE_Y;
  rect(c, Math.round(x) - 8, y - 12, 2, 13, '#5b5f5c');
  rect(c, Math.round(x) + 6, y - 12, 2, 13, '#5b5f5c');
  if (rand(seed, 3) > 0.35) {
    const mx = Math.round(x) - 15;
    rect(c, mx + 2, y - 10, 1, 11, '#3a3e40');
    const box = pick(['#3f6b4a', '#2a2d30', '#b43b2e', '#e8e6de'], rand(seed, 5));
    rect(c, mx - 1, y - 16, 7, 6, '#14181b');
    rect(c, mx, y - 15, 5, 4, box);
  }
}

// ---------------------------------------------------------------- street furniture

function drawFurniture(c: CanvasRenderingContext2D, f: Furniture): void {
  const x = Math.round(f.x), base = FRONTAGE_Y + 7;
  switch (f.kind) {
    case 'floodlight': {
      const H = 118;
      rect(c, x - 1, base - H, 4, H, '#3f454a');
      rect(c, x, base - H, 1, H, '#8a939a');
      rect(c, x - 2, base - 5, 8, 5, '#2b3034');
      rect(c, x - 10, base - H - 5, 22, 4, '#2d3236');
      for (const dx of [-8, 0, 8]) { rect(c, x + dx - 2, base - H - 2, 6, 3, '#fff3c0'); rect(c, x + dx - 2, base - H - 9, 6, 4, '#1c2024'); }
      break;
    }
    case 'lamp': {
      const H = 76;
      rect(c, x - 1, base - H, 3, H, '#4a5157');
      rect(c, x, base - H, 1, H, '#8a939a');
      rect(c, x - 2, base - 4, 5, 4, '#343a3e');
      seg(c, x, base - H, x - 6, base - H - 4, 2, '#4a5157');
      rect(c, x - 13, base - H - 6, 10, 3, '#2d3236');
      rect(c, x - 12, base - H - 3, 8, 1, '#ffe7a8');
      break;
    }
    case 'sign': {
      const label = f.label ?? '';
      const tw = textWidth(label);
      const [plate, ink] = f.variant === 3 ? ['#2f9a55', '#f6f4ea'] : f.variant === 2 ? ['#f2c14e', '#1d2a33'] : ['#1f4f8f', '#f6f4ea'];
      const H = 28;
      rect(c, x, base - H, 2, H, '#5b646b');
      rect(c, x, base - H, 1, H, '#9aa3a9');
      // A bordered plate, tall enough for the ring over Å and the dots over Ä and Ö.
      const px = x - Math.round(tw / 2) - 4, py = base - H - 13;
      rect(c, px - 1, py - 1, tw + 10, 15, '#10181f');
      rect(c, px, py, tw + 8, 13, plate);
      c.strokeStyle = ink; c.lineWidth = 1;
      c.strokeRect(px + 1.5, py + 1.5, tw + 5, 10);
      text(c, label, px + 4, py + 5, ink);
      break;
    }
    case 'busstop': {
      const H = 36;
      rect(c, x, base - H, 2, H, '#5b646b');
      rect(c, x - 5, base - H - 11, 12, 12, '#10181f');
      rect(c, x - 4, base - H - 10, 10, 10, '#f2c200');
      rect(c, x - 3, base - H - 9, 8, 8, '#1d6b3a');
      text(c, 'H', x - 1, base - H - 7, '#f6f4ea');
      if (f.label) {
        const tw = textWidth(f.label), lx = x + 1 - Math.round(tw / 2);
        rect(c, lx - 3, base - H + 2, tw + 6, 11, '#10181f');
        rect(c, lx - 2, base - H + 3, tw + 4, 9, '#f4f1e6');
        text(c, f.label, lx, base - H + 6, '#1d2a33');
      }
      break;
    }
    case 'shelter': {
      rect(c, x - 22, base - 34, 44, 3, '#3c4247');
      rect(c, x - 21, base - 31, 1, 31, '#2f3438');
      rect(c, x + 20, base - 31, 1, 31, '#2f3438');
      c.fillStyle = 'rgba(176, 214, 226, 0.45)';
      c.fillRect(x - 20, base - 31, 40, 30);
      rect(c, x + 6, base - 28, 12, 20, '#e07a4a');
      rect(c, x + 7, base - 22, 10, 8, '#f5e3b0');
      rect(c, x - 16, base - 9, 18, 2, '#4f7a55');
      break;
    }
    case 'bench':
      rect(c, x - 9, base - 8, 18, 2, '#4f7a55');
      rect(c, x - 9, base - 13, 18, 2, '#4f7a55');
      rect(c, x - 8, base - 6, 1, 6, '#2f3336');
      rect(c, x + 7, base - 6, 1, 6, '#2f3336');
      break;
    case 'bin':
      rect(c, x, base - 6, 1, 6, '#3a4046');
      rect(c, x - 3, base - 14, 7, 8, '#1f3a2c');
      rect(c, x - 2, base - 14, 5, 7, '#3f6b4a');
      rect(c, x - 1, base - 13, 3, 1, '#10181f');
      break;
    case 'postbox':
      rect(c, x, base - 10, 1, 10, '#3a4046');
      rect(c, x - 3, base - 18, 8, 8, '#a07c00');
      rect(c, x - 2, base - 18, 7, 7, '#f2c200');
      rect(c, x - 1, base - 15, 4, 1, '#1b1b1b');
      rect(c, x, base - 13, 2, 1, '#1f5fa8');
      break;
    case 'crossing':
      rect(c, x, base - 26, 1, 26, '#5b646b');
      rect(c, x - 4, base - 35, 9, 9, '#f6f4ea');
      rect(c, x - 3, base - 34, 7, 7, '#2064b0');
      rect(c, x, base - 33, 1, 1, '#f6f4ea'); rect(c, x - 1, base - 32, 3, 1, '#f6f4ea'); rect(c, x - 2, base - 31, 5, 1, '#f6f4ea'); rect(c, x - 3, base - 30, 7, 1, '#f6f4ea');
      rect(c, x, base - 31, 1, 1, '#10181f');
      break;
  }
}

/** A lamp post on the near pavement, between the camera and the action. */
export function drawNearLamp(c: CanvasRenderingContext2D, x: number): void {
  const X = Math.round(x);
  rect(c, X - 2, 30, 5, HEIGHT - 30, '#1b2429');
  rect(c, X + 1, 30, 1, HEIGHT - 30, '#3a4a51');
  rect(c, X - 4, HEIGHT - 14, 9, 14, '#141c20');
  seg(c, X, 32, X + 12, 22, 3, '#1b2429');
  rect(c, X + 8, 16, 18, 6, '#141c20');
  rect(c, X + 10, 22, 14, 1, '#ffe7a8');
}

// ---------------------------------------------------------------- ground, per pixel

function groundPixel(out: Uint8ClampedArray, i: number, r: number, g: number, b: number): void {
  out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
}

interface Column { surface: Surface; farStreet: SideStreet | null; nearStreet: boolean; open: boolean; shopping: boolean }

function bakeGround(stage: Stage, x0: number): ImageData {
  const rows = HEIGHT - HORIZON;
  const image = new ImageData(CHUNK, rows);
  const d = image.data;
  const hazeRGB = rgb(HAZE);
  const shop = stage.facades.find(f => f.role === 'kurir');
  const runAt = <T,>(runs: Run<T>[], x: number) => runs.find(r => x >= r.x0 && x < r.x1)?.value;
  for (let cx = 0; cx < CHUNK; cx++) {
    const x = x0 + cx;
    const front = runAt(stage.fronts, x);
    const col: Column = {
      surface: runAt(stage.surfaces, x) ?? 'road',
      farStreet: stage.sideStreets.find(s => s.far && Math.abs(x - s.x) < s.width / 2 + 3) ?? null,
      nearStreet: stage.sideStreets.some(s => !s.far && Math.abs(x - s.x) < s.width / 2),
      open: front === 'open',
      shopping: !!shop && x >= shop.x0 && x < shop.x1,
    };
    for (let row = 0; row < rows; row++) {
      const y = HORIZON + row;
      const i = (row * CHUNK + cx) * 4;
      const n = rand(x, y) - 0.5;
      const blot = noise(x * 0.05, y * 0.11) - 0.5;
      if (col.shopping && y >= FRONTAGE_Y - 3) {
        // The photograph's cobbled forecourt extends right up to the shopfront,
        // with larger slabs for the pedestrian strip and small stones in the bays.
        const course = Math.floor((y - FRONTAGE_Y) / 3);
        const joint = y < KERB_Y
          ? x % 18 === 0 || (y - FRONTAGE_Y) % 10 === 0
          : (y - KERB_Y) % 3 === 0 || (x + (course % 2) * 3) % 6 === 0;
        const k = joint ? 0.85 : 1;
        groundPixel(d, i, (174 + n * 14 + blot * 10) * k, (174 + n * 14 + blot * 10) * k, (163 + n * 12 + blot * 8) * k);
        continue;
      }
      // Lawns and gardens between the houses, fading into the haze.
      if (y < FRONTAGE_Y) {
        const t = (FRONTAGE_Y - y) / (FRONTAGE_Y - HORIZON);
        const s = col.farStreet;
        const half = s ? s.width / 2 * (1 - 0.62 * t) : 0;
        let r: number, g: number, b: number;
        if (s && Math.abs(x - s.x) < half) { r = 88 + n * 10; g = 92 + n * 10; b = 96 + n * 10; }
        else if (s && Math.abs(x - s.x) < half + 3 - 2 * t) { r = 176 + n * 8; g = 170 + n * 8; b = 158 + n * 8; }
        else {
          const lush = noise(x * 0.02, 5) * 0.6 + noise(x * 0.11, y * 0.3) * 0.4;
          r = 88 + lush * 32 + n * 14 - (col.open ? 4 : 0); g = 134 + lush * 30 + n * 16; b = 62 + lush * 16 + n * 8;
          if (rand(x * 3, y * 7) > 0.985) { r += 60; g += 50; b += 40; }
        }
        const hz = t * 0.45;
        groundPixel(d, i, r + (hazeRGB[0] - r) * hz, g + (hazeRGB[1] - g) * hz, b + (hazeRGB[2] - b) * hz);
        continue;
      }
      if (col.surface === 'yard') {
        // Worn concrete with painted bay lines and oil stains, right down to the near edge.
        const slab = x % 40 === 0 || (y - FRONTAGE_Y) % 24 === 0;
        const stain = noise(x * 0.03 + 7, y * 0.09) > 0.74 ? -14 : 0;
        const v = (128 + n * 12 + blot * 10 + stain) * (slab ? 0.88 : 1);
        groundPixel(d, i, v, v + 1, v - 3);
        continue;
      }
      if (col.surface === 'paved') {
        // Large concrete slabs on the path up to the terrace, with a lawn edge by the camera.
        if (y >= NEAR_KERB_Y + 2) {
          const lush = noise(x * 0.07, y * 0.2);
          groundPixel(d, i, 84 + lush * 26 + n * 14, 132 + lush * 24 + n * 16, 60 + lush * 12 + n * 8);
        } else {
          const joint = x % 24 === 0 || (y - FRONTAGE_Y) % 16 === 0;
          const k = joint ? 0.85 : 1;
          groundPixel(d, i, (186 + n * 10 + blot * 8) * k, (181 + n * 10 + blot * 8) * k, (170 + n * 10 + blot * 8) * k);
        }
        continue;
      }
      if (col.surface === 'path') {
        // A gravel path through the park, with grass on either side.
        if (y < FRONTAGE_Y + 5 || y >= NEAR_KERB_Y + 2) {
          const lush = noise(x * 0.07, y * 0.2);
          groundPixel(d, i, 84 + lush * 26 + n * 14, 132 + lush * 24 + n * 16, 60 + lush * 12 + n * 8);
        } else {
          const p = rand(x * 5, y * 3);
          const k = p > 0.93 ? 0.82 : p < 0.05 ? 1.1 : 1;
          groundPixel(d, i, (190 + n * 14 + blot * 12) * k, (176 + n * 12 + blot * 10) * k, (142 + n * 10 + blot * 8) * k);
        }
        continue;
      }
      const farCut = col.farStreet && Math.abs(x - col.farStreet.x) < col.farStreet.width / 2;
      if (y < KERB_Y) {
        if (farCut) { groundPixel(d, i, 88 + n * 12, 92 + n * 12, 96 + n * 12); continue; }
        // Concrete slabs on the far pavement.
        const joint = (x % 18 === 0) || y === FRONTAGE_Y + 11;
        const k = joint ? 0.86 : 1;
        groundPixel(d, i, (180 + n * 10 + blot * 6) * k, (174 + n * 10 + blot * 6) * k, (162 + n * 10 + blot * 6) * k);
        continue;
      }
      if (y < KERB_Y + 3 && !farCut) {
        const tone = y === KERB_Y ? 198 : y === KERB_Y + 1 ? 158 : 96;
        groundPixel(d, i, tone + n * 8, tone - 1 + n * 8, tone - 6 + n * 8);
        continue;
      }
      if (y < NEAR_KERB_Y || col.nearStreet) {
        // Asphalt, with patches and a sheen towards the far kerb.
        const sheen = Math.max(0, 1 - (y - KERB_Y) / 24) * 6;
        const patch = noise(x * 0.018 + 40, y * 0.06) > 0.72 ? -9 : 0;
        const grit = rand(x * 7, y * 5) > 0.97 ? 22 : 0;
        groundPixel(d, i, 82 + n * 14 + blot * 12 + sheen + patch + grit, 86 + n * 14 + blot * 12 + sheen + patch + grit, 90 + n * 14 + blot * 12 + sheen + patch + grit);
        continue;
      }
      if (y < NEAR_KERB_Y + 3) {
        const tone = y === NEAR_KERB_Y ? 104 : y === NEAR_KERB_Y + 1 ? 178 : 150;
        groundPixel(d, i, tone + n * 8, tone - 1 + n * 8, tone - 6 + n * 8);
        continue;
      }
      const joint = (x % 20 === 0) || y === NEAR_KERB_Y + 11;
      const k = joint ? 0.85 : 1;
      groundPixel(d, i, (160 + n * 10 + blot * 6) * k, (155 + n * 10 + blot * 6) * k, (145 + n * 10 + blot * 6) * k);
    }
  }
  return image;
}

function roadMarkings(c: CanvasRenderingContext2D, stage: Stage, from: number, to: number): void {
  const shop = stage.facades.find(f => f.role === 'kurir');
  if (shop) {
    // White parking bays on the apron, leaving a clear walkway by the doors.
    const start = Math.max(shop.x0 + 16, from - 16), end = Math.min(shop.x1 - 18, to + 16);
    for (let x = shop.x0 + 16 + Math.ceil((start - shop.x0 - 16) / 64) * 64; x < end; x += 64) {
      seg(c, x, 208, x - 16, 255, 1, '#d9d9c9');
      seg(c, x, 208, Math.min(x + 55, shop.x1 - 18), 208, 1, '#d9d9c9');
    }
  }
  for (const run of stage.surfaces) {
    if (run.value !== 'major') continue;
    const x0 = Math.max(run.x0, from), x1 = Math.min(run.x1, to);
    for (let x = Math.ceil(x0 / 44) * 44; x < x1; x += 44) {
      if (stage.crossings.some(cx => Math.abs(cx - x) < 40) || stage.sideStreets.some(s => Math.abs(s.x - x) < s.width / 2)) continue;
      rect(c, x, 220, 24, 2, '#dcd8c8');
      rect(c, x, 222, 24, 1, '#8d8f8c');
    }
  }
  for (const x of stage.crossings) {
    if (x < from - 40 || x > to + 40) continue;
    for (let y = KERB_Y + 5; y < NEAR_KERB_Y - 3; y += 9) {
      rect(c, x - 18, y, 36, 5, '#e6e3d6');
      rect(c, x - 18, y + 5, 36, 1, '#9a9b98');
    }
  }
  // Drains at the kerb and the odd manhole cover.
  for (let x = Math.ceil(from / 96) * 96; x < to; x += 96) {
    if (stage.sideStreets.some(s => Math.abs(s.x - x) < s.width / 2 + 10)) continue;
    const run = stage.surfaces.find(r => x >= r.x0 && x < r.x1);
    if (run?.value === 'path' || run?.value === 'paved') continue;
    rect(c, x, KERB_Y + 3, 9, 3, '#2c2f31');
    for (let k = 1; k < 9; k += 2) rect(c, x + k, KERB_Y + 3, 1, 3, '#6d7072');
    if (rand(x, 21) > 0.55) {
      const my = 206 + Math.round(rand(x, 23) * 34), mx = x + 40;
      ellipse(c, mx, my, 9, 3, '#3e4245');
      ellipse(c, mx, my, 7, 2, '#5b5f61');
      rect(c, mx - 6, my, 12, 1, '#3e4245');
    }
  }
}

// ---------------------------------------------------------------- backdrop

export class Backdrop {
  private readonly chunks = new Map<number, HTMLCanvasElement>();
  private distantStrip: HTMLCanvasElement | null = null;
  readonly items: Array<{ dist: number; x0: number; x1: number; draw: (c: CanvasRenderingContext2D) => void }>;

  constructor(readonly stage: Stage) {
    const facades = stage.facades.map(f => {
      const b = facadeBox(f);
      return { dist: f.dist + (f.row ? 100 : 0), x0: b.x0 - 12, x1: b.x1 + 12, draw: (c: CanvasRenderingContext2D) => drawFacade(c, f) };
    });
    const trees = stage.trees.map(t => ({ dist: t.dist + (t.row ? 100 : 0) - 0.01, x0: t.x - 34, x1: t.x + 34, draw: (c: CanvasRenderingContext2D) => drawTree(c, t) }));
    this.items = [...facades, ...trees].sort((a, b) => b.dist - a.dist);
  }

  has(i: number): boolean { return this.chunks.has(i); }

  chunk(i: number): HTMLCanvasElement {
    let canvas = this.chunks.get(i);
    if (!canvas) { canvas = this.bake(i); this.chunks.set(i, canvas); }
    return canvas;
  }

  private bake(i: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK;
    canvas.height = HEIGHT;
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const x0 = i * CHUNK, x1 = x0 + CHUNK;
    c.putImageData(bakeGround(this.stage, x0), 0, HORIZON);
    c.translate(-x0, 0);
    for (const f of this.stage.facades) if (f.reference && f.row === 0 && f.x1 + 28 > x0 && f.x0 - 28 < x1) drawReferenceGarden(c, f);
    for (const item of this.items) if (item.x1 > x0 && item.x0 < x1) item.draw(c);
    const gaps: Array<[number, number]> = [
      ...this.stage.gates.map(g => [g - 7, g + 7] as [number, number]),
      ...this.stage.facades.map(referenceDrive).filter((d): d is [number, number] => d !== null),
      ...this.stage.sideStreets.filter(s => s.far).map(s => [s.x - s.width / 2 - 3, s.x + s.width / 2 + 3] as [number, number]),
    ];
    for (const run of this.stage.fronts) if (run.x1 > x0 && run.x0 < x1) drawFront(c, run, gaps, x0 - 1, x1 + 1);
    for (const g of this.stage.gates) if (g > x0 - 30 && g < x1 + 30) drawGate(c, g, Math.round(g));
    roadMarkings(c, this.stage, x0 - 50, x1 + 50);
    for (const f of this.stage.furniture) if (!f.near && f.x > x0 - 60 && f.x < x1 + 60) drawFurniture(c, f);
    return canvas;
  }

  /** The ridge, treeline and rooftops beyond the street, for the slow parallax layer. */
  distant(): HTMLCanvasElement {
    if (this.distantStrip) return this.distantStrip;
    const width = Math.ceil(WIDTH + this.stage.length * DISTANT_PARALLAX) + 8;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = HORIZON + 2;
    const c = canvas.getContext('2d')!;
    for (let x = 0; x < width; x++) {
      const ridge = HORIZON - 30 - noise(x * 0.004, 1) * 20 - noise(x * 0.021, 2) * 6;
      rect(c, x, ridge, 1, HORIZON + 2 - ridge, '#a9c2b8');
      rect(c, x, ridge, 1, 1, '#b8cdc2');
    }
    for (let x = 0; x < width;) {
      const w = 18 + Math.round(rand(x, 1) * 26), h = 8 + Math.round(rand(x, 2) * 12);
      if (rand(x, 3) > 0.35) {
        const top = HORIZON - 8 - h;
        rect(c, x, top, w, h + 10, '#aebdb4');
        poly(c, [[x - 2, top + 1], [x + w + 2, top + 1], [x + w / 2, top - 6 - rand(x, 4) * 5]], '#9fb0aa');
        for (let k = 3; k < w - 3; k += 6) rect(c, x + k, top + 4, 2, 2, '#98aba6');
      }
      x += w + 6 + Math.round(rand(x, 5) * 30);
    }
    for (let x = 0; x < width; x++) {
      const top = HORIZON - 9 - noise(x * 0.035, 3) * 11 - noise(x * 0.16, 4) * 4;
      rect(c, x, top, 1, HORIZON + 2 - top, '#8fae98');
      if (rand(x, 6) > 0.6) rect(c, x, top + 1 + Math.floor(rand(x, 7) * 4), 1, 1, '#7c9d86');
      rect(c, x, top, 1, 1, '#a3bea9');
    }
    this.distantStrip = canvas;
    return canvas;
  }
}

/** A dithered afternoon sky: pale blue overhead, warm towards the horizon. */
export function bakeSky(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HORIZON + 4;
  const c = canvas.getContext('2d')!;
  const stops: Array<[number, string]> = [[0, '#6fa6cc'], [0.45, '#9dc6dc'], [0.8, '#d5e0d2'], [1, '#f1dfba']];
  const colour = (t: number) => {
    for (let k = 1; k < stops.length; k++) if (t <= stops[k][0]) return mix(stops[k - 1][1], stops[k][1], (t - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]));
    return stops[stops.length - 1][1];
  };
  for (let y = 0; y < canvas.height; y++) {
    const band = Math.floor(y / 6) * 6;
    const t0 = band / canvas.height, t1 = Math.min(1, (band + 6) / canvas.height);
    const ditherRow = y - band >= 4;
    for (let x = 0; x < WIDTH; x += 1) {
      const next = ditherRow && (x + y) % 2 === 0;
      c.fillStyle = colour(next ? t1 : t0);
      c.fillRect(x, y, 1, 1);
    }
  }
  // The afternoon sun, low over the Sound to the right.
  for (const [r, a] of [[46, 0.08], [30, 0.12], [18, 0.2]] as Array<[number, number]>) {
    c.fillStyle = `rgba(255, 238, 190, ${a})`;
    c.beginPath(); c.arc(430, 58, r, 0, Math.PI * 2); c.fill();
  }
  disc(c, 430, 58, 9, '#fff4d2');
  return canvas;
}

/** A strip of flat-bottomed clouds that tiles horizontally. */
export function bakeClouds(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * 2;
  canvas.height = 110;
  const c = canvas.getContext('2d')!;
  for (let i = 0; i < 7; i++) {
    const cx = 60 + i * 136 + rand(i, 1) * 40, cy = 34 + rand(i, 2) * 50, w = 34 + rand(i, 3) * 40;
    const puffs: Array<[number, number, number]> = [];
    for (let k = 0; k < 6; k++) puffs.push([cx - w / 2 + (k + 0.5) * w / 6, cy - rand(i, k + 5) * 7, 6 + rand(i, k + 12) * 7]);
    for (const [x, y, r] of puffs) disc(c, x, y + 2, r, '#c9d6de');
    for (const [x, y, r] of puffs) disc(c, x, y, r, '#f6f3ea');
    for (const [x, y, r] of puffs) disc(c, x + 2, y - 2, r * 0.55, '#ffffff');
    c.clearRect(cx - w / 2 - 20, cy + 4, w + 40, 40);
    rect(c, cx - w / 2 - 4, cy + 3, w + 8, 1, '#d9e2e6');
  }
  return canvas;
}
