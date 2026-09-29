import { FRONTAGE_Y, HEIGHT, KERB_Y, NEAR_KERB_Y } from './layout';
import { fill, grain, mix, noise, poly, rand, rgrad, vgrad } from './pixel';
import type { Run, SideStreet, Stage, Surface } from './stage';

// The street's ground for smooth mode: the same layout as the pixel version in backdrop.ts (lawns, far pavement, kerbs,
// carriageway, near pavement, plus the forecourt, yard, park path and Home's paved approach), painted as gradients, soft
// mottling, hairline joints and fine grain instead of one noisy pixel at a time.

const HORIZON = 146;
const HAZE = '#c7d6cc';

const LAWN = '#689244', LAWN_DARK = '#4f7a37', LAWN_LIGHT = '#82ad55';
const FAR_PAVING = '#b4aea2', NEAR_PAVING = '#a09b91';
const ASPHALT = '#52565a', ASPHALT_FAR = '#62676b';
const COBBLE = '#aeaea3', SLAB = '#bab5aa', GRAVEL = '#bdb08e', YARD = '#807f7b';

const runAt = <T,>(runs: Run<T>[], x: number): T | undefined => runs.find(r => x >= r.x0 && x < r.x1)?.value;

interface Column {
  surface: Surface;
  far: SideStreet | null;
  nearStreet: boolean;
  shopping: boolean;
}

/** Segments of constant ground type, so each is painted as one piece and the joins are exact. */
function segments(stage: Stage, xa: number, xb: number): Array<{ x0: number; x1: number; col: Column }> {
  const shop = stage.facades.find(f => f.role === 'kurir');
  const describe = (x: number): Column => ({
    surface: runAt(stage.surfaces, x) ?? 'road',
    far: stage.sideStreets.find(s => s.far && Math.abs(x - s.x) < s.width / 2 + 3) ?? null,
    nearStreet: stage.sideStreets.some(s => !s.far && Math.abs(x - s.x) < s.width / 2),
    shopping: !!shop && x >= shop.x0 && x < shop.x1,
  });
  const same = (a: Column, b: Column) => a.surface === b.surface && a.far === b.far && a.nearStreet === b.nearStreet && a.shopping === b.shopping;
  const out: Array<{ x0: number; x1: number; col: Column }> = [];
  let start = xa, current = describe(xa);
  for (let x = xa + 1; x < xb; x++) {
    const next = describe(x);
    if (!same(current, next)) { out.push({ x0: start, x1: x, col: current }); start = x; current = next; }
  }
  out.push({ x0: start, x1: xb, col: current });
  return out;
}

/** Paints the ground rows for world columns [xa, xb) onto a context already translated into world coordinates. */
export function paintGround(c: CanvasRenderingContext2D, stage: Stage, xa: number, xb: number): void {
  const w = xb - xa;
  // Far lawns and gardens fade into the haze towards the horizon.
  fill(c, xa, HORIZON, w, FRONTAGE_Y - HORIZON, vgrad(c, HORIZON, FRONTAGE_Y, [[0, mix(LAWN, HAZE, 0.5)], [1, LAWN]]));

  for (const { x0, x1, col } of segments(stage, xa, xb)) paintSegment(c, stage, x0, x1, col);

  // Side streets leaving away from the camera narrow towards the horizon.
  for (const s of stage.sideStreets) {
    if (!s.far || s.x + s.width < xa - 20 || s.x - s.width > xb + 20) continue;
    const half = s.width / 2, farHalf = half * 0.38;
    poly(c, [[s.x - half - 3, FRONTAGE_Y], [s.x + half + 3, FRONTAGE_Y], [s.x + farHalf + 1, HORIZON], [s.x - farHalf - 1, HORIZON]], FAR_PAVING);
    poly(c, [[s.x - half, FRONTAGE_Y], [s.x + half, FRONTAGE_Y], [s.x + farHalf, HORIZON], [s.x - farHalf, HORIZON]], vgrad(c, HORIZON, FRONTAGE_Y, [[0, mix(ASPHALT_FAR, HAZE, 0.45)], [1, ASPHALT_FAR]]));
    fill(c, s.x - half, FRONTAGE_Y, s.width, KERB_Y - FRONTAGE_Y, ASPHALT_FAR);
  }

  mottle(c, xa, xb);
  grain(c, xa, HORIZON, w, HEIGHT - HORIZON, 0.05);
}

