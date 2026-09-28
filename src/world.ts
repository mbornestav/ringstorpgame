import { ObstacleGrid, orientedCorners, pointInShape, shape, type Rect, type Shape, type Vec2 } from './geometry';
import { appearanceFor, buildingFront, frontagePolygon, type BuildingAppearance } from './buildings';
import {
  CROSSINGS, FOOTPRINTS, MAP_SIZE, POIS, RAILS, ROADS, distanceToPolygon, fromMetres, nearestRoad, surfaceAt,
  type Footprint, type SurfaceKind,
} from './map';

export type PropKind =
  | 'building' | 'tree' | 'bush' | 'car' | 'lamp' | 'bench' | 'bin' | 'sign' | 'crossing' | 'busstop'
  | 'shelter' | 'postbox' | 'fence' | 'hedge';
export type BuildingStyle = 'house' | 'apartment' | 'tower' | 'block' | 'garage' | 'kiosk' | 'church';
export interface Prop {
  kind: PropKind;
  /** Centre of the prop. */
  x: number;
  y: number;
  /** Extents along the prop's own axes. */
  w: number;
  h: number;
  /** Rotation of the prop's axes, normalised into [-45°, 45°) so its +x and +y walls face the camera. */
  angle: number;
  height?: number;
  variant?: number;
  label?: string;
  solid?: boolean;
  style?: BuildingStyle;
  footprint?: Footprint;
  appearance?: BuildingAppearance;
  /** Direction a lamp arm reaches out towards the street. */
  facing?: Vec2;
  /** Set on Home, Marcus A and the kiosk so the renderer can dress them up. */
  role?: 'home' | 'marcus' | 'kiosk';
}
export type EnemySpawn = { kind: 'runner' | 'bruiser' | 'boss'; group: number; pos: Vec2 };

// ---------------------------------------------------------------- mission, in metres east / north

const at = (east: number, north: number) => fromMetres(east, north);

/** Pålsjö kiosk, Johan Banérs gata 35: the valuable package waits on its sunny side. */
export const PACKAGE = at(-189, -102.5);
export const START = at(-184, -107);
/** Marcus A, Långåkersgatan 4: a full patch-up and a checkpoint. */
export const MARCUS_A = at(-110, 44);
/** Home, Ringstorpsvägen 55B. */
export const HOME = at(154.5, 87.5);

const COMMON = [at(-160, -98), at(-146, -62), at(-145, -50)];
const FINAL = [at(64, 76), at(105, 110), at(140, 131), at(165, 127), at(169, 113), at(168, 92), HOME];
export const ROUTES: Record<'direct' | 'marcus', Vec2[]> = {
  direct: [...COMMON, at(-104, -53), at(-65, -32), at(-23, 3), at(15, 37), ...FINAL],
  marcus: [...COMMON, at(-147, -16), at(-156, 17), at(-130, 40), MARCUS_A, at(-80, 71), at(-48, 92), at(7, 45), at(15, 37), ...FINAL],
};

export const DIRECT_GROUP = 0, MARCUS_GROUP = 1, SHARED_GROUP = 2, HOME_GROUP = 3;
export const SPAWNS: EnemySpawn[] = [
  { kind: 'runner', group: -1, pos: at(-153, -84) },
  // Johan Banérs gata, the direct way.
  { kind: 'runner', group: DIRECT_GROUP, pos: at(-95, -51.5) },
  { kind: 'runner', group: DIRECT_GROUP, pos: at(-72, -37.5) },
  { kind: 'bruiser', group: DIRECT_GROUP, pos: at(-40, -12) },
  { kind: 'runner', group: DIRECT_GROUP, pos: at(-56, -23) },
  // Romares väg, Långåkersgatan and Almgatan, the way past Marcus A.
  { kind: 'runner', group: MARCUS_GROUP, pos: at(-152.5, 5) },
  { kind: 'runner', group: MARCUS_GROUP, pos: at(-128, 40.5) },
  { kind: 'runner', group: MARCUS_GROUP, pos: at(-20, 68) },
  // Where both ways meet again on Johan Banérs gata.
  { kind: 'runner', group: SHARED_GROUP, pos: at(60, 73) },
  { kind: 'bruiser', group: SHARED_GROUP, pos: at(100, 106) },
  { kind: 'runner', group: SHARED_GROUP, pos: at(120, 122.5) },
  { kind: 'runner', group: -1, pos: at(30, 49.5) },
];
/** The crew waiting on Ringstorpsvägen, sprung when the courier gets close to home. */
export const HOME_CREW: EnemySpawn[] = [
  { kind: 'boss', group: HOME_GROUP, pos: at(167, 101) },
  { kind: 'runner', group: HOME_GROUP, pos: at(167, 80) },
  { kind: 'runner', group: HOME_GROUP, pos: at(169, 114) },
];
export const HOME_CREW_RANGE = 26;

