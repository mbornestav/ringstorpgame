import raw from './map-data.json';
import type { Vec2 } from './geometry';

interface MapData {
  attribution: string;
  size: [number, number];
  transform: { lat0: number; lon0: number; kx: number; ky: number; metresPerUnit: number; azimuth: number; ox: number; oy: number };
  roads: Array<{ k: string; p: number[][]; n?: string; sw?: string }>;
  buildings: Array<{ id: number; t: string; p: number[][]; lv?: number; a?: string; use?: string }>;
  areas: Array<{ k: string; p: number[][] }>;
  rails: number[][][];
  pois: Array<{ k: string; p: number[]; n?: string }>;
}
const data = raw as unknown as MapData;

// Street geometry for Pålsjö and Ringstorp, generated from OpenStreetMap by scripts/build-map.mjs.
// World units are 2 m; the map is rotated so the camera looks east-north-east.

export const MAP_ATTRIBUTION = data.attribution;
export const MAP_SIZE = { w: data.size[0], h: data.size[1] };
export const METRES_PER_UNIT = data.transform.metresPerUnit;

export type AreaKind = 'forest' | 'grass' | 'park' | 'playground' | 'pitch' | 'parking' | 'school' | 'allotments';
export type SurfaceKind = 'road' | 'curb' | 'walk' | 'footway' | 'path' | 'rail' | 'lawn' | AreaKind;

/** Converts metres east / north of the survey origin into world units. */
export function fromMetres(east: number, north: number): Vec2 {
  const t = data.transform;
  const su = Math.sin(t.azimuth), cu = Math.cos(t.azimuth);
  const up = east * su + north * cu, right = east * cu - north * su;
  return { x: (right - up) / Math.SQRT2 / t.metresPerUnit - t.ox, y: (-right - up) / Math.SQRT2 / t.metresPerUnit - t.oy };
}
export function fromLatLon(lat: number, lon: number): Vec2 {
  const t = data.transform;
  return fromMetres((lon - t.lon0) * t.kx, (lat - t.lat0) * t.ky);
}

// ---------------------------------------------------------------- roads

interface RoadStyle { hw: number; sidewalk: number; carriage: boolean }
const STYLES: Record<string, RoadStyle> = {
  secondary: { hw: 2.25, sidewalk: 1.2, carriage: true },
  tertiary: { hw: 1.9, sidewalk: 1.1, carriage: true },
  residential: { hw: 1.4, sidewalk: 0, carriage: true },
  unclassified: { hw: 1.4, sidewalk: 0, carriage: true },
  living_street: { hw: 1.25, sidewalk: 0, carriage: true },
  service: { hw: 0.9, sidewalk: 0, carriage: true },
  pedestrian: { hw: 0.9, sidewalk: 0, carriage: false },
  footway: { hw: 0.55, sidewalk: 0, carriage: false },
  cycleway: { hw: 0.65, sidewalk: 0, carriage: false },
  steps: { hw: 0.55, sidewalk: 0, carriage: false },
  path: { hw: 0.4, sidewalk: 0, carriage: false },
  track: { hw: 0.8, sidewalk: 0, carriage: false },
};

export interface Road { id: number; kind: string; name?: string; pts: Vec2[]; hw: number; sidewalk: number; carriage: boolean; length: number }
export interface Segment { road: Road; ax: number; ay: number; bx: number; by: number; len: number; start: number; reach: number }

export const ROADS: Road[] = data.roads.map((r, id) => {
  const style = STYLES[r.k] ?? STYLES.path;
  const pts = r.p.map(([x, y]) => ({ x, y }));
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const sidewalk = style.sidewalk || (r.sw ? 0.9 : 0);
  return { id, kind: r.k, name: r.n, pts, hw: style.hw, sidewalk, carriage: style.carriage, length };
});
export const RAILS: Vec2[][] = data.rails.map(line => line.map(([x, y]) => ({ x, y })));