function paintSegment(c: CanvasRenderingContext2D, stage: Stage, x0: number, x1: number, col: Column): void {
  const w = x1 - x0;
  const joints = (y0: number, y1: number, every: number, colour = 'rgba(60, 54, 44, 0.22)') => {
    for (let x = Math.ceil(x0 / every) * every; x < x1; x += every) fill(c, x, y0, 0.45, y1 - y0, colour);
  };
  const rows = (y: number, h: number, colour: string, colour2 = colour) =>
    fill(c, x0, y, w, h, colour === colour2 ? colour : vgrad(c, y, y + h, [[0, colour], [1, colour2]]));

  if (col.shopping) {
    // Cobbled forecourt right up to the shopfront: big slabs by the pavement, small stones in the bays.
    rows(FRONTAGE_Y - 3, KERB_Y - FRONTAGE_Y + 3, COBBLE, mix(COBBLE, '#8d8b80', 0.25));
    joints(FRONTAGE_Y - 3, KERB_Y, 18);
    for (let y = FRONTAGE_Y + 7; y < KERB_Y; y += 10) fill(c, x0, y, w, 0.45, 'rgba(60, 54, 44, 0.2)');
    rows(KERB_Y, NEAR_KERB_Y - KERB_Y, mix(COBBLE, '#77746a', 0.3), mix(COBBLE, '#77746a', 0.45));
    for (let y = KERB_Y; y < NEAR_KERB_Y; y += 3) fill(c, x0, y, w, 0.35, 'rgba(50, 46, 40, 0.16)');
    for (let row = 0, y = KERB_Y; y < NEAR_KERB_Y; y += 3, row++) {
      for (let x = Math.ceil((x0 - (row % 2) * 3) / 6) * 6 + (row % 2) * 3; x < x1; x += 6) fill(c, x, y, 0.35, 3, 'rgba(50, 46, 40, 0.14)');
    }
    nearPavement(c, x0, x1, col);
    return;
  }

  if (col.surface === 'yard') {
    rows(FRONTAGE_Y, HEIGHT - FRONTAGE_Y, YARD, mix(YARD, '#5d5c58', 0.35));
    joints(FRONTAGE_Y, HEIGHT, 40, 'rgba(40, 40, 36, 0.28)');
    for (let y = FRONTAGE_Y; y < HEIGHT; y += 24) fill(c, x0, y, w, 0.5, 'rgba(40, 40, 36, 0.28)');
    return;
  }

  if (col.surface === 'paved') {
    rows(FRONTAGE_Y, NEAR_KERB_Y + 2 - FRONTAGE_Y, SLAB, mix(SLAB, '#95908a', 0.3));
    joints(FRONTAGE_Y, NEAR_KERB_Y + 2, 24);
    for (let y = FRONTAGE_Y; y < NEAR_KERB_Y + 2; y += 16) fill(c, x0, y, w, 0.45, 'rgba(60, 54, 44, 0.22)');
    rows(NEAR_KERB_Y + 2, HEIGHT - NEAR_KERB_Y - 2, LAWN, LAWN_DARK);
    return;
  }

  if (col.surface === 'path') {
    // A gravel path through the park, with grass on either side.
    rows(FRONTAGE_Y, 5, LAWN);
    rows(FRONTAGE_Y + 5, NEAR_KERB_Y + 2 - FRONTAGE_Y - 5, GRAVEL, mix(GRAVEL, '#9a8d6c', 0.4));
    rows(NEAR_KERB_Y + 2, HEIGHT - NEAR_KERB_Y - 2, LAWN, LAWN_DARK);
    return;
  }

  // Far pavement.
  rows(FRONTAGE_Y, KERB_Y - FRONTAGE_Y, FAR_PAVING, mix(FAR_PAVING, '#94908a', 0.35));
  joints(FRONTAGE_Y, KERB_Y, 18);
  fill(c, x0, FRONTAGE_Y + 11, w, 0.45, 'rgba(60, 54, 44, 0.22)');
  // Kerb: a bright top edge, a face, and a shadow cast onto the road.
  fill(c, x0, KERB_Y, w, 1, '#d2cec3');
  fill(c, x0, KERB_Y + 1, w, 1, '#9e9b93');
  fill(c, x0, KERB_Y + 2, w, 1, '#5e5c58');
  // Carriageway, lighter towards the far kerb where the sky sheens off it.
  rows(KERB_Y + 3, NEAR_KERB_Y - KERB_Y - 3, ASPHALT_FAR, ASPHALT);
  fill(c, x0, KERB_Y + 3, w, 5, vgrad(c, KERB_Y + 3, KERB_Y + 8, [[0, 'rgba(20, 20, 24, 0.35)'], [1, 'rgba(20, 20, 24, 0)']]));
  // Near kerb and pavement.
  fill(c, x0, NEAR_KERB_Y, w, 1, '#5e5c58');
  fill(c, x0, NEAR_KERB_Y + 1, w, 1, '#c9c5ba');
  fill(c, x0, NEAR_KERB_Y + 2, w, 1, '#9b988f');
  if (col.nearStreet) rows(NEAR_KERB_Y, HEIGHT - NEAR_KERB_Y, ASPHALT, mix(ASPHALT, '#000000', 0.15));
  else nearPavement(c, x0, x1, col);
  // Cut the far kerb where a side street joins.
  if (col.far) fill(c, x0, FRONTAGE_Y, w, KERB_Y + 3 - FRONTAGE_Y, ASPHALT_FAR);
}