const keyPoints = [PACKAGE, START, MARCUS_A, HOME, ...ROUTES.direct, ...ROUTES.marcus, ...SPAWNS.map(s => s.pos), ...HOME_CREW.map(s => s.pos)];
export const BOUNDS: Rect = (() => {
  const margin = 18;
  const x0 = Math.max(0, Math.min(...keyPoints.map(p => p.x)) - margin), y0 = Math.max(0, Math.min(...keyPoints.map(p => p.y)) - margin);
  const x1 = Math.min(MAP_SIZE.w, Math.max(...keyPoints.map(p => p.x)) + margin), y1 = Math.min(MAP_SIZE.h, Math.max(...keyPoints.map(p => p.y)) + margin);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
})();
/** Scenery is generated a little beyond the playable area so the view never runs out. */
const SCENERY: Rect = { x: BOUNDS.x - 34, y: BOUNDS.y - 34, w: BOUNDS.w + 68, h: BOUNDS.h + 68 };

// ---------------------------------------------------------------- props

const props: Prop[] = [];
function rand(a: number, b: number): number {
  let h = (Math.imul(Math.round(a * 97) | 0, 374761393) + Math.imul(Math.round(b * 89) | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function normalAngle(angle: number): { angle: number; swap: boolean } {
  let a = angle, swap = false;
  while (a >= Math.PI / 4) { a -= Math.PI / 2; swap = !swap; }
  while (a < -Math.PI / 4) { a += Math.PI / 2; swap = !swap; }
  return { angle: a, swap };
}
/** Adds a box-shaped prop aligned with a direction, choosing the axes that face the camera. */
function place(kind: PropKind, x: number, y: number, along: number, across: number, dirAngle: number, extra: Partial<Prop> = {}): Prop {
  const { angle, swap } = normalAngle(dirAngle);
  const prop: Prop = { kind, x, y, w: swap ? across : along, h: swap ? along : across, angle, ...extra };
  props.push(prop);
  return prop;
}
const inside = (p: Vec2, r: Rect) => p.x > r.x && p.y > r.y && p.x < r.x + r.w && p.y < r.y + r.h;
const tooClose = (p: Vec2, r: number) => keyPoints.some(k => Math.hypot(k.x - p.x, k.y - p.y) < r);

// Buildings, styled from their OpenStreetMap type and size.
function styleOf(f: Footprint): { style: BuildingStyle; height: number } {
  if (f.use === 'kiosk') return { style: 'kiosk', height: 12 };
  if (f.use === 'place_of_worship') return { style: 'church', height: 30 };
  if (f.type === 'garages' || f.area < 32) return { style: 'garage', height: 10 };
  if (f.use === 'school' || f.area > 1400) return { style: 'block', height: 26 };
  if ((f.levels ?? 0) >= 6) return { style: 'tower', height: (f.levels ?? 8) * 9 + 6 };
  if (f.type === 'apartments' || f.area > 320) return { style: 'apartment', height: (f.levels ?? (f.area > 700 ? 4 : 3)) * 11 + 4 };
  return { style: 'house', height: f.area < 95 ? 14 : 20 };
}
const homeFootprint = FOOTPRINTS.find(f => f.address === 'Ringstorpsvägen 55B');
const marcusFootprint = FOOTPRINTS.find(f => f.address === 'Långåkersgatan 4');
for (const f of FOOTPRINTS) {
  if (!inside({ x: f.obb.cx, y: f.obb.cy }, SCENERY)) continue;
  const { style, height } = styleOf(f);
  const role = f === homeFootprint ? 'home' : f === marcusFootprint ? 'marcus' : style === 'kiosk' ? 'kiosk' : undefined;
  const appearance = appearanceFor(f, height);
  props.push({ kind: 'building', x: f.obb.cx, y: f.obb.cy, w: f.obb.w, h: f.obb.h, angle: f.obb.angle, height: appearance.eaves, style, footprint: f, appearance, solid: true, variant: f.id % 997, role });
}
const buildingNear = (p: Vec2, r: number) => FOOTPRINTS.some(f => Math.abs(f.obb.cx - p.x) < 20 && Math.abs(f.obb.cy - p.y) < 20 && distanceToPolygon(p, f.pts) < r);
const groundAt = (p: Vec2): SurfaceKind => surfaceAt(p.x, p.y).kind;

// Street furniture along the carriageways: lamps, parked cars and street-name signs.
function alongRoads(step: number, visit: (p: Vec2, dir: Vec2, road: (typeof ROADS)[number], s: number) => void): void {
  for (const road of ROADS) {
    if (!road.carriage) continue;
    let next = step * 0.5, walked = 0;
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 0.01) continue;
      const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
      for (; next < walked + len; next += step) {
        const t = next - walked;
        visit({ x: a.x + dir.x * t, y: a.y + dir.y * t }, dir, road, next);
      }
      walked += len;
    }
  }
}
let lampSide = 1;
alongRoads(14, (p, dir, road) => {
  if (road.kind === 'service' || !inside(p, SCENERY)) return;
  lampSide = -lampSide;
  const off = road.hw + (road.sidewalk ? road.sidewalk - 0.2 : 0.45);
  const q = { x: p.x - dir.y * off * lampSide, y: p.y + dir.x * off * lampSide };
  if (buildingNear(q, 0.6) || tooClose(q, 1.2)) return;
  const kind = groundAt(q);
  if (kind === 'road') return;
  props.push({ kind: 'lamp', x: q.x, y: q.y, w: 0.2, h: 0.2, angle: 0, height: 28, facing: { x: dir.y * lampSide, y: -dir.x * lampSide } });
});
alongRoads(6.5, (p, dir, road, s) => {
  if (!['residential', 'tertiary'].includes(road.kind) || !inside(p, SCENERY)) return;
  if (rand(p.x, p.y) > (road.kind === 'tertiary' ? 0.16 : 0.3)) return;
  const side = rand(p.y, p.x) > 0.5 ? 1 : -1;
  const off = road.hw - 0.62;
  const q = { x: p.x - dir.y * off * side, y: p.y + dir.x * off * side };
  const clear = [0, 1.3, -1.3].every(k => {
    const probe = { x: q.x + dir.x * k, y: q.y + dir.y * k };
    return surfaceAt(probe.x, probe.y).roads <= 1 && surfaceAt(probe.x, probe.y).kind === 'road';
  });
  if (!clear || tooClose(q, 3.2) || s < 3 || CROSSINGS.some(c => Math.hypot(c.x - q.x, c.y - q.y) < 4)) return;
  place('car', q.x, q.y, 2.2, 1.0, Math.atan2(dir.y, dir.x) + (side > 0 ? 0 : Math.PI), { solid: true, height: 12, variant: Math.floor(rand(q.x + 3, q.y) * 5) });
});
// One name sign where each named street meets another, placed on a corner.
const signed: Array<{ name: string; p: Vec2 }> = [];
for (const road of ROADS) {
  if (!road.name || !road.carriage || road.kind === 'service') continue;
  for (const end of [0, road.pts.length - 1]) {
    const p = road.pts[end], q = road.pts[end === 0 ? 1 : end - 1];
    if (!inside(p, BOUNDS)) continue;
    const meets = ROADS.some(o => o !== road && o.carriage && o.name !== road.name && o.pts.some(v => Math.hypot(v.x - p.x, v.y - p.y) < 2.5));
    if (!meets || signed.some(s => s.name === road.name && Math.hypot(s.p.x - p.x, s.p.y - p.y) < 40)) continue;
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const dir = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    const off = road.hw + road.sidewalk + 0.5;
    for (const side of [1, -1]) {
      const s = { x: p.x + dir.x * 3.2 - dir.y * off * side, y: p.y + dir.y * 3.2 + dir.x * off * side };
      if (buildingNear(s, 0.5) || groundAt(s) === 'road' || tooClose(s, 1)) continue;
      props.push({ kind: 'sign', x: s.x, y: s.y, w: 0.2, h: 0.2, angle: 0, height: 20, label: road.name.toUpperCase() });
      signed.push({ name: road.name, p });
      break;
    }
  }
}
// Bus stops, shelters, benches, bins and the post box from the map.
for (const poi of POIS) {
  if (!inside(poi, SCENERY)) continue;
  const road = nearestRoad(poi.x, poi.y);
  const outward = road ? { x: poi.x - road.x, y: poi.y - road.y } : { x: 0, y: 1 };
  const olen = Math.hypot(outward.x, outward.y) || 1;
  const side = { x: outward.x / olen, y: outward.y / olen };
  const edge = (extra: number) => road ? { x: road.x + side.x * (road.road.hw + road.road.sidewalk + extra), y: road.y + side.y * (road.road.hw + road.road.sidewalk + extra) } : poi;
  const dirAngle = road ? Math.atan2(road.dir.y, road.dir.x) : 0;
  if (poi.kind === 'bus_stop') { const q = edge(0.35); props.push({ kind: 'busstop', x: q.x, y: q.y, w: 0.2, h: 0.2, angle: 0, height: 24, label: poi.name?.replace('Helsingborg ', '').toUpperCase() }); }
  else if (poi.kind === 'shelter') { const q = edge(0.9); place('shelter', q.x, q.y, 2.2, 0.7, dirAngle, { solid: true, height: 15 }); }
  else if (poi.kind === 'bench') { const q = groundAt(poi) === 'road' ? edge(0.5) : poi; place('bench', q.x, q.y, 1.2, 0.45, dirAngle, { solid: true, height: 8 }); }
  else if (poi.kind === 'bin') props.push({ kind: 'bin', x: poi.x, y: poi.y, w: 0.3, h: 0.3, angle: 0, height: 7 });
  else if (poi.kind === 'postbox') props.push({ kind: 'postbox', x: poi.x, y: poi.y, w: 0.25, h: 0.25, angle: 0, height: 14 });
}
for (const c of CROSSINGS) {
  const road = nearestRoad(c.x, c.y);
  if (!road || road.d > 2 || !inside(c, SCENERY)) continue;
  for (const side of [1, -1]) {
    const off = road.road.hw + road.road.sidewalk * 0.6 + 0.2;
    const q = { x: road.x - road.dir.y * off * side + road.dir.x * 1.4 * side, y: road.y + road.dir.x * off * side + road.dir.y * 1.4 * side };
    if (!buildingNear(q, 0.4)) props.push({ kind: 'crossing', x: q.x, y: q.y, w: 0.15, h: 0.15, angle: 0, height: 19 });
  }
}
// Mission dressing: the Marcus A sign by the gate and the house number at home.
/** A sign between the door and the street, a little along the pavement so it doesn't hide the doorway. */
function gateSign(door: Vec2, label: string, variant: number): void {
  const road = nearestRoad(door.x, door.y);
  const at = road ? { x: (door.x + road.x) / 2 + road.dir.x * 1.2, y: (door.y + road.y) / 2 + road.dir.y * 1.2 } : door;
  props.push({ kind: 'sign', x: at.x, y: at.y, w: 0.2, h: 0.2, angle: 0, height: 16, variant, label });
}
gateSign(MARCUS_A, 'MARCUS A', 3);
gateSign(HOME, 'HEM 55B', 2);

// Fences keep the courier off the railway through the cutting.
for (const line of RAILS) {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    for (let t = 1; t < len; t += 2) {
      for (const side of [1, -1]) {
        const q = { x: a.x + dir.x * t - dir.y * 2.3 * side, y: a.y + dir.y * t + dir.x * 2.3 * side };
        if (!inside(q, SCENERY) || groundAt(q) === 'road' || groundAt(q) === 'footway') continue;
        place('fence', q.x, q.y, 2.02, 0.12, Math.atan2(dir.y, dir.x), { solid: true, height: 9 });
      }
    }
  }
}

