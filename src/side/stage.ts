import { appearanceFor, buildingFront, type BuildingAppearance } from '../buildings';
import { KURIR_BUILDING_ID, KURIR_FORK, KURIR_STOP, ROUTES, viaMarcus, viaKurir, type Route, type JunctionId } from './routes';
import type { Vec2 } from '../geometry';
import { CROSSINGS, FOOTPRINTS, METRES_PER_UNIT, ROADS, areaAt, fromMetres, nearestRoad, type Footprint } from '../map';
import {
  DIRECT_GROUP, HOME, HOME_CREW, MARCUS_A, MARCUS_GROUP, PACKAGE, PROPS, SHARED_GROUP, SPAWNS,
  type BuildingStyle, type Prop,
} from '../world';
import { BAND_BOTTOM, BAND_TOP, PX_PER_M, WIDTH } from './layout';
import { FACADE_REFERENCES, type FacadeReference } from './facade-references';

// The side-scrolling stage unrolls a route into one long street. Everything along the way keeps
// its real order and spacing: buildings, trees, lamps, signs, side streets and the waiting crews.

const MPU = METRES_PER_UNIT;
/** Metres of Pålsjö walked before reaching the kiosk. */
const LEAD_IN = 16;
/** Metres beyond Home's door, so the terrace carries on past the edge of the last screen. */
const RUN_OUT = 12;
/** Buildings and trees further than this from the route, in metres, are out of sight. */
const SIGHT = 42;
/** Beyond this many metres a facade or tree moves to the smaller, hazier back row. */
const BACK_ROW = 21;
const px = (units: number) => units * MPU * PX_PER_M;

export type FacadeModel = BuildingAppearance['model'];
export interface Facade {
  id: number;
  /** Left and right edges in stage pixels. */
  x0: number;
  x1: number;
  /** 0 across the pavement, 1 further back behind the gardens. */
  row: 0 | 1;
  /** Metres from the route to the nearest wall; nearer things are drawn over farther ones. */
  dist: number;
  /** Pixels the ground line steps up, for the stepped terrace at Home. */
  lift: number;
  appearance: BuildingAppearance;
  reference?: FacadeReference;
  /** Side-street houses and garden outbuildings sit behind the photographed street frontage. */
  backOnly?: boolean;
  style: BuildingStyle;
  /** The roof ridge runs along the street, so the courier sees the eaves rather than a gable. */
  eavesFront: boolean;
  /** Door or landmark approach centre in stage pixels; null for other blank walls. */
  door: number | null;
  seed: number;
  address?: string;
  role?: 'home' | 'marcus' | 'kiosk' | 'kurir' | 'gods' | 'block' | 'garages' | 'shed' | 'school';
}
export interface Tree { x: number; row: 0 | 1; dist: number; variant: number; height: number; bush: boolean }
export type FurnitureKind = 'lamp' | 'sign' | 'busstop' | 'bench' | 'bin' | 'postbox' | 'crossing' | 'shelter';
/** Street furniture on the far pavement, or a lamp post on the near side in front of the action. */
export interface Furniture { kind: FurnitureKind; x: number; near: boolean; label?: string; variant?: number }
export interface Run<T> { x0: number; x1: number; value: T }
/** Carriageway, a bigger street with a centre line, a gravel park path, or the paved path to Home. */
export type Surface = 'road' | 'major' | 'path' | 'paved';
export type FrontKind = 'hedge' | 'picket' | 'plank' | 'wall' | 'rendered-wall' | 'open' | 'forecourt';
/** A street leaving the route: away from the camera (far) or towards it (near). */
export interface SideStreet { x: number; width: number; far: boolean; name?: string }
export type EnemyKind = 'runner' | 'bruiser' | 'boss';
export interface StageSpawn { id: number; kind: EnemyKind; x: number; y: number }
/**
 * A crew that stops the screen scrolling until it has been dealt with. Bigger crews and bruisers
 * whistle up backup, who run in from behind once the fight is on.
 */
export interface Encounter { id: number; camera: number; spawns: StageSpawn[]; backup: EnemyKind[]; home: boolean }
/** Cover and stash points on the Gods run: hedges, bins, garage doors and bushes. */
export interface Spot { x: number; kind: 'hedge' | 'bin' | 'garage' | 'bush' | 'shed' }
export interface Junction { id: JunctionId; x: number; turn: string; street: string; straight: string }

