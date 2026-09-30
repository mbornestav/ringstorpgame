import { lampLights } from '../heist-stages';
import { BAND_BOTTOM, BAND_TOP, WIDTH } from '../layout';
import { rand, terrace, type Encounter, type Facade, type Furniture, type Stage, type Tree } from '../stage';
import { BUILDINGS, type BuildingSpec } from './catalogue';
import type { BuildingDef, Lane, LevelDefinition } from './types';

// Turns a level file into the Stage the renderer and the rules already run on. Crews are ordered and given the same
// screen-lock rule as Level 1: each holds the screen further on than the last, and the home crew holds the final screen.

/** The home crew's encounter id: the brawl rules look for it to know the run can end. */
export const HOME_CREW_ID = 100;
const LANES = { far: BAND_TOP + 16, middle: BAND_TOP + 36, near: BAND_BOTTOM - 14 } as const;
export const laneY = (lane: Lane | undefined, fallback: number): number =>
  Math.round(Math.max(BAND_TOP + 6, Math.min(BAND_BOTTOM - 6, lane === undefined ? fallback : typeof lane === 'number' ? lane : LANES[lane])));

const cache = new WeakMap<LevelDefinition, Stage>();

export function compileLevel(def: LevelDefinition): Stage {
  const hit = cache.get(def);
  if (hit) return hit;
  const s = def.street;
  let id = 9_500_000;

  const facade = (b: BuildingDef): Facade => {
    const spec: BuildingSpec = BUILDINGS[b.kind];
    const appearance = { ...spec.look, ...(b.wall && { wall: b.wall }), ...(b.roof && { roof: b.roof }), ...(b.floors && { floors: b.floors }) };
    const n = ++id;
    return {
      id: n, x0: b.from, x1: b.to, row: b.row ?? 0, dist: spec.dist + (b.row === 1 ? 20 : 0), lift: 0, appearance, style: spec.style, authored: true,
      ...(spec.landmark && { landmark: spec.landmark }),
      eavesFront: true, door: b.door ?? (spec.role ? (b.from + b.to) / 2 : null), seed: n, ...(spec.role && { role: spec.role }),
      ...(b.address && { address: b.address }),
    };
  };
  const facades = s.buildings.map(facade);
  if (s.finish) facades.push({ ...facade(s.finish), role: 'home', door: s.home });
  else facades.push(...terrace(s.home));
  facades.sort((a, b) => b.dist - a.dist || a.x0 - b.x0);
  const shop = s.buildings.find(b => b.kind === 'shop');
  const gates = s.buildings.filter(b => (BUILDINGS[b.kind] as BuildingSpec).role && b.kind !== 'shop').map(b => b.door ?? (b.from + b.to) / 2);

  const trees: Tree[] = (s.trees ?? []).map((t, i) => ({
    x: t.x, row: t.row ?? 0, bush: !!t.bush, dist: t.bush ? 4 : 7, variant: t.variant ?? Math.floor(rand(t.x, i) * 6), height: t.height ?? (t.bush ? 12 : 30),
  }));
  for (const sc of s.scatter ?? []) {
    const seed = sc.seed ?? 1, [lo, hi] = sc.gap ?? [110, 280], bushes = sc.bushes ?? 0.38;
    for (let x = sc.from; x < sc.to; x += lo + rand(x, seed) * (hi - lo)) {
      if (sc.avoid?.some(([a, b]) => x > a && x < b)) continue;
      if (gates.some(g => Math.abs(g - x) < 44)) continue;
      const bush = rand(x, seed + 1) < bushes;
      trees.push({ x, row: 0, dist: bush ? 4 : 6 + rand(x, seed + 2) * 3, variant: Math.floor(rand(x, seed + 3) * 6), height: bush ? 12 : 26 + rand(x, seed + 4) * 10, bush });
    }
  }
  trees.sort((a, b) => b.dist - a.dist);

  const furniture: Furniture[] = (s.props ?? []).map(p => ({ kind: p.kind, x: p.x, near: !!p.near, ...(p.label && { label: p.label }), ...(p.variant !== undefined && { variant: p.variant }) }));
  if (s.lampsEvery) {
    for (let x = 300; x < s.length - 200; x += s.lampsEvery) furniture.push({ kind: 'lamp', x, near: true });
    for (let x = 700; x < s.length - 600; x += Math.round(s.lampsEvery * 1.2)) furniture.push({ kind: 'lamp', x: x + 90, near: false });
  }
  furniture.sort((a, b) => a.x - b.x);

  const end = s.length - WIDTH;
  const crews = [...(s.crews ?? [])].sort((a, b) => a.x - b.x);
  const encounters: Encounter[] = crews.map((crew, i) => {
    const spawns = crew.members.map((m, k) => ({ id: (i + 1) * 1000 + k, kind: m.kind, x: Math.round(crew.x + (m.dx ?? k * 34)), y: laneY(m.lane, 196 + (k % 3) * 18) }));
    const bruisers = spawns.filter(m => m.kind === 'bruiser').length;
    return { id: i + 1, camera: 0, spawns, home: false, backup: crew.backup ?? Array.from({ length: bruisers + (spawns.length > 1 ? 1 : 0) }, () => 'runner' as const) };
  });
  let camera = 0;
  for (const e of encounters) camera = e.camera = Math.min(end - 1, Math.max(camera + 1, Math.round(Math.max(0, e.spawns[0].x - WIDTH * 0.72))));
  encounters.push({
    id: HOME_CREW_ID, camera: end, home: true, backup: [],
    spawns: s.homeCrew.map((kind, i) => ({ id: HOME_CREW_ID + i, kind, x: Math.round(s.home + (i % 2 ? 1 : -1) * (60 + i * 18)), y: laneY(undefined, 196 + (i % 3) * 18) })),
  });

  const stage: Stage = {
    waters: s.waters?.map(r => ({ x0: r.from, x1: r.to, value: r.value })),
    route: 'direct', length: s.length, forkX: 0, homeX: s.home, marcusX: null, junctions: [],
    shopX: shop ? shop.door ?? shop.from + (shop.to - shop.from) * 0.2 : null,
    start: { x: s.start.x, y: laneY(s.start.lane, 214) }, package: { x: s.parcel.x, y: laneY(s.parcel.lane, BAND_TOP + 10) },
    facades, trees, furniture, gates,
    fronts: (s.fronts ?? []).map(r => ({ x0: r.from, x1: r.to, value: r.value })).sort((a, b) => a.x0 - b.x0),
    streets: s.names.map(r => ({ x0: r.from, x1: r.to, value: r.value })),
    surfaces: (s.surfaces ?? [{ from: 0, to: s.length, value: 'road' as const }]).map(r => ({ x0: r.from, x1: r.to, value: r.value })),
    sideStreets: [], crossings: [], encounters, level: 1, spots: [], godsDoorX: null,
    ...(def.night && { night: true, lights: [...lampLights(furniture), ...(s.lights ?? [])] }),
  };
  cache.set(def, stage);
  return stage;
}
