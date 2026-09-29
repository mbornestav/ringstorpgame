import { BAND_TOP, PX_PER_M } from './layout';
import { KURIR_BUILDING_ID } from './routes';
import { rand, terrace, type Facade, type Furniture, type FrontKind, type Run, type Spot, type Stage, type Surface, type Tree } from './stage';
import type { BuildingAppearance } from '../buildings';
import type { BuildingStyle } from '../world';

// The Gods run is one long street built by hand: Kurirgatan 28, four brick blocks with their garages,
// Kurir Livs, the school and finally the terrace on Ringstorpsvägen. Distances follow the real order
// of the landmarks rather than the survey, so the layout is exact where it matters: what you pass, and in what order.

const brickLook = (wall: string, roof: string, floors: number, roofShape: BuildingAppearance['roofShape'] = 'flat'): BuildingAppearance =>
  ({ wall, roof, material: 'brick', roofShape, eaves: 20, rise: roofShape === 'flat' ? 0 : 6, floors, model: 'generic' });

export const GODS_START_X = 860;
const HOME_X = 6800;
const LENGTH = HOME_X + 12 * PX_PER_M;
const KURIR_X0 = 4150, KURIR_W = 74 * PX_PER_M;
export const GODS_DOOR_X = 840;
/** Blocks, in walking order. */
const BLOCKS: Array<[number, number]> = [[1200, 1752], [1900, 2450], [2600, 3150], [3300, 3850]];
const GARAGES: Array<[number, number]> = [[980, 1120], [1790, 1880], [3180, 3272], [3960, 4070]];
const SHEDS: Array<[number, number]> = [[2470, 2568], [1130, 1180]];
const SCHOOL: [number, number] = [5300, 6260];

