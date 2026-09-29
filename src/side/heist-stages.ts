import { BAND_TOP } from './layout';

import { rand, type Facade, type Furniture, type FrontKind, type Run, type Spot, type Stage, type Surface, type Tree } from './stage';
import type { BuildingAppearance } from '../buildings';
import type { BuildingStyle } from '../world';
import type { Light } from './night';

// The three places of the truck job, all at night and all built by hand: the road out past Statoil and
// the Bildeve Volvo dealership to the industrial estate, the truck park itself, and the road back.

export const OUT = { length: 13200, start: 700, finish: 12350, goranX: 800 };
export const YARD = { length: 3700, gateX: 140, carX: 330, startX: 380 };
export const BACK = { length: 12300, start: 300, finish: 11450 };

const brickLook = (wall: string, roof: string, floors: number, roofShape: BuildingAppearance['roofShape'] = 'flat'): BuildingAppearance =>
  ({ wall, roof, material: 'brick', roofShape, eaves: 20, rise: roofShape === 'flat' ? 0 : 6, floors, model: 'generic' });

let seq = 9_300_000;
function facade(x0: number, x1: number, role: NonNullable<Facade['role']>, style: BuildingStyle, appearance: BuildingAppearance, extra: Partial<Facade> = {}): Facade {
  return { id: ++seq, x0, x1, row: 0, dist: 14, lift: 0, appearance, style, eavesFront: true, door: null, seed: seq, role, ...extra };
}
const industrial = brickLook('#b4b7ae', '#5b6062', 1);
const wall = (x0: number, x1: number, extra: Partial<Facade> = {}) => facade(x0, x1, 'warehouse', 'block', industrial, extra);
const boxes = (x0: number, x1: number) => facade(x0, x1, 'containers', 'block', industrial, { dist: 12 });

/** Lamp heads and the pools they throw on the ground. */
function lampLights(furniture: Furniture[]): Light[] {
  const out: Light[] = [];
  for (const f of furniture) {
    if (f.kind === 'lamp' && !f.near) {
      out.push({ x: f.x - 9, y: 92, r: 22, color: '#ffd9a0', a: 0.75 }, { x: f.x - 9, y: 186, r: 105, color: '#ffc985', a: 0.34 });
    } else if (f.kind === 'floodlight') {
      out.push({ x: f.x, y: 50, r: 30, color: '#fff6d8', a: 0.85 }, { x: f.x, y: 205, r: 210, color: '#f4f0d8', a: 0.5 });
    }
  }
  return out;
}

interface Parts {
  length: number; facades: Facade[]; fronts: Run<FrontKind>[]; furniture: Furniture[]; surfaces: Run<Surface>[]; streets: Run<string | undefined>[];
  trees?: Tree[]; lights?: Light[]; gates?: number[]; spots?: Spot[]; homeX: number; startX: number;
}

function stageOf(p: Parts): Stage {
  p.facades.sort((a, b) => b.dist - a.dist || a.x0 - b.x0);
  return {
    route: 'direct', length: p.length, forkX: 0, homeX: p.homeX, marcusX: null, shopX: null, junctions: [],
    start: { x: p.startX, y: 214 }, package: { x: -2000, y: BAND_TOP + 5 },
    facades: p.facades, trees: p.trees ?? [], furniture: p.furniture.sort((a, b) => a.x - b.x), gates: p.gates ?? [], fronts: p.fronts.sort((a, b) => a.x0 - b.x0),
    streets: p.streets, surfaces: p.surfaces, sideStreets: [], crossings: [], encounters: [], level: 3, night: true,
    lights: [...lampLights(p.furniture), ...(p.lights ?? [])], spots: p.spots ?? [], godsDoorX: null,
  };
}