export interface Stage {
  route: Route;
  /** Stage length in pixels. */
  length: number;
  start: Vec2;
  package: Vec2;
  /** Marcus A's gate on the long route. */
  marcusX: number | null;
  shopX: number | null;
  junctions: Junction[];
  /** Home's front door. */
  homeX: number;
  /** The Romares väg junction, where the Marcus detour leaves the main street. */
  forkX: number;
  facades: Facade[];
  trees: Tree[];
  furniture: Furniture[];
  gates: number[];
  fronts: Run<FrontKind>[];
  streets: Run<string | undefined>[];
  surfaces: Run<Surface>[];
  sideStreets: SideStreet[];
  crossings: number[];
  encounters: Encounter[];
  /** 1 is the package run; 2 is the Gods run, which has no crews and no junctions. */
  level: 1 | 2;
  spots: Spot[];
  /** Level 2: the entrance of Kurirgatan 28D. */
  godsDoorX: number | null;
}

// ---------------------------------------------------------------- unrolling the route

interface Leg { ax: number; ay: number; dx: number; dy: number; len: number; start: number }
/** The nearest point on a set of legs: distance along the stage and signed offset, in world units. */
interface Hit { leg: Leg; s: number; d: number; dist: number }

function legsOf(points: Vec2[], start: number): Leg[] {
  const out: Leg[] = [];
  let s = start;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    out.push({ ax: a.x, ay: a.y, dx: (b.x - a.x) / len, dy: (b.y - a.y) / len, len, start: s });
    s += len;
  }
  return out;
}

function nearestOn(legs: Leg[], p: Vec2): Hit {
  let best: Hit | null = null;
  for (const leg of legs) {
    const u = Math.max(0, Math.min(leg.len, (p.x - leg.ax) * leg.dx + (p.y - leg.ay) * leg.dy));
    const dist = Math.hypot(p.x - leg.ax - leg.dx * u, p.y - leg.ay - leg.dy * u);
    if (!best || dist < best.dist) best = { leg, s: leg.start + u, d: leg.dx * (p.y - leg.ay) - leg.dy * (p.x - leg.ax), dist };
  }
  return best!;
}

function pointAt(legs: Leg[], s: number): { p: Vec2; leg: Leg } {
  const leg = legs.find(l => s <= l.start + l.len) ?? legs[legs.length - 1];
  const u = Math.max(0, Math.min(leg.len, s - leg.start));
  return { p: { x: leg.ax + leg.dx * u, y: leg.ay + leg.dy * u }, leg };
}

/** Sign of a lateral offset on the courier's left: walking east, north is on the left. */
const LEFT = (() => {
  const o = fromMetres(0, 0), e = fromMetres(1, 0), n = fromMetres(0, 1);
  return Math.sign((e.x - o.x) * (n.y - o.y) - (e.y - o.y) * (n.x - o.x));
})();

const OTHER: Record<Route, Route> = { direct: 'marcus', marcus: 'direct', kurir: 'marcus-kurir', 'marcus-kurir': 'kurir' };
let shared = 0;
while (shared < Math.min(ROUTES.direct.length, ROUTES.marcus.length)
  && ROUTES.direct[shared].x === ROUTES.marcus[shared].x && ROUTES.direct[shared].y === ROUTES.marcus[shared].y) shared++;
/** The stage starts a little before the kiosk, on the far side from the rest of the route. */
const LEAD = (() => {
  const first = ROUTES.direct[0];
  const len = Math.hypot(first.x - PACKAGE.x, first.y - PACKAGE.y);
  return { x: PACKAGE.x - (first.x - PACKAGE.x) / len * LEAD_IN / MPU, y: PACKAGE.y - (first.y - PACKAGE.y) / len * LEAD_IN / MPU };
})();
const PREFIX = legsOf([LEAD, PACKAGE, ...ROUTES.direct.slice(0, shared)], 0);
const FORK = PREFIX[PREFIX.length - 1].start + PREFIX[PREFIX.length - 1].len;
const SUFFIX: Record<Route, Leg[]> = {
  direct: legsOf(ROUTES.direct.slice(shared - 1), FORK),
  marcus: legsOf(ROUTES.marcus.slice(shared - 1), FORK),
  kurir: legsOf(ROUTES.kurir.slice(shared - 1), FORK),
  'marcus-kurir': legsOf(ROUTES['marcus-kurir'].slice(shared - 1), FORK),
};

/**
 * Places a thing beside the route. Things nearest the shared stretch before the fork appear on
 * both routes, unless the other route passes closer, so switching routes early never changes the view.
 */