const CELL = 4;
const cols = Math.ceil(MAP_SIZE.w / CELL) + 1, rows = Math.ceil(MAP_SIZE.h / CELL) + 1;
const grid: Segment[][] = Array.from({ length: cols * rows }, () => []);
const railGrid: Segment[][] = Array.from({ length: cols * rows }, () => []);
function index(segment: Segment, target: Segment[][]): void {
  const r = segment.reach;
  const x0 = Math.max(0, Math.floor((Math.min(segment.ax, segment.bx) - r) / CELL)), x1 = Math.min(cols - 1, Math.floor((Math.max(segment.ax, segment.bx) + r) / CELL));
  const y0 = Math.max(0, Math.floor((Math.min(segment.ay, segment.by) - r) / CELL)), y1 = Math.min(rows - 1, Math.floor((Math.max(segment.ay, segment.by) + r) / CELL));
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) target[gy * cols + gx].push(segment);
}
for (const road of ROADS) {
  let start = 0;
  for (let i = 1; i < road.pts.length; i++) {
    const a = road.pts[i - 1], b = road.pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > 0.001) index({ road, ax: a.x, ay: a.y, bx: b.x, by: b.y, len, start, reach: road.hw + road.sidewalk + 0.2 }, grid);
    start += len;
  }
}
const railRoad: Road = { id: -1, kind: 'rail', pts: [], hw: 1.7, sidewalk: 0, carriage: false, length: 0 };
for (const line of RAILS) {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    index({ road: railRoad, ax: a.x, ay: a.y, bx: b.x, by: b.y, len: Math.hypot(b.x - a.x, b.y - a.y), start: 0, reach: 2 }, railGrid);
  }
}

export function segmentsNear(x: number, y: number): Segment[] {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return [];
  return grid[gy * cols + gx];
}

// ---------------------------------------------------------------- land use raster

const AREA_CODES: AreaKind[] = ['forest', 'grass', 'park', 'playground', 'pitch', 'parking', 'school', 'allotments'];
const RES = 2; // raster cells per world unit
const aw = Math.ceil(MAP_SIZE.w * RES), ah = Math.ceil(MAP_SIZE.h * RES);
const areaRaster = new Uint8Array(aw * ah);
function fillPolygon(pts: Vec2[], code: number): void {
  const ys = pts.map(p => p.y);
  const y0 = Math.max(0, Math.floor(Math.min(...ys) * RES)), y1 = Math.min(ah - 1, Math.ceil(Math.max(...ys) * RES));
  for (let row = y0; row <= y1; row++) {
    const y = (row + 0.5) / RES;
    const xs: number[] = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > y) !== (b.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.round(xs[k] * RES)), c1 = Math.min(aw - 1, Math.round(xs[k + 1] * RES));
      areaRaster.fill(code, row * aw + c0, row * aw + c1 + 1);
    }
  }
}
// Large areas first so parks, pitches and playgrounds inside a forest or school stay visible.
const polygonArea = (pts: Vec2[]) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
for (const a of data.areas.map(a => ({ k: a.k as AreaKind, pts: a.p.map(([x, y]) => ({ x, y })) })).sort((p, q) => polygonArea(q.pts) - polygonArea(p.pts))) {
  fillPolygon(a.pts, AREA_CODES.indexOf(a.k) + 1);
}
export function areaAt(x: number, y: number): AreaKind | null {
  const cx = Math.floor(x * RES), cy = Math.floor(y * RES);
  if (cx < 0 || cy < 0 || cx >= aw || cy >= ah) return null;
  const code = areaRaster[cy * aw + cx];
  return code ? AREA_CODES[code - 1] : null;
}

// ---------------------------------------------------------------- surface queries

/** Result of surfaceAt, reused to avoid allocation in the per-pixel ground pass. */
export const surface = { kind: 'lawn' as SurfaceKind, road: null as Road | null, offset: 0, along: 0, roads: 0 };