let cached: Stage | null = null;
export function godsStage(): Stage {
  if (cached) return cached;
  let id = 9_100_000;
  const facade = (x0: number, x1: number, role: NonNullable<Facade['role']>, style: BuildingStyle, appearance: BuildingAppearance, extra: Partial<Facade> = {}): Facade =>
    ({ id: ++id, x0, x1, row: 0, dist: 14, lift: 0, appearance, style, eavesFront: true, door: null, seed: id, role, ...extra });

  const facades: Facade[] = [
    facade(40, 940, 'gods', 'apartment', brickLook('#a64f3b', '#5f5a58', 7), { door: GODS_DOOR_X, address: 'Kurirgatan 28' }),
    ...GARAGES.map(([a, b]) => facade(a, b, 'garages', 'garage', brickLook('#d6d1c4', '#5b6062', 1), { dist: 12 })),
    ...SHEDS.map(([a, b]) => facade(a, b, 'shed', 'garage', brickLook('#a3372f', '#d9d5c8', 1), { dist: 12 })),
    ...BLOCKS.map(([a, b], i) => facade(a, b, 'block', 'apartment', brickLook('#a04c3b', '#4b3c37', 4, 'hipped'), { door: (a + b) / 2, seed: 9_100_300 + i })),
    facade(KURIR_X0, KURIR_X0 + KURIR_W, 'kurir', 'block',
      { wall: '#bfa16b', roof: '#575f65', material: 'plaster', roofShape: 'flat', eaves: 30, rise: 0, floors: 2, model: 'generic', reference: 'User photographs: Kurir Livs shopping block' },
      { dist: 2, door: KURIR_X0 + KURIR_W * 0.2, seed: KURIR_BUILDING_ID, address: 'Kurirgatan 1' }),
    facade(SCHOOL[0], SCHOOL[1], 'school', 'block', brickLook('#c9a45c', '#54463f', 1, 'hipped'), { door: (SCHOOL[0] + SCHOOL[1]) / 2, dist: 10 }),
    ...terrace(HOME_X),
  ];
  const shopX = KURIR_X0 + KURIR_W * 0.2;

  // Hedges and open ground in front of the buildings.
  const fronts: Run<FrontKind>[] = [];
  const hedge = (x0: number, x1: number) => fronts.push({ x0, x1, value: 'hedge' });
  hedge(40, 940); for (const [a, b] of BLOCKS) hedge(a, b);
  fronts.push({ x0: KURIR_X0 - 40, x1: KURIR_X0 + KURIR_W + 40, value: 'forecourt' });
  fronts.push({ x0: SCHOOL[0] - 40, x1: SCHOOL[1] + 40, value: 'open' });
  fronts.sort((a, b) => a.x0 - b.x0);
  const gates = [GODS_DOOR_X - 132 * 3, GODS_DOOR_X - 132 * 2, GODS_DOOR_X - 132, GODS_DOOR_X, ...BLOCKS.map(([a, b]) => (a + b) / 2)];

  // Trees standing in front of the blocks and between them.
  const trees: Tree[] = [];
  for (let x = 120; x < LENGTH - 500; x += 110 + rand(x, 1) * 170) {
    if (x > KURIR_X0 - 60 && x < KURIR_X0 + KURIR_W + 60) continue;
    if (gates.some(g => Math.abs(g - x) < 44)) continue;
    const bush = rand(x, 2) > 0.62;
    trees.push({ x, row: 0, dist: bush ? 4 : 6 + rand(x, 3) * 3, variant: Math.floor(rand(x, 4) * 6), height: bush ? 12 : 26 + rand(x, 5) * 10, bush });
  }
  trees.sort((a, b) => b.dist - a.dist);

  // Street furniture: lamps on the near pavement, bins and signs on the far one.
  const furniture: Furniture[] = [];
  for (let x = 300; x < LENGTH - 200; x += 430) furniture.push({ kind: 'lamp', x, near: true });
  for (let x = 700; x < LENGTH - 600; x += 520) furniture.push({ kind: 'lamp', x: x + 90, near: false });
  for (const x of [1160, 1840, 2540, 3240, 3910]) furniture.push({ kind: 'sign', x, near: false, label: 'PRIVAT' });
  const bins = [560, 1590, 2260, 2960, 3690, 5100, 6020];
  for (const x of bins) furniture.push({ kind: 'bin', x, near: false });
  for (const x of [1500, 4090, 5240, 6440]) furniture.push({ kind: 'bench', x, near: false });
  furniture.push({ kind: 'sign', x: 200, near: false, label: 'KURIRGATAN' });
  furniture.push({ kind: 'sign', x: HOME_X + 62, near: false, label: 'HEM 55B', variant: 2 });
  furniture.sort((a, b) => a.x - b.x);

  // Where the courier can crouch out of sight, or leave the Gods for later.
  const spots: Spot[] = [];
  for (const run of fronts) {
    if (run.value !== 'hedge') continue;
    for (let x = run.x0 + 90; x < run.x1 - 60; x += 200) if (!gates.some(g => Math.abs(g - x) < 34)) spots.push({ x, kind: 'hedge' });
  }
  for (const x of bins) spots.push({ x, kind: 'bin' });
  for (const [a, b] of GARAGES) for (let x = a + 14; x < b - 10; x += 52) spots.push({ x, kind: 'garage' });
  for (const [a, b] of SHEDS) spots.push({ x: (a + b) / 2, kind: 'shed' });
  for (const t of trees) if (t.bush) spots.push({ x: t.x, kind: 'bush' });
  spots.sort((a, b) => a.x - b.x);

  const streets: Run<string | undefined>[] = [
    { x0: 0, x1: KURIR_X0 + KURIR_W, value: 'Kurirgatan' }, { x0: KURIR_X0 + KURIR_W, x1: SCHOOL[1] + 40, value: 'Kurirgatan' },
    { x0: SCHOOL[1] + 40, x1: LENGTH, value: 'Ringstorpsvägen' },
  ];
  const surfaces: Run<Surface>[] = [
    { x0: 0, x1: KURIR_X0 - 40, value: 'road' },
    { x0: KURIR_X0 - 40, x1: KURIR_X0 + KURIR_W + 40, value: 'paved' },
    { x0: KURIR_X0 + KURIR_W + 40, x1: SCHOOL[0] - 40, value: 'road' },
    { x0: SCHOOL[0] - 40, x1: SCHOOL[1] + 40, value: 'paved' },
    { x0: SCHOOL[1] + 40, x1: HOME_X - 260, value: 'road' },
    { x0: HOME_X - 260, x1: LENGTH, value: 'paved' },
  ];
  facades.sort((a, b) => b.dist - a.dist || a.x0 - b.x0);

  cached = {
    route: 'direct', length: LENGTH, forkX: 0, homeX: HOME_X, marcusX: null, shopX, junctions: [],
    start: { x: GODS_START_X, y: 214 }, package: { x: -2000, y: BAND_TOP + 5 },
    facades, trees, furniture, gates, fronts, streets, surfaces, sideStreets: [], crossings: [],
    encounters: [], level: 2, spots, godsDoorX: GODS_DOOR_X,
  };
  return cached;
}