function locate(route: Route, p: Vec2): Hit | null {
  const pre = nearestOn(PREFIX, p), own = nearestOn(SUFFIX[route], p), other = nearestOn(SUFFIX[OTHER[route]], p);
  if (own.dist < pre.dist) return own;
  return other.dist < pre.dist ? null : pre;
}

function facingStreet(hit: Hit): string | undefined {
  const { leg } = hit, u = Math.max(0, Math.min(leg.len, hit.s - leg.start));
  return nearestRoad(leg.ax + leg.dx * u, leg.ay + leg.dy * u)?.road.name;
}

/** Johan Banérs uses the left side; the Långåkersgatan photo shows Marcus A's right side. */
const picturedSide = (street: string | undefined) => street === 'Johan Banérs gata' ? LEFT : street === 'Långåkersgatan' ? -LEFT : 0;

// ---------------------------------------------------------------- deterministic variety

export function rand(a: number, b: number): number {
  let h = (Math.imul(Math.round(a * 97) | 0, 374761393) + Math.imul(Math.round(b * 89) | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** Merges equal neighbours, then folds runs shorter than minLength into the run before them. */
function runsOf<T>(samples: Array<{ x: number; value: T }>, end: number, minLength: number): Run<T>[] {
  const runs: Run<T>[] = [];
  for (let i = 0; i < samples.length; i++) {
    const { x, value } = samples[i];
    const x1 = i + 1 < samples.length ? samples[i + 1].x : end;
    const last = runs[runs.length - 1];
    if (last && last.value === value) last.x1 = x1;
    else runs.push({ x0: x, x1, value });
  }
  for (let i = runs.length - 1; i >= 0 && runs.length > 1; i--) {
    if (runs[i].x1 - runs[i].x0 >= minLength) continue;
    const into = i > 0 ? runs[i - 1] : runs[i + 1];
    into.x0 = Math.min(into.x0, runs[i].x0);
    into.x1 = Math.max(into.x1, runs[i].x1);
    runs.splice(i, 1);
  }
  for (let i = runs.length - 1; i > 0; i--) {
    if (runs[i].value === runs[i - 1].value) { runs[i - 1].x1 = runs[i].x1; runs.splice(i, 1); }
  }
  return runs;
}

// ---------------------------------------------------------------- buildings

const BUILDINGS = new Map<Footprint, Prop>(PROPS.filter(p => p.kind === 'building' && p.footprint).map(p => [p.footprint!, p]));
const TERRACE = /^Ringstorpsvägen (49|51|53|55|57)[A-D]$/;
/** Terrace units within this many metres of 55B are laid out along the row; the rest follow the route. */
const TERRACE_REACH = 32;
const KIOSK = FOOTPRINTS.find(f => f.use === 'kiosk')!;
const MARCUS = FOOTPRINTS.find(f => f.address === 'Långåkersgatan 4')!;
const HOME_UNIT = FOOTPRINTS.find(f => f.address === 'Ringstorpsvägen 55B')!;
const KURIR = FOOTPRINTS.find(f => f.id === KURIR_BUILDING_ID)!;
const TERRACE_UNITS = FOOTPRINTS.filter(f => TERRACE.test(f.address ?? '') && Math.hypot(f.obb.cx - HOME_UNIT.obb.cx, f.obb.cy - HOME_UNIT.obb.cy) * MPU <= TERRACE_REACH);

function appearanceOf(f: Footprint): { appearance: BuildingAppearance; style: BuildingStyle } {
  const prop = BUILDINGS.get(f);
  return { appearance: prop?.appearance ?? appearanceFor(f, 20), style: prop?.style ?? 'house' };
}

/** +1 when direction v points to the left of someone facing along f, otherwise -1. */
const leftOf = (f: Vec2, v: Vec2) => Math.sign(f.x * v.y - f.y * v.x) === LEFT ? 1 : -1;

/** A landmark's front wall, seen from its entrance, with the door on the entrance. */
function landmark(f: Footprint, entrance: Vec2, doorX: number, role: 'marcus' | 'kiosk', eavesFront: boolean): Facade {
  const face = buildingFront(f, entrance);
  const u = Math.max(0.4, Math.min(face.len - 0.4, (entrance.x - face.ax) * face.dx + (entrance.y - face.ay) * face.dy));
  // Standing outside and facing the wall, its start is to one side of the door and its end to the other.
  const leftward = leftOf({ x: -face.nx, y: -face.ny }, { x: face.dx, y: face.dy });
  const start = doorX + px(u) * leftward, end = start - px(face.len) * leftward;
  return {
    id: f.id, x0: Math.min(start, end), x1: Math.max(start, end), row: 0, dist: 0, lift: 0, ...appearanceOf(f),
    eavesFront, door: doorX, seed: f.id, address: f.address, role,
  };
}

/** The terrace at Home, laid out along its row with the real stagger, centred on 55B's door. */
export function terrace(homeX: number): Facade[] {
  const c = Math.cos(HOME_UNIT.obb.angle), s = Math.sin(HOME_UNIT.obb.angle);
  const along = (p: Vec2) => ((p.x - HOME_UNIT.obb.cx) * c + (p.y - HOME_UNIT.obb.cy) * s) * MPU;
  const back = (p: Vec2) => (-(p.x - HOME_UNIT.obb.cx) * s + (p.y - HOME_UNIT.obb.cy) * c) * MPU;
  const front = Math.sign(back(HOME)) || -1;
  // Facing the terrace from the street, see whether the row's axis runs to the left or the right.
  const leftward = leftOf({ x: s * front, y: -c * front }, { x: c, y: s });
  const centre = homeX + along(HOME) * leftward * PX_PER_M;
  return TERRACE_UNITS.map(f => {
    const mid = { x: f.obb.cx, y: f.obb.cy };
    const x = centre - along(mid) * leftward * PX_PER_M, w = px(f.obb.w);
    const setback = -back(mid) * front;
    const home = f === HOME_UNIT;
    return {
      id: f.id, x0: x - w / 2, x1: x + w / 2, row: 0 as const, dist: 9 + setback, lift: Math.round(Math.max(-3, Math.min(12, setback * 0.8))),
      ...appearanceOf(f), eavesFront: true, door: home ? homeX : x - w * 0.32, seed: f.id, address: f.address, role: home ? 'home' as const : undefined,
    };
  });
}

function buildingCandidates(route: Route): Facade[] {
  const out: Facade[] = [];
  for (const f of FOOTPRINTS) {
    if (f === KIOSK || f === MARCUS || TERRACE_UNITS.includes(f) || !BUILDINGS.has(f)) continue;
    if (f === KURIR && viaKurir(route)) continue;
    const hit = locate(route, { x: f.obb.cx, y: f.obb.cy });
    if (!hit) continue;
    const street = facingStreet(hit), side = picturedSide(street);
    if (side && Math.sign(hit.d) !== side) continue;
    const photo = f.address ? FACADE_REFERENCES[f.address] : undefined;
    const reference = photo?.street === street ? photo : undefined;
    const { leg } = hit;
    let u0 = Infinity, u1 = -Infinity, near = Infinity;
    for (const q of f.pts) {
      const u = (q.x - leg.ax) * leg.dx + (q.y - leg.ay) * leg.dy;
      u0 = Math.min(u0, u); u1 = Math.max(u1, u);
      near = Math.min(near, Math.abs(leg.dx * (q.y - leg.ay) - leg.dy * (q.x - leg.ax)));
    }
    const dist = near * MPU;
    // A pictured house set further back (63) can remain in the distant row.
    if (dist > (reference ? 65 : SIGHT) || hit.dist * MPU < 2) continue;
    // Round a corner, a footprint can project wider than it is.
    const widest = Math.max(f.obb.w, f.obb.h) * 1.05;
    if (u1 - u0 > widest) { const mid = (u0 + u1) / 2; u0 = mid - widest / 2; u1 = mid + widest / 2; }
    const x0 = px(leg.start + u0), x1 = px(leg.start + u1);
    if (x1 - x0 < 3 * PX_PER_M) continue;
    const long = f.obb.w >= f.obb.h ? f.obb.angle : f.obb.angle + Math.PI / 2;
    let { appearance, style } = appearanceOf(f);
    const backOnly = !!side && !reference && !f.address?.startsWith(`${street} `);
    if (side && !f.address && !f.use && f.area < 150) {
      style = 'garage';
      appearance = { ...appearance, wall: '#cfcdc4', roof: '#5e6465', material: 'plaster', roofShape: 'flat', floors: 1, eaves: 10, rise: 0 };
    }
    const blank = style === 'garage';
    const r = rand(f.id, 3);
    out.push({
      id: f.id, x0, x1, row: 0, dist, lift: 0, appearance, style, reference, backOnly,
      eavesFront: Math.abs(Math.cos(long - Math.atan2(leg.dy, leg.dx))) > 0.6,
      door: reference ? (reference.door ? x0 + (x1 - x0) * reference.door.x : null)
        : blank ? null : x0 + (x1 - x0) * (style === 'house' ? 0.25 + r * 0.5 : 0.5), seed: f.id, address: f.address,
    });
  }
  return out;
}

// ---------------------------------------------------------------- building the stage

const STAGES = new Map<Route, Stage>();
export function stageFor(route: Route): Stage {
  let stage = STAGES.get(route);
  if (!stage) { stage = buildStage(route); STAGES.set(route, stage); }
  return stage;
}

function buildStage(route: Route): Stage {
  const legs = [...PREFIX, ...SUFFIX[route]];
  const last = legs[legs.length - 1];
  const homeS = last.start + last.len;
  const homeX = px(homeS);
  const length = Math.round(homeX + RUN_OUT * PX_PER_M);
  const packageX = LEAD_IN * PX_PER_M;
  let marcusX = viaMarcus(route) ? px(nearestOn(legs, MARCUS_A).s) : null;
  const shopX = viaKurir(route) ? px(nearestOn(legs, KURIR_STOP).s) : null;
  const junctions: Junction[] = [];
  if (!viaMarcus(route)) junctions.push({ id: 'romares', x: px(FORK), turn: 'junction.romares.turn', street: 'Romares väg', straight: 'junction.romares.straight' });
  if (!viaKurir(route)) junctions.push({ id: 'kurir', x: px(nearestOn(legs, KURIR_FORK).s), turn: 'junction.kurir.turn', street: 'Kurirgatan', straight: 'junction.kurir.straight' });
  const inside = (x: number) => x > -60 && x < length + 60;

  // Streets and surfaces, sampled every 3 m along the route.
  const streetSamples: Array<{ x: number; value: string | undefined }> = [];
  const surfaceSamples: Array<{ x: number; value: Surface }> = [];
  const frontSamples: Array<{ x: number; value: FrontKind }> = [];
  for (let s = 0; s < homeS; s += 3 / MPU) {
    const { p, leg } = pointAt(legs, s);
    const road = nearestRoad(p.x, p.y);
    const on = !!road && road.d < road.road.hw + 1.2;
    streetSamples.push({ x: px(s), value: on ? road!.road.name : undefined });
    surfaceSamples.push({ x: px(s), value: !on ? 'path' : ['secondary', 'tertiary'].includes(road!.road.kind) ? 'major' : 'road' });
    // Private gardens get hedges and fences; parks, fields and woods stay open.
    const open = [1, -1].every(side => {
      const k = 9 / MPU * side;
      const area = areaAt(p.x - leg.dy * k, p.y + leg.dx * k);
      return area !== null && area !== 'parking' && area !== 'school';
    });
    frontSamples.push({ x: px(s), value: open ? 'open' : 'hedge' });
  }
  const streets = runsOf(streetSamples, length, 14 * PX_PER_M);
  const surfaces = runsOf(surfaceSamples, length, 10 * PX_PER_M);
  const approach = surfaces[surfaces.length - 1];
  if (approach.value === 'path' && approach.x0 < homeX) approach.value = 'paved';

  // Side streets: another road leaving a point on the route.
  const sideStreets: SideStreet[] = [];
  for (const road of ROADS) {
    if (!road.carriage) continue;
    road.pts.forEach((v, i) => {
      const hit = nearestOn(legs, v);
      if (hit.dist > 1.6 || hit.s < 1 || hit.s > homeS - 1) return;
      for (const step of [-1, 1]) {
        // Follow the road until it leaves the route; a road running alongside is the route itself.
        let n: Vec2 | undefined, walked = 0;
        for (let k = i + step, prev = v; k >= 0 && k < road.pts.length && walked < 14; prev = road.pts[k], k += step) {
          walked += Math.hypot(road.pts[k].x - prev.x, road.pts[k].y - prev.y);
          if (nearestOn(legs, road.pts[k]).dist > 3) { n = road.pts[k]; break; }
        }
        if (!n) continue;
        const d = hit.leg.dx * (n.y - v.y) - hit.leg.dy * (n.x - v.x);
        const far = Math.sign(d) === (picturedSide(facingStreet(hit)) || LEFT);
        const x = px(hit.s);
        if (sideStreets.some(o => o.far === far && Math.abs(o.x - x) < 40)) continue;
        const nameHere = streets.find(r => x >= r.x0 && x < r.x1)?.value;
        if (road.name && road.name === nameHere) continue;
        sideStreets.push({ x, width: px(2 * (road.hw + road.sidewalk)) + 6, far, name: road.name });
      }
    });
  }
  sideStreets.sort((a, b) => a.x - b.x);
  const farGap = (x0: number, x1: number) => sideStreets.some(s => s.far && overlap(s.x - s.width / 2, s.x + s.width / 2, x0, x1) > 4);

  // Buildings: the landmarks first, then the nearest houses, with crowded ones moved to the back row.
  const kiosk = landmark(KIOSK, PACKAGE, packageX, 'kiosk', true);
  const facades: Facade[] = [kiosk, ...terrace(homeX)];
  if (marcusX !== null) {
    const house = landmark(MARCUS, MARCUS_A, marcusX, 'marcus', true);
    house.reference = FACADE_REFERENCES['Långåkersgatan 4'];
    // The checkpoint is at the side approach shown in the photograph, not an invented
    // central front door. Keep the mapped house width and align its gate and marker.
    marcusX = house.x0 + (house.x1 - house.x0) * house.reference.gate;
    house.door = marcusX;
    facades.push(house);
  }
  if (shopX !== null) {
    // The full long elevation, with ICA near its left end as indicated in the supplied photo.
    const w = 74 * PX_PER_M;
    facades.push({ id: KURIR.id, x0: shopX - w * 0.2, x1: shopX + w * 0.8, row: 0, dist: 2, lift: 0,
      appearance: { wall: '#bfa16b', roof: '#575f65', material: 'plaster', roofShape: 'flat', eaves: 30, rise: 0, floors: 2, model: 'generic', reference: 'User photographs: Kurir Livs shopping block' },
      style: 'block', eavesFront: true, door: shopX, seed: KURIR.id, address: 'Kurirgatan 1', role: 'kurir' });
  }
  const rows: Array<Array<[number, number]>> = [facades.map(f => [f.x0, f.x1]), []];
  for (const c of buildingCandidates(route).filter(c => c.x1 > -40 && c.x0 < length + 40)
    .sort((a, b) => Number(!!b.reference) - Number(!!a.reference) || a.dist - b.dist)) {
    if (c.reference) {
      // At a corner, the oblique footprint's rear edge can project slightly into
      // the side street. Trim that sliver instead of shrinking the entire house
      // into the distant row; retain larger overlaps as genuinely obscured houses.
      const w = c.x1 - c.x0;
      for (const street of sideStreets.filter(s => s.far)) {
        const left = street.x - street.width / 2, right = street.x + street.width / 2;
        if (left > c.x0 && left < c.x1 && c.x1 - left < w * 0.15) c.x1 = left - 4;
        else if (right > c.x0 && right < c.x1 && right - c.x0 < w * 0.15) c.x0 = right + 4;
      }
      if (c.reference.door) c.door = c.x0 + (c.x1 - c.x0) * c.reference.door.x;
    }
    const w = c.x1 - c.x0;
    const clash = (row: Array<[number, number]>) => row.reduce((sum, [a, b]) => sum + overlap(a, b, c.x0 - 6, c.x1 + 6), 0);
    if (!c.backOnly && c.dist < BACK_ROW && !farGap(c.x0, c.x1) && clash(rows[0]) === 0) {
      rows[0].push([c.x0, c.x1]); facades.push(c);
    } else if (clash(rows[1]) < w * 0.3) {
      rows[1].push([c.x0, c.x1]); facades.push({ ...c, row: 1, dist: Math.max(c.dist, BACK_ROW), door: null });
    }
  }
  facades.sort((a, b) => b.dist - a.dist || a.x0 - b.x0);
  const landmarks = facades.filter(f => f.role || f.reference || TERRACE_UNITS.some(u => u.id === f.id));

  // Trees and bushes: none in front of a landmark's face or on the kiosk forecourt.
  const trees: Tree[] = [];
  for (const p of PROPS) {
    if (p.kind !== 'tree' && p.kind !== 'bush') continue;
    const hit = locate(route, p);
    if (!hit) continue;
    const side = picturedSide(facingStreet(hit));
    if (side && Math.sign(hit.d) !== side) continue;
    const dist = hit.dist * MPU, x = px(hit.s);
    const bush = p.kind === 'bush';
    if (dist > (bush ? 16 : SIGHT - 6) || dist < 2.5 || !inside(x) || farGap(x - 6, x + 6)) continue;
    if (landmarks.some(f => x > f.x0 - 16 && x < f.x1 + 16 && dist < f.dist + 4)) continue;
    trees.push({ x, row: dist < BACK_ROW ? 0 : 1, dist, variant: p.variant ?? 0, height: p.height ?? 24, bush });
  }
  trees.sort((a, b) => b.dist - a.dist);

  // Street furniture from the map, plus a name sign wherever the street changes.
  const furniture: Furniture[] = [];
  const FURNITURE = new Set(['lamp', 'sign', 'busstop', 'bench', 'bin', 'postbox', 'crossing', 'shelter']);
  for (const p of PROPS) {
    if (!FURNITURE.has(p.kind)) continue;
    const hit = locate(route, p);
    if (!hit || hit.dist * MPU > (p.kind === 'busstop' ? 16 : 11)) continue;
    const x = px(hit.s);
    if (!inside(x) || (p.kind === 'sign' && p.variant !== undefined)) continue;
    const near = Math.sign(hit.d) !== (picturedSide(facingStreet(hit)) || LEFT);
    if (near && p.kind !== 'lamp') continue;
    if (!near && landmarks.some(f => x > f.x0 - 8 && x < f.x1 + 8) && p.kind !== 'busstop') continue;
    furniture.push({ kind: p.kind as FurnitureKind, x, near, label: p.label });
  }
  for (let i = 1; i < streets.length; i++) {
    const name = streets[i].value;
    if (!name) continue;
    const x = streets[i].x0 + 14;
    if (furniture.some(f => f.kind === 'sign' && f.label === name.toUpperCase() && Math.abs(f.x - x) < 240)) continue;
    furniture.push({ kind: 'sign', x, near: false, label: name.toUpperCase() });
  }
  // Nothing stands in the mouth of a side street: move it to the nearer corner.
  for (const f of furniture) {
    const mouth = sideStreets.find(s => s.far && Math.abs(f.x - s.x) < s.width / 2 + 4);
    if (mouth && !f.near) f.x = mouth.x + Math.sign(f.x - mouth.x || 1) * (mouth.width / 2 + 8);
  }
  furniture.push({ kind: 'sign', x: homeX + 62, near: false, label: 'HEM 55B', variant: 2 });
  if (marcusX !== null) furniture.push({ kind: 'sign', x: marcusX + 24, near: false, label: 'MARCUS A', variant: 3 });
  furniture.sort((a, b) => a.x - b.x);

  // Garden fronts: hedges, fences and walls in stretches, open for parks and the kiosk forecourt.
  let fronts = runsOf(frontSamples, length, 12 * PX_PER_M).flatMap(run => {
    if (run.value === 'open') return [run];
    const parts: Run<FrontKind>[] = [];
    const kinds: FrontKind[] = ['hedge', 'hedge', 'picket', 'hedge', 'plank', 'wall', 'hedge', 'picket'];
    for (let x = run.x0; x < run.x1;) {
      const len = (8 + rand(x, 7) * 14) * PX_PER_M;
      parts.push({ x0: x, x1: Math.min(run.x1, x + len), value: kinds[Math.floor(rand(x, 11) * kinds.length)] });
      x += len;
    }
    return parts;
  });
  // Reference gardens follow their house, instead of changing fence type part-way across it.
  for (const f of facades.filter(f => f.reference && f.row === 0)) {
    const x0 = f.x0 - 14, x1 = f.x1 + 14;
    fronts = fronts.flatMap(run => {
      if (run.x1 <= x0 || run.x0 >= x1) return [run];
      const pieces: Run<FrontKind>[] = [];
      if (run.x0 < x0) pieces.push({ ...run, x1: x0 });
      if (run.x1 > x1) pieces.push({ ...run, x0: x1 });
      return pieces;
    });
    fronts.push({ x0, x1, value: f.reference!.front });
  }
  const shop = facades.find(f => f.role === 'kurir');
  if (shop) {
    // Walking through the paved shopping forecourt, including its parking apron.
    const replace = <T,>(runs: Run<T>[], value: T): Run<T>[] => runs.flatMap(run => {
      if (run.x1 <= shop.x0 || run.x0 >= shop.x1) return [run];
      const out: Run<T>[] = [];
      if (run.x0 < shop.x0) out.push({ ...run, x1: shop.x0 });
      out.push({ x0: Math.max(run.x0, shop.x0), x1: Math.min(run.x1, shop.x1), value });
      if (run.x1 > shop.x1) out.push({ ...run, x0: shop.x1 });
      return out;
    });
    fronts = replace(fronts, 'forecourt');
    surfaces.splice(0, surfaces.length, ...replace(surfaces, 'paved'));
    streets.splice(0, streets.length, ...replace(streets, 'Kurirgatan'));
  }
  const forecourt = { x0: kiosk.x0 - 40, x1: kiosk.x1 + 60 };
  const clipped: Run<FrontKind>[] = [];
  for (const run of fronts) {
    if (run.x1 <= forecourt.x0 || run.x0 >= forecourt.x1) { clipped.push(run); continue; }
    if (run.x0 < forecourt.x0) clipped.push({ ...run, x1: forecourt.x0 });
    if (run.x1 > forecourt.x1) clipped.push({ ...run, x0: forecourt.x1 });
  }
  clipped.push({ ...forecourt, value: 'forecourt' });
  clipped.sort((a, b) => a.x0 - b.x0);
  const gates = facades.filter(f => f.row === 0 && (f.reference || f.door !== null) && f.role !== 'kiosk' && f.role !== 'kurir')
    .map(f => f.reference ? f.x0 + (f.x1 - f.x0) * f.reference.gate : f.door!);

  const crossings = CROSSINGS.map(c => nearestOn(legs, c)).filter(h => h.dist * MPU < 5).map(h => px(h.s))
    .filter((x, i, all) => all.findIndex(o => Math.abs(o - x) < 60) === i);

  return {
    route, length, forkX: px(FORK), homeX, marcusX, shopX, junctions,
    start: { x: 5 * PX_PER_M, y: 214 },
    package: { x: packageX, y: BAND_TOP + 5 },
    facades, trees, furniture, gates, fronts: clipped, streets, surfaces, sideStreets, crossings,
    encounters: encountersFor(route, legs, length),
    level: 1, spots: [], godsDoorX: null,
  };
}

// ---------------------------------------------------------------- crews

/** Crews stand where they wait on the map; neighbours within 30 m make one fight. */
function encountersFor(route: Route, legs: Leg[], length: number): Encounter[] {
  const group = viaMarcus(route) ? MARCUS_GROUP : DIRECT_GROUP;
  const lane = (id: number, d: number) => Math.round(Math.max(BAND_TOP + 8, Math.min(BAND_BOTTOM - 6, 212 + d * MPU * 7 + (rand(id, 5) - 0.5) * 30)));
  const spawns = SPAWNS.map((spawn, id) => ({ spawn, id }))
    .filter(({ spawn }) => spawn.group === -1 || spawn.group === SHARED_GROUP || spawn.group === group)
    .map(({ spawn, id }) => {
      const hit = nearestOn(legs, spawn.pos);
      return { id, kind: spawn.kind, x: Math.round(px(hit.s)), y: lane(id, hit.d) };
    })
    .sort((a, b) => a.x - b.x);
  const encounters: Encounter[] = [];
  for (const spawn of spawns) {
    const last = encounters[encounters.length - 1];
    if (last && spawn.x - last.spawns[0].x < 30 * PX_PER_M) last.spawns.push(spawn);
    else encounters.push({ id: spawn.id, camera: 0, spawns: [spawn], backup: [], home: false });
  }
  for (const e of encounters) {
    const bruisers = e.spawns.filter(s => s.kind === 'bruiser').length;
    e.backup = Array.from({ length: bruisers + (e.spawns.length > 1 ? 1 : 0) }, () => 'runner' as const);
  }
  if (viaKurir(route)) {
    const stop = px(nearestOn(legs, KURIR_STOP).s);
    // One additional crew on the return from the shops; the entrance itself is a quiet stop.
    encounters.push({ id: 200, camera: 0, home: false, backup: ['runner'], spawns: [
      { id: 200, kind: 'runner', x: stop + 1120, y: 205 },
      { id: 201, kind: 'bruiser', x: stop + 1180, y: 228 },
    ] });
    encounters.sort((a, b) => a.spawns[0].x - b.spawns[0].x);
  }
  const end = length - WIDTH;
  encounters.push({
    id: 100, camera: end, home: true, backup: [],
    spawns: HOME_CREW.map((spawn, i) => ({ id: 100 + i, kind: spawn.kind, x: Math.round(px(nearestOn(legs, spawn.pos).s)), y: lane(100 + i, nearestOn(legs, spawn.pos).d) })),
  });
  // Each crew holds the screen further on than the last, and the home crew always has the final screen.
  let camera = 0;
  for (const e of encounters) {
    if (e.home) continue;
    camera = e.camera = Math.min(end - 1, Math.max(camera + 1, Math.round(Math.max(0, e.spawns[0].x - WIDTH * 0.72))));
  }
  return encounters;
}

/** The street at a point on the stage; off-street stretches take the name of the street before them. */
export function streetAt(stage: Stage, x: number): string | undefined {
  const i = stage.streets.findIndex(r => x >= r.x0 && x < r.x1);
  for (let k = i; k >= 0; k--) if (stage.streets[k].value) return stage.streets[k].value;
  return undefined;
}