/** What the ground looks like at a world point: carriageway, kerb, pavement, path, track or land use. */
export function surfaceAt(x: number, y: number): typeof surface {
  let best = Infinity, bestSeg: Segment | null = null, bestT = 0, bestSigned = 0;
  let walk = false, curb = false, foot: Road | null = null, carriages = 0, lastRoad = -1;
  for (const s of segmentsNear(x, y)) {
    const dx = s.bx - s.ax, dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / (s.len * s.len)));
    const px = s.ax + dx * t - x, py = s.ay + dy * t - y;
    const d = Math.hypot(px, py);
    const road = s.road;
    if (road.carriage) {
      if (d < road.hw) {
        if (road.id !== lastRoad) { carriages++; lastRoad = road.id; }
        if (d < best) { best = d; bestSeg = s; bestT = t; bestSigned = (dx * (y - s.ay) - dy * (x - s.ax)) / s.len; }
      } else if (road.sidewalk > 0) {
        if (d < road.hw + 0.12) curb = true;
        else if (d < road.hw + road.sidewalk) walk = true;
      }
    } else if (d < road.hw && !foot) foot = road;
  }
  surface.roads = carriages;
  if (bestSeg) {
    surface.kind = 'road'; surface.road = bestSeg.road; surface.offset = bestSigned; surface.along = bestSeg.start + bestT * bestSeg.len;
    return surface;
  }
  surface.road = null;
  if (curb) { surface.kind = 'curb'; return surface; }
  if (walk) { surface.kind = 'walk'; return surface; }
  if (foot) { surface.kind = foot.kind === 'path' || foot.kind === 'track' ? 'path' : 'footway'; surface.road = foot; return surface; }
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) {
    for (const s of railGrid[gy * cols + gx]) {
      const dx = s.bx - s.ax, dy = s.by - s.ay;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / (s.len * s.len)));
      const d = Math.hypot(s.ax + dx * t - x, s.ay + dy * t - y);
      if (d < 1.7) {
        surface.kind = 'rail';
        surface.offset = (dx * (y - s.ay) - dy * (x - s.ax)) / s.len;
        surface.along = t * s.len + s.ax * 0.37 + s.ay * 0.61;
        return surface;
      }
    }
  }
  surface.kind = areaAt(x, y) ?? 'lawn';
  return surface;
}

/** Nearest point on any carriageway, with the road direction there. */
export function nearestRoad(x: number, y: number, carriageOnly = true): { x: number; y: number; dir: Vec2; road: Road; d: number } | null {
  let best: { x: number; y: number; dir: Vec2; road: Road; d: number } | null = null;
  for (const road of ROADS) {
    if (carriageOnly && !road.carriage) continue;
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i];
      const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
      const px = a.x + dx * t, py = a.y + dy * t, d = Math.hypot(px - x, py - y);
      if (!best || d < best.d) { const l = Math.sqrt(len2); best = { x: px, y: py, dir: { x: dx / l, y: dy / l }, road, d }; }
    }
  }
  return best;
}

// ---------------------------------------------------------------- buildings

export interface Footprint {
  id: number;
  type: string;
  levels?: number;
  address?: string;
  use?: string;
  pts: Vec2[];
  /** Floor area in square metres. */
  area: number;
  /** Oriented bounding box: centre, extents and angle normalised into [-45°, 45°). */
  obb: { cx: number; cy: number; w: number; h: number; angle: number };
  /** How well the footprint fills its bounding box; boxy footprints get pitched roofs. */
  fill: number;
}

function convexHull(points: Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [], upper: Vec2[] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function orientedBox(pts: Vec2[]): Footprint['obb'] {
  const hull = convexHull(pts);
  let best = { area: Infinity, cx: 0, cy: 0, w: 0, h: 0, angle: 0 };
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const c = Math.cos(angle), s = Math.sin(angle);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of hull) { const u = p.x * c + p.y * s, v = -p.x * s + p.y * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0);
    if (area < best.area) {
      const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      best = { area, cx: um * c - vm * s, cy: um * s + vm * c, w: u1 - u0, h: v1 - v0, angle };
    }
  }
  let { w, h, angle } = best;
  while (angle >= Math.PI / 4) { angle -= Math.PI / 2; [w, h] = [h, w]; }
  while (angle < -Math.PI / 4) { angle += Math.PI / 2; [w, h] = [h, w]; }
  return { cx: best.cx, cy: best.cy, w, h, angle };
}

export const FOOTPRINTS: Footprint[] = data.buildings.map(b => {
  const pts = b.p.map(([x, y]) => ({ x, y }));
  const obb = orientedBox(pts);
  const area = polygonArea(pts);
  return {
    id: b.id, type: b.t, levels: b.lv, address: b.a, use: b.use,
    pts, area: area * METRES_PER_UNIT ** 2, obb, fill: area / Math.max(0.01, obb.w * obb.h),
  };
});

export function distanceToPolygon(p: Vec2, pts: Vec2[]): number {
  let inside = false, best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x)) inside = !inside;
    const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    best = Math.min(best, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
  }
  return inside ? -best : best;
}

export const CROSSINGS: Vec2[] = data.pois.filter(p => p.k === 'crossing').map(p => ({ x: p.p[0], y: p.p[1] }));
export const POIS = data.pois.map(p => ({ kind: p.k, x: p.p[0], y: p.p[1], name: p.n }));