// Trees: dense beech wood in Pålsjö skog, garden trees among the villas, a few in the parks.
const TREE_DENSITY: Partial<Record<SurfaceKind, [number, number]>> = { forest: [2.05, 0.88], lawn: [4.4, 0.34], grass: [5, 0.22], park: [4.2, 0.4], allotments: [5, 0.15], school: [6, 0.12] };
for (const [kind, [spacing]] of Object.entries(TREE_DENSITY) as Array<[SurfaceKind, [number, number]]>) {
  for (let gy = SCENERY.y; gy < SCENERY.y + SCENERY.h; gy += spacing) {
    for (let gx = SCENERY.x; gx < SCENERY.x + SCENERY.w; gx += spacing) {
      const p = { x: gx + (rand(gx, gy) - 0.5) * spacing * 0.8, y: gy + (rand(gy, gx + 1) - 0.5) * spacing * 0.8 };
      if (groundAt(p) !== kind || rand(p.x + 7, p.y) > TREE_DENSITY[kind]![1]) continue;
      const clear = [[0, 0], [1.1, 0], [-1.1, 0], [0, 1.1], [0, -1.1]].every(([dx, dy]) => { const k = groundAt({ x: p.x + dx, y: p.y + dy }); return k !== 'road' && k !== 'walk' && k !== 'curb' && k !== 'footway' && k !== 'rail' && k !== 'path'; });
      if (!clear || buildingNear(p, 1.4) || tooClose(p, 2.6)) continue;
      const forest = kind === 'forest';
      const r = rand(p.y + 5, p.x);
      const variant = forest ? (r < 0.78 ? 0 : r < 0.88 ? 3 : 1) : r < 0.3 ? 4 : r < 0.5 ? 2 : r < 0.62 ? 1 : r < 0.78 ? 3 : 0;
      props.push({ kind: 'tree', x: p.x, y: p.y, w: 0.5, h: 0.5, angle: 0, height: forest ? (variant === 3 ? 26 : 34 + Math.floor(r * 4) * 4) : variant === 4 ? 17 : 22 + Math.floor(r * 3) * 3, variant, solid: true });
    }
  }
}
for (let gy = SCENERY.y; gy < SCENERY.y + SCENERY.h; gy += 3.1) {
  for (let gx = SCENERY.x; gx < SCENERY.x + SCENERY.w; gx += 3.1) {
    const p = { x: gx + (rand(gx + 11, gy) - 0.5) * 2.4, y: gy + (rand(gy + 11, gx) - 0.5) * 2.4 };
    if (rand(p.x, p.y + 13) > 0.3 || groundAt(p) !== 'lawn' || buildingNear(p, 0.5) || tooClose(p, 1.5)) continue;
    const d = FOOTPRINTS.find(f => Math.abs(f.obb.cx - p.x) < 12 && Math.abs(f.obb.cy - p.y) < 12 && distanceToPolygon(p, f.pts) < 2.2);
    if (!d && rand(p.y, p.x + 3) > 0.35) continue;
    props.push({ kind: 'bush', x: p.x, y: p.y, w: 0.6, h: 0.6, angle: 0, height: 6, variant: Math.floor(rand(p.x, p.y + 1) * 4) });
  }
}

/** The reference kiosk has an open asphalt forecourt, with no trees growing in its approach. */
const kioskProp = props.find(p => p.role === 'kiosk')!;
export const KIOSK_FORECOURT = shape(frontagePolygon(buildingFront(kioskProp.footprint!, PACKAGE), 5, 1.3));
export const PROPS = props.filter(p => !(['tree', 'bush'].includes(p.kind) && pointInShape(p, KIOSK_FORECOURT, 0.5)));

// ---------------------------------------------------------------- collision

export function propCorners(p: Prop): Vec2[] {
  return orientedCorners(p.x, p.y, p.w, p.h, p.angle);
}
const shapes: Shape[] = PROPS.filter(p => p.solid).map(p => {
  if (p.kind === 'building' && p.footprint) return shape(p.footprint.pts);
  if (p.kind === 'tree') return shape(orientedCorners(p.x, p.y, 0.5, 0.5, 0));
  return shape(propCorners(p));
});
export const OBSTACLES = new ObstacleGrid(shapes);