function scatterTrees(from: number, to: number, keep: (x: number) => boolean, seed: number): Tree[] {
  const trees: Tree[] = [];
  for (let x = from; x < to; x += 130 + rand(x, seed) * 210) {
    if (!keep(x)) continue;
    const bush = rand(x, seed + 1) > 0.6;
    trees.push({ x, row: 0, dist: bush ? 4 : 6 + rand(x, seed + 2) * 3, variant: Math.floor(rand(x, seed + 3) * 6), height: bush ? 12 : 26 + rand(x, seed + 4) * 10, bush });
  }
  return trees.sort((a, b) => b.dist - a.dist);
}

function roadLamps(from: number, to: number, step: number): Furniture[] {
  const out: Furniture[] = [];
  for (let x = from; x < to; x += step) { out.push({ kind: 'lamp', x, near: false }); out.push({ kind: 'lamp', x: x + step / 2, near: true }); }
  return out;
}

let out: Stage | null = null, yard: Stage | null = null, back: Stage | null = null;

/** Kurirgatan, Statoil, Bildeve and the industrial estate, ending at the yard gate. */
export function roadOutStage(): Stage {
  if (out) return out;
  const door = 840;
  const facades: Facade[] = [
    facade(40, 940, 'gods', 'apartment', brickLook('#a64f3b', '#5f5a58', 7), { door, address: 'Kurirgatan 28' }),
    facade(980, 1120, 'garages', 'garage', brickLook('#d6d1c4', '#5b6062', 1), { dist: 12 }),
    facade(1200, 1752, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { seed: 9_300_301 }),
    facade(1900, 2450, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { seed: 9_300_302 }),
    facade(4480, 4840, 'statoil', 'block', industrial, { dist: 6 }),
    facade(6780, 7640, 'bildeve', 'block', industrial, { dist: 8 }),
    wall(8200, 8820), boxes(8900, 9200), wall(9300, 9990), boxes(10100, 10420), wall(10500, 11180), boxes(11260, 11600), wall(11700, 12330),
    facade(12400, 12640, 'yardgate', 'block', industrial, { dist: 8 }),
  ];
  const furniture: Furniture[] = [
    ...roadLamps(300, 12200, 430),
    { kind: 'sign', x: 200, near: false, label: 'KURIRGATAN' },
    { kind: 'sign', x: 4400, near: false, label: 'STATOIL', variant: 2 },
    { kind: 'sign', x: 6720, near: false, label: 'BILDEVE VOLVO' },
    { kind: 'sign', x: 8100, near: false, label: 'INDUSTRIVÄGEN' },
    ...[9150, 10050, 10950, 11850].map(x => ({ kind: 'floodlight' as const, x, near: false })),
  ];
  const lights: Light[] = [];
  for (let x = 4490; x < 4840; x += 44) lights.push({ x, y: 82, r: 54, color: '#fff2c4', a: 0.55 });
  lights.push({ x: 4660, y: 168, r: 190, color: '#ffe9a8', a: 0.4 }, { x: 4770, y: 128, r: 70, color: '#ffd98a', a: 0.45 }, { x: 4612, y: 62, r: 50, color: '#ffd23a', a: 0.35 });
  for (let x = 6860; x < 7600; x += 120) lights.push({ x, y: 136, r: 120, color: '#ffeeb0', a: 0.36 });
  lights.push({ x: 6830, y: 90, r: 58, color: '#4a70ff', a: 0.28 }, { x: 7556, y: 90, r: 58, color: '#4a70ff', a: 0.28 }, { x: 6900, y: 60, r: 60, color: '#6f8cff', a: 0.22 });
  for (let i = 0; i < 4; i++) lights.push({ x: door - 132 * i, y: 132, r: 46, color: '#ffd9a0', a: 0.5 });
  out = stageOf({
    length: OUT.length, facades, furniture, lights, startX: OUT.start, homeX: OUT.finish,
    gates: [0, 1, 2, 3].map(i => door - 132 * i),
    trees: scatterTrees(120, 8000, x => !(x > 4400 && x < 4900) && !(x > 6700 && x < 7700) && !(x > 40 && x < 940 && Math.abs(x - door) < 40), 41),
    fronts: [
      { x0: 40, x1: 940, value: 'hedge' }, { x0: 1200, x1: 1752, value: 'hedge' }, { x0: 1900, x1: 2450, value: 'hedge' },
      { x0: 8100, x1: 12330, value: 'chainlink' },
    ],
    surfaces: [{ x0: 0, x1: 12300, value: 'major' }, { x0: 12300, x1: OUT.length, value: 'yard' }],
    streets: [{ x0: 0, x1: 4300, value: 'Kurirgatan' }, { x0: 4300, x1: OUT.length, value: 'Industrivägen' }],
  });
  return out;
}