function nearPavement(c: CanvasRenderingContext2D, x0: number, x1: number, col: Column): void {
  if (col.nearStreet) return;
  const w = x1 - x0;
  fill(c, x0, NEAR_KERB_Y + 3, w, HEIGHT - NEAR_KERB_Y - 3, vgrad(c, NEAR_KERB_Y + 3, HEIGHT, [[0, NEAR_PAVING], [1, mix(NEAR_PAVING, '#7c776d', 0.45)]]));
  for (let x = Math.ceil(x0 / 20) * 20; x < x1; x += 20) fill(c, x, NEAR_KERB_Y + 3, 0.45, HEIGHT - NEAR_KERB_Y - 3, 'rgba(60, 54, 44, 0.24)');
  fill(c, x0, NEAR_KERB_Y + 11, w, 0.45, 'rgba(60, 54, 44, 0.24)');
}

/** Broad soft light and dark patches so large flat areas look weathered rather than printed. */
function mottle(c: CanvasRenderingContext2D, xa: number, xb: number): void {
  const CELL_W = 26, CELL_H = 18;
  // A blob is centred up to one cell from its cell's corner and reaches 36 px, so scan that far past the range.
  // Chunks bake overlapping ranges; every blob that touches either must be drawn by both.
  const REACH = 36 + CELL_W;
  for (let cx = Math.floor((xa - REACH) / CELL_W); cx * CELL_W < xb + REACH; cx++) {
    for (let cy = Math.floor(HORIZON / CELL_H); cy * CELL_H < HEIGHT; cy++) {
      const r = rand(cx * 31 + 7, cy * 17 + 3);
      if (r < 0.35) continue;
      const x = cx * CELL_W + rand(cx, cy) * CELL_W, y = cy * CELL_H + rand(cy, cx) * CELL_H;
      const dark = noise(cx * 0.3, cy * 0.4) > 0.5;
      const radius = 14 + rand(cx + 9, cy + 4) * 22;
      const alpha = 0.05 + rand(cx + 1, cy + 1) * 0.06;
      const g = rgrad(c, x, y, radius, [[0, dark ? `rgba(24, 28, 22, ${alpha})` : `rgba(255, 250, 230, ${alpha * 0.9})`], [1, 'rgba(0, 0, 0, 0)']]);
      c.fillStyle = g;
      c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
}