/** The truck park: a fenced concrete yard behind warehouses, lit by floodlights. */
export function yardStage(): Stage {
  if (yard) return yard;
  const facades: Facade[] = [
    facade(40, 250, 'yardgate', 'block', industrial, { dist: 8 }),
    wall(300, 1000), boxes(1000, 1250), wall(1250, 1950), boxes(1950, 2200), wall(2200, 2950), boxes(2950, 3250), wall(3250, 3680),
  ];
  const furniture: Furniture[] = [
    ...[560, 1360, 2160, 2960].map(x => ({ kind: 'floodlight' as const, x, near: false })),
    { kind: 'sign', x: 90, near: false, label: 'LASTBILSPARKERING' },
    ...[900, 1700, 2500, 3300].map(x => ({ kind: 'lamp' as const, x, near: false })),
  ];
  yard = stageOf({
    length: YARD.length, facades, furniture, startX: YARD.startX, homeX: YARD.carX,
    fronts: [{ x0: 0, x1: YARD.length, value: 'chainlink' }],
    surfaces: [{ x0: 0, x1: YARD.length, value: 'yard' }],
    streets: [{ x0: 0, x1: YARD.length, value: 'Lastbilsparkering' }],
  });
  return yard;
}

/** Out of the estate, round the ring road and back up Kurirgatan to number 28. */
export function roadBackStage(): Stage {
  if (back) return back;
  const door = 11100;
  const facades: Facade[] = [
    wall(300, 900), boxes(980, 1280), wall(1360, 2050), wall(2200, 2860), boxes(2940, 3240),
    facade(5200, 5752, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { seed: 9_300_311 }),
    facade(5900, 6450, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { seed: 9_300_312 }),
    facade(6600, 7150, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { seed: 9_300_313 }),
    facade(7300, 7850, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { seed: 9_300_314 }),
    facade(10240, 11140, 'gods', 'apartment', brickLook('#a64f3b', '#5f5a58', 7), { door, address: 'Kurirgatan 28' }),
    facade(11180, 11320, 'garages', 'garage', brickLook('#d6d1c4', '#5b6062', 1), { dist: 12 }),
  ];
  const furniture: Furniture[] = [
    ...roadLamps(300, 11300, 440),
    { kind: 'sign', x: 3400, near: false, label: 'RINGVÄGEN' },
    { kind: 'sign', x: 5100, near: false, label: 'KURIRGATAN' },
    ...[600, 1700, 2600].map(x => ({ kind: 'floodlight' as const, x, near: false })),
  ];
  const lights: Light[] = [];
  for (let i = 0; i < 4; i++) lights.push({ x: door - 132 * i, y: 132, r: 46, color: '#ffd9a0', a: 0.5 });
  back = stageOf({
    length: BACK.length, facades, furniture, lights, startX: BACK.start, homeX: BACK.finish,
    gates: [0, 1, 2, 3].map(i => door - 132 * i),
    trees: scatterTrees(3400, 10100, x => !(x > 5150 && x < 7900), 67),
    fronts: [
      { x0: 0, x1: 3300, value: 'chainlink' }, { x0: 5200, x1: 7850, value: 'hedge' }, { x0: 10240, x1: 11140, value: 'hedge' },
    ],
    surfaces: [{ x0: 0, x1: BACK.length, value: 'major' }],
    streets: [{ x0: 0, x1: 3400, value: 'Industrivägen' }, { x0: 3400, x1: 5000, value: 'Ringvägen' }, { x0: 5000, x1: BACK.length, value: 'Kurirgatan' }],
  });
  return back;
}

